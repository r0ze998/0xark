// GAME LOOP
// ═══════════════════════════════════════

// Held-key continuous movement (overworld only — dungeon stays turn-based per press)
const _MOVE_REPEAT_INITIAL = 10; // frames to wait before repeat kicks in after first press
const _MOVE_REPEAT_RATE    = 7;  // frames between each repeated step while holding
let _moveRepeatTimer = _MOVE_REPEAT_INITIAL;

function processHeldMovement(){
  // Only in map mode, no overlays, no dungeon (dungeon stays turn-based)
  if(sc!=='map'||inDungeon||mo||npcDialogActive||shopActive||gachaActive||marketActive||
     battlePhase||introActive||handInspectActive||fishingActive||
     mapCardUseActive||fountainActive||dungeonConfirmActive||cardAcqActive)return;
  _moveRepeatTimer++;
  if(_moveRepeatTimer < _MOVE_REPEAT_RATE) return;
  _moveRepeatTimer = 0;
  let mdx=0,mdy=0;
  if(keysHeld.has('ArrowUp'))     mdy=-1;
  else if(keysHeld.has('ArrowDown')) mdy=1;
  if(keysHeld.has('ArrowLeft'))   mdx=-1;
  else if(keysHeld.has('ArrowRight'))mdx=1;
  if(mdx===0&&mdy===0)return;
  if(tryMovePlayer(mdx,mdy)){
    checkTreasure();
    if(!cardAcqActive&&!randomEventActive&&shadowStepsLeft<=0)tryWildEncounter();
  }
}

function updateVisualPositions(){
  const lerpT=1-Math.pow(1-0.35,dt); // Increased from 0.25 → 0.35 for snappier response
  pl.forEach(p=>{
    const targetX=p.x*TW, targetY=p.y*TH;
    p.visualX=lerp(p.visualX,targetX,lerpT);
    p.visualY=lerp(p.visualY,targetY,lerpT);
    // Snap to target when very close (prevents sub-pixel jitter)
    const dx=Math.abs(p.visualX-targetX),dy=Math.abs(p.visualY-targetY);
    if(dx<0.3&&dy<0.3){p.visualX=targetX;p.visualY=targetY;}
    // Round to integer for crisp pixel rendering
    p.visualX=Math.round(p.visualX);
    p.visualY=Math.round(p.visualY);
    // Update walk frame based on movement
    if(dx>0.5||dy>0.5){
      p._walkAccum=(p._walkAccum||0)+dt;
      if(p._walkAccum>=4){p._walkAccum=0;p.walkFrame=(p.walkFrame+1)%4;}
    }else{
      p.walkFrame=0;p._walkAccum=0;
    }
  });
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
  // Safety caps: prevent unbounded array growth
  if(particles.length>500)particles.splice(0,particles.length-500);
  if(lg.length>200)lg.splice(0,lg.length-200);
  if(burnedTiles.length>500)burnedTiles.splice(0,burnedTiles.length-500);
  processHeldMovement();
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
  if(rivalAlert>0)rivalAlert-=dt;
  if(fishingCooldownTimer>0)fishingCooldownTimer--;
  if(crystalRevealTimer>0)crystalRevealTimer--;
  updateFishing();

  // Bird movement
  if(fr%10===0){
    birds.forEach(b=>{
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
    });
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
  updateFloorTitle(); // v155: PMD floor title card

  // ── RIVAL WIN WARNING (GDD v1.0: rivals use 5-card system internally) ──
  const r1u=hasUniqueCards(1).size,r2u=hasUniqueCards(2).size;
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

  // ── CARD DECAY TIMER (GDD v1.0: only active in dungeon, town is safe) ──
  if((sc==='map'||sc==='act')&&inDungeon){
    const now=Date.now();
    let anyCardCritical=false;
    for(let i=0;i<HAND_SIZE;i++){
      if(pl[0].cd[i]>0&&cardTimers[i]>0){
        const elapsed=now-cardTimers[i];
        const remaining=CARD_DECAY_MS-elapsed;
        if(elapsed>=CARD_DECAY_MS){
          // Card expired in dungeon!
          const expiredName=CD[pl[0].cd[i]-1].n;
          cardShatterTimers[i]=fr; // v113: trigger HUD shatter animation before clearing
          pl[0].cd[i]=0;cardTimers[i]=0;decayWarn[i]=0;syncCardCount(0);
          sfxCardExpired();screenShake(3,6);
          triggerCardLostAnim(pl[0].visualX-camX,pl[0].visualY-camY-16);
          lg.push('[DUNGEON] '+expiredName+' decayed — escape to Town to preserve cards!');
          tutorialMsg=expiredName+' DECAYED! Escape to Town!';tutorialMsgTimer=200;
          if(streakCount>0){streakCount=0;streakLostTimer=60;}
        }else{
          const cardName=CD[pl[0].cd[i]-1].n;
          // 50% decay warning (one-time per card)
          if(elapsed>=CARD_DECAY_MS*0.5&&decayWarn[i]<1){
            decayWarn[i]=1;
            if(!tutorialMsg||tutorialMsgTimer<60){
              tutorialMsg=cardName+': halfway. Head back to Town!';tutorialMsgTimer=180;
            }
          }
          // 30-second warning
          if(remaining<30000&&decayWarn[i]<2){
            decayWarn[i]=2;sfxCardDecayWarn();screenShake(1,3);
            objectInteractMsg=cardName+' FADING! 30s!';objectInteractTimer=90;
          }
          // 10-second critical warning
          if(remaining<10000&&decayWarn[i]<3){
            decayWarn[i]=3;sfxDangerAlert();screenShake(2,4);
            objectInteractMsg=cardName+' CRITICAL! RUN!';objectInteractTimer=90;
          }
          // Flashing at <15s
          if(remaining<15000){
            anyCardCritical=true;
            if(fr%30===0)cardDecayWarningFlash=10;
            if(fr%60===0)sfxCardDecayWarn();
          }
          // Escape urgency (any card <30s)
          if(remaining<30000)anyCardCritical=true;
        }
      }
    }
    escapeUrgencyActive=anyCardCritical;
    if(escapeUrgencyActive)escapeUrgencyPulse++;
    else escapeUrgencyPulse=0;
    if(cardDecayWarningFlash>0)cardDecayWarningFlash--;
  }else{
    escapeUrgencyActive=false;escapeUrgencyPulse=0;
  }

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
    const pFp=footprints.find(f=>f.map===currentMap&&f.x===pl[0].x&&f.y===pl[0].y&&f.age<1800);
    if(pFp&&fr%60===0){
      lg.push('Footprints in the grass... someone passed here.');
      pFp.age=1800; // Don't log again
    }
  }

  // Encounter check (player walks to rival OR rival walks to player)
  // GDD v1.0: Town (map 0) is a safe zone — no PvP encounters allowed
  if(sc==='map'&&inDungeon&&!introActive&&!mo&&!npcDialogActive&&!wildEncounterActive&&!mapTransitioning&&!encounterExclActive&&!shopActive&&!signpostActive&&!inBuilding&&shadowStepsLeft<=0){
    pl.slice(1).forEach((r,idx)=>{
      if(rivalMaps[idx]!==currentMap)return;
      const adjDist=Math.abs(r.x-pl[0].x)+Math.abs(r.y-pl[0].y);
      // At HIGH danger, encounter triggers at distance 2 as well
      const encounterDist=areaDanger[currentMap]>=DANGER_HIGH_THRESH?2:1;
      if(adjDist<=encounterDist&&adjDist>0){
        if(!encounterCooldown){
          // Collector rival: 70% chance to flee instead of fight
          const ai=rivalAI[idx];
          if(ai.personality==='collector'&&ai.state!=='fleeing'&&Math.random()<0.7){
            ai.state='fleeing';
            ai.stateTimer=6;
            ai.moveInterval=6;
            const fdx=r.x-pl[0].x;const fdy=r.y-pl[0].y;
            const fx=r.x+(fdx!==0?fdx*4:0);const fy=r.y+(fdy!==0?fdy*4:0);
            const flee=findWalkableTile(rivalMaps[idx],Math.max(2,Math.min(MW-3,fx)),Math.max(2,Math.min(MH-3,fy)),5);
            if(flee){ai.goalX=flee.x;ai.goalY=flee.y;ai.goalMap=rivalMaps[idx];}
            lg.push(r.n+' is trying to run away!');
            encounterCooldown=60;
            return;
          }

          encounterCooldown=120;
          encounterExclActive=true;
          encounterExclFrame=fr;
          encounterExclTarget=idx+1;
          encounterExclPlayerX=pl[0].visualX;
          encounterExclPlayerY=pl[0].visualY;
          encounterExclRivalX=r.visualX;
          encounterExclRivalY=r.visualY;
          sfxEncounterDramatic();
          hitPause(3); // freeze-frame dramatic tension at encounter trigger
          const rivalName=r.n;
          const isRivalInitiated=ai.state==='hunting';
          // v81: choose context-sensitive pre-battle line
          const rCards=r.cd.filter(c=>c>0).length;
          const pCards=pl[0].cd.filter(c=>c>0).length;
          const vegaLines_hunt=['Hand over the cards. Now.','I\'ve been tracking you since B1.','The ARK\'s legacy is mine.','No walls stop a hunter.','Cornered. Just like the crew.'];
          const vegaLines_surp=['You... found me first?','Reckless. I respect it.','Bold. The ARK liked bold.','Didn\'t expect prey to hunt.','So you\'ve learned something.'];
          const miraLines_hunt=['I mapped every route. You had no chance.','The ARK crew fell to calculation. So will you.','Your card count fell below threshold. Engaging.','Probability of your escape: zero.','Precisely where my model predicted.'];
          const miraLines_surp=['A variable I didn\'t account for.','Interesting. You deviated from the pattern.','You read the dungeon well. Respect.','My model was wrong. Recalculating.','Even the ARK surprised its own crew once.'];
          const rich=rCards>=3;
          if(idx===0){// VEGA
            const pool=isRivalInitiated?vegaLines_hunt:vegaLines_surp;
            encounterRivalLine=(rich?'I have '+rCards+' cards. ':'')+pool[Math.floor(Math.random()*pool.length)];
          }else{// MIRA
            const pool=isRivalInitiated?miraLines_hunt:miraLines_surp;
            encounterRivalLine=(rCards===0?'I have nothing to lose. ':'')+pool[Math.floor(Math.random()*pool.length)];
          }
          setTimeout(()=>{
            encounterExclActive=false;
            flash();
            twSet(isRivalInitiated?rivalName+' ambushed you! Battle!':'Wild '+rivalName+' appeared! Entering battle...');
            // FRLG-style mosaic pixelation wipe into battle
            startWipe('mosaic',30,()=>{
              sc='act';battlePhase='vs_splash';bpFrame=fr;
              battleRoundHistory=[]; // v90: reset round history on new battle
              startWipe('mosaic_out',20);
              // v79: track battle_rival mission
              if(runMission&&runMission.type==='battle_rival'&&!runMission.completed){
                runMission.progress=1;runMission.completed=true;sfxStreakUp();
              }
            });
          },500);
        }
      }
    });
    if(encounterCooldown>0)encounterCooldown--;
  }
}

function dSplash(){
  splashFrame++;
  const t=splashFrame;
  bx(0,0,W,H,'#111118');
  if(t<120){
    const alpha=t<15?t/15:t>100?(120-t)/20:1;
    g.globalAlpha=alpha;
    tx('ZK-powered information asymmetry',W/2-200,H/2-20,10,'#9945FF');
    tx('Built on Solana',W/2-80,H/2+10,10,'#14F195');
    g.globalAlpha=1;
  }
  if(t>=120){fadeOut(()=>{sc='title';fadeIn();});}
}

function draw(){
  g.clearRect(0,0,W,H);
  // Global screen shake
  let _shaking=false;
  if(shakeT>0){
    _shaking=true;
    const sx=Math.round((Math.random()-0.5)*shakeIntensity*(shakeT/8));
    const sy=Math.round((Math.random()-0.5)*shakeIntensity*(shakeT/8));
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
  drawCardAcquisition();
  drawDiscardOverlay();
  drawDungeonConfirm();
  drawMarketplace();
  drawSynthesisShop();
  drawTutorialMsg();
  drawIntroTutorial();
  if(!inBuilding&&sc==='map'){
    drawFishingOverlay();
    drawPuzzlePillars();
    drawPuzzleMessage();
    drawObjectInteractMsg();
    drawFloorClearFanfare(); // v85
    drawExitProximityTooltip();
    drawFountainDialog();
    drawMapCardUseOverlay();
    // Shadow effect on player sprite
    if(shadowStepsLeft>0){
      const px=pl[0].visualX-camX,py=pl[0].visualY-camY-16;
      g.globalAlpha=0.4;
      bx(px-4,py-4,40,56,'rgba(80,40,160,.3)');
      g.globalAlpha=1;
      tx('STEALTH:'+shadowStepsLeft,px-20,py-24,5,'#9060c0');
    }
  }
  // Multiplayer connection status overlay
  drawMPStatus();
  // Card collection progress bar (always visible on map)
  drawCardProgressBar();
  if(flashT>0){bx(0,0,W,H,`rgba(255,255,255,${(flashT>10?1:flashT/10)*.8})`);}
  // Decay vignette: red edges when any card critically decaying
  if(escapeUrgencyActive&&inDungeon&&(sc==='map'||sc==='act')){
    const vigA=(0.15+Math.sin(escapeUrgencyPulse*0.15)*0.1)*Math.min(1,escapeUrgencyPulse/30);
    const vg=g.createRadialGradient(W/2,H/2,H*0.25,W/2,H/2,H*0.8);
    vg.addColorStop(0,'rgba(0,0,0,0)');
    vg.addColorStop(1,`rgba(200,20,20,${vigA.toFixed(2)})`);
    g.fillStyle=vg;g.fillRect(0,0,W,H);
  }
  // Screen transition wipes (replaces old battleWipe)
  drawWipe();
  fadeDraw();
  // Map loading screen (drawn AFTER fade so it's always visible)
  drawMapLoadScreen();
  // v72: Dungeon run summary (after fade, on top of everything except border/fps)
  drawRunSummary();
  // v73: Rival intel dispatch ticker
  drawRivalNews();
  // v77: Quick hand inspect
  drawHandInspect();
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
