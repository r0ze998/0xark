# Security Policy — 0xARK

## Supported Versions

0xARK is currently in devnet beta. Only the latest commit on `main` is supported.

| Version | Supported |
|---------|-----------|
| main (devnet) | ✅ |
| Tagged releases | When available |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email: **security@yukikaze.dev** (or DM [@r0ze_____](https://x.com/r0ze_____) on X)

Expected response: within 48 hours. We will coordinate a fix and disclosure timeline with you.

---

## Threat Model

0xARK is a competitive on-chain card game where players stake real SOL. The attack surface is larger than a typical dApp because adversaries have direct financial incentive to cheat.

### Assets to Protect

| Asset | Value | Location |
|-------|-------|----------|
| Prize Pool SOL | 0.5 SOL × N players per season | Stake vault PDA |
| Card NFT ownership | Competitive advantage + market value | On-chain token accounts |
| Hidden game state | Strategic advantage (positions, hand) | ZK circuit + PDA |
| Player wallets | User funds | Client-side only |
| AI intel pricing | Economic integrity of x402 market | x402 broker server |

---

## On-Chain Security Properties

### 1. Commit-Reveal Replay Prevention

**Threat**: Player records a winning commit from round 1 and replays it in round 2 after seeing rival's action.

**Mitigation**: Each `commit_action` PDA is seeded by `[b"commit", game_id_le, round_le, player_pubkey]`. Because `round` is part of the PDA seed, a commit from round 1 cannot be replayed in round 2 — the PDA address would be different, causing an `AccountNotInitialized` error on `reveal_action`.

**Status**: ✅ Implemented

---

### 2. Action Binding (ZK Proof)

**Threat**: Player commits to BARRIER, then submits a ZK proof for STEAL after seeing rival chose DRAW.

**Mitigation**: The Groth16 public inputs include the `commitment_hash` (`SHA256(action || target || salt)`). The on-chain `verify_zk_proof` instruction checks that the proof's public input matches the stored commit hash. A proof generated for the wrong action will not verify.

**Proof binding**: `publicInput[0] = poseidon(action_type, target_pubkey, salt)`

**Status**: ✅ Implemented

---

### 3. Salt Entropy

**Threat**: Brute-force the salt to predict rival's committed action before reveal.

**Mitigation**: Salts are 32 random bytes generated with `crypto.getRandomValues()`. Search space: 2^256. Brute force is computationally infeasible.

**Status**: ✅ Implemented

---

### 4. Reentrancy Equivalent on Solana

**Threat**: CPI into the 0xARK program recursively before state update completes.

**Mitigation**: Solana's runtime does not permit reentrant CPI back into the same program within a single transaction. Additionally, all instructions follow the checks-effects-interactions pattern: account constraints are checked first, state is mutated before any CPI, and CPIs (token transfer, SystemProgram) execute last.

**Status**: ✅ Protected by runtime + coding pattern

---

### 5. Integer Overflow

**Threat**: Arithmetic overflow in stake accounting or card count leads to silent fund drain.

**Mitigation**: `Cargo.toml` sets `overflow-checks = true` for both `[profile.dev]` and `[profile.release]`. Any overflow panics the BPF program and the transaction fails — it cannot silently wrap.

**Status**: ✅ Implemented

---

### 6. PDA Ownership and Authority

**Threat**: EOA crafts a transaction that drains the stake vault.

**Mitigation**: The stake vault is a PDA owned by the 0xARK program (`program_id` = `2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3`). Only program instructions with the correct seeds can sign CPIs from this PDA. No EOA private key can produce the vault's PDA signature.

**Status**: ✅ Implemented

---

### 7. Unauthorized Host Actions

**Threat**: Non-host player calls `start_game`, starting the round before all players have joined.

**Mitigation**: `start_game` checks `ctx.accounts.host.key() == game.host`. Only the game creator (host) can start the game.

**Status**: ✅ Implemented

---

### 8. Upgrade Authority

**Threat**: Developer backdoor via program upgrade.

**Mitigation (devnet)**: Upgrade authority is retained by the deployer keypair during development. At mainnet launch, upgrade authority will be burned or transferred to a multisig (OtterSec recommended pattern).

**Status**: ⚠️ Upgrade authority retained on devnet (expected for development)

---

### 9. Randomness Manipulation

**Threat**: Miner/validator manipulates slot hash to control card distribution in `start_game`.

**Mitigation**: The on-chain PRNG uses `hash(recent_slot_hash || game_id || timestamp)`. This is not cryptographically secure against validators — a malicious validator could theoretically grind slot hashes. For card distribution fairness in a 3-player game, this level of randomness is acceptable. True unpredictability requires VRF (Switchboard / MagicBlock VRF — Q3 roadmap).

**Status**: ⚠️ Known limitation — VRF planned for Q3 2026

---

## WebSocket Server Security

The multiplayer server (`multiplayer/server.js`) is a pure relay with no game authority. It cannot modify on-chain state. All game logic is enforced by the Anchor program.

### DoS / Flood Prevention

| Control | Value | Enforced by |
|---------|-------|-------------|
| Max frame size | 32 KB | Server pre-parse |
| Max messages/second | 20 | Per-connection rate limiter |
| Max `submit_tx`/second | 3 | Per-connection rate limiter |
| Connection heartbeat | 30s ping/pong | Server interval |
| Player name length | 24 chars | Server truncation |
| Chat message length | 200 chars | Server truncation |
| Coordinate bounds | 0–79 (x), 0–79 (y), 0–5 (area) | Server clamping |

**Status**: ✅ Implemented (v423)

### WebSocket Injection

**Threat**: Attacker sends malformed JSON to crash the server.

**Mitigation**: `JSON.parse` is wrapped in try/catch; malformed messages return `{type: "error"}` and are dropped. Server process never exits on a parse error.

**Status**: ✅ Implemented

---

## x402 AI Intel Broker Security

### Replay Attack on Payment Signatures

**Threat**: Reuse a valid payment signature to call `/intel/*` repeatedly without paying.

**Mitigation**: The broker maintains a `Set<string>` of used signatures with LRU eviction at 10,000 entries (prevents unbounded memory growth). Each signature is valid for exactly one request.

**Status**: ✅ Implemented (v417)

### Denial of Service via Intel Endpoint

**Threat**: Flood `/intel/*` with requests to exhaust server resources.

**Mitigation**: The x402 payment check provides natural rate limiting (each call costs USDC). Additionally, Express default connection limits apply. Explicit rate limiting is on the roadmap.

**Status**: ⚠️ Payment acts as rate limiter; explicit endpoint rate limiting planned

### Recipient Validation

**Threat**: Client sends payment to wrong recipient, broker credits request anyway.

**Mitigation**: Broker validates that `payment.recipient` matches the broker's configured recipient address before crediting any request.

**Status**: ✅ Implemented (v417)

---

## Client-Side Security

### localStorage Tampering

**Threat**: Player edits `localStorage` to inject cards they don't own or inflate HP.

**Mitigation (partial)**: Client-side game state is a convenience cache; all authoritative state (card ownership, vault balance, ZK proof status) is on-chain. A player who tampers with localStorage cannot claim the Prize Pool — `claim_prize` validates on-chain player state.

**Gap**: A tampered client could display incorrect HP or cards during play, providing a false local advantage in the absence of real-time on-chain state sync. Mitigation in progress: server-side state hash broadcast after each battle resolution.

**Status**: ⚠️ On-chain state is authoritative; client-only state is not secured

### Wallet Private Key Safety

The game client never requests, stores, or transmits private keys. All signatures are handled by the Phantom browser extension. The WebSocket relay forwards pre-signed transactions — it never holds any signing authority.

**Status**: ✅ By design (Phantom handles all signing)

---

## ZK Trusted Setup

The Circom Poseidon circuit uses a Groth16 trusted setup (Tau ceremony). The current `commit_reveal_final.zkey` was generated locally for development.

**Gap**: A locally-generated `.zkey` means the toxic waste is known to the developer. A player could theoretically generate fake proofs if they obtained the `.zkey` toxic waste.

**Mitigation for mainnet**: The `.zkey` will be replaced with one generated via a public trusted setup ceremony (e.g., Hermez Perpetual Powers of Tau). This is standard practice for Groth16 circuits.

**Status**: ⚠️ Dev-generated .zkey (acceptable for devnet/hackathon demo; ceremony required for mainnet)

---

## Audit History

| Date | Scope | Auditor | Status |
|------|-------|---------|--------|
| — | — | — | Pre-audit (devnet only) |
| TBD | Full program audit | OtterSec (planned) | Planned for mainnet launch |

---

## Known Limitations Summary

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Upgrade authority held by deployer | Medium | Expected on devnet; will burn at mainnet |
| 2 | On-chain PRNG vulnerable to validator grinding | Low | VRF (Q3 2026) |
| 3 | ZK trusted setup is dev-generated | High | Ceremony required for mainnet |
| 4 | localStorage tampering affects client display | Low | On-chain state is authoritative |
| 5 | `resolve_round` can be called by any participant | Medium | Sequencer restriction planned |
| 6 | x402 endpoint lacks explicit rate limiting | Low | Payment acts as limiter; explicit RL planned |
| 7 | Formal audit not completed | High | OtterSec planned for mainnet |
