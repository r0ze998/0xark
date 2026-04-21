// v371: pre-baked tables for sin-addition in minimap encounter shimmer (phase 0-15, step 0.39)
const _MM_SI39=new Float32Array(16);const _MM_CI39=new Float32Array(16);
for(let i=0;i<16;i++){_MM_SI39[i]=Math.sin(i*0.39);_MM_CI39[i]=Math.cos(i*0.39);}
// v371: pre-baked tables for sin-addition in gacha card shimmer (index i, sin(i)/cos(i))
const _IDX_SI=new Float32Array(60);const _IDX_CI=new Float32Array(60);
for(let i=0;i<60;i++){_IDX_SI[i]=Math.sin(i);_IDX_CI[i]=Math.cos(i);}
// v379: 60-frame bounce table for NPC dialog arrow (sin(fr*π/30), period=60)
const _BOUNCE60=new Float32Array(60);
for(let i=0;i<60;i++)_BOUNCE60[i]=Math.sin(i*Math.PI/30);
// v380: 160-entry wave phase tables (wx=0,4,8,...,636 → j=0..159; each encodes sin/cos of wx*step[±offset])
const _WV_N=160; // ceil(W/4) = ceil(640/4)
const _WAVE_SI_A=new Float32Array(_WV_N);const _WAVE_CI_A=new Float32Array(_WV_N); // wx*0.015
const _WAVE_SI_B=new Float32Array(_WV_N);const _WAVE_CI_B=new Float32Array(_WV_N); // wx*0.008
const _WAVE_SI_C=new Float32Array(_WV_N);const _WAVE_CI_C=new Float32Array(_WV_N); // wx*0.012+2
const _WAVE_SI_D=new Float32Array(_WV_N);const _WAVE_CI_D=new Float32Array(_WV_N); // wx*0.01
const _WAVE_SI_E=new Float32Array(_WV_N);const _WAVE_CI_E=new Float32Array(_WV_N); // wx*0.01+4
for(let j=0;j<_WV_N;j++){const wx=j*4;
  _WAVE_SI_A[j]=Math.sin(wx*0.015);_WAVE_CI_A[j]=Math.cos(wx*0.015);
  _WAVE_SI_B[j]=Math.sin(wx*0.008);_WAVE_CI_B[j]=Math.cos(wx*0.008);
  _WAVE_SI_C[j]=Math.sin(wx*0.012+2);_WAVE_CI_C[j]=Math.cos(wx*0.012+2);
  _WAVE_SI_D[j]=Math.sin(wx*0.01);_WAVE_CI_D[j]=Math.cos(wx*0.01);
  _WAVE_SI_E[j]=Math.sin(wx*0.01+4);_WAVE_CI_E[j]=Math.cos(wx*0.01+4);
}
// v382: Euler recurrence state for 120 title-screen stars (replaces 120 Math.sin/frame)
// State: (SC,SS) = (cos(freq*fr+phase), sin(freq*fr+phase)); advances by rotation each dTitle() call
const _STAR_SS=new Float32Array(120);const _STAR_SC=new Float32Array(120);
const _STAR_FS=new Float32Array(120);const _STAR_FC=new Float32Array(120);
(()=>{for(let i=0;i<120;i++){
  const freq=0.018+((i*1337)%100)*0.0003;
  const phase=((i*2741)%628)/100;
  _STAR_SS[i]=Math.sin(phase);_STAR_SC[i]=Math.cos(phase); // initial state at fr=0
  _STAR_FS[i]=Math.sin(freq);_STAR_FC[i]=Math.cos(freq);   // rotation step per frame
}})();
// v380: 5-entry tables for title screen pillar (step 1.2) and moon reflection (step 1.4) phases
const _PILLAR_SI12=new Float32Array(5);const _PILLAR_CI12=new Float32Array(5);
const _REFLS_SI14=new Float32Array(5);const _REFLS_CI14=new Float32Array(5);
for(let i=0;i<5;i++){
  _PILLAR_SI12[i]=Math.sin(i*1.2);_PILLAR_CI12[i]=Math.cos(i*1.2);
  _REFLS_SI14[i]=Math.sin(i*1.4);_REFLS_CI14[i]=Math.cos(i*1.4);
}
// v330: lazy cache for trade dialog vault display (key=vaultSz)
let _tradeVaultLbl='',_tradeVaultKey=-1;
// v344: lazy caches for title-screen progress and trade overlay labels
let _titleProgLbl='',_titleProgKey=-1;
let _titleStepsLbl='',_titleStepsKey=-1;
let _tradeDescLbl='',_tradeDescRef=null;
// v254: Hoisted static arrays — eliminates per-frame inline literal allocation in synthesis + NPC dialog render
const _SYNTH_RAR_LABELS=['','Common','Uncommon','Rare','Epic'];
// v301: synthesis burst color by rarity — was inline local per doSynthesis call
const _SYNTH_RAR_BURST=['','#888898','#50d060','#b060e0','#e0a020','#ffe080'];
// v303: pre-baked danger bar strings (index = danger level 0-5); eliminates repeat()+concat per frame
const _DANGER_BARS=['□□□□□','■□□□□','■■□□□','■■■□□','■■■■□','■■■■■'];
// v303: pre-baked synthesis status strings — avoids string concat every frame in synthesis UI
const _SYNTH_NO_CARDS=['','No Common cards in hand.','No Uncommon cards in hand.','No Rare cards in hand.','No Epic cards in hand.'];
const _SYNTH_UPGRADE=['','Select 3 cards → get 1 Uncommon card','Select 3 cards → get 1 Rare card','Select 3 cards → get 1 Epic card','Select 3 cards → get 1 ? card'];
const _SYNTH_NEED=['3 selected — press Z to synthesize!','Need 1 more','Need 2 more','Need 3 more'];
// v262: Additional per-frame inline literals hoisted
const _WLD_FLOOR_NUMS=['','B1','B2','B3','B4','B5'];
// v341: pre-baked synth upgrade legend labels (index = synthRarityFilter 1-4)
const _SYNTH_LEG_LBL=['','3\u00D7 Common \u2192 1\u00D7 Uncommon','3\u00D7 Uncommon \u2192 1\u00D7 Rare','3\u00D7 Rare \u2192 1\u00D7 Epic','3\u00D7 Epic \u2192 1\u00D7 Legendary'];
// v341: pre-baked constant SOL stake strings (STAKE_AMOUNT=0.01, stakePotAmount=0.03 are module constants)
const _STAKE_OFFERING_LBL='OFFERING: '+STAKE_AMOUNT.toFixed(2)+' SOL';
const _SEAL_POT_LBL='SEAL POT: '+stakePotAmount.toFixed(2)+' SOL';
const _STAKE_CONFIRM_LBL='OFFER '+STAKE_AMOUNT.toFixed(2)+' SOL TO BREAK THE SEAL?';
const _SEAL_CLAIM_LBL='Victor claims the Grand Seal: '+stakePotAmount.toFixed(2)+' SOL';
// v344: lazy cache for encounter speech bubble (changes only when encounterRivalLine changes)
let _encLineLblCache='',_encLineLblRef=null;

// v296: Floor-specific atmosphere log messages (ARK lore flavor, one per floor per ~10s tick)
const _FLOOR_ATMOS=[
  null, // index 0 unused
  ['Water seeps through the cracked walls.','Salt and rust. The ARK still breathes.','The floor groans under centuries of weight.','Light barely reaches here. Something watches.','Drowned murals cover the walls — old crew markings.'],
  ['Bookshelves warp in the damp. Pages unreachable.','A scholar\'s handwriting fades on the stone.','Ink-stained desks, long abandoned.','The ARK crew archived everything. Even their fear.','A soft hum — arcane lattices still active.'],
  ['Clockwork somewhere below. Constant. Patient.','Echo chambers amplify every footstep. They hear you.','The ARK was a machine. This floor is its memory.','Gearwork never stops — even after the crew left.','A resonance pulse washes through. Something calibrates.'],
  ['Silence this deep feels wrong.','No light reaches Floor 4 naturally. Something else does.','The vault was sealed from the inside.','Cards sealed here were meant to never be found.','This deep, the ARK stops pretending to be safe.'],
  ['The core still beats. The ARK isn\'t dead.','Heat rises from the lowest chamber. Mechanical life.','Whoever built this wanted it to last forever.','The crew never made it this far. You did.','Power conduits throb in the walls. The ARK recognizes you.'],
];
const _WLD_RAR_COLS=['','#888898','#50d060','#6090f0','#c060e0','#fff8a0'];
const _TITLE_VOID_COLS=['#5014b4','#5c1cc0','#6824cc','#742cd8','#8034e4'];
// ═══════════════════════════════════════
// v155: DUNGEON TURN SYSTEM
// ═══════════════════════════════════════

// Advance one dungeon turn: each rival takes one step
// v287/v290: Floor-tiered + hunt/surprise encounter dialog
// VEGA: hunt = aggressive predator, surp = momentarily thrown
// MIRA: hunt = cold calculator closing in, surp = model deviation registered
const _VEGA_FL=[
  // [hunt lines, surprise lines] per tier
  // Tier 0: F1-F2
  [['Hand over the cards. Now.','The ARK\'s legacy is mine.','No walls stop a hunter.','Nowhere left to run.','You were easy to track.'],
   ['You… found me first?','Reckless. I can respect that.','Bold move. The ARK liked bold.','Didn\'t expect prey to hunt.','Interesting choice.']],
  // Tier 1: F3
  [['You made it this far. Pointless.','Deep enough that no one hears you.','The cards belong to me — always have.','I don\'t chase. I just arrive.','Slow down. This ends quickly.'],
   ['You read the dungeon well.','A surprise. Still doesn\'t change the outcome.','I underestimated your routing.','You deviated from the predicted path.','Didn\'t think you\'d make it here.']],
  // Tier 2: F4-F5
  [['The ARK crew ran. You\'re not running.','Nothing comes back from Floor 4.','Surrender the deck. Last chance.','You\'re in my trophy room now.','The void takes everything. Starting with your cards.'],
   ['A variable I didn\'t expect.','You shouldn\'t have made it this deep.','Somehow you\'re still alive. Fixing that.','The ARK itself didn\'t survive this deep.','Impressive. Unfortunate.']],
];
const _MIRA_FL=[
  // Tier 0: F1-F2
  [['Precisely where my model predicted.','Your card count fell below threshold. Engaging.','The calculation is complete.','Pattern deviation detected. Correcting.'],
   ['A variable I didn\'t account for.','You deviated from the pattern. Interesting.','My model was off. Recalculating.','Unexpected approach. Noted.']],
  // Tier 1: F3
  [['Probability of your survival: 12%.','The data set converges. So do I.','Your routing exposed you three moves ago.','Every fork you took led here. I mapped them.'],
   ['You surprised the model.','Unusual routing. I\'ll update the dataset.','I underestimated your decision tree.','Error margin was too high. Corrected now.']],
  // Tier 2: F4-F5
  [['At this depth, logic is the only survivor.','I modeled 4,096 outcomes. You lose every one.','The ARK crew had better odds than you.','Resistance is a statistical anomaly. Eliminating.'],
   ['An outlier reaches this far.','<0.2% probability. Updating models.','The ARK itself was an outlier. You are not.','Rare deviation. Won\'t happen twice.']],
];
function _pickRivalLine(idx,isHunting){
  const fl=Math.max(1,Math.min(5,currentFloor));
  const tier=fl<=2?0:fl===3?1:2;
  const set=idx===0?_VEGA_FL[tier]:_MIRA_FL[tier];
  const pool=isHunting?set[0]:set[1];
  return pool[Math.floor(Math.random()*pool.length)];
}
function processDungeonTurn(){
  if(!inDungeon)return;
  if(encounterCooldown>0)return; // let game loop decrement
  dungeonTurnStep(0);
  dungeonTurnStep(1);
  // Immediately check if any rival landed adjacent — fire encounter without waiting for next frame
  checkDungeonRivalEncounter();
  // T52: proximity warning (2-tile rumble)
  checkRivalProximity();
}

// T52: Check if a rival is within 2 tiles (pre-encounter proximity warning)
function checkRivalProximity(){
  if(!inDungeon||encounterExclActive||wildEncounterActive)return;
  let closest=99,closestName='';
  for(let _ri=1;_ri<pl.length;_ri++){
    if(rivalMaps[_ri-1]!==currentMap)continue;
    const d=Math.abs(pl[_ri].x-pl[0].x)+Math.abs(pl[_ri].y-pl[0].y);
    if(d<=2&&d<closest){closest=d;closestName=pl[_ri].n;}
  }
  if(closest<=2){
    if(!preEncounterAlert){
      preEncounterAlert=true;preEncounterAlertName=closestName;preEncounterAlertFrame=fr;
      preEncounterAlertRumbled=false;
    }
    if(!preEncounterAlertRumbled){preEncounterAlertRumbled=true;sfxTensionRumble();}
  }else{
    preEncounterAlert=false;
  }
}

// T70: Check town building proximity — sets nearInteractable for [Z] hint + input routing
function checkTownInteractable(){
  if(currentMap!==0||inDungeon){nearInteractable=null;return;}
  const px=pl[0].x,py=pl[0].y;
  let found=null;
  for(let i=0;i<TOWN_INTERACTABLES.length;i++){
    const t=TOWN_INTERACTABLES[i];
    if(Math.abs(px-t.tx)<=1&&Math.abs(py-t.ty)<=1){found=t;break;}
  }
  nearInteractable=found;
}

// Check if a rival just stepped adjacent to the player; trigger encounter if so
// (mirrors the encounter check in the game loop but called explicitly after each turn)
function checkDungeonRivalEncounter(){
  if(!inDungeon||encounterCooldown>0||encounterExclActive||wildEncounterActive||mapTransitioning||mo||shadowStepsLeft>0)return;
  for(let _ri=1;_ri<pl.length;_ri++){
    const r=pl[_ri],idx=_ri-1;
    if(rivalMaps[idx]!==currentMap)continue;
    if(encounterCooldown>0||encounterExclActive)continue;
    const adjDist=Math.abs(r.x-pl[0].x)+Math.abs(r.y-pl[0].y);
    if(adjDist===1){
      encounterCooldown=120;
      const ai=rivalAI[idx];
      encounterExclActive=true;encounterExclFrame=fr;
      encounterExclTarget=idx+1;
      encounterExclPlayerX=pl[0].visualX;encounterExclPlayerY=pl[0].visualY;
      encounterExclRivalX=r.visualX;encounterExclRivalY=r.visualY;
      sfxEncounterDramatic();hitPause(4);
      const isHunting=ai.state==='hunting';
      encounterRivalLine=_pickRivalLine(idx,isHunting); // v287/v290: floor+hunt tiered dialog
      setTimeout(()=>{
        encounterExclActive=false;flash();
        twSet(isHunting?r.n+' ambushed you! Battle!':r.n+' appeared! Battle!');
        startWipe('mosaic',30,()=>{
          sc='act';battlePhase='vs_splash';bpFrame=fr;
          battleRoundHistory=[];
          bpHP=[BATTLE_HP_MAX,BATTLE_HP_MAX,BATTLE_HP_MAX];bpHPDmgAnim=[0,0,0];
          bpEnemyElement=Math.floor(Math.random()*6); // T93: random element 0-5 (6-element v2)
          startWipe('mosaic_out',20);
          if(runMission&&runMission.type==='battle_rival'&&!runMission.completed){runMission.progress=1;runMission.completed=true;sfxStreakUp();}
        });
      },500);
    }
  }
}

// Place floor items in dungeon rooms (called on fresh dungeon generation)
function placeFloorItems(mapIdx,rooms){
  if(!rooms||rooms.length===0)return;
  floorItems[mapIdx]=[];
  const pool=AREA_CARDS[mapIdx]||AREA_CARDS[1]||[];
  if(pool.length===0)return;
  // Skip the first room (entrance area) and last room (near stairs)
  const eligible=rooms.slice(1,rooms.length-1);
  if(eligible.length===0)eligible.push(rooms[Math.floor(rooms.length/2)]);
  // Place 1-2 items per eligible room
  for(const r of eligible){
    const count=1+(mapIdx>=4?1:0); // deeper floors: more items
    for(let i=0;i<count&&i<2;i++){
      const ix=r.x+1+Math.floor(Math.random()*(r.w-2));
      const iy=r.y+1+Math.floor(Math.random()*(r.h-2));
      // Pick card from pool, biased toward rarer on deeper floors
      const cardId=pool[Math.floor(Math.random()*pool.length)];
      // v368: pre-bake sin/cos of glow phase for sin-addition per frame (0 trig per item)
      const glowPh=Math.random()*Math.PI*2;
      floorItems[mapIdx].push({x:ix,y:iy,cardId,glow:glowPh,sinGlow:Math.sin(glowPh),cosGlow:Math.cos(glowPh)});
    }
  }
}

// Check if player stepped on a floor item, auto-pick it up — v436: swap-and-pop
function checkFloorItemPickup(nx,ny){
  const items=floorItems[currentMap];
  if(!items||items.length===0)return;
  let idx=-1;for(let _i=0;_i<items.length;_i++){if(items[_i].x===nx&&items[_i].y===ny){idx=_i;break;}}
  if(idx===-1)return;
  const it=items[idx];
  const _last=items.length-1;if(idx<_last)items[idx]=items[_last];items.length--;
  const cr=CD[it.cardId-1];if(!cr)return;
  // Add to player hand/vault
  const placed=addCardToPlayer(0,it.cardId);
  triggerCardGetBurst(nx*TW+TW/2,ny*TH+TH/2,cr.c||'#f0c030');
  hitPause(4);
  // T64: rarity-specific card acquire SE
  if(cr.r>=5)sfxRarityLegendary();else if(cr.r>=3)sfxRarityRare();else sfxRarityCommon();
  sfxCardGet();
  startCardAcquisition(it.cardId);
  checkWinAndTransition(1500);
  lg.push('Found '+cr.n+' on the floor!');
}

// ═══════════════════════════════════════
// MAP TRANSITION
// ═══════════════════════════════════════
function checkExitTile(x,y){
  for(const ex of exits){
    if(ex.fromMap!==currentMap)continue;
    for(const [etx,ety] of ex.tiles){
      if(x===etx&&y===ety)return ex;
    }
  }
  return null;
}

function doMapTransition(exit){
  if(mapTransitioning)return;
  mapTransitioning=true;
  sfxDoorOpen();sfxMapChange();sfxAreaEntry();
  // T64: stair/escape sounds
  if(exit.isGoal||exit.isEscape){sfxEscape();}
  else if(exit.targetMap>currentMap&&exit.targetMap>0){sfxStairsDescend();}
  else if(exit.targetMap<currentMap&&exit.targetMap>0){sfxStairsAscend();}
  const targetMapName=mapNames[exit.targetMap];
  const targetCardDesc=AREA_CARD_DESC[exit.targetMap];
  fadeOut(()=>{
    currentMap=exit.targetMap;
    // Update dungeon state
    inDungeon=(currentMap>0);
    currentFloor=inDungeon?currentMap:0;
    pl[0].x=exit.targetX;
    pl[0].y=exit.targetY;
    pl[0].visualX=exit.targetX*TW;
    pl[0].visualY=exit.targetY*TH;
    // Snap camera
    camX=pl[0].visualX-W/2;camY=pl[0].visualY-H/2;
    camTargetX=camX;camTargetY=camY;
    tileCacheDirty=true;edgeCacheDirty=true;fogCacheDirty=true;
    particles.length=0;
    // Reveal starting area on new map (larger radius so entry area is immediately visible)
    if(inDungeon){fogRevealRadius(currentMap,pl[0].x,pl[0].y,4);fogSave();}
    else{fogRevealAll(currentMap);fogSave();}
    // When entering floor 1 from town, spread rivals to safe starting positions far from entrance.
    // This prevents immediate encounters caused by AI roaming during town/title time.
    if(exit.fromMap===0&&exit.targetMap===1){
      // v155: Regenerate all dungeon floors fresh every run (PMD-style: new dungeon each run)
      const runSeed=Date.now();
      dungeonSeedThisRun=runSeed;
      for(let f=1;f<=MAX_DUNGEON_FLOORS;f++){
        const result=generateDungeonFloor(f,runSeed+f*7919);
        maps[f]=result.map;
        dungeonRooms[f]=result.rooms;
        // Reset fog for this dungeon floor
        for(let ry=0;ry<MH;ry++)for(let rx=0;rx<MW;rx++)fogRevealed[f][ry][rx]=false;
        // Place floor items
        placeFloorItems(f,result.rooms);
      }
      fogCacheDirty=true;
      // Reveal starting area of floor 1 for the player
      fogRevealRadius(1,exit.targetX,exit.targetY,4);
      fogSave();

      // v72: Snapshot state at dungeon entry so we can show run summary on exit
      dungeonRunSnapshot={cards:[...pl[0].cd],vaultSize:pl[0].vault?pl[0].vault.size:0,deepestFloor:0};
      // v79: Generate a random run mission
      const _mDef=RUN_MISSION_DEFS[Math.floor(Math.random()*RUN_MISSION_DEFS.length)];
      runMission={..._mDef,progress:0,completed:false,rewardGiven:false};
      roundsThisRun=0;
      lg.push('MISSION: '+runMission.desc+' → '+runMission.reward);
      // Spawn rivals at actual room centers so they don't embed in walls
      {
        const fl1Rooms=dungeonRooms[1]||[];
        // Prefer rooms in the right half of the map (away from player entry at x=3)
        const rightRooms=fl1Rooms.filter(r=>r.cx>20);
        const allRight=rightRooms.length>0?rightRooms:fl1Rooms;
        const r1=allRight[0]||{cx:32,cy:10};
        const r2=allRight[allRight.length-1]||{cx:32,cy:20};
        pl[1].x=r1.cx;pl[1].y=r1.cy;pl[1].visualX=r1.cx*TW;pl[1].visualY=r1.cy*TH;
        pl[2].x=r2.cx;pl[2].y=r2.cy;pl[2].visualX=r2.cx*TW;pl[2].visualY=r2.cy*TH;
      }
      rivalMaps=[1,1];
      rivalAI[0].goalX=32;rivalAI[0].goalY=12;rivalAI[0].state='exploring';
      rivalAI[0].lastKnownPlayerMap=-1;rivalAI[0].lastKnownPlayerX=-1;rivalAI[0].lastKnownPlayerY=-1;
      rivalAI[0].huntCooldown=30; // v155: ~30 player steps grace (real-time handled by encounterCooldown)
      rivalAI[1].goalX=32;rivalAI[1].goalY=18;rivalAI[1].state='exploring';
      rivalAI[1].lastKnownPlayerMap=-1;rivalAI[1].lastKnownPlayerX=-1;rivalAI[1].lastKnownPlayerY=-1;
      rivalAI[1].huntCooldown=15; // v155: collector shorter grace
    }
    // For ANY dungeon floor transition: if a rival is on the destination floor and within 8 tiles
    // of the player entry point, push them to a safe position far from the entrance.
    // Player enters going DOWN at (3,14), UP at (36,14).
    // Push rivals to the OPPOSITE end of the floor from the player's entry point.
    if(inDungeon){
      const entryX=pl[0].x;const entryY=pl[0].y;
      const safeX=entryX<20?30:6; // if entering from left (x=3), push to right (x=30); vice versa
      for(let ri=0;ri<2;ri++){
        if(rivalMaps[ri]===currentMap){
          const dist=Math.abs(pl[ri+1].x-entryX)+Math.abs(pl[ri+1].y-entryY);
          if(dist<=8){
            // Rival is too close to entry — push them to the safe end
            const safeY=ri===0?10:18;
            pl[ri+1].x=safeX;pl[ri+1].y=safeY;
            pl[ri+1].visualX=safeX*TW;pl[ri+1].visualY=safeY*TH;
            rivalAI[ri].goalX=safeX;rivalAI[ri].goalY=safeY;rivalAI[ri].state='exploring';
            rivalAI[ri].huntCooldown=600; // 10s before rival can hunt on new floor
          }
        }
      }
    }
    // v155: PMD-style floor title card for dungeon floors; simple banner for town
    if(inDungeon){showFloorTitle(currentFloor);}
    else{showBanner(mapNames[currentMap],AREA_CARD_DESC[currentMap]);}
    // v72: Track deepest floor reached
    if(inDungeon&&dungeonRunSnapshot&&currentFloor>dungeonRunSnapshot.deepestFloor){
      dungeonRunSnapshot.deepestFloor=currentFloor;
    }
    // v79: Track reach_floor mission progress
    if(inDungeon&&runMission&&runMission.type==='reach_floor'&&!runMission.completed&&currentFloor>=runMission.goal){
      runMission.progress=currentFloor;runMission.completed=true;sfxStreakUp();
      lg.push('MISSION PROGRESS: Reached floor '+currentFloor+'!');
    }
    // v72: On town return, compute and show run summary
    if(!inDungeon&&dungeonRunSnapshot){
      const snap=dungeonRunSnapshot;
      const newVaultSize=pl[0].vault?pl[0].vault.size:0;
      const cardsGained=newVaultSize-snap.vaultSize;
      // Cards lost: cards that were in hand at entry and no longer present
      const nowCards=pl[0].cd;
      const lostCards=[];
      snap.cards.forEach((cid,i)=>{
        if(cid>0&&!nowCards.includes(cid)){
          const cr=CD[cid-1];if(cr)lostCards.push(cr);
        }
      });
      const deepest=snap.deepestFloor;
      if(deepest>0){// Only show if player actually entered a floor
        runSummaryData={cardsGained,lostCards,deepest,rounds:roundsThisRun}; // v289: include rounds fought
        runSummaryActive=true;runSummaryFrame=0;
      }
      dungeonRunSnapshot=null;
    }
    // Town rest: restore spell energy to full when returning to safe zone
    if(!inDungeon){sp.s=2;sp.b=3;sp.c=2;lg.push('Back in town — spell energy restored!');}
    // v79: Apply run mission reward on town return
    if(!inDungeon&&runMission&&runMission.completed&&!runMission.rewardGiven){
      runMission.rewardGiven=true;
      const rk=runMission.rewardKey;
      if(rk==='stl1'){sp.s=Math.min(6,sp.s+1);}
      else if(rk==='bar1'){sp.b=Math.min(6,sp.b+1);}
      else if(rk==='sct1'){sp.c=Math.min(6,sp.c+1);}
      else if(rk==='stl2'){sp.s=Math.min(6,sp.s+2);}
      else if(rk==='refill'){sp.s=Math.max(sp.s,3);sp.b=Math.max(sp.b,4);sp.c=Math.max(sp.c,3);}
      else if(rk==='bonus_card'){
        const bPool=DUNGEON_FLOOR_CARDS[3]||DUNGEON_FLOOR_CARDS[2];
        const bCard=pickFromPool(bPool); // v299: pickFromPool, no filter alloc
        addCardToPlayer(0,bCard);
        checkWinAndTransition(2000); // v149: card 60 could come from mission bonus_card
      }
      if(runSummaryData){runSummaryData.missionDesc=runMission.desc;runSummaryData.missionReward=runMission.reward;}
      lg.push('MISSION COMPLETE: '+runMission.desc+' → '+runMission.reward);
      sfxStreakUp();
    }
    if(!inDungeon){runMission=null;}
    // Pause/resume card timers based on dungeon state
    const now=Date.now();
    for(let i=0;i<HAND_SIZE;i++){
      if(pl[0].cd[i]>0){
        if(inDungeon&&cardTimers[i]===0)cardTimers[i]=now; // start decay in dungeon
        if(!inDungeon){cardTimers[i]=0;decayWarn[i]=0;} // pause decay in town, reset warnings
      }
    }
    if(!inDungeon){escapeUrgencyActive=false;escapeUrgencyPulse=0;}
    // Floor clear card reward: descending to deeper floor (not escaping back up)
    if(inDungeon&&!exit.isEscape&&exit.fromMap>0){
      const clearedFloor=exit.fromMap; // the floor we just cleared
      const pool=DUNGEON_FLOOR_CARDS[clearedFloor];
      if(pool&&pool.length>0){
        // Prefer vault-new cards from this floor's pool (v299: pickFromPool, no filter alloc)
        const rewardCard=pickFromPool(pool);
        setTimeout(()=>{
          const cr=CD[rewardCard-1];
          const isNewUnique=!(pl[0].vault&&pl[0].vault.has(rewardCard));
          const flAdded=addCardToPlayer(0,rewardCard); // vault sting fires inside if new unique
          const _fcRarCols=['','#888898','#50d060','#b060e0','#e0a020','#ffe080'];
          if(flAdded){
            objectInteractMsg='FLOOR '+clearedFloor+' CLEAR! Got '+cr.n+'!';
            objectInteractTimer=150;
            if(!isNewUnique)sfxCardGet(); // only play extra sound for duplicates (unique sting already fired)
            screenShake(cr.r>=3?cr.r:2,cr.r>=3?cr.r*3:4);
            triggerCardGetBurst(pl[0].visualX-camX,pl[0].visualY-camY-8,_fcRarCols[cr.r]||'#f0c030');
            lg.push('[FLOOR CLEAR] B'+clearedFloor+' cleared! Earned: '+cr.n+' ('+RARITY_LABEL[cr.r]+')');
          }else{
            // Hand full — still got it in vault; prompt discard
            discardActive=true;discardSelIdx=0;discardPendingCard=rewardCard;discardSource='wild';
            objectInteractMsg='FLOOR '+clearedFloor+' CLEAR! Got '+cr.n+' (discard to make room)!';
            objectInteractTimer=150;
            if(!isNewUnique)sfxCardGet(); // only play extra sound for duplicates
            screenShake(2,4);
            lg.push('[FLOOR CLEAR] B'+clearedFloor+' cleared! Earned: '+cr.n+' — hand full, discard one.');
          }
          // v85: floor-clear fanfare overlay
          floorFanfareActive=true;floorFanfareTimer=0;
          floorFanfareData={floor:clearedFloor,cardId:rewardCard,rarity:cr.r,isNew:isNewUnique};
          // v148: check win after floor-clear card (card 60 could arrive here)
          checkWinAndTransition(1500);
        },800);
      }
    }
    // ── GOAL EXIT: Floor 5 cleared — legendary card fanfare ──
    if(exit.isGoal){
      const legendPool=DUNGEON_FLOOR_CARDS[5]||[]; // floor 5 = legendary pool
      // Give 2 legendary cards as goal reward (v299: pickFromPool, no filter alloc)
      const reward1=pickFromPool(legendPool);
      const reward2=pickFromPool(legendPool);
      [reward1,reward2].forEach((rid,ri)=>{
        if(!rid)return;
        setTimeout(()=>{
          const cr=CD[rid-1];
          if(!cr)return;
          const isNew=!(pl[0].vault&&pl[0].vault.has(rid));
          addCardToPlayer(0,rid);
          triggerCardGetBurst(W/2,H/2,'#ffe080');
          screenShake(5,12);
          sfxStreakUp();
          lg.push('[DUNGEON CLEARED] Legendary reward: '+cr.n+'!');
          if(ri===0){
            objectInteractMsg='DUNGEON CLEARED! Legendary: '+cr.n+'!';
            objectInteractTimer=260;
          }
        },1200+ri*1800);
      });
      // Special goal fanfare screen
      setTimeout(()=>{
        floorFanfareActive=true;floorFanfareTimer=0;
        floorFanfareData={floor:5,cardId:reward1,rarity:5,isNew:!(pl[0].vault&&pl[0].vault.has(reward1)),isGoal:true};
      },600);
      checkWinAndTransition(4000);
    }
    saveGame();
    // Grace period: prevent encounters for 8 seconds after any map transition
    // This stops rivals from immediately ambushing the player on dungeon entry
    encounterCooldown=480;
    if(!tutorialFlags.firstMapChange){tutorialFlags.firstMapChange=true;tutorialMsg=inDungeon?'Dungeon! Cards decay here — escape to save them.':'Town! Cards are safe here.';tutorialMsgTimer=220;}
    // Floor-specific first-visit narrative messages
    if(inDungeon){
      const floorMsgs=[
        '','', // floor 0 and 1 handled by firstMapChange
        'Floor 2: Uncommon cards. Watch for mushroom spores and MIRA\'s traps.',
        'Floor 3: Rare cards. Ancient altars can restore or extend your cards!',
        'Floor 4: Epic cards dwell here. VEGA hunts aggressively — keep moving.',
        'Floor 5: LEGENDARY cards. The deepest floor. Lava destroys cards. Be quick.',
      ];
      const flagKeys=['','','firstFloor2','firstFloor3','firstFloor4','firstFloor5'];
      const fKey=flagKeys[currentFloor];
      if(fKey&&!tutorialFlags[fKey]){
        tutorialFlags[fKey]=true;
        tutorialMsg=floorMsgs[currentFloor];
        tutorialMsgTimer=280;
      }
    }
    // Show dramatic floor card for dungeon transitions
    if(inDungeon&&!exit.isEscape){
      showMapLoadScreen(mapNames[currentMap],AREA_CARD_DESC[currentMap],currentFloor);
    }else if(exit.isGoal){
      showBanner('DUNGEON CLEARED','All 5 floors conquered!');
    }
    fadeIn(()=>{mapTransitioning=false;});
  });
}

// ═══════════════════════════════════════
// PMD-STYLE FLOOR TITLE CARD (v164 dramatic rewrite)
// ═══════════════════════════════════════
let floorTitleFrame=0,floorTitleActive=false,floorTitleFloor=0;
const FLOOR_TITLE_DURATION=200; // ~3.3s at 60fps

const FLOOR_THEMES=[
  null, // 0=town
  {danger:1,sub:'SUNKEN GALLERIES',note:'Scattered cards. Watch your step.',accent:'#6090e0',bg:'#0a0c20',stripe:'#1a2048'},
  {danger:2,sub:'DROWNED ARCHIVES',note:'The archives whisper. MIRA was here.',accent:'#8060c0',bg:'#0c0820',stripe:'#241840'},
  {danger:3,sub:'ECHO CHAMBERS',note:'Echoes of the crew. Proceed carefully.',accent:'#b050a0',bg:'#100820',stripe:'#2c1040'},
  {danger:4,sub:'THE DEEP VAULT',note:'The vault trembles. VEGA hunts below.',accent:'#d04060',bg:'#120608',stripe:'#301020'},
  {danger:5,sub:'ARK CORE',note:'The ARK Core. One heir. No mercy.',accent:'#e0a020',bg:'#120800',stripe:'#301000'},
];

// v264: Pre-bake floor title gradients — 2 createLinearGradient calls × 200 frames → 0 per frame
const _FLOOR_TITLE_BAR_GRADS=(()=>{
  const grads=[null];
  for(let fl=1;fl<=5;fl++){
    const acc=FLOOR_THEMES[fl].accent;
    const gr=g.createLinearGradient(0,0,W,0);
    gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(0.3,acc);
    gr.addColorStop(0.7,acc);gr.addColorStop(1,'rgba(0,0,0,0)');
    grads.push(gr);
  }
  return grads;
})();
const _FLOOR_TITLE_FILL_GRADS=(()=>{
  const bx_=W/2-40; // barX = W/2-40 (barW=80)
  const grads=[null];
  for(let fl=1;fl<=5;fl++){
    const acc=FLOOR_THEMES[fl].accent;
    const gr=g.createLinearGradient(bx_,0,bx_+80,0);
    gr.addColorStop(0,'#50c0ff');gr.addColorStop(0.4,acc);gr.addColorStop(1,'#ff3030');
    grads.push(gr);
  }
  return grads;
})();
function showFloorTitle(floorNum){
  floorTitleActive=true;
  floorTitleFrame=0;
  floorTitleFloor=floorNum;
}

function updateFloorTitle(){
  if(!floorTitleActive)return;
  floorTitleFrame++;
  if(floorTitleFrame>FLOOR_TITLE_DURATION)floorTitleActive=false;
}

function drawFloorTitle(){
  if(!floorTitleActive)return;
  const t=floorTitleFrame;
  const dur=FLOOR_TITLE_DURATION;
  const theme=FLOOR_THEMES[floorTitleFloor]||FLOOR_THEMES[1];
  const f=floorTitleFloor;

  // ── Phase timing ──
  // 0-15: full-screen wipe (horizontal bars slide in from right)
  // 15-50: hold full-screen with pulsing floor number
  // 50-80: floor name types in letter by letter
  // 80-160: hold with scanlines, danger stars appear
  // 160-200: fade out
  let globalAlpha=1;
  if(t<10)globalAlpha=t/10;
  else if(t>160)globalAlpha=Math.max(0,1-(t-160)/40);

  // ── Full-screen black overlay ──
  g.globalAlpha=globalAlpha*0.88;
  g.fillStyle=theme.bg;
  g.fillRect(0,0,W,H);

  // ── Animated stripe bars (PMD-style horizontal bands) ──
  const STRIPE_H=6,STRIPE_GAP=18;
  g.globalAlpha=globalAlpha*0.18;
  g.fillStyle=theme.stripe;
  for(let sy=0;sy<H;sy+=STRIPE_GAP){
    const slideX=t<20?W*(1-t/20):0;
    g.fillRect(slideX,sy,W,STRIPE_H);
  }

  // ── Accent top bar (v264: pre-baked gradient, no alloc per frame) ──
  g.globalAlpha=globalAlpha*(t<15?t/15:1);
  g.fillStyle=_FLOOR_TITLE_BAR_GRADS[f]||_FLOOR_TITLE_BAR_GRADS[1];
  g.fillRect(0,H/2-56,W,3);

  // ── Accent bottom bar ──
  g.fillRect(0,H/2+52,W,3);

  // ── FLOOR NUMBER (giant, centered, glowing) ──
  const flNum=_WLD_FLOOR_NUMS[f]||('B'+f); // v262: hoisted
  const numAlpha=t<20?Math.max(0,(t-10)/10):1;
  const numPulse=1+Math.sin(t*0.08)*0.04;
  // Glow shadow
  g.globalAlpha=globalAlpha*numAlpha*0.4;
  g.font=`bold ${Math.floor(72*numPulse)}px monospace`;
  g.textAlign='center';
  g.fillStyle=theme.accent;
  g.fillText(flNum,W/2+2,H/2+26+2);
  // Main text
  g.globalAlpha=globalAlpha*numAlpha;
  g.fillStyle='#ffffff';
  g.fillText(flNum,W/2,H/2+26);
  g.textAlign='left';

  // ── SUB LABEL (typewriter effect, starts at t=50) ──
  if(t>=50){
    const charCount=Math.floor((t-50)/1.5);
    const subStr=theme.sub.slice(0,charCount);
    const subAlpha=Math.min(1,(t-50)/10);
    g.globalAlpha=globalAlpha*subAlpha;
    g.font='bold 8px monospace';g.textAlign='center';
    g.fillStyle=theme.accent;
    g.fillText(subStr,W/2,H/2-38);
    g.textAlign='left';
  }

  // ── DANGER LEVEL (bar-style, appears at t=80) ──
  if(t>=80){
    const dangerAlpha=Math.min(1,(t-80)/15);
    const d=theme.danger;
    const barW=80,barH=5,barX=W/2-barW/2,barY=H/2+42;
    // Background track
    g.globalAlpha=globalAlpha*dangerAlpha*0.35;
    g.fillStyle='#ffffff';g.fillRect(barX,barY,barW,barH);
    // Filled portion
    g.globalAlpha=globalAlpha*dangerAlpha;
    g.fillStyle=_FLOOR_TITLE_FILL_GRADS[f]||_FLOOR_TITLE_FILL_GRADS[1]; // v264: pre-baked
    const fillW=Math.min(barW,barW*(d/5)*(t<95?(t-80)/15:1));
    g.fillRect(barX,barY,fillW,barH);
    // Label
    g.globalAlpha=globalAlpha*dangerAlpha*0.7;
    g.font='5px monospace';g.textAlign='center';
    g.fillStyle='#c8c8d8';
    g.fillText('DANGER  '+_DANGER_BARS[d],W/2,barY+barH+8); // v303: pre-baked string
    g.textAlign='left';
  }

  // ── FLAVOR TEXT (appears at t=100) ──
  if(t>=100){
    const noteAlpha=Math.min(1,(t-100)/20);
    g.globalAlpha=globalAlpha*noteAlpha*0.65;
    g.font='6px monospace';g.textAlign='center';
    g.fillStyle='#a8a8b8';
    g.fillText(theme.note,W/2,H/2+68);
    g.textAlign='left';
  }

  // ── Corner decorations ──
  g.globalAlpha=globalAlpha*(t<20?t/20:1)*0.5;
  g.strokeStyle=theme.accent;g.lineWidth=1;
  const cd=12; // corner decoration size
  // top-left
  g.beginPath();g.moveTo(32,H/2-60);g.lineTo(32,H/2-60+cd);g.moveTo(32,H/2-60);g.lineTo(32+cd,H/2-60);g.stroke();
  // top-right
  g.beginPath();g.moveTo(W-32,H/2-60);g.lineTo(W-32,H/2-60+cd);g.moveTo(W-32,H/2-60);g.lineTo(W-32-cd,H/2-60);g.stroke();
  // bottom-left
  g.beginPath();g.moveTo(32,H/2+56);g.lineTo(32,H/2+56-cd);g.moveTo(32,H/2+56);g.lineTo(32+cd,H/2+56);g.stroke();
  // bottom-right
  g.beginPath();g.moveTo(W-32,H/2+56);g.lineTo(W-32,H/2+56-cd);g.moveTo(W-32,H/2+56);g.lineTo(W-32-cd,H/2+56);g.stroke();

  g.globalAlpha=1;
}

// ═══════════════════════════════════════
// LOCATION BANNER (FRLG style)
// ═══════════════════════════════════════
function updateBanner(){
  if(!bannerText)return;
  bannerTimer++;
  if(bannerPhase===0&&bannerTimer>20)bannerPhase=1;
  if(bannerPhase===1&&bannerTimer>110)bannerPhase=2;
  if(bannerPhase===2&&bannerTimer>140){bannerText='';bannerSubText='';bannerTimer=0;bannerPhase=0;}
}

function drawBanner(){
  if(!bannerText)return;
  let slideX=0;
  if(bannerPhase===0){
    const t=Math.min(1,bannerTimer/20);
    slideX=-W*(1-t*t*(3-2*t)); // smooth ease
  }else if(bannerPhase===1){
    slideX=0;
  }else{
    const t=Math.min(1,(bannerTimer-110)/30);
    slideX=W*t*t;
  }
  // Dark bar with gradient tint
  const barH=bannerSubText?40:28;
  g.fillStyle='rgba(20,16,24,.88)';
  g.fillRect(slideX,8,W,barH);
  // Accent lines
  g.fillStyle='rgba(240,200,100,.35)';
  g.fillRect(slideX,7,W,1);g.fillRect(slideX,8+barH,W,1);
  g.fillStyle='rgba(200,180,140,.15)';
  g.fillRect(slideX,9,W,1);
  // Text with shadow
  txShadow(bannerText,slideX+W/2-bannerText.length*5,26,10,'#f8f0e0','rgba(0,0,0,.6)');
  if(bannerSubText)txShadow(bannerSubText,slideX+W/2-bannerSubText.length*3,40,6,'#c8b880','rgba(0,0,0,.4)');
}

// ═══════════════════════════════════════
// MINIMAP
// ═══════════════════════════════════════
function drawMinimap(){
  const mmW=130,mmH=88;
  const mx=W-mmW-10,my=H-HUD_HEIGHT-mmH-16;
  const sx=mmW/MW,sy=mmH/MH;

  // ── BASE LAYER: tile colors + fog — updated every 10 frames or on map change ──
  if(currentMap!==_mmBaseMap||fr-_mmBaseFrame>=10){
    const _mc=g;g=mmBaseCtx;
    // Background
    g.clearRect(0,0,mmW,mmH);
    g.fillStyle='rgba(20,20,30,.88)';g.fillRect(0,0,mmW,mmH);
    const m=getMap();
    for(let ty=0;ty<MH;ty+=2){
      for(let tx_=0;tx_<MW;tx_+=2){
        const revealed=fogRevealed[currentMap][ty]?.[tx_]||
                       fogRevealed[currentMap][ty]?.[tx_+1]||
                       fogRevealed[currentMap][ty+1]?.[tx_]||
                       fogRevealed[currentMap][ty+1]?.[tx_+1];
        if(!revealed){bx(tx_*sx,ty*sy,Math.max(1,sx*2),Math.max(1,sy*2),'#080810');continue;}
        const t=m[ty]?.[tx_];
        let col;
        if(t===0||t===17)col='#3070b8';
        else if(t===1||t===7||t===11)col='#48a850';
        else if(t===3||t===13)col='#2a6828';
        else if(t===2)col='#a08050';
        else if(t===4||t===10||t===14)col='#d8c060';
        else if(t===5||t===15||t===16)col='#c04848';
        else if(t===18||t===8)col='#686878';
        else if(t===22||t===23)col='#585860';
        else if(t===25)col='#c04020';
        else if(t===24||t===26)col='#60c0d0';
        else col='#48a850';
        bx(tx_*sx,ty*sy,Math.max(1,sx*2),Math.max(1,sy*2),col);
      }
    }
    g=_mc;
    _mmBaseMap=currentMap;_mmBaseFrame=fr;
  }

  // ── ANIM LAYER: encounter shimmer — updated every 4 frames ──
  if(fr-_mmAnimFrame>=4){
    const _mc=g;g=mmAnimCtx;
    g.clearRect(0,0,mmW,mmH);
    if(inDungeon){
      const m=getMap();
      for(let ty=0;ty<MH;ty+=2){
        for(let tx_=0;tx_<MW;tx_+=2){
          const rev2=fogRevealed[currentMap][ty]?.[tx_]||
                     fogRevealed[currentMap][ty]?.[tx_+1]||
                     fogRevealed[currentMap][ty+1]?.[tx_]||
                     fogRevealed[currentMap][ty+1]?.[tx_+1];
          if(!rev2)continue;
          const t2=m[ty]?.[tx_];
          let encRate=0;
          if(t2===11)encRate=0.30;
          else if(t2===1)encRate=0.15;
          if(encRate===0)continue;
          const phase=(tx_*3+ty*7)&15;
          const shimmer=(_sFr07*_MM_CI39[phase]+_cFr07*_MM_SI39[phase])*0.5+0.5; // v371: sin-addition
          const alpha=(encRate>0.25?0.22:0.12)*shimmer;
          g.globalAlpha=alpha;g.fillStyle=encRate>0.25?'#ffa01e':'#b4f050';
          g.fillRect(tx_*sx,ty*sy,Math.max(1,sx*2),Math.max(1,sy*2));g.globalAlpha=1;
        }
      }
    }
    g=_mc;
    _mmAnimFrame=fr;
  }

  // ── BLIT both cached layers ──
  g.drawImage(mmBaseCanvas,mx,my);
  g.drawImage(mmAnimCanvas,mx,my);

  // ── FRLG-style window border (cheap, always per-frame) ──
  g.fillStyle='#484058';
  g.fillRect(mx,my-1,mmW,1);g.fillRect(mx-1,my,1,mmH);
  g.fillRect(mx+mmW,my,1,mmH);g.fillRect(mx,my+mmH,mmW,1);
  g.fillStyle='#686078';
  g.fillRect(mx+1,my,mmW-2,1);g.fillRect(mx,my+1,1,mmH-2);
  g.fillRect(mx+mmW-1,my+1,1,mmH-2);g.fillRect(mx+1,my+mmH-1,mmW-2,1);

  // ── Dungeon legend (static text, cheap) ──
  if(inDungeon){
    bx(mx+2,my+mmH-9,4,4,'rgba(255,160,30,0.65)');
    txShadow('30%',mx+7,my+mmH-5,4,'rgba(220,160,60,0.7)','rgba(0,0,0,.3)');
    bx(mx+26,my+mmH-9,4,4,'rgba(180,240,80,0.55)');
    txShadow('15%',mx+31,my+mmH-5,4,'rgba(160,200,80,0.7)','rgba(0,0,0,.3)');
  }

  // ── Dynamic dots: exits, NPCs, traps, rivals, player (all cheap, per-frame) ──
  const exitPulse=_sFr15*0.4+0.6; // v369: cached
  for(let _ei=0,_el=exits.length;_ei<_el;_ei++){
    const e=exits[_ei];
    if(e.fromMap===currentMap){
      for(let _ti=0,_tl=e.tiles.length;_ti<_tl;_ti++){
        const ex=e.tiles[_ti][0],ey=e.tiles[_ti][1];
        if(fogRevealed[currentMap][ey]?.[ex]){
          g.globalAlpha=exitPulse;
          bx(mx+ex*sx,my+ey*sy,Math.max(1,sx),Math.max(1,sy),'#fff');
          g.globalAlpha=1;
        }
      }
    }
  }
  for(let _ni=0,_nl=npcs.length;_ni<_nl;_ni++){
    const npc=npcs[_ni];
    if(npc.map===currentMap&&fogRevealed[currentMap][npc.y]?.[npc.x])
      bx(mx+npc.x*sx,my+npc.y*sy,Math.max(1,sx),Math.max(1,sy),'#f0d040');
  }
  for(const key of triggeredTraps){
    const parts=key.split('-');
    const tMap=parseInt(parts[0]),tx_=parseInt(parts[1]),ty_=parseInt(parts[2]);
    if(tMap===currentMap)bx(mx+tx_*sx,my+ty_*sy,Math.max(1,sx),Math.max(1,sy),'#ff3030');
  }
  for(let _ri=1;_ri<pl.length;_ri++){
    const rp=pl[_ri],idx=_ri-1;
    if(rivalMaps[idx]===currentMap&&(isVisibleThroughFog(rp.x,rp.y,3)||crystalRevealTimer>0)){
      const rpx=mx+rp.x*sx,rpy=my+rp.y*sy;
      bx(rpx,rpy,2,2,rp.c);
      if(crystalRevealTimer>0){
        const ai=rivalAI[idx];
        const gdx=ai.goalX-rp.x,gdy=ai.goalY-rp.y;
        if(gdx!==0||gdy!==0){
          const len=Math.sqrt(gdx*gdx+gdy*gdy);
          g.strokeStyle=rp.c;g.lineWidth=1;
          g.beginPath();g.moveTo(rpx+1,rpy+1);g.lineTo(rpx+1+gdx/len*4,rpy+1+gdy/len*4);g.stroke();
        }
      }
    }
  }
  if(inDungeon){
    for(let _ei=0,_el=exits.length;_ei<_el;_ei++){
      const ex=exits[_ei];
      if(ex.fromMap!==currentMap)continue;
      const col=ex.isGoal?'#ffe060':ex.isEscape?'#40e060':'#e0c040';
      const ePulse=0.8+_sFr10*0.2; // v370: cached
      for(let _ti=0,_tl=ex.tiles.length;_ti<_tl;_ti++){
        const etx=ex.tiles[_ti][0],ety=ex.tiles[_ti][1];
        g.globalAlpha=ePulse;
        bx(mx+etx*sx,my+ety*sy,Math.max(2,sx),Math.max(2,sy),col);
        g.globalAlpha=1;
      }
    }
  }
  // v438: floor items on minimap (revealed only, pulsing dot colored by rarity)
  if(inDungeon){
    const _fItems=floorItems[currentMap];
    if(_fItems&&_fItems.length>0){
      const iPulse=0.6+_sFr12*0.4; // v369: cached
      for(let _ii=0;_ii<_fItems.length;_ii++){
        const it=_fItems[_ii];
        if(!fogRevealed[currentMap][it.y]?.[it.x])continue;
        const cr_=CD[it.cardId-1];if(!cr_)continue;
        g.globalAlpha=iPulse;
        bx(mx+it.x*sx,my+it.y*sy,Math.max(2,sx+1),Math.max(2,sy+1),RARITY_COLOR[cr_.r]||'#f0c030');
        g.globalAlpha=1;
      }
    }
  }
  const playerPulse=_sFr20*0.3+0.7; // v369: cached
  g.globalAlpha=playerPulse;
  bx(mx+pl[0].x*sx-1,my+pl[0].y*sy-1,3,3,'#fff');bx(mx+pl[0].x*sx,my+pl[0].y*sy,1,1,'#40f040');
  g.globalAlpha=1;
  txShadow(mapNames[currentMap],mx,my-5,4,mapColors[currentMap],'rgba(0,0,0,.4)');
}

// ═══════════════════════════════════════
// WILD CARD ENCOUNTER (tall grass)
// ═══════════════════════════════════════
function tryWildEncounter(){
  // GDD v1.0: encounters only happen in dungeon (town is safe zone)
  if(!inDungeon)return;
  const m=getMap();
  const tile=m[pl[0].y]?.[pl[0].x];
  // Base rates: Tall grass 25%, regular grass 12%
  // Streak bonus: +5% per streak level
  // Danger LOW: +5% bonus to encounter rate
  const streakBonus=Math.min(streakCount*0.05,0.25); // cap at +25%
  const dangerBonus=areaDanger[currentMap]<DANGER_LOW_THRESH?0.05:0;
  // Rubber-banding: +10% encounter rate when behind on unique cards (fewer than rivals)
  const playerUnique=hasUniqueCards(0).size;
  const maxRivalUnique=Math.max(rivalUniqSize(1),rivalUniqSize(2)); // v261: no Set alloc
  const rubberBand=playerUnique<maxRivalUnique?0.10:0;
  if(tile===11){
    if(Math.random()>(0.15+streakBonus+dangerBonus+rubberBand))return; // tall grass: 15% base (UX-4: was 30%)
  }else if(tile===1){
    if(Math.random()>(0.075+streakBonus+dangerBonus+rubberBand))return; // regular grass: 7.5% base (UX-4: was 15%)
  }else{
    return;
  }

  // Determine card based on current dungeon floor pool
  const floorPool=AREA_CARDS[currentMap]||AREA_CARDS[1];
  // v299: pickFromPool replaces filter+alloc pattern in both branches
  let cardIdx;
  cardIdx=pickFromPool(floorPool)-1; // vault-new preferred, fallback to random

  wildEncounterActive=true;
  wildEncounterCard=cardIdx;
  wildEncounterFrame=fr;
  sfxEncounter();
  flash();
  // T63: tutorial step 2 — found first card in wild
  if(isTutorial&&tutorialStep===2)tutorialStepDone('card');
}

function drawWildEncounter(){
  if(!wildEncounterActive)return;
  const t=fr-wildEncounterFrame;

  if(t<30){
    // v119: Dramatic silhouette reveal — rarity-hinted card appearance
    const wCr=CD[wildEncounterCard];
    const wRar=(wCr&&wCr.r)||1;
    const wRcol=_WLD_RAR_COLS[wRar]||'#f0c830'; // v262: hoisted
    const prog=Math.min(1,t/24);
    const pulse=0.5+Math.sin(t*0.35)*0.5; // 1 call (varies with animation-local t)
    // Dim overlay
    g.globalAlpha=Math.min(0.85,prog*0.85);
    bx(0,0,W,H,'rgba(0,0,0,1)');
    g.globalAlpha=1;
    // Card silhouette rising from bottom
    const silW=64,silH=90;
    const riseY=H-70-Math.round(prog*(H/2+20));
    g.globalAlpha=prog;
    bx(W/2-silW/2-2,riseY-2,silW+4,silH+4,wRcol); // rarity border glow
    bx(W/2-silW/2,riseY,silW,silH,'#06061a'); // dark body
    // Inner details (rarity color seeps in)
    g.globalAlpha=prog*pulse*0.4;
    bx(W/2-silW/2+4,riseY+4,silW-8,Math.round(silH*0.6),wRcol);
    g.globalAlpha=prog;
    // "?" on silhouette
    txShadow('?',W/2-9,riseY+silH/2+8,20,'#1c1c48','rgba(0,0,0,.5)');
    // Orbiting rarity sparks — v394: sin-addition + Euler recurrence (3*N → 6 sin/cos calls total)
    {const N_=wRar+3;
    const _t18S=Math.sin(t*0.18),_t18C=Math.cos(t*0.18); // for dist: sin(t*0.18+oi)
    const _t20S=Math.sin(t*0.2),_t20C=Math.cos(t*0.2);   // for ang temporal part
    const _oStep=Math.PI*2/N_,_oSS=Math.sin(_oStep),_oSC=Math.cos(_oStep);
    let _si=0,_ci=1; // spatial state for i*(2π/N_)
    for(let oi=0;oi<N_;oi++){
      // ang = t*0.2 + oi*(2π/N_); sin-addition via spatial Euler state (_si,_ci)
      const _ac=_t20C*_ci-_t20S*_si; // cos(ang)
      const _as=_t20S*_ci+_t20C*_si; // sin(ang)
      // dist = 38 + sin(t*0.18+oi)*8; sin-addition: oi is integer so sin(oi)=_IDX_SI[oi]
      const dist=38+(_t18S*_IDX_CI[oi]+_t18C*_IDX_SI[oi])*8;
      g.globalAlpha=prog*pulse*0.8;
      bx(W/2+_ac*dist-2,riseY+silH/2+_as*dist-2,5,5,wRcol);
      const _ns=_si*_oSC+_ci*_oSS;_ci=_ci*_oSC-_si*_oSS;_si=_ns; // Euler advance
    }}
    g.globalAlpha=prog;
    // Text panel just below silhouette
    win(W/2-148,riseY+silH+10,296,36);
    txShadow('Wild card appeared!',W/2-116,riseY+silH+34,11,'#c04040','rgba(200,180,140,.3)');
    g.globalAlpha=1;
  }else if(t<40){
    // Brief pause
  }else if(!cardAcqActive&&t>=40&&t<42){
    // Start card acquisition
    const cr=CD[wildEncounterCard];
    // Find empty slot
    const wildCardId=wildEncounterCard+1;
    const wasInVault=pl[0].vault&&pl[0].vault.has(wildCardId);
    const wAdded=addCardToPlayer(0,wildCardId); // updates vault + hand
    if(wAdded){
      startCardAcquisition(wildEncounterCard);
      lg.push('Wild: Found '+cr.n+' in '+mapNames[currentMap]+'!');
      // Streak: new unique card
      if(!wasInVault){streakCount++;streakDisplayTimer=60;sfxStreakUp();}
      // Tutorial: first card
      if(!tutorialFlags.gotFirstCard){tutorialFlags.gotFirstCard=true;tutorialMsg='Check your cards with SPACE > CARDS';tutorialMsgTimer=180;}
    }else{
      // Hand full - offer discard (vault already updated by addCardToPlayer)
      discardActive=true;discardSelIdx=0;discardPendingCard=wildCardId;discardSource='wild';
    }
  }else if(discardActive){
    // Wait for discard dialog
  }else if(t>150||cardAcqDone){
    wildEncounterActive=false;
    cardAcqDone=false;
    // Check win after acquiring a card
    checkWinAndTransition(500);
  }
}

// ═══════════════════════════════════════
// TREASURE PICKUP
// ═══════════════════════════════════════
function checkTreasure(){
  for(const t of treasures){
    if(t.collected)continue;
    if(t.map===currentMap&&t.x===pl[0].x&&t.y===pl[0].y){
      t.collected=true;
      const cr=CD[t.card];
      const treasureCardId=t.card+1;
      const tAdded=addCardToPlayer(0,treasureCardId); // updates vault + hand
      if(tAdded){
        startCardAcquisition(t.card);
        twSet('You found a hidden '+cr.n+' card!');
        lg.push('Found hidden '+cr.n+'!');
        checkWinAndTransition(2000);
      }else{
        // Hand full - offer discard (vault already updated by addCardToPlayer)
        discardActive=true;discardSelIdx=0;discardPendingCard=treasureCardId;discardSource='wild';
        twSet('Found a '+cr.n+' card! Discard one to keep it.');
      }
      return;
    }
  }
}

// v82: Dynamic NPC dialogue — context-aware lines per game state
function getNPCDialog(npc){
  const vaultSz=pl[0].vault?pl[0].vault.size:0;
  const lastRun=runSummaryData;
  if(npc.name==='Card Merchant'){
    if(vaultSz===0)return['Just starting out?','Browse our listings!','Common cards are','a great foundation.','Every legend begins','with card #1.'];
    if(vaultSz<10)return[vaultSz+' cards so far!','Check listings for','cards you are missing.','Buy, sell, or trade','safely here in town.','Good hunting!'];
    if(vaultSz<30)return[''+vaultSz+'/60 collected!','Looking to fill gaps?','Check our listings.','Rarer cards fetch','higher prices here.','Trade wisely!'];
    if(vaultSz<50)return[''+vaultSz+'/60 — impressive!','Any specific cards','you still need?','I can help source','hard-to-find ones.','Ask anytime!'];
    return[''+vaultSz+'/60 cards!','You\'re almost there.','Check rare listings','before your next run.','Don\'t let rivals','beat you to it!'];
  }
  if(npc.name==='Trade Master'){
    if(vaultSz<10)return['Build your collection','first, adventurer.','Trade when you have','duplicate cards to spare.','Come back later','once you\'ve explored!'];
    const rn2=cdCount(pl[1].cd);const rn3=cdCount(pl[2].cd); // v301: cdCount, no filter
    return['You hold '+vaultSz+' unique cards.','VEGA carries '+rn2+'.','MIRA carries '+rn3+'.','Got duplicates?','Let\'s make a deal.','Fair trades — always.'];
  }
  if(npc.name==='ARK Guide'){
    if(vaultSz<4)return['Long ago, the ARK','sank near this isle.','Its crew sealed power','into 60 arcane cards.','Collect all 60','to claim the legacy!'];
    if(vaultSz<12)return['The dungeon is the','sunken ARK itself.','B1: Sunken Galleries','B3: Echo Chambers','B5: ARK Core — deepest.','Rarer cards below!'];
    if(vaultSz<25)return['VEGA: former sea-hunter.','Relentless. Predatory.','MIRA: cold archivist.','Models every move.','They both want','what the ARK hid.'];
    if(vaultSz<45)return[''+vaultSz+'/60 cards!','The Alchemist fuses','3 same-rarity cards','into a rarer one.','The ARK crew used','this very method.'];
    return[''+vaultSz+'/60 — almost there!','The ARK\'s original crew','never finished this.','You just might.','Guard your hand.','The end is near.'];
  }
  if(npc.name==='Dungeon Porter'){
    if(lastRun&&lastRun.cardsGained>0)return['Back alive — good.','The ARK keeps score.',''+lastRun.cardsGained+' card'+(lastRun.cardsGained>1?'s':'')+' gained.','The crew would\'ve','been proud of that.','Ready to go again?'];
    if(lastRun&&lastRun.cardsGained===0)return['Empty-handed again.','The ARK doesn\'t forgive','careless explorers.','But it doesn\'t','forget brave ones either.','Try a safer floor.'];
    return['East is the dungeon —','the sunken ARK vessel.','Cards DECAY in 3.5 min.','Escape west before','they crumble to nothing.','I\'ll keep the light on.'];
  }
  if(npc.name==='Alchemist'){
    // v313: specific rarity-aware dialog
    const rc=[0,0,0,0,0]; // rc[1]=common, rc[2]=uncommon, rc[3]=rare, rc[4]=epic
    for(let _ai=0,_al=pl[0].cd.length;_ai<_al;_ai++){const _c=pl[0].cd[_ai];if(_c>0){const _r=CD[_c-1]?.r||1;if(_r<=4)rc[_r]++;}}
    let bestRar=0;for(let _r=4;_r>=1;_r--){if(rc[_r]>=3){bestRar=_r;break;}}
    if(bestRar>0){
      const cnt=rc[bestRar];const fromLbl=_SYNTH_RAR_LABELS[bestRar];
      const toLbl=bestRar<4?_SYNTH_RAR_LABELS[bestRar+1]:'Legendary';
      return['You have '+cnt+' '+fromLbl+'s!','Bring me three of them.','I\'ll forge them into','a '+toLbl+' card.','The power is yours','to claim — come!'];
    }
    // Close (2 of a rarity): encourage
    let closeRar=0;for(let _r=4;_r>=1;_r--){if(rc[_r]===2){closeRar=_r;break;}}
    if(closeRar>0){
      const fromLbl=_SYNTH_RAR_LABELS[closeRar];
      const toLbl=closeRar<4?_SYNTH_RAR_LABELS[closeRar+1]:'Legendary';
      return['Almost there!','Two '+fromLbl+'s in hand.','One more '+fromLbl,'and I can forge','a '+toLbl+' card','for you. Seek it!'];
    }
    return['I can fuse cards into','higher rarities!','Bring me 3 cards','of the same rarity.','I will forge them','into something greater.'];
  }
  return npc.dialog;
}

// v82: ambient short lines per NPC (shown as proximity bubbles)
function getNPCAmbientLines(npc){
  const vaultSz=pl[0].vault?pl[0].vault.size:0;
  if(npc.name==='Card Merchant'){
    if(vaultSz>=50)return['Last few cards left!','Rare listings posted.'];
    if(vaultSz>=20)return['Good stock today!','Looking to sell?','Come browse!'];
    return['Psst! Fresh listings!','Fair prices here!','Come take a look!'];
  }
  if(npc.name==='Trade Master')return['Got duplicates?','Looking to trade?','Best rates in town.'];
  if(npc.name==='Gacha Keeper'){
    if(gachaPityCount>7)return['Your luck is due...','One more pull?'];
    if(gachaPityCount>3)return['Luck is building up!','Keep trying!'];
    return['Try your luck!','Rare cards await!','Lucky draw today?'];
  }
  if(npc.name==='ARK Guide')return['The ARK waits below.','60 cards. One heir.','Ask me anything.'];
  if(npc.name==='Dungeon Porter')return['Sunken halls await.','Cards decay fast below!','Come back in one piece.'];
  if(npc.name==='Alchemist'){
    // v313: contextual ambient — announce when synthesis is ready
    const rc=[0,0,0,0,0];
    for(let _ai=0,_al=pl[0].cd.length;_ai<_al;_ai++){const _c=pl[0].cd[_ai];if(_c>0){const _r=CD[_c-1]?.r||1;if(_r<=4)rc[_r]++;}}
    for(let _r=4;_r>=1;_r--){if(rc[_r]>=3){return['3 '+_SYNTH_RAR_LABELS[_r]+'s!','I can forge now!','Come talk to me!'];}}
    return['Bring me three cards.','I forge rarities.','Synthesis awaits!'];
  }
  return[];
}

// ═══════════════════════════════════════
// NPC INTERACTION
// ═══════════════════════════════════════
function checkNPCInteraction(){
  const p=pl[0];
  for(const npc of npcs){
    if(npc.map!==currentMap)continue;
    // Check if adjacent
    const dx=Math.abs(p.x-npc.x),dy=Math.abs(p.y-npc.y);
    if(dx+dy===1){
      // NPC faces the player
      if(p.x<npc.x)npc.dir=1;else if(p.x>npc.x)npc.dir=3;
      else if(p.y<npc.y)npc.dir=2;else npc.dir=0;

      // Player auto-faces the NPC
      if(npc.x<p.x)p.dir=1;else if(npc.x>p.x)p.dir=3;
      else if(npc.y<p.y)p.dir=2;else if(npc.y>p.y)p.dir=0;

      // Gacha Keeper opens the gacha
      if(npc.name==='Gacha Keeper'){
        gachaActive=true;gachaPhase='menu';gachaSelectedTier=0;gachaResultCard=-1;gachaSpinFrame=0;
        if(!tutorialFlags.firstGacha){tutorialFlags.firstGacha=true;setTimeout(()=>{tutorialMsg='Gacha: Z=Draw, X=Cancel. Higher tiers = rarer cards!';tutorialMsgTimer=200;},100);}
        sfxShopOpen();
        return true;
      }
      // Card Merchant opens marketplace
      if(npc.name==='Card Merchant'){
        marketActive=true;marketTab=0;marketPage=0;
        sfxShopOpen();
        return true;
      }
      // v74: Alchemist opens synthesis
      if(npc.name==='Alchemist'){
        synthActive=true;synthPhase='pick';synthSelected=[];synthRarityFilter=1;synthResultCard=-1;
        sfxShopOpen();
        return true;
      }
      npcDialogActive=true;
      npcDialogLines=getNPCDialog(npc); // v82: context-aware dialog
      npcDialogIdx=0;
      npcDialogName=npc.name;
      npcDialogOpenFrame=fr;
      sfxConfirm();
      return true;
    }
  }
  return false;
}

// ═══════════════════════════════════════
// SIGNPOST INTERACTION
// ═══════════════════════════════════════
function getSignpostMessage(mapIdx, tx_, ty){
  if(mapIdx===0){
    // はじまりのまち signposts
    if(tx_===13&&ty===5) return 'Marketplace -- buy, sell and trade cards safely here.';
    if(tx_===17&&ty===5) return 'Gacha Machine -- spend SOL for a random card draw.';
    if(tx_===15&&ty===21) return 'Town Square -- safe harbor. The ARK\'s shadow falls east. No battles here.';
    return 'はじまりのまち -- the only light left on ARK Isle. Rest while you can.';
  }
  if(mapIdx===1){
    return 'SUNKEN GALLERIES (B1) -- the ARK\'s outer hull. Common & Uncommon cards drift through flooded corridors. Cards decay at 3.5 min.';
  }
  if(mapIdx===2){
    return 'DROWNED ARCHIVES (B2) -- the ARK\'s library. Scholars sealed Uncommon cards here when the vessel sank. Rivals grow bolder.';
  }
  if(mapIdx===3){
    return 'ECHO CHAMBERS (B3) -- the engine room. Old power still hums. Rare cards vibrate with residual force. High danger.';
  }
  if(mapIdx===4){
    return 'THE DEEP VAULT (B4) -- the ARK crew\'s treasury. Epic cards sealed by hand. Very few explorers return from here.';
  }
  if(mapIdx===5){
    return 'ARK CORE (B5) -- the heart of the sunken vessel. Legendary cards wait for the one who inherits the ARK\'s legacy. Turn back now or claim everything.';
  }
  return 'A salt-eaten signpost. Most of the writing has washed away.';
}

function checkSignpostInteraction(){
  const p=pl[0];
  // Check the tile the player is facing
  let fx=p.x, fy=p.y;
  if(p.dir===0)fy++;else if(p.dir===2)fy--;
  else if(p.dir===1)fx--;else if(p.dir===3)fx++;
  const m=getMap();
  if(fx>=0&&fx<MW&&fy>=0&&fy<MH&&m[fy]?.[fx]===19){
    signpostActive=true;
    signpostText=getSignpostMessage(currentMap, fx, fy);
    signpostFrame=fr;
    sfxSignRead();
    return true;
  }
  return false;
}

function drawSignpostDialog(){
  if(!signpostActive)return;
  const dlgSlide=Math.min(1,(fr-signpostFrame)/6);
  const dlgEase=easeInOut(dlgSlide);
  const slideOff=90*(1-dlgEase);
  g.globalAlpha=dlgEase;
  win(6,H-100+slideOff,W-12,90);
  win(10,H-110+slideOff,96,20);
  txShadow('SIGNPOST',20,H-95+slideOff,6,'#806030','rgba(0,0,0,.4)');
  const maxChars=52;
  let line1=signpostText, line2='';
  if(signpostText.length>maxChars){
    let breakAt=signpostText.lastIndexOf(' ',maxChars);
    if(breakAt<1)breakAt=maxChars;
    line1=signpostText.substring(0,breakAt);
    line2=signpostText.substring(breakAt+1);
  }
  txShadow(line1,20,H-70+slideOff,7,'#303028','rgba(255,255,255,.15)');
  if(line2)txShadow(line2,20,H-52+slideOff,7,'#303028','rgba(255,255,255,.15)');
  const arrowBounce=_sFr15*2; // v369: cached
  txShadow('\u25BC',W-24,H-18+slideOff+arrowBounce,7,'#806030','rgba(0,0,0,.4)');
  g.globalAlpha=1;
}

// ═══════════════════════════════════════
// TRADING POST
// ═══════════════════════════════════════
function openCardShop(){
  shopActive=true;
  shopSelectedIdx=0;
  shopConfirm=false;
  shopPhase='list';
  shopResultText='';
  shopOpenFrame=fr;
  sfxShopOpen();
}

// v267: reusable slot buffers — eliminates slots=[] per frame in drawCardShop/drawSynthesisShop
const _shopSlotsBuf=new Int8Array(7);
const _synthSlotsBuf=new Int8Array(7); // rarity-filtered slots for synthesis shop
function getPlayerFilledSlots(){
  const slots=[];
  for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)slots.push(i);}
  return slots;
}
// Allocation-free version used by render path only
function _getFilledSlotsN(){
  let n=0;for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)_shopSlotsBuf[n++]=i;}return n;
}

function doShopTrade(){
  const filled=getPlayerFilledSlots();
  if(filled.length===0)return;
  // Guard: clamp index in case hand changed since UI was opened (decay, etc.)
  if(shopSelectedIdx>=filled.length)shopSelectedIdx=0;
  const slot=filled[shopSelectedIdx];
  const oldCard=pl[0].cd[slot];
  if(oldCard<1||oldCard>CD.length)return; // guard: empty/invalid slot
  const oldName=CD[oldCard-1].n;
  // Prioritize cards not yet in vault (new uniques) for progression
  const ownedInHand=new Set();for(let _i=0;_i<pl[0].cd.length;_i++){if(pl[0].cd[_i]>0)ownedInHand.add(pl[0].cd[_i]);}
  const vault=pl[0].vault||new Set();
  const vaultNew=[]; // never collected
  const vaultOwned=[]; // in vault but not in hand
  for(let i=1;i<=60;i++){
    if(i===oldCard)continue; // don't give back the same card
    if(!vault.has(i)) vaultNew.push(i);
    else if(!ownedInHand.has(i)) vaultOwned.push(i);
  }
  let newCard;
  if(vaultNew.length>0){
    // Always give a card the player has never owned
    newCard=vaultNew[Math.floor(Math.random()*vaultNew.length)];
  }else if(vaultOwned.length>0){
    // Fall back to vault-owned cards not in hand
    newCard=vaultOwned[Math.floor(Math.random()*vaultOwned.length)];
  }else{
    // All 60 collected — pick any card different from old
    do{ newCard=Math.floor(Math.random()*60)+1; }while(newCard===oldCard);
  }
  // Check if new card is a first-time unique before adding
  const isNewUnique=pl[0].vault&&!pl[0].vault.has(newCard);
  // Use proper card management: clear old slot then add new card
  pl[0].cd[slot]=0;cardTimers[slot]=0;
  syncCardCount(0);
  // Add new card via addCardToPlayer so vault is updated properly
  addCardToPlayer(0,newCard);
  const newName=CD[newCard-1].n;
  shopResultText='Traded '+oldName+' for '+newName+'!'+(isNewUnique?' NEW UNIQUE!':'');
  shopResultFrame=fr;
  shopPhase='result';
  startCardAcquisition(newCard-1);
  sfxShopTrade();
  lg.push('Shop: Traded '+oldName+' → '+newName+(isNewUnique?' (NEW UNIQUE!)':'')+'!');
  checkWinAndTransition(2000);
}

function drawCardShop(){
  if(!shopActive)return;
  // Slide-in animation
  const dlgSlide=Math.min(1,(fr-shopOpenFrame)/8);
  const dlgEase=easeInOut(dlgSlide);
  const slideOff=(H-50)*(1-dlgEase);
  bx(0,0,W,H,'rgba(0,0,0,.5)');
  g.globalAlpha=dlgEase;
  const wX=50,wY=25+slideOff,wW=W-100,wH=H-50;
  win(wX,wY,wW,wH);
  // Gold header bar
  bx(wX,wY,wW,3,'#c0a030');
  bx(wX,wY,3,wH,'#c0a030');
  txShadow('TRADE CARDS',W/2-80,wY+28,12,'#f0c830','rgba(0,0,0,.4)');
  bx(wX+16,wY+36,wW-32,1,'rgba(200,180,100,.3)');

  if(shopPhase==='list'){
    const _sfN=_getFilledSlotsN(); // v267: no alloc — uses _shopSlotsBuf
    if(_sfN===0){
      txShadow('You have no cards to trade.',wX+24,wY+80,8,'#989080','rgba(0,0,0,.2)');
      txShadow('Press X to leave.',wX+24,wY+102,7,'#686068','rgba(0,0,0,.15)');
    }else{
      txShadow('Select a card to offer:',wX+24,wY+56,7,'#988868','rgba(0,0,0,.2)');
      for(let i=0;i<_sfN;i++){
        const slot=_shopSlotsBuf[i];const cd=pl[0].cd[slot];
        const cr=CD[cd-1];
        const rowH=38,ry=wY+68+i*rowH;
        const isSel=i===shopSelectedIdx;
        const rarCol=RARITY_COLOR[cr.r]||'#888898';
        // Row highlight
        if(isSel){
          bx(wX+8,ry-4,wW-16,rowH-2,'rgba(192,168,96,.2)');
          bx(wX+8,ry-4,3,rowH-2,rarCol);
          const bob=_sFr15*2; // v369: cached
          txShadow('\u25B6',wX+14+bob,ry+16,9,'#c04040','rgba(0,0,0,.4)');
        }else{
          bx(wX+8,ry-4,3,rowH-2,'rgba(200,180,100,.15)');
        }
        // Card mini frame + sprite
        bx(wX+24,ry,24,26,cr.d);bx(wX+25,ry+1,22,24,cr.c);
        drawCardCharacter(wX+26,ry+2,cd,0.9,fr);
        // Name + flavor text
        txShadow(cr.n,wX+56,ry+14,10,isSel?'#f0e0a0':'#e0d8c0','rgba(0,0,0,.3)');
        txShadow(cr.f,wX+56,ry+28,7,'#988878','rgba(0,0,0,.2)');
        // Rarity stars (right side)
        for(let s=0;s<cr.r;s++)bx(wW-20-s*10,ry+10,7,7,rarCol);
      }
      txShadow('Z=Select   X=Leave',wX+24,wY+wH-24,7,'#686868','rgba(0,0,0,.2)');
    }
  }else if(shopPhase==='confirm'){
    const _sfN=_getFilledSlotsN(); // allocation-free confirm render
    if(_sfN===0){shopPhase='list';return;}
    const slot=_shopSlotsBuf[Math.min(shopSelectedIdx,_sfN-1)];
    const cd=pl[0].cd[slot];
    if(!cd||cd<1||cd>CD.length){shopPhase='list';return;}
    const cr=CD[cd-1];
    const rarCol=RARITY_COLOR[cr.r]||'#888898';
    const vaultSz=pl[0].vault?pl[0].vault.size:0;
    // Centered card preview with rarity glow
    const cX=W/2-40,cY=wY+60;
    g.globalAlpha=dlgEase*0.3;
    bx(cX-6,cY-6,92,112,rarCol);
    g.globalAlpha=dlgEase;
    drawCardFrame(cX,cY,80,100,cd-1,true);
    // Rarity label
    txShadow(RARITY_LABEL[cr.r]||'',W/2-32,cY+110,8,rarCol,'rgba(0,0,0,.3)');
    // Trade description — v344: lazy cache keyed on card reference
    if(_tradeDescRef!==cr){_tradeDescRef=cr;_tradeDescLbl='Trade  '+cr.n+'  for a card you don\'t have?';}
    txShadow(_tradeDescLbl,W/2-200,wY+wH-120,8,'#e0d8c0','rgba(0,0,0,.3)');
    if(_tradeVaultKey!==vaultSz){_tradeVaultKey=vaultSz;_tradeVaultLbl='('+(_UNIQ60[vaultSz]||(vaultSz+'/60'))+' collected)';} // v330: lazy
    txShadow(_tradeVaultLbl,W/2-68,wY+wH-100,7,'#c0a030','rgba(0,0,0,.25)');
    // Confirm buttons
    bx(W/2-80,wY+wH-74,72,24,'rgba(0,80,0,.35)');bx(W/2-80,wY+wH-74,72,1,'#30a030');
    txShadow('Z YES',W/2-66,wY+wH-58,9,'#40d080','rgba(0,0,0,.4)');
    bx(W/2+14,wY+wH-74,60,24,'rgba(80,0,0,.35)');bx(W/2+14,wY+wH-74,60,1,'#a03030');
    txShadow('X  NO',W/2+18,wY+wH-58,9,'#d04040','rgba(0,0,0,.4)');
  }else if(shopPhase==='result'){
    // Animated result text
    const rAge=fr-shopResultFrame;
    const rA=Math.min(1,rAge/12);
    g.globalAlpha=dlgEase*rA;
    const isSuccess=shopResultText.includes('Traded');
    const rCol=isSuccess?'#40d080':'#d04040';
    txShadow(isSuccess?'TRADE COMPLETE!':'TRADE FAILED',W/2-100,wY+wH/2-30,14,rCol,'rgba(0,0,0,.4)');
    // Show result detail below
    if(shopResultText&&rAge>8){
      // Wrap result text
      const maxC=48;
      let t1=shopResultText,t2='';
      if(shopResultText.length>maxC){const b=shopResultText.lastIndexOf(' ',maxC);if(b>0){t1=shopResultText.slice(0,b);t2=shopResultText.slice(b+1);}}
      txShadow(t1,W/2-160,wY+wH/2+4,8,'#e0d8c0','rgba(0,0,0,.3)');
      if(t2)txShadow(t2,W/2-160,wY+wH/2+20,8,'#e0d8c0','rgba(0,0,0,.3)');
    }
    if(rAge>20)txShadow('Press Z to continue',W/2-90,wY+wH-32,7,'#989080','rgba(0,0,0,.2)');
    g.globalAlpha=dlgEase;
  }
  g.globalAlpha=1;
}

// ═══════════════════════════════════════
// T73: GENERAL ITEM SHOP — purchase items via x402 or SOL simulation
// ═══════════════════════════════════════
function doBuyItem(item){
  itemShopTxPhase='loading';itemShopError='';itemShopResult='';
  // Try x402 if available, else simulate locally
  const doSimulate=()=>{
    // Simulate purchase: add to inventory + apply effect
    itemInvAdd(item.id,1);
    if(item.id==='booster'){
      // Pick a random card not yet in vault
      const vault_=pl[0].vault||new Set();
      const pool=[];for(let i=1;i<=60;i++){if(!vault_.has(i))pool.push(i);}
      if(pool.length===0){itemShopResult='All cards collected!';itemShopTxPhase='done';return;}
      const picked=pool[Math.floor(Math.random()*pool.length)];
      itemShopRevealCard=picked;itemShopRevealFrame=fr;itemShopTxPhase='reveal';
      lg.push('[SHOP] Booster: got '+CD[picked-1].n);
      return;
    }
    if(item.id==='hint'){
      const rivalFloor=rivalMaps[0]!==undefined?rivalMaps[0]:0;
      const floorName=mapNames[rivalFloor]||'Unknown';
      itemShopResult='Rival spotted: '+floorName;
      twSet('HINT: Rival is at '+floorName+'!');
      lg.push('[SHOP] Hint: Rival at '+floorName);
    }else if(item.id==='revive'){
      // Find first empty slot and restore with a random card
      let restored=false;
      for(let s=0;s<HAND_SIZE;s++){
        if(pl[0].cd[s]<=0){
          const pool=[];for(let i=1;i<=60;i++)if(CD[i-1]&&CD[i-1].r<=2)pool.push(i);
          const picked=pool[Math.floor(Math.random()*pool.length)]||1;
          pl[0].cd[s]=picked;cardTimers[s]=inDungeon?Date.now():0;decayWarn[s]=0;syncCardCount(0);
          itemShopResult='Revived '+CD[picked-1].n+'!';
          lg.push('[SHOP] Revive: '+CD[picked-1].n+' in slot '+s);
          restored=true;break;
        }
      }
      if(!restored){itemShopResult='Hand full — discard a card first!';}
    }else if(item.id==='scout'){
      // Reveal all uncollected treasures on current floor
      let found=0;
      for(const t of treasures){if(t.map===currentMap&&!t.collected){t.scouted=true;found++;}}
      itemShopResult='Scouted '+found+' chest'+(found!==1?'s':'')+'!';
      lg.push('[SHOP] Scout: '+found+' chest(s) on map '+currentMap);
    }
    if(itemShopTxPhase!=='reveal')itemShopTxPhase='done';
  };

  if(x402Available&&item.endpoint){
    x402FetchIntel(item.endpoint).then(data=>{
      itemInvAdd(item.id,1);
      if(item.id==='booster'&&data&&data.cardId){
        itemShopRevealCard=data.cardId;itemShopRevealFrame=fr;itemShopTxPhase='reveal';
        lg.push('[SHOP/x402] Booster: got card #'+data.cardId);
      }else if(item.id==='hint'&&data){
        const loc=data.floorName||data.floor||'?';
        itemShopResult='Rival spotted: '+loc;
        twSet('HINT: '+loc);itemShopTxPhase='done';
      }else{
        doSimulate(); // fallback for unsupported endpoints
      }
    }).catch(()=>doSimulate());
  }else{
    // Simulate with slight delay for UX
    setTimeout(doSimulate,600);
  }
}

// T71: DUNGEON GATE — create/join season on-chain
// ═══════════════════════════════════════
function dgQuickEnter(){
  // Legacy flow: fire doMapTransition to dungeon B1 (first exit with targetMap>0)
  const ex=exits.find(e=>e.map===0&&e.targetMap>0);
  if(ex){townShopActive=false;townShopType='';dgPhase='menu';sfxConfirm();doMapTransition(ex);}
  else{showToast('No dungeon exit found!');sfxBack();}
}
function dgCreateSeason(){
  if(!walletConnected){showError('Connect wallet first!');sfxBack();return;}
  if(typeof oxarkOnchain==='undefined'||!oxarkOnchain.createGame){
    showError('Onchain module not available');sfxBack();return;
  }
  dgPhase='loading';dgLoading=true;dgTxError='';dgTxResult='';
  const newGameId=Math.floor(Math.random()*0xFFFFFF)+1;
  oxarkOnchain.createGame(newGameId,3).then(sig=>{
    dgLastGameId=newGameId;
    dgTxResult=sig||'ok';
    try{localStorage.setItem('oxark_last_game_id',String(newGameId));}catch(e){}
    lg.push('[CHAIN] Season created — Game ID: '+newGameId+' ('+String(sig).slice(0,12)+'...)');
    dgPhase='result';dgLoading=false;
  }).catch(err=>{
    dgTxError=(err&&err.message)||String(err);
    lg.push('[CHAIN] createGame failed: '+dgTxError.slice(0,80));
    dgPhase='result';dgLoading=false;
  });
}
function dgJoinSeason(){
  if(!walletConnected){showError('Connect wallet first!');sfxBack();return;}
  if(typeof oxarkOnchain==='undefined'||!oxarkOnchain.joinGame){
    showError('Onchain module not available');sfxBack();return;
  }
  const gid=dgLastGameId||0;
  if(!gid){showError('No Game ID found. Create a season first.');sfxBack();return;}
  dgPhase='loading';dgLoading=true;dgTxError='';dgTxResult='';
  oxarkOnchain.joinGame(gid).then(sig=>{
    dgTxResult=sig||'ok';
    lg.push('[CHAIN] Joined season '+gid+' ('+String(sig).slice(0,12)+'...)');
    dgPhase='join';dgLoading=false;
  }).catch(err=>{
    dgTxError=(err&&err.message)||String(err);
    lg.push('[CHAIN] joinGame failed: '+dgTxError.slice(0,80));
    dgPhase='join';dgLoading=false;
  });
}

// v74: SYNTHESIS (ALCHEMIST) SYSTEM
// ═══════════════════════════════════════
function doSynthesis(){
  // Validate: 3 cards of same rarity selected
  if(synthSelected.length!==3)return;
  const c0=pl[0].cd[synthSelected[0]],c1=pl[0].cd[synthSelected[1]],c2=pl[0].cd[synthSelected[2]];
  if(c0<1||c0>CD.length||c1<1||c1>CD.length||c2<1||c2>CD.length)return; // guard invalid slots
  const r=(CD[c0-1]?.r||1);
  if((CD[c1-1]?.r||1)!==r||(CD[c2-1]?.r||1)!==r)return;
  if(r>=5)return; // can't upgrade legendary
  const targetRarity=r+1;
  // Pool of target rarity cards not yet in vault
  const vault_=pl[0].vault||new Set();
  const targetPool=[];
  for(let i=1;i<=60;i++){const cr=CD[i-1];if(cr&&cr.r===targetRarity&&!vault_.has(i))targetPool.push(i);}
  // Fallback: any card of target rarity
  const anyPool=[];
  for(let i=1;i<=60;i++){const cr=CD[i-1];if(cr&&cr.r===targetRarity)anyPool.push(i);}
  const pool=targetPool.length>0?targetPool:anyPool;
  if(pool.length===0){synthPhase='result';synthResultCard=-1;synthResultFrame=fr;return;}
  // Consume 3 cards in descending slot order to avoid index shift (v301: no spread+sort alloc)
  const s0=synthSelected[0],s1=synthSelected[1],s2=synthSelected[2];
  const _sMax=Math.max(s0,s1,s2),_sMin=Math.min(s0,s1,s2),_sMid=s0+s1+s2-_sMax-_sMin;
  removeCardFromPlayer(0,_sMax);cardTimers[_sMax]=0;
  removeCardFromPlayer(0,_sMid);cardTimers[_sMid]=0;
  removeCardFromPlayer(0,_sMin);cardTimers[_sMin]=0;
  // Give new card
  const newId=pool[Math.floor(Math.random()*pool.length)];
  const added=addCardToPlayer(0,newId);
  if(!added){discardActive=true;discardSelIdx=0;discardPendingCard=newId;discardSource='wild';}
  synthResultCard=newId;
  synthPhase='result';synthResultFrame=fr;
  const cr=CD[newId-1];
  lg.push('[SYNTHESIS] Fused 3x '+RARITY_LABEL[r]+' → '+cr.n+' ('+RARITY_LABEL[cr.r]+')!');
  sfxSynthesis(); // T64
  sfxCardGet();screenShake(cr.r>=3?cr.r:3,cr.r>=3?cr.r*3:6);
  triggerCardGetBurst(pl[0].visualX-camX,pl[0].visualY-camY-8,_SYNTH_RAR_BURST[cr.r]||'#f0c030'); // v301
  if(cr.r>=3)hitPause(cr.r>=4?4:3);
  checkWinAndTransition(2000); // v149: card 60 could come from synthesis
}

function drawSynthesisShop(){
  if(!synthActive)return;
  bx(0,0,W,H,'rgba(0,0,0,.5)');
  win(40,20,W-80,H-40);
  txShadow('ALCHEMIST — SYNTHESIS',W/2-100,50,10,'#c08030','rgba(0,0,0,.3)');
  bx(60,60,W-120,1,'#c0b898');

  if(synthPhase==='result'){
    const t=fr-synthResultFrame;
    if(synthResultCard>0){
      const cr=CD[synthResultCard-1];
      const rCol=RARITY_COLOR[cr.r]||'#c8c0a0';
      txShadow('SYNTHESIS SUCCESS!',W/2-88,90,10,'#40d080','rgba(0,0,0,.3)');
      drawCardFrame(W/2-50,110,100,140,synthResultCard-1,true);
      txShadow(cr.n,W/2-cr.n.length*5,262,11,rCol,'rgba(0,0,0,.3)');
      txShadow(RARITY_LABEL[cr.r],W/2-32,280,7,rCol,'rgba(0,0,0,.2)');
    }else{
      txShadow('No cards of that rarity to forge.',W/2-140,H/2,8,'#d04040','rgba(0,0,0,.2)');
    }
    if(fr-synthResultFrame>40)txShadow('Press X to close',W/2-64,H-80,7,'#686068','rgba(0,0,0,.35)');
    return;
  }

  // Phase: pick — show rarity filter tabs and cards (_SYNTH_RAR_LABELS hoisted to module scope)
  const tabY=78;const tabW=88;
  for(let ri=1;ri<_SYNTH_RAR_LABELS.length;ri++){
    const rl=_SYNTH_RAR_LABELS[ri];const tabX=60+(ri-1)*tabW;
    const sel=synthRarityFilter===ri;
    bx(tabX,tabY,tabW-4,20,sel?'#806030':'rgba(80,70,50,.5)');
    if(sel){bx(tabX,tabY,tabW-4,1,'#d0b060');bx(tabX,tabY+19,tabW-4,1,'#d0b060');}
    txShadow(rl,tabX+4,tabY+13,6,sel?'#f8e8c0':'#a09070','rgba(0,0,0,.35)');
  }

  // v268: allocation-free — replaces getPlayerFilledSlots().filter() per frame
  let _sfN2=0;
  for(let _si=0;_si<HAND_SIZE;_si++){const _cid=pl[0].cd[_si];if(_cid>0&&CD[_cid-1]?.r===synthRarityFilter)_synthSlotsBuf[_sfN2++]=_si;}

  if(_sfN2===0){
    txShadow(_SYNTH_NO_CARDS[synthRarityFilter],80,120,7,'#989080','rgba(0,0,0,.3)'); // v303
  }else{
    const needed=3-synthSelected.length;
    txShadow(_SYNTH_UPGRADE[synthRarityFilter]||_SYNTH_UPGRADE[4],80,108,6,'#c0a060','rgba(0,0,0,.3)'); // v303
    txShadow(_SYNTH_NEED[needed]||_SYNTH_NEED[0],80,122,6,needed===0?'#40d080':'#808880','rgba(0,0,0,.3)'); // v303

    const cols=4,cellW=120,cellH=48;
    for(let i=0;i<_sfN2;i++){
      const slot=_synthSlotsBuf[i];const cid=pl[0].cd[slot],cr=CD[cid-1];
      const col=i%cols,row=Math.floor(i/cols);
      const cx=80+col*cellW,cy=138+row*cellH;
      const isSel=synthSelected.includes(slot);
      bx(cx,cy,cellW-8,cellH-4,isSel?'rgba(192,168,96,.3)':'rgba(40,36,28,.6)');
      if(isSel){bx(cx,cy,2,cellH-4,'#c0a040');txShadow('\u2713',cx+cellW-20,cy+14,9,'#c0a040','rgba(0,0,0,.4)');}
      bx(cx+4,cy+4,20,20,cr.d);bx(cx+5,cy+5,18,18,cr.c);
      drawCardCharacter(cx+6,cy+6,cid,0.7,fr);
      txShadow(cr.n,cx+30,cy+14,6,isSel?'#f8e8c0':'#c0b898','rgba(0,0,0,.3)');
      txShadow(cr.f,cx+30,cy+26,5,'#908878','rgba(0,0,0,.2)');
    }
  }

  // Legend
  const tgt=_SYNTH_RAR_LABELS[synthRarityFilter+1];
  if(tgt)txShadow(_SYNTH_LEG_LBL[synthRarityFilter]||('3\u00D7 '+_SYNTH_RAR_LABELS[synthRarityFilter]+' \u2192 1\u00D7 '+tgt),80,H-88,6,'#806030','rgba(0,0,0,.3)'); // v341: pre-baked
  txShadow('← → change rarity  Z=select/confirm  X=close',80,H-68,5,'#686068','rgba(0,0,0,.3)');
}

// ═══════════════════════════════════════
// RANDOM MAP EVENTS
// ═══════════════════════════════════════
function triggerRandomEvent(){
  // v362: expanded event pool — richer ARK lore per floor, new heal/freeze/bonus_sp actions
  // v363: events now carry cat (category): 'good'|'bad'|'neutral'
  const baseEvents=[
    {text:'A strong wind blows! Your area is revealed to rivals.', action:'wind',        cat:'bad'},
    {text:'You found a forgotten stash! +1 random card.',          action:'card',        cat:'good'},
    {text:'A rival\'s scout passed by! You sense danger nearby.',  action:'scout',       cat:'bad'},
    {text:'You hear echoing footsteps... something is close.',     action:'tension',     cat:'neutral'},
    {text:'The walls feel closer here. Decay quickens!',           action:'decay_warn',  cat:'bad'},
    {text:'A soft chime echoes — one card\'s decay is slowed.',    action:'heal',        cat:'good'},
    {text:'Footprints in the dust... someone was here recently.',  action:'tension',     cat:'neutral'},
    {text:'A glimmer of light reveals a hidden passage. Press on.',action:'bonus_sp',   cat:'good'},
  ];
  // Floor-specific bonus events (Sunken Galleries / Drowned Archives / Echo Chambers / Deep Vault / ARK Core)
  const floorEvents=[
    [], // Town
    // B1 — SUNKEN GALLERIES
    [{text:'A trail of footprints leads to a hidden card!',                                                  action:'card',         cat:'good'},
     {text:'Seawater drips from the hull seams. The ARK groans above you.',                                 action:'tension',      cat:'neutral'},
     {text:'A rusted porthole reveals open ocean. The deck above has flooded.',                              action:'tension',      cat:'neutral'},
     {text:'A sailor\'s logbook fragment is wedged in a crack. It mentions a vault deeper below.',          action:'tension',      cat:'neutral'},
     {text:'Barnacle-encrusted crates block the path — you squeeze through. Cards shift in your hand.',     action:'decay_warn',   cat:'bad'}],
    // B2 — DROWNED ARCHIVES
    [{text:'Ancient scrolls crumble as you pass. One holds a faded card seal!',                             action:'card',         cat:'good'},
     {text:'The water here is waist-deep. Decay spreads faster in the wet dark.',                           action:'decay_warn',   cat:'bad'},
     {text:'You find a Scholar\'s inkpot, still dry. Spell energy seeps back in.',                          action:'spell_restore',cat:'good'},
     {text:'Mushroom spores fill the air... you feel sluggish.',                                             action:'tension',      cat:'neutral'},
     {text:'Waterlogged shelves hold brittle tomes — one falls open to a card diagram.',                    action:'card',         cat:'good'},
     {text:'A glowing sigil on the floor briefly restores your resolve.',                                   action:'heal',         cat:'good'}],
    // B3 — ECHO CHAMBERS
    [{text:'Ancient runes flare! Spell energy restored.',                                                    action:'spell_restore',cat:'good'},
     {text:'Crystal resonance scatters the fog — a card glints in the distance!',                           action:'card',         cat:'good'},
     {text:'Your own voice returns as a whisper from the far wall. Then a rival\'s laugh.',                 action:'rival_taunt',  cat:'neutral'},
     {text:'The crystals amplify sound. You hear VEGA sprinting two chambers over.',                        action:'scout',        cat:'bad'},
     {text:'Shattered prisms refract your card\'s glow — it burns a little brighter.',                     action:'heal',         cat:'good'},
     {text:'The echo reveals a pressure plate. A sealed alcove clicks open — a card inside!',               action:'card',         cat:'good'}],
    // B4 — DEEP VAULT
    [{text:'Magma seeps through floor cracks — the heat accelerates decay.',                                action:'decay_warn',   cat:'bad'},
     {text:'A dark force drains your cards faster! Beware.',                                                action:'decay_warn',   cat:'bad'},
     {text:'An ember lands on your sleeve. You brush it off — and find a sealed card case.',                action:'card',         cat:'good'},
     {text:'VEGA\'s bootmarks lead toward the vault room. She\'s close.',                                   action:'scout',        cat:'bad'},
     {text:'A pressure lock disengages with a deep clunk. Spell power crackles through the air.',           action:'spell_restore',cat:'good'},
     {text:'The vault walls pulse with heat — your hands steady, cards holding firm.',                      action:'heal',         cat:'good'},
     {text:'Something charges the air. Rival proximity sensors spike.',                                     action:'rival_taunt',  cat:'bad'}],
    // B5 — ARK CORE
    [{text:'The deepest floor trembles. A legendary card stirs!',                                           action:'card',         cat:'good'},
     {text:'VEGA\'s voice echoes: "This floor is mine."',                                                   action:'rival_taunt',  cat:'bad'},
     {text:'MIRA\'s voice: "The legendary cards end here."',                                                action:'rival_taunt',  cat:'bad'},
     {text:'The ARK\'s core pulses — all spell types surge back to full.',                                  action:'full_restore', cat:'good'},
     {text:'A legendary seal fractures — the card within drifts toward you.',                               action:'card',         cat:'good'},
     {text:'The floor breathes. For a moment, decay stops entirely.',                                       action:'heal',         cat:'good'},
     {text:'All 60 cards converge here. You feel the prize pool calling.',                                  action:'tension',      cat:'neutral'},
     {text:'MIRA appears in a doorway — then vanishes. She knows where you are.',                           action:'scout',        cat:'bad'}],
  ];
  const floorExtra=floorEvents[currentFloor]||[];
  const allEvents=[...baseEvents,...floorExtra];
  const ev=allEvents[Math.floor(Math.random()*allEvents.length)];
  randomEventActive=true;
  randomEventText=ev.text;
  randomEventFrame=fr;
  randomEventCat=ev.cat||'neutral'; // v363: store event category for display
  // v363: differentiated audio per category
  if(ev.cat==='bad')sfxDangerAlert();
  else if(ev.cat==='good')sfxEvent();
  else sfxEventAlert();

  if(ev.action==='card'){
    // Give a card from current floor pool — prefer vault-new (v299: pickFromPool)
    const pool=AREA_CARDS[currentMap]||AREA_CARDS[1];
    const cardId=pickFromPool(pool); // 1-indexed
    const cardIdx=cardId-1; // 0-indexed for CD[]
    const evAdded=addCardToPlayer(0,cardId); // updates vault + hand
    if(evAdded){
      startCardAcquisition(cardIdx);
      lg.push('Event: Found a '+CD[cardIdx].n+' in a forgotten stash!');
      checkWinAndTransition(2000);
    }else{
      // Hand full - offer discard (vault already updated by addCardToPlayer)
      discardActive=true;discardSelIdx=0;discardPendingCard=cardId;discardSource='wild';
      randomEventText='Found a '+CD[cardIdx].n+'! Discard one to keep it.';
    }
  }else if(ev.action==='wind'){
    // Reveal player area to rivals (cosmetic - flash the minimap)
    flash();
    lg.push('Event: A strong wind revealed your position!');
  }else if(ev.action==='scout'){
    // Alert effect
    rivalAlert=60;rivalAlertName='Scout';
    lg.push('Event: A rival scout was spotted nearby!');
  }else if(ev.action==='tension'){
    // Atmospheric — tension music spike
    screenShake(1,3);
    lg.push('Event: You sense a presence nearby...');
  }else if(ev.action==='decay_warn'){
    // Speed up decay on the oldest hand card by 20s as penalty
    let oldest=-1,oldestAge=0;
    for(let i=0;i<HAND_SIZE;i++){
      if(cardTimers[i]>0){const age=Date.now()-cardTimers[i];if(age>oldestAge){oldestAge=age;oldest=i;}}
    }
    if(oldest>=0){cardTimers[oldest]-=20000;sfxDangerAlert();}
    lg.push('Event: Dark energy accelerated card decay!');
  }else if(ev.action==='spell_restore'){
    // Restore 1 of each depleted spell type
    let restored=false;
    if(sp.s<3){sp.s++;restored=true;}
    if(sp.b<3){sp.b++;restored=true;}
    if(sp.c<3){sp.c++;restored=true;}
    if(restored){sfxCrystal();lg.push('Event: Ancient runes restored spell energy!');}
  }else if(ev.action==='rival_taunt'){
    // Just a flavor event — tension shake
    screenShake(2,3);flash();
    lg.push('Event: A rival\'s voice echoes from the deep...');
  }else if(ev.action==='heal'){
    // v362: slow decay on the most-decayed hand card (add 30s back)
    let oldest=-1,oldestAge=0;
    for(let i=0;i<HAND_SIZE;i++){
      if(cardTimers[i]>0){const age=Date.now()-cardTimers[i];if(age>oldestAge){oldestAge=age;oldest=i;}}
    }
    if(oldest>=0){cardTimers[oldest]+=30000;sfxCrystal();lg.push('Event: A card\'s decay was eased by the ARK\'s energy!');}
  }else if(ev.action==='bonus_sp'){
    // v362: grant +1 steal resource (capped at 5)
    if(sp.s<5){sp.s++;sfxCrystal();lg.push('Event: A hidden cache refilled your STEAL energy!');}
  }else if(ev.action==='full_restore'){
    // v362: B5 ARK Core — restore all spell types to max
    sp.s=3;sp.b=3;sp.c=3;
    sfxCrystal();screenShake(1,2);
    lg.push('Event: The ARK Core pulsed — all spells fully restored!');
  }
}

// v363: event display with category-specific colors and icons
const _EVT_CAT_COL={good:'#40d080',bad:'#d04040',neutral:'#d8b028'};
const _EVT_CAT_ICON={good:'\u2665',bad:'\u26a0',neutral:'\u2139'}; // ♥ ⚠ ℹ
const _EVT_CAT_BAR={good:'rgba(20,80,40,.5)',bad:'rgba(80,20,20,.5)',neutral:'rgba(80,70,20,.35)'};
function drawRandomEvent(){
  if(!randomEventActive)return;
  const t=fr-randomEventFrame;
  if(t>180){randomEventActive=false;return;}
  const slideIn=Math.min(1,t/10);
  const slideOut=t>150?Math.max(0,1-(t-150)/30):1;
  const alpha=Math.min(slideIn,slideOut);
  const ease=easeInOut(alpha);
  const slideOff=50*(1-ease);
  const cat=randomEventCat||'neutral';
  const catCol=_EVT_CAT_COL[cat]||_EVT_CAT_COL.neutral;
  const catIcon=_EVT_CAT_ICON[cat]||_EVT_CAT_ICON.neutral;
  const catBar=_EVT_CAT_BAR[cat]||_EVT_CAT_BAR.neutral;
  g.globalAlpha=ease;
  win(24,H/2-50+slideOff,W-48,74);
  // Category color bar at top of window
  bx(26,H/2-48+slideOff,W-52,4,catBar);
  // Icon badge
  win(32,H/2-62+slideOff,70,18);
  txShadow(catIcon+' EVENT',38,H/2-48+slideOff,7,catCol,'rgba(0,0,0,.5)');
  // Word-wrap
  const maxChars=50;
  let line1=randomEventText, line2='';
  if(randomEventText.length>maxChars){
    let breakAt=randomEventText.lastIndexOf(' ',maxChars);
    if(breakAt<1)breakAt=maxChars;
    line1=randomEventText.substring(0,breakAt);
    line2=randomEventText.substring(breakAt+1);
  }
  txShadow(line1,42,H/2-22+slideOff,7,'#303028','rgba(255,255,255,.15)');
  if(line2)txShadow(line2,42,H/2-6+slideOff,7,'#303028','rgba(255,255,255,.15)');
  // Category label in top-right of window
  txShadow(cat.toUpperCase(),W-80,H/2-48+slideOff,5,catCol,'rgba(0,0,0,.4)');
  g.globalAlpha=1;
}

// ═══════════════════════════════════════
// BATTLE ENCOUNTER EXCLAMATION
// ═══════════════════════════════════════
function drawEncounterExclamation(){
  if(!encounterExclActive)return;
  const t=fr-encounterExclFrame;
  if(t>30){encounterExclActive=false;return;}
  // Overshoot pop-in scale: 0→1.4→1.0 over first 8 frames
  const rawScl=t<4?(t/4)*1.4:t<8?1.4-(t-4)*0.1:1.0;
  const bounce=t>=8?Math.sin(t*0.5)*2:0;
  const alpha=Math.min(1,t/4)*(t<25?1:Math.max(0,(30-t)/5));
  g.globalAlpha=alpha;
  // Player "!" bubble with pop scale
  const ppx=encounterExclPlayerX-camX, ppy=encounterExclPlayerY-camY-8;
  g.save();g.translate(ppx+8,ppy-15+bounce);g.scale(rawScl,rawScl);g.translate(-ppx-8,-ppy+15-bounce);
  bx(ppx+3,ppy-22+bounce,10,14,'#fff');bx(ppx+4,ppy-21+bounce,8,11,'#f0c830');
  txShadow('!',ppx+5,ppy-10+bounce,10,'#c04040','rgba(0,0,0,.4)');
  g.restore();
  // Rival "!" bubble with pop scale
  const rpx=encounterExclRivalX-camX, rpy=encounterExclRivalY-camY-8;
  g.save();g.translate(rpx+8,rpy-15+bounce);g.scale(rawScl,rawScl);g.translate(-rpx-8,-rpy+15-bounce);
  bx(rpx+3,rpy-22+bounce,10,14,'#fff');bx(rpx+4,rpy-21+bounce,8,11,'#f0c830');
  txShadow('!',rpx+5,rpy-10+bounce,10,'#c04040','rgba(0,0,0,.4)');
  g.restore();
  // Show rival name tag above "!" — appears after t>6
  if(t>6){
    const rName=(encounterExclTarget>=1&&encounterExclTarget<=2)?pl[encounterExclTarget].n:'???';
    const rNameCol=(encounterExclTarget===1)?'#f080c0':'#f0c830';
    const nameW=rName.length*6+4;
    bx(rpx-nameW/2+8,rpy-38+bounce,nameW,13,'rgba(0,0,0,.7)');
    txShadow(rName,rpx-nameW/2+10,rpy-27+bounce,7,rNameCol,'rgba(0,0,0,.5)');
  }
  // v81/v291: Pre-battle dialogue speech bubble (appears t>12, fades at t>24)
  if(t>12&&encounterRivalLine){
    const lineAlpha=Math.min(1,(t-12)/6)*Math.max(0,(30-t)/8);
    g.globalAlpha=lineAlpha*alpha;
    // v291: increased cap (280px) and right-clamp to screen edge
    const lineW=Math.min(280,encounterRivalLine.length*6+16);
    const lineX=Math.min(rpx+14,W-lineW-8), lineY=rpy-56+bounce;
    bx(lineX,lineY,lineW,16,'rgba(8,8,16,.85)');
    bx(lineX,lineY,lineW,1,'rgba(200,180,120,.4)');
    bx(lineX,lineY+15,lineW,1,'rgba(200,180,120,.25)');
    // Speech bubble triangle pointer
    bx(lineX+4,lineY+16,4,2,'rgba(8,8,16,.85)');
    const rNameCol2=(encounterExclTarget===1)?'#f080c0':'#f0c830';
    if(_encLineLblRef!==encounterRivalLine){_encLineLblRef=encounterRivalLine;_encLineLblCache='\u201C'+encounterRivalLine+'\u201D';}
    txShadow(_encLineLblCache,lineX+4,lineY+12,5,rNameCol2,'rgba(0,0,0,.4)'); // v344: lazy cache
    g.globalAlpha=1;
  }
  // T52: "BATTLE START!" flash overlay in final frames (t>20)
  if(t>20){
    const bsAlpha=Math.min(1,(t-20)/4)*(t<28?1:Math.max(0,(30-t)/2));
    if(t===21)sfxBattleStartStinger(); // fire stinger once
    g.globalAlpha=bsAlpha*0.6;
    bx(0,0,W,H,'#000');
    g.globalAlpha=bsAlpha;
    const bsLbl='BATTLE START!';
    const bsScale=1+(t-20)*0.04; // slight grow
    g.save();g.translate(W/2,H/2);g.scale(bsScale,bsScale);g.translate(-W/2,-H/2);
    txShadow(bsLbl,W/2-bsLbl.length*7,H/2+10,14,'#f0c830','rgba(200,120,20,.6)');
    g.restore();
    if(t>22)screenShake(4,6); // intensify shake for last frames
    g.globalAlpha=1;
  }
  g.globalAlpha=1;
}

// T52: Draw pre-encounter proximity alert banner ("A rival approaches...")
function drawPreEncounterAlert(){
  if(!preEncounterAlert||encounterExclActive||wildEncounterActive)return;
  const t=fr-preEncounterAlertFrame;
  const alpha=Math.min(1,t/8);
  const bannerY=H-44;
  g.globalAlpha=alpha*0.88;
  bx(0,bannerY,W,20,'rgba(0,0,0,.85)');
  bx(0,bannerY,W,1,'#c04040');
  g.globalAlpha=alpha;
  const msg='! '+preEncounterAlertName+' is nearby...';
  txShadow(msg,W/2-msg.length*3.5,bannerY+14,7,'#f08080','rgba(0,0,0,.5)');
  g.globalAlpha=1;
}

function wrapText(text,maxChars){
  if(text.length<=maxChars)return[text];
  const words=text.split(' ');
  const lines=[];
  let cur='';
  for(const w of words){
    if(cur.length+w.length+1>maxChars){
      if(cur)lines.push(cur);
      cur=w;
    }else{
      cur=cur?cur+' '+w:w;
    }
  }
  if(cur)lines.push(cur);
  return lines;
}

// v184: NPC identity colors — match role to accent color
const NPC_ACCENT={
  'Card Merchant':'#4080d0',
  'Trade Master':'#30b080',
  'Gacha Keeper':'#c070d0',
  'ARK Guide':'#f0c030',
  'Dungeon Porter':'#e06848',
  'Alchemist':'#40c0c0',
};
let _npcDlgCacheIdx=-1,_npcDlgCacheLines=[]; // v273: NPC dialog wrap cache
function drawNPCDialog(){
  if(!npcDialogActive)return;
  const dlgSlide=Math.min(1,(fr-npcDialogOpenFrame)/6);
  const dlgEase=easeInOut(dlgSlide);
  const slideOff=90*(1-dlgEase);
  const accent=NPC_ACCENT[npcDialogName]||'#c04040';
  g.globalAlpha=dlgEase;

  // Main dialog box
  const dlgY=H-100+slideOff;
  win(6,dlgY,W-12,90);
  // Accent bar on left edge — NPC identity color
  bx(6,dlgY,3,90,accent);
  // Name badge (colored accent top-bar)
  const nbW=npcDialogName.length*7+24;
  win(10,H-112+slideOff,nbW,18);
  bx(10,H-112+slideOff,nbW,2,accent);
  txShadow(npcDialogName,20,H-97+slideOff,7,accent,'rgba(0,0,0,.35)');

  // v273: cache wrapped lines per dialog index — only recompute when idx changes
  if(_npcDlgCacheIdx!==npcDialogIdx){
    _npcDlgCacheIdx=npcDialogIdx;
    const rawLine=npcDialogLines[npcDialogIdx]||'';
    const rawLine2=npcDialogLines[npcDialogIdx+1]||'';
    const w1=wrapText(rawLine,52),w2=rawLine2?wrapText(rawLine2,52):[];
    _npcDlgCacheLines=w1.concat(w2);
  }
  const _alLen=Math.min(3,_npcDlgCacheLines.length);
  for(let i=0;i<_alLen;i++){
    txShadow(_npcDlgCacheLines[i],20,H-70+slideOff+i*16,7,FRLG.textColor,'rgba(0,0,0,.25)');
  }

  // Progress indicator: show line X/total as small dots bottom-left
  const totalLines=npcDialogLines.length;
  if(totalLines>2){
    const maxDots=Math.min(totalLines,8);
    for(let d=0;d<maxDots;d++){
      const active=d===Math.floor(npcDialogIdx/2);
      bx(20+d*8,dlgY+80,6,3,active?accent:'rgba(200,180,100,.25)');
    }
  }

  // FRLG-style bouncing triangle at bottom-right (bounces 2px every 0.5s = 30 frames)
  const hasMore=(npcDialogIdx+2)<npcDialogLines.length;
  const arrowBounce=hasMore?Math.floor(_BOUNCE60[fr%60]*2):0;
  txShadow('\u25BC',W-24,H-18+slideOff+arrowBounce,7,accent,'rgba(0,0,0,.4)');
  g.globalAlpha=1;
}

// ═══════════════════════════════════════
// TITLE SCREEN (Sprite Seas — Phase B2-1, v452)
// Match: design/preview/01_title.html. Near-pixel reproduction at 2× preview
// viewport (production canvas 960×640 vs preview 480×320).
// ═══════════════════════════════════════
// Sky→sea gradient cached as a single canvas (regenerated only if W/H change).
// v452: replaces v225 void+rune+moon cached canvases for the title screen.
const _titleSkySeaCanvas=(()=>{
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const ctx=c.getContext('2d');
  const horizonY=(H*0.62)|0;
  const skyGrad=ctx.createLinearGradient(0,0,0,horizonY);
  skyGrad.addColorStop(0,'#0c1a38');
  skyGrad.addColorStop(1,'#1c3868');
  ctx.fillStyle=skyGrad;ctx.fillRect(0,0,W,horizonY);
  const seaGrad=ctx.createLinearGradient(0,horizonY,0,H);
  seaGrad.addColorStop(0,'#1c3868');
  seaGrad.addColorStop(1,'#0c1a38');
  ctx.fillStyle=seaGrad;ctx.fillRect(0,horizonY,W,H-horizonY);
  // 2px horizon band (night_sky)
  ctx.fillStyle='#0c1a38';ctx.fillRect(0,horizonY-1,W,3);
  // Two GBA-minimal wave lines inside the sea band
  const seaH=H-horizonY;
  ctx.fillStyle='#4880c8';ctx.globalAlpha=0.8;
  ctx.fillRect(0,horizonY+(seaH*0.32)|0,W,3);
  ctx.globalAlpha=0.9;ctx.fillStyle='#1c3868';
  ctx.fillRect(0,horizonY+(seaH*0.62)|0,W,2);
  ctx.globalAlpha=1;
  return c;
})();

// v452a: Sprite Seas moon — cream circle with 3-stop radial halo that bleeds
// into the night_sky sky without a dark frame. Pre-baked once; dTitle() blits.
// Spec: design/preview/01_title.html `.moon` (28px disk, cream halo at rgba
// 0.20 / 0.08 stops). Radius is 2× preview (14 → 28) for the 960×640 canvas.
const _titleMoonCanvas=(()=>{
  const cream=window.TOKENS.resolveColor('sail_cream'); // '#f8e8c0'
  const rgbaCream=(a)=>{
    const n=parseInt(cream.slice(1),16);
    return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
  };
  const R=28, haloR=R*3, sz=haloR*2+4;
  const c=document.createElement('canvas');c.width=sz;c.height=sz;
  const ctx=c.getContext('2d');
  const cx=sz/2, cy=sz/2;
  const grd=ctx.createRadialGradient(cx,cy,R*0.8, cx,cy,haloR);
  grd.addColorStop(0,   rgbaCream(0.35));
  grd.addColorStop(0.4, rgbaCream(0.12));
  grd.addColorStop(1,   rgbaCream(0));
  ctx.fillStyle=grd;ctx.fillRect(0,0,sz,sz);
  ctx.fillStyle=cream;
  ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.fill();
  return c;
})();

// @deprecated (phase-b2-title): legacy title-screen pre-baked canvases from v225
// (void gradient, rune grid, moon halo/disk). Superseded by _titleSkySeaCanvas
// + _titleMoonCanvas (v452a).
// Retained per PHASE_B2_PLAN.md B2-0 policy; delete in B2-8 cleanup.
const _titleVoidGradCanvas=(()=>{
  const c=document.createElement('canvas');c.width=W;c.height=280;
  const ctx=c.getContext('2d');
  const gd=ctx.createLinearGradient(0,0,0,280);
  gd.addColorStop(0,'rgba(40,16,80,0.28)');gd.addColorStop(1,'rgba(40,16,80,0)');
  ctx.fillStyle=gd;ctx.fillRect(0,0,W,280);
  return c;
})();
const _titleRuneGridCanvas=(()=>{
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const ctx=c.getContext('2d');
  ctx.globalAlpha=0.04;ctx.fillStyle='#9945FF';
  for(let gy_=60;gy_<H;gy_+=80)ctx.fillRect(0,gy_,W,1);
  return c;
})();
const _moonMx=Math.floor(W*0.78),_moonMy=72,_moonMr=22;
const _moonHaloR=Math.ceil(_moonMr*3.2);
const _moonHaloCanvas=(()=>{
  const sz=_moonHaloR*2+4;
  const c=document.createElement('canvas');c.width=sz;c.height=sz;
  const ctx=c.getContext('2d');
  const cx_=sz/2,cy_=sz/2;
  const grd=ctx.createRadialGradient(cx_,cy_,_moonMr,cx_,cy_,_moonHaloR);
  grd.addColorStop(0,'rgba(220,210,255,1)');
  grd.addColorStop(1,'rgba(220,210,255,0)');
  ctx.fillStyle=grd;ctx.fillRect(0,0,sz,sz);
  return c;
})();
const _moonDiskCanvas=(()=>{
  const sz=_moonMr*2+8;
  const c=document.createElement('canvas');c.width=sz;c.height=sz;
  const ctx=c.getContext('2d');
  const cx_=sz/2,cy_=sz/2;
  ctx.fillStyle='#c8c0e8';
  ctx.beginPath();ctx.arc(cx_,cy_,_moonMr,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(6,6,18,0.28)';
  ctx.beginPath();ctx.arc(cx_+6,cy_-3,_moonMr*0.92,0,Math.PI*2);ctx.fill();
  return c;
})();
let _orbitCacheSz=-1,_orbitCacheCards=[];
let _titleOrbitN=0,_titleOrbitSS=0,_titleOrbitSC=1;
function dTitle(){
  // Sky/sea/horizon/waves — pre-baked
  g.drawImage(_titleSkySeaCanvas,0,0);

  // Moon — pre-baked cream disk + soft radial halo, blitted at preview-exact
  // center. Preview `.moon`: right:44, top:44, 28px → 2× center at (W-116, 116).
  {
    const mx=W-116, my=116;
    const ms=_titleMoonCanvas;
    g.drawImage(ms, (mx-ms.width/2)|0, (my-ms.height/2)|0);
  }
  // Logo "0xARK" — top-center. Preview y=20% → 128px @ 960 canvas.
  // 0x in gold_accent, ARK in sail_cream. Dual drop-shadow (night_sky + text_dark).
  {
    const logoY=128; // preview 20% of 640
    const baseSz=64; // tx internally multiplies ×1.4 → 90px render; matches preview 64px CSS at 2× scale
    // Measure so the two-tone logo centers correctly. We draw in two halves,
    // so compute widths explicitly using canvas measureText.
    setFont(Math.max(12,Math.round(baseSz*1.4)));
    const wLeft=g.measureText('0x').width;
    const wRight=g.measureText('ARK').width;
    const totalW=wLeft+wRight;
    const lx=((W-totalW)/2)|0;
    // Drop-shadow layer 1 — night_sky at +8,+8
    txShadow('0x',  lx+8,      logoY+8, baseSz, '#0c1a38', 'rgba(0,0,0,0)');
    txShadow('ARK', lx+wLeft+8,logoY+8, baseSz, '#0c1a38', 'rgba(0,0,0,0)');
    // Drop-shadow layer 2 — text_dark at +4,+4
    txShadow('0x',  lx+4,      logoY+4, baseSz, '#181028', 'rgba(0,0,0,0)');
    txShadow('ARK', lx+wLeft+4,logoY+4, baseSz, '#181028', 'rgba(0,0,0,0)');
    // Main fill
    txShadow('0x',  lx,         logoY,  baseSz, window.TOKENS.resolveColor('gold_accent'), 'rgba(0,0,0,0)');
    txShadow('ARK', lx+wLeft,   logoY,  baseSz, window.TOKENS.resolveColor('sail_cream'), 'rgba(0,0,0,0)');
  }

  // Tagline "A ZK PIRATE CARD GAME" — 16px preview → ~32px render.
  // Letter-spaced 0.28em; we approximate by padding single spaces (canvas 2D
  // has no native letter-spacing until 2D ctx letterSpacing, not available in
  // all targets). Use spaced string.
  {
    const tagTxt='A  Z K   P I R A T E   C A R D   G A M E';
    const tagSz=16;
    setFont(Math.max(12,Math.round(tagSz*1.4)));
    const tw=g.measureText(tagTxt).width;
    const tx_=((W-tw)/2)|0;
    const ty=196; // preview 20% + 30px → ~200
    txShadow(tagTxt, tx_, ty, tagSz, window.TOKENS.resolveColor('menu_border'), 'rgba(0,0,0,0.5)');
  }

  // Galleon hero — centered, top:57% → y=365, 256×160 (2× preview 128×80).
  // Preview anatomy re-measured against 2× GBA viewport (design/preview/01_title.html):
  //   container  : shipCX=W/2=480, shipCY≈365, 256×160
  //   hull       : bottom 44px of container (y 401→445), clip-path 8%/92%/100%/0
  //   mast       : y 301→401, 6×100
  //   sail       : y 309→385, 144×76 (preview bottom:30 → prod bottom 60 from
  //                container bottom 445 → sail bottom 385)
  //   jolly-X    : 36×6 bars, rotated ±45° on sail center
  //   flag       : 28×18 at shipX+132 (50%+2 preview), y=shipY-8 (preview top:-4)
  // Draw order matches preview CSS stacking (earlier sibling = back):
  //   flag → sail body → sail inset rim → jolly-X → mast → hull. Hull is topmost
  //   so it covers the mast root; mast drawn after sail so the dark stripe cuts
  //   through the sail+X per preview.
  {
    const shipCX=(W/2)|0, shipCY=((H*0.57)|0);
    const shipW=256, shipH=160;
    const shipX=shipCX-shipW/2, shipY=shipCY-shipH/2;
    const outline=window.TOKENS.resolveColor('text_dark');
    const hullCol=window.TOKENS.resolveColor('hull_wood');
    const hullTop=_RC('hull_highlight');
    const hullBot=_RC('hull_shadow');
    const goldT=window.TOKENS.resolveColor('gold_accent');
    const sailCol=window.TOKENS.resolveColor('sail_cream');
    const sailShadow=window.TOKENS.resolveColor('sand_beach'); // #e8c878
    const goldInset=window.TOKENS.resolveColor('menu_border');
    const flagCol=window.TOKENS.resolveColor('flag_red');

    // ── Flag — drawn first (back layer per preview stacking).
    // Preview `top:-4; left:calc(50%+2); 14×9`; border 2px; border-left:none.
    const flagW=28, flagH=18;
    const flagX=shipCX+4;
    const flagY=shipY-8;
    g.fillStyle=flagCol;g.fillRect(flagX, flagY, flagW, flagH);
    g.fillStyle=outline;
    g.fillRect(flagX,          flagY,          flagW, 4);
    g.fillRect(flagX,          flagY+flagH-4,  flagW, 4);
    g.fillRect(flagX+flagW-4,  flagY,          4,     flagH);

    // ── Sail body + outline + gold inset rim + bottom shadow band.
    const sailW=144, sailH=76;
    const sailX=shipCX-sailW/2;
    const sailY=shipY+24; // preview top:12 → 2× from container top
    // Body
    g.fillStyle=sailCol;g.fillRect(sailX, sailY, sailW, sailH);
    // Outer outline (4px, preview 2px border)
    g.fillStyle=outline;
    g.fillRect(sailX,         sailY,        sailW, 4);
    g.fillRect(sailX,         sailY+sailH-4,sailW, 4);
    g.fillRect(sailX,         sailY,        4,     sailH);
    g.fillRect(sailX+sailW-4, sailY,        4,     sailH);
    // Gold inset rim (preview: inset 0 0 0 2px #ffd860 → 4px on all sides,
    // starting 4px inside the outer outline)
    g.fillStyle=goldInset;
    g.fillRect(sailX+4,        sailY+4,         sailW-8, 4);
    g.fillRect(sailX+4,        sailY+sailH-8,   sailW-8, 4);
    g.fillRect(sailX+4,        sailY+4,         4,       sailH-8);
    g.fillRect(sailX+sailW-8,  sailY+4,         4,       sailH-8);
    // Bottom shadow band (preview: inset 0 -4px 0 #e8c878 → 8px prod)
    g.fillStyle=sailShadow;
    g.fillRect(sailX+8, sailY+sailH-12, sailW-16, 4);

    // ── Jolly-roger X on sail center — two thick bars at ±45°.
    {
      const cx=sailX+sailW/2, cy=sailY+sailH/2;
      const barLen=36, barThick=6; // preview 18×3 → 2×
      g.save();
      g.translate(cx, cy);
      g.fillStyle=outline;
      g.rotate(Math.PI/4);
      g.fillRect(-barLen/2, -barThick/2, barLen, barThick);
      g.rotate(-Math.PI/2); // net -45° from identity
      g.fillRect(-barLen/2, -barThick/2, barLen, barThick);
      g.restore();
    }

    // ── Mast — drawn AFTER sail so the dark stripe cuts through sail+X per preview.
    g.fillStyle=outline;
    g.fillRect(shipCX-3, shipY+16, 6, 100); // preview bottom:22 height:50 → top y=16 prod

    // ── Hull — true trapezoid via polygon path. Inset highlight + shadow bands
    // + gold trim stripe drawn inside a clip so they don't overflow the trap edges.
    const hullH=44;
    const hullY=shipY+shipH-hullH;
    const hullInsetX=((shipW*0.08)|0); // preview clip-path 8% top inset
    const hullTLx=shipX+hullInsetX, hullTLy=hullY;
    const hullTRx=shipX+shipW-hullInsetX, hullTRy=hullY;
    const hullBRx=shipX+shipW, hullBRy=hullY+hullH;
    const hullBLx=shipX, hullBLy=hullY+hullH;
    g.save();
    g.beginPath();
    g.moveTo(hullTLx, hullTLy);
    g.lineTo(hullTRx, hullTRy);
    g.lineTo(hullBRx, hullBRy);
    g.lineTo(hullBLx, hullBLy);
    g.closePath();
    g.clip();
    // Fill bounding box; clip constrains to trapezoid.
    g.fillStyle=hullCol;   g.fillRect(shipX, hullY, shipW, hullH);
    g.fillStyle=hullTop;   g.fillRect(shipX, hullY, shipW, 6);           // top inset highlight
    g.fillStyle=hullBot;   g.fillRect(shipX, hullY+hullH-8, shipW, 8);   // bottom inset shadow
    g.fillStyle=goldT;     g.fillRect(shipX, hullY+16, shipW, 4);        // gold trim stripe
    g.restore();
    // Outline — 4px stroke along the trapezoid edge (2px inside + 2px outside).
    g.beginPath();
    g.moveTo(hullTLx, hullTLy);
    g.lineTo(hullTRx, hullTRy);
    g.lineTo(hullBRx, hullBRy);
    g.lineTo(hullBLx, hullBLy);
    g.closePath();
    g.lineWidth=4;g.strokeStyle=outline;g.stroke();
  }

  // Ship reflection — dashed shimmer on water. Preview: top:72%, 80×3.
  {
    const refY=(H*0.72)|0;
    const refW=160;
    const refX=((W-refW)/2)|0;
    g.globalAlpha=0.7;
    const refCol=window.TOKENS.resolveColor('ocean_shallow');
    // dashed 4px stripes every 8px
    for(let x=0;x<refW;x+=16)bx(refX+x, refY, 8, 3, refCol);
    g.globalAlpha=1;
  }

  // Main menu — bottom-centered dialog. Preview: bottom:44, 148px wide,
  // 2 items. Production 2×: bottom:88, 296px, text 18px preview → 36 render.
  {
    const hasSv=hasSave();
    const items=hasSv ? ['CONTINUE','NEW SEASON'] : ['NEW SEASON'];
    const itemSz=18;
    const rowStep=36;
    const padX=16, padTop=12, padBot=12;
    const dw=296;
    const dh=padTop+padBot+items.length*rowStep;
    const dx=((W-dw)/2)|0;
    const dy=H-88-dh;
    drawGBADialog(dx, dy, dw, dh, 'menu_blue', 'text_dark', 'menu_border');
    const sel=(titleMenuIdx|0);
    for(let i=0;i<items.length;i++){
      drawMenuButton(dx+padX, dy+padTop+i*rowStep, dw-padX*2, items[i], sel===i, itemSz);
    }
  }

  // [X] OPTIONS hint — bottom-left, small muted label to advertise overlay
  {
    const hintCol=window.TOKENS.resolveColor('fg_hint');
    txShadow('[X] OPTIONS', 16, H-20, 10, hintCol, 'rgba(0,0,0,0.4)');
  }

  // Footer — bottom-centered, 8px gray. "SOLANA · GROTH16 · BY YUKIKAZE"
  // BY YUKIKAZE highlighted gold per preview.
  {
    const footSz=8;
    const footY=H-8;
    setFont(Math.max(12,Math.round(footSz*1.4)));
    const muted=window.TOKENS.resolveColor('fg_hint');
    const gold=window.TOKENS.resolveColor('menu_border');
    const leftTxt='SOLANA  \u00B7  GROTH16  \u00B7  ';
    const rightTxt='BY YUKIKAZE';
    const lw=g.measureText(leftTxt).width;
    const rw=g.measureText(rightTxt).width;
    const totalFw=lw+rw;
    const fx=((W-totalFw)/2)|0;
    txShadow(leftTxt,  fx,     footY, footSz, muted, 'rgba(0,0,0,0.4)');
    txShadow(rightTxt, fx+lw,  footY, footSz, gold,  'rgba(0,0,0,0.4)');
  }

  // Version label — top-right, auto-populated from git describe at build time.
  // See build.js → BUILD_VERSION prepend. Fallback 'dev' if unset.
  {
    const ver=(typeof BUILD_VERSION==='string' && BUILD_VERSION) ? BUILD_VERSION : 'dev';
    const vSz=10;
    setFont(Math.max(12,Math.round(vSz*1.4)));
    const vw=g.measureText(ver).width;
    txShadow(ver, W-vw-16, 24, vSz, window.TOKENS.resolveColor('fg_muted'), 'rgba(0,0,0,0.7)');
  }

  // Dungeon entry confirmation overlay (shown on map, not title)
  // (rendered in drawMap via dungeonConfirmActive flag)

  // Stake confirmation overlay
  if(stakeConfirmActive){
    bx(0,0,W,H,'rgba(0,0,0,.6)');
    win(W/2-200,H/2-80,400,160);
    drawSolanaLogo(W/2,H/2-54,14);
    txShadow(_STAKE_CONFIRM_LBL,W/2-200,H/2-24,9,'#f0f0f0','rgba(0,0,0,.5)'); // v341: pre-baked
    txShadow(_SEAL_CLAIM_LBL,W/2-190,H/2+2,7,'#14F195','rgba(0,0,0,.4)'); // v341: pre-baked
    txShadow('(devnet — program upgrade pending)',W/2-140,H/2+22,6,'#555570','rgba(0,0,0,.35)');
    const blink_=Math.floor(fr/25)%2===0;
    if(blink_)txShadow('Z = Yes    X = No',W/2-100,H/2+52,9,'#f0c830','rgba(0,0,0,.4)');
  }
}

// ═══════════════════════════════════════
