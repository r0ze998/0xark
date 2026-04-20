use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::cpi::{
    delegate_account, DelegateAccounts, DelegateConfig, DELEGATION_PROGRAM_ID,
};
use crate::constants::{GAME_SEED, PLAYER_SEED};
use crate::error::ErrorCode;

// Asia validator: MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57
const ASIA_VALIDATOR: Pubkey = Pubkey::new_from_array([
    5, 42, 71, 171, 131, 122, 182, 12, 61, 216, 159, 196, 200, 74, 97, 158,
    42, 140, 82, 47, 63, 129, 136, 254, 226, 67, 138, 88, 169, 118, 23, 178,
]);

// ─── Accounts ─────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct DelegateSession<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Game PDA — will be delegated to ER. Address verified via find_program_address in handler.
    #[account(mut)]
    pub game: UncheckedAccount<'info>,

    /// CHECK: PlayerState PDA — will be delegated to ER. Address verified via find_program_address in handler.
    #[account(mut)]
    pub player_state: UncheckedAccount<'info>,

    /// CHECK: Buffer PDA for game (seeds = ["buffer", game] from owner program)
    #[account(mut)]
    pub game_buffer: UncheckedAccount<'info>,

    /// CHECK: Delegation record PDA for game
    #[account(mut)]
    pub game_delegation_record: UncheckedAccount<'info>,

    /// CHECK: Delegation metadata PDA for game
    #[account(mut)]
    pub game_delegation_metadata: UncheckedAccount<'info>,

    /// CHECK: Buffer PDA for player_state
    #[account(mut)]
    pub player_buffer: UncheckedAccount<'info>,

    /// CHECK: Delegation record PDA for player_state
    #[account(mut)]
    pub player_delegation_record: UncheckedAccount<'info>,

    /// CHECK: Delegation metadata PDA for player_state
    #[account(mut)]
    pub player_delegation_metadata: UncheckedAccount<'info>,

    /// CHECK: This program's own ID — passed as owner_program to the delegation CPI
    pub owner_program: UncheckedAccount<'info>,

    /// CHECK: MagicBlock delegation program (DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh)
    pub delegation_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

// ─── Instruction handler ──────────────────────────────────────────────────

pub fn handle_delegate_session(ctx: Context<DelegateSession>, game_id: u64) -> Result<()> {
    let game_id_bytes = game_id.to_le_bytes();

    // Verify delegation program and owner program addresses
    require_keys_eq!(
        ctx.accounts.delegation_program.key(),
        DELEGATION_PROGRAM_ID,
        ErrorCode::WrongDelegationProgram,
    );
    require_keys_eq!(
        ctx.accounts.owner_program.key(),
        crate::id(),
        ErrorCode::WrongOwnerProgram,
    );

    // Verify game PDA derivation
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

    // Pre-borrow account infos to avoid temporary reference issues
    let payer_info = ctx.accounts.payer.to_account_info();
    let owner_program_info = ctx.accounts.owner_program.to_account_info();
    let delegation_program_info = ctx.accounts.delegation_program.to_account_info();
    let system_program_info = ctx.accounts.system_program.to_account_info();

    // ── Delegate Game PDA ──────────────────────────────────────────────────
    delegate_account(
        DelegateAccounts {
            payer: &payer_info,
            pda: &ctx.accounts.game.to_account_info(),
            owner_program: &owner_program_info,
            buffer: &ctx.accounts.game_buffer.to_account_info(),
            delegation_record: &ctx.accounts.game_delegation_record.to_account_info(),
            delegation_metadata: &ctx.accounts.game_delegation_metadata.to_account_info(),
            delegation_program: &delegation_program_info,
            system_program: &system_program_info,
        },
        &[GAME_SEED, &game_id_bytes],
        DelegateConfig {
            commit_frequency_ms: 3_000,
            validator: Some(ASIA_VALIDATOR),
        },
    )
    .map_err(anchor_lang::error::Error::from)?;

    // ── Delegate PlayerState PDA ───────────────────────────────────────────
    delegate_account(
        DelegateAccounts {
            payer: &payer_info,
            pda: &ctx.accounts.player_state.to_account_info(),
            owner_program: &owner_program_info,
            buffer: &ctx.accounts.player_buffer.to_account_info(),
            delegation_record: &ctx.accounts.player_delegation_record.to_account_info(),
            delegation_metadata: &ctx.accounts.player_delegation_metadata.to_account_info(),
            delegation_program: &delegation_program_info,
            system_program: &system_program_info,
        },
        &[PLAYER_SEED, &game_id_bytes, ctx.accounts.payer.key.as_ref()],
        DelegateConfig {
            commit_frequency_ms: 3_000,
            validator: Some(ASIA_VALIDATOR),
        },
    )
    .map_err(anchor_lang::error::Error::from)?;

    msg!("DelegateSession: game {} + player_state delegated to ER", game_id);
    Ok(())
}
