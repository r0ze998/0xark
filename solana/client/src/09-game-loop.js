// GAME LOOP
// ═══════════════════════════════════════

// v306: Pre-baked screen shake noise table — eliminates 2 Math.random() calls per frame during shake
const _SHAKE_N=(()=>{const t=new Float32Array(32);for(let i=0;i<32;i++)t[i]=(Math.random()-0.5)*2;return t;})();
// v355: per-frame sin/cos cache — computed once at draw() start, reused across all draw functions
let _sBpST12=0,_cBpST12=0,_cBpST16=0; // bpShakeTimer-based shake — computed once per frame in draw()
let _sFr004=0,_cFr004=0,_sFr006=0,_cFr006=0,_sFr007=0,_cFr007=0,_sFr008=0,_sFr012=0,_sFr015=0,_cFr015=0,_sFr018=0,_cFr018=0,_sFr02=0,_cFr02=0,_sFr022=0,_cFr022=0,_sFr025=0,_cFr025=0,_sFr028=0,_cFr028=0,_sFr03=0,_cFr03=0,_sFr035=0,_cFr035=0,_sFr042=0,_cFr042=0,_sFr04=0,_cFr04=0,_sFr045=0,_cFr045=0,_sFr05=0,_cFr05=0,_sFr052=0,_cFr052=0,_sFr055=0,_cFr055=0,_sFr06=0,_cFr06=0,_sFr07=0,_cFr07=0,_sFr08=0,_cFr08=0,_sFr09=0,_cFr09=0,_sFr10=0,_cFr10=0,_sFr12=0,_cFr12=0,_sFr15=0,_cFr15=0,_sFr18=0,_cFr18=0,_sFr20=0,_cFr20=0,_sFr25=0,_cFr25=0,_sFr28=0,_sFr30=0,_cFr30=0;
// v364: water wave lookup tables (11 px columns each, depend on wt not fr — update when wt changes)
// wx step=3 starting at 0: wx=0,3,6,9,12,15,18,21,24,27,30 (11 entries)
// wx step=3 starting at 1: wx=1,4,7,10,13,16,19,22,25,28,31 (11 entries)
const _WATER_WAVE1=new Float32Array(11); // sin(wt*0.25+wx*0.2)*1.5 for wx=0,3,...,30
const _WATER_WAVE2=new Float32Array(11); // sin(wt*0.3+wx*0.3+1)*1 for wx=1,4,...,31
// v398: pre-baked spatial phases for water wave sin-addition
// WAVE1: wx0=i*3; angle=wx0*0.2=i*0.6 → sin/cos(i*0.6) for i=0..10
// WAVE2: wx1=i*3+1; angle=wx1*0.3+1=(i*0.9+1.3) → sin/cos(i*0.9+1.3) for i=0..10
const _WW1_SI=new Float32Array(11),_WW1_CI=new Float32Array(11);
const _WW2_SI=new Float32Array(11),_WW2_CI=new Float32Array(11);
for(let i=0;i<11;i++){_WW1_SI[i]=Math.sin(i*0.6);_WW1_CI[i]=Math.cos(i*0.6);}
for(let i=0;i<11;i++){_WW2_SI[i]=Math.sin(i*0.9+1.3);_WW2_CI[i]=Math.cos(i*0.9+1.3);}
let _waterWt=-1; // last wt value used to fill tables
function _updateWaterWaves(){
  if(_waterWt===wt)return;
  _waterWt=wt;
  const _sw025=Math.sin(wt*0.25),_cw025=Math.cos(wt*0.25); // 2 calls (temporal)
  const _sw03=Math.sin(wt*0.3),_cw03=Math.cos(wt*0.3);     // 2 calls (temporal)
  // v398: sin-addition with pre-baked spatial phases — was 22 Math.sin calls per wt-update, now 0 in loop
  for(let i=0;i<11;i++){
    _WATER_WAVE1[i]=(_sw025*_WW1_CI[i]+_cw025*_WW1_SI[i])*1.5; // sin(wt*0.25+i*0.6)
    _WATER_WAVE2[i]=(_sw03*_WW2_CI[i]+_cw03*_WW2_SI[i])*1.0;   // sin(wt*0.3+i*0.9+1.3)
  }
}
// v355: pre-baked sin/cos for integer indices 0-15 (used in phase-offset particle loops)
const _SIN_INT=(()=>{const a=new Float32Array(16);for(let i=0;i<16;i++)a[i]=Math.sin(i);return a;})();
const _COS_INT=(()=>{const a=new Float32Array(16);for(let i=0;i<16;i++)a[i]=Math.cos(i);return a;})();
// v331: Pre-baked stealth step labels — eliminates 'STEALTH:'+n concat per frame during stealth
const _STEALTH_LBL=(()=>{const a=[];for(let i=0;i<=60;i++)a.push('STEALTH:'+i);return a;})();
// v224: Pre-baked escape urgency vignette — red edge decay warning (shape static, alpha varies)
const _escVigCanvas=(()=>{const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');const grd=ctx.createRadialGradient(W/2,H/2,H*0.25,W/2,H/2,H*0.8);grd.addColorStop(0,'rgba(0,0,0,0)');grd.addColorStop(1,'rgba(200,20,20,1)');ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);return c;})();

// Held-key continuous movement (overworld + dungeon — both support hold-to-walk)
// Time-based so movement rate is consistent regardless of fps
const _MOVE_REPEAT_MS     = 115; // ms between steps while holding (~8.7Hz)
let _moveRepeatAccumMs    = _MOVE_REPEAT_MS; // start ready so first step fires immediately

function processHeldMovement(){
  // Block during overlays, encounters, and screen transitions; dungeon allowed (turn fires inside tryMovePlayer)
  if(sc!=='map'||mo||npcDialogActive||shopActive||gachaActive||marketActive||townShopActive||
     battlePhase||introActive||handInspectActive||fishingActive||
     mapCardUseActive||fountainActive||dungeonConfirmActive||cardAcqActive||mapTransitioning||
     wildEncounterActive||encounterExclActive)return;
  _moveRepeatAccumMs+=dt*16.67;
  if(_moveRepeatAccumMs < _MOVE_REPEAT_MS) return;
  _moveRepeatAccumMs=0;
  // Fix C: last-direction priority prevents diagonal skips on tile maps
  let mdx=0,mdy=0;
  if(_lastDirCode==='ArrowUp'&&keysHeld.has('ArrowUp'))         mdy=-1;
  else if(_lastDirCode==='ArrowDown'&&keysHeld.has('ArrowDown')) mdy=1;
  else if(_lastDirCode==='ArrowLeft'&&keysHeld.has('ArrowLeft')) mdx=-1;
  else if(_lastDirCode==='ArrowRight'&&keysHeld.has('ArrowRight'))mdx=1;
  // Fallback when last-held key released but another is still down
  if(mdx===0&&mdy===0){
    if(keysHeld.has('ArrowUp'))          mdy=-1;
    else if(keysHeld.has('ArrowDown'))   mdy=1;
    else if(keysHeld.has('ArrowLeft'))   mdx=-1;
    else if(keysHeld.has('ArrowRight'))  mdx=1;
  }
  if(mdx===0&&mdy===0)return;
  if(tryMovePlayer(mdx,mdy)){
    checkTreasure();
    if(!cardAcqActive&&!randomEventActive&&shadowStepsLeft<=0)tryWildEncounter();
  }
}

function updateVisualPositions(){
  const lerpT=1-Math.pow(1-0.45,dt); // Fast lerp for snappy tile-step feel
  for(let _pi=0,_pl=pl.length;_pi<_pl;_pi++){
    const p=pl[_pi];
    const targetX=p.x*TW, targetY=p.y*TH;
    p.visualX=lerp(p.visualX,targetX,lerpT);
    p.visualY=lerp(p.visualY,targetY,lerpT);
    const dx=Math.abs(p.visualX-targetX),dy=Math.abs(p.visualY-targetY);
    if(dx<0.3&&dy<0.3){p.visualX=targetX;p.visualY=targetY;}
    p.visualX=Math.round(p.visualX);
    p.visualY=Math.round(p.visualY);
    if(dx>0.5||dy>0.5){
      p._walkAccum=(p._walkAccum||0)+dt;
      if(p._walkAccum>=4){p._walkAccum=0;p.walkFrame=(p.walkFrame+1)%4;}
    }else{
      p.walkFrame=0;p._walkAccum=0;
    }
  }
}

function update(){
  // Hitpause: freeze game simulation for N frames (visual impact on steal/card-get)
  if(hitPauseFrames>0){hitPauseFrames--;return;}
  fr++;
  if(fr%20===0)wt++;
  twTick();
  fadeUpdate();updateWipe();updateParticles();updateBanner();
  // Track area time for stats (every 60 frames = 1 second)
  if(sc==='map'&&fr%60===0&&currentMap>=0&&currentMap<FOG_MAP_COUNT){stats.areaTime[currentMap]++;}
  // Story sequence update
  // Story update removed (replaced by intro tutorial)
  // Credits scroll update
  if(creditsActive){creditsFrame++;}
  // Save stats periodically
  if(fr%600===0)saveStats();
  // Tension drum for nearby rivals
  if(sc==='map'&&proximityDangerLevel>=3&&!tensionDrumNode){startTensionDrum();if(tensionDrumGain)try{tensionDrumGain.gain.linearRampToValueAtTime(proximityDangerLevel===4?0.05:0.025,AC.currentTime+0.2);}catch(e){}}
  else if((sc!=='map'||proximityDangerLevel<3)&&tensionDrumNode){stopTensionDrum();}
  // Safety caps: prevent unbounded array growth (check every 60 frames; splice is O(n))
  if(fr%60===0){
    if(particles.length>500)particles.splice(0,particles.length-500);
    if(lg.length>200)lg.splice(0,lg.length-200);
    if(burnedTiles.length>500)burnedTiles.splice(0,burnedTiles.length-500);
  }
  processHeldMovement();
  // Invalidate tile cache when wt changes (every 20 frames) — lava/campfire use wt for animation
  if(wt!==_tileCacheLastWt){tileCacheDirty=true;_tileCacheLastWt=wt;}
  // Refresh atmosphere cache on lantern flicker cadence
  if(!inDungeon&&fr%90===0)_atmosDirty=true;
  updateVisualPositions();updateAmbient();
  updateMapLoadScreen();updateRunSummary();updateRivalNews();updateHandInspect();updateFPS();
  // Save indicator countdown
  if(saveIndicatorTimer>0)saveIndicatorTimer--;
  // Auto-save every 30 seconds when on map
  if(sc==='map'&&!mo){
    autoSaveTimer++;
    if(autoSaveTimer>=AUTO_SAVE_INTERVAL){autoSaveTimer=0;saveGame();}
  }
  if(flashT>0)flashT-=dt;
  if(bpShakeTimer>0)bpShakeTimer-=dt;
  for(let hi=0;hi<3;hi++){if(bpHPDmgAnim[hi]>0)bpHPDmgAnim[hi]-=dt;}
  if(rivalAlert>0)rivalAlert-=dt;
  if(fishingCooldownTimer>0)fishingCooldownTimer--;
  if(crystalRevealTimer>0)crystalRevealTimer--;
  updateFishing();

  // Bird movement
  if(fr%10===0){
    for(let _bi=0,_bl=birds.length;_bi<_bl;_bi++){
      const b=birds[_bi];
      b.timer--;
      if(b.timer<=0){
        b.vx=(Math.random()-.5)*2;b.vy=(Math.random()-.5)*2;
        b.timer=20+Math.floor(Math.random()*40);
      }
      const nx=b.x+Math.round(b.vx),ny=b.y+Math.round(b.vy);
      const m=maps[1];
      if(nx>=1&&nx<MW-1&&ny>=1&&ny<MH-1){
        const t=m[ny]?.[nx];
        if(t===1||t===2||t===7||t===11)b.x=nx;
      }
      if(ny>=1&&ny<MH-1){
        const t=m[ny]?.[b.x];
        if(t===1||t===2||t===7||t===11)b.y=ny;
      }
    }
  }

  // x402 server check every 30s; state push every 2min to keep broker in sync
  x402CheckTimer++;
  if(x402CheckTimer>=1800){x402CheckTimer=0;x402CheckServer();}
  if(x402Available&&fr%7200===0){x402PushState();} // push every ~2 min at 60fps

  // Multiplayer ping every 5 seconds
  if(mp.connected&&fr%300===0)mpPing();
  // Multiplayer disconnect timer
  if(mp.disconnectTimer>0)mp.disconnectTimer--;

  // Autonomous rival AI movement (only on map/act screens, skip during intro/title/splash/multiplayer)
  if(sc!=='title'&&sc!=='splash'&&!introActive&&(!mp.connected||mp.phase!=='playing')){
    updateRivalAI(0);
    updateRivalAI(1);
  }
  updateFootprints();
  updateRivalActivity();
  updateProximityTension();
  updateNPCWander();
  updateTownWeather(); // v84
  if(sc==='map'&&!inDungeon)checkTownInteractable(); // T70
  // T74: First-time town guide toast — shown once when player is on town map
  if(sc==='map'&&currentMap===0&&fr===60&&!_townGuideDone){
    _townGuideDone=true;
    showToast('Walk near a building and press [Z] to enter');
  }
  // ── RIVAL WIN WARNING (GDD v1.0: rivals use 5-card system internally) ──
  const r1u=rivalUniqSize(1),r2u=rivalUniqSize(2); // v261: no Set alloc
  const maxRU=Math.max(r1u,r2u);
  rivalWinWarning=maxRU>=4?1:0;
  if(maxRU>=4&&!rivalWinWarningShown){
    rivalWinWarningShown=true;
    const whoClose=r1u>=4?pl[1].n:pl[2].n;
    lg.push('WARNING: '+whoClose+' has '+maxRU+'/5 cards — DANGER! They\'re gaining power!');
    sfxDangerAlert();
  }
  if(maxRU<4)rivalWinWarningShown=false;

  // ── v105: COLLECTION MILESTONE CHECK ──
  if(pl[0].vault&&pl[0].vault.size>0){
    const vs=pl[0].vault.size;
    for(const m of CARD_MILESTONES){
      if(vs>=m&&!milestonesReached.has(m)){
        milestonesReached.add(m);
        milestoneToastText=CARD_MILESTONE_MSG[m]||'';
        milestoneToastFrame=fr;
        if(vs<60){sfxStreakUp();}
      }
    }
  }

  // ── SEASON EXPIRY CHECK ──
  if(sc==='map'&&seasonEndTime>0&&Date.now()>=seasonEndTime&&!gameOverTimesUp){
    gameOverTimesUp=true;stats.gamesPlayed++;saveStats();
    fadeOut(()=>{sc='victory';victoryFrame=fr;fadeIn();ub();});
  }

  // Card decay removed (Phase C dungeon mechanic — not in GDD v1.2)

  // ── STREAK DISPLAY TIMERS ──
  if(streakDisplayTimer>0)streakDisplayTimer--;
  if(streakLostTimer>0)streakLostTimer--;

  // ── AREA DANGER LEVEL ──
  if(sc==='map'&&!mo&&!inBuilding){
    // Increase danger for current map
    areaDangerStayTimer[currentMap]++;
    // Danger increases from staying (faster to push movement between areas)
    if(areaDangerStayTimer[currentMap]%120===0){
      areaDanger[currentMap]=Math.min(1,areaDanger[currentMap]+0.03);
    }
    // Danger increases when rivals are on same map
    for(let ri=0;ri<2;ri++){
      if(rivalMaps[ri]===currentMap&&fr%60===0){
        areaDanger[currentMap]=Math.min(1,areaDanger[currentMap]+0.03);
      }
    }
    // Danger decreases for maps player is NOT on
    for(let mi=0;mi<3;mi++){
      if(mi!==currentMap&&fr%90===0){
        areaDanger[mi]=Math.max(0,areaDanger[mi]-0.02);
        areaDangerStayTimer[mi]=Math.max(0,areaDangerStayTimer[mi]-30);
      }
    }
    // Danger decreases when rivals leave
    for(let mi=0;mi<3;mi++){
      let rivalsHere=0;
      for(let ri=0;ri<2;ri++){if(rivalMaps[ri]===mi)rivalsHere++;}
      if(rivalsHere===0&&fr%120===0){
        areaDanger[mi]=Math.max(0,areaDanger[mi]-0.01);
      }
    }
  }

  // ── QTE UPDATE ──
  if(qteActive){
    qteFrame++;
    if(qteFrame>=qteWindow&&!qteKeyPressed){
      // Missed QTE
      qteActive=false;qteSuccess=false;
      sfxQteMiss();
      qteResultText='MISSED!';qteResultTimer=40;
    }
  }
  if(qteResultTimer>0)qteResultTimer--;

  // Atmosphere log messages based on proximity (throttled)
  if(fr%300===0){
    for(let i=0;i<2;i++){
      if(rivalMaps[i]!==currentMap)continue;
      const r=pl[i+1];
      const dist=Math.abs(r.x-pl[0].x)+Math.abs(r.y-pl[0].y);
      if(dist<=8&&dist>5){lg.push('The air feels tense...');}
      else if(dist>8&&dist<=15){lg.push('You sense movement nearby...');}
    }
  }
  // Footprint log messages when player walks on rival footprints
  if(sc==='map'&&!mo){
    // v282: replace closure .find with counting loop
    let pFp=null;{const _px=pl[0].x,_py=pl[0].y;for(let _fi=0;_fi<footprints.length;_fi++){const f=footprints[_fi];if(f.map===currentMap&&f.x===_px&&f.y===_py&&f.age<1800){pFp=f;break;}}}
    if(pFp&&fr%60===0){
      lg.push('Footprints in the grass... someone passed here.');
      pFp.age=1800; // Don't log again
    }
  }

  // Dungeon encounter removed (Phase C — duel system handles PvP in Phase D)
}

function dSplash(){
  splashFrame++;
  const t=splashFrame;
  bx(0,0,W,H,'#111118');
  if(t<120){
    const alpha=t<15?t/15:t>100?(120-t)/20:1;
    g.globalAlpha=alpha;
    txShadow('ZK-powered information asymmetry',W/2-200,H/2-20,10,'#9945FF','rgba(0,0,0,.5)');
    txShadow('Built on Solana',W/2-80,H/2+10,10,'#14F195','rgba(0,0,0,.5)');
    g.globalAlpha=1;
  }
  if(t>=120){fadeOut(()=>{sc='title';fadeIn();});}
}

function draw(){
  // Fill with deep-ocean background (prevents transparent bleed-through beyond map edges)
  g.fillStyle='#070d1a';g.fillRect(0,0,W,H);
  // v246: reset txShadow state cache each frame
  _lastFontSz=-1;_shadowReady=false;
  // v388: battle shake cache — computed once only when shake is active
  if(bpShakeTimer>0){_sBpST12=Math.sin(bpShakeTimer*1.2);_cBpST12=Math.cos(bpShakeTimer*1.2);_cBpST16=Math.cos(bpShakeTimer*1.6);}else{_sBpST12=0;_cBpST12=1;_cBpST16=1;}
  // v355: compute shared per-frame sin/cos once (saves ~50+ Math.sin calls/frame)
  const _fr2=fr*0.02,_fr3=fr*0.03,_fr4=fr*0.04,_fr5=fr*0.05,_fr015=fr*0.015;
  _sFr004=Math.sin(fr*0.004);_cFr004=Math.cos(fr*0.004);
  _sFr006=Math.sin(fr*0.006);_cFr006=Math.cos(fr*0.006);
  _sFr02=Math.sin(_fr2);_cFr02=Math.cos(_fr2);_sFr022=Math.sin(fr*0.022);_cFr022=Math.cos(fr*0.022);_sFr028=Math.sin(fr*0.028);_cFr028=Math.cos(fr*0.028);
  _sFr025=Math.sin(fr*0.025);_cFr025=Math.cos(fr*0.025);
  _sFr03=Math.sin(_fr3);_cFr03=Math.cos(_fr3);
  _sFr007=Math.sin(fr*0.007);_cFr007=Math.cos(fr*0.007);_sFr008=Math.sin(fr*0.008);_sFr012=Math.sin(fr*0.012);_sFr035=Math.sin(fr*0.035);_cFr035=Math.cos(fr*0.035);_sFr042=Math.sin(fr*0.042);_cFr042=Math.cos(fr*0.042);_sFr052=Math.sin(fr*0.052);_cFr052=Math.cos(fr*0.052);_sFr04=Math.sin(_fr4);_cFr04=Math.cos(_fr4);_sFr045=Math.sin(fr*0.045);_cFr045=Math.cos(fr*0.045);
  _sFr05=Math.sin(_fr5);_cFr05=Math.cos(_fr5);
  _sFr015=Math.sin(_fr015);_cFr015=Math.cos(_fr015);_sFr018=Math.sin(fr*0.018);_cFr018=Math.cos(fr*0.018);
  _sFr06=Math.sin(fr*0.06);_cFr06=Math.cos(fr*0.06);_sFr055=Math.sin(fr*0.055);_cFr055=Math.cos(fr*0.055);_sFr07=Math.sin(fr*0.07);_cFr07=Math.cos(fr*0.07);_sFr08=Math.sin(fr*0.08);_cFr08=Math.cos(fr*0.08);_sFr09=Math.sin(fr*0.09);_cFr09=Math.cos(fr*0.09);_sFr10=Math.sin(fr*0.1);_cFr10=Math.cos(fr*0.1);
  const _fr12=fr*0.12;_sFr12=Math.sin(_fr12);_cFr12=Math.cos(_fr12);
  _sFr15=Math.sin(fr*0.15);_cFr15=Math.cos(fr*0.15);_sFr18=Math.sin(fr*0.18);_cFr18=Math.cos(fr*0.18);_sFr20=Math.sin(fr*0.2);_cFr20=Math.cos(fr*0.2);_sFr25=Math.sin(fr*0.25);_cFr25=Math.cos(fr*0.25);_sFr28=Math.sin(fr*0.28);_sFr30=Math.sin(fr*0.3);_cFr30=Math.cos(fr*0.3);
  // Global screen shake
  let _shaking=false;
  if(shakeT>0){
    _shaking=true;
    const _si=fr&31; // v306: use pre-baked noise table; no RNG per frame
    const sx=Math.round(_SHAKE_N[_si]*shakeIntensity*(shakeT/8));
    const sy=Math.round(_SHAKE_N[(_si+16)&31]*shakeIntensity*(shakeT/8));
    g.save();g.translate(sx,sy);
    shakeT--;
  }
  // Screen dispatch (independent of shake)
  if(sc==='splash'){dSplash();}
  else if(sc==='title'){
    if(creditsActive){dCredits();}
    else if(mp.mpScreen!=='off'){drawMPLobby();}
    else{dTitle();}
  }
  else if(sc==='map'){
    if(inBuilding){drawBuildingInterior();}
    else{dMap();if(mo)dMenu();}
  }
  else if(sc==='act')dAct();
  else if(sc==='crd'){dCrd();drawCardDetailPanel();}
  else if(sc==='log')dLog();
  else if(sc==='stats')dStats();
  else if(sc==='victory'){if(gameOverTimesUp)dGameOver();else dVictory();}
  else if(sc==='lobby')dLobby(); // Phase D Reborn LobbyScene
  else if(sc==='duel')drawDuelScene(); // M2 Duel Board
  else if(sc==='duel_victory')drawVictoryScene(); // T-D13-D M4 Victory/Defeat
  else if(sc==='card_detail')drawCardDetailScene(); // T-D14-B M5 Card Detail
  else if(sc==='card_storage')drawCardStorageScene(); // T-D14-C PC Box Card Storage
  drawCardAcquisition();
  drawDiscardOverlay();
  drawMarketplace();
  drawSynthesisShop();
  drawTutorialMsg();
  drawSynergyBanner(); // T62
  drawLandmarkBanner(); // T53
  drawMinimap(); // T53
  drawExplorationProgress(); // T53
  drawTutorialStepOverlay(); // T63
  drawToasts(); // T54 UX-9
  drawWalletHUD(); // T54 UX-8
  drawOnboardPrompt(); // T54 UX-10
  drawTownHint(); // T70
  drawTownShopModal(); // T70
  drawIntroTutorial();
  drawTitleOptionsOverlay(); // v452 (B2-1): options sub-menu layered over Title
  if(!inBuilding&&sc==='map'){
    drawFishingOverlay();
    drawPuzzlePillars();
    drawPuzzleMessage();
    drawObjectInteractMsg();
    drawFountainDialog();
    drawMapCardUseOverlay();
    // Shadow effect on player sprite
    if(shadowStepsLeft>0){
      const px=pl[0].visualX-camX,py=pl[0].visualY-camY-16;
      g.globalAlpha=0.4;
      bx(px-4,py-4,40,56,'rgba(80,40,160,.3)');
      g.globalAlpha=1;
      txShadow(_STEALTH_LBL[shadowStepsLeft]||('STEALTH:'+shadowStepsLeft),px-20,py-24,5,'#9060c0','rgba(0,0,0,.4)');
    }
  }
  // Multiplayer connection status overlay
  drawMPStatus();
  // Card collection progress bar (always visible on map)
  drawCardProgressBar();
  if(flashT>0){g.globalAlpha=(flashT>10?1:flashT/10)*.8;g.fillStyle='#ffffff';g.fillRect(0,0,W,H);g.globalAlpha=1;}
  // Screen transition wipes (replaces old battleWipe)
  drawWipe();
  fadeDraw();
  // Map loading screen (drawn AFTER fade so it's always visible)
  drawMapLoadScreen();
  drawRunSummary();
  // v73: Rival intel dispatch ticker
  drawRivalNews();
  // v77: Quick hand inspect
  drawHandInspect();
  // Scanlines on Phase C screens (not lobby — Phase D renders its own atmosphere)
  if(sc==='map'||sc==='act'||sc==='crd'||sc==='log'||sc==='stats'||sc==='victory')g.drawImage(scanCanvas,0,0,W,H);
  // FRLG-style decorative border around viewport
  g.strokeStyle=FRLG.borderOuter;g.lineWidth=2;g.strokeRect(1,1,W-2,H-2);
  g.strokeStyle=FRLG.borderInner;g.lineWidth=1;g.strokeRect(3,3,W-6,H-6);
  // FPS counter (top-left, on top of everything)
  drawFPS();
  if(_shaking)g.restore();
}

// Mobile: throttle to 30fps for stable performance
const _frameInterval = _isMobile ? 33 : 16.67;
function loop(now){
  if(!lastTime)lastTime=now;
  const delta=now-lastTime;
  if(delta<_frameInterval){requestAnimationFrame(loop);return;}
  dt=Math.min(3,Math.max(0.1,delta/16.67));
  lastTime=now;
  update();draw();updatePixiHud();
  // Manually drive PixiJS: tick animations then render (prevents black flash from auto-ticker racing ahead)
  if(!_isMobile){pixiApp.ticker.update(now);pixiApp.renderer.render(pixiApp.stage);}
  requestAnimationFrame(loop);
}

// ═══════════════════════════════════════
