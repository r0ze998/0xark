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
| `init_game_world` | `4EUynBDnBvXQ7vYkWdvyvWNagocC18xBwpvo2k2zPZo5paHTczPCWQaKV2aXUK625y1vqwBndxfqj2WZVcJE4ra5` | 2026-05-04 |
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

---

## Fly.io Multiplayer Server — Deploy Log (2026-05-04)

### App
- **App name**: oxark-multiplayer
- **Region**: nrt (Tokyo)
- **URL**: https://oxark-multiplayer.fly.dev
- **WSS**: wss://oxark-multiplayer.fly.dev
- **VM**: shared-cpu-1x / 256MB, auto_stop=stop, min_machines_running=0

### Secrets configured (keys only — values not logged)
- `TREASURY_PUBKEY`
- `OPS_TREASURY_PUBKEY`
- `PRIZE_POOL_PUBKEY`
- `SOLANA_RPC`
- `AI_MODEL_NAME`
- `NODE_ENV`

### Wallet pubkeys (public info)
- OPS_TREASURY: `GN3aBaUFPpejXBy2u4SgXuwQkkqRFauqAfXNsXhTPz4f`
- PRIZE_POOL:   `C8ui4h9tuYiU55VrMohAoFwjsm5RxKPpmQizX9eAAgMa`

### Verification results
- `/health` → `{"status":"ok","rooms":0,"connections":0,"rpc":"https://api.devnet.solana.com"}` ✓
- `POST /x402/match-battle` → HTTP 402 ✓
- WebSocket handshake `wss://oxark-multiplayer.fly.dev` → connected ✓
- AI endpoints (`/x402/ai-move`, `/x402/ai-strategy-advice`) → 503 (ANTHROPIC_API_KEY not set — add later)

### Dockerfile fix
- Changed `npm ci` → `npm install --omit=dev` (lock file sync issue)
- Added `COPY handlers/ state.js state-derivation.js memo-validator.js` (were missing from original)

### Remaining
- Set `ANTHROPIC_API_KEY` secret to enable AI endpoints
- ~~Run `init-game-world.js` to initialize on-chain world state~~ ✓ Done 2026-05-04

---

## GameWorld PDA — Init Log (2026-05-04)

- **GameWorld PDA**: `9EZ1KsXTjErwhbxthCLkT9CZuBdEC53yiXdkacgsHSSf`
- **game_start_timestamp**: `1777865191` (2026-05-04T03:26:31 UTC)
- **TX**: `4EUynBDnBvXQ7vYkWdvyvWNagocC18xBwpvo2k2zPZo5paHTczPCWQaKV2aXUK625y1vqwBndxfqj2WZVcJE4ra5`
- **Explorer**: https://explorer.solana.com/tx/4EUynBDnBvXQ7vYkWdvyvWNagocC18xBwpvo2k2zPZo5paHTczPCWQaKV2aXUK625y1vqwBndxfqj2WZVcJE4ra5?cluster=devnet
- **Note**: Program was upgraded in same session (deployed binary was outdated). Upgrade TX: `52XSA5RvbXsWfuSvWJ8tCVYnHauvkju39RF5bNXFQUcWfZXPDf4VNFtYrUAUCbDDJhqMi95dLAbatnbTWQviS2EM`

---

## ZK Phase 2 — verify_zk_proof upgrade (2026-05-04)

- **Circuit**: `circuits/hand_commitment/hand_commitment.circom` v2
  - 15 Poseidon inputs: round, pubkey_lo, pubkey_hi, card_ids[10], salt_lo, salt_hi
  - Constraints: 2040 (range + uniqueness on card_ids[0..4])
  - Trusted setup: `pot12_final.ptau` (4096 cap)
- **VK**: nPublic=4, IC len=5
  - VK sha256: `af25dda1e4c19dadc05477128ff77cd9e58228fe74bc8c4f5ebb0392c8a1a2c3`
- **Changes**:
  - `verify_zk_proof.rs`: new VK (VK_DELTA_G2 + IC[0..4]), 4-input compute_vk_x(), ZkProofRecord PDA init, pubkey + round validation
  - `lib.rs`: updated signature (`duel_id: u64, round: u64, public_inputs: [[u8;32];4]`)
  - `state.rs`: ZkProofRecord struct added (SIZE=97)
  - `error.rs`: ZkPubkeyMismatch, ZkRoundMismatch, ZkProofInvalid, ZkProofAlreadyVerified
- **Deploy TX**: `2Wu8wQCdRZQwhbx4rpwB6m59GanjMoUPoKGF8GYGM6vgoAdaUZybRtQszeRwPtm3mfyERSbaxgkmo6v1oBMQDLcR`
- **Program ID**: `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN`
- **Binary size**: 1,127,168 bytes
