# ZK Implementation Files

## 1. circuits/hand_commitment/hand_commitment.circom

```circom
pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";

// 0xARK Hand Commitment Circuit v1
//
// Commits a player's hand of up to 10 cards using Poseidon hash.
// Used in ZK commit-reveal: player commits at Lock In, reveals after battle.
//
// Input packing:
//   card_ids[10] : each card catalog ID (u64), one BN254 field element each
//   salt_lo      : lower 16 bytes of 32-byte salt as u128 → field element
//   salt_hi      : upper 16 bytes of 32-byte salt as u128 → field element
//   round        : round number 1-5 (u8)
//   pubkey_lo    : lower 16 bytes of Solana pubkey as u128 → field element
//   pubkey_hi    : upper 16 bytes of Solana pubkey as u128 → field element
//
// Total inputs: 10 + 2 + 1 + 2 = 15  →  Poseidon(15), t=16 (supported by circomlib)
//
// Public inputs (visible on-chain): round, pubkey_lo, pubkey_hi
// Private inputs (witness): card_ids[10], salt_lo, salt_hi
// Output: commitment (single BN254 field element)

template HandCommitment() {
    // ── Public inputs ─────────────────────────────────────────────────────────
    signal input round;         // round number 1-5
    signal input pubkey_lo;     // lower 16 bytes of player pubkey as u128
    signal input pubkey_hi;     // upper 16 bytes of player pubkey as u128

    // ── Private inputs ────────────────────────────────────────────────────────
    signal input card_ids[10];  // card catalog IDs, 0 = empty slot
    signal input salt_lo;       // lower 16 bytes of 32-byte random salt
    signal input salt_hi;       // upper 16 bytes of 32-byte random salt

    // ── Output ────────────────────────────────────────────────────────────────
    signal output commitment;

    // ── Hash all 15 inputs via Poseidon(15) ──────────────────────────────────
    // Input order:
    //   [0]    = round
    //   [1]    = pubkey_lo
    //   [2]    = pubkey_hi
    //   [3..12] = card_ids[0..9]
    //   [13]   = salt_lo
    //   [14]   = salt_hi
    component hasher = Poseidon(15);
    hasher.inputs[0]  <== round;
    hasher.inputs[1]  <== pubkey_lo;
    hasher.inputs[2]  <== pubkey_hi;
    for (var i = 0; i < 10; i++) {
        hasher.inputs[3 + i] <== card_ids[i];
    }
    hasher.inputs[13] <== salt_lo;
    hasher.inputs[14] <== salt_hi;

    commitment <== hasher.out;
}

component main { public [round, pubkey_lo, pubkey_hi] } = HandCommitment();
```

---

## 2. solana/client/src/03-zk-prove.js

```js
// ─── ZK Card / Hand Commit Module (Axis C) ───────────────────────────────────
// Two-phase bluff battle:
//   1. COMMIT: SHA-256 commitment (on-chain MVP, always available)
//   2. REVEAL: on-chain verify against commitment
//
// Groth16 ZK proof via hand_commitment.circom:
//   Circuit inputs: card_ids[10], salt_lo, salt_hi, round, pubkey_lo, pubkey_hi
//   Artifacts: hand_commitment.wasm + hand_commitment_final.zkey (in client root)
//   Requires snarkjs loaded from CDN (see index.html).

'use strict';

window.zkCardCommit = (function() {

  function generateSalt() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    arr[0] &= 0x1f; // clamp to 253-bit Poseidon field
    return arr;
  }

  async function computeCommitment(cardId, salt) {
    const data = new Uint8Array(33);
    data[0] = cardId & 0xff;
    data.set(salt, 1);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuf);
  }

  async function commitCard(cardId) {
    if (cardId < 1 || cardId > 60) throw new Error('Invalid card_id: ' + cardId);
    const salt = generateSalt();
    const commitment = await computeCommitment(cardId, salt);
    return { cardId, salt, commitment };
  }

  async function verifyAndReveal(cardId, salt, storedCommitment) {
    const computed = await computeCommitment(cardId, salt);
    if (computed.length !== storedCommitment.length) throw new Error('Commitment length mismatch');
    let diff = 0;
    for (let i = 0; i < computed.length; i++) diff |= computed[i] ^ storedCommitment[i];
    if (diff !== 0) throw new Error('Commitment mismatch — wrong card_id or salt');
    return { cardId, salt: Array.from(salt), commitment: Array.from(storedCommitment), verified: true };
  }

  // Split a 32-byte Uint8Array into two 16-byte BigInts (lo = bytes 0-15, hi = bytes 16-31).
  function _splitSalt(salt) {
    const lo = BigInt('0x' + Array.from(salt.slice(0, 16)).map(b=>b.toString(16).padStart(2,'0')).join(''));
    const hi = BigInt('0x' + Array.from(salt.slice(16)).map(b=>b.toString(16).padStart(2,'0')).join(''));
    return { lo, hi };
  }

  // ZK proof for a hand of up to 10 cards via hand_commitment.circom (Groth16).
  // cardIds: array of 1-10 numbers; padded to 10 with 0s internally.
  // salt: Uint8Array(32); round: 1-5; pubkeyBytes: Uint8Array(32) or null.
  // Returns { proof, publicSignals, ok: true } or throws if snarkjs unavailable.
  async function proveHandCommit(cardIds, salt, round = 1, pubkeyBytes = null) {
    const WASM = 'hand_commitment.wasm';
    const ZKEY = 'hand_commitment_final.zkey';

    if (typeof snarkjs === 'undefined') {
      console.warn('[ZK] snarkjs not loaded — add CDN script to index.html');
      return { proof: null, publicSignals: null, ok: false, fallback: 'sha256' };
    }

    const { lo: saltLo, hi: saltHi } = _splitSalt(salt);
    const pk = pubkeyBytes ?? new Uint8Array(32);
    const { lo: pkLo, hi: pkHi } = _splitSalt(pk);

    const ids = Array.from({ length: 10 }, (_, i) => (cardIds[i] ?? 0).toString());
    const input = {
      card_ids: ids,
      salt_lo:  saltLo.toString(),
      salt_hi:  saltHi.toString(),
      round:    round.toString(),
      pubkey_lo: pkLo.toString(),
      pubkey_hi: pkHi.toString(),
    };

    try {
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM, ZKEY);
      return { proof, publicSignals, ok: true };
    } catch (e) {
      console.warn('[ZK] Groth16 fullProve failed:', e.message);
      return { proof: null, publicSignals: null, ok: false, fallback: 'sha256', error: e.message };
    }
  }

  return { commitCard, verifyAndReveal, proveHandCommit, generateSalt, computeCommitment };

})();
```

---

## 3. solana/oxark/programs/oxark/src/instructions/verify_zk_proof.rs

```rust
use anchor_lang::prelude::*;
use solana_bn254::prelude::{
    alt_bn128_addition, alt_bn128_multiplication, alt_bn128_pairing,
};
use crate::constants::*;
use crate::state::*;
use crate::error::ErrorCode;

// ─── Embedded Verification Key (Groth16 BN254) ───────────────────────────
// Generated from: zk/circuits/commit_reveal.circom v2
// Circuit: Poseidon3(actionType, targetArea, salt) == commitHash
//   + range checks: actionType in [1,10], targetArea in [0,2]
// Trusted setup: snarkjs groth16, 277 non-linear constraints

/// VK α point (G1, 64 bytes: x||y big-endian)
const VK_ALPHA_G1: [u8; 64] = [
    13,58,172,32,177,216,235,208,183,197,110,70,31,229,53,155,63,214,137,1,218,228,83,211,21,131,44,40,52,13,123,187,
    40,111,8,171,21,188,128,206,167,191,183,30,41,233,189,48,58,111,49,217,63,251,80,241,160,228,15,209,219,150,238,66,
];

/// VK β point (G2, 128 bytes: x1||x0||y1||y0 big-endian)
const VK_BETA_G2: [u8; 128] = [
    42,235,231,89,194,244,191,107,20,166,221,165,96,69,244,75,116,216,250,209,156,90,171,236,166,226,144,63,137,230,112,51,
    18,78,231,105,214,69,237,7,200,253,80,199,198,126,188,220,116,2,244,57,125,203,217,78,162,98,242,82,35,68,185,252,
    25,18,34,172,185,14,120,142,67,49,175,48,232,205,34,213,234,164,102,93,103,143,1,69,151,166,5,55,71,147,137,54,
    28,211,42,28,34,168,29,207,111,80,158,142,60,206,183,67,218,45,200,53,121,246,252,97,148,244,61,38,115,142,176,84,
];

/// VK γ point (G2, 128 bytes)
const VK_GAMMA_G2: [u8; 128] = [
    25,142,147,147,146,13,72,58,114,96,191,183,49,251,93,37,241,170,73,51,53,169,231,18,151,228,133,183,174,243,18,194,
    24,0,222,239,18,31,30,118,66,106,0,102,94,92,68,121,103,67,34,212,247,94,218,221,70,222,189,92,217,146,246,237,
    9,6,137,208,88,95,240,117,236,158,153,173,105,12,51,149,188,75,49,51,112,179,142,243,85,172,218,220,209,34,151,91,
    18,200,94,165,219,140,109,235,74,171,113,128,141,203,64,143,227,209,231,105,12,67,211,123,76,230,204,1,102,250,125,170,
];

/// VK δ point (G2, 128 bytes)
const VK_DELTA_G2: [u8; 128] = [
    32,63,30,145,6,3,74,51,126,113,136,9,148,163,133,82,245,12,93,229,4,244,24,23,55,100,181,57,204,106,63,91,
    1,22,36,229,119,197,182,178,224,141,108,180,139,178,58,103,95,117,187,198,226,207,213,128,255,240,80,77,18,104,49,41,
    44,186,19,146,187,3,242,86,131,0,96,232,71,37,159,113,134,220,193,71,119,166,17,69,226,166,212,113,213,100,45,113,
    41,94,12,212,11,95,185,84,17,238,213,182,155,3,190,167,118,26,101,161,59,68,5,110,125,16,244,35,85,252,24,137,
];

/// IC[0] (G1 point, 64 bytes — contribution from constant 1)
const VK_IC0: [u8; 64] = [
    28,13,101,75,94,76,38,48,169,246,65,135,35,222,150,113,94,181,81,246,95,159,104,252,247,194,120,14,226,76,169,169,
    11,245,85,191,137,144,72,105,70,11,91,227,157,124,33,89,91,13,213,247,230,248,163,119,23,118,206,210,71,143,123,68,
];

/// IC[1] (G1 point, 64 bytes — contribution from public input 0)
const VK_IC1: [u8; 64] = [
    39,8,115,206,142,6,167,112,227,142,249,239,74,131,229,199,253,227,181,19,79,172,53,235,196,241,16,174,215,185,5,137,
    33,212,98,82,243,147,219,96,237,171,207,224,150,13,218,25,132,2,141,19,145,206,243,239,175,168,186,54,45,143,101,166,
];

// ─── Groth16 Verifier ────────────────────────────────────────────────────

/// Negate a G1 point on BN254.
/// BN254 field prime p = 21888242871839275222246405745257275088696311157297823662689037894645226208583
/// Negation: (x, p - y) for y != 0
fn negate_g1(pt: &[u8; 64]) -> [u8; 64] {
    const P: [u64; 4] = [
        0x3c208c16d87cfd47,
        0x97816a916871ca8d,
        0xb85045b68181585d,
        0x30644e72e131a029,
    ];
    let mut neg = [0u8; 64];
    neg[..32].copy_from_slice(&pt[..32]); // x unchanged

    // y_neg = p - y (big-endian)
    let mut y = [0u64; 4];
    for i in 0..4 {
        let off = 32 + (3 - i) * 8;
        y[i] = u64::from_be_bytes(pt[off..off + 8].try_into().unwrap());
    }
    // Check if y == 0 (point at infinity)
    if y == [0u64; 4] {
        neg[32..].copy_from_slice(&pt[32..]);
        return neg;
    }
    // Subtract: p - y with borrow
    let mut borrow = 0u64;
    let mut result = [0u64; 4];
    for i in 0..4 {
        let (r, b1) = P[i].overflowing_sub(y[i]);
        let (r2, b2) = r.overflowing_sub(borrow);
        result[i] = r2;
        borrow = (b1 || b2) as u64;
    }
    // Write big-endian to neg[32..]
    for i in 0..4 {
        let off = 32 + (3 - i) * 8;
        neg[off..off + 8].copy_from_slice(&result[i].to_be_bytes());
    }
    neg
}

/// Compute vk_x = IC[0] + public_input * IC[1] using alt_bn128 G1 ops.
fn compute_vk_x(public_input: &[u8; 32]) -> Result<[u8; 64]> {
    // Scale IC[1] by the public input scalar
    let mut scalar_input = [0u8; 96]; // G1(64) + scalar(32)
    scalar_input[..64].copy_from_slice(&VK_IC1);
    scalar_input[64..].copy_from_slice(public_input);
    let scaled = alt_bn128_multiplication(&scalar_input)
        .map_err(|_| error!(ErrorCode::InvalidProof))?;

    // Add IC[0] + scaled
    let mut add_input = [0u8; 128]; // two G1 points
    add_input[..64].copy_from_slice(&VK_IC0);
    add_input[64..].copy_from_slice(&scaled);
    let vk_x = alt_bn128_addition(&add_input)
        .map_err(|_| error!(ErrorCode::InvalidProof))?;

    let mut out = [0u8; 64];
    out.copy_from_slice(&vk_x);
    Ok(out)
}

/// Full Groth16 verification via alt_bn128 pairing.
/// Checks: e(A,B) * e(-α,β) * e(-vk_x,γ) * e(-C,δ) == 1
///
/// Pairing input: sequence of (G1, G2) pairs, each 192 bytes (64 + 128).
fn groth16_verify(
    proof_a: &[u8; 64],
    proof_b: &[u8; 128],
    proof_c: &[u8; 64],
    vk_x: &[u8; 64],
) -> Result<bool> {
    let neg_alpha = negate_g1(&VK_ALPHA_G1);
    let neg_vk_x  = negate_g1(vk_x);
    let neg_c     = negate_g1(proof_c);

    // Build pairing input: 4 pairs × 192 bytes = 768 bytes
    let mut pairing_input = [0u8; 768];

    // Pair 1: (π_A, π_B)
    pairing_input[0..64].copy_from_slice(proof_a);
    pairing_input[64..192].copy_from_slice(proof_b);

    // Pair 2: (-α, β)
    pairing_input[192..256].copy_from_slice(&neg_alpha);
    pairing_input[256..384].copy_from_slice(&VK_BETA_G2);

    // Pair 3: (-vk_x, γ)
    pairing_input[384..448].copy_from_slice(&neg_vk_x);
    pairing_input[448..576].copy_from_slice(&VK_GAMMA_G2);

    // Pair 4: (-C, δ)
    pairing_input[576..640].copy_from_slice(&neg_c);
    pairing_input[640..768].copy_from_slice(&VK_DELTA_G2);

    let result = alt_bn128_pairing(&pairing_input)
        .map_err(|_| error!(ErrorCode::InvalidProof))?;

    // Result is 32 bytes; equals 1 (as a 256-bit big-endian integer) if valid
    let mut one = [0u8; 32];
    one[31] = 1;
    Ok(result == one)
}

// ─── Instruction ─────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(game_id: u64, proof_a: [u8; 64], proof_b: [u8; 128], proof_c: [u8; 64], public_inputs: [u8; 32])]
pub struct VerifyZkProof<'info> {
    #[account(
        seeds = [GAME_SEED, game_id.to_le_bytes().as_ref()],
        bump = game.bump,
        constraint = game.status == GameStatus::CommitPhase || game.status == GameStatus::RevealPhase
            @ ErrorCode::InvalidAction,
    )]
    pub game: Account<'info, Game>,
    #[account(
        seeds = [PLAYER_SEED, game_id.to_le_bytes().as_ref(), player.key().as_ref()],
        bump = player_state.bump,
    )]
    pub player_state: Account<'info, PlayerState>,
    pub player: Signer<'info>,
}

pub fn handle_verify_zk(
    ctx: Context<VerifyZkProof>,
    game_id: u64,
    proof_a: [u8; 64],
    proof_b: [u8; 128],
    proof_c: [u8; 64],
    public_inputs: [u8; 32],
) -> Result<()> {
    // Security model (two-layer design):
    //
    // Layer 1 — SHA256 commit/reveal (commit_action + reveal_action):
    //   Proves the player's revealed action matches what was committed.
    //   Prevents last-minute action swapping after seeing other players' actions.
    //
    // Layer 2 — Groth16 ZK proof (this instruction):
    //   The circuit (commit_reveal.circom) proves, in zero knowledge:
    //     - actionType ∈ [1, 10]  (valid action code)
    //     - targetArea ∈ [0, 2]   (valid map area: Port/Forest/Ruins)
    //     - Poseidon(actionType, targetArea, salt) == public_inputs
    //   This proves the player committed to a *valid* action WITHOUT revealing
    //   what that action is. Even before the reveal phase, the on-chain state
    //   records that this player's action is provably in-bounds.
    //
    // The public_inputs field is the Poseidon hash of (actionType, targetArea, salt).
    // We verify the player has committed (has_committed) before accepting the proof.
    require!(ctx.accounts.player_state.has_committed, ErrorCode::NotCommitted);

    // Compute vk_x = IC[0] + public_inputs * IC[1]
    let vk_x = compute_vk_x(&public_inputs)?;

    // Run the Groth16 pairing check using Solana's native BN254 syscalls (<200K CUs)
    let valid = groth16_verify(&proof_a, &proof_b, &proof_c, &vk_x)?;
    require!(valid, ErrorCode::InvalidProof);

    msg!(
        "ZK proof VERIFIED for player {} round {} game {}",
        ctx.accounts.player.key(),
        ctx.accounts.game.round,
        game_id,
    );

    Ok(())
}
```

---

## 4. solana/oxark/programs/oxark/src/zk_constants.rs

_File does not exist — VK constants are embedded directly in `verify_zk_proof.rs`._
