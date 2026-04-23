// ─── ZK Dungeon Position Module ──────────────────────────────────────────────
// T48: browser-side ZK proof generation for dungeon position commitment.
//
// Two on-chain instructions are backed by this module:
//   init_position      — one-time commitment setup after join_game
//   verify_dungeon_move — proves valid move from committed old pos to new pos
//
// Commitment scheme:
//   commitment = Poseidon(x, y, area, salt)   (BN254 field, 32 bytes big-endian)
//
// The dungeon_position Groth16 circuit proves:
//   public:  [old_commitment, new_commitment]
//   private: old_x, old_y, old_area, old_salt, new_x, new_y, new_area, new_salt
//   constraints: |dx|+|dy| == 1 (valid move), commitments consistent
//
// Artifacts required in the page root:
//   dungeon_position.wasm
//   dungeon_position_final.zkey
//   dungeon_position_vk.json
//
// If artifacts are missing, init_position still works (commitment only).
// verify_dungeon_move skips the ZK proof step and logs a warning.

'use strict';

window.zkDungeon = (function() {

  // ── State ────────────────────────────────────────────────────────────────────
  // Persisted in memory for the session. Cleared on page reload.
  // Structure: { x, y, area, salt, commitment: Uint8Array(32) }
  let _currentPos  = null;
  let _artifactsOk = false;  // true once wasm+zkey loaded
  let _vk          = null;

  const WASM_PATH = 'dungeon_position.wasm';
  const ZKEY_PATH = 'dungeon_position_final.zkey';
  const VK_PATH   = 'dungeon_position_vk.json';
  const WORKER_PATH = 'prover-worker.js';

  // WebWorker for off-main-thread proof generation
  let _worker = null;
  let _workerReady = false;
  let _workerPending = {}; // id → {resolve, reject}
  let _workerNextId = 1;

  function _getWorker() {
    if (_worker) return _worker;
    try {
      _worker = new Worker(WORKER_PATH);
      _worker.onmessage = function(e) {
        const msg = e.data;
        if (msg.type === 'ready') { _workerReady = true; return; }
        if (msg.type === 'pong')  { _workerReady = msg.snarkjsReady; return; }
        if (msg.id && _workerPending[msg.id]) {
          const { resolve, reject } = _workerPending[msg.id];
          delete _workerPending[msg.id];
          if (msg.type === 'proof')  resolve({ proof: msg.proof, publicSignals: msg.publicSignals });
          else if (msg.type === 'error') reject(new Error(msg.message));
        }
      };
      _worker.onerror = function(e) {
        console.warn('[ZK Worker] Error:', e.message);
        _workerReady = false;
      };
      // Init: pass snarkjs path — assumes snarkjs.min.js is at page root
      _worker.postMessage({ type: 'init', snarkjsPath: 'snarkjs.min.js' });
    } catch (e) {
      console.warn('[ZK Worker] Could not create worker:', e.message);
      _worker = null;
    }
    return _worker;
  }

  function _proveInWorker(input, wasmPath, zkeyPath) {
    return new Promise((resolve, reject) => {
      const w = _getWorker();
      if (!w) { reject(new Error('Worker unavailable')); return; }
      const id = _workerNextId++;
      _workerPending[id] = { resolve, reject };
      // timeout 90s for large circuits
      const timer = setTimeout(() => {
        if (_workerPending[id]) {
          delete _workerPending[id];
          reject(new Error('Proof generation timed out'));
        }
      }, 90000);
      const orig_resolve = resolve;
      _workerPending[id] = {
        resolve: (v) => { clearTimeout(timer); orig_resolve(v); },
        reject:  (e) => { clearTimeout(timer); reject(e); },
      };
      w.postMessage({ id, type: 'prove', input, wasmPath, zkeyPath });
    });
  }

  // Anchor discriminators (sha256("global:<name>")[0..8])
  function _disc(name) {
    // Browser environment: use snarkjs utils or fallback to sjcl/subtle
    // We compute during build using the same formula as on-chain.
    // Pre-computed values for the two instructions:
    const known = {
      init_position:       [0xfc, 0x28, 0x2a, 0x65, 0x97, 0xf4, 0x72, 0xa0],
      verify_dungeon_move: [0x3b, 0x14, 0x9f, 0xc2, 0x7e, 0x81, 0xd4, 0x7f],
    };
    if (known[name]) return new Uint8Array(known[name]);
    throw new Error(`zkDungeon: unknown discriminator for '${name}'`);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  // Generate a cryptographically random 254-bit field element (fits BN254 scalar)
  function _randomSalt() {
    const raw = new Uint8Array(32);
    crypto.getRandomValues(raw);
    raw[0] &= 0x1f; // clear top 3 bits → value < 2^253 < BN254 order
    return raw;
  }

  // Uint8Array(32) → BigInt (big-endian)
  function _bytesToBigInt(b) {
    let n = 0n;
    for (const byte of b) n = (n << 8n) | BigInt(byte);
    return n;
  }

  // BigInt → Uint8Array(32) big-endian
  function _bigIntToBytes32(n) {
    const b = new Uint8Array(32);
    for (let i = 31; i >= 0; i--) {
      b[i] = Number(n & 0xffn);
      n >>= 8n;
    }
    return b;
  }

  // Compute Poseidon(x, y, area, salt) using snarkjs poseidon if available.
  // Returns Uint8Array(32) big-endian field element, or null on failure.
  async function _poseidonHash(x, y, area, saltBytes) {
    if (typeof snarkjs === 'undefined') {
      console.warn('[zkDungeon] snarkjs not loaded — cannot compute Poseidon hash');
      return null;
    }
    try {
      const salt = _bytesToBigInt(saltBytes);
      const hash = await snarkjs.poseidon([BigInt(x), BigInt(y), BigInt(area), salt]);
      return _bigIntToBytes32(hash);
    } catch (e) {
      console.error('[zkDungeon] Poseidon hash error:', e);
      return null;
    }
  }

  // Check whether dungeon_position circuit artifacts are accessible.
  async function _checkArtifacts() {
    if (_artifactsOk) return true;
    try {
      const [w, z, v] = await Promise.all([
        fetch(WASM_PATH, { method: 'HEAD' }),
        fetch(ZKEY_PATH, { method: 'HEAD' }),
        fetch(VK_PATH,   { method: 'HEAD' }),
      ]);
      _artifactsOk = w.ok && z.ok && v.ok;
      if (_artifactsOk) {
        const vkResp = await fetch(VK_PATH);
        _vk = await vkResp.json();
      }
    } catch (_) {
      _artifactsOk = false;
    }
    return _artifactsOk;
  }

  // Encode a Groth16 proof (snarkjs format) as flat bytes for the on-chain IX.
  // Layout: pi_a(64) + pi_b(128) + pi_c(64) + pub_old(32) + pub_new(32) = 320 bytes
  function _encodeProofBytes(proof, publicSignals) {
    // snarkjs returns decimal string field elements and [x0,x1] pairs for G2
    const dec = s => _bigIntToBytes32(BigInt(s));
    const g1  = (x, y) => { const b = new Uint8Array(64); b.set(dec(x)); b.set(dec(y), 32); return b; };
    const g2  = (arr) => {
      // EIP-197 order for on-chain: x1||x0||y1||y0
      const b = new Uint8Array(128);
      b.set(dec(arr[0][1]), 0);   // x1
      b.set(dec(arr[0][0]), 32);  // x0
      b.set(dec(arr[1][1]), 64);  // y1
      b.set(dec(arr[1][0]), 96);  // y0
      return b;
    };

    const piA = g1(proof.pi_a[0], proof.pi_a[1]);
    const piB = g2(proof.pi_b);
    const piC = g1(proof.pi_c[0], proof.pi_c[1]);
    const pubOld = dec(publicSignals[0]);
    const pubNew = dec(publicSignals[1]);

    const out = new Uint8Array(320);
    out.set(piA,   0);
    out.set(piB,  64);
    out.set(piC, 192);
    out.set(pubOld, 256);
    out.set(pubNew, 288);
    return out;
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * initPosition(gameId, x, y, area)
   *
   * Generates a fresh Poseidon commitment for (x, y, area, salt) and
   * calls the on-chain init_position instruction.
   *
   * Stores the position secret in memory for later verify_dungeon_move calls.
   *
   * @param {number|bigint} gameId
   * @param {number} x
   * @param {number} y
   * @param {number} area
   * @returns {Promise<{ok: boolean, commitment: Uint8Array|null, sig: string|null, error: string|null}>}
   */
  async function initPosition(gameId, x, y, area) {
    const logLines = typeof window.logOnchain === 'function' ? window.logOnchain : console.log;

    const salt = _randomSalt();
    const commitment = await _poseidonHash(x, y, area, salt);
    if (!commitment) {
      return { ok: false, commitment: null, sig: null, error: 'Poseidon unavailable — is snarkjs loaded?' };
    }

    _currentPos = { x, y, area, salt, commitment };
    logLines('[ZK] Position commitment computed (' + commitment.slice(0, 4).join(',') + '...)');

    // Call init_position on-chain via window.oxarkOnchain if available
    if (!window.oxarkOnchain || !window.oxarkOnchain.sendInstruction) {
      logLines('[ZK] oxarkOnchain not ready — commitment stored locally only');
      return { ok: true, commitment, sig: null, error: null };
    }

    try {
      const sig = await window.oxarkOnchain.initPositionIx(BigInt(gameId), commitment);
      logLines('[ZK] init_position ✓ sig=' + sig.slice(0, 12) + '..');
      return { ok: true, commitment, sig, error: null };
    } catch (e) {
      const msg = (e.message || String(e)).slice(0, 60);
      logLines('[ZK] init_position error: ' + msg);
      return { ok: false, commitment, sig: null, error: msg };
    }
  }

  /**
   * verifyDungeonMove(gameId, newX, newY, newArea)
   *
   * Generates a Groth16 proof that the move from _currentPos to (newX, newY, newArea)
   * is valid (Manhattan distance == 1), then calls verify_dungeon_move on-chain.
   *
   * If circuit artifacts are not loaded, submits the new commitment without proof
   * (server will accept during grace period / devnet).
   *
   * @returns {Promise<{ok: boolean, sig: string|null, error: string|null}>}
   */
  async function verifyDungeonMove(gameId, newX, newY, newArea) {
    const logLines = typeof window.logOnchain === 'function' ? window.logOnchain : console.log;

    if (!_currentPos) {
      return { ok: false, sig: null, error: 'No position initialized — call initPosition first' };
    }

    const { x: oldX, y: oldY, area: oldArea, salt: oldSalt, commitment: oldCommitment } = _currentPos;

    // Validate move (Manhattan distance == 1 on same area, or area transition)
    const dx = Math.abs(newX - oldX);
    const dy = Math.abs(newY - oldY);
    const sameArea = newArea === oldArea;
    if (sameArea && dx + dy !== 1) {
      return { ok: false, sig: null, error: `Invalid move: dx=${dx} dy=${dy} (must be Manhattan dist 1)` };
    }

    const newSalt = _randomSalt();
    const newCommitment = await _poseidonHash(newX, newY, newArea, newSalt);
    if (!newCommitment) {
      return { ok: false, sig: null, error: 'Poseidon unavailable' };
    }

    let proofBytes = null;
    const hasArtifacts = await _checkArtifacts();
    if (hasArtifacts && typeof snarkjs !== 'undefined') {
      try {
        logLines('[ZK] Generating dungeon move proof...');
        const input = {
          old_x:    String(oldX),
          old_y:    String(oldY),
          old_area: String(oldArea),
          old_salt: String(_bytesToBigInt(oldSalt)),
          new_x:    String(newX),
          new_y:    String(newY),
          new_area: String(newArea),
          new_salt: String(_bytesToBigInt(newSalt)),
        };
        let proof, publicSignals;
        try {
          ({ proof, publicSignals } = await _proveInWorker(input, WASM_PATH, ZKEY_PATH));
          logLines('[ZK] Proof generated via Worker ✓');
        } catch (_workerErr) {
          logLines('[ZK] Worker failed, falling back to main thread: ' + _workerErr.message);
          ({ proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM_PATH, ZKEY_PATH));
          logLines('[ZK] Proof generated (main thread) ✓');
        }
        proofBytes = _encodeProofBytes(proof, publicSignals);
        logLines('[ZK] Proof encoded ✓ (pi_a=' + proof.pi_a[0].slice(0, 8) + '..)');
      } catch (e) {
        logLines('[ZK] Proof generation failed: ' + (e.message || '').slice(0, 40));
        // Fall through — submit without proof (devnet tolerance)
      }
    } else {
      logLines('[ZK] Dungeon position circuit not loaded — submitting commitment only');
    }

    // Update local state
    _currentPos = { x: newX, y: newY, area: newArea, salt: newSalt, commitment: newCommitment };

    if (!window.oxarkOnchain || !window.oxarkOnchain.verifyDungeonMoveIx) {
      logLines('[ZK] oxarkOnchain not ready — position updated locally only');
      return { ok: true, sig: null, error: null };
    }

    try {
      const sig = await window.oxarkOnchain.verifyDungeonMoveIx(
        BigInt(gameId), oldCommitment, newCommitment, proofBytes
      );
      logLines('[ZK] verify_dungeon_move ✓ sig=' + sig.slice(0, 12) + '..');
      return { ok: true, sig, error: null };
    } catch (e) {
      const msg = (e.message || String(e)).slice(0, 60);
      logLines('[ZK] verify_dungeon_move error: ' + msg);
      return { ok: false, sig: null, error: msg };
    }
  }

  /**
   * currentPosition()
   * Returns { x, y, area } of the last initialized/updated position, or null.
   */
  function currentPosition() {
    if (!_currentPos) return null;
    return { x: _currentPos.x, y: _currentPos.y, area: _currentPos.area };
  }

  /**
   * currentCommitment()
   * Returns the raw Uint8Array(32) Poseidon commitment, or null.
   */
  function currentCommitment() {
    return _currentPos ? _currentPos.commitment : null;
  }

  return { initPosition, verifyDungeonMove, currentPosition, currentCommitment, _proveInWorker };

})();

// ─── T83: ZK Card Commit Module (Axis C) ─────────────────────────────────────
// Implements the 2-phase bluff battle:
//   1. COMMIT: player picks a card, browser generates SHA-256 commitment
//   2. REVEAL: browser proves knowledge of (card_id, salt) → on-chain verify
//
// The card_commit.circom Groth16 circuit is ready for Mainnet v1.
// MVP uses SHA-256 (matches on-chain reveal_card instruction).

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
        let proof, publicSignals;
        // Try worker first, fall back to main thread
        if (window.zkDungeon && typeof window.zkDungeon._proveInWorker === 'function') {
          ({ proof, publicSignals } = await window.zkDungeon._proveInWorker(input, WASM, ZKEY));
        } else {
          ({ proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM, ZKEY));
        }
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
