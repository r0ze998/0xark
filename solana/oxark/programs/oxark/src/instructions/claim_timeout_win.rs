// claim_timeout_win — ends a duel the opponent refuses to progress.
//
// THE GRIEF: commit/reveal has no clock. A player who has committed and then sees
// (or suspects) they will lose the round can simply never call reveal_hand — or
// never commit at all — and the duel sits open forever. Today that "only" wastes
// the honest player's time and blocks their matchmaking slot; once YKK-44 lands
// (NFT escrow at duel start) a stall would lock the honest player's escrowed card
// indefinitely. This instruction must therefore exist BEFORE escrow does.
//
// THE RULE: if `now - duel.last_progress_at >= DUEL_STALL_TIMEOUT_SECONDS` and the
// OPPONENT owes the next action for the current round while the claimant has
// already done their own part, the claimant may end the duel as its winner.
// "Owes the next action" for round r means exactly one of:
//   - claimant committed r, opponent has not committed r
//   - both committed r, claimant revealed r, opponent has not revealed r
// A claimant who owes an action themself can never claim (a mutual stall has no
// timeout winner — see the both-AFK note in the PR; a future cancel_duel can
// refund that case once there is anything to refund).
//
// `last_progress_at` is refreshed by init_duel, every successful commit_hand and
// every successful reveal_hand, so the timer always measures the CURRENT wait.
// Timeout wins set winner/ended_at exactly like a played-out decision, so
// settle_duel_history credits them identically (revealed cards up to the stall
// point still settle; unrevealed hands never entered on-chain history).

use crate::constants::DUEL_STALL_TIMEOUT_SECONDS;
use crate::error::ErrorCode;
use crate::instructions::init_duel::DUEL_SEED;
use crate::state::{DuelState, DuelTimeoutClaimed};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(duel_id: Pubkey)]
pub struct ClaimTimeoutWin<'info> {
    #[account(
        mut,
        seeds = [DUEL_SEED, duel_id.as_ref()],
        bump = duel.bump,
    )]
    pub duel: Account<'info, DuelState>,

    pub claimant: Signer<'info>,
}

pub fn handle_claim_timeout_win(ctx: Context<ClaimTimeoutWin>, duel_id: Pubkey) -> Result<()> {
    let duel = &mut ctx.accounts.duel;
    require!(duel.id == duel_id, ErrorCode::WrongDuel);
    require!(duel.ended_at == 0, ErrorCode::DuelOver);

    let claimant_key = ctx.accounts.claimant.key();
    let is_p1 = claimant_key == duel.player_1;
    let is_p2 = claimant_key == duel.player_2;
    require!(is_p1 || is_p2, ErrorCode::NotADuelParticipant);

    // Stall clock. last_progress_at is set at init and on every commit/reveal,
    // so it is always non-zero for a live duel; the max() guards crafted or
    // pre-migration accounts where it could be 0 (fall back to started_at).
    let now = Clock::get()?.unix_timestamp;
    let anchor_ts = duel.last_progress_at.max(duel.started_at);
    let stalled_for = now.saturating_sub(anchor_ts);
    require!(
        stalled_for >= DUEL_STALL_TIMEOUT_SECONDS,
        ErrorCode::TimeoutNotReached
    );

    // Who owes the next action for the current round?
    let round_idx = (duel.round.saturating_sub(1)) as usize;
    require!(round_idx < 5, ErrorCode::WrongRound);

    let (my_commit, opp_commit, my_reveal, opp_reveal) = if is_p1 {
        (
            duel.player_1_commitment[round_idx] != [0u8; 32],
            duel.player_2_commitment[round_idx] != [0u8; 32],
            duel.player_1_revealed[round_idx] != [0u64; 10],
            duel.player_2_revealed[round_idx] != [0u64; 10],
        )
    } else {
        (
            duel.player_2_commitment[round_idx] != [0u8; 32],
            duel.player_1_commitment[round_idx] != [0u8; 32],
            duel.player_2_revealed[round_idx] != [0u64; 10],
            duel.player_1_revealed[round_idx] != [0u64; 10],
        )
    };

    // Claimable stalls: opponent missing a commit I've made, or missing a reveal
    // I've made after both commits landed. Anything else means the claimant owes
    // an action too — no timeout win from a mutual stall.
    require!(
        opponent_is_stalled(my_commit, opp_commit, my_reveal, opp_reveal),
        ErrorCode::OpponentNotStalled
    );

    let loser = if is_p1 { duel.player_2 } else { duel.player_1 };
    duel.winner = claimant_key;
    duel.ended_at = now;

    emit!(DuelTimeoutClaimed {
        duel_id,
        winner: claimant_key,
        loser,
        round: duel.round,
        stalled_for,
    });
    msg!(
        "claim_timeout_win: duel={} winner={} loser={} round={} stalled_for={}s",
        duel_id,
        claimant_key,
        loser,
        duel.round,
        stalled_for,
    );
    Ok(())
}

// ── Pure decision helper (unit-tested; no clock/SVM needed) ──────────────────

/// Whether the claimant may take a stalled duel, from the four presence flags of
/// the CURRENT round (from the claimant's point of view). True iff the claimant
/// has done their part and the opponent owes the next action:
///   - claimant committed, opponent has not  → opponent owes a commit
///   - both committed, claimant revealed, opponent has not → opponent owes a reveal
/// Every other combination (claimant owes something, or nobody has acted, or the
/// round is already fully revealed) is not claimable.
pub(crate) fn opponent_is_stalled(
    my_commit: bool,
    opp_commit: bool,
    my_reveal: bool,
    opp_reveal: bool,
) -> bool {
    (my_commit && !opp_commit) || (my_commit && opp_commit && my_reveal && !opp_reveal)
}

#[cfg(test)]
mod tests {
    use super::opponent_is_stalled;

    #[test]
    fn claimable_when_opponent_owes_commit() {
        // I committed, opponent hasn't → claimable.
        assert!(opponent_is_stalled(true, false, false, false));
    }

    #[test]
    fn claimable_when_opponent_owes_reveal() {
        // Both committed, I revealed, opponent hasn't → claimable.
        assert!(opponent_is_stalled(true, true, true, false));
    }

    #[test]
    fn not_claimable_when_i_owe_the_commit() {
        // Opponent committed, I didn't → I'm the staller.
        assert!(!opponent_is_stalled(false, true, false, false));
    }

    #[test]
    fn not_claimable_when_i_owe_the_reveal() {
        // Both committed, opponent revealed, I didn't → I'm the staller.
        assert!(!opponent_is_stalled(true, true, false, true));
    }

    #[test]
    fn not_claimable_on_mutual_no_commit() {
        // Neither committed → nobody has done their part.
        assert!(!opponent_is_stalled(false, false, false, false));
    }

    #[test]
    fn not_claimable_when_both_committed_neither_revealed() {
        // Both committed, neither revealed → mutual stall, no winner.
        assert!(!opponent_is_stalled(true, true, false, false));
    }

    #[test]
    fn not_claimable_when_round_fully_revealed() {
        // Both revealed → round is resolvable, not a stall (defensive).
        assert!(!opponent_is_stalled(true, true, true, true));
    }
}
