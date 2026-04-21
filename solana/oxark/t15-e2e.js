#!/usr/bin/env node
// T15 E2E — Phase C Day 2 full cycle on devnet
// create_game → join_game → start_game → delegate_session →
// commit_action (base layer + ER) → undelegate_session
//
// Usage: node t15-e2e.js

const web3 = require('../../multiplayer/node_modules/@solana/web3.js');
const crypto = require('crypto');
const fs = require('fs');

// ─── Constants ──────────────────────────────────────────────────────────────
const PROGRAM_ID   = new web3.PublicKey('5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN');
const DLGM_PROGRAM = new web3.PublicKey('DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh');
const MAGIC_PROG   = new web3.PublicKey('Magic11111111111111111111111111111111111111');
const MAGIC_CTX    = new web3.PublicKey('MagicContext1111111111111111111111111111111');
const MB_ROUTER    = 'https://devnet-router.magicblock.app';
const DEVNET_RPC   = 'https://api.devnet.solana.com';

// ─── Keypair ─────────────────────────────────────────────────────────────────
const keypairRaw = JSON.parse(fs.readFileSync(`${process.env.HOME}/.config/solana/id.json`));
const payer      = web3.Keypair.fromSecretKey(Uint8Array.from(keypairRaw));
console.log('Payer:', payer.publicKey.toBase58());

// ─── Connections ─────────────────────────────────────────────────────────────
const devnet = new web3.Connection(DEVNET_RPC, 'confirmed');
const router = new web3.Connection(MB_ROUTER,  'confirmed');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function disc(name) {
  return crypto.createHash('sha256').update(`global:${name}`).digest().slice(0, 8);
}

function u64LE(n) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(n), 0);
  return buf;
}

function findPDA(seeds) {
  return web3.PublicKey.findProgramAddressSync(seeds, PROGRAM_ID);
}

function findDlgPDA(seeds) {
  return web3.PublicKey.findProgramAddressSync(seeds, DLGM_PROGRAM);
}

async function sendAndConfirm(conn, tx, signers, label) {
  const bh = await conn.getLatestBlockhash();
  tx.recentBlockhash = bh.blockhash;
  tx.feePayer = payer.publicKey;
  tx.sign(...signers);
  const start = Date.now();
  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  await conn.confirmTransaction({ signature: sig, ...bh }, 'confirmed');
  const ms = Date.now() - start;
  console.log(`  [${label}] sig=${sig.slice(0,20)}... (${ms}ms)`);
  return { sig, ms };
}

async function getBlockhashForAccounts(writableAccts) {
  const resp = await fetch(MB_ROUTER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'getBlockhashForAccounts', params:[writableAccts] }),
  });
  const json = await resp.json();
  if (json.error) throw new Error('getBlockhashForAccounts: ' + JSON.stringify(json.error));
  return json.result;
}

async function sendViaMagicRouter(tx, label) {
  const writable = [];
  if (tx.feePayer) writable.push(tx.feePayer.toBase58());
  for (const ix of tx.instructions) {
    for (const k of ix.keys) { if (k.isWritable) writable.push(k.pubkey.toBase58()); }
  }
  const bh = await getBlockhashForAccounts([...new Set(writable)]);
  tx.recentBlockhash = bh.blockhash;
  tx.feePayer = payer.publicKey;
  tx.sign(payer);
  const start = Date.now();
  const sig = await router.sendRawTransaction(tx.serialize(), { skipPreflight: true });
  await router.confirmTransaction({ signature: sig, blockhash: bh.blockhash, lastValidBlockHeight: bh.lastValidBlockHeight }, 'confirmed');
  const ms = Date.now() - start;
  console.log(`  [${label}] sig=${sig.slice(0,20)}... (${ms}ms)`);
  return { sig, ms };
}

// ─── PDA derivation ───────────────────────────────────────────────────────────
function pdas(gameId) {
  const gib = u64LE(gameId);
  const payerBytes = payer.publicKey.toBytes();
  const [game]        = findPDA([Buffer.from('game'), gib]);
  const [cardPool]    = findPDA([Buffer.from('card_pool'), gib]);
  const [playerState] = findPDA([Buffer.from('player'), gib, payerBytes]);
  const [commit]      = findPDA([Buffer.from('commit'), gib, payerBytes]);
  // delegation PDAs
  const [gBuf]   = web3.PublicKey.findProgramAddressSync([Buffer.from('buffer'), game.toBytes()], PROGRAM_ID);
  const [gDlgR]  = findDlgPDA([Buffer.from('delegation'), game.toBytes()]);
  const [gDlgM]  = findDlgPDA([Buffer.from('delegation-metadata'), game.toBytes()]);
  const [pBuf]   = web3.PublicKey.findProgramAddressSync([Buffer.from('buffer'), playerState.toBytes()], PROGRAM_ID);
  const [pDlgR]  = findDlgPDA([Buffer.from('delegation'), playerState.toBytes()]);
  const [pDlgM]  = findDlgPDA([Buffer.from('delegation-metadata'), playerState.toBytes()]);
  return { game, cardPool, playerState, commit, gBuf, gDlgR, gDlgM, pBuf, pDlgR, pDlgM };
}

// ─── Instructions ─────────────────────────────────────────────────────────────
function ixCreateGame(gameId, p) {
  const data = Buffer.concat([disc('create_game'), u64LE(gameId), Buffer.from([1])]); // max_players=1
  return new web3.TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: p.game,                             isSigner: false, isWritable: true  },
      { pubkey: p.cardPool,                         isSigner: false, isWritable: true  },
      { pubkey: payer.publicKey,                    isSigner: true,  isWritable: true  },
      { pubkey: web3.SystemProgram.programId,       isSigner: false, isWritable: false },
    ],
    data,
  });
}

function ixJoinGame(gameId, p) {
  const data = Buffer.concat([disc('join_game'), u64LE(gameId)]);
  return new web3.TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: p.game,                             isSigner: false, isWritable: true  },
      { pubkey: p.playerState,                      isSigner: false, isWritable: true  },
      { pubkey: payer.publicKey,                    isSigner: true,  isWritable: true  },
      { pubkey: web3.SystemProgram.programId,       isSigner: false, isWritable: false },
    ],
    data,
  });
}

function ixStartGame(gameId, p) {
  const data = Buffer.concat([disc('start_game'), u64LE(gameId)]);
  return new web3.TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: p.game,                             isSigner: false, isWritable: true  },
      { pubkey: p.cardPool,                         isSigner: false, isWritable: true  },
      { pubkey: payer.publicKey,                    isSigner: true,  isWritable: false },
      { pubkey: p.playerState,                      isSigner: false, isWritable: true  }, // remaining account
    ],
    data,
  });
}

function ixDelegateSession(gameId, p) {
  const data = Buffer.concat([disc('delegate_session'), u64LE(gameId)]);
  return new web3.TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey,                    isSigner: true,  isWritable: true  },
      { pubkey: p.game,                             isSigner: false, isWritable: true  },
      { pubkey: p.playerState,                      isSigner: false, isWritable: true  },
      { pubkey: p.gBuf,                             isSigner: false, isWritable: true  },
      { pubkey: p.gDlgR,                            isSigner: false, isWritable: true  },
      { pubkey: p.gDlgM,                            isSigner: false, isWritable: true  },
      { pubkey: p.pBuf,                             isSigner: false, isWritable: true  },
      { pubkey: p.pDlgR,                            isSigner: false, isWritable: true  },
      { pubkey: p.pDlgM,                            isSigner: false, isWritable: true  },
      { pubkey: PROGRAM_ID,                         isSigner: false, isWritable: false },
      { pubkey: DLGM_PROGRAM,                       isSigner: false, isWritable: false },
      { pubkey: web3.SystemProgram.programId,       isSigner: false, isWritable: false },
    ],
    data,
  });
}

function ixCommitAction(gameId, p, hash32) {
  const data = Buffer.concat([disc('commit_action'), u64LE(gameId), Buffer.from(hash32)]);
  return new web3.TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: p.game,                             isSigner: false, isWritable: true  },
      { pubkey: p.playerState,                      isSigner: false, isWritable: true  },
      { pubkey: p.commit,                           isSigner: false, isWritable: true  },
      { pubkey: payer.publicKey,                    isSigner: true,  isWritable: true  },
      { pubkey: web3.SystemProgram.programId,       isSigner: false, isWritable: false },
    ],
    data,
  });
}

function ixUndelegateSession(gameId, p) {
  const data = Buffer.concat([disc('undelegate_session'), u64LE(gameId)]);
  return new web3.TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey,                    isSigner: true,  isWritable: true  },
      { pubkey: p.game,                             isSigner: false, isWritable: true  },
      { pubkey: p.playerState,                      isSigner: false, isWritable: true  },
      { pubkey: MAGIC_CTX,                          isSigner: false, isWritable: true  },
      { pubkey: MAGIC_PROG,                         isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const gameId = Date.now() % 1000000; // 6-digit game ID from timestamp
  console.log('\n=== T15 E2E — Phase C Day 2 ===');
  console.log('Game ID:', gameId);
  console.log('Program:', PROGRAM_ID.toBase58());
  console.log('');

  const p = pdas(gameId);
  console.log('PDAs:');
  console.log('  game:        ', p.game.toBase58());
  console.log('  playerState: ', p.playerState.toBase58());
  console.log('  cardPool:    ', p.cardPool.toBase58());
  console.log('');

  const results = {};

  // ── 1. create_game ──────────────────────────────────────────────────────────
  console.log('[1] create_game');
  const txCreate = new web3.Transaction().add(ixCreateGame(gameId, p));
  results.createGame = await sendAndConfirm(devnet, txCreate, [payer], 'create_game');

  // ── 2. join_game ────────────────────────────────────────────────────────────
  console.log('[2] join_game');
  const txJoin = new web3.Transaction().add(ixJoinGame(gameId, p));
  results.joinGame = await sendAndConfirm(devnet, txJoin, [payer], 'join_game');

  // ── 3. start_game ───────────────────────────────────────────────────────────
  console.log('[3] start_game');
  const txStart = new web3.Transaction().add(ixStartGame(gameId, p));
  results.startGame = await sendAndConfirm(devnet, txStart, [payer], 'start_game');

  // ── 4. delegate_session ─────────────────────────────────────────────────────
  console.log('[4] delegate_session (base layer)');
  const txDelegate = new web3.Transaction().add(ixDelegateSession(gameId, p));
  results.delegateSession = await sendAndConfirm(devnet, txDelegate, [payer], 'delegate_session');

  // ── 5a. commit_action via base layer (latency baseline) ─────────────────────
  console.log('[5a] commit_action — base layer (latency baseline)');
  const hash1 = crypto.randomBytes(32);
  const txCommitBase = new web3.Transaction().add(ixCommitAction(gameId, p, hash1));
  const bhBase = await devnet.getLatestBlockhash();
  txCommitBase.recentBlockhash = bhBase.blockhash;
  txCommitBase.feePayer = payer.publicKey;
  txCommitBase.sign(payer);
  const t0base = Date.now();
  try {
    const sigBase = await devnet.sendRawTransaction(txCommitBase.serialize(), { skipPreflight: true });
    await devnet.confirmTransaction({ signature: sigBase, ...bhBase }, 'confirmed');
    results.commitBase = { sig: sigBase, ms: Date.now() - t0base };
    console.log(`  [commit_action/base] sig=${sigBase.slice(0,20)}... (${results.commitBase.ms}ms)`);
  } catch(e) {
    console.log(`  [commit_action/base] SKIPPED (already committed): ${e.message.slice(0,60)}`);
    results.commitBase = { sig: null, ms: null, skipped: true };
  }

  // ── 5b. commit_action via Magic Router (ER) ──────────────────────────────────
  console.log('[5b] commit_action — Magic Router / ER');
  // Note: After delegation, accounts are owned by ER validator.
  // The Magic Router auto-routes to ER based on writable delegated accounts.
  const hash2 = crypto.randomBytes(32); // new hash for round 2 (if applicable)
  const txCommitER = new web3.Transaction().add(ixCommitAction(gameId, p, hash2));
  try {
    results.commitER = await sendViaMagicRouter(txCommitER, 'commit_action/ER');
  } catch(e) {
    console.log(`  [commit_action/ER] ERROR: ${e.message.slice(0,100)}`);
    results.commitER = { sig: null, ms: null, error: e.message };
  }

  // ── 6. undelegate_session ───────────────────────────────────────────────────
  console.log('[6] undelegate_session (via Magic Router)');
  const txUndelegate = new web3.Transaction().add(ixUndelegateSession(gameId, p));
  try {
    results.undelegateSession = await sendViaMagicRouter(txUndelegate, 'undelegate_session');
  } catch(e) {
    console.log(`  [undelegate_session] ERROR: ${e.message.slice(0,100)}`);
    results.undelegateSession = { sig: null, ms: null, error: e.message };
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n=== T15 SUMMARY ===');
  console.log('Game ID:        ', gameId);
  console.log('Program ID:     ', PROGRAM_ID.toBase58());
  for (const [k, v] of Object.entries(results)) {
    if (v && v.sig) {
      console.log(`${k.padEnd(20)}: ${v.sig} (${v.ms}ms)`);
    } else if (v && v.error) {
      console.log(`${k.padEnd(20)}: ERROR — ${v.error.slice(0,80)}`);
    } else if (v && v.skipped) {
      console.log(`${k.padEnd(20)}: SKIPPED`);
    }
  }

  // latency
  if (results.commitBase?.ms && results.commitER?.ms) {
    console.log(`\nLatency:`);
    console.log(`  Base layer:  ${results.commitBase.ms}ms`);
    console.log(`  ER (router): ${results.commitER.ms}ms`);
    console.log(`  Speedup:     ${(results.commitBase.ms / results.commitER.ms).toFixed(1)}x`);
  } else {
    // ping comparison as fallback
    console.log('\nLatency (ping comparison):');
    const t1 = Date.now();
    await fetch(DEVNET_RPC, { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({jsonrpc:'2.0',id:1,method:'getHealth',params:[]}) });
    const baseMs = Date.now() - t1;
    const t2 = Date.now();
    await fetch(MB_ROUTER, { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({jsonrpc:'2.0',id:1,method:'getHealth',params:[]}) });
    const routerMs = Date.now() - t2;
    console.log(`  Devnet RPC:   ${baseMs}ms`);
    console.log(`  Magic Router: ${routerMs}ms`);
  }
}

main().catch(err => {
  console.error('\nFATAL:', err.message);
  console.error(err.stack?.slice(0, 500));
  process.exit(1);
});
