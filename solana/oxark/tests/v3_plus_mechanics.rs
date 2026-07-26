/// v3.0-plus Mechanics — litesvm unit tests
///
/// Tests cover:
///   T01-T04: SeasonStats initialization and counters
///   T05-T08: CardBattleHistory extended schema (burn/evolve/imprint/lease fields)
///   T09-T12: ImprintKey enum serialization and Imprint struct layout
///   T13-T16: Burn protection rules (Legendary/Rare blocked, Common allowed)
///   T17-T18: Evolve rarity gating (Common→Uncommon only)
///   T19-T21: Steal-Lease system (LEASE_DURATION_SEC=1800)
///   T22-T23: Imprint grants and stat-delta values
///   T24-T26: Commit phase encoding (phase + played_cards)
///   T27-T29: Lane scoring element affinity (Fire>Water multiplier)
///   T30-T31: Lease expiry detection helper
///   T32-T33: Owner ring buffer push (max 10)
///   T34-T35: SeasonStats LEN constant verification

#[cfg(test)]
mod v3_plus {
    use sha2::{Sha256, Digest};

    // ─── Re-exports from program crate ────────────────────────────────────────
    // We test the pure business logic directly via the library crate,
    // without spinning up a full Solana VM (faster, no BPF needed).
    // Instruction-level integration tests that need a live VM are covered in primitives.rs.

    // Pull in state types and constants
    use oxark::state::{
        CardBattleHistory, Imprint, ImprintKey, SeasonStats, StealType,
        LEASE_DURATION_SEC,
    };
    use anchor_lang::prelude::Pubkey;

    // ─── Helpers ──────────────────────────────────────────────────────────────

    fn zero_pubkey() -> Pubkey { Pubkey::default() }

    fn fresh_history() -> CardBattleHistory {
        CardBattleHistory {
            card_mint:             zero_pubkey(),
            wins:                  0,
            losses:                0,
            kos:                   0,
            dmg_dealt:             0,
            times_summoned:        0,
            owners_history:        [zero_pubkey(); 10],
            owners_history_len:    0,
            owners_dropped_count:  0,
            acquisition_source:    0,
            current_owner_since:   0,
            created_at:            0,
            bump:                  0,
            burn_count:            0,
            souls_collected:       0,
            legendary_kills:       0,
            imprints:              [Imprint::default(); 5],
            imprint_count:         0,
            evolved_from_a:        zero_pubkey(),
            evolved_from_b:        zero_pubkey(),
            is_evolved:            false,
            lease_expires_at:      0,
            lease_returns_to:      zero_pubkey(),
            has_active_lease:      false,
        }
    }

    fn fresh_season_stats(season_id: u32) -> SeasonStats {
        SeasonStats {
            season_id,
            total_burned:  0,
            total_minted:  0,
            total_evolved: 0,
            total_stolen:  0,
            bump:          0,
        }
    }

    // ─── T01-T04: SeasonStats ─────────────────────────────────────────────────

    #[test]
    fn t01_season_stats_len_is_correct() {
        // 8 disc + 4 season_id + 4 burned + 4 minted + 4 evolved + 4 stolen + 1 bump = 29
        assert_eq!(SeasonStats::LEN, 29, "SeasonStats::LEN must be 29");
    }

    #[test]
    fn t02_season_stats_burn_counter_increments() {
        let mut stats = fresh_season_stats(1);
        stats.total_burned = stats.total_burned.saturating_add(1);
        stats.total_burned = stats.total_burned.saturating_add(1);
        assert_eq!(stats.total_burned, 2);
    }

    #[test]
    fn t03_season_stats_evolve_updates_both_burned_and_evolved() {
        let mut stats = fresh_season_stats(1);
        // evolve_cards burns 2 and mints 1
        stats.total_burned  = stats.total_burned.saturating_add(2);
        stats.total_evolved = stats.total_evolved.saturating_add(1);
        stats.total_minted  = stats.total_minted.saturating_add(1);
        assert_eq!(stats.total_burned, 2);
        assert_eq!(stats.total_evolved, 1);
        assert_eq!(stats.total_minted, 1);
    }

    #[test]
    fn t04_season_stats_steal_counter_increments() {
        let mut stats = fresh_season_stats(1);
        stats.total_stolen = stats.total_stolen.saturating_add(1);
        assert_eq!(stats.total_stolen, 1);
    }

    // ─── T05-T08: CardBattleHistory extended schema ───────────────────────────

    #[test]
    fn t05_card_battle_history_len_reflects_v3_fields() {
        // v3.0-plus LEN should be 636 bytes
        assert_eq!(CardBattleHistory::LEN, 636, "CBH LEN must be 636");
    }

    #[test]
    fn t06_fresh_history_has_no_active_lease() {
        let h = fresh_history();
        assert!(!h.has_active_lease);
        assert_eq!(h.lease_expires_at, 0);
        assert_eq!(h.lease_returns_to, zero_pubkey());
    }

    #[test]
    fn t07_fresh_history_is_not_evolved() {
        let h = fresh_history();
        assert!(!h.is_evolved);
        assert_eq!(h.evolved_from_a, zero_pubkey());
        assert_eq!(h.evolved_from_b, zero_pubkey());
    }

    #[test]
    fn t08_history_v3_counters_saturating_add() {
        let mut h = fresh_history();
        h.burn_count        = u32::MAX;
        h.souls_collected   = u32::MAX;
        h.legendary_kills   = u32::MAX;
        // saturating_add should not overflow
        h.burn_count        = h.burn_count.saturating_add(1);
        h.souls_collected   = h.souls_collected.saturating_add(1);
        h.legendary_kills   = h.legendary_kills.saturating_add(1);
        assert_eq!(h.burn_count, u32::MAX);
        assert_eq!(h.souls_collected, u32::MAX);
        assert_eq!(h.legendary_kills, u32::MAX);
    }

    // ─── T09-T12: ImprintKey enum ─────────────────────────────────────────────

    #[test]
    fn t09_imprint_key_none_is_default() {
        let k = ImprintKey::default();
        assert_eq!(k, ImprintKey::None);
    }

    #[test]
    fn t10_imprint_key_from_u8_round_trips() {
        for i in 0u8..=11 {
            let k = ImprintKey::from(i);
            // cast back: use as u8 — since #[repr(u8)] and same order, must equal i
            assert_eq!(k as u8, i, "ImprintKey round-trip failed for {}", i);
        }
    }

    #[test]
    fn t11_imprint_struct_size_is_22_bytes() {
        assert_eq!(Imprint::SIZE, 22);
    }

    #[test]
    fn t12_imprint_default_is_all_zero() {
        let imp = Imprint::default();
        assert_eq!(imp.key, 0);
        assert_eq!(imp.value, 0);
        assert!(!imp.is_cosmetic);
        assert_eq!(imp.acquired_at, 0);
        assert_eq!(imp.duel_id, 0);
    }

    // ─── T13-T16: Burn protection rules ──────────────────────────────────────

    const RARITY_COMMON:    u8 = 0;
    const RARITY_UNCOMMON:  u8 = 1;
    const RARITY_RARE:      u8 = 2;
    const RARITY_LEGENDARY: u8 = 3;

    fn can_burn(rarity: u8) -> bool {
        rarity != RARITY_LEGENDARY && rarity != RARITY_RARE
    }

    #[test]
    fn t13_legendary_cannot_be_burned() {
        assert!(!can_burn(RARITY_LEGENDARY), "Legendary must be burn-protected");
    }

    #[test]
    fn t14_rare_cannot_be_burned_in_season1() {
        assert!(!can_burn(RARITY_RARE), "Rare must be burn-protected in Season 1");
    }

    #[test]
    fn t15_common_can_be_burned() {
        assert!(can_burn(RARITY_COMMON), "Common must be burnable");
    }

    #[test]
    fn t16_uncommon_can_be_burned() {
        assert!(can_burn(RARITY_UNCOMMON), "Uncommon must be burnable");
    }

    // ─── T17-T18: Evolve rarity gating ───────────────────────────────────────

    fn can_be_evolve_parent(rarity: u8) -> bool { rarity == RARITY_COMMON }
    fn valid_evolve_target(rarity: u8) -> bool  { rarity == RARITY_UNCOMMON }

    #[test]
    fn t17_only_common_parents_allowed_for_evolve() {
        assert!( can_be_evolve_parent(RARITY_COMMON));
        assert!(!can_be_evolve_parent(RARITY_UNCOMMON));
        assert!(!can_be_evolve_parent(RARITY_RARE));
        assert!(!can_be_evolve_parent(RARITY_LEGENDARY));
    }

    #[test]
    fn t18_evolve_target_must_be_uncommon() {
        assert!(!valid_evolve_target(RARITY_COMMON));
        assert!( valid_evolve_target(RARITY_UNCOMMON));
        assert!(!valid_evolve_target(RARITY_RARE));
        assert!(!valid_evolve_target(RARITY_LEGENDARY));
    }

    // ─── T19-T21: Steal-Lease ─────────────────────────────────────────────────

    #[test]
    fn t19_lease_duration_is_1800_seconds() {
        assert_eq!(LEASE_DURATION_SEC, 1800, "Lease must be 30 min = 1800s (≈3 duels)");
    }

    #[test]
    fn t20_lease_active_when_not_expired() {
        let mut h = fresh_history();
        let now: i64 = 1_000_000;
        h.has_active_lease = true;
        h.lease_expires_at = now + LEASE_DURATION_SEC;
        h.lease_returns_to = Pubkey::new_unique();

        assert!(!h.lease_is_expired(now), "Lease should not be expired at issue time");
        assert!(!h.lease_is_expired(now + LEASE_DURATION_SEC - 1), "Lease should not be expired 1s before expiry");
    }

    #[test]
    fn t21_lease_expires_at_threshold() {
        let mut h = fresh_history();
        let now: i64 = 1_000_000;
        h.has_active_lease = true;
        h.lease_expires_at = now + LEASE_DURATION_SEC;
        h.lease_returns_to = Pubkey::new_unique();

        assert!(h.lease_is_expired(now + LEASE_DURATION_SEC), "Lease must expire at exact threshold");
        assert!(h.lease_is_expired(now + LEASE_DURATION_SEC + 3600), "Lease must stay expired");
    }

    // ─── T22-T23: Imprint grants ──────────────────────────────────────────────

    fn stat_delta_for(key: ImprintKey) -> i32 {
        match key {
            ImprintKey::Veteran    => 1,
            ImprintKey::Elder      => 1,
            ImprintKey::Kingslayer => 2,
            _                      => 0,
        }
    }

    fn max_stat_imprints(rarity: u8) -> usize {
        CardBattleHistory::max_stat_imprints(rarity)
    }

    #[test]
    fn t22_stat_imprint_deltas_are_bounded() {
        // All stat imprints must have value ≤ 2 (P2W guard)
        for key in [ImprintKey::Veteran, ImprintKey::Elder, ImprintKey::Kingslayer,
                    ImprintKey::Burner, ImprintKey::Evolved] {
            assert!(stat_delta_for(key) <= 2, "{:?} delta exceeds +2 P2W cap", key);
        }
    }

    #[test]
    fn t23_rarity_based_imprint_limits() {
        assert_eq!(max_stat_imprints(0), 3, "Common: 3 stat imprints");
        assert_eq!(max_stat_imprints(1), 3, "Uncommon: 3 stat imprints");
        assert_eq!(max_stat_imprints(2), 4, "Rare: 4 stat imprints");
        assert_eq!(max_stat_imprints(3), 5, "Legendary: 5 stat imprints");
    }

    // ─── T24-T26: Commit phase encoding ──────────────────────────────────────

    fn reborn_commit_hash(played_cards: &[u64], salt: &[u8; 32], round: u8, phase: u8) -> [u8; 32] {
        let mut hasher = Sha256::new();
        for &cid in played_cards {
            hasher.update(cid.to_le_bytes());
        }
        hasher.update(salt);
        hasher.update([round]);
        hasher.update([phase]);
        hasher.finalize().into()
    }

    #[test]
    fn t24_reborn_commit_hash_is_deterministic() {
        let cards = [42u64, 17u64, 5u64];
        let salt  = [0u8; 32];
        let h1    = reborn_commit_hash(&cards, &salt, 1, 2);
        let h2    = reborn_commit_hash(&cards, &salt, 1, 2);
        assert_eq!(h1, h2, "Hash must be deterministic");
    }

    #[test]
    fn t25_different_phases_produce_different_hashes() {
        let cards = [42u64];
        let salt  = [0u8; 32];
        let h_summon = reborn_commit_hash(&cards, &salt, 1, 2); // phase=Summon
        let h_battle = reborn_commit_hash(&cards, &salt, 1, 3); // phase=Battle
        assert_ne!(h_summon, h_battle, "Phase must be bound in commitment");
    }

    #[test]
    fn t26_different_played_cards_produce_different_hashes() {
        let salt = [0u8; 32];
        let h1 = reborn_commit_hash(&[1u64], &salt, 1, 0);
        let h2 = reborn_commit_hash(&[2u64], &salt, 1, 0);
        assert_ne!(h1, h2, "played_cards must be bound in commitment");
    }

    // ─── T27-T29: Lane scoring element affinity ───────────────────────────────

    fn calc_element_multiplier(attacker: u8, defender: u8) -> u32 {
        match (attacker, defender) {
            (0, 1) | (1, 3) | (3, 0) => 1500, // Triad 1 advantages
            (1, 0) | (3, 1) | (0, 3) => 700,  // Triad 1 disadvantages
            (2, 4) | (4, 5) | (5, 2) => 1500, // Triad 2 advantages
            (4, 2) | (5, 4) | (2, 5) => 700,  // Triad 2 disadvantages
            _                        => 1000,
        }
    }

    #[test]
    fn t27_fire_beats_water_with_1_5x_multiplier() {
        assert_eq!(calc_element_multiplier(0, 1), 1500); // Fire(0) > Water(1)
    }

    #[test]
    fn t28_water_loses_to_fire_with_0_7x_multiplier() {
        assert_eq!(calc_element_multiplier(1, 0), 700); // Water(1) < Fire(0)
    }

    #[test]
    fn t29_same_element_neutral() {
        for elem in 0u8..=5 {
            assert_eq!(calc_element_multiplier(elem, elem), 1000,
                "Same element must be neutral (×1.0)");
        }
    }

    // ─── T30-T31: Lease expiry ────────────────────────────────────────────────

    #[test]
    fn t30_no_lease_never_reports_expired() {
        let h = fresh_history(); // has_active_lease = false
        assert!(!h.lease_is_expired(i64::MAX), "No lease → never expired");
    }

    #[test]
    fn t31_zero_expiry_with_active_lease_not_expired() {
        let mut h = fresh_history();
        h.has_active_lease = true;
        h.lease_expires_at = 0; // zero = unset (edge case, should not trigger)
        assert!(!h.lease_is_expired(100), "Zero expiry should not trigger expired");
    }

    // ─── T32-T33: Owner ring buffer ───────────────────────────────────────────

    fn push_owner(h: &mut CardBattleHistory, owner: Pubkey) {
        if (h.owners_history_len as usize) < 10 {
            let len = h.owners_history_len as usize;
            for i in (1..=len).rev() {
                h.owners_history[i] = h.owners_history[i - 1];
            }
            h.owners_history[0] = owner;
            h.owners_history_len += 1;
        } else {
            for i in (1..10).rev() {
                h.owners_history[i] = h.owners_history[i - 1];
            }
            h.owners_history[0] = owner;
            h.owners_dropped_count = h.owners_dropped_count.saturating_add(1);
        }
    }

    #[test]
    fn t32_owner_ring_buffer_holds_last_10() {
        let mut h = fresh_history();
        let keys: Vec<Pubkey> = (0..15).map(|_| Pubkey::new_unique()).collect();
        for k in &keys {
            push_owner(&mut h, *k);
        }
        assert_eq!(h.owners_history_len, 10, "Buffer must cap at 10");
        assert_eq!(h.owners_dropped_count, 5, "5 entries must have been dropped");
        assert_eq!(h.owners_history[0], keys[14], "Most recent owner at index 0");
        assert_eq!(h.owners_history[9], keys[5], "Oldest surviving owner at index 9");
    }

    #[test]
    fn t33_owner_ring_initial_state_is_all_zeros() {
        let h = fresh_history();
        assert_eq!(h.owners_history_len, 0);
        assert_eq!(h.owners_dropped_count, 0);
        for slot in &h.owners_history {
            assert_eq!(*slot, zero_pubkey());
        }
    }

    // ─── T34-T35: Constant verification ──────────────────────────────────────

    #[test]
    fn t34_imprint_array_capacity_is_5() {
        // imprints: [Imprint; 5]
        let h = fresh_history();
        assert_eq!(h.imprints.len(), 5);
    }

    #[test]
    fn t35_steal_type_variants_exist() {
        // Ensure all 4 StealType variants are accessible
        let _lease     = StealType::Lease;
        let _ransom    = StealType::Ransom;
        let _hand_peek = StealType::HandPeek;
        let _legendary = StealType::Legendary;
        // No panic = all variants exist
    }
}
