use crate::damage_calc::damage_calc;
use crate::error::ErrorCode;
use crate::instructions::init_duel::DUEL_SEED;
use crate::poseidon_helper::compute_hand_commitment;
use crate::state::{DuelState, HandRevealed};
use anchor_lang::prelude::*;
use solana_sha256_hasher::hashv;

// ─── Instruction ─────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(duel_id: Pubkey)]
pub struct RevealHand<'info> {
    #[account(
        mut,
        seeds = [DUEL_SEED, duel_id.as_ref()],
        bump = duel.bump,
    )]
    pub duel: Account<'info, DuelState>,

    pub player: Signer<'info>,
}

/// Reveal a player's hand after battle resolution for a given round.
///
/// T-D13-A0 (DEF-16): Full on-chain Poseidon(15) verification.
/// The player submits card_ids and the original salt used during commit_hand.
/// On-chain: recompute Poseidon(round, pubkey_lo, pubkey_hi, card_ids[10], salt_lo, salt_hi)
/// and compare against the stored commitment. Mismatched reveals are rejected.
///
/// **Client requirement**: transactions calling this instruction MUST include
/// `ComputeBudgetInstruction::request_heap_frame(262144)` as the first instruction.
/// The program uses a 256KB heap allocator (see `custom-heap` feature) to accommodate
/// the ark-bn254 Poseidon constants (~45KB). Without RequestHeapFrame(262144) the
/// validator maps only the default 32KB heap and the transaction faults immediately.
///
/// This closes the cheat window from Day 12 MVP.
pub fn handle_reveal_hand(
    ctx: Context<RevealHand>,
    duel_id: Pubkey,
    round: u8,
    card_ids: [u64; 10],
    salt: [u8; 32],
) -> Result<()> {
    let duel = &mut ctx.accounts.duel;

    require!(duel.id == duel_id, ErrorCode::WrongDuel);
    require!(duel.ended_at == 0, ErrorCode::DuelOver);
    require!(round >= 1 && round <= 5, ErrorCode::WrongRound);

    let player_key = ctx.accounts.player.key();
    let is_p1 = player_key == duel.player_1;
    let is_p2 = player_key == duel.player_2;
    require!(is_p1 || is_p2, ErrorCode::NotADuelParticipant);

    let round_idx = (round - 1) as usize;

    // ZK gate: commit_hand must have been called with a valid Groth16 proof for this round
    let zk_ok = if is_p1 {
        duel.player_1_zk_verified[round_idx]
    } else {
        duel.player_2_zk_verified[round_idx]
    };
    require!(zk_ok, ErrorCode::ZkNotVerified);

    // Fetch stored commitment from commit_hand
    let stored_commitment = if is_p1 {
        duel.player_1_commitment[round_idx]
    } else {
        duel.player_2_commitment[round_idx]
    };

    // Guard: commitment must have been set (non-zero)
    require!(stored_commitment != [0u8; 32], ErrorCode::CommitmentNotSet);

    // Guard: already revealed
    let already_revealed = if is_p1 {
        duel.player_1_revealed[round_idx] != [0u64; 10]
    } else {
        duel.player_2_revealed[round_idx] != [0u64; 10]
    };
    require!(!already_revealed, ErrorCode::HandAlreadyRevealed);

    // T-D13-A0: Recompute Poseidon(15) on-chain from revealed data.
    // If commitment doesn't match, the player is cheating → reject.
    let pubkey_bytes = player_key.to_bytes();
    let recomputed = compute_hand_commitment(round, &pubkey_bytes, &card_ids, &salt)
        .map_err(|_| error!(ErrorCode::PoseidonHashFailed))?;

    // commit_hand stores the commitment as big-endian field element bytes.
    // compute_hand_commitment returns little-endian — convert for comparison.
    // The commitment stored during commit_hand was publicSignals[0] from snarkjs,
    // which is a field element. We stored it as big-endian 32 bytes in the
    // Groth16 verifier (fieldToBytes is big-endian).
    // Our Poseidon helper returns little-endian. Convert to match.
    let mut recomputed_be = recomputed;
    recomputed_be.reverse();

    require!(
        recomputed_be == stored_commitment,
        ErrorCode::CommitmentMismatch
    );

    // Save salt (needed by second revealer to compute deterministic seed)
    if is_p1 {
        duel.player_1_salt[round_idx] = salt;
    } else {
        duel.player_2_salt[round_idx] = salt;
    }

    // Store revealed cards
    if is_p1 {
        duel.player_1_revealed[round_idx] = card_ids;
    } else {
        duel.player_2_revealed[round_idx] = card_ids;
    }

    // YKK-41: best-of-5, first to 3 round wins. Resolve THIS round once both
    // players have revealed it (gated above by zk_verified + already-revealed, so
    // this fires exactly once per round, on the second reveal), then either end
    // the duel or advance to the next round.
    if duel.player_1_revealed[round_idx] != [0u64; 10]
        && duel.player_2_revealed[round_idx] != [0u64; 10]
    {
        // Deterministic per-round seed: SHA-256(p1_salt || p2_salt || [round])
        let seed: [u8; 32] = hashv(&[
            &duel.player_1_salt[round_idx],
            &duel.player_2_salt[round_idx],
            &[round],
        ])
        .to_bytes();

        let result = damage_calc(
            &duel.player_1_revealed[round_idx],
            &duel.player_2_revealed[round_idx],
            &seed,
        );

        // Round winner by battle power; equal BP totals = drawn round (no point,
        // round still advances). Rounds are independent — no carried HP.
        match round_point(result.p1_bp_total, result.p2_bp_total) {
            Some(true) => duel.player_1_round_wins = duel.player_1_round_wins.saturating_add(1),
            Some(false) => duel.player_2_round_wins = duel.player_2_round_wins.saturating_add(1),
            None => {} // drawn round — neither scores
        }

        let p1w = duel.player_1_round_wins;
        let p2w = duel.player_2_round_wins;
        msg!(
            "Round {} resolved: p1_bp={} p2_bp={} round_wins p1={} p2={}",
            round,
            result.p1_bp_total,
            result.p2_bp_total,
            p1w,
            p2w,
        );

        match duel_outcome(p1w, p2w, round) {
            // No decision yet → advance so the next round's commit_hand can run
            // (commit_hand requires duel.round == round).
            None => duel.round += 1,
            Some(decision) => {
                duel.ended_at = Clock::get()?.unix_timestamp;
                duel.winner = match decision {
                    Some(true) => duel.player_1,
                    Some(false) => duel.player_2,
                    None => Pubkey::default(), // draw — no winner
                };
                msg!(
                    "Duel decided: p1_wins={} p2_wins={} winner={}",
                    p1w,
                    p2w,
                    duel.winner,
                );
            }
        }
    }

    emit!(HandRevealed {
        duel_id,
        player: player_key,
        round,
        card_ids,
    });

    msg!(
        "Hand revealed (Poseidon verified): player={} duel={} round={}",
        player_key,
        duel_id,
        round,
    );

    Ok(())
}

// ── YKK-41: pure decision helpers (unit-tested below; the e2e can't force ties
// because damage_calc is seed-dependent, so the draw/tally branches are covered
// here deterministically) ──────────────────────────────────────────────────

/// Who scores this round from the two battle-power totals.
/// `Some(true)` = player 1, `Some(false)` = player 2, `None` = drawn (no point).
pub(crate) fn round_point(p1_bp: u32, p2_bp: u32) -> Option<bool> {
    if p1_bp > p2_bp {
        Some(true)
    } else if p2_bp > p1_bp {
        Some(false)
    } else {
        None
    }
}

/// Duel outcome after a round, given cumulative round wins and the round number.
/// `None` = continue (advance to next round). `Some(decision)` = duel ends, where
/// `decision` is `Some(true)`=P1 wins, `Some(false)`=P2 wins, `None`=draw.
///   - 3-win majority → ends immediately (earliest at round 3).
///   - else if round < 5 → continue.
///   - else (5 rounds played, no majority) → most round wins; equal = draw.
pub(crate) fn duel_outcome(p1w: u8, p2w: u8, round: u8) -> Option<Option<bool>> {
    let to_win = DuelState::ROUNDS_TO_WIN;
    if p1w >= to_win || p2w >= to_win {
        Some(Some(p1w > p2w))
    } else if round < 5 {
        None
    } else if p1w > p2w {
        Some(Some(true))
    } else if p2w > p1w {
        Some(Some(false))
    } else {
        Some(None) // 5 rounds, equal wins → draw
    }
}

#[cfg(test)]
mod tests {
    use super::{duel_outcome, round_point};

    #[test]
    fn round_point_picks_higher_bp_and_draws_on_tie() {
        assert_eq!(round_point(10, 5), Some(true)); // P1
        assert_eq!(round_point(5, 10), Some(false)); // P2
        assert_eq!(round_point(7, 7), None); // tie → no point
        assert_eq!(round_point(0, 0), None);
    }

    #[test]
    fn duel_continues_until_majority_or_round5() {
        // No majority, round < 5 → continue.
        assert_eq!(duel_outcome(0, 0, 1), None);
        assert_eq!(duel_outcome(2, 1, 3), None);
        assert_eq!(duel_outcome(2, 2, 4), None);
    }

    #[test]
    fn duel_ends_on_three_win_majority() {
        assert_eq!(duel_outcome(3, 0, 3), Some(Some(true))); // P1 3-0 at R3
        assert_eq!(duel_outcome(3, 1, 4), Some(Some(true))); // P1 3-1 at R4
        assert_eq!(duel_outcome(1, 3, 4), Some(Some(false))); // P2
        assert_eq!(duel_outcome(2, 3, 5), Some(Some(false)));
    }

    #[test]
    fn round5_tally_decides_when_no_majority() {
        assert_eq!(duel_outcome(2, 1, 5), Some(Some(true))); // more wins → P1
        assert_eq!(duel_outcome(1, 2, 5), Some(Some(false))); // P2
        assert_eq!(duel_outcome(2, 2, 5), Some(None)); // equal → draw
        assert_eq!(duel_outcome(0, 0, 5), Some(None)); // all draws → draw
    }

    #[test]
    fn drawn_rounds_do_not_count_toward_majority() {
        // Simulate 5 drawn rounds: round_point returns None each time, so wins stay 0,
        // and at round 5 the tally is a draw.
        let (mut p1w, mut p2w) = (0u8, 0u8);
        for r in 1..=5u8 {
            match round_point(9, 9) {
                Some(true) => p1w += 1,
                Some(false) => p2w += 1,
                None => {}
            }
            let outcome = duel_outcome(p1w, p2w, r);
            if r < 5 {
                assert_eq!(outcome, None, "round {r} should continue");
            } else {
                assert_eq!(outcome, Some(None), "5 drawn rounds → draw");
            }
        }
        assert_eq!((p1w, p2w), (0, 0));
    }
}
