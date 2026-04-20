use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::{AccountMeta, Instruction};
use anchor_lang::solana_program::program::invoke;
use crate::constants::{GAME_SEED, PLAYER_SEED};
use crate::error::ErrorCode;

// Magic program: Magic11111111111111111111111111111111111111
const MAGIC_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    5, 69, 180, 36, 176, 218, 112, 149, 236, 185, 214, 222, 195, 119, 215, 40,
    145, 182, 231, 142, 146, 234, 18, 214, 223, 187, 58, 64, 0, 0, 0, 0,
]);

// Magic context: MagicContext1111111111111111111111111111111
const MAGIC_CONTEXT_ID: Pubkey = Pubkey::new_from_array([
    5, 69, 180, 36, 196, 165, 40, 191, 95, 180, 3, 47, 68, 82, 130, 142,
    187, 56, 171, 193, 210, 220, 151, 247, 63, 139, 148, 84, 128, 0, 0, 0,
]);

// MagicBlockInstruction::ScheduleCommitAndUndelegate = variant 2
// Serialized as bincode u32 LE: [2, 0, 0, 0]
const SCHEDULE_COMMIT_AND_UNDELEGATE_DATA: [u8; 4] = [2, 0, 0, 0];

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

    // Game PDA — currently delegated (owner = DELEGATION_PROGRAM_ID on ER)
    // After undelegation: owner returns to our program on base layer.
    /// CHECK: Game PDA, delegated to ER. Address validated via seeds + bump in handler.
    #[account(mut)]
    pub game: UncheckedAccount<'info>,

    // PlayerState PDA — currently delegated
    /// CHECK: PlayerState PDA, delegated to ER. Address validated via seeds + bump in handler.
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

    // ── Build ScheduleCommitAndUndelegate instruction ──────────────────────
    //
    // Magic program instruction layout:
    //   data:     [2, 0, 0, 0]  (bincode u32 = ScheduleCommitAndUndelegate variant 2)
    //   accounts: payer (signer/writable), magic_context (writable),
    //             ...target accounts (with their delegation-era flags)
    //
    // The ER validator processes this instruction, commits state diffs to
    // base layer, then calls the delegation program's Undelegate instruction
    // to restore account ownership.
    let accounts_meta = vec![
        AccountMeta::new(ctx.accounts.payer.key(), true),         // payer
        AccountMeta::new(ctx.accounts.magic_context.key(), false), // magic_context
        AccountMeta::new(ctx.accounts.game.key(), false),         // game (commit target)
        AccountMeta::new(ctx.accounts.player_state.key(), false), // player_state (commit target)
    ];

    let ix = Instruction {
        program_id: MAGIC_PROGRAM_ID,
        accounts: accounts_meta,
        data: SCHEDULE_COMMIT_AND_UNDELEGATE_DATA.to_vec(),
    };

    invoke(
        &ix,
        &[
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.magic_context.to_account_info(),
            ctx.accounts.game.to_account_info(),
            ctx.accounts.player_state.to_account_info(),
            ctx.accounts.magic_program.to_account_info(),
        ],
    )?;

    msg!("UndelegateSession: game {} commit+undelegate scheduled via Magic program", game_id);
    Ok(())
}

// Errors: WrongMagicProgram / WrongMagicContext / WrongGameAccount / WrongPlayerStateAccount
// are defined in crate::error::ErrorCode.
