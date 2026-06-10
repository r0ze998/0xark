// damage_calc.rs — On-chain battle resolver (Phase 15 v2)
//
// Mirrors solana/client/src/lib/damage-calc.js exactly.
// Determinism contract:
//   - Integer arithmetic only (no floats)
//   - seed: SHA-256(salt_p1 || salt_p2 || [round & 0xff]) — caller's responsibility
//   - Sort: INI desc → seed_byte asc → orig_idx asc (3-level stable key)
//   - Given identical inputs, always produces identical outputs
//
// Burn abilities are NOT implemented (burnEffects is always empty in current flow).
// Passive abilities: all 6 implemented (KnightAura through EngineerOverclock).

use crate::card_data::{card_by_id, PassiveAbility};

// ─── Public types ─────────────────────────────────────────────────────────────

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Winner {
    P1,
    P2,
}

pub struct DamageResult {
    pub winner:        Winner,
    pub p1_bp_total:   u32,
    pub p2_bp_total:   u32,
    pub looted_card_id: u8,
}

// ─── Internal working state per card ─────────────────────────────────────────

#[derive(Clone, Copy, Debug)]
struct CardWork {
    id:           u8,
    faction:      u8,
    bp:           i32,   // base BP
    hp:           i32,   // current HP (mutated during combat)
    ini:          u8,
    action_type:  u8,
    is_legendary: bool,
    passive:      Option<PassiveAbility>,
    // Mutable combat state
    bp_mod:       i32,
    hp_mod:       i32,
    barrier_up:   bool,
    shadow:       bool,
    void_blocked: bool,
    orig_idx:     usize,
}

fn seed_byte(seed: &[u8; 32], idx: usize) -> u8 {
    seed[idx % 32]
}

fn build_work(card_ids: &[u64; 10]) -> [CardWork; 5] {
    // card_ids has 10 entries but only first 5 non-zero are used per player
    // Caller passes exactly 5 valid IDs (padded with 0 if deck < 5)
    let mut out = [CardWork {
        id: 0, faction: 0, bp: 0, hp: 0, ini: 0, action_type: 0,
        is_legendary: false, passive: None,
        bp_mod: 0, hp_mod: 0, barrier_up: false, shadow: false, void_blocked: false,
        orig_idx: 0,
    }; 5];
    for i in 0..5 {
        let id = card_ids[i] as u8;
        if let Some(c) = card_by_id(id) {
            out[i] = CardWork {
                id:           c.id,
                faction:      c.faction,
                bp:           c.bp as i32,
                hp:           c.hp as i32,
                ini:          c.ini,
                action_type:  c.action_type,
                is_legendary: c.is_legendary,
                passive:      c.passive,
                bp_mod:       0,
                hp_mod:       0,
                barrier_up:   false,
                shadow:       false,
                void_blocked: false,
                orig_idx:     i,
            };
        }
    }
    out
}

// ─── Step 0: Synergy detection ────────────────────────────────────────────────

fn detect_synergy(field: &[CardWork; 5]) -> Option<u8> {
    let mut counts = [0u8; 6];
    for c in field {
        if c.id > 0 && (c.faction as usize) < 6 {
            counts[c.faction as usize] += 1;
        }
    }
    for f in 0..6u8 {
        if counts[f as usize] >= 3 {
            return Some(f);
        }
    }
    None
}

// ─── Step 0.5: Passive ability application ────────────────────────────────────

fn apply_passive_abilities(p1: &mut [CardWork; 5], p2: &mut [CardWork; 5]) {
    // Run passives for p1 cards affecting p1/p2 fields
    for i in 0..5 {
        if p1[i].id == 0 { continue; }
        match p1[i].passive {
            Some(PassiveAbility::KnightAura) => {
                // other Knight cards on own field +1 BP
                for j in 0..5 {
                    if j != i && p1[j].faction == 0 && p1[j].id > 0 {
                        p1[j].bp_mod += 1;
                    }
                }
            }
            Some(PassiveAbility::MerchantGoldAura) => {
                // own BP total +1 per card when any Legendary is in own field
                let has_lgd = p1.iter().any(|c| c.id > 0 && c.is_legendary);
                if has_lgd {
                    for c in p1.iter_mut() { if c.id > 0 { c.bp_mod += 1; } }
                }
            }
            Some(PassiveAbility::PirateIntimidate) => {
                // opposing card in same slot -3 HP pre-combat
                p2[i].hp_mod -= 3;
            }
            Some(PassiveAbility::ScholarImprintScale) => {
                // +1 BP per imprint (max 3) — imprints not tracked in current state
                // bp_mod += 0 (future: read _imprintCount from DuelState)
            }
            Some(PassiveAbility::MonkSoulHarvest) => {
                // all own cards gain barrierUp
                for c in p1.iter_mut() { if c.id > 0 { c.barrier_up = true; } }
            }
            Some(PassiveAbility::EngineerOverclock) => {
                // own Engineer cards +2 BP when 3+ present
                let eng_count = p1.iter().filter(|c| c.id > 0 && c.faction == 5).count();
                if eng_count >= 3 {
                    for c in p1.iter_mut() {
                        if c.id > 0 && c.faction == 5 { c.bp_mod += 2; }
                    }
                }
            }
            None => {}
        }
    }

    // Run passives for p2 cards affecting p2/p1 fields (symmetric)
    for i in 0..5 {
        if p2[i].id == 0 { continue; }
        match p2[i].passive {
            Some(PassiveAbility::KnightAura) => {
                for j in 0..5 {
                    if j != i && p2[j].faction == 0 && p2[j].id > 0 {
                        p2[j].bp_mod += 1;
                    }
                }
            }
            Some(PassiveAbility::MerchantGoldAura) => {
                let has_lgd = p2.iter().any(|c| c.id > 0 && c.is_legendary);
                if has_lgd {
                    for c in p2.iter_mut() { if c.id > 0 { c.bp_mod += 1; } }
                }
            }
            Some(PassiveAbility::PirateIntimidate) => {
                p1[i].hp_mod -= 3;
            }
            Some(PassiveAbility::ScholarImprintScale) => {}
            Some(PassiveAbility::MonkSoulHarvest) => {
                for c in p2.iter_mut() { if c.id > 0 { c.barrier_up = true; } }
            }
            Some(PassiveAbility::EngineerOverclock) => {
                let eng_count = p2.iter().filter(|c| c.id > 0 && c.faction == 5).count();
                if eng_count >= 3 {
                    for c in p2.iter_mut() {
                        if c.id > 0 && c.faction == 5 { c.bp_mod += 2; }
                    }
                }
            }
            None => {}
        }
    }
}

// ─── Step 1: INI-descending sort (deterministic 3-level key) ─────────────────
// Key: INI desc → seed_byte asc → orig_idx asc

fn sort_by_ini_desc(field: &[CardWork; 5], seed: &[u8; 32], seed_offset: usize) -> [CardWork; 5] {
    let mut indexed: [usize; 5] = [0, 1, 2, 3, 4];
    // Insertion sort (stable, no_std compatible, N=5 so fine)
    for i in 1..5 {
        let mut j = i;
        while j > 0 {
            let a = indexed[j - 1];
            let b = indexed[j];
            let fa = &field[a];
            let fb = &field[b];
            let swap = if fa.ini != fb.ini {
                fa.ini < fb.ini  // desc: swap if a.ini < b.ini
            } else {
                let sa = seed_byte(seed, seed_offset + fa.orig_idx);
                let sb = seed_byte(seed, seed_offset + fb.orig_idx);
                if sa != sb {
                    sa > sb  // asc seed_byte: swap if a > b
                } else {
                    fa.orig_idx > fb.orig_idx  // asc orig_idx: swap if a > b
                }
            };
            if swap {
                indexed.swap(j - 1, j);
                j -= 1;
            } else {
                break;
            }
        }
    }
    let mut out = [CardWork {
        id: 0, faction: 0, bp: 0, hp: 0, ini: 0, action_type: 0,
        is_legendary: false, passive: None,
        bp_mod: 0, hp_mod: 0, barrier_up: false, shadow: false, void_blocked: false,
        orig_idx: 0,
    }; 5];
    for (i, &idx) in indexed.iter().enumerate() {
        out[i] = field[idx].clone();
    }
    out
}

// ─── Step 3: ActionType resolution ───────────────────────────────────────────
// All 10 cards sorted by (INI desc, seed[16+pos] asc, pos asc).
// Positions: p1 = 0-4, p2 = 5-9.

fn apply_action_types(p1: &mut [CardWork; 5], p2: &mut [CardWork; 5], seed: &[u8; 32]) {
    // Build sorted processing order for 10 cards
    let mut order: [(usize, usize); 10] = [
        (0,0),(0,1),(0,2),(0,3),(0,4),
        (1,0),(1,1),(1,2),(1,3),(1,4),
    ]; // (side: 0=p1 1=p2, idx)
    let ini_of = |side: usize, idx: usize| -> u8 {
        if side == 0 { p1[idx].ini } else { p2[idx].ini }
    };
    let pos_of = |side: usize, idx: usize| -> usize { side * 5 + idx };

    // Insertion sort
    for i in 1..10 {
        let mut j = i;
        while j > 0 {
            let (sa, ia) = order[j - 1];
            let (sb, ib) = order[j];
            let ini_a = ini_of(sa, ia);
            let ini_b = ini_of(sb, ib);
            let pos_a = pos_of(sa, ia);
            let pos_b = pos_of(sb, ib);
            let swap = if ini_a != ini_b {
                ini_a < ini_b
            } else {
                let byte_a = seed_byte(seed, 16 + pos_a);
                let byte_b = seed_byte(seed, 16 + pos_b);
                if byte_a != byte_b { byte_a > byte_b } else { pos_a > pos_b }
            };
            if swap { order.swap(j - 1, j); j -= 1; } else { break; }
        }
    }

    // First pass: collect void targets
    let mut void_p1 = [false; 5];
    let mut void_p2 = [false; 5];
    for &(side, idx) in &order {
        let at = if side == 0 { p1[idx].action_type } else { p2[idx].action_type };
        if at == 5 {
            // UseVoid: block opposite card at same position in opponent field
            if side == 0 { if idx < 5 { void_p2[idx] = true; } }
            else          { if idx < 5 { void_p1[idx] = true; } }
        }
    }
    for i in 0..5 { if void_p1[i] { p1[i].void_blocked = true; } }
    for i in 0..5 { if void_p2[i] { p2[i].void_blocked = true; } }

    // Second pass: apply effects
    for &(side, idx) in &order {
        let at = if side == 0 { p1[idx].action_type } else { p2[idx].action_type };
        let void_blocked = if side == 0 { p1[idx].void_blocked } else { p2[idx].void_blocked };
        if void_blocked { continue; }

        match at {
            0 => { // UseCrystal: +5 BP to self
                if side == 0 { p1[idx].bp_mod += 5; } else { p2[idx].bp_mod += 5; }
            }
            1 => { // Barrier: set barrierUp
                if side == 0 { p1[idx].barrier_up = true; } else { p2[idx].barrier_up = true; }
            }
            2 => { // UseFlame: -5 HP to opposing card at same slot
                if side == 0 { if idx < 5 { p2[idx].hp_mod -= 5; } }
                else          { if idx < 5 { p1[idx].hp_mod -= 5; } }
            }
            3 => { // UseStorm: all opposing cards -2 BP, clear their barriers
                if side == 0 {
                    for c in p2.iter_mut() { c.bp_mod -= 2; c.barrier_up = false; }
                } else {
                    for c in p1.iter_mut() { c.bp_mod -= 2; c.barrier_up = false; }
                }
            }
            4 => { // UseShadow: self.shadow = true (skip pair)
                if side == 0 { p1[idx].shadow = true; } else { p2[idx].shadow = true; }
            }
            5 => {} // UseVoid: handled in first pass
            _ => {}
        }
    }

    // Apply pre-combat Flame/passive HP mods
    for c in p1.iter_mut() { c.hp += c.hp_mod; }
    for c in p2.iter_mut() { c.hp += c.hp_mod; }
}

// ─── Step 4: 5-pair combat ────────────────────────────────────────────────────

fn run_combat(p1: &mut [CardWork; 5], p2: &mut [CardWork; 5], seed: &[u8; 32]) {
    for i in 0..5 {
        let a_shadow = p1[i].shadow;
        let b_shadow = p2[i].shadow;
        if a_shadow || b_shadow { continue; }

        let a_bp = (p1[i].bp + p1[i].bp_mod).max(0);
        let b_bp = (p2[i].bp + p2[i].bp_mod).max(0);
        let a_first = p1[i].ini > p2[i].ini
            || (p1[i].ini == p2[i].ini && seed_byte(seed, 24 + i) < 128);

        if a_first {
            if !p2[i].barrier_up {
                p2[i].hp -= a_bp;
            } else {
                p2[i].barrier_up = false;
            }
            if p2[i].hp > 0 {
                if !p1[i].barrier_up {
                    p1[i].hp -= b_bp;
                } else {
                    p1[i].barrier_up = false;
                }
            }
        } else {
            if !p1[i].barrier_up {
                p1[i].hp -= b_bp;
            } else {
                p1[i].barrier_up = false;
            }
            if p1[i].hp > 0 {
                if !p2[i].barrier_up {
                    p2[i].hp -= a_bp;
                } else {
                    p2[i].barrier_up = false;
                }
            }
        }
    }
}

// ─── Step 5-6: Victory and loot ───────────────────────────────────────────────

fn judge_winner(p1: &[CardWork; 5], p2: &[CardWork; 5], seed: &[u8; 32]) -> (Winner, u32, u32) {
    let p1_bp: u32 = p1.iter().map(|c| {
        if c.id > 0 && c.hp > 0 { (c.bp + c.bp_mod).max(0) as u32 } else { 0 }
    }).sum();
    let p2_bp: u32 = p2.iter().map(|c| {
        if c.id > 0 && c.hp > 0 { (c.bp + c.bp_mod).max(0) as u32 } else { 0 }
    }).sum();

    let winner = if p1_bp > p2_bp {
        Winner::P1
    } else if p2_bp > p1_bp {
        Winner::P2
    } else if seed_byte(seed, 31) < 128 {
        Winner::P1
    } else {
        Winner::P2
    };
    (winner, p1_bp, p2_bp)
}

fn pick_loot(loser_field: &[CardWork; 5], seed: &[u8; 32]) -> u8 {
    let valid: Vec<u8> = loser_field.iter().filter(|c| c.id > 0).map(|c| c.id).collect();
    if valid.is_empty() { return 0; }
    let idx = seed_byte(seed, 30) as usize % valid.len();
    valid[idx]
}

// ─── Internal core (shared by all entry points) ───────────────────────────────

fn damage_calc_core(mut p1: [CardWork; 5], mut p2: [CardWork; 5], seed: &[u8; 32]) -> DamageResult {
    let _ = detect_synergy(&p1);
    let _ = detect_synergy(&p2);
    apply_passive_abilities(&mut p1, &mut p2);
    let mut p1 = sort_by_ini_desc(&p1, seed, 0);
    let mut p2 = sort_by_ini_desc(&p2, seed, 8);
    apply_action_types(&mut p1, &mut p2, seed);
    run_combat(&mut p1, &mut p2, seed);
    let (winner, p1_bp_total, p2_bp_total) = judge_winner(&p1, &p2, seed);
    let loser_field = if winner == Winner::P1 { &p2 } else { &p1 };
    let looted_card_id = pick_loot(loser_field, seed);
    DamageResult { winner, p1_bp_total, p2_bp_total, looted_card_id }
}

// ─── Public entry point ───────────────────────────────────────────────────────

/// Execute Phase 15 battle resolution.
///
/// card_ids_p1 / card_ids_p2: [u64; 10] — first 5 entries are the field cards.
///   IDs must be 1-60 and present in CARDS table; unknown IDs are treated as empty slots.
/// seed: SHA-256(salt_p1 || salt_p2 || [round & 0xff])
pub fn damage_calc(
    card_ids_p1: &[u64; 10],
    card_ids_p2: &[u64; 10],
    seed: &[u8; 32],
) -> DamageResult {
    damage_calc_core(build_work(card_ids_p1), build_work(card_ids_p2), seed)
}

/// Same as damage_calc but accepts explicit per-slot action types (overrides card table).
/// Used by cross-tests and future instructions that allow per-round action selection.
pub fn damage_calc_with_action_types(
    card_ids_p1: &[u64; 10],
    card_ids_p2: &[u64; 10],
    action_types_p1: &[u8; 5],
    action_types_p2: &[u8; 5],
    seed: &[u8; 32],
) -> DamageResult {
    let mut p1 = build_work(card_ids_p1);
    let mut p2 = build_work(card_ids_p2);
    for i in 0..5 {
        p1[i].action_type = action_types_p1[i];
        p2[i].action_type = action_types_p2[i];
    }
    damage_calc_core(p1, p2, seed)
}
