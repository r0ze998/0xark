#!/usr/bin/env node
// T25 E2E — x402 Scout peek: HTTP-402 flow + on-chain PlayerState read
//
// Tests:
//   1. POST /scout-peek without X-Payment → 402 + X-Payment-Required header
//   2. POST /scout-peek with local-dev-bypass → 200 + card data (or 404 if no state)
//   3. POST /scout-peek with bad payment sig → 402 error
//   4. POST /scout-peek missing params → 400

import { app, fetchPlayerCards } from './agent-broker.js';

const PORT = 3403; // separate port to avoid conflicts
const BASE = `http://localhost:${PORT}`;

let server;
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

async function post(path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, headers: res.headers, json };
}

async function run() {
  console.log('\n=== T25 x402 Scout Peek E2E ===\n');
  server = app.listen(PORT);

  // ── Test 1: No payment → 402 + X-Payment-Required ────────────────────────
  console.log('[1] No payment header → 402');
  {
    const r = await post('/scout-peek', { game_id: 1, target_pubkey: 'DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R' });
    assert(r.status === 402, 'status 402');
    const spec = JSON.parse(r.headers.get('X-Payment-Required') || '{}');
    assert(spec.currency === 'SOL', 'currency SOL');
    assert(spec.amount === 5_000_000, 'amount 5_000_000 lamports');
    assert(spec.recipient === 'DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R', 'recipient correct');
    assert(r.json.error === 'Payment Required', 'error message');
  }

  // ── Test 2: Missing params → 400 (with bypass) ───────────────────────────
  console.log('\n[2] Missing params → 400');
  {
    const r = await post('/scout-peek', {}, { 'X-Payment': 'local-dev-bypass' });
    assert(r.status === 400, 'status 400 for missing params');
    assert(r.json.error?.includes('game_id'), 'mentions game_id');
  }

  // ── Test 3: Invalid target_pubkey → 400 ──────────────────────────────────
  console.log('\n[3] Invalid pubkey → 400');
  {
    const r = await post('/scout-peek', { game_id: 1, target_pubkey: 'not-a-pubkey' }, { 'X-Payment': 'local-dev-bypass' });
    assert(r.status === 400, 'status 400 for bad pubkey');
  }

  // ── Test 4: Bad signature → 402 ──────────────────────────────────────────
  console.log('\n[4] Invalid tx sig → 402');
  {
    const r = await post('/scout-peek',
      { game_id: 1, target_pubkey: 'DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R' },
      { 'X-Payment': 'badfakeSignatureXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' },
    );
    assert(r.status === 402, 'status 402 for invalid sig');
    assert(r.json.reason != null, 'has reason field');
  }

  // ── Test 5: Dev bypass with valid pubkey (may 404 if no on-chain state) ───
  console.log('\n[5] Dev bypass with known pubkey (real devnet player)');
  {
    // game_id from T24 run — just check the flow, accept 200 or 404
    const r = await post('/scout-peek',
      { game_id: 703932, target_pubkey: 'DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R' },
      { 'X-Payment': 'local-dev-bypass' },
    );
    assert(r.status === 200 || r.status === 404, `status 200 or 404 (got ${r.status})`);
    if (r.status === 200) {
      assert('timestamp' in r.json, 'has timestamp');
      assert('area' in r.json, 'has area');
      console.log('  → revealed:', r.json.revealed, 'area:', r.json.area);
    } else {
      console.log('  → PlayerState not found (game may have expired) — acceptable');
    }
  }

  // ── Test 6: Replay protection ─────────────────────────────────────────────
  console.log('\n[6] Replay protection (same sig reused)');
  {
    // local-dev-bypass is not tracked; use a fake sig that gets "not found" before replay check
    // Just verify the logic path: second use of a real sig would be blocked
    // We can't easily test with a real tx in unit test, so verify bypass ignores replay
    const r1 = await post('/scout-peek',
      { game_id: 1, target_pubkey: 'DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R' },
      { 'X-Payment': 'local-dev-bypass' },
    );
    const r2 = await post('/scout-peek',
      { game_id: 1, target_pubkey: 'DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R' },
      { 'X-Payment': 'local-dev-bypass' },
    );
    // bypass always passes; result depends on state, not replay
    assert(r1.status !== 402 || r2.status !== 402, 'bypass not blocked by replay logic');
  }

  server.close();

  console.log(`\n=== T25 RESULTS: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    console.log('[FAIL]');
    process.exit(1);
  } else {
    console.log('[PASS] x402 Scout Peek E2E ✓');
  }
}

run().catch(e => {
  console.error('\n[ERROR]', e.message);
  server?.close();
  process.exit(1);
});
