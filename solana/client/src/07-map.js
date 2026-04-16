// MAP SCREEN
// ═══════════════════════════════════════
const HUD_HEIGHT=72;
// v220: Card-count helper — avoids .filter().length array allocation on every frame
function cdCount(cd){let n=0;for(let i=0,l=cd.length;i<l;i++)if(cd[i]>0)n++;return n;}
// v260: Unique card count — allocation-free (5-slot hand, simple dedup check)
function cdUniq(cd){let n=0;for(let i=0,l=cd.length;i<l;i++){const c=cd[i];if(c<=0)continue;let dup=false;for(let j=0;j<i;j++){if(cd[j]===c){dup=true;break;}}if(!dup)n++;}return n;}

// Pre-built edge gradients for map boundary vignette (avoids creating gradient objects every frame)
const _edgeFade=20;
const _mapEdgeGradL=(()=>{const gr=g.createLinearGradient(0,0,_edgeFade,0);gr.addColorStop(0,'#000');gr.addColorStop(1,'rgba(0,0,0,0)');return gr;})();
const _mapEdgeGradR=(()=>{const gr=g.createLinearGradient(W-_edgeFade,0,W,0);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'#000');return gr;})();
const _mapEdgeGradT=(()=>{const gr=g.createLinearGradient(0,0,0,_edgeFade);gr.addColorStop(0,'#000');gr.addColorStop(1,'rgba(0,0,0,0)');return gr;})();
const _mapEdgeGradB=(()=>{const gr=g.createLinearGradient(0,H-HUD_HEIGHT-_edgeFade,0,H-HUD_HEIGHT);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'#000');return gr;})();

// v219: Pre-baked proximity danger vignette — avoid createRadialGradient every frame
const _proxVigCanvas=(()=>{const c=document.createElement('canvas');c.width=W;c.height=H-HUD_HEIGHT;const ctx=c.getContext('2d');const grd=ctx.createRadialGradient(W/2,(H-HUD_HEIGHT)/2,W*0.3,W/2,(H-HUD_HEIGHT)/2,W*0.7);grd.addColorStop(0,'rgba(0,0,0,0)');grd.addColorStop(1,'rgba(180,30,30,1)');ctx.fillStyle=grd;ctx.fillRect(0,0,W,H-HUD_HEIGHT);return c;})();

// v244: Pre-baked map decoration arc canvases — spider glow, glow-items, rope coil
const _spiderGlowCanvas=(()=>{const c=document.createElement('canvas');c.width=22;c.height=22;const ctx=c.getContext('2d');ctx.fillStyle='#806090';ctx.beginPath();ctx.arc(11,11,10,0,Math.PI*2);ctx.fill();return c;})();
const _glowItemOrangeCanvas=(()=>{const c=document.createElement('canvas');c.width=42;c.height=42;const ctx=c.getContext('2d');ctx.fillStyle='#f08040';ctx.beginPath();ctx.arc(21,21,20,0,Math.PI*2);ctx.fill();return c;})();
const _glowItemBlueCanvas=(()=>{const c=document.createElement('canvas');c.width=42;c.height=42;const ctx=c.getContext('2d');ctx.fillStyle='#80c0f0';ctx.beginPath();ctx.arc(21,21,20,0,Math.PI*2);ctx.fill();return c;})();
const _ropeCoilCanvas=(()=>{const c=document.createElement('canvas');c.width=14;c.height=10;const ctx=c.getContext('2d');ctx.fillStyle='#a09060';ctx.beginPath();ctx.ellipse(7,6,6,4,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#b0a070';ctx.beginPath();ctx.ellipse(7,6,4,2,0,0,Math.PI*2);ctx.fill();return c;})();
// v252: Hoist barrel/rope spot arrays — eliminates per-frame literal array allocation in town map render
const _BARREL_SPOTS=[[9,8],[10,8],[9,9],[21,8],[22,8]];
const _ROPE_SPOTS=[[12,22],[18,22]];
// v252: Pre-allocated sprite sort buffers — eliminates visiblePl.map()+{p,i} object allocs per frame
const _srtP=[null,null,null],_srtI=[0,0,0];
// v254: Hoisted pause menu items — eliminates inline literal array alloc per frame when menu is open
const _MENU_ITEMS=['CARDS','MAP','LOG','STATS','USE CARD','DISCARD','WALLET','TEXT SPD','SAVE','RULES','NEW GAME','CLOSE'];
// v261: Hoisted floor roman numerals — eliminates inline array alloc every HUD frame
const _FLOOR_NUMS=['','I','II','III','IV','V'];
// v262: Hoist HUD inline literals — floor watermark, orb labels/colors, dirs, trail colors, rarity abbrev
const _FLOOR_NAMES=['','FLOOR I','FLOOR II','FLOOR III','FLOOR IV','FLOOR V'];
const _FLOOR_WM_COLS=['','#8090b0','#506048','#8848c0','#c04020','#6010a0'];
const _ORB_SL=['STL','BAR','SCT'],_ORB_SCX=[100,175,250];
const _ORB_SF=['#c04848','#3868c0','#38a038'],_ORB_SE=['#2a1010','#101028','#0e1e0e'];
const _ORB_SLC=['#b04040','#3060b0','#308030'];
const _DIRS=['\u2192','\u2198','\u2193','\u2199','\u2190','\u2196','\u2191','\u2197'];
const _RIVAL_TRAIL_COLS=['#d860a0','#d8b028'];
const _RAR_ABB=['C','U','R','E','L'];
// v304: pre-baked strings — eliminates per-frame concat in hot render paths
const _WATER_FOAM_LT='rgba(200,220,240,.35)',_WATER_FOAM_DK='rgba(160,200,230,.2)'; // water-grass edge
const _LDR_RANK=['1.','2.','3.']; // leaderboard rank labels
const _RCC_SPADE=['0\u2660','1\u2660','2\u2660','3\u2660','4\u2660','5\u2660']; // rival card count + spade icon
// v309: pre-baked countdown + leaderboard uniq strings
const _SECS_STR=(()=>{const a=[];for(let i=0;i<=60;i++)a.push(i+'s');return a;})();
const _UNIQ60=(()=>{const a=[];for(let i=0;i<=60;i++)a.push(i+'/60');return a;})();
let _rLblCache=['','']; let _rLblKey=[-1,-1]; // rival sprite label cache [VEGA,MIRA]
let _vegaLblCache=''; let _vegaLblKey=-1; // vega HUD label cache (key=vegaMap*10+vegaCards)
let _miraLblCache=''; let _miraLblKey=-1; // mira HUD label cache
// v314: pre-baked HUD strings + lazy caches — eliminates per-frame concat in hot map HUD path
const _B_FLOOR=['','B1','B2','B3','B4','B5']; // dungeon floor indicators
const _SAFE_SECS=(()=>{const a=[];for(let i=0;i<=11;i++)a.push('SAFE '+i+'s');return a;})();
const _DANGER_LBL=['DANGER:LOW','DANGER:MED','DANGER:HIGH']; // pre-combined danger labels
const _STREAK_LBL=(()=>{const a=[];for(let i=0;i<=20;i++)a.push('STREAK:'+i+'x');return a;})();
const _HAND_LBL=(()=>{const a=[];for(let i=0;i<=15;i++)a.push('HAND:'+i);return a;})();
const _CARDS_LBL=(()=>{const a=[];for(let i=0;i<=60;i++)a.push('CARDS:'+i+'/60');return a;})();
let _stepsCache='STEPS:0',_stepsKey=-1; // stepCounter lazy cache
let _expLblCache='EXP:0%',_expLblKey=-1; // fog exploration % lazy cache
let _mapLblCache='MAP:0%',_mapLblKey=-1; // map exploration % lazy cache
let _timeLblMapCache='',_timeLblMapMin=-1; // season timer lazy cache for canvas HUD (per minute)
// v324: pre-baked small positive-int labels (+0…+20) for overflow counts
const _PLUS_INT=(()=>{const a=[];for(let i=0;i<=20;i++)a.push('+'+i);return a;})();
// v325-v326: lazy caches for rival off-floor HUD strip, trail exclamation, pot display, rival alert
let _rInfoLbl=['',''],_rInfoKey=[-1,-1]; // rival HUD info strip (key=rFloor*10+rcc2)
let _trailLbl=['',''],_trailNm=['','']; // rival trail '!' label (key=player name[0])
let _potLblCache='POT:0.00',_potLblRef=-1; // POT: display (key=stakePotAmount*100|0)
let _alertLblCache='',_alertLblRef=''; // rival alert label (key=rivalAlertName)
// v319: pre-baked distance-tile strings + near-win lazy cache
const _DIST_T=(()=>{const a=[];for(let i=0;i<=50;i++)a.push(i+'t');return a;})();
let _nearWinStr='RIVAL NEAR WIN!',_nearWinKey=-1;
// v226: Dungeon map floor atmosphere particles — subtle screen-space ambient effects per floor
// Seeded pseudo-random particle offsets so positions are deterministic (no state array needed)
const _dungAtmoSeeds=(()=>{
  const s=[];
  for(let i=0;i<24;i++){
    s.push({
      bx:((i*7919+113)&0x3FF)/1024.0,  // base X fraction (0..1)
      by:((i*2654+37)&0x3FF)/1024.0,   // base Y fraction (0..1)
      phase:((i*1337)&0xFF)/255.0*Math.PI*2, // random phase offset
      spd:0.4+((i*431+17)&0xFF)/255.0*0.9,  // individual speed 0.4..1.3
    });
  }
  return s;
})();
// Floor particle config: [count, color, maxAlpha, vx(px/fr), vy(px/fr), size, pulseFreq, type]
const _dungAtmoCfg=[
  null, // floor 0 placeholder
  {n:18,col:'#a8aeb8',a:0.16,vx:0.06,vy:-0.28,sz:1,pf:0.014,type:'dust'},   // F1: stone dust
  {n:16,col:'#7888b8',a:0.13,vx:-0.05,vy:-0.22,sz:1,pf:0.011,type:'dust'},  // F2: cool motes
  {n:12,col:'#9848e0',a:0.22,vx:0.04,vy:-0.18,sz:2,pf:0.020,type:'spark'},  // F3: crystal sparks
  {n:15,col:'#f03810',a:0.20,vx:0.10,vy:-0.55,sz:1,pf:0.026,type:'ember'},  // F4: embers
  {n: 8,col:'#5010b8',a:0.11,vx:0.03,vy:-0.12,sz:1,pf:0.007,type:'wisp'},  // F5: void wisps
];
function drawDungeonAtmos(){
  if(!inDungeon||sc!=='map')return;
  const fl=currentFloor;
  const cfg=_dungAtmoCfg[fl];
  if(!cfg)return;
  const visH=H-HUD_HEIGHT;
  const n=cfg.n;
  for(let i=0;i<n;i++){
    const sd=_dungAtmoSeeds[i];
    // Screen-space position: seeded base + slow drift, wrapped
    const px=((sd.bx*W + fr*cfg.vx*sd.spd)%W+W)%W;
    const py=((sd.by*visH + fr*cfg.vy*sd.spd)%visH+visH)%visH;
    // Fade at viewport top/bottom edges (20px band)
    const edgeFade=Math.min(1,py/20,(visH-py)/20);
    let alpha=cfg.a*edgeFade;
    if(cfg.type==='spark'){
      // Crystal sparks: intermittent bright flickers
      alpha*=Math.max(0,Math.sin(fr*cfg.pf*3+sd.phase)*0.6+0.4);
    }else if(cfg.type==='ember'){
      // Embers: twinkle with slight size variation
      alpha*=0.6+Math.sin(fr*cfg.pf+sd.phase*2)*0.4;
    }else{
      // Dust/wisps: smooth slow pulse
      alpha*=0.7+Math.sin(fr*cfg.pf+sd.phase)*0.3;
    }
    if(alpha<0.02)continue;
    g.globalAlpha=alpha;
    bx(px|0,py|0,cfg.sz,cfg.sz,cfg.col);
  }
  g.globalAlpha=1;
}

// v227: Pre-baked danger vignette canvases (2: low/high) — avoid createRadialGradient every 3 frames
const _dangerVigLow=(()=>{
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const ctx=c.getContext('2d');
  const vig=ctx.createRadialGradient(W/2,H/2,H*0.2,W/2,H/2,H*0.9);
  vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(160,90,0,1)');
  ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);return c;
})();
const _dangerVigHigh=(()=>{
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const ctx=c.getContext('2d');
  const vig=ctx.createRadialGradient(W/2,H/2,H*0.2,W/2,H/2,H*0.9);
  vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(180,20,20,1)');
  ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);return c;
})();
// v227: Pre-baked dungeon sprite aura canvases (one per floor 1-5, 52x52px)
// Center stop = floor color at alpha=1; outer = transparent. globalAlpha=pulse at draw time.
const _DUNGEON_AURA_RGB=[null,'80,140,200','60,140,80','140,60,200','200,80,20','100,20,160'];
const _dungeonAuraCanvas=(()=>{
  const canvases=[null];
  for(let fl=1;fl<=5;fl++){
    const c=document.createElement('canvas');c.width=52;c.height=52;
    const ctx=c.getContext('2d');
    const grd=ctx.createRadialGradient(26,26,0,26,26,26);
    grd.addColorStop(0,`rgba(${_DUNGEON_AURA_RGB[fl]},1)`);
    grd.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=grd;ctx.fillRect(0,0,52,52);
    canvases.push(c);
  }
  return canvases;
})();

// v229: Pre-baked cloud shadow canvases — replace per-frame ellipse() calls (4 clouds × 2 ellipses = 8 calls)
// Each canvas holds outer + inner ellipse at fixed alpha for that cloud index
const _cloudCanvases=(()=>{
  const cvs=[];
  for(let ci=0;ci<4;ci++){
    const csw=200+ci*35,csh=44+ci*10;
    const cw=csw*2+4,ch=csh*2+4;
    const c=document.createElement('canvas');c.width=cw;c.height=ch;
    const ctx=c.getContext('2d');
    const cx_=cw/2,cy_=ch/2;
    // Outer ellipse
    ctx.globalAlpha=0.03+ci*0.008;
    ctx.fillStyle='#202034';
    ctx.beginPath();ctx.ellipse(cx_,cy_,csw,csh,0,0,Math.PI*2);ctx.fill();
    // Inner darker core
    ctx.globalAlpha=0.02+ci*0.005;
    ctx.beginPath();ctx.ellipse(cx_,cy_,csw*0.55,csh*0.55,0,0,Math.PI*2);ctx.fill();
    cvs.push({canvas:c,hw:cx_,hh:cy_}); // store half-dims for centering
  }
  return cvs;
})();

function drawEdgeBlending(startTX,startTY,endTX,endTY){
  const m=getMap();
  for(let y=startTY;y<=endTY;y++){
    for(let x=startTX;x<=endTX;x++){
      const px=x*TW-camX,py=y*TH-camY;
      if(px<-TW||px>W||py<-TH||py>H)continue;
      const t=m[y]?.[x];
      if(t===undefined)continue;
      const gt=groundType(t);
      const tUp=getNeighborType(m,x,y,0,-1),tDn=getNeighborType(m,x,y,0,1);
      const tLf=getNeighborType(m,x,y,-1,0),tRt=getNeighborType(m,x,y,1,0);
      const h=tileHash(x,y);
      // Check each neighbor for different terrain
      const dirs=[[tUp,0,-1],[tDn,0,1],[tLf,-1,0],[tRt,1,0]];
      for(const [nt,dx,dy] of dirs){
        if(nt<0)continue;
        const ngt=groundType(nt);
        if(ngt===gt)continue;
        // Edge position
        const isTop=dy===-1,isBot=dy===1,isLft=dx===-1,isRgt=dx===1;
        // Grass-to-Water
        if(gt==='grass'&&ngt==='water'){
          if(isTop){for(let i=0;i<TW;i++){if(thRand(x,y,i+100)>.4)bx(px+i,py,1,2,'#3c8c3c');if(thRand(x,y,i+115)>.75)bx(px+i,py,1,1,'#4878a0');}}
          if(isBot){for(let i=0;i<TW;i++){if(thRand(x,y,i+120)>.4)bx(px+i,py+TH-2,1,2,'#3c8c3c');if(thRand(x,y,i+135)>.75)bx(px+i,py+TH-1,1,1,'#4878a0');}}
          if(isLft){for(let i=0;i<TH;i++){if(thRand(x,y,i+140)>.4)bx(px,py+i,2,1,'#3c8c3c');if(thRand(x,y,i+155)>.75)bx(px,py+i,1,1,'#4878a0');}}
          if(isRgt){for(let i=0;i<TH;i++){if(thRand(x,y,i+160)>.4)bx(px+TW-2,py+i,2,1,'#3c8c3c');if(thRand(x,y,i+175)>.75)bx(px+TW-1,py+i,1,1,'#4878a0');}}
        }
        // Water-to-Sand (foam/surf line)
        if(gt==='water'&&ngt==='sand'){
          if(isTop){for(let i=0;i<TW;i++){if(thRand(x,y,i+180)>.3)bx(px+i,py,1,1,(wt+i)%3===0?'rgba(255,255,255,.5)':'rgba(180,220,240,.4)');}}
          if(isBot){for(let i=0;i<TW;i++){if(thRand(x,y,i+190)>.3)bx(px+i,py+TH-1,1,1,(wt+i)%3===0?'rgba(255,255,255,.5)':'rgba(180,220,240,.4)');}}
          if(isLft){for(let i=0;i<TH;i++){if(thRand(x,y,i+200)>.3)bx(px,py+i,1,1,(wt+i)%3===0?'rgba(255,255,255,.5)':'rgba(180,220,240,.4)');}}
          if(isRgt){for(let i=0;i<TH;i++){if(thRand(x,y,i+210)>.3)bx(px+TW-1,py+i,1,1,(wt+i)%3===0?'rgba(255,255,255,.5)':'rgba(180,220,240,.4)');}}
        }
        // Sand-to-Water (foam from sand side)
        if(gt==='sand'&&ngt==='water'){
          if(isTop){bx(px,py,TW,2,'rgba(180,220,240,.15)');for(let i=0;i<TW;i++){if((wt+i+x)%4===0)bx(px+i,py,1,1,'rgba(255,255,255,.35)');}}
          if(isBot){bx(px,py+TH-2,TW,2,'rgba(180,220,240,.15)');for(let i=0;i<TW;i++){if((wt+i+x)%4===0)bx(px+i,py+TH-1,1,1,'rgba(255,255,255,.35)');}}
          if(isLft){bx(px,py,2,TH,'rgba(180,220,240,.15)');for(let i=0;i<TH;i++){if((wt+i+y)%4===0)bx(px,py+i,1,1,'rgba(255,255,255,.35)');}}
          if(isRgt){bx(px+TW-2,py,2,TH,'rgba(180,220,240,.15)');for(let i=0;i<TH;i++){if((wt+i+y)%4===0)bx(px+TW-1,py+i,1,1,'rgba(255,255,255,.35)');}}
        }
        // Grass-to-Sand
        if(gt==='grass'&&ngt==='sand'){
          if(isTop){for(let i=0;i<TW;i++){const r2=thRand(x,y,i+220);if(r2>.3)bx(px+i,py,1,1,'#a0b868');if(r2>.6)bx(px+i,py+1,1,1,'#b8c878');}}
          if(isBot){for(let i=0;i<TW;i++){const r2=thRand(x,y,i+230);if(r2>.3)bx(px+i,py+TH-1,1,1,'#a0b868');if(r2>.6)bx(px+i,py+TH-2,1,1,'#b8c878');}}
          if(isLft){for(let i=0;i<TH;i++){const r2=thRand(x,y,i+240);if(r2>.3)bx(px,py+i,1,1,'#a0b868');if(r2>.6)bx(px+1,py+i,1,1,'#b8c878');}}
          if(isRgt){for(let i=0;i<TH;i++){const r2=thRand(x,y,i+250);if(r2>.3)bx(px+TW-1,py+i,1,1,'#a0b868');if(r2>.6)bx(px+TW-2,py+i,1,1,'#b8c878');}}
        }
        // Sand-to-Grass
        if(gt==='sand'&&ngt==='grass'){
          if(isTop){for(let i=0;i<TW;i++){if(thRand(x,y,i+260)>.5)bx(px+i,py,1,1,'#c8c898');}}
          if(isBot){for(let i=0;i<TW;i++){if(thRand(x,y,i+270)>.5)bx(px+i,py+TH-1,1,1,'#c8c898');}}
          if(isLft){for(let i=0;i<TH;i++){if(thRand(x,y,i+280)>.5)bx(px,py+i,1,1,'#c8c898');}}
          if(isRgt){for(let i=0;i<TH;i++){if(thRand(x,y,i+290)>.5)bx(px+TW-1,py+i,1,1,'#c8c898');}}
        }
        // Grass-to-Path (grass tufts on path edge)
        if(gt==='path'&&ngt==='grass'){
          if(isTop){for(let i=0;i<TW;i+=2){if(thRand(x,y,i+300)>.5)bx(px+i,py,1,2,'#68a868');}}
          if(isBot){for(let i=0;i<TW;i+=2){if(thRand(x,y,i+310)>.5)bx(px+i,py+TH-2,1,2,'#68a868');}}
          if(isLft){for(let i=0;i<TH;i+=2){if(thRand(x,y,i+320)>.5)bx(px,py+i,2,1,'#68a868');}}
          if(isRgt){for(let i=0;i<TH;i+=2){if(thRand(x,y,i+330)>.5)bx(px+TW-2,py+i,2,1,'#68a868');}}
        }
        // Path-to-Grass (grass bleeds onto path)
        if(gt==='grass'&&ngt==='path'){
          if(isTop){for(let i=0;i<TW;i+=3){if(thRand(x,y,i+340)>.6)bx(px+i,py,1,1,'#b8b070');}}
          if(isBot){for(let i=0;i<TW;i+=3){if(thRand(x,y,i+350)>.6)bx(px+i,py+TH-1,1,1,'#b8b070');}}
          if(isLft){for(let i=0;i<TH;i+=3){if(thRand(x,y,i+360)>.6)bx(px,py+i,1,1,'#b8b070');}}
          if(isRgt){for(let i=0;i<TH;i+=3){if(thRand(x,y,i+370)>.6)bx(px+TW-1,py+i,1,1,'#b8b070');}}
        }
        // Water-to-Grass (near-shore foam from water side)
        if(gt==='water'&&ngt==='grass'){
          if(isTop){for(let i=0;i<TW;i++){if(thRand(x,y,i+380)>.45){const wc=(wt+i)%3===0?_WATER_FOAM_LT:_WATER_FOAM_DK; // v304bx(px+i,py,1,1,wc);}}}
          if(isBot){for(let i=0;i<TW;i++){if(thRand(x,y,i+390)>.45){const wc=(wt+i)%3===0?_WATER_FOAM_LT:_WATER_FOAM_DK; // v304bx(px+i,py+TH-1,1,1,wc);}}}
          if(isLft){for(let i=0;i<TH;i++){if(thRand(x,y,i+400)>.45){const wc=(wt+i)%3===0?_WATER_FOAM_LT:_WATER_FOAM_DK; // v304bx(px,py+i,1,1,wc);}}}
          if(isRgt){for(let i=0;i<TH;i++){if(thRand(x,y,i+410)>.45){const wc=(wt+i)%3===0?_WATER_FOAM_LT:_WATER_FOAM_DK; // v304bx(px+TW-1,py+i,1,1,wc);}}}
        }
        // Mountain/Grass transitions
        if(gt==='grass'&&ngt==='mountain'){
          if(isTop){for(let i=0;i<TW;i++){if(thRand(x,y,i+420)>.4)bx(px+i,py,1,1,'rgba(100,100,112,.3)');}}
          if(isBot){for(let i=0;i<TW;i++){if(thRand(x,y,i+430)>.4)bx(px+i,py+TH-1,1,1,'rgba(100,100,112,.3)');}}
          if(isLft){for(let i=0;i<TH;i++){if(thRand(x,y,i+440)>.4)bx(px,py+i,1,1,'rgba(100,100,112,.3)');}}
          if(isRgt){for(let i=0;i<TH;i++){if(thRand(x,y,i+450)>.4)bx(px+TW-1,py+i,1,1,'rgba(100,100,112,.3)');}}
        }
      }
    }
  }
}

function drawAtmosphere(){
  // Subtle noise overlay (every 4th frame, fewer points)
  if(fr%4===0){
    for(let i=0;i<8;i++){
      const nx=Math.floor(thRand(fr&255,i,500)*W);
      const ny=Math.floor(thRand(fr&255,i,510)*H);
      bx(nx,ny,1,1,'rgba(128,128,128,.03)');
    }
  }
  // Ruins vignette
  if(currentMap===2){
    bx(0,0,W,10,'rgba(5,0,10,.12)');bx(0,H-58,W,10,'rgba(5,0,10,.12)');
    bx(0,0,10,H-48,'rgba(5,0,10,.08)');bx(W-10,0,10,H-48,'rgba(5,0,10,.08)');
    bx(0,0,W,4,'rgba(5,0,10,.06)');bx(0,H-52,W,4,'rgba(5,0,10,.06)');
  }
  // Forest floating pollen/dust
  if(currentMap===1){
    for(let _pi=0,_pl=pollenParticles.length;_pi<_pl;_pi++){
      const p=pollenParticles[_pi];
      p.x+=p.vx;
      p.y+=Math.sin(fr*0.02+p.phase)*0.15+p.vy;
      if(p.x>MW*TW)p.x=0;
      if(p.y<0)p.y=MH*TH;
      if(p.y>MH*TH)p.y=0;
      const sx=p.x-camX,sy=p.y-camY;
      if(sx>0&&sx<W&&sy>0&&sy<H-HUD_HEIGHT){
        const a=0.25+Math.sin(fr*0.03+_pi)*0.15;
        g.globalAlpha=a;
        bx(sx,sy,1,1,'#e8e8d0');
        g.globalAlpha=1;
      }
    }
  }
  // Dungeon ambient particles — cached to partCanvas, rebuilt every 2 frames
  if(inDungeon&&currentFloor>=1&&currentFloor<=5){
    if(fr-_partFrame>=2||_partMap!==currentMap){
      partCtx.clearRect(0,0,W,H);
      const _mc=g;g=partCtx;
      drawDungeonAmbientParticles();
      g=_mc;
      _partFrame=fr;_partMap=currentMap;
    }
    g.drawImage(partCanvas,0,0,W,H);
  }
  // Dungeon edge vignette — cached to dvigCanvas, rebuilt every 3 frames (breathing pulse still smooth)
  if(inDungeon&&currentFloor>=1&&currentFloor<=5){
    if(fr-_dvigFrame>=3||_dvigFloor!==currentFloor){
      dvigCtx.clearRect(0,0,W,H);
      const _mc=g;g=dvigCtx;
      drawDungeonVignette();
      g=_mc;
      _dvigFrame=fr;_dvigFloor=currentFloor;
    }
    g.drawImage(dvigCanvas,0,0,W,H);
  }
  // Town ambient particles — cached to partCanvas, rebuilt every 2 frames
  if(!inDungeon&&currentMap===0){
    if(fr-_partFrame>=2||_partMap!==currentMap){
      partCtx.clearRect(0,0,W,H);
      const _mc=g;g=partCtx;
      drawTownAmbientParticles();
      g=_mc;
      _partFrame=fr;_partMap=currentMap;
    }
    g.drawImage(partCanvas,0,0,W,H);
  }
}

// v192: Town ambient screen-space particles — deterministic, no state required
// Golden motes: card magic rising from ARK vaults. Cyan wisps: sea breeze from the harbor.
function drawTownAmbientParticles(){
  const visH=H-HUD_HEIGHT;
  const tf=fr; // frame counter, used for time

  // 14 golden magic motes — float upward with sinusoidal sway
  for(let i=0;i<14;i++){
    const h1=(i*2237+1873)>>>0;
    const startX=((h1*7481)>>>0)%W;
    const period=140+((h1*1021)>>>0)%60; // 140..199 frames per cycle
    const phase=(tf+i*37)%period;
    const prog=phase/period;
    const x=startX+Math.sin(tf*0.018+i*1.7)*16;
    // Rise from bottom half, fade in/out
    const y=visH*0.85-prog*visH*0.7;
    if(y<0||y>visH)continue;
    const edgeFade=Math.min(1,Math.min(prog*4,((1-prog)*4)));
    const alpha=(0.12+0.06*Math.sin(tf*0.025+i*0.9))*edgeFade;
    const sz=1+((h1*1033)>>>0)%2;
    g.globalAlpha=alpha;
    g.fillStyle='#f8d840';
    g.fillRect(x,y,sz,sz);
    g.globalAlpha=1;
  }

  // 8 sea-breeze wisps — drift sideways, very faint cyan
  for(let i=0;i<8;i++){
    const h2=((i*1777+7919)>>>0);
    const startY=40+((h2*3761)>>>0)%(visH-80);
    const period2=100+((h2*901)>>>0)%50;
    const phase2=(tf+i*53)%period2;
    const prog2=phase2/period2;
    const x2=(prog2*W+((h2*877)>>>0)%120)%W;
    const edgeFade2=Math.min(1,Math.min(prog2*5,(1-prog2)*5));
    const alpha2=(0.09+0.04*Math.sin(tf*0.02+i*1.1))*edgeFade2;
    g.globalAlpha=alpha2;
    g.fillStyle='#b8d8f0';
    g.fillRect(x2,startY+Math.sin(tf*0.015+i*0.8)*8,2,1);
    g.globalAlpha=1;
  }
}

// v183: Dungeon ambient particles — screen-space, deterministic, per-floor visual identity
function drawDungeonAmbientParticles(){
  const depth=currentFloor;
  const visH=H-HUD_HEIGHT;
  // [count, color, vx/frame, vy/frame, sway amplitude, particle width, particle height, base alpha]
  const CFG=[
    null,
    // B1 SUNKEN GALLERIES: seawater dripping from hull seams — thin vertical streaks, fall fast
    {n:16,col:'#6090b8',vx:0.05,vy:1.1,sway:3,sw:1,sh:4,a:0.20},
    // B2 DROWNED ARCHIVES: ancient paper motes — drift sideways, slow tumble
    {n:20,col:'#c8b888',vx:0.35,vy:0.08,sway:5,sw:2,sh:1,a:0.18},
    // B3 ECHO CHAMBERS: crystal resonance sparks — rise upward, pulse size
    {n:18,col:'#c080ff',vx:-0.08,vy:-0.85,sway:4,sw:2,sh:2,a:0.28},
    // B4 DEEP VAULT: ember ash — diagonal fall, flicker
    {n:22,col:'#d05020',vx:0.22,vy:0.65,sway:6,sw:2,sh:2,a:0.24},
    // B5 ARK CORE: void wisps — nearly static, appear/disappear, larger
    {n:14,col:'#8030c0',vx:0.04,vy:-0.15,sway:9,sw:3,sh:3,a:0.22},
  ];
  const c=CFG[depth];if(!c)return;

  for(let i=0;i<c.n;i++){
    // Deterministic seed per particle (large primes for good distribution)
    const h0=((i*2239+3571)>>>0)%10007;
    const h1=((i*1889+7127)>>>0)%10007;
    const h2=((i*1277+5381)>>>0)%10007;
    // Base position — spread across full screen
    const baseX=(h0/10007)*W;
    const baseY=(h1/10007)*visH;
    const phase=h2/10007*Math.PI*2;

    // Animated position — wrap modulo screen size
    const px=((baseX+c.vx*fr)%W+W)%W;
    const py=((baseY+c.vy*fr+c.sway*Math.sin(fr*0.028+phase))%visH+visH)%visH;

    // Void wisps (B5): pulse in/out instead of steady glow
    let alpha=c.a;
    if(depth===5){alpha=c.a*(0.4+0.6*Math.abs(Math.sin(fr*0.05+phase*2)));}
    else if(depth===3){alpha=c.a*(0.5+0.5*Math.sin(fr*0.09+phase));}// crystal pulse
    else if(depth===4&&fr%6===0){alpha=c.a*(0.3+Math.random()*0.7);}// ember flicker

    g.globalAlpha=alpha;
    // B3 crystal sparks: draw cross shape for sparkle feel
    if(depth===3){
      bx(px|0,py|0,c.sw,c.sh,c.col);
      if(alpha>0.2){bx((px-1)|0,(py+c.sh/2)|0,c.sw+2,1,'rgba(220,180,255,.4)');}
    }else if(depth===1){
      // Water drip: thin streak
      bx(px|0,py|0,1,c.sh,c.col);
      g.globalAlpha=alpha*0.4;
      bx(px|0,(py+c.sh)|0,1,1,c.col);// drip tail fade
    }else{
      bx(px|0,py|0,c.sw,c.sh,c.col);
    }
    g.globalAlpha=1;
  }
}

// v186: Per-floor dungeon vignette — colored edge glow using canvas gradient strips
// Each floor has a distinctive border color that immediately signals depth
const DUNGEON_VIGNETTE_COL=[
  null,
  'rgba(80,140,200,',  // B1: blue-grey seawater glow
  'rgba(60,140,80,',   // B2: moss-green mold light
  'rgba(140,60,200,',  // B3: crystal purple resonance
  'rgba(200,80,20,',   // B4: ember orange heat
  'rgba(100,20,160,',  // B5: void purple darkness
];
function drawDungeonVignette(){
  const depth=currentFloor;
  const vg=_dungVigGrads[depth];if(!vg)return;
  // v228: reuse pre-cached CanvasGradient objects; globalAlpha=pulse replaces per-frame gradient rebuild
  const pulse=0.30+0.08*Math.sin(fr*(0.02+depth*0.008));
  const e=_VIGNETTE_EDGE,vh=_VIGNETTE_VIS_H;
  g.globalAlpha=pulse;
  g.fillStyle=vg.gT;g.fillRect(0,0,W,e);
  g.fillStyle=vg.gB;g.fillRect(0,vh-e,W,e);
  g.fillStyle=vg.gL;g.fillRect(0,0,e,vh);
  g.fillStyle=vg.gR;g.fillRect(W-e,0,e,vh);
  g.globalAlpha=1;
}

// ═══════════════════════════════════════
// FOG OF WAR RENDERING
// ═══════════════════════════════════════
// v212: Pre-parsed fog RGB per map index for floor-colored fog edges
const _FOG_RGB=FOG_COLORS.map(h=>{const r=parseInt(h.slice(1,3),16),g_=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return[r,g_,b];});
// v228: Pre-cached dungeon vignette CanvasGradient objects (one set per floor) — no new gradient each frame
const _VIGNETTE_EDGE=44,_VIGNETTE_VIS_H=H-HUD_HEIGHT;
const _dungVigGrads=(()=>{
  const grads=[null];
  const cols=[[],[],[80,140,200],[60,140,80],[140,60,200],[200,80,20],[100,20,160]]; // fl 1-5
  for(let fl=1;fl<=5;fl++){
    const [r,gv,b]=cols[fl];
    const full=`rgba(${r},${gv},${b},1)`,none='rgba(0,0,0,0)',e=_VIGNETTE_EDGE,vh=_VIGNETTE_VIS_H;
    const gT=g.createLinearGradient(0,0,0,e);gT.addColorStop(0,full);gT.addColorStop(1,none);
    const gB=g.createLinearGradient(0,vh,0,vh-e);gB.addColorStop(0,full);gB.addColorStop(1,none);
    const gL=g.createLinearGradient(0,0,e,0);gL.addColorStop(0,full);gL.addColorStop(1,none);
    const gR=g.createLinearGradient(W,0,W-e,0);gR.addColorStop(0,full);gR.addColorStop(1,none);
    grads.push({gT,gB,gL,gR});
  }
  return grads;
})();
// v228: Pre-baked floor item glow canvases (one per rarity 0-4, 28×28, alpha=1 at center)
const _ITEM_GLOW_COLS=['#808080','#60b0ff','#a060e0','#d09020','#f0d040'];
const _itemGlowCanvas=(()=>{
  const cvs=[];
  for(let r=0;r<5;r++){
    const c=document.createElement('canvas');c.width=28;c.height=28;
    const ctx=c.getContext('2d');
    const grd=ctx.createRadialGradient(14,14,2,14,14,14);
    grd.addColorStop(0,_ITEM_GLOW_COLS[r]);grd.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=grd;ctx.fillRect(0,0,28,28);
    cvs.push(c);
  }
  return cvs;
})();

// v219: Pre-computed fog gradient color strings per map — avoids template literal creation every frame
const _FOG_GRAD_COLS=_FOG_RGB.map(([r,g_,b])=>{
  const steps=8;
  return Array.from({length:steps},(_,s)=>`rgba(${r},${g_},${b},${(0.06+s*0.1).toFixed(2)})`);
});
// v247: Hoisted fog direction offsets — avoids allocating [[0,-1],[0,1],[-1,0],[1,0]] per tile
const _FOG_DX=[0,0,-1,1],_FOG_DY=[-1,1,0,0];
function drawFogOverlay(startTX,startTY,endTX,endTY){
  const fogC=FOG_COLORS[currentMap];
  const gradCols=_FOG_GRAD_COLS[currentMap]||_FOG_GRAD_COLS[0];
  const fogMap=fogRevealed[currentMap];
  for(let y=startTY;y<=endTY;y++){
    const fogRow=fogMap[y];
    for(let x=startTX;x<=endTX;x++){
      const px=x*TW-camX,py=y*TH-camY;
      if(px<-TW||px>W||py<-TH||py>H)continue;
      if(fogRow&&fogRow[x]){
        // Revealed tile: check edges for fog gradient (4 directions, no array alloc per tile)
        for(let d=0;d<4;d++){
          const dx=_FOG_DX[d],dy=_FOG_DY[d];
          const nx=x+dx,ny=y+dy;
          const neighborHidden=(nx<0||nx>=MW||ny<0||ny>=MH||!fogMap[ny]?.[nx]);
          if(neighborHidden){
            // v212: 8-step gradient with floor-specific fog color (v219: pre-computed strings)
            for(let s=0;s<8;s++){
              const col=gradCols[s];
              if(dy===-1){bx(px,py+s,TW,1,col);}
              else if(dy===1){bx(px,py+TH-1-s,TW,1,col);}
              else if(dx===-1){bx(px+s,py,1,TH,col);}
              else if(dx===1){bx(px+TW-1-s,py,1,TH,col);}
            }
          }
        }
      }else{
        // Hidden tile: solid fog with subtle noise texture
        g.fillStyle=fogC;
        g.fillRect(px,py,TW,TH);
        // Add sparse noise texture for atmosphere
        const n1=fogNoise(x,y,0),n2=fogNoise(x,y,1),n3=fogNoise(x,y,2);
        if(n1>0.7){
          const nPx=px+Math.floor(n2*12)+1,nPy=py+Math.floor(n3*10)+1;
          g.fillStyle='rgba(20,20,40,0.6)';
          g.fillRect(nPx,nPy,1,1);
        }
        if(n2>0.8){
          const nPx2=px+Math.floor(n1*10)+2,nPy2=py+Math.floor(n3*8)+2;
          g.fillStyle='rgba(30,30,50,0.4)';
          g.fillRect(nPx2,nPy2,1,1);
        }
        if(n3>0.85){
          const nPx3=px+Math.floor(n2*8)+3,nPy3=py+Math.floor(n1*7)+3;
          g.fillStyle='rgba(15,15,30,0.5)';
          g.fillRect(nPx3,nPy3,2,1);
        }
      }
    }
  }
}

// Floor atmosphere config: [fogCol, ambientCol, ambientCount, ambientSpeedY, ambientSize]
const FLOOR_ATMOS=[
  ['#404060','rgba(255,255,255,.06)',0,-0.3,2], // town: no dungeon atmos
  ['#303050','rgba(200,200,240,.08)',20,-0.4,1], // F1: subtle dust
  ['#204030','rgba(100,220,80,.1)',28,-0.2,2],   // F2: spores (green drift)
  ['#504020','rgba(240,200,60,.09)',22,-0.5,2],  // F3: golden motes
  ['#500820','rgba(220,80,30,.12)',32,0.3,2],    // F4: embers (drift UP wrong — embers go UP)
  ['#601008','rgba(255,120,20,.15)',40,-0.8,3],  // F5: lava sparks
];

// v204: World-space fog ambient motes — cached to fogAmbCanvas, rebuilt every 3 frames
function _drawFogAmbientMotes(ambCol,ambCount,ambVY,ambSz){
  const seed=fr*0.02;
  for(let i=0;i<ambCount;i++){
    const px=((i*1237+fr*3)%1000/1000)*MW*TW;
    const py=((i*4321+fr*2)%1000/1000)*MH*TH;
    const dpy=py+Math.sin(seed+i*1.3)*20+fr*ambVY*(1+i%3)*0.3;
    const dpyWrapped=((dpy%MH*TH)+MH*TH)%(MH*TH);
    const sx=px-camX,sy=dpyWrapped-camY;
    if(sx<-4||sx>W+4||sy<-4||sy>H+4)continue;
    const tileX=Math.floor(px/TW),tileY=Math.floor(dpyWrapped/TH);
    if(tileX<0||tileX>=MW||tileY<0||tileY>=MH)continue;
    if(!fogRevealed[currentMap][tileY]?.[tileX])continue;
    g.globalAlpha=(0.5+0.5*Math.sin(seed*1.5+i*2.1))*0.7;
    g.fillStyle=ambCol;
    g.fillRect(sx,sy,ambSz,ambSz);
  }
  g.globalAlpha=1;
}

function drawFogParticles(){
  const atmos=FLOOR_ATMOS[inDungeon?currentFloor:0]||FLOOR_ATMOS[0];
  const [fogCol,ambCol,ambCount,ambVY,ambSz]=atmos;
  // v229: sin-addition formula avoids 40 sin() calls per frame — use precomputed sinPh/cosPh per particle
  // sin(fr*0.015 + phase) = sin(fr*0.015)*cos(phase) + cos(fr*0.015)*sin(phase)
  const sinFr=Math.sin(fr*0.015),cosFr=Math.cos(fr*0.015);
  // Batch fillStyle outside loop (same for all particles)
  g.fillStyle=fogCol;
  const visH=H-HUD_HEIGHT;
  for(let i=0,l=fogParticles.length;i<l;i++){
    const p=fogParticles[i];
    p.x+=p.vx;
    p.y+=(sinFr*p.cosPh+cosFr*p.sinPh)*0.1+p.vy;
    if(p.x>MW*TW)p.x=0;
    if(p.y<0)p.y=MH*TH;
    if(p.y>MH*TH)p.y=0;
    const sx=p.x-camX,sy=p.y-camY;
    if(sx>0&&sx<W&&sy>0&&sy<visH){
      const tileX=p.x/TW|0,tileY=p.y/TH|0;
      if(tileX>=0&&tileX<MW&&tileY>=0&&tileY<MH&&!fogRevealed[currentMap][tileY]?.[tileX]){
        g.globalAlpha=Math.max(0,0.15+Math.sin(fr*0.02+i*0.7)*0.1);
        g.fillRect(sx|0,sy|0,1,1);
      }
    }
  }
  g.globalAlpha=1;
  // Floor-specific ambient motes — cached to fogAmbCanvas, rebuilt every 3 frames
  if(!inDungeon||ambCount===0)return;
  if(fr-_fogAmbFrame>=3||_fogAmbFloor!==currentFloor){
    fogAmbCtx.clearRect(0,0,W,H);
    const _mc=g;g=fogAmbCtx;
    _drawFogAmbientMotes(ambCol,ambCount,ambVY,ambSz);
    g=_mc;
    _fogAmbFrame=fr;_fogAmbFloor=currentFloor;
  }
  g.drawImage(fogAmbCanvas,0,0,W,H);
}

function drawRivalAlertAnim(p,px,py){
  if(!p._alertTimer)p._alertTimer=0;
  if(p._alertTimer>0){
    p._alertTimer-=dt;
    const bounceY=Math.sin(p._alertTimer*0.3)*5;
    const alpha=Math.min(1,p._alertTimer/15);
    g.globalAlpha=alpha;
    bx(px+8,py-36+bounceY,16,20,'#f0c830');
    bx(px+10,py-34+bounceY,12,15,'#f8e060');
    bx(px+13,py-16+bounceY,4,4,'#f0c830');
    g.globalAlpha=1;
  }
}

function isVisibleThroughFog(tileX,tileY,playerDist){
  // Must be on a revealed tile AND within playerDist tiles of player
  if(!fogRevealed[currentMap][tileY]?.[tileX])return false;
  const dx=Math.abs(tileX-pl[0].x),dy=Math.abs(tileY-pl[0].y);
  return(dx+dy)<=playerDist;
}

// ═══════════════════════════════════════
// PIRATE THEME DECORATIONS
// ═══════════════════════════════════════

// Seagull state (Corsair Bay flying seagulls)
const seagulls=[];
for(let i=0;i<6;i++){
  seagulls.push({
    x:Math.random()*40*TW,
    y:Math.random()*8*TW+2*TW,
    vx:0.3+Math.random()*0.4,
    phase:Math.random()*Math.PI*2,
    arc:10+Math.random()*15
  });
}

// Monkey state (Smuggler's Jungle)
const monkeys=[];
for(let i=0;i<4;i++){
  monkeys.push({
    treeX:5+Math.floor(Math.random()*25),
    treeY:4+Math.floor(Math.random()*20),
    offsetX:Math.random()*16,
    offsetY:Math.random()*8,
    hopTimer:Math.floor(Math.random()*120),
    hopDir:1
  });
}

// Water drip state (Cursed Temple)
const waterDrips=[];
for(let i=0;i<8;i++){
  waterDrips.push({
    x:4+Math.floor(Math.random()*30),
    y:2+Math.floor(Math.random()*28),
    dropY:0,
    speed:0.4+Math.random()*0.3,
    delay:Math.floor(Math.random()*90)
  });
}

function drawPirateDecorations(){
  if(currentMap===0){
    // ── CORSAIR BAY DECORATIONS ──

    // Docked ship at the pier (around dock area, tile coords ~14-18, 22-24)
    {
      const shipTX=16,shipTY=23;
      const sx=shipTX*TW-camX,sy=shipTY*TH-camY;
      if(sx>-120&&sx<W+60&&sy>-80&&sy<H+40){
        // Hull (brown wooden ship)
        bx(sx-30,sy+8,90,16,'#705028');bx(sx-20,sy+24,70,8,'#604020');
        bx(sx-10,sy+32,50,4,'#503018');
        // Hull stripe
        bx(sx-28,sy+12,86,2,'#806838');
        // Bow
        bx(sx+60,sy+10,14,10,'#705028');bx(sx+74,sy+14,6,4,'#604020');
        // Stern
        bx(sx-34,sy+6,8,18,'#604020');bx(sx-38,sy+4,6,12,'#503018');
        // Mast
        bx(sx+14,sy-40,4,48,'#906838');
        // Sail (slightly billowing)
        const billowSail=Math.sin(fr*0.03)*2;
        bx(sx-4+billowSail,sy-34,24,28,'#e8e0c8');bx(sx-2+billowSail,sy-30,20,20,'#f0e8d0');
        // Sail ropes
        bx(sx+16,sy-40,1,6,'#504030');bx(sx+14,sy-40,1,6,'#504030');
        // Crow's nest
        bx(sx+10,sy-44,12,4,'#806030');
        // Pirate flag
        const flagW=Math.sin(fr*0.06)*1.5;
        bx(sx+18,sy-42+flagW,14,8,'#181820');
        // Skull on flag (tiny)
        bx(sx+22,sy-41+flagW,2,2,'#c0c0c0');bx(sx+26,sy-41+flagW,2,2,'#c0c0c0');
        bx(sx+23,sy-39+flagW,4,1,'#c0c0c0');
        // Rope/anchor at hull side
        bx(sx-26,sy+6,2,20,'#908060');
        // Anchor shape
        bx(sx-28,sy+26,6,2,'#606060');bx(sx-26,sy+28,2,4,'#606060');
        bx(sx-30,sy+30,2,2,'#606060');bx(sx-22,sy+30,2,2,'#606060');
      }
    }

    // Barrel stacks near warehouses (v252: hoisted array, for loop)
    for(let _bi=0;_bi<5;_bi++){
      const btx=_BARREL_SPOTS[_bi][0],bty=_BARREL_SPOTS[_bi][1];
      const bpx=btx*TW-camX,bpy=bty*TH-camY;
      if(bpx>-TW&&bpx<W+TW&&bpy>-TW&&bpy<H+TW&&fogRevealed[0][bty]?.[btx]){
        bx(bpx+2,bpy+12,12,14,'#906838');bx(bpx+4,bpy+14,8,10,'#a07848');
        bx(bpx+2,bpy+14,12,2,'#705028');bx(bpx+2,bpy+22,12,2,'#705028');
        if((btx+bty)%2===0){
          bx(bpx+16,bpy+14,12,12,'#906838');bx(bpx+18,bpy+16,8,8,'#a07848');
          bx(bpx+16,bpy+16,12,2,'#705028');bx(bpx+16,bpy+22,12,2,'#705028');
        }
      }
    }

    // Rope coils near dock (v252: hoisted array, for loop)
    for(let _ri=0;_ri<2;_ri++){
      const rtx=_ROPE_SPOTS[_ri][0],rty=_ROPE_SPOTS[_ri][1];
      const rpx=rtx*TW-camX,rpy=rty*TH-camY;
      if(rpx>-TW&&rpx<W+TW&&rpy>-TW&&rpy<H+TW&&fogRevealed[0][rty]?.[rtx]){
        g.drawImage(_ropeCoilCanvas,(rpx+9)|0,(rpy+16)|0);
        bx(rpx+14,rpy+18,4,4,'#a09060');
      }
    }

    // ── CRAFTPIX OVERWORLD TREE DECORATIONS ──
    // Drawn in two Y-sorted passes via drawCpxTreesInRange() called from dMap().
    // (code removed from here — see drawCpxTreesInRange below)

    // Seagulls flying over water
    for(let _si=0,_sl=seagulls.length;_si<_sl;_si++){
      const sg=seagulls[_si];
      sg.x+=sg.vx;
      if(sg.x>42*TW)sg.x=-20;
      const sgPx=sg.x-camX;
      const sgPy=sg.y-camY+Math.sin(fr*0.04+sg.phase)*sg.arc;
      if(sgPx>-10&&sgPx<W+10&&sgPy>-10&&sgPy<H){
        bx(sgPx,sgPy,3,2,'#e8e8e8');
        if(Math.sin(fr*0.12+sg.phase)>0){
          bx(sgPx-3,sgPy-1,3,1,'#d8d8d8');bx(sgPx+3,sgPy-1,3,1,'#d8d8d8');
        }else{
          bx(sgPx-3,sgPy+1,3,1,'#d8d8d8');bx(sgPx+3,sgPy+1,3,1,'#d8d8d8');
        }
      }
    }

  }else if(currentMap===1){
    // ── SMUGGLER'S JUNGLE DECORATIONS ──

    // ── CRAFTPIX JUNGLE TREE DECORATIONS ──
    // Drawn in two Y-sorted passes via drawCpxTreesInRange() called from dMap().
    // (code removed from here — see drawCpxTreesInRange below)

    // Vine/hanging rope elements on some trees
    const m=getMap();
    for(let vy=Math.max(0,Math.floor(camY/TH));vy<=Math.min(MH-1,Math.ceil((camY+H)/TH));vy++){
      for(let vx=Math.max(0,Math.floor(camX/TW));vx<=Math.min(MW-1,Math.ceil((camX+W)/TW));vx++){
        if(m[vy]?.[vx]===3&&fogRevealed[1][vy]?.[vx]&&((vx*7+vy*13)%5===0)){
          const vpx=vx*TW-camX,vpy=vy*TH-camY;
          // Hanging vine
          const vineLen=12+((vx*3+vy*5)%8);
          for(let vi=0;vi<vineLen;vi++){
            const vox=Math.sin(fr*0.02+vi*0.3+vx)*1.5;
            bx(vpx+8+vox,vpy+14+vi*2,2,2,'#387830');
          }
          // Second vine on some trees
          if((vx+vy)%3===0){
            for(let vi=0;vi<vineLen-4;vi++){
              const vox2=Math.sin(fr*0.025+vi*0.25+vy)*1.2;
              bx(vpx+22+vox2,vpy+16+vi*2,1,2,'#306828');
            }
          }
        }
      }
    }

    // Hidden treasure chest (visible after fog reveal)
    // Place at a specific tile that looks good
    const chestTX=15,chestTY=8;
    if(fogRevealed[1][chestTY]?.[chestTX]){
      const cpx=chestTX*TW-camX,cpy=chestTY*TH-camY;
      if(cpx>-TW&&cpx<W+TW&&cpy>-TH&&cpy<H+TH){
        // Chest body
        bx(cpx+8,cpy+18,16,10,'#906828');bx(cpx+10,cpy+20,12,6,'#a07838');
        // Chest lid
        bx(cpx+8,cpy+14,16,5,'#805820');bx(cpx+10,cpy+15,12,3,'#906828');
        // Lock/latch
        bx(cpx+14,cpy+17,4,3,'#d0a030');bx(cpx+15,cpy+18,2,2,'#e0b040');
        // Sparkle (subtle hint)
        if(fr%60<20){
          const sparkA=(Math.sin(fr*0.15)*0.3+0.5);
          g.globalAlpha=sparkA;
          bx(cpx+16,cpy+12,2,2,'#f0d050');
          g.globalAlpha=1;
        }
      }
    }

    // Monkeys in trees
    for(let _mi=0,_ml=monkeys.length;_mi<_ml;_mi++){
      const mk=monkeys[_mi];
      mk.hopTimer--;
      if(mk.hopTimer<=0){
        mk.hopTimer=80+Math.floor(Math.random()*100);
        mk.hopDir=-mk.hopDir;
        mk.offsetX=Math.random()*12;
      }
      const mtx=mk.treeX,mty=mk.treeY;
      const mm=getMap();
      if(mm[mty]?.[mtx]!==3)continue;
      if(!fogRevealed[1][mty]?.[mtx])continue;
      const mpx=mtx*TW-camX+mk.offsetX,mpy=mty*TH-camY+4+mk.offsetY;
      if(mpx<-TW||mpx>W+TW||mpy<-TH||mpy>H+TH)continue;
      const hopBob=mk.hopTimer<10?Math.abs(Math.sin(mk.hopTimer*0.5))*4:0;
      bx(mpx+2,mpy+6-hopBob,6,5,'#8B5E3C');
      bx(mpx+3,mpy+2-hopBob,4,4,'#A06B3F');
      bx(mpx+4,mpy+3-hopBob,1,1,'#2a1a0a');bx(mpx+6,mpy+3-hopBob,1,1,'#2a1a0a');
      const tailCurl=Math.sin(fr*0.05+mtx)*2;
      bx(mpx+8,mpy+8-hopBob+tailCurl,1,3,'#8B5E3C');
      bx(mpx+9,mpy+10-hopBob+tailCurl,1,2,'#8B5E3C');
    }

  }else if(currentMap===2){
    // ── CURSED TEMPLE DECORATIONS ──

    // Skull decorations on walls
    const m=getMap();
    for(let sy=Math.max(0,Math.floor(camY/TH));sy<=Math.min(MH-1,Math.ceil((camY+H)/TH));sy++){
      for(let sx=Math.max(0,Math.floor(camX/TW));sx<=Math.min(MW-1,Math.ceil((camX+W)/TW));sx++){
        if(m[sy]?.[sx]===22&&fogRevealed[2][sy]?.[sx]&&((sx*11+sy*7)%7===0)){
          const spx=sx*TW-camX,spy=sy*TH-camY;
          // Skull shape
          bx(spx+12,spy+4,8,7,'#c8c0a8');bx(spx+13,spy+3,6,2,'#c8c0a8');
          // Eye sockets
          bx(spx+13,spy+6,2,2,'#383840');bx(spx+17,spy+6,2,2,'#383840');
          // Nose
          bx(spx+15,spy+8,2,1,'#a09888');
          // Jaw
          bx(spx+13,spy+10,6,2,'#b0a890');
          bx(spx+14,spy+11,1,1,'#383840');bx(spx+16,spy+11,1,1,'#383840');bx(spx+18,spy+11,1,1,'#383840');
          // Ghostly glow around skull
          const glowA=Math.sin(fr*0.04+sx*2+sy*3)*0.1+0.12;
          g.globalAlpha=glowA;
          g.drawImage(_spiderGlowCanvas,(spx+5)|0,(spy-3)|0);
          g.globalAlpha=1;
        }
      }
    }

    // Dripping water effect from ceiling tiles
    for(let _wi=0,_wl=waterDrips.length;_wi<_wl;_wi++){
      const wd=waterDrips[_wi];
      if(!fogRevealed[2][wd.y]?.[wd.x])continue;
      const m2=getMap();
      if(m2[wd.y]?.[wd.x]!==22)continue;
      const wpx=wd.x*TW-camX+12+((wd.x*5)%12),wpy=wd.y*TH-camY+TH;
      if(wpx<-4||wpx>W+4||wpy<-40||wpy>H+4)continue;
      wd.delay--;
      if(wd.delay>0)continue;
      wd.dropY+=wd.speed;
      if(wd.dropY>24){
        wd.dropY=0;
        wd.delay=40+Math.floor(Math.random()*60);
      }
      // Water droplet
      bx(wpx,wpy+wd.dropY,2,3,'#4888c0');
      bx(wpx,wpy+wd.dropY,1,2,'#6aa8e0');
      // Splash at bottom
      if(wd.dropY>20){
        const splA=1-(wd.dropY-20)/4;
        g.globalAlpha=splA*0.5;
        bx(wpx-2,wpy+24,2,1,'#4888c0');bx(wpx+2,wpy+24,2,1,'#4888c0');
        g.globalAlpha=1;
      }
    }

    // Ghostly glow in darker areas (near lava/crystal tiles)
    for(let gy=Math.max(0,Math.floor(camY/TH));gy<=Math.min(MH-1,Math.ceil((camY+H)/TH));gy++){
      for(let gx=Math.max(0,Math.floor(camX/TW));gx<=Math.min(MW-1,Math.ceil((camX+W)/TW));gx++){
        const gt=m[gy]?.[gx];
        if((gt===25||gt===26)&&fogRevealed[2][gy]?.[gx]){
          const gpx=gx*TW-camX+16,gpy=gy*TH-camY+16;
          if(gpx>-20&&gpx<W+20&&gpy>-20&&gpy<H+20){
            const glowPulse=Math.sin(fr*0.03+gx*3+gy*5)*0.06+0.08;
            g.globalAlpha=glowPulse;
            g.drawImage(gt===25?_glowItemOrangeCanvas:_glowItemBlueCanvas,(gpx-21)|0,(gpy-21)|0);
            g.globalAlpha=1;
          }
        }
      }
    }

    // Pirate flag on the altar (tile 27)
    for(let ay=Math.max(0,Math.floor(camY/TH));ay<=Math.min(MH-1,Math.ceil((camY+H)/TH));ay++){
      for(let ax=Math.max(0,Math.floor(camX/TW));ax<=Math.min(MW-1,Math.ceil((camX+W)/TW));ax++){
        if(m[ay]?.[ax]===27&&fogRevealed[2][ay]?.[ax]){
          const apx=ax*TW-camX,apy=ay*TH-camY;
          if(apx>-TW&&apx<W+TW&&apy>-TH-20&&apy<H+TH){
            // Flag pole
            bx(apx+22,apy-16,2,20,'#808088');
            // Pirate flag
            const fw=Math.sin(fr*0.05)*1;
            bx(apx+24,apy-14+fw,12,8,'#181820');
            // Skull and crossbones on flag
            bx(apx+28,apy-13+fw,2,2,'#c0c0b0');bx(apx+31,apy-13+fw,2,2,'#c0c0b0');
            bx(apx+29,apy-11+fw,3,1,'#c0c0b0');
            bx(apx+27,apy-9+fw,2,1,'#c0c0b0');bx(apx+33,apy-9+fw,2,1,'#c0c0b0');
          }
        }
      }
    }
  }
}

// Y-sorted craftpix tree rendering: only draws tiles whose row is in [tyMin, tyMax).
// Called twice from dMap() — once before sprites (bg pass) and once after (fg pass).
function drawCpxTreesInRange(tyMin,tyMax){
  if(cpxForestLoaded===0)return;
  const isJungle=(currentMap===1);
  const fogMap=fogRevealed[currentMap];
  const mt=getMap();
  const txMin=Math.max(0,Math.floor((camX-72)/TW));
  const txMax=Math.min(MW-1,Math.ceil((camX+W)/TW));
  const tyMinC=Math.max(tyMin,Math.max(0,Math.floor((camY-72)/TH)));
  const tyMaxC=Math.min(tyMax-1,Math.min(MH-1,Math.ceil((camY+H)/TH)));
  if(tyMinC>tyMaxC)return;
  g.imageSmoothingEnabled=true;
  for(let ty=tyMinC;ty<=tyMaxC;ty++){
    for(let tx=txMin;tx<=txMax;tx++){
      if(!fogMap[ty]?.[tx])continue;
      const tt=mt[ty]?.[tx];
      const th=tileHash(tx,ty);
      const tpx=tx*TW-camX,tpy=ty*TH-camY;
      // Deterministic per-tile wind phase for natural-looking sway
      const windPhase=(th*0.137)%(Math.PI*2);
      const windShear=Math.sin(fr*0.022+windPhase)*0.035; // subtle ±3.5% shear
      if(isJungle){
        if(tt!==3&&tt!==7&&tt!==12)continue;
        if(th%4!==1)continue;
        const jIdx=((th>>>2)+3)%CPX_FOREST.length;
        const jImg=CPX_FOREST[jIdx];
        if(!jImg.complete||!jImg.naturalWidth)continue;
        const isMega=jImg.naturalWidth===256;
        const jdW=isMega?80:64;
        const jpx=tpx+TW/2,jpy=tpy+TH; // pivot: base center
        g.save();g.translate(jpx,jpy);g.transform(1,0,windShear,1,0,0);
        g.globalAlpha=0.9;
        g.drawImage(jImg,-jdW/2,-jdW,jdW,jdW);
        g.globalAlpha=1;
        g.restore();
      }else{
        if((tt===3||tt===7||tt===12)&&th%3===0){
          const tIdx=(th>>>2)%CPX_FOREST.length;
          const tImg=CPX_FOREST[tIdx];
          if(!tImg.complete||!tImg.naturalWidth)continue;
          const isMega=tImg.naturalWidth===256;
          const tdW=isMega?72:56;
          const tpivX=tpx+TW/2,tpivY=tpy+TH; // pivot: base center
          g.save();g.translate(tpivX,tpivY);g.transform(1,0,windShear,1,0,0);
          g.globalAlpha=0.88;
          g.drawImage(tImg,-tdW/2,-tdW,tdW,tdW);
          g.globalAlpha=1;
          g.restore();
        }else if(tt===11&&th%9===0){
          const mIdx=(th>>>3)%CPX_MUSHROOMS.length;
          const mImg=CPX_MUSHROOMS[mIdx];
          if(!mImg.complete||!mImg.naturalWidth)continue;
          const mdW=16;
          g.globalAlpha=0.82;
          g.drawImage(mImg,tpx+(TW-mdW)/2+((th&3)-1)*5,tpy+TH-mdW,mdW,mdW);
          g.globalAlpha=1;
        }
      }
    }
  }
  g.imageSmoothingEnabled=false;
}

// v280: escape exit cache — exits[] is static, only re-find when currentMap changes
let _escExitCache=null,_escExitForMap=-1;
function dMap(){
  updateCamera();

  const startTX=Math.max(0,Math.floor(camX/TW));
  const startTY=Math.max(0,Math.floor(camY/TH));
  const endTX=Math.min(MW-1,Math.ceil((camX+W)/TW));
  const endTY=Math.min(MH-1,Math.ceil((camY+H)/TH));

  // ── MIDJOURNEY BACKGROUND LAYER ── drawn first, tiles + fog overlay on top
  drawMapBg(currentMap);

  // ── TILE LAYER CACHE ── only redraw tiles when camera moves or map changes
  {
    const camMoved=Math.abs(camX-tileCacheLastCamX)>0.5||Math.abs(camY-tileCacheLastCamY)>0.5;
    const mapChanged=currentMap!==tileCacheLastMap;
    if(tileCacheDirty||camMoved||mapChanged){
      tileCtx.clearRect(0,0,W,H);
      const mainCtx=g;
      g=tileCtx;
      g.imageSmoothingEnabled=false;
      for(let y=startTY;y<=endTY;y++){
        for(let x=startTX;x<=endTX;x++){
          if(!fogRevealed[currentMap][y]?.[x]){
            let anyNeighborRevealed=false;
            for(let dy=-1;dy<=1&&!anyNeighborRevealed;dy++){
              for(let dx=-1;dx<=1&&!anyNeighborRevealed;dx++){
                const ny=y+dy,nx=x+dx;
                if(ny>=0&&ny<MH&&nx>=0&&nx<MW&&fogRevealed[currentMap][ny]?.[nx])anyNeighborRevealed=true;
              }
            }
            if(!anyNeighborRevealed)continue;
          }
          drawTile(x,y);
        }
      }
      g=mainCtx;
      tileCacheLastCamX=camX;tileCacheLastCamY=camY;tileCacheLastMap=currentMap;
      tileCacheDirty=false;
    }
    g.imageSmoothingEnabled=false;
    // When Midjourney bg is loaded: skip tile layer (bg IS the ground)
    // Only draw tiles when there's no bg (fallback procedural rendering)
    if(!getBgSheet(currentMap)){
      g.drawImage(tileCanvas,0,0,W,H);
    }
    // Animated dungeon tile overlays — drawn on main canvas every frame (bypass static tile cache)
    if(inDungeon){
      drawDungeonStairGlows(startTX,startTY,endTX,endTY);
      drawDungeonAnimatedOverlays(startTX,startTY,endTX,endTY);
    }
    // v215: Animated town tile overlays (water sparkles/waves — every other frame for perf)
    if(!inDungeon&&fr%2===0){drawTownAnimatedOverlays(startTX,startTY,endTX,endTY);}
  }

  // Edge blending post-pass (cached to offscreen canvas)
  // Skip entirely if frame rate is very low (dt > 2 means < 30fps)
  if(dt<=2){
    const camMoved=Math.abs(camX-edgeCacheLastCamX)>0.5||Math.abs(camY-edgeCacheLastCamY)>0.5;
    if(edgeCacheDirty||camMoved){
      edgeCtx.clearRect(0,0,W,H);
      const mainCtx=g;
      g=edgeCtx;
      drawEdgeBlending(startTX,startTY,endTX,endTY);
      g=mainCtx;
      edgeCacheLastCamX=camX;edgeCacheLastCamY=camY;
      edgeCacheDirty=false;
    }
    g.drawImage(edgeCanvas,0,0,W,H);
  }

  // ── FOG OF WAR OVERLAY ── (cached to offscreen canvas)
  {
    const camMoved=Math.abs(camX-fogCacheLastCamX)>0.5||Math.abs(camY-fogCacheLastCamY)>0.5;
    if(fogCacheDirty||camMoved){
      fogCtx.clearRect(0,0,W,H);
      const mainCtx=g;
      g=fogCtx;
      drawFogOverlay(startTX,startTY,endTX,endTY);
      g=mainCtx;
      fogCacheLastCamX=camX;fogCacheLastCamY=camY;
      fogCacheDirty=false;
    }
    g.drawImage(fogCanvas,0,0,W,H);
  }
  // ── CIRCULAR VISIBILITY (dungeon only) — cached to offscreen canvas ──
  if(inDungeon){
    const _vpx=pl[0].visualX-camX+TW/2, _vpy=pl[0].visualY-camY+TH/2;
    if(Math.abs(_vpx-_dvLastPX)>1||Math.abs(_vpy-_dvLastPY)>1||currentFloor!==_dvLastFloor){
      dungeonVigCtx.clearRect(0,0,W,H);
      const innerR=120,outerR=320;
      const grad=dungeonVigCtx.createRadialGradient(_vpx,_vpy,innerR,_vpx,_vpy,outerR);
      const floorTint=['rgba(0,0,0','rgba(15,5,35','rgba(25,5,40','rgba(35,8,28','rgba(40,5,8','rgba(50,0,0'][currentFloor]||'rgba(0,0,0';
      grad.addColorStop(0,'rgba(0,0,0,0)');
      grad.addColorStop(0.15,'rgba(0,0,0,0)');
      grad.addColorStop(0.3,'rgba(0,0,0,0.05)');
      grad.addColorStop(0.45,'rgba(0,0,0,0.12)');
      grad.addColorStop(0.6,floorTint+',0.25)');
      grad.addColorStop(0.75,floorTint+',0.46)');
      grad.addColorStop(0.88,floorTint+',0.66)');
      grad.addColorStop(1,floorTint+',0.82)');
      dungeonVigCtx.fillStyle=grad;
      dungeonVigCtx.fillRect(0,0,W,H);
      _dvLastPX=_vpx;_dvLastPY=_vpy;_dvLastFloor=currentFloor;
    }
    g.drawImage(dungeonVigCanvas,0,0,W,H);
  }
  // v112: Danger ambient vignette — flat color rect (avoid per-frame gradient creation)
  if(inDungeon){
    const dangerV=areaDanger[currentMap]||0;
    if(dangerV>=DANGER_LOW_THRESH){
      const isHigh=dangerV>=DANGER_HIGH_THRESH;
      const pulse=Math.sin(fr*(isHigh?0.07:0.04))*0.5+0.5;
      const baseA=isHigh?0.08+pulse*0.08:0.04+pulse*0.04;
      // v227: use pre-baked danger vignette canvas (was createRadialGradient every 3rd frame)
      g.globalAlpha=baseA;
      g.drawImage(isHigh?_dangerVigHigh:_dangerVigLow,0,0);
      g.globalAlpha=1;
      if(isHigh&&fr%160<4){
        const fA=0.08*(1-fr%160/4);
        g.globalAlpha=fA;bx(0,0,W,H,'#c01010');g.globalAlpha=1;
      }
    }
  }
  // Fog particles only every other frame
  if(fr%2===0) drawFogParticles();

  // Floor watermark label (dungeon only, large semi-transparent, floor-themed color)
  if(inDungeon&&currentFloor>0){
    const floorLabel=_FLOOR_NAMES[currentFloor]||('FLOOR '+currentFloor);
    const wmAlpha=0.07+Math.sin(fr*0.008)*0.025;
    g.save();
    g.globalAlpha=wmAlpha;
    g.font='bold 96px VT323, monospace';
    g.textAlign='center';
    g.fillStyle=_FLOOR_WM_COLS[currentFloor]||'#8090b0';
    g.fillText(floorLabel,W/2,(H-HUD_HEIGHT)/2+36);
    g.globalAlpha=1;
    g.textAlign='left';
    g.restore();
  }

  drawFootprints();
  drawParticles(camX,camY);
  if(fr%2===0)drawBirds();
  if(fr%2===0)drawPirateDecorations(); // ship/barrels/vines/seagulls (no trees)
  drawTownWeather();
  // v215/v229: Cloud shadows — pre-baked canvases (was 8 ellipse() calls per frame)
  if(!inDungeon){
    const visH=H-HUD_HEIGHT;
    for(let ci=0;ci<4;ci++){
      const period=820+ci*160;
      const cphase=(fr+ci*260+ci*ci*50)%period;
      const cx_=((cphase/period)*W*1.5)-W*0.25+camX%TW*0.08;
      const cy_=visH*(0.22+ci*0.17)+Math.sin(ci*1.7+fr*0.004)*12;
      const cc=_cloudCanvases[ci];
      if(cx_-cc.hw>W||cx_+cc.hw<0)continue; // viewport cull
      g.drawImage(cc.canvas,(cx_-cc.hw)|0,(cy_-cc.hh)|0);
    }
  }
  // Y-sorted trees BG pass: trees with base ABOVE (north of) player drawn before sprites
  if(!inDungeon)drawCpxTreesInRange(0,pl[0].y+1);

  // ── DUNGEON ENTRANCE LABEL (town only) ──
  if(!inDungeon&&currentMap===0){
    const entX=27*TW-camX+TW/2, entY=11*TH-camY-18;
    if(entX>-60&&entX<W+60&&entY>-30&&entY<H){
      const pulse=Math.abs(Math.sin(fr*0.06))*0.5+0.5;
      g.globalAlpha=0.55+pulse*0.45;
      txShadow('DUNGEON',entX-28,entY,9,'#e040e0','rgba(0,0,0,.6)');
      // Down arrow pulsing
      g.globalAlpha=0.4+pulse*0.6;
      txShadow('▼',entX-4,entY+14,10,'#80e0ff','rgba(0,0,0,.5)');
      g.globalAlpha=1;
    }
  }

  // ── DUNGEON STAIRCASE NAVIGATION LABELS (dungeon only) ──
  // Shows ◀ ESCAPE near the exit stairs and DEEPER ▶ near the descent stairs
  // Only rendered when the staircase tile has been fog-revealed
  if(inDungeon){
    const stairPulse=Math.abs(Math.sin(fr*0.055))*0.45+0.55;
    // ESCAPE stairs: fixed at x=3, y=14 in all dungeon floors
    const escScrX=3*TW-camX+TW/2, escScrY=13*TH-camY-8;
    if(fogRevealed[currentMap]?.[14]?.[3]&&escScrX>-100&&escScrX<W+100&&escScrY>-30&&escScrY<H){
      g.globalAlpha=stairPulse*0.9;
      txShadow('◀ ESCAPE',escScrX-44,escScrY,8,'#40e090','rgba(0,0,0,.75)');
      g.globalAlpha=1;
    }
    // DEEPER stairs: fixed at x=36, y=14; not shown on final floor
    if(currentFloor<MAX_DUNGEON_FLOORS){
      const depScrX=36*TW-camX+TW/2, depScrY=13*TH-camY-8;
      if(fogRevealed[currentMap]?.[14]?.[36]&&depScrX>-100&&depScrX<W+100&&depScrY>-30&&depScrY<H){
        g.globalAlpha=stairPulse*0.9;
        txShadow('DEEPER ▶',depScrX-40,depScrY,8,'#e06848','rgba(0,0,0,.75)');
        g.globalAlpha=1;
      }
    }else{
      // Floor 5: no deeper exit — label it as the deepest
      const deepScrX=36*TW-camX+TW/2, deepScrY=13*TH-camY-8;
      if(fogRevealed[currentMap]?.[14]?.[36]&&deepScrX>-100&&deepScrX<W+100&&deepScrY>-30&&deepScrY<H){
        g.globalAlpha=0.6;
        txShadow('★ DEEPEST',deepScrX-46,deepScrY,8,'#f0c840','rgba(0,0,0,.75)');
        g.globalAlpha=1;
      }
    }
  }

  // Draw footprints on revealed grass tiles — v99: color-coded by rival (VEGA=pink, MIRA=amber)
  for(let _fi=0,_fl=footprints.length;_fi<_fl;_fi++){
    const fp=footprints[_fi];
    if(fp.map!==currentMap)continue;
    if(!fogRevealed[currentMap][fp.y]?.[fp.x])continue;
    const m_=maps[currentMap];
    const tile=m_[fp.y]?.[fp.x];
    if(tile!==1&&tile!==11&&tile!==7)continue;
    const fpx=fp.x*TW-camX;const fpy=fp.y*TH-camY;
    if(fpx<-TW||fpx>W||fpy<-TH||fpy>H)continue;
    const ageFrac=Math.max(0,1-fp.age/FOOTPRINT_MAX_AGE);
    const alpha=ageFrac*0.42;
    const fpCol=fp.ri===1?'#e060a0':fp.ri===2?'#c09020':'#3a3828';
    const sz=fp.ri?Math.max(3,Math.floor(4*ageFrac)+2):4;
    g.globalAlpha=alpha;
    bx(fpx+8,fpy+20,sz,sz,fpCol);
    bx(fpx+18,fpy+24,sz,sz,fpCol);
    g.globalAlpha=1;
  }

  // Draw NPCs on this map (only if on revealed tile)
  for(let _ni=0,_nl=npcs.length;_ni<_nl;_ni++){
    const npc=npcs[_ni];
    if(npc.map===currentMap&&fogRevealed[currentMap][npc.y]?.[npc.x])drawNPCSprite(npc);
  }

  // v262: Fill _srtP/_srtI directly — eliminates visiblePl array creation + indexOf per frame
  let _srtN=1;_srtP[0]=pl[0];_srtI[0]=0;
  if(rivalMaps[0]===currentMap){
    const rv=pl[1];
    if(isVisibleThroughFog(rv.x,rv.y,3)){
      if(!rv._wasVisible){rv._wasVisible=true;rv._alertTimer=30;sfxEncounter();}
      _srtP[_srtN]=rv;_srtI[_srtN]=1;_srtN++;
    }else{rv._wasVisible=false;}
  }else{pl[1]._wasVisible=false;}
  if(rivalMaps[1]===currentMap){
    const hv=pl[2];
    if(isVisibleThroughFog(hv.x,hv.y,3)){
      if(!hv._wasVisible){hv._wasVisible=true;hv._alertTimer=30;sfxEncounter();}
      _srtP[_srtN]=hv;_srtI[_srtN]=2;_srtN++;
    }else{hv._wasVisible=false;}
  }else{pl[2]._wasVisible=false;}
  // v252: insertion sort on pre-alloc buffers (3 items max, no object allocs)
  for(let _vi=1;_vi<_srtN;_vi++){const _pv=_srtP[_vi],_pi=_srtI[_vi];let _vj=_vi-1;while(_vj>=0&&_srtP[_vj].visualY>_pv.visualY){_srtP[_vj+1]=_srtP[_vj];_srtI[_vj+1]=_srtI[_vj];_vj--;}_srtP[_vj+1]=_pv;_srtI[_vj+1]=_pi;}
  for(let _si=0;_si<_srtN;_si++){
    const p=_srtP[_si],i=_srtI[_si];
    // v227: dungeon aura — pre-baked per-floor canvas, modulated by globalAlpha=pulse
    if(inDungeon&&currentFloor>=1&&currentFloor<=5){
      const spx=p.visualX-camX+TW/2,spy=p.visualY-camY+TH*0.7;
      const pulse=0.08+0.05*Math.sin(fr*0.045+i*1.1);
      g.globalAlpha=pulse;
      g.drawImage(_dungeonAuraCanvas[currentFloor],(spx-26)|0,(spy-26)|0);
      g.globalAlpha=1;
    }
    drawSprite(p,i===0);
    if(i!==0){
      const spx=p.visualX-camX,spy=p.visualY-camY-16;
      drawRivalAlertAnim(p,spx,spy);
      const rNameCol=(i===1)?'#f080c0':'#f0c830';
      const rCards=cdCount(p.cd);
      const _ri=i-1; // v304: cache rival sprite label; only rebuild when card count changes
      if(_rLblKey[_ri]!==rCards){_rLblKey[_ri]=rCards;_rLblCache[_ri]=p.n+(rCards>0?' '+rCards+'c':'');}
      const rLabel=_rLblCache[_ri];
      const lW=rLabel.length*5+6;
      bx(spx+8-lW/2,spy-44,lW,11,'rgba(0,0,0,.65)');
      txShadow(rLabel,spx+8-lW/2+3,spy-35,6,rNameCol,'rgba(0,0,0,.5)');
    }
  }

  // Y-sorted trees FG pass: trees with base BELOW (south of) player drawn over sprites
  if(!inDungeon)drawCpxTreesInRange(pl[0].y+1,MH);

  // v98: Rival proximity echo — pulsing "?" ring at fog boundary when rival is nearby but hidden
  if(inDungeon){
    for(let _ri=1;_ri<pl.length;_ri++){
      const rp=pl[_ri],idx=_ri-1;
      if(rivalMaps[idx]!==currentMap)continue;
      if(isVisibleThroughFog(rp.x,rp.y,3))continue;
      const dx=rp.x-pl[0].x,dy=rp.y-pl[0].y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist>10||dist<1)continue;
      const nx=dx/dist,ny=dy/dist;
      const edgeX=(pl[0].x+nx*3.8)*TW-camX+TW/2;
      const edgeY=(pl[0].y+ny*3.8)*TH-camY+TH/2;
      if(edgeX<-20||edgeX>W+20||edgeY<-20||edgeY>H+20)continue;
      const rivalCol=idx===0?'#e060a0':'#d0a030';
      const pPeriod=80+idx*16;
      const pPhase=(fr%pPeriod)/pPeriod;
      const ringA=Math.max(0,1-pPhase*2)*(1-dist/10)*0.65;
      if(ringA<0.03)continue;
      const ringR=4+pPhase*14;
      g.globalAlpha=ringA;
      g.strokeStyle=rivalCol;g.lineWidth=1.5;
      g.beginPath();g.arc(edgeX,edgeY,ringR,0,Math.PI*2);g.stroke();
      if(pPhase<0.28){
        g.globalAlpha=ringA*(1-pPhase/0.28);
        g.font='bold 8px VT323, monospace';_lastFontSz=-1;
        g.fillStyle=rivalCol;g.shadowColor=rivalCol;g.shadowBlur=4;
        g.textAlign='center';g.fillText('?',edgeX,edgeY+3);
        g.textAlign='left';g.shadowBlur=0;
      }
      g.globalAlpha=1;g.lineWidth=1;
    }
  }

  // v155: Draw floor items (cards lying on dungeon ground)
  if(inDungeon){
    const items=floorItems[currentMap];
    if(items&&items.length>0){
      for(const it of items){
        if(!fogRevealed[currentMap][it.y]?.[it.x])continue;
        const ipx=it.x*TW-camX,ipy=it.y*TH-camY;
        if(ipx<-TW||ipx>W||ipy<-TH||ipy>H)continue;
        const cr=CD[it.cardId-1];if(!cr)continue;
        // Rarity glow colors
        const ri=Math.min(cr.r-1,4);
        const rarCol=_ITEM_GLOW_COLS[ri]||'#f0c030';
        const glowPulse=0.55+0.35*Math.sin(fr*0.1+it.glow);
        // v228: pre-baked glow halo (was createRadialGradient per item per frame)
        g.globalAlpha=glowPulse*0.5;
        g.drawImage(_itemGlowCanvas[ri],(ipx+TW/2-14)|0,(ipy+TH/2-14)|0);
        g.globalAlpha=1;
        // Card mini sprite (6×8 rectangle at center)
        const cx2=(ipx+TW/2-3)|0,cy2=(ipy+TH/2-4)|0;
        bx(cx2,cy2,6,8,'#1a1a2e');
        bx(cx2+1,cy2+1,4,6,rarCol);
        // v228: pulsing border via 4 bx calls (was strokeRect — expensive path flush)
        g.globalAlpha=glowPulse;
        bx(cx2-1,cy2-1,8,1,rarCol);bx(cx2-1,cy2+9,8,1,rarCol); // top/bottom
        bx(cx2-1,cy2,1,10,rarCol);bx(cx2+7,cy2,1,10,rarCol);   // left/right
        g.globalAlpha=1;
        // Label above on hover (always show rarity initial)
        const abb=_RAR_ABB[Math.min(cr.r-1,4)]||'?'; // v262: hoisted
        g.globalAlpha=0.7;
        txShadow(abb,cx2-1,cy2-2,5,rarCol,'rgba(0,0,0,.5)');
        g.globalAlpha=1;
      }
    }
  }

  // Draw exit tile markers in dungeon (visible when revealed by fog)
  if(inDungeon){
    for(let _ei=0,_el=exits.length;_ei<_el;_ei++){
      const ex=exits[_ei];
      if(ex.fromMap!==currentMap)continue;
      for(let _ti=0,_tl=ex.tiles.length;_ti<_tl;_ti++){
        const etx=ex.tiles[_ti][0],ety=ex.tiles[_ti][1];
        if(!fogRevealed[currentMap][ety]?.[etx])continue;
        const epx=etx*TW-camX,epy=ety*TH-camY;
        if(epx<-TW||epx>W||epy<-TH||epy>H)continue;
        const pulse=Math.sin(fr*0.08+etx+ety)*0.35+0.65;
        if(ex.isEscape){
          g.globalAlpha=pulse*0.75;
          bx(epx+2,epy+2,TW-4,TH-4,'rgba(30,200,80,.25)');
          g.globalAlpha=1;
          const bob=Math.sin(fr*0.1)*2;
          txShadow('←',epx+4,epy+TH/2+bob+4,10,'#40e060','rgba(0,0,0,.5)');
        }else{
          g.globalAlpha=pulse*0.6;
          bx(epx+2,epy+2,TW-4,TH-4,'rgba(200,180,30,.2)');
          g.globalAlpha=1;
          const bob=Math.sin(fr*0.1)*2;
          txShadow('↓',epx+4,epy+TH/2+bob+4,10,'#e0c040','rgba(0,0,0,.4)');
        }
      }
    }
  }

  // Proximity heartbeat pulse on screen edges
  if(proximityDangerLevel>=1&&sc==='map'){
    const pulseSpeed=proximityDangerLevel>=4?0.25:proximityDangerLevel>=3?0.15:proximityDangerLevel>=2?0.08:0.04;
    const pulseAlpha=proximityDangerLevel>=4?0.18:proximityDangerLevel>=3?0.10:proximityDangerLevel>=2?0.05:0.02;
    const pulse=Math.sin(fr*pulseSpeed)*0.5+0.5;
    const a=pulse*pulseAlpha;
    if(a>0.005){
      g.globalAlpha=a;
      g.drawImage(_proxVigCanvas,0,0);
      g.globalAlpha=1;
    }
  }

  // Darkness overlay for ruins
  if(currentMap===2){bx(0,0,W,H,'rgba(10,0,20,.12)');}

  // Atmospheric effects
  drawAtmosphere();

  // Multiplayer other players
  drawMPPlayers();

  // Player status effects (sparkle, exhausted, card get)
  drawPlayerStatusEffects();

  // Map edge gradient polish — pre-built gradients, vary by globalAlpha only
  {
    const maxX=MW*TW-W,maxY=MH*TH-(H-HUD_HEIGHT);
    const edgeFade=20;
    if(camX<edgeFade){
      g.globalAlpha=0.15*(1-camX/edgeFade);
      g.fillStyle=_mapEdgeGradL;g.fillRect(0,0,edgeFade,H-HUD_HEIGHT);g.globalAlpha=1;
    }
    if(camX>maxX-edgeFade){
      g.globalAlpha=0.15*Math.min(1,(camX-(maxX-edgeFade))/edgeFade);
      g.fillStyle=_mapEdgeGradR;g.fillRect(W-edgeFade,0,edgeFade,H-HUD_HEIGHT);g.globalAlpha=1;
    }
    if(camY<edgeFade){
      g.globalAlpha=0.15*(1-camY/edgeFade);
      g.fillStyle=_mapEdgeGradT;g.fillRect(0,0,W,edgeFade);g.globalAlpha=1;
    }
    if(camY>maxY-edgeFade){
      g.globalAlpha=0.15*Math.min(1,(camY-(maxY-edgeFade))/edgeFade);
      g.fillStyle=_mapEdgeGradB;g.fillRect(0,H-HUD_HEIGHT-edgeFade,W,edgeFade);g.globalAlpha=1;
    }
  }

  // v226: Dungeon floor atmosphere particles (screen-space ambient effects)
  drawDungeonAtmos();
  // Day/night overlay (after all rendering, before HUD)
  drawDayNightOverlay();

  // ── HUD BAR ──
  const hudY=H-HUD_HEIGHT;
  win(0,hudY,W,HUD_HEIGHT);
  // Season timer — v314: cached per minute (output only changes once per minute)
  const _sr=getSeasonRemaining();
  const _nowMin=Math.floor(Date.now()/60000);
  if(_timeLblMapMin!==_nowMin){_timeLblMapMin=_nowMin;_timeLblMapCache=formatTimeRemaining(_sr);}
  const _sCol=_sr<3600000?'#d04040':_sr<86400000?'#d0a030':'#40a040';
  txShadow(_timeLblMapCache,10,hudY+28,9,_sCol,'rgba(0,0,0,.45)');
  // v118: Spell charge orb indicators (visual pips replace plain numbers)
  // v247: static arrays instead of per-frame object literals + forEach
  {
    for(let si=0;si<3;si++){
      const sVal=si===0?sp.s:si===1?sp.b:sp.c; // v280: no array alloc
      const sCX=_ORB_SCX[si],warn=sVal===0;
      const lCol=warn?'#804040':_ORB_SLC[si];
      txShadow(_ORB_SL[si],sCX,hudY+20,7,lCol,'rgba(0,0,0,.35)');
      const orbX=sCX+26,orbY=hudY+12,orbW=7,orbH=7,orbGap=4;
      for(let o=0;o<3;o++){
        const ox=orbX+o*(orbW+orbGap);
        if(o<sVal){bx(ox,orbY,orbW,orbH,_ORB_SF[si]);bx(ox+1,orbY+1,2,1,'rgba(255,255,255,.35)');}
        else{bx(ox,orbY,orbW,orbH,_ORB_SE[si]);}
      }
      if(sVal>3){txShadow(_PLUS_INT[sVal-3]||('+'+( sVal-3)),orbX+3*(orbW+orbGap)+2,hudY+20,6,'#f0c830','rgba(0,0,0,.4)');} // v325
      if(warn){
        const wA=0.4+Math.sin(fr*0.18)*0.4;
        g.globalAlpha=wA;bx(sCX-2,hudY+10,orbX+3*(orbW+orbGap)-sCX+2,orbH+2,'rgba(180,40,40,.15)');g.globalAlpha=1;
      }
    }
  }
  // Location indicator: Town or Dungeon floor
  if(inDungeon){
    txShadow(_B_FLOOR[currentFloor]||('B'+currentFloor),10,hudY+52,9,'#d0b020','rgba(0,0,0,.4)'); // v314
    // Show SAFE countdown while encounter cooldown is active
    if(encounterCooldown>0){
      const safeAlpha=0.6+Math.sin(fr*0.15)*0.4;
      g.globalAlpha=safeAlpha;
      const _safeSecs=Math.min(11,Math.ceil(encounterCooldown/60));
      txShadow(_SAFE_SECS[_safeSecs],30,hudY+52,8,'#40e080','rgba(0,0,0,.5)'); // v314
      g.globalAlpha=1;
    }else{
      txShadow('DUNGEON',30,hudY+52,7,'#a07820','rgba(0,0,0,.4)');
    }
    // v97/v280: Escape compass — cached per currentMap (exits[] is static)
    {
      if(_escExitForMap!==currentMap){_escExitForMap=currentMap;_escExitCache=exits.find(e=>e.fromMap===currentMap&&e.isEscape)||null;}
      const escExit=_escExitCache;
      if(escExit&&escExit.tiles.length>0){
        const [etx,ety]=escExit.tiles[0];
        const dx=etx-pl[0].x,dy=ety-pl[0].y;
        const distTiles=Math.sqrt(dx*dx+dy*dy);
        if(distTiles<=4){
          const neA=0.65+Math.sin(fr*0.28)*0.35;
          g.globalAlpha=neA;
          txShadow('\u2190NEAR',73,hudY+52,6,'#40e090','rgba(0,0,0,.5)');
          g.globalAlpha=1;
        }else{
          const angle=Math.atan2(dy,dx);
          // Map angle to 8-directional arrow
          const didx=((Math.round(angle/(Math.PI/4))+8)%8);
          g.globalAlpha=0.55;
          txShadow(_DIRS[didx]+'ESC',73,hudY+52,6,'#60b868','rgba(0,0,0,.4)');
          g.globalAlpha=1;
        }
      }
    }
  }else{
    txShadow('TOWN',10,hudY+52,7,'#40a040','rgba(0,0,0,.4)');
  }
  // Footstep counter — v314: lazy cache (stepCounter rarely changes)
  if(_stepsKey!==stepCounter){_stepsKey=stepCounter;_stepsCache='STEPS:'+stepCounter;}
  txShadow(_stepsCache,100,hudY+52,7,'#989080','rgba(0,0,0,.35)');
  // v102/v280: Dungeon exploration % — cached via fogExploredPercent (only recomputed on fog change)
  if(inDungeon&&maps[currentMap]){
    const pct=fogExploredPercent(currentMap);
    const expCol=pct<30?'#888878':pct<70?'#a0c080':'#40d080';
    if(_expLblKey!==pct){_expLblKey=pct;_expLblCache='EXP:'+pct+'%';} // v314
    txShadow(_expLblCache,182,hudY+52,7,expCol,'rgba(0,0,0,.35)');
    // v136: Rival floor trackers — V:B2 / M:B3 so player knows where rivals are
    {const vegaMap=rivalMaps[0],miraMap=rivalMaps[1];
    // v304: cache HUD label strings; key packs map(0-5)*10 + cards(0-5) into single int
    const vegaCards=cdCount(pl[1].cd),miraCards=cdCount(pl[2].cd);
    const _vk=vegaMap*10+vegaCards,_mk=miraMap*10+miraCards;
    if(_vegaLblKey!==_vk){_vegaLblKey=_vk;_vegaLblCache='V:'+(vegaMap===0?'TWN':'B'+vegaMap)+' '+vegaCards+'c';}
    if(_miraLblKey!==_mk){_miraLblKey=_mk;_miraLblCache='M:'+(miraMap===0?'TWN':'B'+miraMap)+' '+miraCards+'c';}
    // Highlight when rival is on SAME floor as player (danger)
    const vegaSame=vegaMap===currentMap;const miraSame=miraMap===currentMap;
    const vegaAlpha=vegaSame?(0.7+Math.sin(fr*0.18)*0.3):0.55;
    const miraAlpha=miraSame?(0.7+Math.sin(fr*0.18+1)*0.3):0.55;
    const vegaCol=vegaSame?'#f080c0':'#806070';
    const miraCol=miraSame?'#f0c830':'#807060';
    g.globalAlpha=vegaAlpha;
    txShadow(_vegaLblCache,240,hudY+52,6,vegaCol,'rgba(0,0,0,.35)'); // v304: cached
    g.globalAlpha=miraAlpha;
    txShadow(_miraLblCache,286,hudY+52,6,miraCol,'rgba(0,0,0,.35)'); // v304: cached
    g.globalAlpha=1;}
  }
  // Show first 8 hand cards in HUD (slots 0-7)
  const HUD_CARD_SLOTS=Math.min(8,HAND_SIZE);
  const HUD_CARD_SPACING=30;
  for(let i=0;i<HUD_CARD_SLOTS;i++){
    drawMiniCard(310+i*HUD_CARD_SPACING,hudY+14,pl[0].cd[i]);
    // v108: Rarity glow border for Epic (R4) and Legendary (R5) HUD mini-cards
    if(pl[0].cd[i]>0){
      const cr_=CD[pl[0].cd[i]-1];
      if(cr_.r>=4){
        const mx_=310+i*HUD_CARD_SPACING,my_=hudY+14;
        if(cr_.r===5){
          // Legendary: pulsing white-gold double border
          const pulse_=0.5+Math.sin(fr*0.08+i*0.7)*0.5;
          g.globalAlpha=0.45+pulse_*0.45;
          bx(mx_-1,my_-1,30,1,'#ffe080');bx(mx_-1,my_+20,30,1,'#ffe080');
          bx(mx_-1,my_-1,1,22,'#ffe080');bx(mx_+28,my_-1,1,22,'#ffe080');
          g.globalAlpha=pulse_*0.35;
          bx(mx_-2,my_-2,32,1,'#ffffff');bx(mx_-2,my_+21,32,1,'#ffffff');
          bx(mx_-2,my_-2,1,24,'#ffffff');bx(mx_+30,my_-2,1,24,'#ffffff');
          g.globalAlpha=1;
        }else{
          // Epic: static gold border
          g.globalAlpha=0.65;
          bx(mx_-1,my_-1,30,1,'#c8a820');bx(mx_-1,my_+20,30,1,'#c8a820');
          bx(mx_-1,my_-1,1,22,'#c8a820');bx(mx_+28,my_-1,1,22,'#c8a820');
          g.globalAlpha=1;
        }
      }
    }
    // v113: Card slot shatter animation (slot recently expired)
    if(pl[0].cd[i]===0&&cardShatterTimers[i]>0){
      const shAge=fr-cardShatterTimers[i];
      if(shAge<40){
        const shA=Math.max(0,1-shAge/40);
        const mx_=310+i*HUD_CARD_SPACING,my_=hudY+14;
        g.globalAlpha=shA;
        // Shattered card base
        bx(mx_,my_,28,20,'#601010');
        // Crack overlay — diagonal shards
        g.globalAlpha=shA*0.8;
        bx(mx_,my_,2,20,'#c03030');bx(mx_+26,my_,2,20,'#c03030');
        bx(mx_,my_,28,2,'#c03030');bx(mx_,my_+18,28,2,'#c03030');
        bx(mx_+6,my_+2,2,16,'#c05050');bx(mx_+14,my_+4,2,12,'#c05050');
        bx(mx_+20,my_+2,2,8,'#c05050');
        // Flying shard particles
        for(let s=0;s<5;s++){
          const sx_=mx_+4+s*5+(Math.sin(shAge*0.3+s)*shAge*0.4);
          const sy_=my_+2+s*3-(shAge*0.5+s*1.2);
          const sa=Math.max(0,shA*(1-s*0.15));
          g.globalAlpha=sa;
          bx(sx_,sy_,3,3,'#d04040');
        }
        // "DECAYED" label
        g.globalAlpha=shA;
        txShadow('LOST',mx_,my_+10,5,'#ff4040','rgba(0,0,0,.6)');
        g.globalAlpha=1;
        // Auto-clear after animation
        if(shAge>=40)cardShatterTimers[i]=0;
      }else{
        cardShatterTimers[i]=0;
      }
    }
    // Card decay timer bar under each card
    if(pl[0].cd[i]>0&&cardTimers[i]>0){
      const elapsed=Date.now()-cardTimers[i];
      const remainFrac=Math.max(0,1-elapsed/CARD_DECAY_MS);
      const remainMs=Math.max(0,CARD_DECAY_MS-elapsed);
      const barX_=310+i*HUD_CARD_SPACING, barY_=hudY+36, barW_=24, barH_=3;
      bx(barX_,barY_,barW_,barH_,'#1a1a30');
      const col_=remainFrac>0.5?'#40d040':remainFrac>0.25?'#d0c040':'#d04040';
      bx(barX_,barY_,Math.floor(barW_*remainFrac),barH_,col_);
      // v309: amber border glow when 75% decayed (last ~37s) — early panic warning
      if(remainFrac<0.25){
        const amberA=(0.3+Math.sin(fr*0.2)*0.2);
        g.globalAlpha=amberA;
        bx(310+i*HUD_CARD_SPACING-2,hudY+12,28,28,'#d0a020');
        g.globalAlpha=1;
      }
      // Flash red overlay in last 15 seconds
      if(remainMs<15000){
        const flashA=Math.sin(fr*0.3)*0.4+0.4;
        g.globalAlpha=flashA;
        bx(310+i*HUD_CARD_SPACING-1,hudY+13,26,26,'#d04040');
        g.globalAlpha=1;
      }
      // Countdown seconds when <30s — v309: pre-baked string
      if(remainMs<30000){
        const secs=Math.ceil(remainMs/1000);
        const cntCol=remainMs<10000?'#ff4040':remainMs<20000?'#ff9020':'#ffe040';
        txShadow(_SECS_STR[secs]||secs+'s',310+i*HUD_CARD_SPACING+3,hudY+26,6,cntCol,'rgba(0,0,0,.7)');
      }
    }
  }
  // Show overflow count if hand has more than 8 cards
  const handTotal=cdCount(pl[0].cd);
  if(handTotal>HUD_CARD_SLOTS){
    txShadow(_PLUS_INT[handTotal-HUD_CARD_SLOTS]||('+'+( handTotal-HUD_CARD_SLOTS)),310+HUD_CARD_SLOTS*HUD_CARD_SPACING+2,hudY+26,7,'#c8c0a0','rgba(0,0,0,.4)'); // v324
  }

  // v79: Active run mission strip (dungeon only)
  if(runMission&&inDungeon&&sc==='map'){
    const mDone=runMission.completed;
    const mCol=mDone?'#50e090':'#c0b870';
    const mIcon=mDone?'\u2713':'\u25CB'; // ✓ or ○
    // Progress suffix
    let mProg='';
    if(!mDone){
      if(runMission.type==='new_cards'||runMission.type==='survive'||runMission.type==='battle_rival'||runMission.type==='steal_win'){
        mProg=' '+runMission.progress+'/'+runMission.goal;
      }
    }
    const mText=mIcon+' '+runMission.desc+mProg;
    const mRewText=runMission.reward;
    g.globalAlpha=mDone?1:0.72;
    bx(6,hudY+34,188,14,'rgba(0,0,16,.6)');
    bx(6,hudY+34,2,14,mDone?'#50e090':'#c0a840');
    txShadow(mText,12,hudY+44,5,mCol,'rgba(0,0,0,.4)');
    txShadow(mRewText,140,hudY+44,5,mDone?'#50c080':'#888870','rgba(0,0,0,.35)');
    g.globalAlpha=1;
  }

  // Escape urgency banner: pulsing "ESCAPE TO TOWN!" when any card is critically decaying
  if(escapeUrgencyActive&&inDungeon){
    const epAlpha=0.55+Math.sin(escapeUrgencyPulse*0.18)*0.45;
    g.globalAlpha=epAlpha;
    const epW=180,epX=W/2-epW/2,epY=hudY-20;
    bx(epX,epY,epW,16,'rgba(180,30,30,.85)');
    bx(epX,epY,epW,2,'#ff6040');
    bx(epX,epY+14,epW,2,'#ff6040');
    txShadow('ESCAPE TO TOWN!',epX+epW/2-54,epY+11,8,'#fff8e0','rgba(0,0,0,.6)');
    g.globalAlpha=1;
  }

  // Streak display
  if(streakCount>0){
    const streakCol=streakCount>=5?'#f0c830':streakCount>=3?'#e08040':'#c0c0c0';
    const popScale=streakDisplayTimer>0?1+Math.sin(streakDisplayTimer*0.3)*0.15:1;
    const sz=Math.floor(7*popScale);
    txShadow(_STREAK_LBL[streakCount]||('STREAK:'+streakCount+'x'),310,hudY+44,sz,streakCol,'rgba(0,0,0,.5)'); // v314
  }
  if(streakLostTimer>0){
    const la=streakLostTimer/60;
    g.globalAlpha=la;
    txShadow('STREAK LOST!',310,hudY+44,7,'#d04040','rgba(0,0,0,.5)');
    g.globalAlpha=1;
  }

  // Area Danger Level display — v314: pre-baked combined label
  const dangerVal=areaDanger[currentMap];
  const _dangerIdx=dangerVal>=DANGER_HIGH_THRESH?2:dangerVal>=DANGER_LOW_THRESH?1:0;
  const dangerCol=_dangerIdx===2?'#d04040':_dangerIdx===1?'#d0a030':'#40a040';
  txShadow(_DANGER_LBL[_dangerIdx],420,hudY+44,6,dangerCol,'rgba(0,0,0,.4)');
  // Danger meter bar
  bx(420,hudY+48,60,3,'#282838');
  bx(420,hudY+48,Math.floor(60*dangerVal),3,dangerCol);

  // Rival near-win warning (flashing) — v319: show who + count
  if(rivalWinWarning>0&&Math.floor(fr/15)%2===0){
    const _r1u=rivalUniqSize(1),_r2u=rivalUniqSize(2);
    const _nwKey=_r1u*10+_r2u;
    if(_nearWinKey!==_nwKey){_nearWinKey=_nwKey;const _wu=Math.max(_r1u,_r2u);const _wn=_r1u>=_r2u?pl[1].n:pl[2].n;_nearWinStr=_wn+' '+_wu+'/5 cards!!';}
    txShadow(_nearWinStr,490,hudY+44,6,'#d04040','rgba(0,0,0,.5)');
  }

  // v76: Off-floor rival summary (shown when rival is on a different floor)
  for(let ri=0;ri<2;ri++){
    if(rivalMaps[ri]===currentMap)continue;
    const rp=pl[ri+1];
    const rFloor=rivalMaps[ri];
    const rcc2=cdCount(rp.cd);
    const rCol=ri===0?'#d060a0':'#d0a030';
    const labelY=hudY+4+ri*14;
    const labelX=W-200;
    const _rIK=rFloor*10+rcc2;if(_rInfoKey[ri]!==_rIK){_rInfoKey[ri]=_rIK;_rInfoLbl[ri]=rp.n[0]+' F'+(_FLOOR_NUMS[rFloor]||rFloor)+' '+(_RCC_SPADE[rcc2]||rcc2+'♠');} // v325: lazy
    txShadow(_rInfoLbl[ri],labelX,labelY,5,rcc2>=4?'#d04040':rCol,'rgba(0,0,0,.4)');
  }

  // Rival Threat Indicator (compass arrow at top of screen)
  for(let ri=0;ri<2;ri++){
    if(rivalMaps[ri]!==currentMap)continue;
    const r=pl[ri+1];
    const dx=r.x-pl[0].x, dy=r.y-pl[0].y;
    const dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<1)continue;
    const angle=Math.atan2(dy,dx);
    // Color based on distance
    const arrowCol=dist<=5?'#d04040':dist<=12?'#d0a030':'#40a040';
    // Draw arrow at top center
    const arrowCX=W/2+(ri===0?-30:30), arrowCY=20;
    g.save();
    g.translate(arrowCX,arrowCY);
    g.rotate(angle);
    g.fillStyle=arrowCol;
    g.beginPath();
    g.moveTo(10,0);g.lineTo(-5,-5);g.lineTo(-5,5);
    g.closePath();g.fill();
    g.restore();
    // Label + card count + distance — v319: pre-baked _DIST_T avoids alloc
    const rcc=cdCount(pl[ri+1].cd);
    txShadow(pl[ri+1].n[0],arrowCX-3,arrowCY+14,5,arrowCol,'rgba(0,0,0,.5)');
    txShadow(_RCC_SPADE[rcc]||rcc+'♠',arrowCX-5,arrowCY+24,5,rcc>=4?'#d04040':arrowCol,'rgba(0,0,0,.5)'); // v304
    const _dr=Math.min(50,Math.round(dist));
    txShadow(_DIST_T[_dr],arrowCX-4,arrowCY+34,5,arrowCol,'rgba(0,0,0,.5)'); // v319: tile distance
  }

  // Vault/hand status (progress toward 60-card goal)
  const vaultCount=pl[0].vault?pl[0].vault.size:0;
  const handCount=cdCount(pl[0].cd);
  const vaultPct=vaultCount/60;
  const vaultCol=vaultCount>=50?'#f0c830':vaultCount>=30?'#e08040':vaultCount>=10?'#40c060':'#686068';
  txShadow(_CARDS_LBL[vaultCount]||('CARDS:'+vaultCount+'/60'),310,hudY+56,7,vaultCol,'rgba(0,0,0,.4)'); // v314
  // Tiny collection progress bar
  bx(310,hudY+60,60,3,'#282838');
  bx(310,hudY+60,Math.floor(60*vaultPct),3,vaultCol);
  txShadow(_HAND_LBL[handCount]||('HAND:'+handCount),382,hudY+56,6,'#686068','rgba(0,0,0,.35)'); // v314

  // Footprint trail indicator: show fresh rival tracks on this floor
  if(inDungeon){
    let trailX=430; // v262: rivalCols/rivalNames hoisted to _RIVAL_TRAIL_COLS, pl[ri+1].n[0] inline
    for(let ri=0;ri<2;ri++){
      // v220: Avoid .filter().map() array allocations — single loop finds min age
      let freshest=Infinity,_fp;
      for(let _fi=0;_fi<footprints.length;_fi++){_fp=footprints[_fi];if(_fp.ri===ri&&_fp.map===currentMap&&_fp.age<900&&_fp.age<freshest)freshest=_fp.age;}
      if(freshest<Infinity){
        const freshAlpha=freshest<180?1:freshest<600?0.7:0.45;
        g.globalAlpha=freshAlpha;
        // Small boot icon (two dots)
        g.fillStyle=_RIVAL_TRAIL_COLS[ri];
        g.fillRect(trailX,hudY+52,2,3);g.fillRect(trailX+3,hudY+53,2,2);
        g.globalAlpha=1;
        const _tnm=pl[ri+1].n[0];if(_trailNm[ri]!==_tnm){_trailNm[ri]=_tnm;_trailLbl[ri]=_tnm+'!';} // v325: lazy
        txShadow(_trailLbl[ri],trailX+6,hudY+57,6,_RIVAL_TRAIL_COLS[ri],'rgba(0,0,0,.4)');
        trailX+=26;
      }
    }
  }

  const m=getMap();
  const tile=m[pl[0].y]?.[pl[0].x];
  let locName=mapNames[currentMap];
  if(!inDungeon){
    if(tile===2)locName+=' — PATH';
    else if(tile===11)locName+=' — GRASS';
    else if(tile===10)locName+=' — DOCK';
  }
  const locCol=inDungeon?'#a09060':'#686068';
  txShadow(locName,560,hudY+52,inDungeon?7:6,locCol,'rgba(0,0,0,.35)');

  // Exploration percentage — v314: lazy cache
  const expPct=fogExploredPercent(currentMap);
  if(_mapLblKey!==expPct){_mapLblKey=expPct;_mapLblCache='MAP:'+expPct+'%';}
  txShadow(_mapLblCache,560,hudY+22,8,'#686068','rgba(0,0,0,.35)');

  // Sound indicator
  txShadow(soundEnabled?'SND:ON':'SND:OFF',750,hudY+22,6,soundEnabled?'#60a060':'#a06060','rgba(0,0,0,.35)');
  // On-chain mode indicator with Solana icon
  if(walletConnected){
    drawSolanaIcon(808,hudY+15,7);
    txShadow('ON-CHAIN',820,hudY+22,6,'#40d080','rgba(0,0,0,.4)');
    // Pot display
    const _potK=(stakePotAmount*100)|0;if(_potLblRef!==_potK){_potLblRef=_potK;_potLblCache='POT:'+stakePotAmount.toFixed(2);} // v325: lazy
    txShadow(_potLblCache,820,hudY+32,5,'#14F195','rgba(0,0,0,.4)');
    // Season 1 indicator (competitive mode)
    bx(900,hudY+14,24,14,'rgba(200,152,32,.3)');
    txShadow('S1',904,hudY+24,7,'#f0c830','rgba(0,0,0,.4)');
  }
  else{txShadow('OFFLINE',820,hudY+22,6,'#555570','rgba(0,0,0,.35)');}
  // v84: Town weather indicator
  if(!inDungeon&&currentMap===0){
    const wIcon=townWeather==='rain'?'\u2614':townWeather==='fog'?'\u2601':'\u2600';
    const wCol=townWeather==='rain'?'#80a0d0':townWeather==='fog'?'#a0a8b0':'#f0c830';
    txShadow(wIcon,820,hudY+52,9,wCol,'rgba(0,0,0,.4)');
  }
  // Version label in HUD (bottom-right corner) — matches current build
  txShadow('v339',900,hudY+56,8,'#8890c0','rgba(0,0,0,.5)');

  // Day/night icon
  drawDayNightIcon(740,hudY+42);

  // Save indicator
  if(saveIndicatorTimer>0){
    const sa=Math.min(1,saveIndicatorTimer/15);
    g.globalAlpha=sa;
    bx(752,hudY+44,7,6,'#6080c0');bx(753,hudY+44,5,1,'#a0b0d0');bx(754,hudY+46,3,2,'#e0e0e0');
    txShadow('SAVING...',720,hudY+52,5,'#6080c0','rgba(0,0,0,.4)');
    g.globalAlpha=1;
  }

  // Minimap
  drawMinimap();

  // v94: Town rivalry scoreboard (shown only in town, top-left panel)
  if(currentMap===0&&!inDungeon&&sc==='map'){
    const myUniq=pl[0].vault?pl[0].vault.size:0;
    const vegaCards=cdCount(pl[1].cd);
    const miraCards=cdCount(pl[2].cd);
    // Use vault-proxy for rivals (their hand as unique cards approximation)
    const vegaUniq=cdUniq(pl[1].cd);
    const miraUniq=cdUniq(pl[2].cd);
    // Sort by unique count descending
    const rankings=[
      {name:'YOU',uniq:myUniq,hand:cdCount(pl[0].cd),col:'#78c0f0',floor:0},
      {name:pl[1].n,uniq:vegaUniq,hand:vegaCards,col:'#e060a0',floor:rivalMaps[0]},
      {name:pl[2].n,uniq:miraUniq,hand:miraCards,col:'#d0a030',floor:rivalMaps[1]}
    ].sort((a,b)=>b.uniq-a.uniq);
    const mmH_=90; // match minimap height
    const sbW=156,sbH=88,sbX=12,sbY=H-HUD_HEIGHT-sbH-mmH_-24;
    const pnlAlpha=0.92;
    g.globalAlpha=pnlAlpha;
    win(sbX,sbY,sbW,sbH);
    bx(sbX,sbY,sbW,3,'#f0c830');
    g.globalAlpha=pnlAlpha;
    txShadow('\u2694 STANDINGS',sbX+8,sbY+18,8,'#f0c830','rgba(0,0,0,.4)');
    bx(sbX+4,sbY+22,sbW-8,1,'rgba(200,180,100,.3)');
    for(let ri=0;ri<rankings.length;ri++){
      const r=rankings[ri];
      const ry=sbY+28+ri*18;
      const isLeader=ri===0;
      g.globalAlpha=pnlAlpha*(isLeader?1:0.8);
      txShadow(_LDR_RANK[ri],sbX+8,ry+12,isLeader?9:7,isLeader?'#f0c830':'#808080','rgba(0,0,0,.4)'); // v304
      const nm=r.name.length>5?r.name.slice(0,5):r.name;
      txShadow(nm,sbX+22,ry+12,isLeader?8:7,r.col,'rgba(0,0,0,.3)');
      const uniqStr=_UNIQ60[r.uniq]||r.uniq+'/60'; // v309: pre-baked
      txShadow(uniqStr,sbX+sbW-8-uniqStr.length*6,ry+12,isLeader?8:7,'#e8e0c0','rgba(0,0,0,.3)');
      if(r.floor>0){txShadow(_WLD_FLOOR_NUMS[r.floor]||'B'+r.floor,sbX+76,ry+12,6,r.col,'rgba(0,0,0,.35)');} // v304
      if(isLeader){txShadow('\u2605',sbX+sbW-22,ry+6,5,'#f0c830','rgba(0,0,0,.4)');}
    }
    g.globalAlpha=1;
  }

  // v100: Card race tracker — persistent panel showing all three players racing toward 60/60
  if(sc==='map'){
    const rcW=148,rcH=76,rcX=W-rcW-10,rcY=8;
    const myUniq=pl[0].vault?pl[0].vault.size:0;
    const vegaUniq=cdUniq(pl[1].cd);
    const miraUniq=cdUniq(pl[2].cd);
    const racers=[
      {name:'YOU',cnt:myUniq,col:'#78c0f0'},
      {name:pl[1].n,cnt:vegaUniq,col:'#e060a0'},
      {name:pl[2].n,cnt:miraUniq,col:'#d0a030'}
    ].sort((a,b)=>b.cnt-a.cnt);
    g.globalAlpha=0.90;
    bx(rcX,rcY,rcW,rcH,'#080816');
    bx(rcX,rcY,rcW,2,'#f0c830');
    bx(rcX,rcY+2,1,rcH-2,'#282848');
    bx(rcX+rcW-1,rcY+2,1,rcH-2,'#282848');
    bx(rcX,rcY+rcH-1,rcW,1,'#282848');
    txShadow('\u2694 CARD RACE',rcX+8,rcY+16,7,'#f0c830','rgba(0,0,0,.4)');
    // Pulsing LIVE dot
    const livePulse=0.55+0.45*Math.sin(fr*0.12);
    g.globalAlpha=0.9*livePulse;
    bx(rcX+rcW-12,rcY+8,6,6,'#40e080');
    g.globalAlpha=0.9;
    bx(rcX+4,rcY+20,rcW-8,1,'rgba(200,180,100,.25)');
    // Racer rows (sorted by count)
    const barMax=76;
    for(let i=0;i<racers.length;i++){
      const r=racers[i];
      const ry=rcY+24+i*16;
      const isLeader=i===0;
      g.globalAlpha=0.9*(isLeader?1:0.72);
      txShadow(isLeader?'\u2605':String(i+1),rcX+6,ry+10,isLeader?7:5,isLeader?'#f0c830':'#666680','rgba(0,0,0,.4)');
      const nm=r.name.length>4?r.name.slice(0,4):r.name;
      txShadow(nm,rcX+18,ry+10,6,r.col,'rgba(0,0,0,.3)');
      const barW=Math.round(barMax*(r.cnt/60));
      bx(rcX+44,ry+2,barMax,7,'#1a1a30');
      bx(rcX+44,ry+2,barW,7,r.col);
      txShadow(_UNIQ60[r.cnt]||(r.cnt+'/60'),rcX+44+barMax+3,ry+10,5,isLeader?'#e8e0c0':'#787890','rgba(0,0,0,.35)'); // v324
    }
    g.globalAlpha=1;
  }

  // v105: Collection milestone toast — golden banner at top-center
  if(milestoneToastText&&fr-milestoneToastFrame<210){
    const tAge=fr-milestoneToastFrame;
    const tAlpha=tAge<12?tAge/12:tAge>180?Math.max(0,(210-tAge)/30):1;
    const slideY=tAge<12?(1-tAge/12)*-32:0;
    const toastW=milestoneToastText.length*8+24;
    const toastX=W/2-toastW/2,toastY=40+slideY;
    g.globalAlpha=tAlpha;
    bx(toastX,toastY,toastW,24,'rgba(10,8,20,.88)');
    bx(toastX,toastY,toastW,2,'#f0c830');
    bx(toastX,toastY+22,toastW,2,'#f0c830');
    bx(toastX,toastY,1,24,'#f0c830');
    bx(toastX+toastW-1,toastY,1,24,'#f0c830');
    txShadow('\u2605 '+milestoneToastText+' \u2605',toastX+12,toastY+17,8,'#f0e040','rgba(0,0,0,.6)');
    g.globalAlpha=1;
  }

  // Textbox (canvas fallback for mobile, PixiJS on desktop)
  if(_isMobile&&!twDone){
    const tbSlide=Math.min(1,(fr-twShowFrame)/6);
    const tbY=hudY-56+52*(1-easeInOut(tbSlide));
    g.globalAlpha=easeInOut(tbSlide);
    win(4,tbY,W-8,52);
    txShadow(twText,14,tbY+32,8,FRLG.textColor,'rgba(0,0,0,.35)');
    const bounce=Math.floor(Math.sin(fr*Math.PI/30)*2);
    txShadow('\u25BC',W-24,tbY+46+bounce,8,FRLG.selHighlight,'rgba(0,0,0,.4)');
    g.globalAlpha=1;
  }

  // NPC dialog overlay
  drawNPCDialog();

  // Signpost dialog overlay
  drawSignpostDialog();

  // Trading Post overlay
  drawCardShop();

  // Wild encounter overlay
  drawWildEncounter();

  // Random event overlay
  drawRandomEvent();

  // Battle encounter exclamation
  drawEncounterExclamation();

  // Proximity taunt speech bubble
  if(proximityTauntText&&proximityTauntRival>=1&&rivalMaps[proximityTauntRival-1]===currentMap){
    const tRival=pl[proximityTauntRival];
    if(isVisibleThroughFog(tRival.x,tRival.y,5)){
      const tAge=fr-proximityTauntFrame;
      const tAlpha=Math.min(1,tAge/8)*(tAge<75?1:Math.max(0,(90-tAge)/15));
      if(tAlpha>0){
        g.globalAlpha=tAlpha;
        const spx=tRival.visualX-camX;const spy=tRival.visualY-camY-20;
        const bW=proximityTauntText.length*6+12;const bH=16;
        // Speech bubble with tail
        bx(spx-bW/2+8,spy-bH-4,bW,bH+4,'rgba(255,255,255,.92)');
        bx(spx-bW/2+8,spy-bH-4,bW,1,'#c0b890');bx(spx-bW/2+8,spy-1,bW,1,'#c0b890');
        // Bubble tail (small triangle pointing down at the rival)
        g.fillStyle='rgba(255,255,255,.92)';
        g.beginPath();g.moveTo(spx+6,spy);g.lineTo(spx+12,spy+4);g.lineTo(spx+14,spy);g.closePath();g.fill();
        const rNameCol=(proximityTauntRival===1)?'#d860a0':'#d8b028';
        txShadow(pl[proximityTauntRival].n,spx-bW/2+12,spy-bH+4,5,rNameCol,'rgba(0,0,0,.3)');
        txShadow(proximityTauntText,spx-bW/2+12,spy-5,6,'#303028','rgba(255,255,255,.2)');
        g.globalAlpha=1;
      }
    }
  }

  // Rival alert
  if(rivalAlert>0){
    const a=Math.min(1,rivalAlert/30);
    g.globalAlpha=a;
    win(W/2-120,6,240,24);
    if(_alertLblRef!==rivalAlertName){_alertLblRef=rivalAlertName;_alertLblCache=rivalAlertName+' entered your map!';} // v326: lazy
    txShadow(_alertLblCache,W/2-110,22,6,'#c04040','rgba(0,0,0,.4)');
    g.globalAlpha=1;
  }

  // Location banner
  drawBanner();
  // v155: PMD-style floor title card (draws over everything when active)
  drawFloorTitle();
}

// ═══════════════════════════════════════
// MENU
// ═══════════════════════════════════════
let menuOpenFrame=0;
function dMenu(){
  if(!_isMobile)return; // Desktop: handled by PixiJS pxMenuContainer
  // Mobile: canvas fallback menu
  if(menuOpenFrame===0)menuOpenFrame=fr;
  const menuT=Math.min(1,(fr-menuOpenFrame)/8);
  const ease=easeInOut(menuT);
  const menuW=Math.floor(190*ease),menuH=Math.floor(340*ease);
  const menuX=W-10-menuW,menuY=10;
  g.globalAlpha=0.35*ease;g.fillStyle='#000000';g.fillRect(0,0,W,H);g.globalAlpha=1;
  if(menuW>4&&menuH>4){
    win(menuX,menuY,menuW,menuH);
    if(ease>=0.7){
      const itemAlpha=Math.min(1,(ease-0.7)/0.3);
      g.globalAlpha=itemAlpha;
      for(let i=0;i<_MENU_ITEMS.length;i++){
        const s=_MENU_ITEMS[i];const y=34+i*22;
        if(i===mi){txShadow('\u25B6',W-166,y,9,FRLG.selHighlight,'rgba(0,0,0,.4)');txShadow(s,W-148,y,9,FRLG.selHighlight,'rgba(0,0,0,.4)');}
        else txShadow(s,W-148,y,9,'#686068','rgba(0,0,0,.35)');
      }
      g.globalAlpha=1;
    }
  }
}

