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
