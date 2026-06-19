// buy_pack — Phase 20-B shop pack purchase.
//
// Standard Pack (0): 0.05 SOL → 5 random cards
// Premium Pack  (1): 0.15 SOL → 3 cards, first guaranteed Uncommon
//
// Revenue split: 50% ops_treasury / 50% prize_pool (matches x402 convention).
// Randomness:    SlotHashes sysvar — 4 bytes per card → u32 roll % 1_000_000 (ppm).
// Drop rates:    stored on GameWorld, admin-adjustable via update_game_params.

use crate::constants::{
    PACK_PREMIUM, PACK_STANDARD, PREMIUM_PACK_PRICE, SLOT_HASHES_ID_BYTES, STANDARD_PACK_PRICE,
};
use crate::error::ErrorCode;
use crate::state::{GameWorld, PackOpenedEvent, PlayerState};
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

#[derive(Accounts)]
#[instruction(pack_type: u8)]
pub struct BuyPack<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"player", buyer.key().as_ref()],
        bump,
    )]
    pub player_state: Account<'info, PlayerState>,

    #[account(seeds = [b"game_world"], bump = game_world.bump)]
    pub game_world: Account<'info, GameWorld>,

    /// CHECK: verified against game_world.ops_treasury
    #[account(mut, constraint = ops_treasury.key() == game_world.ops_treasury @ ErrorCode::Unauthorized)]
    pub ops_treasury: AccountInfo<'info>,

    /// CHECK: prize-pool PDA vault (YKK-38); address enforced by seeds.
    #[account(
        mut,
        seeds = [GameWorld::PRIZE_POOL_SEED],
        bump = game_world.prize_pool_bump,
    )]
    pub prize_pool: AccountInfo<'info>,

    /// CHECK: SlotHashes sysvar (SysvarS1otHashes111111111111111111111111111)
    #[account(address = Pubkey::new_from_array(SLOT_HASHES_ID_BYTES))]
    pub slot_hashes: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_buy_pack(ctx: Context<BuyPack>, pack_type: u8) -> Result<()> {
    let (price, pack_size): (u64, usize) = match pack_type {
        PACK_STANDARD => (STANDARD_PACK_PRICE, 5),
        PACK_PREMIUM => (PREMIUM_PACK_PRICE, 3),
        _ => return Err(ErrorCode::InvalidPackType.into()),
    };

    // 1. SOL split: 50% ops / 50% pool
    let ops_amount = price / 2;
    let pool_amount = price - ops_amount;
    transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.ops_treasury.clone(),
            },
        ),
        ops_amount,
    )?;
    transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.prize_pool.clone(),
            },
        ),
        pool_amount,
    )?;

    // 2. Phase determination
    let gw = &ctx.accounts.game_world;
    let now = Clock::get()?.unix_timestamp;
    let elapsed = (now.saturating_sub(gw.start_timestamp)) as u64;
    let is_phase2 = elapsed >= gw.shop_phase_threshold_seconds;

    let legendary_rate = if is_phase2 {
        gw.legendary_drop_rate_phase2
    } else {
        gw.legendary_drop_rate_phase1
    };
    let rare_rate = if is_phase2 {
        gw.rare_drop_rate_phase2
    } else {
        gw.rare_drop_rate_phase1
    };
    let uncommon_rate = gw.uncommon_drop_rate;

    // 3. Read 32 hash bytes from SlotHashes sysvar
    let slot_data = ctx.accounts.slot_hashes.try_borrow_data()?;
    require!(slot_data.len() >= 48, ErrorCode::SlotHashesUnavailable);
    // Layout: u64 (count) + u64 (slot) + [u8;32] (hash) → hash starts at byte 16
    let hash_bytes: [u8; 32] = slot_data[16..48].try_into().unwrap();
    drop(slot_data);

    // 4. Draw cards
    let player_state = &mut ctx.accounts.player_state;
    let mut card_ids: Vec<u8> = Vec::with_capacity(pack_size);

    for i in 0..pack_size {
        // 4 bytes → u32 → ppm roll (0..999999)
        let b = [
            (i * 4) % 32,
            (i * 4 + 1) % 32,
            (i * 4 + 2) % 32,
            (i * 4 + 3) % 32,
        ];
        let seed = u32::from_le_bytes([
            hash_bytes[b[0]],
            hash_bytes[b[1]],
            hash_bytes[b[2]],
            hash_bytes[b[3]],
        ]);
        let roll = seed % 1_000_000;

        let force_uncommon = pack_type == PACK_PREMIUM && i == 0;
        let card_id = _pick_card(
            roll,
            legendary_rate,
            rare_rate,
            uncommon_rate,
            force_uncommon,
        );

        player_state.add_card(card_id)?;
        card_ids.push(card_id);
    }

    emit!(PackOpenedEvent {
        buyer: ctx.accounts.buyer.key(),
        pack_type,
        card_ids: card_ids.clone(),
        slot: Clock::get()?.slot,
    });

    msg!(
        "buy_pack: buyer={} type={} cards={:?}",
        ctx.accounts.buyer.key(),
        pack_type,
        card_ids
    );
    Ok(())
}

fn _pick_card(
    roll: u32,
    legendary_rate: u32,
    rare_rate: u32,
    uncommon_rate: u32,
    force_uncommon: bool,
) -> u8 {
    if force_uncommon {
        return _pick_random_uncommon(roll);
    }
    let leg_threshold = legendary_rate;
    let rare_threshold = leg_threshold.saturating_add(rare_rate);
    let unc_threshold = rare_threshold.saturating_add(uncommon_rate);

    if roll < leg_threshold {
        _pick_random_legendary(roll)
    } else if roll < rare_threshold {
        _pick_random_rare(roll)
    } else if roll < unc_threshold {
        _pick_random_uncommon(roll)
    } else {
        _pick_random_common(roll)
    }
}

// Card ID ranges (matches cards.js and game-design-v2):
// Common:    1-30  (5 cards × 6 factions)
// Uncommon: 31-48  (3 cards × 6 factions)
// Rare:     49-54  (1 card  × 6 factions)
// Legendary:55-60  (1 card  × 6 factions)
fn _pick_random_common(roll: u32) -> u8 {
    ((roll % 30) + 1) as u8
}
fn _pick_random_uncommon(roll: u32) -> u8 {
    ((roll % 18) + 31) as u8
}
fn _pick_random_rare(roll: u32) -> u8 {
    ((roll % 6) + 49) as u8
}
fn _pick_random_legendary(roll: u32) -> u8 {
    ((roll % 6) + 55) as u8
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pick_card_force_uncommon_always_uncommon() {
        for roll in [0u32, 50000, 999999] {
            let id = _pick_card(roll, 0, 20000, 180000, true);
            assert!(id >= 31 && id <= 48, "forced uncommon out of range: {}", id);
        }
    }

    #[test]
    fn pick_card_legendary_phase1_never_drops() {
        // legendary_rate = 0 → leg_threshold = 0, roll < 0 is never true
        for roll in [0u32, 1, 14999, 999999] {
            let id = _pick_card(roll, 0, 20000, 180000, false);
            assert!(id <= 54, "legendary should not drop in phase1: id={}", id);
        }
    }

    #[test]
    fn pick_card_legendary_phase2_drops_in_range() {
        // legendary_rate = 15000 → rolls 0-14999 are legendary
        let id0 = _pick_card(0, 15000, 25000, 180000, false);
        let id14k = _pick_card(14999, 15000, 25000, 180000, false);
        let id15k = _pick_card(15000, 15000, 25000, 180000, false);
        assert!(id0 >= 55 && id0 <= 60, "roll=0 should be legendary");
        assert!(id14k >= 55 && id14k <= 60, "roll=14999 should be legendary");
        assert!(id15k >= 49 && id15k <= 54, "roll=15000 should be rare");
    }

    #[test]
    fn pick_card_rare_phase1() {
        // rare_rate=20000; legendary=0 → rare range: 0-19999
        let id = _pick_card(0, 0, 20000, 180000, false);
        assert!(id >= 49 && id <= 54, "roll=0 rare in phase1: {}", id);
        let id_boundary = _pick_card(19999, 0, 20000, 180000, false);
        assert!(id_boundary >= 49 && id_boundary <= 54);
    }

    #[test]
    fn pick_card_uncommon_range() {
        // With legendary=0, rare=20000: uncommon range 20000-199999
        let id = _pick_card(20000, 0, 20000, 180000, false);
        assert!(
            id >= 31 && id <= 48,
            "roll=20000 should be uncommon: {}",
            id
        );
    }

    #[test]
    fn pick_card_common_range() {
        // Roll 200000+ should be common (with phase1 defaults)
        let id = _pick_card(200000, 0, 20000, 180000, false);
        assert!(id >= 1 && id <= 30, "roll=200000 should be common: {}", id);
    }

    #[test]
    fn pack_size_standard_5_cards() {
        // Verify 5 unique roll computations don't panic
        let hash_bytes = [0xabu8; 32];
        for i in 0usize..5 {
            let b0 = hash_bytes[(i * 4) % 32];
            let b1 = hash_bytes[(i * 4 + 1) % 32];
            let b2 = hash_bytes[(i * 4 + 2) % 32];
            let b3 = hash_bytes[(i * 4 + 3) % 32];
            let roll = u32::from_le_bytes([b0, b1, b2, b3]) % 1_000_000;
            let id = _pick_card(roll, 0, 20000, 180000, false);
            assert!(id >= 1 && id <= 60, "invalid card id {}", id);
        }
    }

    #[test]
    fn pack_size_premium_3_cards_first_forced() {
        // First card (i=0) is force_uncommon for PACK_PREMIUM
        let hash_bytes = [0xffu8; 32];
        let seed = u32::from_le_bytes([hash_bytes[0], hash_bytes[1], hash_bytes[2], hash_bytes[3]]);
        let roll = seed % 1_000_000;
        let id = _pick_card(roll, 15000, 25000, 180000, true); // force_uncommon
        assert!(
            id >= 31 && id <= 48,
            "premium first card not uncommon: {}",
            id
        );
    }

    #[test]
    fn card_range_helpers_in_bounds() {
        for roll in [0u32, 1, 17, 29, 100, 999999] {
            assert!((_pick_random_common(roll) >= 1 && _pick_random_common(roll) <= 30));
            assert!((_pick_random_uncommon(roll) >= 31 && _pick_random_uncommon(roll) <= 48));
            assert!((_pick_random_rare(roll) >= 49 && _pick_random_rare(roll) <= 54));
            assert!((_pick_random_legendary(roll) >= 55 && _pick_random_legendary(roll) <= 60));
        }
    }
}
