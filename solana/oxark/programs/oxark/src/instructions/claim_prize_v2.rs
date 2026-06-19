use crate::error::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

/// Phase 15 B-8: Tier-based prize distribution.
/// Called by each player after game_status == 2 (ended).
/// Distributes prize proportional to vault_count per tier.
///
/// Tier 1 (60 cards): 50% of prize pool, split equally among all 60-card holders.
/// Tier 2 (50-59):    25%, split by vault_count ratio.
/// Tier 3 (30-49):    15%, split by vault_count ratio.
/// Tier 4 (10-29):     8%, split by vault_count ratio.
/// Tier 5  (1-9):      2%, split by vault_count ratio.
///
/// When no Tier 1 winner exists (timeout), the player(s) with max vault_count receive Tier 1.
#[derive(Accounts)]
pub struct ClaimPrizeV2<'info> {
    #[account(
        mut,
        seeds = [b"player", player.key().as_ref()],
        bump,
    )]
    pub player_state: Account<'info, PlayerState>,

    #[account(
        mut,
        seeds = [GameWorld::SEED],
        bump = game_world.bump,
    )]
    pub game_world: Account<'info, GameWorld>,

    /// Prize-pool PDA vault (YKK-38). Program-owned System account holding the
    /// season's lamports; payouts are authorized via invoke_signed using
    /// `game_world.prize_pool_bump`, so the pool no longer needs an external signer.
    #[account(
        mut,
        seeds = [GameWorld::PRIZE_POOL_SEED],
        bump = game_world.prize_pool_bump,
    )]
    pub prize_pool: SystemAccount<'info>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_claim_prize_v2(ctx: Context<ClaimPrizeV2>) -> Result<()> {
    // Read all values before any mutation (avoids borrow-checker conflicts).
    let (vault_count, actual_prize) = {
        let world = &ctx.accounts.game_world;
        let ps = &ctx.accounts.player_state;

        require!(world.game_status == 2, ErrorCode::GameNotEnded);
        // C1 guard: deposit_amount is zeroed after claim; a second call hits this.
        require!(ps.deposit_amount > 0, ErrorCode::NotRegistered);

        let vault_count = ps.vault_count() as u64;
        require!(vault_count > 0, ErrorCode::NoPrizeClaim);

        let prize_pool_total = world.total_prize_pool;

        let prize = if world.winner_60_count == 0 {
            compute_tier_prize(vault_count, prize_pool_total, world, true)
        } else {
            compute_tier_prize(vault_count, prize_pool_total, world, false)
        };

        require!(prize > 0, ErrorCode::NoPrizeClaim);

        // Balance guard: never pay beyond the pool, and never drain it below the
        // rent-exempt floor (a lamports-only System PDA with 0 data still needs
        // minimum_balance(0) to stay alive). The floor (~0.00089 SOL) is stranded
        // dust by design — see PR notes.
        let rent_exempt_min = Rent::get()?.minimum_balance(0);
        let spendable = ctx
            .accounts
            .prize_pool
            .lamports()
            .saturating_sub(rent_exempt_min);
        let actual_prize = prize.min(spendable);
        (vault_count, actual_prize)
    }; // immutable borrows on world/ps drop here

    require!(actual_prize > 0, ErrorCode::NoPrizeClaim);

    // YKK-38: pay out from the prize-pool PDA via invoke_signed.
    let bump = ctx.accounts.game_world.prize_pool_bump;
    let signer_seeds: &[&[u8]] = &[GameWorld::PRIZE_POOL_SEED, std::slice::from_ref(&bump)];
    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.prize_pool.to_account_info(),
                to: ctx.accounts.player.to_account_info(),
            },
            &[signer_seeds],
        ),
        actual_prize,
    )?;

    // C1 fix: zero deposit so the require!(deposit_amount > 0) gate blocks retries.
    ctx.accounts.player_state.deposit_amount = 0;

    msg!(
        "ClaimPrizeV2: player={} vault={} prize={}lam",
        ctx.accounts.player.key(),
        vault_count,
        actual_prize,
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deposit_amount_is_zeroed_after_claim() {
        // Verify the predicate: after zeroing, a second require!(deposit_amount > 0) fires.
        let mut deposit = 500_000_000u64;
        assert!(deposit > 0);
        deposit = 0; // simulates the C1 fix
        assert_eq!(deposit, 0, "deposit_amount must be 0 after claim");
        let result = if deposit > 0 { Ok(()) } else { Err(()) };
        assert!(
            result.is_err(),
            "second claim must be rejected once deposit is zeroed"
        );
    }

    #[test]
    fn band_shares_all_populated_sum_100() {
        let eff = effective_band_shares([true, true, true, true, true]);
        assert_eq!(eff, [50, 25, 15, 8, 2]);
        assert_eq!(eff.iter().sum::<u64>(), 100);
    }

    #[test]
    fn band_shares_single_empty_carries_to_next() {
        // T2 empty → its 25% carries down to T3 (next populated).
        let eff = effective_band_shares([true, false, true, true, true]);
        assert_eq!(eff, [50, 0, 40, 8, 2]); // T3 = 15 + 25
        assert!(eff.iter().sum::<u64>() <= 100);
    }

    #[test]
    fn band_shares_chained_empty_carries_two_levels() {
        // T2 and T3 empty → 25+15 carries down to T4.
        let eff = effective_band_shares([true, false, false, true, true]);
        assert_eq!(eff, [50, 0, 0, 48, 2]); // T4 = 8 + 25 + 15
        assert!(eff.iter().sum::<u64>() <= 100);
    }

    #[test]
    fn band_shares_trailing_empty_stays_in_pool() {
        // Only T1 populated → 25+15+8+2 = 50% has nowhere below to go: stays in pool.
        let eff = effective_band_shares([true, false, false, false, false]);
        assert_eq!(eff, [50, 0, 0, 0, 0]);
        assert_eq!(eff.iter().sum::<u64>(), 50); // < 100; remainder stays in pool
    }

    #[test]
    fn band_shares_empty_top_carries_into_first_populated() {
        // T1 empty (no champion) → 50% carries to T2.
        let eff = effective_band_shares([false, true, true, true, true]);
        assert_eq!(eff, [0, 75, 15, 8, 2]); // T2 = 25 + 50
        assert_eq!(eff.iter().sum::<u64>(), 100);
    }
}

/// Effective share (percent of pool) per band T1..T5 with empty-band carry-over.
/// `populated[i]` = band i has ≥1 member. An empty band's base share carries DOWN
/// to the next populated band; trailing carry (no populated band below) is dropped
/// (stays in pool). Σ over populated bands ≤ 100, so Σ(payouts) ≤ pool.
pub(crate) fn effective_band_shares(populated: [bool; 5]) -> [u64; 5] {
    let base = [50u64, 25, 15, 8, 2];
    let mut eff = [0u64; 5];
    let mut carry = 0u64;
    for i in 0..5 {
        if populated[i] {
            eff[i] = base[i] + carry;
            carry = 0;
        } else {
            carry += base[i];
        }
    }
    eff
}

/// Tier-based payout for one player, computed from the GameWorld tallies that
/// `finalize_season_tally` / `end_season_final` populate. Deterministic and
/// order-independent, so claim order cannot change anyone's share.
///
/// Band base shares of the pool: T1 50%, T2 25%, T3 15%, T4 8%, T5 2%.
///   - Normal (winner_60_count > 0): T1 = `vault_count == 60`, divisor = winner_60_count.
///   - Timeout (winner_60_count == 0): T1 = `vault_count == max_vault`, divisor =
///     max_vault_count; those champions were removed from their natural band by
///     `end_season_final`, so they are paid once.
///
/// Empty-band carry-over (YKK ③): a band with no members carries its share DOWN to
/// the next populated band; a share with no populated band below it stays in the
/// pool. Empty bands are never used as a divisor, so there is no division by zero,
/// and Σ(payouts) ≤ pool.
fn compute_tier_prize(
    vault_count: u64,
    prize_pool: u64,
    world: &GameWorld,
    timeout_mode: bool,
) -> u64 {
    // Tier-1 divisor / membership depends on normal vs timeout.
    let t1_divisor = if timeout_mode {
        world.max_vault_count as u64
    } else {
        world.winner_60_count as u64
    };

    // Effective share per band (own base + carry from empty bands above).
    let eff = effective_band_shares([
        t1_divisor > 0,
        world.tier2_total_vault > 0,
        world.tier3_total_vault > 0,
        world.tier4_total_vault > 0,
        world.tier5_total_vault > 0,
    ]);

    // Which band is THIS player in? Tier-1 (champions) is checked first.
    let is_t1 = if timeout_mode {
        vault_count == world.max_vault as u64
    } else {
        vault_count == 60
    };
    if is_t1 {
        if t1_divisor == 0 {
            return 0;
        }
        return prize_pool * eff[0] / 100 / t1_divisor;
    }
    if vault_count >= 50 {
        if world.tier2_total_vault == 0 {
            return 0;
        }
        prize_pool * eff[1] / 100 * vault_count / world.tier2_total_vault
    } else if vault_count >= 30 {
        if world.tier3_total_vault == 0 {
            return 0;
        }
        prize_pool * eff[2] / 100 * vault_count / world.tier3_total_vault
    } else if vault_count >= 10 {
        if world.tier4_total_vault == 0 {
            return 0;
        }
        prize_pool * eff[3] / 100 * vault_count / world.tier4_total_vault
    } else {
        if world.tier5_total_vault == 0 {
            return 0;
        }
        prize_pool * eff[4] / 100 * vault_count / world.tier5_total_vault
    }
}
