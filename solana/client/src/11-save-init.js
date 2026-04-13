// ═══════════════════════════════════════
// SAVE / LOAD SYSTEM
// ═══════════════════════════════════════
const SAVE_KEY='oxark_save';
const SAVE_VERSION=37; // bump when save format changes — old saves auto-wiped
// Auto-wipe incompatible old saves on load (also wipe legacy saves with no version key)
try{const sv=localStorage.getItem('oxark_save_ver');if(!sv||parseInt(sv)<SAVE_VERSION){localStorage.removeItem(SAVE_KEY);localStorage.removeItem('oxark_fog');lg.push('[SAVE] Old save wiped (v'+(sv||'legacy')+'→v'+SAVE_VERSION+')');}localStorage.setItem('oxark_save_ver',String(SAVE_VERSION));}catch(e){}

function saveGame(){
  try{
    const data={
      v:SAVE_VERSION,
      px:pl[0].x, py:pl[0].y, pdir:pl[0].dir, pstep:pl[0].step,
      pcd:[...pl[0].cd], pcc:pl[0].cc,
      pvault:[...(pl[0].vault||[])],
      r1x:pl[1].x, r1y:pl[1].y, r1dir:pl[1].dir, r1cd:[...pl[1].cd], r1cc:pl[1].cc,
      r2x:pl[2].x, r2y:pl[2].y, r2dir:pl[2].dir, r2cd:[...pl[2].cd], r2cc:pl[2].cc,
      sps:sp.s, spb:sp.b, spc:sp.c,
      rd:rd, stepCounter:stepCounter,
      currentMap:currentMap, inDungeon:inDungeon, currentFloor:currentFloor,
      rivalMaps:[...rivalMaps],
      rivalAI:rivalAI.map(a=>({goalX:a.goalX,goalY:a.goalY,goalMap:a.goalMap,
        personality:a.personality,moveInterval:a.moveInterval,
        lastKnownPlayerMap:a.lastKnownPlayerMap,lastKnownPlayerX:a.lastKnownPlayerX,
        lastKnownPlayerY:a.lastKnownPlayerY,state:a.state})),
      log:lg.slice(-20),
      treasures:treasures.map(t=>t.collected),
      sc:sc,
      tutorialFlags:{...tutorialFlags},
      randomEventTimer:randomEventTimer,
      triggeredTraps:[...triggeredTraps],
      puzzleStoneOrder:[...puzzleStoneOrder],
      puzzleSolved:puzzleSolved,
      shakenTrees:[...shakenTrees],
      pushedRocks:[...pushedRocks],
      usedCrystals:[...usedCrystals],
      campfireUsed:campfireUsed,
      burnedTiles:[...burnedTiles],
      shadowStepsLeft:shadowStepsLeft,
      fishingCooldownTimer:fishingCooldownTimer,
      walletAddress:walletPublicKey||null,
      cardTimers:[...cardTimers],
      streakCount:streakCount,
      areaDanger:[...areaDanger],
      areaDangerStayTimer:[...areaDangerStayTimer],
      seasonStartTime:seasonStartTime,
      seasonEndTime:seasonEndTime
    };
    localStorage.setItem(SAVE_KEY,JSON.stringify(data));
    saveIndicatorTimer=60;
  }catch(e){}
}

function loadGame(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw)return false;
    const d=JSON.parse(raw);
    pl[0].x=d.px;pl[0].y=d.py;pl[0].dir=d.pdir;pl[0].step=d.pstep;
    pl[0].cd=[...d.pcd];pl[0].cc=d.pcc;
    pl[0].vault=d.pvault?new Set(d.pvault):new Set(d.pcd.filter(c=>c>0)); // restore vault
    pl[0].visualX=d.px*TW;pl[0].visualY=d.py*TH;pl[0].walkFrame=0;
    pl[1].x=d.r1x;pl[1].y=d.r1y;pl[1].dir=d.r1dir;pl[1].cd=[...d.r1cd];pl[1].cc=d.r1cc;
    pl[1].visualX=d.r1x*TW;pl[1].visualY=d.r1y*TH;pl[1].walkFrame=0;
    pl[2].x=d.r2x;pl[2].y=d.r2y;pl[2].dir=d.r2dir;pl[2].cd=[...d.r2cd];pl[2].cc=d.r2cc;
    pl[2].visualX=d.r2x*TW;pl[2].visualY=d.r2y*TH;pl[2].walkFrame=0;
    sp.s=d.sps;sp.b=d.spb;sp.c=d.spc;
    rd=d.rd;stepCounter=d.stepCounter;
    currentMap=d.currentMap;
    if(d.inDungeon!==undefined)inDungeon=d.inDungeon;
    if(d.currentFloor!==undefined)currentFloor=d.currentFloor;
    rivalMaps=[...d.rivalMaps];
    if(d.rivalAI){
      d.rivalAI.forEach((a,i)=>{
        if(rivalAI[i]){
          rivalAI[i].goalX=a.goalX;rivalAI[i].goalY=a.goalY;rivalAI[i].goalMap=a.goalMap;
          rivalAI[i].moveInterval=a.moveInterval;
          rivalAI[i].lastKnownPlayerMap=a.lastKnownPlayerMap;
          rivalAI[i].lastKnownPlayerX=a.lastKnownPlayerX;
          rivalAI[i].lastKnownPlayerY=a.lastKnownPlayerY;
          rivalAI[i].state=a.state;
        }
      });
    }
    lg.length=0;d.log.forEach(l=>lg.push(l));
    d.treasures.forEach((c,i)=>{if(treasures[i])treasures[i].collected=c;});
    if(d.tutorialFlags)tutorialFlags={...tutorialFlags,...d.tutorialFlags};
    if(d.randomEventTimer!==undefined)randomEventTimer=d.randomEventTimer;
    if(d.triggeredTraps)d.triggeredTraps.forEach(t=>triggeredTraps.add(t));
    if(d.puzzleStoneOrder)puzzleStoneOrder=[...d.puzzleStoneOrder];
    if(d.puzzleSolved!==undefined)puzzleSolved=d.puzzleSolved;
    if(d.shakenTrees)d.shakenTrees.forEach(t=>shakenTrees.add(t));
    if(d.pushedRocks)d.pushedRocks.forEach(t=>pushedRocks.add(t));
    if(d.usedCrystals)d.usedCrystals.forEach(t=>usedCrystals.add(t));
    if(d.campfireUsed!==undefined)campfireUsed=d.campfireUsed;
    if(d.burnedTiles){burnedTiles.length=0;d.burnedTiles.forEach(t=>{burnedTiles.push(t);if(maps[t.mapIdx]&&maps[t.mapIdx][t.y])maps[t.mapIdx][t.y][t.x]=1;});}
    if(d.shadowStepsLeft!==undefined)shadowStepsLeft=d.shadowStepsLeft;
    if(d.fishingCooldownTimer!==undefined)fishingCooldownTimer=d.fishingCooldownTimer;
    // Wallet: store address for display but don't set connected (requires re-connect)
    if(d.walletAddress){walletPublicKey=d.walletAddress;}
    // Tension mechanics
    if(d.cardTimers){for(let i=0;i<HAND_SIZE;i++)cardTimers[i]=d.cardTimers[i]||0;}
    if(d.streakCount!==undefined)streakCount=d.streakCount;
    if(d.areaDanger){for(let i=0;i<FOG_MAP_COUNT;i++)areaDanger[i]=d.areaDanger[i]||0;}
    if(d.areaDangerStayTimer){for(let i=0;i<FOG_MAP_COUNT;i++)areaDangerStayTimer[i]=d.areaDangerStayTimer[i]||0;}
    // GDD v1.0: ALWAYS return player to town on load (safe zone)
    // Prevents immediate encounters if player was in dungeon when they saved
    currentMap=0;inDungeon=false;currentFloor=0;
    pl[0].x=15;pl[0].y=13;pl[0].dir=0;
    pl[0].visualX=15*TW;pl[0].visualY=13*TH;
    // Always put rivals in dungeon (not town)
    rivalMaps=[1,1];
    pl[1].x=8;pl[1].y=10;pl[1].visualX=8*TW;pl[1].visualY=10*TH;
    pl[2].x=28;pl[2].y=18;pl[2].visualX=28*TW;pl[2].visualY=18*TH;
    // Pause card timers (in town, no decay)
    for(let i=0;i<HAND_SIZE;i++){cardTimers[i]=0;decayWarn[i]=0;}
    escapeUrgencyActive=false;escapeUrgencyPulse=0;
    // Clear all battle/encounter state
    wildEncounterActive=false;encounterCooldown=180;battlePhase='select';
    encounterExclActive=false;mapTransitioning=false;npcDialogActive=false;
    gachaActive=false;marketActive=false;dungeonConfirmActive=false;shopActive=false;synthActive=false;
    // Season data
    if(d.seasonStartTime){seasonStartTime=d.seasonStartTime;seasonEndTime=d.seasonEndTime||d.seasonStartTime+SEASON_DURATION_MS;}
    else{initSeason();} // legacy saves: start fresh season
    // Sync card counts from actual data to prevent drift
    syncCardCount(0);syncCardCount(1);syncCardCount(2);
    fogLoad();
    // Town is always fully visible (safe zone — no fog needed)
    fogRevealAll(0);
    camX=pl[0].visualX-W/2;camY=pl[0].visualY-H/2;
    camTargetX=camX;camTargetY=camY;
    edgeCacheDirty=true;fogCacheDirty=true;
    return true;
  }catch(e){return false;}
}

function hasSave(){
  try{return !!localStorage.getItem(SAVE_KEY);}catch(e){return false;}
}

function clearSave(){
  try{localStorage.removeItem(SAVE_KEY);}catch(e){}
}

// ═══════════════════════════════════════
// TOUCH CONTROLS
// ═══════════════════════════════════════
const isTouchDevice=('ontouchstart' in window)||(navigator.maxTouchPoints>0);

function simulateKey(code){
  document.dispatchEvent(new KeyboardEvent('keydown',{code:code,bubbles:true}));
}

function haptic(){try{if(navigator.vibrate)navigator.vibrate(10);}catch(e){}}

if(isTouchDevice){
  document.getElementById('touch-overlay').classList.add('active');
  // Also resume audio on touch
  document.addEventListener('touchstart',resumeAudio,{once:true});

  const btnMap={
    'dpad-up':'ArrowUp','dpad-down':'ArrowDown','dpad-left':'ArrowLeft','dpad-right':'ArrowRight',
    'btn-a':'KeyZ','btn-b':'KeyX','btn-start':'Space'
  };
  const dpadIds=new Set(['dpad-up','dpad-down','dpad-left','dpad-right']);
  const holdIntervals={};
  Object.keys(btnMap).forEach(id=>{
    const el=document.getElementById(id);
    el.addEventListener('touchstart',e=>{
      e.preventDefault();
      el.classList.add('pressed');
      haptic();
      simulateKey(btnMap[id]);
      // D-pad: repeat while held (200ms delay, then 120ms interval)
      if(dpadIds.has(id)){
        clearInterval(holdIntervals[id]);
        holdIntervals[id]=setTimeout(()=>{
          holdIntervals[id]=setInterval(()=>{simulateKey(btnMap[id]);},120);
        },200);
      }
    },{passive:false});
    el.addEventListener('touchend',e=>{
      e.preventDefault();
      el.classList.remove('pressed');
      if(dpadIds.has(id)){clearInterval(holdIntervals[id]);clearTimeout(holdIntervals[id]);holdIntervals[id]=null;}
    },{passive:false});
    el.addEventListener('touchcancel',e=>{
      el.classList.remove('pressed');
    });
  });

  // Swipe detection on canvas (use visible canvas)
  let touchStartX=0,touchStartY=0,touchStartTime=0;
  const touchCanvas=_isMobile?c:pixiApp.view;
  touchCanvas.addEventListener('touchstart',e=>{
    if(e.touches.length===1){
      const t=e.touches[0];
      touchStartX=t.clientX;touchStartY=t.clientY;
      touchStartTime=Date.now();
    }
  },{passive:true});
  touchCanvas.addEventListener('touchend',e=>{
    // v72: Tap to dismiss run summary
    if(runSummaryActive){runSummaryActive=false;runSummaryData=null;return;}
    const elapsed=Date.now()-touchStartTime;
    if(elapsed>300)return; // too slow for swipe
    const ct=e.changedTouches[0];
    const dx=ct.clientX-touchStartX,dy=ct.clientY-touchStartY;
    const dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<20){
      // Tap: move toward tapped position
      const rect=touchCanvas.getBoundingClientRect();
      const scaleX=W/rect.width,scaleY=H/rect.height;
      const cx_=(ct.clientX-rect.left)*scaleX;
      const cy_=(ct.clientY-rect.top)*scaleY;
      if(sc==='map'&&!mo){
        const worldX=cx_+camX,worldY=cy_+camY;
        const tileX=Math.floor(worldX/TW),tileY=Math.floor(worldY/TH);
        const pdx=tileX-pl[0].x,pdy=tileY-pl[0].y;
        if(Math.abs(pdx)>=Math.abs(pdy)){
          simulateKey(pdx>0?'ArrowRight':'ArrowLeft');
        }else{
          simulateKey(pdy>0?'ArrowDown':'ArrowUp');
        }
      }
    }else{
      // Swipe
      if(Math.abs(dx)>Math.abs(dy)){
        simulateKey(dx>0?'ArrowRight':'ArrowLeft');
      }else{
        simulateKey(dy>0?'ArrowDown':'ArrowUp');
      }
    }
    haptic();
  },{passive:true});
}

// Initial x402 server check
x402CheckServer();

requestAnimationFrame(loop);

