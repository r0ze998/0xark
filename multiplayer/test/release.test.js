import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { paymentIdentityError } from '../payment-identity.js';
import { consumePayment, _test } from '../redis-store.js';

test('payment proofs must be successful, recent and signed by the claimed payer', () => {
  const now = 1_000_000;
  const tx = { meta: { err: null }, blockTime: now / 1000,
    transaction: { message: { accountKeys: ['payer'], header: { numRequiredSignatures: 1 } } } };
  assert.equal(paymentIdentityError(tx, 'payer', now), null);
  assert.match(paymentIdentityError(tx, 'someone-else', now), /payer/);
  assert.match(paymentIdentityError({ ...tx, meta: { err: {} } }, 'payer', now), /failed/);
  assert.match(paymentIdentityError({ ...tx, blockTime: 0 }, 'payer', now), /expired/);
  assert.match(paymentIdentityError({ ...tx, blockTime: null }, 'payer', now), /timestamp/);
});

test('concurrent replay consumption accepts one proof and fails closed outside development', async () => {
  const original = process.env.NODE_ENV;
  const redis = process.env.REDIS_URL;
  delete process.env.REDIS_URL;
  try {
    process.env.NODE_ENV = 'development';
    _test._memSigs.clear(); _test._memNonces.clear();
    assert.deepEqual(await Promise.all([consumePayment('sig', 'nonce', '/x402/co'), consumePayment('sig', 'nonce', '/x402/co')]), [true, false]);
    assert.equal(await consumePayment('other-sig', 'nonce', '/x402/co'), false);
    process.env.NODE_ENV = 'production';
    await assert.rejects(consumePayment('new', 'new', '/x402/co'), /unavailable/);
  } finally {
    if (original === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = original;
    if (redis === undefined) delete process.env.REDIS_URL; else process.env.REDIS_URL = redis;
  }
});

test('real HTTP server exposes browser-readable quotes and refuses undeliverable services before payment', async t => {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, NODE_ENV: 'production', PORT: '0',
      TREASURY_PUBKEY: 'GN3aBaUFPpejXBy2u4SgXuwQkkqRFauqAfXNsXhTPz4f',
      SOLANA_RPC_URL: 'http://127.0.0.1:1', REDIS_URL: 'redis://127.0.0.1:1', ANTHROPIC_API_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => child.kill());
  let output = '';
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Server startup timeout: ${output}`)), 10_000);
    child.stdout.on('data', data => {
      output += data;
      const match = output.match(/listening on (\d+)/);
      if (match) { clearTimeout(timeout); resolve(match[1]); }
    });
    child.stderr.on('data', data => { output += data; });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${output}`)); });
  });
  const base = `http://127.0.0.1:${port}`;
  const health = await (await fetch(`${base}/health`)).json();
  assert.equal(health.mode, 'production');
  assert.equal(health.rpc, undefined, 'private RPC URLs must not be exposed');
  const options = await fetch(`${base}/x402/co`, { method: 'OPTIONS' });
  assert.match(options.headers.get('access-control-allow-headers'), /X-Payment/);
  const quote = await fetch(`${base}/x402/co`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerPubkey: 'payer' }) });
  assert.equal(quote.status, 402);
  assert.match(quote.headers.get('access-control-expose-headers'), /PAYMENT-REQUIRED/);
  assert.ok(quote.headers.get('payment-required'));
  for (const path of ['/x402/scout-peek', '/x402/ai-strategy-advice', '/x402/draw-extra']) {
    const response = await fetch(`${base}${path}`, { method: 'POST' });
    assert.equal(response.status, 503, path);
    assert.equal(response.headers.get('payment-required'), null);
  }
  child.kill();
  await once(child, 'exit');
});
