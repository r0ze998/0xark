# 0xARK — Strategy Depth Design Document
> v511 | 2026-04-21

This document specifies the three strategic axes that deepen 0xARK's battle system beyond the current hand-draw loop. Each axis is independently implementable and composable with the others.

---

## Section 1: Preparation Deck — Axis A

### Overview

Players build a 20-card **Preparation Deck** from their vault (collected cards). The deck is locked on dungeon entry and used as the draw source for all battles during that run.

### Deck Constraints

| Rule | Value | Reason |
|------|-------|--------|
| Deck size | exactly 20 | Tight enough to force meaningful choices |
| Cost Cap | total cost ≤ 30 | Prevents all-legendary builds |
| Legendary slots | max 2 | Preserves rarity feel |
| Rare slots | max 6 | Encourages mixed builds |
| Common minimum | at least 12 | Ensures deck depth |

**Card cost** = rarity value (1=Common, 2=Uncommon, 3=Rare, 4=Epic, 5=Legendary).  
Example: 12 Common (12) + 6 Rare (18) = 30 → valid.

### On-Chain: PlayerDeck PDA

```rust
#[account]
pub struct PlayerDeck {
    pub owner:         Pubkey,     // player wallet
    pub deck_cards:    [u8; 20],   // card IDs (1-60), 0 = empty slot
    pub card_count:    u8,         // filled slots
    pub locked_until:  i64,        // Unix ts; 0 = editable
    pub last_modified: i64,
}
```

**Instructions:**
- `save_deck(deck_cards: [u8; 20])` — validate constraints, write PDA
- `lock_deck()` — set `locked_until = Clock::get().unix_timestamp + SEASON_DURATION`

**Error codes:**
- `InvalidDeckComposition` — constraint violation
- `DeckLocked` — edit attempted while locked

### Frontend: MY DECK Tab

Added to the NFT Trading House modal (T72) as a 4th tab:
- 5×4 slot grid showing current deck
- [Z] on empty slot → card picker from vault
- [Z] on filled slot → remove card
- [R] → `save_deck` on-chain tx
- Cost/rarity totals shown; violation slots highlighted red

### Dungeon Entry Lock

`openDungeonGate()` (T71) prepends `lock_deck()` tx before dungeon entry.  
If deck is empty (card_count = 0) → abort with toast: "Build your deck first!"

### Battle Hand Draw

Initial hand: 5 random cards drawn from `deck_cards`.  
Each round: draw 1 from remaining deck.  
Deck exhausted: "Out of cards" — battle continues with current hand only.

---

## Section 2: Element System — Axis B

### Four Elements

| Element | Color | Cards | Flavor |
|---------|-------|-------|--------|
| **Tide** | `#60c0f0` | IDs 1-15 | Water, movement, recovery |
| **Abyss** | `#8060d0` | IDs 16-30 | Shadow, void, steal |
| **Storm** | `#d0c040` | IDs 31-45 | Lightning, flame, multi-hit |
| **Iron** | `#a09080` | IDs 46-60 | Physical, draw, barrier |

Each card gets an `element: u8` field (1=Tide, 2=Abyss, 3=Storm, 4=Iron).

### Advantage Cycle

```
Tide → Storm   (+50% dmg)   "Water conducts lightning away"
Storm → Iron   (+50% dmg)   "Lightning shatters steel"
Iron → Abyss   (+50% dmg)   "Iron will cuts through darkness"
Abyss → Tide   (+50% dmg)   "The void swallows the ocean"
```

Reverse: **−30% dmg** (same-element: **100% dmg**)

### Multiplier Formula

```
advantage:  multiplier = 1500  → final = base * 1500 / 1000
neutral:    multiplier = 1000
disadvantage: multiplier = 700 → final = base * 700 / 1000
```

### On-Chain: resolve_round.rs

```rust
pub fn calc_element_multiplier(attacker_elem: u8, defender_elem: u8) -> u32 {
    // Advantage cycle: Tide>Storm>Iron>Abyss>Tide (wrapping)
    match (attacker_elem, defender_elem) {
        (1, 3) | (3, 4) | (4, 2) | (2, 1) => 1500, // advantage
        (3, 1) | (4, 3) | (2, 4) | (1, 2) => 700,  // disadvantage
        _ => 1000, // same or unrelated
    }
}
```

### Frontend UI

- Element icon shown on each card (colored symbol)
- Battle: opponent's played card element displayed
- Advantage fires: "**SUPER EFFECTIVE!**" banner (gold)
- Disadvantage fires: "not very effective..." (grey)
- Neutral: no banner

---

## Section 3: ZK Card Commit / Bluffing — Axis C

### Motivation

Currently cards are revealed instantly. ZK Card Commit adds a two-phase protocol that hides each player's chosen card until both have committed — enabling bluffing.

> *"ZK hides the card, x402 reveals it one at a time"*

### Commit Phase

1. Player selects a card from hand
2. Browser generates: `salt = random 253-bit scalar`
3. Compute: `commitment = Poseidon(card_id, salt)`
4. Send `commit_card(commitment)` tx → `CardCommitRecord PDA`

### Reveal Phase

1. After both players commit
2. Optional: x402 Scout Peek — pay to see one opponent card before reveal
3. Browser generates ZK proof: `π = prove(card_id, salt, commitment)`
4. Send `reveal_card(card_id, salt, proof)` tx
5. On-chain verifies: `Poseidon(card_id, salt) == stored commitment`
6. Both revealed → `resolve_round` fires

### Circom Circuit

```circom
// circuits/card_commit/card_commit.circom
template CardCommit() {
    signal input card_id;      // private
    signal input salt;         // private
    signal input commitment;   // public

    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== card_id;
    poseidon.inputs[1] <== salt;

    commitment === poseidon.out;
}

component main { public [commitment] } = CardCommit();
```

### On-Chain PDAs

```rust
#[account]
pub struct CardCommitRecord {
    pub game_id:    u64,
    pub player:     Pubkey,
    pub round:      u8,
    pub commitment: [u8; 32],  // Poseidon hash
    pub revealed:   bool,
    pub card_id:    u8,        // 0 until reveal
}
```

### Frontend Integration

```js
// solana/client/src/03-zk-prove.js
async function proveCardCommit(cardId, salt) {
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        { card_id: cardId, salt },
        'circuits/card_commit/card_commit.wasm',
        'circuits/card_commit/card_commit_final.zkey'
    );
    return { proof, publicSignals };
}
```

### Battle Round Flow (Updated)

```
1. Both players draw to 5 cards
2. Each selects 1 card
3. COMMIT PHASE
   a. Browser: commitment = Poseidon(card_id, salt)
   b. Tx: commit_card(commitment)
   c. Wait for opponent commit
4. SCOUT PHASE (optional, x402)
   a. x402 Scout Peek reveals one opponent commitment (not card_id yet)
5. REVEAL PHASE
   a. Browser: proof = prove(card_id, salt, commitment)
   b. Tx: reveal_card(card_id, salt, proof)
   c. Wait for opponent reveal
6. RESOLVE
   a. Element multiplier applied
   b. Synergy check (T62)
   c. Damage applied
   d. Draw 1 card
7. Next round
```

---

## Section 4: Integrated Battle Flow

```
Town → Build Deck (20 cards, T81)
  ↓
Dungeon Gate → lock_deck() + enter dungeon (T81)
  ↓
Encounter
  ↓
Battle begins — draw 5 from deck
  ↓
Each Round:
  [Select 1 from hand]
      ↓
  [COMMIT PHASE] → both commit Poseidon hash on-chain
      ↓
  [SCOUT PHASE?] → x402 peek (optional)
      ↓
  [REVEAL PHASE] → both reveal with ZK proof
      ↓
  [RESOLVE] → element mult × synergy bonus → damage
      ↓
  [DRAW 1] from remaining deck
      ↓
  next round or victory
```

---

## Section 5: Implementation Order

| Task | Feature | Commit | Est. Time |
|------|---------|--------|-----------|
| T81 | Axis A: Preparation Deck | v512 | 2-3h |
| T82 | Axis B: Element System | v513 | 2-3h |
| T83 | Axis C: ZK Card Commit | v514 | 4-5h |
| T84 | 3-Axis Integration + UX | v515 | 1.5-2h |

**Dependencies:**
- T82 requires T81 (card draw needs deck)
- T83 requires T82 (resolve_round needs element multiplier)
- T84 requires T83 (full flow)

**On-chain redeploys:** T81 (PlayerDeck PDA), T82 (element field + resolve update), T83 (CardCommitRecord + verify_card_commit)

---

*Document owner: r0ze (株式会社雪風) | claude-sonnet-4-6 implementation*
