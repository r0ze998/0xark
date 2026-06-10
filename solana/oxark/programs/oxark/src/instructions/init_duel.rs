use crate::error::ErrorCode;
use crate::state::{DuelInitialized, DuelState};
use anchor_lang::prelude::*;

pub const DUEL_SEED: &[u8] = b"duel";

/// Initialize a DuelState PDA when two players are matched.
///
/// Called by matchmaking server (via enter_queue match-success path).
/// PDA seeds: ["duel", duel_id.as_ref()]
#[derive(Accounts)]
#[instruction(duel_id: Pubkey)]
pub struct InitDuel<'info> {
    #[account(
        init,
        payer = authority,
        space = DuelState::SIZE,
        seeds = [DUEL_SEED, duel_id.as_ref()],
        bump,
    )]
    pub duel: Account<'info, DuelState>,

    /// Player 1 in the matched pair
    /// CHECK: just stored as participant pubkey
    pub player_1: UncheckedAccount<'info>,

    /// Player 2 in the matched pair
    /// CHECK: just stored as participant pubkey
    pub player_2: UncheckedAccount<'info>,

    /// Matchmaking authority (server wallet) that pays for PDA creation
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_init_duel(
    ctx: Context<InitDuel>,
    duel_id: Pubkey,
    hall_tier: u8,
    ante: u64,
) -> Result<()> {
    require!(hall_tier <= 2, ErrorCode::InvalidArea); // reuse for tier range check

    let duel = &mut ctx.accounts.duel;
    duel.id = duel_id;
    duel.player_1 = ctx.accounts.player_1.key();
    duel.player_2 = ctx.accounts.player_2.key();
    duel.hall_tier = hall_tier;
    duel.round = 1;
    duel.phase = 0; // Draw
    duel.ante = ante;
    duel.started_at = Clock::get()?.unix_timestamp;
    duel.ended_at = 0;
    duel.winner = Pubkey::default();
    duel.bump = ctx.bumps.duel;

    emit!(DuelInitialized {
        duel_id,
        player_1: duel.player_1,
        player_2: duel.player_2,
    });

    msg!(
        "DuelState initialized: {} (tier={} ante={})",
        duel_id,
        hall_tier,
        ante
    );
    Ok(())
}
