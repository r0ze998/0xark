use anchor_lang::prelude::*;
use crate::state::PlayerTitle;
use crate::error::ErrorCode;

/// Title indices 0-7:
///   0=Traveler (always unlocked), 1=Card Hunter, 2=Chain Wizard,
///   3=Dread Pirate, 4=ZK Mystic, 5=Half-Deck, 6=The Collector, 7=Champion
pub const TITLE_COUNT: u8 = 8;

#[derive(Accounts)]
pub struct SetTitle<'info> {
    #[account(
        init_if_needed,
        payer = player,
        space = PlayerTitle::SIZE,
        seeds = [b"player_title", player.key().as_ref()],
        bump,
    )]
    pub player_title: Account<'info, PlayerTitle>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_set_title(ctx: Context<SetTitle>, title_idx: u8) -> Result<()> {
    require!(title_idx < TITLE_COUNT, ErrorCode::InvalidAction);

    let pt = &mut ctx.accounts.player_title;
    if pt.owner == Pubkey::default() {
        // Init: always unlock title 0 (Traveler)
        pt.owner = ctx.accounts.player.key();
        pt.equipped = 0;
        pt.unlocked = 0b0000_0001; // bit 0 = Traveler always on
        pt.bump = ctx.bumps.player_title;
    }

    require!(pt.is_title_unlocked(title_idx), ErrorCode::InvalidAction);
    pt.equipped = title_idx;
    msg!("Title #{} equipped for {}", title_idx, ctx.accounts.player.key());
    Ok(())
}

/// Instruction to unlock a specific title (called by authority or achievement system).
#[derive(Accounts)]
pub struct UnlockTitle<'info> {
    #[account(
        init_if_needed,
        payer = player,
        space = PlayerTitle::SIZE,
        seeds = [b"player_title", player.key().as_ref()],
        bump,
    )]
    pub player_title: Account<'info, PlayerTitle>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_unlock_title(ctx: Context<UnlockTitle>, title_idx: u8) -> Result<()> {
    require!(title_idx < TITLE_COUNT, ErrorCode::InvalidAction);

    let pt = &mut ctx.accounts.player_title;
    if pt.owner == Pubkey::default() {
        pt.owner = ctx.accounts.player.key();
        pt.equipped = 0;
        pt.unlocked = 0b0000_0001;
        pt.bump = ctx.bumps.player_title;
    }

    let newly = pt.unlock_title(title_idx);
    if newly {
        msg!("Title #{} unlocked for {}", title_idx, ctx.accounts.player.key());
    } else {
        msg!("Title #{} already unlocked", title_idx);
    }
    Ok(())
}
