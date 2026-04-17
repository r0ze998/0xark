// v329: prayer pity lazy cache (key=gachaPityCount)
let _prayerLblCache='',_prayerLblKey=-1;
// v334: gacha result label lazy cache (key=gachaResultCard)
let _gachaRevLblCache='',_gachaRevLblKey=-1;
// v334: reliquary vault label lazy cache (key=vaultSize)
let _reliqVaultLbl='',_reliqVaultKey=-1;
// v257: Pre-computed gacha unique rarities — eliminates Set+spread+sort per gacha render frame
// (GACHA_TIERS defined in 04-state.js, loaded before this file in build order)
const _GACHA_UNIQUE_R=GACHA_TIERS.map(t=>[...new Set(t.rarities)].sort());
const _GACHA_RAR_LBLS=['','Common','Uncommon','Rare','Epic','Legendary'];
const _GACHA_RAR_COLS=['','#50d060','#5090f0','#b060e0','#e0a020','#fff8e0'];
// v244: Pre-baked arc canvases for world interactions
const _puzzleGlowCanvases=(()=>{
  const cols=['#c04040','#4060c0','#d0c040'];
  return cols.map(col=>{
    const c=document.createElement('canvas');c.width=18;c.height=18;
    const ctx=c.getContext('2d');
    ctx.fillStyle=col;ctx.beginPath();ctx.arc(9,9,8,0,Math.PI*2);ctx.fill();
    return c;
  });
})();
const _fishBobberCanvas=(()=>{
  const c=document.createElement('canvas');c.width=8;c.height=8;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#c04040';ctx.beginPath();ctx.arc(4,4,3,0,Math.PI*2);ctx.fill();
  return c;
})();
// ═══════════════════════════════════════
// FISHING MINIGAME (Corsair Bay docks)
// ═══════════════════════════════════════
function canFish(){
  if(currentMap!==0||fishingCooldownTimer>0||inBuilding)return false;
  const p=pl[0],m=getMap();
  // Check if player is on dock and facing water
  const tile=m[p.y]?.[p.x];
  if(tile!==10)return false;
  let fx=p.x,fy=p.y;
  if(p.dir===0)fy++;else if(p.dir===2)fy--;
  else if(p.dir===1)fx--;else if(p.dir===3)fx++;
  if(fx>=0&&fx<MW&&fy>=0&&fy<MH){
    const facingTile=m[fy]?.[fx];
    if(facingTile===0||facingTile===17)return true;
  }
  return false;
}

function startFishing(){
  fishingActive=true;
  fishingPhase='waiting';
  fishingTimer=60+Math.floor(Math.random()*120); // 1-3 seconds at 60fps
  sfxFishCast();
  twSet('Cast a line... wait for it...');
}

function updateFishing(){
  if(!fishingActive)return;
  if(fishingPhase==='waiting'){
    fishingTimer--;
    if(fishingTimer<=0){
      fishingPhase='bite';
      fishingBiteFrame=fr;
      sfxFishBite();
    }
  }else if(fishingPhase==='bite'){
    // Player has 30 frames (0.5s) to press Z
    if(fr-fishingBiteFrame>30){
      fishingPhase='miss';
      fishingTimer=60;
      sfxFishMiss();
      twSet('The catch got away!');
      // v465: escape splash — small ripple burst at bobber position
      {const p=pl[0];let bx_=p.visualX-camX,by_=p.visualY-camY;
      if(p.dir===0){by_+=20;}else if(p.dir===2){by_-=20;}else if(p.dir===1){bx_-=20;}else{bx_+=20;}
      for(let _si=0;_si<5;_si++){
        const _sa=(_si/5)*Math.PI*2;
        particles.push({x:bx_+8,y:by_+4,vx:Math.cos(_sa)*1.2,vy:Math.sin(_sa)*0.8-0.4,life:18+Math.random()*8,c:Math.random()>.5?'rgba(120,180,220,1)':'rgba(200,230,255,1)'});
      }}
    }
  }else if(fishingPhase==='catch'){
    fishingTimer--;
    if(fishingTimer<=0){
      fishingActive=false;
      fishingCooldownTimer=FISHING_COOLDOWN;
    }
  }else if(fishingPhase==='miss'){
    fishingTimer--;
    if(fishingTimer<=0){
      fishingActive=false;
      fishingCooldownTimer=FISHING_COOLDOWN;
    }
  }
}

function fishingCatchCard(){
  fishingPhase='catch';
  fishingTimer=90;
  sfxFishCatch();
  // v465: catch splash — bigger burst in water + upward spray
  {const p=pl[0];let bx_=p.visualX-camX,by_=p.visualY-camY;
  if(p.dir===0){by_+=20;}else if(p.dir===2){by_-=20;}else if(p.dir===1){bx_-=20;}else{bx_+=20;}
  for(let _si=0;_si<10;_si++){
    const _sa=(_si/10)*Math.PI*2;
    const _spd=1.2+Math.random()*1.8;
    particles.push({x:bx_+8,y:by_+4,vx:Math.cos(_sa)*_spd,vy:Math.sin(_sa)*_spd-2,life:20+Math.random()*12,c:Math.random()>.4?'rgba(100,180,240,1)':'rgba(220,240,255,1)'});
  }}
  // Random dock spirit card — prefer vault-new (v299: pickFromPool, no filter alloc)
  const pool=AREA_CARDS[currentMap]||AREA_CARDS[1];
  const cardId=pickFromPool(pool);
  const cardIdx=cardId-1;
  const fAdded=addCardToPlayer(0,cardId); // updates vault + hand
  if(fAdded){
    startCardAcquisition(cardIdx);
    twSet('You caught a '+CD[cardIdx].n+' card!');
    lg.push('Fishing: Caught '+CD[cardIdx].n+'!');
    checkWinAndTransition(2000);
  }else{
    discardActive=true;discardSelIdx=0;discardPendingCard=cardId;discardSource='wild';
    twSet('Caught '+CD[cardIdx].n+'! Discard one to keep it.');
  }
}

function drawFishingOverlay(){
  if(!fishingActive)return;
  if(fishingPhase==='bite'){
    // Show "!" indicator
    const bobY=_sFr30*3; // v369: cached
    const px=pl[0].visualX-camX+8,py=pl[0].visualY-camY-30+bobY;
    bx(px-6,py-4,12,16,'#fff');
    bx(px-5,py-3,10,14,'#f0c830');
    txShadow('!',px-4,py+8,12,'#c04040','rgba(0,0,0,.4)');
    txShadow('Z NOW!',px-18,py+16,5,'#c04040','rgba(0,0,0,.4)');
  }else if(fishingPhase==='waiting'){
    // Show bobber animation
    const px=pl[0].visualX-camX,py=pl[0].visualY-camY;
    let bx_=px,by_=py;
    if(pl[0].dir===0){by_+=20;}else if(pl[0].dir===2){by_-=20;}
    else if(pl[0].dir===1){bx_-=20;}else{bx_+=20;}
    const bob=_sFr10*2; // v370: cached
    g.drawImage(_fishBobberCanvas,(bx_+4+.5)|0,(by_+bob-3+.5)|0);
    // Line from player to bobber
    g.strokeStyle='#a0a0a0';g.lineWidth=1;
    g.beginPath();g.moveTo(px+8,py);g.lineTo(bx_+8,by_+bob);g.stroke();
  }else if(fishingPhase==='catch'){
    // v465: HOOKED! exclamation above player — fades as card acquisition takes over
    const _ca=Math.min(1,fishingTimer/12)*(fishingTimer>60?Math.max(0,(fishingTimer-60)/30)*0:1);
    const _cf=Math.min(1,fishingTimer/20);
    if(_cf>0.01){
      const px=pl[0].visualX-camX,py=pl[0].visualY-camY;
      g.globalAlpha=_cf;
      bx(px-8,py-34,36,14,'rgba(20,80,40,.85)');
      bx(px-8,py-34,36,2,'#60e080');
      txShadow('HOOKED!',px-5,py-22,7,'#80ff90','rgba(0,0,0,.6)');
      g.globalAlpha=1;
    }
  }else if(fishingPhase==='miss'){
    // v465: "MISSED..." label sinking with bobber
    const _ma=fishingTimer/60;
    const _msink=(1-_ma)*8;
    const px=pl[0].visualX-camX,py=pl[0].visualY-camY;
    let bx_=px,by_=py;
    if(pl[0].dir===0){by_+=20;}else if(pl[0].dir===2){by_-=20;}
    else if(pl[0].dir===1){bx_-=20;}else{bx_+=20;}
    g.globalAlpha=_ma*0.8;
    g.drawImage(_fishBobberCanvas,(bx_+4+.5)|0,(by_+_msink-3+.5)|0); // bobber sinking
    g.globalAlpha=_ma;
    bx(px-14,py-30,44,12,'rgba(60,20,20,.85)');
    txShadow('MISSED!',px-11,py-20,7,'#ff6040','rgba(0,0,0,.6)');
    g.globalAlpha=1;
  }
}

// ═══════════════════════════════════════
// FOREST TRAPS
// ═══════════════════════════════════════
function checkForestTrap(){
  if(currentMap!==1)return false;
  const key='1-'+pl[0].x+'-'+pl[0].y;
  if(forestTraps.has(key)&&!triggeredTraps.has(key)){
    triggeredTraps.add(key);
    sfxTrap();
    flash();
    screenShake(5,10); // v463: impact shake on trap trigger
    _trapHitFrame=fr;  // v463: timestamp drives TRAP! banner in drawMap HUD
    triggerCardLostAnim(pl[0].visualX-camX,pl[0].visualY-camY-16); // v463: red burst + floaty minus
    twSet('You triggered a trap!');
    // Reset streak on trap
    if(streakCount>0){streakCount=0;streakLostTimer=60;sfxStreakLost();}
    // Lose a random card
    const filled=[];
    for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)filled.push(i);}
    if(filled.length>0){
      const slot=filled[Math.floor(Math.random()*filled.length)];
      const lost=removeCardFromPlayer(0,slot); // resets cardTimers/decayWarn/stats.cardsLost
      if(lost>0){
      lg.push('Trap! Lost '+CD[lost-1].n+'!');
      objectInteractMsg='Lost '+CD[lost-1].n+' to a trap!';
      objectInteractTimer=120;
      }
    }else{
      lg.push('Trap triggered but you had no cards!');
      objectInteractMsg='Trap triggered! Lucky - no cards to lose.';
      objectInteractTimer=120;
    }
    return true;
  }
  return false;
}

// ═══════════════════════════════════════
// RUINS PUZZLE
// ═══════════════════════════════════════
function checkPuzzleInteraction(){
  if(currentMap!==2||puzzleSolved)return false;
  const p=pl[0];
  let fx=p.x,fy=p.y;
  if(p.dir===0)fy++;else if(p.dir===2)fy--;
  else if(p.dir===1)fx--;else if(p.dir===3)fx++;
  // Check if facing a puzzle pillar
  for(let i=0;i<3;i++){
    const pp=puzzlePillarPositions[i];
    if(fx===pp.x&&fy===pp.y){
      // Cycle stone at position i
      puzzleStoneOrder[i]=(puzzleStoneOrder[i]+1)%3;
      sfxSelect();
      const name=puzzleNames[puzzleStoneOrder[i]];
      puzzleMessage='Stone '+String(i+1)+' is now '+name;
      puzzleMessageTimer=90;
      // Check if solved: 0=red(fire), 1=blue(water), 2=yellow(light)
      if(puzzleStoneOrder[0]===0&&puzzleStoneOrder[1]===1&&puzzleStoneOrder[2]===2){
        puzzleSolved=true;
        sfxPuzzle();
        puzzleMessage='The passage opens!';
        puzzleMessageTimer=180;
        twSet('The passage opens! A void card appears!');
        lg.push('Ruins puzzle solved!');
        // Give a rare card from the current floor pool — prefer vault-new (v299: pickFromPool)
        const pzPool=AREA_CARDS[currentMap]||AREA_CARDS[1];
        const pzCard=pickFromPool(pzPool);
        const pzAdded=addCardToPlayer(0,pzCard); // updates vault + hand
        if(pzAdded){
          startCardAcquisition(pzCard-1);
          checkWinAndTransition(2000);
        }else{
          discardActive=true;discardSelIdx=0;discardPendingCard=pzCard;discardSource='wild';
        }
      }
      return true;
    }
  }
  return false;
}

function drawPuzzlePillars(){
  if(currentMap!==2)return;
  for(let i=0;i<3;i++){
    const pp=puzzlePillarPositions[i];
    const px=pp.x*TW-camX,py=pp.y*TH-camY;
    if(px<-TW||px>W||py<-TH||py>H)continue;
    if(!fogRevealed[2][pp.y]?.[pp.x])continue;
    // Draw colored pillar
    const col=puzzleColors[puzzleStoneOrder[i]];
    if(!puzzleSolved){
      bx(px+4,py+2,8,12,col);
      bx(px+5,py+3,6,10,lighten(col,.15));
      bx(px+3,py,10,3,col);
      // Label
      const label=puzzleNames[puzzleStoneOrder[i]][0];
      txShadow(label,px+5,py+13,5,'#fff','rgba(0,0,0,.4)');
      // v244: pre-baked canvas replaces arc per frame
      const pulse=(_sFr06*_IDX_CI[i*2]+_cFr06*_IDX_SI[i*2])*.2+.4;
      const ci=puzzleStoneOrder[i];
      g.globalAlpha=pulse;
      g.drawImage(_puzzleGlowCanvases[ci],(px+.5)|0,(py+.5)|0);
      g.globalAlpha=1;
    }
  }
}

function drawPuzzleMessage(){
  if(puzzleMessageTimer<=0)return;
  puzzleMessageTimer--;
  const alpha=puzzleMessageTimer>20?1:puzzleMessageTimer/20;
  g.globalAlpha=alpha;
  win(W/2-160,H/2-20,320,36);
  txShadow(puzzleMessage,W/2-140,H/2+4,7,'#d0c040','rgba(0,0,0,.4)');
  g.globalAlpha=1;
}

// ═══════════════════════════════════════
// BUILDING INTERIORS
// ═══════════════════════════════════════
function enterBuilding(type,doorX,doorY){
  buildingType=type;
  buildingReturnX=pl[0].x;
  buildingReturnY=pl[0].y;
  buildingReturnMap=currentMap;
  buildingPlayerX=4;
  buildingPlayerY=6;
  buildingPlayerDir=2;
  sfxDoorOpen();
  // Door opening animation: dark rectangle expanding from door position
  const doorScreenX=doorX*TW-camX+TW/2;
  const doorScreenY=doorY*TH-camY+TH/2;
  startWipe('door_open',20,()=>{
    inBuilding=true;
    startWipe('door_close',15);
  },doorScreenX,doorScreenY);
}

function exitBuilding(){
  sfxDoorOpen();
  // Door close animation then restore map
  startWipe('door_open',15,()=>{
    inBuilding=false;
    pl[0].x=buildingReturnX;
    pl[0].y=buildingReturnY;
    currentMap=buildingReturnMap;
    startWipe('door_close',15,null,W/2,H/2);
  },W/2,H/2);
}

function getBuildingMap(){
  if(buildingType==='shop')return BUILDING_SHOP;
  if(buildingType==='info')return BUILDING_INFO;
  return BUILDING_SHOP;
}

function buildingTileWalkable(t){return t===0||t===4||t===5;}

function checkBuildingEntry(){
  const p=pl[0],m=getMap();
  let fx=p.x,fy=p.y;
  if(p.dir===0)fy++;else if(p.dir===2)fy--;
  else if(p.dir===1)fx--;else if(p.dir===3)fx++;
  if(fx>=0&&fx<MW&&fy>=0&&fy<MH){
    const t=m[fy]?.[fx];
    // Trading Post / Spy Masters Den — tile 5 or 15 at specific locations in town
    if(currentMap===0&&t===5){
      // Check which building: (8,5) is trading post, (22,5)=spy master area -> (22,6 door)
      if(fx===8&&fy===5){enterBuilding('shop',fx,fy);return true;}
      if(fx===20&&fy===11){enterBuilding('shop',fx,fy);return true;}
    }
    if(currentMap===0&&t===15){
      // Blue building = Spy Masters Den
      if(fx===22&&fy===5){enterBuilding('info',fx,fy);return true;}
    }
  }
  return false;
}

function drawBuildingInterior(){
  // Black background
  bx(0,0,W,H,'#1a1a2a');
  const bm=getBuildingMap();
  const tileSize=32; // Larger tiles for interior
  const offsetX=W/2-BUILDING_W*tileSize/2;
  const offsetY=H/2-BUILDING_H*tileSize/2-20;

  for(let y=0;y<BUILDING_H;y++){
    for(let x=0;x<BUILDING_W;x++){
      const t=bm[y][x];
      const px=offsetX+x*tileSize,py=offsetY+y*tileSize;
      if(t===0){
        // Floor
        bx(px,py,tileSize,tileSize,'#c0b090');
        bx(px,py,tileSize,1,'#d0c0a0');
        if((x+y)%2===0)bx(px,py,tileSize,tileSize,'rgba(0,0,0,.04)');
      }else if(t===1){
        // Wall
        bx(px,py,tileSize,tileSize,'#605848');
        bx(px+1,py+1,tileSize-2,tileSize-2,'#706858');
        // Brick pattern
        for(let by=0;by<tileSize;by+=8){
          for(let bxx=0;bxx<tileSize;bxx+=12){
            bx(px+bxx,py+by,11,7,'#786858');
          }
        }
      }else if(t===2){
        // Counter
        bx(px,py,tileSize,tileSize,'#c0b090');
        bx(px,py+4,tileSize,tileSize-4,'#805830');
        bx(px+1,py+5,tileSize-2,tileSize-6,'#906838');
        bx(px,py+4,tileSize,2,'#a07840');
      }else if(t===3){
        // Shelf
        bx(px,py,tileSize,tileSize,'#706858');
        bx(px+2,py+4,tileSize-4,6,'#805830');
        bx(px+2,py+16,tileSize-4,6,'#805830');
        // Card displays on shelf
        for(let i=0;i<3;i++){
          const cx=px+4+i*9,cy=py+5;
          const cr=CD[i%5];
          bx(cx,cy-2,7,4,cr.c);
          bx(cx,cy+10,7,4,cr.c);
        }
      }else if(t===4){
        // Exit door
        bx(px,py,tileSize,tileSize,'#c0b090');
        bx(px+4,py,tileSize-8,tileSize,'#483838');
        bx(px+6,py+2,tileSize-12,tileSize-4,'#382828');
        // Arrow indicator
        const bob=_sFr10*2; // v370: cached
        txShadow('EXIT',px+4,py+tileSize/2+4+bob,5,'#f0c830','rgba(0,0,0,.4)');
      }else if(t===5){
        // NPC position (floor underneath)
        bx(px,py,tileSize,tileSize,'#c0b090');
        if((x+y)%2===0)bx(px,py,tileSize,tileSize,'rgba(0,0,0,.04)');
      }
    }
  }

  // Draw NPC in building — pixel art characters
  const npcX=4,npcY=4;
  const npx=offsetX+npcX*tileSize,npy=offsetY+npcY*tileSize;
  const bobY=_sFr08*1.5;
  if(buildingType==='shop'){
    // ── Merchant (Elara) — purple robe, hat, ledger ──
    // Shadow
    g.globalAlpha=0.2;bx(npx+5,npy+27,22,4,'#000000');g.globalAlpha=1;
    // Boots
    bx(npx+9,npy+23+bobY,6,4,'#3a1f10');bx(npx+17,npy+23+bobY,6,4,'#3a1f10');
    // Robe skirt
    bx(npx+7,npy+17+bobY,18,7,'#6038a0');bx(npx+8,npy+18+bobY,16,5,'#7048b0');
    // Belt
    bx(npx+6,npy+17+bobY,20,2,'#806020');bx(npx+13,npy+17+bobY,6,2,'#c0a030');
    // Robe body
    bx(npx+8,npy+9+bobY,16,10,'#7048b0');bx(npx+9,npy+10+bobY,14,8,'#8058c0');
    // Left arm + hand (holding ledger)
    bx(npx+4,npy+10+bobY,5,8,'#6038a0');bx(npx+2,npy+16+bobY,7,5,'#f0c090');
    // Ledger book
    bx(npx+2,npy+17+bobY,8,5,'#804020');bx(npx+3,npy+18+bobY,6,3,'#f8f4e0');
    bx(npx+4,npy+19+bobY,4,1,'#a06030');
    // Right arm
    bx(npx+23,npy+10+bobY,5,8,'#6038a0');bx(npx+23,npy+16+bobY,6,5,'#f0c090');
    // Neck
    bx(npx+12,npy+8+bobY,8,3,'#f0c090');
    // Head
    bx(npx+9,npy+1+bobY,14,9,'#f0c090');bx(npx+10,npy+2+bobY,12,7,'#f8d0a0');
    // Hair (curly sides)
    bx(npx+8,npy+1+bobY,3,6,'#2a1608');bx(npx+21,npy+1+bobY,3,6,'#2a1608');
    // Hat brim
    bx(npx+6,npy-1+bobY,20,3,'#402880');bx(npx+5,npy,22,2,'#5038a0');
    // Hat top
    bx(npx+9,npy-5+bobY,14,5,'#5038a0');bx(npx+10,npy-4+bobY,12,3,'#6048b0');
    // Hat band + buckle
    bx(npx+9,npy-1+bobY,14,2,'#c0a020');bx(npx+14,npy-2+bobY,4,3,'#e0c030');
    // Eyes + shine
    bx(npx+11,npy+4+bobY,3,2,'#282018');bx(npx+18,npy+4+bobY,3,2,'#282018');
    bx(npx+12,npy+4+bobY,1,1,'#ffffff');bx(npx+19,npy+4+bobY,1,1,'#ffffff');
    // Rosy cheeks + smile
    g.globalAlpha=0.4;bx(npx+10,npy+6+bobY,3,2,'#e06050');bx(npx+19,npy+6+bobY,3,2,'#e06050');g.globalAlpha=1;
    bx(npx+12,npy+7+bobY,8,1,'#c07060');
    // Torch on wall (atmospheric flicker)
    const torchFlick=Math.floor(fr/4)%2;
    bx(npx+28,npy-12,4,8,'#805030');bx(npx+29,npy-12,2,8,'#a06838');
    g.globalAlpha=0.7+torchFlick*0.2;bx(npx+27,npy-14-torchFlick,6,3,'#f0a020');g.globalAlpha=1;
    g.globalAlpha=0.4;bx(npx+28,npy-16-torchFlick,4,3,'#f8e060');g.globalAlpha=1;
  }else{
    // ── Info Broker (Sable) — hooded cloak, glowing eyes, dagger ──
    g.globalAlpha=0.2;bx(npx+5,npy+27,22,4,'#000000');g.globalAlpha=1;
    // Cloak bottom
    bx(npx+5,npy+18+bobY,22,8,'#1a2430');bx(npx+7,npy+19+bobY,18,6,'#1e2c3c');
    // Cloak body
    bx(npx+6,npy+9+bobY,20,11,'#22303e');bx(npx+7,npy+10+bobY,18,9,'#263848');
    // Collar
    bx(npx+9,npy+8+bobY,14,3,'#1a2430');
    // Left arm (hidden in cloak)
    bx(npx+3,npy+10+bobY,5,12,'#1a2430');
    // Right arm (dagger visible)
    bx(npx+24,npy+10+bobY,5,12,'#1a2430');
    // Dagger hilt
    bx(npx+24,npy+15+bobY,5,2,'#b09020');bx(npx+25,npy+11+bobY,3,5,'#707880');
    // Hood (deep shadow)
    bx(npx+7,npy-1+bobY,18,12,'#151e2a');bx(npx+8,npy+0+bobY,16,11,'#0e1622');
    // Face in shadow
    bx(npx+10,npy+3+bobY,12,7,'#a07858');bx(npx+11,npy+4+bobY,10,5,'#b08868');
    // Glowing eyes (blue-white, eerie)
    bx(npx+11,npy+5+bobY,3,2,'#60b0e0');bx(npx+18,npy+5+bobY,3,2,'#60b0e0');
    g.globalAlpha=0.6+_sFr04*0.3;bx(npx+10,npy+5+bobY,5,2,'rgba(80,160,220,.3)');bx(npx+17,npy+5+bobY,5,2,'rgba(80,160,220,.3)');g.globalAlpha=1;
    // Hood cowl peak
    bx(npx+9,npy-3+bobY,14,4,'#151e2a');bx(npx+11,npy-6+bobY,10,4,'#101820');
    // Cloak hood shadow details
    bx(npx+7,npy-2+bobY,3,8,'#0e1622');bx(npx+22,npy-2+bobY,3,8,'#0e1622');
    // Atmospheric candle (small, dim)
    bx(npx-4,npy-10,3,12,'#7a6040');
    const cFlick=Math.floor(fr/5)%2;
    g.globalAlpha=0.5+cFlick*0.2;bx(npx-5,npy-12-cFlick,5,3,'#e09020');g.globalAlpha=1;
    g.globalAlpha=0.25;bx(npx-4,npy-14-cFlick,3,3,'#f8e060');g.globalAlpha=1;
  }
  // Floating diamond indicator above NPC
  bx(npx+14,npy-12+bobY,4,4,buildingType==='shop'?'#4080d0':'#40b060');
  g.globalAlpha=0.4;bx(npx+13,npy-13+bobY,6,6,buildingType==='shop'?'#2060b0':'#208060');g.globalAlpha=1;

  // Draw player in building — detail sprite
  const ppx=offsetX+buildingPlayerX*tileSize,ppy=offsetY+buildingPlayerY*tileSize;
  const pDir=buildingPlayerDir||0;
  // Shadow
  g.globalAlpha=0.2;bx(ppx+6,ppy+27,20,4,'#000000');g.globalAlpha=1;
  // Boots
  bx(ppx+9,ppy+22,6,4,'#302040');bx(ppx+17,ppy+22,6,4,'#302040');
  // Pants
  bx(ppx+9,ppy+13,6,10,'#4050a0');bx(ppx+17,ppy+13,6,10,'#4050a0');
  // Belt
  bx(ppx+7,ppy+13,18,2,'#503020');bx(ppx+13,ppy+13,6,2,'#a07020');
  // Shirt
  bx(ppx+8,ppy+5,16,10,'#4080d0');bx(ppx+9,ppy+6,14,8,'#5090e0');
  // Arms
  bx(ppx+5,ppy+6,5,9,'#4080d0');bx(ppx+22,ppy+6,5,9,'#4080d0');
  // Hands
  bx(ppx+4,ppy+13,5,4,'#f0dcc0');bx(ppx+23,ppy+13,5,4,'#f0dcc0');
  // Head
  bx(ppx+9,ppy,14,8,'#f0dcc0');bx(ppx+10,ppy+1,12,6,'#f8e0c0');
  // Hair
  bx(ppx+8,ppy-2,16,4,'#282830');bx(ppx+9,ppy-1,14,3,'#383840');
  // Eyes (front-facing always shown)
  bx(ppx+11,ppy+3,3,2,'#181820');bx(ppx+18,ppy+3,3,2,'#181820');
  bx(ppx+12,ppy+3,1,1,'#ffffff');bx(ppx+19,ppy+3,1,1,'#ffffff');

  // HUD for building
  const hudY=H-40;
  win(0,hudY,W,40);
  txShadow(buildingType==='shop'?'TRADING POST':'SPY MASTERS DEN',10,hudY+20,8,'#806030','rgba(0,0,0,.4)');
  if(buildingType==='info'){
    const statusClr=x402Available?'#40a060':'#605060';
    const statusTxt=x402Available?'x402 ONLINE':'x402 OFFLINE';
    txShadow(statusTxt,140,hudY+20,5,statusClr,'rgba(0,0,0,.35)');
  }
  txShadow('Z=Interact  X=Exit  Arrows=Move',280,hudY+20,6,'#686068','rgba(0,0,0,.35)');

  // Building NPC dialog
  if(buildingNpcDialog){
    const line=buildingNpcLines[buildingNpcIdx]||'';
    const line2=buildingNpcLines[buildingNpcIdx+1]||'';
    win(6,H-120,W-12,70);
    win(10,H-130,buildingNpcName.length*9+20,20);
    txShadow(buildingNpcName,20,H-115,7,'#c04040','rgba(0,0,0,.4)');
    txShadow(line,20,H-90,7,'#303028','rgba(255,255,255,.15)');
    if(line2)txShadow(line2,20,H-72,7,'#303028','rgba(255,255,255,.15)');
    const arrowBounce=_sFr15*2; // v369: cached
    txShadow('\u25BC',W-24,H-58+arrowBounce,7,'#c04040','rgba(0,0,0,.4)');
  }

  // Info broker confirm/result
  if(infoBrokerConfirm){
    bx(0,0,W,H,'rgba(0,0,0,.4)');
    win(W/2-180,H/2-60,360,120);
    txShadow('Pay 1 card for rival locations?',W/2-160,H/2-30,7,'#303028','rgba(255,255,255,.15)');
    txShadow('Z=Yes  X=No',W/2-60,H/2+10,7,'#c04040','rgba(0,0,0,.4)');
  }
  if(infoBrokerResultTimer>0){
    infoBrokerResultTimer--;
    const a=infoBrokerResultTimer>20?1:infoBrokerResultTimer/20;
    g.globalAlpha=a;
    win(W/2-200,H/2-40,400,80);
    // Word wrap
    const maxC=46;
    let l1=infoBrokerResult,l2='';
    if(infoBrokerResult.length>maxC){
      let brk=infoBrokerResult.lastIndexOf(' ',maxC);
      if(brk<1)brk=maxC;
      l1=infoBrokerResult.substring(0,brk);
      l2=infoBrokerResult.substring(brk+1);
    }
    txShadow(l1,W/2-180,H/2-10,7,'#303028','rgba(255,255,255,.15)');
    if(l2)txShadow(l2,W/2-180,H/2+8,7,'#303028','rgba(255,255,255,.15)');
    g.globalAlpha=1;
  }

  // ── GACHA OVERLAY ──
  if(gachaActive){
    bx(0,0,W,H,'rgba(0,0,0,.7)');
    const gw=400,gh=340,gx=W/2-gw/2,gy=H/2-gh/2;
    win(gx,gy,gw,gh);
    // Header — rune glow behind title
    bx(gx,gy,gw,28,'#100820');
    g.globalAlpha=0.25+_sFr06*0.12;bx(gx,gy,gw,28,ARK.rune);g.globalAlpha=1; // v370: cached
    txShadow('RUNE SUMMON',gx+gw/2-68,gy+20,12,'#f8c840','rgba(0,0,0,.5)');
    // Vault progress
    const vSize=pl[0].vault?pl[0].vault.size:0;
    if(_reliqVaultKey!==vSize){_reliqVaultKey=vSize;_reliqVaultLbl='Reliquary: '+(_UNIQ60[vSize]||(vSize+'/60'));} // v334: lazy
  txShadow(_reliqVaultLbl,gx+8,gy+40,7,'#c8c0a0','rgba(0,0,0,.3)');

    if(gachaPhase==='menu'){
      txShadow('Choose a ritual:',gx+16,gy+58,8,'#d0c8a0','rgba(0,0,0,.3)');
      for(let i=0;i<GACHA_TIERS.length;i++){
        const t=GACHA_TIERS[i];const isSelected=gachaSelectedTier===i;
        const ty_=gy+76+i*62;
        bx(gx+12,ty_,gw-24,54,isSelected?'#2a2a50':'#181828');
        if(isSelected)bx(gx+12,ty_,gw-24,54,'rgba(248,200,64,.08)');
        bx(gx+12,ty_,3,54,isSelected?'#f8c840':'#3a3a60');
        txShadow(t.name,gx+22,ty_+14,9,isSelected?'#f8f0e0':'#b0a8c0',isSelected?'rgba(0,0,0,.4)':'rgba(0,0,0,.2)');
        txShadow(t.label,gx+22,ty_+28,8,'#f0c040','rgba(0,0,0,.3)');
        // Rarity preview dots (_GACHA_UNIQUE_R pre-computed at module scope)
        const uniqueR=_GACHA_UNIQUE_R[i];
        for(let ri=0;ri<uniqueR.length;ri++){
          const r=uniqueR[ri];const dotX=gx+gw-80+ri*14;
          bx(dotX,ty_+14,10,10,RARITY_COLOR[r]);
          txShadow('\u2605',dotX,ty_+25,5,RARITY_COLOR[r],'rgba(0,0,0,.3)');
        }
        if(isSelected)txShadow('\u25b6',gx+gw-30,ty_+26,8,'#f8c840','rgba(0,0,0,.35)');
      }
      bx(gx+12,gy+gh-44,gw-24,1,'#282848');
      // Pity counter
      const pityLeft=GACHA_PITY_THRESHOLD-gachaPityCount;
      const pityCol=gachaPityCount>=7?'#f0c830':gachaPityCount>=4?'#e08040':'#686878';
      if(_prayerLblKey!==gachaPityCount){_prayerLblKey=gachaPityCount;_prayerLblCache='PRAYER: '+gachaPityCount+'/'+GACHA_PITY_THRESHOLD+(pityLeft<=3?' \u2014 RELIC NEARS!':'');} // v329: lazy
      txShadow(_prayerLblCache,gx+16,gy+gh-40,6,pityCol,'rgba(0,0,0,.3)');
      txShadow('[Z] Invoke   [X] Retreat',gx+16,gy+gh-26,7,'#8888a0','rgba(0,0,0,.3)');
      // Pull history panel (right of main panel)
      if(gachaHistory.length>0){
        const hx=gx+gw+8,hy=gy,hw=180,hh=gh;
        win(hx,hy,hw,hh);
        bx(hx,hy,hw,28,'#1a1a30');
        bx(hx,hy,4,28,'#c8b870'); // gold left accent
        txShadow('RECENT',hx+hw/2-36,hy+20,11,'#c8b870','rgba(0,0,0,.4)');
        bx(hx,hy+28,hw,1,'#282848');
        // _GACHA_RAR_LBLS/_GACHA_RAR_COLS hoisted to module scope
        for(let i=0;i<gachaHistory.length;i++){
          const h=gachaHistory[i];const hy2=hy+36+i*36;
          const cr3=CD[h.cardId-1];if(!cr3)continue;
          const rcol3=_GACHA_RAR_COLS[h.rarity]||'#888888';
          bx(hx+10,hy2-6,10,10,rcol3);
          const nm=cr3.n.length>14?cr3.n.substring(0,13)+'.':cr3.n;
          txShadow(nm,hx+26,hy2+2,7,i===0?'#f8f0e0':'#909090','rgba(0,0,0,.3)');
          txShadow(_GACHA_RAR_LBLS[h.rarity]||'',hx+26,hy2+14,5,rcol3,'rgba(0,0,0,.3)');
        }
      }
    }else if(gachaPhase==='spinning'){
      gachaSpinFrame++;
      const sf=gachaSpinFrame;
      // Know the result card already — use its rarity for color teaser
      const resultCr=gachaResultCard>0?CD[gachaResultCard-1]:null;
      const rar=resultCr?resultCr.r:1;
      const rarCol=RARITY_COLOR[rar]||'#f8c840';
      const cx_=W/2,cy_=H/2-20;
      // Phase 1 (0-30): Dark energy sphere gathering
      if(sf<30){
        const grow=sf/30;
        const pulse=0.5+0.5*Math.sin(sf*0.4);
        // Pulsing dark sphere
        const r1=20+grow*30;
        const grd=g.createRadialGradient(cx_,cy_,0,cx_,cy_,r1);
        grd.addColorStop(0,'rgba(40,20,80,.8)');
        grd.addColorStop(0.7,'rgba(20,10,40,.6)');
        grd.addColorStop(1,'rgba(0,0,0,0)');
        g.fillStyle=grd;g.fillRect(cx_-r1-5,cy_-r1-5,r1*2+10,r1*2+10);
        // Energy sparks converging — v394: sin-addition with _ORB_SI8/CI8 (16→2 trig calls)
        {const _g1S=Math.sin(sf*0.1),_g1C=Math.cos(sf*0.1),_gd=(1-grow)*80+8;
        g.globalAlpha=pulse*.8;g.fillStyle='#7850dc';
        for(let i=0;i<8;i++){
          const _ac=_g1C*_ORB_CI8[i]-_g1S*_ORB_SI8[i];
          const _as=_g1S*_ORB_CI8[i]+_g1C*_ORB_SI8[i];
          g.fillRect(cx_+_ac*_gd-2,cy_+_as*_gd-2,4,4);
        }}
        g.globalAlpha=1;
        txShadow('DRAWING...',cx_-52,cy_+62,9,'#6060a0','rgba(0,0,0,.5)');
      }
      // Phase 2 (30-55): Sphere cracks — rarity color teaser
      else if(sf<55){
        const prog=(sf-30)/25;
        const glowR=50+prog*20;
        // v264: removed dead createRadialGradient (was computed but never set as fillStyle)
        // Draw color rings showing rarity
        g.strokeStyle=rarCol;g.lineWidth=2+prog*4;
        g.globalAlpha=prog*0.5;
        g.beginPath();g.arc(cx_,cy_,glowR*0.6,0,Math.PI*2);g.stroke();
        g.beginPath();g.arc(cx_,cy_,glowR*0.3,0,Math.PI*2);g.stroke();
        g.globalAlpha=1;
        // Pulsing ? symbol in rarity color
        const qPulse=0.5+0.5*Math.sin(sf*0.5);
        g.globalAlpha=qPulse;
        txShadow('?',cx_-12,cy_+12,24,rarCol,'rgba(0,0,0,.6)');
        g.globalAlpha=1;
        txShadow('Something is emerging...',cx_-88,cy_+62,8,rarCol,'rgba(0,0,0,.4)');
      }
      // Phase 3 (55-75): Card silhouette materializes
      else if(sf<75){
        const prog=(sf-55)/20;
        const cardW_=80,cardH_=110;
        const cardX_=cx_-cardW_/2,cardY_=cy_-cardH_/2;
        // Silhouette (dark with rarity border)
        bx(cardX_,cardY_,cardW_,cardH_,rarCol);
        bx(cardX_+2,cardY_+2,cardW_-4,cardH_-4,'#0c0c20');
        // Rarity color seeps in proportionally
        g.globalAlpha=prog;
        if(gachaResultCard>0){drawCardFrame(cardX_,cardY_,cardW_,cardH_,gachaResultCard-1,true);}
        g.globalAlpha=1;
        // Rarity burst sparks — v394: sin-addition with _ORB_SI6/CI6 (12→2 trig calls)
        {const _g3S=Math.sin(sf*0.12),_g3C=Math.cos(sf*0.12),_gd3=60+prog*30;
        g.globalAlpha=0.8*(1-prog)*0.5;g.fillStyle=rarCol;
        for(let i=0;i<6;i++){
          const _ac=_g3C*_ORB_CI6[i]-_g3S*_ORB_SI6[i];
          const _as=_g3S*_ORB_CI6[i]+_g3C*_ORB_SI6[i];
          g.fillRect(cx_+_ac*_gd3-3,cy_+_as*_gd3-3,6,6);
        }
        g.globalAlpha=1;}
      }
      // Transition to result
      if(sf>=75){
        gachaPhase='result';gachaResultFrame=fr;
        if(rar>=4)screenShake(rar-2,rar*3);
        if(rar>=5)flash();
      }
    }else if(gachaPhase==='result'&&gachaResultCard>0){
      const t2=fr-gachaResultFrame;
      const cr=CD[gachaResultCard-1];
      const slideIn=Math.min(1,t2/20);
      g.globalAlpha=slideIn;
      // Card display
      const cardX=W/2-50,cardY=H/2-70;
      drawCardFrame(cardX,cardY,100,130,gachaResultCard-1,true);
      // Rarity label
      bx(gx+gw/2-60,gy+gh-90,120,20,RARITY_COLOR[cr.r]+'33');
      if(_gachaRevLblKey!==gachaResultCard){_gachaRevLblKey=gachaResultCard;_gachaRevLblCache=RARITY_LABEL[cr.r]+'  '+cr.n;} // v334: lazy
      txShadow(_gachaRevLblCache,gx+gw/2-56,gy+gh-76,9,RARITY_COLOR[cr.r],'rgba(0,0,0,.5)');
      // Is new?
      const isNew=!pl[0].vault||!pl[0].vault.has(gachaResultCard);
      if(isNew&&t2>15){txShadow('NEW!',W/2+40,H/2-60,12,'#f0c830','rgba(0,0,0,.6)');}
      // Pity pull indicator
      if(gachaPityTriggered&&t2>20){
        const ppA=Math.min(1,(t2-20)/8);g.globalAlpha=ppA;
        txShadow('PITY PULL!',gx+gw/2-50,gy+gh-54,10,'#f0c830','rgba(0,0,0,.5)');
        g.globalAlpha=1;
      }
      g.globalAlpha=1;
      if(t2>30){txShadow('[Z] Take   [X] Close',gx+16,gy+gh-36,7,'#8888a0','rgba(0,0,0,.3)');}
    }
  }

  // x402 shop overlay (v189: txShadow polish)
  if(x402ShopOpen){
    bx(0,0,W,H,'rgba(0,0,0,.5)');
    const shopW=440,shopH=x402ShopItems.length*26+80;
    const sx=W/2-shopW/2,sy=H/2-shopH/2;
    win(sx,sy,shopW,shopH);
    bx(sx,sy,shopW,28,'#1a0a0a');
    bx(sx,sy,4,28,'#c04040');
    txShadow('BUY INTEL',sx+shopW/2-40,sy+20,9,'#c04040','rgba(0,0,0,.5)');
    if(x402Available){
      txShadow('x402 ONLINE',sx+shopW-104,sy+14,5,'#40a060','rgba(0,0,0,.3)');
      txShadow(x402ServerUrl,sx+shopW-104,sy+24,4,'#306840','rgba(0,0,0,.3)');
    }else{
      txShadow('OFFLINE',sx+shopW-82,sy+18,5,'#a04040','rgba(0,0,0,.3)');
    }
    for(let i=0;i<x402ShopItems.length;i++){
      const item=x402ShopItems[i];
      const iy=sy+38+i*26;
      const sel=i===x402ShopIdx;
      if(sel){bx(sx+8,iy-4,shopW-16,22,'rgba(60,60,100,.35)');bx(sx+8,iy-4,3,22,'#c04040');}
      txShadow((sel?'\u25b6 ':' ')+item.label,sx+16,iy+8,7,sel?'#e0d8f0':'#808098','rgba(0,0,0,.3)');
      const displayPrice=x402Available?item.price:(item.priceOffline||item.price);
      const priceCol=item.cardCost===0?'#40a060':'#c08040';
      txShadow(displayPrice,sx+shopW-120,iy+8,6,priceCol,'rgba(0,0,0,.3)');
      if(x402Available&&!item.isInfo){
        txShadow(item.endpoint,sx+shopW-120,iy+16,4,'#505070','rgba(0,0,0,.2)');
      }
    }
    txShadow('[Z] Buy   [X] Close',sx+shopW/2-64,sy+shopH-18,6,'#8888a0','rgba(0,0,0,.3)');
    if(x402ShopLoading){
      bx(0,0,W,H,'rgba(0,0,0,.3)');
      txShadow('Fetching intel...',W/2-70,H/2,8,'#80c0e0','rgba(0,0,0,.4)');
    }
  }
  // x402 "HOW IT WORKS" info overlay
  if(x402HowItWorksActive){
    bx(0,0,W,H,'rgba(0,0,0,.6)');
    const iw=440,ih=x402HowItWorksText.length*18+50;
    const ix=W/2-iw/2,iy=H/2-ih/2;
    win(ix,iy,iw,ih);
    bx(ix,iy,iw,28,'#061a12');bx(ix,iy,4,28,'#14F195');
    txShadow('HOW x402 WORKS',ix+iw/2-70,iy+20,9,'#14F195','rgba(0,0,0,.5)');
    for(let i=0;i<x402HowItWorksText.length;i++){
      txShadow(x402HowItWorksText[i],ix+20,iy+44+i*18,6,'#b0c0c8','rgba(0,0,0,.3)');
    }
    txShadow('[Z] / [X] Close',ix+iw/2-56,iy+ih-16,6,'#508878','rgba(0,0,0,.3)');
  }
  // AGENT MARKETPLACE overlay
  if(agentMarketplaceActive){
    bx(0,0,W,H,'rgba(0,0,0,.6)');
    const amw=440,amh=agentMarketplaceText.length*18+50;
    const amx=W/2-amw/2,amy=H/2-amh/2;
    win(amx,amy,amw,amh);
    bx(amx,amy,amw,28,'#10081a');bx(amx,amy,4,28,'#9945FF');
    txShadow('AGENT MARKETPLACE',amx+amw/2-80,amy+20,9,'#9945FF','rgba(0,0,0,.5)');
    for(let i=0;i<agentMarketplaceText.length;i++){
      txShadow(agentMarketplaceText[i],amx+20,amy+44+i*18,6,'#b0a8c8','rgba(0,0,0,.3)');
    }
    txShadow('[Z] / [X] Close',amx+amw/2-56,amy+amh-16,6,'#706898','rgba(0,0,0,.3)');
  }

  // x402 shop result overlay
  if(x402ShopResultTimer>0&&!x402ShopOpen){
    x402ShopResultTimer--;
    const a=x402ShopResultTimer>20?1:x402ShopResultTimer/20;
    g.globalAlpha=a;
    win(W/2-220,H/2-50,440,100);
    txShadow('INTEL REPORT',W/2-50,H/2-30,8,'#c04040','rgba(0,0,0,.4)');
    // Word wrap the result
    const maxC2=52;
    const rr=x402ShopResult;
    let rl1=rr,rl2='',rl3='';
    if(rr.length>maxC2){
      let b=rr.lastIndexOf(' ',maxC2);if(b<1)b=maxC2;
      rl1=rr.substring(0,b);const rest=rr.substring(b+1);
      if(rest.length>maxC2){let b2=rest.lastIndexOf(' ',maxC2);if(b2<1)b2=maxC2;rl2=rest.substring(0,b2);rl3=rest.substring(b2+1);}
      else rl2=rest;
    }
    txShadow(rl1,W/2-200,H/2-8,6,'#303028','rgba(255,255,255,.15)');
    if(rl2)txShadow(rl2,W/2-200,H/2+8,6,'#303028','rgba(255,255,255,.15)');
    if(rl3)txShadow(rl3,W/2-200,H/2+24,6,'#303028','rgba(255,255,255,.15)');
    g.globalAlpha=1;
  }
}

// ═══════════════════════════════════════
// INTERACTABLE OBJECTS
// ═══════════════════════════════════════
function getFacingTile(){
  const p=pl[0],m=getMap();
  let fx=p.x,fy=p.y;
  if(p.dir===0)fy++;else if(p.dir===2)fy--;
  else if(p.dir===1)fx--;else if(p.dir===3)fx++;
  if(fx>=0&&fx<MW&&fy>=0&&fy<MH)return{x:fx,y:fy,tile:m[fy]?.[fx]};
  return null;
}

function checkObjectInteraction(){
  const ft=getFacingTile();
  if(!ft)return false;
  const key=currentMap+'-'+ft.x+'-'+ft.y;

  // Tree interaction (type 3)
  if(ft.tile===3){
    if(shakenTrees.has(key)){
      objectInteractMsg='Already shaken this tree.';
      objectInteractTimer=60;
      return true;
    }
    shakenTrees.add(key);
    if(Math.random()<0.1){
      // 10% chance: card falls out — prefer vault-new (v299: pickFromPool)
      const treePool=AREA_CARDS[currentMap]||AREA_CARDS[1];
      const treeCardId=pickFromPool(treePool);
      const cardIdx=treeCardId-1;
      const treeAdded=addCardToPlayer(0,treeCardId); // updates vault + hand
      if(treeAdded){
        startCardAcquisition(cardIdx);
        objectInteractMsg='A card fell from the tree!';
        lg.push('Shook tree: Found '+CD[cardIdx].n+'!');
        checkWinAndTransition(2000);
      }else{
        discardActive=true;discardSelIdx=0;discardPendingCard=treeCardId;discardSource='wild';
        objectInteractMsg='Found '+CD[cardIdx].n+'! Discard to keep.';
      }
    }else{
      objectInteractMsg='Nothing fell from the tree.';
    }
    objectInteractTimer=90;
    sfxSelect();
    return true;
  }

  // Rock interaction (type 8)
  if(ft.tile===8){
    if(pushedRocks.has(key)){
      objectInteractMsg='Already checked this rock.';
      objectInteractTimer=60;
      return true;
    }
    pushedRocks.add(key);
    sfxSelect();
    if(Math.random()<0.2){
      const areaCards=AREA_CARDS[currentMap]||AREA_CARDS[1];
      const cardId=pickFromPool(areaCards); // v299: pickFromPool, no filter alloc
      const rockAdded=addCardToPlayer(0,cardId); // updates vault + hand
      if(rockAdded){
        startCardAcquisition(cardId-1);
        objectInteractMsg='Found a hidden card under the rock!';
        lg.push('Rock: Found '+CD[cardId-1].n+'!');
        checkWinAndTransition(2000);
      }else{
        discardActive=true;discardSelIdx=0;discardPendingCard=cardId;discardSource='wild';
        objectInteractMsg='Found '+CD[cardId-1].n+'! Discard to keep.';
      }
    }else{
      objectInteractMsg='Nothing under the rock.';
    }
    objectInteractTimer=90;
    return true;
  }

  // Campfire interaction (type 29, Forest only)
  if(ft.tile===29&&currentMap===1){
    if(campfireUsed){
      objectInteractMsg='Already rested here.';
      objectInteractTimer=60;
      return true;
    }
    campfireUsed=true;
    sfxConfirm();
    // Restore 1 spell charge: rotate Steal->Barrier->Scout
    if(sp.s<3){sp.s++;objectInteractMsg='Rested by campfire. +1 Steal charge!';lg.push('Campfire: +1 Steal!');}
    else if(sp.b<3){sp.b++;objectInteractMsg='Rested by campfire. +1 Barrier charge!';lg.push('Campfire: +1 Barrier!');}
    else if(sp.c<3){sp.c++;objectInteractMsg='Rested by campfire. +1 Scout charge!';lg.push('Campfire: +1 Scout!');}
    else{
      // All spells full — extend nearest-to-expiry card timer by 60s
      let nearestSlot=-1,nearestAge=0;
      for(let i=0;i<HAND_SIZE;i++){if(cardTimers[i]>0){const age=Date.now()-cardTimers[i];if(age>nearestAge){nearestAge=age;nearestSlot=i;}}}
      if(nearestSlot>=0){cardTimers[nearestSlot]+=60000;objectInteractMsg='Rested. '+CD[pl[0].cd[nearestSlot]-1].n+' decay slowed!';lg.push('Campfire: Extended '+CD[pl[0].cd[nearestSlot]-1].n+' timer!');}
      else{objectInteractMsg='Rested, but nothing to restore.';}
    }
    objectInteractTimer=120;
    return true;
  }

  // Fountain interaction (type 20, Corsair Bay)
  if(ft.tile===20&&currentMap===0){
    const filled=[];
    for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)filled.push(i);}
    if(filled.length===0){
      objectInteractMsg='Toss a card? You have none!';
      objectInteractTimer=90;
      return true;
    }
    fountainActive=true;
    fountainConfirm=true;
    sfxSelect();
    return true;
  }

  // Crystal interaction (type 26, any dungeon floor)
  if(ft.tile===26&&inDungeon){
    if(usedCrystals.has(key)){
      objectInteractMsg='This crystal is spent.';
      objectInteractTimer=60;
      return true;
    }
    usedCrystals.add(key);
    sfxSelect();
    if(Math.random()<0.5){
      // Reveal rivals on minimap for 60 seconds (3600 frames)
      crystalRevealTimer=3600;
      objectInteractMsg='The crystal glows! Rivals revealed!';
      lg.push('Crystal: Rivals revealed for 60s!');
    }else{
      objectInteractMsg='The crystal shattered! Nothing happened.';
      lg.push('Crystal shattered.');
    }
    objectInteractTimer=120;
    flash();
    return true;
  }

  // Altar interaction (type 27, deep dungeon floors 3-5)
  if(ft.tile===27&&inDungeon){
    if(usedCrystals.has(key+'_altar')){
      objectInteractMsg='The altar is silent.';
      objectInteractTimer=60;
      return true;
    }
    usedCrystals.add(key+'_altar');
    sfxSelect();flash();
    const roll=Math.random();
    if(roll<0.4){
      // Restore a spell charge (prayer answered)
      if(sp.s<3){sp.s++;objectInteractMsg='The altar hums. +1 Steal charge!';lg.push('Altar: +1 Steal!');}
      else if(sp.b<3){sp.b++;objectInteractMsg='The altar hums. +1 Barrier charge!';lg.push('Altar: +1 Barrier!');}
      else{sp.c=Math.min(3,sp.c+1);objectInteractMsg='The altar hums. +1 Scout charge!';lg.push('Altar: +1 Scout!');}
    }else if(roll<0.7){
      // Extend decay on the most-decayed card
      let nearestSlot=-1,nearestAge=0;
      for(let i=0;i<HAND_SIZE;i++){if(cardTimers[i]>0){const age=Date.now()-cardTimers[i];if(age>nearestAge){nearestAge=age;nearestSlot=i;}}}
      if(nearestSlot>=0&&pl[0].cd[nearestSlot]>0){
        cardTimers[nearestSlot]+=90000; // +1.5 min extra
        objectInteractMsg='The altar preserved '+CD[pl[0].cd[nearestSlot]-1].n+'! +1.5min';
        lg.push('Altar: Extended '+CD[pl[0].cd[nearestSlot]-1].n+' by 1.5min!');
      }else{
        objectInteractMsg='The altar glows... but no cards to protect.';
      }
    }else{
      // Nothing / minor flash
      objectInteractMsg='The altar is cold. Nothing happens.';
      lg.push('Altar: No effect.');
    }
    objectInteractTimer=120;
    return true;
  }

  return false;
}

function doFountainExchange(){
  const filled=[];
  for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)filled.push(i);}
  if(filled.length===0)return;
  // Remove random card, give vault-new card if possible
  const slot=filled[Math.floor(Math.random()*filled.length)];
  const oldCard=pl[0].cd[slot];
  const vault_fn=pl[0].vault;
  // v299: build hand-owned Set directly, no filter alloc
  const ownedInHand_fn=new Set();for(let _fi=0;_fi<pl[0].cd.length;_fi++){if(pl[0].cd[_fi]>0)ownedInHand_fn.add(pl[0].cd[_fi]);}
  const fnNew=[],fnOwned=[];
  for(let i=1;i<=60;i++){
    if(i===oldCard)continue;
    if(!vault_fn||!vault_fn.has(i))fnNew.push(i);
    else if(!ownedInHand_fn.has(i))fnOwned.push(i);
  }
  let newCard;
  if(fnNew.length>0)newCard=fnNew[Math.floor(Math.random()*fnNew.length)];
  else if(fnOwned.length>0)newCard=fnOwned[Math.floor(Math.random()*fnOwned.length)];
  else{do{newCard=Math.floor(Math.random()*60)+1;}while(newCard===oldCard);}
  pl[0].cd[slot]=0;cardTimers[slot]=0;syncCardCount(0); // clear old slot
  addCardToPlayer(0,newCard); // updates vault + hand
  startCardAcquisition(newCard-1);
  fountainResult='The fountain glows! Received '+CD[newCard-1].n+'!';
  fountainResultTimer=120;
  lg.push('Fountain: Traded '+CD[oldCard-1].n+' for '+CD[newCard-1].n+'!');
  sfxShopTrade();
  checkWinAndTransition(2000);
}

