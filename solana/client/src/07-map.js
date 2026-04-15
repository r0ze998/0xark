// MAP SCREEN
// ═══════════════════════════════════════
const HUD_HEIGHT=72;

// Pre-built edge gradients for map boundary vignette (avoids creating gradient objects every frame)
const _edgeFade=20;
const _mapEdgeGradL=(()=>{const gr=g.createLinearGradient(0,0,_edgeFade,0);gr.addColorStop(0,'#000');gr.addColorStop(1,'rgba(0,0,0,0)');return gr;})();
const _mapEdgeGradR=(()=>{const gr=g.createLinearGradient(W-_edgeFade,0,W,0);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'#000');return gr;})();
const _mapEdgeGradT=(()=>{const gr=g.createLinearGradient(0,0,0,_edgeFade);gr.addColorStop(0,'#000');gr.addColorStop(1,'rgba(0,0,0,0)');return gr;})();
const _mapEdgeGradB=(()=>{const gr=g.createLinearGradient(0,H-HUD_HEIGHT-_edgeFade,0,H-HUD_HEIGHT);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'#000');return gr;})();

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
  // v183: Per-floor dungeon ambient screen-space particles (over revealed tiles)
  if(inDungeon&&currentFloor>=1&&currentFloor<=5){
    drawDungeonAmbientParticles();
  }
  // v186: Per-floor dungeon edge vignette — color-coded screen border glow
  if(inDungeon&&currentFloor>=1&&currentFloor<=5){
    drawDungeonVignette();
  }
  // v192: Town ambient particles — golden motes (magic energy) + sea-breeze wisps
  if(!inDungeon&&currentMap===0){
    drawTownAmbientParticles();
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
  const col=DUNGEON_VIGNETTE_COL[depth];if(!col)return;
  const visH=H-HUD_HEIGHT;
  // Breathing pulse tied to depth — deeper = faster pulse for tension
  const pulse=0.30+0.08*Math.sin(fr*(0.02+depth*0.008));
  // Draw edge strips using canvas gradients for smooth fade-in from edges
  const edgeW=44; // glow band width in pixels
  g.save();
  // Top edge
  const gT=g.createLinearGradient(0,0,0,edgeW);
  gT.addColorStop(0,col+pulse+')');gT.addColorStop(1,col+'0)');
  g.fillStyle=gT;g.fillRect(0,0,W,edgeW);
  // Bottom edge (above HUD)
  const gB=g.createLinearGradient(0,visH,0,visH-edgeW);
  gB.addColorStop(0,col+pulse+')');gB.addColorStop(1,col+'0)');
  g.fillStyle=gB;g.fillRect(0,visH-edgeW,W,edgeW);
  // Left edge
  const gL=g.createLinearGradient(0,0,edgeW,0);
  gL.addColorStop(0,col+pulse+')');gL.addColorStop(1,col+'0)');
  g.fillStyle=gL;g.fillRect(0,0,edgeW,visH);
  // Right edge
  const gR=g.createLinearGradient(W,0,W-edgeW,0);
  gR.addColorStop(0,col+pulse+')');gR.addColorStop(1,col+'0)');
  g.fillStyle=gR;g.fillRect(W-edgeW,0,edgeW,visH);
  g.restore();
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

    // ── CRAFTPIX OVERWORLD TREE DECORATIONS ──
    // Drawn in two Y-sorted passes via drawCpxTreesInRange() called from dMap().
    // (code removed from here — see drawCpxTreesInRange below)

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
      // Use radial gradient only every 3rd frame for pulse; blit flat color in between
      if(fr%3===0){
        const vigCol=isHigh?`rgba(180,20,20,${baseA})`:`rgba(160,90,0,${baseA})`;
        const vig=g.createRadialGradient(W/2,H/2,H*0.2,W/2,H/2,H*0.9);
        vig.addColorStop(0,'rgba(0,0,0,0)');
        vig.addColorStop(1,vigCol);
        g.fillStyle=vig;g.fillRect(0,0,W,H);
      }
      if(isHigh&&fr%160<4){
        const fA=0.08*(1-fr%160/4);
        g.globalAlpha=fA;bx(0,0,W,H,'#c01010');g.globalAlpha=1;
      }
    }
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
  if(fr%2===0)drawBirds();
  if(fr%2===0)drawPirateDecorations(); // ship/barrels/vines/seagulls (no trees)
  drawTownWeather();
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
      txShadow(rLabel,spx+8-lW/2+3,spy-35,6,rNameCol,'rgba(0,0,0,.5)');
    }
  });

  // Y-sorted trees FG pass: trees with base BELOW (south of) player drawn over sprites
  if(!inDungeon)drawCpxTreesInRange(pl[0].y+1,MH);

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
        const rarCols=['#808080','#60b0ff','#a060e0','#d09020','#f0d040'];
        const rarCol=rarCols[Math.min(cr.r-1,4)]||'#f0c030';
        const glowPulse=0.55+0.35*Math.sin(fr*0.1+it.glow);
        // Glow halo
        g.globalAlpha=glowPulse*0.5;
        const grd=g.createRadialGradient(ipx+TW/2,ipy+TH/2,2,ipx+TW/2,ipy+TH/2,12);
        grd.addColorStop(0,rarCol);grd.addColorStop(1,'rgba(0,0,0,0)');
        g.fillStyle=grd;g.fillRect(ipx,ipy,TW,TH);
        g.globalAlpha=1;
        // Card mini sprite (6×8 rectangle at center)
        const cx2=ipx+TW/2-3,cy2=ipy+TH/2-4;
        bx(cx2,cy2,6,8,'#1a1a2e');
        bx(cx2+1,cy2+1,4,6,rarCol);
        // Pulsing border
        g.globalAlpha=glowPulse;
        g.strokeStyle=rarCol;g.lineWidth=1;g.strokeRect(cx2-1,cy2-1,8,10);
        g.globalAlpha=1;
        // Label above on hover (always show rarity initial)
        const abb=['C','U','R','E','L'][Math.min(cr.r-1,4)]||'?';
        g.globalAlpha=0.7;
        txShadow(abb,cx2-1,cy2-2,5,rarCol,'rgba(0,0,0,.5)');
        g.globalAlpha=1;
      }
    }
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

  // Day/night overlay (after all rendering, before HUD)
  drawDayNightOverlay();

  // ── HUD BAR ──
  const hudY=H-HUD_HEIGHT;
  win(0,hudY,W,HUD_HEIGHT);
  // Season timer
  const _sr=getSeasonRemaining();const _srt=formatTimeRemaining(_sr);
  const _sCol=_sr<3600000?'#d04040':_sr<86400000?'#d0a030':'#40a040';
  txShadow(_srt,10,hudY+28,9,_sCol,'rgba(0,0,0,.45)');
  // v118: Spell charge orb indicators (visual pips replace plain numbers)
  {
    const spells=[
      {label:'STL',val:sp.s,max:3,cx:100,fill:'#c04848',empty:'#2a1010',warn:sp.s===0},
      {label:'BAR',val:sp.b,max:3,cx:175,fill:'#3868c0',empty:'#101028',warn:sp.b===0},
      {label:'SCT',val:sp.c,max:3,cx:250,fill:'#38a038',empty:'#0e1e0e',warn:sp.c===0},
    ];
    spells.forEach(s=>{
      // Label
      const lCol=s.warn?'#804040':s.label==='STL'?'#b04040':s.label==='BAR'?'#3060b0':'#308030';
      txShadow(s.label,s.cx,hudY+20,7,lCol,'rgba(0,0,0,.35)');
      // Pip row (3 orbs, 7×7px each, 4px gap)
      const orbX=s.cx+26,orbY=hudY+12,orbW=7,orbH=7,orbGap=4;
      for(let o=0;o<s.max;o++){
        const filled=o<s.val;
        const ox=orbX+o*(orbW+orbGap);
        bx(ox,orbY,orbW,orbH,filled?s.fill:s.empty);
        if(filled){
          // Glint on top-left corner
          bx(ox+1,orbY+1,2,1,'rgba(255,255,255,.35)');
        }
      }
      // Bonus charges beyond max (e.g. from chests) shown as "+N"
      if(s.val>s.max){
        txShadow('+'+(s.val-s.max),orbX+s.max*(orbW+orbGap)+2,hudY+20,6,'#f0c830','rgba(0,0,0,.4)');
      }
      // Depleted flash warning
      if(s.warn){
        const wA=0.4+Math.sin(fr*0.18)*0.4;
        g.globalAlpha=wA;
        bx(s.cx-2,hudY+10,orbX+s.max*(orbW+orbGap)-s.cx+2,orbH+2,'rgba(180,40,40,.15)');
        g.globalAlpha=1;
      }
    });
  }
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
      txShadow('DUNGEON',30,hudY+52,7,'#a07820','rgba(0,0,0,.4)');
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
          txShadow(dirs[didx]+'ESC',73,hudY+52,6,'#60b868','rgba(0,0,0,.4)');
          g.globalAlpha=1;
        }
      }
    }
  }else{
    txShadow('TOWN',10,hudY+52,7,'#40a040','rgba(0,0,0,.4)');
  }
  // Footstep counter
  txShadow('STEPS:'+stepCounter,100,hudY+52,7,'#989080','rgba(0,0,0,.35)');
  // v102: Dungeon exploration % — revealed walkable tiles / total walkable tiles
  if(inDungeon&&maps[currentMap]){
    const m_=maps[currentMap];
    let total=0,revealed=0;
    for(let y=0;y<MH;y++){for(let x=0;x<MW;x++){if(WALKABLE.has(m_[y]?.[x])){total++;if(fogRevealed[currentMap][y]?.[x])revealed++;}}}
    if(total>0){
      const pct=Math.floor(revealed/total*100);
      const expCol=pct<30?'#888878':pct<70?'#a0c080':'#40d080';
      txShadow('EXP:'+pct+'%',182,hudY+52,7,expCol,'rgba(0,0,0,.35)');
    }
    // v136: Rival floor trackers — V:B2 / M:B3 so player knows where rivals are
    {const vegaMap=rivalMaps[0],miraMap=rivalMaps[1];
    const vegaLbl='V:'+(vegaMap===0?'TWN':'B'+vegaMap);
    const miraLbl='M:'+(miraMap===0?'TWN':'B'+miraMap);
    // Highlight when rival is on SAME floor as player (danger)
    const vegaSame=vegaMap===currentMap;const miraSame=miraMap===currentMap;
    const vegaAlpha=vegaSame?(0.7+Math.sin(fr*0.18)*0.3):0.55;
    const miraAlpha=miraSame?(0.7+Math.sin(fr*0.18+1)*0.3):0.55;
    const vegaCol=vegaSame?'#f080c0':'#806070';
    const miraCol=miraSame?'#f0c830':'#807060';
    const vegaCards=pl[1].cd.filter(c=>c>0).length;
    const miraCards=pl[2].cd.filter(c=>c>0).length;
    const vegaFull=vegaLbl+' '+vegaCards+'c';
    const miraFull=miraLbl+' '+miraCards+'c';
    g.globalAlpha=vegaAlpha;
    txShadow(vegaFull,240,hudY+52,6,vegaCol,'rgba(0,0,0,.35)');
    g.globalAlpha=miraAlpha;
    txShadow(miraFull,286,hudY+52,6,miraCol,'rgba(0,0,0,.35)');
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
    txShadow('+'+(handTotal-HUD_CARD_SLOTS),310+HUD_CARD_SLOTS*HUD_CARD_SPACING+2,hudY+26,7,'#c8c0a0','rgba(0,0,0,.4)');
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
  txShadow('DANGER:'+dangerLabel,420,hudY+44,6,dangerCol,'rgba(0,0,0,.4)');
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
    txShadow(rp.n[0]+' F'+(flNums_[rFloor]||rFloor)+' '+rcc2+'♠',labelX,labelY,5,rcc2>=4?'#d04040':rCol,'rgba(0,0,0,.4)');
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
    txShadow(pl[ri+1].n[0],arrowCX-3,arrowCY+14,5,arrowCol,'rgba(0,0,0,.5)');
    txShadow(rcc+'♠',arrowCX-5,arrowCY+24,5,rcc>=4?'#d04040':arrowCol,'rgba(0,0,0,.5)');
  }

  // Vault/hand status (progress toward 60-card goal)
  const vaultCount=pl[0].vault?pl[0].vault.size:0;
  const handCount=pl[0].cd.filter(c=>c>0).length;
  const vaultPct=vaultCount/60;
  const vaultCol=vaultCount>=50?'#f0c830':vaultCount>=30?'#e08040':vaultCount>=10?'#40c060':'#686068';
  txShadow('CARDS:'+vaultCount+'/60',310,hudY+56,7,vaultCol,'rgba(0,0,0,.4)');
  // Tiny collection progress bar
  bx(310,hudY+60,60,3,'#282838');
  bx(310,hudY+60,Math.floor(60*vaultPct),3,vaultCol);
  txShadow('HAND:'+handCount,382,hudY+56,6,'#686068','rgba(0,0,0,.35)');

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
        txShadow(rivalNames[ri]+'!',trailX+6,hudY+57,6,rivalCols[ri],'rgba(0,0,0,.4)');
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

  // Exploration percentage
  const expPct=fogExploredPercent(currentMap);
  txShadow('MAP:'+expPct+'%',560,hudY+22,8,'#686068','rgba(0,0,0,.35)');

  // Sound indicator
  txShadow(soundEnabled?'SND:ON':'SND:OFF',750,hudY+22,6,soundEnabled?'#60a060':'#a06060','rgba(0,0,0,.35)');
  // On-chain mode indicator with Solana icon
  if(walletConnected){
    drawSolanaIcon(808,hudY+15,7);
    txShadow('ON-CHAIN',820,hudY+22,6,'#40d080','rgba(0,0,0,.4)');
    // Pot display
    txShadow('POT:'+stakePotAmount.toFixed(2),820,hudY+32,5,'#14F195','rgba(0,0,0,.4)');
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
  txShadow('v194',900,hudY+56,8,'#8890c0','rgba(0,0,0,.5)');

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
      txShadow((ri+1)+'.',sbX+8,ry+12,isLeader?9:7,isLeader?'#f0c830':'#808080','rgba(0,0,0,.4)');
      // Name (truncated)
      const nm=r.name.length>5?r.name.slice(0,5):r.name;
      txShadow(nm,sbX+22,ry+12,isLeader?8:7,r.col,'rgba(0,0,0,.3)');
      // Unique card count (most important)
      const uniqStr=r.uniq+'/60';
      txShadow(uniqStr,sbX+sbW-8-uniqStr.length*6,ry+12,isLeader?8:7,'#e8e0c0','rgba(0,0,0,.3)');
      // Floor indicator (for rivals)
      if(r.floor>0){const fStr='B'+r.floor;txShadow(fStr,sbX+76,ry+12,6,r.col,'rgba(0,0,0,.35)');}
      // Leader crown
      if(isLeader){txShadow('\u2605',sbX+sbW-22,ry+6,5,'#f0c830','rgba(0,0,0,.4)');}
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
      txShadow(isLeader?'\u2605':String(i+1),rcX+6,ry+10,isLeader?7:5,isLeader?'#f0c830':'#666680','rgba(0,0,0,.4)');
      const nm=r.name.length>4?r.name.slice(0,4):r.name;
      txShadow(nm,rcX+18,ry+10,6,r.col,'rgba(0,0,0,.3)');
      const barW=Math.round(barMax*(r.cnt/60));
      bx(rcX+44,ry+2,barMax,7,'#1a1a30');
      bx(rcX+44,ry+2,barW,7,r.col);
      txShadow(r.cnt+'/60',rcX+44+barMax+3,ry+10,5,isLeader?'#e8e0c0':'#787890','rgba(0,0,0,.35)');
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
    txShadow(rivalAlertName+' entered your map!',W/2-110,22,6,'#c04040','rgba(0,0,0,.4)');
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
  bx(0,0,W,H,`rgba(0,0,0,${0.35*ease})`);
  if(menuW>4&&menuH>4){
    win(menuX,menuY,menuW,menuH);
    if(ease>=0.7){
      const itemAlpha=Math.min(1,(ease-0.7)/0.3);
      g.globalAlpha=itemAlpha;
      const items=['CARDS','MAP','LOG','STATS','USE CARD','DISCARD','WALLET','TEXT SPD','SAVE','RULES','NEW GAME','CLOSE'];
      items.forEach((s,i)=>{
        const y=34+i*22;
        if(i===mi){txShadow('\u25B6',W-166,y,9,FRLG.selHighlight,'rgba(0,0,0,.4)');txShadow(s,W-148,y,9,FRLG.selHighlight,'rgba(0,0,0,.4)');}
        else txShadow(s,W-148,y,9,'#686068','rgba(0,0,0,.35)');
      });
      g.globalAlpha=1;
    }
  }
}

