#!/usr/bin/env node
/**
 * T43 E2E — x402 Agent Hire flow
 *
 * Tests:
 *   1. register_agent (create AgentListing PDA)
 *   2. POST /agent-hire with dev bypass → hire session details
 *   3. register_agent_hire instruction (on-chain AgentHireSession PDA)
 *   4. Verify AgentHireSession PDA: active==true, expires_at > now
 *
 * Usage: node tests/t43-agent-hire-e2e.js
 * Requires: devnet SOL, agent-broker running (or bypass mode)
 */

const web3 = require('../../../multiplayer/node_modules/@solana/web3.js');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');

// ─── Config ──────────────────────────────────────────────────────────────────
const PROGRAM_ID     = new web3.PublicKey('5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN');
const DEVNET_RPC     = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const BROKER_URL     = process.env.BROKER_URL     || 'http://localhost:3402';
const AGENT_ID       = 43;  // test agent ID for T43
const DURATION_SEC   = 3600; // 1 hour

// ─── Keypair ─────────────────────────────────────────────────────────────────
const keypairPath = `${process.env.HOME}/.config/solana/id.json`;
const keypairRaw  = JSON.parse(fs.readFileSync(keypairPath));
const payer       = web3.Keypair.fromSecretKey(Uint8Array.from(keypairRaw));
const conn        = new web3.Connection(DEVNET_RPC, 'confirmed');

console.log('=== T43 Agent Hire E2E ===');
console.log('Payer:', payer.publicKey.toBase58());
console.log('Program:', PROGRAM_ID.toBase58());
console.log('Broker:', BROKER_URL);
console.log('');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function disc(name) {
  return crypto.createHash('sha256').update(`global:${name}`).digest().slice(0, 8);
}
function u32LE(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n, 0); return b; }
function i64LE(n) { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(n), 0); return b; }

function findPDA(seeds) {
  return web3.PublicKey.findProgramAddressSync(seeds, PROGRAM_ID);
}

async function sendIx(label, ixData, keys) {
  const ix = new web3.TransactionInstruction({ programId: PROGRAM_ID, keys, data: ixData });
  const tx = new web3.Transaction();
  tx.add(ix);
  const bh = await conn.getLatestBlockhash('confirmed');
  tx.recentBlockhash = bh.blockhash;
  tx.feePayer = payer.publicKey;
  tx.sign(payer);
  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  await conn.confirmTransaction({ signature: sig, ...bh }, 'confirmed');
  console.log(`  [${label}] ✅ sig=${sig.slice(0, 20)}...`);
  return sig;
}

async function postJson(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(BROKER_URL + path);
    const opts = {
      hostname: url.hostname,
      port: url.port || 3402,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers,
      },
    };
    const req = http.request(opts, (res) => {
      let chunks = '';
      res.on('data', d => { chunks += d; });
      res.on('end', () => {
        const parsed = JSON.parse(chunks);
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

let passed = 0;
let failed = 0;
function assert(label, cond, detail = '') {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else { console.error(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    // ── Step 1: register_agent ───────────────────────────────────────────────
    console.log('\n[1] register_agent (AgentListing PDA)');
    const [agentPda, agentBump] = findPDA([Buffer.from('agent'), u32LE(AGENT_ID)]);

    // Check if already registered (idempotent: skip if account exists)
    const existingAgent = await conn.getAccountInfo(agentPda, 'confirmed');
    if (!existingAgent) {
      const nameHash     = crypto.createHash('sha256').update('TestAgent-T43').digest();
      const stratHash    = crypto.createHash('sha256').update('random-strategy-v1').digest();
      const endpointHash = crypto.createHash('sha256').update(BROKER_URL).digest();
      const pricePerQry  = 1_000_000n; // 0.001 SOL in lamports

      // register_agent instruction layout:
      //   discriminator[8] + agent_id(u32)[4] + name_hash[32] + strategy_hash[32] + endpoint_hash[32] + price_per_query(u64)[8]
      const ixData = Buffer.concat([
        disc('register_agent'),
        u32LE(AGENT_ID),
        Buffer.from(nameHash),
        Buffer.from(stratHash),
        Buffer.from(endpointHash),
        (() => { const b = Buffer.alloc(8); b.writeBigUInt64LE(pricePerQry, 0); return b; })(),
      ]);

      await sendIx('register_agent', ixData, [
        { pubkey: agentPda,             isSigner: false, isWritable: true  },
        { pubkey: payer.publicKey,      isSigner: true,  isWritable: true  },
        { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
      ]);
    } else {
      console.log('  [register_agent] already registered — skipping');
    }

    // Verify AgentListing exists
    const agentInfo = await conn.getAccountInfo(agentPda, 'confirmed');
    assert('AgentListing PDA exists', agentInfo !== null);
    assert('AgentListing owned by program', agentInfo?.owner.equals(PROGRAM_ID));

    // active flag offset: disc[8]+agent_id[4]+owner[32]+name_hash[32]+strategy_hash[32]+endpoint_hash[32]
    //                    +price_per_query[8]+total_queries[8]+total_revenue[8]+rating[2] = 166
    const AGENT_ACTIVE_OFFSET = 8 + 4 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 2;
    assert('AgentListing.active == true', agentInfo?.data[AGENT_ACTIVE_OFFSET] === 1,
      `byte at ${AGENT_ACTIVE_OFFSET} = ${agentInfo?.data[AGENT_ACTIVE_OFFSET]}`);

    // ── Step 2: POST /agent-hire (dev bypass) ────────────────────────────────
    console.log('\n[2] POST /agent-hire (dev bypass)');
    const hireBody = {
      agent_id: AGENT_ID,
      game_id: 0,
      duration_seconds: DURATION_SEC,
      hirer_pubkey: payer.publicKey.toBase58(),
    };

    const hireResp = await postJson('/agent-hire', hireBody, { 'X-Payment': 'local-dev-bypass' });
    assert('HTTP 200 from /agent-hire', hireResp.status === 200,
      `got ${hireResp.status}: ${JSON.stringify(hireResp.body).slice(0, 80)}`);

    const session = hireResp.body;
    assert('hire_session_id present', typeof session.hire_session_id === 'string');
    assert('agent_id matches', session.agent_id === AGENT_ID);
    assert('expires_at > now', session.expires_at > Math.floor(Date.now() / 1000));
    assert('payment_sig present', typeof session.payment_sig === 'string');

    console.log('  hire_session_id:', session.hire_session_id);
    console.log('  expires_at:', new Date(session.expires_at * 1000).toISOString());

    // ── Step 3: register_agent_hire (on-chain AgentHireSession PDA) ──────────
    console.log('\n[3] register_agent_hire (AgentHireSession PDA)');

    const [hirePda, hireBump] = findPDA([
      Buffer.from('agent_hire'),
      payer.publicKey.toBuffer(),
      u32LE(AGENT_ID),
    ]);

    const existingHire = await conn.getAccountInfo(hirePda, 'confirmed');
    let hireCreated = false;
    if (!existingHire) {
      // payment_tx_lo/hi: first/last 32 bytes of a dummy dev-bypass sig (zeroes)
      const paymentTxLo = Buffer.alloc(32, 0);
      const paymentTxHi = Buffer.alloc(32, 0);

      // register_agent_hire layout:
      //   disc[8] + agent_id(u32)[4] + duration_seconds(i64)[8] + payment_tx_lo[32] + payment_tx_hi[32]
      const ixData = Buffer.concat([
        disc('register_agent_hire'),
        u32LE(AGENT_ID),
        i64LE(DURATION_SEC),
        paymentTxLo,
        paymentTxHi,
      ]);

      await sendIx('register_agent_hire', ixData, [
        { pubkey: hirePda,       isSigner: false, isWritable: true  },
        { pubkey: agentPda,      isSigner: false, isWritable: false },
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: web3.SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
      ]);
      hireCreated = true;
    } else {
      console.log('  [register_agent_hire] session already exists — reading');
    }

    // ── Step 4: Verify AgentHireSession PDA ─────────────────────────────────
    console.log('\n[4] Verify AgentHireSession PDA');
    const hireInfo = await conn.getAccountInfo(hirePda, 'confirmed');
    assert('AgentHireSession PDA exists', hireInfo !== null);
    assert('AgentHireSession owned by program', hireInfo?.owner.equals(PROGRAM_ID));

    if (hireInfo) {
      const d = hireInfo.data;
      // Layout: disc[8] + hirer[32] + agent_owner[32] + agent_id(u32)[4] +
      //         started_at(i64)[8] + expires_at(i64)[8] + tx_lo[32] + tx_hi[32] + active[1] + bump[1]
      const EXPIRES_AT_OFFSET = 8 + 32 + 32 + 4 + 8;
      const ACTIVE_OFFSET     = 8 + 32 + 32 + 4 + 8 + 8 + 32 + 32;
      const agentIdOffset     = 8 + 32 + 32;

      const storedAgentId = d.readUInt32LE(agentIdOffset);
      const expiresAt     = Number(d.readBigInt64LE(EXPIRES_AT_OFFSET));
      const isActive      = d[ACTIVE_OFFSET] === 1;
      const nowTs         = Math.floor(Date.now() / 1000);

      assert('AgentHireSession.agent_id == AGENT_ID', storedAgentId === AGENT_ID,
        `stored=${storedAgentId}`);
      assert('AgentHireSession.expires_at > now', expiresAt > nowTs,
        `expires_at=${expiresAt} now=${nowTs}`);
      assert('AgentHireSession.active == true', isActive);

      if (hireCreated) {
        assert('expires_at ≈ now + duration', Math.abs(expiresAt - (nowTs + DURATION_SEC)) < 10,
          `diff=${Math.abs(expiresAt - (nowTs + DURATION_SEC))}s`);
      }

      console.log('  AgentHireSession data:');
      console.log('    agent_id:', storedAgentId);
      console.log('    expires_at:', new Date(expiresAt * 1000).toISOString());
      console.log('    active:', isActive);
    }

    console.log(`\n=== T43 RESULT: ${passed} passed, ${failed} failed ===`);
    if (failed > 0) process.exit(1);

  } catch (e) {
    console.error('\n[FATAL]', e.message ?? e);
    process.exit(1);
  }
})();
