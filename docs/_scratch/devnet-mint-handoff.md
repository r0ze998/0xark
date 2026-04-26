# Devnet 60-Card Mint — Handoff

**Date:** 2026-04-27  
**Branch:** main  
**Tag:** v-phd-devnet-mint  
**Script:** `tools/mint-all-cards.js`  
**Records:** `docs/devnet-mint-records.json`

---

## Result summary

| Metric | Value |
|---|---|
| Total cards | 60 |
| Freshly minted | 59 |
| Pre-existing (already minted) | 1 (#001 AEGIS) |
| Errors | 0 |
| Wallet | `DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R` |
| Cards program | `236FNPRbJr5W7qeV9fJCYsxDEkruSK6fnNAipf47Mq1S` |
| Mint authority | Burned (SetAuthority → None) after each mint |

---

## Solscan sample (devnet)

| Card | Mint address | Tx sig |
|---|---|---|
| #001 AEGIS | 3iZQAt7D4F2gHNXcjwWJhKxfGVhKhzyELMm1tAwy21ni | (pre-existing) |
| #015 IRON WALL | H2yJSgGzUQ6NnTgSs7FQgemXFX7bNQAv6tPFBagrkQZn | 3xWm84hJqVzs89jN... |
| #030 SHADOW | 6FHSa3L7bvrgi8W9BGE32SricZxXBJuL2zNkebzZCFAv | 4RuVBzogJ7jyNLeT... |
| #045 THUNDER | 64RYUSqgsuqwAgCy93x8ft3GwiS9jEoY22LKq6d6HSa4 | 62GRRv7SMXagFxqa... |
| #060 ARK BLESS | 9LzFogJj4ohEndX4CCFqshfsEhfeSoJe51owcKVNwXz2 | 5zD4cGaDuFja3C9H... |

Solscan links (cluster=devnet):
- https://solscan.io/token/3iZQAt7D4F2gHNXcjwWJhKxfGVhKhzyELMm1tAwy21ni?cluster=devnet
- https://solscan.io/token/6FHSa3L7bvrgi8W9BGE32SricZxXBJuL2zNkebzZCFAv?cluster=devnet
- https://solscan.io/token/9LzFogJj4ohEndX4CCFqshfsEhfeSoJe51owcKVNwXz2?cluster=devnet

---

## How it works

Each mint is a single atomic transaction with 3 instructions:

1. **`mint_solo_card`** (Anchor, cards program `236FNP...`)  
   - PDA: `[solo_card, playerPubkey, cardId_u8]`  
   - Creates mint PDA + ATA, mints 1 token to player

2. **`create_metadata_accounts_v3`** (Metaplex Token Metadata)  
   - Name: `"0xARK #NNN — CARD_NAME"`  
   - Symbol: `"0xARK"`  
   - URI: `https://r0ze998.github.io/0xark/nft/card/{id}.json`  
   - royalty: 500 bps (5%), mint authority = payer

3. **`set_authority`** (SPL Token, authority type = MintTokens → None)  
   - Burns mint authority permanently — supply locked at 1

All 60 ran at 1.5 s intervals to respect devnet rate limits.  
Total time: ~90 s. Remaining balance: ~15.5 SOL.

---

## Key constants used

```
CARDS_PROGRAM_ID            236FNPRbJr5W7qeV9fJCYsxDEkruSK6fnNAipf47Mq1S
SPL_TOKEN_PROGRAM_ID        TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
ASSOCIATED_TOKEN_PROGRAM_ID ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL  ← anchor-spl 1.0.0
TOKEN_METADATA_PROGRAM_ID   metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s
SOLO_CARD_SEED              "solo_card"
MINT_SOLO_DISC              sha256("global:mint_solo_card")[0..8]
```

Note: `anchor-spl 1.0.0` uses the newer ATA program ID ending in `...A8knL`, not the legacy `...e1bx`.

---

## Files changed

- `tools/mint-all-cards.js` — mint script (new)
- `docs/devnet-mint-records.json` — full mint records (new)
- `README.md` — "60 NFTs minted on devnet" section added
