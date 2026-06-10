use crate::error::ErrorCode;
use crate::state::PlayerAchievements;
use anchor_lang::prelude::*;

/// Achievement indices 0-9:
///   0=first_blood, 1=collector_10, 2=collector_30, 3=full_set,
///   4=chain_master, 5=dr_survived, 6=zk_committed, 7=super_x5,
///   8=dungeon_floor5, 9=season_top
pub const ACHIEVEMENT_COUNT: u8 = 10;

#[derive(Accounts)]
pub struct UnlockAchievement<'info> {
    #[account(
        init_if_needed,
        payer = player,
        space = PlayerAchievements::SIZE,
        seeds = [b"player_achievements", player.key().as_ref()],
        bump,
    )]
    pub player_achievements: Account<'info, PlayerAchievements>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_unlock_achievement(ctx: Context<UnlockAchievement>, idx: u8) -> Result<()> {
    require!(idx < ACHIEVEMENT_COUNT, ErrorCode::InvalidAction);

    let pa = &mut ctx.accounts.player_achievements;
    if pa.owner == Pubkey::default() {
        pa.owner = ctx.accounts.player.key();
        pa.flags = 0;
        pa.bump = ctx.bumps.player_achievements;
    }

    let newly_unlocked = pa.unlock(idx);
    if newly_unlocked {
        msg!(
            "Achievement #{} unlocked for {}",
            idx,
            ctx.accounts.player.key()
        );
    } else {
        msg!("Achievement #{} already unlocked", idx);
    }
    Ok(())
}
