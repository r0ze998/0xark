// Energy system (YKK-44 anti-whale gate / YKK-43 SOL sink).
//
// Duel entry is energy-gated so that time-invested ≠ pay-to-win: energy caps at
// ENERGY_MAX, regenerates on a clock (ENERGY_REGEN_INTERVAL_SECONDS), and can be
// topped up for SOL via `refill_energy` (the "buy your time back" sink).
//
// This file owns:
//   - the pure regen/spend math (`regenerated_energy`, `settle_and_spend`),
//     unit-tested with no accounts/clock, and
//   - the `refill_energy` instruction (player-signed SOL → ops_treasury, energy→max).
//
// The CONSUMPTION point (spending 1 energy to enter a duel) is intentionally NOT
// wired here. The DuelState duel flow (init_duel/commit_hand/reveal_hand) currently
// loads no PlayerState — init_duel is server-signed and the players aren't even
// signers — so choosing where to charge energy (round-1 commit_hand, which is the
// first player-signed duel action) means adding a PlayerState account to that core
// ZK instruction. That's an architecture decision left for its own change;
// `settle_and_spend` below is the ready-made, tested primitive it will call.

use crate::constants::{ENERGY_MAX, ENERGY_REFILL_COST_LAMPORTS, ENERGY_REGEN_INTERVAL_SECONDS};
use crate::error::ErrorCode;
use crate::state::{GameWorld, PlayerState};
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

// ── Pure energy math (unit-tested) ───────────────────────────────────────────

/// Settle natural regen up to `now` without exceeding ENERGY_MAX.
/// (Used by `settle_and_spend`, which commit_hand calls to charge duel entry.)
pub(crate) fn regenerated_energy(energy: u8, last_regen_at: i64, now: i64) -> (u8, i64) {
    if energy >= ENERGY_MAX {
        return (ENERGY_MAX, now);
    }
    if now <= last_regen_at {
        return (energy, last_regen_at);
    }
    let elapsed = now - last_regen_at;
    let gained = elapsed / ENERGY_REGEN_INTERVAL_SECONDS; // whole intervals
    if gained == 0 {
        return (energy, last_regen_at);
    }
    let new_energy = energy as i64 + gained;
    if new_energy >= ENERGY_MAX as i64 {
        (ENERGY_MAX, now)
    } else {
        // Keep the remainder toward the next point by advancing the anchor by
        // exactly the intervals we consumed.
        (new_energy as u8, last_regen_at + gained * ENERGY_REGEN_INTERVAL_SECONDS)
    }
}

/// Settle regen, then attempt to spend `cost`. Returns the updated
/// (energy, anchor) on success, or `None` if energy is insufficient after regen.
/// On a successful spend the anchor is reset to `now` so the next regen point is a
/// full interval away (no retroactive credit).
/// (commit_hand calls this to charge 1 energy on duel entry.)
pub(crate) fn settle_and_spend(
    energy: u8,
    last_regen_at: i64,
    now: i64,
    cost: u8,
) -> Option<(u8, i64)> {
    let (regened, anchor) = regenerated_energy(energy, last_regen_at, now);
    if regened < cost {
        return None;
    }
    let _ = anchor; // anchor from regen is superseded by `now` on spend
    Some((regened - cost, now))
}

// ── refill_energy instruction ────────────────────────────────────────────────

#[derive(Accounts)]
pub struct RefillEnergy<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [b"player", player.key().as_ref()],
        bump = player_state.bump,
    )]
    pub player_state: Account<'info, PlayerState>,

    #[account(seeds = [b"game_world"], bump = game_world.bump)]
    pub game_world: Account<'info, GameWorld>,

    /// CHECK: verified against game_world.ops_treasury (same pattern as buy_pack).
    #[account(mut, constraint = ops_treasury.key() == game_world.ops_treasury @ ErrorCode::Unauthorized)]
    pub ops_treasury: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_refill_energy(ctx: Context<RefillEnergy>) -> Result<()> {
    // Pay the refill fee to ops_treasury (SOL sink).
    transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.player.to_account_info(),
                to: ctx.accounts.ops_treasury.to_account_info(),
            },
        ),
        ENERGY_REFILL_COST_LAMPORTS,
    )?;

    // Fill to max and restart the regen clock from now.
    let now = Clock::get()?.unix_timestamp;
    let ps = &mut ctx.accounts.player_state;
    ps.energy = ENERGY_MAX;
    ps.last_energy_regen_at = now;

    msg!(
        "refill_energy: player={} energy->{} paid={}lamports",
        ctx.accounts.player.key(),
        ENERGY_MAX,
        ENERGY_REFILL_COST_LAMPORTS,
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{regenerated_energy, settle_and_spend};
    use crate::constants::{ENERGY_MAX, ENERGY_REGEN_INTERVAL_SECONDS as IVL};

    #[test]
    fn full_energy_does_not_bank_and_resets_anchor() {
        let (e, anchor) = regenerated_energy(ENERGY_MAX, 1_000, 1_000 + 10 * IVL);
        assert_eq!(e, ENERGY_MAX);
        assert_eq!(anchor, 1_000 + 10 * IVL); // anchor pulled to now, no overflow bank
    }

    #[test]
    fn no_regen_before_one_interval() {
        let (e, anchor) = regenerated_energy(2, 1_000, 1_000 + IVL - 1);
        assert_eq!(e, 2);
        assert_eq!(anchor, 1_000);
    }

    #[test]
    fn regen_one_point_preserves_partial() {
        // 1 interval + a bit: gain exactly 1, anchor advances by exactly 1 interval.
        let (e, anchor) = regenerated_energy(2, 1_000, 1_000 + IVL + 30);
        assert_eq!(e, 3);
        assert_eq!(anchor, 1_000 + IVL); // remaining 30s toward next point kept
    }

    #[test]
    fn regen_multiple_points() {
        let (e, _) = regenerated_energy(1, 0, 3 * IVL);
        assert_eq!(e, 4);
    }

    #[test]
    fn regen_caps_at_max() {
        let (e, anchor) = regenerated_energy(3, 0, 100 * IVL);
        assert_eq!(e, ENERGY_MAX);
        assert_eq!(anchor, 100 * IVL);
    }

    #[test]
    fn stale_clock_is_noop() {
        // now earlier than anchor (crafted/clock skew) → unchanged, no underflow.
        let (e, anchor) = regenerated_energy(2, 5_000, 4_000);
        assert_eq!(e, 2);
        assert_eq!(anchor, 5_000);
    }

    #[test]
    fn spend_succeeds_with_enough_energy() {
        let out = settle_and_spend(3, 1_000, 1_000, 1);
        assert!(matches!(out, Some((2, 1_000))));
    }

    #[test]
    fn spend_uses_regen_then_deducts() {
        // 0 energy but 2 intervals elapsed → regen to 2, spend 1 → 1 left, anchor=now.
        let out = settle_and_spend(0, 0, 2 * IVL, 1);
        assert!(matches!(out, Some((1, x)) if x == 2 * IVL));
    }

    #[test]
    fn spend_fails_when_insufficient_after_regen() {
        // 0 energy, < 1 interval → still 0 → can't afford 1.
        assert!(settle_and_spend(0, 0, IVL - 1, 1).is_none());
    }
}
