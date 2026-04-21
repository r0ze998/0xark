use anchor_lang::prelude::*;
use crate::state::{Game, CardCommitRecord, GameStatus};
use crate::error::ErrorCode;

/// Submit a ZK card commitment for the 2-phase bluff battle (Axis C).
///
/// The player selects a card from hand, computes:
///   `commitment = Poseidon(card_id, salt)`
/// in the browser (via snarkjs), then sends this commitment on-chain.
///
/// The actual card_id remains hidden until `reveal_card` is called.
/// Both players must commit before the reveal phase begins.
///
/// PDA seeds: `["card_commit", player_pubkey, game_id_le, round_u8]`
pub fn handle_commit_card(
    ctx: Context<CommitCard>,
    game_id: u64,
    commitment: [u8; 32],
) -> Result<()> {
    let game = &ctx.accounts.game;
    require!(game.game_id == game_id, ErrorCode::WrongGameAccount);
    require!(
        game.status == GameStatus::CommitPhase,
        ErrorCode::NotCommitPhase
    );

    let record = &mut ctx.accounts.card_commit_record;
    record.game_id    = game_id;
    record.player     = ctx.accounts.player.key();
    record.round      = game.round;
    record.commitment = commitment;
    record.revealed   = false;
    record.card_id    = 0;

    Ok(())
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct CommitCard<'info> {
    #[account(
        seeds = [b"game", game_id.to_le_bytes().as_ref()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,

    #[account(
        init_if_needed,
        payer = player,
        space = CardCommitRecord::SIZE,
        seeds = [
            b"card_commit",
            player.key().as_ref(),
            game_id.to_le_bytes().as_ref(),
            &[game.round],
        ],
        bump,
    )]
    pub card_commit_record: Account<'info, CardCommitRecord>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}
