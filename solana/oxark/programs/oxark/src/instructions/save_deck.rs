use anchor_lang::prelude::*;
use crate::state::PlayerDeck;
use crate::error::ErrorCode;

/// Card cost lookup by card_id (1-indexed; 0 = empty).
/// card_id 1-20 = Common (cost 1)
/// card_id 21-40 = Rare   (cost 2)
/// card_id 41-60 = Legendary (cost 5)
fn card_cost(card_id: u8) -> u8 {
    if card_id == 0 { return 0; }
    if card_id <= 20 { 1 }
    else if card_id <= 40 { 2 }
    else { 5 }
}

fn card_rarity(card_id: u8) -> u8 {
    // 0=empty, 1=Common, 2=Rare, 3=Legendary
    if card_id == 0 { 0 }
    else if card_id <= 20 { 1 }
    else if card_id <= 40 { 2 }
    else { 3 }
}

/// Save (or update) the player's prepared battle deck.
///
/// Validates composition before storing:
///   - total cost ≤ 30
///   - Legendary ≤ 2
///   - Rare ≤ 6
///   - Common ≥ 12
///
/// Cannot overwrite while `locked_until > Clock::get().unix_timestamp`.
pub fn handle_save_deck(
    ctx: Context<SaveDeck>,
    cards: Vec<u8>,
) -> Result<()> {
    let deck = &mut ctx.accounts.player_deck;
    let clock = Clock::get()?;

    // Locked check
    require!(
        deck.locked_until == 0 || clock.unix_timestamp >= deck.locked_until,
        ErrorCode::DeckLocked
    );

    // Size: 1-20 cards
    let count = cards.len();
    require!(count >= 1 && count <= 20, ErrorCode::InvalidDeckComposition);

    // Composition validation
    let mut total_cost: u16 = 0;
    let mut legendary: u8 = 0;
    let mut rare: u8 = 0;
    let mut common: u8 = 0;

    for &card_id in &cards {
        require!(card_id >= 1 && card_id <= 60, ErrorCode::InvalidDeckComposition);
        total_cost += card_cost(card_id) as u16;
        match card_rarity(card_id) {
            3 => legendary += 1,
            2 => rare += 1,
            1 => common += 1,
            _ => {}
        }
    }

    require!(total_cost <= 30, ErrorCode::InvalidDeckComposition);
    require!(legendary <= 2, ErrorCode::InvalidDeckComposition);
    require!(rare <= 6, ErrorCode::InvalidDeckComposition);
    require!(common >= 12, ErrorCode::InvalidDeckComposition);

    // Write deck
    deck.owner = ctx.accounts.player.key();
    deck.card_count = count as u8;
    deck.last_modified = clock.unix_timestamp;
    // locked_until not changed by save; only lock_deck sets it

    let mut arr = [0u8; 20];
    for (i, &c) in cards.iter().enumerate() {
        arr[i] = c;
    }
    deck.deck_cards = arr;

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
