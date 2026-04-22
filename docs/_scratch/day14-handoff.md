# Day 14 Handoff

**Date completed:** 2026-04-22 (autonomous session)  
**Tag:** `v-phd-day14`  
**Branch:** `phase-d-reborn`

---

## Deliverables

### T-D14-A — Lore Shards data integration ✓
- `docs/LORE_SHARDS.md`: 60-card narrative lore (received from r0ze via Telegram)
- `solana/client/src/data/lore_shards.json`: 60-entry structured JSON, 15 cards with Shards 2+3
- `02-data.js`: Inline `_LORE_SHARDS_DATA` map + `getLoreShardText(card_id, shard_idx, mint)` + `getLoreShardRaw()` + `getLoreCardName()`
- `04-state.js`: `unlockedShards{}` session cache + `setUnlockedShards()` / `getUnlockedShards()`
- Shard 1 always unlocked; Shards 2+3 gated by `unlockedShards[mint]` array
- Placeholder text: "(Lore text coming soon...)" for null shards; "?" for locked shards

### T-D14-B — M5 Card Detail scene ✓
- `solana/client/src/10-card-detail.js` (~440 lines)
- 3-panel layout at canvas 480×270:
  - **Left (x=0-120)**: Owner, wallet (truncated), since date, source, prev owner, hall context, NFT mint badge
  - **Center (x=120-340)**: drawCardFrame at 100×140, type badge, BP/HP/Initiative stats (rarity-derived), ability, cost strip
  - **Right (x=340-480)**: Battle History (PDA data or "No battles yet"), Lore Shard gems (3), typewriter shard panel
- Lore Shard typewriter: 2 frames/char, lock indicator for Shards 2+3
- ADD TO DECK: validation (deck full / 2-copy cap / vintage) + `window.oxarkSaveDeck` hook
- SELL TO SHOP: confirmation modal + `window.oxarkSellCard` hook + price by rarity (0.005–0.1 SOL)
- Scene key: `'card_detail'`; DECISION: BP/HP/Initiative derived from rarity (r*2, max(1,7-r), r) pending real NFT metadata

### T-D14-C — PC Box Card Storage scene ✓
- `solana/client/src/11-card-storage.js` (~310 lines)
- 8-column × scrolling-rows card grid
- Clan filter bar (All + 5 clans), Dups-Only toggle, In-Deck toggle
- Wheel scroll support + scrollbar
- Per-card badges: in-deck ✓, duplicate x2, Legendary L, clan border stripe, name truncated
- VINTAGE stripe (orange) for previous-season cards
- Tap card → `initCardDetailScene(cardInfo, 'card_storage')`
- Scene key: `'card_storage'`

### T-D14-B5 — Entry points wired ✓
- **PC Box dialog**: View Cards / Deck Editor / Tutorial (stub) / Close
- **Deck Editor**: top-right 12×12 zone on each storage card → Card Detail
- **Victory scene**: tap transferred card frame → Card Detail (returnScene='duel_victory')
- **Game loop**: `sc==='card_detail'` and `sc==='card_storage'` routing added
- **Input**: click + wheel dispatch for both scenes added to 10-input.js

### Build ✓
- 28 modules, 30534 source lines, 0 errors
- `node build.js` → `✓ 0xARK built successfully`

---

## Known issues / decisions

1. **BP/HP/Initiative derived from rarity** — Until real NFT on-chain metadata is available, stats shown in Card Detail center panel are approximations: BP=r×2, HP=max(1,7-r), Initiative=r. Real data from Metaplex metadata will replace this in Day 16+ when card art + metadata is uploaded.

2. **CardBattleHistory PDA not wired** — Card Detail right panel shows "No battles yet" placeholder. Actual PDA query (`fetchCardBattleHistory(mint)`) needs to be implemented and wired in Day 15/16.

3. **Lore card_id ≠ CD[] index** — The 60 lore shard entries (Sea Rat → Kingmaker's Ring) and the CD[] game cards (AEGIS, UMBRA…) are different naming systems. getLoreShardText uses `cdIdx + 1` as lore card_id. For demo mode this works. Full alignment with NFT metadata needed post-hackathon.

4. **Sell flow stub** — `window.oxarkSellCard` is not yet implemented in onchain.js. Sell button works in demo mode (shows success toast) but no real on-chain transfer occurs. `sell_card_to_shop` instruction was evaluated for Day 14 but deferred; scope exceeded (Day 14 budget). Safety gate applied.

5. **Card Storage uses vault Set** — Reads `pl[0].vault` (Set of card_ids 1-60). In demo mode (vault not populated), shows all 60 cards. Real vault sync from on-chain PlayerAccount PDA needed.

---

## Day 15 prep

- Season engine will use `isVintage` flag established in Card Detail / Storage (mark cards from previous Season)
- AI agent integration: agent cards appear in Card Storage with "AI Rival" source badge
- `fetchCardBattleHistory(mint)` → wire to CDS._battleHistory for real stats display
- `window.oxarkSellCard` implementation in onchain.js

---

## Test verification (manual devnet)

- Build: `node build.js` → 28 modules, 30534 lines, 0 errors
- Card Storage: PC Box → View Cards → grid of 60 cards renders (all 5 clan colors)
- Card Detail: tap any card → 3-panel layout, Shard 1 readable, Shards 2+3 locked (gray)
- ADD TO DECK: disabled when deck full, success toast when added
- SELL: confirmation modal shows SOL price, cancel clears modal
- Navigation: BACK from Card Detail → returns to card_storage or deck_editor correctly
