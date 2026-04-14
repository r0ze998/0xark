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
    edgeCacheDirty=true;fogCacheDirty=true;
    particles.length=0;
    // Reveal starting area on new map (larger radius so entry area is immediately visible)
    if(inDungeon){fogRevealRadius(currentMap,pl[0].x,pl[0].y,4);fogSave();}
    else{fogRevealAll(currentMap);fogSave();}
    // When entering floor 1 from town, spread rivals to safe starting positions far from entrance.
    // This prevents immediate encounters caused by AI roaming during town/title time.
    if(exit.fromMap===0&&exit.targetMap===1){
      // v72: Snapshot state at dungeon entry so we can show run summary on exit
      dungeonRunSnapshot={cards:[...pl[0].cd],vaultSize:pl[0].vault?pl[0].vault.size:0,deepestFloor:0};
      // v79: Generate a random run mission
      const _mDef=RUN_MISSION_DEFS[Math.floor(Math.random()*RUN_MISSION_DEFS.length)];
      runMission={..._mDef,progress:0,completed:false,rewardGiven:false};
      roundsThisRun=0;
      lg.push('MISSION: '+runMission.desc+' → '+runMission.reward);
      pl[1].x=8;pl[1].y=10;pl[1].visualX=8*TW;pl[1].visualY=10*TH;
      pl[2].x=28;pl[2].y=18;pl[2].visualX=28*TW;pl[2].visualY=18*TH;
      rivalMaps=[1,1];
      rivalAI[0].goalX=32;rivalAI[0].goalY=12;rivalAI[0].state='exploring';
      rivalAI[0].lastKnownPlayerMap=-1;rivalAI[0].lastKnownPlayerX=-1;rivalAI[0].lastKnownPlayerY=-1;
      rivalAI[0].huntCooldown=900; // 15s before hunter can pursue (on top of the 8s grace period)
      rivalAI[1].goalX=32;rivalAI[1].goalY=18;rivalAI[1].state='exploring';
      rivalAI[1].lastKnownPlayerMap=-1;rivalAI[1].lastKnownPlayerX=-1;rivalAI[1].lastKnownPlayerY=-1;
      rivalAI[1].huntCooldown=600; // 10s extra cooldown for collector
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
    showBanner(mapNames[currentMap],AREA_CARD_DESC[currentMap]);
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
          if(flAdded){
            objectInteractMsg='FLOOR '+clearedFloor+' CLEAR! Got '+cr.n+'!';
            objectInteractTimer=150;
            if(!isNewUnique)sfxCardGet(); // only play extra sound for duplicates (unique sting already fired)
            screenShake(2,4);
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
        },800);
      }
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
    }
    fadeIn(()=>{mapTransitioning=false;});
  });
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
  // Dark bar
  const barH=bannerSubText?40:28;
  g.fillStyle='rgba(20,16,24,.85)';
  g.fillRect(slideX,8,W,barH);
  // Subtle border
  g.fillStyle='rgba(200,180,140,.4)';
  g.fillRect(slideX,7,W,1);g.fillRect(slideX,8+barH,W,1);
  // Text
  tx(bannerText,slideX+W/2-bannerText.length*5,26,10,'#f8f0e0');
  if(bannerSubText)tx(bannerSubText,slideX+W/2-bannerSubText.length*3,40,6,'#c8c0a0');
}

// ═══════════════════════════════════════
// MINIMAP
// ═══════════════════════════════════════
function drawMinimap(){
  const mmW=130,mmH=88;
  const mx=W-mmW-10,my=H-HUD_HEIGHT-mmH-16;

  // FRLG-style window border
  g.fillStyle='#484058';
  g.fillRect(mx,my-1,mmW,1);g.fillRect(mx-1,my,1,mmH);
  g.fillRect(mx+mmW,my,1,mmH);g.fillRect(mx,my+mmH,mmW,1);
  g.fillStyle='#686078';
  g.fillRect(mx+1,my,mmW-2,1);g.fillRect(mx,my+1,1,mmH-2);
  g.fillRect(mx+mmW-1,my+1,1,mmH-2);g.fillRect(mx+1,my+mmH-1,mmW-2,1);
  // Fill background
  bx(mx+1,my+1,mmW-2,mmH-2,'rgba(20,20,30,.88)');

  // Draw simplified map with fog - actual tile colors
  const m=getMap();
  const sx=mmW/MW,sy=mmH/MH;
  for(let ty=0;ty<MH;ty+=2){
    for(let tx_=0;tx_<MW;tx_+=2){
      const revealed=fogRevealed[currentMap][ty]?.[tx_]||
                     fogRevealed[currentMap][ty]?.[tx_+1]||
                     fogRevealed[currentMap][ty+1]?.[tx_]||
                     fogRevealed[currentMap][ty+1]?.[tx_+1];
      if(!revealed){
        bx(mx+tx_*sx,my+ty*sy,Math.max(1,sx*2),Math.max(1,sy*2),'#080810');
        continue;
      }
      const t=m[ty]?.[tx_];
      let col=null;
      // Actual tile colors: water=blue, grass=green, sand=yellow, path=brown, buildings=red
      if(t===0||t===17)col='#3070b8';       // water = blue
      else if(t===1||t===7||t===11)col='#48a850'; // grass = green
      else if(t===3||t===13)col='#2a6828';   // trees = dark green
      else if(t===2)col='#a08050';           // path = brown
      else if(t===4||t===10||t===14)col='#d8c060'; // sand = yellow
      else if(t===5||t===15||t===16)col='#c04848'; // buildings = red
      else if(t===18||t===8)col='#686878';   // mountain/rock
      else if(t===22||t===23)col='#585860';  // ruins
      else if(t===25)col='#c04020';          // lava
      else if(t===24||t===26)col='#60c0d0';  // glow/crystal
      else col='#48a850';                     // default grass
      bx(mx+tx_*sx,my+ty*sy,Math.max(1,sx*2),Math.max(1,sy*2),col);
    }
  }

  // v128: Encounter zone shimmer overlay — amber for tall grass (30%), yellow-green for regular (15%)
  if(inDungeon){
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
        // Per-tile phase offset creates rolling shimmer across the map
        const phase=(tx_*3+ty*7)&15;
        const shimmer=Math.sin(fr*0.07+phase*0.39)*0.5+0.5;
        const alpha=(encRate>0.25?0.22:0.12)*shimmer;
        const eCol=encRate>0.25?`rgba(255,160,30,${alpha})`:`rgba(180,240,80,${alpha})`;
        bx(mx+tx_*sx,my+ty*sy,Math.max(1,sx*2),Math.max(1,sy*2),eCol);
      }
    }
    // Tiny legend: amber dot = tall grass (30%), yellow-green = regular grass (15%)
    bx(mx+2,my+mmH-9,4,4,'rgba(255,160,30,0.65)');
    tx('30%',mx+7,my+mmH-5,4,'rgba(220,160,60,0.7)');
    bx(mx+26,my+mmH-9,4,4,'rgba(180,240,80,0.55)');
    tx('15%',mx+31,my+mmH-5,4,'rgba(160,200,80,0.7)');
  }

  // Exit locations as blinking white dots (pulse)
  const exitPulse=Math.sin(fr*0.15)*0.4+0.6;
  exits.forEach(e=>{
    if(e.fromMap===currentMap){
      e.tiles.forEach(([ex,ey])=>{
        if(fogRevealed[currentMap][ey]?.[ex]){
          g.globalAlpha=exitPulse;
          const epx=mx+ex*sx,epy=my+ey*sy;
          bx(epx,epy,Math.max(1,sx),Math.max(1,sy),'#fff');
          g.globalAlpha=1;
        }
      });
    }
  });

  // NPC dots (small yellow)
  npcs.forEach(npc=>{
    if(npc.map===currentMap&&fogRevealed[currentMap][npc.y]?.[npc.x]){
      const npx=mx+npc.x*sx,npy=my+npc.y*sy;
      bx(npx,npy,Math.max(1,sx),Math.max(1,sy),'#f0d040');
    }
  });

  // Triggered traps as red dots on minimap
  triggeredTraps.forEach(key=>{
    const parts=key.split('-');
    const tMap=parseInt(parts[0]),tx_=parseInt(parts[1]),ty_=parseInt(parts[2]);
    if(tMap===currentMap){
      bx(mx+tx_*sx,my+ty_*sy,Math.max(1,sx),Math.max(1,sy),'#ff3030');
    }
  });

  // Rival dots: visible through fog OR crystal reveal active
  pl.slice(1).forEach((rp,idx)=>{
    if(rivalMaps[idx]===currentMap){
      if(isVisibleThroughFog(rp.x,rp.y,3)||crystalRevealTimer>0){
        const rpx=mx+rp.x*sx,rpy=my+rp.y*sy;
        bx(rpx,rpy,2,2,rp.c);
        // Direction arrow when crystal reveal or recent scout active
        if(crystalRevealTimer>0){
          const ai=rivalAI[idx];
          const gdx=ai.goalX-rp.x;const gdy=ai.goalY-rp.y;
          if(gdx!==0||gdy!==0){
            const len=Math.sqrt(gdx*gdx+gdy*gdy);
            const nx_=gdx/len*4,ny_=gdy/len*4;
            g.strokeStyle=rp.c;g.lineWidth=1;
            g.beginPath();g.moveTo(rpx+1,rpy+1);g.lineTo(rpx+1+nx_,rpy+1+ny_);g.stroke();
          }
        }
      }
    }
  });

  // Exit/entrance markers on minimap (always shown in dungeon)
  if(inDungeon){
    exits.forEach(ex=>{
      if(ex.fromMap!==currentMap)return;
      ex.tiles.forEach(([etx,ety])=>{
        const col=ex.isEscape?'#40e060':'#e0c040'; // green=town escape, yellow=deeper
        const edx=mx+etx*sx,edy=my+ety*sy;
        g.globalAlpha=0.8+Math.sin(fr*0.1)*0.2;
        bx(edx,edy,Math.max(2,sx),Math.max(2,sy),col);
        g.globalAlpha=1;
      });
    });
  }

  // Player dot - bright blinking
  const playerPulse=Math.sin(fr*0.2)*0.3+0.7;
  g.globalAlpha=playerPulse;
  const pdx=mx+pl[0].x*sx,pdy=my+pl[0].y*sy;
  bx(pdx-1,pdy-1,3,3,'#fff');bx(pdx,pdy,1,1,'#40f040');
  g.globalAlpha=1;

  // Map name above minimap
  tx(mapNames[currentMap],mx,my-5,4,mapColors[currentMap]);
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
  const maxRivalUnique=Math.max(hasUniqueCards(1).size,hasUniqueCards(2).size);
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
    const wRarCols=['','#888898','#50d060','#6090f0','#c060e0','#fff8a0'];
    const wRcol=wRarCols[wRar]||'#f0c830';
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
    tx('?',W/2-9,riseY+silH/2+8,20,'#1c1c48');
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
    if(vaultSz<4)return['Collect all 60 cards','to win the Prize Pool!','Cards: Attack / Defense','Flee / Magic / Heal','STEAL rivals in battle.','Deeper dungeon = rarer!'];
    if(vaultSz<12)return['The dungeon has','5 floors total.','Each floor hides','rarer cards below.','Always escape west','before cards decay!'];
    if(vaultSz<25)return['VEGA hunts players','without mercy.','MIRA calculates','every encounter odds.','Learn their patterns','to survive longer!'];
    if(vaultSz<45)return[''+vaultSz+'/60 cards!','The Alchemist fuses','3 same-rarity cards','into a rarer one.','Powerful shortcut','for rare gaps.'];
    return[''+vaultSz+'/60 — so close!','Every single card','matters at this stage.','Guard your hand well.','One bad battle','could slow you down!'];
  }
  if(npc.name==='Dungeon Porter'){
    if(lastRun&&lastRun.cardsGained>0)return['Welcome back!','You look like you','scored big this run!',lastRun.cardsGained+' card'+(lastRun.cardsGained>1?'s':'')+' gained.','Ready to dive again?','Dungeon is east.'];
    if(lastRun&&lastRun.cardsGained===0)return['Rough run?','Even empty hands','teach hard lessons.','The dungeon doesn\'t','give up its secrets','without a fight.'];
    return['Dungeon entrance','is to the east!','Cards DECAY over time','while underground.','Escape west to return','to town safely.'];
  }
  if(npc.name==='Alchemist'){
    const rarityCounts={};
    pl[0].cd.filter(c=>c>0).forEach(c=>{const r=CD[c-1]?.r||1;rarityCounts[r]=(rarityCounts[r]||0)+1;});
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
  if(npc.name==='ARK Guide')return['Need a tip?','Every card counts!','Ask me anything.'];
  if(npc.name==='Dungeon Porter')return['Ready to dive?','Cards decay below!','East leads to danger.'];
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
    if(tx_===15&&ty===21) return 'Town Square -- a safe zone. No battles occur here.';
    return 'はじまりのまち -- a safe haven between dungeon runs.';
  }
  if(mapIdx===1){
    return 'Dungeon B1 -- AI rivals and players lurk here. Cards decay!';
  }
  if(mapIdx===2){
    return 'Dungeon B2 -- Uncommon cards found here. Stay sharp!';
  }
  if(mapIdx===3){
    return 'Dungeon B3 -- Rare cards await. High danger zone.';
  }
  if(mapIdx===4){
    return 'Dungeon B4 -- Epic cards hide in the shadows.';
  }
  if(mapIdx===5){
    return 'Dungeon B5 -- Legendary territory. Only the brave survive.';
  }
  return 'A faded signpost. The writing is hard to read.';
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
  tx('SIGNPOST',20,H-95+slideOff,6,'#806030');
  const maxChars=52;
  let line1=signpostText, line2='';
  if(signpostText.length>maxChars){
    let breakAt=signpostText.lastIndexOf(' ',maxChars);
    if(breakAt<1)breakAt=maxChars;
    line1=signpostText.substring(0,breakAt);
    line2=signpostText.substring(breakAt+1);
  }
  tx(line1,20,H-70+slideOff,7,'#303028');
  if(line2)tx(line2,20,H-52+slideOff,7,'#303028');
  const arrowBounce=Math.sin(fr*0.15)*2;
  tx('\u25BC',W-24,H-18+slideOff+arrowBounce,7,'#806030');
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
  // Darken background
  bx(0,0,W,H,'rgba(0,0,0,.45)');
  // Shop window
  win(50,25,W-100,H-50);
  tx('TRADE CARDS',W/2-70,58,10,'#806030');
  // Divider line
  bx(70,68,W-140,1,'#c0b898');

  if(shopPhase==='list'){
    const filled=getPlayerFilledSlots();
    if(filled.length===0){
      tx('You have no cards to trade!',70,110,7,'#989080');
      tx('Press X to leave.',70,134,7,'#686068');
    }else{
      tx('Select a card to trade:',70,86,6,'#686068');
      filled.forEach((slot,i)=>{
        const cd=pl[0].cd[slot];
        const cr=CD[cd-1];
        const y=108+i*34;
        if(i===shopSelectedIdx){
          bx(68,y-8,W-136,28,'rgba(192,168,96,.2)');
          tx('\u25B6',72,y+8,7,'#c04040');
        }
        bx(92,y-4,20,20,cr.d);bx(93,y-3,18,18,cr.c);
        drawCardCharacter(94,y-2,cd,0.7,fr);
        tx(cr.n,120,y+8,7,i===shopSelectedIdx?'#c04040':'#303028');
        tx(cr.f,260,y+8,6,'#989080');
      });
      tx('Z=Select  X=Leave',70,H-80,6,'#686068');
    }
  }else if(shopPhase==='confirm'){
    const filled=getPlayerFilledSlots();
    const slot=filled[shopSelectedIdx];
    const cd=pl[0].cd[slot];
    const cr=CD[cd-1];
    const vaultSz=pl[0].vault?pl[0].vault.size:0;
    drawCardFrame(W/2-35,100,70,100,cd-1,true);
    tx('Trade '+cr.n+' for a',W/2-110,250,7,'#303028');
    tx('card you don\'t have yet?',W/2-120,272,7,'#303028');
    tx('('+vaultSz+'/60 collected)',W/2-72,292,6,'#806030');
    tx('Z=Yes  X=No',W/2-60,316,7,'#c04040');
  }else if(shopPhase==='result'){
    tx(shopResultText,70,H/2,9,'#303028');
    tx('Press Z to continue',70,H/2+30,6,'#686068');
  }
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
  sfxCardGet();screenShake(3,6);
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
    if(fr-synthResultFrame>40)tx('Press X to close',W/2-64,H-80,7,'#686068');
    return;
  }

  // Phase: pick — show rarity filter tabs and cards
  // Rarity tabs
  const rarLabels=['','Common','Uncommon','Rare','Epic'];
  const tabY=78;const tabW=88;
  rarLabels.forEach((rl,ri)=>{
    if(ri===0)return;
    const tabX=60+(ri-1)*tabW;
    const sel=synthRarityFilter===ri;
    bx(tabX,tabY,tabW-4,20,sel?'#806030':'rgba(80,70,50,.5)');
    if(sel){bx(tabX,tabY,tabW-4,1,'#d0b060');bx(tabX,tabY+19,tabW-4,1,'#d0b060');}
    tx(rl,tabX+4,tabY+13,6,sel?'#f8e8c0':'#a09070');
  });

  const filled=getPlayerFilledSlots().filter(s=>{
    const cid=pl[0].cd[s];return cid>0&&CD[cid-1]?.r===synthRarityFilter;
  });

  if(filled.length===0){
    tx('No '+rarLabels[synthRarityFilter]+' cards in hand.',80,120,7,'#989080');
  }else{
    const needed=3-synthSelected.length;
    const nextRar=RARITY_COLOR[synthRarityFilter+1]||'#c8c0a0';
    tx('Select 3 cards → get 1 '+(rarLabels[synthRarityFilter+1]||'?')+' card',80,108,6,'#c0a060');
    tx(needed>0?'Need '+needed+' more':'3 selected — press Z to synthesize!',80,122,6,needed===0?'#40d080':'#808880');

    const cols=4,cellW=120,cellH=48;
    filled.forEach((slot,i)=>{
      const cid=pl[0].cd[slot],cr=CD[cid-1];
      const col=i%cols,row=Math.floor(i/cols);
      const cx=80+col*cellW,cy=138+row*cellH;
      const isSel=synthSelected.includes(slot);
      bx(cx,cy,cellW-8,cellH-4,isSel?'rgba(192,168,96,.3)':'rgba(40,36,28,.6)');
      if(isSel){bx(cx,cy,2,cellH-4,'#c0a040');tx('\u2713',cx+cellW-20,cy+14,9,'#c0a040');}
      bx(cx+4,cy+4,20,20,cr.d);bx(cx+5,cy+5,18,18,cr.c);
      drawCardCharacter(cx+6,cy+6,cid,0.7,fr);
      tx(cr.n,cx+30,cy+14,6,isSel?'#f8e8c0':'#c0b898');
      tx(cr.f,cx+30,cy+26,5,'#908878');
    });
  }

  // Legend
  const tgt=rarLabels[synthRarityFilter+1];
  if(tgt)tx('3× '+rarLabels[synthRarityFilter]+' → 1× '+tgt,80,H-88,6,'#806030');
  tx('← → change rarity  Z=select/confirm  X=close',80,H-68,5,'#686068');
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
  tx('EVENT',42,H/2-48+slideOff,7,'#d8b028');
  // Word-wrap
  const maxChars=50;
  let line1=randomEventText, line2='';
  if(randomEventText.length>maxChars){
    let breakAt=randomEventText.lastIndexOf(' ',maxChars);
    if(breakAt<1)breakAt=maxChars;
    line1=randomEventText.substring(0,breakAt);
    line2=randomEventText.substring(breakAt+1);
  }
  tx(line1,42,H/2-22+slideOff,7,'#303028');
  if(line2)tx(line2,42,H/2-6+slideOff,7,'#303028');
  g.globalAlpha=1;
}

// ═══════════════════════════════════════
// BATTLE ENCOUNTER EXCLAMATION
// ═══════════════════════════════════════
function drawEncounterExclamation(){
  if(!encounterExclActive)return;
  const t=fr-encounterExclFrame;
  if(t>30){encounterExclActive=false;return;}
  const bounce=Math.sin(t*0.5)*3;
  const alpha=Math.min(1,t/5)*(t<25?1:Math.max(0,(30-t)/5));
  g.globalAlpha=alpha;
  // Player "!" bubble
  const ppx=encounterExclPlayerX-camX, ppy=encounterExclPlayerY-camY-8;
  bx(ppx+3,ppy-22+bounce,10,14,'#fff');bx(ppx+4,ppy-21+bounce,8,11,'#f0c830');
  tx('!',ppx+5,ppy-10+bounce,10,'#c04040');
  // Rival "!" bubble with rival name tag
  const rpx=encounterExclRivalX-camX, rpy=encounterExclRivalY-camY-8;
  bx(rpx+3,rpy-22+bounce,10,14,'#fff');bx(rpx+4,rpy-21+bounce,8,11,'#f0c830');
  tx('!',rpx+5,rpy-10+bounce,10,'#c04040');
  // Show rival name tag above "!" — appears after t>6
  if(t>6){
    const rName=(encounterExclTarget>=1&&encounterExclTarget<=2)?pl[encounterExclTarget].n:'???';
    const rNameCol=(encounterExclTarget===1)?'#f080c0':'#f0c830';
    const nameW=rName.length*6+4;
    bx(rpx-nameW/2+8,rpy-38+bounce,nameW,13,'rgba(0,0,0,.7)');
    tx(rName,rpx-nameW/2+10,rpy-27+bounce,7,rNameCol);
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
    tx('\u201C'+encounterRivalLine+'\u201D',lineX+4,lineY+12,5,rNameCol2);
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

function drawNPCDialog(){
  if(!npcDialogActive)return;
  const dlgSlide=Math.min(1,(fr-npcDialogOpenFrame)/6);
  const dlgEase=easeInOut(dlgSlide);
  const slideOff=90*(1-dlgEase);
  g.globalAlpha=dlgEase;
  win(6,H-100+slideOff,W-12,90);
  win(10,H-110+slideOff,npcDialogName.length*9+20,20);
  tx(npcDialogName,20,H-95+slideOff,7,'#c04040');
  // Combine current dialog lines and wrap properly
  const rawLine=npcDialogLines[npcDialogIdx]||'';
  const rawLine2=npcDialogLines[npcDialogIdx+1]||'';
  const maxChars=52;
  const wrapped1=wrapText(rawLine,maxChars);
  const wrapped2=rawLine2?wrapText(rawLine2,maxChars):[];
  const allLines=[...wrapped1,...wrapped2].slice(0,3);
  allLines.forEach((l,i)=>{
    tx(l,20,H-70+slideOff+i*16,7,FRLG.textColor);
  });
  // FRLG-style bouncing triangle at bottom-right (bounces 2px every 0.5s = 30 frames)
  const hasMore=(npcDialogIdx+2)<npcDialogLines.length;
  const arrowBounce=hasMore?Math.floor(Math.sin(fr*Math.PI/30)*2):0;
  tx('\u25BC',W-24,H-18+slideOff+arrowBounce,7,FRLG.selHighlight);
  g.globalAlpha=1;
}

// ═══════════════════════════════════════
// TITLE SCREEN
// ═══════════════════════════════════════
function dTitle(){
  bx(0,0,W,H,'#0c0c18');
  for(let i=0;i<120;i++){const a=.18-i*.0015;bx(0,i,W,1,`rgba(48,96,176,${Math.max(0,a)})`);}
  for(let i=0;i<80;i++){
    const sx=(i*47+13)%W,sy=(i*31+7)%320;
    const a=Math.sin(fr*.03+i*1.7)*.35+.5;
    bx(sx,sy,i%7===0?2:1,i%7===0?2:1,`rgba(255,255,255,${a*.4})`);
  }
  if(fr%200<15){
    const sx=150+fr%200*10,sy=40+fr%200*2;
    for(let t=0;t<6;t++)bx(sx-t*4,sy-t,2,1,`rgba(255,255,255,${.4-t*.06})`);
  }

  tx('0xARK',W/2-96+1,191,32,'rgba(0,0,0,.4)');
  tx('0xARK',W/2-96,190,32,'#f8f0e0');
  if(Math.sin(fr*.02)>.3)tx('0xARK',W/2-96,190,32,'rgba(248,240,224,.15)');
  tx('EVERYTHING IS SECRET',W/2-104,226,10,'#8888a0');
  tx('Deception is profitable.',W/2-88,242,8,'#a07848');

  // SEASON 1 badge
  const s1Blink=Math.sin(fr*0.06)*0.15+0.85;
  g.globalAlpha=s1Blink;
  bx(W/2-36,252,72,16,'rgba(200,152,32,.25)');
  bx(W/2-35,253,70,14,'rgba(200,152,32,.12)');
  tx('SEASON 1',W/2-30,264,7,'#f0c830');
  g.globalAlpha=1;

  // Prize pool display — show actual pot if wallet connected
  const prizeStr=walletConnected&&stakePotAmount>0?'PRIZE POOL: '+stakePotAmount.toFixed(2)+' SOL':'PRIZE POOL: -- USDC';
  tx(prizeStr,W/2-86,280,7,'#14F195');

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
    if(sel===0&&blink||sel!==0)tx('CONTINUE',W/2-52,320,10,sel===0?FRLG.selHighlight:'#888898');
    if(sel===0)tx('\u25B6',W/2-76,320,10,FRLG.selHighlight);
    if(sel===1&&blink||sel!==1)tx('NEW GAME',W/2-52,350,10,sel===1?FRLG.selHighlight:'#888898');
    if(sel===1)tx('\u25B6',W/2-76,350,10,FRLG.selHighlight);
    // CONNECT WALLET option
    if(walletConnected){
      tx(walletAddressTruncated(),W/2-52,380,8,'#40d080');
      if(sel===2)tx('\u25B6',W/2-76,380,10,'#40d080');
    }else{
      if(sel===2&&blink||sel!==2)tx('CONNECT WALLET',W/2-80,380,10,sel===2?FRLG.selHighlight:'#888898');
      if(sel===2)tx('\u25B6',W/2-104,380,10,FRLG.selHighlight);
    }
    // MULTIPLAYER option
    if(sel===3&&blink||sel!==3)tx('MULTIPLAYER',W/2-68,410,10,sel===3?FRLG.selHighlight:'#888898');
    if(sel===3)tx('\u25B6',W/2-92,410,10,FRLG.selHighlight);
    if(mp.connected)tx('ONLINE',W/2+60,410,6,'#40d080');
    // CLEAR SAVE (sel===4)
    if(sel===4&&blink||sel!==4)tx('CLEAR SAVE DATA',W/2-88,440,10,sel===4?'#d04040':'#555570');
    if(sel===4)tx('\u25B6',W/2-112,440,10,'#d04040');
  }else{
    if(Math.floor(fr/25)%2===0)tx('PRESS Z TO START',W/2-110,330,10,FRLG.selHighlight);
    // CONNECT WALLET option below start
    const sel2=titleMenuIdx||0;
    const blink2=Math.floor(fr/25)%2===0;
    if(walletConnected){
      tx(walletAddressTruncated(),W/2-52,370,8,'#40d080');
    }else{
      if(sel2===1&&blink2||sel2!==1)tx('CONNECT WALLET',W/2-80,370,10,sel2===1?FRLG.selHighlight:'#888898');
      if(sel2===1)tx('\u25B6',W/2-104,370,10,FRLG.selHighlight);
    }
    // MULTIPLAYER option (no save)
    if(sel2===2&&blink2||sel2!==2)tx('MULTIPLAYER',W/2-68,400,10,sel2===2?FRLG.selHighlight:'#888898');
    if(sel2===2)tx('\u25B6',W/2-92,400,10,FRLG.selHighlight);
    if(mp.connected)tx('ONLINE',W/2+60,400,6,'#40d080');
  }
  // On-chain / offline indicator
  if(walletConnected){
    drawSolanaIcon(W/2+82,550,8);
    tx(programVerified?'VERIFIED':'ON-CHAIN',W/2+100,560,7,programVerified?'#14F195':'#40d080');
  }else{
    tx('OFFLINE',W/2+100,560,7,'#555570');
  }

  // Stake display when wallet connected (placed below menu items)
  if(walletConnected){
    tx('STAKE: '+STAKE_AMOUNT.toFixed(2)+' SOL',W/2-70,496,8,'#14F195');
    if(stakeDeposited){
      tx('POT: '+stakePotAmount.toFixed(2)+' SOL',W/2-50,512,7,'#f0c830');
    }
  }

  // "Built on Solana" branding at bottom
  drawSolanaLogo(W/2-120,548,10);
  tx('Built on Solana',W/2-104,552,7,'#9945FF');

  // CREDITS button (hasSave: idx5 y=470; no save: idx3 y=430)
  {
    const credSel=hasSave()?(titleMenuIdx===5):(titleMenuIdx===3);
    const credY=hasSave()?470:430;
    if(credSel){tx('\u25B6',W/2-66,credY,10,FRLG.selHighlight);}
    const credBlink=Math.floor(fr/25)%2===0;
    if(credSel&&credBlink||!credSel)tx('CREDITS',W/2-42,credY,10,credSel?FRLG.selHighlight:'#555570');
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
  tx('Built for Colosseum Frontier 2026 | Solana | Anchor | Circom | x402',W/2-310,582,6,'#444460');
  // Version label — shown in top-right for easy reference
  txShadow('v143',W-48,14,10,'#c0c8ff','rgba(0,0,0,0.7)');

  // Dungeon entry confirmation overlay (shown on map, not title)
  // (rendered in drawMap via dungeonConfirmActive flag)

  // Stake confirmation overlay
  if(stakeConfirmActive){
    bx(0,0,W,H,'rgba(0,0,0,.6)');
    win(W/2-200,H/2-80,400,160);
    drawSolanaLogo(W/2,H/2-54,14);
    tx('DEPOSIT '+STAKE_AMOUNT.toFixed(2)+' SOL TO ENTER?',W/2-180,H/2-24,9,'#f0f0f0');
    tx('Winner takes the pot: '+stakePotAmount.toFixed(2)+' SOL',W/2-170,H/2+2,7,'#14F195');
    tx('(UI preview - devnet not deployed)',W/2-150,H/2+22,6,'#555570');
    const blink_=Math.floor(fr/25)%2===0;
    if(blink_)tx('Z = Yes    X = No',W/2-100,H/2+52,9,'#f0c830');
  }
}

// ═══════════════════════════════════════
