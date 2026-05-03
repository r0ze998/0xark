use anchor_lang::prelude::*;
use anchor_lang::prelude::borsh::BorshDeserialize;
use crate::constants::*;
use crate::state::*;
use crate::error::ErrorCode;
use solana_sha256_hasher::hashv;

// ── T93: Element System v2 (6-element 2-triad) ────────────────────────────────
// Elements: 0=Fire, 1=Water, 2=Wind, 3=Earth, 4=Shadow, 5=Light
//
// Triad 1 — Material: Fire(0)→Water(1)→Earth(3)→Fire(0)
// Triad 2 — Abstract: Wind(2)→Shadow(4)→Light(5)→Wind(2)
// Cross-triad: always neutral (×1.0)
//
// Multiplier (per 1000 units):
//   advantage    → 1500  (base * 1500 / 1000)
//   neutral/same → 1000
//   disadvantage →  700  (base *  700 / 1000)
pub fn calc_element_multiplier(attacker_elem: u8, defender_elem: u8) -> u32 {
    match (attacker_elem, defender_elem) {
        // Triad 1 advantages: Fire>Water, Water>Earth, Earth>Fire
        (0, 1) | (1, 3) | (3, 0) => 1500,
        // Triad 1 disadvantages (reverse)
        (1, 0) | (3, 1) | (0, 3) => 700,
        // Triad 2 advantages: Wind>Shadow, Shadow>Light, Light>Wind
        (2, 4) | (4, 5) | (5, 2) => 1500,
        // Triad 2 disadvantages (reverse)
        (4, 2) | (5, 4) | (2, 5) => 700,
        // same element, cross-triad, or unknown → neutral
        _ => 1000,
    }
}

/// Assign element (0-5) to card_id (1-60) based on ID range.
/// 0=Fire(1-10), 1=Water(11-20), 2=Wind(21-30), 3=Earth(31-40), 4=Shadow(41-50), 5=Light(51-60)
pub fn card_element(card_id: u8) -> u8 {
    if card_id <= 10 { 0 }       // Fire
    else if card_id <= 20 { 1 }  // Water
    else if card_id <= 30 { 2 }  // Wind
    else if card_id <= 40 { 3 }  // Earth
    else if card_id <= 50 { 4 }  // Shadow
    else { 5 }                   // Light
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
        // Parse PlayerState from account data (skip 8-byte discriminator).
        // Use reader-based deserialize (not try_from_slice) — SIZE over-allocates
        // 32 bytes for Option<Pubkey>::None padding; try_from_slice (strict) fails
        // on the trailing zeros, while deserialize stops after reading all fields.
        let ps: PlayerState = {
            let mut slice = &data[8..];
            BorshDeserialize::deserialize(&mut slice)
                .map_err(|_| ErrorCode::InvalidAction)?
        };
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
    //
    // Reborn lane scoring (GDD §5.5, Day 8): when CommitAction PDAs are provided
    // in remaining_accounts[player_count..player_count*2], lane-based element
    // affinity scoring replaces the Phase C turn-based model.
    //
    // If CommitAction accounts are NOT provided (legacy / Phase C clients),
    // the Phase C resolution order (BARRIER→STEAL→DRAW→SCOUT→MOVE→USE_CARD)
    // runs unchanged below.

    // Parse CommitAction accounts from remaining_accounts[player_count..] (Reborn).
    let has_reborn_commits = ctx.remaining_accounts.len() >= player_count * 2;
    if has_reborn_commits {
        let mut played_per_player: Vec<([u64; 3], u8)> = Vec::with_capacity(player_count);
        for account_info in ctx.remaining_accounts.iter().skip(player_count).take(player_count) {
            let data = account_info.try_borrow_data()?;
            if data.len() < CommitAction::SIZE {
                played_per_player.push(([0u64; 3], 0));
                continue;
            }
            // CommitAction layout (after 8-byte disc):
            // game_id(8) + round(1) + player(32) + hash(32) + bump(1) + round_number(1)
            // + phase(1) + played_cards(24) + played_cards_len(1)
            let base = 8 + 8 + 1 + 32 + 32 + 1 + 1 + 1; // = 84
            if data.len() >= base + 25 {
                let mut cards = [0u64; 3];
                for j in 0..3 {
                    let off = base + j * 8;
                    cards[j] = u64::from_le_bytes(data[off..off + 8].try_into().unwrap_or([0u8; 8]));
                }
                let card_len = data[base + 24];
                played_per_player.push((cards, card_len));
            } else {
                played_per_player.push(([0u64; 3], 0));
            }
        }

        // Reborn lane resolution: 3 lanes (Front/Middle/Back).
        // Each player places one card per lane (played_cards[0..2]).
        // BP comparison with element affinity multiplier determines lane winner.
        // Lane winner draws one card from the pool as reward.
        if player_count == 2 {
            let a_cards = played_per_player[0].0;
            let b_cards = played_per_player[1].0;
            let a_len   = played_per_player[0].1 as usize;
            let b_len   = played_per_player[1].1 as usize;
            let lanes   = a_len.max(b_len).max(1);
            let mut a_lane_wins: u8 = 0;
            let mut b_lane_wins: u8 = 0;

            for lane in 0..lanes {
                let card_a = if lane < a_len { a_cards[lane] } else { 0 };
                let card_b = if lane < b_len { b_cards[lane] } else { 0 };

                // Derive element from card_id (1-60; 0-5 by group of 10)
                let elem_a = if card_a > 0 { card_element((card_a % 60) as u8 + 1) } else { 0 };
                let elem_b = if card_b > 0 { card_element((card_b % 60) as u8 + 1) } else { 0 };

                // Base BP: card_id's last digit as proxy (full BP table lives client-side)
                let bp_a = if card_a > 0 { (card_a % 7 + 2) as u32 } else { 0 };
                let bp_b = if card_b > 0 { (card_b % 7 + 2) as u32 } else { 0 };

                let adj_a = bp_a * calc_element_multiplier(elem_a, elem_b) / 1000;
                let adj_b = bp_b * calc_element_multiplier(elem_b, elem_a) / 1000;

                if adj_a > adj_b {
                    a_lane_wins += 1;
                    msg!("Lane {}: Player[0] wins ({} adj_bp={} vs adj_bp={})", lane, card_a, adj_a, adj_b);
                } else if adj_b > adj_a {
                    b_lane_wins += 1;
                    msg!("Lane {}: Player[1] wins ({} adj_bp={} vs adj_bp={})", lane, card_b, adj_b, adj_a);
                } else {
                    msg!("Lane {}: draw", lane);
                }
            }

            // Lane winners draw bonus cards from pool
            let bonus_seed = clock.slot ^ (clock.unix_timestamp as u64) ^ (game.round as u64 * 0xdeadbeef);
            if a_lane_wins > b_lane_wins {
                let bonus = pick_card_from_pool(&mut pool.remaining, bonus_seed);
                if bonus > 0 {
                    place_card(&mut players[0].cards, bonus);
                    players[0].card_count += 1;
                    game.cards_in_pool = game.cards_in_pool.saturating_sub(1);
                    msg!("Player[0] won {}/{} lanes, drew bonus card {}", a_lane_wins, lanes, bonus);
                }
            } else if b_lane_wins > a_lane_wins {
                let bonus = pick_card_from_pool(&mut pool.remaining, bonus_seed ^ 0x1234567890abcdef);
                if bonus > 0 {
                    place_card(&mut players[1].cards, bonus);
                    players[1].card_count += 1;
                    game.cards_in_pool = game.cards_in_pool.saturating_sub(1);
                    msg!("Player[1] won {}/{} lanes, drew bonus card {}", b_lane_wins, lanes, bonus);
                }
            }
        }

        // Write back player states and advance round, then return early
        write_back_player_states(ctx.remaining_accounts, player_count, &players)?;
        return finish_round(game, &players, game_id);
    }

    // Phase 15: Move action removed. Area transitions now handled via separate instructions.

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

    // 4. Crystal (Phase 15: Steal removed; UseCrystal targets opponent for effect)
    for i in 0..player_count {
        if players[i].action == ActionType::UseCrystal {
            let target_key = players[i].target;
            let is_crystal = true;

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
                    let steal_hash = hashv(&[&steal_input]).to_bytes();
                    let seed = u64::from_le_bytes(steal_hash[..8].try_into().unwrap());
                    let stolen = steal_random_card(&mut players[ti].cards, seed);
                    if stolen > 0 {
                        place_card(&mut players[i].cards, stolen);
                        players[i].card_count += 1;
                        players[ti].card_count -= 1;
                        msg!("Player {} stole card {} from {}", players[i].key, stolen, target_key);

                        // T96: Deathrattle — if stolen card is a DR card, stealer loses a random card back to victim
                        if is_deathrattle(stolen) {
                            let dr_seed = u64::from_le_bytes(steal_hash[..8].try_into().unwrap_or([0u8; 8]))
                                ^ 0xdeadbeef_cafeba01;
                            let penalty = steal_random_card(&mut players[i].cards, dr_seed);
                            if penalty > 0 {
                                place_card(&mut players[ti].cards, penalty);
                                players[ti].card_count += 1;
                                players[i].card_count -= 1;
                                msg!("DEATHRATTLE ACTIVATED! card {} triggered, {} lost card {} to {}",
                                     stolen, players[i].key, penalty, target_key);
                            }
                        }

                        // T97: Chain — bonus pool card for each chain card stealer holds (max 3)
                        let chain_n = count_chains(&players[i].cards);
                        if chain_n > 0 {
                            let mut chain_seed = u64::from_le_bytes(steal_hash[8..16].try_into().unwrap());
                            for _c in 0..chain_n.min(3) {
                                let extra = pick_card_from_pool(&mut pool.remaining, chain_seed);
                                if extra > 0 {
                                    place_card(&mut players[i].cards, extra);
                                    players[i].card_count += 1;
                                    game.cards_in_pool = game.cards_in_pool.saturating_sub(1);
                                }
                                chain_seed = chain_seed.wrapping_add(0x9e3779b97f4a7c15);
                            }
                            msg!("CHAIN x{} ACTIVATED for {}!", chain_n, players[i].key);
                        }
                    }
                }

                if is_crystal {
                    remove_card(&mut players[i].cards, 1); // Remove Crystal
                    players[i].card_count -= 1;
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
                    let flame_hash = hashv(&[&flame_input]).to_bytes();
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

    // Phase 15: Scout and Draw actions removed from ActionType.

    // 6. Void (copy target's card — SAME AREA only)
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
                    let void_hash = hashv(&[&void_input]).to_bytes();
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

    // === Write back player states (Phase C path) ===
    write_back_player_states(ctx.remaining_accounts, player_count, &players)?;
    finish_round(game, &players, game_id)
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

fn write_back_player_states(
    remaining: &[AccountInfo],
    player_count: usize,
    players: &[PlayerData],
) -> Result<()> {
    for (idx, account_info) in remaining.iter().take(player_count).enumerate() {
        let mut data = account_info.try_borrow_mut_data()?;
        let p = &players[idx];
        // Offsets in PlayerState (after 8-byte discriminator):
        //   0: game_id(8)  8: player(32)  40: player_index(1)  41: area(1)
        //   42: cards[5]   47: card_count(1) 48: steal_count(1)
        //   49: barrier_count(1) 50: scout_count(1)
        //   51: has_committed(1) 52: has_revealed(1)
        data[8 + 40 + 1] = p.area;              // area = offset 49
        data[8 + 40 + 2..8 + 40 + 7].copy_from_slice(&p.cards);
        data[8 + 40 + 7] = p.card_count;
        data[8 + 40 + 8] = p.steal_count;
        data[8 + 40 + 9] = p.barrier_count;
        data[8 + 40 + 10] = p.scout_count;
        data[8 + 40 + 11] = 0; // has_committed = false
        data[8 + 40 + 12] = 0; // has_revealed  = false
    }
    Ok(())
}

fn finish_round(game: &mut Game, players: &[PlayerData], game_id: u64) -> Result<()> {
    let mut winner_key = Pubkey::default();

    for p in players {
        if count_unique_types(&p.cards) == TOTAL_CARD_TYPES {
            winner_key = p.key;
            break;
        }
    }

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
        let best = players.iter().max_by_key(|p| count_unique_types(&p.cards)).unwrap();
        game.status = GameStatus::Finished;
        game.winner = best.key;
        msg!("Game {} time up — winner {} with {} unique cards", game_id, best.key, count_unique_types(&best.cards));
    } else {
        game.round += 1;
        game.status = GameStatus::CommitPhase;
        game.commit_count = 0;
        game.reveal_count = 0;
        msg!("Round {} resolved, advancing to round {}", game.round - 1, game.round);
    }

    Ok(())
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

// T96: Deathrattle card IDs (DR cards: 1,3,4,9,13,34,41,42,44,46)
fn is_deathrattle(card_id: u8) -> bool {
    matches!(card_id, 1 | 3 | 4 | 9 | 13 | 34 | 41 | 42 | 44 | 46)
}

// T97: Chain card IDs (Chain cards: 11,12,15,21,22,27,33,35,51,52,53,57)
fn is_chain(card_id: u8) -> bool {
    matches!(card_id, 11 | 12 | 15 | 21 | 22 | 27 | 33 | 35 | 51 | 52 | 53 | 57)
}

/// Count how many Chain cards are currently in the player's hand.
pub fn count_chains(cards: &[u8; 5]) -> u8 {
    cards.iter().filter(|&&c| is_chain(c)).count() as u8
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
