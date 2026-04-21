# Instruction Migration Matrix

**Generated:** 2026-04-21 14:25 JST
**Source:** `solana/oxark/programs/oxark/src/instructions/` (26 files)
**Classifier:** Claude Code — T-D2-1

Legend:
- **KEEP** — usable as-is in Reborn, no signature change needed
- **RETARGET** — keep Anchor signature, change semantics for Duel phase model
- **EXTEND** — keep + add new fields (additive, not breaking)
- **DEPRECATE** — dungeon-specific, not used in Reborn; remove in Week 2

| # | File | Entry Points | Current purpose (Phase C) | Reborn class | Effort | Dependencies | Notes |
|---|------|-------------|--------------------------|--------------|--------|--------------|-------|
| 1 | `add_xp.rs` | `add_xp` | Add XP to PlayerLevel PDA, level-up | KEEP | 0h | PlayerLevel PDA | Reborn XP hooks identical (battle win/loss/collect) |
| 2 | `agent_hire.rs` | `register_agent_hire` | Log x402-paid AgentHireSession on-chain | KEEP | 0h | AgentListing, x402 payment tx | AI agents first-class in Reborn, unchanged |
| 3 | `agent_registry.rs` | `register_agent`, `deactivate_agent` | Register/deactivate AI agent listing with strategy/endpoint hashes | KEEP | 0h | AgentListing PDA | x402 marketplace unchanged in Reborn |
| 4 | `commit_action.rs` | `commit_action` | Commit dungeon move hash (ZK commit-reveal for position) | RETARGET | 3h | CommitAction PDA, Game PDA | Change semantics: hash now covers card IDs + phase + round + nonce. Signature `(game_id, hash:[u8;32])` stays. Add `round_number: u8` + `phase: u8` to CommitAction state. |
| 5 | `commit_card.rs` | `commit_card` | ZK card commitment for 2-phase bluff battle | KEEP | 0h | CardCommit PDA | Directly maps to Reborn Duel phase commit. SHA-256(card_id\|salt). |
| 6 | `create_game.rs` | `create_game` | Allocate Game + CardPool PDAs, set status=Lobby | KEEP | 0h | Game PDA, CardPool PDA | Reborn Duel uses same session lifecycle (Lobby→Commit→Reveal→Resolve). |
| 7 | `delegate_session.rs` | `delegate_session` | Delegate Game + PlayerState to MagicBlock ER via CPI | KEEP | 0h | MagicBlock Delegation Program | Reborn uses ER for <50ms commit/reveal. Unchanged. |
| 8 | `init_position.rs` | `init_position` | Record initial dungeon position as Poseidon commitment | DEPRECATE | 0h | PlayerState.position_commitment | Dungeon-only. No position tracking in Reborn. Remove Week 2. |
| 9 | `initialize.rs` | `initialize` | One-time program init (idempotent) | KEEP | 0h | None | Still needed for fresh deploy on Reborn. |
| 10 | `join_game.rs` | `join_game` | Join open game, allocate PlayerState PDA, draw 1 starting card | KEEP | 0h | PlayerState PDA, CardPool PDA | Reborn: players join Duel, receive starting hand. Same flow. |
| 11 | `lock_deck.rs` | `lock_deck` | Lock PlayerDeck for 3600s (dungeon entry gate) | KEEP | 0h | PlayerDeck PDA | Reborn: deck locked before Duel entry. Semantics identical. |
| 12 | `record_battle_result.rs` | `record_battle_result` | Track combo streak (super_effective flag), unlock PERFECT/LEGENDARY/UNSTOPPABLE tiers | EXTEND | 1h | PlayerBattleStats PDA | Add `phase: u8` field to track which Duel phase produced the super-effective hit. |
| 13 | `register_card.rs` | `register_card` | Register card species in PlayerRegistry (GI rule, 60-species win condition) | KEEP | 0h | PlayerRegistry PDA | GI rule is the Reborn win condition (collect all 60). Unchanged. |
| 14 | `resolve_round.rs` | `resolve_round` | Resolve action priority (BARRIER→STEAL→DRAW→SCOUT→MOVE→USE_CARD) using position adjacency | RETARGET | 4h | Game PDA, PlayerState PDAs, CommitAction PDAs | New: resolve Duel phase using lane scoring + element affinity (GDD §5.5). Keep function signature `(ctx, game_id)`. Add TODO stubs in Day 2; full impl Day 8-11. |
| 15 | `reveal_action.rs` | `reveal_action` | Reveal dungeon action: re-derive SHA-256(action_type\|target\|salt), verify hash match | RETARGET | 2h | CommitAction PDA, PlayerState PDA | Change params: `action_type: u8, target: Pubkey, salt: [u8;32]` → add `played_cards: Vec<u64>` for Duel reveal. Old params deprecated but kept for compile compat. |
| 16 | `reveal_card.rs` | `reveal_card` | Reveal ZK-committed card: verify SHA-256(card_id\|salt) == commitment | KEEP | 0h | CardCommit PDA | Directly used in Reborn Duel reveal phase. |
| 17 | `save_deck.rs` | `save_deck` | Save PlayerDeck with composition validation (cost≤30, Legendary≤2, Rare≤6, Common≥12) | EXTEND | 2h | PlayerDeck PDA | Add lane-assignment field (`lane_assignments: [u8;20]` = card→lane 0/1/2) and energy-budget validation per GDD §5.3 |
| 18 | `season_supply.rs` | `init_season_supply`, `record_mint` | Initialize and track per-season card supply with tier fallback | KEEP | 0h | SeasonCardSupply PDA | Season card supply system unchanged in Reborn. |
| 19 | `season.rs` | `create_season`, `end_season` | Create competitive season with entry fee + prize pool; end and emit leaderboard | KEEP | 0h | Season PDA | Season structure identical in Reborn. |
| 20 | `set_title.rs` | `unlock_title`, `set_title` | Unlock (0-7) and equip player title badge | KEEP | 0h | PlayerTitle PDA | Title system unchanged in Reborn. |
| 21 | `stake_entry.rs` | `deposit_stake`, `claim_prize` | 0.5 SOL deposit into stake_vault PDA; winner claims via PDA signer | KEEP | 0h | StakeVault PDA | Prize pool (0.5 SOL entry → winner takes all) is Reborn core mechanic. |
| 22 | `start_game.rs` | `start_game` | Host-restricted: shuffle CardPool via slot-hash PRNG, deal 3 cards, transition Lobby→CommitPhase | KEEP | 0h | Game PDA, CardPool PDA | Reborn Duel starts same way. |
| 23 | `undelegate_session.rs` | `undelegate_session` | Schedule commit + undelegate via MagicBlock ER validator | KEEP | 0h | MagicBlock Delegation Program | ER undelegation unchanged. |
| 24 | `unlock_achievement.rs` | `unlock_achievement` | Unlock achievement by index 0-9 (bitmask u16) | KEEP | 0h | PlayerAchievements PDA | Add Reborn achievement indices in Day 4+ (additive, no struct change needed now). |
| 25 | `verify_dungeon_move.rs` | `verify_dungeon_move` | Groth16 BN254 verification of dungeon position proof (625 constraints) | DEPRECATE | 0h | PlayerState.position_commitment, BN254 pairing | Dungeon-only. Embedded VK for dungeon circuit, not card circuit. Remove Week 2. |
| 26 | `verify_zk_proof.rs` | `verify_zk_proof` | Groth16 BN254 verification of commit_reveal proof (card action privacy layer) | KEEP | 0h | CommitAction PDA | Reborn uses ZK proof for card-play privacy in Duel phases. |

## Summary

| Class | Count | Files |
|-------|-------|-------|
| KEEP | 20 | add_xp, agent_hire, agent_registry(×2), commit_card, create_game, delegate_session, initialize, join_game, lock_deck, register_card, reveal_card, season_supply(×2), season(×2), set_title(×2), stake_entry(×2), start_game, undelegate_session, unlock_achievement, verify_zk_proof |
| RETARGET | 3 | commit_action, resolve_round, reveal_action |
| EXTEND | 2 | record_battle_result, save_deck |
| DEPRECATE | 2 | init_position, verify_dungeon_move |
| UNKNOWN | 0 | — |

**Total migration effort:** 3h + 4h + 2h + 1h + 2h = **12h** (well under 50h threshold)

## Notes

- DEPRECATE items (`init_position`, `verify_dungeon_move`) retain their Anchor account structs and handlers for now. Removal scheduled Day 8 (Week 2 dead-code pass).
- `resolve_round` RETARGET is the highest-effort item (4h) — lane scoring + element affinity requires new state fields. Day 2 adds TODO stubs only; full implementation is Day 8-11 per Sprint plan.
- `anchor-cli 1.0.0` detected (instructions expected 0.30.x). Newer major version — backward-compatible; note for team.
- No UNKNOWN instructions found (< 3 threshold → no halt needed).
