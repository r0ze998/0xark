use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::consts::{MAGIC_CONTEXT_ID, MAGIC_PROGRAM_ID};
use ephemeral_rollups_sdk::ephem::commit_and_undelegate_accounts;
use crate::constants::{GAME_SEED, PLAYER_SEED};
use crate::error::ErrorCode;

// ─── Accounts ─────────────────────────────────────────────────────────────
//
// This instruction is sent to the ER validator (not base layer).
// It calls the Magic program to schedule commit+undelegate for game + player_state.
// After this, the ER validator commits state to base layer and returns
// account ownership to our program.

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct UndelegateSession<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Game PDA — currently delegated on ER. Address verified in handler.
    #[account(mut)]
    pub game: UncheckedAccount<'info>,

    /// CHECK: PlayerState PDA — currently delegated on ER. Address verified in handler.
    #[account(mut)]
    pub player_state: UncheckedAccount<'info>,

    /// CHECK: Magic Context account (MagicContext1111111111111111111111111111111)
    #[account(mut)]
    pub magic_context: UncheckedAccount<'info>,

    /// CHECK: Magic program (Magic11111111111111111111111111111111111111)
    pub magic_program: UncheckedAccount<'info>,
}

// ─── Instruction handler ──────────────────────────────────────────────────

pub fn handle_undelegate_session(
    ctx: Context<UndelegateSession>,
    game_id: u64,
) -> Result<()> {
    // Verify magic program address
    require_keys_eq!(
        ctx.accounts.magic_program.key(),
        MAGIC_PROGRAM_ID,
        ErrorCode::WrongMagicProgram,
    );

    // Verify magic context address
    require_keys_eq!(
        ctx.accounts.magic_context.key(),
        MAGIC_CONTEXT_ID,
        ErrorCode::WrongMagicContext,
    );

    // Verify game PDA derivation
    let game_id_bytes = game_id.to_le_bytes();
    let (expected_game, _) = Pubkey::find_program_address(
        &[GAME_SEED, &game_id_bytes],
        &crate::id(),
    );
    require_keys_eq!(
        ctx.accounts.game.key(),
        expected_game,
        ErrorCode::WrongGameAccount,
    );

    // Verify player_state PDA derivation
    let (expected_player, _) = Pubkey::find_program_address(
        &[PLAYER_SEED, &game_id_bytes, ctx.accounts.payer.key.as_ref()],
        &crate::id(),
    );
    require_keys_eq!(
        ctx.accounts.player_state.key(),
        expected_player,
        ErrorCode::WrongPlayerStateAccount,
    );

    // Schedule commit + undelegate via the Magic program
    commit_and_undelegate_accounts(
        &ctx.accounts.payer.to_account_info(),
        vec![
            &ctx.accounts.game.to_account_info(),
            &ctx.accounts.player_state.to_account_info(),
        ],
        &ctx.accounts.magic_context.to_account_info(),
        &ctx.accounts.magic_program.to_account_info(),
    )
    .map_err(anchor_lang::error::Error::from)?;

    msg!("UndelegateSession: game {} commit+undelegate scheduled", game_id);
    Ok(())
}
