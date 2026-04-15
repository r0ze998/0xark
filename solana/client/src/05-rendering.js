// ═══════════════════════════════════════
// TILE RENDERING
// ═══════════════════════════════════════
function isNearTileType(tx_,ty,types){
  const m=getMap();
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const nx=tx_+dx,ny=ty+dy;
    if(nx>=0&&nx<MW&&ny>=0&&ny<MH){
      const t=m[ny]?.[nx];
      if(types.includes(t))return true;
    }
  }
  return false;
}
function isNearLand(tx_,ty){return isNearTileType(tx_,ty,[1,2,3,4,5,7,8,9,10,11,12,13,14,15,16,22,23,24,25,26,27,28,29,30]);}
function isNearWater(tx_,ty){return isNearTileType(tx_,ty,[0,17]);}
function isNearGrass(tx_,ty){return isNearTileType(tx_,ty,[1,7,11,3]);}

function drawWater(px,py,tx_,ty){
  // Zelda water tile — unified art style
  if(drawZeldaOverTile(ZO.water[0], ZO.water[1], px, py, 2)){
    // Sparkle overlay
    if((wt+tx_*3+ty*7)%8===0){const r=tr(tx_,ty);bx(px+Math.floor(r.g*28)+2,py+Math.floor(r.h*28)+2,2,2,'rgba(255,255,255,.5)');}
    return;
  }
  // Fallback: solid blue
  bx(px,py,TW,TH,'#3060a0');
  if((wt+tx_*3+ty*7)%8===0){const r=tr(tx_,ty);bx(px+Math.floor(r.g*28)+2,py+Math.floor(r.h*28)+2,2,2,'rgba(255,255,255,.5)');}
}

function drawGrass(px,py,tx_,ty){
  // Dungeon floor
  if(currentMap>0){
    const h=tileHash(tx_,ty);
    const depth=currentMap;
    const floorIdx=(h&3)===0?DT.floorGlyph:(h&3)===1?DT.floorAlt:DT.floorPlain;
    if(!drawDungeonTile(floorIdx,px,py,2)) bx(px,py,TW,TH,'#1a1820');
    if(depth>1){g.globalAlpha=Math.min(0.45,(depth-1)*0.12);bx(px,py,TW,TH,'#000510');g.globalAlpha=1;}
    if((h&31)<2){const glA=0.3+0.2*Math.sin((typeof fr!=='undefined'?fr:0)*0.05+tx_*0.3);g.globalAlpha=glA;drawDungeonTile(DT.floorGem,px,py,2);g.globalAlpha=1;}
    // Per-floor atmospheric detail: subtle color-coded glints on select tiles
    {const fT=(typeof fr!=='undefined'?fr:0);
    if(depth===3&&(h&19)===0){// F3: crystal shard glint
      const gA=0.18+0.12*Math.sin(fT*0.1+tx_*0.5+ty*0.4);
      g.globalAlpha=gA;bx(px+6,py+6,4,1,'#c080f0');bx(px+7,py+7,2,2,'#d0a0ff');bx(px+8,py+6,1,4,'#c080f0');g.globalAlpha=1;
    }else if(depth===4&&(h&15)===0){// F4: ember glow on floor
      const eA=0.12+0.1*Math.sin(fT*0.14+tx_*0.8);
      g.globalAlpha=eA;bx(px+10,py+8,3,3,'#e04010');bx(px+11,py+9,1,1,'#f0a040');g.globalAlpha=1;
    }else if(depth===5&&(h&11)===0){// F5: void ripple (hollow square)
      const vA=0.10+0.08*Math.sin(fT*0.09+tx_*0.6+ty*0.7);
      g.globalAlpha=vA;g.strokeStyle='#6030a0';g.lineWidth=1;g.strokeRect(px+8,py+8,16,16);g.globalAlpha=1;
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
    const sv=((h&7)-4);
    const depth=currentMap;
    // Base: dark steel, slightly bluer at deeper floors
    const rB=12+sv,gB=16+sv,bB=24+sv+depth*2;
    bx(px,py,TW,TH,`rgb(${rB},${gB},${bB})`);
    // Dungeon corridor: platform/shelf tile (stone floor variant)
    if(dungeonSheetLoaded){
      const cIdx=(tileHash(tx_,ty)&1)?DT.platform:DT.floorPlain;
      drawDungeonTile(cIdx,px,py,2);
      if(depth>1){g.globalAlpha=Math.min(0.4,(depth-1)*0.1);bx(px,py,TW,TH,'#000408');g.globalAlpha=1;}
    } else {
      // Horizontal metal plate seams (every 8px)
      const plateOff=(h>>3)&7;
      for(let gy=plateOff;gy<TH;gy+=8){
        g.fillStyle='rgba(0,0,0,.22)';g.fillRect(px,py+gy,TW,1);
        g.fillStyle='rgba(255,255,255,.04)';g.fillRect(px,py+gy+1,TW,1);
      }
      const r1x=4+((h>>4)&10),r2x=20+((h>>2)&10);
      const rivY=((h>>3)&7+4)%TH;
      bx(px+r1x,py+rivY,2,2,'rgba(180,150,80,.3)');
      bx(px+r1x+1,py+rivY,1,1,'rgba(255,230,140,.2)');
      bx(px+r2x,py+rivY,2,2,'rgba(180,150,80,.3)');
      bx(px+r2x+1,py+rivY,1,1,'rgba(255,230,140,.2)');
    }
    // Edge shadow on top of texture
    bx(px,py,TW,1,'rgba(0,0,0,.35)');
    bx(px,py,1,TH,'rgba(0,0,0,.22)');
    bx(px+TW-1,py,1,TH,'rgba(0,0,0,.14)');
    // Occasional water pool glint (flooding at deeper floors)
    if((h&23)===0){
      const gx=Math.floor(thRand(tx_,ty,5)*22)+4,gy=Math.floor(thRand(tx_,ty,6)*22)+4;
      const glA=0.07+0.06*Math.sin((typeof fr!=='undefined'?fr:0)*0.04+tx_*0.4);
      g.globalAlpha=glA;bx(px+gx,py+gy,5,2,'#2a4060');g.globalAlpha=1;
    }
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
    g.fillStyle='rgba(0,0,0,.12)';g.beginPath();g.ellipse(px+16,py+TH-2,12,4,0,0,Math.PI*2);g.fill();
    return;
  }
  // Fallback: solid green canopy
  bx(px+4,py+2,24,22,'#2d6e2d');g.fillStyle='rgba(0,0,0,.12)';g.beginPath();g.ellipse(px+16,py+TH-2,12,4,0,0,Math.PI*2);g.fill();
}

function drawPine(px,py,tx_,ty){
  drawGrass(px,py,tx_,ty);
  if(drawZeldaOverTile(ZO.tree[0],ZO.tree[1],px,py,2)){
    g.fillStyle='rgba(0,0,0,.08)';g.beginPath();g.ellipse(px+16,py+TH-2,10,3,0,0,Math.PI*2);g.fill();
    return;
  }
  bx(px+8,py+2,16,26,'#1e5a1e');g.fillStyle='rgba(0,0,0,.08)';g.beginPath();g.ellipse(px+16,py+TH-2,10,3,0,0,Math.PI*2);g.fill();
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
    if((wt+tx_)%4<2){
      g.fillStyle='rgba(200,200,210,.25)';
      g.fillRect(px+25,py-5+Math.sin(fr*.1)*.8,2,3);
      g.fillRect(px+26,py-8+Math.sin(fr*.08+1)*.6,1,2);
    }
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
      if((wt+tx_)%4<2){g.fillStyle='rgba(80,60,120,.25)';g.beginPath();g.arc(px+16,py+20,6,0,Math.PI*2);g.fill();}
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
  if((wt+tx_)%4<2){g.fillStyle='rgba(80,60,120,.25)';g.beginPath();g.arc(px+16,py+20,6,0,Math.PI*2);g.fill();}
}

function drawMountain(px,py,tx_,ty){
  // Dungeon walls: impenetrable hull steel — Kenney wall tile tinted near-black
  if(currentMap>0){
    const h=tileHash(tx_,ty);
    const sv=((h&7)-4);
    const depth=currentMap;
    // Deep near-black blue-steel
    const rB=8+sv,gB=10+sv,bB=16+sv+depth;
    bx(px,py,TW,TH,`rgb(${rB},${gB},${bB})`);
    // Dungeon WALL: red brick tile — proper dungeon feel
    if(dungeonSheetLoaded){
      const wIdx=(h&3)===0?DT.wallDark:(h&3)===1?DT.wallLight:DT.wallBrick;
      drawDungeonTile(wIdx,px,py,2);
      // Deep floors: extra darkness
      if(depth>2){g.globalAlpha=Math.min(0.5,(depth-2)*0.15);bx(px,py,TW,TH,'#000000');g.globalAlpha=1;}
    } else {
      const rivOff=(h>>3)&3;
      for(let ry=rivOff*4+2;ry<TH;ry+=9){
        const r1x=3+((h>>4)&7),r2x=18+((h>>6)&7);
        bx(px+r1x,py+ry,3,3,'rgba(80,70,40,.5)');
        bx(px+r1x+1,py+ry,2,1,'rgba(200,160,80,.22)');
        bx(px+r2x,py+ry,3,3,'rgba(80,70,40,.5)');
        bx(px+r2x+1,py+ry,2,1,'rgba(200,160,80,.22)');
      }
      if((h&3)===0){
        const sx=5+((h>>6)&20);
        g.fillStyle='rgba(0,0,0,.25)';g.fillRect(px+sx,py,2,TH);
        g.fillStyle='rgba(255,255,255,.025)';g.fillRect(px+sx+2,py,1,TH);
      }
    }
    // Weld line & edge highlights on top of texture
    const weldY=(h&15)+6;
    g.fillStyle='rgba(0,0,0,.28)';g.fillRect(px,py+weldY,TW,2);
    g.fillStyle='rgba(255,255,255,.025)';g.fillRect(px,py+weldY+2,TW,1);
    bx(px,py,TW,1,'rgba(255,255,255,.06)');
    bx(px,py,1,TH,'rgba(255,255,255,.04)');
    // Deep floors: barnacle/rust stain
    if(depth>=3&&(h&7)===0){
      const bx_=Math.floor(thRand(tx_,ty,7)*20)+4,by_=Math.floor(thRand(tx_,ty,8)*20)+4;
      g.globalAlpha=0.22;
      bx(px+bx_,py+by_,6,4,depth>=4?'#1e2a08':'#3c1e08');
      g.globalAlpha=1;
    }
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
    g.fillStyle='rgba(0,0,0,.1)';g.beginPath();g.ellipse(px+16,py+TH-2,12,4,0,0,Math.PI*2);g.fill();
    return;
  }
  // Fallback
  bx(px+6,py+6,20,20,'#808088');g.fillStyle='rgba(0,0,0,.1)';g.beginPath();g.ellipse(px+16,py+TH-2,12,4,0,0,Math.PI*2);g.fill();
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
  const rv=(h&5)-2;
  // Gradient top-bottom
  bx(px,py,TW,TH/2,f3===0?`rgb(${48+rv},${112+rv},${168+rv})`:`rgb(${60+rv},${124+rv},${180+rv})`);
  bx(px,py+TH/2,TW,TH/2,f3===0?`rgb(${36+rv},${100+rv},${156+rv})`:`rgb(${48+rv},${112+rv},${168+rv})`);
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
    g.fillStyle='#48a050';g.beginPath();g.ellipse(lx,ly,5,3,0,0,Math.PI*2);g.fill();
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
    g.fillStyle='rgba(240,224,128,.3)';g.beginPath();g.arc(px+16,py-12,12,0,Math.PI*2);g.fill();
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
      const shade=((bxx+by+tx_)%3)*8;
      bx(px+bxx+off,py+by,7,7,`rgb(${96+shade},${88+shade},${80+shade})`);
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
    // Dungeon special tile: gem floor with pulsing teal glow
    drawGrass(px,py,tx_,ty);
    const cfr=typeof fr!=='undefined'?fr:0;
    const pulse=Math.sin(cfr*.06+tx_*2+ty*3)*.35+.55;
    // Draw gem tile on top
    if(dungeonSheetLoaded){g.globalAlpha=pulse*0.9;drawDungeonTile(DT.floorGem,px,py,2);g.globalAlpha=1;}
    // Teal glow halo
    g.fillStyle=`rgba(40,200,160,${pulse*.22})`;
    g.beginPath();g.arc(px+TW/2,py+TH/2,15,0,Math.PI*2);g.fill();
    return;
  }
  drawGrass(px,py,tx_,ty);
  bx(px,py,TW,TH,'rgba(0,0,20,.15)');
  const pulse=Math.sin(fr*.06+tx_*2+ty*3)*.3+.5;
  const color=((tx_+ty)%2===0)?`rgba(80,200,220,${pulse*.4})`:`rgba(160,80,200,${pulse*.4})`;
  bx(px+2,py+2,TW-4,TH-4,color);
  bx(px+4,py+4,TW-8,TH-8,color);
  const bright=((tx_+ty)%2===0)?`rgba(120,240,255,${pulse*.6})`:`rgba(200,120,255,${pulse*.6})`;
  bx(px+6,py+6,2,TH-12,bright);bx(px+TW-8,py+6,2,TH-12,bright);
  bx(px+6,py+6,TW-12,2,bright);bx(px+6,py+TH-8,TW-12,2,bright);
  bx(px+14,py+8,4,TH-16,bright);bx(px+8,py+14,TW-16,4,bright);
  g.fillStyle=bright;g.beginPath();g.arc(px+16,py+16,4,0,Math.PI*2);g.fill();
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
  if(f===0){g.fillStyle='#f8a060';g.beginPath();g.arc(px+Math.floor(r.a*24)+4,py+8,3,0,Math.PI*2);g.fill();}
  if(f===2){g.fillStyle='#f8a060';g.beginPath();g.arc(px+Math.floor(r.c*20)+6,py+20,2,0,Math.PI*2);g.fill();}
  // Glow
  bx(px,py,TW,TH,`rgba(255,160,40,${.1+Math.sin(fr*.04+tx_+ty)*.05})`);
  // Bright cracks
  bx(px+Math.floor(r.e*24)+2,py+Math.floor(r.f*24)+2,4,1,'#f8c060');
  bx(px+Math.floor(r.g*20)+6,py+Math.floor(r.h*20)+6,1,4,'#f8c060');
}

function drawCrystal(px,py,tx_,ty){
  if(currentMap>0){
    // Dungeon crystal: deep ARK maritime crystal — teal-shifted per floor
    drawGrass(px,py,tx_,ty);
    const cfr=typeof fr!=='undefined'?fr:0;
    const r=tr(tx_,ty);
    const depth=currentMap;
    // Color shifts deeper — teal→sapphire
    const hue=depth<=2?'#28a8c0':depth===3?'#1880c8':'#1058d0';
    const hueD=depth<=2?'#166878':depth===3?'#104868':'#0c3080';
    const hueL=depth<=2?'#50d0e8':depth===3?'#40b0e0':'#3088e0';
    // Crystal cluster
    bx(px+10,py+4,12,22,hue);bx(px+8,py+10,16,12,hue);
    bx(px+12,py+2,8,5,hueL);
    // Secondary shards
    bx(px+4,py+12,6,14,hueD);bx(px+22,py+8,6,16,hueD);
    // Inner facet face (lighter)
    bx(px+12,py+6,4,10,hueL);bx(px+14,py+4,2,5,'rgba(255,255,255,.4)');
    // Specular glint
    const sparkle=Math.sin(cfr*.1+tx_*5+ty*7)>.45;
    if(sparkle){bx(px+15,py+8,3,2,'#fff');bx(px+10,py+15,2,2,'rgba(255,255,255,.8)');}
    // Sub-facet texture
    bx(px+10,py+10,2,8,'rgba(255,255,255,.06)');
    // Glow halo (ARK teal)
    g.fillStyle=`rgba(30,140,200,${.16+Math.sin(cfr*.05+tx_+ty)*.09})`;
    g.beginPath();g.arc(px+16,py+16,11,0,Math.PI*2);g.fill();
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
  g.fillStyle=`rgba(160,200,255,${.12+Math.sin(fr*.05+tx_+ty)*.06})`;
  g.beginPath();g.arc(px+16,py+16,10,0,Math.PI*2);g.fill();
}

function drawAltar(px,py,tx_,ty){
  if(currentMap>0){
    // Dungeon altar: weathered dark steel with brass ARK gold accents
    drawGrass(px,py,tx_,ty);
    const cfr=typeof fr!=='undefined'?fr:0;
    const pulse=Math.sin(cfr*.04)*.3+.5;
    // Base slab — dark plate steel
    bx(px+2,py+20,28,10,'#101620');bx(px+4,py+18,24,10,'#18202c');
    // Top surface
    bx(px+6,py+14,20,5,'#1e2830');bx(px+8,py+12,16,4,'#242e3c');
    // Brass trim lines (ARK.gold = #c8a448)
    bx(px+6,py+14,20,1,'#a08028');bx(px+4,py+18,24,1,'#7a6018');
    bx(px+2,py+20,28,1,'#584810');
    // Corner brass rivets
    bx(px+4,py+19,3,3,'#b89030');bx(px+5,py+19,1,1,'rgba(255,220,100,.3)');
    bx(px+25,py+19,3,3,'#b89030');bx(px+26,py+19,1,1,'rgba(255,220,100,.3)');
    // Scanlines on base
    for(let sy=0;sy<10;sy+=2){g.fillStyle='rgba(0,0,0,.07)';g.fillRect(px+2,py+20+sy,28,1);}
    // Glow on altar top (brass gold)
    bx(px+10,py+12,12,3,`rgba(200,164,72,${pulse*.42})`);
    // Floating brass orb
    const orbY=py+4+Math.sin(cfr*.05)*3;
    g.fillStyle=`rgba(200,164,72,${pulse*.65})`;
    g.beginPath();g.arc(px+16,orbY,5,0,Math.PI*2);g.fill();
    g.fillStyle=`rgba(240,200,80,${pulse*.22})`;
    g.beginPath();g.arc(px+16,orbY,10,0,Math.PI*2);g.fill();
    // Arcane inscriptions on base
    bx(px+8,py+22,4,2,`rgba(200,164,72,${pulse*.35})`);bx(px+20,py+22,4,2,`rgba(200,164,72,${pulse*.35})`);
    bx(px+14,py+24,4,1,`rgba(200,164,72,${pulse*.25})`);
    return;
  }
  drawGrass(px,py,tx_,ty);
  bx(px,py,TW,TH,'rgba(0,0,20,.15)');
  bx(px+2,py+20,28,10,'#606068');bx(px+4,py+18,24,10,'#707078');
  bx(px+6,py+14,20,5,'#808088');bx(px+8,py+12,16,4,'#909098');
  const pulse=Math.sin(fr*.04)*.3+.5;
  bx(px+10,py+12,12,3,`rgba(200,160,255,${pulse*.5})`);
  const orbY=py+4+Math.sin(fr*.05)*3;
  g.fillStyle=`rgba(200,160,255,${pulse*.7})`;
  g.beginPath();g.arc(px+16,orbY,5,0,Math.PI*2);g.fill();
  g.fillStyle=`rgba(255,220,255,${pulse*.4})`;
  g.beginPath();g.arc(px+16,orbY,10,0,Math.PI*2);g.fill();
  bx(px+8,py+22,4,2,`rgba(200,160,255,${pulse*.3})`);bx(px+20,py+22,4,2,`rgba(200,160,255,${pulse*.3})`);
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
      g.fillStyle='rgba(255,160,40,.12)';g.beginPath();g.arc(px+16,py+16,14,0,Math.PI*2);g.fill();
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
  g.fillStyle='rgba(255,160,40,.12)';g.beginPath();g.arc(px+16,py+16,14,0,Math.PI*2);g.fill();
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
    // Sparkle orbit around chest
    for(let i=0;i<3;i++){
      const angle=(fr*.03+i*2.1+tx_)%(Math.PI*2);
      const dist=10+Math.sin(fr*.05+i)*3;
      bx(px+16+Math.cos(angle)*dist,py+14+Math.sin(angle)*dist,2,2,`rgba(248,224,96,${pulse*.5})`);
    }
    g.fillStyle=`rgba(248,224,96,${pulse*.2})`;
    g.beginPath();g.arc(px+16,py+16,10,0,Math.PI*2);g.fill();
    return;
  }
  // Fallback sparkle effect
  for(let i=0;i<5;i++){
    const angle=(fr*.03+i*1.3+tx_)%(Math.PI*2);
    const dist=8+Math.sin(fr*.05+i)*3;
    const sx=px+16+Math.cos(angle)*dist;
    const sy=py+14+Math.sin(angle)*dist;
    bx(sx,sy,3,3,`rgba(248,224,96,${pulse*.6})`);
  }
  g.fillStyle=`rgba(248,224,96,${pulse*.3})`;
  g.beginPath();g.arc(px+16,py+16,8,0,Math.PI*2);g.fill();
  bx(px+14,py+14,5,4,colors[sparkPhase]);
}

function drawStairsDown(px,py,tx_,ty){
  // Dungeon staircase descending — stone spiral with golden glow at bottom
  drawGrass(px,py,tx_,ty);
  if(!fogRevealed[currentMap]?.[ty]?.[tx_])return;
  const pulse=Math.sin(fr*.07+tx_*2+ty*3)*.25+.75;
  // Stone surround
  bx(px+4,py+4,24,24,'#2a2030');
  bx(px+6,py+6,20,20,'#1a1520');
  // Step edges (perspective from above)
  bx(px+8,py+8,16,3,'#3a3050');bx(px+9,py+11,14,3,'#302840');bx(px+10,py+14,12,3,'#282040');
  bx(px+11,py+17,10,3,'#201830');bx(px+12,py+20,8,3,'#181028');
  // Downward glow (gold on floor 5 goal, purple elsewhere)
  const glowA=currentMap>=5?`rgba(220,160,0,${pulse*.5})`:`rgba(80,40,180,${pulse*.45})`;
  const glowB=currentMap>=5?`rgba(255,220,40,${pulse*.3})`:`rgba(140,80,255,${pulse*.25})`;
  const arrowCol=currentMap>=5?`rgba(255,240,80,${pulse*.9})`:`rgba(200,160,255,${pulse*.8})`;
  g.fillStyle=glowA;g.beginPath();g.ellipse(px+16,py+24,7,4,0,0,Math.PI*2);g.fill();
  g.fillStyle=glowB;g.beginPath();g.ellipse(px+16,py+24,11,6,0,0,Math.PI*2);g.fill();
  // Arrow indicator
  g.fillStyle=arrowCol;
  g.beginPath();g.moveTo(px+16,py+26);g.lineTo(px+12,py+20);g.lineTo(px+20,py+20);g.closePath();g.fill();
  // Floor label (GOAL on B5F since it leads to victory)
  const label=currentMap>=5?'GOAL':`B${currentMap+1}F`;
  g.font='bold 6px monospace';g.fillStyle=currentMap>=5?`rgba(255,220,80,${pulse*.9})`:`rgba(220,200,255,${pulse*.9})`;
  g.textAlign='center';g.fillText(label,px+16,py+14);g.textAlign='left';
}

function drawStairsUp(px,py,tx_,ty){
  // Dungeon staircase ascending — lighter stone with sky-blue tint
  drawGrass(px,py,tx_,ty);
  if(!fogRevealed[currentMap]?.[ty]?.[tx_])return;
  const pulse=Math.sin(fr*.06+tx_*3+ty*2)*.2+.8;
  // Stone surround
  bx(px+4,py+4,24,24,'#1c2a2a');
  bx(px+6,py+6,20,20,'#141e20');
  // Step edges going up
  bx(px+12,py+8,8,3,'#283840');bx(px+11,py+11,10,3,'#2a3e48');
  bx(px+10,py+14,12,3,'#2c4450');bx(px+9,py+17,14,3,'#2e4858');
  bx(px+8,py+20,16,3,'#304c5c');
  // Upward glow at top
  g.fillStyle=`rgba(40,120,200,${pulse*.4})`;
  g.beginPath();g.ellipse(px+16,py+8,7,4,0,0,Math.PI*2);g.fill();
  g.fillStyle=`rgba(80,180,255,${pulse*.2})`;
  g.beginPath();g.ellipse(px+16,py+8,11,6,0,0,Math.PI*2);g.fill();
  // Arrow indicator
  g.fillStyle=`rgba(140,220,255,${pulse*.8})`;
  g.beginPath();g.moveTo(px+16,py+6);g.lineTo(px+12,py+12);g.lineTo(px+20,py+12);g.closePath();g.fill();
  // Floor label
  const upLabel=currentMap<=1?'EXIT':`B${currentMap-1}F`;
  g.font='bold 6px monospace';g.fillStyle=`rgba(160,230,255,${pulse*.9})`;
  g.textAlign='center';g.fillText(upLabel,px+16,py+22);g.textAlign='left';
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

  // Shadow
  g.fillStyle='rgba(0,0,0,.22)';g.beginPath();g.ellipse(px+16,py+46,12,4,0,0,Math.PI*2);g.fill();

  // Walk animation: frame 0=neutral, 1=left-stride, 2=neutral, 3=right-stride
  const zFrame=[1,0,1,2][wf];
  // Direction: 0=down, 1=left, 2=right, 3=up
  const zDir=[0,1,2,3][d]||0;
  const charIdx=isP0?0:isP1?1:2;

  // === ZELDA-LIKE CHARACTER SPRITES (best quality) ===
  if(zeldaCharLoaded){
    const glowC=isP0?'rgba(40,88,200,.18)':isP1?'rgba(200,32,40,.18)':'rgba(40,180,160,.18)';
    g.fillStyle=glowC;g.beginPath();g.ellipse(px+16,py+24+bob,18,24,0,0,Math.PI*2);g.fill();
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
    // Glow aura behind sprite
    const glowC=isP0?'rgba(40,88,200,.18)':isP1?'rgba(200,32,40,.18)':'rgba(40,180,160,.18)';
    g.fillStyle=glowC;g.beginPath();g.ellipse(px+16,py+24+bob,18,24,0,0,Math.PI*2);g.fill();
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

  g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.ellipse(px+16,py+46,12,5,0,0,Math.PI*2);g.fill();

  // === ZELDA-LIKE NPC SPRITES (best quality) ===
  const npcZFrame=[1,0,1,2][walkFrame%4]||1;
  const npcZDir=[0,1,2,3][d]||0;
  const npcCharIdx=npc.type===0?3:npc.type===1?4:3; // NPC chars at indices 3,4
  if(zeldaCharLoaded){
    const glowC=npc.type===0?'rgba(120,60,180,.14)':npc.type===1?'rgba(60,180,100,.14)':'rgba(180,160,60,.14)';
    g.fillStyle=glowC;g.beginPath();g.ellipse(px+16,py+24,16,22,0,0,Math.PI*2);g.fill();
    drawZeldaChar(npcCharIdx,npcZDir,npcZFrame,px,py,2);
  } else if(pirateSheetLoaded){
  // === KENNEY NPC SPRITE PATH (fallback) ===
    // NPC type 0→pirate1, type 1→skeleton, type 2→pirate3
    const kNpc=npc.type===0?K.pirate1:(npc.type===1?K.skeleton:K.pirate3);
    const glowC=npc.type===0?'rgba(120,60,180,.14)':npc.type===1?'rgba(60,180,100,.14)':'rgba(180,160,60,.14)';
    g.fillStyle=glowC;g.beginPath();g.ellipse(px+16,py+24,16,22,0,0,Math.PI*2);g.fill();
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
  birds.forEach(b=>{
    const px=b.x*TW-camX+10,py=b.y*TH-camY+6;
    if(px<-20||px>W+20||py<-20||py>H+20)return;
    bx(px,py+4,8,6,'#604830');
    bx(px+2,py+2,4,2,'#806040');
    bx(px+8,py+4,2,2,'#d8a030');
    if((fr+Math.floor(b.x*3))%8<4){
      bx(px-2,py,6,2,'#705838');bx(px+6,py,6,2,'#705838');
    }else{
      bx(px-2,py+2,2,2,'#705838');bx(px+8,py+2,2,2,'#705838');
    }
  });
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

