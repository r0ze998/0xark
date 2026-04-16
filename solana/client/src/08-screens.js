// v262: Hoist screen per-frame inline literals
const _SCR_RAR_COLS=['','#50d060','#5090f0','#b060e0','#e0a020','#fff8e0'];
const _SCR_RAR_NAMES=['','Common','Uncommon','Rare','Epic','Legendary'];
const _SCR_EXIT_RAR_COLS=['','#888898','#60b060','#6090d8','#c060c0','#f0c830'];
const _SCR_DIR_NAMES=['DOWN','LEFT','UP','RIGHT'];
const _SCR_EMBER_COLS=['#d03030','#e04020','#c02828','#f03030'];
const _SCR_AREA_COLS=['#3060b0','#302848','#403058','#503060','#403850','#503848'];
const _SCR_AREA_NAMES=['TOWN','B1','B2','B3','B4','B5'];
// v255: Hoisted stats screen statics — eliminates inline array allocs per stats/log frame
const _VAULT_MILESTONES=[15,30,45]; // tick marks at 25%/50%/75% of 60-card bar
const _RAR_PIP_COLS=['#808898','#50d060','#b060e0','#e0a020','#ffe080'];
const _RAR_PIP_LBLS=['C','U','R','E','L'];
const _MEDALS=['1ST','2ND','3RD'],_MEDAL_COLS=['#f0c830','#c0c0c0','#c08040'];
// v323: pre-baked percent labels 0%–100%
const _PCT_LBL=(()=>{const a=[];for(let i=0;i<=100;i++)a.push(i+'%');return a;})();
// v330: pre-baked floor-clear fanfare labels (index = floor, 1-5)
const _FLOOR_CLEARED_LBL=(()=>{const a=[];for(let i=0;i<6;i++)a.push('FLOOR '+(_FLOOR_NUMS[i]||('B'+i))+' CLEARED');return a;})();
// v339: pre-baked floor-clear descent footer labels (index = cleared floor)
const _DESCEND_LBL=['','Descending to B2...','Descending to B3...','Descending to B4...','Descending to B5...','Final floor — claim the ARK!'];
// v342: pre-baked exit tooltip rarity card labels and floor dest labels
const _SCR_RAR_CARD_LBL=['','Common cards','Uncommon cards','Rare cards','Epic cards','Legendary cards'];
const _SCR_FLOOR_DEST=['\u2190 TOWN','FLOOR I','FLOOR II','FLOOR III','FLOOR IV','FLOOR V'];
// v331: pre-baked rarity pip count labels (5 rarities × 0..60 cards)
const _RAR_PIP_FULL=(()=>{const a=[];for(let ri=0;ri<5;ri++){const r=[];for(let n=0;n<=60;n++)r.push(_RAR_PIP_LBLS[ri]+':'+n);a.push(r);}return a;})();
// v235: Pre-baked game-over screen assets — 32 arc/frame + 1 gradient/frame eliminated
// Vignette: rgba(0,0,0,0.55) outer stop, drawn once per frame at alpha=1
const _goVignette=(()=>{
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const ctx=c.getContext('2d');
  const grd=ctx.createRadialGradient(W/2,H/2,H*0.18,W/2,H/2,H*0.72);
  grd.addColorStop(0,'rgba(0,0,0,0)');grd.addColorStop(1,'rgba(0,0,0,0.55)');
  ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);return c;
})();
// Ember arc canvases: r=4 in each of the 4 ember colors, drawn at globalAlpha=pa*0.15
const _goEmbers=(()=>{
  const cols=['#d03030','#e04020','#c02828','#f03030'];
  return cols.map(col=>{
    const c=document.createElement('canvas');c.width=10;c.height=10;
    const ctx=c.getContext('2d');
    ctx.fillStyle=col;ctx.beginPath();ctx.arc(5,5,4,0,Math.PI*2);ctx.fill();
    return c;
  });
})();

// v238: Pre-baked medal badge circles (r=20, 3 colors) + bar end-cap circles (r=6, 3 colors)
const _medalBadge=(()=>{
  const cols=['#f0c830','#c0c0c0','#c08040'];
  return cols.map(col=>{
    const c=document.createElement('canvas');c.width=42;c.height=42;
    const ctx=c.getContext('2d');
    // Medal fill (drawn at alpha=0.85)
    ctx.fillStyle=col;ctx.beginPath();ctx.arc(21,21,20,0,Math.PI*2);ctx.fill();
    return c;
  });
})();
const _medalBlackOverlay=(()=>{
  const c=document.createElement('canvas');c.width=42;c.height=42;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#000';ctx.beginPath();ctx.arc(21,21,20,0,Math.PI*2);ctx.fill();
  return c;
})();
const _barEndCaps=(()=>{
  const cols=['#f0c830','#c0c0c0','#c08040'];
  return cols.map(col=>{
    const c=document.createElement('canvas');c.width=13;c.height=13;
    const ctx=c.getContext('2d');
    ctx.fillStyle=col;ctx.beginPath();ctx.arc(6,6,6,0,Math.PI*2);ctx.fill();
    return c;
  });
})();
// v308: rarity-aware fanfare labels + extra visual intensity for Epic/Legendary finds
const _FANFARE_LBL=['','NEW CARD!','NEW CARD!','RARE FIND!','EPIC FIND!','LEGENDARY FIND!'];
const _FANFARE_LBL_COL=['','#e8e8e8','#e8e8e8',null,null,null]; // null = use rcol for R4/R5
// v85: Floor-clear fanfare — dramatic cinematic overlay on floor descent
function drawFloorClearFanfare(){
  if(!floorFanfareActive||!floorFanfareData)return;
  floorFanfareTimer++;
  const maxT=130;
  if(floorFanfareTimer>maxT){floorFanfareActive=false;floorFanfareData=null;return;}
  const t=floorFanfareTimer;
  const d=floorFanfareData;
  // Fade in 0-15, hold 15-110, fade out 110-130
  const alpha=t<15?t/15:t>110?(maxT-t)/20:1;
  const rar=d.rarity;
  const rcol=_SCR_RAR_COLS[rar]||'#c0c0c0'; // v262: hoisted
  // Dim background overlay
  g.globalAlpha=alpha*0.78;
  g.fillStyle='rgba(4,4,14,1)';g.fillRect(0,0,W,H);
  g.globalAlpha=1;
  // Panel
  const pw=440,ph=220,px_=W/2-pw/2,py_=H/2-ph/2-20;
  g.globalAlpha=alpha;
  win(px_,py_,pw,ph);
  // Rarity-colored header bar
  bx(px_,py_,pw,3,rcol);
  bx(px_,py_+ph-1,pw,1,'rgba(200,180,100,.3)');
  // v288: isGoal special header — dungeon cleared!
  const flRoman=_FLOOR_NUMS[d.floor]||d.floor; // v262: use _FLOOR_NUMS from 07-map.js
  if(d.isGoal){
    // Pulsing gold title for dungeon complete
    const hPulse=0.85+Math.sin(t*0.14)*0.15;
    g.globalAlpha=alpha*hPulse;
    txShadow('THE ARK IS OPEN',px_+pw/2-140,py_+22,18,'#ffe080','rgba(0,0,0,.8)');
    g.globalAlpha=alpha;
    txShadow('DUNGEON CLEARED!',px_+pw/2-126,py_+44,11,'#f0c040','rgba(0,0,0,.5)');
    // Extra star burst decoration
    for(let si=0;si<8;si++){
      const sa=t*0.1+si*(Math.PI*2/8);
      const sd=52+Math.sin(t*0.08)*6;
      g.globalAlpha=alpha*(0.4+Math.sin(t*0.12+si)*0.3);
      bx(px_+pw/2+Math.cos(sa)*sd-2,py_+34+Math.sin(sa)*10-2,4,4,'#ffe080');
    }
    g.globalAlpha=alpha;
    bx(px_+16,py_+52,pw-32,1,'rgba(255,224,128,.3)');
  }else if(rar>=4){
    // v308: Epic/Legendary non-goal — pulsing title with rarity color
    const hPulse=0.80+Math.sin(t*0.16)*0.20;
    g.globalAlpha=alpha*hPulse;
    txShadow(_FLOOR_CLEARED_LBL[d.floor]||('FLOOR '+flRoman+' CLEARED'),px_+pw/2-130,py_+22,16,rcol,'rgba(0,0,0,.7)'); // v330
    g.globalAlpha=alpha;
    // Extra accent sparkles for epic/legendary
    for(let si=0;si<(rar===5?6:4);si++){
      const sa=t*0.15+si*(Math.PI*2/(rar===5?6:4));
      const sd=36+Math.sin(t*0.09)*4;
      g.globalAlpha=alpha*(0.5+Math.sin(t*0.13+si)*0.25);
      bx(px_+pw/2+Math.cos(sa)*sd-2,py_+26+Math.sin(sa)*8-2,3,3,rcol);
    }
    g.globalAlpha=alpha;
    bx(px_+16,py_+34,pw-32,1,rcol+'60');
  }else{
    txShadow(_FLOOR_CLEARED_LBL[d.floor]||('FLOOR '+flRoman+' CLEARED'),px_+pw/2-130,py_+28,16,'#f0e0a0','rgba(0,0,0,.6)'); // v330
    bx(px_+16,py_+34,pw-32,1,'rgba(200,180,100,.2)');
  }
  // Card display (left side of panel)
  const cX=px_+60,cY=py_+80;
  const cw_=56,ch_=80;
  // Rarity glow behind card — extra for goal
  const glA=(0.5+Math.sin(t*0.12)*0.2)*(d.isGoal?1.4:1);
  g.globalAlpha=alpha*Math.min(1,glA)*0.55;
  bx(cX-12,cY-12,cw_+24,ch_+24,rcol+'40'||'rgba(200,160,80,.3)');
  g.globalAlpha=alpha;
  // Card frame
  const cr2=CD[d.cardId-1];
  bx(cX,cY,cw_,ch_,cr2.d);bx(cX+2,cY+2,cw_-4,ch_-4,cr2.c);
  drawCardCharacter(cX+4,cY+4,d.cardId,1.8,fr+t);
  // Rarity orbit sparks (more for goal)
  const sparkCount=d.isGoal?12:2+rar*2;
  const sparkDist=d.isGoal?52:38;
  for(let i=0;i<sparkCount;i++){
    const ang=t*(d.isGoal?0.08:0.12)+i*(Math.PI*2/sparkCount);
    const dist=sparkDist+Math.sin(t*0.1)*4;
    g.globalAlpha=alpha*(d.isGoal?0.9:0.75);
    bx(cX+cw_/2+Math.cos(ang)*dist-2,cY+ch_/2+Math.sin(ang)*dist-2,d.isGoal?5:4,d.isGoal?5:4,rcol);
  }
  g.globalAlpha=alpha;
  // Card info (right side)
  const infoX=cX+cw_+24;
  // v308: rarity-aware top label — Legendary/Epic/Rare get distinct shouts
  const infoTopLbl=d.isGoal?'LEGENDARY REWARD!':(d.isNew?(_FANFARE_LBL[rar]||'NEW CARD!'):'GOT:');
  const infoTopCol=d.isGoal?'#ffe080':(d.isNew?rcol:'#a09878');
  const _lblPulse=rar>=4?(0.85+Math.sin(t*0.18)*0.15):1; // pulse label for Epic/Legendary
  g.globalAlpha=alpha*_lblPulse;
  txShadow(infoTopLbl,infoX,py_+68,rar>=4?10:9,infoTopCol,'rgba(0,0,0,.3)');
  g.globalAlpha=alpha;
  txShadow(cr2.n,infoX,py_+90,12,d.isNew?rcol:'#e8e0c8','rgba(0,0,0,.4)');
  txShadow(_SCR_RAR_NAMES[rar]||'',infoX,py_+110,9,rcol,'rgba(0,0,0,.3)'); // v262: hoisted
  txShadow(cr2.f||'',infoX,py_+128,7,'#888878','rgba(0,0,0,.2)');
  // Footer
  if(t>50){
    const ftA=Math.min(1,(t-50)/20);
    g.globalAlpha=alpha*ftA*(0.5+Math.abs(Math.sin(t*0.06))*0.5);
    const ftTxt=d.isGoal?'All cards await — claim the Prize Pool!':(_DESCEND_LBL[d.floor]||'Descending deeper...');
    const ftCol=d.isGoal?'#f0c840':'#686880';
    txShadow(ftTxt,px_+pw/2-(d.isGoal?148:90),py_+ph-22,8,ftCol,'rgba(0,0,0,.3)');
  }
  g.globalAlpha=1;
}

function drawObjectInteractMsg(){
  if(objectInteractTimer<=0)return;
  objectInteractTimer--;
  const alpha=objectInteractTimer>20?1:objectInteractTimer/20;
  g.globalAlpha=alpha;
  win(W/2-200,H/2-20,400,36);
  bx(W/2-200,H/2-20,4,36,'#c0a040');
  txShadow(objectInteractMsg,W/2-190,H/2+4,7,'#e8e0c0','rgba(0,0,0,.4)');
  g.globalAlpha=1;
}

// v76: Exit proximity tooltip — show destination info when near an exit
function drawExitProximityTooltip(){
  if(!inDungeon||sc!=='map'||mapTransitioning)return;
  const p=pl[0];
  // Find nearest exit tile within 2 tiles
  let nearExit=null,nearDist=99;
  for(const ex of exits){
    if(ex.fromMap!==currentMap)continue;
    for(const [etx,ety] of ex.tiles){
      const d=Math.abs(p.x-etx)+Math.abs(p.y-ety);
      if(d<=2&&d<nearDist){nearDist=d;nearExit=ex;}
    }
  }
  if(!nearExit)return;

  const isEsc=nearExit.isEscape;
  const targetFloor=nearExit.targetMap;
  // v262: flNums, rarLabels, rarCols hoisted to _FLOOR_NUMS, _SCR_RAR_NAMES, _SCR_EXIT_RAR_COLS
  // Determine rarity tier for target floor
  const floorRar=[0,1,2,3,4,5]; // floor → rarity
  const mainRar=isEsc?0:Math.min(5,floorRar[targetFloor]||1);

  const ttW=200,ttH=isEsc?44:62;
  const ttX=W/2-ttW/2,ttY=H-HUD_HEIGHT-ttH-56;

  // Background
  const bgCol=isEsc?'rgba(20,50,20,.92)':'rgba(20,20,50,.92)';
  bx(ttX,ttY,ttW,ttH,bgCol);
  bx(ttX,ttY,ttW,1,isEsc?'#40c060':'#6080c0');
  bx(ttX,ttY+ttH-1,ttW,1,isEsc?'#40c060':'#6080c0');

  const arrow=isEsc?'\u2196 ESCAPE':'\u2198 DESCEND';
  const dest=isEsc?_SCR_FLOOR_DEST[0]:(_SCR_FLOOR_DEST[targetFloor]||('FLOOR '+targetFloor)); // v342: pre-baked
  txShadow(arrow,ttX+10,ttY+14,6,isEsc?'#50e080':'#a0b0d8','rgba(0,0,0,.4)');
  txShadow(dest,ttX+ttW/2-dest.length*4.5,ttY+30,9,isEsc?'#40e070':'#c8d8f0','rgba(0,0,0,.5)');

  if(!isEsc&&mainRar>0){
    const rarTxt=_SCR_RAR_CARD_LBL[mainRar]||(_SCR_RAR_NAMES[mainRar]+' cards'); // v342: pre-baked
    txShadow(rarTxt,ttX+ttW/2-rarTxt.length*3,ttY+46,6,_SCR_EXIT_RAR_COLS[mainRar]||'#888','rgba(0,0,0,.3)');
  }
}

function drawFountainDialog(){
  if(!fountainActive)return;
  if(fountainConfirm){
    bx(0,0,W,H,'rgba(0,0,0,.4)');
    win(W/2-180,H/2-50,360,100);
    bx(W/2-180,H/2-50,360,28,'#0a1a2a');
    bx(W/2-180,H/2-50,4,28,'#3060b0');
    txShadow('FOUNTAIN',W/2-40,H/2-34,10,'#80c0e0','rgba(0,0,0,.5)');
    txShadow('Toss a card in? You\u2019ll get a random card back.',W/2-160,H/2-4,7,'#c0d0e0','rgba(0,0,0,.3)');
    txShadow('[Z] Yes   [X] No',W/2-64,H/2+30,7,'#c06040','rgba(0,0,0,.3)');
  }
  if(fountainResultTimer>0){
    fountainResultTimer--;
    const a=fountainResultTimer>20?1:fountainResultTimer/20;
    g.globalAlpha=a;
    win(W/2-180,H/2-20,360,36);
    bx(W/2-180,H/2-20,4,36,'#3060b0');
    txShadow(fountainResult,W/2-170,H/2+4,7,'#80c0e0','rgba(0,0,0,.4)');
    g.globalAlpha=1;
    if(fountainResultTimer<=0)fountainActive=false;
  }
}

// ═══════════════════════════════════════
// MAP CARD USE SYSTEM
// ═══════════════════════════════════════
// v263: hoisted — was new Set([...]) every frame inside drawMapCardUseOverlay
const _MAP_CARD_IDS=new Set([2,3,28,29,30,35,36]);
let _mapUsableCache=null; // v302: cache invalidated on open; avoids per-frame alloc while overlay shown
function getMapUsableCards(){
  // Returns [{slot, cardId, name}] for cards that can be used on map
  // Card 2=UMBRA: stealth, Card 3=IGNIS: burn, Card 28=PHASE: walk through walls,
  // Card 29=BLINK: teleport, Card 30=SHADOW: longer stealth
  const result=[];
  for(let i=0;i<HAND_SIZE;i++){
    const cd=pl[0].cd[i];
    if(!_MAP_CARD_IDS.has(cd))continue;
    const cr=CD[cd-1];
    let desc='';
    if(cd===2)desc='Invisible 30 steps';
    else if(cd===3)desc='Burn tree/bush ahead';
    else if(cd===28)desc='Phase through wall in direction';
    else if(cd===29)desc='Teleport 5 tiles in direction';
    else if(cd===30)desc='Invisible 60 steps';
    else if(cd===35)desc='Escape to Town instantly!';
    else if(cd===36)desc='Escape & restart from Town';
    result.push({slot:i,cardId:cd,name:cr.n,desc});
  }
  return result;
}

function openMapCardUse(){
  _mapUsableCache=getMapUsableCards(); // v302: cache for overlay draw loop
  if(_mapUsableCache.length===0){
    _mapUsableCache=null;
    twSet('No usable cards! UMBRA/IGNIS/PHASE/BLINK/SHADOW/ARK GATE/GENESIS can be used on the map.');
    return;
  }
  mapCardUseActive=true;
  mapCardUseIdx=0;
  sfxSelect();
}

function executeMapCard(cardId,slot){
  if(cardId===3){
    // IGNIS: burn tree/bush in direction
    mapCardDirSelect=true;
    mapCardDirIdx=pl[0].dir;
    mapCardPendingType=3;
    return;
  }else if(cardId===2){
    // UMBRA: invisible 30 steps
    pl[0].cd[slot]=0;cardTimers[slot]=0;
    syncCardCount(0);
    shadowStepsLeft=30;
    mapCardUseActive=false;_mapUsableCache=null;
    sfxShadow();
    twSet('UMBRA: You became invisible for 30 steps!');
    lg.push('Used UMBRA on map: 30 invisible steps!');
  }else if(cardId===30){
    // SHADOW: invisible 60 steps (longer stealth)
    pl[0].cd[slot]=0;cardTimers[slot]=0;
    syncCardCount(0);
    shadowStepsLeft=60;
    mapCardUseActive=false;_mapUsableCache=null;
    sfxShadow();
    twSet('SHADOW: You became invisible for 60 steps!');
    lg.push('Used SHADOW on map: 60 invisible steps!');
  }else if(cardId===28){
    // PHASE: walk through wall in direction
    mapCardDirSelect=true;
    mapCardDirIdx=pl[0].dir;
    mapCardPendingType=28;
    return;
  }else if(cardId===29){
    // BLINK: teleport 5 tiles in direction
    mapCardDirSelect=true;
    mapCardDirIdx=pl[0].dir;
    mapCardPendingType=29;
    return;
  }else if(cardId===35){
    // ARK GATE: instant escape from dungeon to town (dungeon-only)
    mapCardUseActive=false;_mapUsableCache=null;
    if(!inDungeon){twSet('ARK GATE only works in the dungeon!');return;}
    pl[0].cd[slot]=0;cardTimers[slot]=0;syncCardCount(0);
    sfxMapChange();sfxAreaEntry();
    lg.push('Used ARK GATE — escaped dungeon instantly!');
    startWipe('vslide',16,()=>{
      currentMap=0;inDungeon=false;currentFloor=0;
      pl[0].x=35;pl[0].y=13;pl[0].dir=1;
      pl[0].visualX=35*TW;pl[0].visualY=13*TH;
      for(let i=0;i<HAND_SIZE;i++){cardTimers[i]=0;decayWarn[i]=0;}
      escapeUrgencyActive=false;escapeUrgencyPulse=0;
      sp.s=2;sp.b=3;sp.c=2;
      fogRevealAll(0);fogSave();
      encounterCooldown=600;
      camX=pl[0].visualX-W/2;camY=pl[0].visualY-H/2;
      camTargetX=camX;camTargetY=camY;
      tileCacheDirty=true;edgeCacheDirty=true;fogCacheDirty=true;
      showBanner('はじまりの街','ARK GATE: Escaped from dungeon!');
      twSet('ARK GATE activated! Cards preserved — you\'re safe in town.');
      saveGame();
      startWipe('vslide_out',16);
    });
  }else if(cardId===36){
    // GENESIS: escape dungeon to town (dungeon-only)
    mapCardUseActive=false;_mapUsableCache=null;
    if(!inDungeon){twSet('GENESIS only works in the dungeon!');return;}
    pl[0].cd[slot]=0;cardTimers[slot]=0;syncCardCount(0);
    sfxMapChange();sfxAreaEntry();
    lg.push('Used GENESIS — escaped dungeon instantly!');
    startWipe('vslide',16,()=>{
      currentMap=0;inDungeon=false;currentFloor=0;
      pl[0].x=35;pl[0].y=13;pl[0].dir=1;
      pl[0].visualX=35*TW;pl[0].visualY=13*TH;
      for(let i=0;i<HAND_SIZE;i++){cardTimers[i]=0;decayWarn[i]=0;}
      escapeUrgencyActive=false;escapeUrgencyPulse=0;
      sp.s=2;sp.b=3;sp.c=2;
      fogRevealAll(0);fogSave();
      encounterCooldown=600;
      camX=pl[0].visualX-W/2;camY=pl[0].visualY-H/2;
      camTargetX=camX;camTargetY=camY;
      tileCacheDirty=true;edgeCacheDirty=true;fogCacheDirty=true;
      showBanner('はじまりの街','GENESIS: Reborn in town!');
      twSet('GENESIS activated! Escaped — cards intact, back to safety!');
      saveGame();
      startWipe('vslide_out',16);
    });
  }
}

function executeDirCard(dir){
  const p=pl[0],m=getMap();
  let dx=0,dy=0;
  if(dir===0){dy=1;}else if(dir===2){dy=-1;}
  else if(dir===1){dx=-1;}else if(dir===3){dx=1;}
  const tx_=p.x+dx,ty_=p.y+dy;

  if(mapCardPendingType===3){
    // Flame: burn tree or bush
    if(tx_>=0&&tx_<MW&&ty_>=0&&ty_<MH){
      const tile=m[ty_]?.[tx_];
      if(tile===3||tile===12||tile===13){
        // Find the slot with Flame
        let slot=-1;
        for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]===3){slot=i;break;}}
        if(slot>=0){
          pl[0].cd[slot]=0;cardTimers[slot]=0;
          syncCardCount(0);
          // Replace tile with grass
          maps[currentMap][ty_][tx_]=1;
          burnedTiles.push({mapIdx:currentMap,x:tx_,y:ty_});
          tileCacheDirty=true;edgeCacheDirty=true;
          sfxBurn();
          flash();
          twSet('The obstacle burns away!');
          lg.push('Used Ignis: burned tile at ('+tx_+','+ty_+')');
        }
      }else{
        twSet('Nothing to burn there.');
      }
    }
  }else if(mapCardPendingType===28){
    // PHASE: walk through 1 wall tile (2 tiles in direction)
    const fx=p.x+dx*2,fy=p.y+dy*2;
    if(fx>=0&&fx<MW&&fy>=0&&fy<MH&&WALKABLE.has(m[fy]?.[fx])){
      let slot=-1;
      for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]===28){slot=i;break;}}
      if(slot>=0){
        pl[0].cd[slot]=0;cardTimers[slot]=0;
        syncCardCount(0);
        p.x=fx;p.y=fy;p.visualX=fx*TW;p.visualY=fy*TH;
        fogRevealRadius(currentMap,fx,fy,3);fogSave();
        tileCacheDirty=true;edgeCacheDirty=true;
        sfxPhase();
        flash();
        twSet('PHASE: You walked through the wall!');
        lg.push('Used PHASE: phased to ('+fx+','+fy+')');
      }
    }else{
      twSet('Cannot phase there — no walkable tile beyond.');
    }
  }else if(mapCardPendingType===29){
    // BLINK: teleport up to 5 tiles in direction
    const origX=p.x,origY=p.y;
    let bestX=p.x,bestY=p.y;
    for(let step=1;step<=5;step++){
      const nx=p.x+dx*step,ny=p.y+dy*step;
      if(nx<0||nx>=MW||ny<0||ny>=MH)break;
      if(WALKABLE.has(m[ny]?.[nx])){bestX=nx;bestY=ny;}
      else break;
    }
    if(bestX!==origX||bestY!==origY){
      let slot=-1;
      for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]===29){slot=i;break;}}
      if(slot>=0){
        pl[0].cd[slot]=0;cardTimers[slot]=0;
        syncCardCount(0);
        const dist=Math.abs(bestX-origX)+Math.abs(bestY-origY);
        p.x=bestX;p.y=bestY;p.visualX=bestX*TW;p.visualY=bestY*TH;
        fogRevealRadius(currentMap,bestX,bestY,3);fogSave();
        tileCacheDirty=true;edgeCacheDirty=true;
        sfxPhase();
        flash();
        twSet('BLINK: Teleported '+dist+' tiles!');
        lg.push('Used BLINK: teleported to ('+bestX+','+bestY+')');
      }
    }else{
      twSet('BLINK: No open tile to teleport to!');
    }
  }
  mapCardDirSelect=false;
  mapCardUseActive=false;_mapUsableCache=null;
}

function drawMapCardUseOverlay(){
  if(!mapCardUseActive)return;
  const usable=_mapUsableCache||getMapUsableCards(); // v302: use cache; no per-frame alloc
  if(usable.length===0){mapCardUseActive=false;_mapUsableCache=null;return;}

  if(mapCardDirSelect){
    // Direction selection
    bx(0,0,W,H,'rgba(0,0,0,.45)');
    win(W/2-120,H/2-50,240,100);
    bx(W/2-120,H/2-50,240,28,'#181008');
    bx(W/2-120,H/2-50,4,28,'#c0a040');
    txShadow('Select direction:',W/2-72,H/2-30,7,'#d0b860','rgba(0,0,0,.4)');
    // v262: dirNames hoisted to _SCR_DIR_NAMES; dirCodes removed (isSel uses i directly)
    for(let i=0;i<4;i++){
      const y=H/2-6+Math.floor(i/2)*22;
      const x=W/2-100+(i%2)*120;
      const isSel=i===mapCardDirIdx;
      if(isSel)txShadow('\u25B6',x-10,y+12,7,'#c04040','rgba(0,0,0,.4)');
      txShadow(_SCR_DIR_NAMES[i],x,y+12,7,isSel?'#e06050':'#b0a890','rgba(0,0,0,.3)');
    }
    txShadow('[Z] Confirm   [X] Cancel',W/2-86,H/2+42,6,'#8888a0','rgba(0,0,0,.3)');
    return;
  }

  bx(0,0,W,H,'rgba(0,0,0,.45)');
  const mh=usable.length*32+48;
  win(W/2-140,H/2-mh/2,280,mh);
  bx(W/2-140,H/2-mh/2,280,28,'#181008');
  bx(W/2-140,H/2-mh/2,4,28,'#c0a040');
  txShadow('USE CARD ON MAP',W/2-76,H/2-mh/2+20,7,'#d0b860','rgba(0,0,0,.4)');
  for(let j=0;j<usable.length;j++){
    const item=usable[j];const cr=CD[item.cardId-1];
    const y=H/2-mh/2+38+j*32;
    const sel=j===mapCardUseIdx;
    if(sel){
      bx(W/2-130,y-2,260,28,'rgba(192,168,96,.18)');
      bx(W/2-130,y-2,3,28,'#c04040');
      txShadow('\u25B6',W/2-134,y+14,7,'#c04040','rgba(0,0,0,.4)');
    }
    bx(W/2-118,y+2,20,20,cr.d);bx(W/2-116,y+4,16,16,cr.c);
    drawCardCharacter(W/2-115,y+3,item.cardId,0.6,fr);
    txShadow(item.name,W/2-92,y+14,7,sel?'#e06050':'#d0c8a8','rgba(0,0,0,.3)');
    txShadow(item.desc,W/2+10,y+14,5,'#a09880','rgba(0,0,0,.2)');
  }
  txShadow('[Z] Use   [X] Cancel',W/2-68,H/2+mh/2-10,6,'#8888a0','rgba(0,0,0,.3)');
}

// ═══════════════════════════════════════
// STATS SCREEN
// ═══════════════════════════════════════
function dStats(){
  // Dark background matching LOG screen
  bx(0,0,W,H,'#0c0c18');
  g.fillStyle='#ffffff';
  for(let i=0;i<120;i++){const nx=(i*73+17)%W,ny=(i*41+23)%H;g.globalAlpha=Math.random()*0.04;g.fillRect(nx,ny,1,1);}
  g.globalAlpha=1;

  // Header
  win(16,10,W-32,42);
  txShadow('SESSION STATS',W/2-110,38,14,'#f0e8c0','rgba(0,0,0,.5)');

  const elapsed=Math.floor((Date.now()-stats.sessionStart)/1000);
  const mins=Math.floor(elapsed/60),secs=elapsed%60;
  // v278: replace spread+reduce with single loop — no per-frame allocation
  let _atMax=0,_atTotal=0;
  for(let _ai=0;_ai<stats.areaTime.length;_ai++){const v=stats.areaTime[_ai];if(v>_atMax)_atMax=v;_atTotal+=v;}
  const favIdx=stats.areaTime.indexOf(_atMax);
  const favArea=stats.areaTime[favIdx]>0?mapNames[favIdx]:'None yet';
  const totalAreaTime=_atTotal||1;

  // Single window for all stats — clean list format
  const padTop=60;
  win(16,padTop-8,W-32,500);

  // v122: Vault progress hero section
  const vaultSize=pl[0].vault?pl[0].vault.size:0;
  const vaultRatio=Math.min(1,vaultSize/60);
  const vpY=padTop+6;
  txShadow('VAULT',36,vpY+14,9,'#f0c830','rgba(0,0,0,.4)');
  const vNumStr=_UNIQ60[vaultSize]||(vaultSize+'/60'); // v323
  const vNumCol=vaultSize>=60?'#ffe080':vaultSize>=48?'#d0c040':'#f0e8d0';
  txShadow(vNumStr,100,vpY+14,11,vNumCol,'rgba(0,0,0,.4)');
  const vpbX=170,vpbY=vpY+1,vpbW=W-230,vpbH=16;
  bx(vpbX,vpbY,vpbW,vpbH,'#181838');
  if(vaultSize>0){
    const fW=Math.floor(vpbW*vaultRatio);
    const pulse_=0.8+_sFr08*0.2; // v370: cached
    g.globalAlpha=pulse_;g.fillStyle=vaultSize>=60?'#ffdc3c':vaultSize>=48?'#a0c832':'#28b450';
    g.fillRect(vpbX,vpbY,fW,vpbH);g.globalAlpha=1;
    bx(vpbX,vpbY,fW,2,'rgba(255,255,255,.22)');
  }
  // Milestone ticks at 25%, 50%, 75% (_VAULT_MILESTONES hoisted to module scope)
  for(let _mi=0;_mi<3;_mi++){const mx_=vpbX+Math.floor(vpbW*(_VAULT_MILESTONES[_mi]/60));bx(mx_,vpbY,1,vpbH,'rgba(255,255,255,.15)');}
  bx(vpbX,vpbY,vpbW,1,'#282848');bx(vpbX,vpbY+vpbH,vpbW,1,'#282848');
  if(vaultSize>=60){
    const cA_=0.5+Math.sin(fr*0.14)*0.45;
    g.globalAlpha=cA_;
    txShadow('\u2605 COMPLETE! \u2605',vpbX+vpbW/2-56,vpbY+13,8,'#ffe080','rgba(0,0,0,.5)');
    g.globalAlpha=1;
  }
  // Rarity pip breakdown below bar
  const rarCount_=[0,0,0,0,0];
  if(pl[0].vault){for(const cid_ of pl[0].vault){const cr_=CD[cid_-1];if(cr_)rarCount_[(cr_.r||1)-1]++;}}
  // _RAR_PIP_COLS/_RAR_PIP_LBLS hoisted to module scope
  let rPX=vpbX;
  for(let ri_=0;ri_<5;ri_++){
    if(rarCount_[ri_]===0)continue;
    bx(rPX,vpbY+vpbH+3,9,9,_RAR_PIP_COLS[ri_]);
    txShadow(_RAR_PIP_FULL[ri_][rarCount_[ri_]]||(_RAR_PIP_LBLS[ri_]+':'+rarCount_[ri_]),rPX+11,vpbY+vpbH+11,7,'#c0b8a0','rgba(0,0,0,.35)'); // v331
    rPX+=36;
  }
  bx(36,vpbY+vpbH+18,W-104,1,'#282840');

  const stealSuccessPct=stats.stealsAttempted>0?Math.round((1-stats.stealsBlocked/(stats.stealsAttempted||1))*100):0;
  const allRows=[
    {label:'GAME',value:'',header:true,col:'#f0c830'},
    {label:'Games Played',value:''+stats.gamesPlayed,col:'#888898'},
    {label:'Steps Walked',value:''+stats.stepsWalked,col:'#888898'},
    {label:'Play Time',value:mins+'m '+secs+'s',col:'#888898'},
    {label:'Cards Collected',value:''+stats.cardsCollected,col:'#888898'},
    {label:'Cards Lost',value:''+stats.cardsLost,col:'#888898'},
    {label:'Battles',value:''+rd,col:'#888898'},
    {label:'Season Left',value:formatTimeRemaining(getSeasonRemaining()),col:getSeasonRemaining()<86400000?'#d0a030':'#888898'},
    {label:'',value:'',header:false,col:''},
    {label:'COMBAT',value:'',header:true,col:'#c04848'},
    {label:'Steals Attempted',value:''+stats.stealsAttempted,col:'#888898'},
    {label:'Steals Blocked',value:''+stats.stealsBlocked,col:'#888898'},
    {label:'Scout Uses',value:''+stats.scoutUses,col:'#888898'},
    {label:'Win Streak',value:''+streakCount,bar:streakCount>0?{val:Math.min(streakCount,10),max:10,col:'#f0c830'}:null,col:'#888898'},
    {label:'Steal Success',value:stats.stealsAttempted>0?stealSuccessPct+'%':'--',bar:stats.stealsAttempted>0?{val:stealSuccessPct,max:100,col:stealSuccessPct>=70?'#40d080':'#d08030'}:null,col:'#888898'},
    {label:'Best Clear',value:stats.bestClearTime>0?Math.floor(stats.bestClearTime/60)+'m'+('0'+(stats.bestClearTime%60)).slice(-2)+'s':'--',col:stats.bestClearTime>0?'#f0c830':'#888898'},
    {label:'',value:'',header:false,col:''},
    {label:'AREA',value:'',header:true,col:'#f0c830'},
    {label:'Favorite Area',value:favArea,col:'#888898'},
  ];

  let rowY=vpbY+vpbH+24;
  for(let _ri=0;_ri<allRows.length;_ri++){
    const r=allRows[_ri];
    if(!r.label&&!r.value){rowY+=6;continue;} // spacer
    if(r.header){
      txShadow(r.label,36,rowY+14,12,r.col,'rgba(0,0,0,.5)');
      bx(36,rowY+20,W-104,1,'#282840');
      rowY+=26;
    }else{
      txShadow(r.label,44,rowY+14,11,'#8888a8','rgba(0,0,0,.3)');
      // Inline mini-bar for rows that have one
      if(r.bar){
        const mbX=W-200,mbY=rowY+6,mbW=100,mbH=10;
        bx(mbX,mbY,mbW,mbH,'#181838');
        const mbFill=Math.floor(mbW*(r.bar.val/r.bar.max));
        if(mbFill>0)bx(mbX,mbY,mbFill,mbH,r.bar.col);
        bx(mbX,mbY,mbW,1,'#282848');
        txShadow(r.value,mbX+mbW+6,rowY+14,11,'#f8f0e0','rgba(0,0,0,.4)');
      }else{
        txShadow(r.value,W-60-r.value.length*10,rowY+14,12,'#f8f0e0','rgba(0,0,0,.4)');
      }
      bx(36,rowY+20,W-104,1,'#1a1a30');
      rowY+=22;
    }
  }

  // Area time distribution bar at bottom of the single window
  const barX=36,barY_=rowY+8,barW=W-104,barH=16;
  bx(barX,barY_,barW,barH,'#181838');
  // v262: areaColors, _aN hoisted to _SCR_AREA_COLS, _SCR_AREA_NAMES
  let accX=barX;
  for(let ai_=0;ai_<stats.areaTime.length;ai_++){
    const segW=Math.max(0,Math.floor(barW*(stats.areaTime[ai_]/totalAreaTime)));
    if(segW>0){bx(accX,barY_,segW,barH,_SCR_AREA_COLS[ai_%_SCR_AREA_COLS.length]);accX+=segW;}
  }

  // Legend below bar (show town + floors compactly)
  for(let ai_=0;ai_<_SCR_AREA_NAMES.length;ai_++){
    const legendX=36+ai_*120,legendY=barY_+28;
    bx(legendX,legendY-8,10,10,_SCR_AREA_COLS[ai_%_SCR_AREA_COLS.length]);
    const pct=Math.round(((stats.areaTime[ai_]||0)/totalAreaTime)*100);
    txShadow(_SCR_AREA_NAMES[ai_]+' '+(_PCT_LBL[pct]||pct+'%'),legendX+14,legendY,8,'#c8c0a0','rgba(0,0,0,.3)'); // v323
  }

  // Back prompt
  win(W/2-100,H-42,200,30);
  txShadow('X = Back',W/2-32,H-22,10,FRLG.selHighlight,'rgba(0,0,0,.4)');
}

// ═══════════════════════════════════════
// CREDITS SCREEN (scrolling text)
// ═══════════════════════════════════════
function dCredits(){
  bx(0,0,W,H,'#0c0c18');
  // Stars
  for(let i=0;i<80;i++){
    const sx=(i*47+13)%W,sy=(i*31+7)%H;
    const a=Math.sin(creditsFrame*.02+i*1.7)*.35+.5;
    g.globalAlpha=a*.3;g.fillStyle='#ffffff';g.fillRect(sx,sy,1,1);g.globalAlpha=1;
  }
  const scrollSpeed=0.6;
  const startY=H;
  const lineHeight=36;
  for(let i=0;i<CREDITS_LINES.length;i++){
    const line=CREDITS_LINES[i];
    const y=startY-creditsFrame*scrollSpeed+i*lineHeight;
    if(y<-30||y>H+30)continue;
    const isTitle=(line==='0 x A R K');
    const sz=isTitle?24:(line.length>30?6:10);
    const col=isTitle?'#f8f0e0':(line.startsWith('Powered')?'#9945FF':(line.startsWith('Solana')?'#14F195':'#c8c0a0'));
    const tw_=line.length*(isTitle?14:sz*0.7);
    txShadow(line,W/2-tw_/2,y,sz,col,'rgba(0,0,0,.5)');
  }
  // End: loop or go back
  const totalScroll=(CREDITS_LINES.length*lineHeight+H)/scrollSpeed;
  if(creditsFrame>totalScroll){creditsActive=false;creditsFrame=0;}
  // Back prompt
  txShadow('X = Back',W/2-32,H-16,7,'#555570','rgba(0,0,0,.3)');
}

// Story sequence removed — replaced by PixiJS intro tutorial

// ═══════════════════════════════════════
// GAME OVER - TIME'S UP SCREEN
// ═══════════════════════════════════════
let _goRankCache=null,_goRankVF=-1; // v272: cache game-over rankings — reset when screen restarts
function dGameOver(){
  const t=fr-victoryFrame;
  if(t<30){g.globalAlpha=t/30;g.fillStyle='#000000';g.fillRect(0,0,W,H);g.globalAlpha=1;return;}
  bx(0,0,W,H,'#0a0a14');
  // Falling ember/ash particles
  for(let i=0;i<32;i++){
    const seed=i*1337;const spd=0.6+i*0.04;
    const px_=((seed*73+t*(0.3+i*0.015))%W+W)%W;
    const py_=((seed*41+t*spd)%H+H)%H;
    const pa=0.25+Math.sin(t*0.04+i*0.7)*0.15;
    const pc=_SCR_EMBER_COLS[i%4]; // v262: hoisted
    bx(px_,py_,2,2,pc);
    g.globalAlpha=pa*0.15;g.drawImage(_goEmbers[i%4],(px_-4)|0,(py_-4)|0);g.globalAlpha=1;
  }
  // Radial vignette for cinematic depth (pre-baked)
  g.drawImage(_goVignette,0,0);

  // SEASON OVER — pulsing glow halo behind title
  if(t>35){
    const titleA=Math.min(1,(t-35)/20);
    const pulse=0.55+Math.sin(t*0.07)*0.45;
    g.globalAlpha=titleA*pulse*0.35;
    g.fillStyle='#cc2020';
    g.shadowBlur=50;g.shadowColor='#ff1010';
    g.fillRect(W/2-168,44,336,50);
    g.shadowBlur=0;g.globalAlpha=titleA;
    txShadow('SEASON OVER',W/2-152,96,24,'#ff4444','rgba(0,0,0,.75)');
    g.globalAlpha=1;
  }
  if(t>45){
    g.globalAlpha=Math.min(1,(t-45)/15);
    win(W/2-220,104,440,24);
    txShadow('SEASON 1 RESULTS',W/2-76,122,9,'#f0c830','rgba(0,0,0,.4)');
    g.globalAlpha=1;
  }

  // Rank all 3 players by unique card count — build once, cache for rest of screen
  if(t>60){
    if(!_goRankCache||_goRankVF!==victoryFrame){_goRankVF=victoryFrame;
      _goRankCache=[];
      for(let i=0;i<3;i++){
        const unique=i===0?(pl[0].vault?pl[0].vault.size:0):rivalUniqSize(i);
        const cards_=[];for(let _ci=0;_ci<pl[i].cd.length;_ci++)cards_.push(pl[i].cd[_ci]);
        _goRankCache.push({idx:i,name:pl[i].n,unique:unique,cards:cards_});
      }
      _goRankCache.sort((a,b)=>b.unique-a.unique);
    }
    const rankings=_goRankCache; // v272: no alloc after first frame
    const rowH=116;
    for(let rank=0;rank<rankings.length;rank++){
      const r=rankings[rank];const fadeT=t-60-rank*22;
      if(fadeT<0)continue;
      const alpha=Math.min(1,fadeT/12);
      g.globalAlpha=alpha;
      const y=136+rank*rowH;
      const isPlayer=r.idx===0;
      // Player row gets a subtle blue glow bg + left accent stripe
      if(isPlayer){
        g.globalAlpha=alpha*(0.10+_sFr05*0.03); // v374: cached
        g.fillStyle='#1a3060';g.fillRect(W/2-262,y-2,524,rowH-2);
        g.globalAlpha=alpha;
        win(W/2-260,y,520,rowH-4);
        g.fillStyle='#48b8e8';g.fillRect(W/2-260,y,3,rowH-4);
      }else{
        win(W/2-260,y,520,rowH-4);
      }
      // Medal badge — bounces in after row appears
      const bounceT=Math.max(0,fadeT-8);
      const bounce=bounceT<8?1+Math.sin(bounceT/8*Math.PI)*0.12:1;
      g.save();g.translate(W/2-230,y+26);g.scale(bounce,bounce);
      if(_medalBadge[rank]){
        g.globalAlpha=alpha*0.85;g.drawImage(_medalBadge[rank],-21,-21);
        g.globalAlpha=alpha*0.3;g.drawImage(_medalBlackOverlay,-21,-21);
      }
      g.globalAlpha=alpha;
      txShadow(_MEDALS[rank],-22,8,7,_MEDAL_COLS[rank],'rgba(0,0,0,.5)');
      g.restore();g.globalAlpha=alpha;
      // Name + card count
      txShadow(r.name,W/2-196,y+26,11,isPlayer?'#48b8e8':'#c8c0a0','rgba(0,0,0,.4)');
      txShadow(_UNIQ60[r.unique]||(r.unique+'/60'),W/2+120,y+24,13,r.unique>=60?'#40d040':_MEDAL_COLS[rank],'rgba(0,0,0,.4)'); // v323
      // Progress bar (animates fill)
      const barX=W/2-196,barY=y+44,barW=330,barH_=7;
      bx(barX,barY,barW,barH_,'#161626');
      const pct=r.unique/60;
      const animPct=pct*Math.min(1,(fadeT-4)/22);
      const barFill=Math.round(barW*animPct);
      if(barFill>0){
        bx(barX,barY,barFill,barH_,_MEDAL_COLS[rank]);
        g.globalAlpha=alpha*0.45;
        if(_barEndCaps[rank])g.drawImage(_barEndCaps[rank],(barX+barFill-6)|0,(barY-3)|0);
        g.globalAlpha=alpha;
      }
      txShadow(_PCT_LBL[Math.round(pct*100)]||Math.round(pct*100)+'%',barX+barW+5,barY+7,6,'#706878','rgba(0,0,0,.35)'); // v323
      // 4 sample cards (right side)
      for(let ci=0;ci<4;ci++){
        const cx_=W/2+160+ci*42,cy_=y+54;
        if(r.cards[ci]>0){drawCardFrame(cx_,cy_,36,50,r.cards[ci]-1,false);}
        else{bx(cx_,cy_,36,50,'#222232');txShadow('?',cx_+11,cy_+30,9,'#343444','rgba(0,0,0,.3)');}
      }
      g.globalAlpha=1;
    }
  }

  if(t>148){
    g.globalAlpha=Math.min(1,(t-148)/15);
    win(W/2-200,H-52,400,42);
    const blink_=Math.floor(fr/25)%2===0;
    if(blink_)txShadow('Z = Play Again    X = Title',W/2-130,H-24,8,FRLG.selHighlight,'rgba(0,0,0,.4)');
    g.globalAlpha=1;
  }
}

// ═══════════════════════════════════════
