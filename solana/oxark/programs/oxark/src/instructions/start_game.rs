use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct StartGame<'info> {
    #[account(
        mut,
        seeds = [GAME_SEED, game_id.to_le_bytes().as_ref()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,
    #[account(
        mut,
        seeds = [CARD_POOL_SEED, game_id.to_le_bytes().as_ref()],
        bump = card_pool.bump,
    )]
    pub card_pool: Account<'info, CardPool>,
    /// Player states passed as remaining accounts
    pub host: Signer<'info>,
}

pub fn handle_start_game(ctx: Context<StartGame>, game_id: u64) -> Result<()> {
    let game = &mut ctx.accounts.game;
    require!(game.status == GameStatus::Lobby, ErrorCode::NotInLobby);
    require!(game.host == ctx.accounts.host.key(), ErrorCode::NotHost);
    require!(game.player_count >= 2, ErrorCode::NotEnoughPlayers);

    let pool = &mut ctx.accounts.card_pool;

    // Distribute initial cards to each player via remaining accounts
    // Each remaining account is a PlayerState PDA
    let clock = Clock::get()?;
    let mut seed = clock.slot;

    for account_info in ctx.remaining_accounts.iter() {
        let mut data = account_info.try_borrow_mut_data()?;
        // Skip 8-byte discriminator
        let ps: &mut PlayerState = bytemuck_no_discriminator(&mut data)?;

        for _ in 0..INITIAL_HAND_SIZE {
            let card_id = pick_card_from_pool(&mut pool.remaining, seed);
            if card_id > 0 {
                place_card_in_hand(&mut ps.cards, card_id);
                ps.card_count += 1;
                game.cards_in_pool -= 1;
            }
            seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
        }
    }

    game.status = GameStatus::CommitPhase;
    game.round = 1;
    game.commit_count = 0;
    game.reveal_count = 0;

    msg!("Game {} started with {} players", game_id, game.player_count);
    Ok(())
}

fn pick_card_from_pool(remaining: &mut [u8; 5], seed: u64) -> u8 {
    let total: u32 = remaining.iter().map(|&r| r as u32).sum();
    if total == 0 {
        return 0;
    }

    let pick = (seed % total as u64) as u32;
    let mut cumulative: u32 = 0;

    for i in 0..5 {
        cumulative += remaining[i] as u32;
        if pick < cumulative {
            remaining[i] -= 1;
            return (i + 1) as u8;
        }
    }
    0
}

fn place_card_in_hand(cards: &mut [u8; 5], card_id: u8) {
    for slot in cards.iter_mut() {
        if *slot == 0 {
            *slot = card_id;
            return;
        }
    }
}

/// Unsafe helper to get mutable reference to PlayerState from raw account data
/// Skips the 8-byte Anchor discriminator
fn bytemuck_no_discriminator<'a>(data: &'a mut [u8]) -> Result<&'a mut PlayerState> {
    // For now, use unsafe transmute since we control the layout
    // In production, use proper deserialization
    let ps_data = &mut data[8..];
    Ok(unsafe { &mut *(ps_data.as_mut_ptr() as *mut PlayerState) })
}
