use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;
use crate::error::ErrorCode;
use sha2::{Sha256, Digest};

// ── T82: Element System (Axis B) ──────────────────────────────────────────────
// Elements: 1=Tide, 2=Abyss, 3=Storm, 4=Iron
// Advantage cycle: Tide→Storm, Storm→Iron, Iron→Abyss, Abyss→Tide (+50%)
// Disadvantage (reverse): -30%
//
// Multiplier (per 1000 units):
//   advantage    → 1500  (base * 1500 / 1000)
//   neutral/same → 1000
//   disadvantage →  700  (base *  700 / 1000)
pub fn calc_element_multiplier(attacker_elem: u8, defender_elem: u8) -> u32 {
    match (attacker_elem, defender_elem) {
        // advantage: Tide>Storm, Storm>Iron, Iron>Abyss, Abyss>Tide
        (1, 3) | (3, 4) | (4, 2) | (2, 1) => 1500,
        // disadvantage (reverse)
        (3, 1) | (4, 3) | (2, 4) | (1, 2) => 700,
        // same element or unknown → neutral
        _ => 1000,
    }
}

/// Assign element (1-4) to card_id (1-60) based on ID range.
/// Matches frontend STRATEGY_DEPTH.md §2 assignment.
pub fn card_element(card_id: u8) -> u8 {
    if card_id <= 15 { 1 }       // Tide
    else if card_id <= 30 { 2 }  // Abyss
    else if card_id <= 45 { 3 }  // Storm
    else { 4 }                   // Iron
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct ResolveRound<'info> {
    #[account(
        mut,
        seeds = [GAME_SEED, game_id.to_le_bytes().as_ref()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,
    #[account(
        mut,
        seeds = [CARD_POOL_SEED, game_id.to_le_bytes().as_ref()],
        bump = card_pool.bump,
    )]
    pub card_pool: Account<'info, CardPool>,
    /// All player states passed as remaining accounts
    pub caller: Signer<'info>,
}

pub fn handle_resolve(ctx: Context<ResolveRound>, game_id: u64) -> Result<()> {
    let game = &mut ctx.accounts.game;
    require!(game.status == GameStatus::RevealPhase, ErrorCode::NotRevealPhase);
    require!(game.reveal_count >= 1, ErrorCode::NotRevealPhase);

    // Get clock once at the top — used for all randomness in this instruction
    let clock = Clock::get()?;

    let pool = &mut ctx.accounts.card_pool;
    let player_count = game.player_count as usize;

    // Deserialize all player states from remaining accounts
    let mut players: Vec<PlayerData> = Vec::with_capacity(player_count);
    for account_info in ctx.remaining_accounts.iter().take(player_count) {
        let data = account_info.try_borrow_data()?;
        // Parse PlayerState from account data (skip 8-byte discriminator)
        let ps_bytes = &data[8..];
        let ps: PlayerState = PlayerState::try_from_slice(ps_bytes)
            .map_err(|_| ErrorCode::InvalidAction)?;
        players.push(PlayerData {
            key: *account_info.key,
            action: ActionType::from(ps.revealed_action),
            target: ps.revealed_target,
            area: ps.area,
            move_target: ps.move_target,
            cards: ps.cards,
            card_count: ps.card_count,
            steal_count: ps.steal_count,
            barrier_count: ps.barrier_count,
            scout_count: ps.scout_count,
            position_commitment_initialized: ps.position_commitment_initialized,
        });
    }

    // === Resolution Order ===

    // 0. Move (area transition — processed first so Steal etc. use new positions)
    //
    // ZK gating (T47): Moving into the dungeon (area > 0) requires that the
    // player has an initialized position commitment (set via init_position and
    // updated by verify_dungeon_move). This ensures dungeon traversal is
    // cryptographically attested — the prover demonstrated knowledge of (x, y, salt)
    // consistent with the committed Poseidon hash.
    //
    // Town moves (area 0 → area 0) are exempt — no ZK required for open areas.
    // Uninitialized players may still move freely within town.
    for p in players.iter_mut() {
        if p.action == ActionType::Move {
            let dest = p.move_target;
            if dest < crate::constants::NUM_AREAS {
                // Gate: dungeon moves require ZK position commitment
                if dest > 0 && !p.position_commitment_initialized {
                    msg!(
                        "Player {} blocked: dungeon Move requires init_position (ZK gate)",
                        p.key
                    );
                    // Don't error — silently skip the move so the round can still resolve.
                    // The player stays in their current area until they call init_position.
                    continue;
                }
                msg!("Player {} moved from area {} to area {}", p.key, p.area, dest);
                p.area = dest;
            }
        }
    }

    // 1. Shadow (invisibility)
    let mut invisible: Vec<bool> = vec![false; player_count];
    for (i, p) in players.iter_mut().enumerate() {
        if p.action == ActionType::UseShadow {
            invisible[i] = true;
            remove_card(&mut p.cards, 2); // Remove Shadow card
            p.card_count -= 1;
            msg!("Player {} used Shadow — invisible this turn", p.key);
        }
    }

    // 2. Storm (nullify all barriers)
    let mut storm_active = false;
    for p in players.iter_mut() {
        if p.action == ActionType::UseStorm {
            storm_active = true;
            remove_card(&mut p.cards, 4); // Remove Storm card
            p.card_count -= 1;
            msg!("Player {} used Storm — all barriers nullified", p.key);
        }
    }

    // 3. Barrier (mark protected, unless Storm active)
    let mut barriered: Vec<bool> = vec![false; player_count];
    for (i, p) in players.iter_mut().enumerate() {
        if p.action == ActionType::Barrier && !storm_active {
            barriered[i] = true;
            p.barrier_count -= 1;
            msg!("Player {} used Barrier", p.key);
        } else if p.action == ActionType::Barrier && storm_active {
            p.barrier_count -= 1;
            msg!("Player {} Barrier was nullified by Storm", p.key);
        }
    }

    // 4. Steal (take card, check SAME AREA + barrier + invisibility + Crystal)
    for i in 0..player_count {
        if players[i].action == ActionType::Steal || players[i].action == ActionType::UseCrystal {
            let target_key = players[i].target;
            let is_crystal = players[i].action == ActionType::UseCrystal;

            if let Some(ti) = players.iter().position(|p| p.key == target_key) {
                let same_area = players[i].area == players[ti].area;
                let target_invisible = invisible[ti];
                let target_barriered = barriered[ti];

                if !same_area {
                    msg!("Steal failed: target {} is in a different area", target_key);
                } else if target_invisible {
                    msg!("Steal failed: target {} is invisible", target_key);
                } else if target_barriered && !is_crystal {
                    msg!("Steal blocked by Barrier");
                } else {
                    // Steal succeeds — use sha2-derived seed for card selection
                    let steal_input: [u8; 16] = {
                        let mut b = [0u8; 16];
                        b[..8].copy_from_slice(&clock.slot.to_le_bytes());
                        b[8..].copy_from_slice(&(game.round as u64 * 1000 + i as u64).to_le_bytes());
                        b
                    };
                    let steal_hash = Sha256::digest(&steal_input);
                    let seed = u64::from_le_bytes(steal_hash[..8].try_into().unwrap());
                    let stolen = steal_random_card(&mut players[ti].cards, seed);
                    if stolen > 0 {
                        place_card(&mut players[i].cards, stolen);
                        players[i].card_count += 1;
                        players[ti].card_count -= 1;
                        msg!("Player {} stole card {} from {}", players[i].key, stolen, target_key);
                    }
                }

                if is_crystal {
                    remove_card(&mut players[i].cards, 1); // Remove Crystal
                    players[i].card_count -= 1;
                } else {
                    players[i].steal_count -= 1;
                }
            }
        }
    }

    // 5. Flame (destroy target's card — SAME AREA only)
    for i in 0..player_count {
        if players[i].action == ActionType::UseFlame {
            let target_key = players[i].target;
            if let Some(ti) = players.iter().position(|p| p.key == target_key) {
                if players[i].area != players[ti].area {
                    msg!("Flame failed: target {} in different area", target_key);
                } else if !invisible[ti] {
                    let flame_input: [u8; 16] = {
                        let mut b = [0u8; 16];
                        b[..8].copy_from_slice(&clock.unix_timestamp.to_le_bytes());
                        b[8..].copy_from_slice(&(game.round as u64 * 2000 + i as u64).to_le_bytes());
                        b
                    };
                    let flame_hash = Sha256::digest(&flame_input);
                    let seed = u64::from_le_bytes(flame_hash[..8].try_into().unwrap());
                    let destroyed = steal_random_card(&mut players[ti].cards, seed);
                    if destroyed > 0 {
                        players[ti].card_count -= 1;
                        // Card is destroyed, not transferred
                        msg!("Player {} burned card {} from {}", players[i].key, destroyed, target_key);
                    }
                }
            }
            remove_card(&mut players[i].cards, 3); // Remove Flame
            players[i].card_count -= 1;
        }
    }

    // 6. Scout (reveal target's hand — emit event)
    for i in 0..player_count {
        if players[i].action == ActionType::Scout {
            let target_key = players[i].target;
            let target_cards = players.iter()
                .find(|pp| pp.key == target_key)
                .map(|pp| pp.cards)
                .unwrap_or([0; 5]);
            players[i].scout_count -= 1;
            msg!("Player {} scouted {}: cards {:?}", players[i].key, target_key, target_cards);
        }
    }

    // 7. Draw (from AREA-SPECIFIC pool)
    // Mix slot + unix_timestamp + round + caller key to make seed unpredictable.
    // Using sha2 prevents slot-manipulation attacks by validators/frontrunners.
    let caller_key = ctx.accounts.caller.key();
    let mut seed_input = [0u8; 48];
    seed_input[..8].copy_from_slice(&clock.slot.to_le_bytes());
    seed_input[8..16].copy_from_slice(&clock.unix_timestamp.to_le_bytes());
    seed_input[16..24].copy_from_slice(&(game.round as u64).to_le_bytes());
    seed_input[24..].copy_from_slice(&caller_key.to_bytes()[..24]);
    let hash = Sha256::digest(&seed_input);
    let mut seed = u64::from_le_bytes(hash[..8].try_into().unwrap());

    for (i, p) in players.iter_mut().enumerate() {
        if p.action == ActionType::Draw {
            // Only draw card types available in current area
            let area_idx = p.area as usize;
            let area_cards = if area_idx < 3 { crate::constants::AREA_CARDS[area_idx] } else { [1, 2] };
            let card_id = pick_area_card_from_pool(&mut pool.remaining, seed, &area_cards);
            if card_id > 0 {
                place_card(&mut p.cards, card_id);
                p.card_count += 1;
                game.cards_in_pool -= 1;
                msg!("Player {} drew card {} from area {}", p.key, card_id, p.area);
            } else {
                msg!("Player {} tried to draw but area pool empty", p.key);
            }
            // Re-hash for each draw to ensure independent randomness per player
            let next_hash = Sha256::digest(&seed.to_le_bytes());
            seed = u64::from_le_bytes(next_hash[..8].try_into().unwrap())
                .wrapping_add(i as u64 * 0x9e3779b97f4a7c15);
        }
    }

    // 8. Void (copy target's card — SAME AREA only)
    for i in 0..player_count {
        if players[i].action == ActionType::UseVoid {
            let target_key = players[i].target;
            if let Some(ti) = players.iter().position(|p| p.key == target_key) {
                if players[i].area != players[ti].area {
                    msg!("Void failed: target {} in different area", target_key);
                } else if !invisible[ti] && players[ti].card_count > 0 {
                    // Pick a random card from target to copy
                    let void_input: [u8; 16] = {
                        let mut b = [0u8; 16];
                        b[..8].copy_from_slice(&clock.slot.to_le_bytes());
                        b[8..].copy_from_slice(&(game.round as u64 * 3000 + i as u64).to_le_bytes());
                        b
                    };
                    let void_hash = Sha256::digest(&void_input);
                    let seed = u64::from_le_bytes(void_hash[..8].try_into().unwrap());
                    let copied = peek_random_card(&players[ti].cards, seed);
                    if copied > 0 {
                        place_card(&mut players[i].cards, copied);
                        players[i].card_count += 1;
                        msg!("Player {} copied card {} from {}", players[i].key, copied, target_key);
                    }
                }
            }
            remove_card(&mut players[i].cards, 5); // Remove Void
            players[i].card_count -= 1;
        }
    }

    // === Write back player states ===
    for (idx, account_info) in ctx.remaining_accounts.iter().take(player_count).enumerate() {
        let mut data = account_info.try_borrow_mut_data()?;
        let p = &players[idx];
        // Offset: 8 (disc) + 8 (game_id) + 32 (player) + 1 (index) + 1 (area) = 50
        data[49] = p.area;
        data[50..55].copy_from_slice(&p.cards);
        data[55] = p.card_count;
        data[56] = p.steal_count;
        data[57] = p.barrier_count;
        data[58] = p.scout_count;
        // Reset commit/reveal flags
        data[59] = 0; // has_committed = false
        data[60] = 0; // has_revealed = false
    }

    // === Check victory ===
    let mut winner_key = Pubkey::default();

    // Comp victory: 5 unique card types
    for p in &players {
        if count_unique_types(&p.cards) == TOTAL_CARD_TYPES {
            winner_key = p.key;
            break;
        }
    }

    // Elimination victory: all others have 0 cards
    if winner_key == Pubkey::default() {
        let alive: Vec<&PlayerData> = players.iter().filter(|p| p.card_count > 0).collect();
        if alive.len() == 1 {
            winner_key = alive[0].key;
        }
    }

    if winner_key != Pubkey::default() {
        game.status = GameStatus::Finished;
        game.winner = winner_key;
        msg!("Game {} won by {}", game_id, winner_key);
    } else if game.round >= game.max_rounds {
        // Time's up — most unique cards wins
        let best = players.iter().max_by_key(|p| count_unique_types(&p.cards)).unwrap();
        game.status = GameStatus::Finished;
        game.winner = best.key;
        msg!("Game {} time up — winner {} with {} unique cards", game_id, best.key, count_unique_types(&best.cards));
    } else {
        // Next round
        game.round += 1;
        game.status = GameStatus::CommitPhase;
        game.commit_count = 0;
        game.reveal_count = 0;
        msg!("Round {} resolved, advancing to round {}", game.round - 1, game.round);
    }

    Ok(())
}

// === Helper structs and functions ===

struct PlayerData {
    key: Pubkey,
    action: ActionType,
    target: Pubkey,
    area: u8,
    move_target: u8,
    cards: [u8; 5],
    card_count: u8,
    steal_count: u8,
    barrier_count: u8,
    scout_count: u8,
    position_commitment_initialized: bool,
}

fn remove_card(cards: &mut [u8; 5], card_id: u8) {
    for slot in cards.iter_mut() {
        if *slot == card_id {
            *slot = 0;
            return;
        }
    }
}

fn place_card(cards: &mut [u8; 5], card_id: u8) {
    for slot in cards.iter_mut() {
        if *slot == 0 {
            *slot = card_id;
            return;
        }
    }
}

fn steal_random_card(cards: &mut [u8; 5], seed: u64) -> u8 {
    let filled: Vec<usize> = cards.iter().enumerate()
        .filter(|(_, &c)| c > 0)
        .map(|(i, _)| i)
        .collect();
    if filled.is_empty() {
        return 0;
    }
    let pick = (seed as usize) % filled.len();
    let idx = filled[pick];
    let card_id = cards[idx];
    cards[idx] = 0;
    card_id
}

fn peek_random_card(cards: &[u8; 5], seed: u64) -> u8 {
    let filled: Vec<u8> = cards.iter().filter(|&&c| c > 0).copied().collect();
    if filled.is_empty() {
        return 0;
    }
    filled[(seed as usize) % filled.len()]
}

fn pick_area_card_from_pool(remaining: &mut [u8; 5], seed: u64, area_cards: &[u8; 2]) -> u8 {
    // Only consider card types available in this area
    let mut total: u32 = 0;
    for &cid in area_cards {
        if cid > 0 && cid <= 5 {
            total += remaining[(cid - 1) as usize] as u32;
        }
    }
    if total == 0 { return 0; }
    let pick = (seed % total as u64) as u32;
    let mut cumulative: u32 = 0;
    for &cid in area_cards {
        if cid > 0 && cid <= 5 {
            let idx = (cid - 1) as usize;
            cumulative += remaining[idx] as u32;
            if pick < cumulative {
                remaining[idx] -= 1;
                return cid;
            }
        }
    }
    0
}

fn pick_card_from_pool(remaining: &mut [u8; 5], seed: u64) -> u8 {
    let total: u32 = remaining.iter().map(|&r| r as u32).sum();
    if total == 0 {
        return 0;
    }
    let pick = (seed % total as u64) as u32;
    let mut cumulative: u32 = 0;
    for i in 0..5 {
        cumulative += remaining[i] as u32;
        if pick < cumulative {
            remaining[i] -= 1;
            return (i + 1) as u8;
        }
    }
    0
}

fn count_unique_types(cards: &[u8; 5]) -> u8 {
    let mut seen = [false; 6]; // index 0 unused, 1-5 for card types
    for &c in cards {
        if c > 0 && c <= 5 {
            seen[c as usize] = true;
        }
    }
    seen.iter().filter(|&&s| s).count() as u8
}
