use anchor_lang::prelude::*;
use crate::state::{Game, CardCommitRecord, GameStatus};
use crate::error::ErrorCode;
use sha2::{Sha256, Digest};

/// Reveal the previously committed card (Axis C — 2-phase bluff battle).
///
/// Verifies on-chain that `SHA256(card_id | salt) == stored_commitment`.
///
/// Note: For hackathon MVP we use SHA-256 for the on-chain verify
/// (matching the existing commit_action pattern) rather than Groth16,
/// since Poseidon-based Groth16 verification requires 80-200k CUs.
/// The card_commit.circom circuit is ready for full ZK in Mainnet v1.
///
/// After verification, `card_id` is stored in the CardCommitRecord
/// and marked `revealed = true`. The caller's client can then read
/// the opponent's card for the round resolution display.
pub fn handle_reveal_card(
    ctx: Context<RevealCard>,
    game_id: u64,
    card_id: u8,
    salt: [u8; 32],
) -> Result<()> {
    let game = &ctx.accounts.game;
    require!(game.game_id == game_id, ErrorCode::WrongGameAccount);
    require!(
        game.status == GameStatus::RevealPhase || game.status == GameStatus::CommitPhase,
        ErrorCode::NotRevealPhase
    );

    let record = &mut ctx.accounts.card_commit_record;
    require!(!record.revealed, ErrorCode::AlreadyRevealed);
    require!(card_id >= 1 && card_id <= 60, ErrorCode::InvalidAction);

    // Verify: SHA256(card_id | salt) == commitment
    let mut hasher = Sha256::new();
    hasher.update([card_id]);
    hasher.update(salt);
    let hash: [u8; 32] = hasher.finalize().into();

    require!(hash == record.commitment, ErrorCode::HashMismatch);

    record.card_id  = card_id;
    record.revealed = true;

    Ok(())
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct RevealCard<'info> {
    #[account(
        seeds = [b"game", game_id.to_le_bytes().as_ref()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,

    #[account(
        mut,
        seeds = [
            b"card_commit",
            player.key().as_ref(),
            game_id.to_le_bytes().as_ref(),
            &[game.round],
        ],
        bump = card_commit_record.bump,
        constraint = card_commit_record.player == player.key() @ ErrorCode::WrongPlayerStateAccount,
    )]
    pub card_commit_record: Account<'info, CardCommitRecord>,

    #[account(mut)]
    pub player: Signer<'info>,
}
