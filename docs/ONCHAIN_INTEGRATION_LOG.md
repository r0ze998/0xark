# Phase 18 — On-Chain Integration Log

Wires `window.oxarkOnchain.*` to real Anchor program instructions on devnet.

---

## Instructions Implemented

| Instruction | File | Status |
|-------------|------|--------|
| `register_waitlist` | `solana/client/onchain.js` | Implemented |
| `burn_card` | `solana/client/onchain.js` | Implemented |
| `evolve_cards` | `solana/client/onchain.js` | Implemented |
| `grant_imprint` | `solana/client/onchain.js` | Implemented |
| `claim_prize_v2` | `solana/client/onchain.js` | Implemented |
| `check_legendary_v2` | `solana/client/onchain.js` | Implemented |
| `init_game_world` (admin) | `solana/oxark/scripts/init-game-world.js` | Implemented |

---

## Protocol Summary

### register_waitlist
- Deposits **0.5 SOL** (85% → prize_pool, 15% → ops_treasury)
- Initializes `PlayerState` PDA (`["player", wallet]`)
- Distributes 5 deterministic starter cards
- Requires `GameWorld` to be in waitlist window (`start_timestamp` set)

### burn_card
- Burns a Common (rarity=0) or Uncommon (rarity=1) card NFT
- Rare and Legendary cards are blocked on-chain (`ErrorCode::LegendariesAreProtectedFromBurn` / `RareRequiresConditionalBurn`)
- Requires reading `CardBattleHistory.created_at` to derive `SeasonStats` PDA seed

### evolve_cards
- Fuses two Common parents into an Uncommon child
- Both parent ATAs must have `amount == 1`
- Child mint must be pre-minted by oxark-cards program before calling
- Uses parent A's `created_at` to derive shared `SeasonStats` PDA

### grant_imprint
- Writes a battle imprint to `CardBattleHistory` (max 5 per rarity-gated cap)
- Called after a duel resolves to record stat/cosmetic badge
- `duel_id` is the u64 numeric ID of the match

### claim_prize_v2
- Claims tier-proportional prize from prize pool after `game_status == 2`
- Tiers: T1 (60 cards, 50%) / T2 (50–59, 25%) / T3 (30–49, 15%) / T4 (10–29, 8%) / T5 (1–9, 2%)

### check_legendary_v2
- Checks `vault_count == 60` and triggers legendary state on `PlayerState`
- Does not transfer funds; just flips status flags

---

## PDA Seeds (new)

| Account | Seeds |
|---------|-------|
| `PlayerState` | `["player", wallet.toBytes()]` |
| `GameWorld` | `["game_world"]` |
| `CardBattleHistory` | `["card_battle_history", mint.toBytes()]` |
| `SeasonStats` | `["season_stats", card_history.created_at.to_le_bytes()]` |

---

## CardBattleHistory Layout (created_at offset)

```
disc(8) + card_mint(32) + wins(4) + losses(4) + kos(4) + dmg_dealt(8)
+ times_summoned(4) + owners_history(320) + owners_history_len(1)
+ owners_dropped_count(4) + acquisition_source(1) + current_owner_since(8)
= offset 398 → created_at(i64 LE, 8 bytes)
```

---

## Admin Script: init_game_world

```bash
# Initialize game world (run once per season)
cd solana/oxark
ADMIN_KEYPAIR=~/.config/solana/id.json \
SOLANA_RPC=https://api.devnet.solana.com \
node scripts/init-game-world.js $(date +%s)
```

---

## Devnet Transaction Hashes

_Fill in as each instruction is verified on devnet:_

| Instruction | TX Hash | Date |
|-------------|---------|------|
| `init_game_world` | — | — |
| `register_waitlist` | — | — |
| `burn_card` | — | — |
| `evolve_cards` | — | — |
| `grant_imprint` | — | — |
| `claim_prize_v2` | — | — |
| `check_legendary_v2` | — | — |

---

## Error Codes Added (6021–6066)

Full mapping in `ANCHOR_ERRORS` table in `solana/client/onchain.js`.

---

## Remaining for Devnet (post 2026-05-11)

- Run `init_game_world` with final season start timestamp
- Set `prize_pool` and `ops_treasury` pubkeys in client config
- Verify each instruction with a test wallet on devnet and record TX hashes above
- Pre-mint child card NFT via oxark-cards program before testing `evolve_cards`
- Wire `window.oxarkOnchain.burnCard` into loot screen burn UI
- Wire `window.oxarkOnchain.grantImprint` into post-battle flow
- Wire `window.oxarkOnchain.registerWaitlist` into main-screen wallet connect flow
