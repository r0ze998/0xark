use anchor_lang::prelude::*;
use crate::state::{DuelState, HandRevealed};
use crate::error::ErrorCode;
use crate::instructions::init_duel::DUEL_SEED;
use crate::poseidon_helper::compute_hand_commitment;
use crate::damage_calc::{damage_calc, Winner};
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
    let zk_ok = if is_p1 { duel.player_1_zk_verified[round_idx] }
                else      { duel.player_2_zk_verified[round_idx] };
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

    require!(recomputed_be == stored_commitment, ErrorCode::CommitmentMismatch);

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

    // Round 5: resolve the duel when both players have revealed
    if round == 5
        && duel.player_1_revealed[round_idx] != [0u64; 10]
        && duel.player_2_revealed[round_idx] != [0u64; 10]
    {
        // Deterministic seed: SHA-256(p1_salt || p2_salt || [round])
        let seed: [u8; 32] = hashv(&[
            &duel.player_1_salt[round_idx],
            &duel.player_2_salt[round_idx],
            &[round],
        ]).to_bytes();

        let result = damage_calc(
            &duel.player_1_revealed[round_idx],
            &duel.player_2_revealed[round_idx],
            &seed,
        );

        duel.winner = match result.winner {
            Winner::P1 => duel.player_1,
            Winner::P2 => duel.player_2,
        };
        duel.ended_at = Clock::get()?.unix_timestamp;

        msg!(
            "Duel resolved: winner={} p1_bp={} p2_bp={} loot_card={}",
            duel.winner,
            result.p1_bp_total,
            result.p2_bp_total,
            result.looted_card_id,
        );
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
