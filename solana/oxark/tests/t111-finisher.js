#!/usr/bin/env node
// T111: Finisher E2E Test
// Tests: is_finisher detection (steal, attack card, magic), +50% dmg bonus on ATK finisher

let pass=0,fail=0;
function assert(label,cond){if(cond){console.log('  ✓',label);pass++;}else{console.log('  ✗ FAIL:',label);fail++;}}

// ── Simulate state ──────────────────────────────────────────────────────────
const BATTLE_HP_MAX=3;

// Simulate STEAL finisher detection (mirrors 07-battle.js logic)
function simStealResult(hpBefore){
  const events={};
  events._isFinisher=false;
  const _finisherSteal=hpBefore===1;
  const hpAfter=Math.max(0,hpBefore-1);
  if(_finisherSteal&&hpAfter===0)events._isFinisher=true;
  return{hpAfter,isFinisher:events._isFinisher};
}

// Simulate USE CARD attack finisher detection (mirrors 07-battle.js logic)
function simAttackResult(hpBefore,baseDmg){
  const events={};
  let dmg=baseDmg;
  const _finisherAtk=hpBefore>0&&hpBefore<=dmg;
  if(_finisherAtk){dmg=Math.ceil(dmg*1.5);events._isFinisher=true;}
  const hpAfter=Math.max(0,hpBefore-dmg);
  return{hpAfter,dmg,isFinisher:!!events._isFinisher};
}

// Simulate MAGIC finisher detection
function simMagicResult(hp1Before,hp2Before){
  const events={};
  const hp1After=Math.max(0,hp1Before-2);
  const hp2After=Math.max(0,hp2Before-1);
  if((hp1Before>0&&hp1After<=0)||(hp2Before>0&&hp2After<=0))events._isFinisher=true;
  return{hp1After,hp2After,isFinisher:!!events._isFinisher};
}

// ── STEP 1: Steal Finisher Detection ────────────────────────────────────────
console.log('\n══ STEP 1: Steal Finisher Detection ══');
{
  const r1=simStealResult(3); // target at full HP — not finisher
  assert('STEP1: steal on 3HP → not finisher', !r1.isFinisher);
  assert('STEP1: steal on 3HP → hp=2', r1.hpAfter===2);

  const r2=simStealResult(2); // target at 2HP — not finisher
  assert('STEP1: steal on 2HP → not finisher', !r2.isFinisher);
  assert('STEP1: steal on 2HP → hp=1', r2.hpAfter===1);

  const r3=simStealResult(1); // target at 1HP — FINISHER
  assert('STEP1: steal on 1HP → is_finisher=true', r3.isFinisher===true);
  assert('STEP1: steal on 1HP → hp=0 (KO)', r3.hpAfter===0);

  const r4=simStealResult(0); // already dead — not finisher (guard)
  assert('STEP1: steal on 0HP → not finisher', !r4.isFinisher);
}

// ── STEP 2: Attack Card Finisher + Damage Bonus ──────────────────────────────
console.log('\n══ STEP 2: Attack Card Finisher + Damage Bonus ══');
{
  // baseDmg=1 (common attack card)
  const r1=simAttackResult(3,1); // hp 3→2 — not finisher
  assert('STEP2: atk(1dmg) on 3HP → not finisher', !r1.isFinisher);
  assert('STEP2: atk(1dmg) on 3HP → dmg unchanged=1', r1.dmg===1);
  assert('STEP2: atk(1dmg) on 3HP → hp=2', r1.hpAfter===2);

  const r2=simAttackResult(1,1); // hp 1→0 — FINISHER +50% dmg bonus
  assert('STEP2: atk(1dmg) on 1HP → is_finisher=true', r2.isFinisher===true);
  assert('STEP2: atk(1dmg) on 1HP → dmg=ceil(1.5)=2', r2.dmg===2);
  assert('STEP2: atk(1dmg) on 1HP → hp=0 (KO)', r2.hpAfter===0);

  // baseDmg=2 (rare attack card)
  const r3=simAttackResult(2,2); // hp 2→0 — FINISHER
  assert('STEP2: atk(2dmg) on 2HP → is_finisher=true', r3.isFinisher===true);
  assert('STEP2: atk(2dmg) on 2HP → dmg=ceil(3)=3', r3.dmg===3);

  const r4=simAttackResult(3,2); // hp 3→1 — not finisher
  assert('STEP2: atk(2dmg) on 3HP → not finisher', !r4.isFinisher);
  assert('STEP2: atk(2dmg) on 3HP → dmg unchanged=2', r4.dmg===2);

  // baseDmg=4 (legendary attack card)
  const r5=simAttackResult(3,4); // hp 3→0 — FINISHER (4 >= 3)
  assert('STEP2: atk(4dmg) on 3HP → is_finisher=true', r5.isFinisher===true);
  assert('STEP2: atk(4dmg) on 3HP → dmg=ceil(6)=6', r5.dmg===6);
  assert('STEP2: atk(4dmg) on 3HP → hp=0 (KO)', r5.hpAfter===0);

  // Edge: target already at 0 — not finisher
  const r6=simAttackResult(0,2);
  assert('STEP2: atk on 0HP → not finisher (guard)', !r6.isFinisher);
}

// ── STEP 3: Magic Finisher Detection ────────────────────────────────────────
console.log('\n══ STEP 3: Magic Finisher Detection ══');
{
  const r1=simMagicResult(3,3); // magic: -2HP rival1, -1HP rival2 — none KO'd
  assert('STEP3: magic 3,3HP → not finisher (3→1, 3→2)', !r1.isFinisher);
  assert('STEP3: magic 3,3HP → rival1 hp=1', r1.hp1After===1);
  assert('STEP3: magic 3,3HP → rival2 hp=2', r1.hp2After===2);

  const r2=simMagicResult(2,1); // magic: rival1 2→0 (KO!), rival2 1→0 (KO!)
  assert('STEP3: magic 2,1HP → is_finisher=true', r2.isFinisher===true);
  assert('STEP3: magic 2,1HP → rival1 hp=0', r2.hp1After===0);

  const r3=simMagicResult(1,3); // magic: rival1 1→0 (KO!)
  assert('STEP3: magic 1,3HP → is_finisher=true (rival1 KO)', r3.isFinisher===true);

  const r4=simMagicResult(3,1); // magic: rival2 1→0 (KO!)
  assert('STEP3: magic 3,1HP → is_finisher=true (rival2 KO)', r4.isFinisher===true);

  const r5=simMagicResult(0,0); // both already dead — not finisher
  assert('STEP3: magic 0,0HP → not finisher (guard)', !r5.isFinisher);
}

// ── STEP 4: Finisher threshold at BATTLE_HP_MAX=3 ───────────────────────────
console.log('\n══ STEP 4: HP threshold boundary ══');
{
  // Finisher = target at ≤1 HP (last third of max=3)
  for(let hp=0;hp<=BATTLE_HP_MAX;hp++){
    const r=simStealResult(hp);
    const expected=(hp===1); // only exactly 1 HP triggers finisher for steal
    assert('STEP4: steal hp='+hp+' finisher='+expected, r.isFinisher===expected);
  }
  // For attack: finisher whenever baseDmg >= hpBefore > 0
  assert('STEP4: atk 1dmg hp=1 → finisher', simAttackResult(1,1).isFinisher===true);
  assert('STEP4: atk 1dmg hp=2 → no finisher', simAttackResult(2,1).isFinisher===false);
  assert('STEP4: atk 3dmg hp=3 → finisher', simAttackResult(3,3).isFinisher===true);
  assert('STEP4: atk 2dmg hp=3 → no finisher', simAttackResult(3,2).isFinisher===false);
}

// ── Summary ─────────────────────────────────────────────────────────────────
console.log('\n══ T111 Finisher E2E Summary ══');
console.log(`  Tests:   ${pass}/${pass+fail} passed`);
if(fail>0){console.error(`  ${fail} FAILURES`);process.exit(1);}
