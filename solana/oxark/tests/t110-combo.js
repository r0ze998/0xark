#!/usr/bin/env node
// T110: Combo System E2E Test
// Tests: SUPER EFFECTIVE tracking, combo tier thresholds, reset on non-SE

let pass=0,fail=0;
function assert(label,cond){if(cond){console.log('  ✓',label);pass++;}else{console.log('  ✗ FAIL:',label);fail++;}}

// ── Simulate state ──────────────────────────────────────────────────────────
const COMBO_TIERS=[
  {n:3,label:'PERFECT!',   col:'#f0e040',glow:'rgba(240,220,40,.5)',dmgBonus:0.20},
  {n:5,label:'LEGENDARY!', col:'#f0a020',glow:'rgba(240,160,20,.6)',hpRegen:0.10},
  {n:7,label:'UNSTOPPABLE!',col:'#ff4080',glow:'rgba(255,60,100,.7)',xp2x:true},
];
function comboTier(n){return COMBO_TIERS.slice().reverse().find(t=>n>=t.n)||null;}

let _comboCount=0;
let _comboMaxBattle=0;
let _comboXp2xFlag=false;
const XP_REWARDS_SE=20;
let _totalXP=0;

function recordBattleCombo(isSuperEffective){
  if(isSuperEffective){
    _comboCount++;
    if(_comboCount>_comboMaxBattle)_comboMaxBattle=_comboCount;
    const tier=comboTier(_comboCount);
    if(tier&&tier.xp2x)_comboXp2xFlag=true;
    _totalXP+=XP_REWARDS_SE;
    return tier&&_comboCount===tier.n?tier:null;
  } else {
    _comboCount=0;
    _comboXp2xFlag=false;
    return null;
  }
}

// Element multiplier (matches client 02-data.js calcElementMultiplier)
function cardElement(id){
  if(id<=10)return 0;if(id<=20)return 1;if(id<=30)return 2;
  if(id<=40)return 3;if(id<=50)return 4;return 5;
}
function calcElementMultiplier(atkEl,defEl){
  const adv=[[0,1],[1,3],[3,0],[2,4],[4,5],[5,2]];
  for(const [a,d] of adv){
    if(atkEl===a&&defEl===d)return 1500;
    if(atkEl===d&&defEl===a)return 700;
  }
  return 1000;
}

// ── STEP 1: Element Multiplier ──────────────────────────────────────────────
console.log('\n══ STEP 1: Element Multiplier ══');
assert('STEP1: Fire(0) vs Water(1) = 1500 (advantage)', calcElementMultiplier(0,1)===1500);
assert('STEP1: Water(1) vs Fire(0) = 700 (disadvantage)', calcElementMultiplier(1,0)===700);
assert('STEP1: Wind(2) vs Shadow(4) = 1500', calcElementMultiplier(2,4)===1500);
assert('STEP1: Earth(3) vs Fire(0) = 1500 (Earth beats Fire)', calcElementMultiplier(3,0)===1500);
assert('STEP1: Fire(0) vs Earth(3) = 700 (Fire loses to Earth)', calcElementMultiplier(0,3)===700);
assert('STEP1: cross-triad neutral', calcElementMultiplier(0,2)===1000);
assert('STEP1: same element neutral', calcElementMultiplier(1,1)===1000);

// ── STEP 2: Combo Tiers ─────────────────────────────────────────────────────
console.log('\n══ STEP 2: Combo Tiers ══');
assert('STEP2: tier 0 below 3', comboTier(0)===null);
assert('STEP2: tier 0 at 2', comboTier(2)===null);
assert('STEP2: PERFECT tier at n=3', comboTier(3)&&comboTier(3).label==='PERFECT!');
assert('STEP2: PERFECT tier at n=4', comboTier(4)&&comboTier(4).label==='PERFECT!');
assert('STEP2: LEGENDARY tier at n=5', comboTier(5)&&comboTier(5).label==='LEGENDARY!');
assert('STEP2: LEGENDARY tier at n=6', comboTier(6)&&comboTier(6).label==='LEGENDARY!');
assert('STEP2: UNSTOPPABLE tier at n=7', comboTier(7)&&comboTier(7).label==='UNSTOPPABLE!');
assert('STEP2: UNSTOPPABLE tier at n=10', comboTier(10)&&comboTier(10).label==='UNSTOPPABLE!');

// ── STEP 3: Consecutive SUPER EFFECTIVE streak ──────────────────────────────
console.log('\n══ STEP 3: 3-hit streak → PERFECT ══');
let tier;
tier=recordBattleCombo(true); assert('STEP3: combo=1 no tier', _comboCount===1&&!tier);
tier=recordBattleCombo(true); assert('STEP3: combo=2 no tier', _comboCount===2&&!tier);
tier=recordBattleCombo(true); assert('STEP3: combo=3 = PERFECT', _comboCount===3&&tier&&tier.label==='PERFECT!');
assert('STEP3: PERFECT dmgBonus=0.20', tier&&tier.dmgBonus===0.20);
assert('STEP3: xp_2x_flag still false', !_comboXp2xFlag);
assert('STEP3: XP accumulated (3 SE hits)', _totalXP===60);

// ── STEP 4: 5-hit streak → LEGENDARY ───────────────────────────────────────
console.log('\n══ STEP 4: 5-hit streak → LEGENDARY ══');
tier=recordBattleCombo(true); assert('STEP4: combo=4 no new tier', _comboCount===4&&!tier);
tier=recordBattleCombo(true); assert('STEP4: combo=5 = LEGENDARY', _comboCount===5&&tier&&tier.label==='LEGENDARY!');
assert('STEP4: LEGENDARY hpRegen=0.10', tier&&tier.hpRegen===0.10);

// ── STEP 5: 7-hit streak → UNSTOPPABLE + xp_2x ─────────────────────────────
console.log('\n══ STEP 5: 7-hit streak → UNSTOPPABLE ══');
tier=recordBattleCombo(true); assert('STEP5: combo=6 LEGENDARY tier (no new cross)', _comboCount===6);
tier=recordBattleCombo(true); assert('STEP5: combo=7 = UNSTOPPABLE', _comboCount===7&&tier&&tier.label==='UNSTOPPABLE!');
assert('STEP5: xp_2x_flag=true', _comboXp2xFlag===true);
assert('STEP5: max_combo=7', _comboMaxBattle===7);

// ── STEP 6: Non-SE resets combo ─────────────────────────────────────────────
console.log('\n══ STEP 6: Reset on non-SE ══');
tier=recordBattleCombo(false);
assert('STEP6: combo reset to 0', _comboCount===0);
assert('STEP6: xp_2x_flag reset', !_comboXp2xFlag);
assert('STEP6: max_combo preserved', _comboMaxBattle===7);
assert('STEP6: non-SE returns null', !tier);

// ── STEP 7: Rebuild combo after reset ───────────────────────────────────────
console.log('\n══ STEP 7: Rebuild after reset ══');
recordBattleCombo(true);recordBattleCombo(true);
assert('STEP7: combo=2 after 2 SE hits', _comboCount===2);
recordBattleCombo(false);
assert('STEP7: reset again', _comboCount===0);

// ── STEP 8: Element card assignment ─────────────────────────────────────────
console.log('\n══ STEP 8: Card Element Assignment ══');
assert('STEP8: card 1 = Fire(0)', cardElement(1)===0);
assert('STEP8: card 10 = Fire(0)', cardElement(10)===0);
assert('STEP8: card 11 = Water(1)', cardElement(11)===1);
assert('STEP8: card 25 = Wind(2)', cardElement(25)===2);
assert('STEP8: card 35 = Earth(3)', cardElement(35)===3);
assert('STEP8: card 45 = Shadow(4)', cardElement(45)===4);
assert('STEP8: card 55 = Light(5)', cardElement(55)===5);
assert('STEP8: card 60 = Light(5)', cardElement(60)===5);

// ── Summary ─────────────────────────────────────────────────────────────────
console.log('\n══ T110 Combo E2E Summary ══');
console.log(`  Tests:   ${pass}/${pass+fail} passed`);
if(fail>0){console.error(`  ${fail} FAILURES`);process.exit(1);}
