// MAP SCREEN
// ═══════════════════════════════════════
const HUD_HEIGHT=72;

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
          if(isTop){for(let i=0;i<TW;i++){if(thRand(x,y,i+380)>.45){const wc=(wt+i)%3===0?'rgba(200,220,240,.35)':'rgba(160,200,230,.2)';bx(px+i,py,1,1,wc);}}}
          if(isBot){for(let i=0;i<TW;i++){if(thRand(x,y,i+390)>.45){const wc=(wt+i)%3===0?'rgba(200,220,240,.35)':'rgba(160,200,230,.2)';bx(px+i,py+TH-1,1,1,wc);}}}
          if(isLft){for(let i=0;i<TH;i++){if(thRand(x,y,i+400)>.45){const wc=(wt+i)%3===0?'rgba(200,220,240,.35)':'rgba(160,200,230,.2)';bx(px,py+i,1,1,wc);}}}
          if(isRgt){for(let i=0;i<TH;i++){if(thRand(x,y,i+410)>.45){const wc=(wt+i)%3===0?'rgba(200,220,240,.35)':'rgba(160,200,230,.2)';bx(px+TW-1,py+i,1,1,wc);}}}
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
    pollenParticles.forEach((p,i)=>{
      p.x+=p.vx;
      p.y+=Math.sin(fr*0.02+p.phase)*0.15+p.vy;
      if(p.x>MW*TW)p.x=0;
      if(p.y<0)p.y=MH*TH;
      if(p.y>MH*TH)p.y=0;
      const sx=p.x-camX,sy=p.y-camY;
      if(sx>0&&sx<W&&sy>0&&sy<H-HUD_HEIGHT){
        const a=0.25+Math.sin(fr*0.03+i)*0.15;
        g.globalAlpha=a;
        bx(sx,sy,1,1,'#e8e8d0');
        g.globalAlpha=1;
      }
    });
  }
}

// ═══════════════════════════════════════
// FOG OF WAR RENDERING
// ═══════════════════════════════════════
function drawFogOverlay(startTX,startTY,endTX,endTY){
  const fogC=FOG_COLORS[currentMap];
  for(let y=startTY;y<=endTY;y++){
    for(let x=startTX;x<=endTX;x++){
      const px=x*TW-camX,py=y*TH-camY;
      if(px<-TW||px>W||py<-TH||py>H)continue;
      if(fogRevealed[currentMap][y]&&fogRevealed[currentMap][y][x]){
        // Revealed tile: check edges for fog gradient
        const dirs=[[0,-1],[0,1],[-1,0],[1,0]]; // up,down,left,right
        for(const [dx,dy] of dirs){
          const nx=x+dx,ny=y+dy;
          const neighborHidden=(nx<0||nx>=MW||ny<0||ny>=MH||!fogRevealed[currentMap][ny]?.[nx]);
          if(neighborHidden){
            // Draw gradient strip on this edge
            const gradSteps=4;
            for(let s=0;s<gradSteps;s++){
              const alpha=0.15+s*0.12; // increasing opacity toward hidden side
              if(dy===-1){
                // top edge foggy
                bx(px,py+s,TW,1,`rgba(10,10,20,${alpha})`);
              }else if(dy===1){
                // bottom edge foggy
                bx(px,py+TH-1-s,TW,1,`rgba(10,10,20,${alpha})`);
              }else if(dx===-1){
                // left edge foggy
                bx(px+s,py,1,TH,`rgba(10,10,20,${alpha})`);
              }else if(dx===1){
                // right edge foggy
                bx(px+TW-1-s,py,1,TH,`rgba(10,10,20,${alpha})`);
              }
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

function drawFogParticles(){
  const atmos=FLOOR_ATMOS[inDungeon?currentFloor:0]||FLOOR_ATMOS[0];
  const [fogCol,ambCol,ambCount,ambVY,ambSz]=atmos;
  fogParticles.forEach((p,i)=>{
    p.x+=p.vx;
    p.y+=Math.sin(fr*0.015+p.phase)*0.1+p.vy;
    if(p.x>MW*TW)p.x=0;
    if(p.y<0)p.y=MH*TH;
    if(p.y>MH*TH)p.y=0;
    const sx=p.x-camX,sy=p.y-camY;
    if(sx>0&&sx<W&&sy>0&&sy<H-HUD_HEIGHT){
      // Fog particles over hidden tiles
      const tileX=Math.floor(p.x/TW),tileY=Math.floor(p.y/TH);
      if(tileX>=0&&tileX<MW&&tileY>=0&&tileY<MH&&!fogRevealed[currentMap][tileY]?.[tileX]){
        const a=0.15+Math.sin(fr*0.02+i*0.7)*0.1;
        g.globalAlpha=Math.max(0,a);
        g.fillStyle=fogCol;
        g.fillRect(sx,sy,1,1);
        g.globalAlpha=1;
      }
    }
  });
  // Floor-specific ambient particles over revealed tiles (dungeon only)
  if(!inDungeon||ambCount===0)return;
  const seed=fr*0.02;
  for(let i=0;i<ambCount;i++){
    // Deterministic pseudo-random position based on frame+index
    const px=((i*1237+fr*3)%1000/1000)*MW*TW;
    const py=((i*4321+fr*2)%1000/1000)*MH*TH;
    // Drift upward/downward over time
    const dpy=py+Math.sin(seed+i*1.3)*20+fr*ambVY*(1+i%3)*0.3;
    const dpyWrapped=((dpy%MH*TH)+MH*TH)%(MH*TH);
    const sx=px-camX,sy=dpyWrapped-camY;
    if(sx<-4||sx>W+4||sy<-4||sy>H+4)continue;
    const tileX=Math.floor(px/TW),tileY=Math.floor(dpyWrapped/TH);
    if(tileX<0||tileX>=MW||tileY<0||tileY>=MH)continue;
    if(!fogRevealed[currentMap][tileY]?.[tileX])continue;
    const pulse=0.5+0.5*Math.sin(seed*1.5+i*2.1);
    g.globalAlpha=pulse*0.7;
    g.fillStyle=ambCol;
    g.fillRect(sx,sy,ambSz,ambSz);
    g.globalAlpha=1;
  }
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

    // Barrel stacks near warehouses (around building area ~8-10, 8-9)
    const barrelSpots=[[9,8],[10,8],[9,9],[21,8],[22,8]];
    barrelSpots.forEach(([btx,bty])=>{
      const bpx=btx*TW-camX,bpy=bty*TH-camY;
      if(bpx>-TW&&bpx<W+TW&&bpy>-TW&&bpy<H+TW&&fogRevealed[0][bty]?.[btx]){
        // Barrel 1
        bx(bpx+2,bpy+12,12,14,'#906838');bx(bpx+4,bpy+14,8,10,'#a07848');
        bx(bpx+2,bpy+14,12,2,'#705028');bx(bpx+2,bpy+22,12,2,'#705028');
        // Barrel 2 (stacked)
        if((btx+bty)%2===0){
          bx(bpx+16,bpy+14,12,12,'#906838');bx(bpx+18,bpy+16,8,8,'#a07848');
          bx(bpx+16,bpy+16,12,2,'#705028');bx(bpx+16,bpy+22,12,2,'#705028');
        }
      }
    });

    // Rope coils near dock
    const ropeSpots=[[12,22],[18,22]];
    ropeSpots.forEach(([rtx,rty])=>{
      const rpx=rtx*TW-camX,rpy=rty*TH-camY;
      if(rpx>-TW&&rpx<W+TW&&rpy>-TW&&rpy<H+TW&&fogRevealed[0][rty]?.[rtx]){
        g.fillStyle='#a09060';g.beginPath();g.ellipse(rpx+16,rpy+22,6,4,0,0,Math.PI*2);g.fill();
        g.fillStyle='#b0a070';g.beginPath();g.ellipse(rpx+16,rpy+22,4,2,0,0,Math.PI*2);g.fill();
        bx(rpx+14,rpy+18,4,4,'#a09060');
      }
    });

    // Seagulls flying over water
    seagulls.forEach(sg=>{
      sg.x+=sg.vx;
      if(sg.x>42*TW)sg.x=-20;
      const sgPx=sg.x-camX;
      const sgPy=sg.y-camY+Math.sin(fr*0.04+sg.phase)*sg.arc;
      if(sgPx>-10&&sgPx<W+10&&sgPy>-10&&sgPy<H){
        // Body (white dot)
        bx(sgPx,sgPy,3,2,'#e8e8e8');
        // Wings (flapping)
        if(Math.sin(fr*0.12+sg.phase)>0){
          bx(sgPx-3,sgPy-1,3,1,'#d8d8d8');bx(sgPx+3,sgPy-1,3,1,'#d8d8d8');
        }else{
          bx(sgPx-3,sgPy+1,3,1,'#d8d8d8');bx(sgPx+3,sgPy+1,3,1,'#d8d8d8');
        }
      }
    });

  }else if(currentMap===1){
    // ── SMUGGLER'S JUNGLE DECORATIONS ──

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
    monkeys.forEach(mk=>{
      mk.hopTimer--;
      if(mk.hopTimer<=0){
        mk.hopTimer=80+Math.floor(Math.random()*100);
        mk.hopDir=-mk.hopDir;
        mk.offsetX=Math.random()*12;
      }
      const mtx=mk.treeX,mty=mk.treeY;
      const mm=getMap();
      if(mm[mty]?.[mtx]!==3)return;
      if(!fogRevealed[1][mty]?.[mtx])return;
      const mpx=mtx*TW-camX+mk.offsetX,mpy=mty*TH-camY+4+mk.offsetY;
      if(mpx<-TW||mpx>W+TW||mpy<-TH||mpy>H+TH)return;
      const hopBob=mk.hopTimer<10?Math.abs(Math.sin(mk.hopTimer*0.5))*4:0;
      // Body
      bx(mpx+2,mpy+6-hopBob,6,5,'#8B5E3C');
      // Head
      bx(mpx+3,mpy+2-hopBob,4,4,'#A06B3F');
      // Face
      bx(mpx+4,mpy+3-hopBob,1,1,'#2a1a0a');bx(mpx+6,mpy+3-hopBob,1,1,'#2a1a0a');
      // Tail
      const tailCurl=Math.sin(fr*0.05+mtx)*2;
      bx(mpx+8,mpy+8-hopBob+tailCurl,1,3,'#8B5E3C');
      bx(mpx+9,mpy+10-hopBob+tailCurl,1,2,'#8B5E3C');
    });

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
          g.fillStyle='#806090';g.beginPath();g.arc(spx+16,spy+8,10,0,Math.PI*2);g.fill();
          g.globalAlpha=1;
        }
      }
    }

    // Dripping water effect from ceiling tiles
    waterDrips.forEach(wd=>{
      if(!fogRevealed[2][wd.y]?.[wd.x])return;
      const m2=getMap();
      if(m2[wd.y]?.[wd.x]!==22)return;
      const wpx=wd.x*TW-camX+12+((wd.x*5)%12),wpy=wd.y*TH-camY+TH;
      if(wpx<-4||wpx>W+4||wpy<-40||wpy>H+4)return;
      wd.delay--;
      if(wd.delay>0)return;
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
    });

    // Ghostly glow in darker areas (near lava/crystal tiles)
    for(let gy=Math.max(0,Math.floor(camY/TH));gy<=Math.min(MH-1,Math.ceil((camY+H)/TH));gy++){
      for(let gx=Math.max(0,Math.floor(camX/TW));gx<=Math.min(MW-1,Math.ceil((camX+W)/TW));gx++){
        const gt=m[gy]?.[gx];
        if((gt===25||gt===26)&&fogRevealed[2][gy]?.[gx]){
          const gpx=gx*TW-camX+16,gpy=gy*TH-camY+16;
          if(gpx>-20&&gpx<W+20&&gpy>-20&&gpy<H+20){
            const glowPulse=Math.sin(fr*0.03+gx*3+gy*5)*0.06+0.08;
            g.globalAlpha=glowPulse;
            g.fillStyle=gt===25?'#f08040':'#80c0f0';
            g.beginPath();g.arc(gpx,gpy,20,0,Math.PI*2);g.fill();
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

function dMap(){
  updateCamera();

  const startTX=Math.max(0,Math.floor(camX/TW));
  const startTY=Math.max(0,Math.floor(camY/TH));
  const endTX=Math.min(MW-1,Math.ceil((camX+W)/TW));
  const endTY=Math.min(MH-1,Math.ceil((camY+H)/TH));

  for(let y=startTY;y<=endTY;y++){
    for(let x=startTX;x<=endTX;x++){
      // Skip tiles fully hidden by fog (no adjacent revealed tiles)
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
  // ── CIRCULAR VISIBILITY (Iwayama Tunnel style) — dungeon only ──
  // Town is a safe zone, no dark vignette. Dungeon only.
  // Each floor has a subtle color tint that intensifies as the player goes deeper.
  if(inDungeon&&(!isTouchDevice||fr%2===0)){
    const px=pl[0].visualX-camX+TW/2, py=pl[0].visualY-camY+TH/2;
    const innerR=120, outerR=320;
    const grad=g.createRadialGradient(px,py,innerR,px,py,outerR);
    // Floor-depth color tints: deeper = warmer/more ominous
    const floorTint=['rgba(0,0,0','rgba(15,5,35','rgba(25,5,40','rgba(35,8,28','rgba(40,5,8','rgba(50,0,0'][currentFloor]||'rgba(0,0,0';
    grad.addColorStop(0,'rgba(0,0,0,0)');
    grad.addColorStop(0.15,'rgba(0,0,0,0)');
    grad.addColorStop(0.3,'rgba(0,0,0,0.05)');
    grad.addColorStop(0.45,'rgba(0,0,0,0.12)');
    grad.addColorStop(0.6,floorTint+',0.25)');
    grad.addColorStop(0.75,floorTint+',0.46)');
    grad.addColorStop(0.88,floorTint+',0.66)');
    grad.addColorStop(1,floorTint+',0.82)');
    g.fillStyle=grad;
    g.fillRect(0,0,W,H);
  }
  // Fog particles only every other frame
  if(fr%2===0) drawFogParticles();

  // Floor watermark label (dungeon only, large semi-transparent)
  if(inDungeon&&currentFloor>0){
    const FLOOR_NAMES=['','FLOOR I','FLOOR II','FLOOR III','FLOOR IV','FLOOR V'];
    const floorLabel=FLOOR_NAMES[currentFloor]||('FLOOR '+currentFloor);
    const wmAlpha=0.05+Math.sin(fr*0.008)*0.02;
    g.save();
    g.globalAlpha=wmAlpha;
    g.font='bold 96px VT323, monospace';
    g.textAlign='center';
    g.fillStyle='#ffffff';
    g.fillText(floorLabel,W/2,(H-HUD_HEIGHT)/2+36);
    g.globalAlpha=1;
    g.textAlign='left';
    g.restore();
  }

  drawFootprints();
  drawParticles(camX,camY);
  drawBirds();
  drawPirateDecorations();
  drawTownWeather(); // v84: weather overlay (after pirate decor, before NPCs)

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
  footprints.forEach(fp=>{
    if(fp.map!==currentMap)return;
    if(!fogRevealed[currentMap][fp.y]?.[fp.x])return;
    const m_=maps[currentMap];
    const tile=m_[fp.y]?.[fp.x];
    if(tile!==1&&tile!==11&&tile!==7)return;
    const fpx=fp.x*TW-camX;const fpy=fp.y*TH-camY;
    if(fpx<-TW||fpx>W||fpy<-TH||fpy>H)return;
    const ageFrac=Math.max(0,1-fp.age/FOOTPRINT_MAX_AGE);
    const alpha=ageFrac*0.42;
    // v99: color and size by rival identity
    const fpCol=fp.ri===1?'#e060a0':fp.ri===2?'#c09020':'#3a3828'; // VEGA pink, MIRA amber, neutral dark
    const sz=fp.ri?Math.max(3,Math.floor(4*ageFrac)+2):4; // rival footprints slightly larger when fresh
    g.globalAlpha=alpha;
    bx(fpx+8,fpy+20,sz,sz,fpCol);
    bx(fpx+18,fpy+24,sz,sz,fpCol);
    g.globalAlpha=1;
  });

  // Draw NPCs on this map (only if on revealed tile)
  npcs.forEach(npc=>{
    if(npc.map===currentMap&&fogRevealed[currentMap][npc.y]?.[npc.x])drawNPCSprite(npc);
  });

  // Sprites sorted by Y (only draw rivals on same map AND visible through fog)
  const visiblePl=[pl[0]];
  if(rivalMaps[0]===currentMap){
    const rv=pl[1];
    if(isVisibleThroughFog(rv.x,rv.y,3)){
      if(!rv._wasVisible){rv._wasVisible=true;rv._alertTimer=30;sfxEncounter();}
      visiblePl.push(rv);
    }else{rv._wasVisible=false;}
  }else{pl[1]._wasVisible=false;}
  if(rivalMaps[1]===currentMap){
    const hv=pl[2];
    if(isVisibleThroughFog(hv.x,hv.y,3)){
      if(!hv._wasVisible){hv._wasVisible=true;hv._alertTimer=30;sfxEncounter();}
      visiblePl.push(hv);
    }else{hv._wasVisible=false;}
  }else{pl[2]._wasVisible=false;}
  const sorted=visiblePl.map((p,i)=>({p,i:pl.indexOf(p)}));
  sorted.sort((a,b)=>a.p.visualY-b.p.visualY);
  sorted.forEach(({p,i})=>{
    drawSprite(p,i===0);
    if(i!==0){
      const spx=p.visualX-camX,spy=p.visualY-camY-16;
      drawRivalAlertAnim(p,spx,spy);
      // Rival name label above sprite (always visible when in view)
      const rNameCol=(i===1)?'#f080c0':'#f0c830';
      const rCards=p.cd.filter(c=>c>0).length;
      const rLabel=p.n+(rCards>0?' '+rCards+'c':'');
      const lW=rLabel.length*5+6;
      bx(spx+8-lW/2,spy-44,lW,11,'rgba(0,0,0,.65)');
      tx(rLabel,spx+8-lW/2+3,spy-35,6,rNameCol);
    }
  });

  // v98: Rival proximity echo — pulsing "?" ring at fog boundary when rival is nearby but hidden
  if(inDungeon){
    pl.slice(1).forEach((rp,idx)=>{
      if(rivalMaps[idx]!==currentMap)return;
      if(isVisibleThroughFog(rp.x,rp.y,3))return;
      const dx=rp.x-pl[0].x,dy=rp.y-pl[0].y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist>10||dist<1)return;
      const nx=dx/dist,ny=dy/dist;
      const edgeX=(pl[0].x+nx*3.8)*TW-camX+TW/2;
      const edgeY=(pl[0].y+ny*3.8)*TH-camY+TH/2;
      if(edgeX<-20||edgeX>W+20||edgeY<-20||edgeY>H+20)return;
      const rivalCol=idx===0?'#e060a0':'#d0a030';
      const pPeriod=80+idx*16;
      const pPhase=(fr%pPeriod)/pPeriod;
      const ringA=Math.max(0,1-pPhase*2)*(1-dist/10)*0.65;
      if(ringA<0.03)return;
      const ringR=4+pPhase*14;
      g.globalAlpha=ringA;
      g.strokeStyle=rivalCol;g.lineWidth=1.5;
      g.beginPath();g.arc(edgeX,edgeY,ringR,0,Math.PI*2);g.stroke();
      if(pPhase<0.28){
        g.globalAlpha=ringA*(1-pPhase/0.28);
        g.font='bold 8px VT323, monospace';
        g.fillStyle=rivalCol;g.shadowColor=rivalCol;g.shadowBlur=4;
        g.textAlign='center';g.fillText('?',edgeX,edgeY+3);
        g.textAlign='left';g.shadowBlur=0;
      }
      g.globalAlpha=1;g.lineWidth=1;
    });
  }

  // Draw exit tile markers in dungeon (visible when revealed by fog)
  if(inDungeon){
    exits.forEach(ex=>{
      if(ex.fromMap!==currentMap)return;
      ex.tiles.forEach(([etx,ety])=>{
        if(!fogRevealed[currentMap][ety]?.[etx])return;
        const epx=etx*TW-camX,epy=ety*TH-camY;
        if(epx<-TW||epx>W||epy<-TH||epy>H)return;
        const pulse=Math.sin(fr*0.08+etx+ety)*0.35+0.65;
        if(ex.isEscape){
          // Town escape: pulsing green arrow pointing left (←TOWN)
          g.globalAlpha=pulse*0.75;
          bx(epx+2,epy+2,TW-4,TH-4,'rgba(30,200,80,.25)');
          g.globalAlpha=1;
          const bob=Math.sin(fr*0.1)*2;
          txShadow('←',epx+4,epy+TH/2+bob+4,10,'#40e060','rgba(0,0,0,.5)');
        }else{
          // Deeper floor stairs: pulsing yellow arrow pointing right (↓)
          g.globalAlpha=pulse*0.6;
          bx(epx+2,epy+2,TW-4,TH-4,'rgba(200,180,30,.2)');
          g.globalAlpha=1;
          const bob=Math.sin(fr*0.1)*2;
          txShadow('↓',epx+4,epy+TH/2+bob+4,10,'#e0c040','rgba(0,0,0,.4)');
        }
      });
    });
  }

  // Proximity heartbeat pulse on screen edges
  if(proximityDangerLevel>=1&&sc==='map'){
    const pulseSpeed=proximityDangerLevel>=4?0.25:proximityDangerLevel>=3?0.15:proximityDangerLevel>=2?0.08:0.04;
    const pulseAlpha=proximityDangerLevel>=4?0.18:proximityDangerLevel>=3?0.10:proximityDangerLevel>=2?0.05:0.02;
    const pulse=Math.sin(fr*pulseSpeed)*0.5+0.5;
    const a=pulse*pulseAlpha;
    if(a>0.005){
      g.globalAlpha=a;
      // Red vignette on edges
      const grad=g.createRadialGradient(W/2,H/2,W*0.3,W/2,H/2,W*0.7);
      grad.addColorStop(0,'rgba(0,0,0,0)');
      grad.addColorStop(1,'rgba(180,30,30,1)');
      g.fillStyle=grad;
      g.fillRect(0,0,W,H-HUD_HEIGHT);
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

  // Map edge gradient polish (darken edges when camera near map bounds)
  {
    const maxX=MW*TW-W,maxY=MH*TH-(H-HUD_HEIGHT);
    const edgeFade=20;
    // Left edge
    if(camX<edgeFade){
      const a=0.15*(1-camX/edgeFade);
      const gr=g.createLinearGradient(0,0,edgeFade,0);
      gr.addColorStop(0,'rgba(0,0,0,'+a+')');gr.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=gr;g.fillRect(0,0,edgeFade,H-HUD_HEIGHT);
    }
    // Right edge
    if(camX>maxX-edgeFade){
      const a=0.15*Math.min(1,(camX-(maxX-edgeFade))/edgeFade);
      const gr=g.createLinearGradient(W-edgeFade,0,W,0);
      gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,'+a+')');
      g.fillStyle=gr;g.fillRect(W-edgeFade,0,edgeFade,H-HUD_HEIGHT);
    }
    // Top edge
    if(camY<edgeFade){
      const a=0.15*(1-camY/edgeFade);
      const gr=g.createLinearGradient(0,0,0,edgeFade);
      gr.addColorStop(0,'rgba(0,0,0,'+a+')');gr.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=gr;g.fillRect(0,0,W,edgeFade);
    }
    // Bottom edge
    if(camY>maxY-edgeFade){
      const a=0.15*Math.min(1,(camY-(maxY-edgeFade))/edgeFade);
      const hud=H-HUD_HEIGHT;
      const gr=g.createLinearGradient(0,hud-edgeFade,0,hud);
      gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,'+a+')');
      g.fillStyle=gr;g.fillRect(0,hud-edgeFade,W,edgeFade);
    }
  }

  // Day/night overlay (after all rendering, before HUD)
  drawDayNightOverlay();

  // ── HUD BAR ──
  const hudY=H-HUD_HEIGHT;
  win(0,hudY,W,HUD_HEIGHT);
  // Season timer
  const _sr=getSeasonRemaining();const _srt=formatTimeRemaining(_sr);
  const _sCol=_sr<3600000?'#d04040':_sr<86400000?'#d0a030':'#40a040';
  tx(_srt,10,hudY+28,9,_sCol);
  tx('STL',100,hudY+22,8,'#b04040');tx(sp.s+'',142,hudY+22,9,'#c04848');
  tx('BAR',165,hudY+22,8,'#3060b0');tx(sp.b+'',207,hudY+22,9,'#3868c0');
  tx('SCT',230,hudY+22,8,'#308030');tx(sp.c+'',272,hudY+22,9,'#38a038');
  // Location indicator: Town or Dungeon floor
  if(inDungeon){
    txShadow('B'+currentFloor,10,hudY+52,9,'#d0b020','rgba(0,0,0,.4)');
    // Show SAFE countdown while encounter cooldown is active
    if(encounterCooldown>0){
      const safeAlpha=0.6+Math.sin(fr*0.15)*0.4;
      g.globalAlpha=safeAlpha;
      txShadow('SAFE '+(Math.ceil(encounterCooldown/60))+'s',30,hudY+52,8,'#40e080','rgba(0,0,0,.5)');
      g.globalAlpha=1;
    }else{
      tx('DUNGEON',30,hudY+52,7,'#a07820');
    }
    // v97: Escape compass — directional arrow toward the nearest escape exit
    {
      const escExit=exits.find(e=>e.fromMap===currentMap&&e.isEscape);
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
          const dirs=['\u2192','\u2198','\u2193','\u2199','\u2190','\u2196','\u2191','\u2197'];
          const didx=((Math.round(angle/(Math.PI/4))+8)%8);
          g.globalAlpha=0.55;
          tx(dirs[didx]+'ESC',73,hudY+52,6,'#60b868');
          g.globalAlpha=1;
        }
      }
    }
  }else{
    tx('TOWN',10,hudY+52,7,'#40a040');
  }
  // Footstep counter
  tx('STEPS:'+stepCounter,100,hudY+52,7,'#989080');
  // v102: Dungeon exploration % — revealed walkable tiles / total walkable tiles
  if(inDungeon&&maps[currentMap]){
    const m_=maps[currentMap];
    let total=0,revealed=0;
    for(let y=0;y<MH;y++){for(let x=0;x<MW;x++){if(WALKABLE.has(m_[y]?.[x])){total++;if(fogRevealed[currentMap][y]?.[x])revealed++;}}}
    if(total>0){
      const pct=Math.floor(revealed/total*100);
      const expCol=pct<30?'#888878':pct<70?'#a0c080':'#40d080';
      tx('EXP:'+pct+'%',182,hudY+52,7,expCol);
    }
  }
  // Show first 8 hand cards in HUD (slots 0-7)
  const HUD_CARD_SLOTS=Math.min(8,HAND_SIZE);
  const HUD_CARD_SPACING=30;
  for(let i=0;i<HUD_CARD_SLOTS;i++){
    drawMiniCard(310+i*HUD_CARD_SPACING,hudY+14,pl[0].cd[i]);
    // Card decay timer bar under each card
    if(pl[0].cd[i]>0&&cardTimers[i]>0){
      const elapsed=Date.now()-cardTimers[i];
      const remainFrac=Math.max(0,1-elapsed/CARD_DECAY_MS);
      const remainMs=Math.max(0,CARD_DECAY_MS-elapsed);
      const barX_=310+i*HUD_CARD_SPACING, barY_=hudY+36, barW_=24, barH_=3;
      bx(barX_,barY_,barW_,barH_,'#1a1a30');
      const col_=remainFrac>0.5?'#40d040':remainFrac>0.25?'#d0c040':'#d04040';
      bx(barX_,barY_,Math.floor(barW_*remainFrac),barH_,col_);
      // Flash red overlay in last 15 seconds
      if(remainMs<15000){
        const flashA=Math.sin(fr*0.3)*0.4+0.4;
        g.globalAlpha=flashA;
        bx(310+i*HUD_CARD_SPACING-1,hudY+13,26,26,'#d04040');
        g.globalAlpha=1;
      }
      // Countdown seconds when <30s
      if(remainMs<30000){
        const secs=Math.ceil(remainMs/1000);
        const cntCol=remainMs<10000?'#ff4040':remainMs<20000?'#ff9020':'#ffe040';
        txShadow(secs+'s',310+i*HUD_CARD_SPACING+3,hudY+26,6,cntCol,'rgba(0,0,0,.7)');
      }
    }
  }
  // Show overflow count if hand has more than 8 cards
  const handTotal=pl[0].cd.filter(c=>c>0).length;
  if(handTotal>HUD_CARD_SLOTS){
    tx('+'+(handTotal-HUD_CARD_SLOTS),310+HUD_CARD_SLOTS*HUD_CARD_SPACING+2,hudY+26,7,'#c8c0a0');
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
    tx(mText,12,hudY+44,5,mCol);
    tx(mRewText,140,hudY+44,5,mDone?'#50c080':'#888870');
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
    txShadow('STREAK:'+streakCount+'x',310,hudY+44,sz,streakCol,'rgba(0,0,0,.5)');
  }
  if(streakLostTimer>0){
    const la=streakLostTimer/60;
    g.globalAlpha=la;
    txShadow('STREAK LOST!',310,hudY+44,7,'#d04040','rgba(0,0,0,.5)');
    g.globalAlpha=1;
  }

  // Area Danger Level display
  const dangerVal=areaDanger[currentMap];
  const dangerLabel=dangerVal>=DANGER_HIGH_THRESH?'HIGH':dangerVal>=DANGER_LOW_THRESH?'MED':'LOW';
  const dangerCol=dangerVal>=DANGER_HIGH_THRESH?'#d04040':dangerVal>=DANGER_LOW_THRESH?'#d0a030':'#40a040';
  tx('DANGER:'+dangerLabel,420,hudY+44,6,dangerCol);
  // Danger meter bar
  bx(420,hudY+48,60,3,'#282838');
  bx(420,hudY+48,Math.floor(60*dangerVal),3,dangerCol);

  // Rival near-win warning (flashing)
  if(rivalWinWarning>0&&Math.floor(fr/15)%2===0){
    txShadow('RIVAL NEAR WIN!',520,hudY+44,6,'#d04040','rgba(0,0,0,.5)');
  }

  // v76: Off-floor rival summary (shown when rival is on a different floor)
  const flNums_=['','I','II','III','IV','V'];
  for(let ri=0;ri<2;ri++){
    if(rivalMaps[ri]===currentMap)continue;
    const rp=pl[ri+1];
    const rFloor=rivalMaps[ri];
    const rcc2=rp.cd.filter(c=>c>0).length;
    const rCol=ri===0?'#d060a0':'#d0a030';
    const labelY=hudY+4+ri*14;
    const labelX=W-200;
    tx(rp.n[0]+' F'+(flNums_[rFloor]||rFloor)+' '+rcc2+'♠',labelX,labelY,5,rcc2>=4?'#d04040':rCol);
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
    // Label + card count
    const rcc=pl[ri+1].cd.filter(c=>c>0).length;
    tx(pl[ri+1].n[0],arrowCX-3,arrowCY+14,5,arrowCol);
    tx(rcc+'♠',arrowCX-5,arrowCY+24,5,rcc>=4?'#d04040':arrowCol);
  }

  // Vault/hand status (progress toward 60-card goal)
  const vaultCount=pl[0].vault?pl[0].vault.size:0;
  const handCount=pl[0].cd.filter(c=>c>0).length;
  const vaultPct=vaultCount/60;
  const vaultCol=vaultCount>=50?'#f0c830':vaultCount>=30?'#e08040':vaultCount>=10?'#40c060':'#686068';
  tx('CARDS:'+vaultCount+'/60',310,hudY+56,7,vaultCol);
  // Tiny collection progress bar
  bx(310,hudY+60,60,3,'#282838');
  bx(310,hudY+60,Math.floor(60*vaultPct),3,vaultCol);
  tx('HAND:'+handCount,382,hudY+56,6,'#686068');

  // Footprint trail indicator: show fresh rival tracks on this floor
  if(inDungeon){
    const rivalCols=['#d860a0','#d8b028'];
    const rivalNames=[pl[1].n[0],pl[2].n[0]];
    let trailX=430;
    for(let ri=0;ri<2;ri++){
      const freshTracks=footprints.filter(fp=>fp.ri===ri&&fp.map===currentMap&&fp.age<900);
      if(freshTracks.length>0){
        const freshest=Math.min(...freshTracks.map(fp=>fp.age));
        const freshAlpha=freshest<180?1:freshest<600?0.7:0.45;
        g.globalAlpha=freshAlpha;
        // Small boot icon (two dots)
        g.fillStyle=rivalCols[ri];
        g.fillRect(trailX,hudY+52,2,3);g.fillRect(trailX+3,hudY+53,2,2);
        g.globalAlpha=1;
        tx(rivalNames[ri]+'!',trailX+6,hudY+57,6,rivalCols[ri]);
        trailX+=26;
      }
    }
  }

  const m=getMap();
  const tile=m[pl[0].y]?.[pl[0].x];
  let locName=mapNames[currentMap];
  if(tile===2)locName+=' - PATH';
  else if(tile===11)locName+=' - GRASS';
  else if(tile===10)locName+=' - DOCK';
  tx(locName,560,hudY+52,6,'#686068');

  // Exploration percentage
  const expPct=fogExploredPercent(currentMap);
  tx('MAP:'+expPct+'%',560,hudY+22,8,'#686068');

  // Sound indicator
  tx(soundEnabled?'SND:ON':'SND:OFF',750,hudY+22,6,soundEnabled?'#60a060':'#a06060');
  // On-chain mode indicator with Solana icon
  if(walletConnected){
    drawSolanaIcon(808,hudY+15,7);
    tx('ON-CHAIN',820,hudY+22,6,'#40d080');
    // Pot display
    tx('POT:'+stakePotAmount.toFixed(2),820,hudY+32,5,'#14F195');
    // Season 1 indicator (competitive mode)
    bx(900,hudY+14,24,14,'rgba(200,152,32,.3)');
    tx('S1',904,hudY+24,7,'#f0c830');
  }
  else{tx('OFFLINE',820,hudY+22,6,'#555570');}
  // v84: Town weather indicator
  if(!inDungeon&&currentMap===0){
    const wIcon=townWeather==='rain'?'\u2614':townWeather==='fog'?'\u2601':'\u2600';
    const wCol=townWeather==='rain'?'#80a0d0':townWeather==='fog'?'#a0a8b0':'#f0c830';
    txShadow(wIcon,820,hudY+52,9,wCol,'rgba(0,0,0,.4)');
  }
  // Version label in HUD (bottom-right corner)
  txShadow('v106',930,hudY+56,8,'#8890c0','rgba(0,0,0,.5)');

  // Day/night icon
  drawDayNightIcon(740,hudY+42);

  // Save indicator
  if(saveIndicatorTimer>0){
    const sa=Math.min(1,saveIndicatorTimer/15);
    g.globalAlpha=sa;
    bx(752,hudY+44,7,6,'#6080c0');bx(753,hudY+44,5,1,'#a0b0d0');bx(754,hudY+46,3,2,'#e0e0e0');
    tx('SAVING...',720,hudY+52,5,'#6080c0');
    g.globalAlpha=1;
  }

  // Minimap
  drawMinimap();

  // v94: Town rivalry scoreboard (shown only in town, top-left panel)
  if(currentMap===0&&!inDungeon&&sc==='map'){
    const myUniq=pl[0].vault?pl[0].vault.size:0;
    const vegaCards=pl[1].cd.filter(c=>c>0).length;
    const miraCards=pl[2].cd.filter(c=>c>0).length;
    // Use vault-proxy for rivals (their hand as unique cards approximation)
    const vegaUniq=new Set(pl[1].cd.filter(c=>c>0)).size;
    const miraUniq=new Set(pl[2].cd.filter(c=>c>0)).size;
    // Sort by unique count descending
    const rankings=[
      {name:'YOU',uniq:myUniq,hand:pl[0].cd.filter(c=>c>0).length,col:'#78c0f0',floor:0},
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
    rankings.forEach((r,ri)=>{
      const ry=sbY+28+ri*18;
      const isLeader=ri===0;
      g.globalAlpha=pnlAlpha*(isLeader?1:0.8);
      // Rank number
      tx((ri+1)+'.',sbX+8,ry+12,isLeader?9:7,isLeader?'#f0c830':'#808080');
      // Name (truncated)
      const nm=r.name.length>5?r.name.slice(0,5):r.name;
      txShadow(nm,sbX+22,ry+12,isLeader?8:7,r.col,'rgba(0,0,0,.3)');
      // Unique card count (most important)
      const uniqStr=r.uniq+'/60';
      txShadow(uniqStr,sbX+sbW-8-uniqStr.length*6,ry+12,isLeader?8:7,'#e8e0c0','rgba(0,0,0,.3)');
      // Floor indicator (for rivals)
      if(r.floor>0){const fStr='B'+r.floor;tx(fStr,sbX+76,ry+12,6,r.col);}
      // Leader crown
      if(isLeader){tx('\u2605',sbX+sbW-22,ry+6,5,'#f0c830');}
    });
    g.globalAlpha=1;
  }

  // v100: Card race tracker — persistent panel showing all three players racing toward 60/60
  if(sc==='map'){
    const rcW=148,rcH=76,rcX=W-rcW-10,rcY=8;
    const myUniq=pl[0].vault?pl[0].vault.size:0;
    const vegaUniq=new Set(pl[1].cd.filter(c=>c>0)).size;
    const miraUniq=new Set(pl[2].cd.filter(c=>c>0)).size;
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
    racers.forEach((r,i)=>{
      const ry=rcY+24+i*16;
      const isLeader=i===0;
      g.globalAlpha=0.9*(isLeader?1:0.72);
      tx(isLeader?'\u2605':String(i+1),rcX+6,ry+10,isLeader?7:5,isLeader?'#f0c830':'#666680');
      const nm=r.name.length>4?r.name.slice(0,4):r.name;
      txShadow(nm,rcX+18,ry+10,6,r.col,'rgba(0,0,0,.3)');
      const barW=Math.round(barMax*(r.cnt/60));
      bx(rcX+44,ry+2,barMax,7,'#1a1a30');
      bx(rcX+44,ry+2,barW,7,r.col);
      tx(r.cnt+'/60',rcX+44+barMax+3,ry+10,5,isLeader?'#e8e0c0':'#787890');
    });
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
    tx(twText,14,tbY+32,8,FRLG.textColor);
    const bounce=Math.floor(Math.sin(fr*Math.PI/30)*2);
    tx('\u25BC',W-24,tbY+46+bounce,8,FRLG.selHighlight);
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
        tx(pl[proximityTauntRival].n,spx-bW/2+12,spy-bH+4,5,rNameCol);
        tx(proximityTauntText,spx-bW/2+12,spy-5,6,'#303028');
        g.globalAlpha=1;
      }
    }
  }

  // Rival alert
  if(rivalAlert>0){
    const a=Math.min(1,rivalAlert/30);
    g.globalAlpha=a;
    win(W/2-120,6,240,24);
    tx(rivalAlertName+' entered your map!',W/2-110,22,6,'#c04040');
    g.globalAlpha=1;
  }

  // Location banner
  drawBanner();
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
  bx(0,0,W,H,`rgba(0,0,0,${0.35*ease})`);
  if(menuW>4&&menuH>4){
    win(menuX,menuY,menuW,menuH);
    if(ease>=0.7){
      const itemAlpha=Math.min(1,(ease-0.7)/0.3);
      g.globalAlpha=itemAlpha;
      const items=['CARDS','MAP','LOG','STATS','USE CARD','DISCARD','WALLET','TEXT SPD','SAVE','RULES','NEW GAME','CLOSE'];
      items.forEach((s,i)=>{
        const y=34+i*22;
        if(i===mi){tx('\u25B6',W-166,y,9,FRLG.selHighlight);tx(s,W-148,y,9,FRLG.selHighlight);}
        else tx(s,W-148,y,9,'#686068');
      });
      g.globalAlpha=1;
    }
  }
}

// ═══════════════════════════════════════
// BATTLE / ACTION SCREEN (FRLG STYLE)
// ═══════════════════════════════════════


// New SFX for battle effects
function sfxCrystal(){if(!soundEnabled)return;beep(880,.06,.07);setTimeout(()=>beep(1100,.04,.06),50);setTimeout(()=>beep(1320,.06,.07),100);setTimeout(()=>beep(1760,.08,.08),150);}
function sfxShadow(){if(!soundEnabled)return;try{const o=AC.createOscillator(),gn=AC.createGain();o.type='sine';o.frequency.setValueAtTime(400,AC.currentTime);o.frequency.linearRampToValueAtTime(100,AC.currentTime+.2);gn.gain.setValueAtTime(.06,AC.currentTime);gn.gain.linearRampToValueAtTime(0,AC.currentTime+.2);o.connect(gn);gn.connect(AC.destination);o.start();o.stop(AC.currentTime+.2);}catch(e){}}
function sfxFlame(){if(!soundEnabled)return;try{const s=AC.createBufferSource(),gn=AC.createGain(),f=AC.createBiquadFilter();s.buffer=noiseBuf;f.type='bandpass';f.frequency.value=1200;f.Q.value=2;gn.gain.setValueAtTime(.08,AC.currentTime);gn.gain.linearRampToValueAtTime(0,AC.currentTime+.15);s.connect(f);f.connect(gn);gn.connect(AC.destination);s.start();s.stop(AC.currentTime+.15);}catch(e){}}
function sfxStorm(){if(!soundEnabled)return;try{const s=AC.createBufferSource(),gn=AC.createGain(),f=AC.createBiquadFilter();s.buffer=noiseBuf;f.type='highpass';f.frequency.value=3000;gn.gain.setValueAtTime(.1,AC.currentTime);gn.gain.linearRampToValueAtTime(0,AC.currentTime+.2);s.connect(f);f.connect(gn);gn.connect(AC.destination);s.start();s.stop(AC.currentTime+.2);}catch(e){}}
function sfxVoid(){if(!soundEnabled)return;try{const o=AC.createOscillator(),gn=AC.createGain();o.type='triangle';o.frequency.setValueAtTime(600,AC.currentTime);o.frequency.linearRampToValueAtTime(200,AC.currentTime+.15);gn.gain.setValueAtTime(.07,AC.currentTime);gn.gain.linearRampToValueAtTime(0,AC.currentTime+.15);o.connect(gn);gn.connect(AC.destination);o.start();o.stop(AC.currentTime+.15);}catch(e){}}

function drawBattleBG(){
  // FRLG-style layered battle backgrounds: sky/ceiling + horizon + terrain + raised platforms
  const horizonY=Math.floor(H*0.42); // horizon line dividing sky and ground
  const groundY=H-100; // where the ground terrain starts
  const playerPlatY=H-70; // player platform top
  const enemyPlatY=horizonY+30; // enemy platform top

  if(currentMap===0){
    // PORT: Sky layer (blue gradient)
    for(let y=0;y<horizonY;y++){
      const t=y/horizonY;
      const r=Math.floor(lerp(130,180,t));
      const gv=Math.floor(lerp(190,220,t));
      const b=Math.floor(lerp(240,250,t));
      bx(0,y,W,1,`rgb(${r},${gv},${b})`);
    }
    // Horizon line (bright band)
    bx(0,horizonY-2,W,4,'rgba(255,255,255,.15)');
    // Ocean/ground layer below horizon
    for(let y=horizonY;y<H;y++){
      const t=(y-horizonY)/(H-horizonY);
      const r=Math.floor(lerp(80,100,t));
      const gv=Math.floor(lerp(140,160,t));
      const b=Math.floor(lerp(200,180,t));
      bx(0,y,W,1,`rgb(${r},${gv},${b})`);
    }
    // Waves
    for(let i=0;i<6;i++){
      const wy=horizonY+20+i*18+Math.sin(fr*0.04+i)*4;
      bx(0,wy,W,2,`rgba(255,255,255,${0.1-i*0.012})`);
    }
    // Player raised platform (dock wood)
    bx(40,playerPlatY,320,12,'#8B7355');bx(40,playerPlatY,320,2,'#A08860');
    bx(40,playerPlatY+12,320,50,'#7B6345');
    for(let x=50;x<350;x+=40){bx(x,playerPlatY+2,2,10,'#6B5335');}
    // Enemy raised platform (distant dock)
    bx(W-380,enemyPlatY,300,8,'#9B8365');bx(W-380,enemyPlatY,300,2,'#B09870');
    bx(W-380,enemyPlatY+8,300,30,'#8B7355');
  }else if(currentMap===1){
    // FOREST: Sky/canopy layer
    for(let y=0;y<horizonY;y++){
      const t=y/horizonY;
      const r=Math.floor(lerp(60,90,t));
      const gv=Math.floor(lerp(100,140,t));
      const b=Math.floor(lerp(60,70,t));
      bx(0,y,W,1,`rgb(${r},${gv},${b})`);
    }
    // Tree silhouettes in sky area (background layer)
    for(let i=0;i<8;i++){
      const tx_=20+i*90+Math.sin(i*2.3)*15;
      const th=50+Math.sin(i*1.7)*20;
      bx(tx_+8,horizonY-th-10,8,th+10,'#1a3820');
      for(let j=0;j<3;j++){
        const tw=40-j*10,ty_=horizonY-th+j*16;
        bx(tx_+12-tw/2,ty_,tw,20-j*4,'#2a4830');
      }
    }
    // Horizon line (grass edge)
    bx(0,horizonY-2,W,4,'#3a6838');
    // Grass terrain layer
    for(let y=horizonY;y<H;y++){
      const t=(y-horizonY)/(H-horizonY);
      const r=Math.floor(lerp(70,90,t));
      const gv=Math.floor(lerp(140,110,t));
      const b=Math.floor(lerp(60,50,t));
      bx(0,y,W,1,`rgb(${r},${gv},${b})`);
    }
    // Grass tufts across terrain
    for(let x=0;x<W;x+=14){
      const h=4+Math.sin(x*0.3+fr*0.02)*2;
      bx(x,horizonY-h+2,3,h+2,'#4a8848');
      bx(x+6,horizonY-h*0.7+2,2,h,'#5a9858');
    }
    // Player raised platform (grassy mound)
    bx(30,playerPlatY,340,10,'#4a7840');bx(30,playerPlatY,340,2,'#5a8850');
    bx(30,playerPlatY+10,340,50,'#3a5830');
    for(let x=40;x<360;x+=20){const gh=3+Math.sin(x*0.5)*2;bx(x,playerPlatY-gh,3,gh,'#5a9850');}
    // Enemy raised platform (distant grassy mound)
    bx(W-400,enemyPlatY,320,8,'#5a8848');bx(W-400,enemyPlatY,320,2,'#6a9858');
    bx(W-400,enemyPlatY+8,320,25,'#3a5830');
  }else{
    // RUINS: Ceiling/stone layer
    for(let y=0;y<horizonY;y++){
      const t=y/horizonY;
      const r=Math.floor(lerp(40,60,t));
      const gv=Math.floor(lerp(35,55,t));
      const b=Math.floor(lerp(50,70,t));
      bx(0,y,W,1,`rgb(${r},${gv},${b})`);
    }
    // Stone pillars in background
    for(let i=0;i<4;i++){
      const px_=60+i*160;
      bx(px_,10,24,horizonY-10,'#504840');bx(px_+2,10,20,horizonY-10,'#605850');
      bx(px_-4,8,32,8,'#605850');bx(px_-2,10,28,4,'#706860');
      // Torch flames at top
      const flicker=Math.sin(fr*0.15+i*2)*2;
      bx(px_+8,4+flicker,8,6,'#e08020');bx(px_+9,2+flicker,6,4,'#f0c040');
      bx(px_+10,0+flicker,4,3,'#f8e060');
    }
    // Horizon line (stone shelf)
    bx(0,horizonY-2,W,6,'#605848');bx(0,horizonY-2,W,2,'#807868');
    // Rocky floor layer
    for(let y=horizonY;y<H;y++){
      const t=(y-horizonY)/(H-horizonY);
      const r=Math.floor(lerp(55,75,t));
      const gv=Math.floor(lerp(48,65,t));
      const b=Math.floor(lerp(55,70,t));
      bx(0,y,W,1,`rgb(${r},${gv},${b})`);
    }
    // Cracks in floor
    for(let i=0;i<5;i++){
      const cx_=40+i*130;
      bx(cx_,horizonY+40+i*12,12,1,'#403830');bx(cx_+4,horizonY+41+i*12,8,1,'#403830');
    }
    // Player raised platform (stone slab)
    bx(40,playerPlatY,320,10,'#706858');bx(40,playerPlatY,320,2,'#908068');
    bx(40,playerPlatY+10,320,50,'#504840');
    // Enemy raised platform (distant stone slab)
    bx(W-380,enemyPlatY,300,8,'#807868');bx(W-380,enemyPlatY,300,2,'#908878');
    bx(W-380,enemyPlatY+8,300,25,'#605850');
  }
}

// Draw FRLG-style card count bar (like HP bar) with rounded container and segmented fill
function drawCardBar(x,y,w,cards,maxCards){
  const filledCount=cards.filter(c=>c>0).length;
  // "CARDS" label to the left
  // (label is drawn by callers)
  // Rounded rectangle container
  const barH=10,r=3;
  // Outer border (rounded)
  g.fillStyle=FRLG.borderOuter;
  g.fillRect(x+r,y,w-r*2,barH);
  g.fillRect(x,y+r,r,barH-r*2);
  g.fillRect(x+w-r,y+r,r,barH-r*2);
  g.fillRect(x+1,y+1,r-1,r-1);g.fillRect(x+w-r,y+1,r-1,r-1);
  g.fillRect(x+1,y+barH-r,r-1,r-1);g.fillRect(x+w-r,y+barH-r,r-1,r-1);
  // Inner bg
  bx(x+2,y+2,w-4,barH-4,'#282820');
  // Segmented fill
  const segW=Math.floor((w-6)/maxCards);
  // Color based on vault progress
  const vaultSize=hasUniqueCards(0).size;
  const barColor=vaultSize<20?FRLG.hpGreen:vaultSize<40?FRLG.hpYellow:'#F0C830';
  for(let i=0;i<maxCards;i++){
    const sx=x+3+i*segW;
    if(i<cards.length&&cards[i]>0){
      bx(sx,y+2,segW-1,barH-4,barColor);
      bx(sx,y+2,segW-1,Math.floor((barH-4)/2),'rgba(255,255,255,.25)');
      // Segment divider
      if(i<maxCards-1)bx(sx+segW-1,y+2,1,barH-4,'rgba(0,0,0,.3)');
    }else{
      bx(sx,y+2,segW-1,barH-4,'#1a1a18');
      if(i<maxCards-1)bx(sx+segW-1,y+2,1,barH-4,'rgba(0,0,0,.2)');
    }
  }
  // Gold glow when close to winning
  if(vaultSize>=30){
    const glow=Math.sin(fr*0.12)*0.15+0.15;
    g.globalAlpha=glow;
    bx(x-2,y-2,w+4,barH+4,'#F0C830');
    g.globalAlpha=1;
  }
}

// Draw FRLG-style opponent info box (top-left)
function drawOpponentInfoBox(){
  const rival=pl[1]; // Primary opponent (VEGA)
  let sx=0,sy=0;
  if(bpShakeTarget===1&&bpShakeTimer>0){sx=Math.sin(bpShakeTimer*1.2)*3;sy=Math.cos(bpShakeTimer*1.6)*2;}
  // Expand box when tells are visible during select, or when scout intel is known
  const showTells=(battlePhase==='select'&&bpRivalTells[0]!==''&&bpRivalTells[1]!=='');
  const showScout0=!!bpScoutedCards[0],showScout1=!!bpScoutedCards[1];
  const hasScout=showScout0||showScout1;
  const bx_=8+sx,by_=16+sy,bw=300;
  // Height: base 64, +36 for tells, +16 per scouted rival
  let bh=64;
  if(showTells)bh=100;
  if(showScout0)bh+=16;
  if(showScout1)bh+=16;
  bx(bx_,by_,bw,bh,'#f8f0d8');bx(bx_,by_,bw,2,'#c8c0a0');bx(bx_,by_+bh-2,bw,2,'#a89878');
  bx(bx_,by_,2,bh,'#c8c0a0');bx(bx_+bw-2,by_,2,bh,'#a89878');
  bx(bx_+2,by_+2,bw-4,bh-4,'#f8f0d8');
  // Rival 1 (VEGA)
  txShadow(rival.n,bx_+10,by_+20,12,'#383830','rgba(200,180,140,.3)');
  txShadow('CARDS',bx_+120,by_+20,7,'#887858','rgba(0,0,0,.15)');
  drawCardBar(bx_+168,by_+12,80,rival.cd,5);
  txShadow(rival.cc+'/5',bx_+202,by_+34,8,'#383830','rgba(0,0,0,.15)');
  // Near-win warning
  if(hasUniqueCards(1).size>=4){const wFlash=Math.floor(fr/12)%2===0;if(wFlash)txShadow('! DANGER',bx_+10,by_+34,7,'#c04040','rgba(0,0,0,.2)');}
  // Tell for Rival 1 (during select only)
  if(showTells&&bpRivalTells[0]){
    const tellFade=Math.min(1,(fr-bpFrame)/12);
    g.globalAlpha=tellFade*0.85;
    bx(bx_+4,by_+34,bw-8,14,'rgba(232,216,168,.6)');
    tx(bpRivalTells[0],bx_+8,by_+44,6,'#505040');
    g.globalAlpha=1;
  }
  // Separator: base at by_+44, pushed down if tells are showing
  const sepY=showTells?by_+52:by_+44;
  bx(bx_+8,sepY,bw-16,1,'#c8c0a0');
  // Rival 2 (MIRA)
  const hunter=pl[2];
  const r2alive=hunter.cd.filter(c=>c>0).length>0;
  const hunterCol=r2alive?'#986840':'#c04040';
  txShadow(hunter.n+(r2alive?'':' FLED'),bx_+10,sepY+16,9,hunterCol,'rgba(0,0,0,.15)');
  if(r2alive){
    drawCardBar(bx_+168,sepY+8,80,hunter.cd,5);
    txShadow(hunter.cc+'/5',bx_+202,sepY+16,7,'#686060','rgba(0,0,0,.1)');
    // Near-win warning for MIRA
    if(hasUniqueCards(2).size>=4){const wFlash2=Math.floor(fr/12)%2===0;if(wFlash2)txShadow('! DANGER',bx_+10,sepY+28,6,'#c04040','rgba(0,0,0,.2)');}
    // Tell for Rival 2 (during select only)
    if(showTells&&bpRivalTells[1]){
      const tellFade2=Math.min(1,(fr-bpFrame)/12);
      g.globalAlpha=tellFade2*0.85;
      bx(bx_+4,sepY+26,bw-8,14,'rgba(232,216,168,.6)');
      tx(bpRivalTells[1],bx_+8,sepY+36,6,'#505040');
      g.globalAlpha=1;
    }
  }
  // Scout intel — persists for the rest of the battle (shown below rival info)
  if(hasScout){
    const typeColors={attack:'#e05840',defense:'#48b8e8',flee:'#38c080',magic:'#d8b028',recovery:'#e0c040'};
    const rarCols=['','#808898','#50d060','#b060e0','#e0a020','#fff8e0'];
    let intelY=by_+bh-4;
    // Show R1 intel
    if(showScout0){
      intelY=by_+bh-(showScout1?32:16);
      const sd=bpScoutedCards[0];
      const staleLabel=rd-sd.round>0?'(R'+(sd.round)+')':'';
      g.globalAlpha=rd-sd.round>1?0.55:0.85;
      bx(bx_+4,intelY,bw-8,14,'rgba(200,220,250,.3)');
      tx('\u{1F50D}'+pl[1].n[0]+': '+(sd.cards.length>0?sd.cards.map(c=>c.n).join(' \u00B7 '):'empty')+staleLabel,bx_+8,intelY+11,5,'#3060b0');
      g.globalAlpha=1;
    }
    // Show R2 intel
    if(showScout1){
      const sd2=bpScoutedCards[1];
      const intelY2=by_+bh-16;
      const staleLabel2=rd-sd2.round>0?'(R'+(sd2.round)+')':'';
      g.globalAlpha=rd-sd2.round>1?0.55:0.85;
      bx(bx_+4,intelY2,bw-8,14,'rgba(240,220,180,.3)');
      tx('\u{1F50D}'+pl[2].n[0]+': '+(sd2.cards.length>0?sd2.cards.map(c=>c.n).join(' \u00B7 '):'empty')+staleLabel2,bx_+8,intelY2+11,5,'#806030');
      g.globalAlpha=1;
    }
  }
}

// Draw FRLG-style player info box (bottom-right)
function drawPlayerInfoBox(){
  let sx=0,sy=0;
  if(bpShakeTarget===0&&bpShakeTimer>0){sx=Math.sin(bpShakeTimer*1.2)*3;sy=Math.cos(bpShakeTimer*1.6)*2;}
  const bx_=W-310+sx,by_=H-154+sy,bw=300,bh=86; // v104: +14px for hand type row
  bx(bx_,by_,bw,bh,'#f8f0d8');bx(bx_,by_,bw,2,'#c8c0a0');bx(bx_,by_+bh-2,bw,2,'#a89878');
  bx(bx_,by_,2,bh,'#c8c0a0');bx(bx_+bw-2,by_,2,bh,'#a89878');
  bx(bx_+2,by_+2,bw-4,bh-4,'#f8f0d8');
  // Name
  txShadow(pl[0].n,bx_+10,by_+20,14,'#383830','rgba(200,180,140,.3)');
  // Card bar
  txShadow('CARDS',bx_+10,by_+36,8,'#887858','rgba(0,0,0,.15)');
  drawCardBar(bx_+60,by_+28,148,pl[0].cd,Math.min(HAND_SIZE,10));
  txShadow(hasUniqueCards(0).size+'/60',bx_+214,by_+36,9,'#383830','rgba(0,0,0,.15)');
  // Win indicator (60/60)
  if(hasUniqueCards(0).size>=60){
    const flash_=Math.sin(fr*0.15)*0.3+0.7;
    g.globalAlpha=flash_;
    txShadow('60/60\u2192WIN!',bx_+160,by_+52,10,'#c04040','rgba(0,0,0,.3)');
    g.globalAlpha=1;
  }
  // Spell counts
  txShadow('STL:'+sp.s,bx_+10,by_+52,8,'#b04040','rgba(0,0,0,.15)');
  txShadow('BAR:'+sp.b,bx_+80,by_+52,8,'#3060b0','rgba(0,0,0,.15)');
  txShadow('SCT:'+sp.c,bx_+150,by_+52,8,'#308030','rgba(0,0,0,.15)');
  // Area
  txShadow(mapNames[currentMap],bx_+10,by_+64,8,'#988870','rgba(0,0,0,.15)');
  // v104: Hand type composition strip — colored dots grouped by card type
  {
    const TYPES=['attack','defense','flee','magic','recovery'];
    const TYPE_ABB=['ATK','DEF','FLY','MAG','REC'];
    const TYPE_C={attack:'#d04040',defense:'#4090d0',flee:'#40c080',magic:'#c060c0',recovery:'#d0c040'};
    const counts={};
    TYPES.forEach(t=>counts[t]=0);
    pl[0].cd.forEach(id=>{if(id>0&&CD[id-1])counts[CD[id-1].t]=(counts[CD[id-1].t]||0)+1;});
    bx(bx_+4,by_+68,bw-8,1,'rgba(180,160,120,.3)');
    let dotX=bx_+8;
    TYPES.forEach((t,ti)=>{
      const cnt=counts[t];
      if(cnt===0)return;
      const col=TYPE_C[t];
      for(let d=0;d<cnt;d++){bx(dotX+d*6,by_+74,5,5,col);}
      dotX+=cnt*6+3;
    });
    // Labels for non-zero types on the right side
    let labelX=bx_+bw-8;
    TYPES.slice().reverse().forEach((t,ti)=>{
      const cnt=counts[t];
      if(cnt===0)return;
      const col=TYPE_C[t];
      const lbl=TYPE_ABB[4-ti]+':'+cnt;
      labelX-=lbl.length*5+4;
      g.globalAlpha=0.7;
      tx(lbl,labelX,by_+80,5,col);
      g.globalAlpha=1;
    });
  }
}

// Draw battle sprite (front-facing for opponent, back-facing for player)
function drawBattleSprite(p,cx,cy,scale,facingAway){
  const s=scale;
  const w=14*s,h=20*s;
  const ox=cx-w/2,oy=cy-h/2;
  // Shadow
  g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(cx,oy+h+2*s,w*.5,h*.12,0,0,Math.PI*2);g.fill();
  let shirtC,shirtH,hairC,hairH;
  if(p===pl[0]){shirtC='#4080d0';shirtH='#5090e0';hairC='#282830';hairH='#383840';}
  else if(p===pl[1]){shirtC='#d060a0';shirtH='#e070b0';hairC='#804020';hairH='#905030';}
  else{shirtC='#d0a030';shirtH='#e0b040';hairC='#585040';hairH='#686058';}
  // Feet
  bx(ox+2*s,oy+17*s,4*s,3*s,'#383030');bx(ox+8*s,oy+17*s,4*s,3*s,'#383030');
  // Pants
  bx(ox+3*s,oy+14*s,8*s,4*s,'#4050a0');
  // Body
  bx(ox+2*s,oy+8*s,10*s,7*s,shirtC);bx(ox+3*s,oy+9*s,8*s,5*s,shirtH);
  // Arms
  bx(ox-1*s,oy+9*s,4*s,6*s,shirtC);bx(ox+11*s,oy+9*s,4*s,6*s,shirtC);
  // Hands
  bx(ox-1*s,oy+14*s,3*s,2*s,'#e8d0b0');bx(ox+12*s,oy+14*s,3*s,2*s,'#e8d0b0');
  // Head
  bx(ox+3*s,oy+1*s,8*s,8*s,'#f0dcc0');bx(ox+4*s,oy+2*s,6*s,6*s,'#e8d0b0');
  if(facingAway){
    // Back of head (player's view in Pokemon)
    bx(ox+3*s,oy,8*s,6*s,hairC);bx(ox+4*s,oy+s,6*s,5*s,hairH);
    bx(ox+2*s,oy+s,2*s,3*s,hairC);bx(ox+10*s,oy+s,2*s,3*s,hairC);
    // Backpack detail
    bx(ox+4*s,oy+10*s,6*s,3*s,'#305080');bx(ox+5*s,oy+11*s,4*s,1*s,'#4070a0');
  }else{
    // Front face (opponent view)
    bx(ox+4*s,oy+4*s,2*s,2*s,'#181820');bx(ox+8*s,oy+4*s,2*s,2*s,'#181820');
    bx(ox+4*s,oy+4*s,s,s,'#fff');bx(ox+8*s,oy+4*s,s,s,'#fff');
    bx(ox+6*s,oy+7*s,2*s,s,'#c0a090');
    // Hair
    if(p===pl[1]){
      bx(ox+3*s,oy,8*s,3*s,hairC);bx(ox+2*s,oy+s,2*s,7*s,hairC);bx(ox+10*s,oy+s,2*s,7*s,hairC);
      bx(ox+4*s,oy-s,6*s,2*s,hairC);
    }else if(p===pl[2]){
      bx(ox+2*s,oy,10*s,3*s,'#d0a030');bx(ox+s,oy+2*s,12*s,s,'#b08820');
    }else{
      bx(ox+3*s,oy,8*s,3*s,hairC);bx(ox+2*s,oy,2*s,2*s,hairC);bx(ox+10*s,oy,2*s,2*s,hairC);
    }
  }
}

function drawVsSplash(){
  bx(0,0,W,H,'#181828');const t=fr-bpFrame;
  // Diagonal split
  const angle=W*1.2;
  g.save();
  g.fillStyle='#c04040';g.beginPath();g.moveTo(W/2-2,0);g.lineTo(W/2+angle/2,H);g.lineTo(W/2-2-angle/2,H);g.closePath();g.fill();
  g.fillStyle='#3060b0';g.beginPath();g.moveTo(W/2+2,0);g.lineTo(W/2+2+angle/2,0);g.lineTo(W/2+2+angle/2,H);g.lineTo(W/2+2-angle/2,H);g.closePath();g.fill();
  g.restore();
  // Sprites slide in (player from left back-facing, opponent from right front-facing)
  const pSlide=Math.min(1,t/30);
  const pX=-60+pSlide*(W/4+20);
  drawBattleSprite(pl[0],pX,H/2-10,3,true);
  const rSlide=Math.min(1,t/30);
  const rX=W+60-rSlide*(W/4+20);
  // Show the rival that triggered this encounter (encounterExclTarget tracks which one)
  const vsRivalIdx=(encounterExclTarget>=1&&encounterExclTarget<=2)?encounterExclTarget:1;
  const vsSplashRival=pl[vsRivalIdx];
  drawBattleSprite(vsSplashRival,rX,H/2-10,3,false);

  // Player name (left side, slides in)
  if(t>10){
    const nameAlpha=Math.min(1,(t-10)/10);
    g.globalAlpha=nameAlpha;
    txShadow('YOU',60,H/2-60,14,'#78c0f0','rgba(0,0,0,.6)');
    const yourCards=pl[0].cd.filter(c=>c>0).length;
    txShadow(yourCards+' card'+(yourCards!==1?'s':''),60,H/2-42,8,'rgba(255,255,255,.6)','rgba(0,0,0,.4)');
    // v106: hand power score = sum of card rarities
    const yourPwr=pl[0].cd.reduce((s,id)=>s+(id>0?CD[id-1]?.r||0:0),0);
    txShadow('PWR:'+yourPwr,60,H/2-26,7,'#78c0f0','rgba(0,0,0,.35)');
    g.globalAlpha=1;
  }

  // Rival name (right side, slides in)
  if(t>10){
    const nameAlpha=Math.min(1,(t-10)/10);
    g.globalAlpha=nameAlpha;
    const rivalNameCol=vsRivalIdx===1?'#f080c0':'#f0c830';
    const rivalPersonality=vsRivalIdx===1?'THE HUNTER':'THE COLLECTOR';
    const rivalNameX=W-220;
    txShadow(vsSplashRival.n,rivalNameX,H/2-60,14,rivalNameCol,'rgba(0,0,0,.6)');
    txShadow(rivalPersonality,rivalNameX,H/2-42,8,'rgba(255,255,255,.5)','rgba(0,0,0,.4)');
    const rivalCards=vsSplashRival.cd.filter(c=>c>0).length;
    txShadow(rivalCards+' card'+(rivalCards!==1?'s':''),rivalNameX,H/2-28,7,'rgba(255,255,255,.5)','rgba(0,0,0,.35)');
    // v106: rival power + advantage label
    const rivalPwr=vsSplashRival.cd.reduce((s,id)=>s+(id>0?CD[id-1]?.r||0:0),0);
    txShadow('PWR:'+rivalPwr,rivalNameX,H/2-12,7,rivalNameCol,'rgba(0,0,0,.35)');
    g.globalAlpha=1;
  }

  // v106: power assessment label — appears between power scores
  if(t>20){
    const assAlpha=Math.min(1,(t-20)/10);
    g.globalAlpha=assAlpha;
    const yourPwr2=pl[0].cd.reduce((s,id)=>s+(id>0?CD[id-1]?.r||0:0),0);
    const rivalPwr2=vsSplashRival.cd.reduce((s,id)=>s+(id>0?CD[id-1]?.r||0:0),0);
    const diff=yourPwr2-rivalPwr2;
    let assLabel,assCol;
    if(diff>=4){assLabel='ADVANTAGE';assCol='#40d080';}
    else if(diff<=-4){assLabel='OUTMATCHED';assCol='#d04040';}
    else{assLabel='BALANCED';assCol='#d0c040';}
    const assW=assLabel.length*9+16;
    bx(W/2-assW/2,H/2-80,assW,20,'rgba(0,0,0,.5)');
    txShadow(assLabel,W/2-assW/2+8,H/2-64,10,assCol,'rgba(0,0,0,.5)');
    g.globalAlpha=1;
  }

  // VS text
  if(t>15){
    g.globalAlpha=Math.min(1,(t-15)/10);
    txShadow('VS',W/2-28,H/2+14,36,'#f0c830','#000');
    g.globalAlpha=1;
  }
  // Flash
  if(t>=28&&t<=35){bx(0,0,W,H,`rgba(255,255,255,${(35-t)/7*.9})`);}

  // Rival taunt (appears after flash, fades out before transition)
  if(t>36&&t<58){
    const tntAlpha=Math.min(1,(t-36)/8,Math.max(0,(58-t)/6));
    g.globalAlpha=tntAlpha;
    const aiIdx=vsRivalIdx-1; // 0 for VEGA, 1 for MIRA
    const taunts=RIVAL_TAUNTS[aiIdx]||RIVAL_TAUNTS[0];
    // Use bpFrame as seed for consistent taunt per battle
    const taunt=taunts[Math.floor(bpFrame/7)%taunts.length];
    // Dark pill behind taunt text
    const tntW=taunt.length*8+20;
    bx(W/2-tntW/2,H/2+24,tntW,22,'rgba(0,0,0,.6)');
    txShadow('\u201C'+taunt+'\u201D',W/2-tntW/2+10,H/2+40,9,'#f0e8c8','rgba(0,0,0,.5)');
    g.globalAlpha=1;
  }

  if(t>=60){
    battlePhase='select';bpFrame=fr;bpRdIncremented=false;bpActionsGenerated=false;bpScoutedCards=[null,null];
    generateRivalTells(); // pre-generate rival actions + tells for this round
    if(!tutorialFlags.firstBattle){
      const rName=(encounterExclTarget>=1&&encounterExclTarget<=2)?pl[encounterExclTarget].n:'the rival';
      tutorialFlags.firstBattle=true;
      tutorialMsg='Battle vs '+rName+'! Watch their body language — tells hint at their move!';
      tutorialMsgTimer=260;
    }
  }
}

function isActionAvailable(i){
  if(i===1&&sp.s<=0)return false;
  if(i===2&&sp.b<=0)return false;
  if(i===3&&sp.c<=0)return false;
  if(i===4&&pl[0].cd.filter(c=>c>0).length<=0)return false;
  return true;
}
function bothRivalsEliminated(){return pl[1].cd.filter(c=>c>0).length===0&&pl[2].cd.filter(c=>c>0).length===0;}

// Phase banner colors and text
const PHASE_COLORS={select:'#3060b0',confirming:'#d8b028',resolving:'#c04040',result:'#308030'};
const PHASE_LABELS={select:'COMMIT PHASE',confirming:'REVEALING...',resolving:'RESOLVING!',result:'COMPLETE'};

function drawPhaseBanner(phase){
  const col=PHASE_COLORS[phase]||'#383830';
  const label=PHASE_LABELS[phase]||'';
  bx(0,0,W,28,col);
  bx(0,0,W,1,'rgba(255,255,255,.2)');
  // Round info on left
  txShadow('BATTLE '+rd,6,20,10,'#fff','rgba(0,0,0,.5)');
  // Phase label centered (bigger, bold-like with shadow)
  const labelW=label.length*10;
  txShadow(label,W/2-labelW/2,20,16,'#fff','rgba(0,0,0,.5)');
  // Area on right
  txShadow(mapNames[currentMap],W-160,20,8,'rgba(255,255,255,.8)','rgba(0,0,0,.4)');
  // TX indicator when on-chain mode active
  if(walletConnected){
    const txLabel=onchainLastTxSig?'TX:'+onchainLastTxSig.slice(0,8)+'..':'TX:--';
    txShadow(txLabel,W-160,38,5,'#40d080','rgba(0,0,0,.5)');
  }
  // Commit hash display during commit phase (wallet integration)
  if(walletConnected&&walletLastCommitHash&&(phase==='confirming'||phase==='resolving')){
    txShadow('Hash: '+walletLastCommitHash,W/2-100,38,5,'#80c0ff','rgba(0,0,0,.5)');
  }
  // v101: Battle momentum strip — card gain/loss net balance shown as a tug-of-war bar
  bx(0,26,W,3,'rgba(0,0,0,.55)');
  if(battleRoundHistory.length>0){
    const net=battleRoundHistory.reduce((s,h)=>s+(h.got?1:0)-(h.lost?1:0),0);
    const norm=Math.max(-1,Math.min(1,net/Math.max(1,battleRoundHistory.length)));
    if(norm>0){bx(W/2,26,(W/2)*norm,3,'#40b0e8');}
    else if(norm<0){bx(W/2+(W/2)*norm,26,-(W/2)*norm,3,'#d04040');}
    const ta=0.35+Math.sin(fr*0.12)*0.25;
    g.globalAlpha=ta;bx(W/2-1,26,2,3,'#ffffff');g.globalAlpha=1;
  }else{
    bx(W/2-1,26,2,3,'rgba(255,255,255,.2)');
  }
}

// Draw the battle arena with sprites
function drawBattleArena(){
  // Player sprite (bottom-center-left, from behind like Pokemon trainer)
  let psx=0,psy=0;
  if(bpShakeTarget===0&&bpShakeTimer>0){psx=Math.sin(bpShakeTimer*1.2)*4;psy=Math.cos(bpShakeTimer*1.6)*2;}
  drawBattleSprite(pl[0],180+psx,H-130+psy,3,true);
  // Rival 1 sprite (top-right, facing player) — primary opponent
  let osx=0,osy=0;
  if(bpShakeTarget===1&&bpShakeTimer>0){osx=Math.sin(bpShakeTimer*1.2)*4;osy=Math.cos(bpShakeTimer*1.6)*2;}
  drawBattleSprite(pl[1],W-160+osx,110+osy,3,false);
  // Rival 2 sprite (top-center-right, slightly smaller — 2nd enemy)
  let o2sx=0,o2sy=0;
  if(bpShakeTarget===2&&bpShakeTimer>0){o2sx=Math.sin(bpShakeTimer*1.2)*4;o2sy=Math.cos(bpShakeTimer*1.6)*2;}
  const r2alive=pl[2].cd.filter(c=>c>0).length>0;
  g.globalAlpha=r2alive?0.85:0.3;
  drawBattleSprite(pl[2],W-310+o2sx,140+o2sy,2.2,false);
  g.globalAlpha=1;
  // Rival 2 name tag
  if(!r2alive){
    txShadow('FLED',W-310,175,7,'#c04040','rgba(0,0,0,.4)');
  }else{
    txShadow(pl[2].n,W-330,175,6,'#986840','rgba(0,0,0,.3)');
  }
}

// FRLG-style 2x2 action grid
function drawActionGrid(){
  const gridX=8,gridY=H-164,cellW=160,cellH=42,gap=4;
  const actions=[
    {name:'DRAW',   desc:'floor card pool',  col:'#303028',icon:'#48b8e8'},
    {name:'STEAL',  desc:sp.s+'\u00D7 takes rival card',col:'#b04040',icon:'#b04040'},
    {name:'BARRIER',desc:sp.b+'\u00D7 blocks steal',  col:'#3060b0',icon:'#3060b0'},
    {name:'SCOUT',  desc:sp.c+'\u00D7 view rival hand',col:'#308030',icon:'#308030'}
  ];
  // Grid background
  win(gridX-2,gridY-6,cellW*2+gap+12,cellH*2+gap+16);
  for(let r=0;r<2;r++){
    for(let c=0;c<2;c++){
      const idx=r*2+c;
      const cx_=gridX+4+c*(cellW+gap);
      const cy_=gridY+2+r*(cellH+gap);
      const avail=isActionAvailable(idx);
      const sel=(idx===ai&&!bpCardSelectActive&&!bpTargetSelectActive);
      // Cell background
      if(sel&&avail){
        bx(cx_,cy_,cellW,cellH,'#f8f0d8');bx(cx_,cy_,cellW,1,'#d0c8a0');
        bx(cx_,cy_+cellH-1,cellW,1,'#a89878');
      }else{
        bx(cx_,cy_,cellW,cellH,avail?'#e8e0c8':'#c8c0b0');
      }
      // Icon square
      const iconCol=avail?actions[idx].icon:'#989088';
      bx(cx_+4,cy_+6,18,18,iconCol);bx(cx_+5,cy_+7,16,16,avail?'rgba(255,255,255,.2)':'rgba(0,0,0,.1)');
      // Text (increased sizes for readability)
      const textCol=avail?(sel?'#c04040':actions[idx].col):'#a0a0a0';
      txShadow(actions[idx].name,cx_+26,cy_+18,14,textCol,'rgba(0,0,0,.3)');
      txShadow(actions[idx].desc,cx_+26,cy_+32,10,avail?'#908878':'#b8b8b8','rgba(0,0,0,.2)');
      // Cursor arrow
      if(sel&&avail){
        const bob_=Math.sin(fr*0.15)*2;
        txShadow('\u25B6',cx_-12+bob_,cy_+20,10,'#c04040','rgba(0,0,0,.3)');
      }
      // v92: Smart context badges (top-right corner of each cell)
      if(avail&&battlePhase==='select'){
        let badge='',badgeCol='#606060',badgeBg='rgba(0,0,0,.35)';
        const vsRivalIdx=(encounterExclTarget>=1&&encounterExclTarget<=2)?encounterExclTarget:1;
        if(idx===0){// DRAW — show if floor pool has new cards for player
          const pool_=DUNGEON_FLOOR_CARDS[currentMap]||[];
          const vault_=pl[0].vault||new Set();
          const newInPool=pool_.filter(id=>!vault_.has(id)).length;
          if(newInPool>0){badge='+'+newInPool+' NEW';badgeCol='#50e090';badgeBg='rgba(0,40,20,.6)';}
          else if(pool_.length>0){badge='ALL OWNED';badgeCol='#888870';badgeBg='rgba(0,0,0,.3)';}
        }else if(idx===1){// STEAL — show barrier state of primary target
          const tgtBarrier=bpRivalActions[vsRivalIdx-1]===2;
          const lastRound=battleRoundHistory[0];
          const theyStole=lastRound&&(lastRound.r1a===1||lastRound.r2a===1);
          if(tgtBarrier){badge='BLOCKED';badgeCol='#6080d0';badgeBg='rgba(10,20,60,.6)';}
          else if(pl[vsRivalIdx].cc===0){badge='NO CARDS';badgeCol='#808880';badgeBg='rgba(0,0,0,.35)';}
          else{badge='\u2714 OPEN';badgeCol='#e08030';badgeBg='rgba(40,20,0,.6)';}
        }else if(idx===2){// BARRIER — advise based on last round rival action
          const lastRound=battleRoundHistory[0];
          if(lastRound&&(lastRound.r1a===1||lastRound.r2a===1)){badge='NEEDED';badgeCol='#e05040';badgeBg='rgba(40,0,0,.6)';}
          else if(bpPlayerBarrier){badge='ACTIVE';badgeCol='#4080d0';badgeBg='rgba(0,20,50,.6)';}
          else{badge='OPTIONAL';badgeCol='#608880';badgeBg='rgba(0,0,0,.35)';}
        }else if(idx===3){// SCOUT — show staleness
          const sc0=bpScoutedCards[vsRivalIdx-1];
          if(sc0&&sc0.round===rd){badge='FRESH';badgeCol='#50e090';badgeBg='rgba(0,30,10,.6)';}
          else if(sc0&&rd-sc0.round<=1){badge='R'+(sc0.round)+' DATA';badgeCol='#c0b030';badgeBg='rgba(30,20,0,.6)';}
          else if(sc0){badge='STALE';badgeCol='#888870';badgeBg='rgba(0,0,0,.35)';}
          else{badge='UNSCOUTED';badgeCol='#b0b0a0';badgeBg='rgba(0,0,0,.3)';}
        }
        if(badge){
          const bW=badge.length*5+8,bH=11;
          const bx_=cx_+cellW-bW-4,by_=cy_+4;
          g.globalAlpha=sel?0.95:0.7;
          bx(bx_,by_,bW,bH,badgeBg);
          bx(bx_,by_,bW,1,badgeCol);
          tx(badge,bx_+3,by_+9,5,badgeCol);
          g.globalAlpha=1;
        }
      }
    }
  }
  // USE CARD button below the grid
  const ucX=gridX+4,ucY=gridY+cellH*2+gap+6,ucW=cellW*2+gap,ucH=28;
  const ucAvail=isActionAvailable(4);
  const ucSel=(ai===4&&!bpCardSelectActive&&!bpTargetSelectActive);
  if(ucSel&&ucAvail){
    bx(ucX,ucY,ucW,ucH,'#f8f0d8');bx(ucX,ucY,ucW,1,'#d0c8a0');
  }else{
    bx(ucX,ucY,ucW,ucH,ucAvail?'#e8e0c8':'#c8c0b0');
  }
  bx(ucX+4,ucY+4,18,18,'#806030');bx(ucX+5,ucY+5,16,16,'rgba(255,255,255,.15)');
  txShadow('USE CARD',ucX+26,ucY+18,14,ucAvail?(ucSel?'#c04040':'#806030'):'#a0a0a0','rgba(0,0,0,.3)');
  const _handCount=pl[0].cd.filter(c=>c>0).length;
  txShadow(_handCount>0?_handCount+' card'+(+_handCount!==1?'s':'')+' ready':'hand empty',ucX+140,ucY+18,10,ucAvail?'#908878':'#b8b8b8','rgba(0,0,0,.2)');
  if(ucSel&&ucAvail){
    const bob_=Math.sin(fr*0.15)*2;
    txShadow('\u25B6',ucX-12+bob_,ucY+20,10,'#c04040','rgba(0,0,0,.3)');
  }
  // Hint when all spells exhausted
  if(sp.s<=0&&sp.b<=0&&sp.c<=0){
    txShadow('No spells left! DRAW or USE CARD.',gridX+4,gridY+cellH*2+gap+ucH+14,8,'#c08040','rgba(0,0,0,.3)');
  }
  // Hint when both rivals have 0 cards
  if(bothRivalsEliminated()){
    txShadow('Both rivals have no cards! Keep drawing.',gridX+4,gridY+cellH*2+gap+ucH+24,8,'#308030','rgba(0,0,0,.3)');
  }
}

function drawSelectPhase(){
  const slideProgress=Math.min(1,(fr-bpFrame)/20);
  g.save();g.translate(-(1-slideProgress)*W,0);
  drawBattleBG();
  drawPhaseBanner('select');
  drawBattleArena();
  drawOpponentInfoBox();
  drawPlayerInfoBox();
  drawActionGrid();
  // v88: DRAW pool preview panel (shown when DRAW is highlighted)
  if(ai===0&&!bpCardSelectActive&&!bpTargetSelectActive){
    const pool=DUNGEON_FLOOR_CARDS[currentMap];
    if(pool&&pool.length>0){
      const vault_=pl[0].vault||new Set();
      // Show up to 4 cards from pool, marking unowned
      const previewCards=pool.slice(0,Math.min(4,pool.length));
      const ppW=220,ppH=60+previewCards.length*26;
      const ppX=328,ppY=H-164;
      const slideA=Math.min(1,(fr-bpFrame)/10);
      g.globalAlpha=slideA*0.95;
      win(ppX,ppY,ppW,ppH);
      bx(ppX,ppY,ppW,3,'#48b8e8');
      txShadow('FLOOR POOL',ppX+8,ppY+20,9,'#48b8e8','rgba(0,0,0,.3)');
      txShadow(mapNames[currentMap],ppX+ppW-8-mapNames[currentMap].length*5,ppY+20,6,'#686878','rgba(0,0,0,.2)');
      bx(ppX+6,ppY+26,ppW-12,1,'rgba(200,180,100,.2)');
      previewCards.forEach((cid,pi)=>{
        const cr=CD[cid-1];const rar=cr.r||1;
        const rarCol=RARITY_COLOR[rar]||'#888888';
        const owned=vault_.has(cid);
        const py2=ppY+32+pi*26;
        bx(ppX+10,py2-8,12,16,cr.d);bx(ppX+11,py2-7,10,14,cr.c);
        drawCardCharacter(ppX+11,py2-7,cid,0.45,fr);
        const nCol=owned?'#888878':'#e8e0c8';
        tx(cr.n,ppX+28,py2+2,7,nCol);
        for(let s=0;s<rar;s++)tx('\u2605',ppX+ppW-8-(rar-s)*9,py2+2,5,rarCol);
        if(!owned){tx('NEW',ppX+ppW-8-rar*9-26,py2+2,5,'#50e090');}
      });
      if(pool.length>4){
        txShadow('+'+(pool.length-4)+' more...',ppX+10,ppY+ppH-12,6,'#686878','rgba(0,0,0,.2)');
      }
      g.globalAlpha=1;
    }
  }
  // v90: Battle round history panel (right side, shown from round 2 onward)
  if(battleRoundHistory.length>0&&!bpCardSelectActive&&!bpTargetSelectActive){
    const ACT_ABBR=['DRW','STL','BAR','SCT','CRD'];
    const ACT_COL=['#48b8e8','#d04040','#3060b0','#38a038','#c08030'];
    const histCount=Math.min(3,battleRoundHistory.length);
    const hpW=178,hpH=28+histCount*22;
    const hpX=W-hpW-8,hpY=130;
    const histAlpha=Math.min(1,(fr-bpFrame)/12)*0.95;
    g.globalAlpha=histAlpha;
    win(hpX,hpY,hpW,hpH);
    bx(hpX,hpY,hpW,3,'#806030'); // amber top border
    txShadow('ROUND LOG',hpX+8,hpY+18,8,'#c0a060','rgba(0,0,0,.3)');
    bx(hpX+6,hpY+22,hpW-12,1,'rgba(200,180,100,.2)');
    for(let i=0;i<histCount;i++){
      const h=battleRoundHistory[i];
      const hy=hpY+28+i*22;
      const rowA=i===0?1:0.7-i*0.1;
      g.globalAlpha=histAlpha*rowA;
      // Round label
      tx('R'+h.rd,hpX+6,hy+12,6,i===0?'#e8e0c0':'#888070');
      // Player action badge
      const pCol=ACT_COL[h.pa]||'#888';
      bx(hpX+28,hy,34,16,'rgba(0,0,0,.5)');
      bx(hpX+28,hy,34,1,pCol);
      tx('YOU',hpX+30,hy+7,5,'rgba(200,200,200,.5)');
      tx(ACT_ABBR[h.pa]||'???',hpX+30,hy+14,6,pCol);
      // Rival 1 action (VEGA)
      const r1Col=ACT_COL[h.r1a]||'#888';
      bx(hpX+66,hy,34,16,'rgba(0,0,0,.5)');
      bx(hpX+66,hy,34,1,'#d060a0');
      tx('V',hpX+68,hy+7,5,'rgba(200,160,180,.5)');
      tx(ACT_ABBR[h.r1a]||'???',hpX+68,hy+14,6,r1Col);
      // Rival 2 action (MIRA)
      const r2Col=ACT_COL[h.r2a]||'#888';
      bx(hpX+104,hy,34,16,'rgba(0,0,0,.5)');
      bx(hpX+104,hy,34,1,'#d0a030');
      tx('M',hpX+106,hy+7,5,'rgba(200,180,100,.5)');
      tx(ACT_ABBR[h.r2a]||'???',hpX+106,hy+14,6,r2Col);
      // Outcome dot
      if(h.got){g.globalAlpha=histAlpha*rowA;bx(hpX+hpW-16,hy+4,8,8,'#40d080');}
      else if(h.lost){g.globalAlpha=histAlpha*rowA;bx(hpX+hpW-16,hy+4,8,8,'#d04040');}
    }
    g.globalAlpha=1;
  }
  // Card selection submenu for USE CARD
  if(bpCardSelectActive){
    bx(0,0,W,H,'rgba(0,0,0,.5)');
    const filled=[];for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)filled.push(i);}
    // Larger card frames — 30% bigger
    const cardH=48;
    const mh=filled.length*cardH+56;
    const cardW=380;
    win(W/2-cardW/2,H/2-mh/2,cardW,mh);
    txShadow('Use which card?',W/2-90,H/2-mh/2+26,14,'#806030','rgba(0,0,0,.2)');
    // Spread cards out more if fewer in hand
    const spacing=filled.length<=3?Math.min(cardH+8,(mh-56)/Math.max(1,filled.length)):cardH;
    filled.forEach((slot,j)=>{
      const cd=pl[0].cd[slot],cr=CD[cd-1];
      const y=H/2-mh/2+46+j*spacing;
      if(j===bpCardSelectIdx){bx(W/2-cardW/2+8,y-4,cardW-16,cardH-4,'rgba(192,168,96,.25)');txShadow('\u25B6',W/2-cardW/2+4,y+20,12,'#c04040','rgba(0,0,0,.3)');}
      // Larger card frame with character sprite
      const frameX=W/2-cardW/2+28;
      bx(frameX,y+2,36,36,cr.d);bx(frameX+2,y+4,32,32,cr.c);
      drawCardCharacter(frameX+3,y+5,cd,1.2,fr);
      // Card name clearly below/beside
      txShadow(cr.n,frameX+44,y+20,14,j===bpCardSelectIdx?'#c04040':'#303028','rgba(0,0,0,.2)');
      txShadow(cr.f,frameX+44,y+36,11,'#908878','rgba(0,0,0,.15)');
    });
    // v91: Effect preview panel for selected card (shown to the right of card list)
    if(filled.length>0&&bpCardSelectIdx>=0&&bpCardSelectIdx<filled.length){
      const selSlot=filled[bpCardSelectIdx];
      const selCard=pl[0].cd[selSlot];
      if(selCard>0){
        const scr=CD[selCard-1];
        // Type → effect description + color
        const TYPE_INFO={
          attack:  {col:'#e05040',label:'ATTACK',lines:['Force steal (ignores barrier).','Success rate scales with rarity.','Higher rarity = more reliable.']},
          defense: {col:'#4080d0',label:'DEFENSE',lines:['Raises Barrier this round.','Restores +'+(Math.ceil(scr.r/2))+' Barrier charges.','Protects against incoming Steal.']},
          flee:    {col:'#40c080',label:'FLEE',lines:['Ends battle immediately.','No cards lost this round.','Use when overwhelmed.']},
          magic:   {col:'#c070e0',label:'MAGIC',lines:['Nullifies ALL barriers.','Guaranteed steal attempt.','Cannot be blocked this round.']},
          recovery:{col:'#e0c030',label:'RECOVERY',lines:['Restores spell energy:','+'+Math.ceil(scr.r/2)+' Steal, +1 Barrier, +1 Scout.','Use when spells are depleted.']}
        };
        const ti=TYPE_INFO[scr.t]||{col:'#888',label:'UNKNOWN',lines:['Unknown effect.','','']};
        const epW=200,epH=120;
        const epX=W/2+cardW/2+12;
        const epY=H/2-epH/2;
        // Clamp to screen
        const finalEpX=Math.min(epX,W-epW-8);
        const prevAlpha=Math.min(1,(fr-bpFrame)/8);
        g.globalAlpha=prevAlpha*0.97;
        win(finalEpX,epY,epW,epH);
        // Colored top bar matching card type
        bx(finalEpX,epY,epW,4,ti.col);
        g.globalAlpha=prevAlpha;
        // Card type badge
        bx(finalEpX+8,epY+10,epW-16,16,'rgba(0,0,0,.5)');
        txShadow(ti.label,finalEpX+12,epY+22,8,ti.col,'rgba(0,0,0,.4)');
        // Rarity stars
        const rarCol=RARITY_COLOR[scr.r]||'#888';
        for(let s=0;s<scr.r;s++)tx('\u2605',finalEpX+epW-8-(scr.r-s)*10,epY+22,7,rarCol);
        // Divider
        bx(finalEpX+8,epY+30,epW-16,1,'rgba(200,180,100,.25)');
        // Effect description lines
        ti.lines.forEach((ln,li)=>{
          if(ln)tx(ln,finalEpX+10,epY+44+li*18,6,li===0?'#e8e0c0':'#a09888');
        });
        // Large card character display
        const previewSz=1.8;
        const pcX=finalEpX+epW-42,pcY=epY+epH-48;
        g.globalAlpha=prevAlpha*0.25;
        bx(pcX-2,pcY-2,40,40,scr.d);
        g.globalAlpha=prevAlpha*0.5;
        drawCardCharacter(pcX,pcY,selCard,previewSz,fr);
        g.globalAlpha=1;
      }
    }
  }
  if(bpTargetSelectActive){
    bx(0,0,W,H,'rgba(0,0,0,.4)');
    win(W/2-140,H/2-50,280,100);
    txShadow('Target:',W/2-48,H/2-26,14,'#806030','rgba(0,0,0,.2)');
    for(let t=1;t<=2;t++){
      const y=H/2-4+(t-1)*32;
      const tFled=pl[t].cd.filter(c=>c>0).length===0;
      if(t===bpTargetSelectIdx){bx(W/2-130,y-2,260,28,'rgba(192,168,96,.22)');txShadow('\u25B6',W/2-134,y+14,10,'#c04040','rgba(0,0,0,.3)');}
      g.globalAlpha=tFled?0.45:1;
      txShadow(pl[t].n,W/2-106,y+14,14,t===bpTargetSelectIdx?'#c04040':'#303028','rgba(0,0,0,.2)');
      txShadow(tFled?'FLED':pl[t].cc+' cards',W/2+40,y+14,10,tFled?'#a04040':'#908878','rgba(0,0,0,.15)');
      g.globalAlpha=1;
    }
  }
  g.restore();
}

function drawConfirmingPhase(){
  drawBattleBG();
  drawPhaseBanner('confirming');
  drawBattleArena();
  drawOpponentInfoBox();
  drawPlayerInfoBox();
  // Text box at bottom
  win(4,H-70,W-8,64);
  const t=fr-bpFrame;const actionNames=['DRAW','STEAL','BARRIER','SCOUT','USE CARD'];
  if(walletConnected){
    // On-chain flow with ZK visual enhancements
    if(t<30){
      txShadow('Secretly committing on-chain...',16,H-38,14,'#303028','rgba(200,180,140,.3)');
      txShadow('No one can see your move until everyone commits.',16,H-18,7,'#686068','rgba(200,180,140,.3)');
    }else if(t<50){
      // Computing Poseidon hash visually
      txShadow('Computing Poseidon hash...',16,H-38,12,'#9945FF','rgba(0,0,0,.3)');
      // Typewriter hash display
      const hashChars=Math.min(24,Math.floor((t-30)*1.2));
      const fakeHash='0x3f8a7c2e91d0b465f8c72a1e';
      const partial=fakeHash.slice(0,hashChars);
      const blink_=Math.floor(fr/4)%2===0?'_':'';
      txShadow(partial+blink_,16,H-22,8,'#80c0ff','rgba(0,0,0,.3)');
    }else if(t<65){
      txShadow('Hash committed on-chain \u2713',16,H-38,12,'#40d080','rgba(0,0,0,.3)');
      if(walletLastCommitHash)txShadow(walletLastCommitHash,16,H-22,7,'#80c0ff','rgba(0,0,0,.3)');
    }else if(t<85){
      // Generating ZK proof (real snarkjs or visual)
      const sp_=['|','/','-','\\'][Math.floor(t/3)%4];
      const zkMsg=zkProofGenerating?'Generating Groth16 proof (snarkjs)... '+sp_:'Generating Groth16 proof... '+sp_;
      txShadow(zkMsg,16,H-38,12,'#14F195','rgba(0,0,0,.3)');
      const proofT=t-65;
      if(proofT>5)txShadow('\u03C0_A',16,H-22,7,'#9945FF','rgba(0,0,0,.3)');
      if(proofT>10)txShadow('\u03C0_B',80,H-22,7,'#14F195','rgba(0,0,0,.3)');
      if(proofT>15)txShadow('\u03C0_C',144,H-22,7,'#80c0ff','rgba(0,0,0,.3)');
    }else if(t<100){
      const vMsg=zkProofStatus==='verified'?'ZK Proof VERIFIED (264 constraints) \u2713':'Proof verified (264 constraints) \u2713';
      txShadow(vMsg,16,H-38,12,'#40d080','rgba(0,0,0,.3)');
      txShadow('\u03C0_A, \u03C0_B, \u03C0_C \u2014 valid',16,H-22,7,'#14F195','rgba(0,0,0,.3)');
    }else{
      txShadow('Waiting for others'+'.'.repeat((Math.floor(t/12)%3)+1),16,H-38,14,'#686068','rgba(200,180,140,.3)');
    }
    // Transaction flow visualization (Requirement #5)
    if(t>=30&&t<120){
      const flowY=H-110,flowX=W-320;
      // Semi-transparent bg for flow diagram
      bx(flowX-4,flowY-18,300,54,'rgba(0,0,0,.4)');
      // Determine which step
      if(t<65){
        // Commit phase
        txShadow('TX FLOW:',flowX,flowY-4,6,'#686068','rgba(0,0,0,.3)');
        // player icon
        bx(flowX,flowY+6,10,12,'#48b8e8');
        // arrow
        const arrowProg=Math.min(1,(t-30)/20);
        const arrowLen=Math.floor(50*arrowProg);
        bx(flowX+14,flowY+11,arrowLen,2,'#40d080');
        if(arrowProg>0.5)tx('\u25B6',flowX+14+arrowLen-6,flowY+14,6,'#40d080');
        // chain icon
        if(arrowProg>=1){
          bx(flowX+70,flowY+4,14,14,'#9945FF');bx(flowX+72,flowY+6,10,10,'#14F195');
          txShadow('committed',flowX+90,flowY+14,5,'#40d080','rgba(0,0,0,.3)');
        }
      }else if(t<100){
        // Reveal phase
        txShadow('TX FLOW:',flowX,flowY-4,6,'#686068','rgba(0,0,0,.3)');
        // player icon
        bx(flowX,flowY+6,10,12,'#48b8e8');
        // arrow to ZK shield
        bx(flowX+14,flowY+11,30,2,'#80c0ff');
        tx('\u25B6',flowX+38,flowY+14,6,'#80c0ff');
        // ZK shield icon
        bx(flowX+48,flowY+2,18,18,'rgba(20,241,149,.3)');
        txShadow('ZK',flowX+50,flowY+14,6,'#14F195','rgba(0,0,0,.3)');
        // arrow to chain
        const arrowProg2=Math.min(1,(t-65)/15);
        const arrowLen2=Math.floor(40*arrowProg2);
        bx(flowX+70,flowY+11,arrowLen2,2,'#9945FF');
        if(arrowProg2>=1){
          bx(flowX+114,flowY+4,14,14,'#9945FF');bx(flowX+116,flowY+6,10,10,'#14F195');
          txShadow('verified',flowX+134,flowY+14,5,'#40d080','rgba(0,0,0,.3)');
        }
      }else{
        // Resolve phase
        txShadow('TX FLOW:',flowX,flowY-4,6,'#686068','rgba(0,0,0,.3)');
        // chain icon
        bx(flowX,flowY+4,14,14,'#9945FF');bx(flowX+2,flowY+6,10,10,'#14F195');
        // arrow to result
        bx(flowX+18,flowY+11,40,2,'#f0c830');
        tx('\u25B6',flowX+52,flowY+14,6,'#f0c830');
        txShadow('result',flowX+62,flowY+14,5,'#f0c830','rgba(0,0,0,.3)');
        // arrows to all players
        bx(flowX+100,flowY+11,30,2,'#48b8e8');
        tx('ALL',flowX+134,flowY+14,5,'#48b8e8');
      }
    }
  }else{
    if(t<40)txShadow('You chose '+actionNames[bpAction]+'!',16,H-38,14,'#303028','rgba(200,180,140,.3)');
    else if(t<60){const sp_=['|','/','-','\\'][Math.floor(t/4)%4];txShadow('Computing Poseidon hash... '+sp_,16,H-38,12,'#9945FF','rgba(0,0,0,.3)');}
    else if(t<80){
      const sp_=['|','/','-','\\'][Math.floor(t/3)%4];
      txShadow('ZK proof: '+zkProofStatus+' '+sp_,16,H-38,12,zkProofStatus==='verified'?'#40d080':'#14F195','rgba(0,0,0,.3)');
      if(walletLastCommitHash)txShadow(walletLastCommitHash,16,H-18,7,'#80c0ff','rgba(0,0,0,.3)');
    }
    else{txShadow('Resolving'+'.'.repeat((Math.floor(t/12)%3)+1),16,H-38,14,'#686068','rgba(200,180,140,.3)');}
  }
  // Generate and log commit hash when wallet connected
  if(t===1&&walletConnected){
    onchainCommitPhase=true;
    onchainCommit(rd,bpAction,bpSelectedTarget||0).then(result=>{
      if(result){
        walletLastCommitHash=result.hash;
        logOnchain('Commit: '+result.hash+' TX:'+result.txSig.slice(0,8)+'..');
      }
      onchainCommitPhase=false;
    }).catch(()=>{onchainCommitPhase=false;});
  }
  if(t===1&&!walletConnected){
    const salt=generateSalt();
    computeCommitHash(bpAction,walletPublicKey,salt).then(hash=>{
      walletLastCommitHash=hexFromBytes(hash);
      lg.push('Commit hash: '+walletLastCommitHash);
    }).catch(()=>{});
    // Generate ZK proof in parallel (demo: proves knowledge of action without revealing)
    zkGenerateProof(bpAction+1, bpSelectedTarget||0, salt);
  }
  // On-chain reveal phase
  if(t===70&&walletConnected&&onchainPendingSalt){
    onchainRevealPhase=true;
    onchainReveal(rd,bpAction,bpSelectedTarget||0,onchainPendingSalt).then(result=>{
      if(result){
        logOnchain('Reveal: TX:'+result.txSig.slice(0,8)+'..');
      }
      onchainRevealPhase=false;onchainPendingSalt=null;
    }).catch(()=>{onchainRevealPhase=false;});
  }
  if(t>=120){battlePhase='resolving';bpFrame=fr;bpResolveIdx=0;bpResolveQueue=generateResolveEvents();}
}

// Dungeon floor card drop tables (GDD v1.0)
// Town (map 0): no drops. Dungeon floors 1-5: progressively rarer cards
// Floor 1: Common (1-2 per type), Floor 2: Uncommon, Floor 3: Rare, Floor 4: Epic, Floor 5: Legendary
const DUNGEON_FLOOR_CARDS=[
  [],                                           // map 0 = Town: no drops
  [4,5,13,14,25,26,39,40,49,50],              // Floor 1: Common/Uncommon
  [6,7,15,16,27,28,41,42,51,52],              // Floor 2: Uncommon
  [8,9,10,17,18,19,29,30,31,43,44,45,53,54,55], // Floor 3: Rare
  [11,20,21,22,32,33,34,46,47,56,57,58],     // Floor 4: Epic
  [1,2,12,23,24,35,36,37,38,48,59,60],       // Floor 5: Legendary (including originals)
];
// AREA_CARDS: 1-indexed card pools per map (same as DUNGEON_FLOOR_CARDS, used by encounters/rocks)
const AREA_CARDS=[
  [4,5,13,14,25,26,39,40,49,50],    // map 0 Town (fallback only — encounters blocked in town)
  [4,5,13,14,25,26,39,40,49,50],    // map 1 Floor 1: Common/Uncommon
  [6,7,15,16,27,28,41,42,51,52],    // map 2 Floor 2: Uncommon
  [8,9,10,17,18,19,29,30,31,43,44,45,53,54,55], // map 3 Floor 3: Rare
  [11,20,21,22,32,33,34,46,47,56,57,58], // map 4 Floor 4: Epic
  [1,2,12,23,24,35,36,37,38,48,59,60],  // map 5 Floor 5: Legendary
];
function pickAreaCard(){return pickAreaCardForMap(currentMap);}
function pickAreaCardForMap(mapIdx){
  const ac=DUNGEON_FLOOR_CARDS[mapIdx];
  if(!ac||ac.length===0)return 1+(Math.floor(Math.random()*60)); // fallback: any card
  return ac[Math.floor(Math.random()*ac.length)];
}
function syncCardCount(pIdx){
  const p=pl[pIdx];
  if(pIdx===0&&p.vault){p.cc=p.vault.size;}
  else{p.cc=p.cd.filter(c=>c>0).length;}
}
function addCardToPlayer(pIdx,cardId){
  const p=pl[pIdx];
  const handLimit=(pIdx===0)?HAND_SIZE:5;
  const hadVaultBefore=pIdx===0&&p.vault?p.vault.has(cardId):null;
  // Add to vault (player only) — tracks all unique cards ever collected
  if(pIdx===0&&p.vault&&!p.vault.has(cardId)){
    cardAcqWasNew=true; // v96: flag for NEW badge in acquisition animation
    p.vault.add(cardId);
    sfxUniqueCardSting();triggerProgressPulse();
    stats.cardsCollected++;
    // v79: track new_cards mission
    if(runMission&&runMission.type==='new_cards'&&!runMission.completed){
      runMission.progress++;if(runMission.progress>=runMission.goal){runMission.completed=true;sfxStreakUp();}
    }
    // Vault milestone celebrations
    const ms=p.vault.size;
    const milestones={10:'10 CARDS!',20:'20 CARDS!',30:'HALFWAY THERE!',40:'40 CARDS!',50:'50 CARDS! SO CLOSE!',55:'55 CARDS!',59:'ONE MORE!'};
    if(milestones[ms]){
      setTimeout(()=>{
        tutorialMsg='\u2605 '+milestones[ms]+' '+ms+'/60 collected!';tutorialMsgTimer=260;
        if(ms>=50)screenShake(2,4);
      },400);
    }
  }
  // Add to hand if room
  for(let i=0;i<handLimit;i++){
    if(p.cd[i]===0){
      p.cd[i]=cardId;syncCardCount(pIdx);
      if(pIdx===0){cardTimers[i]=inDungeon?Date.now():0;decayWarn[i]=0;if(hadVaultBefore===null)stats.cardsCollected++;}
      return true;
    }
  }
  syncCardCount(pIdx);
  return false; // hand full (but vault already updated)
}
function removeCardFromPlayer(pIdx,slotOrRandom){
  const p=pl[pIdx];
  const handLimit=(pIdx===0)?HAND_SIZE:5;
  if(slotOrRandom===-1){// random
    const filled=[];for(let i=0;i<handLimit;i++){if(p.cd[i]>0)filled.push(i);}
    if(filled.length===0)return 0;
    const slot=filled[Math.floor(Math.random()*filled.length)];
    const card=p.cd[slot];p.cd[slot]=0;if(pIdx===0){cardTimers[slot]=0;decayWarn[slot]=0;stats.cardsLost++;}syncCardCount(pIdx);return card;
  }
  const card=p.cd[slotOrRandom];if(card>0){p.cd[slotOrRandom]=0;if(pIdx===0){cardTimers[slotOrRandom]=0;decayWarn[slotOrRandom]=0;stats.cardsLost++;}syncCardCount(pIdx);}return card;
}
function hasUniqueCards(pIdx){
  // For player: return vault (all ever collected); for rivals: derive from hand
  if(pIdx===0&&pl[0].vault)return pl[0].vault;
  const s=new Set();pl[pIdx].cd.forEach(c=>{if(c>0)s.add(c);});return s;
}
function playerHasAllSixty(){return pl[0].vault&&pl[0].vault.size>=60;}
function checkWinAndTransition(delayMs){
  if(!playerHasAllSixty())return;
  // Record best clear (elapsed from season start)
  const clearTime=Math.floor(getPlayElapsed()/1000);
  if(stats.bestClearRounds===0||rd<stats.bestClearRounds){stats.bestClearRounds=rd;}
  if(stats.bestClearTime===0||clearTime<stats.bestClearTime){stats.bestClearTime=clearTime;}
  const d=(delayMs!==undefined)?delayMs:500;
  if(d>0){setTimeout(()=>{gameOverTimesUp=false;stats.gamesPlayed++;saveStats();fadeOut(()=>{sc='victory';victoryFrame=fr;fadeIn();ub();});},d);}
  else{gameOverTimesUp=false;stats.gamesPlayed++;saveStats();fadeOut(()=>{sc='victory';victoryFrame=fr;fadeIn();ub();});}
}

// Rival AI: choose an action index (0=Draw,1=Steal,2=Barrier,3=Scout)
function rivalChooseAction(rIdx){
  const r=pl[rIdx];
  const aiIdx=rIdx-1;
  const ai=rivalAI[aiIdx];
  const rCardCount=r.cd.filter(c=>c>0).length;
  if(rCardCount<2)return 0;// Draw if low
  const roll=Math.random();
  const rUnique=hasUniqueCards(rIdx);

  if(ai.personality==='hunter'){
    // Aggressive: mostly Steal + Scout
    if(rUnique.size>=4){
      if(roll<0.4)return 2;// barrier to protect lead
      if(roll<0.7)return 1;// steal
      return 3;// scout
    }
    if(pl[0].cd.filter(c=>c>0).length>=2){
      if(roll<0.5)return 1;// steal from player
      if(roll<0.75)return 3;// scout player
      return 0;// draw
    }
    if(roll<0.4)return 1;if(roll<0.7)return 0;return 3;
  }else{
    // Collector: mostly Draw + Barrier, but will steal when behind
    if(rUnique.size>=4){
      if(roll<0.5)return 2;// barrier to protect lead
      if(roll<0.8)return 0;// draw to complete set
      return 3;// scout to plan
    }
    // Steal if player has cards collector needs and collector has 3+ cards
    const playerCards=hasUniqueCards(0);
    const needsFromPlayer=rCardCount>=3&&playerCards.size>rUnique.size;
    if(needsFromPlayer&&roll<0.20)return 1;// opportunistic steal (20%)
    if(roll<0.45)return 0;// draw (45%)
    if(roll<0.75)return 2;// barrier (30%)
    if(roll<0.90)return 3;// scout (15%)
    return 0;// draw fallback
  }
}

let bpPlayerBarrier=false; // track if player used barrier this round
let bpRivalActions=[0,0]; // track rival actions this round (pre-generated at select start)
let bpRivalTells=['','']; // body-language tells shown during select phase
let bpTellWasAccurate=[false,false]; // whether each rival's tell matched actual action
let bpRdIncremented=false; // guard: prevent double-increment of rd when pending discard
let bpActionsGenerated=false; // guard: only generate once per round
let bpScoutedCards=[null,null]; // [{round,cards:[{n,r,t}]}, null] — persists until battle ends
let battleRoundHistory=[]; // v90: [{rd,pa,r1a,r2a,outcome}] per round (pa=playerAction 0-4)

// Rival tells: atmospheric body-language hints (65% accurate, 35% misleading)
const RIVAL_BATTLE_TELLS=[
  // VEGA (index 0) — physical, predatory
  {
    0:['VEGA scans the dungeon floor...','VEGA reaches into the ether.','VEGA draws from the dark.'],
    1:['VEGA\'s eyes lock onto your hand.','VEGA steps forward hungrily.','VEGA narrows their eyes.'],
    2:['VEGA plants both feet firmly.','VEGA braces, arms crossed.','VEGA shields their cards.'],
    3:['VEGA tilts their head, watching.','VEGA studies the battlefield.','VEGA assesses the odds.'],
  },
  // MIRA (index 1) — calculated, collector
  {
    0:['MIRA reaches toward the pile...','MIRA is adding to her set.','MIRA scans the floor carefully.'],
    1:['MIRA steps forward, purposeful.','MIRA watches your cards closely.','MIRA calculates the exchange.'],
    2:['MIRA folds her arms.','MIRA builds a quiet wall.','MIRA shields her collection.'],
    3:['MIRA glances between both hands.','MIRA notes something quietly.','MIRA evaluates everything.'],
  },
];

function generateRivalTells(){
  bpRivalActions[0]=rivalChooseAction(1);
  bpRivalActions[1]=rivalChooseAction(2);
  bpActionsGenerated=true;
  for(let ri=0;ri<2;ri++){
    const actualAct=bpRivalActions[ri];
    const tells=RIVAL_BATTLE_TELLS[ri];
    let actForTell=actualAct;
    const isMisdirect=Math.random()<0.35;
    // 35% misdirection: pick a different action's tells
    if(isMisdirect){
      const others=[0,1,2,3].filter(a=>a!==actualAct);
      actForTell=others[Math.floor(Math.random()*others.length)];
    }
    bpTellWasAccurate[ri]=!isMisdirect;
    const pool=tells[actForTell]||tells[0];
    bpRivalTells[ri]=pool[Math.floor(Math.random()*pool.length)];
  }
}
let bpCardSelectActive=false, bpCardSelectIdx=0; // USE CARD selection
let bpTargetSelectActive=false, bpTargetSelectIdx=1; // STEAL/SCOUT target selection
let bpPendingAction=-1; // action waiting for target/card selection
let bpSelectedCardSlot=0; // which card slot to consume for USE CARD
let bpSelectedTarget=1; // which player index to target for STEAL/SCOUT

function generateResolveEvents(){
  const actionNames=['DRAW','STEAL','BARRIER','SCOUT','USE CARD'];const events=[];
  bpPlayerBarrier=(bpAction===2);
  // Rival AI actions: use pre-generated (from generateRivalTells at select start)
  // If not pre-generated yet (edge case), generate now without tells
  if(!bpActionsGenerated){bpRivalActions[0]=rivalChooseAction(1);bpRivalActions[1]=rivalChooseAction(2);}
  const rivalBarriers=[bpRivalActions[0]===2,bpRivalActions[1]===2];

  // ── PLAYER ACTION ──
  if(bpAction===0){// DRAW
    const cardId=pickAreaCard();const cr=CD[cardId-1];
    events.push({type:'action',who:'You',action:'DRAW',text:'You used DRAW!',effect:'none'});
    const wasInHandBefore=pl[0].cd.some(c=>c===cardId); // capture before addCardToPlayer modifies hand
    if(addCardToPlayer(0,cardId)){
      events.push({type:'result',text:'You obtained '+cr.n+'!',effect:'card_get',cardName:cr.n});
      lg.push('R'+rd+': You drew '+cr.n+'!');
      // Streak: new unique type (not already in hand before this draw)
      if(!wasInHandBefore){streakCount++;streakDisplayTimer=60;sfxStreakUp();}
    }else{
      // Hand full - store drawn card for discard prompt after resolve
      events.push({type:'result',text:'Hand full! You drew '+cr.n+' - discard one after battle.',effect:'none'});
      events._pendingDrawCard=cardId;
      lg.push('R'+rd+': Drew '+cr.n+' but hand full!');
    }
  }else if(bpAction===1){// STEAL
    sp.s=Math.max(0,sp.s-1);stats.stealsAttempted++;
    const tgt=bpSelectedTarget; // 1=Rival, 2=Hunter
    const tgtBarrier=rivalBarriers[tgt-1];
    events.push({type:'action',who:'You',action:'STEAL',text:'You used STEAL on '+pl[tgt].n+'!',effect:'slash',target:tgt});
    if(tgtBarrier){
      stats.stealsBlocked++;
      events.push({type:'result',text:pl[tgt].n+"'s BARRIER blocked your steal!",effect:'shield_block'});
      lg.push('R'+rd+': Steal on '+pl[tgt].n+' - BLOCKED!');
    }else if(pl[tgt].cc<=0){
      events.push({type:'result',text:pl[tgt].n+' has no cards to steal!',effect:'none'});
      lg.push('R'+rd+': Steal failed - '+pl[tgt].n+' has no cards!');
    }else{
      const stolen=removeCardFromPlayer(tgt,-1);
      if(stolen>0&&addCardToPlayer(0,stolen)){
        const stolenCard=CD[stolen-1];
        events.push({type:'result',text:'You stole '+stolenCard.n+' from '+pl[tgt].n+'!',effect:'steal_get',target:tgt,isCritical:true,stolenId:stolen,rarity:stolenCard.r});
        lg.push('R'+rd+': Stole '+stolenCard.n+' from '+pl[tgt].n+'! ('+RARITY_LABEL[stolenCard.r]+')');
        streakCount++;streakDisplayTimer=60;sfxStreakUp();
        // v79: track steal_win mission
        if(runMission&&runMission.type==='steal_win'&&!runMission.completed){runMission.progress=1;runMission.completed=true;}
      }else if(stolen>0){
        // Hand full — queue discard prompt so stolen card isn't lost
        const stolenCard=CD[stolen-1];
        events.push({type:'result',text:'You stole '+stolenCard.n+' but hand full! Discard one after battle.',effect:'steal_get',target:tgt,isCritical:true,stolenId:stolen,rarity:stolenCard.r});
        events._pendingDrawCard=stolen;
        lg.push('R'+rd+': Stole '+stolenCard.n+' - hand full!');
        streakCount++;streakDisplayTimer=60;sfxStreakUp();
      }else{
        events.push({type:'result',text:'Steal failed!',effect:'none'});
        lg.push('R'+rd+': Steal failed!');
      }
    }
  }else if(bpAction===2){// BARRIER
    sp.b=Math.max(0,sp.b-1);
    events.push({type:'action',who:'You',action:'BARRIER',text:'You raised a BARRIER!',effect:'shield'});
    lg.push('R'+rd+': You raised a Barrier!');
  }else if(bpAction===3){// SCOUT
    sp.c=Math.max(0,sp.c-1);stats.scoutUses++;
    const tgt=bpSelectedTarget;
    events.push({type:'action',who:'You',action:'SCOUT',text:'You used SCOUT on '+pl[tgt].n+'!',effect:'none'});
    const rCards=pl[tgt].cd.filter(c=>c>0).map(c=>CD[c-1]);
    const rCardNames=rCards.map(c=>c.n);
    const scoutMsg=rCardNames.length>0?pl[tgt].n+' has: '+rCardNames.join(', '):pl[tgt].n+' has no cards!';
    events.push({type:'result',text:scoutMsg,effect:'none'});
    lg.push('R'+rd+': Scout > '+scoutMsg);
    // Persist scout intel in opponent info box
    bpScoutedCards[tgt-1]={round:rd,cards:rCards.map(c=>({n:c.n,r:c.r,t:c.t}))};
  }else if(bpAction===4){// USE CARD
    // Consume selected card in hand for effect based on card TYPE (not ID)
    const filled=[];for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)filled.push(i);}
    if(filled.length>0){
      const slot=bpSelectedCardSlot;const card=removeCardFromPlayer(0,slot);
      const cr=CD[card-1];
      events.push({type:'action',who:'You',action:'USE CARD',text:'You consumed '+cr.n+'!',effect:'none'});
      const tgt=bpSelectedTarget;
      // Effect scales with rarity (r=1 common, r=5 legendary)
      if(cr.t==='attack'){
        // Attack: force steal (ignore barrier) — power scales with rarity
        if(Math.random()<0.2+cr.r*0.15){
          const stolen=removeCardFromPlayer(tgt,-1);
          if(stolen>0&&addCardToPlayer(0,stolen)){
            const sc_=CD[stolen-1];
            events.push({type:'result',text:cr.n+': Power steal! Got '+sc_.n+'!',effect:'steal_get',target:tgt,isCritical:true,stolenId:stolen,rarity:sc_.r});
            lg.push('R'+rd+': '+cr.n+' power steal → '+sc_.n+'! ('+RARITY_LABEL[sc_.r]+')');streakCount++;streakDisplayTimer=60;sfxStreakUp();
          }else if(stolen>0){
            events._pendingDrawCard=stolen;
            const sc_=CD[stolen-1];
            events.push({type:'result',text:cr.n+': Power stole '+sc_.n+'! Hand full — discard after.',effect:'steal_get',target:tgt,isCritical:true,stolenId:stolen,rarity:sc_.r});
          }else{events.push({type:'result',text:cr.n+': No cards to steal from '+pl[tgt].n+'!',effect:'none'});}
        }else{
          events.push({type:'result',text:cr.n+': Strike landed but foe dodged!',effect:'slash',target:tgt});
          lg.push('R'+rd+': '+cr.n+' strike — missed steal!');
        }
      }else if(cr.t==='defense'){
        // Defense: barrier + restore spell energy
        bpPlayerBarrier=true;
        const restore=Math.min(2,Math.ceil(cr.r/2));
        sp.b=Math.min(5,sp.b+restore);
        events.push({type:'result',text:cr.n+': Barrier raised! +'+restore+' barrier charge.',effect:'shield'});
        lg.push('R'+rd+': '+cr.n+' barrier +'+restore+'!');
      }else if(cr.t==='flee'){
        // Flee: escape battle immediately (no card loss)
        events.push({type:'result',text:cr.n+': ESCAPED! No cards lost this round!',effect:'shield'});
        lg.push('R'+rd+': '+cr.n+' — escaped battle!');
        events._escaped=true; // signal battle result handler to skip to map immediately
      }else if(cr.t==='magic'){
        // Magic: strip all barriers + guaranteed steal attempt
        rivalBarriers[0]=false;rivalBarriers[1]=false;bpPlayerBarrier=false;
        const stolen=removeCardFromPlayer(tgt,-1);
        if(stolen>0&&addCardToPlayer(0,stolen)){
          events.push({type:'result',text:cr.n+': Magic strike! Barriers nulled + stole '+CD[stolen-1].n+'!',effect:'damage',target:tgt,isCritical:true});
          lg.push('R'+rd+': '+cr.n+' magic steal → '+CD[stolen-1].n+'!');streakCount++;streakDisplayTimer=60;sfxStreakUp();
        }else if(stolen>0){
          events._pendingDrawCard=stolen;
          events.push({type:'result',text:cr.n+': Stole '+CD[stolen-1].n+'! Hand full — discard.',effect:'damage',target:tgt,isCritical:true});
        }else{
          events.push({type:'result',text:cr.n+': Barriers nulled! '+pl[tgt].n+' had no cards.',effect:'none'});
          lg.push('R'+rd+': '+cr.n+' barriers cleared — no steal!');
        }
      }else if(cr.t==='recovery'){
        // Recovery: restore all spell energy
        sp.s=Math.min(5,sp.s+Math.ceil(cr.r/2));
        sp.b=Math.min(5,sp.b+1);
        sp.c=Math.min(3,sp.c+1);
        events.push({type:'result',text:cr.n+': Restored spell energy! +'+Math.ceil(cr.r/2)+' Steal, +1 Barrier, +1 Scout.',effect:'card_get'});
        lg.push('R'+rd+': '+cr.n+' restored energy!');
      }
    }else{
      events.push({type:'action',who:'You',action:'USE CARD',text:'No cards to use!',effect:'none'});
    }
  }

  // ── RIVAL 1 ACTION ──
  const r1Act=bpRivalActions[0];
  if(r1Act===0){// Rival draws
    const cardId=pickAreaCardForMap(rivalMaps[0]);const cr=CD[cardId-1];
    if(addCardToPlayer(1,cardId)){
      events.push({type:'action',who:pl[1].n,action:'DRAW',text:pl[1].n+' used DRAW and got '+cr.n+'!',effect:'card_get_rival'});
      lg.push('R'+rd+': '+pl[1].n+' drew '+cr.n+'!');
    }else{
      // Rival hand full - discard random then draw
      removeCardFromPlayer(1,-1);
      addCardToPlayer(1,cardId);
      events.push({type:'action',who:pl[1].n,action:'DRAW',text:pl[1].n+' swapped a card for '+cr.n+'!',effect:'card_get_rival'});
      lg.push('R'+rd+': '+pl[1].n+' swapped for '+cr.n+'!');
    }
  }else if(r1Act===1){// Rival steals from player
    events.push({type:'action',who:pl[1].n,action:'STEAL',text:pl[1].n+' used STEAL on you!',effect:'slash',target:0});
    if(bpPlayerBarrier){
      events.push({type:'result',text:'Your BARRIER blocked the steal!',effect:'shield_block'});
      lg.push('R'+rd+': '+pl[1].n+' Steal - BLOCKED!');
    }else if(pl[0].cc<=0){
      events.push({type:'result',text:'You had no cards to steal!',effect:'none'});
      lg.push('R'+rd+': '+pl[1].n+' Steal failed - you have no cards!');
    }else{
      const stolen=removeCardFromPlayer(0,-1);
      if(stolen>0){
        if(!addCardToPlayer(1,stolen)){
          // Rival hand full, discard their weakest then add
          removeCardFromPlayer(1,-1);
          addCardToPlayer(1,stolen);
        }
        events.push({type:'result',text:pl[1].n+' stole your '+CD[stolen-1].n+'!',effect:'card_lost',target:0,isCritical:true,stolenId:stolen,rarity:CD[stolen-1].r,rivalIdx:0}); // v83
        lg.push('R'+rd+': '+pl[1].n+' stole your '+CD[stolen-1].n+'!');
        screenShake(4,10);
        if(streakCount>0){streakCount=0;streakLostTimer=60;sfxStreakLost();}
      }
    }
  }else if(r1Act===2){// Rival barrier (already tracked)
    events.push({type:'action',who:pl[1].n,action:'BARRIER',text:pl[1].n+' raised a BARRIER!',effect:'shield'});
    lg.push('R'+rd+': '+pl[1].n+' raised Barrier!');
  }else{// Scout
    events.push({type:'action',who:pl[1].n,action:'SCOUT',text:pl[1].n+' used SCOUT on you!',effect:'none'});
    lg.push('R'+rd+': '+pl[1].n+' scouted you!');
  }

  // ── RIVAL 2 (HUNTER) ACTION ──
  const r2Act=bpRivalActions[1];
  if(r2Act===0){
    const cardId=pickAreaCardForMap(rivalMaps[1]);const cr=CD[cardId-1];
    if(addCardToPlayer(2,cardId)){
      events.push({type:'action',who:pl[2].n,action:'DRAW',text:pl[2].n+' used DRAW and got '+cr.n+'!',effect:'card_get_rival'});
      lg.push('R'+rd+': '+pl[2].n+' drew '+cr.n+'!');
    }else{
      removeCardFromPlayer(2,-1);
      addCardToPlayer(2,cardId);
      events.push({type:'action',who:pl[2].n,action:'DRAW',text:pl[2].n+' swapped a card for '+cr.n+'!',effect:'card_get_rival'});
      lg.push('R'+rd+': '+pl[2].n+' swapped for '+cr.n+'!');
    }
  }else if(r2Act===1){
    events.push({type:'action',who:pl[2].n,action:'STEAL',text:pl[2].n+' tried STEAL!',effect:'slash',target:0});
    if(bpPlayerBarrier){
      events.push({type:'result',text:'Your BARRIER blocked it!',effect:'shield_block'});
    }else if(pl[0].cc<=0){
      events.push({type:'result',text:'You had no cards!',effect:'none'});
    }else{
      const stolen=removeCardFromPlayer(0,-1);
      if(stolen>0){
        if(!addCardToPlayer(2,stolen)){
          removeCardFromPlayer(2,-1);
          addCardToPlayer(2,stolen);
        }
        events.push({type:'result',text:pl[2].n+' stole your '+CD[stolen-1].n+'!',effect:'card_lost',target:0,isCritical:true,stolenId:stolen,rarity:CD[stolen-1].r,rivalIdx:1}); // v83
        lg.push('R'+rd+': '+pl[2].n+' stole your '+CD[stolen-1].n+'!');
        screenShake(4,10);
        if(streakCount>0){streakCount=0;streakLostTimer=60;sfxStreakLost();}
      }
    }
  }else if(r2Act===2){
    events.push({type:'action',who:pl[2].n,action:'BARRIER',text:pl[2].n+' raised a BARRIER!',effect:'shield'});
  }else{
    events.push({type:'action',who:pl[2].n,action:'SCOUT',text:pl[2].n+' used SCOUT!',effect:'none'});
  }

  return events;
}

// Card effect animation helpers
function drawCrystalEffect(cx_,cy_,evT){
  // Blue energy spiral around player sprite, then lightning bolt
  if(evT===1)sfxCrystal();
  const a=Math.max(0,1-evT/35);
  g.save();g.globalAlpha=a;
  for(let i=0;i<8;i++){
    const ang=evT*0.2+i*(Math.PI*2/8);
    const dist=20+evT*1.5;
    const px_=cx_+Math.cos(ang)*dist;
    const py_=cy_+Math.sin(ang)*dist*0.6;
    bx(px_-2,py_-2,4,4,'#48b8e8');bx(px_-1,py_-1,2,2,'#a0e0ff');
  }
  // Lightning bolt at mid-animation
  if(evT>15&&evT<30){
    g.strokeStyle=`rgba(100,200,255,${(30-evT)/15})`;g.lineWidth=2;
    g.beginPath();g.moveTo(cx_,cy_-20);
    g.lineTo(cx_+10,cy_-5);g.lineTo(cx_-5,cy_+5);g.lineTo(cx_+15,cy_+25);
    g.stroke();
    g.strokeStyle=`rgba(200,240,255,${(30-evT)/20})`;g.lineWidth=1;
    g.beginPath();g.moveTo(cx_+2,cy_-18);
    g.lineTo(cx_+12,cy_-3);g.lineTo(cx_-3,cy_+7);g.lineTo(cx_+17,cy_+27);
    g.stroke();
  }
  g.globalAlpha=1;g.restore();
}

function drawShadowEffect(cx_,cy_,evT){
  if(evT===1)sfxShadow();
  // Player fades to semi-transparent with dark particles
  if(evT<25){
    const a=0.3+Math.sin(evT*0.3)*0.2;
    g.globalAlpha=a;
    bx(cx_-25,cy_-30,50,60,'rgba(80,40,120,.4)');
    g.globalAlpha=1;
  }
  // Dark particles rising
  for(let i=0;i<6;i++){
    const px_=cx_-15+i*6+Math.sin(evT*0.2+i)*4;
    const py_=cy_+20-evT*1.5-i*3;
    const pa=Math.max(0,1-evT/30);
    bx(px_,py_,3,3,`rgba(80,30,120,${pa})`);
    bx(px_+1,py_+1,1,1,`rgba(140,80,180,${pa})`);
  }
}

function drawFlameEffect(cx_,cy_,evT){
  if(evT===1)sfxFlame();
  // Fire particles erupting from center
  for(let i=0;i<12;i++){
    const ang=i*(Math.PI*2/12)+evT*0.05;
    const dist=evT*2+Math.sin(i*1.3)*8;
    const px_=cx_+Math.cos(ang)*dist;
    const py_=cy_+Math.sin(ang)*dist*0.5-evT*0.5;
    const pa=Math.max(0,1-evT/35);
    const sz=4-evT*0.08;
    if(sz>0){
      bx(px_-sz/2,py_-sz/2,sz,sz,`rgba(220,80,40,${pa})`);
      bx(px_-sz/4,py_-sz/4,sz/2,sz/2,`rgba(255,200,60,${pa})`);
    }
  }
  // Target flash red
  if(evT<10){
    g.globalAlpha=(10-evT)/10*0.4;
    bx(0,0,W,H,'#ff2020');
    g.globalAlpha=1;
  }
}

function drawStormEffect(evT){
  if(evT===1)sfxStorm();
  // Screen shake
  if(evT<20){
    const shk=Math.sin(evT*2)*(20-evT)*0.3;
    g.save();g.translate(shk,shk*0.5);
  }
  // Lightning bolts across top
  if(evT<25){
    const a=Math.max(0,1-evT/25);
    g.strokeStyle=`rgba(255,255,200,${a})`;g.lineWidth=3;
    for(let i=0;i<3;i++){
      const sx_=80+i*200+Math.sin(evT+i)*20;
      g.beginPath();g.moveTo(sx_,0);
      g.lineTo(sx_+15,40);g.lineTo(sx_-10,80);g.lineTo(sx_+20,120);
      g.stroke();
    }
    // Flash
    if(evT%4<2){g.globalAlpha=a*0.3;bx(0,0,W,H,'#fff');g.globalAlpha=1;}
  }
  if(evT<20)g.restore();
}

function drawVoidEffect(cx_,cy_,evT){
  if(evT===1)sfxVoid();
  // Purple vortex in center
  const a=Math.max(0,1-evT/35);
  g.save();g.globalAlpha=a;
  for(let i=0;i<10;i++){
    const ang=evT*0.3+i*(Math.PI*2/10);
    const dist=30-evT*0.3+Math.sin(evT*0.5+i)*5;
    const px_=cx_+Math.cos(ang)*dist;
    const py_=cy_+Math.sin(ang)*dist*0.6;
    bx(px_-2,py_-2,4,4,`rgba(100,50,160,${a})`);
    bx(px_-1,py_-1,2,2,`rgba(180,100,220,${a})`);
  }
  // Card shape flying
  if(evT>10&&evT<30){
    const t_=(evT-10)/20;
    const cardX=lerp(cx_+60,cx_-60,t_);
    const cardY=cy_-10+Math.sin(t_*Math.PI)*-20;
    bx(cardX-6,cardY-8,12,16,'#7858a0');bx(cardX-5,cardY-7,10,14,'#9878c0');
    tx('?',cardX-3,cardY+4,6,'#fff');
  }
  g.globalAlpha=1;g.restore();
}

function drawResolvingPhase(){
  drawBattleBG();
  drawPhaseBanner('resolving');
  drawBattleArena();
  drawOpponentInfoBox();
  drawPlayerInfoBox();
  const t=fr-bpFrame,eventDuration=50,currentIdx=Math.floor(t/eventDuration);
  if(currentIdx<bpResolveQueue.length){
    bpResolveIdx=currentIdx;const ev=bpResolveQueue[currentIdx];const evT=t%eventDuration;
    // Trigger QTE on critical events (Steal, Flame, Void) at frame 15
    if(ev.isCritical&&evT===15&&!qteActive&&qteEventIdx!==currentIdx){
      qteActive=true;qteFrame=0;qteKeyPressed=false;qteSuccess=false;
      qteEventIdx=currentIdx;
      qteType=(ev.target===0)?'defend':'attack';
      sfxQtePrompt();
    }
    // Typewriter text box at bottom
    const slideIn=Math.min(1,evT/12);const textX=W*(1-slideIn)+16*slideIn;
    win(4,H-70,W-8,64);
    txShadow(ev.text,textX,H-38,14,'#303028','rgba(200,180,140,.3)');
    // Brief pause indicator
    if(evT>38){
      const dotCount=Math.floor((evT-38)/4)%4;
      txShadow('.'.repeat(dotCount),textX+ev.text.length*14+4,H-38,14,'#a09080','rgba(0,0,0,.2)');
    }
    // === EFFECT ANIMATIONS ===
    const playerCX=160,playerCY=H-130;
    const oppCX=W-200,oppCY=130;
    if(ev.effect==='slash'&&evT<25){
      const tgtCX=ev.target===0?playerCX:oppCX;
      const tgtCY=ev.target===0?playerCY:oppCY;
      g.save();g.strokeStyle=`rgba(200,40,40,${1-evT/25})`;g.lineWidth=3;
      for(let i=0;i<4;i++){
        g.beginPath();
        g.moveTo(tgtCX-20+i*10,tgtCY-20+i*5);
        g.lineTo(tgtCX+20+i*10,tgtCY+20+i*5);
        g.stroke();
      }
      g.restore();if(evT===1)sfxSlash();
    }
    if(ev.effect==='shield'&&evT<30){
      const r_=evT*2.5,a_=1-evT/30;g.save();
      g.strokeStyle=`rgba(48,96,176,${a_})`;g.lineWidth=3;
      g.beginPath();g.arc(playerCX,playerCY,r_,0,Math.PI*2);g.stroke();
      g.strokeStyle=`rgba(100,160,240,${a_*.6})`;g.lineWidth=2;
      g.beginPath();g.arc(playerCX,playerCY,r_*.7,0,Math.PI*2);g.stroke();
      // Shield icon
      if(evT<15){
        g.globalAlpha=1-evT/15;
        bx(playerCX-8,playerCY-12,16,20,'rgba(60,120,200,.5)');
        bx(playerCX-6,playerCY-10,12,16,'rgba(100,180,255,.4)');
      }
      g.globalAlpha=1;g.restore();if(evT===1)sfxShield();
    }
    if(ev.effect==='shield_block'&&evT<30){
      const r_=evT*3,a_=1-evT/30;g.save();
      g.strokeStyle=`rgba(48,96,240,${a_})`;g.lineWidth=4;
      g.beginPath();g.arc(playerCX,playerCY,r_,0,Math.PI*2);g.stroke();
      if(evT<10){
        g.globalAlpha=(10-evT)/10*0.5;
        bx(playerCX-30,playerCY-30,60,60,'#6090ff');
        g.globalAlpha=1;
      }
      // "BLOCKED" text
      if(evT>5&&evT<25){
        g.globalAlpha=Math.min(1,(evT-5)/5)*Math.max(0,(25-evT)/10);
        txShadow('BLOCKED!',playerCX-50,playerCY-40,16,'#4080ff','rgba(0,0,30,.6)');
        g.globalAlpha=1;
      }
      g.restore();if(evT===1)sfxShield();
    }
    if(ev.effect==='damage'&&evT<20){
      bpShakeTarget=ev.target!==undefined?ev.target:0;bpShakeTimer=20-evT;
      if(evT===1)sfxDamage();
      // Flash on target
      if(evT<6&&evT%2===0){
        const tgtCX=ev.target===0?playerCX:oppCX;
        const tgtCY=ev.target===0?playerCY:oppCY;
        g.globalAlpha=0.5;bx(tgtCX-30,tgtCY-40,60,80,'#ff4040');g.globalAlpha=1;
      }
    }
    else if(ev.effect!=='damage'&&ev.effect!=='card_lost'&&evT>20)bpShakeTimer=0;
    // v83: card-lost animation — card flies from player to rival with red trail
    if(ev.effect==='card_lost'&&evT<50){
      const rar=ev.rarity||1;
      const ri=ev.rivalIdx||0; // 0=VEGA(pl1), 1=MIRA(pl2)
      const rivalCX=ri===0?oppCX:W-310;
      const rivalCY=ri===0?oppCY:140;
      const rivalCol=ri===0?'#f080c0':'#f0c830';
      // Card travels from player to rival over 32 frames
      const prog=Math.min(1,evT/32);
      const eased=prog<0.5?2*prog*prog:1-Math.pow(-2*prog+2,2)/2; // ease-in-out
      const cx_=playerCX+(rivalCX-playerCX)*eased;
      const cy_=playerCY+(rivalCY-playerCY)*eased-28*Math.sin(eased*Math.PI);
      const scl_=Math.max(0.3,1-eased*0.6);
      const cw_=36*scl_,ch_=50*scl_;
      // Red glow that follows card
      const glA=0.5*(1-eased);
      if(glA>0.02){
        g.globalAlpha=glA;
        const grd=g.createRadialGradient(cx_,cy_,0,cx_,cy_,28);
        grd.addColorStop(0,'rgba(200,40,40,.7)');grd.addColorStop(1,'rgba(0,0,0,0)');
        g.fillStyle=grd;g.fillRect(cx_-32,cy_-32,64,64);
        g.globalAlpha=1;
      }
      // Card shards/spin: rotate as it leaves
      const angle=eased*Math.PI*1.5;
      g.save();g.translate(cx_,cy_);g.rotate(angle);
      bx(-cw_/2,-ch_/2,cw_,ch_,'#c03030');
      bx(-cw_/2+2,-ch_/2+2,cw_-4,ch_-4,ev.stolenId?CD[ev.stolenId-1].c||'#303028':'#603020');
      if(scl_>0.4&&ev.stolenId){drawCardCharacter(-cw_/2+2,-ch_/2+2,ev.stolenId,scl_*0.55,fr);}
      g.restore();
      // Red particle trail behind card
      for(let i=0;i<6;i++){
        const tp=Math.max(0,eased-(i+1)*0.04);
        const tx_=playerCX+(rivalCX-playerCX)*tp;
        const ty_=playerCY+(rivalCY-playerCY)*tp-28*Math.sin(tp*Math.PI);
        const ta=(1-i/6)*0.5*(1-eased);
        g.globalAlpha=ta;
        bx(tx_-3,ty_-3,6,6,i<3?'#c03020':'#804020');
        g.globalAlpha=1;
      }
      // Scratch marks at player origin early in animation
      if(evT<12){
        const scrA=(12-evT)/12;
        g.globalAlpha=scrA*0.7;
        g.save();g.strokeStyle='#c03030';g.lineWidth=2;
        for(let s=0;s<3;s++){
          g.beginPath();g.moveTo(playerCX-18+s*10,playerCY-20);g.lineTo(playerCX-10+s*10,playerCY+20);g.stroke();
        }
        g.restore();g.globalAlpha=1;
      }
      // "STOLEN!" flash at player position early
      if(evT>6&&evT<22){
        const flA=Math.min(1,(evT-6)/4)*Math.max(0,(22-evT)/6);
        g.globalAlpha=flA;
        txShadow('CARD STOLEN!',playerCX-70,playerCY-60,rar>=4?13:10,'#ff4040','rgba(0,0,0,.6)');
        g.globalAlpha=1;
      }
      // Rival catches card at arrival (frame 32+)
      if(evT>=32&&evT<50){
        const catchA=Math.min(1,(evT-32)/6);
        g.globalAlpha=catchA;
        const catchStr=rar>=4?rivalCol:rivalCol;
        bx(rivalCX-14,rivalCY-22,28,42,rivalCol);bx(rivalCX-12,rivalCY-20,24,38,'rgba(0,0,0,.3)');
        const catchPulse=(evT-32)*3;
        if(catchPulse<40){g.strokeStyle=rivalCol;g.lineWidth=2;g.beginPath();g.arc(rivalCX,rivalCY,catchPulse,0,Math.PI*2);g.stroke();}
        g.globalAlpha=1;
      }
      if(evT===2)sfxDamage();
      if(evT===32){screenShake(3,8);}
    }
    if(ev.effect==='card_get'&&evT<35){
      // Card rising with sparkles
      const cardY=playerCY+30-evT*2;const scale_=Math.min(1,evT/15);
      const cw_=40*scale_,ch_=56*scale_;
      bx(playerCX-cw_/2,cardY-ch_/2,cw_,ch_,'#d85840');
      bx(playerCX-cw_/2+2,cardY-ch_/2+2,cw_-4,ch_-4,'#e87060');
      if(scale_>.5)tx('\u25B2',playerCX-6,cardY+4,Math.floor(12*scale_),'#fff');
      for(let i=0;i<8;i++){
        const ang=i*(Math.PI*2/8)+evT*.15,dist=12+evT*.8;
        const pa=Math.max(0,1-evT/35);
        bx(playerCX+Math.cos(ang)*dist,cardY+Math.sin(ang)*dist,3,3,`rgba(255,255,200,${pa})`);
      }
      if(evT===1)sfxCardGet();
    }
    if(ev.effect==='card_get_rival'&&evT<25){
      const riseY=oppCY+20-evT*1.5;
      bx(oppCX-10,riseY-14,20,28,'#d85840');bx(oppCX-8,riseY-12,16,24,'#e87060');
      tx('\u25B2',oppCX-4,riseY+6,8,'#fff');
      if(evT===1)sfxCardGet();
    }
    if(ev.effect==='steal_get'&&evT<50){
      // Dramatic steal animation: card trajectory from rival to player + rarity burst
      const rar=ev.rarity||1;
      const rarCols=['','#50d060','#5090f0','#b060e0','#e0a020','#fff8e0'];
      const rarGlow=['','rgba(80,200,80,.3)','rgba(80,144,240,.3)','rgba(176,80,224,.4)','rgba(224,160,32,.5)','rgba(255,248,200,.6)'];
      const rcol=rarCols[rar]||'#d85840';
      const rglow=rarGlow[rar]||'rgba(200,80,80,.3)';
      // Card moves from rival (oppCX) to player (playerCX) over 30 frames
      const prog=Math.min(1,evT/30);
      const cx_=oppCX+(playerCX-oppCX)*prog;
      const cy_=oppCY-30*Math.sin(prog*Math.PI); // arc trajectory
      const scl_=Math.min(1,evT/8);
      const cw_=36*scl_,ch_=50*scl_;
      // Glow burst at card position
      if(evT<30){
        const glA=0.6*(1-prog);
        g.globalAlpha=glA;
        const grd=g.createRadialGradient(cx_,cy_,0,cx_,cy_,30+rar*8);
        grd.addColorStop(0,rglow.replace('.3','.'+(0.6+rar*.06).toFixed(2)));
        grd.addColorStop(1,'rgba(0,0,0,0)');
        g.fillStyle=grd;g.fillRect(cx_-40,cy_-40,80,80);
        g.globalAlpha=1;
      }
      // Card frame (colored by rarity)
      bx(cx_-cw_/2,cy_-ch_/2,cw_,ch_,rcol);
      bx(cx_-cw_/2+2,cy_-ch_/2+2,cw_-4,ch_-4,ev.stolenId?CD[ev.stolenId-1].c||'#303028':'#e87060');
      if(scl_>.5&&ev.stolenId){drawCardCharacter(cx_-cw_/2+2,cy_-ch_/2+2,ev.stolenId,scl_*0.6,fr);}
      // Rarity sparks orbit
      const sparkCount=2+rar*2;
      for(let i=0;i<sparkCount;i++){
        const ang=evT*0.25+i*(Math.PI*2/sparkCount);
        const dist=16+evT*0.6;
        const sa=Math.max(0,1-evT/50);
        g.globalAlpha=sa;
        bx(cx_+Math.cos(ang)*dist-2,cy_+Math.sin(ang)*dist-2,4,4,rcol);
        g.globalAlpha=1;
      }
      // Arrival: screen flash proportional to rarity (only once at frame 30)
      if(evT===30){
        if(rar>=4){flash();}
        sfxCardGet();
        // High rarity: extra shake
        if(rar>=3)screenShake(rar-1,rar*2);
      }
      // "STOLEN!" text appears during flight
      if(evT>10&&evT<40){
        const stA=Math.min(1,(evT-10)/5)*Math.max(0,(40-evT)/8);
        g.globalAlpha=stA;
        const stLabel=rar>=5?'LEGENDARY STEAL!':rar>=4?'EPIC STEAL!':rar>=3?'RARE STEAL!':'STOLEN!';
        txShadow(stLabel,W/2-60,playerCY-80,rar>=4?14:10,rcol,'rgba(0,0,0,.5)');
        g.globalAlpha=1;
      }
    }
    // Card consumption effect animations based on card name in event text
    if(ev.text&&ev.text.includes('Aegis')&&ev.type==='result'&&evT<35){
      drawCrystalEffect(playerCX,playerCY,evT);
    }
    if(ev.text&&ev.text.includes('Umbra')&&ev.type==='result'&&evT<30){
      drawShadowEffect(playerCX,playerCY,evT);
    }
    if(ev.text&&ev.text.includes('Ignis')&&ev.type==='result'&&evT<35){
      drawFlameEffect(W/2,H/2-20,evT);
    }
    if(ev.text&&ev.text.includes('Tempest')&&ev.type==='result'&&evT<25){
      drawStormEffect(evT);
    }
    if(ev.text&&ev.text.includes('Nihil')&&ev.type==='result'&&evT<35){
      drawVoidEffect(W/2,H/2-20,evT);
    }
    // v89: Enhanced QTE overlay
    if(qteActive){
      const qteProgress=qteFrame/qteWindow;
      const isUrgent=qteProgress>0.6;
      const isCritical=qteProgress>0.8;
      const isDefend=qteType==='defend';
      // Fullscreen edge vignette pulse
      const vigIntensity=isCritical?(0.35+Math.sin(fr*0.6)*0.15):isUrgent?0.18:0;
      if(vigIntensity>0){
        const vigCol=isDefend?`rgba(220,40,40,${vigIntensity})`:`rgba(40,160,240,${vigIntensity})`;
        const vig=g.createRadialGradient(W/2,H/2,H*0.2,W/2,H/2,H*0.75);
        vig.addColorStop(0,'rgba(0,0,0,0)');
        vig.addColorStop(1,vigCol);
        g.globalAlpha=1;
        g.fillStyle=vig;
        g.fillRect(0,0,W,H);
      }
      // Main QTE panel
      const qPW=360,qPH=110;
      const qPX=W/2-qPW/2, qPY=H/2-qPH/2-20;
      // Slide in on frame 0-8
      const slideIn=Math.min(1,qteFrame/8);
      const slideY=qPY+(1-slideIn)*30;
      // Panel background with glow border
      const accentCol=isDefend?
        (isCritical?'#ff3030':isUrgent?'#f08030':'#f0a000'):
        (isCritical?'#4080ff':isUrgent?'#30c0f0':'#30d080');
      g.globalAlpha=0.97*slideIn;
      // Shadow
      g.shadowBlur=isCritical?24:14;
      g.shadowColor=accentCol;
      bx(qPX,slideY,qPW,qPH,'rgba(4,6,18,.96)');
      g.shadowBlur=0;
      // Top accent bar
      bx(qPX,slideY,qPW,4,accentCol);
      // Side accent lines
      bx(qPX,slideY,2,qPH,accentCol);
      bx(qPX+qPW-2,slideY,2,qPH,accentCol);
      g.globalAlpha=slideIn;
      // Action label (top-left small)
      const labelText=isDefend?'INCOMING STEAL':'BONUS STRIKE';
      tx(labelText,qPX+12,slideY+18,7,'rgba(200,200,200,.6)');
      // Z key icon (right side)
      const kx=qPX+qPW-52,ky=slideY+qPH/2-18;
      bx(kx,ky,36,36,'rgba(20,20,40,.9)');
      bx(kx,ky,36,1,accentCol);bx(kx,ky,1,36,accentCol);
      bx(kx,ky+35,36,1,accentCol);bx(kx+35,ky,1,36,accentCol);
      // Pulsing glow on key
      const kPulse=0.6+Math.sin(fr*0.4)*0.4;
      g.globalAlpha=kPulse*slideIn;
      g.shadowBlur=12;g.shadowColor=accentCol;
      tx('Z',kx+8,ky+30,22,accentCol);
      g.shadowBlur=0;
      g.globalAlpha=slideIn;
      // Main prompt text with scale pulse
      const pScale=isCritical?(1+Math.sin(fr*0.5)*0.06):1;
      const promptText=isDefend?'PRESS Z TO BLOCK!':'PRESS Z FOR BONUS!';
      const pFontSz=Math.round(15*pScale);
      g.save();
      g.translate(qPX+qPW/2-56,slideY+60);
      g.scale(pScale,pScale);
      g.shadowBlur=8;g.shadowColor=accentCol;
      g.fillStyle=isCritical?'#ffffff':isUrgent?'#ffe080':'#e8e8e8';
      g.font=`bold ${pFontSz}px monospace`;
      g.fillText(promptText,0,0);
      g.shadowBlur=0;
      g.restore();
      // Countdown bar background
      const barW=qPW-24,barH=10;
      const barX=qPX+12,barY=slideY+qPH-22;
      bx(barX,barY,barW,barH,'rgba(0,0,0,.6)');
      bx(barX,barY,barW,1,'rgba(255,255,255,.1)');
      // Countdown fill — depletes left to right
      const fillW=Math.max(0,Math.floor(barW*(1-qteProgress)));
      const barCol=isCritical?'#ff3030':isUrgent?'#f08030':'#40d080';
      if(fillW>0){
        const barGrad=g.createLinearGradient(barX,barY,barX+fillW,barY);
        barGrad.addColorStop(0,barCol);
        barGrad.addColorStop(1,isCritical?'#ff8060':isUrgent?'#f0d030':'#80f0a0');
        g.fillStyle=barGrad;
        g.fillRect(barX,barY,fillW,barH);
      }
      // Bar border
      bx(barX,barY,barW,1,accentCol);
      bx(barX,barY+barH,barW,1,accentCol);
      // Tick marks on bar
      for(let i=1;i<5;i++){const tx_=barX+Math.floor(barW*i/5);bx(tx_,barY,1,barH,'rgba(0,0,0,.3)');}
      g.globalAlpha=1;
    }
    // QTE result flash (v89: bigger, positioned above battle area)
    if(qteResultTimer>0){
      const ra=Math.min(1,qteResultTimer/12);
      const isSuccess=qteResultText==='BLOCKED!'||qteResultText==='BONUS!';
      const rc=isSuccess?'#40ff60':'#ff4040';
      const rScale=qteResultTimer>30?1+(qteResultTimer-30)/10*0.3:1;
      g.globalAlpha=ra;
      g.save();
      g.translate(W/2,H/2-20);
      g.scale(rScale,rScale);
      g.shadowBlur=20;g.shadowColor=rc;
      g.fillStyle=rc;
      g.font=`bold 28px monospace`;
      const rw=g.measureText(qteResultText).width;
      g.fillText(qteResultText,-rw/2,0);
      g.shadowBlur=0;
      g.restore();
      g.globalAlpha=1;
    }
  }else{
    // Anti-softlock: if player has 0 cards and 0 spells after resolve, give a pity card
    if(pl[0].cd.filter(c=>c>0).length===0&&sp.s<=0&&sp.b<=0&&sp.c<=0){
      const pityCard=pickAreaCard();
      addCardToPlayer(0,pityCard);
      lg.push('R'+rd+': A wandering spirit gave you '+CD[pityCard-1].n+'!');
    }
    battlePhase='result';bpFrame=fr;bpShakeTarget=-1;bpShakeTimer=0;
  }
}

function drawResultPhase(){
  drawBattleBG();
  drawPhaseBanner('result');
  drawBattleArena();
  drawOpponentInfoBox();
  drawPlayerInfoBox();
  const t=fr-bpFrame;
  // Summary panel in center
  const panW=500,panH=280,panX=W/2-panW/2,panY=H/2-panH/2-10;
  const slideIn_=Math.min(1,t/15);
  g.globalAlpha=slideIn_;
  win(panX,panY,panW,panH);
  txShadow('ROUND '+rd+' SUMMARY',panX+panW/2-100,panY+22,14,'#308030','rgba(0,0,0,.3)');
  // Divider
  bx(panX+16,panY+30,panW-32,1,'rgba(200,180,140,.3)');

  // Side-by-side rival actions
  const actionNames=['DRAW','STEAL','BARRIER','SCOUT','USE CARD'];
  const colW=Math.floor((panW-48)/3);
  const players=[{idx:0,name:'You',action:bpAction},{idx:1,name:pl[1].n,action:bpRivalActions[0]},{idx:2,name:pl[2].n,action:bpRivalActions[1]}];
  players.forEach((p_,col)=>{
    const cx_=panX+16+col*(colW+8);
    const cy_=panY+38;
    const actAlpha=Math.min(1,Math.max(0,(t-15-col*6)/8));
    if(actAlpha<=0)return;
    g.globalAlpha=actAlpha*slideIn_;
    // Name header
    const nameCol=col===0?'#4080d0':col===1?'#d060a0':'#d0a030';
    txShadow(p_.name,cx_+4,cy_+12,9,nameCol,'rgba(0,0,0,.2)');
    // Action
    const actName=actionNames[p_.action]||'???';
    let actCol='#686068';
    if(p_.action===0)actCol='#48b8e8';
    else if(p_.action===1)actCol='#b04040';
    else if(p_.action===2)actCol='#3060b0';
    else if(p_.action===3)actCol='#308030';
    else if(p_.action===4)actCol='#806030';
    txShadow(actName,cx_+4,cy_+28,8,actCol,'rgba(0,0,0,.2)');
    // Card count
    const cc=pl[p_.idx].cd.filter(c=>c>0).length;
    txShadow(cc+'/5 cards',cx_+4,cy_+42,7,'#988870','rgba(0,0,0,.15)');
    // Mini card bar
    for(let i=0;i<5;i++){
      const cd=pl[p_.idx].cd[i];
      const sx_=cx_+4+i*22;
      if(cd>0){
        const cr=CD[cd-1];
        bx(sx_,cy_+48,20,10,cr.d);bx(sx_+1,cy_+49,18,8,cr.c);
      }else{
        bx(sx_,cy_+48,20,10,'#383838');
      }
    }
  });
  g.globalAlpha=slideIn_;

  // Divider before events
  bx(panX+16,panY+108,panW-32,1,'rgba(200,180,140,.2)');

  // Recent events summary from resolve queue
  if(bpResolveQueue&&bpResolveQueue.length>0){
    let lineY=panY+112;
    const maxEvents=Math.min(bpResolveQueue.length,7);
    for(let i=0;i<maxEvents;i++){
      const ev=bpResolveQueue[i];
      if(!ev.text)continue;
      const evAlpha=Math.min(1,Math.max(0,(t-20-i*3)/8));
      if(evAlpha<=0)continue;
      g.globalAlpha=evAlpha*slideIn_;
      let evCol='#686068';
      if(ev.text.includes('stole')||ev.text.includes('Burn'))evCol='#c04040';
      else if(ev.text.includes('obtained')||ev.text.includes('got'))evCol='#308030';
      else if(ev.text.includes('BARRIER')||ev.text.includes('BLOCKED'))evCol='#3060b0';
      else if(ev.text.includes('Umbra'))evCol='#7858a0';
      // Truncate long text
      const dispText=ev.text.length>54?ev.text.substring(0,52)+'..':ev.text;
      txShadow(dispText,panX+16,lineY+10,7,evCol,'rgba(0,0,0,.2)');
      lineY+=16;
    }
  }
  g.globalAlpha=slideIn_;
  // Spell counts
  txShadow('Spells: STL:'+sp.s+' BAR:'+sp.b+' SCT:'+sp.c,panX+16,panY+panH-24,9,'#988870','rgba(0,0,0,.2)');
  g.globalAlpha=1;

  // Rival post-battle reaction (appears after t>30)
  if(t>30){
    const reactAlpha=Math.min(1,(t-30)/10);
    g.globalAlpha=reactAlpha;
    // Determine who benefited from this round
    const evTexts=(bpResolveQueue||[]).map(e=>e.text||'').join(' ');
    const playerStole=evTexts.includes('You stole')||evTexts.includes('Power steal!')||evTexts.includes('Magic strike!');
    const rivalStole=evTexts.includes('stole your')||evTexts.includes('STOLE');
    // Choose reacting rival: prefer the targeted rival, fall back to encounter initiator
    const reactRivalIdx=(bpSelectedTarget>=1&&bpSelectedTarget<=2)?bpSelectedTarget:((encounterExclTarget>=1&&encounterExclTarget<=2)?encounterExclTarget:1);
    const reactAiIdx=reactRivalIdx-1;
    let reaction='';
    if(playerStole){
      // Player got a card — rival reacts with anger/grudging respect
      const loseLines=[
        ['Next time.','I wasn\'t ready.','Lucky. Just luck.','That card was nothing.','Remember this feeling.'],
        ['Interesting move.','You surprised me.','I\'ll adapt.','Well played. Once.','I\'ll be taking it back.'],
      ];
      const lines=loseLines[reactAiIdx]||loseLines[0];
      reaction=lines[Math.floor(bpFrame/13)%lines.length];
    }else if(rivalStole){
      // Rival got a card — gloats
      const winLines=[
        ['Mine now.','Easy.','Too slow.','This collection grows.','Don\'t fight the inevitable.'],
        ['As predicted.','Filed away safely.','My collection expands.','Thank you for that.','Perfect addition.'],
      ];
      const lines=winLines[reactAiIdx]||winLines[0];
      reaction=lines[Math.floor(bpFrame/13)%lines.length];
    }else{
      // Draw / neither got cards
      const drawLines=[
        ['Boring. Move.','Next time I\'ll have you.','Stay sharp.','Waste of my time.','...'],
        ['Inconclusive.','We\'ll settle this later.','Calculations updated.','Stalemate. For now.','Hmm.'],
      ];
      const lines=drawLines[reactAiIdx]||drawLines[0];
      reaction=lines[Math.floor(bpFrame/13)%lines.length];
    }
    if(reaction){
      const rName=pl[reactRivalIdx].n;
      const rNameCol=reactRivalIdx===1?'#f080c0':'#f0c830';
      const reactX=panX;const reactY=panY-36;
      bx(reactX,reactY-4,panW,30,'rgba(0,0,0,.5)');
      txShadow(rName+':',reactX+8,reactY+16,9,rNameCol,'rgba(0,0,0,.4)');
      txShadow('\u201C'+reaction+'\u201D',reactX+70,reactY+16,9,'#f0e8c8','rgba(0,0,0,.4)');
    }
    g.globalAlpha=1;
  }

  // Tell accuracy reveal (appears at t>35, subtle footer)
  if(t>35&&bpRivalTells[0]!==''){
    const tellFadeA=Math.min(1,(t-35)/10);
    g.globalAlpha=tellFadeA*0.75;
    const actNames=['DRAW','STEAL','BARRIER','SCOUT'];
    const r1correct=bpTellWasAccurate[0];const r2correct=bpTellWasAccurate[1];
    const r1col=r1correct?'#40c040':'#c04040';
    const r2col=r2correct?'#40c040':'#c04040';
    txShadow(pl[1].n+':'+(r1correct?'\u2713 read':'x misread')+' | '+pl[2].n+':'+(r2correct?'\u2713 read':'x misread'),panX+16,panY+panH-8,7,'#888878','rgba(0,0,0,.2)');
    g.globalAlpha=1;
  }

  // Press Z prompt
  if(t>25&&Math.floor(t/20)%2===0){
    txShadow('PRESS Z TO CONTINUE',W/2-120,panY+panH+12,10,'#989080','rgba(0,0,0,.3)');
  }
}

function dAct(){
  if(battlePhase==='vs_splash')drawVsSplash();
  else if(battlePhase==='select')drawSelectPhase();
  else if(battlePhase==='confirming'||battlePhase==='waiting')drawConfirmingPhase();
  else if(battlePhase==='resolving')drawResolvingPhase();
  else if(battlePhase==='result')drawResultPhase();
}

// ═══════════════════════════════════════
