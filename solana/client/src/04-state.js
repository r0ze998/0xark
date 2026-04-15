// ═══════════════════════════════════════
// ORGANIC TERRAIN HELPERS
// ═══════════════════════════════════════
function tileHash(x,y){return((x*2654435761+y*40503)&0xFFFF);}
function thRand(x,y,idx){return((tileHash(x,y)+idx*7919)&0xFFFF)/65535;}
function getNeighborType(m,x,y,dx,dy){
  const nx=x+dx,ny=y+dy;
  if(nx<0||nx>=MW||ny<0||ny>=MH)return -1;
  return m[ny]?.[nx]??-1;
}
// Ground tile types (for edge blending)
const GROUND_WATER=WATER_TILES;
const GROUND_SAND=new Set([4,10,14]);
const GROUND_MOUNTAIN=new Set([18,22]);
// Classify a tile to its base ground type
function groundType(t){
  if(GROUND_WATER.has(t))return'water';
  if(GROUND_SAND.has(t))return'sand';
  if(t===2)return'path';
  if(GROUND_MOUNTAIN.has(t))return'mountain';
  return'grass';
}

// Forest pollen particles
const pollenParticles=[];
for(let i=0;i<12;i++){
  pollenParticles.push({x:Math.random()*MW*TW,y:Math.random()*MH*TH,vx:0.15+Math.random()*0.2,vy:-0.1+Math.random()*0.2,phase:Math.random()*Math.PI*2});
}

// Player: cd=hand array (HAND_SIZE slots), vault=Set of unique card IDs ever collected
// Rivals use cd[5] for simplicity
function makeEmptyHand(){return new Array(HAND_SIZE).fill(0);}
const pl=[
  {x:15,y:13,c:'#48b8e8',n:'You',   cd:makeEmptyHand(),vault:new Set(),cc:0,dir:0,step:0,walkFrame:0,visualX:15*TW,visualY:13*TH},
  {x:8, y:10,c:'#d860a0',n:'VEGA',  cd:[2,5,0,0,0],cc:2,dir:2,step:0,walkFrame:0,visualX:8*TW,visualY:10*TH},
  {x:28,y:18,c:'#d8b028',n:'MIRA', cd:[4,0,0,0,0],cc:1,dir:0,step:0,walkFrame:0,visualX:28*TW,visualY:18*TH},
];

const sp={s:2,b:3,c:2};
let sc='title',mo=false,mi=0,ai=0,fr=0,wt=0,rd=1;
let splashFrame=0;
let titleMenuIdx=0;
let saveIndicatorTimer=0;
let autoSaveTimer=0;
const AUTO_SAVE_INTERVAL=1800; // 30 seconds at 60fps
let encounterCooldown=0;
let camX=0,camY=0,camTargetX=0,camTargetY=0;
let mapTransitioning=false;

// ── DUNGEON TURN SYSTEM (v155) ──
// floorItems: per-map array of {x,y,cardId,glow} items lying on the floor
const floorItems={}; // floorItems[mapIdx] = [{x,y,cardId,glow}]
// Track whether dungeon has been freshly generated this run
let dungeonSeedThisRun=0;

// ── DAY/NIGHT VISUAL CYCLE ──
const dayNightStartTime=Date.now();
const DAY_CYCLE_MS=20*60*1000; // 20 minutes full cycle
function getDayNightPhase(){
  const elapsed=(Date.now()-dayNightStartTime)%DAY_CYCLE_MS;
  const mins=elapsed/(60*1000);
  if(mins<5)return{phase:'dawn',t:mins/5};
  if(mins<10)return{phase:'day',t:(mins-5)/5};
  if(mins<15)return{phase:'dusk',t:(mins-10)/5};
  return{phase:'night',t:(mins-15)/5};
}
// Pre-built dungeon atmosphere vignette gradients (one per floor, static)
const _dungeonAtmosGrads=[];
function _buildDungeonAtmosGrad(depth){
  if(_dungeonAtmosGrads[depth])return _dungeonAtmosGrads[depth];
  const offC=document.createElement('canvas');offC.width=W;offC.height=H-HUD_HEIGHT;
  const offX=offC.getContext('2d');
  const alpha=0.06+depth*0.015;
  offX.fillStyle=`rgba(10,0,30,${alpha})`;offX.fillRect(0,0,W,H-HUD_HEIGHT);
  const grad=offX.createRadialGradient(W/2,(H-HUD_HEIGHT)/2,W*0.25,W/2,(H-HUD_HEIGHT)/2,W*0.72);
  grad.addColorStop(0,'rgba(0,0,0,0)');
  grad.addColorStop(1,`rgba(0,0,${depth*4},${0.25+depth*0.04})`);
  offX.fillStyle=grad;offX.fillRect(0,0,W,H-HUD_HEIGHT);
  _dungeonAtmosGrads[depth]=offC;
  return offC;
}
// Pre-built overworld vignette (static, camera-independent)
let _overworldVigCanvas=null;
function _buildOverworldVig(){
  if(_overworldVigCanvas)return _overworldVigCanvas;
  const offC=document.createElement('canvas');offC.width=W;offC.height=H-HUD_HEIGHT;
  const offX=offC.getContext('2d');
  const vg=offX.createRadialGradient(W/2,(H-HUD_HEIGHT)/2,W*0.28,W/2,(H-HUD_HEIGHT)/2,W*0.72);
  vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.07)');
  offX.fillStyle=vg;offX.fillRect(0,0,W,H-HUD_HEIGHT);
  _overworldVigCanvas=offC;
  return offC;
}

function drawDayNightOverlay(){
  // Dungeon atmosphere: pre-built per-floor canvas
  if(inDungeon){
    g.drawImage(_buildDungeonAtmosGrad(currentFloor),0,0);
    return;
  }
  const dn=getDayNightPhase();
  const townH=H-HUD_HEIGHT;
  // Atmosphere canvas: only redraw when camera moves or phase changes
  const camMoved=Math.abs(camX-_atmosLastCamX)>0.5||Math.abs(camY-_atmosLastCamY)>0.5;
  const phaseKey=dn.phase+Math.round(dn.t*8);
  if(_atmosDirty||camMoved||phaseKey!==_atmosLastPhase){
    atmosCtx.clearRect(0,0,W,H);
    // Lantern glow spots — cached to atmosCanvas
    if(currentMap===0){
      const lanternSpots=[
        {wx:8,wy:6,r:64,col:'255,200,80'},
        {wx:22,wy:6,r:56,col:'255,180,80'},
        {wx:14,wy:12,r:72,col:'255,160,60'},
        {wx:18,wy:18,r:60,col:'200,220,255'},
        {wx:26,wy:14,r:52,col:'255,200,100'},
      ];
      let lanternAlpha=0;
      if(dn.phase==='dusk')lanternAlpha=dn.t*0.18;
      else if(dn.phase==='night')lanternAlpha=0.20;
      else if(dn.phase==='dawn')lanternAlpha=(1-dn.t)*0.14;
      if(lanternAlpha>0){
        for(const ls of lanternSpots){
          const sx=ls.wx*TW-camX+TW/2,sy=ls.wy*TH-camY+TH/2;
          if(sx<-ls.r||sx>W+ls.r||sy<-ls.r||sy>townH+ls.r)continue;
          if(!fogRevealed[0]?.[ls.wy]?.[ls.wx])continue;
          const lg2=atmosCtx.createRadialGradient(sx,sy,0,sx,sy,ls.r);
          lg2.addColorStop(0,`rgba(${ls.col},${lanternAlpha})`);
          lg2.addColorStop(0.5,`rgba(${ls.col},${lanternAlpha*0.4})`);
          lg2.addColorStop(1,'rgba(0,0,0,0)');
          atmosCtx.fillStyle=lg2;atmosCtx.fillRect(Math.max(0,sx-ls.r),Math.max(0,sy-ls.r),ls.r*2,Math.min(townH,ls.r*2));
        }
      }
    }
    // Phase flat overlays
    if(dn.phase==='dawn'){
      atmosCtx.fillStyle=`rgba(255,180,80,${0.10+dn.t*0.04})`;atmosCtx.fillRect(0,0,W,townH);
    }else if(dn.phase==='dusk'){
      atmosCtx.fillStyle=`rgba(220,70,40,${0.10+dn.t*0.08})`;atmosCtx.fillRect(0,0,W,townH);
      const hg=atmosCtx.createLinearGradient(0,0,0,townH);
      hg.addColorStop(0,`rgba(240,140,30,${0.06+dn.t*0.06})`);
      hg.addColorStop(0.4,'rgba(0,0,0,0)');
      atmosCtx.fillStyle=hg;atmosCtx.fillRect(0,0,W,townH);
    }else if(dn.phase==='night'){
      atmosCtx.fillStyle=`rgba(10,12,60,${0.22+dn.t*0.06})`;atmosCtx.fillRect(0,0,W,townH);
      if(currentMap===0){
        const townCX=15*TW-camX,townCY=12*TH-camY;
        const gc=atmosCtx.createRadialGradient(townCX,townCY,30,townCX,townCY,350);
        gc.addColorStop(0,'rgba(255,140,40,0.06)');gc.addColorStop(1,'rgba(0,0,0,0)');
        atmosCtx.fillStyle=gc;atmosCtx.fillRect(0,0,W,townH);
      }
    }else if(dn.phase==='day'){
      atmosCtx.fillStyle='rgba(255,250,220,0.04)';atmosCtx.fillRect(0,0,W,townH);
    }
    _atmosLastCamX=camX;_atmosLastCamY=camY;_atmosLastPhase=phaseKey;_atmosDirty=false;
  }
  g.drawImage(atmosCanvas,0,0,W,H);
  // Static overworld vignette blit (pre-built once)
  g.drawImage(_buildOverworldVig(),0,0);
}
function drawDayNightIcon(ix,iy){
  const dn=getDayNightPhase();
  if(dn.phase==='dawn'){
    g.fillStyle='#e0a030';g.fillRect(ix+1,iy+2,4,4);g.fillRect(ix,iy+4,6,1);
    g.fillStyle='#f0c060';g.fillRect(ix+2,iy+3,2,2);
  }else if(dn.phase==='day'){
    g.fillStyle='#f0d040';g.fillRect(ix+1,iy+1,4,4);
    g.fillRect(ix+2,iy,2,1);g.fillRect(ix+2,iy+5,2,1);
    g.fillRect(ix,iy+2,1,2);g.fillRect(ix+5,iy+2,1,2);
  }else if(dn.phase==='dusk'){
    g.fillStyle='#d06030';g.fillRect(ix+1,iy+2,4,4);g.fillRect(ix,iy+4,6,1);
    g.fillStyle='#e08040';g.fillRect(ix+2,iy+3,2,2);
  }else{
    g.fillStyle='#c0c8e0';g.fillRect(ix+1,iy+1,4,4);g.fillRect(ix,iy+2,1,3);
    g.fillStyle='rgba(20,20,30,.88)';g.fillRect(ix+3,iy+1,2,3);
  }
}

// ── PLAYER STATUS EFFECTS ──
let cardGetAnimTimer=0,cardGetAnimX=0,cardGetAnimY=0;
let cardLostAnimTimer=0,cardLostAnimX=0,cardLostAnimY=0;
const statusSparkles=[];
function triggerCardGetAnim(px,py){cardGetAnimTimer=40;cardGetAnimX=px;cardGetAnimY=py;}
function triggerCardLostAnim(px,py){cardLostAnimTimer=40;cardLostAnimX=px;cardLostAnimY=py;for(let i=0;i<8;i++){particles.push({x:px+16,y:py+12,vx:(Math.random()-.5)*3,vy:-Math.random()*2-0.5,life:15+Math.random()*10,c:Math.random()>.3?'#d04040':'#ff6060'});}}
function triggerCardGetBurst(px,py,col){const cnt=12;for(let i=0;i<cnt;i++){const ang=(i/cnt)*Math.PI*2+Math.random()*0.4;const spd=1.8+Math.random()*2.8;particles.push({x:px,y:py,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd-2,life:18+Math.random()*14,c:Math.random()>.35?col||'#f0c030':'#ffffff'});}}
function drawPlayerStatusEffects(){
  const p=pl[0];
  const px=p.visualX-camX,py=p.visualY-camY-16;
  if(px<-60||px>W+60||py<-60||py>H+60)return;

  // EXHAUSTED indicator
  if(sp.s<=0&&sp.b<=0&&sp.c<=0){
    const flicker=Math.sin(fr*0.2)*0.2+0.8;
    g.globalAlpha=flicker;
    tx('EXHAUSTED',px-32,py-16,5,'#d04040');
    g.globalAlpha=1;
  }

  // Sparkle particles when player has 4+ cards
  const cardCount=pl[0].cd.filter(c=>c>0).length;
  if(cardCount>=4){
    if(fr%6===0){
      statusSparkles.push({
        x:px+6+Math.random()*20,y:py+4+Math.random()*28,
        vx:(Math.random()-0.5)*0.6,vy:-0.5-Math.random()*0.4,
        life:18+Math.random()*10
      });
    }
    for(let i=statusSparkles.length-1;i>=0;i--){
      const s=statusSparkles[i];
      s.x+=s.vx;s.y+=s.vy;s.life--;
      if(s.life<=0){statusSparkles.splice(i,1);continue;}
      const sa=Math.min(1,s.life/8);
      g.globalAlpha=sa;
      const sc_=Math.floor(fr*0.3+i)%2===0?'#f0e860':'#fff';
      bx(s.x,s.y,2,2,sc_);
      g.globalAlpha=1;
    }
  }else{
    statusSparkles.length=0;
  }

  // "+" floating up animation after getting a card
  if(cardGetAnimTimer>0){
    const progress=1-cardGetAnimTimer/40;
    const floatY=cardGetAnimY-progress*24;
    g.globalAlpha=1-progress;
    tx('+',cardGetAnimX+8,floatY,8,'#40d040');
    g.globalAlpha=1;
    cardGetAnimTimer--;
  }
  if(cardLostAnimTimer>0){
    const progress=1-cardLostAnimTimer/40;
    const floatY=cardLostAnimY+progress*16;
    g.globalAlpha=1-progress;
    tx('-',cardLostAnimX+8,floatY,8,'#d04040');
    g.globalAlpha=1;
    cardLostAnimTimer--;
  }

  // v87: World-space player status bubble in dungeon
  if(inDungeon){
    const hc=pl[0].cd.filter(c=>c>0).length;
    // Find most critical decay
    let minRemaining=Infinity;
    for(let i=0;i<HAND_SIZE;i++){
      if(pl[0].cd[i]>0&&cardTimers[i]>0){
        const rem=CARD_DECAY_MS-(Date.now()-cardTimers[i]);
        if(rem<minRemaining)minRemaining=rem;
      }
    }
    const hasCritical=minRemaining<60000&&minRemaining>0;
    const isUrgent=minRemaining<20000&&minRemaining>0;
    const bubbleAlpha=isUrgent?(0.7+Math.sin(fr*0.3)*0.3):hasCritical?0.65:0.45;
    const bubbleCol=isUrgent?'#ff4040':hasCritical?'#e08030':'#506880';
    const cardStr='\u2660'+hc;
    const decStr=hasCritical?(' '+Math.ceil(minRemaining/1000)+'s'):'';
    const fullStr=cardStr+decStr;
    const bW=fullStr.length*5+12;
    const bX=px+16-bW/2,bY=py-36;
    g.globalAlpha=bubbleAlpha;
    bx(bX,bY,bW,13,'rgba(4,4,14,.88)');
    bx(bX,bY,bW,1,bubbleCol);
    tx(fullStr,bX+4,bY+11,5,isUrgent?'#ff8080':hasCritical?'#e8b060':'#90b0c0');
    g.globalAlpha=1;
  }
}

// ── Battle phase system ──
let battlePhase='select';
let bpFrame=0,bpAction=-1,bpResolveQueue=[],bpResolveIdx=0;
let bpShakeTarget=-1,bpShakeTimer=0;
// ── Battle HP (hearts) ── [player, rival1, rival2]
const BATTLE_HP_MAX=3;
let bpHP=[BATTLE_HP_MAX,BATTLE_HP_MAX,BATTLE_HP_MAX];
let bpHPDmgAnim=[0,0,0]; // frames remaining for HP damage flash per combatant

// ── Card acquisition animation ──
let cardAcqActive=false,cardAcqFrame=0,cardAcqCard=-1,cardAcqDone=false;
let cardAcqIsNew=false,cardAcqWasNew=false; // v96: track first-time unique card
const cardAcqParticles=[];

// ── Victory screen ──
let victoryFrame=0,victoryCardsShown=0;
let victoryClaimed=false,victoryClaimedTx='',victoryMinted=false,victoryMintProgress=0,victoryMinting=false;

// ── Footstep counter ──
let stepCounter=0;

// ── Random map events ──
let randomEventTimer=0;
let randomEventActive=false, randomEventText='', randomEventFrame=0;

// ── Trading Post state ──
let shopActive=false, shopSelectedIdx=0, shopConfirm=false, shopResultText='', shopResultFrame=0, shopPhase='list';
// v74: Synthesis (Alchemist NPC) state
let synthActive=false, synthPhase='pick', synthSelected=[], synthRarityFilter=1, synthResultCard=-1, synthResultFrame=0;

// ── Dungeon entry confirmation ──
let dungeonConfirmActive=false, dungeonConfirmExit=null;

// ── Marketplace state ──
let marketActive=false, marketTab=0, marketPage=0, marketFilter='all';
const MARKET_TABS=['MY CARDS','BROWSE','SELL'];
const MARKET_PAGE_SIZE=12; // 4×3

// ── Gacha state ──
let gachaActive=false, gachaPhase='menu', gachaSelectedTier=0, gachaResultCard=-1, gachaResultFrame=0, gachaSpinFrame=0;
let gachaHistory=[]; // v86: last pulls [{cardId, rarity}] (max 8)
const GACHA_TIERS=[
  {name:'Common Draw',   cost:0.01, label:'0.01 SOL', pool:'common',  rarities:[1,1,1,1,2]},   // 80% r1, 20% r2
  {name:'Rare Draw',     cost:0.05, label:'0.05 SOL', pool:'rare',    rarities:[2,2,3,3,3]},   // r2-r3
  {name:'Epic Draw',     cost:0.20, label:'0.20 SOL', pool:'epic',    rarities:[3,4,4,4,5]},   // r3-r5
];
let gachaPityCount=0; // pulls since last rare+ draw
let gachaPityTriggered=false; // whether last pull was a pity guarantee
const GACHA_PITY_THRESHOLD=10; // guarantee rare+ after this many pulls

function gachaPickCard(tierIdx){
  const t=GACHA_TIERS[tierIdx];
  let r;
  // Pity system: guarantee rare (3+) after GACHA_PITY_THRESHOLD non-rare pulls
  const forcePity=gachaPityCount>=GACHA_PITY_THRESHOLD;
  if(forcePity){
    // Force rare+ from tier's available rarities
    const rareRarities=t.rarities.filter(rr=>rr>=3);
    r=rareRarities.length>0?rareRarities[Math.floor(Math.random()*rareRarities.length)]:t.rarities[t.rarities.length-1];
    gachaPityCount=0;gachaPityTriggered=true;
  }else{
    r=t.rarities[Math.floor(Math.random()*t.rarities.length)];
    gachaPityTriggered=false;
    if(r>=3)gachaPityCount=0; else gachaPityCount++;
  }
  const pool=CD.map((_,i)=>i+1).filter(id=>CD[id-1].r===r);
  if(pool.length===0)return 1+Math.floor(Math.random()*60);
  // Prefer cards player hasn't collected yet (vault-new)
  const vault_g=pl[0].vault||new Set();
  const newPool_g=pool.filter(id=>!vault_g.has(id));
  const usePool_g=newPool_g.length>0?newPool_g:pool;
  return usePool_g[Math.floor(Math.random()*usePool_g.length)];
}

// ── Signpost state ──
let signpostActive=false, signpostText='', signpostFrame=0;

// ── Discard system ──
let discardActive=false, discardSelIdx=0, discardPendingCard=-1, discardSource='';

// ── Tutorial system ──
let tutorialFlags={firstStep:false,firstGrass:false,gotFirstCard:false,firstMapChange:false,firstBattle:false,
  firstFloor2:false,firstFloor3:false,firstFloor4:false,firstFloor5:false,firstGacha:false};
let tutorialMsg='', tutorialMsgTimer=0;

// ── Intro tutorial (rules) ──
let introActive=false, introPage=0, introFrame=0;
const INTRO_PAGES=[
  'Welcome to はじまりのまち —\nthe only safe harbor on ARK Isle.\nArrows:Move  Z:Confirm  X:Back',
  'Long ago, the ARK vessel sank here.\nIts crew sealed their power into\n60 arcane cards — scattered across the isle.',
  'Collect all 60 cards.\nInherit the ARK\'s legacy.\nClaim the Prize Pool. First to 60 wins.',
  'Town is your sanctuary.\nShop, Gacha, Trade, Synthesize here.\nNo battles in town — rest safely.',
  'The Dungeon lies to the EAST.\nCards DECAY underground — 3.5 min.\nEscape WEST before they crumble.',
  'Battle uses Spell energy (top-left).\nSTEAL=1S  BARRIER=1B  SCOUT=1C\nDepleted energy = EXHAUSTED.',
  'VEGA: relentless hunter.\nTracks and takes without mercy.\nMIRA: cold strategist. Calculates all.',
  'USE CARD in battle:\nAttack=force steal  Flee=escape\nMagic=strip all barriers!',
  'Information is power.\nThe x402 Broker sells rival intel.\nGood luck. Trust no one.',
];

// ── Battle encounter exclamation ──
let encounterExclActive=false, encounterExclFrame=0, encounterExclTarget=-1;
let encounterRivalLine=''; // context-sensitive line for exclamation animation
let encounterExclPlayerX=0, encounterExclPlayerY=0, encounterExclRivalX=0, encounterExclRivalY=0;



// ═══════════════════════════════════════
// AREA-SPECIFIC EVENTS
// ═══════════════════════════════════════

// ── FISHING STATE (Corsair Bay) ──
let fishingActive=false, fishingPhase='idle', fishingTimer=0, fishingBiteFrame=0;
let fishingCooldownTimer=0; // 15-sec cooldown (900 frames)
const FISHING_COOLDOWN=900;

// ── TRAPS STATE (Forest) ──
const forestTraps=new Set(['1-6-6','1-20-12','1-12-18','1-32-14']); // mapIdx-x-y
const triggeredTraps=new Set();

// ── PUZZLES STATE (Ruins) ──
// 3 colored stones: positions cycle 0,1,2 — correct order is red=0,blue=1,yellow=2
let puzzleStoneOrder=[2,0,1]; // start wrong: yellow,red,blue
let puzzleSolved=false;
let puzzleMessage='', puzzleMessageTimer=0;
// Puzzle pillar locations on ruins map (near blocked passage)
const puzzlePillarPositions=[{x:14,y:25},{x:15,y:25},{x:16,y:25}];
const puzzleColors=['#c04040','#4060c0','#d0c040']; // red, blue, yellow
const puzzleNames=['FIRE','WATER','LIGHT'];

// ═══════════════════════════════════════
// ENTERABLE BUILDINGS
// ═══════════════════════════════════════
let inBuilding=false, buildingType='', buildingPlayerX=4, buildingPlayerY=6;
let buildingPlayerDir=0, buildingReturnX=0, buildingReturnY=0, buildingReturnMap=0;
const BUILDING_W=10, BUILDING_H=8;

// Trading Post interior map (10x8): 0=floor, 1=wall, 2=counter, 3=shelf, 4=exit, 5=npc
const BUILDING_SHOP=[
  [1,1,1,1,1,1,1,1,1,1],
  [1,3,0,0,0,0,0,0,3,1],
  [1,0,0,0,0,0,0,0,0,1],
  [1,0,2,2,2,2,2,0,0,1],
  [1,0,0,0,5,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,4,4,1,1,1,1],
];

// Spy Masters Den interior map (10x8)
const BUILDING_INFO=[
  [1,1,1,1,1,1,1,1,1,1],
  [1,3,0,0,0,0,0,0,3,1],
  [1,0,0,0,0,0,0,0,0,1],
  [1,0,0,2,2,2,0,0,0,1],
  [1,0,0,0,5,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,4,4,1,1,1,1],
];

let buildingNpcDialog=false, buildingNpcLines=[], buildingNpcIdx=0, buildingNpcName='';
let infoBrokerConfirm=false, infoBrokerResult='', infoBrokerResultTimer=0;

// ═══════════════════════════════════════
// x402 INTEGRATION
// ═══════════════════════════════════════
const X402_DEFAULT_URL='http://localhost:3402';
let x402ServerUrl=localStorage.getItem('oxark_x402_url')||X402_DEFAULT_URL;
let x402Available=false;
let x402CheckTimer=0;
let x402ShopOpen=false;
let x402ShopIdx=0;
let x402ShopResult='';
let x402ShopResultTimer=0;
let x402ShopLoading=false;
let x402HowItWorksActive=false;
const x402ShopItems=[
  {label:'VEGA Location',desc:'Where is VEGA?',price:'$0.002 USDC',priceOffline:'1 card',endpoint:'/intel/location/1'},
  {label:'MIRA Location',desc:'Where is MIRA?',price:'$0.002 USDC',priceOffline:'1 card',endpoint:'/intel/location/2'},
  {label:'VEGA Hand',desc:'What cards does VEGA hold?',price:'$0.003 USDC',priceOffline:'1 card',endpoint:'/intel/hand/1'},
  {label:'MIRA Hand',desc:'What cards does MIRA hold?',price:'$0.003 USDC',priceOffline:'1 card',endpoint:'/intel/hand/2'},
  {label:'Strategy Advice',desc:'Best move right now',price:'$0.005 USDC',priceOffline:'2 cards',endpoint:'/intel/strategy',cardCost:2},
  {label:'Market Data',desc:'Card pool status',price:'free',priceOffline:'free',endpoint:'/intel/market',cardCost:0},
  {label:'HOW IT WORKS',desc:'x402 protocol explained',price:'free',priceOffline:'free',endpoint:'_howItWorks',cardCost:0,isInfo:true},
  {label:'AGENT MARKETPLACE',desc:'Coming Soon',price:'--',priceOffline:'--',endpoint:'_agentMarketplace',cardCost:0,isInfo:true},
];
let agentMarketplaceActive=false;
const agentMarketplaceText=[
  'AGENT MARKETPLACE (Coming Soon)',
  '',
  'Deploy your own AI agent to trade',
  'intel and earn USDC.',
  '',
  'Agents earn 95% of transaction',
  'revenue. Platform takes 5%.',
  '',
  'Scout agents, negotiation specialists,',
  'deception agents \u2014 build and sell.',
];
const x402HowItWorksText=[
  'Perfect information is expensive.',
  'Deception is profitable.',
  '',
  'AI agents sell real intel for USDC',
  'micropayments via x402 protocol.',
  'No subscriptions. No API keys.',
  'Micropayments flow automatically.',
  'HTTP 402 Payment Required \u2014',
  'a pay-to-know economy on Solana.',
];

async function x402CheckServer(){
  try{
    const r=await fetch(x402ServerUrl+'/health',{signal:AbortSignal.timeout(1500)});
    if(r.ok){const d=await r.json();x402Available=d.status==='ok';}
    else x402Available=false;
  }catch(e){x402Available=false;/* silent — server not running */}
}

async function x402PushState(){
  if(!x402Available)return;
  try{
    // Build 60-slot card arrays: player uses vault (full unique set), rivals use cd array
    const buildPlayerCards=(p,i)=>{
      if(i===0){
        // Player: vault is a Set of unique card IDs collected; expand to 60-slot array
        const arr=new Array(60).fill(0);
        if(p.vault instanceof Set){
          let slot=0;
          for(const cid of p.vault){if(cid>0&&cid<=60&&slot<60)arr[slot++]=cid;}
        } else {
          // fallback: use cd array
          for(let s=0;s<Math.min(p.cd.length,60);s++)arr[s]=p.cd[s]||0;
        }
        return arr;
      } else {
        // Rivals: cd is their hand (5 slots), pad to 60
        const arr=new Array(60).fill(0);
        for(let s=0;s<Math.min((p.cd||[]).length,60);s++)arr[s]=(p.cd||[])[s]||0;
        return arr;
      }
    };
    const statePayload={
      players:pl.map((p,i)=>({
        id:i,name:p.n,area:i===0?currentMap:(rivalMaps[i-1]??0),
        cards:buildPlayerCards(p,i),
        cardCount:i===0?(p.vault instanceof Set?p.vault.size:p.cd.filter(c=>c>0).length):p.cd.filter(c=>c>0).length
      })),
      cardPool:{},
      round:rd||0,
      currentMap:currentMap,
      rivalMaps:[...rivalMaps],
    };
    await fetch(x402ServerUrl+'/update-state',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(statePayload),
      signal:AbortSignal.timeout(2000)
    });
  }catch(e){}
}

async function x402FetchIntel(endpoint){
  if(!x402Available)return null;
  try{
    const r=await fetch(x402ServerUrl+endpoint,{
      headers:{'X-Payment':'local-dev-bypass'},
      signal:AbortSignal.timeout(3000)
    });
    if(r.ok)return await r.json();
    return null;
  }catch(e){return null;}
}

function x402SetUrl(url){
  x402ServerUrl=url;
  localStorage.setItem('oxark_x402_url',url);
  x402CheckServer();
}

// ═══════════════════════════════════════
// INTERACTABLE OBJECTS
// ═══════════════════════════════════════
const shakenTrees=new Set(); // "mapIdx-x-y"
const pushedRocks=new Set();
const usedCrystals=new Set();
let campfireUsed=false;
let fountainActive=false, fountainConfirm=false, fountainResult='', fountainResultTimer=0;
let crystalRevealTimer=0; // frames remaining for crystal rival reveal
let objectInteractMsg='', objectInteractTimer=0;
// v85: Floor-clear fanfare overlay
let floorFanfareActive=false, floorFanfareTimer=0;
let floorFanfareData=null; // {floor, cardId, rarity, isNew}
// Rival background activity: rivals collect cards from dungeon floors periodically
const rivalBgTimer=[0,0]; // countdown frames until next background card collection per rival

// ═══════════════════════════════════════
// CARDS USED ON MAP
// ═══════════════════════════════════════
let shadowStepsLeft=0;
const burnedTiles=[]; // {mapIdx, x, y} — tiles burned by Flame
let mapCardUseActive=false, mapCardUseIdx=0;
let mapCardDirSelect=false, mapCardDirIdx=0, mapCardPendingType=-1;

// ── TENSION MECHANICS ──
// Card Decay Timer: each slot stores timestamp when card was acquired (0 = empty)
const CARD_DECAY_MS=210000; // 210 seconds (3.5 minutes) real-time — slightly more breathing room
const cardTimers=new Array(HAND_SIZE).fill(0); // parallel to pl[0].cd[HAND_SIZE] — only active in dungeon
const decayWarn=new Array(HAND_SIZE).fill(0); // 0=none,1=50%warned,2=30swarned,3=criticalwarned per slot
// v113: Card slot shatter animation state (frame when shattering began, 0=inactive)
const cardShatterTimers=new Array(HAND_SIZE).fill(0);
let cardDecayWarningFlash=0; // frame counter for warning flash
let escapeUrgencyActive=false; // true when any card has <30s remaining in dungeon
let escapeUrgencyPulse=0; // frame counter for escape urgency animation

// Streak Bonus: consecutive successful actions
let streakCount=0;
let streakDisplayTimer=0; // frames to show streak pop animation
let streakLostTimer=0; // frames to show streak lost

// Area Danger Level: per-map dynamic danger (0=Town, 1-5=Dungeon floors)
const areaDanger=new Array(FOG_MAP_COUNT).fill(0); // 0.0 to 1.0 per map
const areaDangerStayTimer=new Array(FOG_MAP_COUNT).fill(0); // frames stayed per map
const DANGER_LOW_THRESH=0.33;
const DANGER_HIGH_THRESH=0.66;

// Quick-Time Event during battle resolution
let qteActive=false, qteFrame=0, qteSuccess=false, qteWindow=30; // 0.5s at 60fps
let qteKeyPressed=false, qteEventIdx=-1, qteType=''; // 'defend' or 'attack'
let qteResultText='', qteResultTimer=0;

// SFX for new features
function resetNewFeatureState(){
  triggeredTraps.clear();shakenTrees.clear();pushedRocks.clear();usedCrystals.clear();
  puzzleStoneOrder=[2,0,1];puzzleSolved=false;campfireUsed=false;
  burnedTiles.length=0;shadowStepsLeft=0;fishingCooldownTimer=0;
  fishingActive=false;inBuilding=false;crystalRevealTimer=0;
  mapCardUseActive=false;fountainActive=false;
  footprints.length=0;proximityDangerLevel=0;rivalDangerAlertShown=false;proximityTauntText='';proximityTauntTimer=0;encounterRivalLine='';
  // Reset all UI overlay states
  wildEncounterActive=false;npcDialogActive=false;shopActive=false;signpostActive=false;gachaActive=false;marketActive=false;dungeonConfirmActive=false;synthActive=false;
  discardActive=false;cardAcqActive=false;cardAcqDone=false;randomEventActive=false;
  encounterExclActive=false;
  x402ShopOpen=false;x402ShopLoading=false;x402ShopResult='';x402ShopResultTimer=0;x402HowItWorksActive=false;agentMarketplaceActive=false;
  infoBrokerConfirm=false;infoBrokerResult='';infoBrokerResultTimer=0;
  buildingNpcDialog=false;fountainConfirm=false;fountainResultTimer=0;
  // Tension mechanics reset
  for(let i=0;i<HAND_SIZE;i++){cardTimers[i]=0;decayWarn[i]=0;}
  escapeUrgencyActive=false;escapeUrgencyPulse=0;
  streakCount=0;streakDisplayTimer=0;streakLostTimer=0;
  gachaPityCount=0;gachaPityTriggered=false; // v150: reset pity counter per game
  milestonesReached.clear(); // v150: allow milestone toasts to retrigger in new game
  victoryClaimed=false;victoryClaimedTx='';victoryMinted=false;victoryMintProgress=0;victoryMinting=false; // v151
  for(let i=0;i<FOG_MAP_COUNT;i++){areaDanger[i]=0;areaDangerStayTimer[i]=0;}
  rivalBgTimer[0]=1800;rivalBgTimer[1]=2400; // stagger initial timers (30s/40s)
  qteActive=false;qteKeyPressed=false;
  // v73: clear rival news ticker
  rivalNewsQueue.length=0;rivalNewsCurrent=null;rivalNewsFrame=0;
  // v72: clear run summary
  dungeonRunSnapshot=null;runSummaryActive=false;runSummaryData=null;runMission=null;roundsThisRun=0;
  // v77: clear hand inspect
  handInspectActive=false;handInspectFrame=0;
}

function resetGameState(startCards){
  clearSave();fogClear();stakeDeposited=false;gameOverTimesUp=false;_winTransitionPending=false;
  // Player: reset hand + vault; give 3 starter cards (one per type: attack, defense, flee)
  const starterCards=[4,13,25]; // Strike(attack), Guard(defense), Dash(flee) - all Common
  const cards0=makeEmptyHand();
  const vault0=new Set();
  starterCards.forEach((cid,i)=>{cards0[i]=cid;vault0.add(cid);});
  const cc0=vault0.size;
  // VEGA (hunter): starts with 2 aggressive attack cards — SLASH(5) + STRIKE(4) for floor 1
  // MIRA (collector): starts with 2 strategic defense/flee cards — GUARD(13) + PARRY(14)
  const vegaCards=[5,4,0,0,0];  // SLASH + STRIKE (both common attack)
  const miraCards=[13,14,0,0,0]; // GUARD + PARRY (both common defense)
  const cards1=vegaCards;const cc1=2;
  const cards2=miraCards;const cc2=2;
  pl[0].cd=cards0;pl[0].vault=vault0;pl[0].cc=cc0;
  pl[0].x=15;pl[0].y=13;pl[0].dir=0;pl[0].step=0;pl[0].visualX=15*TW;pl[0].visualY=13*TH;pl[0].walkFrame=0;
  // Rivals start on dungeon floor 1, spread apart
  pl[1].cd=cards1;pl[1].cc=cc1;pl[1].x=8;pl[1].y=10;pl[1].dir=2;pl[1].step=0;pl[1].visualX=8*TW;pl[1].visualY=10*TH;pl[1].walkFrame=0;
  pl[2].cd=cards2;pl[2].cc=cc2;pl[2].x=28;pl[2].y=18;pl[2].dir=0;pl[2].step=0;pl[2].visualX=28*TW;pl[2].visualY=18*TH;pl[2].walkFrame=0;
  sp.s=2;sp.b=3;sp.c=2;rd=1;currentMap=0;inDungeon=false;currentFloor=0;stepCounter=0;randomEventTimer=0;encounterCooldown=600;
  initSeason();
  rivalMaps=[1,1]; // GDD v1.0: rivals start in dungeon floor 1
  // Reset rival AI — explore toward far end of floor 1 (away from entrance at x=3)
  rivalAI[0].goalX=32;rivalAI[0].goalY=12;rivalAI[0].goalMap=1;rivalAI[0].state='exploring';
  rivalAI[0].moveTimer=0;rivalAI[0].moveInterval=10;rivalAI[0].lastKnownPlayerMap=-1;
  rivalAI[0].lastKnownPlayerX=-1;rivalAI[0].lastKnownPlayerY=-1;rivalAI[0].stateTimer=0;rivalAI[0].huntCooldown=0;
  rivalAI[1].goalX=32;rivalAI[1].goalY=18;rivalAI[1].goalMap=1;rivalAI[1].state='exploring';
  rivalAI[1].moveTimer=0;rivalAI[1].moveInterval=14;rivalAI[1].lastKnownPlayerMap=-1;
  rivalAI[1].lastKnownPlayerX=-1;rivalAI[1].lastKnownPlayerY=-1;rivalAI[1].stateTimer=0;rivalAI[1].huntCooldown=0;
  footprints.length=0;proximityDangerLevel=0;rivalDangerAlertShown=false;proximityTauntText='';proximityTauntTimer=0;encounterRivalLine='';
  rivalBgTimer[0]=1800;rivalBgTimer[1]=2400;
  stopDangerDrone();
  lg.length=0;
  lg.push('New game! Starter cards: '+starterCards.map(id=>CD[id-1].n).join(', '));
  lg.push('Collect all 60 cards to win the Prize Pool!');
  treasures.forEach(t=>t.collected=false);
  tutorialFlags={firstStep:false,firstGrass:false,gotFirstCard:false,firstMapChange:false,firstBattle:false,
    firstFloor2:false,firstFloor3:false,firstFloor4:false,firstFloor5:false,firstGacha:false};
  resetNewFeatureState();
  // Card timers: inactive in town at start (decay only starts when entering dungeon)
  for(let i=0;i<HAND_SIZE;i++){cardTimers[i]=0;decayWarn[i]=0;}
  escapeUrgencyActive=false;escapeUrgencyPulse=0;
  tileCacheDirty=true;edgeCacheDirty=true;fogCacheDirty=true;
}

function sfxFishCast(){if(!soundEnabled)return;beep(300,.08,.06);setTimeout(()=>beep(200,.06,.05),80);}
function sfxFishBite(){if(!soundEnabled)return;beep(880,.04,.08);setTimeout(()=>beep(1100,.06,.08),40);}
function sfxFishCatch(){if(!soundEnabled)return;beep(440,.06,.06);setTimeout(()=>beep(660,.06,.06),60);setTimeout(()=>beep(880,.08,.07),120);}
function sfxFishMiss(){if(!soundEnabled)return;beep(200,.1,.06);}
function sfxTrap(){if(!soundEnabled)return;beep(150,.08,.1);setTimeout(()=>beep(100,.1,.1),80);}
function sfxPuzzle(){if(!soundEnabled)return;beep(440,.06,.06);setTimeout(()=>beep(550,.06,.06),60);setTimeout(()=>beep(660,.06,.06),120);setTimeout(()=>beep(880,.1,.08),180);}
function sfxBurn(){if(!soundEnabled)return;try{const s=AC.createBufferSource(),gn=AC.createGain(),f=AC.createBiquadFilter();s.buffer=noiseBuf;f.type='bandpass';f.frequency.value=1500;f.Q.value=1;gn.gain.setValueAtTime(.1,AC.currentTime);gn.gain.linearRampToValueAtTime(0,AC.currentTime+.2);s.connect(f);f.connect(gn);gn.connect(AC.destination);s.start();s.stop(AC.currentTime+.2);}catch(e){}}
function sfxPhase(){if(!soundEnabled)return;beep(600,.04,.06);setTimeout(()=>beep(400,.06,.05),50);setTimeout(()=>beep(800,.08,.06),100);}
function sfxCardDecayWarn(){if(!soundEnabled)return;beep(200,.06,.06);setTimeout(()=>beep(150,.08,.06),60);}
function sfxCardExpired(){if(!soundEnabled)return;beep(100,.12,.08);setTimeout(()=>beep(80,.1,.06),80);}
function sfxStreakUp(){if(!soundEnabled)return;beep(660,.04,.06);setTimeout(()=>beep(880,.04,.06),40);setTimeout(()=>beep(1100,.06,.07),80);}
function sfxStreakLost(){if(!soundEnabled)return;beep(300,.06,.06);setTimeout(()=>beep(200,.08,.05),60);}
function sfxQtePrompt(){if(!soundEnabled)return;beep(1000,.03,.08);setTimeout(()=>beep(1200,.03,.08),30);}
function sfxQteSuccess(){if(!soundEnabled)return;beep(880,.04,.07);setTimeout(()=>beep(1320,.06,.08),40);}
function sfxQteMiss(){if(!soundEnabled)return;beep(200,.06,.05);}


// ── AREA ENTRY, UNIQUE CARD STING, TENSION DRUM SFX ──
function sfxAreaEntry(){if(!soundEnabled)return;try{const s=AC.createBufferSource(),gn=AC.createGain(),f=AC.createBiquadFilter();s.buffer=noiseBuf;f.type='bandpass';f.frequency.setValueAtTime(400,AC.currentTime);f.frequency.linearRampToValueAtTime(100,AC.currentTime+.5);f.Q.value=1;gn.gain.setValueAtTime(.12,AC.currentTime);gn.gain.linearRampToValueAtTime(0,AC.currentTime+.5);s.connect(f);f.connect(gn);gn.connect(AC.destination);s.start();s.stop(AC.currentTime+.5);const o=AC.createOscillator(),gn2=AC.createGain();o.type='triangle';o.frequency.setValueAtTime(150,AC.currentTime);o.frequency.linearRampToValueAtTime(80,AC.currentTime+.4);gn2.gain.setValueAtTime(.06,AC.currentTime);gn2.gain.linearRampToValueAtTime(0,AC.currentTime+.4);o.connect(gn2);gn2.connect(AC.destination);o.start();o.stop(AC.currentTime+.4);}catch(e){}}
function sfxUniqueCardSting(){if(!soundEnabled)return;try{const notes=[523,659,784,988,1047];notes.forEach((f,i)=>{setTimeout(()=>{try{const o=AC.createOscillator(),gn=AC.createGain();o.type='square';o.frequency.value=f;gn.gain.setValueAtTime(.07,AC.currentTime);gn.gain.linearRampToValueAtTime(0,AC.currentTime+.15);o.connect(gn);gn.connect(AC.destination);o.start();o.stop(AC.currentTime+.15);}catch(e){}},i*80);});}catch(e){}}
let tensionDrumNode=null,tensionDrumGain=null;
function startTensionDrum(){if(!soundEnabled||tensionDrumNode)return;try{const o=AC.createOscillator(),gn=AC.createGain(),lfo=AC.createOscillator(),lfoG=AC.createGain();o.type='triangle';o.frequency.value=60;lfo.type='square';lfo.frequency.value=1.5;lfoG.gain.value=.04;gn.gain.value=0;lfo.connect(lfoG);lfoG.connect(gn.gain);o.connect(gn);gn.connect(AC.destination);o.start();lfo.start();tensionDrumNode=o;tensionDrumGain=gn;tensionDrumNode._lfo=lfo;}catch(e){}}
function stopTensionDrum(){if(tensionDrumNode){try{tensionDrumGain.gain.linearRampToValueAtTime(0,AC.currentTime+0.3);setTimeout(()=>{try{tensionDrumNode.stop();tensionDrumNode._lfo.stop();tensionDrumNode.disconnect();}catch(e){}tensionDrumNode=null;tensionDrumGain=null;},400);}catch(e){tensionDrumNode=null;tensionDrumGain=null;}}}

// ── SESSION STATS ──
const STATS_KEY='oxark_stats';
let stats={gamesPlayed:0,cardsCollected:0,cardsLost:0,stealsAttempted:0,stealsBlocked:0,scoutUses:0,stepsWalked:0,timePlayed:0,areaTime:new Array(FOG_MAP_COUNT).fill(0),sessionStart:Date.now(),bestClearRounds:0,bestClearTime:0};
function loadStats(){try{const raw=localStorage.getItem(STATS_KEY);if(raw){const d=JSON.parse(raw);Object.keys(d).forEach(k=>{if(stats.hasOwnProperty(k))stats[k]=d[k];});// Migrate old 3-element areaTime to FOG_MAP_COUNT
if(!Array.isArray(stats.areaTime)||stats.areaTime.length<FOG_MAP_COUNT){const old=Array.isArray(stats.areaTime)?stats.areaTime:[];stats.areaTime=new Array(FOG_MAP_COUNT).fill(0);old.forEach((v,i)=>{if(i<FOG_MAP_COUNT)stats.areaTime[i]=v||0;});}}}catch(e){}}
function saveStats(){try{stats.timePlayed=Math.floor((Date.now()-stats.sessionStart)/1000);localStorage.setItem(STATS_KEY,JSON.stringify(stats));}catch(e){}}
loadStats();stats.sessionStart=Date.now();

// ── OPENING STORY STATE ──
// (story system removed — replaced by intro tutorial)

// ── CREDITS STATE ──
let creditsActive=false,creditsFrame=0;
const CREDITS_LINES=['','0 x A R K','','Created by r0ze','','Built for Colosseum Frontier 2026','','Powered by','Solana | Anchor | Circom | x402','','Pixel Art: Kenney (CC0)','','Thanks for playing!',''];

// ── SEASON SYSTEM ──
const SEASON_DURATION_MS=7*24*60*60*1000; // 7 days
let seasonStartTime=0; // timestamp when current season started
let seasonEndTime=0;   // timestamp when season ends
let gameOverTimesUp=false; // true when season expired

function initSeason(){
  seasonStartTime=Date.now();
  seasonEndTime=seasonStartTime+SEASON_DURATION_MS;
}
function getSeasonRemaining(){return Math.max(0,seasonEndTime-Date.now());}
function formatTimeRemaining(ms){
  if(ms<=0)return'ENDED';
  const d=Math.floor(ms/86400000);const h=Math.floor((ms%86400000)/3600000);const m=Math.floor((ms%3600000)/60000);
  if(d>0)return d+'d '+h+'h';
  if(h>0)return h+'h '+m+'m';
  return m+'m';
}
function getPlayElapsed(){return Date.now()-seasonStartTime;}

const lg=['Game started. Collect all 60 cards to win the Prize Pool!'];
let logScrollOff=0;

// v105: Collection milestone toast
const CARD_MILESTONES=[5,10,20,30,45,50,55];
const CARD_MILESTONE_MSG={
  5:'FIRST STEPS — 5 cards!',
  10:'GROWING COLLECTION — 10 cards!',
  20:'NOTABLE COLLECTOR — 20/60!',
  30:'HALFWAY THERE — 30/60!',
  45:'ALMOST COMPLETE — 45/60!',
  50:'INCREDIBLE — 50/60!',
  55:'SO CLOSE — 55/60!'
};
let milestoneToastText='';
let milestoneToastFrame=-999;
const milestonesReached=new Set();

