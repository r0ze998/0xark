use anchor_lang::prelude::*;
use crate::state::{PlayerLevel, XP_BATTLE_WIN, XP_BATTLE_LOSS, XP_CARD_COLLECT,
                   XP_SUPER_EFFECTIVE, XP_ZK_CYCLE, XP_DEATHRATTLE, XP_CHAIN};
use crate::error::ErrorCode;

/// XP reason codes (client must pass one of these).
/// 1=battle_win, 2=battle_loss, 3=card_collect,
/// 4=super_effective, 5=zk_cycle, 6=deathrattle, 7=chain
pub fn xp_amount(reason: u8) -> u64 {
    match reason {
        1 => XP_BATTLE_WIN,
        2 => XP_BATTLE_LOSS,
        3 => XP_CARD_COLLECT,
        4 => XP_SUPER_EFFECTIVE,
        5 => XP_ZK_CYCLE,
        6 => XP_DEATHRATTLE,
        7 => XP_CHAIN,
        _ => 0,
    }
}

#[derive(Accounts)]
pub struct AddXp<'info> {
    #[account(
        init_if_needed,
        payer = player,
        space = PlayerLevel::SIZE,
        seeds = [b"player_level", player.key().as_ref()],
        bump,
    )]
    pub player_level: Account<'info, PlayerLevel>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_add_xp(ctx: Context<AddXp>, reason: u8) -> Result<()> {
    let amount = xp_amount(reason);
    require!(amount > 0, ErrorCode::InvalidAction);

    let pl = &mut ctx.accounts.player_level;
    if pl.owner == Pubkey::default() {
        pl.owner = ctx.accounts.player.key();
        pl.xp_total = 0;
        pl.level = 1;
        pl.bump = ctx.bumps.player_level;
    }

    pl.xp_total = pl.xp_total.saturating_add(amount);
    pl.level = PlayerLevel::level_from_xp(pl.xp_total);

    msg!("XP +{} (reason={}) → total={} level={}", amount, reason, pl.xp_total, pl.level);
    Ok(())
}
