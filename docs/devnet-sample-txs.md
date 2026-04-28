# 0xARK — Devnet Sample Transactions

**Generated**: 2026-04-27  
**Network**: Solana Devnet  
**Wallet**: `DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R`

---

## NFT Mint Transactions (59 confirmed on-chain)

All 60 0xARK card NFTs were minted via the `mint_solo_card` instruction on 2026-04-26.  
Card #1 (AEGIS) was pre-existing; the remaining 59 were minted in a single batch run.

**Sample transactions (Solscan devnet):**

| Card | Mint Address | Tx Signature |
|---|---|---|
| #2 UMBRA | `2MMutTj8W49rmbYqgsQNom4o7isWLetNUay2GhoBuuDi` | [`3QKLjz...`](https://solscan.io/tx/3QKLjztkztri5pqWzXrWmvdEnx2asToKnyAmxdjcsQkKXS53XZRTqZ9iK49PrYCD7BVg33KRZTRjYuLT2QS5qziM?cluster=devnet) |
| #3 IGNIS | `C5e3eqguENWCnadHKZfs6fcXfaHwDokefbnjShuh9LGD` | [`5cPih2...`](https://solscan.io/tx/5cPih2ABUg4YAma3BwBb9W3UoQQjdFEJqQNdpaaUnt7JfeNJNLMaMapuHVLiLUe2vLPfZfKtyUDCycTmdqTCSSWM?cluster=devnet) |
| #4 STRIKE | `26rVR5ffVGctVd63YKoJVhnrn9zhkM2UDbXaiwGeonLx` | [`5vHkgm...`](https://solscan.io/tx/5vHkgmRWxDcy5fuVPr7LWhQNGXzT4rCzn5XRGw9pPgMvJDoGUBWNqzP8HYvSuzBPwogKhh54gdtBLKfQh1HrPSTV?cluster=devnet) |
| #5 SLASH | `GWApfQWz1Tnjh9xdDWLbc7cE9BrFVQRvq3AR6c1EaFAN` | [`37WNXK...`](https://solscan.io/tx/37WNXKSK7ZZB2ZiqxmLSYEFGM5m2zKAZHTPZb2YKwg5JuJ5Xc18YWVL9QAhc8XauifdgViVs2gXX4Z3483bMRTYQ?cluster=devnet) |
| #6 IMPALE | `8VnnQcfLKvEhEH6cCFsckojRWkhMB9iD4uKmSrrBr4VD` | [`4g2Ro...`](https://solscan.io/tx/4g2RovsEtcRMT5AoSqNb3iDBigipkHA6k3jaH2C14bGNg4SWFK1qrzPco5JmqgeCq31MjWhKUAKkk2J19x84S4e8?cluster=devnet) |

**Full records**: [`docs/devnet-mint-records.json`](devnet-mint-records.json) — all 60 mint addresses + 59 tx signatures.

---

## Game Transaction Types

The following instructions are invoked during live duels. Actual devnet tx examples are generated during gameplay sessions at `r0ze998.github.io/0xark`.

### commit_card (ZK hand commit)

Called at the start of each round. The player commits their card choice as a Poseidon hash.

```
Instruction: commit_card
Args:
  - commitment: [u8; 32]  (Poseidon hash of card_id + nonce)
  - round: u8
Accounts: Game PDA, CardCommitRecord PDA, PlayerState, payer

CU budget: ~15k (no ZK computation on-chain at this stage)
```

### reveal_card (ZK Groth16 reveal)

Called when both players have committed. Submits a Groth16 proof proving the committed hash is valid for the revealed card.

```
Instruction: reveal_card
Args:
  - proof: Groth16Proof  (commit_hand circuit, 256 bytes)
  - card_id: u8
  - nonce: [u8; 32]
Accounts: Game PDA, CardCommitRecord PDA, PlayerState, payer

CU budget: ~130k (includes alt_bn128 Groth16 pairing check)
```

### record_battle_result (post-round result)

Called after both cards are revealed. Records the round outcome.

```
Instruction: record_battle_result
Args:
  - result: BattleResult { winner: Pubkey, loser: Pubkey, delta_hp: i8 }
Accounts: Game PDA, PlayerBattleStats (both players), CardPool

CU budget: ~8k
```

### deposit_stake (ante into vault)

```
Instruction: deposit_stake
Args:
  - amount: u64  (lamports)
Accounts: StakeVault PDA, player wallet (signer), System Program

Example: 5_000_000 lamports = 0.005 SOL (Bronze Hall ante)
```

### claim_prize (winner withdraws)

```
Instruction: claim_prize
Args:
  - game_id: u64
Accounts: StakeVault PDA, Game PDA, winner wallet (signer), System Program
```

---

## ZK Proof Sizes (Circuit benchmarks)

| Circuit | Proof Size | On-chain CU | Browser Gen Time |
|---|---|---|---|
| `commit_hand` | 256 bytes | ~130k | ~2s (WebWorker) |
| `commit_reveal` | 256 bytes | ~94k | ~1.8s |

All three circuits use Groth16 BN254 with `pot12_final.ptau` trusted setup.  
Verification uses Solana `alt_bn128` syscall (native, no L2 required).

---

## AI Agent Scout Peek (x402 payment)

When a Claude Haiku agent decides to peek an opponent's card, it executes a Solana transfer:

```
From: Agent wallet (server-side keypair, seeded from BROKER_WALLET)
To:   DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R (broker)
Amount: 5_000_000 lamports (0.005 SOL)
Memo: "0xARK scout-peek v1"
```

The transfer is verified server-side before the intel is returned. Replay protection uses a rolling LRU cache of recent tx signatures.

---

*Generated 2026-04-27 · Tag: v-phd-devnet-assets*
