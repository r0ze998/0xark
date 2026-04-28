// ─── T83: ZK Card Commit Module (Axis C) ─────────────────────────────────────
// Implements the 2-phase bluff battle:
//   1. COMMIT: player picks a card, browser generates SHA-256 commitment
//   2. REVEAL: browser proves knowledge of (card_id, salt) → on-chain verify
//
// The card_commit.circom Groth16 circuit is ready for Mainnet v1.
// MVP uses SHA-256 (matches on-chain reveal_card instruction).

'use strict';

window.zkCardCommit = (function() {

  // Generate a cryptographically random 32-byte salt.
  function generateSalt() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    // Clamp to 253 bits (Poseidon field size) — zero top 3 bits
    arr[0] &= 0x1f;
    return arr;
  }

  // Compute SHA-256(card_id | salt) as a 32-byte commitment.
  // Matches the on-chain reveal_card verification.
  async function computeCommitment(cardId, salt) {
    const data = new Uint8Array(33);
    data[0] = cardId & 0xff;
    data.set(salt, 1);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuf);
  }

  // Commit phase: pick a card, generate salt, compute commitment.
  // Returns { cardId, salt, commitment } — store salt privately.
  async function commitCard(cardId) {
    if (cardId < 1 || cardId > 60) throw new Error('Invalid card_id: ' + cardId);
    const salt = generateSalt();
    const commitment = await computeCommitment(cardId, salt);
    return { cardId, salt, commitment };
  }

  // Reveal phase: verify locally that commitment matches, then return
  // the data needed for the reveal_card on-chain instruction.
  // Returns { cardId, salt, commitment, verified: true } or throws.
  async function verifyAndReveal(cardId, salt, storedCommitment) {
    const computed = await computeCommitment(cardId, salt);
    // Constant-time comparison
    if (computed.length !== storedCommitment.length) throw new Error('Commitment length mismatch');
    let diff = 0;
    for (let i = 0; i < computed.length; i++) diff |= computed[i] ^ storedCommitment[i];
    if (diff !== 0) throw new Error('Commitment mismatch — wrong card_id or salt');
    return { cardId, salt: Array.from(salt), commitment: Array.from(storedCommitment), verified: true };
  }

  // Full ZK proof via card_commit.circom (Mainnet v1 path).
  // Requires snarkjs + wasm artifact. Falls back gracefully if unavailable.
  async function proveCardCommit(cardId, salt) {
    const WASM = 'card_commit.wasm';
    const ZKEY = 'card_commit_final.zkey';
    if (typeof snarkjs !== 'undefined' || (typeof Worker !== 'undefined')) {
      try {
        const saltBig = BigInt('0x' + Array.from(salt).map(b=>b.toString(16).padStart(2,'0')).join(''));
        const input = { card_id: cardId.toString(), salt: saltBig.toString() };
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM, ZKEY);
        return { proof, publicSignals, ok: true };
      } catch (e) {
        console.warn('[zkCard] Groth16 prove failed (artifacts missing?) — SHA-256 mode active:', e.message);
      }
    }
    // Fallback: no ZK proof, use SHA-256 commitment (hackathon MVP)
    return { proof: null, publicSignals: null, ok: false, fallback: 'sha256' };
  }

  return { commitCard, verifyAndReveal, proveCardCommit, generateSalt, computeCommitment };

})();
