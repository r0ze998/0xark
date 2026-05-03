// claim_battle_loot — winner claims 1 random card from loser's battle field.
//
// Flow:
//   1. Verify winner signed and is not the same as loser.
//   2. Verify loser actually owns at least one field card.
//   3. Pick random index 0-4 from SlotHashes sysvar.
//   4. Transfer chosen card (remove from loser vault, add to winner vault).
//   5. Init DuelLootRecord PDA — its existence prevents double-claim.
//   6. Emit LootClaimedEvent.
//
// Seeds for DuelLootRecord: ["duel_loot", duel_id.as_ref()]

use anchor_lang::prelude::*;
use crate::state::{PlayerState, DuelLootRecord};
use crate::error::ErrorCode;

// SysvarS1otHashes111111111111111111111111111
const SLOT_HASHES_ID_BYTES: [u8; 32] = [
    6, 167, 213, 23, 24, 117, 247, 41, 199, 61, 147, 64, 143, 33, 97, 67,
    174, 106, 71, 54, 145, 210, 142, 26, 6, 42, 187, 69, 102, 151, 148, 0,
];

#[derive(Accounts)]
#[instruction(duel_id: Pubkey, loser_pubkey: Pubkey, loser_field: [u8; 5])]
pub struct ClaimBattleLoot<'info> {
    #[account(mut)]
    pub winner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"player", winner.key().as_ref()],
        bump,
    )]
    pub winner_state: Account<'info, PlayerState>,

    #[account(
        mut,
        seeds = [b"player", loser_pubkey.as_ref()],
        bump,
        constraint = loser_state.key() != winner_state.key() @ ErrorCode::CannotLootSelf
    )]
    pub loser_state: Account<'info, PlayerState>,

    /// Initialized here — its existence means loot was claimed (double-spend guard).
    #[account(
        init,
        payer = winner,
        space = DuelLootRecord::SIZE,
        seeds = [DuelLootRecord::SEED, duel_id.as_ref()],
        bump,
    )]
    pub duel_loot_record: Account<'info, DuelLootRecord>,

    /// CHECK: SlotHashes sysvar validated by address (SysvarS1otHashes111111111111111111111111111).
    #[account(address = Pubkey::new_from_array(SLOT_HASHES_ID_BYTES))]
    pub slot_hashes: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_claim_battle_loot(
    ctx: Context<ClaimBattleLoot>,
    duel_id: Pubkey,
    loser_pubkey: Pubkey,
    loser_field: [u8; 5],
) -> Result<()> {
    let loser_state  = &mut ctx.accounts.loser_state;
    let winner_state = &mut ctx.accounts.winner_state;

    // 1. All non-zero slots must be valid card IDs (1-60).
    let field_cards: Vec<u8> = loser_field.iter().copied().filter(|&id| id > 0).collect();
    require!(!field_cards.is_empty(), ErrorCode::InvalidFieldSize);

    // 2. Verify loser owns at least one of the field cards.
    let owned: Vec<u8> = field_cards.iter().copied()
        .filter(|&id| loser_state.has_card(id))
        .collect();
    require!(!owned.is_empty(), ErrorCode::LoserDoesNotOwnCard);

    // 3. Random index from SlotHashes sysvar.
    let slot_data = ctx.accounts.slot_hashes.try_borrow_data()?;
    // SlotHashes layout: u64 (count), then [(u64 slot, [u8;32] hash), ...]
    // Minimum bytes: 8 (count) + 8 (slot) + 32 (hash) = 48
    require!(slot_data.len() >= 48, ErrorCode::SlotHashesUnavailable);
    // Hash of most-recent slot starts at byte 16 (after count u64 + slot u64).
    let hash_byte = slot_data[16];
    drop(slot_data);

    // Pick from `owned` cards only (those actually in loser vault).
    let stolen_card_id = owned[(hash_byte as usize) % owned.len()];

    // 4. Transfer card.
    loser_state.remove_card(stolen_card_id)?;
    winner_state.add_card(stolen_card_id)?;

    // 5. Record result.
    let record = &mut ctx.accounts.duel_loot_record;
    record.duel_id        = duel_id;
    record.winner         = ctx.accounts.winner.key();
    record.loser          = loser_pubkey;
    record.loser_field    = loser_field;
    record.stolen_card_id = stolen_card_id;
    record.bump           = ctx.bumps.duel_loot_record;

    // 6. Emit.
    emit!(LootClaimedEvent {
        winner:         ctx.accounts.winner.key(),
        loser:          loser_pubkey,
        duel_id,
        stolen_card_id,
        slot:           Clock::get()?.slot,
    });

    msg!(
        "claim_battle_loot: winner={} loser={} card={} duel={}",
        ctx.accounts.winner.key(),
        loser_pubkey,
        stolen_card_id,
        duel_id,
    );

    Ok(())
}

#[event]
pub struct LootClaimedEvent {
    pub winner:         Pubkey,
    pub loser:          Pubkey,
    pub duel_id:        Pubkey,
    pub stolen_card_id: u8,
    pub slot:           u64,
}
