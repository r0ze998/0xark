#!/usr/bin/env node
// Devnet only. Default is read-only. Wallet files stay local; never log secrets.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { decodePrizeWorld, decodePrizePlayer, prizeQuote } from '../solana/client/src/lib/season-prize.js';
import { encodeBase58 } from '../solana/client/src/lib/base58.js';
import { decodeOperatorPlayer, operatorPlayerOwner } from './season-prize-operator-lib.mjs';
const require = createRequire(new URL('../solana/oxark/package.json', import.meta.url));
const { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, SystemProgram, ComputeBudgetProgram } = require('@solana/web3.js');
const args = process.argv.slice(2);
const value = flag => { const i=args.indexOf(flag); return i<0 ? null : args[i+1]; };
const action=value('--execute');
const conn = new Connection('https://api.devnet.solana.com','finalized');
const program=new PublicKey('5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN');
const adminKey=new PublicKey('DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R');
const pda=(...seeds)=>PublicKey.findProgramAddressSync(seeds,program)[0];
const worldKey=pda(Buffer.from('game_world')), poolKey=pda(Buffer.from('prize_pool'));
const discriminator=(kind,name)=>createHash('sha256').update(`${kind}:${name}`).digest().subarray(0,8);
const meta=(pubkey,isWritable=false,isSigner=false)=>({pubkey,isWritable,isSigner});
const instruction=(name,keys,data=Buffer.alloc(0))=>new TransactionInstruction({programId:program,keys,data:Buffer.concat([discriminator('global',name),data])});
function wallet(flag, expected) {
  const path=value(flag); if(!path) throw Error(`${flag} is required; never paste a secret key into this command.`);
  const key=Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path,'utf8'))));
  if(expected&&!key.publicKey.equals(expected)) throw Error(`${flag} public key does not match the required authority.`);
  return key;
}
function validAccount(info,name) {
  if(!info||!info.owner.equals(program)||!info.data.subarray(0,8).equals(discriminator('account',name))) throw Error(`Invalid ${name} account`);
}
async function world() {
  const info=await conn.getAccountInfo(worldKey); validAccount(info,'GameWorld');
  return {info, legacy:info.data.length===185, pool:new PublicKey(info.data.subarray(125,157)),
    state:info.data.length>=227?decodePrizeWorld(info.data):null};
}
// Durable signed records prevent an ambiguous broadcast from becoming a blind retry.
async function send(ix, signers, label) {
  const prefix=value('--journal'); if(!prefix) throw Error('--journal <local-path-prefix> is required for writes.');
  const path=`${prefix}-${label}.json`;
  if(existsSync(path)) throw Error(`Existing journal ${path}: verify its signature before retrying. Never delete an uncertain transaction record.`);
  const latest=await conn.getLatestBlockhash();
  const tx=new Transaction({...latest,feePayer:signers[0].publicKey}).add(
    ComputeBudgetProgram.requestHeapFrame({bytes:256*1024}),
    ComputeBudgetProgram.setComputeUnitLimit({units:600_000}),ix);
  tx.sign(...signers);
  const simulation=await conn.simulateTransaction(tx);
  if(simulation.value.err) throw Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}\n${simulation.value.logs?.join('\n')}`);
  const signature=encodeBase58(tx.signature);
  const record={label,network:'devnet',program:program.toString(),signature,...latest,state:'signed'};
  writeFileSync(path,JSON.stringify(record,null,2),{flag:'wx',mode:0o600});
  console.log(JSON.stringify(record));
  // Errors leave the signed journal intact; the command deliberately stops.
  await conn.sendRawTransaction(tx.serialize(),{skipPreflight:false,maxRetries:5});
  const confirmation=await conn.confirmTransaction({...latest,signature},'finalized');
  if(confirmation.value.err) throw Error(`Finalized transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  writeFileSync(path,JSON.stringify({...record,state:'finalized'},null,2),{mode:0o600});
  return signature;
}
async function registeredParticipants() {
  const accounts=await conn.getProgramAccounts(program,{filters:[{memcmp:{offset:0,bytes:encodeBase58(discriminator('account','PlayerState'))}}]});
  return accounts.map(({pubkey,account})=>{
    validAccount(account,'PlayerState'); const owner=new PublicKey(operatorPlayerOwner(account.data));
    if(!pda(Buffer.from('player'),owner.toBuffer()).equals(pubkey)) return null;
    const ps=decodeOperatorPlayer(account.data); return BigInt(ps.deposit_amount)>0n?{owner,pubkey}:null;
  }).filter(Boolean).sort((a,b)=>Buffer.compare(a.owner.toBuffer(),b.owner.toBuffer()));
}
async function inspect() {
  const w=await world(); const [pool,legacy,programAccount]=await conn.getMultipleAccountsInfo([poolKey,w.pool,program]);
  const programDataKey=programAccount?.executable ? new PublicKey(programAccount.data.subarray(4,36)) : null;
  const programData=programDataKey?await conn.getAccountInfo(programDataKey):null;
  const data=w.info.data; const participants=await registeredParticipants();
  console.log(JSON.stringify({network:'devnet',world:worldKey.toString(),worldBytes:data.length,
    participants:data.readUInt32LE(32),registeredPlayerAccounts:participants.length,
    participantCountMatches:participants.length===data.readUInt32LE(32),status:data[59],endTimestamp:Number(data.readBigInt64LE(16)),
    recordedPrizeLamports:data.readBigUInt64LE(36).toString(),legacyPool:w.pool.toString(),
    legacyPoolLamports:legacy?.lamports??0,prizePDA:poolKey.toString(),prizePDALamports:pool?.lamports??0,
    programExecutable:programAccount?.executable??false,
    upgradeAuthority:programData?.data[12]===1?new PublicKey(programData.data.subarray(13,45)).toString():null,
    migrationRequired:w.legacy,claimsEnabledInClient:false},null,2));
  return w;
}
await inspect();
if(action==='migrate') {
  const w=await world(); if(!w.legacy) throw Error('Migration requires the 185-byte legacy world.');
  const admin=wallet('--admin-keypair',adminKey);
  const external=!w.pool.equals(poolKey);
  const legacy=external?wallet('--legacy-pool-keypair',w.pool):null;
  const participants=await registeredParticipants();
  const extra=value('--additional-prize-lamports')??'0';
  if(!/^\d+$/.test(extra)) throw Error('Additional prize must be an exact nonnegative lamport integer.');
  const count=Buffer.alloc(4); count.writeUInt32LE(participants.length);
  const amount=Buffer.alloc(8); amount.writeBigUInt64LE(BigInt(extra));
  console.log(JSON.stringify({migrationUniqueParticipants:participants.length,additionalPrizeLamports:extra,
    totalTransferLamports:(w.info.data.readBigUInt64LE(36)+BigInt(extra)).toString()}));
  await send(instruction('migrate_season_prizes',[meta(worldKey,true),meta(adminKey,true,true),
    meta(w.pool,true,external),meta(poolKey,true),meta(SystemProgram.programId),...participants.map(p=>meta(p.pubkey))],
    Buffer.concat([count,...participants.map(p=>p.owner.toBuffer()),amount])),legacy?[admin,legacy]:[admin],'migration');
  await inspect();
} else if(action==='settle') {
  const admin=wallet('--admin-keypair',adminKey); let w=await world();
  if(!w.state) throw Error('Migrate the world before settlement.');
  if(w.state.game_status===2) throw Error('Already ended; do not tally or reset it again.');
  const slot=await conn.getSlot(); const now=await conn.getBlockTime(slot);
  if(now==null||now<w.state.end_timestamp) throw Error('The chain has not reached the season deadline.');
  const participants=await registeredParticipants();
  if(participants.length!==w.state.total_participants) throw Error('Registered account count does not match the season. Reconcile registrations; do not force the tally.');
  if(w.state.game_status===0) await send(instruction('activate_season',[meta(worldKey,true),meta(adminKey,false,true)]),[admin],'activate');
  w=await world(); const cursor=w.info.data.subarray(194,226);
  const remaining=participants.filter(p=>Buffer.compare(p.owner.toBuffer(),cursor)>0);
  if(remaining.length+w.state.finalize_processed!==participants.length) throw Error('Tally cursor/count mismatch.');
  for(let offset=0;offset<remaining.length;offset+=8) {
    const batch=remaining.slice(offset,offset+8); const length=Buffer.alloc(4); length.writeUInt32LE(batch.length);
    await send(instruction('finalize_season_tally',[meta(worldKey,true),meta(adminKey,false,true),...batch.map(p=>meta(p.pubkey))],
      Buffer.concat([length,...batch.map(p=>p.owner.toBuffer())])),[admin],`tally-${w.state.finalize_processed+offset}`);
  }
  await send(instruction('end_season_final',[meta(worldKey,true),meta(adminKey,false,true),meta(poolKey)]),[admin],'end');
  await inspect();
} else if(action==='claim') {
  const player=wallet('--player-keypair'); const owner=player.publicKey; const w=await world();
  if(!w.state) throw Error('World migration required.');
  const playerKey=pda(Buffer.from('player'),owner.toBuffer()); const info=await conn.getAccountInfo(playerKey); validAccount(info,'PlayerState');
  const pool=await conn.getAccountInfo(poolKey); if(!pool||!pool.owner.equals(SystemProgram.programId)) throw Error('Invalid prize vault');
  const spendable=BigInt(pool.lamports)-BigInt(await conn.getMinimumBalanceForRentExemption(0));
  const quote=prizeQuote({world:w.state,player:decodePrizePlayer(info.data),spendable:spendable>0n?spendable:0n});
  if(quote.state!=='claimable') throw Error(`Claim blocked: ${quote.state??quote.phase}`);
  const signature=await send(instruction('claim_prize_v2',[meta(playerKey,true),meta(worldKey,true),meta(poolKey,true),meta(owner,true,true),meta(SystemProgram.programId)]),[player],'claim');
  const tx=await conn.getParsedTransaction(signature,{commitment:'finalized',maxSupportedTransactionVersion:0});
  if(!tx?.meta||tx.meta.err) throw Error('Finalized receipt is not yet available. Verify the journal signature.');
  const paid=(tx.meta.innerInstructions??[]).flatMap(g=>g.instructions).filter(i=>i.programId.equals(SystemProgram.programId)
    &&i.parsed?.type==='transfer'&&i.parsed.info.source===poolKey.toString()&&i.parsed.info.destination===owner.toString())
    .reduce((sum,i)=>sum+BigInt(i.parsed.info.lamports),0n);
  if(paid!==quote.amount) throw Error('Finalized payout did not match the displayed entitlement.');
  console.log(JSON.stringify({state:'received',signature,receivedLamports:paid.toString(),feeLamports:tx.meta.fee,
    explorer:`https://explorer.solana.com/tx/${signature}?cluster=devnet`},null,2));
} else if(action) throw Error('Unknown --execute action; use migrate, settle or claim.');
