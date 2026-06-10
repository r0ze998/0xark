use crate::error::ErrorCode;
use crate::state::{MatchmakingQueue, PlayerBattleStats, PlayerState, QueueMatchReady};
use anchor_lang::prelude::*;

/// Enter the matchmaking queue for the given tier (0=Bronze, 1=Silver, 2=Gold).
///
/// Tier gate:
///   Bronze (0): no restriction
///   Silver (1): requires PlayerBattleStats.wins_at_tier[0] >= 5
///   Gold   (2): requires PlayerBattleStats.wins_at_tier[1] >= 3
///
/// Also rejects if the player is already in a queue (PlayerState.current_queue.is_some()).
///
/// When queue.players.len() reaches 2 after the push, emits QueueMatchReady with
/// both player pubkeys so clients can begin the duel flow.
///
/// PDA seeds:
///   queue:        ["queue", tier_u8, season_le_u16]
///   player_state: caller's PlayerState (game-agnostic lookup by player pubkey)
///   battle_stats: ["player_battle_stats", player_pubkey]  (init_if_needed)
#[derive(Accounts)]
#[instruction(tier: u8, season: u16)]
pub struct EnterQueue<'info> {
    #[account(
        init_if_needed,
        payer = player,
        space = MatchmakingQueue::SIZE,
        seeds = [b"queue", tier.to_le_bytes().as_ref(), season.to_le_bytes().as_ref()],
        bump,
    )]
    pub queue: Account<'info, MatchmakingQueue>,

    #[account(
        init_if_needed,
        payer = player,
        space = PlayerBattleStats::SIZE,
        seeds = [b"player_battle_stats", player.key().as_ref()],
        bump,
    )]
    pub battle_stats: Account<'info, PlayerBattleStats>,

    /// CHECK: optional — may be uninitialised if player has never joined a game.
    /// We only read current_queue; caller must pass their PlayerState if they have one.
    #[account(mut)]
    pub player_state: UncheckedAccount<'info>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_enter_queue(ctx: Context<EnterQueue>, tier: u8, season: u16) -> Result<()> {
    require!(tier <= 2, ErrorCode::InvalidAction);
    require!(
        ctx.accounts.queue.players.len() < MatchmakingQueue::MAX_PLAYERS,
        ErrorCode::QueueFull
    );

    // Initialise PlayerBattleStats if new
    let stats = &mut ctx.accounts.battle_stats;
    if stats.owner == Pubkey::default() {
        stats.owner = ctx.accounts.player.key();
        stats.bump = ctx.bumps.battle_stats;
    }

    // Tier gate
    if tier == 1 {
        require!(stats.wins_at_tier[0] >= 5, ErrorCode::TierLocked);
    } else if tier == 2 {
        require!(stats.wins_at_tier[1] >= 3, ErrorCode::TierLocked);
    }

    // Duplicate check — if player_state is a valid PlayerState account with current_queue set,
    // reject. We use a best-effort discriminant check (first 8 bytes), skip if uninitialised.
    let ps_data = ctx.accounts.player_state.try_borrow_data()?;
    if ps_data.len() >= PlayerState::SIZE {
        // Deserialise just the current_queue field (last 33 bytes: Option<Pubkey>)
        let offset = PlayerState::SIZE - 33; // 1 discriminant + 32 pubkey
        if ps_data[offset] == 1 {
            return err!(ErrorCode::AlreadyInQueue);
        }
    }
    drop(ps_data);

    let queue = &mut ctx.accounts.queue;

    // Initialise queue if new
    if queue.created_at == 0 {
        queue.tier = tier;
        queue.season = season;
        queue.created_at = Clock::get()?.unix_timestamp;
        queue.bump = ctx.bumps.queue;
    }

    let player_key = ctx.accounts.player.key();
    require!(
        !queue.players.contains(&player_key),
        ErrorCode::AlreadyInQueue
    );

    queue.players.push(player_key);

    msg!(
        "Player {} entered {} queue (tier={} season={} queue_len={})",
        player_key,
        ["Bronze", "Silver", "Gold"][tier as usize],
        tier,
        season,
        queue.players.len(),
    );

    // Match found: queue has 2 players
    if queue.players.len() == 2 {
        let player_a = queue.players[0];
        let player_b = queue.players[1];
        emit!(QueueMatchReady {
            tier,
            season,
            player_a,
            player_b
        });
        msg!("MATCH READY — {} vs {} (tier={})", player_a, player_b, tier);
    }

    Ok(())
}
