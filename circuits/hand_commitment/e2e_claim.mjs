// YKK-38 + YKK-24 claim settlement e2e on a real runtime (local validator).
// init_game_world → register_waitlist (auto-creates prize_pool PDA) → activate_season
// → finalize_season_tally (admin crank) → end_season_final → claim_prize_v2
// (player-only signature, invoke_signed payout from the PDA vault). Also checks
// double-claim → NotRegistered. ALL txs include RequestHeapFrame (custom-heap build).
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const web3 = require('/Users/hiroprotagonist/Projects/0xark/solana/oxark/node_modules/@solana/web3.js');
const {
  Connection, Keypair, PublicKey, Transaction, TransactionInstruction,
  SystemProgram, ComputeBudgetProgram, sendAndConfirmTransaction,
} = web3;

const RPC = 'http://localhost:8899';
const PROGRAM_ID = new PublicKey('5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN');
const conn = new Connection(RPC, 'confirmed');
const disc = (n) => crypto.createHash('sha256').update(`global:${n}`).digest().slice(0, 8);
const i64le = (n) => { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(n)); return b; };
const u32le = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
const HEAP = ComputeBudgetProgram.requestHeapFrame({ bytes: 262144 });
const CULIMIT = ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 });

const gwPda = () => PublicKey.findProgramAddressSync([Buffer.from('game_world')], PROGRAM_ID)[0];
const poolPda = () => PublicKey.findProgramAddressSync([Buffer.from('prize_pool')], PROGRAM_ID)[0];
const playerPda = (pk) => PublicKey.findProgramAddressSync([Buffer.from('player'), pk.toBytes()], PROGRAM_ID)[0];

async function airdrop(pk, sol) {
  await conn.confirmTransaction(await conn.requestAirdrop(pk, sol * 1e9), 'confirmed');
}
async function send(ixs, signers, label) {
  const tx = new Transaction().add(HEAP, CULIMIT, ...ixs);
  try {
    const sig = await sendAndConfirmTransaction(conn, tx, signers, { commitment: 'confirmed' });
    const t = await conn.getTransaction(sig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
    console.log(`  ✓ ${label}: sig=${sig} CU=${t?.meta?.computeUnitsConsumed ?? '?'}`);
    return { sig, ok: true };
  } catch (e) {
    const logs = (e.logs || []).join(' | ');
    console.log(`  ✗ ${label}: ${e.message?.split('\n')[0]} ${logs ? '\n     logs: ' + logs : ''}`);
    return { ok: false, err: (e.message || '') + ' ' + logs };
  }
}
const bal = async (pk) => (await conn.getAccountInfo(pk))?.lamports ?? 0;

(async () => {
  const admin = Keypair.fromSecretKey(new Uint8Array(JSON.parse(
    readFileSync(`${process.env.HOME}/.config/solana/id.json`, 'utf8')))); // = ADMIN_PUBKEY
  const ops = Keypair.generate();
  const A = Keypair.generate();
  console.log('admin/authority:', admin.publicKey.toBase58());
  console.log('ops_treasury  :', ops.publicKey.toBase58());
  console.log('player A      :', A.publicKey.toBase58());
  console.log('game_world PDA:', gwPda().toBase58(), '\nprize_pool PDA:', poolPda().toBase58());
  await airdrop(A.publicKey, 2);

  const now = Math.floor(Date.now() / 1000);
  const WAITLIST_WINDOW = 14 * 24 * 3600;
  const WINDOW_S = 30; // close the waitlist 30s from now so activate can run shortly after
  const gameStart = now + WINDOW_S - WAITLIST_WINDOW; // waitlist_close = gameStart + 14d = now + 30s

  console.log('\n── init_game_world (ADMIN; prize_pool is now a derived PDA, no arg) ──');
  await send([new TransactionInstruction({
    programId: PROGRAM_ID,
    data: Buffer.concat([disc('init_game_world'), i64le(gameStart), ops.publicKey.toBuffer()]),
    keys: [
      { pubkey: gwPda(), isSigner: false, isWritable: true },
      { pubkey: poolPda(), isSigner: false, isWritable: false },
      { pubkey: admin.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
  })], [admin], 'init_game_world');

  console.log('\n── register_waitlist A (0.5 SOL; 85%→prize_pool PDA auto-created, 15%→ops) ──');
  const poolBefore = await bal(poolPda());
  await send([new TransactionInstruction({
    programId: PROGRAM_ID, data: disc('register_waitlist'),
    keys: [
      { pubkey: playerPda(A.publicKey), isSigner: false, isWritable: true },
      { pubkey: gwPda(), isSigner: false, isWritable: true },
      { pubkey: poolPda(), isSigner: false, isWritable: true },
      { pubkey: ops.publicKey, isSigner: false, isWritable: true },
      { pubkey: A.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
  })], [A], 'register_waitlist');
  const poolAfter = await bal(poolPda());
  const rentMin = await conn.getMinimumBalanceForRentExemption(0);
  console.log(`  prize_pool PDA: ${poolBefore} → ${poolAfter} lamports (+${poolAfter - poolBefore}); rent floor(0)=${rentMin}`);
  console.log(`  ops_treasury balance: ${await bal(ops.publicKey)} lamports`);

  console.log(`\n── waiting ${WINDOW_S + 5}s for waitlist to close (activate requires now >= close) ──`);
  await new Promise((r) => setTimeout(r, (WINDOW_S + 5) * 1000));

  console.log('\n── activate_season (ADMIN, 0→1) ──');
  await send([new TransactionInstruction({
    programId: PROGRAM_ID, data: disc('activate_season'),
    keys: [
      { pubkey: gwPda(), isSigner: false, isWritable: true },
      { pubkey: admin.publicKey, isSigner: true, isWritable: false },
    ],
  })], [admin], 'activate_season');

  console.log('\n── finalize_season_tally (ADMIN crank; remaining_accounts = [player_state A]) ──');
  await send([new TransactionInstruction({
    programId: PROGRAM_ID,
    data: Buffer.concat([disc('finalize_season_tally'), u32le(1), A.publicKey.toBuffer()]),
    keys: [
      { pubkey: gwPda(), isSigner: false, isWritable: true },
      { pubkey: admin.publicKey, isSigner: true, isWritable: false },
      { pubkey: playerPda(A.publicKey), isSigner: false, isWritable: false },
    ],
  })], [admin], 'finalize_season_tally');

  console.log('\n── end_season_final (ADMIN, 1→2) ──');
  await send([new TransactionInstruction({
    programId: PROGRAM_ID, data: disc('end_season_final'),
    keys: [
      { pubkey: gwPda(), isSigner: false, isWritable: true },
      { pubkey: admin.publicKey, isSigner: true, isWritable: false },
    ],
  })], [admin], 'end_season_final');

  console.log('\n── claim_prize_v2 A (PLAYER-ONLY signature → invoke_signed payout from PDA vault) ──');
  const claimIx = () => new TransactionInstruction({
    programId: PROGRAM_ID, data: disc('claim_prize_v2'),
    keys: [
      { pubkey: playerPda(A.publicKey), isSigner: false, isWritable: true },
      { pubkey: gwPda(), isSigner: false, isWritable: true },
      { pubkey: poolPda(), isSigner: false, isWritable: true },
      { pubkey: A.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
  });
  const poolPre = await bal(poolPda());
  await send([claimIx()], [A], 'claim_prize_v2 (1st)');
  const poolPost = await bal(poolPda());
  const payout = poolPre - poolPost;
  console.log(`  prize_pool PDA: ${poolPre} → ${poolPost} (payout=${payout} lamports = ${(payout / 1e9).toFixed(4)} SOL)`);
  console.log(`  expected ≈ 50% of total_prize_pool (timeout champion, all lower tiers empty → eff=[50,0,0,0,0])`);
  console.log(`  pool stays ≥ rent floor: ${poolPost >= rentMin} (post=${poolPost}, floor=${rentMin})`);

  console.log('\n── claim_prize_v2 A (2nd) → must be rejected (C1: NotRegistered) ──');
  const second = await send([claimIx()], [A], 'claim_prize_v2 (2nd)');
  console.log(`  double-claim rejected: ${!second.ok && /NotRegistered|0x/.test(second.err)} (${second.ok ? 'UNEXPECTEDLY SUCCEEDED' : 'rejected'})`);

  console.log('\nCLAIM E2E COMPLETE ✓');
  process.exit(0);
})().catch((e) => { console.error('CLAIM E2E FAILED:', e.message || e); process.exit(1); });
