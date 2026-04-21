use anchor_lang::prelude::*;
use crate::state::MatchmakingQueue;
use crate::error::ErrorCode;

/// Remove the calling player from the matchmaking queue.
///
/// Fails if the player is not in the queue (NotInQueue).
/// PDA seeds: ["queue", tier_u8, season_le_u16]
#[derive(Accounts)]
#[instruction(tier: u8, season: u16)]
pub struct LeaveQueue<'info> {
    #[account(
        mut,
        seeds = [b"queue", tier.to_le_bytes().as_ref(), season.to_le_bytes().as_ref()],
        bump = queue.bump,
    )]
    pub queue: Account<'info, MatchmakingQueue>,

    #[account(mut)]
    pub player: Signer<'info>,
}

pub fn handle_leave_queue(ctx: Context<LeaveQueue>, _tier: u8, _season: u16) -> Result<()> {
    let queue = &mut ctx.accounts.queue;
    let player_key = ctx.accounts.player.key();

    let pos = queue.players.iter().position(|p| p == &player_key);
    require!(pos.is_some(), ErrorCode::NotInQueue);

    queue.players.remove(pos.unwrap());

    msg!(
        "Player {} left {} queue (tier={} queue_len={})",
        player_key,
        ["Bronze", "Silver", "Gold"][queue.tier as usize],
        queue.tier,
        queue.players.len(),
    );

    Ok(())
}
