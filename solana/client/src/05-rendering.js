// ═══════════════════════════════════════
// TILE RENDERING
// ═══════════════════════════════════════
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
  // Waving blades with position-offset sine
  for(let i=0;i<8;i++){
    const sway=Math.sin(fr*.08+tx_*2+ty*3+i*0.7)*2;
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
    const windX=Math.sin(fr*0.007+tx_)*1.2;
    for(let p=0;p<5;p++){
      const phase=(fr+p*11+tx_*7)%55;
      if(phase>53)continue;
      const prog=phase/53;
      const sx_=csx+windX*prog*14;
      const sy_=csy-prog*38;
      const sz=1+prog*5;
      const sa=0.38*(1-prog)*(0.7+0.3*Math.sin(fr*0.12+p));
      if(sa<0.02)continue;
      g.globalAlpha=sa;
      bx(sx_-sz*.5|0,sy_-sz*.5|0,sz|0,sz|0,p%2===0?'rgba(210,205,220,1)':'rgba(195,190,208,1)');
    }
    g.globalAlpha=1;}
  }
}

function drawBuilding5(px,py,tx_,ty){drawBuilding(px,py,tx_,ty,'#c86050','#983030','#b84040');}
function drawBuilding15(px,py,tx_,ty){drawBuilding(px,py,tx_,ty,'#5878b8','#384898','#4868a8');}
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
  // Gentle wave lines
  const waveOff=Math.sin(wt*0.3+tx_*0.5)*2;
  for(let wx=0;wx<TW;wx+=3){const wy=8+Math.round(Math.sin(wt*0.25+wx*0.2)*1.5+waveOff);bx(px+wx,py+wy,4,1,'rgba(72,136,192,.5)');}
  for(let wx=1;wx<TW;wx+=3){const wy=20+Math.round(Math.sin(wt*0.3+wx*0.3+1)*1+waveOff*.5);bx(px+wx,py+wy,3,1,'rgba(88,152,208,.4)');}
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
  for(let wx=6;wx<26;wx+=4){const wy=20+Math.round(Math.sin(wt*0.4+wx*0.3)*0.5);bx(px+wx,py+wy,3,1,'rgba(255,255,255,.25)');}
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
  const pulse=Math.sin(fr*.06+tx_*2+ty*3)*.3+.5;
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
  // Flowing texture
  for(let ly=0;ly<TH;ly+=4)for(let lx=0;lx<TW;lx+=4){
    const flow=Math.sin(wt*0.2+lx*0.3+ly*0.2)*0.5+0.5;
    if(flow>.6)bx(px+lx,py+ly,4,3,'#e87040');
    if(flow>.8)bx(px+lx+1,py+ly+1,2,1,'#f89050');
  }
  // Bubbles
  if(f===0){g.drawImage(_lavaBubble3,(px+Math.floor(r.a*24)+1)|0,(py+5)|0);}
  if(f===2){g.drawImage(_lavaBubble2,(px+Math.floor(r.c*20)+4)|0,(py+18)|0);}
  // Glow — globalAlpha+solid avoids template literal string allocation per tile
  g.globalAlpha=.1+Math.sin(fr*.04+tx_+ty)*.05;g.fillStyle='#ffa028';g.fillRect(px,py,TW,TH);g.globalAlpha=1;
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
  const sparkle=Math.sin(fr*.1+tx_*5+ty*7)>.5;
  if(sparkle){bx(px+16,py+8,2,2,'#fff');bx(px+10,py+14,2,2,'rgba(255,255,255,.7)');}
  const _cgA=.12+Math.sin(fr*.05+tx_+ty)*.06;
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
  const pulse=Math.sin(fr*.04)*.3+.5;
  // v239: globalAlpha+solid hex — no template literal per tile per frame
  g.fillStyle='#c8a0ff';
  g.globalAlpha=pulse*.5;g.fillRect(px+10,py+12,12,3);
  const orbY=py+4+Math.sin(fr*.05)*3;
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
  const t=treasures.find(t=>t.map===currentMap&&t.x===tx_&&t.y===ty);
  if(t&&t.collected)return;
  if(!fogRevealed[currentMap][ty]?.[tx_])return;
  const pulse=Math.sin(fr*.08+tx_*3+ty*5)*.3+.6;
  const sparkPhase=Math.floor(fr*.15+tx_*2)%4;
  const colors=['#f8e060','#f0c830','#e8a020','#f8f0a0'];
  if(useKenney.treasure && drawKenneyTileTinted(K.chest[0], K.chest[1], px, py, 2, colors[sparkPhase])){
    // Sparkle orbit around chest — globalAlpha+solid hex avoids 3 template literals per frame
    g.globalAlpha=pulse*.5;g.fillStyle='#f8e060';
    for(let i=0;i<3;i++){
      const angle=(fr*.03+i*2.1+tx_)%(Math.PI*2);
      const dist=10+Math.sin(fr*.05+i)*3;
      g.fillRect(px+16+Math.cos(angle)*dist,py+14+Math.sin(angle)*dist,2,2);
    }
    g.globalAlpha=1;
    g.globalAlpha=pulse*.2;g.drawImage(_tileTreasureGlow10,(px+5)|0,(py+5)|0);g.globalAlpha=1;
    return;
  }
  // Fallback sparkle effect — globalAlpha+solid hex avoids 5 template literals per frame
  g.globalAlpha=pulse*.6;g.fillStyle='#f8e060';
  for(let i=0;i<5;i++){
    const angle=(fr*.03+i*1.3+tx_)%(Math.PI*2);
    const dist=8+Math.sin(fr*.05+i)*3;
    const sx=px+16+Math.cos(angle)*dist;
    const sy=py+14+Math.sin(angle)*dist;
    g.fillRect(sx,sy,3,3);
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
        const pulse=Math.sin(fr*.07+x*2+y*3)*.25+.75;
        const isGold=currentMap>=5;
        g.globalAlpha=pulse*(isGold?.5:.45);g.drawImage(isGold?_stairDownGoldA:_stairDownPurpleA,(px+8)|0,(py+19)|0);
        g.globalAlpha=pulse*(isGold?.3:.25);g.drawImage(isGold?_stairDownGoldB:_stairDownPurpleB,(px+4)|0,(py+17)|0);
        g.globalAlpha=pulse*(isGold?.9:.8);
        g.fillStyle=isGold?'#fff050':'#c8a0ff';
        g.beginPath();g.moveTo(px+16,py+26);g.lineTo(px+12,py+20);g.lineTo(px+20,py+20);g.closePath();g.fill();
        g.globalAlpha=1;
      }else{
        // Up staircase glow — pre-baked ellipses + globalAlpha arrows (no template literals)
        const pulse=Math.sin(fr*.06+x*3+y*2)*.2+.8;
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
        const flick=0.55+Math.sin(fr*0.12+x*2.3+y*1.7)*0.28+Math.sin(fr*0.21+x+y*3)*0.1;
        g.globalAlpha=flick;g.drawImage(_dungCampfireGlow,(px-44)|0,(py-38)|0);g.globalAlpha=1;
        continue;
      }
      if(t===25){
        // v211: Lava — eerie red-orange upward glow (pre-baked)
        const lavaPulse=0.4+Math.sin(fr*0.06+x*1.8+y*2.1)*0.18;
        g.globalAlpha=lavaPulse;g.drawImage(_dungLavaGlow,(px-26)|0,(py-26)|0);g.globalAlpha=1;
        continue;
      }
      if(t===24){
        // Glow tile: pulsing teal halo (pre-baked arc)
        const pulse=Math.sin(fr*.06+x*2+y*3)*.35+.55;
        g.globalAlpha=pulse*.22;g.drawImage(_dungGlowTile,(px)|0,(py)|0);g.globalAlpha=1;
      }else if(t===26){
        // Crystal: sparkle glint + glow halo (pre-baked arc)
        const sparkle=Math.sin(fr*.1+x*5+y*7)>.45;
        if(sparkle){bx(px+15,py+8,3,2,'#fff');bx(px+10,py+15,2,2,'rgba(255,255,255,.8)');}
        const cAlpha=.16+Math.sin(fr*.05+x+y)*.09;
        g.globalAlpha=cAlpha;g.drawImage(_dungCrystalArc,(px+4)|0,(py+4)|0);g.globalAlpha=1;
      }else if(t===27){
        // Altar: floating brass orb + pulse glow (pre-baked orb arcs)
        const pulse=Math.sin(fr*.04)*.3+.5;
        const orbY=py+4+Math.sin(fr*.05)*3;
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
        // v239: globalAlpha+solid white replaces template literal per wave glint
        g.globalAlpha=Math.sin(wp*Math.PI)*0.22;g.fillStyle='#ffffff';g.fillRect(px+2,wy,TW-4,1);g.globalAlpha=1;
      }
      // Sparkle glints: pseudo-random positions per tile+time
      const sphase=(fr*0.04+x*13+y*7);
      if((sphase|0)%11===0){
        const sx=px+((x*37+y*61+fr)%24)+4;
        const sy=py+((x*19+y*43+fr)%20)+4;
        const sa=0.35+0.25*Math.sin(fr*0.1+x+y);
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
      const by_=24+(seed%4)*22+Math.sin(fr*0.03+bi*1.1)*5;
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

function drawTile(tx_,ty){
  const px=tx_*TW-camX,py=ty*TH-camY;
  if(px<-TW||px>W||py<-TH||py>H)return;
  const m=getMap();
  const t=m[ty]?.[tx_];
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
      const bx_=px+28,by_=py-10;win(bx_,by_,28,18);txShadow(p.cc+'',bx_+9,by_+15,8,'#c8b888','rgba(0,0,0,.4)');
    }else if(isVisibleThroughFog(p.x,p.y,3)){
      bx(px+28,py-8,22,16,'rgba(0,0,0,.4)');win(px+28,py-10,22,16);txShadow(p.cc+'',px+34,py+4,7,'#c8b888','rgba(0,0,0,.4)');
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
      const bx_=px+28,by_=py-10;win(bx_,by_,28,18);txShadow(p.cc+'',bx_+9,by_+15,8,'#c8b888','rgba(0,0,0,.4)');
    }else if(isVisibleThroughFog(p.x,p.y,3)){
      bx(px+28,py-8,22,16,'rgba(0,0,0,.4)');win(px+28,py-10,22,16);txShadow(p.cc+'',px+34,py+4,7,'#c8b888','rgba(0,0,0,.4)');
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
    const bx_=px+28,by_=py-10;win(bx_,by_,28,18);txShadow(p.cc+'',bx_+9,by_+15,8,'#c8b888','rgba(0,0,0,.4)');
  }else if(isVisibleThroughFog(p.x,p.y,3)){
    bx(px+28,py-8,22,16,'rgba(0,0,0,.4)');win(px+28,py-10,22,16);txShadow(p.cc+'',px+34,py+4,7,'#c8b888','rgba(0,0,0,.4)');
  }
}

// ── NPC SPRITES ──
function drawNPCSprite(npc){
  // Use smooth visual position if available, else tile position
  const vx=(npc.visualX!==undefined)?npc.visualX:npc.x*TW;
  const vy=(npc.visualY!==undefined)?npc.visualY:npc.y*TH;
  // Walk bob: slight vertical bounce while walking
  const walkBob=(npc.walking&&npc.walkFrame!==undefined)?Math.sin(npc.walkFrame*Math.PI)*2:0;
  const px=vx-camX,py=vy-camY-16+walkBob;
  if(px<-48||px>W+48||py<-56||py>H+56)return;
  const d=npc.dir;

  g.drawImage(_sprNpcShadow,(px+3)|0,(py+40)|0);

  // === ZELDA-LIKE NPC SPRITES (best quality) ===
  const npcZFrame=[1,0,1,2][walkFrame%4]||1;
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
    const bobY=Math.sin(fr*0.08)*3;
    let diaC,diaH;
    if(npc.type===0){diaC='#4080d0';diaH='#60a0e8';}
    else if(npc.type===1){diaC='#40b060';diaH='#60d080';}
    else{diaC='#d0b040';diaH='#e8d060';}

    const pdx=Math.abs((pl[0].visualX/TW|0)-npc.x),pdy=Math.abs((pl[0].visualY/TH|0)-npc.y);
    const nearInteract=pdx+pdy<=2&&!npcDialogActive&&!shopActive&&!gachaActive&&!marketActive&&sc==='map';
    if(nearInteract){
      // Larger, faster-pulsing diamond + [Z] prompt
      const pulse=0.7+0.3*Math.sin(fr*0.18);
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

