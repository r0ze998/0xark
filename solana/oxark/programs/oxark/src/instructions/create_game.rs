use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;

#[derive(Accounts)]
#[instruction(game_id: u64, max_players: u8)]
pub struct CreateGame<'info> {
    #[account(
        init,
        payer = host,
        space = Game::SIZE,
        seeds = [GAME_SEED, game_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub game: Account<'info, Game>,
    #[account(
        init,
        payer = host,
        space = CardPool::SIZE,
        seeds = [CARD_POOL_SEED, game_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub card_pool: Account<'info, CardPool>,
    #[account(mut)]
    pub host: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_create_game(ctx: Context<CreateGame>, game_id: u64, max_players: u8) -> Result<()> {
    require!((1..=MAX_PLAYERS).contains(&max_players), crate::error::ErrorCode::InvalidAction);

    let game = &mut ctx.accounts.game;
    game.game_id = game_id;
    game.host = ctx.accounts.host.key();
    game.status = GameStatus::Lobby;
    game.round = 0;
    game.max_rounds = MAX_ROUNDS;
    game.player_count = 0;
    game.max_players = max_players;
    game.cards_in_pool = TOTAL_CARDS;
    game.winner = Pubkey::default();
    game.commit_count = 0;
    game.reveal_count = 0;
    game.bump = ctx.bumps.game;
    game.players = [Pubkey::default(); 3]; // populated in join_game (C3 fix)

    let pool = &mut ctx.accounts.card_pool;
    pool.game_id = game_id;
    pool.remaining = CARDS_PER_TYPE;
    pool.bump = ctx.bumps.card_pool;

    msg!("Game {} created by {}", game_id, ctx.accounts.host.key());
    Ok(())
}
