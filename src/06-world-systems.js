// v254: Hoisted static arrays — eliminates per-frame inline literal allocation in synthesis + NPC dialog render
const _SYNTH_RAR_LABELS=['','Common','Uncommon','Rare','Epic'];
// v262: Additional per-frame inline literals hoisted
const _WLD_FLOOR_NUMS=['','B1','B2','B3','B4','B5'];
const _WLD_RAR_COLS=['','#888898','#50d060','#6090f0','#c060e0','#fff8a0'];
const _TITLE_VOID_COLS=['#5014b4','#5c1cc0','#6824cc','#742cd8','#8034e4'];
// ═══════════════════════════════════════
// v155: DUNGEON TURN SYSTEM
// ═══════════════════════════════════════

// Advance one dungeon turn: each rival takes one step
function processDungeonTurn(){
  if(!inDungeon)return;
  if(encounterCooldown>0)return; // let game loop decrement
  dungeonTurnStep(0);
  dungeonTurnStep(1);
  // Immediately check if any rival landed adjacent — fire encounter without waiting for next frame
  checkDungeonRivalEncounter();
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
      const rCards=cdCount(r.cd);
      const isHunting=ai.state==='hunting';
      const vegaLines=['Hand over the cards. Now.','The ARK\'s legacy is mine.','No walls stop a hunter.','Cornered. Just like the crew.','Nowhere left to run.'];
      const miraLines=['Precisely where my model predicted.','Your card count fell below threshold. Engaging.','The calculation is complete.','The ARK crew fell to logic. So will you.'];
      encounterRivalLine=idx===0?vegaLines[Math.floor(Math.random()*vegaLines.length)]:miraLines[Math.floor(Math.random()*miraLines.length)];
      setTimeout(()=>{
        encounterExclActive=false;flash();
        twSet(isHunting?r.n+' ambushed you! Battle!':r.n+' appeared! Battle!');
        startWipe('mosaic',30,()=>{
          sc='act';battlePhase='vs_splash';bpFrame=fr;
          battleRoundHistory=[];
          bpHP=[BATTLE_HP_MAX,BATTLE_HP_MAX,BATTLE_HP_MAX];bpHPDmgAnim=[0,0,0];
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
      floorItems[mapIdx].push({x:ix,y:iy,cardId,glow:Math.random()*Math.PI*2});
    }
  }
}

// Check if player stepped on a floor item, auto-pick it up
function checkFloorItemPickup(nx,ny){
  const items=floorItems[currentMap];
  if(!items||items.length===0)return;
  const idx=items.findIndex(it=>it.x===nx&&it.y===ny);
  if(idx===-1)return;
  const it=items.splice(idx,1)[0];
  const cr=CD[it.cardId-1];if(!cr)return;
  // Add to player hand/vault
  const placed=addCardToPlayer(0,it.cardId);
  triggerCardGetBurst(nx*TW+TW/2,ny*TH+TH/2,cr.c||'#f0c030');
  hitPause(4);
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
        runSummaryData={cardsGained,lostCards,deepest};
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
        const bVault=pl[0].vault||new Set();
        const bNew=bPool.filter(id=>!bVault.has(id));
        const bUsePool=bNew.length>0?bNew:bPool;
        const bCard=bUsePool[Math.floor(Math.random()*bUsePool.length)];
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
        // Prefer vault-new cards from this floor's pool (helps progression)
        const vault_=pl[0].vault||new Set();
        const newPool=pool.filter(id=>!vault_.has(id));
        const rewardCard=(newPool.length>0?newPool:pool)[Math.floor(Math.random()*(newPool.length>0?newPool:pool).length)];
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
      const vault_=pl[0].vault||new Set();
      const newPool=legendPool.filter(id=>!vault_.has(id));
      const usePool=newPool.length>0?newPool:legendPool;
      // Give 2 legendary cards as goal reward
      const reward1=usePool[Math.floor(Math.random()*usePool.length)];
      const reward2=usePool[Math.floor(Math.random()*usePool.length)];
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
    g.fillText('DANGER  '+('■'.repeat(d))+'□'.repeat(5-d),W/2,barY+barH+8);
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
          const shimmer=Math.sin(fr*0.07+phase*0.39)*0.5+0.5;
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
  const exitPulse=Math.sin(fr*0.15)*0.4+0.6;
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
      const ePulse=0.8+Math.sin(fr*0.1)*0.2;
      for(let _ti=0,_tl=ex.tiles.length;_ti<_tl;_ti++){
        const etx=ex.tiles[_ti][0],ety=ex.tiles[_ti][1];
        g.globalAlpha=ePulse;
        bx(mx+etx*sx,my+ety*sy,Math.max(2,sx),Math.max(2,sy),col);
        g.globalAlpha=1;
      }
    }
  }
  const playerPulse=Math.sin(fr*0.2)*0.3+0.7;
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
    if(Math.random()>(0.30+streakBonus+dangerBonus+rubberBand))return; // tall grass: 30% base
  }else if(tile===1){
    if(Math.random()>(0.15+streakBonus+dangerBonus+rubberBand))return; // regular grass: 15% base
  }else{
    return;
  }

  // Determine card based on current dungeon floor pool
  const floorPool=AREA_CARDS[currentMap]||AREA_CARDS[1];
  let cardIdx;
  // Streak 5+: pick an unowned card from the floor pool (guaranteed new unique if possible)
  if(streakCount>=5){
    const owned=hasUniqueCards(0);
    const needed=floorPool.filter(cid=>!owned.has(cid));
    if(needed.length>0){cardIdx=needed[Math.floor(Math.random()*needed.length)]-1;}
    else{cardIdx=floorPool[Math.floor(Math.random()*floorPool.length)]-1;}
  }else{
    // Normal: prefer vault-new card from floor pool
    const vault_w=pl[0].vault||new Set();
    const wNewPool=floorPool.filter(id=>!vault_w.has(id));
    const wPool=wNewPool.length>0?wNewPool:floorPool;
    cardIdx=wPool[Math.floor(Math.random()*wPool.length)]-1;
  }

  wildEncounterActive=true;
  wildEncounterCard=cardIdx;
  wildEncounterFrame=fr;
  sfxEncounter();
  flash();
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
    const pulse=0.5+Math.sin(t*0.35)*0.5;
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
    // Orbiting rarity sparks
    for(let oi=0;oi<wRar+3;oi++){
      const ang=t*0.2+oi*(Math.PI*2/(wRar+3));
      const dist=38+Math.sin(t*0.18+oi)*8;
      g.globalAlpha=prog*pulse*0.8;
      bx(W/2+Math.cos(ang)*dist-2,riseY+silH/2+Math.sin(ang)*dist-2,5,5,wRcol);
    }
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
    const rn2=pl[1].cd.filter(c=>c>0).length;
    const rn3=pl[2].cd.filter(c=>c>0).length;
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
    const rarityCounts={};
    for(let _ai=0,_al=pl[0].cd.length;_ai<_al;_ai++){const _c=pl[0].cd[_ai];if(_c>0){const r=CD[_c-1]?.r||1;rarityCounts[r]=(rarityCounts[r]||0)+1;}}
    const canSynth=Object.values(rarityCounts).some(cnt=>cnt>=3);
    if(canSynth)return['I sense synthesis','potential in your hand!','Bring me 3 cards','of matching rarity.','I will forge them','into something rarer.'];
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
  if(npc.name==='Alchemist')return['Bring me three cards.','I forge rarities.','Synthesis awaits!'];
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
  const arrowBounce=Math.sin(fr*0.15)*2;
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

function getPlayerFilledSlots(){
  const slots=[];
  for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)slots.push(i);}
  return slots;
}

function doShopTrade(){
  const filled=getPlayerFilledSlots();
  if(filled.length===0)return;
  const slot=filled[shopSelectedIdx];
  const oldCard=pl[0].cd[slot];
  const oldName=CD[oldCard-1].n;
  // Prioritize cards not yet in vault (new uniques) for progression
  const ownedInHand=new Set(pl[0].cd.filter(c=>c>0));
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
    const filled=getPlayerFilledSlots();
    if(filled.length===0){
      txShadow('You have no cards to trade.',wX+24,wY+80,8,'#989080','rgba(0,0,0,.2)');
      txShadow('Press X to leave.',wX+24,wY+102,7,'#686068','rgba(0,0,0,.15)');
    }else{
      txShadow('Select a card to offer:',wX+24,wY+56,7,'#988868','rgba(0,0,0,.2)');
      for(let i=0;i<filled.length;i++){
        const slot=filled[i];const cd=pl[0].cd[slot];
        const cr=CD[cd-1];
        const rowH=38,ry=wY+68+i*rowH;
        const isSel=i===shopSelectedIdx;
        const rarCol=RARITY_COLOR[cr.r]||'#888898';
        // Row highlight
        if(isSel){
          bx(wX+8,ry-4,wW-16,rowH-2,'rgba(192,168,96,.2)');
          bx(wX+8,ry-4,3,rowH-2,rarCol);
          const bob=Math.sin(fr*0.15)*2;
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
    const filled=getPlayerFilledSlots();
    const slot=filled[shopSelectedIdx];
    const cd=pl[0].cd[slot];
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
    // Trade description
    txShadow('Trade  '+cr.n+'  for a card you don\'t have?',W/2-200,wY+wH-120,8,'#e0d8c0','rgba(0,0,0,.3)');
    txShadow('('+vaultSz+'/60 collected)',W/2-68,wY+wH-100,7,'#c0a030','rgba(0,0,0,.25)');
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
// v74: SYNTHESIS (ALCHEMIST) SYSTEM
// ═══════════════════════════════════════
function doSynthesis(){
  // Validate: 3 cards of same rarity selected
  if(synthSelected.length!==3)return;
  const cards=synthSelected.map(slot=>pl[0].cd[slot]);
  const rarities=cards.map(cid=>CD[cid-1]?.r||1);
  const r=rarities[0];
  if(!rarities.every(rv=>rv===r))return;
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
  // Consume the 3 cards (sorted descending to avoid index shift issues)
  const sortedSlots=[...synthSelected].sort((a,b)=>b-a);
  sortedSlots.forEach(slot=>{removeCardFromPlayer(0,slot);cardTimers[slot]=0;});
  // Give new card
  const newId=pool[Math.floor(Math.random()*pool.length)];
  const added=addCardToPlayer(0,newId);
  if(!added){discardActive=true;discardSelIdx=0;discardPendingCard=newId;discardSource='wild';}
  synthResultCard=newId;
  synthPhase='result';synthResultFrame=fr;
  const cr=CD[newId-1];
  lg.push('[SYNTHESIS] Fused 3x '+RARITY_LABEL[r]+' → '+cr.n+' ('+RARITY_LABEL[cr.r]+')!');
  const _synthRarCols=['','#888898','#50d060','#b060e0','#e0a020','#ffe080'];
  sfxCardGet();screenShake(cr.r>=3?cr.r:3,cr.r>=3?cr.r*3:6);
  triggerCardGetBurst(pl[0].visualX-camX,pl[0].visualY-camY-8,_synthRarCols[cr.r]||'#f0c030');
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

  const filled=getPlayerFilledSlots().filter(s=>{
    const cid=pl[0].cd[s];return cid>0&&CD[cid-1]?.r===synthRarityFilter;
  });

  if(filled.length===0){
    txShadow('No '+_SYNTH_RAR_LABELS[synthRarityFilter]+' cards in hand.',80,120,7,'#989080','rgba(0,0,0,.3)');
  }else{
    const needed=3-synthSelected.length;
    txShadow('Select 3 cards → get 1 '+(_SYNTH_RAR_LABELS[synthRarityFilter+1]||'?')+' card',80,108,6,'#c0a060','rgba(0,0,0,.3)');
    txShadow(needed>0?'Need '+needed+' more':'3 selected — press Z to synthesize!',80,122,6,needed===0?'#40d080':'#808880','rgba(0,0,0,.3)');

    const cols=4,cellW=120,cellH=48;
    for(let i=0;i<filled.length;i++){
      const slot=filled[i];const cid=pl[0].cd[slot],cr=CD[cid-1];
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
  if(tgt)txShadow('3× '+_SYNTH_RAR_LABELS[synthRarityFilter]+' → 1× '+tgt,80,H-88,6,'#806030','rgba(0,0,0,.3)');
  txShadow('← → change rarity  Z=select/confirm  X=close',80,H-68,5,'#686068','rgba(0,0,0,.3)');
}

// ═══════════════════════════════════════
// RANDOM MAP EVENTS
// ═══════════════════════════════════════
function triggerRandomEvent(){
  // Base events (all floors)
  const baseEvents=[
    {text:'A strong wind blows! Your area is revealed to rivals.', action:'wind'},
    {text:'You found a forgotten stash! +1 random card.', action:'card'},
    {text:'A rival\'s scout passed by! You sense danger nearby.', action:'scout'},
    {text:'You hear echoing footsteps... something is close.', action:'tension'},
    {text:'The walls feel closer here. Decay quickens!', action:'decay_warn'},
  ];
  // Floor-specific bonus events
  const floorEvents=[
    [], // Town
    [{text:'A trail of footprints leads to a hidden card!', action:'card'}],   // Floor 1
    [{text:'Mushroom spores fill the air... you feel sluggish.', action:'tension'}],  // Floor 2
    [{text:'Ancient runes flare! Spell energy restored.', action:'spell_restore'}],   // Floor 3
    [{text:'A dark force drains your cards faster! Beware.', action:'decay_warn'}],  // Floor 4
    [{text:'The deepest floor trembles. A legendary card stirs!', action:'card'},     // Floor 5
     {text:'VEGA\'s voice echoes: "This floor is mine."', action:'rival_taunt'},
     {text:'MIRA\'s voice: "The legendary cards end here."', action:'rival_taunt'}],
  ];
  const floorExtra=floorEvents[currentFloor]||[];
  const allEvents=[...baseEvents,...floorExtra];
  const ev=allEvents[Math.floor(Math.random()*allEvents.length)];
  randomEventActive=true;
  randomEventText=ev.text;
  randomEventFrame=fr;
  sfxEventAlert();

  if(ev.action==='card'){
    // Give a card from current floor pool — prefer vault-new cards
    const pool=AREA_CARDS[currentMap]||AREA_CARDS[1];
    const vault_=pl[0].vault||new Set();
    const newPool_=pool.filter(id=>!vault_.has(id));
    const usePool_=newPool_.length>0?newPool_:pool;
    const cardId=usePool_[Math.floor(Math.random()*usePool_.length)]; // 1-indexed
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
  }
}

function drawRandomEvent(){
  if(!randomEventActive)return;
  const t=fr-randomEventFrame;
  if(t>180){randomEventActive=false;return;}
  const slideIn=Math.min(1,t/10);
  const slideOut=t>150?Math.max(0,1-(t-150)/30):1;
  const alpha=Math.min(slideIn,slideOut);
  const ease=easeInOut(alpha);
  const slideOff=50*(1-ease);
  g.globalAlpha=ease;
  win(24,H/2-50+slideOff,W-48,74);
  win(32,H/2-62+slideOff,70,18);
  txShadow('EVENT',42,H/2-48+slideOff,7,'#d8b028','rgba(0,0,0,.4)');
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
  // v81: Pre-battle dialogue speech bubble (appears t>12, fades at t>24)
  if(t>12&&encounterRivalLine){
    const lineAlpha=Math.min(1,(t-12)/6)*Math.max(0,(30-t)/8);
    g.globalAlpha=lineAlpha*alpha;
    const lineW=Math.min(200,encounterRivalLine.length*6+16);
    const lineX=rpx+14, lineY=rpy-56+bounce;
    bx(lineX,lineY,lineW,16,'rgba(8,8,16,.85)');
    bx(lineX,lineY,lineW,1,'rgba(200,180,120,.4)');
    bx(lineX,lineY+15,lineW,1,'rgba(200,180,120,.25)');
    // Speech bubble triangle pointer
    bx(lineX+4,lineY+16,4,2,'rgba(8,8,16,.85)');
    const rNameCol2=(encounterExclTarget===1)?'#f080c0':'#f0c830';
    txShadow('\u201C'+encounterRivalLine+'\u201D',lineX+4,lineY+12,5,rNameCol2,'rgba(0,0,0,.4)');
    g.globalAlpha=1;
  }
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

  // Combine current dialog lines and wrap properly
  const rawLine=npcDialogLines[npcDialogIdx]||'';
  const rawLine2=npcDialogLines[npcDialogIdx+1]||'';
  const maxChars=52;
  const wrapped1=wrapText(rawLine,maxChars);
  const wrapped2=rawLine2?wrapText(rawLine2,maxChars):[];
  const allLines=[...wrapped1,...wrapped2];
  const _alLen=Math.min(3,allLines.length);
  for(let i=0;i<_alLen;i++){
    txShadow(allLines[i],20,H-70+slideOff+i*16,7,FRLG.textColor,'rgba(0,0,0,.25)');
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
  const arrowBounce=hasMore?Math.floor(Math.sin(fr*Math.PI/30)*2):0;
  txShadow('\u25BC',W-24,H-18+slideOff+arrowBounce,7,accent,'rgba(0,0,0,.4)');
  g.globalAlpha=1;
}

// ═══════════════════════════════════════
// TITLE SCREEN
// v225: Pre-baked static title-screen canvases (eliminates per-frame gradient creation)
// ═══════════════════════════════════════
// Top purple-void gradient (static, 280px tall)
const _titleVoidGradCanvas=(()=>{
  const c=document.createElement('canvas');c.width=W;c.height=280;
  const ctx=c.getContext('2d');
  const gd=ctx.createLinearGradient(0,0,0,280);
  gd.addColorStop(0,'rgba(40,16,80,0.28)');gd.addColorStop(1,'rgba(40,16,80,0)');
  ctx.fillStyle=gd;ctx.fillRect(0,0,W,280);
  return c;
})();
// Rune grid lines (5 horizontal 1px lines, alpha=0.04)
const _titleRuneGridCanvas=(()=>{
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const ctx=c.getContext('2d');
  ctx.globalAlpha=0.04;ctx.fillStyle='#9945FF';
  for(let gy_=60;gy_<H;gy_+=80)ctx.fillRect(0,gy_,W,1);
  return c;
})();
// Moon constants shared between halo + disk bakes
const _moonMx=Math.floor(W*0.78),_moonMy=72,_moonMr=22;
// Moon halo: radial gradient baked at alpha=1 so globalAlpha scales it at draw time
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
// Moon disk + crescent shadow (baked at alpha=1, globalAlpha=moonPulse at draw time)
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
function dTitle(){
  bx(0,0,W,H,'#060612');
  // v225: pre-baked void gradient (was createLinearGradient every frame)
  g.drawImage(_titleVoidGradCanvas,0,0);
  // Ethereal void pillars — slow vertical light columns
  for(let b=0;b<5;b++){
    const bx_=(b*136+fr*0.08)%W;
    const ba=0.025+0.02*Math.sin(fr*0.015+b*1.2);
    g.globalAlpha=ba;
    g.fillStyle=_TITLE_VOID_COLS[b]; // v262: hoisted
    g.beginPath();g.moveTo(bx_,0);g.lineTo(bx_+18,0);g.lineTo(bx_+60,H);g.lineTo(bx_+42,H);g.closePath();g.fill();
    g.globalAlpha=1;
  }
  // v212: Star field — 120 stars across full screen with varied twinkle frequencies
  for(let i=0;i<120;i++){
    const sx=(i*47+13)%W,sy=(i*31+7)%(H-60);
    // Each star has unique frequency and phase for organic twinkle
    const freq=0.018+((i*1337)%100)*0.0003;
    const phase=((i*2741)%628)/100;
    const a=Math.sin(fr*freq+phase)*0.4+0.6;
    const purp=i%9===0,big=i%17===0;
    const sz=big?2:1;
    if(big){
      // Large star: cross sparkle — globalAlpha+solid avoids 2 template literals
      const sa=a*(0.5+Math.sin(fr*0.08+i)*0.2);
      g.globalAlpha=sa*0.35;g.fillStyle='#dcd5ff';
      g.fillRect(sx-1,sy,3,1);g.fillRect(sx,sy-1,1,3);
    }
    g.globalAlpha=purp?a*.42:a*.30;g.fillStyle=purp?'#b450ff':'#dcc8ff';
    g.fillRect(sx,sy,sz,sz);
  }
  g.globalAlpha=1;
  // v212: Occasional shooting star — fires every ~260 frames, lasts 20 frames
  {const sShotPhase=(fr+80)%280;
  if(sShotPhase<20){
    const sp2=sShotPhase/20;
    const shotX=W*0.08+sp2*W*0.45;
    const shotY=30+sp2*100;
    const shotA=Math.sin(sp2*Math.PI)*0.9;
    for(let t=0;t<7;t++){
      g.globalAlpha=shotA*(1-t/7)*0.8;
      bx((shotX-t*9)|0,(shotY-t*6)|0,2,1,'#d8d0ff');
    }
    g.globalAlpha=shotA;
    bx(shotX|0,shotY|0,3,2,'#fff');
    g.globalAlpha=1;
  }}
  // Rising rune wisps — small cross shapes drifting upward
  for(let b=0;b<5;b++){
    const bsy=H-((fr*0.5+b*140)%560);
    const bsx=80+b*110+Math.sin(fr*0.025+b)*22;
    const ba=Math.min(1,Math.min(bsy/100,(H-bsy)/50)*0.6);
    g.globalAlpha=ba*0.5;
    const rc=b%2===0?ARK.rune:'#c8a448';
    // Pixel cross rune
    bx(bsx-3,bsy,6,1,rc);bx(bsx,bsy-3,1,6,rc);
    g.globalAlpha=1;
  }
  // v225: pre-baked rune grid (was 5 bx calls with globalAlpha state change each frame)
  g.drawImage(_titleRuneGridCanvas,0,0);
  // v210/v225: Moon — pre-baked halo + disk, modulated by moonPulse globalAlpha
  {
    const moonPulse=0.55+Math.sin(fr*0.012)*0.04;
    // Outer halo (pre-baked at alpha=1; globalAlpha scales it to moonPulse*0.18)
    g.globalAlpha=moonPulse*0.18;
    g.drawImage(_moonHaloCanvas,_moonMx-_moonHaloR-2,_moonMy-_moonHaloR-2);
    // Moon disk + crescent (pre-baked, modulated by moonPulse)
    g.globalAlpha=moonPulse;
    g.drawImage(_moonDiskCanvas,_moonMx-_moonMr-4,_moonMy-_moonMr-4);
    g.globalAlpha=1;
    // Moon reflection shimmer on water below
    const refX=_moonMx,refY=H-30;
    for(let i=0;i<5;i++){
      const rw=14-i*2,rh=1;
      const ry_=refY+i*4+Math.sin(fr*0.04+i)*3;
      const ra=(0.18-i*0.03)*moonPulse;
      g.globalAlpha=ra;
      bx(refX-rw/2+Math.sin(fr*0.03+i*1.4)*6,ry_,rw,rh,'#c8c0e8');
    }
    g.globalAlpha=1;
  }
  if(fr%200<15){
    const sx=150+fr%200*10,sy=40+fr%200*2;
    g.fillStyle='#ffffff';for(let t=0;t<6;t++){g.globalAlpha=.4-t*.06;g.fillRect(sx-t*4,sy-t,2,1);}g.globalAlpha=1;
  }

  // Title rune halo
  g.globalAlpha=0.12+Math.sin(fr*0.04)*0.06;
  bx(W/2-130,172,260,40,'#9945FF');
  g.globalAlpha=1;
  // Title layers — purple ghost → sharp main
  txShadow('0xARK',W/2-96+2,192,32,'rgba(153,69,255,.35)','rgba(0,0,0,0)');
  txShadow('0xARK',W/2-96+1,191,32,'rgba(0,0,0,.5)','rgba(0,0,0,.6)');
  txShadow('0xARK',W/2-96,190,32,'#f8f0e0','rgba(0,0,32,.8)');
  if(Math.sin(fr*.02)>.3)tx('0xARK',W/2-96,190,32,'rgba(248,240,224,.12)');
  txShadow('60 CARDS. ONE HEIR. FIRST TO WIN TAKES ALL.',W/2-184,226,7,'#8090b8','rgba(0,0,0,.5)');
  txShadow('The ARK sank here. Its power waits.',W/2-128,240,7,'#c08848','rgba(0,0,0,.5)');

  // SEASON 1 badge
  const s1Blink=Math.sin(fr*0.06)*0.15+0.85;
  g.globalAlpha=s1Blink;
  bx(W/2-36,252,72,16,'rgba(200,152,32,.25)');
  bx(W/2-35,253,70,14,'rgba(200,152,32,.12)');
  txShadow('SEASON 1',W/2-30,264,7,'#f0c830','rgba(0,0,0,.4)');
  g.globalAlpha=1;

  // Grand Seal display — show actual pot if wallet connected
  const prizeStr=walletConnected&&stakePotAmount>0?'GRAND SEAL: '+stakePotAmount.toFixed(2)+' SOL':'GRAND SEAL: awaiting souls';
  // Rune glow behind prize text
  g.globalAlpha=0.18+Math.sin(fr*0.05)*0.08;bx(W/2-100,268,200,16,ARK.rune);g.globalAlpha=1;
  txShadow(prizeStr,W/2-96,280,7,'#14F195','rgba(0,0,0,.5)');

  // Ship silhouette in background
  {
    const shipX=W/2-60,shipY=260+Math.sin(fr*0.015)*3;
    // Hull
    bx(shipX-40,shipY+20,120,14,'#181828');bx(shipX-30,shipY+34,100,6,'#181828');
    bx(shipX-20,shipY+40,80,4,'#181828');
    // Hull bow curve
    bx(shipX+80,shipY+22,10,8,'#181828');bx(shipX+90,shipY+26,6,4,'#181828');
    bx(shipX-50,shipY+22,10,8,'#181828');
    // Mast
    bx(shipX+10,shipY-50,4,70,'#1c1c30');
    // Sail
    bx(shipX-16,shipY-42,30,36,'#222240');bx(shipX-12,shipY-38,22,28,'#282848');
    // Crow's nest
    bx(shipX+6,shipY-54,12,4,'#1c1c30');
    // Flag (pirate)
    const flagWave=Math.sin(fr*0.08)*2;
    bx(shipX+14,shipY-52+flagWave,16,10,'#1c1c30');
    bx(shipX+18,shipY-50+flagWave,2,2,'#2a2a48');bx(shipX+22,shipY-50+flagWave,2,2,'#2a2a48');
    bx(shipX+19,shipY-47+flagWave,4,2,'#2a2a48');
    // Second mast (shorter)
    bx(shipX+50,shipY-20,3,40,'#1c1c30');
    bx(shipX+36,shipY-14,20,18,'#222240');
    // Bowsprit
    bx(shipX+88,shipY+18,20,2,'#1c1c30');
  }
  // v110: Collected cards orbiting the title (personalised showcase, best rarity first)
  if(pl[0].vault&&pl[0].vault.size>0){
    const vault_=[...pl[0].vault].sort((a,b)=>(CD[b-1].r||1)-(CD[a-1].r||1));
    const orbitCards=vault_.slice(0,Math.min(8,vault_.length));
    const orbitCount=orbitCards.length;
    const orbitCX=W/2-96+64; // centered on "0xARK" title
    const orbitCY=196;
    const orbitRX=140,orbitRY=52;
    const orbitSpeed=0.006;
    for(let i=0;i<orbitCount;i++){
      const angle=fr*orbitSpeed+i*(Math.PI*2/orbitCount);
      const ox=orbitCX+Math.cos(angle)*orbitRX;
      const oy=orbitCY+Math.sin(angle)*orbitRY;
      // Depth cue: cards behind title (sin<0) are dimmer
      const depth=Math.sin(angle);
      const alpha=0.28+Math.max(0,depth)*0.35;
      const scale_=0.75+Math.max(0,depth)*0.25;
      const cid=orbitCards[i];
      const cr=CD[cid-1];
      // Skip cards behind the title text (depth<-0.2) so text stays readable
      if(depth<-0.2)continue;
      g.globalAlpha=alpha;
      g.save();
      g.translate(ox,oy);
      g.scale(scale_,scale_);
      // Mini card frame (14×10 at scale 1)
      bx(-7,-5,14,10,cr.d);bx(-6,-4,12,8,cr.c);
      // Rarity shimmer for epic/legendary
      if(cr.r>=4){
        const shim=0.3+Math.sin(fr*0.12+i)*0.25;
        g.globalAlpha=alpha*shim;
        bx(-7,-5,14,2,cr.r===5?'#ffe080':'#c8a820');
      }
      g.restore();
      g.globalAlpha=1;
    }
  }
  // Animated waves at bottom of title screen
  for(let wx=0;wx<W;wx+=4){
    const wy1=H-40+Math.sin(fr*0.04+wx*0.015)*6+Math.sin(fr*0.025+wx*0.008)*4;
    const wy2=H-28+Math.sin(fr*0.035+wx*0.012+2)*5+Math.sin(fr*0.02+wx*0.01)*3;
    const wy3=H-16+Math.sin(fr*0.03+wx*0.01+4)*4;
    bx(wx,wy1,4,2,`rgba(32,64,128,0.4)`);
    bx(wx,wy2,4,2,`rgba(40,80,150,0.35)`);
    bx(wx,wy3,4,2,`rgba(48,96,176,0.3)`);
  }
  // Solid wave base fill
  bx(0,H-20,W,20,'rgba(16,32,64,0.5)');
  bx(0,H-10,W,10,'rgba(12,24,48,0.6)');

  if(hasSave()){
    const sel=titleMenuIdx||0;
    const blink=Math.floor(fr/25)%2===0;
    if(sel===0&&blink||sel!==0)txShadow('CONTINUE',W/2-52,320,10,sel===0?FRLG.selHighlight:'#888898','rgba(0,0,0,.5)');
    if(sel===0)txShadow('\u25B6',W/2-76,320,10,FRLG.selHighlight,'rgba(0,0,0,.4)');
    if(sel===1&&blink||sel!==1)txShadow('NEW GAME',W/2-52,350,10,sel===1?FRLG.selHighlight:'#888898','rgba(0,0,0,.5)');
    if(sel===1)txShadow('\u25B6',W/2-76,350,10,FRLG.selHighlight,'rgba(0,0,0,.4)');
    // CONNECT WALLET option
    if(walletConnected){
      txShadow(walletAddressTruncated(),W/2-52,380,8,'#40d080','rgba(0,0,0,.4)');
      if(sel===2)txShadow('\u25B6',W/2-76,380,10,'#40d080','rgba(0,0,0,.4)');
    }else{
      if(sel===2&&blink||sel!==2)txShadow('BIND VAULT',W/2-60,380,10,sel===2?FRLG.selHighlight:'#888898','rgba(0,0,0,.5)');
      if(sel===2)txShadow('\u25B6',W/2-84,380,10,FRLG.selHighlight,'rgba(0,0,0,.4)');
    }
    // MULTIPLAYER option
    if(sel===3&&blink||sel!==3)txShadow('MULTIPLAYER',W/2-68,410,10,sel===3?FRLG.selHighlight:'#888898','rgba(0,0,0,.5)');
    if(sel===3)txShadow('\u25B6',W/2-92,410,10,FRLG.selHighlight,'rgba(0,0,0,.4)');
    if(mp.connected)txShadow('ONLINE',W/2+60,410,6,'#40d080','rgba(0,0,0,.4)');
    // CLEAR SAVE (sel===4)
    if(sel===4&&blink||sel!==4)txShadow('CLEAR SAVE DATA',W/2-88,440,10,sel===4?'#d04040':'#555570','rgba(0,0,0,.5)');
    if(sel===4)txShadow('\u25B6',W/2-112,440,10,'#d04040','rgba(0,0,0,.4)');
  }else{
    if(Math.floor(fr/25)%2===0)txShadow('PRESS Z TO START',W/2-110,330,10,FRLG.selHighlight,'rgba(0,0,0,.5)');
    // CONNECT WALLET option below start
    const sel2=titleMenuIdx||0;
    const blink2=Math.floor(fr/25)%2===0;
    if(walletConnected){
      txShadow(walletAddressTruncated(),W/2-52,370,8,'#40d080','rgba(0,0,0,.4)');
    }else{
      if(sel2===1&&blink2||sel2!==1)txShadow('BIND VAULT',W/2-60,370,10,sel2===1?FRLG.selHighlight:'#888898','rgba(0,0,0,.5)');
      if(sel2===1)txShadow('\u25B6',W/2-84,370,10,FRLG.selHighlight,'rgba(0,0,0,.4)');
    }
    // MULTIPLAYER option (no save)
    if(sel2===2&&blink2||sel2!==2)txShadow('MULTIPLAYER',W/2-68,400,10,sel2===2?FRLG.selHighlight:'#888898','rgba(0,0,0,.5)');
    if(sel2===2)txShadow('\u25B6',W/2-92,400,10,FRLG.selHighlight,'rgba(0,0,0,.4)');
    if(mp.connected)txShadow('ONLINE',W/2+60,400,6,'#40d080','rgba(0,0,0,.4)');
  }
  // On-chain / offline indicator
  if(walletConnected){
    drawSolanaIcon(W/2+82,550,8);
    txShadow(programVerified?'VERIFIED':'ON-CHAIN',W/2+100,560,7,programVerified?'#14F195':'#40d080','rgba(0,0,0,.4)');
  }else{
    txShadow('OFFLINE',W/2+100,560,7,'#555570','rgba(0,0,0,.35)');
  }

  // Stake display when wallet connected (placed below menu items)
  if(walletConnected){
    txShadow('OFFERING: '+STAKE_AMOUNT.toFixed(2)+' SOL',W/2-82,496,8,'#14F195','rgba(0,0,0,.4)');
    if(stakeDeposited){
      txShadow('SEAL POT: '+stakePotAmount.toFixed(2)+' SOL',W/2-76,512,7,'#f0c830','rgba(0,0,0,.4)');
    }
  }

  // "Built on Solana" branding at bottom
  drawSolanaLogo(W/2-120,548,10);
  txShadow('Built on Solana',W/2-104,552,7,'#9945FF','rgba(0,0,0,.5)');

  // CREDITS button (hasSave: idx5 y=470; no save: idx3 y=430)
  {
    const credSel=hasSave()?(titleMenuIdx===5):(titleMenuIdx===3);
    const credY=hasSave()?470:430;
    if(credSel){txShadow('\u25B6',W/2-66,credY,10,FRLG.selHighlight,'rgba(0,0,0,.4)');}
    const credBlink=Math.floor(fr/25)%2===0;
    if(credSel&&credBlink||!credSel)txShadow('CREDITS',W/2-42,credY,10,credSel?FRLG.selHighlight:'#555570','rgba(0,0,0,.5)');
  }

  // v107: Save progress preview on title screen
  if(hasSave()&&pl[0].vault){
    const svSize=pl[0].vault.size;
    const svPct=Math.floor(svSize/60*100);
    const previewY=488;
    const barW=160;const barX=W/2-barW/2;
    // Progress bar
    bx(barX,previewY,barW,8,'#181828');
    bx(barX,previewY,Math.round(barW*svSize/60),8,svSize>=60?'#f0c830':'#4070d0');
    bx(barX,previewY,barW,1,'#282848');bx(barX,previewY+7,barW,1,'#282848');
    // Collection text
    const progStr=svSize+'/60 cards collected ('+svPct+'%)';
    txShadow(progStr,W/2-progStr.length*4,previewY+22,7,'#a0a8c0','rgba(0,0,0,.4)');
    // Steps
    txShadow('Steps: '+stepCounter,W/2-50,previewY+36,6,'#686880','rgba(0,0,0,.3)');
  }
  // Footer credits
  txShadow('Built for Colosseum Frontier 2026 | Solana | Anchor | Circom | x402',W/2-310,582,6,'#444460','rgba(0,0,0,.4)');
  // Version label — shown in top-right for easy reference
  txShadow('v265',W-48,14,10,'#c0c8ff','rgba(0,0,0,0.7)');

  // Dungeon entry confirmation overlay (shown on map, not title)
  // (rendered in drawMap via dungeonConfirmActive flag)

  // Stake confirmation overlay
  if(stakeConfirmActive){
    bx(0,0,W,H,'rgba(0,0,0,.6)');
    win(W/2-200,H/2-80,400,160);
    drawSolanaLogo(W/2,H/2-54,14);
    txShadow('OFFER '+STAKE_AMOUNT.toFixed(2)+' SOL TO BREAK THE SEAL?',W/2-200,H/2-24,9,'#f0f0f0','rgba(0,0,0,.5)');
    txShadow('Victor claims the Grand Seal: '+stakePotAmount.toFixed(2)+' SOL',W/2-190,H/2+2,7,'#14F195','rgba(0,0,0,.4)');
    txShadow('(UI preview - devnet not deployed)',W/2-150,H/2+22,6,'#555570','rgba(0,0,0,.35)');
    const blink_=Math.floor(fr/25)%2===0;
    if(blink_)txShadow('Z = Yes    X = No',W/2-100,H/2+52,9,'#f0c830','rgba(0,0,0,.4)');
  }
}

// ═══════════════════════════════════════
