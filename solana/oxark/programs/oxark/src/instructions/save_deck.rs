use anchor_lang::prelude::*;
use std::collections::HashMap;
use crate::state::PlayerDeck;
use crate::error::ErrorCode;

/// Save (or update) the player's prepared battle deck.
///
/// GDD v1.2 validation rules (Phase C cost/rarity cap removed):
///   - exactly 20 cards
///   - max 2 copies of any single card_id
///   - all card_ids in range 1-60
///
/// lane_assignments: optional per-slot lane hint.
///   0=Front, 1=Middle, 2=Back, 255=Any (default).
///   If empty vec is passed, all lanes default to 255 (Any).
///
/// Cannot overwrite while `locked_until > Clock::get().unix_timestamp`.
pub fn handle_save_deck(
    ctx: Context<SaveDeck>,
    cards: Vec<u8>,
    lane_assignments: Vec<u8>,
) -> Result<()> {
    let deck = &mut ctx.accounts.player_deck;
    let clock = Clock::get()?;

    // Locked check
    require!(
        deck.locked_until == 0 || clock.unix_timestamp >= deck.locked_until,
        ErrorCode::DeckLocked
    );

    // Must be exactly 20 cards
    require!(cards.len() == 20, ErrorCode::InvalidDeckComposition);

    // Validate card IDs and count copies (max 2 per card)
    let mut copy_count: HashMap<u8, u8> = HashMap::new();
    for &card_id in &cards {
        require!(card_id >= 1 && card_id <= 60, ErrorCode::InvalidDeckComposition);
        let count = copy_count.entry(card_id).or_insert(0);
        *count += 1;
        require!(*count <= 2, ErrorCode::InvalidDeckComposition);
    }

    // Write deck cards
    deck.owner = ctx.accounts.player.key();
    deck.card_count = 20;
    deck.last_modified = clock.unix_timestamp;

    let mut arr = [0u8; 20];
    for (i, &c) in cards.iter().enumerate() {
        arr[i] = c;
    }
    deck.deck_cards = arr;

    // Write lane assignments (default 255 = Any if not provided)
    let mut lanes = [255u8; 20];
    if lane_assignments.len() == 20 {
        for (i, &lane) in lane_assignments.iter().enumerate() {
            lanes[i] = lane;
        }
    }
    deck.lane_assignments = lanes;

    Ok(())
}

#[derive(Accounts)]
pub struct SaveDeck<'info> {
    #[account(
        init_if_needed,
        payer = player,
        space = PlayerDeck::SIZE,
        seeds = [b"player_deck", player.key().as_ref()],
        bump,
    )]
    pub player_deck: Account<'info, PlayerDeck>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}
