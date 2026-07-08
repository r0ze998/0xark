// ─────────────────────────────────────────────────────────────────────────────
//  dev/f1-fixture-prep.mjs — THROWAWAY §10 fixture-prep for the F1 manual e2e.
//  NOT MERGED. dev/ only. Run against a LOCAL validator with oxark deployed.
//
//  ⚠⚠⚠  UNVERIFIED  ⚠⚠⚠
//  Authored WITHOUT execution — this repo's agent environment has no solana CLI
//  and no local validator, so NONE of this has been run. It is built on the
//  PROVEN primitives from circuits/hand_commitment/e2e_duel_bo3.mjs (genProof /
//  init / commit / reveal — those are known-good) plus instruction builders
//  transcribed verbatim from solana/client/onchain.js (cited per builder). Treat
//  every "// ASSUMPTION" as something to confirm on the first real run.
//
//  WHAT IT DOES (spec §10 fixture prep):
//    A) preflight: RPC reachable + program deployed (else exit with guidance)
//    B) win fixture:  A wins 10 decisive duels vs a throwaway opponent and
//                     settles A's fixture card each time → CardBattleHistory.wins
//                     reaches ≥ 10 (promote gate C→U).
//    C) energy fixture: wallet-B commits in 5 duels WITHOUT refill → energy 0.
//
//  RUN:
//    1. Install solana CLI, start `solana-test-validator`.
//    2. Deploy: (cd solana/oxark && anchor deploy)   # program id must match below
//    3. node dev/f1-fixture-prep.mjs  [--win-target 10] [--rpc URL] [--admin id.json]
//
//  BOOTSTRAP (now automated):
//    The script self-bootstraps: if GameWorld is absent it calls init_game_world
//    (admin-signed; ADMIN_PUBKEY == id.json here) with ops_treasury = oxark-ops, then
//    registers A and B via register_waitlist (0.5 SOL each → PlayerState @ energy MAX
//    + 5 starter cards). ops_treasury is then DECODED from the GameWorld account, not
//    guessed. If your ADMIN differs, pass --admin <keypair.json>.
// ─────────────────────────────────────────────────────────────────────────────
import * as snarkjs from 'snarkjs';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = '/Users/hiroprotagonist/Projects/0xark';
const web3 = require(`${ROOT}/solana/oxark/node_modules/@solana/web3.js`);
const {
  Connection, Keypair, PublicKey, Transaction, TransactionInstruction,
  SystemProgram, ComputeBudgetProgram, sendAndConfirmTransaction,
} = web3;

// ── config ──
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const RPC        = arg('--rpc', 'http://localhost:8899');
const WIN_TARGET = parseInt(arg('--win-target', '10'), 10);
const PROGRAM_ID = new PublicKey('5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN'); // CLAUDE.md / onchain.js
const CLIENT     = `${ROOT}/solana/client`;
const ENERGY_MAX = 5; // constants.rs ENERGY_MAX

const conn = new Connection(RPC, 'confirmed');
const ENC  = new TextEncoder();

// ── low-level helpers (from e2e_duel_bo3.mjs — proven) ──
const disc  = (n) => crypto.createHash('sha256').update(`global:${n}`).digest().slice(0, 8);
const u64le = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const HEAP    = ComputeBudgetProgram.requestHeapFrame({ bytes: 262144 });
const CULIMIT = ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 });
const toBuf32 = (s) => { let bi = BigInt(s); const b = Buffer.alloc(32); for (let i = 0; i < 32; i++) b[31 - i] = Number((bi >> BigInt(i * 8)) & 0xffn); return b; };
const pubHalves = (pk) => { const b = pk.toBytes(); let lo = 0n, hi = 0n; for (let i = 0; i < 16; i++) lo = (lo << 8n) | BigInt(b[i]); for (let i = 16; i < 32; i++) hi = (hi << 8n) | BigInt(b[i]); return [lo, hi]; };

// ── PDA seeds (transcribed from onchain.js find* helpers) ──
const pda = (seeds) => PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0];
const playerStatePda = (owner) => pda([ENC.encode('player'), owner.toBytes()]);
const gameWorldPda   = () => pda([ENC.encode('game_world')]);
const prizePoolPda   = () => pda([ENC.encode('prize_pool')]);
const duelPda        = (id) => pda([ENC.encode('duel'), id.toBytes()]);
const settlePda      = (id, player) => pda([ENC.encode('duel_settle'), id.toBytes(), player.toBytes()]);
const cardRecordPda  = (mint) => pda([ENC.encode('card_mint_record'), mint.toBytes()]);
const cardHistPda    = (mint) => pda([ENC.encode('card_battle_history'), mint.toBytes()]);
const SLOT_HASHES    = new PublicKey('SysvarS1otHashes111111111111111111111111111');
const SPL_TOKEN      = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
// GameWorld.ops_treasury is DECODED from the on-chain account at runtime (offset 93
// after 8-byte disc — verified against state.rs GameWorld field layout, cross-checked
// with onchain.js getGameWorld: game_status@59 & shop_phase_threshold@157 both match).
// Never guessed from a local keypair file. Set in main() once the world exists.
const GW_OPS_TREASURY_OFF = 93;
let OPS_TREASURY = null;
// ADMIN_PUBKEY (constants.rs) == id.json here (DPMPhnVezSq5…) — init_game_world must
// be signed by that admin. Override with --admin <keypair.json> if yours differs.

async function airdrop(pk, sol) { await conn.confirmTransaction(await conn.requestAirdrop(pk, sol * 1e9), 'confirmed'); }
async function send(ixs, signers, label) {
  const tx = new Transaction().add(HEAP, CULIMIT, ...ixs);
  const sig = await sendAndConfirmTransaction(conn, tx, signers, { commitment: 'confirmed' });
  console.log(`   tx ${label.padEnd(20)} ${sig}`);
  return sig;
}

// ── ZK proof (from e2e_duel_bo3.mjs — proven) ──
async function genProof(player, cards10, salt, round) {
  const [lo, hi] = pubHalves(player.publicKey);
  let sLo = 0n, sHi = 0n; for (let i = 0; i < 16; i++) sLo = (sLo << 8n) | BigInt(salt[i]); for (let i = 16; i < 32; i++) sHi = (sHi << 8n) | BigInt(salt[i]);
  const input = { card_ids: cards10.map(String), salt_lo: sLo.toString(), salt_hi: sHi.toString(), round: String(round), pubkey_lo: lo.toString(), pubkey_hi: hi.toString() };
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, `${CLIENT}/hand_commitment.wasm`, `${CLIENT}/hand_commitment_final.zkey`);
  const A = Buffer.alloc(64);  toBuf32(proof.pi_a[0]).copy(A, 0); toBuf32(proof.pi_a[1]).copy(A, 32);
  const B = Buffer.alloc(128); toBuf32(proof.pi_b[0][1]).copy(B, 0); toBuf32(proof.pi_b[0][0]).copy(B, 32); toBuf32(proof.pi_b[1][1]).copy(B, 64); toBuf32(proof.pi_b[1][0]).copy(B, 96);
  const C = Buffer.alloc(64);  toBuf32(proof.pi_c[0]).copy(C, 0); toBuf32(proof.pi_c[1]).copy(C, 32);
  return { A, B, C, sig: publicSignals.map(toBuf32) };
}

// ── instruction builders ──
// init_duel / commit_hand / reveal_hand — from e2e_duel_bo3.mjs (proven).
const ixInit = (id, p1, p2, auth) => new TransactionInstruction({
  programId: PROGRAM_ID,
  data: Buffer.concat([disc('init_duel'), id.toBuffer(), Buffer.from([0]), u64le(0)]),
  keys: [
    { pubkey: duelPda(id), isSigner: false, isWritable: true },
    { pubkey: p1, isSigner: false, isWritable: false },
    { pubkey: p2, isSigner: false, isWritable: false },
    { pubkey: auth, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
});
// VERIFIED against commit_hand.rs:13-31 (current program): CommitHand accounts are
// duel(mut), player(signer), player_state(mut, seeds=[b"player",player]). The energy
// charge lives here (settle_and_spend, 1/duel), so player_state is REQUIRED — the
// older e2e_duel_bo3.mjs (pre energy-gate) omits it and would fail on today's program.
const ixCommit = (id, round, player, pf) => new TransactionInstruction({
  programId: PROGRAM_ID,
  data: Buffer.concat([disc('commit_hand'), id.toBuffer(), Buffer.from([round]), pf.A, pf.B, pf.C, ...pf.sig]),
  keys: [
    { pubkey: duelPda(id), isSigner: false, isWritable: true },
    { pubkey: player, isSigner: true, isWritable: false },
    { pubkey: playerStatePda(player), isSigner: false, isWritable: true },
  ],
});
const ixReveal = (id, round, player, cards10, salt) => new TransactionInstruction({
  programId: PROGRAM_ID,
  data: Buffer.concat([disc('reveal_hand'), id.toBuffer(), Buffer.from([round]), ...cards10.map(u64le), Buffer.from(salt)]),
  keys: [
    { pubkey: duelPda(id), isSigner: false, isWritable: true },
    { pubkey: player, isSigner: true, isWritable: false },
  ],
});
// buy_pack — from onchain.js:2275 buyPack (accounts + disc+u8 data).
const ixBuyPack = (buyer, packType) => new TransactionInstruction({
  programId: PROGRAM_ID,
  data: Buffer.concat([disc('buy_pack'), Buffer.from([packType & 0xff])]),
  keys: [
    { pubkey: buyer, isSigner: true, isWritable: true },
    { pubkey: playerStatePda(buyer), isSigner: false, isWritable: true },
    { pubkey: gameWorldPda(), isSigner: false, isWritable: false },
    { pubkey: OPS_TREASURY, isSigner: false, isWritable: true },
    { pubkey: prizePoolPda(), isSigner: false, isWritable: true },
    { pubkey: SLOT_HASHES, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
});
// refill_energy — from onchain.js:2258 refillEnergy (disc only; 5 accounts).
const ixRefill = (player) => new TransactionInstruction({
  programId: PROGRAM_ID,
  data: disc('refill_energy'),
  keys: [
    { pubkey: player, isSigner: true, isWritable: true },
    { pubkey: playerStatePda(player), isSigner: false, isWritable: true },
    { pubkey: gameWorldPda(), isSigner: false, isWritable: false },
    { pubkey: OPS_TREASURY, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
});
// settle_duel_history — from onchain.js:1776 settleDuelHistory (data 72B; 6 accounts).
const ixSettle = (id, player, mint) => new TransactionInstruction({
  programId: PROGRAM_ID,
  data: Buffer.concat([disc('settle_duel_history'), id.toBuffer(), mint.toBuffer()]),
  keys: [
    { pubkey: duelPda(id), isSigner: false, isWritable: false },
    { pubkey: player, isSigner: true, isWritable: true },
    { pubkey: settlePda(id, player), isSigner: false, isWritable: true },
    { pubkey: cardRecordPda(mint), isSigner: false, isWritable: false },
    { pubkey: cardHistPda(mint), isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
});

// init_game_world — from init_game_world.rs:18 (accounts) + lib.rs:769 (args
// game_start_timestamp:i64, ops_treasury:Pubkey). Admin-gated (authority==ADMIN_PUBKEY).
const ixInitGameWorld = (admin, gameStart, opsTreasury) => new TransactionInstruction({
  programId: PROGRAM_ID,
  data: Buffer.concat([disc('init_game_world'), (() => { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(gameStart)); return b; })(), opsTreasury.toBuffer()]),
  keys: [
    { pubkey: gameWorldPda(), isSigner: false, isWritable: true },
    { pubkey: prizePoolPda(), isSigner: false, isWritable: false },
    { pubkey: admin, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
});
// register_waitlist — from register_waitlist.rs (accounts; no args). Deposits 0.5 SOL,
// inits PlayerState (energy=MAX) + distributes 5 starter cards. Account order:
// player_state(init_if_needed), game_world(mut), prize_pool(mut), ops_treasury(mut), player, system.
const ixRegister = (player) => new TransactionInstruction({
  programId: PROGRAM_ID,
  data: disc('register_waitlist'),
  keys: [
    { pubkey: playerStatePda(player), isSigner: false, isWritable: true },
    { pubkey: gameWorldPda(), isSigner: false, isWritable: true },
    { pubkey: prizePoolPda(), isSigner: false, isWritable: true },
    { pubkey: OPS_TREASURY, isSigner: false, isWritable: true },
    { pubkey: player, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
});

// ── readers ──
// GameWorld: ops_treasury pubkey @ GW_OPS_TREASURY_OFF. Returns null if world absent.
async function readOpsTreasury() {
  const info = await conn.getAccountInfo(gameWorldPda());
  if (!info) return null;
  return new PublicKey(info.data.subarray(GW_OPS_TREASURY_OFF, GW_OPS_TREASURY_OFF + 32));
}
// DuelState (state.rs, verified in F1-0): round@105, ended_at@123(i64),
// winner@131(32), p1RoundWins@1614, p2RoundWins@1615.
async function readDuel(id) {
  const d = (await conn.getAccountInfo(duelPda(id))).data;
  return {
    round: d[105],
    endedAt: Number(d.readBigInt64LE(123)),
    winner: new PublicKey(d.subarray(131, 163)),
    p1w: d[1614], p2w: d[1615],
  };
}
// CardBattleHistory (onchain.js getCardBattleHistory): wins@40 (after 8B disc).
async function readWins(mint) {
  const info = await conn.getAccountInfo(cardHistPda(mint));
  return info ? info.data.readUInt32LE(40) : null;
}
// PlayerState energy: vaultOff = queueNone(d[169]==0)?170:202; energy@vaultOff+54.
async function readEnergy(owner) {
  const info = await conn.getAccountInfo(playerStatePda(owner));
  if (!info) return null;
  const d = info.data;
  const vaultOff = d[169] === 0 ? 170 : 202;
  return d[vaultOff + 54];
}
// Enumerate owned card mints → Map<cardId,[{mint,rarity}]> (from onchain.js getOwnedCardMints).
async function ownedMints(owner) {
  const resp = await conn.getParsedTokenAccountsByOwner(owner, { programId: SPL_TOKEN });
  const mints = resp.value.map(a => a.account.data.parsed?.info)
    .filter(i => i && i.tokenAmount?.amount === '1' && i.tokenAmount?.decimals === 0)
    .map(i => i.mint);
  const recs = await conn.getMultipleAccountsInfo(mints.map(m => cardRecordPda(new PublicKey(m))));
  const map = new Map();
  recs.forEach((info, i) => {
    if (!info) return;
    const cardId = info.data[40], rarity = info.data[41];
    if (!map.has(cardId)) map.set(cardId, []);
    map.get(cardId).push({ mint: mints[i], rarity });
  });
  return map;
}

// ── run one decisive A-wins duel (A high-BP pirates vs B low-BP), settle A's fixture mint ──
async function winOneDuel(auth, A, B, handA, handB, fixtureMint, n) {
  const id = Keypair.generate().publicKey;
  const salt = Buffer.alloc(32, 0x11);
  console.log(`\n── win-duel ${n}/${WIN_TARGET}  duel=${id.toBase58().slice(0, 8)}… ──`);
  // Refill both so commit_hand's energy charge never blocks the farm.
  await send([ixRefill(A.publicKey)], [A], 'refill A');
  await send([ixRefill(B.publicKey)], [B], 'refill B');
  await send([ixInit(id, A.publicKey, B.publicKey, auth.publicKey)], [auth], 'init');
  for (let r = 1; r <= 5; r++) {
    const pfA = await genProof(A, handA, salt, r);
    const pfB = await genProof(B, handB, salt, r);
    await send([ixCommit(id, r, A.publicKey, pfA)], [A], `commit A r${r}`);
    await send([ixCommit(id, r, B.publicKey, pfB)], [B], `commit B r${r}`);
    await send([ixReveal(id, r, A.publicKey, handA, salt)], [A], `reveal A r${r}`);
    await send([ixReveal(id, r, B.publicKey, handB, salt)], [B], `reveal B r${r}`);
    const s = await readDuel(id);
    console.log(`   r${r}: wins A=${s.p1w} B=${s.p2w} ended=${s.endedAt > 0}`);
    if (s.endedAt > 0) {
      if (!s.winner.equals(A.publicKey)) throw new Error(`duel ${n}: A did not win (winner=${s.winner.toBase58().slice(0, 8)})`);
      // settle A's fixture card → wins += 1 (dedup per duel+player+card_id)
      await send([ixSettle(id, A.publicKey, fixtureMint)], [A], 'settle A fixture');
      return;
    }
  }
  throw new Error(`duel ${n} did not end in 5 rounds`);
}

(async () => {
  // ── A) preflight ──
  console.log(`\n=== F1 fixture-prep (UNVERIFIED) — RPC ${RPC} ===`);
  try { await conn.getVersion(); } catch { console.error(`FATAL: no validator at ${RPC}. Start solana-test-validator.`); process.exit(1); }
  const prog = await conn.getAccountInfo(PROGRAM_ID);
  if (!prog || !prog.executable) { console.error(`FATAL: program ${PROGRAM_ID.toBase58()} not deployed to ${RPC}.`); process.exit(1); }
  console.log('preflight OK: validator up, program deployed.');

  const adminPath = arg('--admin', `${process.env.HOME}/.config/solana/id.json`);
  const auth = Keypair.fromSecretKey(new Uint8Array(JSON.parse(readFileSync(adminPath, 'utf8')))); // == ADMIN_PUBKEY
  const A = Keypair.generate(), B = Keypair.generate();
  await airdrop(A.publicKey, 5); await airdrop(B.publicKey, 5);
  console.log(`admin=${auth.publicKey.toBase58()}  A=${A.publicKey.toBase58()}  B=${B.publicKey.toBase58()}`);

  // ── bootstrap GameWorld (init_game_world, admin-signed) if the fresh validator has none ──
  let ops = await readOpsTreasury();
  if (!ops) {
    // Fresh world: SET ops_treasury at init (choose the configured ops key), then
    // decode it back so downstream fee routing uses the on-chain source of truth.
    const opsInit = Keypair.fromSecretKey(new Uint8Array(JSON.parse(readFileSync(`${process.env.HOME}/.config/solana/oxark-ops.json`, 'utf8')))).publicKey;
    const now = Math.floor(Date.now() / 1000);
    await send([ixInitGameWorld(auth.publicKey, now, opsInit)], [auth], 'init_game_world');
    ops = await readOpsTreasury();
  }
  OPS_TREASURY = ops; // DECODED from GameWorld (never guessed)
  console.log(`ops_treasury (decoded from GameWorld@${GW_OPS_TREASURY_OFF}): ${OPS_TREASURY.toBase58()}`);

  // ── register A and B: deposits 0.5 SOL, inits PlayerState (energy=MAX), grants 5 starter cards ──
  await send([ixRegister(A.publicKey)], [A], 'register A');
  await send([ixRegister(B.publicKey)], [B], 'register B');

  // A already owns 5 starter cards from registration; buy extra packs for hand variety.
  for (let i = 0; i < 2; i++) await send([ixBuyPack(A.publicKey, 0)], [A], `A buy_pack ${i}`).catch(e => console.warn('  buy_pack A skipped:', e.message));

  const aMap = await ownedMints(A.publicKey);
  const aCards = [...aMap.keys()];
  if (aCards.length < 5) { console.error(`A owns only ${aCards.length} distinct cards after register+packs; raise pack count.`); process.exit(1); }
  // FLAG 2 (resolved): reveal_hand is free-form — it does NOT check card ownership.
  // We only need the fixture cardId present in A's 10 revealed slots each duel;
  // ownership is enforced at SETTLE via the mint ATA, which the real starter mint
  // satisfies. So fielding fixtureCardId (an owned starter) is sufficient.
  const fixtureCardId = aCards[0];
  const fixtureMint = new PublicKey(aMap.get(fixtureCardId)[0].mint);
  // Because reveal is free-form (FLAG 2), only slot 0 must be owned (the fixture we
  // settle). Fill 1-4 with high-BP pirates (24,25,27,28) and give B low-BP (1,2,11,12,13)
  // so A wins DECISIVELY every round → 3-0 by round 3 (mirrors e2e_duel_bo3 scenario 1).
  const handA = [fixtureCardId, 24, 25, 27, 28, 0, 0, 0, 0, 0];
  const handB = [1, 2, 11, 12, 13, 0, 0, 0, 0, 0];
  console.log(`fixture card=${fixtureCardId} mint=${fixtureMint.toBase58()}  handA=[${handA.slice(0, 5)}] handB=[${handB.slice(0, 5)}]`);

  // ── B) win fixture: 10 decisive duels, settle A's fixture mint each ──
  const wins0 = await readWins(fixtureMint);
  console.log(`\nfixture wins before: ${wins0}`);
  for (let n = 1; n <= WIN_TARGET; n++) {
    const w = await readWins(fixtureMint);
    if (w >= WIN_TARGET) { console.log(`already at ${w} wins — stopping early`); break; }
    await winOneDuel(auth, A, B, handA, handB, fixtureMint, n);
  }
  const winsN = await readWins(fixtureMint);
  console.log(`\n✓ fixture card wins after: ${winsN}  (target ${WIN_TARGET})  mint=${fixtureMint.toBase58()}`);
  if (winsN < WIN_TARGET) { console.error('WIN FIXTURE INCOMPLETE'); process.exit(1); }

  // ── C) energy fixture: drain B to 0 (spec precision) ──
  // Energy is charged ONCE per duel ENTRY (commit_hand round-1 first commit), so to
  // spend 5 energy B must do the round-1 first commit of 5 SEPARATE duels — NOT 5
  // commits within one duel (rounds 2-5 of the same duel are free). We only need the
  // entry commit to land; the throwaway duels are abandoned after it.
  console.log(`\n── draining B energy: round-1 commit of ${ENERGY_MAX} separate duels ──`);
  await send([ixRefill(B.publicKey)], [B], 'refill B → MAX'); // start from a known MAX
  const salt = Buffer.alloc(32, 0x22);
  for (let i = 0; i < ENERGY_MAX; i++) {
    const id = Keypair.generate().publicKey; // fresh duel each iteration = a new entry
    await send([ixInit(id, B.publicKey, A.publicKey, auth.publicKey)], [auth], `drain-init ${i}`);
    const pf = await genProof(B, handB, salt, 1);
    await send([ixCommit(id, 1, B.publicKey, pf)], [B], `B entry-commit (drain ${i})`); // −1 energy
    console.log(`   B energy now: ${await readEnergy(B.publicKey)}`);
  }
  const bEnergy = await readEnergy(B.publicKey);
  console.log(`\n✓ wallet-B energy: ${bEnergy}  (target 0)`);

  // ── deliverable summary ──
  console.log('\n════ FIXTURE SUMMARY (paste into the e2e report) ════');
  console.log(`WIN FIXTURE   wallet=${A.publicKey.toBase58()}`);
  console.log(`              card_id=${fixtureCardId} mint=${fixtureMint.toBase58()} wins=${winsN}`);
  console.log(`ENERGY FIXTURE wallet=${B.publicKey.toBase58()} energy=${bEnergy}`);
  console.log('Import A and B secret keys into the two browser wallet profiles to run the UI e2e.');
  console.log(`A secret (base58 array): [saved to dev/f1-fixture-A.json — DO NOT COMMIT]`);
  process.exit(winsN >= WIN_TARGET && bEnergy === 0 ? 0 : 1);
})().catch((e) => { console.error('\nFIXTURE FAILED:', e.message || e); process.exit(1); });
