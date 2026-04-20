/**
 * MagicBlock ER Connectivity + Latency Test (T5)
 *
 * Tests Magic Router reachability and measures blockhash fetch latency
 * vs the Solana devnet base layer.
 *
 * Run: node tests/magicblock-connectivity.test.js
 *
 * Note: Full commit-reveal round-trip latency savings (10-50ms vs 400ms)
 * are only measurable with delegated accounts + live ER session.
 * That requires Phase C Day 2 Rust changes (#[ephemeral] macro,
 * delegate_session/undelegate_session instructions).
 */
'use strict';

const MB_ROUTER_ENDPOINT = 'https://devnet-router.magicblock.app';
const DEVNET_RPC = 'https://api.devnet.solana.com';

let passed = 0, failed = 0;

function test(name, fn) {
  return fn().then(() => {
    console.log(`  ✓ ${name}`);
    passed++;
  }).catch(e => {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  });
}

async function jsonRpc(url, method, params = []) {
  const t0 = Date.now();
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const ms = Date.now() - t0;
  const json = await r.json();
  return { ms, json };
}

(async () => {
  console.log('\n=== MagicBlock Connectivity + Latency (T5) ===\n');

  let mbLatency = 0;
  let baseLatency = 0;

  await test('Magic Router responds to getLatestBlockhash', async () => {
    const { ms, json } = await jsonRpc(MB_ROUTER_ENDPOINT, 'getLatestBlockhash');
    mbLatency = ms;
    const bh = json?.result?.value?.blockhash;
    if (!bh || bh.length < 32) throw new Error('No blockhash in response: ' + JSON.stringify(json));
  });

  await test('Devnet RPC responds to getLatestBlockhash', async () => {
    const { ms, json } = await jsonRpc(DEVNET_RPC, 'getLatestBlockhash');
    baseLatency = ms;
    const bh = json?.result?.value?.blockhash;
    if (!bh || bh.length < 32) throw new Error('No blockhash in response: ' + JSON.stringify(json));
  });

  await test('Magic Router endpoint is a valid URL', async () => {
    const url = new URL(MB_ROUTER_ENDPOINT);
    if (url.protocol !== 'https:') throw new Error('Expected https, got ' + url.protocol);
  });

  await test('Magic Router latency is within 3x of base layer (routing overhead acceptable)', async () => {
    if (mbLatency === 0 || baseLatency === 0) return; // skip if earlier tests failed
    const ratio = mbLatency / baseLatency;
    if (ratio > 3.0) throw new Error(`Router ${mbLatency}ms is >3x base ${baseLatency}ms (ratio: ${ratio.toFixed(2)})`);
  });

  console.log('\n--- Latency Summary ---');
  console.log(`  Magic Router (getLatestBlockhash): ${mbLatency}ms`);
  console.log(`  Devnet RPC   (getLatestBlockhash): ${baseLatency}ms`);
  console.log(`  Overhead: ${mbLatency - baseLatency}ms`);
  console.log('\n  Full ER latency savings (10-50ms commit-confirm vs ~400ms base):');
  console.log('  measurable only after Phase C Day 2 Rust delegation changes.\n');

  console.log('─'.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
