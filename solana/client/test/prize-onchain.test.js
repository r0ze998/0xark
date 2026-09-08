import { encodeBase58, decodeBase58 } from '../src/lib/base58.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PROGRAM_ID } from '../src/config.js';
const enc = new TextEncoder();
class Key { constructor(v){this.v=String(v);} toString(){return this.v;} toBytes(){return enc.encode(this.v);} static findProgramAddressSync(seeds){return [new Key(new TextDecoder().decode(seeds[0])),1];} }
let rpc;
class Transaction { add(...ix){this.instructions=ix;} serialize(){return new Uint8Array([1]);} }
globalThis.solanaWeb3={PublicKey:Key,Connection:class{constructor(){return rpc;}},Transaction,
  TransactionInstruction:class{constructor(v){Object.assign(this,v);}},SystemProgram:{programId:new Key('system')}};
const provider={isConnected:true,publicKey:new Key('wallet-a'),signTransaction:async tx=>{tx.signature=new Uint8Array(64);return tx;}};
globalThis.window={oxarkWallet:{provider}};
const {getPrizeSnapshot,sendPrizeClaimTransaction:submitPrizeClaim,getPrizeReceipt,submitPrizeClaim:guardedClaim}=await import('../src/onchain/prizes.js');
const disc=name=>createHash('sha256').update(name).digest().subarray(0,8);
function accounts(){
  const w=new Uint8Array(227),v=new DataView(w.buffer);w.set(disc('account:GameWorld'));v.setBigInt64(8,100n,true);w[59]=2;w[58]=1;v.setUint32(32,1,true);v.setUint32(190,1,true);v.setBigUint64(36,10000000000n,true);
  const p=new Uint8Array(270);p.set(disc('account:PlayerState'));p.fill(255,170,177);p[177]=15;new DataView(p.buffer).setBigUint64(178,500000000n,true);
  return [{owner:new Key(PROGRAM_ID),data:w},{owner:new Key(PROGRAM_ID),data:p},{owner:new Key('system'),lamports:10000000000}];
}
let data=accounts(),sends=0,stored=false;
rpc={getMultipleAccountsInfoAndContext:async()=>({value:data,context:{slot:42}}),getMinimumBalanceForRentExemption:async()=>890880,
 getLatestBlockhash:async()=>({blockhash:'block',lastValidBlockHeight:100}),simulateTransaction:async()=>({value:{err:null}}),
 sendRawTransaction:async()=>{assert.equal(stored,true);sends++;throw Error('broadcast response lost');},
 getSignatureStatuses:async()=>({value:[{confirmationStatus:'finalized',err:null}]}),getBlockHeight:async()=>101};
const record={signature:'1'.repeat(64),owner:'wallet-a',season:'100',lastValidBlockHeight:100};
function tx(){return {blockTime:200,transaction:{message:{accountKeys:[{pubkey:new Key('wallet-a'),signer:true}],instructions:[{programId:new Key(PROGRAM_ID),data:encodeBase58(disc('global:claim_prize_v2'))}]}},meta:{err:null,fee:5000,innerInstructions:[{index:0,instructions:[{programId:new Key('system'),parsed:{type:'transfer',info:{source:'prize_pool',destination:'wallet-a',lamports:5000000000}}}]}]}};}
test('snapshot verifies account ownership, discriminator and exact layout',async()=>{
  const s=await getPrizeSnapshot('wallet-a');assert.equal(s.player.vault.length,60);assert.equal(s.spendable,'9999109120');assert.equal(s.slot,42);
  data[0].data[0]^=1;await assert.rejects(getPrizeSnapshot('wallet-a'),/Invalid GameWorld/);data=accounts();
  data[2].owner=new Key('other');await assert.rejects(getPrizeSnapshot('wallet-a'),/vault unavailable/);data=accounts();
});
test('signature is durable before sending, and an ambiguous broadcast retains it',async()=>{
  stored=false;sends=0;const s=await getPrizeSnapshot('wallet-a');
  const r=await submitPrizeClaim(s,{isCurrent:()=>true,onSigned:value=>{assert.equal(value.owner,'wallet-a');stored=true;}});
  assert.equal(r.signature,record.signature);assert.equal(sends,1);
  stored=false;await assert.rejects(submitPrizeClaim(s,{isCurrent:()=>true,onSigned:()=>{throw Error('storage unavailable');}}),/storage unavailable/);assert.equal(sends,1);
});
test('wallet or mount changed during signing cannot broadcast',async()=>{
  const original=provider.signTransaction;let active=true;provider.signTransaction=async tx=>{tx.signature=new Uint8Array(64);active=false;return tx;};
  const before=sends;await assert.rejects(submitPrizeClaim(await getPrizeSnapshot('wallet-a'),{isCurrent:()=>active,onSigned:()=>{}}),/screen changed/);assert.equal(sends,before);provider.signTransaction=original;
});
test('receipt requires finalized successful game claim and exact pool-to-wallet transfer',async()=>{
  rpc.getParsedTransaction=async()=>tx();assert.deepEqual(await getPrizeReceipt(record),{state:'received',amount:'5000000000',fee:'5000',signature:record.signature});
  rpc.getParsedTransaction=async()=>{const t=tx();t.meta.innerInstructions[0].instructions[0].parsed.info.destination='other';return t;};await assert.rejects(getPrizeReceipt(record),/not found/);
  rpc.getParsedTransaction=async()=>{const t=tx();t.transaction.message.instructions[0].programId=new Key('other');return t;};await assert.rejects(getPrizeReceipt(record),/not a prize claim/);
  rpc.getSignatureStatuses=async()=>({value:[{confirmationStatus:'confirmed',err:null}]});assert.equal((await getPrizeReceipt(record)).state,'pending');
  rpc.getSignatureStatuses=async()=>({value:[{confirmationStatus:'finalized',err:{InstructionError:[0,'failed']}}]});assert.equal((await getPrizeReceipt(record)).state,'failed');
  rpc.getSignatureStatuses=async()=>({value:[null]});assert.equal((await getPrizeReceipt(record)).state,'expired');
});

test('release gate blocks the public claim adapter before wallet or RPC work', async()=>{ const before=sends;await assert.rejects(guardedClaim(null,{}),/not open/);assert.equal(sends,before); });

test('base58 vectors retain leading zeros and encode instruction bytes without SDK internals',()=>{
  for (const [bytes,text] of [[[], ''],[[0,0,1],'112'],[[0,0],'11'],[[1],'2'],[[255],'5Q']]) {
    assert.equal(encodeBase58(Uint8Array.from(bytes)),text);
    assert.deepEqual([...decodeBase58(text)],bytes);
  }
  const bytes=Uint8Array.from({length:64},(_,i)=>i*3);assert.deepEqual(decodeBase58(encodeBase58(bytes)),bytes);
  assert.equal(encodeBase58(new TextEncoder().encode('hello world')),'StV1DL6CwTryKyV');
  assert.throws(()=>decodeBase58('0OIl'));assert.throws(()=>decodeBase58('1'.repeat(129)));
});
