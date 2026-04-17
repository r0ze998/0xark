const exits=[
  // Town dungeon portal (glow tiles x=27 y=11-13) → Dungeon Floor 1
  {fromMap:0, tiles:[[27,11],[27,12],[27,13]],
   targetMap:1, targetX:3, targetY:14},
  // Dungeon Floor 1 exit tile (30) → Town
  {fromMap:1, tiles:[[3,14],[3,15],[4,14],[4,15]], targetMap:0, targetX:35, targetY:13, isEscape:true},
  // Dungeon Floor 1 → Floor 2 (glow tile stairway)
  {fromMap:1, tiles:[[36,14],[36,15],[37,14],[37,15]], targetMap:2, targetX:3, targetY:14},
  // Dungeon Floor 2 → Floor 1 (escape)
  {fromMap:2, tiles:[[3,14],[3,15],[4,14],[4,15]], targetMap:1, targetX:36, targetY:14, isEscape:true},
  // Dungeon Floor 2 → Floor 3
  {fromMap:2, tiles:[[36,14],[36,15],[37,14],[37,15]], targetMap:3, targetX:3, targetY:14},
  // Dungeon Floor 3 → Floor 2 (escape)
  {fromMap:3, tiles:[[3,14],[3,15],[4,14],[4,15]], targetMap:2, targetX:36, targetY:14, isEscape:true},
  // Dungeon Floor 3 → Floor 4
  {fromMap:3, tiles:[[36,14],[36,15],[37,14],[37,15]], targetMap:4, targetX:3, targetY:14},
  // Dungeon Floor 4 → Floor 3 (escape)
  {fromMap:4, tiles:[[3,14],[3,15],[4,14],[4,15]], targetMap:3, targetX:36, targetY:14, isEscape:true},
  // Dungeon Floor 4 → Floor 5
  {fromMap:4, tiles:[[36,14],[36,15],[37,14],[37,15]], targetMap:5, targetX:3, targetY:14},
  // Dungeon Floor 5 → Floor 4 (escape up)
  {fromMap:5, tiles:[[3,14],[3,15],[4,14],[4,15]], targetMap:4, targetX:36, targetY:14, isEscape:true},
  // Dungeon Floor 5 GOAL — clears dungeon, returns to Town with legendary card reward
  {fromMap:5, tiles:[[36,14],[36,15],[37,14],[37,15]], targetMap:0, targetX:35, targetY:13, isGoal:true},
];

// ── NPC DATA ── (GDD v1.0: Town NPCs + Dungeon Entrance)
// homeX/homeY = spawn position; npc wanders within 2 tiles; moveTimer = frames until next step
function makeNpc(map,x,y,type,name,dir,dialog){
  return{map,x,y,homeX:x,homeY:y,type,name,dir,dialog,
         moveTimer:120+Math.floor(Math.random()*240),visualX:x*TW,visualY:y*TH,walkFrame:0,walking:false};
}
const npcs=[
  makeNpc(0,8,6,0,'Card Merchant',0,['Welcome to the','0xARK Marketplace!','Press Z to browse','your cards and','view listings.','Trade safely here!']),
  makeNpc(0,22,6,1,'Trade Master',0,['Looking for a','specific card?','Make an offer and','other players will','see it here.','Good luck hunting!']),
  makeNpc(0,14,12,2,'Gacha Keeper',2,['Try your luck!','Common 0.01 SOL','Rare 0.05 SOL','Epic 0.20 SOL','Deeper floors give','rarer drop tables!']),
  makeNpc(0,18,18,0,'ARK Guide',0,['Collect all 60 cards','to win the Prize Pool!','Cards: Attack / Defense','Flee / Magic / Heal','STEAL rivals in battle.','Deeper dungeon = rarer!']),
  makeNpc(0,26,14,1,'Dungeon Porter',3,['Dungeon entrance','is to the east!','Cards DECAY over time','while underground.','Escape west to return','to town safely.']),
  // v74: Alchemist NPC — card synthesis
  makeNpc(0,10,18,3,'Alchemist',0,['I can fuse cards into','higher rarities!','Bring me 3 cards','of the same rarity.','I will forge them','into something greater.']),
];
// v82: init ambient bubble state on each NPC
npcs.forEach(n=>{n.bubbleTimer=0;n.bubbleText='';n.bubbleCooldown=Math.floor(Math.random()*300);});

// ── TREASURE DATA (GDD v1.0) ──
// Treasure pool per floor depth (1-indexed card IDs matching DUNGEON_FLOOR_CARDS)
const TREASURE_POOL_PER_FLOOR=[
  [],
  [4,5,13,14,25,26],   // Floor 1: Common/Uncommon
  [6,7,15,16,27,28],   // Floor 2: Uncommon
  [8,9,10,17,18,29],   // Floor 3: Rare
  [11,20,21,32,46,47], // Floor 4: Epic
  [1,2,12,23,24,48],   // Floor 5: Legendary
];
// Built dynamically from tile 30 positions; entry stair (3,14) excluded
const DUNGEON_ENTRY_EXCLUDE=new Set(['1-3-14','2-3-14','3-3-14','4-3-14','5-3-14']);
const treasures=[];
// v282: treasure lookup Map for O(1) tile-render check (replaces per-frame .find() scan)
const treasureByPos=new Map(); // key="mapf-x-y", value=treasure obj
(function buildTreasures(){
  for(let f=1;f<=MAX_DUNGEON_FLOORS;f++){
    const m=maps[f];
    const pool=TREASURE_POOL_PER_FLOOR[f];
    let poolIdx=0;
    for(let y=0;y<MH;y++){
      for(let x=0;x<MW;x++){
        if(m[y]?.[x]===30&&!DUNGEON_ENTRY_EXCLUDE.has(f+'-'+x+'-'+y)){
          const cardId1=pool[poolIdx%pool.length]; // 1-indexed
          const t={map:f,x,y,card:cardId1-1,collected:false}; // 0-indexed for CD[]
          treasures.push(t);
          treasureByPos.set(f+'-'+x+'-'+y,t);
          poolIdx++;
        }
      }
    }
  }
})();

// ── BIRD SPRITES (Forest wildlife) ──
const birds=[];
for(let i=0;i<5;i++){
  birds.push({x:5+Math.floor(Math.random()*30), y:5+Math.floor(Math.random()*20), vx:0, vy:0, timer:30+Math.floor(Math.random()*60), map:1});
}

// ── LOCATION BANNER ──
let bannerText='', bannerTimer=0, bannerPhase=0; // 0=slide in, 1=hold, 2=slide out
let bannerSubText='';
function showBanner(text,sub){
  bannerText=text;
  bannerSubText=sub||'';
  bannerTimer=0;
  bannerPhase=0;
}

// ── NPC DIALOG STATE ──
let npcDialogActive=false, npcDialogLines=[], npcDialogIdx=0, npcDialogName='', npcDialogOpenFrame=0;

// ── v84: TOWN WEATHER ──
// v384: pre-baked fog bank Y-sway table (12 entries, step 1.3) for sin-addition with _sFr015
const _FOG_SI13=new Float32Array(12);const _FOG_CI13=new Float32Array(12);
for(let i=0;i<12;i++){_FOG_SI13[i]=Math.sin(i*1.3);_FOG_CI13[i]=Math.cos(i*1.3);}
let townWeather='clear'; // 'clear'|'rain'|'fog'
let townWeatherAlpha=1.0; // 0→1 fade-in for current weather
let townWeatherTimer=0; // counts frames; cycles at WEATHER_CYCLE_FRAMES
const WEATHER_CYCLE_FRAMES=4800; // ~80 seconds per weather state at 60fps

// ── WILD ENCOUNTER STATE ──
let wildEncounterActive=false, wildEncounterCard=-1, wildEncounterFrame=0;

// ── RIVAL AI SYSTEM ──
let rivalMaps=[1,1]; // GDD v1.0: rivals start in dungeon floor 1
let rivalAlert=0, rivalAlertName='', rivalAlertRival=-1;
const RIVAL_ALERT_DUR=150; // v439: extended to 2.5s for dramatic banner

// Rival AI state objects
const rivalAI=[
  // Index 0 = pl[1] "VEGA" — The Hunter (Aggressive, hot-pink)
  {goalX:10,goalY:10,goalMap:0,personality:'hunter',moveTimer:0,moveInterval:8,
   lastKnownPlayerMap:-1,lastKnownPlayerX:-1,lastKnownPlayerY:-1,
   state:'exploring',stateTimer:0,fleeDir:-1,huntCooldown:0},
  // Index 1 = pl[2] "MIRA" — The Collector (Strategic, gold)
  {goalX:20,goalY:15,goalMap:1,personality:'collector',moveTimer:0,moveInterval:12,
   lastKnownPlayerMap:-1,lastKnownPlayerX:-1,lastKnownPlayerY:-1,
   state:'exploring',stateTimer:0,fleeDir:-1,huntCooldown:0}
];

// v79: Run mission definitions
const RUN_MISSION_DEFS=[
  {type:'reach_floor',desc:'Reach Floor III',goal:3,reward:'+1 STL',rewardKey:'stl1'},
  {type:'battle_rival',desc:'Battle any rival',goal:1,reward:'+1 BAR',rewardKey:'bar1'},
  {type:'new_cards',  desc:'Collect 3 new cards',goal:3,reward:'+1 SCT',rewardKey:'sct1'},
  {type:'steal_win',  desc:'Steal from a rival',goal:1,reward:'+2 STL',rewardKey:'stl2'},
  {type:'survive',    desc:'Fight 3 battle rounds',goal:3,reward:'Spell refill',rewardKey:'refill'},
];

// Rival pre-battle taunts indexed by [rivalIdx][random]
const RIVAL_TAUNTS=[
  // VEGA — predator, ARK hunter, short and sharp
  ['Your cards are mine.','The ARK chose me. Not you.','I never lose twice.','Don\'t blink.','I hunted the crew. I\'ll hunt you.','The deep vault is mine.','Run. I enjoy the chase.'],
  // MIRA — cold archivist, calculated
  ['I\'ve archived every move you\'ve made.','Your card composition is... suboptimal.','Every card has a price. I know yours.','The ARK\'s crew failed by emotion. You will too.','Nothing personal. Just Legendary cards.','My model had you losing three rounds ago.'],
];

// Footprints system: {map, x, y, age}
const footprints=[];
const FOOTPRINT_MAX_AGE=3600; // 60 seconds at 60fps
// v435: per-rival/map freshest-age cache — eliminates O(n) HUD scan each frame
// Layout: [ri * FOG_MAP_COUNT + mapIdx] where ri=0 for VEGA, ri=1 for MIRA
const _fpFreshAge=new Float32Array(2*(1+5)).fill(Infinity); // 2 rivals × 6 maps
const _fpCnt=new Int32Array(2*(1+5)); // count of live footprints per (rival, map)
function _fpKey(ri,mapIdx){return(ri-1)*(1+5)+mapIdx;} // ri=1 or 2; key=[0..11]

// Proximity tension state
let proximityPulseTimer=0;
let proximityDangerLevel=0; // 0=none, 1=same map, 2=within 8, 3=within 5, 4=within 2
let rivalDangerAlertShown=false;
let rivalWinWarning=0; // 0=safe, 1=rival has 4+ cards (alert), 2=rival has 5 (full hand — danger)
let rivalWinWarningShown=false;
// v77: Quick hand inspect overlay
let handInspectActive=false, handInspectFrame=0, handInspectAutoDismiss=300; // 5s

// v351: pre-allocated buffers for stepToward — eliminates array allocs per rival move
const _stepCands=[{nx:0,ny:0},{nx:0,ny:0},{nx:0,ny:0},{nx:0,ny:0},{nx:0,ny:0},{nx:0,ny:0},{nx:0,ny:0},{nx:0,ny:0}];let _stepCandN=0;
const _stepPerp=[{nx:0,ny:0},{nx:0,ny:0},{nx:0,ny:0},{nx:0,ny:0}]; // reuse for perpendicular fallback

// v73: Rival intel dispatch ticker
const rivalNewsQueue=[];     // pending news items {text, rivalIdx, rarity}
let rivalNewsCurrent=null;   // currently displayed item
let rivalNewsFrame=0;        // how long current item has been shown
const RIVAL_NEWS_DURATION=240; // ~4 seconds at 60fps

// Proximity taunt state — rival says something when close
let proximityTauntTimer=0;   // cooldown before next taunt (frames)
let proximityTauntText='';   // current taunt being displayed
let proximityTauntRival=-1;  // which rival (1 or 2)
let proximityTauntFrame=0;   // when taunt started

// v296: Roman numeral floor labels (hoisted — replaces inline array in updateRivalActivity)
const _RN_ROMAN=['','I','II','III','IV','V'];

// Close-range taunts indexed by [rivalIdx=0/1][sub]
// v292: floor-tiered proximity taunts — called at dangerLevel 3 (within 5 tiles)
const _PROX_VEGA=[
  // Tier 0: F1-F2
  ['Found you.','Hand over the cards.','Nowhere to run.','I can smell your cards.','Dead end.'],
  // Tier 1: F3
  ['You\'re in my range.','B3 is my floor.','Running won\'t help here.','I see you.','Clock\'s ticking.'],
  // Tier 2: F4-F5
  ['Nothing survives here.','Your cards or your run.','You made it this far. Impressive.','Final stretch. Mine.','The deepest floor is mine.'],
];
const _PROX_MIRA=[
  // Tier 0: F1-F2
  ['I\'ve been tracking you.','Nice collection you have.','Let\'s make this quick.','Your cards belong in my set.','I calculated this route.'],
  // Tier 1: F3
  ['Within 5 tiles. As predicted.','Your path ends here.','Calculating final approach.','You should have taken a different fork.','My model confirms: this is your last move.'],
  // Tier 2: F4-F5
  ['Deepest floor. No retreat.','The ARK archive is almost complete.','You reached F'+currentFloor+'. Rare. Temporary.','Your card count drops to zero in my projections.','At this depth, evasion probability: 0.'],
];
// (PROXIMITY_TAUNTS removed v293 — selector now uses _PROX_VEGA/_PROX_MIRA[tier] directly)

// Danger drone SFX
let dangerDroneNode=null,dangerDroneGain=null;
function startDangerDrone(){
  if(!soundEnabled||dangerDroneNode)return;
  try{
    const o=AC.createOscillator(),gn=AC.createGain();
    o.type='sine';o.frequency.value=55;
    gn.gain.value=0;
    o.connect(gn);gn.connect(AC.destination);
    o.start();
    dangerDroneNode=o;dangerDroneGain=gn;
  }catch(e){}
}
function stopDangerDrone(){
  if(dangerDroneNode){
    try{dangerDroneGain.gain.linearRampToValueAtTime(0,AC.currentTime+0.3);
    setTimeout(()=>{try{dangerDroneNode.stop();dangerDroneNode.disconnect();}catch(e){}dangerDroneNode=null;dangerDroneGain=null;},400);
    }catch(e){dangerDroneNode=null;dangerDroneGain=null;}
  }
}
function sfxDangerAlert(){if(!soundEnabled)return;beep(200,.1,.08);setTimeout(()=>beep(300,.08,.07),100);}

// Find a walkable tile near (x,y) on mapIdx for rival goal
function findWalkableTile(mapIdx,nearX,nearY,radius){
  const m=maps[mapIdx];
  for(let attempt=0;attempt<40;attempt++){
    const rx=nearX+Math.floor(Math.random()*radius*2)-radius;
    const ry=nearY+Math.floor(Math.random()*radius*2)-radius;
    if(rx>=1&&rx<MW-1&&ry>=1&&ry<MH-1&&WALKABLE.has(m[ry]?.[rx])){
      return{x:rx,y:ry};
    }
  }
  return null;
}

// Find tall grass patches on a map
function findGrassPatch(mapIdx){
  const m=maps[mapIdx];
  const patches=[];
  for(let y=2;y<MH-2;y++){
    for(let x=2;x<MW-2;x++){
      if(m[y][x]===11)patches.push({x,y});
    }
  }
  if(patches.length===0)return null;
  return patches[Math.floor(Math.random()*patches.length)];
}

// Find which dungeon floor map has cards a rival needs
// v351: no Set/filter allocs — use includes() and manual counting
let _fcmBestMap=1,_fcmBestScore=0;
function findCardMap(rIdx){
  const r=pl[rIdx];
  const cd=r.cd;
  _fcmBestMap=1;_fcmBestScore=0;
  for(let m=1;m<=MAX_DUNGEON_FLOORS;m++){
    const pool=AREA_CARDS[m]||[];
    let score=0;
    for(let i=0;i<pool.length;i++){if(!cd.includes(pool[i]))score++;}
    if(score>_fcmBestScore){_fcmBestScore=score;_fcmBestMap=m;}
  }
  if(_fcmBestScore>0)return _fcmBestMap;
  return 1+Math.floor(Math.random()*MAX_DUNGEON_FLOORS);
}

// Find exit from current map to target map
function findExitToMap(fromMap,toMap){
  for(const ex of exits){
    if(ex.fromMap===fromMap&&ex.targetMap===toMap){
      return{x:ex.tiles[0][0],y:ex.tiles[0][1],targetMap:ex.targetMap,targetX:ex.targetX,targetY:ex.targetY};
    }
  }
  return null;
}

// Simple step toward goal: reduce dx or dy by 1, prefer walkable+path tiles
function stepToward(rIdx,goalX,goalY){
  const p=pl[rIdx];
  const mapIdx=rivalMaps[rIdx-1];
  const m=maps[mapIdx];
  const dx=goalX-p.x;
  const dy=goalY-p.y;
  if(dx===0&&dy===0)return false;

  // v351: reuse module-scope buffer instead of allocating candidates[] per call
  _stepCandN=0;
  const _sx1=p.x+(dx>0?1:-1),_sy1=p.y+(dy>0?1:-1);
  // mutate pre-allocated slots in-place (no object creation per call)
  if(Math.abs(dx)>=Math.abs(dy)){
    if(dx!==0){_stepCands[_stepCandN].nx=_sx1;_stepCands[_stepCandN].ny=p.y;_stepCandN++;}
    if(dy!==0){_stepCands[_stepCandN].nx=p.x;_stepCands[_stepCandN].ny=_sy1;_stepCandN++;}
    if(dx!==0&&dy!==0){_stepCands[_stepCandN].nx=p.x;_stepCands[_stepCandN].ny=_sy1;_stepCandN++;_stepCands[_stepCandN].nx=_sx1;_stepCands[_stepCandN].ny=p.y;_stepCandN++;}
  }else{
    if(dy!==0){_stepCands[_stepCandN].nx=p.x;_stepCands[_stepCandN].ny=_sy1;_stepCandN++;}
    if(dx!==0){_stepCands[_stepCandN].nx=_sx1;_stepCands[_stepCandN].ny=p.y;_stepCandN++;}
    if(dx!==0&&dy!==0){_stepCands[_stepCandN].nx=_sx1;_stepCands[_stepCandN].ny=p.y;_stepCandN++;_stepCands[_stepCandN].nx=p.x;_stepCands[_stepCandN].ny=_sy1;_stepCandN++;}
  }
  // Random perpendicular fallback — reuse static buffer, shuffle in-place
  if(_stepCandN<3){
    _stepPerp[0].nx=p.x+1;_stepPerp[0].ny=p.y;_stepPerp[1].nx=p.x-1;_stepPerp[1].ny=p.y;
    _stepPerp[2].nx=p.x;_stepPerp[2].ny=p.y+1;_stepPerp[3].nx=p.x;_stepPerp[3].ny=p.y-1;
    // Fisher-Yates shuffle on _stepPerp (in-place, no new array)
    for(let _si=3;_si>0;_si--){const _sj=Math.floor(Math.random()*(_si+1));const _st=_stepPerp[_si];_stepPerp[_si]=_stepPerp[_sj];_stepPerp[_sj]=_st;}
    for(let _si=0;_si<4;_si++)_stepCands[_stepCandN++]=_stepPerp[_si];
  }

  // Pick best walkable candidate
  for(let _ci=0;_ci<_stepCandN;_ci++){const c=_stepCands[_ci];
    if(c.nx>=0&&c.nx<MW&&c.ny>=0&&c.ny<MH&&WALKABLE.has(m[c.ny]?.[c.nx])){
      // Set direction
      const sdx=c.nx-p.x,sdy=c.ny-p.y;
      if(sdy>0)p.dir=0;else if(sdx<0)p.dir=1;
      else if(sdy<0)p.dir=2;else if(sdx>0)p.dir=3;
      p.x=c.nx;p.y=c.ny;p.step++;
      return true;
    }
  }
  return false;
}

// x402-enhanced rival AI: periodically fetch strategy from broker
let x402RivalStrategyTimer=[0,0];
let x402RivalLastAdvice=['',''];
function x402MaybeEnhanceRival(aiIdx){
  if(!x402Available)return;
  x402RivalStrategyTimer[aiIdx]++;
  // Check every ~15 seconds (900 frames)
  if(x402RivalStrategyTimer[aiIdx]<900)return;
  x402RivalStrategyTimer[aiIdx]=0;
  const rIdx=aiIdx+1;
  x402FetchIntel('/intel/strategy?player='+rIdx).then(data=>{
    if(!data||!data.recommendedAction)return;
    x402RivalLastAdvice[aiIdx]=data.recommendedAction;
    const ai=rivalAI[aiIdx];
    // Map GDD v1.0 broker floor names to map indices
    const floorNameToIdx={'Town':0,'B1':1,'B2':2,'B3':3,'B4':4,'B5':5};
    // MOVE: navigate to the broker-recommended floor
    if(data.recommendedAction==='MOVE'&&data.recommendedFloor){
      const targetMap=floorNameToIdx[data.recommendedFloor]??-1;
      if(targetMap>0&&targetMap!==rivalMaps[aiIdx]){
        const ex=findExitToMap(rivalMaps[aiIdx],targetMap);
        if(ex){ai.goalX=ex.x;ai.goalY=ex.y;ai.state='exploring';}
      }
    }
    // STEAL: hunter becomes more aggressive
    if(data.recommendedAction==='STEAL'&&ai.personality==='hunter'){
      ai.moveInterval=Math.max(6,ai.moveInterval-2);
    }
    // DRAW: seek tall grass on current floor
    if(data.recommendedAction==='DRAW'){
      const grass=findGrassPatch(rivalMaps[aiIdx]);
      if(grass){ai.goalX=grass.x;ai.goalY=grass.y;ai.state='exploring';}
    }
  }).catch(()=>{});
}

// Rival picks a new goal based on personality
function pickRivalGoal(aiIdx){
  const ai=rivalAI[aiIdx];
  const rIdx=aiIdx+1; // pl index
  const r=pl[rIdx];
  const rMap=rivalMaps[aiIdx];
  const rCards=cdCount(r.cd); // v351: no filter alloc

  if(ai.personality==='hunter'){
    // The Hunter - Aggressive
    // Priority 1: If knows player location, move toward them
    if(ai.lastKnownPlayerMap>=0&&ai.lastKnownPlayerMap===rMap){
      ai.goalX=ai.lastKnownPlayerX;
      ai.goalY=ai.lastKnownPlayerY;
      ai.goalMap=rMap;
      ai.state='hunting';
      return;
    }
    // Priority 2: If < 3 cards, go get cards
    if(rCards<3){
      const needMap=findCardMap(rIdx);
      if(needMap!==rMap){
        // Navigate to exit
        const ex=findExitToMap(rMap,needMap);
        if(ex){ai.goalX=ex.x;ai.goalY=ex.y;ai.goalMap=rMap;ai.state='exploring';return;}
      }
      const grass=findGrassPatch(rMap);
      if(grass){ai.goalX=grass.x;ai.goalY=grass.y;ai.goalMap=rMap;ai.state='exploring';return;}
    }
    // Priority 3: Has 3+ cards, hunt the player
    if(ai.lastKnownPlayerMap>=0&&ai.lastKnownPlayerMap!==rMap){
      const ex=findExitToMap(rMap,ai.lastKnownPlayerMap);
      if(ex){ai.goalX=ex.x;ai.goalY=ex.y;ai.goalMap=rMap;ai.state='hunting';return;}
    }
    // Default: explore randomly
    const t=findWalkableTile(rMap,Math.floor(MW/2),Math.floor(MH/2),15);
    if(t){ai.goalX=t.x;ai.goalY=t.y;ai.goalMap=rMap;}
    ai.state='exploring';
  }else{
    // The Collector - Strategic
    // Priority 1: Go to area with missing cards
    const needMap=findCardMap(rIdx);
    if(needMap!==rMap){
      // Avoid the hunter rival's floor if possible (VEGA = rivalAI[0] = pl[1])
      const hunterMap=rivalMaps[0];
      if(needMap===hunterMap&&rCards>=2){
        // Try alternate dungeon floor (1-MAX_DUNGEON_FLOORS, avoiding current and hunter's floor)
        const altMaps=[];
        for(let m=1;m<=MAX_DUNGEON_FLOORS;m++){if(m!==rMap&&m!==hunterMap)altMaps.push(m);}
        // v351: inline inclusion check instead of new Set+filter alloc
        const altNeed=altMaps.find(m=>{const pool=AREA_CARDS[m]||[];return pool.some(c=>!r.cd.includes(c));});
        if(altNeed!==undefined){
          const ex=findExitToMap(rMap,altNeed);
          if(ex){ai.goalX=ex.x;ai.goalY=ex.y;ai.goalMap=rMap;ai.state='exploring';return;}
        }
      }
      const ex=findExitToMap(rMap,needMap);
      if(ex){ai.goalX=ex.x;ai.goalY=ex.y;ai.goalMap=rMap;ai.state='exploring';return;}
    }
    // Priority 2: Walk to tall grass
    const grass=findGrassPatch(rMap);
    if(grass){ai.goalX=grass.x;ai.goalY=grass.y;ai.goalMap=rMap;ai.state='exploring';return;}
    // Default: explore
    const t=findWalkableTile(rMap,Math.floor(MW/2),Math.floor(MH/2),15);
    if(t){ai.goalX=t.x;ai.goalY=t.y;ai.goalMap=rMap;}
    ai.state='exploring';
  }
}

// v155: Turn-based single step for a rival in dungeon (bypasses real-time timer)
function dungeonTurnStep(aiIdx){
  const ai=rivalAI[aiIdx];
  const rIdx=aiIdx+1;
  const r=pl[rIdx];
  const rMap=rivalMaps[aiIdx];
  if(encounterCooldown>0)return;
  if(ai.huntCooldown>0)ai.huntCooldown--;
  // Update detection based on distance
  if(rMap===currentMap){
    const dist=Math.abs(r.x-pl[0].x)+Math.abs(r.y-pl[0].y);
    // Always track player position when on same floor (needed for hunting)
    ai.lastKnownPlayerMap=currentMap;
    ai.lastKnownPlayerX=pl[0].x;ai.lastKnownPlayerY=pl[0].y;
    // Hunter: redirect to player once huntCooldown expires (any distance on same floor)
    if(ai.personality==='hunter'&&ai.huntCooldown<=0){
      ai.goalX=pl[0].x;ai.goalY=pl[0].y;ai.goalMap=rMap;ai.state='hunting';ai.moveInterval=5;
    }
    // Collector: flee when player is within 6 tiles
    if(ai.personality==='collector'&&dist<=6&&ai.state!=='fleeing'){
      if(Math.random()<0.7){
        ai.state='fleeing';ai.stateTimer=8;ai.moveInterval=5;
        const fdx=r.x-pl[0].x;const fdy=r.y-pl[0].y;
        const fx=r.x+(fdx>0?10:-10);const fy=r.y+(fdy>0?10:-10);
        const clamped=findWalkableTile(rMap,Math.max(2,Math.min(MW-3,fx)),Math.max(2,Math.min(MH-3,fy)),6);
        if(clamped){ai.goalX=clamped.x;ai.goalY=clamped.y;ai.goalMap=rMap;}
      } else {
        // 30% chance MIRA also hunts (she has enough cards)
        if(ai.huntCooldown<=0){ai.goalX=pl[0].x;ai.goalY=pl[0].y;ai.state='hunting';ai.moveInterval=6;}
      }
    }
  }
  if(ai.state==='fleeing'){
    ai.stateTimer--;if(ai.stateTimer<=0){ai.state='exploring';ai.moveInterval=ai.personality==='hunter'?8:12;pickRivalGoal(aiIdx);}
  }
  const atGoal=Math.abs(r.x-ai.goalX)<=1&&Math.abs(r.y-ai.goalY)<=1;
  if(atGoal){
    for(const ex of exits){
      if(ex.fromMap===rMap){
        for(const [etx,ety] of ex.tiles){
          if(r.x===etx&&r.y===ety){
            const oldMap=rMap;rivalMaps[aiIdx]=ex.targetMap;
            r.x=ex.targetX;r.y=ex.targetY;r.visualX=ex.targetX*TW;r.visualY=ex.targetY*TH;
            if(ex.targetMap===currentMap&&oldMap!==currentMap){
              rivalAlert=RIVAL_ALERT_DUR;rivalAlertName=r.n;rivalAlertRival=aiIdx;flash();beep(660,.04,.06); // v439
              lg.push('You sense movement... '+r.n+' entered the area!');
            }
            if(inDungeon&&ex.targetMap>0){
              const flNums=['','I','II','III','IV','V'];
              const dir=ex.targetMap>oldMap?'descended to':'retreated to';
              rivalNewsQueue.push({text:r.n+' '+dir+' FLOOR '+(flNums[ex.targetMap]||ex.targetMap),rivalIdx:aiIdx,rarity:0});
            }
            pickRivalGoal(aiIdx);return;
          }
        }
      }
    }
    ai.moveInterval=ai.personality==='hunter'?8:12;pickRivalGoal(aiIdx);
  }
  const moved=stepToward(rIdx,ai.goalX,ai.goalY);
  if(moved){
    footprints.push({map:rMap,x:r.x,y:r.y,age:0,ri:rIdx});
    {const _k=_fpKey(rIdx,rMap);_fpFreshAge[_k]=0;_fpCnt[_k]++;}
    const m=maps[rMap];const tile=m[r.y]?.[r.x];
    let encounterChance=0;
    if(tile===11)encounterChance=0.25;else if(tile===1)encounterChance=0.12;
    if(encounterChance>0&&Math.random()<encounterChance){
      const cardId=pickAreaCardForMap(rMap);
      if(addCardToPlayer(rIdx,cardId)&&rMap===currentMap)lg.push(r.n+' found a card nearby...');
    }
  }else{pickRivalGoal(aiIdx);}
}

// Update single rival AI each frame
function updateRivalAI(aiIdx){
  const ai=rivalAI[aiIdx];
  const rIdx=aiIdx+1;
  const r=pl[rIdx];
  const rMap=rivalMaps[aiIdx];

  // v155: In dungeon, rivals move per-turn (called by processDungeonTurn), not real-time
  if(inDungeon)return;

  // Freeze all rival movement while encounter cooldown is active (map transition grace period).
  // This prevents rivals from walking toward the player entry point during the 8s safe window.
  if(encounterCooldown>0)return;

  // x402-enhanced AI: periodically consult broker for smarter decisions
  x402MaybeEnhanceRival(aiIdx);

  // Decrement move timer
  ai.moveTimer--;
  if(ai.moveTimer>0)return;
  ai.moveTimer=ai.moveInterval+Math.floor(Math.random()*4); // 8-14 frames

  // Countdown per-rival hunt cooldown (prevents immediate hunting after grace period)
  if(ai.huntCooldown>0)ai.huntCooldown--;

  // If player is on same map and nearby, update last known
  if(rMap===currentMap){
    const dist=Math.abs(r.x-pl[0].x)+Math.abs(r.y-pl[0].y);
    // Hunter: track if within 6 tiles (reduced from 10 to avoid instant detection at spawn)
    if(ai.personality==='hunter'&&dist<=6){
      ai.lastKnownPlayerMap=currentMap;
      ai.lastKnownPlayerX=pl[0].x;
      ai.lastKnownPlayerY=pl[0].y;
    }
    // Collector: only track if within 5 tiles
    if(ai.personality==='collector'&&dist<=5){
      ai.lastKnownPlayerMap=currentMap;
      ai.lastKnownPlayerX=pl[0].x;
      ai.lastKnownPlayerY=pl[0].y;
    }

    // Hunter chases player if within 4 tiles AND hunt cooldown has expired
    // (reduced from 7 to 4 — player must actually be nearby before being hunted)
    if(ai.personality==='hunter'&&dist<=4&&ai.huntCooldown<=0){
      ai.goalX=pl[0].x;ai.goalY=pl[0].y;ai.goalMap=rMap;
      ai.state='hunting';
      ai.moveInterval=6; // faster when chasing
    }

    // Collector flees if player within 4 tiles (70% chance)
    if(ai.personality==='collector'&&dist<=4&&ai.state!=='fleeing'){
      if(Math.random()<0.7){
        ai.state='fleeing';
        ai.stateTimer=6; // flee for 6 steps
        // Move away from player
        const fdx=r.x-pl[0].x;const fdy=r.y-pl[0].y;
        const fx=r.x+(fdx>0?8:-8);const fy=r.y+(fdy>0?8:-8);
        const clamped=findWalkableTile(rMap,Math.max(2,Math.min(MW-3,fx)),Math.max(2,Math.min(MH-3,fy)),5);
        if(clamped){ai.goalX=clamped.x;ai.goalY=clamped.y;ai.goalMap=rMap;}
        ai.moveInterval=6; // flee fast
      }
    }
  }

  // Fleeing countdown
  if(ai.state==='fleeing'){
    ai.stateTimer--;
    if(ai.stateTimer<=0){
      ai.state='exploring';
      ai.moveInterval=ai.personality==='hunter'?8:12;
      pickRivalGoal(aiIdx);
    }
  }

  // Check if at goal
  const atGoal=Math.abs(r.x-ai.goalX)<=1&&Math.abs(r.y-ai.goalY)<=1;
  if(atGoal){
    // Check if standing on exit tile
    for(const ex of exits){
      if(ex.fromMap===rMap){
        for(const [etx,ety] of ex.tiles){
          if(r.x===etx&&r.y===ety){
            // Transition rival to new map
            const oldMap=rMap;
            rivalMaps[aiIdx]=ex.targetMap;
            r.x=ex.targetX;r.y=ex.targetY;
            r.visualX=ex.targetX*TW;r.visualY=ex.targetY*TH;
            // Alert if entered player's map
            if(ex.targetMap===currentMap&&oldMap!==currentMap){
              rivalAlert=RIVAL_ALERT_DUR;rivalAlertName=r.n;rivalAlertRival=aiIdx; // v439
              flash();beep(660,.04,.06);
              lg.push('You sense movement... '+r.n+' entered the area!');
            }
            // v73: News ticker for floor transitions
            if(inDungeon&&ex.targetMap>0){
              const flNums=['','I','II','III','IV','V'];
              const dir=ex.targetMap>oldMap?'descended to':'retreated to';
              rivalNewsQueue.push({text:r.n+' '+dir+' FLOOR '+(flNums[ex.targetMap]||ex.targetMap),rivalIdx:aiIdx,rarity:0});
            }
            pickRivalGoal(aiIdx);
            return;
          }
        }
      }
    }
    // Not on exit, pick new goal
    ai.moveInterval=ai.personality==='hunter'?8:12;
    pickRivalGoal(aiIdx);
  }

  // Take a step toward goal
  const moved=stepToward(rIdx,ai.goalX,ai.goalY);
  if(moved){
    // Add footprint
    footprints.push({map:rMap,x:r.x,y:r.y,age:0,ri:rIdx});
    {const _k=_fpKey(rIdx,rMap);_fpFreshAge[_k]=0;_fpCnt[_k]++;}

    // Card encounter from grass (same chances as player)
    const m=maps[rMap];
    const tile=m[r.y]?.[r.x];
    let encounterChance=0;
    if(tile===11)encounterChance=0.25;
    else if(tile===1)encounterChance=0.12;
    if(encounterChance>0&&Math.random()<encounterChance){
      const cardId=pickAreaCardForMap(rMap);
      if(addCardToPlayer(rIdx,cardId)){
        // Log if player is on same map
        if(rMap===currentMap){
          lg.push(r.n+' found a card nearby...');
        }
      }
    }
  }else{
    // Stuck: pick new goal
    pickRivalGoal(aiIdx);
  }
}

// Update proximity tension based on rival distances
// Rival background activity: rivals collect cards from dungeon floors when player is also in dungeon
// This creates a genuine race feeling — rivals aren't static outside of battle
function updateRivalActivity(){
  if(sc!=='map'||!inDungeon)return;
  for(let ri=0;ri<2;ri++){
    if(rivalBgTimer[ri]>0){rivalBgTimer[ri]--;continue;}
    // Timer expired: rival collects a card from their current floor
    const rMap=rivalMaps[ri];
    if(rMap<=0){rivalBgTimer[ri]=3600;continue;} // rival in town, long wait
    const pool=DUNGEON_FLOOR_CARDS[rMap];
    if(!pool||pool.length===0){rivalBgTimer[ri]=1800;continue;}
    const cardId=pool[Math.floor(Math.random()*pool.length)];
    const cr=CD[cardId-1];
    const rName=pl[ri+1].n;
    const rivalHandCount=cdCount(pl[ri+1].cd); // v296: cdCount replaces .filter().length
    // Only collect if they have room or swap
    if(rivalHandCount<5){
      addCardToPlayer(ri+1,cardId);
    }else{
      removeCardFromPlayer(ri+1,-1);
      addCardToPlayer(ri+1,cardId);
    }
    // Log this as a world event (with color hint in text)
    lg.push('['+rName+'] found '+cr.n+' on Floor '+rMap+'! ('+RARITY_LABEL[cr.r]+')');
    // v73: Push to rival intel ticker; v296: hoisted Roman numeral array reused
    rivalNewsQueue.push({
      text:rName+' seized '+cr.n+' on FLOOR '+(_RN_ROMAN[rMap]||rMap),
      rivalIdx:ri,rarity:cr.r
    });
    // Show HUD hint for rare+ rival finds (keep existing fallback)
    if(cr.r>=4&&(!tutorialMsg||tutorialMsgTimer<40)){
      const rarLabel=RARITY_LABEL[cr.r]||'';
      tutorialMsg=rName+' found '+cr.n+'! ('+rarLabel+')';tutorialMsgTimer=140;
    }
    // Contextual commentary based on rival personality and situation
    const newCount=cdCount(pl[ri+1].cd); // v296: cdCount replaces .filter().length
    if(newCount>=4){
      lg.push('[WARNING] '+rName+' is stacking cards. Intercept them!');
      if(!rivalWinWarningShown){sfxDangerAlert();}
      // v73: Danger alert in ticker
      rivalNewsQueue.push({text:'⚠ '+rName+' holds '+newCount+' cards — INTERCEPT!',rivalIdx:ri,rarity:5});
    }
    // Next background collection: 45-75 seconds (2700-4500 frames) — varies by personality
    const baseDelay=ri===0?2700:3600; // VEGA more aggressive/frequent
    rivalBgTimer[ri]=baseDelay+Math.floor(Math.random()*1800);
  }
}

function updateProximityTension(){
  let maxDanger=0;
  for(let i=0;i<2;i++){
    if(rivalMaps[i]!==currentMap)continue;
    const r=pl[i+1];
    const dist=Math.abs(r.x-pl[0].x)+Math.abs(r.y-pl[0].y);
    let danger=1; // same map
    if(dist<=8)danger=2;
    if(dist<=5)danger=3;
    if(dist<=2)danger=4;
    if(danger>maxDanger)maxDanger=danger;
  }
  proximityDangerLevel=maxDanger;

  // Danger drone audio
  if(proximityDangerLevel>=3){
    startDangerDrone();
    if(dangerDroneGain){
      const targetVol=proximityDangerLevel===4?0.06:0.03;
      try{dangerDroneGain.gain.linearRampToValueAtTime(targetVol,AC.currentTime+0.1);}catch(e){}
    }
  }else{
    stopDangerDrone();
  }

  // "!" alert when rival first gets within 2 tiles
  if(proximityDangerLevel>=4&&!rivalDangerAlertShown){
    rivalDangerAlertShown=true;
    sfxDangerAlert();screenShake(2,4);
    lg.push('! Something is very close!');
  }
  if(proximityDangerLevel<4)rivalDangerAlertShown=false;

  // Proximity taunt: when danger >= 3 (within 5 tiles), rivals occasionally speak
  if(proximityDangerLevel>=3&&proximityTauntTimer<=0&&proximityTauntText===''){
    // Find the closest rival on this map
    let closestDist=999,closestRivalIdx=-1;
    for(let i=0;i<2;i++){
      if(rivalMaps[i]!==currentMap)continue;
      const r=pl[i+1];
      const dist=Math.abs(r.x-pl[0].x)+Math.abs(r.y-pl[0].y);
      if(dist<closestDist){closestDist=dist;closestRivalIdx=i;}
    }
    if(closestRivalIdx>=0){
      // v292: floor-tiered proximity taunts
      const _ptfl=Math.max(1,Math.min(5,currentFloor));
      const _pttier=_ptfl<=2?0:_ptfl===3?1:2;
      const taunts=(closestRivalIdx===0?_PROX_VEGA:_PROX_MIRA)[_pttier];
      proximityTauntText=taunts[Math.floor(Math.random()*taunts.length)];
      proximityTauntRival=closestRivalIdx+1; // pl index 1 or 2
      proximityTauntFrame=fr;
      proximityTauntTimer=360; // 6s cooldown between taunts
    }
  }
  if(proximityTauntTimer>0)proximityTauntTimer--;
  if(proximityTauntText!==''&&fr-proximityTauntFrame>90)proximityTauntText=''; // 1.5s display
  if(proximityDangerLevel<3){proximityTauntText='';proximityTauntTimer=0;}
}

// Update footprints aging — v435: swap-and-pop expiry + per-rival/map freshest-age cache
function updateFootprints(){
  for(let i=footprints.length-1;i>=0;i--){
    const fp=footprints[i];
    fp.age++;
    if(fp.age>=FOOTPRINT_MAX_AGE){
      if(fp.ri>0){const _k=_fpKey(fp.ri,fp.map);_fpCnt[_k]--;if(_fpCnt[_k]<=0){_fpCnt[_k]=0;_fpFreshAge[_k]=Infinity;}}
      const _last=footprints.length-1;if(i<_last)footprints[i]=footprints[_last];footprints.length--;
    }
  }
  // Cap footprint count — shift() removes oldest (front = oldest push order maintained)
  while(footprints.length>200){
    const fp=footprints[0];
    if(fp.ri>0){const _k=_fpKey(fp.ri,fp.map);_fpCnt[_k]--;if(_fpCnt[_k]<=0){_fpCnt[_k]=0;_fpFreshAge[_k]=Infinity;}}
    footprints.shift();
  }
  // Tick freshest-age counters: all footprints aged by 1 this frame
  for(let _k=0;_k<12;_k++){if(_fpFreshAge[_k]<Infinity)_fpFreshAge[_k]++;}
}

// NPC wander system — town NPCs slowly pace within 2 tiles of home
// v282: hoisted NPC wander direction table
const _NPC_DIRS=[[0,-1],[0,1],[-1,0],[1,0],[0,0],[0,0]]; // bias toward staying
function updateNPCWander(){
  if(inDungeon||npcDialogActive||sc!=='map')return;
  const m=maps[0]; // town map only
  for(let _ni=0;_ni<npcs.length;_ni++){
    const npc=npcs[_ni];
    if(npc.map!==0)continue;
    // Smooth visual walk
    const dx=npc.x*TW-npc.visualX,dy=npc.y*TH-npc.visualY;
    const dist=Math.sqrt(dx*dx+dy*dy);
    if(dist>1){
      npc.visualX+=dx*0.15;npc.visualY+=dy*0.15;
      npc.walking=true;npc.walkFrame+=0.25;
    }else{
      npc.visualX=npc.x*TW;npc.visualY=npc.y*TH;npc.walking=false;
    }
    // Wander timer
    if(npc.moveTimer>0){npc.moveTimer--;continue;}
    // Choose new position within wander radius of home
    const d=_NPC_DIRS[Math.floor(Math.random()*_NPC_DIRS.length)]; // v282: hoisted
    const nx=npc.x+d[0],ny=npc.y+d[1];
    // Must stay within 2 tiles of home, on walkable tile, not on player or other NPC
    const withinHome=Math.abs(nx-npc.homeX)<=2&&Math.abs(ny-npc.homeY)<=2;
    const walkable=WALKABLE.has(m[ny]?.[nx]);
    const onPlayer=(nx===pl[0].x&&ny===pl[0].y);
    let onNpc=false;for(let _oi=0;_oi<npcs.length;_oi++){const o=npcs[_oi];if(o!==npc&&o.x===nx&&o.y===ny){onNpc=true;break;}}
    if(withinHome&&walkable&&!onPlayer&&!onNpc){
      // Face movement direction (dir: 0=down,1=left,2=up,3=right — matches player/rival convention)
      if(d[0]<0)npc.dir=1;
      else if(d[0]>0)npc.dir=3;
      else if(d[1]<0)npc.dir=2;
      else if(d[1]>0)npc.dir=0;
      npc.x=nx;npc.y=ny;
    }else if(d[0]===0&&d[1]===0){
      // Idle: occasionally turn to face a random direction
      if(Math.random()<0.4)npc.dir=Math.floor(Math.random()*4);
    }
    npc.moveTimer=180+Math.floor(Math.random()*300); // 3-8 seconds between moves
  }
  // v82: proximity ambient speech bubbles (2-3 tiles away, not adjacent — adjacent opens dialog/UI)
  if(!npcDialogActive&&currentMap===0&&!inDungeon){
    for(let _ni=0;_ni<npcs.length;_ni++){
      const npc=npcs[_ni];
      if(npc.map!==0)continue;
      if(npc.bubbleTimer>0){npc.bubbleTimer--;continue;}
      if(npc.bubbleCooldown>0){npc.bubbleCooldown--;continue;}
      const bdx=Math.abs(pl[0].x-npc.x),bdy=Math.abs(pl[0].y-npc.y);
      const dist=bdx+bdy;
      if(dist>=2&&dist<=3){
        const pool=getNPCAmbientLines(npc);
        if(pool.length>0){
          npc.bubbleText=pool[Math.floor(Math.random()*pool.length)];
          npc.bubbleTimer=170;
          npc.bubbleCooldown=500+Math.floor(Math.random()*300);
        }
      }
    }
  }
}

// v84: Town weather update — cycles clear/fog/rain slowly
function updateTownWeather(){
  if(inDungeon||currentMap!==0||sc!=='map')return;
  if(townWeatherAlpha<1)townWeatherAlpha=Math.min(1,townWeatherAlpha+1/150);
  townWeatherTimer++;
  if(townWeatherTimer>=WEATHER_CYCLE_FRAMES){
    townWeatherTimer=0;
    townWeatherAlpha=0;
    const next=['clear','fog','rain'].filter(w=>w!==townWeather);
    townWeather=next[Math.floor(Math.random()*next.length)];
  }
}

// v84: Town weather draw — layered atmospheric effects
// Weather canvas cache for fog (gradient-heavy) — update every 4 frames
const _weatherCanvas=document.createElement('canvas');
_weatherCanvas.width=W;_weatherCanvas.height=H;
const _weatherCtx=_weatherCanvas.getContext('2d');
let _weatherLastFr=-99,_weatherLastType='';
// v223: Lightning system
let _lightningFlash=0;// frames remaining for flash
let _lightningNextFr=600+Math.floor(Math.random()*900);// when next strike happens
function _sfxThunder(){if(!soundEnabled)return;try{const o=AC.createOscillator(),gn=AC.createGain(),o2=AC.createOscillator(),gn2=AC.createGain();o.type='sawtooth';o.frequency.setValueAtTime(80,AC.currentTime);o.frequency.exponentialRampToValueAtTime(20,AC.currentTime+0.8);gn.gain.setValueAtTime(.18,AC.currentTime);gn.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+0.9);o.connect(gn);gn.connect(AC.destination);o.start();o.stop(AC.currentTime+0.9);o2.type='triangle';o2.frequency.setValueAtTime(40,AC.currentTime+0.1);o2.frequency.exponentialRampToValueAtTime(15,AC.currentTime+0.6);gn2.gain.setValueAtTime(.1,AC.currentTime+0.1);gn2.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+0.7);o2.connect(gn2);gn2.connect(AC.destination);o2.start(AC.currentTime+0.1);o2.stop(AC.currentTime+0.7);}catch(e){}}

function drawTownWeather(){
  if(inDungeon||currentMap!==0)return;
  const wa=townWeatherAlpha;
  if(wa<=0.02)return;
  if(townWeather==='rain'){
    // v223: Lightning — strike at random intervals during rain
    if(fr>=_lightningNextFr){
      _lightningFlash=6;
      _lightningNextFr=fr+360+Math.floor(Math.random()*720);
      screenShake(2,5);
      _sfxThunder();
    }
    if(_lightningFlash>0){
      const flashA=(_lightningFlash/6)*0.55*wa;
      g.globalAlpha=flashA;g.fillStyle='#e0eaff';g.fillRect(0,0,W,H);g.globalAlpha=1;
      _lightningFlash--;
    }
    // Only redraw rain every 2nd frame
    if(fr%2!==0)return;
    // v223: fillRect rain — faster than stroke paths
    g.save();
    g.fillStyle='rgba(160,190,240,0.8)';
    for(let i=0;i<55;i++){
      const seed=i*137;
      const rx=((fr*0.7+seed*19+camX*0.2)%(W+120))-60;
      const ry=(fr*4+seed*11)%(H+80)-40;
      g.globalAlpha=wa*(0.3+seed%3*0.1);
      g.fillRect(rx-1,ry,1,9);g.fillRect(rx-2,ry+9,1,3); // streak + tip
    }
    g.globalAlpha=1;
    // Ground ripples — fillRect rings (cheaper than ellipse+stroke)
    for(let i=0;i<10;i++){
      const seed=i*193;
      const ripX=((fr*0.6+seed*27)%(W+80))-40;
      const ripPhase=(fr*0.5+seed*7)%80/80;
      const ripR=Math.floor(ripPhase*12);
      const ripA=wa*(1-ripPhase)*0.28;
      if(ripA>0.02&&ripR>1){
        g.globalAlpha=ripA;
        g.fillStyle='rgba(160,200,240,0.6)';
        // Two-pixel horizontal oval ring using 4 thin rects
        const ry_=H-18-seed%36;
        g.fillRect(ripX-ripR,ry_-1,ripR*2,1);g.fillRect(ripX-ripR,ry_+2,ripR*2,1);
        g.fillRect(ripX-ripR-1,ry_,1,3);g.fillRect(ripX+ripR,ry_,1,3);
      }
    }
    // Subtle blue tint overlay
    g.globalAlpha=wa*0.07;
    g.fillStyle='rgba(100,140,200,1)';g.fillRect(0,0,W,H);
    g.globalAlpha=1;
    g.restore();
  } else if(townWeather==='fog'){
    // Fog: expensive gradients — cache to offscreen canvas, update every 4 frames
    if(fr-_weatherLastFr>=4||_weatherLastType!=='fog'){
      _weatherCtx.clearRect(0,0,W,H);
      for(let i=0;i<12;i++){
        const seed=i*97;
        const fogX=((fr*0.25+seed*53)%(W+320))-160;
        const fogY=60+seed%4*70+(_sFr015*_FOG_CI13[i]+_cFr015*_FOG_SI13[i])*12;
        const fogW=160+seed%5*50;
        const fogAlpha=wa*(0.12+seed%3*0.04);
        _weatherCtx.globalAlpha=fogAlpha;
        const grd=_weatherCtx.createLinearGradient(fogX,fogY,fogX+fogW,fogY);
        grd.addColorStop(0,'rgba(210,220,230,0)');
        grd.addColorStop(0.25,'rgba(210,220,230,1)');
        grd.addColorStop(0.75,'rgba(210,220,230,1)');
        grd.addColorStop(1,'rgba(210,220,230,0)');
        _weatherCtx.fillStyle=grd;_weatherCtx.fillRect(fogX,fogY-20,fogW,40);
      }
      _weatherCtx.globalAlpha=wa*0.2;
      const vgr=_weatherCtx.createRadialGradient(W/2,H/2,W*0.3,W/2,H/2,W*0.7);
      vgr.addColorStop(0,'rgba(190,200,210,0)');
      vgr.addColorStop(1,'rgba(190,200,210,0.85)');
      _weatherCtx.fillStyle=vgr;_weatherCtx.fillRect(0,0,W,H);
      _weatherCtx.globalAlpha=1;
      _weatherLastFr=fr;_weatherLastType='fog';
    }
    g.drawImage(_weatherCanvas,0,0,W,H);
  } else {
    // v227: drifting sunlight dust motes — bx() replaces arc() (no path overhead)
    for(let i=0;i<22;i++){
      const seed=i*151;
      const mx=((seed*37+fr*0.08)%W)|0;
      const my=(H-((fr*0.4+seed*23)%(H+60))-10)|0;
      if(my<-2||my>H+2)continue;
      const sz=(seed%4)<2?1:2; // 1px or 2px square matches original 0.5-1.3px radius
      g.globalAlpha=wa*0.28*(0.5+(_sFr04*_IDX_CI[i]+_cFr04*_IDX_SI[i])*0.5);
      bx(mx,my,sz,sz,'rgba(255,240,190,1)');
    }
    g.globalAlpha=1;
  }
}

// v282: hoisted footprint colors
const _FP_RIVAL_COLS=['#d860a0','#d8b028'];
function drawFootprints(){
  if(!inDungeon)return;
  for(let _fpi=0;_fpi<footprints.length;_fpi++){
    const fp=footprints[_fpi];
    if(fp.map!==currentMap)continue;
    if(!fogRevealed[currentMap][fp.y]?.[fp.x])continue;
    const ageFrac=fp.age/FOOTPRINT_MAX_AGE; // 0=fresh, 1=old
    const alpha=(1-ageFrac)*0.55; // fade as they age
    if(alpha<0.04)continue;
    const sx=fp.x*TW-camX+TW/2-2;
    const sy=fp.y*TH-camY+TH/2-1;
    if(sx<-4||sx>W+4||sy<-4||sy>H+4)continue;
    const col=_FP_RIVAL_COLS[fp.ri-1]||'#888888'; // v286: ri is 1-based (pl index), array is 0-based
    // Two small boot-print dots side by side
    const offset=(fp.age%4<2)?-1:1; // alternate left/right footstep
    g.globalAlpha=alpha;
    g.fillStyle=col;
    g.fillRect(sx+offset,sy,2,3);
    g.fillRect(sx+offset+3,sy+1,2,2);
    g.globalAlpha=1;
  }
}

// Pre-generate random values for tile detail (per map, reuse with offset)
const tileRand=[];
for(let i=0;i<MW*MH;i++){
  tileRand.push({
    a:Math.random(),b:Math.random(),c:Math.random(),
    d:Math.random(),e:Math.random(),f:Math.random(),
    g:Math.random(),h:Math.random()
  });
}
function tr(tx_,ty){return tileRand[(ty*MW+tx_)%(MW*MH)];}

