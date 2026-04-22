# Hand State Structure — Day 12 ZK Prep

**Author:** Claude Code (Day 11)  
**Target:** Day 12 ZK commit-reveal circuit integration  
**File:** `solana/client/src/08-duel-scene.js`

---

## Current Hand State (in-memory, Day 10/11)

Each player's hand is `DS.p[who].hand` — a `DuelCard[]` array:

```js
DS.p[0].hand = [
  {
    id:      number,   // 1-60, card catalog ID
    name:    string,   // e.g. "Sea Rat"
    type:    string,   // 'attack'|'defense'|'flee'|'magic'|'recovery'
    rarity:  number,   // 1-5
    color:   string,   // hex color from clan
    icon:    string,   // emoji icon
    flavor:  string,   // flavor text
    lore:    string,   // lore text
    element: string,   // 'fire'|'earth'|'wind'|'shadow'|'gold'
    clan:    string,   // clan name or null
    bp:      number,   // current BP (may be reduced by damage)
    maxBp:   number,   // original BP
    hp:      number,   // current HP
    maxHp:   number,   // original HP
    ini:     number,   // initiative
    cost:    { [element: string]: number }, // summon cost e.g. { fire: 2 }
    owner:   number,   // 0 = player, 1 = opponent
    isDefender: boolean,
    defTwoLane: boolean,
    _lane:   string|undefined, // set when placed in lane
  },
  ...
]
```

**Ordering guarantees:**
- Order is determined by `_seededShuffle(deckIds, seed)` at duel init
- Cards are `push()`-ed from deck to hand on draw (FIFO from shuffled deck)
- Cards are `splice()`-d from hand when played to lane
- No sort operations — order is stable between draws

**Max hand size:** No hard cap in game logic. Visually limited by hand strip (~8 visible). Hand can exceed 10 cards via draw abilities.

**Client-side randomness:** Salt per-round via `generateHandSalt()` using `crypto.getRandomValues`. Different each round.

---

## ZK-Compatible Transformation

For Day 12 Poseidon-hash commitment, the hand needs to be:

```
circuit_input = {
  card_ids:      [u64; 10],   // padded to MAX_HAND_SIZE with 0 (empty slot)
  salt:          [u8; 32],    // cryptographically random, per-round
  phase:         u8,          // round number (1-5)
  player_pubkey: [u8; 32],    // signer's public key bytes
}
```

### Transformation function: `serializeHandForZK(hand, round, salt)`

```js
// In 08-duel-scene.js
const salt = generateHandSalt();           // Uint8Array(32) per round
const input = serializeHandForZK(
  DS.p[0].hand,   // current hand array
  DS.round,       // 1-5
  salt,
);
// input.card_ids: [number; 10] — first N are real cards, rest are 0
// input.salt: number[] (32 bytes)
// input.phase: round number
// input.player_pubkey: number[] (32 bytes, zeros in demo mode)
```

### Output structure:

```js
{
  card_ids:      [4, 16, 29, 0, 0, 0, 0, 0, 0, 0],  // example: 3 cards in hand
  salt:          [42, 187, 23, ...],  // 32 random bytes
  phase:         2,                   // round 2
  player_pubkey: [0, 0, ...],         // 32 bytes, zeros until wallet decode is wired
  _meta: {
    hand_count: 3,
    round: 2,
    generated_at: 1714000000000,
  }
}
```

---

## Circuit Input Format (Circom, Day 12)

The Poseidon circuit from Day 9 (`zk/circuits/commit_reveal.circom`) uses:

```
signal input card_ids[10];     // u64 field elements
signal input salt[32];         // u8 field elements
signal input phase;            // u8
signal output commitment;      // Poseidon hash output
```

Day 12 changes needed:
1. Expand circuit from `commit_reveal.circom` to `hand_commitment.circom`
2. Wire `serializeHandForZK()` output → circuit signals
3. Use snarkjs browser WASM for client-side proof generation
4. On `_lockIn()`: generate commitment, emit `commit_card` instruction with hash
5. After battle: generate reveal, emit `reveal_card` instruction

---

## Notes for Day 12

- **Salt is per-round**: generate fresh salt each time `_startDrawPhase()` fires, store in `DS.p[who]._handSalt`
- **Commitment timing**: commit at END of hand assembly (after `_startDrawPhase` completes), before reveal phase
- **Determinism**: `card_ids` ordering is deterministic — same seed = same shuffle = same commitment
- **Player pubkey**: currently zeros in demo mode. Wire real decode from `walletPubkey` (base58 → 32 bytes). The `_base58ToBytes` helper in `08-duel-scene.js` is a stub — use `@solana/web3.js PublicKey.toBytes()` in production
- **Hand size > 10**: If hand exceeds MAX_HAND_SIZE=10 (via draw abilities), only first 10 are committed. This is a known limitation — discuss with r0ze for Day 12 design review
- **Hotseat mode**: both sides have visible hands — ZK commitment is meaningless for hotseat. Only apply ZK in `ai_stub` mode and future real-multiplayer mode

---

## Test Call (add to console for manual verification)

```js
// In browser console during a duel:
const salt = generateHandSalt();
const input = serializeHandForZK(DS.p[0].hand, DS.round, salt);
console.log('Hand ZK input:', JSON.stringify(input, null, 2));
// Verify:
// - card_ids has exactly 10 elements
// - first N are real card IDs (1-60)
// - rest are 0
// - salt has 32 elements
// - phase matches DS.round
```

---

*End of hand-state-struct.md*
