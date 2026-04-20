use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::{AccountMeta, Instruction};
use anchor_lang::solana_program::program::invoke_signed;
use crate::constants::{GAME_SEED, PLAYER_SEED};
use crate::state::{Game, PlayerState};

// Delegation program: DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh
const DELEGATION_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    181, 183, 0, 225, 242, 87, 58, 192, 204, 6, 34, 1, 52, 74, 207, 151,
    184, 53, 6, 235, 140, 229, 25, 152, 204, 98, 126, 24, 147, 128, 167, 62,
]);

// ─── Accounts ─────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct DelegateSession<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    // Game PDA — will be delegated to the ER
    #[account(
        mut,
        seeds = [GAME_SEED, game_id.to_le_bytes().as_ref()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,

    // PlayerState PDA — will be delegated to the ER
    #[account(
        mut,
        seeds = [PLAYER_SEED, game_id.to_le_bytes().as_ref(), payer.key().as_ref()],
        bump = player_state.bump,
    )]
    pub player_state: Account<'info, PlayerState>,

    // Game delegation accounts (created by the delegation program CPI)
    /// CHECK: Buffer PDA: seeds=["buffer", game] derived from owner program
    #[account(mut)]
    pub game_buffer: UncheckedAccount<'info>,

    /// CHECK: Delegation record PDA: seeds=["delegation", game] from delegation program
    #[account(mut)]
    pub game_delegation_record: UncheckedAccount<'info>,

    /// CHECK: Delegation metadata PDA: seeds=["delegation-metadata", game] from delegation program
    #[account(mut)]
    pub game_delegation_metadata: UncheckedAccount<'info>,

    // PlayerState delegation accounts
    /// CHECK: Buffer PDA: seeds=["buffer", player_state] derived from owner program
    #[account(mut)]
    pub player_buffer: UncheckedAccount<'info>,

    /// CHECK: Delegation record PDA: seeds=["delegation", player_state] from delegation program
    #[account(mut)]
    pub player_delegation_record: UncheckedAccount<'info>,

    /// CHECK: Delegation metadata PDA: seeds=["delegation-metadata", player_state] from delegation program
    #[account(mut)]
    pub player_delegation_metadata: UncheckedAccount<'info>,

    /// CHECK: This program's own ID — passed as owner_program to the delegation CPI
    pub owner_program: UncheckedAccount<'info>,

    /// CHECK: MagicBlock delegation program
    pub delegation_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

// ─── Instruction handler ──────────────────────────────────────────────────

pub fn handle_delegate_session(ctx: Context<DelegateSession>, game_id: u64) -> Result<()> {
    let game_id_bytes = game_id.to_le_bytes();
    let game_bump = ctx.accounts.game.bump;
    let player_bump = ctx.accounts.player_state.bump;

    // Verify delegation program address
    require_keys_eq!(
        ctx.accounts.delegation_program.key(),
        DELEGATION_PROGRAM_ID,
        DelegationError::WrongDelegationProgram,
    );

    // Verify owner_program is this program
    require_keys_eq!(
        ctx.accounts.owner_program.key(),
        crate::id(),
        DelegationError::WrongOwnerProgram,
    );

    // ── Delegate Game PDA ──────────────────────────────────────────────────
    let game_seeds: &[&[u8]] = &[b"game", &game_id_bytes];
    let signer_seeds_game: &[&[&[u8]]] = &[&[GAME_SEED, &game_id_bytes, &[game_bump]]];

    let ix_game = build_delegate_ix(
        &ctx.accounts.payer.key(),
        &ctx.accounts.game.key(),
        &ctx.accounts.owner_program.key(),
        &ctx.accounts.game_buffer.key(),
        &ctx.accounts.game_delegation_record.key(),
        &ctx.accounts.game_delegation_metadata.key(),
        game_seeds,
        3_000, // commit every 3 seconds
    );

    invoke_signed(
        &ix_game,
        &[
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.game.to_account_info(),
            ctx.accounts.owner_program.to_account_info(),
            ctx.accounts.game_buffer.to_account_info(),
            ctx.accounts.game_delegation_record.to_account_info(),
            ctx.accounts.game_delegation_metadata.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.delegation_program.to_account_info(),
        ],
        signer_seeds_game,
    )?;

    // ── Delegate PlayerState PDA ───────────────────────────────────────────
    let player_seeds: &[&[u8]] = &[
        b"player",
        &game_id_bytes,
        ctx.accounts.payer.key.as_ref(),
    ];
    let signer_seeds_player: &[&[&[u8]]] = &[&[
        PLAYER_SEED,
        &game_id_bytes,
        ctx.accounts.payer.key.as_ref(),
        &[player_bump],
    ]];

    let ix_player = build_delegate_ix(
        &ctx.accounts.payer.key(),
        &ctx.accounts.player_state.key(),
        &ctx.accounts.owner_program.key(),
        &ctx.accounts.player_buffer.key(),
        &ctx.accounts.player_delegation_record.key(),
        &ctx.accounts.player_delegation_metadata.key(),
        player_seeds,
        3_000,
    );

    invoke_signed(
        &ix_player,
        &[
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.player_state.to_account_info(),
            ctx.accounts.owner_program.to_account_info(),
            ctx.accounts.player_buffer.to_account_info(),
            ctx.accounts.player_delegation_record.to_account_info(),
            ctx.accounts.player_delegation_metadata.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.delegation_program.to_account_info(),
        ],
        signer_seeds_player,
    )?;

    msg!("DelegateSession: game {} + player_state delegated to ER", game_id);
    Ok(())
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/// Build the delegation program's `delegate` instruction.
///
/// Data layout (manually serialized):
///   [0; 8]                        discriminator (all zeros)
///   commit_frequency_ms as u32 LE
///   seeds.len() as u32 LE
///   for each seed: len(u32 LE) + bytes
///   0x00                           validator = None
#[allow(clippy::too_many_arguments)]
fn build_delegate_ix(
    payer: &Pubkey,
    delegated_account: &Pubkey,
    owner_program: &Pubkey,
    buffer: &Pubkey,
    delegation_record: &Pubkey,
    delegation_metadata: &Pubkey,
    seeds: &[&[u8]],
    commit_frequency_ms: u32,
) -> Instruction {
    let accounts = vec![
        AccountMeta::new(*payer, true),                // [0] payer (signer, writable)
        AccountMeta::new(*delegated_account, true),    // [1] delegated_account (signer, writable)
        AccountMeta::new_readonly(*owner_program, false), // [2] owner_program
        AccountMeta::new(*buffer, false),              // [3] delegate_buffer (writable)
        AccountMeta::new(*delegation_record, false),   // [4] delegation_record (writable)
        AccountMeta::new(*delegation_metadata, false), // [5] delegation_metadata (writable)
        AccountMeta::new_readonly(anchor_lang::solana_program::system_program::id(), false), // [6] system_program
    ];

    let data = build_delegate_data(seeds, commit_frequency_ms);

    Instruction {
        program_id: DELEGATION_PROGRAM_ID,
        accounts,
        data,
    }
}

/// Serialize delegation instruction data.
/// Format: discriminator(8) + commit_freq(4) + seeds_count(4) + seeds... + validator_flag(1)
fn build_delegate_data(seeds: &[&[u8]], commit_frequency_ms: u32) -> Vec<u8> {
    // Total size estimate (will grow as needed)
    let mut data: Vec<u8> = Vec::with_capacity(64);

    // Discriminator: 8 zero bytes
    data.extend_from_slice(&[0u8; 8]);

    // commit_frequency_ms as u32 LE
    data.extend_from_slice(&commit_frequency_ms.to_le_bytes());

    // seeds: Vec<Vec<u8>> as borsh — length prefix + each component
    data.extend_from_slice(&(seeds.len() as u32).to_le_bytes());
    for seed in seeds {
        data.extend_from_slice(&(seed.len() as u32).to_le_bytes());
        data.extend_from_slice(seed);
    }

    // validator: Option<Pubkey> — None = 0x00
    data.push(0x00);

    data
}

// ─── Errors ───────────────────────────────────────────────────────────────

#[error_code]
pub enum DelegationError {
    #[msg("Wrong delegation program address")]
    WrongDelegationProgram,
    #[msg("Wrong owner program address")]
    WrongOwnerProgram,
}
