// finalize_season_tally — YKK season-end prize settlement (step 1 of 3).
//
// Aggregates every participant's vault_count into the GameWorld tier tallies so
// claim_prize_v2 can distribute by rank. Participants are not enumerable on-chain
// (GameWorld only counts them), so this is an admin-run CRANK: each call processes
// a batch of PlayerState PDAs passed as remaining_accounts.
//
// Double-count / reorder safety WITHOUT per-player accounts: `players` must be
// strictly increasing and strictly greater than `game_world.finalize_cursor`, so
// each participant is tallied exactly once across all batches.
//
// Pre: game_status == 1 (active). Followed by `end_season_final` once
// `finalize_processed == total_participants`.

use crate::constants::ADMIN_PUBKEY;
use crate::error::ErrorCode;
use crate::state::{GameWorld, PlayerState};
use anchor_lang::prelude::*;
use anchor_lang::AccountDeserialize;

#[derive(Accounts)]
pub struct FinalizeSeasonTally<'info> {
    #[account(mut, seeds = [GameWorld::SEED], bump = game_world.bump)]
    pub game_world: Account<'info, GameWorld>,

    #[account(constraint = admin.key() == ADMIN_PUBKEY @ ErrorCode::NotAdmin)]
    pub admin: Signer<'info>,
    // remaining_accounts: the PlayerState PDAs for `players`, in the same order.
}

/// `players`: owner pubkeys whose PlayerState PDAs are in remaining_accounts,
/// sorted strictly ascending and strictly greater than `finalize_cursor`.
pub fn handle_finalize_season_tally(
    ctx: Context<FinalizeSeasonTally>,
    players: Vec<Pubkey>,
) -> Result<()> {
    let world = &mut ctx.accounts.game_world;
    require!(world.game_status == 1, ErrorCode::SeasonWrongStatus);
    require!(
        players.len() == ctx.remaining_accounts.len(),
        ErrorCode::TallyOutOfOrder
    );

    let mut cursor = world.finalize_cursor;
    for (pk, acc) in players.iter().zip(ctx.remaining_accounts.iter()) {
        // Strictly increasing → each participant counted once across batches.
        require!(*pk > cursor, ErrorCode::TallyOutOfOrder);

        // The account must be exactly this player's PlayerState PDA.
        let (expected, _) = Pubkey::find_program_address(&[b"player", pk.as_ref()], &crate::ID);
        require!(acc.key == &expected, ErrorCode::InvalidAccount);
        require!(acc.owner == &crate::ID, ErrorCode::InvalidAccountOwner);

        let data = acc.try_borrow_data()?;
        let ps = PlayerState::try_deserialize(&mut &data[..])?;
        let vc = ps.vault_count() as u64;

        if vc == 60 {
            world.winner_60_count = world.winner_60_count.saturating_add(1);
        } else if vc > 0 {
            match GameWorld::band_of(vc) {
                2 => world.tier2_total_vault += vc,
                3 => world.tier3_total_vault += vc,
                4 => world.tier4_total_vault += vc,
                _ => world.tier5_total_vault += vc,
            }
        }

        // Timeout-champion tracking (highest vault_count, and how many share it).
        if vc > 0 {
            let vc8 = vc as u8;
            if vc8 > world.max_vault {
                world.max_vault = vc8;
                world.max_vault_count = 1;
            } else if vc8 == world.max_vault {
                world.max_vault_count = world.max_vault_count.saturating_add(1);
            }
        }

        cursor = *pk;
        world.finalize_processed = world.finalize_processed.saturating_add(1);
    }
    world.finalize_cursor = cursor;

    msg!(
        "FinalizeSeasonTally: processed={} / {} winner60={} max_vault={} max_count={}",
        world.finalize_processed,
        world.total_participants,
        world.winner_60_count,
        world.max_vault,
        world.max_vault_count,
    );
    Ok(())
}
