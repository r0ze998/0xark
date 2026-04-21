/**
 * 0xARK Multiplayer WebSocket Stress Test
 *
 * Spawns N clients, creates 1 room, joins all others, moves randomly,
 * then measures throughput and latency.
 *
 * Usage: node test/stress-test.js [N=10]
 * Requires server running on localhost:3500
 */

import WebSocket from 'ws';

const URL   = process.env.WS_URL || 'ws://localhost:3500';
const N     = parseInt(process.argv[2] ?? '10', 10);
const MOVES = 50; // moves per client

let roomId   = null;
let joined   = 0;
let errors   = 0;
let moved    = 0;
const latencies = [];

/** Open a WS connection; resolves with ws once 'open' fires. */
function openWS(clientIdx) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(URL);
    ws.on('open', () => resolve(ws));
    ws.on('error', (e) => { errors++; reject(e); });
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'room_joined') joined++;
      if (msg.type === 'error') { errors++; console.error(`[c${clientIdx}] ${msg.message}`); }
    });
  });
}

/** Send random moves, return when done. */
async function doMoves(ws) {
  for (let i = 0; i < MOVES; i++) {
    const t0 = Date.now();
    ws.send(JSON.stringify({
      type: 'move',
      x: Math.floor(Math.random() * 80),
      y: Math.floor(Math.random() * 80),
      area: 0,
    }));
    latencies.push(Date.now() - t0);
    moved++;
    // Minimal stagger to avoid overwhelming the event loop
    if (i % 10 === 9) await new Promise(r => setImmediate(r));
  }
}

async function run() {
  console.log(`\n0xARK WS Stress Test — ${N} clients, ${MOVES} moves each\n`);

  try {
    const res = await fetch('http://localhost:3500/health');
    const json = await res.json();
    console.log('Server health:', JSON.stringify(json));
  } catch {
    console.log('Health endpoint not available — continuing');
  }

  const t0 = Date.now();

  // Host: create room
  const host = await openWS(0).catch(e => { console.error('Host failed:', e.message); process.exit(1); });
  await new Promise((resolve) => {
    host.on('message', function once(data) {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'room_created') {
        roomId = msg.roomId;
        host.removeListener('message', once);
        resolve();
      }
    });
    host.send(JSON.stringify({
      type: 'create_room',
      gameId: 'stress-test',
      name: 'Bot-0',
      clan: 'black_flag',
      card_count: 0,
      season: 1,
    }));
  });
  console.log(`Room created: ${roomId}`);

  // Join phase
  const clients = [host];
  const joinWaits = [];
  for (let i = 1; i < N; i++) {
    const idx = i;
    const ws = await openWS(idx).catch(() => null);
    if (!ws) continue;
    clients.push(ws);
    const joinDone = new Promise(r => {
      ws.on('message', function once(data) {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'room_joined') { ws.removeListener('message', once); r(); }
      });
    });
    ws.send(JSON.stringify({
      type: 'join_room',
      roomId,
      name: `Bot-${idx}`,
      clan: ['black_flag','hollow_blade','iron_circle'][idx % 3],
      card_count: idx % 20,
      season: 1,
    }));
    joinWaits.push(joinDone);
  }
  await Promise.all(joinWaits);
  console.log(`Joined: ${joined}/${N - 1} clients`);

  // Move phase — all clients move in parallel
  await Promise.all(clients.map(ws => doMoves(ws)));

  const elapsed = Date.now() - t0;

  // Teardown
  clients.forEach(ws => ws.close());

  // Report
  const throughput = Math.round(moved / (elapsed / 1000));
  const avgLat = latencies.length
    ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)
    : 'N/A';

  console.log('\n─── Results ─────────────────────────────────────');
  console.log(`Clients      : ${N}`);
  console.log(`Moves sent   : ${moved}`);
  console.log(`Errors       : ${errors}`);
  console.log(`Elapsed      : ${elapsed}ms`);
  console.log(`Throughput   : ~${throughput} msgs/s`);
  console.log(`Avg send lat : ${avgLat}ms`);
  console.log('─────────────────────────────────────────────────\n');

  return { N, moved, errors, elapsed, throughput };
}

run().catch(e => { console.error(e); process.exit(1); });
