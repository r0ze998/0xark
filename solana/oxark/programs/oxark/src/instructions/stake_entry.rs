use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;
use crate::error::ErrorCode;

/// Entry stake system for competitive play.
/// Players deposit SOL (or USDC in Phase 2) when joining a game.
/// Winner takes the entire pot when the game ends.
///
/// Phase 1: SOL-based staking (simpler, no SPL token dependency)
/// Phase 2: USDC staking via SPL token transfers

/// Stake vault PDA that holds entry fees
#[account]
#[derive(Default)]
pub struct StakeVault {
    pub game_id: u64,
    pub total_staked: u64,       // Total lamports staked
    pub stake_per_player: u64,   // Required stake per player
    pub claimed: bool,           // Whether winner has claimed
    pub bump: u8,
}

impl StakeVault {
    pub const SIZE: usize = 8 + 8 + 8 + 8 + 1 + 1;
}

pub const STAKE_VAULT_SEED: &[u8] = b"stake_vault";

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct DepositStake<'info> {
    #[account(
        seeds = [GAME_SEED, game_id.to_le_bytes().as_ref()],
        bump = game.bump,
        constraint = game.status == GameStatus::Lobby @ ErrorCode::NotInLobby,
    )]
    pub game: Account<'info, Game>,
    #[account(
        init,
        payer = player,
        space = StakeVault::SIZE,
        seeds = [STAKE_VAULT_SEED, game_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub stake_vault: Account<'info, StakeVault>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_deposit_stake(ctx: Context<DepositStake>, game_id: u64) -> Result<()> {
    let vault = &mut ctx.accounts.stake_vault;
    let stake_amount: u64 = 500_000_000; // 0.5 SOL entry fee (per GDD)

    // Transfer SOL from player to vault PDA
    let ix = anchor_lang::solana_program::system_instruction::transfer(
        &ctx.accounts.player.key(),
        &vault.key(),
        stake_amount,
    );
    anchor_lang::solana_program::program::invoke(
        &ix,
        &[
            ctx.accounts.player.to_account_info(),
            vault.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;

    vault.game_id = game_id;
    vault.total_staked += stake_amount;
    vault.stake_per_player = stake_amount;
    vault.claimed = false;
    if vault.bump == 0 {
        vault.bump = ctx.bumps.stake_vault;
    }

    msg!("Player {} staked {} lamports for game {}", ctx.accounts.player.key(), stake_amount, game_id);
    Ok(())
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct ClaimPrize<'info> {
    #[account(
        seeds = [GAME_SEED, game_id.to_le_bytes().as_ref()],
        bump = game.bump,
        constraint = game.status == GameStatus::Finished @ ErrorCode::GameFinished,
        constraint = game.winner == player.key() @ ErrorCode::NotHost,
    )]
    pub game: Account<'info, Game>,
    #[account(
        mut,
        seeds = [STAKE_VAULT_SEED, game_id.to_le_bytes().as_ref()],
        bump = stake_vault.bump,
        constraint = !stake_vault.claimed @ ErrorCode::InvalidAction,
    )]
    pub stake_vault: Account<'info, StakeVault>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_claim_prize(ctx: Context<ClaimPrize>, _game_id: u64) -> Result<()> {
    let vault = &mut ctx.accounts.stake_vault;
    let prize = vault.total_staked;

    // Transfer all staked SOL from vault to winner
    **vault.to_account_info().try_borrow_mut_lamports()? -= prize;
    **ctx.accounts.player.to_account_info().try_borrow_mut_lamports()? += prize;

    vault.claimed = true;

    msg!("Winner {} claimed {} lamports prize!", ctx.accounts.player.key(), prize);

    emit!(PrizeClaimed {
        game_id: vault.game_id,
        winner: ctx.accounts.player.key(),
        amount: prize,
    });

    Ok(())
}

#[event]
pub struct PrizeClaimed {
    pub game_id: u64,
    pub winner: Pubkey,
    pub amount: u64,
}
