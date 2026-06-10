// update_game_params — Phase 20-B admin instruction.
// Allows the game authority (ADMIN_PUBKEY) to adjust shop drop rates and phase threshold.

use crate::constants::ADMIN_PUBKEY;
use crate::error::ErrorCode;
use crate::state::{GameParamsUpdatedEvent, GameWorld};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateGameParams<'info> {
    #[account(
        mut,
        constraint = admin.key() == ADMIN_PUBKEY @ ErrorCode::NotAdmin,
    )]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"game_world"],
        bump = game_world.bump,
    )]
    pub game_world: Account<'info, GameWorld>,
}

pub fn handle_update_game_params(
    ctx: Context<UpdateGameParams>,
    legendary_rate_phase1: Option<u32>,
    legendary_rate_phase2: Option<u32>,
    rare_rate_phase1: Option<u32>,
    rare_rate_phase2: Option<u32>,
    uncommon_rate: Option<u32>,
    threshold_seconds: Option<u64>,
) -> Result<()> {
    let gw = &mut ctx.accounts.game_world;

    if let Some(rate) = legendary_rate_phase1 {
        require!(rate <= 100_000, ErrorCode::InvalidRate);
        gw.legendary_drop_rate_phase1 = rate;
    }
    if let Some(rate) = legendary_rate_phase2 {
        require!(rate <= 100_000, ErrorCode::InvalidRate);
        gw.legendary_drop_rate_phase2 = rate;
    }
    if let Some(rate) = rare_rate_phase1 {
        gw.rare_drop_rate_phase1 = rate;
    }
    if let Some(rate) = rare_rate_phase2 {
        gw.rare_drop_rate_phase2 = rate;
    }
    if let Some(rate) = uncommon_rate {
        gw.uncommon_drop_rate = rate;
    }
    if let Some(secs) = threshold_seconds {
        require!(secs <= 14 * 24 * 3600, ErrorCode::InvalidThreshold);
        gw.shop_phase_threshold_seconds = secs;
    }

    emit!(GameParamsUpdatedEvent {
        legendary_rate_phase1: gw.legendary_drop_rate_phase1,
        legendary_rate_phase2: gw.legendary_drop_rate_phase2,
        rare_rate_phase1: gw.rare_drop_rate_phase1,
        rare_rate_phase2: gw.rare_drop_rate_phase2,
        uncommon_rate: gw.uncommon_drop_rate,
        threshold_seconds: gw.shop_phase_threshold_seconds,
    });

    msg!(
        "update_game_params: leg_p1={} leg_p2={} rare_p1={} rare_p2={} unc={} threshold={}",
        gw.legendary_drop_rate_phase1,
        gw.legendary_drop_rate_phase2,
        gw.rare_drop_rate_phase1,
        gw.rare_drop_rate_phase2,
        gw.uncommon_drop_rate,
        gw.shop_phase_threshold_seconds,
    );
    Ok(())
}
