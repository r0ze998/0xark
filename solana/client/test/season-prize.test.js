import test from 'node:test';
import assert from 'node:assert/strict';
import { prizeQuote, sol, lamports, effectiveShares, decodePrizeWorld, decodePrizePlayer } from '../src/lib/season-prize.js';
import { createPrizeController } from '../src/lib/prize-controller.js';
import { NETWORK, PROGRAM_ID } from '../src/config.js';
import { deferred, settle } from './helpers/modal-host.js';
function snapshot(count = 60, overrides = {}) {
  return { owner:'wallet-a', spendable:'10000000000', player:{vault:Array.from({length:count},(_,i)=>i+1),deposit_amount:'500000000'},
    world:{game_start_timestamp:100,end_timestamp:200,game_status:2,total_participants:10,finalize_processed:10,total_prize_pool:'10000000000',winner_60_count:2,max_vault:60,max_vault_count:2,tier_totals:['100','80','30','4'],...overrides} };
}
test('lamport arithmetic preserves precision, floor order and normal tier payouts',()=>{
  assert.equal(sol('9007199254740993'),'9007199.254740993');assert.equal(sol('1'),'0.000000001');assert.equal(sol(null),'—');
  assert.throws(()=>lamports(Number.MAX_SAFE_INTEGER+1));assert.throws(()=>lamports(-1));
  assert.equal(prizeQuote(snapshot()).amount,2500000000n);assert.equal(prizeQuote(snapshot(50)).amount,1250000000n);assert.equal(prizeQuote(snapshot(30)).amount,562500000n);
});
test('timeout champions receive one share and empty bands carry downwards',()=>{
  const s=snapshot(59,{winner_60_count:0,max_vault:59,max_vault_count:2,tier_totals:['0','80','30','4']});
  assert.equal(prizeQuote(s).amount,2500000000n);assert.equal(prizeQuote(s).tier,1);assert.deepEqual(prizeQuote(s).shares,[50,0,40,8,2]);
  s.player.vault=s.player.vault.slice(0,30);assert.equal(prizeQuote(s).amount,1500000000n);
  assert.deepEqual(effectiveShares([true,false,false,false,false]),[50,0,0,0,0]);
  for(let mask=0;mask<32;mask++){const pop=Array.from({length:5},(_,i)=>!!(mask&(1<<i)));const shares=effectiveShares(pop);assert.ok(shares.reduce((a,b)=>a+b,0)<=100);shares.forEach((n,i)=>{if(!pop[i])assert.equal(n,0);});}
});
test('unsettled, consumed, incomplete and underfunded claims cannot be offered',()=>{
  assert.equal(prizeQuote(snapshot(60,{game_status:1,finalize_processed:0}),150).phase,'active');
  assert.equal(prizeQuote(snapshot(60,{game_status:1}),250).amount,null);assert.throws(()=>prizeQuote(snapshot(60,{finalize_processed:9})));
  const s=snapshot();s.player.deposit_amount='0';assert.equal(prizeQuote(s).state,'closed');s.player=null;assert.equal(prizeQuote(s).state,'ineligible');
  const low=snapshot();low.spendable='1';assert.equal(prizeQuote(low).state,'underfunded');assert.equal(prizeQuote(low).entitlement,2500000000n);
});
test('Borsh reads both queue variants, exact u64 values and rejects corrupt or legacy accounts',()=>{
  for(const queue of [0,1]){const data=new Uint8Array(270),off=queue?202:170;data[169]=queue;data[off]=1;data[off+7]=8;new DataView(data.buffer).setBigUint64(off+8,500000000n,true);assert.deepEqual(decodePrizePlayer(data),{vault:[1,60],deposit_amount:'500000000'});data[off+7]=128;assert.throws(()=>decodePrizePlayer(data));}
  const b=new Uint8Array(227),v=new DataView(b.buffer);v.setBigUint64(36,9007199254740993n,true);b[59]=2;b[58]=3;b[185]=60;v.setUint32(186,3,true);v.setUint32(190,20,true);v.setBigUint64(84,4n,true);
  const w=decodePrizeWorld(b);assert.equal(w.total_prize_pool,'9007199254740993');assert.equal(w.max_vault_count,3);assert.equal(w.finalize_processed,20);assert.equal(w.tier_totals[3],'4');assert.throws(()=>decodePrizeWorld(b.slice(0,226)));
});
function host(){
  let owner='wallet-a',view;const values=new Map();
  const record={signature:'2'.repeat(88),owner,season:'100',network:NETWORK,program:PROGRAM_ID,lastValidBlockHeight:1000};
  const api={getPrizeSnapshot:async()=>snapshot(),getPrizeReceipt:async()=>({state:'pending'}),submitPrizeClaim:async(_s,{onSigned})=>{onSigned(record);return record;}};
  const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  return {api,storage,values,record,create:()=>createPrizeController({owner:'wallet-a',getOwner:()=>owner,api,storage,onChange:v=>{view=v;}}),get view(){return view;},setOwner:v=>{owner=v;}};
}
test('uncertain signed claims survive reload and block another submission',async()=>{
  const h=host();let submits=0;h.api.submitPrizeClaim=async(_s,{onSigned})=>{submits++;onSigned(h.record);throw Error('RPC offline');};
  const a=h.create();await a.refresh();await a.claim();a.dispose();const b=h.create();await b.refresh();await b.claim();assert.equal(submits,1);assert.equal(h.view.receipt.state,'pending');
  h.api.getPrizeReceipt=async()=>({state:'received',amount:'2500000000',fee:'5000'});await b.refresh();assert.equal(h.view.receipt.state,'received');await b.claim();assert.equal(submits,1);
});
test('rejection and finalized failure permit only an explicit refreshed retry',async()=>{
  const h=host(),c=h.create();let submits=0;h.api.submitPrizeClaim=async()=>{submits++;throw Error('Wallet rejected');};await c.refresh();await c.claim();await c.claim();assert.equal(submits,1);
  await c.refresh();h.api.submitPrizeClaim=async(_s,{onSigned})=>{submits++;onSigned(h.record);};h.api.getPrizeReceipt=async()=>({state:'failed'});await c.claim();assert.equal(h.view.receipt.state,'failed');await c.claim();assert.equal(submits,3);
});
test('double clicks, disposal, wallet changes and unavailable storage are safe',async()=>{
  const h=host(),hold=deferred();let sent=0;h.api.submitPrizeClaim=async(_s,{isCurrent,onSigned})=>{await hold.promise;if(!isCurrent())return;onSigned(h.record);sent++;};const c=h.create();await c.refresh();const one=c.claim(),two=c.claim();c.dispose();hold.resolve();await Promise.all([one,two]);assert.equal(sent,0);
  const h2=host(),c2=h2.create();await c2.refresh();h2.setOwner('wallet-b');await c2.claim();assert.equal(h2.values.size,0);
  const h3=host();h3.storage.setItem=()=>{throw Error('Storage blocked');};const c3=h3.create();await c3.refresh();await c3.claim();assert.match(h3.view.error,/Storage blocked/);
});
test('a stale receipt read cannot replace a newer successful verification',async()=>{
  const h=host(),c=h.create();await c.refresh();await c.claim();const slow=deferred();h.api.getPrizeReceipt=()=>slow.promise;const old=c.refresh();await settle();h.api.getPrizeReceipt=async()=>({state:'received',amount:'2500000000'});await c.refresh();slow.resolve({state:'failed'});await old;assert.equal(h.view.receipt.state,'received');
});

test('practice examples never read a live wallet or enable a real claim',async()=>{
  const {createModalHost}=await import('./helpers/modal-host.js');const h=createModalHost();
  globalThis.document=h.document;globalThis.window={oxarkPreview:true,oxarkWallet:{getPublicKey:()=>{throw Error('live wallet read');}}};
  const screen=await import('../src/components/prize-screen.js');screen.mount(h.container,{playerState:{vault:[1,2,3]}});
  assert.match(h.container.innerHTML,/3 \/ 60 unique cards/);assert.equal(h.container.querySelector('#prize-claim').disabled,true);
  const select=h.container.querySelector('#prize-example');select.value='received';select.listeners.get('change')[0]();
  assert.match(h.container.innerHTML,/Example: prize received/);assert.match(h.container.innerHTML,/2.5/);assert.equal(h.container.querySelector('#prize-claim').disabled,true);
  screen.unmount(h.container);delete globalThis.document;delete globalThis.window;
});
