use anchor_lang::prelude::*;
use crate::state::PlayerRegistry;
use crate::error::ErrorCode;

/// Register a card species in the player's permanent registry (GI rule).
///
/// First time a player acquires card species X → registered[X] = true (permanent).
/// Subsequent copies → does not change registry (card is battle-consumable extra).
/// When count reaches 60 → season_complete = true.
///
/// PDA seeds: ["player_registry", player_pubkey]
pub fn handle_register_card(
    ctx: Context<RegisterCardCtx>,
    card_id: u8,
) -> Result<()> {
    require!(card_id >= 1 && card_id <= 60, ErrorCode::InvalidAction);
    let registry = &mut ctx.accounts.player_registry;
    let idx = (card_id - 1) as usize;

    if !registry.registered[idx] {
        registry.registered[idx] = true;
        registry.registered_at[idx] = Clock::get()?.unix_timestamp;
        registry.count = registry.count.saturating_add(1);

        if registry.count >= 60 {
            registry.season_complete = true;
        }
    }

    registry.bump = ctx.bumps.player_registry;
    Ok(())
}

#[derive(Accounts)]
pub struct RegisterCardCtx<'info> {
    #[account(
        init_if_needed,
        payer = player,
        space = PlayerRegistry::SIZE,
        seeds = [b"player_registry", player.key().as_ref()],
        bump,
    )]
    pub player_registry: Account<'info, PlayerRegistry>,

    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}
