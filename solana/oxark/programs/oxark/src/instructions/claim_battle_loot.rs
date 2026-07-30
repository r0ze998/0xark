// claim_battle_loot — winner claims 1 random card from the loser's battle field.
//
// The loot pool is DERIVED FROM CHAIN TRUTH — the loser's revealed hands in
// DuelState — NOT from a caller argument. A prior version took `loser_field:
// [u8;5]` as an instruction arg, which let the winner declare (and thereby
// choose) what the loser had: the SlotHashes randomness only picked within the
// winner-supplied set, so a winner could name a single legendary and guarantee
// it. Now the pool is the loser's fielded species, unioned across all
// rounds/slots (the same "played" definition as settle_duel_history), filtered
// to what the loser still owns. The winner supplies nothing but the loser's
// pubkey (needed only to seed the loser PlayerState PDA).
//
// Flow:
//   1. Derive the loser's owned fielded species from DuelState.player_N_revealed.
//   2. Pick one at random via the SlotHashes sysvar.
//   3. Transfer it (remove from loser vault, add to winner vault).
//   4. Init DuelLootRecord PDA — its existence prevents double-claim; it stores
//      the first 5 distinct pool species for audit.
//   5. Emit LootClaimedEvent.
//
// Seeds for DuelLootRecord: ["duel_loot", duel_id.as_ref()]

use crate::error::ErrorCode;
use crate::instructions::init_duel::DUEL_SEED;
use crate::state::{DuelLootRecord, DuelState, PlayerState};
use anchor_lang::prelude::*;

// SysvarS1otHashes111111111111111111111111111
const SLOT_HASHES_ID_BYTES: [u8; 32] = [
    6, 167, 213, 23, 25, 47, 10, 175, 198, 242, 101, 227, 251, 119, 204, 122, 218, 130, 197, 41,
    208, 190, 59, 19, 110, 45, 0, 85, 32, 0, 0, 0,
];

#[derive(Accounts)]
#[instruction(duel_id: Pubkey, loser_pubkey: Pubkey)]
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

    /// DuelState — must be ended, signer must be the winner, and loser_pubkey must be
    /// one of the two registered participants.
    /// Boxed to keep stack frame within BPF 4096-byte limit.
    #[account(
        seeds = [DUEL_SEED, duel_id.as_ref()],
        bump = duel.bump,
        constraint = duel.ended_at > 0          @ ErrorCode::DuelNotOver,
        constraint = duel.winner == winner.key() @ ErrorCode::NotWinner,
        // C4 fix: loser_pubkey must be a registered participant of this duel.
        constraint = (loser_pubkey == duel.player_1 || loser_pubkey == duel.player_2) @ ErrorCode::WrongLoser,
        // Must be the ACTUAL loser (the non-winner participant), not the winner.
        // (Draws can't reach here: duel.winner == default fails winner==signer.)
        constraint = loser_pubkey != duel.winner @ ErrorCode::WrongLoser,
    )]
    pub duel: Box<Account<'info, DuelState>>,

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

/// Derive the loot pool from chain truth: the distinct species the loser
/// fielded (their `player_N_revealed`), unioned across all rounds/slots, that
/// the loser STILL owns. Order = first appearance in the revealed array
/// (deterministic). This IS the security property — the pool depends only on
/// on-chain state, never on caller input, so the winner cannot steer or widen
/// it. Union-across-rounds matches settle_duel_history's "played" definition.
fn derive_loot_pool(revealed: &[[u64; 10]; 5], loser: &PlayerState) -> Vec<u8> {
    let mut pool: Vec<u8> = Vec::new();
    for round_row in revealed.iter() {
        for &id in round_row.iter() {
            // 0 = empty-slot sentinel; species are 1-60. Bound before the u64→u8
            // cast so a stray id can't truncate into a valid card.
            if (1..=60).contains(&id) {
                let cid = id as u8;
                if loser.has_card(cid) && !pool.contains(&cid) {
                    pool.push(cid);
                }
            }
        }
    }
    pool
}

pub fn handle_claim_battle_loot(
    ctx: Context<ClaimBattleLoot>,
    duel_id: Pubkey,
    loser_pubkey: Pubkey,
) -> Result<()> {
    // 1. Derive the loot pool from CHAIN TRUTH: the loser's fielded species,
    //    unioned across all rounds/slots (matching settle_duel_history's
    //    "played" definition), filtered to what the loser still owns. The winner
    //    supplies nothing — they cannot steer the loot.
    let loser_is_p1 = loser_pubkey == ctx.accounts.duel.player_1;
    let revealed = if loser_is_p1 {
        &ctx.accounts.duel.player_1_revealed
    } else {
        &ctx.accounts.duel.player_2_revealed
    };
    let pool = derive_loot_pool(revealed, &ctx.accounts.loser_state);
    require!(!pool.is_empty(), ErrorCode::LoserDoesNotOwnCard);

    // 2. Random index from SlotHashes sysvar.
    let slot_data = ctx.accounts.slot_hashes.try_borrow_data()?;
    // SlotHashes layout: u64 (count), then [(u64 slot, [u8;32] hash), ...]
    // Minimum bytes: 8 (count) + 8 (slot) + 32 (hash) = 48
    require!(slot_data.len() >= 48, ErrorCode::SlotHashesUnavailable);
    // Hash of most-recent slot starts at byte 16 (after count u64 + slot u64).
    let hash_byte = slot_data[16];
    drop(slot_data);

    let stolen_card_id = pool[(hash_byte as usize) % pool.len()];

    // 3. Transfer card.
    ctx.accounts.loser_state.remove_card(stolen_card_id)?;
    ctx.accounts.winner_state.add_card(stolen_card_id)?;

    // 4. Record result. loser_field now stores the first 5 distinct pool species
    //    (chain-derived) for audit, replacing the old caller-supplied value.
    let mut audit_field = [0u8; 5];
    for (i, &cid) in pool.iter().take(5).enumerate() {
        audit_field[i] = cid;
    }
    let record = &mut ctx.accounts.duel_loot_record;
    record.duel_id = duel_id;
    record.winner = ctx.accounts.winner.key();
    record.loser = loser_pubkey;
    record.loser_field = audit_field;
    record.stolen_card_id = stolen_card_id;
    record.bump = ctx.bumps.duel_loot_record;

    // 6. Emit.
    emit!(LootClaimedEvent {
        winner: ctx.accounts.winner.key(),
        loser: loser_pubkey,
        duel_id,
        stolen_card_id,
        slot: Clock::get()?.slot,
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
    pub winner: Pubkey,
    pub loser: Pubkey,
    pub duel_id: Pubkey,
    pub stolen_card_id: u8,
    pub slot: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn loser_is_participant(loser: Pubkey, player_1: Pubkey, player_2: Pubkey) -> bool {
        loser == player_1 || loser == player_2
    }

    #[test]
    fn valid_loser_player_1_accepted() {
        let p1 = Pubkey::new_unique();
        let p2 = Pubkey::new_unique();
        assert!(loser_is_participant(p1, p1, p2));
    }

    #[test]
    fn valid_loser_player_2_accepted() {
        let p1 = Pubkey::new_unique();
        let p2 = Pubkey::new_unique();
        assert!(loser_is_participant(p2, p1, p2));
    }

    #[test]
    fn arbitrary_loser_rejected() {
        let p1 = Pubkey::new_unique();
        let p2 = Pubkey::new_unique();
        let attacker = Pubkey::new_unique();
        assert!(!loser_is_participant(attacker, p1, p2));
    }

    // ── The security invariant: loot pool is chain-derived + owned-only ──────────

    #[test]
    fn loot_pool_is_chain_derived_owned_deduped_and_ordered() {
        let mut loser = PlayerState::default();
        loser.set_vault_card(5);
        loser.set_vault_card(23);
        // NOT 40: the loser fielded it but no longer owns it (traded/looted since).

        // Loser's revealed hands: fielded 5 and 40 in round 1, 23 in round 2, and
        // 5 again in round 3. Slot 0 padding elsewhere.
        let mut revealed = [[0u64; 10]; 5];
        revealed[0][0] = 5;
        revealed[0][1] = 40; // fielded but unowned → excluded
        revealed[1][0] = 23;
        revealed[2][0] = 5; // duplicate → deduped

        let pool = derive_loot_pool(&revealed, &loser);

        // Only owned species, deduped, in first-appearance order. 40 is absent —
        // the winner cannot conjure it, and never supplied anything.
        assert_eq!(pool, vec![5, 23]);
    }

    #[test]
    fn loot_pool_empty_when_loser_owns_nothing_fielded() {
        let loser = PlayerState::default(); // owns nothing
        let mut revealed = [[0u64; 10]; 5];
        revealed[0][0] = 7;
        revealed[0][1] = 12;
        assert!(derive_loot_pool(&revealed, &loser).is_empty());
    }

    #[test]
    fn loot_pool_ignores_out_of_range_and_sentinel_ids() {
        let mut loser = PlayerState::default();
        loser.set_vault_card(9);
        let mut revealed = [[0u64; 10]; 5];
        revealed[0][0] = 0; // empty-slot sentinel
        revealed[0][1] = 9; // valid + owned
        revealed[0][2] = 61; // out of species range
        revealed[0][3] = 0x1_0000_0009; // would truncate to 9 without the u64 bound
        let pool = derive_loot_pool(&revealed, &loser);
        assert_eq!(pool, vec![9]); // only the genuine owned species 9
    }
}
