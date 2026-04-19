// ═══════════════════════════════════════
// TILE RENDERING
// ═══════════════════════════════════════
// v375: 512-entry integer sin/cos lookup — eliminates Math.sin(fr*x + integer_phase) per-tile calls
// Phases like tx_*2+ty*3 (max 195), tx_*5+ty*7 (max 468), x+y (max 78) are all within 0-511
const _NSIN=new Float32Array(512);const _NCOS=new Float32Array(512);
for(let i=0;i<512;i++){_NSIN[i]=Math.sin(i);_NCOS[i]=Math.cos(i);}
// v383: per-axis 40-entry tables for campfire (x*2.3, y*1.7) and lava (x*1.8, y*2.1) float spatial phases
// sin(x*2.3+y*1.7) = sin(x*2.3)*cos(y*1.7)+cos(x*2.3)*sin(y*1.7) — angle-sum factorization
const _CAMP_SX23=new Float32Array(40);const _CAMP_CX23=new Float32Array(40);
const _CAMP_SY17=new Float32Array(40);const _CAMP_CY17=new Float32Array(40);
const _LAVA_SX18=new Float32Array(40);const _LAVA_CX18=new Float32Array(40);
const _LAVA_SY21=new Float32Array(40);const _LAVA_CY21=new Float32Array(40);
for(let i=0;i<40;i++){
  _CAMP_SX23[i]=Math.sin(i*2.3);_CAMP_CX23[i]=Math.cos(i*2.3);
  _CAMP_SY17[i]=Math.sin(i*1.7);_CAMP_CY17[i]=Math.cos(i*1.7);
  _LAVA_SX18[i]=Math.sin(i*1.8);_LAVA_CX18[i]=Math.cos(i*1.8);
  _LAVA_SY21[i]=Math.sin(i*2.1);_LAVA_CY21[i]=Math.cos(i*2.1);
}
// v394: 8-entry walkBob table — NPC walk cycle steps by 0.25, period=2, 8 unique sin values
const _WALK_BOB8=new Float32Array(8);
for(let i=0;i<8;i++)_WALK_BOB8[i]=Math.sin(i*Math.PI*0.25)*2;
// v251: Pre-baked lake tile color strings — eliminates template literal creation per lake tile per dirty frame
// rv=(h&5)-2; h&5 ∈ {0,1,4,5} → rv ∈ {-2,-1,2,3}. Indexed by h&5 (sparse array, slots 2,3 unused).
const _LAKE_TOP_F3 =['rgb(46,110,166)','rgb(47,111,167)',null,null,'rgb(50,114,170)','rgb(51,115,171)'];
const _LAKE_TOP_NF3=['rgb(58,122,178)','rgb(59,123,179)',null,null,'rgb(62,126,182)','rgb(63,127,183)'];
const _LAKE_BOT_F3 =['rgb(34,98,154)', 'rgb(35,99,155)', null,null,'rgb(38,102,158)','rgb(39,103,159)'];
const _LAKE_BOT_NF3=['rgb(46,110,166)','rgb(47,111,167)',null,null,'rgb(50,114,170)','rgb(51,115,171)'];
// v251: Pre-baked stone shade strings for drawRuinsWall fallback — shade = (idx%3)*8 ∈ {0,8,16}
const _STONE_SHADE=['rgb(96,88,80)','rgb(104,96,88)','rgb(112,104,96)'];
// v232: Pre-baked tile shadows — replaces per-frame g.ellipse() on every visible tree/rock
// Tree shadow: ellipse(px+16,py+30,12,4) @.12 → 28×10, center(14,5), draw@(px+2,py+25)
const _tileShadowTree=(()=>{
  const c=document.createElement('canvas');c.width=28;c.height=10;
  const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(0,0,0,.12)';ctx.beginPath();ctx.ellipse(14,5,12,4,0,0,Math.PI*2);ctx.fill();
  return c;
})();
// Pine shadow: ellipse(px+16,py+30,10,3) @.08 → 22×8, center(11,4), draw@(px+5,py+26)
const _tileShadowPine=(()=>{
  const c=document.createElement('canvas');c.width=22;c.height=8;
  const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(0,0,0,.08)';ctx.beginPath();ctx.ellipse(11,4,10,3,0,0,Math.PI*2);ctx.fill();
  return c;
})();
// Rock shadow: same geometry as tree shadow, different alpha
const _tileShadowRock=(()=>{
  const c=document.createElement('canvas');c.width=28;c.height=10;
  const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(0,0,0,.10)';ctx.beginPath();ctx.ellipse(14,5,12,4,0,0,Math.PI*2);ctx.fill();
  return c;
})();
// Fire glow: arc(px+16,py+16,14) @.12 → 30×30, center(15,15), draw@(px+1,py+1)
const _tileFireGlow=(()=>{
  const c=document.createElement('canvas');c.width=30;c.height=30;
  const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(255,160,40,.12)';ctx.beginPath();ctx.arc(15,15,14,0,Math.PI*2);ctx.fill();
  return c;
})();
// v237: Pre-baked tile arc/ellipse canvases — cave glow, lily pad, lighthouse, crystal(×2), altar orbs(×2), treasure(×2), stair ellipses(×6)
const _tileCaveGlow=(()=>{
  const c=document.createElement('canvas');c.width=14;c.height=14;
  const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(80,60,120,.25)';ctx.beginPath();ctx.arc(7,7,6,0,Math.PI*2);ctx.fill();
  return c;
})();
const _tileLilyPad=(()=>{
  const c=document.createElement('canvas');c.width=12;c.height=8;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#48a050';ctx.beginPath();ctx.ellipse(6,4,5,3,0,0,Math.PI*2);ctx.fill();
  return c;
})();
const _tileLighthouseGlow=(()=>{
  const c=document.createElement('canvas');c.width=26;c.height=26;
  const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(240,224,128,.3)';ctx.beginPath();ctx.arc(13,13,12,0,Math.PI*2);ctx.fill();
  return c;
})();
const _tileCrystalGlows=(()=>{
  function mk(col){const c=document.createElement('canvas');c.width=22;c.height=22;const ctx=c.getContext('2d');ctx.fillStyle=col;ctx.beginPath();ctx.arc(11,11,10,0,Math.PI*2);ctx.fill();return c;}
  return [mk('rgba(160,200,255,1)'),mk('rgba(200,160,255,1)')];
})();
const _tileAltarOrb5=(()=>{
  const c=document.createElement('canvas');c.width=12;c.height=12;
  const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(200,160,255,1)';ctx.beginPath();ctx.arc(6,6,5,0,Math.PI*2);ctx.fill();
  return c;
})();
const _tileAltarOrb10=(()=>{
  const c=document.createElement('canvas');c.width=22;c.height=22;
  const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(255,220,255,1)';ctx.beginPath();ctx.arc(11,11,10,0,Math.PI*2);ctx.fill();
  return c;
})();
const _tileTreasureGlow10=(()=>{
  const c=document.createElement('canvas');c.width=22;c.height=22;
  const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(248,224,96,1)';ctx.beginPath();ctx.arc(11,11,10,0,Math.PI*2);ctx.fill();
  return c;
})();
const _tileTreasureGlow8=(()=>{
  const c=document.createElement('canvas');c.width=18;c.height=18;
  const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(248,224,96,1)';ctx.beginPath();ctx.arc(9,9,8,0,Math.PI*2);ctx.fill();
  return c;
})();
function _mkStairEllipse(rx,ry,col){
  const w=rx*2+2,h=ry*2+2;const c=document.createElement('canvas');c.width=w;c.height=h;
  const ctx=c.getContext('2d');ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(rx+1,ry+1,rx,ry,0,0,Math.PI*2);ctx.fill();return c;
}
const _stairDownPurpleA=_mkStairEllipse(7,4,'rgba(80,40,180,1)');
const _stairDownPurpleB=_mkStairEllipse(11,6,'rgba(140,80,255,1)');
const _stairDownGoldA=_mkStairEllipse(7,4,'rgba(220,160,0,1)');
const _stairDownGoldB=_mkStairEllipse(11,6,'rgba(255,220,40,1)');
const _stairUpBlueA=_mkStairEllipse(7,4,'rgba(40,120,200,1)');
const _stairUpBlueB=_mkStairEllipse(11,6,'rgba(80,180,255,1)');
// Glow tile center arc: r=4, two color variants (teal/purple), 10×10
const _glowTileArc=(()=>{
  function mk(col){const c=document.createElement('canvas');c.width=10;c.height=10;const ctx=c.getContext('2d');ctx.fillStyle=col;ctx.beginPath();ctx.arc(5,5,4,0,Math.PI*2);ctx.fill();return c;}
  return [mk('rgba(120,240,255,1)'),mk('rgba(200,120,255,1)')];
})();
// Lava bubble arcs: r=3 and r=2, color #f8a060
const _lavaBubble3=(()=>{const c=document.createElement('canvas');c.width=8;c.height=8;const ctx=c.getContext('2d');ctx.fillStyle='#f8a060';ctx.beginPath();ctx.arc(4,4,3,0,Math.PI*2);ctx.fill();return c;})();
const _lavaBubble2=(()=>{const c=document.createElement('canvas');c.width=6;c.height=6;const ctx=c.getContext('2d');ctx.fillStyle='#f8a060';ctx.beginPath();ctx.arc(3,3,2,0,Math.PI*2);ctx.fill();return c;})();
// v279: use module-scope Sets (LAND_TILES/WATER_TILES from 01-pixi.js) for O(1) lookup; add _GRASS_TILES
const _GRASS_TILES=new Set([1,7,11,3]);
// v317: pre-baked CC badge strings — avoids `_CC_STR[p.cc]||(p.cc+'')` string allocation every frame per visible player
const _CC_STR=(()=>{const a=[];for(let i=0;i<=99;i++)a.push(i+'');return a;})();
// v366: pre-baked lava flow spatial phases (lx*0.3+ly*0.2 for lx=0,4..28, ly=0,4..28 — 8×8=64 entries)
const _LAVA_FLOW_SI=new Float32Array(64);const _LAVA_FLOW_CI=new Float32Array(64);
for(let li=0;li<8;li++)for(let lj=0;lj<8;lj++){const ph=li*1.2+lj*0.8;const k=li*8+lj;_LAVA_FLOW_SI[k]=Math.sin(ph);_LAVA_FLOW_CI[k]=Math.cos(ph);}
const _LAVA_FLOW_V=new Float32Array(64); // sin(wt*0.2+lx*0.3+ly*0.2)*0.5+0.5 — updated when wt changes
let _lavaFlowWt=-1;
function _updateLavaFlow(){
  if(_lavaFlowWt===wt)return;
  _lavaFlowWt=wt;
  const sw=Math.sin(wt*0.2),cw=Math.cos(wt*0.2);
  for(let k=0;k<64;k++)_LAVA_FLOW_V[k]=(sw*_LAVA_FLOW_CI[k]+cw*_LAVA_FLOW_SI[k])*0.5+0.5;
}
// v390: pre-baked spatial phases for water waveOff: sin/cos(tx*0.5) for tx=0..39
const _WAVE_TX_SI=new Float32Array(40);const _WAVE_TX_CI=new Float32Array(40);
for(let i=0;i<40;i++){_WAVE_TX_SI[i]=Math.sin(i*0.5);_WAVE_TX_CI[i]=Math.cos(i*0.5);}
// v390: pre-baked spatial phases for boat waves: sin/cos(wx*0.3) for wx=6,10,14,18,22
const _BOAT_WX_SI5=new Float32Array([Math.sin(1.8),Math.sin(3.0),Math.sin(4.2),Math.sin(5.4),Math.sin(6.6)]);
const _BOAT_WX_CI5=new Float32Array([Math.cos(1.8),Math.cos(3.0),Math.cos(4.2),Math.cos(5.4),Math.cos(6.6)]);
// v390: dirty-flag cache for wt-based sin/cos (wt changes every 20 frames — 3fps)
let _wtWavePrev=-1,_wt_sw3=0,_wt_cw3=0,_wt_sw4=0,_wt_cw4=0;
function _updateWtWaveCache(){
  if(_wtWavePrev===wt)return;
  _wtWavePrev=wt;
  _wt_sw3=Math.sin(wt*0.3);_wt_cw3=Math.cos(wt*0.3);
  _wt_sw4=Math.sin(wt*0.4);_wt_cw4=Math.cos(wt*0.4);
}
// v366: grass blade sin/cos for i*0.7 (8 blades per tile)
const _GRASS_SI7=new Float32Array(8);const _GRASS_CI7=new Float32Array(8);
for(let i=0;i<8;i++){_GRASS_SI7[i]=Math.sin(i*0.7);_GRASS_CI7[i]=Math.cos(i*0.7);}
// v366: sparkle orbit phases i*2.1 (3 sparkles) and i*1.3 (3 legendary sparkles)
const _SPARK_SI21=new Float32Array(3);const _SPARK_CI21=new Float32Array(3);
for(let i=0;i<3;i++){_SPARK_SI21[i]=Math.sin(i*2.1);_SPARK_CI21[i]=Math.cos(i*2.1);}
const _SPARK_SI13=new Float32Array(5);const _SPARK_CI13=new Float32Array(5);
for(let i=0;i<5;i++){_SPARK_SI13[i]=Math.sin(i*1.3);_SPARK_CI13[i]=Math.cos(i*1.3);}
// v367: chimney smoke alpha — sin(fr*0.12+p) for p=0..4 uses _sFr12/_cFr12 via sin-addition with pre-baked sin/cos(p)
const _CHIMNEY_SI=new Float32Array(5);const _CHIMNEY_CI=new Float32Array(5);
for(let i=0;i<5;i++){_CHIMNEY_SI[i]=Math.sin(i);_CHIMNEY_CI[i]=Math.cos(i);}
// v367: bird bob — sin(fr*0.03+bi*1.1) for bi=0..19, pre-bake sin/cos(bi*1.1) for sin-addition with _sFr03/_cFr03
const _BIRD_SI11=new Float32Array(20);const _BIRD_CI11=new Float32Array(20);
for(let i=0;i<20;i++){_BIRD_SI11[i]=Math.sin(i*1.1);_BIRD_CI11[i]=Math.cos(i*1.1);}
function isNearTileType(tx_,ty,tileSet){
  const m=getMap();
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const nx=tx_+dx,ny=ty+dy;
    if(nx>=0&&nx<MW&&ny>=0&&ny<MH){
      const t=m[ny]?.[nx];
      if(tileSet.has(t))return true;
    }
  }
  return false;
}
function isNearLand(tx_,ty){return isNearTileType(tx_,ty,LAND_TILES);}
function isNearWater(tx_,ty){return isNearTileType(tx_,ty,WATER_TILES);}
function isNearGrass(tx_,ty){return isNearTileType(tx_,ty,_GRASS_TILES);}

// @deprecated (phase-b2-town): replaced by drawGBAWater for currentMap===0
function drawWater(px,py,tx_,ty){
  // Zelda water tile — unified art style
  if(drawZeldaOverTile(ZO.water[0], ZO.water[1], px, py, 2)){
    // Sparkle overlay
    if((wt+tx_*3+ty*7)%8===0){const r=tr(tx_,ty);bx(px+Math.floor(r.g*28)+2,py+Math.floor(r.h*28)+2,2,2,'rgba(255,255,255,.5)');}
    return;
  }
  // Fallback: ocean blue with subtle wave bands
  bx(px,py,TW,TH,'#1c3a6e');
  if((ty+wt)%4<2)bx(px,py+8,TW,2,'#1e3e78');
  if((wt+tx_*3+ty*7)%8===0){const r=tr(tx_,ty);bx(px+Math.floor(r.g*28)+2,py+Math.floor(r.h*28)+2,2,2,'rgba(255,255,255,.5)');}
}

// ═══════════════════════════════════════
// FRLG-STYLE DUNGEON PALETTE
// Consistent GBA cave look: warm stone floors, dark rock walls, depth-tinted
// ═══════════════════════════════════════
const DFLOOR=[null,
  {b:'#8a8070',l:'#988c7c',d:'#7a7060',c:'#6a6058'}, // F1: warm sandstone
  {b:'#7a8080',l:'#888e8e',d:'#6a7070',c:'#5a6060'}, // F2: cool slate
  {b:'#7e6a9a',l:'#907cb0',d:'#6c5888',c:'#584870'}, // F3: amethyst cave
  {b:'#8a5a4a',l:'#9a6858',d:'#7a4e3e',c:'#6a3e2e'}, // F4: rust cavern
  {b:'#584860',l:'#685878',d:'#484050',c:'#382838'}, // F5: void crypt
];
const DWALL=[null,
  {b:'#302418',m:'#3c3020',t:'#504030',s:'#1c1408'}, // F1
  {b:'#202430',m:'#2c3040',t:'#38404c',s:'#10141c'}, // F2
  {b:'#281630',m:'#38203e',t:'#4a284e',s:'#180c1c'}, // F3
  {b:'#2c1010',m:'#3c1818',t:'#501e20',s:'#1a0808'}, // F4
  {b:'#1c0e22',m:'#28102c',t:'#381438',s:'#100a14'}, // F5
];
const DCORR=[null,
  {b:'#6e6858',d:'#5c5848'}, // F1
  {b:'#686e72',d:'#585e62'}, // F2
  {b:'#625680',d:'#524670'}, // F3
  {b:'#6e4838',d:'#5c3828'}, // F4
  {b:'#4a3a52',d:'#3a2a42'}, // F5
];

// @deprecated (phase-b2-town): replaced by drawGBAGrass for currentMap===0
function drawGrass(px,py,tx_,ty){
  // Dungeon floor — FRLG-style clean pixel art
  if(currentMap>0){
    const h=tileHash(tx_,ty);
    const depth=currentMap;
    const pal=DFLOOR[Math.min(depth,5)];
    // Base tile color with 4-way variation
    const bv=h&3;
    const baseC=bv===0?pal.l:bv===1?pal.d:bv===2?pal.b:pal.b;
    bx(px,py,TW,TH,baseC);
    // FRLG tile grid seams (right + bottom dark line, top+left light)
    bx(px,py,TW,1,'rgba(255,255,255,0.05)');
    bx(px,py,1,TH,'rgba(255,255,255,0.04)');
    bx(px+TW-2,py,2,TH,'rgba(0,0,0,0.20)');
    bx(px,py+TH-2,TW,2,'rgba(0,0,0,0.20)');
    // Crack detail (sparse, pixel art style)
    if((h&15)===0){
      const cx=3+((h>>4)&7)*3,cy=4+((h>>8)&7)*2;
      bx(px+cx,py+cy,5,1,pal.c);bx(px+cx+1,py+cy+1,3,1,pal.c);
    }
    if((h&23)===7){
      const vx=10+((h>>5)&5)*2,vy=6+((h>>9)&5)*2;
      bx(px+vx,py+vy,1,6,pal.c);
    }
    // Small highlight pebble (1-in-32 tiles)
    if((h&31)===5){bx(px+((h>>12)&12)+4,py+((h>>16)&12)+4,3,2,pal.l);bx(px+((h>>12)&12)+5,py+((h>>16)&12)+4,1,1,'rgba(255,255,255,0.25)');}
    // v213: North-wall shadow — darker strip at top of floor tiles directly south of a wall
    {const m_=getMap();const northT=m_[ty-1]?.[tx_];
    if(northT===18){// tile 18 = dungeon wall
      bx(px,py,TW,4,'rgba(0,0,0,0.38)');
      bx(px,py+4,TW,2,'rgba(0,0,0,0.18)');
      bx(px,py+6,TW,1,'rgba(0,0,0,0.07)');
    }}
    return;
  }
  // Overworld: zelda grass tile — unified art style
  const h=tileHash(tx_,ty);
  const zoTile=(h%3===1)?ZO.grassAlt:ZO.grass;
  if(drawZeldaOverTile(zoTile[0],zoTile[1],px,py,2)){
    if((h&3)===0){const fx=Math.floor(thRand(tx_,ty,40)*26)+3,fy=Math.floor(thRand(tx_,ty,41)*26)+3;bx(px+fx,py+fy,2,2,['#e04060','#e0d040','#e080c0','#e08030','#40a0e0'][h%5]);}
    return;
  }
  // Fallback: solid green
  bx(px,py,TW,TH,'#58a858');
  if((h&3)===0){const fx=Math.floor(thRand(tx_,ty,40)*26)+3,fy=Math.floor(thRand(tx_,ty,41)*26)+3;bx(px+fx,py+fy,2,2,['#e04060','#e0d040','#e080c0','#e08030','#40a0e0'][h%5]);}
}

function drawFlower(px,py,tx_,ty){
  drawGrass(px,py,tx_,ty);
  const r=tr(tx_,ty);
  const colors=['#e04040','#e0d040','#4080e0','#e060a0','#e08030'];
  const c1=colors[Math.floor(r.a*5)],c2=colors[Math.floor(r.b*5)];
  // Flower 1: 5-petal pattern
  bx(px+4,py+8,5,5,c1);bx(px+3,py+9,7,3,c1);bx(px+5,py+7,3,7,c1);bx(px+5,py+9,3,3,'#f0e080');
  bx(px+5,py+13,2,4,'#388838');bx(px+4,py+15,1,2,'#306830'); // stem + leaf
  // Flower 2
  bx(px+18,py+14,5,5,c2);bx(px+17,py+15,7,3,c2);bx(px+19,py+13,3,7,c2);bx(px+19,py+16,3,3,'#f0e080');
  bx(px+19,py+20,2,4,'#388838');
  // Flower 3
  if(r.c>.35){const c3=colors[Math.floor(r.d*5)];bx(px+24,py+4,4,4,c3);bx(px+23,py+5,6,2,c3);bx(px+25,py+3,2,6,c3);bx(px+25,py+5,2,2,'#f0e080');bx(px+25,py+8,1,3,'#388838');}
  // Flower 4 (small)
  if(r.e>.5){bx(px+10,py+22,3,3,colors[Math.floor(r.f*5)]);bx(px+11,py+23,1,1,'#f0e080');bx(px+11,py+25,1,2,'#388838');}
}

function drawTallGrass(px,py,tx_,ty){
  drawGrass(px,py,tx_,ty);
  // Waving blades — v375: sin-addition with _NSIN/_NCOS table (0 trig/tile)
  const _ph1=(tx_*2+ty*3)&511;
  const _sgB=_sFr08*_NCOS[_ph1]+_cFr08*_NSIN[_ph1],_cgB=_cFr08*_NCOS[_ph1]-_sFr08*_NSIN[_ph1];
  for(let i=0;i<8;i++){
    const sway=(_sgB*_GRASS_CI7[i]+_cgB*_GRASS_SI7[i])*2;
    const bx_=px+1+i*4+Math.floor(sway),by_=py+2;
    const bladeH=TH-4-Math.floor(thRand(tx_,ty,i+70)*6);
    g.fillStyle=i%3===0?'#306830':i%3===1?'#48a848':'#388838';
    g.fillRect(bx_,by_,3,bladeH);g.fillRect(bx_-1,by_+2,1,bladeH-4);g.fillRect(bx_+3,by_+3,1,bladeH-6);
    // Yellow-green tips
    g.fillStyle='#78c848';g.fillRect(bx_,by_,2,3);g.fillRect(bx_-1,by_,1,2);
    // Deeper green base
    g.fillStyle='#286828';g.fillRect(bx_,by_+bladeH-3,3,3);
  }
}

// @deprecated (phase-b2-town): replaced by drawGBAPath for currentMap===0
function drawPath(px,py,tx_,ty){
  if(currentMap>0){
    const h=tileHash(tx_,ty);
    const depth=currentMap;
    const pal=DCORR[Math.min(depth,5)];
    // Corridor: same stone as floor but recessed — darker center with border frame
    bx(px,py,TW,TH,pal.b);
    bx(px+2,py+2,TW-4,TH-4,pal.d);
    bx(px+4,py+4,TW-8,TH-8,pal.b);
    // Tile seams — FRLG corridor has clear border
    bx(px,py,TW,1,'rgba(0,0,0,0.25)');
    bx(px,py+TH-1,TW,1,'rgba(0,0,0,0.25)');
    bx(px,py,1,TH,'rgba(0,0,0,0.20)');
    bx(px+TW-1,py,1,TH,'rgba(0,0,0,0.20)');
    bx(px,py,TW,1,'rgba(255,255,255,0.04)');
    return;
  }
  // Overworld: zelda path tile
  if(drawZeldaOverTile(ZO.path[0],ZO.path[1],px,py,2)) return;
  // Fallback: solid dirt
  bx(px,py,TW,TH,'#c8a868');
}

function drawSand(px,py,tx_,ty){
  if(drawZeldaOverTile(ZO.sand[0],ZO.sand[1],px,py,2)) return;
  // Fallback: solid sand
  bx(px,py,TW,TH,'#d4b878');
}

// @deprecated (phase-b2-town): replaced by drawGBATree for currentMap===0
function drawTree(px,py,tx_,ty){
  drawGrass(px,py,tx_,ty);
  if(drawZeldaOverTile(ZO.tree[0],ZO.tree[1],px,py,2)){
    g.drawImage(_tileShadowTree,(px+2)|0,(py+25)|0);
    return;
  }
  // Fallback: solid green canopy
  bx(px+4,py+2,24,22,'#2d6e2d');g.drawImage(_tileShadowTree,(px+2)|0,(py+25)|0);
}

function drawPine(px,py,tx_,ty){
  drawGrass(px,py,tx_,ty);
  if(drawZeldaOverTile(ZO.tree[0],ZO.tree[1],px,py,2)){
    g.drawImage(_tileShadowPine,(px+5)|0,(py+26)|0);
    return;
  }
  bx(px+8,py+2,16,26,'#1e5a1e');g.drawImage(_tileShadowPine,(px+5)|0,(py+26)|0);
}

function drawPalm(px,py,tx_,ty){
  if(useKenney.palm){
    drawSand(px,py,tx_,ty);
    if(drawKenneyTileTinted(K.palm1[0], K.palm1[1], px, py, 2, '#306830')){
      return;
    }
  }
  // Fallback
  drawSand(px,py,tx_,ty);
  bx(px+13,py+12,6,18,'#a08050');bx(px+14,py+14,4,14,'#b09060');
  bx(px+12,py+10,5,4,'#a08050');bx(px+13,py+26,6,1,'#906838');
  bx(px+1,py,12,4,'#48a050');bx(px+19,py,12,4,'#48a050');
  bx(px+5,py+2,22,5,'#58b060');bx(px+3,py+4,10,4,'#48a050');bx(px+20,py+4,10,4,'#48a050');
  bx(px+8,py+6,16,3,'#58b060');bx(px+10,py+8,12,2,'#48a050');
  bx(px+14,py+8,2,2,'#805020');bx(px+17,py+9,2,2,'#805020');
}

// @deprecated (phase-b2-town): replaced by drawGBABush for currentMap===0
function drawBush(px,py,tx_,ty){
  drawGrass(px,py,tx_,ty);
  if(drawZeldaOverTile(ZO.bush[0],ZO.bush[1],px,py,2)){
    bx(px+10,py+14,2,2,'#c04040');bx(px+20,py+12,2,2,'#c04040');
    return;
  }
  bx(px+6,py+10,20,16,'#388838');bx(px+10,py+14,2,2,'#c04040');bx(px+20,py+12,2,2,'#c04040');
}

function _parseHex(hex){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return[r,g,b];}
function lighten(hex,amt){const[r,g,b]=_parseHex(hex);return`rgb(${Math.min(255,r+amt*255|0)},${Math.min(255,g+amt*255|0)},${Math.min(255,b+amt*255|0)})`;}
function darken(hex,amt){const[r,g,b]=_parseHex(hex);return`rgb(${Math.max(0,r-amt*255|0)},${Math.max(0,g-amt*255|0)},${Math.max(0,b-amt*255|0)})`;}


function drawBuilding(px,py,tx_,ty,wallColor,roofColor,roofHighlight){
  if(useKenney.building){
    // Draw path base, then building sprite tinted with wall color
    bx(px,py,TW,TH,'#d0c080');
    if(drawKenneyTileTinted(K.building1[0], K.building1[1], px, py, 2, wallColor)){
      // Roof overlay tinted
      drawKenneyTileTinted(K.roofM[0], K.roofM[1], px, py, 2, roofColor);
      // Door overlay
      drawKenneyTileTinted(K.door[0], K.door[1], px, py, 2, '#483838');
      // Window highlights
      bx(px+3,py+16,5,5,'#90d8f0');bx(px+24,py+16,5,5,'#90d8f0');
      bx(px+3,py+16,2,2,'#c8f0ff');bx(px+24,py+16,2,2,'#c8f0ff');
      // Door knob
      bx(px+18,py+24,2,2,'#d8c030');
      return;
    }
  }
  // Fallback: original fillRect building
  bx(px,py+TH-3,TW,3,'#606058');bx(px+1,py+TH-2,TW-2,1,'#505048');
  bx(px,py,TW,TH,'#d0c080');
  bx(px,py+TH-1,TW,1,'rgba(0,0,0,.15)');
  bx(px+2,py+12,28,18,wallColor);bx(px+4,py+14,24,14,lighten(wallColor,.1));
  for(let by=12;by<TH-3;by+=4){
    const off=(Math.floor(by/4)%2)*4;
    for(let bbx=2;bbx<30;bbx+=8){
      bx(px+bbx+off,py+by,7,3,lighten(wallColor,.05));
      bx(px+bbx+off,py+by+3,7,1,darken(wallColor,.08));
    }
    for(let bbx=2;bbx<30;bbx+=8){
      bx(px+bbx+off+7,py+by,1,4,darken(wallColor,.06));
    }
  }
  bx(px,py+2,TW,11,roofColor);bx(px+2,py+4,28,7,roofHighlight||lighten(roofColor,.15));
  bx(px,py+12,TW,2,darken(roofColor,.15));
  for(let rx=0;rx<TW;rx+=4){bx(px+rx,py+3,2,1,darken(roofColor,.1));bx(px+rx+2,py+6,2,1,darken(roofColor,.08));bx(px+rx,py+9,2,1,darken(roofColor,.06));}
  bx(px+10,py+18,12,14,'#483838');bx(px+12,py+20,8,12,'#382828');
  bx(px+18,py+24,2,2,'#d8c030');
  bx(px+10,py+TH-1,12,1,'#a06030');
  bx(px+10,py+18,12,2,'#584848');
  bx(px+2,py+16,7,7,'#90d8f0');bx(px+3,py+16,5,7,'#a8e0f8');
  bx(px+3,py+16,2,2,'#c8f0ff');
  bx(px+23,py+16,7,7,'#90d8f0');bx(px+24,py+16,5,7,'#a8e0f8');
  bx(px+24,py+16,2,2,'#c8f0ff');
  bx(px+2,py+19,7,1,'#686078');bx(px+23,py+19,7,1,'#686078');
  bx(px+5,py+16,1,7,'#686078');bx(px+26,py+16,1,7,'#686078');
  const r=tr(tx_,ty);
  if(r.a>.35){
    bx(px+24,py-2,5,6,'#805040');bx(px+25,py-1,3,4,'#906050');
    bx(px+24,py+4,5,2,'#705040');
    // v215: Chimney smoke — rising puff particles with wind drift
    {const csx=px+26,csy=py-2;
    const windX=(_sFr007*_NCOS[tx_]+_cFr007*_NSIN[tx_])*1.2;
    for(let p=0;p<5;p++){
      const phase=(fr+p*11+tx_*7)%55;
      if(phase>53)continue;
      const prog=phase/53;
      const sx_=csx+windX*prog*14;
      const sy_=csy-prog*38;
      const sz=1+prog*5;
      const sa=0.38*(1-prog)*(0.7+0.3*(_sFr12*_CHIMNEY_CI[p]+_cFr12*_CHIMNEY_SI[p])); // v367
      if(sa<0.02)continue;
      g.globalAlpha=sa;
      bx(sx_-sz*.5|0,sy_-sz*.5|0,sz|0,sz|0,p%2===0?'rgba(210,205,220,1)':'rgba(195,190,208,1)');
    }
    g.globalAlpha=1;}
  }
}

// @deprecated (phase-b2-town): replaced by drawGBAHouse for currentMap===0
function drawBuilding5(px,py,tx_,ty){drawBuilding(px,py,tx_,ty,'#c86050','#983030','#b84040');}
// @deprecated (phase-b2-town): replaced by drawGBAHouse for currentMap===0
function drawBuilding15(px,py,tx_,ty){drawBuilding(px,py,tx_,ty,'#5878b8','#384898','#4868a8');}
// @deprecated (phase-b2-town): replaced by drawGBAHouse for currentMap===0
function drawBuilding16(px,py,tx_,ty){drawBuilding(px,py,tx_,ty,'#50a060','#306840','#408850');}

function drawCave(px,py,tx_,ty){
  if(useKenney.cave){
    bx(px,py,TW,TH,'#787888');
    // Use rock tile tinted dark for cave appearance
    if(drawKenneyTileTinted(K.rock2[0], K.rock2[1], px, py, 2, '#484858')){
      // Dark cave entrance overlay
      bx(px+8,py+12,16,18,'rgba(8,8,16,0.8)');
      bx(px+10,py+14,12,16,'rgba(8,8,16,0.9)');
      if((wt+tx_)%4<2){g.drawImage(_tileCaveGlow,(px+9)|0,(py+13)|0);}
      return;
    }
  }
  // Fallback
  bx(px,py,TW,TH,'#787888');bx(px+2,py+2,TW-4,TH-4,'#686878');
  bx(px+4,py+8,24,22,'#303040');bx(px+6,py+10,20,20,'#202030');bx(px+8,py+12,16,18,'#101020');
  bx(px+10,py+14,12,16,'#080810');
  bx(px+6,py+4,20,6,'#585868');bx(px+8,py+2,16,4,'#686878');bx(px+10,py,12,4,'#787888');
  bx(px+10,py+10,2,4,'#484858');bx(px+18,py+8,2,6,'#484858');bx(px+22,py+11,2,3,'#484858');
  bx(px+4,py+TH-4,8,4,'#585868');bx(px+20,py+TH-4,8,4,'#585868');
  if((wt+tx_)%4<2){g.drawImage(_tileCaveGlow,(px+9)|0,(py+13)|0);}
}

function drawMountain(px,py,tx_,ty){
  // Dungeon walls — FRLG-style solid rock: dark, consistent, pixel-art
  if(currentMap>0){
    const h=tileHash(tx_,ty);
    const depth=currentMap;
    const pal=DWALL[Math.min(depth,5)];
    // Base rock body
    bx(px,py,TW,TH,pal.s);
    bx(px,py,TW,TH-4,pal.b);
    // Upper highlight band (FRLG rock top-face illusion)
    bx(px,py,TW,6,pal.m);
    bx(px,py,TW,2,pal.t);
    // Vertical crack lines — pixel art rock texture
    const crX1=5+((h>>3)&11);
    bx(px+crX1,py+4,1,TH-6,pal.s);
    bx(px+crX1+1,py+4,1,TH-6,pal.m);
    if((h&7)<4){
      const crX2=16+((h>>6)&11);
      bx(px+crX2,py+8,1,TH-12,pal.s);
      bx(px+crX2+1,py+8,1,TH-12,pal.m);
    }
    // Horizontal fracture band
    const frY=7+((h>>8)&13);
    bx(px,py+frY,TW,1,pal.s);
    bx(px,py+frY+1,TW,1,pal.t);
    // Secondary fracture (deeper floors)
    if(depth>=3&&(h&5)===0){
      const frY2=frY+10+((h>>12)&7);
      if(frY2<TH-2){bx(px,py+frY2,TW,1,pal.s);bx(px,py+frY2+1,TW,1,pal.m);}
    }
    // Left/right shadow edges
    bx(px,py,1,TH,'rgba(0,0,0,0.35)');
    bx(px+TW-1,py,1,TH,'rgba(0,0,0,0.25)');
    bx(px+TW-2,py,1,TH,'rgba(0,0,0,0.12)');
    return;
  }
  // Zelda cliff tile
  if(drawZeldaOverTile(ZO.cliff[0],ZO.cliff[1],px,py,2)){
    if(ty<=3){bx(px+6,py,20,5,'#c8c8d0');bx(px+10,py,12,2,'#e0e0e8');}
    return;
  }
  // Fallback: solid gray cliff
  bx(px,py,TW,TH,'#7a7888');
  if(ty<=3){bx(px+6,py,20,5,'#c8c8d0');bx(px+10,py,12,2,'#e0e0e8');}
}

function drawRock(px,py,tx_,ty){
  drawGrass(px,py,tx_,ty);
  if(drawZeldaOverTile(ZO.bush[0],ZO.bush[1],px,py,2)){
    g.drawImage(_tileShadowRock,(px+2)|0,(py+25)|0);
    return;
  }
  // Fallback
  bx(px+6,py+6,20,20,'#808088');g.drawImage(_tileShadowRock,(px+2)|0,(py+25)|0);
}

function drawFence(px,py,tx_,ty){
  if(useKenney.fence){
    drawGrass(px,py,tx_,ty);
    if(drawKenneyTileTinted(K.fenceH[0], K.fenceH[1], px, py, 2, '#a08050')){
      return;
    }
  }
  // Fallback
  drawGrass(px,py,tx_,ty);
  bx(px+2,py+4,4,24,'#a08050');bx(px+26,py+4,4,24,'#a08050');
  bx(px+3,py+5,2,22,'#b09060');bx(px+27,py+5,2,22,'#b09060');
  bx(px,py+10,TW,3,'#b89060');bx(px,py+20,TW,3,'#b89060');
  bx(px,py+10,TW,1,'#c8a070');bx(px,py+20,TW,1,'#c8a070');
  bx(px+2,py+2,4,2,'#c8a070');bx(px+26,py+2,4,2,'#c8a070');
}

function drawDock(px,py,tx_,ty){
  if(useKenney.dock){
    drawWater(px,py,tx_,ty);
    if(drawKenneyTileTinted(K.dock1[0], K.dock1[1], px, py, 2, '#a08050')){
      return;
    }
  }
  // Fallback
  drawWater(px,py,tx_,ty);
  bx(px,py+4,TW,TH-5,'#a08050');
  for(let i=0;i<TW;i+=6)bx(px+i,py+4,1,TH-5,'#806830');
  for(let i=0;i<TW;i+=8){bx(px+i+2,py+10,3,1,'#907840');bx(px+i+3,py+20,2,1,'#907840');}
  bx(px,py+4,TW,2,'#b89060');
  bx(px,py,3,TH,'#806830');bx(px+TW-3,py,3,TH,'#806830');
  if(ty>=22){bx(px+2,py+8,2,2,'#c8c088');bx(px+TW-4,py+8,2,2,'#c8c088');}
}

function drawLake(px,py,tx_,ty){
  const f3=(wt+tx_+ty)%3;
  const h=tileHash(tx_,ty);
  const hk=h&5;
  // v251: use pre-baked color strings instead of template literals
  if(f3===0){
    bx(px,py,TW,TH/2,_LAKE_TOP_F3[hk]);
    bx(px,py+TH/2,TW,TH/2,_LAKE_BOT_F3[hk]);
  }else{
    bx(px,py,TW,TH/2,_LAKE_TOP_NF3[hk]);
    bx(px,py+TH/2,TW,TH/2,_LAKE_BOT_NF3[hk]);
  }
  const r=tr(tx_,ty);
  // v364: Gentle wave lines — use pre-baked _WATER_WAVE1/2 tables (sin computed once per 20 frames)
  _updateWaterWaves(); // no-op if wt unchanged
  // v390: sin-addition eliminates per-tile Math.sin — wt cache+pre-baked tx spatial phases
  _updateWtWaveCache();
  const waveOff=(_wt_sw3*_WAVE_TX_CI[tx_%40]+_wt_cw3*_WAVE_TX_SI[tx_%40])*2;
  for(let i=0;i<11;i++){const wy=8+Math.round(_WATER_WAVE1[i]+waveOff);bx(px+i*3,py+wy,4,1,'rgba(72,136,192,.5)');}
  for(let i=0;i<11;i++){const wy=20+Math.round(_WATER_WAVE2[i]+waveOff*.5);bx(px+i*3+1,py+wy,3,1,'rgba(88,152,208,.4)');}
  // Sparkle
  if((wt+tx_*3+ty*5)%10===0){bx(px+Math.floor(r.g*28)+2,py+Math.floor(r.h*28)+2,2,2,'rgba(255,255,255,.5)');}
  // Lily pad
  if(r.c>.85){
    const lx=px+Math.floor(r.d*20)+6,ly=py+Math.floor(r.e*20)+6;
    g.drawImage(_tileLilyPad,(lx-6)|0,(ly-4)|0);
    bx(lx,ly,2,2,'#e04060'); // flower
  }
  if(isNearGrass(tx_,ty)){g.fillStyle='rgba(30,60,40,.12)';g.fillRect(px,py,TW,TH);}
}

// ── NEW TILE TYPES ──

function drawSignpost(px,py,tx_,ty){
  if(useKenney.signpost){
    drawGrass(px,py,tx_,ty);
    if(drawKenneyTileTinted(K.sign[0], K.sign[1], px, py, 2, '#a08050')){
      return;
    }
  }
  // Fallback
  drawGrass(px,py,tx_,ty);
  bx(px+14,py+10,4,20,'#a08050');bx(px+15,py+12,2,16,'#b09060');
  bx(px+4,py+2,24,10,'#c0a060');bx(px+6,py+4,20,6,'#d0b070');
  bx(px+8,py+4,16,1,'#806030');bx(px+8,py+6,12,1,'#806030');bx(px+8,py+8,14,1,'#806030');
  bx(px+22,py+6,4,1,'#806030');bx(px+25,py+5,1,3,'#806030');
}

function drawFountain(px,py,tx_,ty){
  if(useKenney.fountain){
    drawPath(px,py,tx_,ty);
    if(drawKenneyTileTinted(K.fountain[0], K.fountain[1], px, py, 2, '#708898')){
      // Animated water spray on top
      const f=(wt+tx_)%3;
      if(f===0){bx(px+14,py+2,4,2,'#a0d0f0');bx(px+15,py,2,1,'#c0e0f8');}
      else if(f===1){bx(px+14,py,4,2,'#a0d0f0');bx(px+12,py+2,2,2,'#80b8e0');}
      // Basin water color
      bx(px+6,py+18,20,8,'rgba(72,136,192,0.4)');
      return;
    }
  }
  // Fallback
  drawPath(px,py,tx_,ty);
  bx(px+4,py+16,24,12,'#808898');bx(px+6,py+18,20,8,'#6878a0');
  const f=(wt+tx_)%3;
  bx(px+6,py+18,20,8,f===0?'#4888c0':'#5898d0');
  // v390: sin-addition with pre-baked _BOAT_WX_SI5/CI5 (wx=6,10,14,18,22 → indices 0-4)
  _updateWtWaveCache();
  let _bwi=0;for(let wx=6;wx<26;wx+=4){const wy=20+Math.round((_wt_sw4*_BOAT_WX_CI5[_bwi]+_wt_cw4*_BOAT_WX_SI5[_bwi])*0.5);bx(px+wx,py+wy,3,1,'rgba(255,255,255,.25)');_bwi++;}
  bx(px+12,py+8,8,12,'#909898');bx(px+14,py+6,4,10,'#a0a8a8');
  if((wt)%2===0){
    bx(px+14,py+2,4,2,'#a0d0f0');bx(px+10,py+4,2,2,'#80b8e0');bx(px+20,py+4,2,2,'#80b8e0');
    bx(px+15,py,2,1,'#c0e0f8');
  }else{
    bx(px+14,py,4,2,'#a0d0f0');bx(px+12,py+2,2,2,'#80b8e0');bx(px+18,py+2,2,2,'#80b8e0');
    bx(px+15,py-1,2,1,'#c0e0f8');
  }
  if((wt+tx_)%5===0)bx(px+8+Math.floor(tr(tx_,ty).a*14),py+18,2,1,'rgba(255,255,255,.6)');
}

function drawLighthouse(px,py,tx_,ty){
  drawMountain(px,py,tx_,ty);
  // Tower
  bx(px+8,py-10,16,TH+10,'#e0d8c8');bx(px+10,py-8,12,TH+6,'#f0e8d8');
  // Stripes
  bx(px+8,py+2,16,5,'#c04040');bx(px+8,py+12,16,5,'#c04040');bx(px+8,py+22,16,5,'#c04040');
  // Light room
  bx(px+6,py-14,20,5,'#585868');bx(px+8,py-12,16,2,'#f0e080');
  // Beacon glow
  if((wt)%2===0){
    g.drawImage(_tileLighthouseGlow,(px+3)|0,(py-25)|0);
  }
  // Cap
  bx(px+10,py-16,12,2,'#c04040');bx(px+12,py-18,8,2,'#a03030');
}

function drawRuinsWall(px,py,tx_,ty){
  if(useKenney.ruins){
    bx(px,py,TW,TH,'#686870');
    if(drawKenneyTileTinted(K.wall1[0], K.wall1[1], px, py, 2, '#787078')){
      const r=tr(tx_,ty);
      if(r.e>.5){bx(px+Math.floor(r.f*20)+2,py+TH-6,8,5,'#486848');}
      bx(px,py,TW,TH,'rgba(0,0,20,.15)');
      return;
    }
  }
  // Fallback
  bx(px,py,TW,TH,'#686870');
  const r=tr(tx_,ty);
  for(let by=0;by<TH;by+=8){
    const off=(Math.floor(by/8)%2)*4;
    for(let bxx=0;bxx<TW;bxx+=8){
      bx(px+bxx+off,py+by,7,7,_STONE_SHADE[(bxx+by+tx_)%3]);
      bx(px+bxx+off,py+by+7,7,1,'#585860');
    }
    for(let bxx=0;bxx<TW;bxx+=8){
      bx(px+bxx+off+7,py+by,1,8,'#585860');
    }
  }
  bx(px+Math.floor(r.a*20)+4,py+Math.floor(r.b*20)+4,1,8,'#484850');
  bx(px+Math.floor(r.c*16)+8,py+Math.floor(r.d*16)+2,4,1,'#484850');
  bx(px+Math.floor(r.a*12)+10,py+Math.floor(r.b*12)+8,1,6,'#484850');
  if(r.e>.5){bx(px+Math.floor(r.f*20)+2,py+TH-6,8,5,'#486848');bx(px+Math.floor(r.g*16)+6,py+TH-4,6,2,'#588858');}
  bx(px,py,TW,TH,'rgba(0,0,20,.15)');
}

function drawRuinsPillar(px,py,tx_,ty){
  drawGrass(px,py,tx_,ty);
  bx(px,py,TW,TH,'rgba(0,0,20,.15)');
  // Pillar base
  bx(px+6,py+TH-6,20,6,'#686870');bx(px+8,py+TH-4,16,2,'#787880');
  // Pillar shaft
  bx(px+8,py+2,16,TH-6,'#888890');bx(px+10,py+4,12,TH-10,'#989898');
  // Highlight stripe
  bx(px+10,py+4,2,TH-10,'#a8a8b0');
  // Capital (top)
  bx(px+6,py,20,4,'#989898');bx(px+4,py,2,2,'#787880');bx(px+26,py,2,2,'#787880');
  bx(px+8,py+1,16,1,'#a8a8b0');
  // Fluting (vertical grooves)
  for(let fy=6;fy<TH-8;fy+=4){bx(px+13,py+fy,1,3,'#787880');bx(px+18,py+fy,1,3,'#787880');}
  // Cracks
  bx(px+14,py+10,1,8,'#686870');bx(px+12,py+18,4,1,'#686870');
}

function drawGlowTile(px,py,tx_,ty){
  if(currentMap>0){
    // Dungeon special: gem floor — static base only (animated glow in drawDungeonAnimatedOverlays)
    drawGrass(px,py,tx_,ty);
    if(dungeonSheetLoaded){g.globalAlpha=0.7;drawDungeonTile(DT.floorGem,px,py,2);g.globalAlpha=1;}
    return;
  }
  drawGrass(px,py,tx_,ty);
  bx(px,py,TW,TH,'rgba(0,0,20,.15)');
  // v367: sin-addition with cached _sFr06/_cFr06 (no Math.sin per tile)
  // v399: use _NSIN/_NCOS table (tx_*2+ty*3 ≤ 170 < 512, integer radians — table was designed for this)
  const _slg=_NSIN[tx_*2+ty*3],_clg=_NCOS[tx_*2+ty*3];
  const pulse=(_sFr06*_clg+_cFr06*_slg)*.3+.5;
  const isTeal=(tx_+ty)%2===0;
  // v239: globalAlpha+solid hex replaces template literal rgba string allocations per tile per frame
  g.globalAlpha=pulse*.4;
  g.fillStyle=isTeal?'#50c8dc':'#a050c8';
  g.fillRect(px+2,py+2,TW-4,TH-4);g.fillRect(px+4,py+4,TW-8,TH-8);
  g.globalAlpha=pulse*.6;
  g.fillStyle=isTeal?'#78f0ff':'#c878ff';
  g.fillRect(px+6,py+6,2,TH-12);g.fillRect(px+TW-8,py+6,2,TH-12);
  g.fillRect(px+6,py+6,TW-12,2);g.fillRect(px+6,py+TH-8,TW-12,2);
  g.fillRect(px+14,py+8,4,TH-16);g.fillRect(px+8,py+14,TW-16,4);
  g.drawImage(_glowTileArc[isTeal?0:1],(px+11)|0,(py+11)|0);
  g.globalAlpha=1;
}

function drawLava(px,py,tx_,ty){
  const f=(wt+tx_*2+ty*3)%4;
  const base=f<2?'#c84020':'#d85830';
  bx(px,py,TW,TH,base);
  const r=tr(tx_,ty);
  // Flowing texture — v366: pre-baked 8×8 table (2 trig per 20 frames, 0 per tile/pixel)
  _updateLavaFlow();
  for(let li=0;li<8;li++){const lx=li*4;for(let lj=0;lj<8;lj++){
    const flow=_LAVA_FLOW_V[li*8+lj];const ly=lj*4;
    if(flow>.6)bx(px+lx,py+ly,4,3,'#e87040');
    if(flow>.8)bx(px+lx+1,py+ly+1,2,1,'#f89050');
  }}
  // Bubbles
  if(f===0){g.drawImage(_lavaBubble3,(px+Math.floor(r.a*24)+1)|0,(py+5)|0);}
  if(f===2){g.drawImage(_lavaBubble2,(px+Math.floor(r.c*20)+4)|0,(py+18)|0);}
  // Glow — v367: sin-addition with _sFr04/_cFr04 — v399: _NSIN/_NCOS table (tx_+ty ≤ 68 < 512)
  const _stxy=_NSIN[tx_+ty],_ctxy=_NCOS[tx_+ty];
  g.globalAlpha=.1+(_sFr04*_ctxy+_cFr04*_stxy)*.05;g.fillStyle='#ffa028';g.fillRect(px,py,TW,TH);g.globalAlpha=1;
  // Bright cracks
  bx(px+Math.floor(r.e*24)+2,py+Math.floor(r.f*24)+2,4,1,'#f8c060');
  bx(px+Math.floor(r.g*20)+6,py+Math.floor(r.h*20)+6,1,4,'#f8c060');
}

function drawCrystal(px,py,tx_,ty){
  if(currentMap>0){
    // Dungeon crystal — static body only (sparkle + glow halo in drawDungeonAnimatedOverlays)
    drawGrass(px,py,tx_,ty);
    const depth=currentMap;
    const hue=depth<=2?'#28a8c0':depth===3?'#1880c8':'#1058d0';
    const hueD=depth<=2?'#166878':depth===3?'#104868':'#0c3080';
    const hueL=depth<=2?'#50d0e8':depth===3?'#40b0e0':'#3088e0';
    bx(px+10,py+4,12,22,hue);bx(px+8,py+10,16,12,hue);
    bx(px+12,py+2,8,5,hueL);
    bx(px+4,py+12,6,14,hueD);bx(px+22,py+8,6,16,hueD);
    bx(px+12,py+6,4,10,hueL);bx(px+14,py+4,2,5,'rgba(255,255,255,.4)');
    bx(px+10,py+10,2,8,'rgba(255,255,255,.06)');
    return;
  }
  drawGrass(px,py,tx_,ty);
  bx(px,py,TW,TH,'rgba(0,0,20,.15)');
  const r=tr(tx_,ty);
  const hue=((tx_+ty)%3===0)?'#80c0e0':((tx_+ty)%3===1)?'#a080d0':'#60e0a0';
  bx(px+10,py+4,12,22,hue);bx(px+8,py+10,16,12,hue);
  bx(px+12,py+2,8,4,lighten(hue,.2));
  bx(px+4,py+12,6,14,darken(hue,.1));bx(px+22,py+8,6,16,darken(hue,.1));
  bx(px+12,py+6,4,8,lighten(hue,.25));bx(px+14,py+4,2,4,'rgba(255,255,255,.3)');
  const _ph2=(tx_*5+ty*7)&511,_ph3=(tx_+ty)&511; // v375: phase indices
  const sparkle=(_sFr10*_NCOS[_ph2]+_cFr10*_NSIN[_ph2])>.5; // sin-addition
  if(sparkle){bx(px+16,py+8,2,2,'#fff');bx(px+10,py+14,2,2,'rgba(255,255,255,.7)');}
  const _cgA=.12+(_sFr05*_NCOS[_ph3]+_cFr05*_NSIN[_ph3])*.06; // sin-addition
  g.globalAlpha=_cgA;g.drawImage(_tileCrystalGlows[(tx_+ty)%2],(px+5)|0,(py+5)|0);g.globalAlpha=1;
}

function drawAltar(px,py,tx_,ty){
  if(currentMap>0){
    // Dungeon altar — static stone base only (floating orb + pulse in drawDungeonAnimatedOverlays)
    drawGrass(px,py,tx_,ty);
    bx(px+2,py+20,28,10,'#101620');bx(px+4,py+18,24,10,'#18202c');
    bx(px+6,py+14,20,5,'#1e2830');bx(px+8,py+12,16,4,'#242e3c');
    bx(px+6,py+14,20,1,'#a08028');bx(px+4,py+18,24,1,'#7a6018');
    bx(px+2,py+20,28,1,'#584810');
    bx(px+4,py+19,3,3,'#b89030');bx(px+5,py+19,1,1,'rgba(255,220,100,.3)');
    bx(px+25,py+19,3,3,'#b89030');bx(px+26,py+19,1,1,'rgba(255,220,100,.3)');
    for(let sy=0;sy<10;sy+=2){g.fillStyle='rgba(0,0,0,.07)';g.fillRect(px+2,py+20+sy,28,1);}
    return;
  }
  drawGrass(px,py,tx_,ty);
  bx(px,py,TW,TH,'rgba(0,0,20,.15)');
  bx(px+2,py+20,28,10,'#606068');bx(px+4,py+18,24,10,'#707078');
  bx(px+6,py+14,20,5,'#808088');bx(px+8,py+12,16,4,'#909098');
  // v361: use pre-computed _sFr04/_sFr05 (no Math.sin per tile)
  const pulse=_sFr04*.3+.5;
  // v239: globalAlpha+solid hex — no template literal per tile per frame
  g.fillStyle='#c8a0ff';
  g.globalAlpha=pulse*.5;g.fillRect(px+10,py+12,12,3);
  const orbY=py+4+_sFr05*3;
  g.globalAlpha=pulse*.7;g.drawImage(_tileAltarOrb5,(px+10)|0,(orbY-6)|0);
  g.globalAlpha=pulse*.4;g.drawImage(_tileAltarOrb10,(px+5)|0,(orbY-11)|0);
  g.globalAlpha=pulse*.3;g.fillRect(px+8,py+22,4,2);g.fillRect(px+20,py+22,4,2);
  g.globalAlpha=1;
}

function drawMushroom(px,py,tx_,ty){
  if(useKenney.mushroom){
    drawGrass(px,py,tx_,ty);
    if(drawKenneyTileTinted(K.mushroom1[0], K.mushroom1[1], px, py, 2, '#d84848')){
      return;
    }
  }
  // Fallback
  drawGrass(px,py,tx_,ty);
  const r=tr(tx_,ty);
  bx(px+6,py+18,5,10,'#d8c8a0');bx(px+7,py+20,3,8,'#e0d0b0');
  bx(px+2,py+10,14,9,'#d84040');bx(px+4,py+8,10,9,'#e05050');
  bx(px+3,py+9,4,2,'#ea6060');
  bx(px+6,py+11,2,2,'#f0e0c0');bx(px+12,py+12,2,2,'#f0e0c0');bx(px+8,py+9,2,2,'#f0e0c0');
  if(r.a>.3){
    bx(px+22,py+22,4,8,'#d8c8a0');
    bx(px+18,py+16,12,7,'#c83838');bx(px+20,py+14,8,7,'#d84848');
    bx(px+22,py+16,2,2,'#f0e0c0');bx(px+26,py+18,2,2,'#f0e0c0');
  }
  if(r.b>.5){
    bx(px+14,py+26,2,4,'#d8c8a0');
    bx(px+12,py+23,6,4,'#c06030');bx(px+13,py+22,4,4,'#d07040');
  }
}

function drawCampfire(px,py,tx_,ty){
  if(useKenney.campfire){
    drawGrass(px,py,tx_,ty);
    if(drawKenneyTileTinted(K.campfire[0], K.campfire[1], px, py, 2, '#e87040')){
      // Animated fire glow
      g.drawImage(_tileFireGlow,(px+1)|0,(py+1)|0);
      if(fr%6<2){
        bx(px+10+Math.floor(Math.random()*12),py+2+Math.floor(Math.random()*6),2,2,'#f8c060');
      }
      return;
    }
  }
  // Fallback
  drawGrass(px,py,tx_,ty);
  bx(px+6,py+22,4,4,'#606068');bx(px+22,py+22,4,4,'#606068');
  bx(px+4,py+20,3,3,'#585860');bx(px+25,py+20,3,3,'#585860');
  bx(px+8,py+24,16,4,'#505058');bx(px+10,py+26,12,2,'#606068');
  bx(px+10,py+20,12,4,'#805830');bx(px+8,py+22,16,2,'#704820');
  const f=(wt)%3;
  if(f===0){
    bx(px+12,py+8,8,14,'#e87040');bx(px+14,py+6,4,6,'#f8a040');bx(px+10,py+12,2,6,'#d85830');bx(px+20,py+10,2,8,'#d85830');
  }else if(f===1){
    bx(px+12,py+10,8,12,'#e87040');bx(px+10,py+8,6,6,'#f8a040');bx(px+18,py+10,2,6,'#d85830');
  }else{
    bx(px+12,py+6,8,16,'#e87040');bx(px+14,py+4,4,4,'#f8a040');bx(px+12,py+10,2,8,'#d85830');bx(px+20,py+8,2,6,'#d85830');
  }
  g.drawImage(_tileFireGlow,(px+1)|0,(py+1)|0);
  if(fr%6<2){
    bx(px+10+Math.floor(Math.random()*12),py+2+Math.floor(Math.random()*6),2,2,'#f8c060');
    bx(px+8+Math.floor(Math.random()*16),py+Math.floor(Math.random()*4),1,1,'#f8e080');
  }
}

function drawTreasure(px,py,tx_,ty){
  drawGrass(px,py,tx_,ty);
  if(currentMap===2)bx(px,py,TW,TH,'rgba(0,0,20,.15)');
  const t=treasureByPos.get(currentMap+'-'+tx_+'-'+ty); // v282: O(1) map lookup
  if(t&&t.collected)return;
  if(!fogRevealed[currentMap][ty]?.[tx_])return;
  // v367: sin-addition with _sFr08/_cFr08 — v399: _NSIN/_NCOS table (tx_*3+ty*5 ≤ 262 < 512)
  const _stc=_NSIN[tx_*3+ty*5],_ctc=_NCOS[tx_*3+ty*5];
  const pulse=(_sFr08*_ctc+_cFr08*_stc)*.3+.6;
  const sparkPhase=Math.floor(fr*.15+tx_*2)%4;
  const colors=['#f8e060','#f0c830','#e8a020','#f8f0a0'];
  if(useKenney.treasure && drawKenneyTileTinted(K.chest[0], K.chest[1], px, py, 2, colors[sparkPhase])){
    // Sparkle orbit around chest — v371: sin-addition with _IDX_SI/CI table (tx_ 0-39)
    const _sbt=_sFr03*_IDX_CI[tx_]+_cFr03*_IDX_SI[tx_],_cbt=_cFr03*_IDX_CI[tx_]-_sFr03*_IDX_SI[tx_];
    g.globalAlpha=pulse*.5;g.fillStyle='#f8e060';
    for(let i=0;i<3;i++){
      const dist=10+(_sFr05*_BTL_CRYST_CI[i]+_cFr05*_BTL_CRYST_SI[i])*3;
      const sa=_sbt*_SPARK_CI21[i]+_cbt*_SPARK_SI21[i];
      const ca=_cbt*_SPARK_CI21[i]-_sbt*_SPARK_SI21[i];
      g.fillRect(px+16+ca*dist,py+14+sa*dist,2,2);
    }
    g.globalAlpha=1;
    g.globalAlpha=pulse*.2;g.drawImage(_tileTreasureGlow10,(px+5)|0,(py+5)|0);g.globalAlpha=1;
    return;
  }
  // Fallback sparkle effect — v371: sin-addition with _IDX_SI/CI table
  const _sbt2=_sFr03*_IDX_CI[tx_]+_cFr03*_IDX_SI[tx_],_cbt2=_cFr03*_IDX_CI[tx_]-_sFr03*_IDX_SI[tx_];
  g.globalAlpha=pulse*.6;g.fillStyle='#f8e060';
  for(let i=0;i<5;i++){
    const dist=8+(_sFr05*_BTL_CRYST_CI[i]+_cFr05*_BTL_CRYST_SI[i])*3;
    const sa=_sbt2*_SPARK_CI13[i]+_cbt2*_SPARK_SI13[i];
    const ca=_cbt2*_SPARK_CI13[i]-_sbt2*_SPARK_SI13[i];
    g.fillRect(px+16+ca*dist,py+14+sa*dist,3,3);
  }
  g.globalAlpha=pulse*.3;g.drawImage(_tileTreasureGlow8,(px+7)|0,(py+7)|0);g.globalAlpha=1;
  bx(px+14,py+14,5,4,colors[sparkPhase]);
}

function drawStairsDown(px,py,tx_,ty){
  // Static base — drawn into tile cache (no animation)
  drawGrass(px,py,tx_,ty);
  if(!fogRevealed[currentMap]?.[ty]?.[tx_])return;
  // Stone surround
  bx(px+4,py+4,24,24,'#2a2030');
  bx(px+6,py+6,20,20,'#1a1520');
  // Step edges (perspective from above)
  bx(px+8,py+8,16,3,'#3a3050');bx(px+9,py+11,14,3,'#302840');bx(px+10,py+14,12,3,'#282040');
  bx(px+11,py+17,10,3,'#201830');bx(px+12,py+20,8,3,'#181028');
  // Static label
  const label=currentMap>=5?'GOAL':`B${currentMap+1}F`;
  g.font='bold 6px monospace';g.fillStyle=currentMap>=5?'rgba(255,220,80,.7)':'rgba(200,160,255,.7)';
  g.textAlign='center';g.fillText(label,px+16,py+14);g.textAlign='left';
}

function drawStairsUp(px,py,tx_,ty){
  // Static base — drawn into tile cache (no animation)
  drawGrass(px,py,tx_,ty);
  if(!fogRevealed[currentMap]?.[ty]?.[tx_])return;
  // Stone surround
  bx(px+4,py+4,24,24,'#1c2a2a');
  bx(px+6,py+6,20,20,'#141e20');
  // Step edges going up
  bx(px+12,py+8,8,3,'#283840');bx(px+11,py+11,10,3,'#2a3e48');
  bx(px+10,py+14,12,3,'#2c4450');bx(px+9,py+17,14,3,'#2e4858');
  bx(px+8,py+20,16,3,'#304c5c');
  // Static label
  const upLabel=currentMap<=1?'EXIT':`B${currentMap-1}F`;
  g.font='bold 6px monospace';g.fillStyle='rgba(140,220,255,.7)';
  g.textAlign='center';g.fillText(upLabel,px+16,py+22);g.textAlign='left';
}

// Animated stair glow overlays — drawn every frame OVER the tile cache (not inside it)
// Called from dMap() after tile cache drawImage
function drawDungeonStairGlows(startTX,startTY,endTX,endTY){
  const m=getMap();
  for(let y=startTY;y<=endTY;y++){
    for(let x=startTX;x<=endTX;x++){
      const t=m[y]?.[x];
      if(t!==31&&t!==32)continue;
      if(!fogRevealed[currentMap]?.[y]?.[x])continue;
      const px=x*TW-camX,py=y*TH-camY;
      if(px<-TW||px>W||py<-TH||py>H)continue;
      if(t===31){
        // Down staircase glow — pre-baked ellipses + globalAlpha arrows (no template literals)
        const pulse=(_sFr07*_NCOS[(x*2+y*3)&511]+_cFr07*_NSIN[(x*2+y*3)&511])*.25+.75; // v375
        const isGold=currentMap>=5;
        g.globalAlpha=pulse*(isGold?.5:.45);g.drawImage(isGold?_stairDownGoldA:_stairDownPurpleA,(px+8)|0,(py+19)|0);
        g.globalAlpha=pulse*(isGold?.3:.25);g.drawImage(isGold?_stairDownGoldB:_stairDownPurpleB,(px+4)|0,(py+17)|0);
        g.globalAlpha=pulse*(isGold?.9:.8);
        g.fillStyle=isGold?'#fff050':'#c8a0ff';
        g.beginPath();g.moveTo(px+16,py+26);g.lineTo(px+12,py+20);g.lineTo(px+20,py+20);g.closePath();g.fill();
        g.globalAlpha=1;
      }else{
        // Up staircase glow — pre-baked ellipses + globalAlpha arrows (no template literals)
        const pulse=(_sFr06*_NCOS[(x*3+y*2)&511]+_cFr06*_NSIN[(x*3+y*2)&511])*.2+.8; // v375
        g.globalAlpha=pulse*.4;g.drawImage(_stairUpBlueA,(px+8)|0,(py+3)|0);
        g.globalAlpha=pulse*.2;g.drawImage(_stairUpBlueB,(px+4)|0,(py+1)|0);
        g.globalAlpha=pulse*.8;
        g.fillStyle='#8cdcff';
        g.beginPath();g.moveTo(px+16,py+6);g.lineTo(px+12,py+12);g.lineTo(px+20,py+12);g.closePath();g.fill();
        g.globalAlpha=1;
      }
    }
  }
}

// v233: Pre-baked dungeon animated overlay canvases — eliminates createRadialGradient per frame
// Campfire floor glow: radial at r=58, 3 stops baked at flick=1; globalAlpha=flick at draw time
// Canvas 120×120, center(60,60); draw at (px+TW/2-60, py+TH*0.7-60) = (px-44, py-38)
const _dungCampfireGlow=(()=>{
  const c=document.createElement('canvas');c.width=120;c.height=120;
  const ctx=c.getContext('2d');
  const grd=ctx.createRadialGradient(60,60,4,60,60,58);
  grd.addColorStop(0,'rgba(255,180,60,0.32)');grd.addColorStop(0.4,'rgba(220,120,30,0.18)');grd.addColorStop(1,'rgba(180,60,0,0)');
  ctx.fillStyle=grd;ctx.fillRect(0,0,120,120);return c;
})();
// Lava glow: radial r=40, baked at lavaPulse=1; globalAlpha=lavaPulse at draw time
// Canvas 84×84, center(42,42); draw at (px+TW/2-42, py+TH/2-42) = (px-26, py-26)
const _dungLavaGlow=(()=>{
  const c=document.createElement('canvas');c.width=84;c.height=84;
  const ctx=c.getContext('2d');
  const grd=ctx.createRadialGradient(42,42,0,42,42,40);
  grd.addColorStop(0,'rgba(255,100,20,0.30)');grd.addColorStop(1,'rgba(200,40,0,0)');
  ctx.fillStyle=grd;ctx.fillRect(0,0,84,84);return c;
})();
// Glow tile: arc r=15, draw with globalAlpha=pulse*.22; canvas 32×32, center(16,16)
const _dungGlowTile=(()=>{
  const c=document.createElement('canvas');c.width=32;c.height=32;
  const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(40,200,160,1)';ctx.beginPath();ctx.arc(16,16,15,0,Math.PI*2);ctx.fill();
  return c;
})();
// Crystal arc: r=11, draw with globalAlpha=alpha; canvas 24×24, center(12,12)
const _dungCrystalArc=(()=>{
  const c=document.createElement('canvas');c.width=24;c.height=24;
  const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(30,140,200,1)';ctx.beginPath();ctx.arc(12,12,11,0,Math.PI*2);ctx.fill();
  return c;
})();
// Altar orb glows: r=5 and r=10 (orbY varies; globalAlpha=pulse*factor at draw time)
const _dungAltarOrb5=(()=>{
  const c=document.createElement('canvas');c.width=12;c.height=12;
  const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(200,164,72,1)';ctx.beginPath();ctx.arc(6,6,5,0,Math.PI*2);ctx.fill();
  return c;
})();
const _dungAltarOrb10=(()=>{
  const c=document.createElement('canvas');c.width=22;c.height=22;
  const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(240,200,80,1)';ctx.beginPath();ctx.arc(11,11,10,0,Math.PI*2);ctx.fill();
  return c;
})();

// Animated dungeon decor overlays — glow tile, crystal sparkles, altar orb, campfire light
// Drawn every frame on main canvas (bypass static tile cache)
function drawDungeonAnimatedOverlays(startTX,startTY,endTX,endTY){
  if(!inDungeon)return;
  const m=getMap();
  for(let y=startTY;y<=endTY;y++){
    for(let x=startTX;x<=endTX;x++){
      const t=m[y]?.[x];
      if(t!==24&&t!==26&&t!==27&&t!==29&&t!==25)continue;
      if(!fogRevealed[currentMap]?.[y]?.[x])continue;
      const px=x*TW-camX,py=y*TH-camY;
      if(px<-TW*2||px>W+TW*2||py<-TH*2||py>H+TH*2)continue;
      if(t===29){
        // v211: Campfire — warm light pool (pre-baked glow, globalAlpha=flick)
        // v383: sin-addition via per-axis tables; sin(fr*0.21)=_sFr18*_cFr03+_cFr18*_sFr03
        const _sp1=_CAMP_SX23[x]*_CAMP_CY17[y]+_CAMP_CX23[x]*_CAMP_SY17[y];
        const _cp1=_CAMP_CX23[x]*_CAMP_CY17[y]-_CAMP_SX23[x]*_CAMP_SY17[y];
        const _s021=_sFr18*_cFr03+_cFr18*_sFr03,_c021=_cFr18*_cFr03-_sFr18*_sFr03;
        const _n2=(x+y*3)&511;
        const flick=0.55+(_sFr12*_cp1+_cFr12*_sp1)*0.28+(_s021*_NCOS[_n2]+_c021*_NSIN[_n2])*0.1;
        g.globalAlpha=flick;g.drawImage(_dungCampfireGlow,(px-44)|0,(py-38)|0);g.globalAlpha=1;
        continue;
      }
      if(t===25){
        // v211: Lava — eerie red-orange upward glow (pre-baked)
        // v383: sin-addition via per-axis tables
        const _sp2=_LAVA_SX18[x]*_LAVA_CY21[y]+_LAVA_CX18[x]*_LAVA_SY21[y];
        const _cp2=_LAVA_CX18[x]*_LAVA_CY21[y]-_LAVA_SX18[x]*_LAVA_SY21[y];
        const lavaPulse=0.4+(_sFr06*_cp2+_cFr06*_sp2)*0.18;
        g.globalAlpha=lavaPulse;g.drawImage(_dungLavaGlow,(px-26)|0,(py-26)|0);g.globalAlpha=1;
        continue;
      }
      if(t===24){
        // Glow tile: pulsing teal halo (pre-baked arc)
        const pulse=(_sFr06*_NCOS[(x*2+y*3)&511]+_cFr06*_NSIN[(x*2+y*3)&511])*.35+.55; // v375
        g.globalAlpha=pulse*.22;g.drawImage(_dungGlowTile,(px)|0,(py)|0);g.globalAlpha=1;
      }else if(t===26){
        // Crystal: sparkle glint + glow halo (pre-baked arc)
        const sparkle=(_sFr10*_NCOS[(x*5+y*7)&511]+_cFr10*_NSIN[(x*5+y*7)&511])>.45; // v375
        if(sparkle){bx(px+15,py+8,3,2,'#fff');bx(px+10,py+15,2,2,'rgba(255,255,255,.8)');}
        const cAlpha=.16+(_sFr05*_NCOS[(x+y)&511]+_cFr05*_NSIN[(x+y)&511])*.09; // v375
        g.globalAlpha=cAlpha;g.drawImage(_dungCrystalArc,(px+4)|0,(py+4)|0);g.globalAlpha=1;
      }else if(t===27){
        // Altar: floating brass orb + pulse glow (v367: use cached _sFr04/_sFr05)
        const pulse=_sFr04*.3+.5;
        const orbY=py+4+_sFr05*3;
        g.globalAlpha=pulse*.65;g.drawImage(_dungAltarOrb5,(px+10)|0,(orbY-6)|0);
        g.globalAlpha=pulse*.22;g.drawImage(_dungAltarOrb10,(px+5)|0,(orbY-11)|0);
        g.globalAlpha=1;
        // v239: globalAlpha+solid hex — eliminates 4 template literals per dungeon altar per frame
        g.fillStyle='#c8a448';
        g.globalAlpha=pulse*.42;g.fillRect(px+10,py+12,12,3);
        g.globalAlpha=pulse*.35;g.fillRect(px+8,py+22,4,2);g.fillRect(px+20,py+22,4,2);
        g.globalAlpha=pulse*.25;g.fillRect(px+14,py+24,4,1);
        g.globalAlpha=1;
      }
    }
  }
}

// v215: Town animated overlays — water sparkles + wave glints drawn each frame on main canvas
function drawTownAnimatedOverlays(startTX,startTY,endTX,endTY){
  if(inDungeon)return;
  const m=getMap();
  for(let y=startTY;y<=endTY;y++){
    for(let x=startTX;x<=endTX;x++){
      const t=m[y]?.[x];
      if(t!==0)continue; // only water (tile 0)
      const px=x*TW-camX,py=y*TH-camY;
      if(px<-TW||px>W+TW||py<-TH||py>H+TH)continue;
      // Wave shimmer strips — horizontal glints that sweep across tile
      const wavePhase=((fr*0.018+x*0.6+y*0.4))%(1);
      if(wavePhase<0.18){
        const wp=wavePhase/0.18;
        const wy=py+4+Math.floor(TH*0.3*wp);
        // v390: parabola 4x(1-x) ≈ sin(πx) for x∈[0,1] — eliminates per-glint Math.sin
        g.globalAlpha=(4*wp*(1-wp))*0.22;g.fillStyle='#ffffff';g.fillRect(px+2,wy,TW-4,1);g.globalAlpha=1;
      }
      // Sparkle glints: pseudo-random positions per tile+time
      const sphase=(fr*0.04+x*13+y*7);
      if((sphase|0)%11===0){
        const sx=px+((x*37+y*61+fr)%24)+4;
        const sy=py+((x*19+y*43+fr)%20)+4;
        const sa=0.35+0.25*(_sFr10*_NCOS[(x+y)&511]+_cFr10*_NSIN[(x+y)&511]); // v375
        g.globalAlpha=sa;
        bx(sx,sy,2,1,'#c8e8ff');bx(sx,sy,1,2,'#c8e8ff');
        g.globalAlpha=1;
      }
    }
  }
  // v218: Ambient seabirds — 5 birds drift across the sky in screen space
  // Simple V-shape silhouettes: two 2px diagonal strokes from center
  {
    const BIRD_COUNT=5;
    const visH=H-72; // above HUD
    for(let bi=0;bi<BIRD_COUNT;bi++){
      const seed=bi*1637;
      // Each bird drifts at slightly different speed and altitude
      const speed=0.35+((seed*73)%100)/200;  // 0.35 – 0.85 px/frame
      const bx_=((seed*457+fr*speed)%(W+120))-60; // wraps left to right
      const by_=24+(seed%4)*22+(_sFr03*_BIRD_CI11[bi]+_cFr03*_BIRD_SI11[bi])*5; // v367
      if(bx_<-8||bx_>W+4||by_<0||by_>visH*0.55)continue;
      // Wing flap: alternates between V-open and V-closed
      const flapPhase=Math.floor(fr*0.12+bi*2.3)%2;
      const wingY=flapPhase===0?-2:0; // wings up or neutral
      g.globalAlpha=0.38;
      g.fillStyle='#181828';
      // Left wing: 3 pixels diagonal up-left
      g.fillRect(bx_|0,(by_+wingY)|0,2,1);
      g.fillRect((bx_-2)|0,(by_+wingY-1)|0,2,1);
      // Right wing: 3 pixels diagonal up-right
      g.fillRect((bx_+2)|0,(by_+wingY)|0,2,1);
      g.fillRect((bx_+4)|0,(by_+wingY-1)|0,2,1);
      g.globalAlpha=1;
    }
  }
}

// ═══════════════════════════════════════
// GBA OVERWORLD PRIMITIVES (phase-b2-town)
// All colors via window.TOKENS.resolveColor() — no hex literals.
// drawTile routes to these when currentMap===0 (town).
// ═══════════════════════════════════════
const _RC=k=>window.TOKENS.resolveColor(k);

// 1. Grass — flat base with subtle 16px sub-grid hint
function drawGBAGrass(px,py){
  bx(px,py,TW,TH,_RC('grass_mid'));
  g.globalAlpha=0.15;
  bx(px,py+16,TW,1,_RC('grass_dark'));
  bx(px+16,py,1,TH,_RC('grass_dark'));
  g.globalAlpha=1;
}

// 2. Tree — dark canopy block with shadow/highlight insets and border
function drawGBATree(px,py){
  bx(px,py,TW,TH,_RC('grass_dark'));
  bx(px,py+TH-8,TW,8,'rgba(28,80,40,0.7)');
  bx(px+TW-8,py,8,TH-8,'rgba(28,80,40,0.7)');
  g.globalAlpha=0.45;
  bx(px,py,TW,4,_RC('grass_mid'));
  bx(px,py,4,TH,_RC('grass_mid'));
  g.globalAlpha=1;
  bx(px,py,TW,1,_RC('text_dark'));
  bx(px,py+TH-1,TW,1,_RC('text_dark'));
  bx(px,py,1,TH,_RC('text_dark'));
  bx(px+TW-1,py,1,TH,_RC('text_dark'));
}

// 3. Path — tan dirt with inset shadow border
function drawGBAPath(px,py){
  bx(px,py,TW,TH,_RC('path_tan'));
  bx(px,py,TW,1,_RC('path_shadow'));
  bx(px,py+TH-1,TW,1,_RC('path_shadow'));
  bx(px,py,1,TH,_RC('path_shadow'));
  bx(px+TW-1,py,1,TH,_RC('path_shadow'));
}

// 4. Water — ocean shallow with depth insets
function drawGBAWater(px,py){
  bx(px,py,TW,TH,_RC('ocean_shallow'));
  bx(px,py,TW,8,'rgba(28,56,104,0.5)');
  bx(px,py+TH-4,TW,4,_RC('ocean_deep'));
  bx(px,py,TW,1,_RC('ocean_deep'));
  bx(px,py+TH-1,TW,1,_RC('ocean_deep'));
  bx(px,py,1,TH,_RC('ocean_deep'));
  bx(px+TW-1,py,1,TH,_RC('ocean_deep'));
}

// 5. Sand — flat beach tile
function drawGBASand(px,py){
  bx(px,py,TW,TH,_RC('sand_beach'));
}

// 6. Fence — low compound perimeter wall on grass
function drawGBAFence(px,py){
  drawGBAGrass(px,py);
  bx(px,py+13,TW,6,_RC('path_tan'));
  bx(px,py+13,TW,1,_RC('text_dark'));
  bx(px,py+18,TW,1,_RC('text_dark'));
  for(let fx=0;fx<TW;fx+=6){bx(px+fx,py+13,3,6,_RC('path_shadow'));}
}

// 7. Bush — shrub decoration on grass base
function drawGBABush(px,py){
  drawGBAGrass(px,py);
  const bx_=px+8,by_=py+14;
  bx(bx_,by_,16,10,_RC('grass_dark'));
  bx(bx_,by_,16,1,_RC('text_dark'));
  bx(bx_,by_+9,16,1,_RC('text_dark'));
  bx(bx_,by_,1,10,_RC('text_dark'));
  bx(bx_+15,by_,1,10,_RC('text_dark'));
  g.globalAlpha=0.6;bx(bx_+1,by_+1,5,2,_RC('grass_mid'));g.globalAlpha=1;
}

// 8. Flower — small blossom on grass (variant: ''=pink, 'y'=yellow, 'w'=white)
function drawGBAFlower(px,py,variant){
  drawGBAGrass(px,py);
  const col=variant==='y'?_RC('flower_yellow'):variant==='w'?_RC('flower_white'):_RC('flower_pink');
  bx(px+13,py+20,6,6,col);
  bx(px+13,py+20,6,1,_RC('text_dark'));
  bx(px+13,py+25,6,1,_RC('text_dark'));
}

// 9. House — FRLG-style building for all 7 town types
// type: 'shop'|'gacha'|'stats'|'log'|'dungeon'|'tavern'|'synth'
const _GBA_HOUSE={
  shop:   {roof:'roof_red',    label:'SHOP'},
  gacha:  {roof:'roof_purple', label:'GACHA'},
  stats:  {roof:'menu_blue',   label:'STATS'},
  log:    {roof:'roof_barn',   label:'LOG'},
  dungeon:{roof:'roof_red',    label:'DUNGEON'},
  tavern: {roof:'menu_blue',   label:'TAVERN'},
  synth:  {roof:'roof_forest', label:'SYNTH'},
};
function drawGBAHouse(px,py,type){
  const spec=_GBA_HOUSE[type]||_GBA_HOUSE.shop;
  const roofC=_RC(spec.roof);
  // Roof (py … py+14)
  bx(px,py,TW,14,roofC);
  g.globalAlpha=0.35;bx(px,py,TW,2,_RC('text_light'));g.globalAlpha=1;
  g.globalAlpha=0.4; bx(px,py+11,TW,3,'rgba(0,0,0,1)');g.globalAlpha=1;
  bx(px,py,TW,1,_RC('text_dark'));
  bx(px,py+13,TW,1,_RC('text_dark'));
  bx(px,py,1,14,_RC('text_dark'));
  bx(px+TW-1,py,1,14,_RC('text_dark'));
  // Chimney (top-right, extends above tile)
  bx(px+TW-8,py-4,5,8,_RC('hull_wood'));
  bx(px+TW-8,py-4,5,1,_RC('text_dark'));
  bx(px+TW-4,py-4,1,8,_RC('text_dark'));
  bx(px+TW-8,py-4,1,8,_RC('text_dark'));
  // Body (py+14 … py+32)
  bx(px,py+14,TW,18,_RC('wall_light'));
  bx(px,py+14,1,18,_RC('text_dark'));
  bx(px+TW-1,py+14,1,18,_RC('text_dark'));
  bx(px,py+31,TW,1,_RC('text_dark'));
  bx(px,py+29,TW,3,_RC('wall_shadow'));
  // Windows
  bx(px+3,py+15,7,6,_RC('ocean_shallow'));
  bx(px+3,py+15,2,2,'rgba(255,255,255,0.6)');
  bx(px+3,py+15,7,1,_RC('text_dark'));bx(px+3,py+20,7,1,_RC('text_dark'));
  bx(px+3,py+15,1,6,_RC('text_dark'));bx(px+9,py+15,1,6,_RC('text_dark'));
  bx(px+TW-10,py+15,7,6,_RC('ocean_shallow'));
  bx(px+TW-10,py+15,2,2,'rgba(255,255,255,0.6)');
  bx(px+TW-10,py+15,7,1,_RC('text_dark'));bx(px+TW-10,py+20,7,1,_RC('text_dark'));
  bx(px+TW-10,py+15,1,6,_RC('text_dark'));bx(px+TW-4,py+15,1,6,_RC('text_dark'));
  // Door
  bx(px+13,py+21,6,10,_RC('hull_wood'));
  bx(px+13,py+21,6,1,_RC('text_dark'));
  bx(px+13,py+21,1,10,_RC('text_dark'));bx(px+18,py+21,1,10,_RC('text_dark'));
  bx(px+17,py+25,1,1,_RC('gold_accent'));
}

// 10. Town building type lookup by tile position
function _townHouseType(tx_,ty){
  if(tx_===8 &&ty===5)  return 'shop';
  if(tx_===22&&ty===5)  return 'stats';
  if(tx_===9 &&ty===11) return 'gacha';
  if(tx_===20&&ty===11) return 'log';
  if(tx_===19&&ty===15) return 'tavern';
  if(tx_===22&&ty===15) return 'dungeon';
  if(tx_===9 &&ty===16) return 'synth';
  return 'shop';
}

// 11. Town sign overlay — drawn on main canvas AFTER tile cache pass
// Called from 07-map.js after drawTownAnimatedOverlays
function drawGBATownSigns(){
  if(inDungeon||currentMap!==0)return;
  const signs=[
    {tx:8, ty:5,  type:'shop'},
    {tx:22,ty:5,  type:'stats'},
    {tx:9, ty:11, type:'gacha'},
    {tx:20,ty:11, type:'log'},
    {tx:19,ty:15, type:'tavern'},
    {tx:22,ty:15, type:'dungeon'},
    {tx:9, ty:16, type:'synth'},
  ];
  for(const s of signs){
    const px=s.tx*TW-camX;
    const py=(s.ty+1)*TH-camY; // directly below building tile
    if(px<-TW||px>W||py<-TH||py>H)continue;
    const spec=_GBA_HOUSE[s.type];
    if(!spec)continue;
    const lbl=spec.label;
    const lW=lbl.length*7+6;
    const lX=px+TW/2-lW/2;
    bx(lX-1,py,lW+2,11,_RC('text_dark'));
    bx(lX,py+1,lW,9,_RC('sail_cream'));
    bx(lX,py+1,lW,1,_RC('path_shadow'));
    bx(lX,py+9,lW,1,_RC('path_shadow'));
    txShadow(lbl,lX+3,py+9,6,_RC('fg_on_cream'),'rgba(0,0,0,.4)');
  }
}

// 12. Location banner — persistent GBA-style location label for town
function drawGBALocationBanner(text){
  const bW=text.length*7+10;
  const bX=Math.floor((W-bW)/2);
  const bY=36;
  bx(bX-1,bY-1,bW+2,15,_RC('text_dark'));
  bx(bX,bY,bW,13,_RC('menu_blue'));
  bx(bX,bY,bW,1,_RC('border_primary'));
  bx(bX,bY+12,bW,1,_RC('border_primary'));
  txShadow(text,bX+5,bY+10,7,_RC('text_light'),'rgba(0,0,0,.6)');
}

// ═══════════════════════════════════════
// SPRITE SEAS GBA BATTLE PRIMITIVES (Phase B2-4 — v454+)
// All colors via _RC(key). No hex literals.
// ═══════════════════════════════════════

// Internal: fill a rectangular band with 8px diagonal pixel-art stripes.
// bgCol fills first; stripeCol draws rotated 8px strips inside a clip region.
// angleDeg: 45 or -45.
function _drawGBABandStripes(x,y,w,h,bgCol,stripeCol,angleDeg){
  bx(x,y,w,h,bgCol);
  g.save();
  g.beginPath();g.rect(x,y,w,h);g.clip();
  g.fillStyle=stripeCol;
  const rad=angleDeg*Math.PI/180;
  const diag=Math.ceil(Math.sqrt(w*w+h*h))+32;
  const cx=x+w/2,cy=y+h/2;
  for(let i=-diag;i<diag;i+=16){
    g.save();g.translate(cx+i,cy);g.rotate(rad);
    g.fillRect(-4,-diag,8,diag*2);
    g.restore();
  }
  g.restore();
}

// Internal: draw a pixel-art portrait block (sz×sz) from colour bands.
// bands: [{h: pixels, col: resolvedColor}] — rows from top to bottom.
function _drawGBAPortraitBlock(px,py,sz,bands){
  let cy=py;
  for(const band of bands){bx(px,cy,sz,band.h,band.col);cy+=band.h;}
  // 2px outer border
  bx(px,py,sz,2,_RC('text_dark'));bx(px,py+sz-2,sz,2,_RC('text_dark'));
  bx(px,py,2,sz,_RC('text_dark'));bx(px+sz-2,py,2,sz,_RC('text_dark'));
  // highlight glint (top-left edge)
  bx(px+2,py+2,sz-4,3,'rgba(255,255,255,0.25)');
  // inner shadow (right + bottom)
  bx(px+sz-5,py+2,3,sz-4,'rgba(0,0,0,0.18)');
  bx(px+2,py+sz-5,sz-4,3,'rgba(0,0,0,0.22)');
}

// GBA vs_splash screen — 3-portrait TRI-CLASH layout.
// t: frames since bpFrame. vsRivalIdx: 1=VEGA,2=MIRA (primary).
// tauntLbl: cached taunt string with quotes ('' = hidden). tauntAlpha: 0–1.
function drawGBAVsSplash(t,vsRivalIdx,tauntLbl,tauntAlpha){
  const midY=H>>1;
  const pSz=80;
  const slideAmt=Math.min(1,t/30);

  // ── Diagonal stripe bands ──
  _drawGBABandStripes(0,0,W,midY,_RC('flag_red'),_RC('text_dark'),45);      // top: YOU
  _drawGBABandStripes(0,midY,W>>1,midY,_RC('vega_deep'),_RC('text_dark'),-45); // bot-L: VEGA
  _drawGBABandStripes(W>>1,midY,W>>1,midY,_RC('mira_deep'),_RC('text_dark'),45); // bot-R: MIRA
  // Band dividers
  bx(0,midY,W,2,_RC('text_dark'));
  bx(W>>1,midY,2,midY,_RC('text_dark'));

  // ── YOU portrait — top-left, slides from left ──
  const youPx=Math.round(-pSz+(slideAmt*(36+pSz)));
  const youBandH=[Math.round(pSz*0.20),Math.round(pSz*0.25),Math.round(pSz*0.40)];
  youBandH[3]=pSz-youBandH[0]-youBandH[1]-youBandH[2];
  _drawGBAPortraitBlock(youPx,18,pSz,[
    {h:youBandH[0],col:_RC('flag_red')},
    {h:youBandH[1],col:_RC('sail_cream')},
    {h:youBandH[2],col:_RC('ocean_shallow')},
    {h:youBandH[3],col:_RC('text_dark')},
  ]);

  // ── VEGA portrait — bottom-left, slides from left ──
  const vegaPy=midY+8;
  const vegaPx=Math.round(-pSz+(slideAmt*(16+pSz)));
  const vegaBandH=[Math.round(pSz*0.30),Math.round(pSz*0.45)];
  vegaBandH[2]=pSz-vegaBandH[0]-vegaBandH[1];
  _drawGBAPortraitBlock(vegaPx,vegaPy,pSz,[
    {h:vegaBandH[0],col:_RC('vega_deep')},
    {h:vegaBandH[1],col:_RC('vega_magenta')},
    {h:vegaBandH[2],col:_RC('text_dark')},
  ]);

  // ── MIRA portrait — bottom-right, slides from right ──
  const miraPy=midY+8;
  const miraPxFinal=W-16-pSz;
  const miraPxNow=Math.round(miraPxFinal+(1-slideAmt)*(W+pSz-miraPxFinal));
  const miraBandH=[Math.round(pSz*0.25),Math.round(pSz*0.50)];
  miraBandH[2]=pSz-miraBandH[0]-miraBandH[1];
  _drawGBAPortraitBlock(miraPxNow,miraPy,pSz,[
    {h:miraBandH[0],col:_RC('mira_deep')},
    {h:miraBandH[1],col:_RC('mira_amber')},
    {h:miraBandH[2],col:_RC('text_dark')},
  ]);

  // ── Tags (fade in at t>10) ──
  if(t>10){
    const tagA=Math.min(1,(t-10)/10);
    g.globalAlpha=tagA;
    txShadow('YOU',16,14,14,_RC('menu_border'),'rgba(0,0,0,.6)');
    txShadow(pl[1].n,16,midY+5,14,_RC('vega_pulse'),'rgba(0,0,0,.6)');
    const miraTagX=Math.max((W>>1)+8,W-16-pl[2].n.length*9);
    txShadow(pl[2].n,miraTagX,midY+5,14,_RC('mira_amber'),'rgba(0,0,0,.6)');
    g.globalAlpha=1;
  }

  // ── VS box — center, pop-in ──
  if(t>15){
    const vsA=Math.min(1,(t-15)/8);
    const vsText='VS';
    const vsW=vsText.length*18+24;
    const vsX=Math.floor((W-vsW)/2);
    const vsY=Math.floor(H/2)-18;
    g.globalAlpha=vsA;
    // Outer: text_dark bg
    bx(vsX-4,vsY-4,vsW+8,40,_RC('text_dark'));
    // Inner: thin gold border
    bx(vsX-4,vsY-4,vsW+8,3,_RC('menu_border'));
    bx(vsX-4,vsY+33,vsW+8,3,_RC('menu_border'));
    bx(vsX-4,vsY-4,3,40,_RC('menu_border'));
    bx(vsX+vsW+1,vsY-4,3,40,_RC('menu_border'));
    txShadow(vsText,vsX+4,vsY+26,24,_RC('menu_border'),'rgba(200,40,40,.8)');
    g.globalAlpha=1;
  }

  // ── White flash (t 28–35) ──
  if(t>=28&&t<=35){
    g.globalAlpha=(35-t)/7*0.9;
    bx(0,0,W,H,'rgba(255,255,255,1)');
    g.globalAlpha=1;
  }

  // ── Rival taunt (t 36–58) ──
  if(tauntLbl&&tauntAlpha>0){
    g.globalAlpha=tauntAlpha;
    const tntW=tauntLbl.length*8+20;
    bx(W/2-tntW/2,H/2+24,tntW,22,'rgba(0,0,0,.6)');
    txShadow(tauntLbl,W/2-tntW/2+10,H/2+40,9,_RC('sail_cream'),'rgba(0,0,0,.5)');
    g.globalAlpha=1;
  }
}

// ── GBA battle background — Sprite Seas ocean-arena (v455) ──
function drawGBABattleBG(){
  const hY=_btlHorizonY;
  // Sky zone
  bx(0,0,W,hY,_RC('ocean_deep'));
  // Horizon divider
  bx(0,hY,W,3,_RC('text_dark'));
  // Sea zone
  bx(0,hY+3,W,H-hY-3,_RC('ocean_shallow'));
  // Wave shimmer strips (use pre-cached _sFr04)
  {const wY1=hY+10+Math.round(_sFr04*3);
  g.globalAlpha=0.12;bx(0,wY1,W,2,'rgba(255,255,255,1)');
  g.globalAlpha=0.07;bx(0,wY1+20,W,2,'rgba(255,255,255,1)');g.globalAlpha=1;}
  // Enemy platform (top-right)
  bx(W-280,_btlEnemyPlatY,240,6,_RC('path_tan'));
  bx(W-280,_btlEnemyPlatY+6,240,3,_RC('path_shadow'));
  // Player platform (bottom-left)
  bx(40,_btlPlayerPlatY,200,8,_RC('path_tan'));
  bx(40,_btlPlayerPlatY+8,200,4,_RC('path_shadow'));
  // Atmospheric rival rim tint
  const vsRiv=(encounterExclTarget>=1&&encounterExclTarget<=2)?encounterExclTarget:1;
  g.globalAlpha=0.08+0.03*_sFr04;
  bx(0,0,W,H,vsRiv===1?_RC('vega_deep'):_RC('mira_deep'));
  g.globalAlpha=1;
}

// ── GBA battle HUD — top banner + momentum strip (v455) ──
function drawGBABattleHUD(phase){
  const phaseCol={select:'menu_blue',confirming:'mira_deep',resolving:'flag_red',result:'grass_dark'};
  const col=_RC(phaseCol[phase]||'text_dark');
  const PHASE_LBL={select:'COMMIT PHASE',confirming:'REVEALING...',resolving:'RESOLVING!',result:'COMPLETE'};
  // Banner strip (32px)
  bx(0,0,W,32,col);
  bx(0,0,W,2,_RC('menu_border'));
  bx(0,31,W,1,_RC('text_dark'));
  // Labels
  txShadow(_BATTLE_HDR[rd]||('BATTLE '+rd),6,22,10,_RC('sail_cream'),'rgba(0,0,0,.55)');
  const label=PHASE_LBL[phase]||'';
  txShadow(label,W/2-label.length*5,22,16,_RC('menu_border'),'rgba(0,0,0,.55)');
  txShadow(mapNames[currentMap],W-8-mapNames[currentMap].length*5,22,8,'rgba(255,255,255,.8)','rgba(0,0,0,.4)');
  // Wallet TX / hash lines
  if(walletConnected){
    const _curSig=onchainLastTxSig||'';
    if(_txLblSig!==_curSig){_txLblSig=_curSig;_txLblCache=_curSig?'TX:'+_curSig.slice(0,8)+'..':'TX:--';}
    txShadow(_txLblCache,W-120,42,5,_RC('grass_light'),'rgba(0,0,0,.5)');
  }
  if(walletConnected&&walletLastCommitHash&&(phase==='confirming'||phase==='resolving')){
    if(_hashLblRef!==walletLastCommitHash){_hashLblRef=walletLastCommitHash;_hashLblCache='Hash: '+walletLastCommitHash;}
    txShadow(_hashLblCache,W/2-100,42,5,_RC('ocean_shallow'),'rgba(0,0,0,.5)');
  }
  // Momentum strip (4px at y=32)
  bx(0,32,W,4,_RC('text_dark'));
  if(battleRoundHistory.length>0){
    const norm=Math.max(-1,Math.min(1,_battleRoundNet/Math.max(1,battleRoundHistory.length)));
    if(norm>0){bx(W/2,32,(W/2)*norm,4,_RC('ocean_shallow'));}
    else if(norm<0){bx(W/2+(W/2)*norm,32,-(W/2)*norm,4,_RC('flag_red'));}
    g.globalAlpha=0.35+_sFr12*0.25;bx(W/2-1,32,2,4,_RC('text_light'));g.globalAlpha=1;
  }else{
    g.globalAlpha=0.2;bx(W/2-1,32,2,4,_RC('text_light'));g.globalAlpha=1;
  }
}

// ── GBA HP/info box — idx: 0=player, 1=VEGA, 2=MIRA (v455) ──
// x,y,w,h: bounding box. phase: current battlePhase string.
function drawGBAHpBox(idx,x,y,w,h,phase){
  win(x,y,w,h);
  const p=pl[idx];
  const shk=(bpShakeTarget===idx&&bpShakeTimer>0);
  const bX=x+(shk?Math.round(_sBpST12*3):0);
  const bY=y+(shk?Math.round(_cBpST16*2):0);
  // Top accent bar
  const accentCol=idx===0?_RC('ocean_deep'):idx===1?_RC('vega_deep'):_RC('mira_deep');
  bx(bX+4,bY+4,w-8,20,accentCol);
  // Name
  const nameCol=idx===0?_RC('sail_cream'):idx===1?_RC('vega_pulse'):_RC('mira_pulse');
  txShadow(p.n,bX+10,bY+19,11,nameCol,'rgba(0,0,0,.55)');
  // HP hearts
  const heartStep=idx===0?18:14;
  const hpX=bX+(idx===0?100:90),hpY=bY+7;
  const dmgFlash=bpHPDmgAnim[idx]>0&&Math.floor(fr/3)%2===0;
  const hpFull=_RC('hp_full'),hpFlash=_RC('vega_pulse'),hpEmpty='rgba(64,24,24,1)';
  for(let h2=0;h2<BATTLE_HP_MAX;h2++){
    const filled=h2<bpHP[idx];
    const hc=filled?(dmgFlash?hpFlash:hpFull):hpEmpty;
    const hx2=hpX+h2*heartStep,hy2=hpY;
    if(idx===0){
      bx(hx2+2,hy2,4,1,hc);bx(hx2,hy2+1,8,1,hc);
      bx(hx2,hy2+2,8,3,hc);bx(hx2+1,hy2+5,6,1,hc);
      bx(hx2+2,hy2+6,4,1,hc);bx(hx2+3,hy2+7,2,1,hc);bx(hx2+4,hy2+8,1,1,hc);
      if(filled)bx(hx2+1,hy2+2,2,1,'rgba(255,255,255,.35)');
    }else{
      bx(hx2+1,hy2,3,1,hc);bx(hx2,hy2+1,6,1,hc);
      bx(hx2,hy2+2,6,2,hc);bx(hx2+1,hy2+4,4,1,hc);
      bx(hx2+2,hy2+5,2,1,hc);bx(hx2+3,hy2+6,1,1,hc);
      if(filled)bx(hx2+1,hy2+2,1,1,'rgba(255,255,255,.4)');
    }
  }
  // Card count
  const cc=cardCount(p);
  const ccCol=cc>=4?_RC('flag_red'):cc>=3?_RC('mira_amber'):_RC('text_light');
  txShadow('CDS '+cc,bX+w-50,bY+19,8,ccCol,'rgba(0,0,0,.4)');
  // Near-win warning (rivals)
  if(idx>0&&cc>=4){
    const wA=0.5+(idx===1?_sFr18:(_sFr18*_BTL_COS1+_cFr18*_BTL_SIN1))*0.5;
    g.globalAlpha=wA*0.9;bx(bX+6,bY+24,w-12,10,_RC('flag_red'));g.globalAlpha=1;
    txShadow(cc>=5?'!! FULL !!':'! DANGER',bX+10,bY+31,6,_RC('text_light'),'rgba(0,0,0,.6)');
  }
  // Tell during select phase (rivals)
  if(idx>0&&phase==='select'){
    const tell=bpRivalTells[idx-1];
    if(tell){
      const tA=Math.min(1,(fr-bpFrame)/12)*0.85;
      g.globalAlpha=tA;
      bx(bX+4,bY+28,w-8,13,'rgba(40,100,130,.4)');
      txShadow(tell,bX+8,bY+38,6,_RC('ocean_shallow'),'rgba(0,0,0,.3)');
      g.globalAlpha=1;
    }
  }
  // Spell orbs + progress (player)
  if(idx===0){
    const _GBA_ORBLBL=['STL','BLK','SCT'];
    const _GBA_ORBFILL=[_RC('flag_red'),_RC('ocean_shallow'),_RC('grass_mid')];
    const _GBA_ORBEMP=['rgba(56,12,12,1)','rgba(12,28,64,1)','rgba(12,48,12,1)'];
    const oW=6,oH=6,oG=2;
    for(let si=0;si<3;si++){
      const ox2=bX+10+si*90,oy2=bY+h-25;
      const val=si===0?sp.s:si===1?sp.b:sp.c;
      const warn=(si===0&&sp.s===0)||(si===2&&sp.c===0);
      const lc=warn&&Math.floor(fr/12)%2===0?_RC('flag_red'):_RC('fg_muted');
      txShadow(_GBA_ORBLBL[si],ox2,oy2+10,6,lc,'rgba(0,0,0,.3)');
      for(let o=0;o<3;o++){
        const filled=o<val;
        bx(ox2+26+o*(oW+oG),oy2+2,oW,oH,filled?_GBA_ORBFILL[si]:_GBA_ORBEMP[si]);
        if(filled)bx(ox2+26+o*(oW+oG)+1,oy2+3,2,1,'rgba(255,255,255,.3)');
      }
    }
    // Unique card count (bottom-right of player box)
    const vSz=hasUniqueCards(0).size;
    txShadow(_UNIQ60[vSz]||(vSz+'/60'),bX+w-52,bY+h-10,9,_RC('gold_accent'),'rgba(0,0,0,.3)');
    if(vSz>=60){
      const fl=_sFr15*0.3+0.7;g.globalAlpha=fl;
      txShadow('60/60\u2192WIN!',bX+w-90,bY+h-24,10,_RC('menu_border'),'rgba(0,0,0,.4)');
      g.globalAlpha=1;
    }
    // Area name (bottom-left of player box)
    txShadow(mapNames[currentMap],bX+10,bY+h-10,7,_RC('fg_muted'),'rgba(0,0,0,.3)');
  }
}

// ── GBA pixel-art battle sprite — GBA primitive, no Kenney dependency (v455) ──
function drawGBABattleSprite(p,cx,cy,scale,facingAway){
  const s=scale;
  const _bpI=p===pl[0]?0:p===pl[1]?1:2;
  cy=cy+Math.round((_sFr055*_BREATH_CI[_bpI]+_cFr055*_BREATH_SI[_bpI])*s*0.5);
  const w=14*s,h=20*s,ox=cx-w/2,oy=cy-h/2;
  // Shadow (pre-baked offscreen canvas)
  const _shC=s>=2.5?_btlShadow3:_btlShadow22,_shHW=s>=2.5?24:18,_shHH=s>=2.5?10:8;
  g.drawImage(_shC,(cx-_shHW)|0,(oy+h+2*s-_shHH)|0);
  // Character color scheme
  let shirtC,shirtH,hairC;
  if(p===pl[0]){shirtC=_RC('ocean_deep');shirtH=_RC('menu_blue');hairC=_RC('text_dark');}
  else if(p===pl[1]){shirtC=_RC('vega_deep');shirtH=_RC('vega_magenta');hairC=_RC('mira_deep');}
  else{shirtC=_RC('mira_deep');shirtH=_RC('mira_amber');hairC=_RC('hull_wood');}
  const skinC=_RC('sail_cream'),skinS=_RC('path_tan');
  // Legs
  bx(ox+2*s,oy+17*s,4*s,3*s,_RC('text_dark'));bx(ox+8*s,oy+17*s,4*s,3*s,_RC('text_dark'));
  // Torso + arms
  bx(ox+2*s,oy+8*s,10*s,7*s,shirtC);bx(ox+3*s,oy+9*s,8*s,5*s,shirtH);
  bx(ox-s,oy+9*s,4*s,6*s,shirtC);bx(ox+11*s,oy+9*s,4*s,6*s,shirtC);
  bx(ox-s,oy+14*s,3*s,2*s,skinC);bx(ox+12*s,oy+14*s,3*s,2*s,skinC);
  // Head
  bx(ox+3*s,oy+s,8*s,8*s,skinC);bx(ox+4*s,oy+2*s,6*s,6*s,skinS);
  if(facingAway){
    bx(ox+3*s,oy,8*s,5*s,hairC);bx(ox+2*s,oy+s,2*s,3*s,hairC);bx(ox+10*s,oy+s,2*s,3*s,hairC);
    bx(ox+4*s,oy+10*s,6*s,3*s,shirtH);
  }else{
    bx(ox+4*s,oy+4*s,2*s,2*s,_RC('text_dark'));bx(ox+8*s,oy+4*s,2*s,2*s,_RC('text_dark'));
    bx(ox+4*s,oy+4*s,s,s,'rgba(255,255,255,.7)');bx(ox+8*s,oy+4*s,s,s,'rgba(255,255,255,.7)');
    bx(ox+6*s,oy+7*s,2*s,s,skinS);
    if(p===pl[1]){
      bx(ox+3*s,oy,8*s,3*s,hairC);bx(ox+2*s,oy+s,2*s,7*s,hairC);bx(ox+10*s,oy+s,2*s,7*s,hairC);
      bx(ox+4*s,oy-s,6*s,2*s,hairC);
    }else if(p===pl[2]){
      bx(ox+2*s,oy,10*s,3*s,_RC('gold_accent'));bx(ox+s,oy+2*s,12*s,s,_RC('mira_deep'));
    }else{
      bx(ox+3*s,oy,8*s,3*s,hairC);bx(ox+2*s,oy,2*s,2*s,hairC);bx(ox+10*s,oy,2*s,2*s,hairC);
    }
  }
}

// ── GBA battle arena — sprite layout + tell bubbles (v455) ──
function drawGBABattleArena(){
  let psx=0,psy=0;
  if(bpShakeTarget===0&&bpShakeTimer>0){psx=Math.round(_sBpST12*4);psy=Math.round(_cBpST16*2);}
  drawGBABattleSprite(pl[0],180+psx,H-130+psy,3,true);
  let osx=0,osy=0;
  if(bpShakeTarget===1&&bpShakeTimer>0){osx=Math.round(_sBpST12*4);osy=Math.round(_cBpST16*2);}
  drawGBABattleSprite(pl[1],W-160+osx,110+osy,3,false);
  let o2sx=0,o2sy=0;
  if(bpShakeTarget===2&&bpShakeTimer>0){o2sx=Math.round(_sBpST12*4);o2sy=Math.round(_cBpST16*2);}
  const r2alive=cardCount(pl[2])>0;
  g.globalAlpha=r2alive?0.85:0.3;
  drawGBABattleSprite(pl[2],W-310+o2sx,140+o2sy,2.2,false);
  g.globalAlpha=1;
  if(!r2alive){txShadow('FLED',W-310,175,7,_RC('flag_red'),'rgba(0,0,0,.4)');}
  else{txShadow(pl[2].n,W-330,175,6,_RC('mira_amber'),'rgba(0,0,0,.3)');}
  // Tell speech bubbles
  if(battlePhase==='select'&&bpRivalTells[0]){
    const tp=0.7+0.3*_sFr25;
    const vbX=W-168,vbY=60,vbW=18,vbH=18;
    g.globalAlpha=tp*0.92;
    bx(vbX,vbY,vbW,vbH,_RC('vega_deep'));
    bx(vbX,vbY,vbW,1,_RC('vega_pulse'));bx(vbX,vbY,1,vbH,_RC('vega_pulse'));
    bx(vbX+vbW-1,vbY,1,vbH,_RC('vega_deep'));bx(vbX,vbY+vbH-1,vbW,1,_RC('vega_deep'));
    bx(vbX+2,vbY+vbH,4,3,_RC('vega_deep'));
    txShadow('!',vbX+6,vbY+13,12,_RC('vega_pulse'),'rgba(0,0,0,.5)');
    g.globalAlpha=1;
  }
  if(battlePhase==='select'&&bpRivalTells[1]&&r2alive){
    const tp2=0.7+0.3*(_sFr25*_BTL_COS14+_cFr25*_BTL_SIN14);
    const mbX=W-318,mbY=88,mbW=18,mbH=18;
    g.globalAlpha=tp2*0.85;
    bx(mbX,mbY,mbW,mbH,_RC('mira_deep'));
    bx(mbX,mbY,mbW,1,_RC('mira_amber'));bx(mbX,mbY,1,mbH,_RC('mira_amber'));
    bx(mbX+mbW-1,mbY,1,mbH,_RC('mira_deep'));bx(mbX,mbY+mbH-1,mbW,1,_RC('mira_deep'));
    bx(mbX+12,mbY+mbH,4,3,_RC('mira_deep'));
    txShadow('!',mbX+6,mbY+13,12,_RC('mira_amber'),'rgba(0,0,0,.5)');
    g.globalAlpha=1;
  }
}

// ── GBA action-commit flash — diagonal stripe band + action name (v456) ──
// t0: frames since bpFrame. bpAction_: 0=DRAW,1=STEAL,2=BARRIER,3=SCOUT,4=USE CARD.
function drawGBASealScroll(t0,bpAction_){
  const act=Math.min(bpAction_,4);
  const GBA_ACT_COL=['ocean_deep','flag_red','menu_blue','grass_dark','mira_deep'];
  const GBA_ACT_NAME=['DRAW CARD','STEAL','BARRIER','SCOUT','USE CARD'];
  const col=_RC(GBA_ACT_COL[act]||'text_dark');
  const aName=GBA_ACT_NAME[act]||'ACTION';
  const fadeIn=Math.min(1,t0/5),fadeOut=t0>9?Math.max(0,(16-t0)/7):1;
  const alpha=fadeIn*fadeOut;
  g.globalAlpha=alpha*0.85;
  _drawGBABandStripes(0,H/2-30,W,60,col,_RC('text_dark'),45);
  bx(0,H/2-32,W,2,_RC('menu_border'));
  bx(0,H/2+28,W,2,_RC('menu_border'));
  const sz=Math.floor(12+Math.min(1,t0/7)*24);
  const tW=aName.length*sz*0.6;
  g.globalAlpha=alpha;
  txShadow(aName,W/2-tW/2,H/2+sz*0.4,sz,_RC('menu_border'),'rgba(0,0,0,.9)');
  g.globalAlpha=1;
}

// ── GBA resolve VFX — screen flash overlay at clash collision frame (v457) ──
// Draws a brief GBA-style color pop when actions collide (evT 13-16 of event 0).
// Delegates the main clash panel animation to the existing code in drawResolvingPhase.
// t: frames since bpFrame; called only when currentIdx===0.
function drawGBARevealVFX(evT,pActCol,rActCol){
  if(evT<13||evT>18)return;
  const bt=evT-13;
  const alpha=Math.max(0,1-bt/5)*0.6;
  // Left-side player flash (action color)
  g.globalAlpha=alpha;
  _drawGBABandStripes(0,H/2-24,W>>1,48,pActCol,_RC('text_dark'),-45);
  // Right-side rival flash
  _drawGBABandStripes(W>>1,H/2-24,W>>1,48,rActCol,_RC('text_dark'),45);
  bx(0,H/2-26,W,2,_RC('menu_border'));
  bx(0,H/2+22,W,2,_RC('menu_border'));
  g.globalAlpha=1;
}

function drawTile(tx_,ty){
  const px=tx_*TW-camX,py=ty*TH-camY;
  if(px<-TW||px>W||py<-TH||py>H)return;
  const m=getMap();
  const t=m[ty]?.[tx_];
  // B2-3: GBA overworld primitives for town (currentMap===0)
  if(currentMap===0){
    const flv=['','y','w'][(tx_+ty)%3]; // flower variant by position
    switch(t){
      case 0: drawGBAWater(px,py);return;
      case 1: drawGBAGrass(px,py);return;
      case 2: drawGBAPath(px,py);return;
      case 3: drawGBATree(px,py);return;
      case 4: drawGBASand(px,py);return;
      case 5: drawGBAHouse(px,py,_townHouseType(tx_,ty));return;
      case 7: drawGBAFlower(px,py,flv);return;
      case 9: drawGBAFence(px,py);return;
      case 11:drawGBABush(px,py);return;  // tall grass → bush in town aesthetic
      case 12:drawGBABush(px,py);return;
      case 15:drawGBAHouse(px,py,'stats');return;
      case 16:drawGBAHouse(px,py,_townHouseType(tx_,ty));return;
    }
  }
  switch(t){
    case 0:drawWater(px,py,tx_,ty);break;
    case 1:drawGrass(px,py,tx_,ty);break;
    case 2:drawPath(px,py,tx_,ty);break;
    case 3:drawTree(px,py,tx_,ty);break;
    case 4:drawSand(px,py,tx_,ty);break;
    case 5:drawBuilding5(px,py,tx_,ty);break;
    case 6:drawCave(px,py,tx_,ty);break;
    case 7:drawFlower(px,py,tx_,ty);break;
    case 8:drawRock(px,py,tx_,ty);break;
    case 9:drawFence(px,py,tx_,ty);break;
    case 10:drawDock(px,py,tx_,ty);break;
    case 11:drawTallGrass(px,py,tx_,ty);break;
    case 12:drawBush(px,py,tx_,ty);break;
    case 13:drawPine(px,py,tx_,ty);break;
    case 14:drawPalm(px,py,tx_,ty);break;
    case 15:drawBuilding15(px,py,tx_,ty);break;
    case 16:drawBuilding16(px,py,tx_,ty);break;
    case 17:drawLake(px,py,tx_,ty);break;
    case 18:drawMountain(px,py,tx_,ty);break;
    case 19:drawSignpost(px,py,tx_,ty);break;
    case 20:drawFountain(px,py,tx_,ty);break;
    case 21:drawLighthouse(px,py,tx_,ty);break;
    case 22:drawRuinsWall(px,py,tx_,ty);break;
    case 23:drawRuinsPillar(px,py,tx_,ty);break;
    case 24:drawGlowTile(px,py,tx_,ty);break;
    case 25:drawLava(px,py,tx_,ty);break;
    case 26:drawCrystal(px,py,tx_,ty);break;
    case 27:drawAltar(px,py,tx_,ty);break;
    case 28:drawMushroom(px,py,tx_,ty);break;
    case 29:drawCampfire(px,py,tx_,ty);break;
    case 30:drawTreasure(px,py,tx_,ty);break;
    case 31:drawStairsDown(px,py,tx_,ty);break;
    case 32:drawStairsUp(px,py,tx_,ty);break;
  }
}

// ═══════════════════════════════════════
// SPRITES
// ═══════════════════════════════════════
// v231: Pre-baked sprite shadow / glow ellipses — replaces per-frame path calls
// Player shadow: ellipse(cx,cy+46,12,4) @.22 → 26×10, center(13,5), draw@(px+3,py+41)
const _sprPlayerShadow=(()=>{
  const c=document.createElement('canvas');c.width=26;c.height=10;
  const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(13,5,12,4,0,0,Math.PI*2);ctx.fill();
  return c;
})();
// NPC shadow: ellipse(cx,cy+46,12,5) @.20 → 26×12, center(13,6), draw@(px+3,py+40)
const _sprNpcShadow=(()=>{
  const c=document.createElement('canvas');c.width=26;c.height=12;
  const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(0,0,0,.20)';ctx.beginPath();ctx.ellipse(13,6,12,5,0,0,Math.PI*2);ctx.fill();
  return c;
})();
// Player glows: ellipse(cx,cy+24+bob,18,24) @.18 — baked at alpha=1, draw w/ globalAlpha=0.18
function _mkSprGlow(col){
  const c=document.createElement('canvas');c.width=38;c.height=50;
  const ctx=c.getContext('2d');
  ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(19,25,18,24,0,0,Math.PI*2);ctx.fill();
  return c;
}
const _sprGlowP0=_mkSprGlow('rgba(40,88,200,1)');   // Protagonist blue
const _sprGlowP1=_mkSprGlow('rgba(200,32,40,1)');    // Vega red
const _sprGlowP2=_mkSprGlow('rgba(40,180,160,1)');   // Mira teal
// NPC glows: ellipse(cx,cy+24,16,22) @.14 — baked at alpha=1, draw w/ globalAlpha=0.14
function _mkNpcGlow(col){
  const c=document.createElement('canvas');c.width=34;c.height=46;
  const ctx=c.getContext('2d');
  ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(17,23,16,22,0,0,Math.PI*2);ctx.fill();
  return c;
}
const _npcGlow0=_mkNpcGlow('rgba(120,60,180,1)');
const _npcGlow1=_mkNpcGlow('rgba(60,180,100,1)');
const _npcGlow2=_mkNpcGlow('rgba(180,160,60,1)');
// Character identity palette
// pl[0] Protagonist: navy maritime coat + brass trim, dark hair
// pl[1] Vega rival:  deep crimson coat, auburn hair
// pl[2] Mira rival:  dark jade coat, silver-white hair
function drawSprite(p,isPlayer){
  const px=p.visualX-camX,py=p.visualY-camY-16;
  if(px<-48||px>W+48||py<-56||py>H+56)return;
  const wf=p.walkFrame%4;
  const bob=(wf===1||wf===3)?2:0;
  const d=p.dir;
  const isP0=p===pl[0],isP1=p===pl[1],isP2=p===pl[2];

  // Shadow (pre-baked)
  g.drawImage(_sprPlayerShadow,(px+3)|0,(py+41)|0);

  // Walk animation: frame 0=neutral, 1=left-stride, 2=neutral, 3=right-stride
  const zFrame=[1,0,1,2][wf];
  // Direction: 0=down, 1=left, 2=right, 3=up
  const zDir=[0,1,2,3][d]||0;
  const charIdx=isP0?0:isP1?1:2;

  // === ZELDA-LIKE CHARACTER SPRITES (best quality) ===
  if(zeldaCharLoaded){
    const _gc=isP0?_sprGlowP0:isP1?_sprGlowP1:_sprGlowP2;
    g.globalAlpha=0.18;g.drawImage(_gc,(px-3)|0,(py-1+bob)|0);g.globalAlpha=1;
    // Zelda sprites are 16x16 drawn at 2x = 32x32
    drawZeldaChar(charIdx,zDir,zFrame,px,py+bob,2);
    // CC badge
    if(isPlayer){
      const bx_=px+28,by_=py-10;win(bx_,by_,28,18);txShadow(_CC_STR[p.cc]||(p.cc+''),bx_+9,by_+15,8,'#c8b888','rgba(0,0,0,.4)');
    }else if(isVisibleThroughFog(p.x,p.y,3)){
      bx(px+28,py-8,22,16,'rgba(0,0,0,.4)');win(px+28,py-10,22,16);txShadow(_CC_STR[p.cc]||(p.cc+''),px+34,py+4,7,'#c8b888','rgba(0,0,0,.4)');
    }
    return;
  }

  // === KENNEY SPRITE PATH (fallback) ===
  if(pirateSheetLoaded){
    const kChar=isP0?K.captain:(isP1?K.pirate2:K.pirate3);
    // Glow aura behind sprite (pre-baked)
    const _gk=isP0?_sprGlowP0:isP1?_sprGlowP1:_sprGlowP2;
    g.globalAlpha=0.18;g.drawImage(_gk,(px-3)|0,(py-1+bob)|0);g.globalAlpha=1;
    // Draw sprite: flip horizontally for d===1 (facing left)
    if(d===1){
      g.save();g.translate(px+32,py+bob);g.scale(-1,1);
      drawKenneyTile(kChar[0],kChar[1],0,0,2);
      g.restore();
    }else{
      drawKenneyTile(kChar[0],kChar[1],px,py+bob,2);
      // Facing away: dark overlay for silhouette effect
      if(d===2){bx(px,py+bob,TW,TH,'rgba(0,0,0,.22)');}
    }
    // CC badge
    if(isPlayer){
      const bx_=px+28,by_=py-10;win(bx_,by_,28,18);txShadow(_CC_STR[p.cc]||(p.cc+''),bx_+9,by_+15,8,'#c8b888','rgba(0,0,0,.4)');
    }else if(isVisibleThroughFog(p.x,p.y,3)){
      bx(px+28,py-8,22,16,'rgba(0,0,0,.4)');win(px+28,py-10,22,16);txShadow(_CC_STR[p.cc]||(p.cc+''),px+34,py+4,7,'#c8b888','rgba(0,0,0,.4)');
    }
    return;
  }

  // --- OUTFIT PALETTE ---
  let coatC,coatH,coatD,trimC,pantsC,pantsH,bootC,skinC,hairC,hairH,hairAcc;
  if(isP0){
    coatC='#1c3060';coatH='#2448a0';coatD='#0e1c3c';trimC='#c8a448';
    pantsC='#18283c';pantsH='#223048';bootC='#201820';
    skinC='#e8d4b8';hairC='#1a1820';hairH='#2a2830';hairAcc='#3a3848';
  }else if(isP1){
    coatC='#6c1018';coatH='#a82028';coatD='#400810';trimC='#e0b040';
    pantsC='#2c1820';pantsH='#381e28';bootC='#1a1010';
    skinC='#e8cca8';hairC='#6c3010';hairH='#884020';hairAcc='#a85028';
  }else{
    coatC='#183038';coatH='#285060';coatD='#0c1c24';trimC='#28c8a8';
    pantsC='#141e28';pantsH='#1c2a38';bootC='#0c1418';
    skinC='#dcc8b0';hairC='#c8c8d0';hairH='#d8d8e0';hairAcc='#a8a8b8';
  }

  // === BOOTS / FEET ===
  if(wf===1){
    bx(px+4,py+42+bob,9,5,bootC);bx(px+5,py+42+bob,7,3,trimC==='#c8a448'?'#2a2020':'#1a1212');
    bx(px+19,py+40+bob,9,5,bootC);bx(px+20,py+40+bob,7,3,trimC==='#c8a448'?'#2a2020':'#1a1212');
  }else if(wf===3){
    bx(px+8,py+40+bob,9,5,bootC);bx(px+9,py+40+bob,7,3,trimC==='#c8a448'?'#2a2020':'#1a1212');
    bx(px+17,py+42+bob,9,5,bootC);bx(px+18,py+42+bob,7,3,trimC==='#c8a448'?'#2a2020':'#1a1212');
  }else{
    bx(px+5,py+42+bob,9,5,bootC);bx(px+6,py+42+bob,7,3,trimC==='#c8a448'?'#2a2020':'#1a1212');
    bx(px+18,py+42+bob,9,5,bootC);bx(px+19,py+42+bob,7,3,trimC==='#c8a448'?'#2a2020':'#1a1212');
  }
  // Boot cuff trim line
  bx(px+5,py+42+bob,18,1,trimC==='#c8a448'?'#382820':'rgba(255,255,255,.08)');

  // === PANTS / LEGS ===
  bx(px+6,py+34+bob,10,10,pantsC);bx(px+16,py+34+bob,10,10,pantsC);
  if(wf===1){bx(px+6,py+34+bob,10,8,pantsH);bx(px+16,py+36+bob,10,8,pantsH);}
  else if(wf===3){bx(px+6,py+36+bob,10,8,pantsH);bx(px+16,py+34+bob,10,8,pantsH);}
  // Pants crease stripe
  bx(px+10,py+34+bob,2,10,'rgba(255,255,255,.05)');bx(px+20,py+34+bob,2,10,'rgba(255,255,255,.05)');

  // === BELT ===
  bx(px+4,py+33+bob,24,3,coatD);
  bx(px+14,py+32+bob,4,4,trimC);  // belt buckle
  bx(px+15,py+33+bob,2,2,'rgba(255,255,255,.3)'); // buckle glint

  // === COAT / BODY ===
  bx(px+4,py+14+bob,24,20,coatC);bx(px+6,py+16+bob,20,16,coatH);
  // Coat darker sides
  bx(px+4,py+14+bob,3,20,coatD);bx(px+25,py+14+bob,3,20,coatD);
  // Front closure (center seam)
  bx(px+15,py+14+bob,2,20,'rgba(0,0,0,.2)');
  // Collar (raised) — skin showing at throat
  bx(px+10,py+14+bob,12,4,coatC);
  bx(px+13,py+14+bob,6,3,skinC);
  // Collar fold lines
  bx(px+10,py+14+bob,4,1,coatD);bx(px+18,py+14+bob,4,1,coatD);
  // Trim accent on coat hem
  bx(px+4,py+32+bob,24,1,trimC==='#c8a448'?'rgba(200,164,72,.4)':trimC==='#e0b040'?'rgba(220,176,60,.35)':'rgba(40,200,168,.35)');
  // Lapel triangle (P0 only: officer look)
  if(isP0){bx(px+10,py+16+bob,6,8,coatD);bx(px+16,py+16+bob,6,8,coatD);}
  // P1: double-breasted stud row
  if(isP1){
    bx(px+12,py+17+bob,2,2,trimC);bx(px+12,py+22+bob,2,2,trimC);bx(px+12,py+27+bob,2,2,trimC);
    bx(px+18,py+17+bob,2,2,trimC);bx(px+18,py+22+bob,2,2,trimC);bx(px+18,py+27+bob,2,2,trimC);
  }
  // P2: trim piping along coat edge
  if(isP2){
    bx(px+4,py+14+bob,1,20,trimC);bx(px+27,py+14+bob,1,20,trimC);
  }
  // Shoulder pads (top of coat)
  bx(px+4,py+14+bob,7,4,isP0?'#1a3872':isP1?'#7c1820':coatC);
  bx(px+21,py+14+bob,7,4,isP0?'#1a3872':isP1?'#7c1820':coatC);

  // === ARMS ===
  if(d===1){
    bx(px-4,py+18+bob,8,14,coatC);bx(px-4,py+18+bob,3,14,coatD);
    bx(px+28,py+18+bob,4,14,coatC);
  }else if(d===3){
    bx(px+28,py+18+bob,8,14,coatC);bx(px+33,py+18+bob,3,14,coatD);
    bx(px,py+18+bob,4,14,coatC);
  }else{
    bx(px-2,py+18+bob,8,14,coatC);bx(px-2,py+18+bob,3,14,coatD);
    bx(px+26,py+18+bob,8,14,coatC);bx(px+31,py+18+bob,3,14,coatD);
  }
  // Cuff trim
  if(d===1){bx(px-4,py+30+bob,8,2,trimC==='#c8a448'?'rgba(200,164,72,.5)':trimC==='#e0b040'?'rgba(224,176,64,.4)':'rgba(40,200,168,.4)');}
  else if(d===3){bx(px+28,py+30+bob,8,2,trimC==='#c8a448'?'rgba(200,164,72,.5)':trimC==='#e0b040'?'rgba(224,176,64,.4)':'rgba(40,200,168,.4)');}
  else{bx(px-2,py+30+bob,8,2,'rgba(200,160,60,.3)');bx(px+26,py+30+bob,8,2,'rgba(200,160,60,.3)');}

  // === HANDS ===
  const handC=skinC;
  if(d===1){bx(px-4,py+30+bob,6,5,handC);bx(px+28,py+30+bob,5,5,handC);}
  else if(d===3){bx(px+31,py+30+bob,6,5,handC);bx(px,py+30+bob,5,5,handC);}
  else{bx(px-2,py+30+bob,6,5,handC);bx(px+28,py+30+bob,6,5,handC);}

  // === HEAD ===
  bx(px+7,py+2+bob,18,16,skinC);bx(px+9,py+4+bob,14,12,'rgba(0,0,0,.04)');
  // Jaw shadow
  bx(px+7,py+14+bob,18,4,'rgba(0,0,0,.08)');
  // Ear dots
  bx(px+6,py+7+bob,2,4,skinC);bx(px+24,py+7+bob,2,4,skinC);

  if(d===2){
    // Facing away
    bx(px+6,py-2+bob,20,14,hairC);bx(px+8,py+bob,16,14,hairC);bx(px+10,py+2+bob,12,10,hairH);
    if(isP0){bx(px+6,py+bob,4,10,hairAcc);bx(px+22,py+bob,4,10,hairAcc);}// side tufts
    if(isP1){bx(px+6,py+6+bob,4,8,hairAcc);}// long side lock
  }else if(d===0){
    // Facing forward
    bx(px+9,py+7+bob,4,5,'#181820');bx(px+19,py+7+bob,4,5,'#181820');// eyes
    bx(px+9,py+7+bob,2,2,'#fff');bx(px+19,py+7+bob,2,2,'#fff');// glint
    // Iris detail
    if(isP0){bx(px+10,py+9+bob,2,2,'#2858a8');}
    else if(isP1){bx(px+10,py+9+bob,2,2,'#a02020');}
    else{bx(px+10,py+9+bob,2,2,'#20a088');}
    // Eyebrows
    bx(px+9,py+6+bob,4,1,hairC);bx(px+19,py+6+bob,4,1,hairC);
    // Nose dot
    bx(px+15,py+12+bob,2,1,'rgba(0,0,0,.12)');
    // Mouth
    bx(px+13,py+15+bob,5,2,'rgba(0,0,0,.15)');
    // Hair (front)
    if(isP0){
      bx(px+6,py-2+bob,20,6,hairC);bx(px+4,py+bob,4,5,hairC);bx(px+24,py+bob,4,5,hairC);
      bx(px+8,py-4+bob,6,2,hairC);bx(px+18,py-4+bob,6,2,hairC);bx(px+12,py-6+bob,4,3,hairC);
      bx(px+10,py-2+bob,5,3,hairH);// highlight streak
    }else if(isP1){
      bx(px+6,py-2+bob,20,6,hairC);bx(px+4,py+2+bob,4,16,hairC);bx(px+24,py+2+bob,4,16,hairC);
      bx(px+8,py-4+bob,16,5,hairC);bx(px+6,py+bob,4,3,hairH);bx(px+16,py-2+bob,6,3,hairH);
    }else{
      // Mira: silvery pulled-back hair with side strand
      bx(px+6,py-2+bob,20,6,hairC);bx(px+4,py+bob,4,10,hairC);
      bx(px+8,py-4+bob,16,5,hairC);bx(px+10,py-2+bob,8,3,hairH);
      bx(px+24,py+bob,3,8,hairAcc);// silver strand right
    }
  }else{
    // Side view
    const flip=d===3;
    const eyeX=flip?px+17:px+9;
    bx(eyeX,py+7+bob,4,5,'#181820');bx(eyeX,py+7+bob,2,2,'#fff');
    // Iris
    if(isP0){bx(eyeX+1,py+9+bob,2,2,'#2858a8');}
    else if(isP1){bx(eyeX+1,py+9+bob,2,2,'#a02020');}
    else{bx(eyeX+1,py+9+bob,2,2,'#20a088');}
    bx(eyeX,py+6+bob,4,1,hairC);// eyebrow
    bx(flip?px+14:px+12,py+15+bob,5,2,'rgba(0,0,0,.12)');// mouth
    // Hair (side)
    if(isP0){
      bx(px+6,py-2+bob,20,6,hairC);bx(flip?px+22:px+4,py+bob,6,10,hairC);
      bx(flip?px+24:px+2,py-2+bob,4,5,hairC);bx(px+10,py-2+bob,6,3,hairH);
    }else if(isP1){
      bx(px+6,py-2+bob,20,6,hairC);bx(flip?px+24:px+4,py+2+bob,4,16,hairC);
      bx(px+8,py-4+bob,16,5,hairC);bx(flip?px+20:px+8,py-2+bob,6,3,hairH);
    }else{
      bx(px+6,py-2+bob,20,6,hairC);bx(flip?px+22:px+4,py+bob,5,10,hairC);
      bx(px+8,py-4+bob,16,5,hairC);bx(px+10,py-2+bob,8,3,hairH);
    }
  }

  // === CC COUNTER BADGE ===
  if(isPlayer){
    const bx_=px+28,by_=py-10;win(bx_,by_,28,18);txShadow(_CC_STR[p.cc]||(p.cc+''),bx_+9,by_+15,8,'#c8b888','rgba(0,0,0,.4)');
  }else if(isVisibleThroughFog(p.x,p.y,3)){
    bx(px+28,py-8,22,16,'rgba(0,0,0,.4)');win(px+28,py-10,22,16);txShadow(_CC_STR[p.cc]||(p.cc+''),px+34,py+4,7,'#c8b888','rgba(0,0,0,.4)');
  }
}

// ── NPC SPRITES ──
function drawNPCSprite(npc){
  // Use smooth visual position if available, else tile position
  const vx=(npc.visualX!==undefined)?npc.visualX:npc.x*TW;
  const vy=(npc.visualY!==undefined)?npc.visualY:npc.y*TH;
  // Walk bob: slight vertical bounce while walking
  // v394: table lookup (walkFrame steps by 0.25 → exact multiples of 1/4, 8 unique values)
  const walkBob=(npc.walking&&npc.walkFrame!==undefined)?_WALK_BOB8[(npc.walkFrame*4|0)%8]:0;
  const px=vx-camX,py=vy-camY-16+walkBob;
  if(px<-48||px>W+48||py<-56||py>H+56)return;
  const d=npc.dir;

  g.drawImage(_sprNpcShadow,(px+3)|0,(py+40)|0);

  // === ZELDA-LIKE NPC SPRITES (best quality) ===
  const npcZFrame=[1,0,1,2][(npc.walkFrame|0)%4]||1;
  const npcZDir=[0,1,2,3][d]||0;
  const npcCharIdx=npc.type===0?3:npc.type===1?4:3; // NPC chars at indices 3,4
  const _ng=npc.type===0?_npcGlow0:npc.type===1?_npcGlow1:_npcGlow2;
  if(zeldaCharLoaded){
    g.globalAlpha=0.14;g.drawImage(_ng,(px-1)|0,(py+1)|0);g.globalAlpha=1;
    drawZeldaChar(npcCharIdx,npcZDir,npcZFrame,px,py,2);
  } else if(pirateSheetLoaded){
  // === KENNEY NPC SPRITE PATH (fallback) ===
    // NPC type 0→pirate1, type 1→skeleton, type 2→pirate3
    const kNpc=npc.type===0?K.pirate1:(npc.type===1?K.skeleton:K.pirate3);
    g.globalAlpha=0.14;g.drawImage(_ng,(px-1)|0,(py+1)|0);g.globalAlpha=1;
    if(d===1){
      g.save();g.translate(px+32,py);g.scale(-1,1);
      drawKenneyTile(kNpc[0],kNpc[1],0,0,2);
      g.restore();
    }else{
      drawKenneyTile(kNpc[0],kNpc[1],px,py,2);
      if(d===2){bx(px,py,TW,TH,'rgba(0,0,0,.2)');}
    }
  } else {
  // Fallback fillRect NPC
  let shirtC,shirtH,hairC,pantsC;
  if(npc.type===0){shirtC='#8050a0';shirtH='#9060b0';hairC='#404048';pantsC='#384060';}
  else if(npc.type===1){shirtC='#407048';shirtH='#508058';hairC='#604830';pantsC='#304838';}
  else{shirtC='#b0a898';shirtH='#c0b8a8';hairC='#c0b8b0';pantsC='#585058';}
  bx(px+6,py+42,8,4,'#483020');bx(px+18,py+42,8,4,'#483020');
  bx(px+6,py+34,10,10,pantsC);bx(px+16,py+34,10,10,pantsC);
  bx(px+4,py+18,24,18,shirtC);bx(px+6,py+20,20,14,shirtH);
  bx(px+10,py+18,12,2,'#f0dcc0');
  bx(px-2,py+20,8,12,shirtC);bx(px+26,py+20,8,12,shirtC);
  bx(px-2,py+30,6,4,'#e8d0b0');bx(px+28,py+30,6,4,'#e8d0b0');
  bx(px+6,py+2,20,16,'#f0dcc0');bx(px+8,py+4,16,12,'#e8d0b0');
  if(d===0||d===2){
    if(d===0){
      bx(px+10,py+8,4,4,'#181820');bx(px+18,py+8,4,4,'#181820');
      bx(px+10,py+8,2,2,'#fff');bx(px+18,py+8,2,2,'#fff');
      bx(px+14,py+14,4,2,'#c0a090');
    }
    bx(px+6,py,20,6,hairC);bx(px+8,py-2,16,4,hairC);
  }else{
    const flip=d===3;const eyeX=flip?px+18:px+8;
    bx(eyeX,py+8,4,4,'#181820');bx(eyeX,py+8,2,2,'#fff');
    bx(px+6,py,20,6,hairC);
  }
  } // end fallback

  // v193: Diamond indicator — enhanced proximity version shows [Z] prompt when adjacent
  if(npc.map===currentMap){
    const bobY=_sFr08*3; // v367: use cached _sFr08
    let diaC,diaH;
    if(npc.type===0){diaC='#4080d0';diaH='#60a0e8';}
    else if(npc.type===1){diaC='#40b060';diaH='#60d080';}
    else{diaC='#d0b040';diaH='#e8d060';}

    const pdx=Math.abs((pl[0].visualX/TW|0)-npc.x),pdy=Math.abs((pl[0].visualY/TH|0)-npc.y);
    const nearInteract=pdx+pdy<=2&&!npcDialogActive&&!shopActive&&!gachaActive&&!marketActive&&sc==='map';
    if(nearInteract){
      // Larger, faster-pulsing diamond + [Z] prompt
      const pulse=0.7+0.3*_sFr18; // v369: cached
      const dx_=px+13,dy_=py-32+bobY*1.6;
      bx(dx_+3,dy_,2,2,diaH);
      bx(dx_,dy_+3,8,2,diaC);bx(dx_+2,dy_+3,4,2,diaH);
      bx(dx_,dy_+5,8,2,diaC);bx(dx_+2,dy_+5,4,2,diaH);
      bx(dx_+3,dy_+8,2,2,diaC);
      g.globalAlpha=pulse;
      txShadow('[Z]',dx_-1,dy_+22,7,diaH,'rgba(0,0,0,.5)');
      g.globalAlpha=1;
    }else{
      const dx_=px+14,dy_=py-28+bobY;
      bx(dx_+2,dy_,2,2,diaC);
      bx(dx_,dy_+2,6,2,diaC);bx(dx_+2,dy_+2,2,2,diaH);
      bx(dx_,dy_+4,6,2,diaC);
      bx(dx_+2,dy_+6,2,2,diaC);bx(dx_+2,dy_+4,2,2,diaH);
    }
  }
  // v82: ambient speech bubble (proximity hint)
  if(npc.bubbleTimer>0&&npc.bubbleText){
    const bfAlpha=npc.bubbleTimer<25?npc.bubbleTimer/25:Math.min(1,(170-npc.bubbleTimer+25)/12);
    g.globalAlpha=Math.max(0,Math.min(1,bfAlpha));
    const bW=Math.min(npc.bubbleText.length*5+16,150);
    const bX=px+16-bW/2,bY=py-62;
    bx(bX,bY,bW,16,'rgba(8,8,18,.92)');
    bx(bX,bY,bW,1,'rgba(200,180,100,.55)');
    bx(bX,bY+15,bW,1,'rgba(200,180,100,.25)');
    bx(bX+bW/2-2,bY+16,4,3,'rgba(8,8,18,.92)');
    txShadow(npc.bubbleText,bX+5,bY+13,5,'#e8e0c0','rgba(0,0,0,.3)');
    g.globalAlpha=1;
  }
}

// ── BIRD SPRITES ──
function drawBirds(){
  if(currentMap!==1)return;
  for(let _bi=0,_bl=birds.length;_bi<_bl;_bi++){
    const b=birds[_bi];
    const px=b.x*TW-camX+10,py=b.y*TH-camY+6;
    if(px<-20||px>W+20||py<-20||py>H+20)continue;
    bx(px,py+4,8,6,'#604830');
    bx(px+2,py+2,4,2,'#806040');
    bx(px+8,py+4,2,2,'#d8a030');
    if((fr+Math.floor(b.x*3))%8<4){
      bx(px-2,py,6,2,'#705838');bx(px+6,py,6,2,'#705838');
    }else{
      bx(px-2,py+2,2,2,'#705838');bx(px+8,py+2,2,2,'#705838');
    }
  }
}

// ═══════════════════════════════════════
// CAMERA
// ═══════════════════════════════════════
function updateCamera(){
  // Always reveal fog around player position
  fogRevealRadius(currentMap,pl[0].x,pl[0].y,2);
  const px=pl[0].visualX+TW/2,py=pl[0].visualY+TH/2;
  camTargetX=px-W/2;camTargetY=py-(H-HUD_HEIGHT)/2;
  const maxX=MW*TW-W,maxY=MH*TH-H;
  camTargetX=Math.max(0,Math.min(maxX,camTargetX));
  camTargetY=Math.max(0,Math.min(maxY,camTargetY));
  const lerpT=1-Math.pow(1-0.12,dt);
  camX=Math.round(lerp(camX,camTargetX,lerpT));
  camY=Math.round(lerp(camY,camTargetY,lerpT));
}

// ═══════════════════════════════════════
// CARD MINI ART
// ═══════════════════════════════════════
// v103: Card type indicator colors for HUD mini-cards
const CARD_TYPE_COL={attack:'#c83838',defense:'#3888c8',flee:'#30b870',magic:'#a840c0',recovery:'#c8a830'};
function drawMiniCard(x,y,cd){
  if(cd>0){
    const cr=CD[cd-1];
    // Dark ARK card body
    bx(x,y,28,20,'#060e18');bx(x+1,y+1,26,18,cr.d);
    bx(x+2,y+2,24,12,cr.d);bx(x+3,y+3,22,10,'rgba(0,0,0,.35)');
    // Character art area (darker)
    bx(x+2,y+2,24,12,'rgba(0,0,0,.2)');
    // Tiny character sprite
    drawCardCharacter(x+6,y+1,cd,0.5,fr);
    // Name band
    bx(x+1,y+14,26,5,cr.d);txShadow(cr.n[0],x+8,y+19,7,'#e8e0d0','rgba(0,0,0,.6)');
    // Type color top strip
    const typeCol=CARD_TYPE_COL[cr.t]||'#808080';
    bx(x+1,y,26,2,typeCol);
    // Corner glint
    bx(x+1,y+1,3,1,'rgba(255,255,255,.2)');bx(x+1,y+1,1,3,'rgba(255,255,255,.15)');
  }else{
    // Empty slot — dark ARK panel
    bx(x,y,28,20,'#080e18');bx(x+1,y+1,26,18,'#0c1420');
    bx(x,y,28,1,'rgba(200,164,72,.15)');bx(x,y,1,20,'rgba(200,164,72,.1)');
    txShadow('\u2014',x+10,y+15,8,'#2a3848','rgba(0,0,0,.3)');
  }
}

// ═══════════════════════════════════════
// SPRITE SEAS GBA PRIMITIVES (Phase B2 — v452+)
// Token-resolved dialog + menu helpers. No hex literals — all colors
// flow through window.TOKENS.resolveColor(). Integer coords only.
// Authored from design/preview/01_title.html + design/UI_SPEC.md.
// ═══════════════════════════════════════

// Draw a GBA-style dialog frame: 2px outer border + 2px inner inset rim,
// filled interior. Matches preview .menu / .dialog-bottom / .action-menu.
//   fillToken   — semantic/locked palette key for interior (default menu_blue)
//   borderToken — outer border key (default text_dark)
//   insetToken  — inner accent rim key; pass null for no inset (default menu_border)
function drawGBADialog(x, y, w, h, fillToken, borderToken, insetToken) {
  const fill   = window.TOKENS.resolveColor(fillToken   || 'menu_blue');
  const border = window.TOKENS.resolveColor(borderToken || 'text_dark');
  const inset  = insetToken === null ? null
               : window.TOKENS.resolveColor(insetToken || 'menu_border');
  // Outer fill (interior). Draw first; border overpaints edge.
  bx(x, y, w, h, fill);
  // 2px outer border (top, bottom, left, right)
  bx(x,       y,       w, 2, border);
  bx(x,       y+h-2,   w, 2, border);
  bx(x,       y,       2, h, border);
  bx(x+w-2,   y,       2, h, border);
  // 2px inner inset accent rim (1px inside the outer border)
  if (inset) {
    bx(x+2,     y+2,     w-4, 2, inset);
    bx(x+2,     y+h-4,   w-4, 2, inset);
    bx(x+2,     y+2,     2,   h-4, inset);
    bx(x+w-4,   y+2,     2,   h-4, inset);
  }
}

// Draw a single menu row inside an existing dialog frame.
//   (x,y)  — top-left of the row (not the dialog)
//   w      — row width (typically dialog width - horizontal padding*2)
//   label  — text to render
//   selected — true → ► cursor + active color; false → indented muted
//   sizeToken — type.sizes_px key ('sm'/'md') or literal px (default 16)
// Uses gold cursor (menu_border), active text_light, muted fg_muted —
// matches preview .menu li.sel::before + .menu li:not(.sel).
function drawMenuButton(x, y, w, label, selected, sizeToken) {
  const sz = (typeof sizeToken === 'number') ? sizeToken
           : (window.TOKENS.type.sizes_px[sizeToken || 'sm'] || 16);
  const cursor = window.TOKENS.resolveColor('menu_border');
  const active = window.TOKENS.resolveColor('text_light');
  const muted  = window.TOKENS.resolveColor('fg_muted');
  // setFont expects a 12+ input; txShadow clamps internally.
  // Preview shows ~8px left pad for cursor row, 22px indent for non-selected.
  if (selected) {
    txShadow('\u25B6', x + 4, y + sz, sz, cursor, 'rgba(0,0,0,0.4)');
    txShadow(label,    x + 20, y + sz, sz, active, 'rgba(0,0,0,0.5)');
  } else {
    txShadow(label,    x + 22, y + sz, sz, muted,  'rgba(0,0,0,0.5)');
  }
}

