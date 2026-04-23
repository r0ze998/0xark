'use strict';
/**
 * v3.0-plus ability handler unit tests
 * Tests CARD_V3 metadata, canBurnCard, and all 12 ability handlers.
 * Run: node tests/v3-plus-abilities.test.js
 */

const assert = require('node:assert/strict');

// ─── Test runner ────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); failed++; }
}
function suite(name, fn) { console.log(`\n${name}`); fn(); }

// ─── Minimal stub for getLoreCardName (used by handlers) ────────────────────
function getLoreCardName(id) { return `Card#${id}`; }

// ─── Inline CARD_V3 subset (mirrors 02-data.js) ─────────────────────────────
const C=0,U=1,R=2,L=3;
const BF=0,SB=1,HB=2,IC=3,NS=4;
const CARD_V3_DATA=[
  [BF,C,3,2,3,'self_burn_common_for_bp_boost'],  // 1
  [BF,C,3,2,2,null],[BF,C,4,2,3,null],[BF,C,3,2,1,null],
  [BF,C,2,2,2,'hand_burn_on_destroy'],             // 5
  [BF,C,4,3,1,null],
  [SB,C,1,3,0,'evolve_cost_reduction'],            // 7
  [SB,C,2,3,1,'clan_evolve'],                      // 8
  [SB,C,4,4,1,null],[SB,C,2,3,0,null],[SB,C,3,3,2,null],[SB,C,3,2,3,null],
  [HB,C,3,3,1,'veteran_imprint_trigger'],          // 13
  [HB,C,4,4,1,null],[HB,C,2,3,2,null],
  [HB,C,2,2,3,'burn_count_scaler'],                // 16
  [HB,C,3,2,1,null],[HB,C,4,3,2,null],
  [IC,C,2,3,1,null],[IC,C,3,4,1,null],[IC,C,3,5,1,null],[IC,C,2,4,0,null],
  [IC,C,3,4,2,'imprint_self_scale'],               // 23
  [IC,C,2,3,2,'owner_history_scaler'],             // 24
  [NS,C,2,2,3,'ransom_steal'],                     // 25
  [NS,C,2,2,2,null],
  [NS,C,3,2,3,'on_destroy_imprint_souls'],         // 27
  [NS,C,3,2,4,null],[NS,C,2,2,1,null],[NS,C,2,2,2,null],
  [BF,U,5,4,3,null],[BF,U,6,3,2,null],[BF,U,7,3,3,null],[BF,U,4,3,2,null],
  [SB,U,3,4,2,'clan_evolve_imprint'],              // 35
  [SB,U,5,3,2,null],[SB,U,4,4,1,null],[SB,U,6,4,2,null],
  [HB,U,5,5,2,null],
  [HB,U,6,6,1,null],                              // 40 Day23 bp6
  [HB,U,4,3,3,null],
  [IC,U,6,5,1,null],[IC,U,5,6,1,null],
  [IC,U,6,5,2,null],                              // 44 Day23 bp6
  [NS,U,5,3,4,null],
  [NS,U,4,3,4,'battle_steal_probability'],         // 46
  [NS,U,4,3,3,null],[NS,U,4,3,3,null],
  [BF,R,8,5,4,null],[HB,R,9,6,2,null],[NS,R,5,4,5,null],[null,R,6,5,3,null],
  [NS,R,0,0,0,null],[null,R,0,0,0,null],
  [HB,L,5,5,5,'hand_peek_steal'],                 // 55 Day23 bp5/hp5
  [NS,L,0,15,4,null],[IC,L,7,10,0,null],[SB,L,5,7,5,null],
];
const CARD_V3 = {};
for (let i=0;i<CARD_V3_DATA.length;i++) {
  const [clan,rar,bp,hp,ini,ab]=CARD_V3_DATA[i];
  CARD_V3[i+1]={clan,rar,bp,hp,ini,ab};
}

function canBurnCard(id) { const v=CARD_V3[id]; return v&&v.rar<2; }
function isLegendary(id) { const v=CARD_V3[id]; return v&&v.rar===3; }

// ─── Ability handlers (inline copy matching 02-data.js) ─────────────────────
const CARD_V3_ABILITY_HANDLERS = {
  self_burn_common_for_bp_boost(ctx) {
    const{duel_state,owner_idx,events}=ctx;
    const hand=duel_state.hands[owner_idx];
    const ci=hand.findIndex(id=>id>0&&CARD_V3[id]?.rar===0);
    if(ci<0)return;
    const burned=hand[ci];hand[ci]=0;
    duel_state.burn_counts[owner_idx]=(duel_state.burn_counts[owner_idx]||0)+1;
    duel_state.bp_bonus[owner_idx]=(duel_state.bp_bonus[owner_idx]||0)+3;
    events.push({type:'v3_burn',who:owner_idx,card_id:burned,source:1});
  },
  hand_burn_on_destroy(ctx) {
    const{duel_state,owner_idx,events}=ctx;
    const opp=owner_idx===0?1:0;
    const hand=duel_state.hands[opp];
    const commons=hand.map((id,i)=>({id,i})).filter(({id})=>id>0&&CARD_V3[id]?.rar===0);
    if(!commons.length)return;
    const pick=commons[0];hand[pick.i]=0;
    duel_state.burn_counts[opp]=(duel_state.burn_counts[opp]||0)+1;
    events.push({type:'v3_burn',who:opp,card_id:pick.id,source:5});
  },
  evolve_cost_reduction(ctx) {
    const{duel_state,owner_idx}=ctx;
    duel_state.evolve_discount[owner_idx]=Math.max(0,(duel_state.evolve_discount[owner_idx]||0)+1);
  },
  clan_evolve(ctx) {
    const{duel_state,owner_idx,events}=ctx;
    const hand=duel_state.hands[owner_idx];
    const ci=hand.findIndex(id=>id>0&&CARD_V3[id]?.rar===0&&CARD_V3[id]?.clan===1);
    if(ci<0)return;
    const sacrificed=hand[ci];hand[ci]=0;
    const sbU=[35,36,37,38];
    const drawn=sbU[0];
    const empty=hand.findIndex(id=>id===0);
    if(empty>=0)hand[empty]=drawn;
    duel_state.burn_counts[owner_idx]=(duel_state.burn_counts[owner_idx]||0)+1;
    events.push({type:'v3_evolve',who:owner_idx,sacrificed,drawn,source:8});
  },
  veteran_imprint_trigger(ctx) {
    const{history,card_id,events}=ctx;
    if(!history)return;
    const dc=history.times_destroyed||0;
    if(dc>0&&dc%5===0)events.push({type:'v3_imprint',card_id,imprint_key:'Veteran',value:1});
  },
  burn_count_scaler(ctx) {
    const{duel_state,owner_idx,events}=ctx;
    const total=(duel_state.burn_counts[0]||0)+(duel_state.burn_counts[1]||0);
    if(total>0){duel_state.bp_bonus[owner_idx]=(duel_state.bp_bonus[owner_idx]||0)+total;events.push({type:'v3_stat',who:owner_idx,source:16});}
  },
  imprint_self_scale(ctx) {
    const{history,duel_state,owner_idx,events}=ctx;
    if(!history)return;
    const stat=(history.imprints||[]).filter(i=>!i.is_cosmetic&&i.value>0).length;
    const bonus=Math.min(3,stat);
    if(bonus>0){duel_state.bp_bonus[owner_idx]=(duel_state.bp_bonus[owner_idx]||0)+bonus;events.push({type:'v3_stat',who:owner_idx,source:23});}
  },
  owner_history_scaler(ctx) {
    const{duel_state,owner_idx,events,target_card_id}=ctx;
    if(!target_card_id)return;
    const hist=duel_state.owner_histories?.[target_card_id]||[];
    const draws=Math.min(3,hist.filter(pk=>pk&&pk!=='11111111111111111111111111111111').length);
    for(let i=0;i<draws;i++){
      const pool=duel_state.deck[owner_idx];
      if(pool&&pool.length){const drawn=pool.splice(0,1)[0];duel_state.hands[owner_idx].push(drawn);events.push({type:'draw',who:owner_idx,card_id:drawn});}
    }
  },
  ransom_steal(ctx) {
    const{duel_state,owner_idx,events}=ctx;
    const opp=owner_idx===0?1:0;
    const visible=duel_state.hands[opp].filter(id=>id>0);
    if(!visible.length)return;
    const peeked=visible[0];
    duel_state.ransom_target=duel_state.ransom_target||{};
    duel_state.ransom_target[owner_idx]={card_id:peeked,chance:0.25};
    events.push({type:'v3_peek',who:owner_idx,card_id:peeked,source:25});
  },
  on_destroy_imprint_souls(ctx) {
    const{duel_state,owner_idx,events,history}=ctx;
    const opp=owner_idx===0?1:0;
    const field=duel_state.field[opp];
    if(!field||!field.length)return;
    const ti=field.findIndex(id=>id>0);
    if(ti<0)return;
    const killed=field[ti];field[ti]=0;
    if(history)history.souls_collected=(history.souls_collected||0)+1;
    events.push({type:'v3_destroy',who:opp,card_id:killed,source:27});
  },
  clan_evolve_imprint(ctx) {
    CARD_V3_ABILITY_HANDLERS.clan_evolve(ctx);
    const{history,events,card_id}=ctx;
    if(!history)return;
    const ec=history.evolve_trigger_count||0;
    if(ec>0&&ec%3===0)events.push({type:'v3_imprint',card_id,imprint_key:'Evolved',value:1});
  },
  battle_steal_probability(ctx) {
    const{duel_state,owner_idx,events,is_gold_hall,_force_roll}=ctx;
    const opp=owner_idx===0?1:0;
    const field=duel_state.field[opp];
    if(!field||!field.length)return;
    const target=field.filter(id=>id>0).sort((a,b)=>(CARD_V3[b]?.bp||0)-(CARD_V3[a]?.bp||0))[0];
    if(!target)return;
    const leg=isLegendary(target);
    const chance=(is_gold_hall&&leg)?0.75:0.5;
    const permanent=is_gold_hall&&leg;
    const roll=_force_roll!==undefined?_force_roll:Math.random();
    if(roll<chance)events.push({type:'steal_get',who:owner_idx,card_id:target,steal_type:permanent?'permanent':'lease',source:46});
  },
  hand_peek_steal(ctx) {
    const{duel_state,owner_idx,events,is_gold_hall}=ctx;
    const opp=owner_idx===0?1:0;
    const visible=duel_state.hands[opp].filter(id=>id>0);
    if(!visible.length)return;
    const stolen=visible[0];
    const st=is_gold_hall?'permanent':'lease';
    events.push({type:'steal_get',who:owner_idx,card_id:stolen,steal_type:st,source:55});
    events.push({type:'v3_peek_all',who:owner_idx,hand:visible.slice(),source:55});
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeDuelState() {
  return {
    hands:[[ 3, 4, 9,10, 0, 0],[11,12, 0, 0, 0, 0]],
    field:[[],[]],
    deck :[[30,29,28],[27,26,25]],
    burn_counts:[0,0],
    bp_bonus:[0,0],
    evolve_discount:[0,0],
    owner_histories:{},
    leases:[],
    ransom_target:null,
  };
}
function makeCtx(owner_idx=0, overrides={}) {
  return { duel_state:makeDuelState(), owner_idx, events:[], history:null, is_gold_hall:false, ...overrides };
}

// ═══════════════════════════════════════════════════════════════════════
suite('CARD_V3 metadata', () => {
  test('total 58 entries (1-58)', () => assert.equal(Object.keys(CARD_V3).length, 58));
  test('card #1 is Common BF bp3', () => { const v=CARD_V3[1]; assert.equal(v.rar,C); assert.equal(v.clan,BF); assert.equal(v.bp,3); });
  test('card #40 Oathsworn bp=6 (Day23 patch)', () => assert.equal(CARD_V3[40].bp, 6));
  test('card #44 Highland bp=6 (Day23 patch)', () => assert.equal(CARD_V3[44].bp, 6));
  test('card #55 Sceptre bp=5 hp=5 (Day23 patch)', () => { assert.equal(CARD_V3[55].bp,5); assert.equal(CARD_V3[55].hp,5); });
  test('Legendaries are #55-58', () => [55,56,57,58].forEach(id=>assert.equal(CARD_V3[id].rar,L)));
  test('ability keys assigned to 13 cards (12 replacements + Sceptre extension)', () => {
    const withAb=Object.values(CARD_V3).filter(v=>v.ab!==null).length;
    assert.equal(withAb, 13);
  });
});

suite('canBurnCard()', () => {
  test('Common(0) → burnable',   () => assert.ok(canBurnCard(1)));
  test('Uncommon(1) → burnable', () => assert.ok(canBurnCard(35)));
  test('Rare(2) → NOT burnable', () => assert.ok(!canBurnCard(49)));
  test('Legendary(3) → NOT burnable', () => assert.ok(!canBurnCard(55)));
});

suite('#1 Powder-Charge Boarder — self_burn_common_for_bp_boost', () => {
  test('burns a Common from own hand and grants +3 BP', () => {
    const ctx=makeCtx(0);
    ctx.duel_state.hands[0]=[3,4,9,10,0,0]; // 3,4=Commons (rar=0)
    CARD_V3_ABILITY_HANDLERS.self_burn_common_for_bp_boost(ctx);
    assert.equal(ctx.duel_state.bp_bonus[0], 3);
    assert.equal(ctx.duel_state.burn_counts[0], 1);
    assert.equal(ctx.events[0].type, 'v3_burn');
  });
  test('no-op when hand has no Commons', () => {
    const ctx=makeCtx(0);
    ctx.duel_state.hands[0]=[49,50,0,0,0,0]; // Rares
    CARD_V3_ABILITY_HANDLERS.self_burn_common_for_bp_boost(ctx);
    assert.equal(ctx.duel_state.bp_bonus[0], 0);
    assert.equal(ctx.events.length, 0);
  });
});

suite('#5 Flare Saboteur — hand_burn_on_destroy', () => {
  test('burns a Common from opponent hand', () => {
    const ctx=makeCtx(0);
    ctx.duel_state.hands[1]=[11,12,0,0,0,0]; // SB Commons (rar=0)
    CARD_V3_ABILITY_HANDLERS.hand_burn_on_destroy(ctx);
    assert.equal(ctx.duel_state.burn_counts[1], 1);
    assert.equal(ctx.events[0].type, 'v3_burn');
    assert.equal(ctx.events[0].who, 1);
  });
  test('no-op when opponent hand empty', () => {
    const ctx=makeCtx(0);
    ctx.duel_state.hands[1]=[0,0,0,0,0,0];
    CARD_V3_ABILITY_HANDLERS.hand_burn_on_destroy(ctx);
    assert.equal(ctx.events.length, 0);
  });
});

suite('#7 Novice Minter — evolve_cost_reduction', () => {
  test('increments evolve_discount for owner', () => {
    const ctx=makeCtx(0);
    CARD_V3_ABILITY_HANDLERS.evolve_cost_reduction(ctx);
    assert.equal(ctx.duel_state.evolve_discount[0], 1);
  });
  test('stacks additively on multiple activations', () => {
    const ctx=makeCtx(0);
    CARD_V3_ABILITY_HANDLERS.evolve_cost_reduction(ctx);
    CARD_V3_ABILITY_HANDLERS.evolve_cost_reduction(ctx);
    assert.equal(ctx.duel_state.evolve_discount[0], 2);
  });
});

suite('#8 Coin Reforger — clan_evolve', () => {
  test('sacrifices SB Common and adds SB Uncommon to hand', () => {
    const ctx=makeCtx(0);
    ctx.duel_state.hands[0]=[7,8,0,0,0,0]; // 7,8 are SB Commons
    CARD_V3_ABILITY_HANDLERS.clan_evolve(ctx);
    assert.equal(ctx.duel_state.burn_counts[0], 1);
    const ev=ctx.events.find(e=>e.type==='v3_evolve');
    assert.ok(ev, 'v3_evolve event emitted');
    assert.ok([35,36,37,38].includes(ev.drawn), 'drawn card is SB Uncommon');
  });
  test('no-op when no SB Commons in hand', () => {
    const ctx=makeCtx(0);
    ctx.duel_state.hands[0]=[1,2,0,0,0,0]; // BF cards
    CARD_V3_ABILITY_HANDLERS.clan_evolve(ctx);
    assert.equal(ctx.events.length, 0);
  });
});

suite('#13 Oath-Branded Squire — veteran_imprint_trigger', () => {
  test('grants Veteran Imprint at destroy count=5', () => {
    const ctx=makeCtx(0,{card_id:13,history:{times_destroyed:5,imprints:[]}});
    CARD_V3_ABILITY_HANDLERS.veteran_imprint_trigger(ctx);
    const ev=ctx.events.find(e=>e.type==='v3_imprint'&&e.imprint_key==='Veteran');
    assert.ok(ev);
    assert.equal(ev.value, 1);
  });
  test('no imprint at destroy count=4', () => {
    const ctx=makeCtx(0,{card_id:13,history:{times_destroyed:4,imprints:[]}});
    CARD_V3_ABILITY_HANDLERS.veteran_imprint_trigger(ctx);
    assert.equal(ctx.events.length, 0);
  });
  test('triggers again at count=10', () => {
    const ctx=makeCtx(0,{card_id:13,history:{times_destroyed:10,imprints:[]}});
    CARD_V3_ABILITY_HANDLERS.veteran_imprint_trigger(ctx);
    assert.equal(ctx.events.length, 1);
  });
});

suite('#16 Herald of Ashes — burn_count_scaler', () => {
  test('+N BP for N burns this duel', () => {
    const ctx=makeCtx(0);
    ctx.duel_state.burn_counts=[2,1]; // 3 total
    CARD_V3_ABILITY_HANDLERS.burn_count_scaler(ctx);
    assert.equal(ctx.duel_state.bp_bonus[0], 3);
  });
  test('no-op when no burns yet', () => {
    const ctx=makeCtx(0);
    CARD_V3_ABILITY_HANDLERS.burn_count_scaler(ctx);
    assert.equal(ctx.events.length, 0);
  });
});

suite('#23 Ancestral Ranger — imprint_self_scale', () => {
  test('+1 BP per stat imprint (max +3)', () => {
    const imprints=[
      {is_cosmetic:false,value:1},{is_cosmetic:false,value:1},{is_cosmetic:false,value:1},
      {is_cosmetic:true,value:0},
    ];
    const ctx=makeCtx(0,{card_id:23,history:{imprints}});
    CARD_V3_ABILITY_HANDLERS.imprint_self_scale(ctx);
    assert.equal(ctx.duel_state.bp_bonus[0], 3);
  });
  test('caps at +3 even with 5 stat imprints', () => {
    const imprints=Array(5).fill({is_cosmetic:false,value:1});
    const ctx=makeCtx(0,{card_id:23,history:{imprints}});
    CARD_V3_ABILITY_HANDLERS.imprint_self_scale(ctx);
    assert.equal(ctx.duel_state.bp_bonus[0], 3);
  });
  test('cosmetic imprints excluded from bonus', () => {
    const imprints=Array(5).fill({is_cosmetic:true,value:0});
    const ctx=makeCtx(0,{card_id:23,history:{imprints}});
    CARD_V3_ABILITY_HANDLERS.imprint_self_scale(ctx);
    assert.equal(ctx.duel_state.bp_bonus[0], 0);
  });
});

suite('#24 Lineage Scout — owner_history_scaler', () => {
  test('draws 1 card per non-null owner (max 3)', () => {
    const ctx=makeCtx(0,{target_card_id:24});
    const owners=['AAAA','BBBB','CCCC','DDDD'];
    ctx.duel_state.owner_histories[24]=owners;
    ctx.duel_state.deck[0]=[3,4,5,6];
    const initHandLen=ctx.duel_state.hands[0].filter(x=>x>0).length;
    CARD_V3_ABILITY_HANDLERS.owner_history_scaler(ctx);
    const draws=ctx.events.filter(e=>e.type==='draw').length;
    assert.equal(draws, 3); // capped at 3
  });
  test('no draws when owner_history empty', () => {
    const ctx=makeCtx(0,{target_card_id:24});
    ctx.duel_state.owner_histories[24]=[];
    CARD_V3_ABILITY_HANDLERS.owner_history_scaler(ctx);
    assert.equal(ctx.events.length, 0);
  });
});

suite('#25 Shadow Lifter — ransom_steal', () => {
  test('peeks a card and sets 25% ransom target', () => {
    const ctx=makeCtx(0);
    ctx.duel_state.hands[1]=[11,12,0,0,0,0];
    CARD_V3_ABILITY_HANDLERS.ransom_steal(ctx);
    assert.equal(ctx.events[0].type, 'v3_peek');
    assert.equal(ctx.duel_state.ransom_target[0].chance, 0.25);
  });
  test('no-op when opponent hand empty', () => {
    const ctx=makeCtx(0);
    ctx.duel_state.hands[1]=[0,0,0,0,0,0];
    CARD_V3_ABILITY_HANDLERS.ransom_steal(ctx);
    assert.equal(ctx.events.length, 0);
  });
});

suite('#27 Soul-Binder — on_destroy_imprint_souls', () => {
  test('destroys opposing field card and increments souls_collected', () => {
    const ctx=makeCtx(0,{card_id:27,history:{souls_collected:0,imprints:[]}});
    ctx.duel_state.field[1]=[11,0];
    CARD_V3_ABILITY_HANDLERS.on_destroy_imprint_souls(ctx);
    assert.equal(ctx.history.souls_collected, 1);
    assert.equal(ctx.events[0].type, 'v3_destroy');
    assert.equal(ctx.events[0].card_id, 11);
  });
  test('no-op when opponent field empty', () => {
    const ctx=makeCtx(0,{card_id:27,history:{souls_collected:0}});
    ctx.duel_state.field[1]=[];
    CARD_V3_ABILITY_HANDLERS.on_destroy_imprint_souls(ctx);
    assert.equal(ctx.events.length, 0);
  });
});

suite('#35 Mint Master — clan_evolve_imprint', () => {
  test('performs clan_evolve AND emits Evolved imprint at evolve_trigger_count=3', () => {
    const ctx=makeCtx(0,{card_id:35,history:{evolve_trigger_count:3,imprints:[]}});
    ctx.duel_state.hands[0]=[7,8,0,0,0,0]; // SB Commons
    CARD_V3_ABILITY_HANDLERS.clan_evolve_imprint(ctx);
    assert.ok(ctx.events.find(e=>e.type==='v3_evolve'), 'evolve event');
    assert.ok(ctx.events.find(e=>e.type==='v3_imprint'&&e.imprint_key==='Evolved'), 'imprint event');
  });
  test('no imprint at evolve_trigger_count=2', () => {
    const ctx=makeCtx(0,{card_id:35,history:{evolve_trigger_count:2,imprints:[]}});
    ctx.duel_state.hands[0]=[7,8,0,0,0,0];
    CARD_V3_ABILITY_HANDLERS.clan_evolve_imprint(ctx);
    assert.ok(!ctx.events.find(e=>e.type==='v3_imprint'));
  });
});

suite('#46 Soul-Thief — battle_steal_probability', () => {
  test('Lease-steal at 50% roll (forced win)', () => {
    const ctx=makeCtx(0,{_force_roll:0.3});
    ctx.duel_state.field[1]=[11,0];
    CARD_V3_ABILITY_HANDLERS.battle_steal_probability(ctx);
    const ev=ctx.events.find(e=>e.type==='steal_get');
    assert.ok(ev);
    assert.equal(ev.steal_type, 'lease');
  });
  test('no steal on losing roll (>50%)', () => {
    const ctx=makeCtx(0,{_force_roll:0.6});
    ctx.duel_state.field[1]=[11,0];
    CARD_V3_ABILITY_HANDLERS.battle_steal_probability(ctx);
    assert.equal(ctx.events.length, 0);
  });
  test('Gold Hall + Legendary → 75% chance + permanent', () => {
    const ctx=makeCtx(0,{is_gold_hall:true,_force_roll:0.7});
    ctx.duel_state.field[1]=[55,0]; // Legendary Sceptre
    CARD_V3_ABILITY_HANDLERS.battle_steal_probability(ctx);
    const ev=ctx.events.find(e=>e.type==='steal_get');
    assert.ok(ev);
    assert.equal(ev.steal_type, 'permanent');
  });
});

suite('#55 Sceptre of Valerius — hand_peek_steal', () => {
  test('Bronze/Silver: Lease-steal + peek_all event', () => {
    const ctx=makeCtx(0);
    ctx.duel_state.hands[1]=[11,12,0,0,0,0];
    CARD_V3_ABILITY_HANDLERS.hand_peek_steal(ctx);
    assert.ok(ctx.events.find(e=>e.type==='steal_get'&&e.steal_type==='lease'));
    assert.ok(ctx.events.find(e=>e.type==='v3_peek_all'));
  });
  test('Gold Hall: permanent steal', () => {
    const ctx=makeCtx(0,{is_gold_hall:true});
    ctx.duel_state.hands[1]=[11,0,0,0,0,0];
    CARD_V3_ABILITY_HANDLERS.hand_peek_steal(ctx);
    assert.equal(ctx.events.find(e=>e.type==='steal_get').steal_type, 'permanent');
  });
  test('no-op when opponent hand empty', () => {
    const ctx=makeCtx(0);
    ctx.duel_state.hands[1]=[0,0,0,0,0,0];
    CARD_V3_ABILITY_HANDLERS.hand_peek_steal(ctx);
    assert.equal(ctx.events.length, 0);
  });
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n─────────────────────────────`);
console.log(`v3.0-plus abilities: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
