use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct JoinGame<'info> {
    #[account(
        mut,
        seeds = [GAME_SEED, game_id.to_le_bytes().as_ref()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,
    #[account(
        init,
        payer = player,
        space = PlayerState::SIZE,
        seeds = [PLAYER_SEED, game_id.to_le_bytes().as_ref(), player.key().as_ref()],
        bump,
    )]
    pub player_state: Account<'info, PlayerState>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_join_game(ctx: Context<JoinGame>, game_id: u64) -> Result<()> {
    let game = &mut ctx.accounts.game;
    require!(game.status == GameStatus::Lobby, ErrorCode::NotInLobby);
    require!(game.player_count < game.max_players, ErrorCode::GameFull);

    let ps = &mut ctx.accounts.player_state;
    ps.game_id = game_id;
    ps.player = ctx.accounts.player.key();
    ps.player_index = game.player_count;
    ps.area = 0; // Start at Port Town
    ps.cards = [0; 5];
    ps.card_count = 0;
    ps.steal_count = INITIAL_STEAL_SPELLS;
    ps.barrier_count = INITIAL_BARRIER_SPELLS;
    ps.scout_count = INITIAL_SCOUT_SPELLS;
    ps.has_committed = false;
    ps.has_revealed = false;
    ps.revealed_action = 0;
    ps.revealed_target = Pubkey::default();
    ps.move_target = 0;
    ps.bump = ctx.bumps.player_state;

    // C3 fix: record this player's pubkey so resolve_round can validate remaining_accounts.
    game.players[ps.player_index as usize] = ctx.accounts.player.key();
    game.player_count += 1;

    msg!("Player {} joined game {} (index {})", ctx.accounts.player.key(), game_id, ps.player_index);
    Ok(())
}
