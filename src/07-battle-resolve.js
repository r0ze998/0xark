// v390: pre-baked orbital angle tables for battle particle effects (N=5,6,8,10,12)
// sin-addition: cos(evT*K + i*2π/N) = cos(evT*K)*CI[i] - sin(evT*K)*SI[i]
const _ORB_SI5=new Float32Array(5);const _ORB_CI5=new Float32Array(5);
const _ORB_SI6=new Float32Array(6);const _ORB_CI6=new Float32Array(6);
const _ORB_SI8=new Float32Array(8);const _ORB_CI8=new Float32Array(8);
const _ORB_SI10=new Float32Array(10);const _ORB_CI10=new Float32Array(10);
const _ORB_SI12=new Float32Array(12);const _ORB_CI12=new Float32Array(12);
const _FLAME_DIST13=new Float32Array(12); // Math.sin(i*1.3)*8 for i=0..11 (static dist modifier)
(()=>{const _PI2=Math.PI*2;
  for(let i=0;i<5;i++){_ORB_SI5[i]=Math.sin(i*_PI2/5);_ORB_CI5[i]=Math.cos(i*_PI2/5);}
  for(let i=0;i<6;i++){_ORB_SI6[i]=Math.sin(i*_PI2/6);_ORB_CI6[i]=Math.cos(i*_PI2/6);}
  for(let i=0;i<8;i++){_ORB_SI8[i]=Math.sin(i*_PI2/8);_ORB_CI8[i]=Math.cos(i*_PI2/8);}
  for(let i=0;i<10;i++){_ORB_SI10[i]=Math.sin(i*_PI2/10);_ORB_CI10[i]=Math.cos(i*_PI2/10);}
  for(let i=0;i<12;i++){_ORB_SI12[i]=Math.sin(i*_PI2/12);_ORB_CI12[i]=Math.cos(i*_PI2/12);}
  for(let i=0;i<12;i++)_FLAME_DIST13[i]=Math.sin(i*1.3)*8;
})();
// v262: Hoist resolve per-frame inline literals
const _RES_ACT_NAMES=['DRAW','STEAL','BARRIER','SCOUT','CARD'];
// v327: pre-baked resolve/result screen strings
const _BSTREAK_LBL=(()=>{const a=[];for(let i=0;i<=20;i++)a.push('\u2605 STREAK '+i+'x');return a;})();
const _CC5_CARDS=['0/5 cards','1/5 cards','2/5 cards','3/5 cards','4/5 cards','5/5 cards'];
const _SIGNED_DELTA=['-5','-4','-3','-2','-1','0','+1','+2','+3','+4','+5']; // indexed at delta+5
let _reactNameCache='',_reactNameRef=''; // rName+':' lazy cache
let _reactQuoteLbl='',_reactQuoteRef=''; // v348: lazy cache for reaction quote (changes every 13 frames)
let _tellLblCache=['',''],_tellLblKey=-1; // v331: lazy tell-accuracy label pair
// v305: pre-baked strings for per-frame allocations in resolve/result draw
const _DOTS=['','.','..',  '...'];
const _ROUND_SUM=['','ROUND 1 SUMMARY','ROUND 2 SUMMARY','ROUND 3 SUMMARY','ROUND 4 SUMMARY','ROUND 5 SUMMARY','ROUND 6 SUMMARY','ROUND 7 SUMMARY','ROUND 8 SUMMARY','ROUND 9 SUMMARY','ROUND 10 SUMMARY'];
const _RES_ACT_COLS=['#2a6080','#a03030','#3060b0','#308030','#806030'];
const _RES_RAR_COLS=['','#808898','#50d060','#b060e0','#e0a020','#ffe080'];
const _RES_STEAL_COLS=['','#50d060','#5090f0','#b060e0','#e0a020','#fff8e0'];
const _RES_STEAL_GLOW=['','rgba(80,200,80,.3)','rgba(80,144,240,.3)','rgba(176,80,224,.4)','rgba(224,160,32,.5)','rgba(255,248,200,.6)'];
// v259: Cache evTexts per resolve sequence — eliminates map+join alloc every resolve frame
let _bpEvTextsCache='',_bpEvTextsCacheRef=null;
function _getBpEvTexts(q){if(q===_bpEvTextsCacheRef)return _bpEvTextsCache;_bpEvTextsCacheRef=q;let s='';for(let i=0;i<q.length;i++){if(q[i].text)s+=q[i].text+' ';}return(_bpEvTextsCache=s);}
// v253: Static arrays for battle-resolve rOrbs — eliminates 3-object array per resolve frame
const _RORB_LBL=['STL','BAR','SCT'],_RORB_FILL=['#c04848','#3868c0','#38a038'],_RORB_EMPTY=['#2a1010','#101028','#0e1e0e'],_RORB_LCOL=['#b04040','#3060b0','#308030'];
// v234: Pre-baked defeat vignette + card-hit glow — more gradient eliminations
// Defeat vignette: createRadialGradient(W/2,H/2,60,W/2,H/2,W*0.6), outer rgba(200,10,10,1)
// draw with globalAlpha=defPulse*0.25
const _btlDefeatVig=(()=>{
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const ctx=c.getContext('2d');
  const grd=ctx.createRadialGradient(W/2,H/2,60,W/2,H/2,W*0.6);
  grd.addColorStop(0,'rgba(0,0,0,0)');grd.addColorStop(1,'rgba(200,10,10,1)');
  ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);return c;
})();
// Card-hit glow: r=28 red radial, baked at inner .7 alpha, draw with globalAlpha=glA
const _btlCardHitGlow=(()=>{
  const c=document.createElement('canvas');c.width=64;c.height=64;
  const ctx=c.getContext('2d');
  const grd=ctx.createRadialGradient(32,32,0,32,32,28);
  grd.addColorStop(0,'rgba(200,40,40,.7)');grd.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=grd;ctx.fillRect(0,0,64,64);return c;
})();

// v238: Pre-baked card rarity glow halo canvases (per rarity r=23/28/33/38/43, 5 colors)
// card_get draws arc(playerCX,cardY,18+rar*5) with globalAlpha=glA and fillStyle=rcol
// Pre-bake at alpha=1; draw with globalAlpha=glA
const _cardRarGlow=(()=>{
  const rarCols=['','#808898','#50d060','#b060e0','#e0a020','#ffe080'];
  return rarCols.map((col,i)=>{
    if(!i)return null;
    const r=18+i*5,hw=r+4;
    const c=document.createElement('canvas');c.width=hw*2;c.height=hw*2;
    const ctx=c.getContext('2d');
    ctx.fillStyle=col;ctx.beginPath();ctx.arc(hw,hw,r,0,Math.PI*2);ctx.fill();
    return {canvas:c,hw};
  });
})();
// v391: Pre-baked steal glow radials (5 rarities, radii 38-70, inner colors fixed)
// Eliminates createRadialGradient per frame during steal animation (30 frames × rare events)
// Also fixes color-string replace bug for rar>=3 (original replace('.3',...) found no match)
const _stealGlowCanvases=(()=>{
  const inner=['','rgba(80,200,80,0.66)','rgba(80,144,240,0.72)','rgba(176,80,224,0.78)','rgba(224,160,32,0.84)','rgba(255,248,200,0.90)'];
  return inner.map((col,rar)=>{
    if(!rar)return null;
    const r=30+rar*8,sz=(r+2)*2;
    const c=document.createElement('canvas');c.width=sz;c.height=sz;
    const ctx=c.getContext('2d');
    const grd=ctx.createRadialGradient(sz/2,sz/2,0,sz/2,sz/2,r);
    grd.addColorStop(0,col);grd.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=grd;ctx.fillRect(0,0,sz,sz);
    return {c,r,sz};
  });
})();
// v231: Pre-baked QTE vignette canvases — replaces createRadialGradient per frame
// Baked at alpha=1; drawn with globalAlpha=vigIntensity for correct compositing
const _qteVigDefend=(()=>{
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const ctx=c.getContext('2d');
  const grd=ctx.createRadialGradient(W/2,H/2,H*0.2,W/2,H/2,H*0.75);
  grd.addColorStop(0,'rgba(0,0,0,0)');grd.addColorStop(1,'rgba(220,40,40,1)');
  ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);return c;
})();
const _qteVigAttack=(()=>{
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const ctx=c.getContext('2d');
  const grd=ctx.createRadialGradient(W/2,H/2,H*0.2,W/2,H/2,H*0.75);
  grd.addColorStop(0,'rgba(0,0,0,0)');grd.addColorStop(1,'rgba(40,160,240,1)');
  ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);return c;
})();

// Card effect animation helpers
function drawCrystalEffect(cx_,cy_,evT){
  // Blue energy spiral around player sprite, then lightning bolt
  if(evT===1)sfxCrystal();
  const a=Math.max(0,1-evT/35);
  g.save();g.globalAlpha=a;
  // v390: sin-addition with _ORB_SI8/CI8 — 2 trig calls instead of 16
  {const _eS=Math.sin(evT*0.2),_eC=Math.cos(evT*0.2),_dist=20+evT*1.5;
  for(let i=0;i<8;i++){
    const px_=cx_+(_eC*_ORB_CI8[i]-_eS*_ORB_SI8[i])*_dist;
    const py_=cy_+(_eS*_ORB_CI8[i]+_eC*_ORB_SI8[i])*_dist*0.6;
    bx(px_-2,py_-2,4,4,'#48b8e8');bx(px_-1,py_-1,2,2,'#a0e0ff');
  }}
  // Lightning bolt at mid-animation
  if(evT>15&&evT<30){
    g.globalAlpha=(30-evT)/15;g.strokeStyle='#64c8ff';g.lineWidth=2;
    g.beginPath();g.moveTo(cx_,cy_-20);
    g.lineTo(cx_+10,cy_-5);g.lineTo(cx_-5,cy_+5);g.lineTo(cx_+15,cy_+25);
    g.stroke();
    g.globalAlpha=(30-evT)/20;g.strokeStyle='#c8f0ff';g.lineWidth=1;
    g.beginPath();g.moveTo(cx_+2,cy_-18);
    g.lineTo(cx_+12,cy_-3);g.lineTo(cx_-3,cy_+7);g.lineTo(cx_+17,cy_+27);
    g.stroke();g.globalAlpha=1;
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
  // Dark particles rising — v390: sin-addition with _IDX_SI/CI
  {const pa=Math.max(0,1-evT/30);g.globalAlpha=pa;
  const _sS=Math.sin(evT*0.2),_sC=Math.cos(evT*0.2);
  for(let i=0;i<6;i++){
    const px_=cx_-15+i*6+(_sS*_IDX_CI[i]+_sC*_IDX_SI[i])*4,py_=cy_+20-evT*1.5-i*3;
    g.fillStyle='#501e78';g.fillRect(px_,py_,3,3);
    g.fillStyle='#8c50b4';g.fillRect(px_+1,py_+1,1,1);
  }g.globalAlpha=1;}
}

function drawFlameEffect(cx_,cy_,evT){
  if(evT===1)sfxFlame();
  // Fire particles erupting from center
  // v390: sin-addition with _ORB_SI12/CI12; pre-baked dist via _FLAME_DIST13 — 2 trig calls vs 24
  {const pa=Math.max(0,1-evT/35);g.globalAlpha=pa;
  const _eS=Math.sin(evT*0.05),_eC=Math.cos(evT*0.05),_evT05=evT*0.5;
  for(let i=0;i<12;i++){
    const dist=evT*2+_FLAME_DIST13[i];
    const px_=cx_+(_eC*_ORB_CI12[i]-_eS*_ORB_SI12[i])*dist;
    const py_=cy_+(_eS*_ORB_CI12[i]+_eC*_ORB_SI12[i])*dist*0.5-_evT05;
    const sz=4-evT*0.08;
    if(sz>0){g.fillStyle='#dc5028';g.fillRect(px_-sz/2,py_-sz/2,sz,sz);g.fillStyle='#ffc83c';g.fillRect(px_-sz/4,py_-sz/4,sz/2,sz/2);}
  }g.globalAlpha=1;}
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
    // v390: sin-addition with _IDX_SI/CI — sin(evT+i) = sin(evT)*CI[i]+cos(evT)*SI[i]
    const _stS=Math.sin(evT),_stC=Math.cos(evT);
    g.globalAlpha=a;g.strokeStyle='#ffffc8';g.lineWidth=3;
    for(let i=0;i<3;i++){
      const sx_=80+i*200+(_stS*_IDX_CI[i]+_stC*_IDX_SI[i])*20;
      g.beginPath();g.moveTo(sx_,0);
      g.lineTo(sx_+15,40);g.lineTo(sx_-10,80);g.lineTo(sx_+20,120);
      g.stroke();
    }
    g.globalAlpha=1;
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
  // v390: sin-addition for orbital and per-particle dist — 4 trig calls vs 30
  {const _eS3=Math.sin(evT*0.3),_eC3=Math.cos(evT*0.3);
  const _eS5=Math.sin(evT*0.5),_eC5=Math.cos(evT*0.5);
  const _base=30-evT*0.3;
  for(let i=0;i<10;i++){
    const dist=_base+(_eS5*_IDX_CI[i]+_eC5*_IDX_SI[i])*5;
    const px_=cx_+(_eC3*_ORB_CI10[i]-_eS3*_ORB_SI10[i])*dist;
    const py_=cy_+(_eS3*_ORB_CI10[i]+_eC3*_ORB_SI10[i])*dist*0.6;
    g.fillStyle='#6432a0';g.fillRect(px_-2,py_-2,4,4);
    g.fillStyle='#b464dc';g.fillRect(px_-1,py_-1,2,2);
  }}
  // Card shape flying — v390: parabola approx for arc (4x(1-x) ≈ sin(πx))
  if(evT>10&&evT<30){
    const t_=(evT-10)/20;
    const cardX=lerp(cx_+60,cx_-60,t_);
    const cardY=cy_-10+4*t_*(1-t_)*-20;
    bx(cardX-6,cardY-8,12,16,'#7858a0');bx(cardX-5,cardY-7,10,14,'#9878c0');
    txShadow('?',cardX-3,cardY+4,6,'#fff','rgba(0,0,0,.35)');
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
      txShadow(_DOTS[dotCount],textX+ev.text.length*14+4,H-38,14,'#a09080','rgba(0,0,0,.2)'); // v305
    }
    // v335: Skip hint (appears after first event, not during QTE)
    if(currentIdx>0&&!qteActive){g.globalAlpha=0.5;txShadow('[Z] Skip',W-66,H-52,6,'#909090','rgba(0,0,0,.2)');g.globalAlpha=1;}
    // === EFFECT ANIMATIONS ===
    const playerCX=160,playerCY=H-130;
    const oppCX=W-200,oppCY=130;
    // v133: Round clash reveal — both action panels slide in from sides, collide, burst
    if(currentIdx===0&&evT<40){
      const pAct=Math.min(bpAction,4),rAct=Math.min(bpRivalActions[0],3); // v262: hoisted
      const pCol=_RES_ACT_COLS[pAct],rCol=_RES_ACT_COLS[rAct];
      const clashCX=W/2,clashCY=220;
      const pW=88,pH=44;
      // Ease-out slide: 0-13 in, 14-26 hold, 27-39 fade
      const rawT=Math.min(1,evT/13);
      const eo=t=>1-(1-t)*(1-t);
      const slide=eo(rawT);
      const fadeA=evT>26?Math.max(0,1-(evT-26)/14):1;
      // Player panel: slides from left side (80) to clashCX-pW-8
      const pEndX=clashCX-pW-8;
      const pX=80+(pEndX-80)*slide;
      // Rival panel: slides from right side (W-80-pW) to clashCX+8
      const rEndX=clashCX+8;
      const rX=(W-80-pW)+(rEndX-(W-80-pW))*slide;
      g.globalAlpha=fadeA;
      // Player action panel
      bx(pX,clashCY,pW,pH,'rgba(8,8,20,.8)');
      bx(pX,clashCY,pW,2,pCol);bx(pX,clashCY+pH-2,pW,2,pCol);
      bx(pX,clashCY,2,pH,pCol);bx(pX+pW-2,clashCY,2,pH,pCol);
      txShadow('YOU',pX+6,clashCY+13,7,'rgba(200,200,200,.65)','rgba(0,0,0,.3)');
      txShadow(_RES_ACT_NAMES[pAct],pX+6,clashCY+30,12,pCol,'rgba(0,0,0,.6)');
      // Rival action panel
      bx(rX,clashCY,pW,pH,'rgba(8,8,20,.8)');
      bx(rX,clashCY,pW,2,rCol);bx(rX,clashCY+pH-2,pW,2,rCol);
      bx(rX,clashCY,2,pH,rCol);bx(rX+pW-2,clashCY,2,pH,rCol);
      txShadow(pl[1].n,rX+6,clashCY+13,7,'rgba(200,200,200,.65)','rgba(0,0,0,.3)');
      txShadow(_RES_ACT_NAMES[rAct],rX+6,clashCY+30,12,rCol,'rgba(0,0,0,.6)');
      // "VS" label, appears as panels close in (slide>0.7)
      if(slide>0.7){
        const vsA=Math.min(1,(slide-0.7)/0.3)*fadeA;
        g.globalAlpha=vsA;
        txShadow('VS',clashCX-12,clashCY-18,14,'#fff8d0','rgba(0,0,0,.75)');
      }
      // Burst sparks at collision moment (evT 13-24)
      if(evT>=13&&evT<24){
        const bt=evT-13;
        const ba=Math.max(0,1-bt/11)*fadeA;
        // v390: sin-addition for orbital and compound alpha — 4 trig calls vs 30
        {const _bS=Math.sin(bt*0.12),_bC=Math.cos(bt*0.12),_dist=bt*7;
        const _b4S=Math.sin(bt*0.4),_b4C=Math.cos(bt*0.4);
        for(let i=0;i<10;i++){
          const _ac=_bC*_ORB_CI10[i]-_bS*_ORB_SI10[i],_as=_bS*_ORB_CI10[i]+_bC*_ORB_SI10[i];
          // sin(ang+bt*0.4) = _as*_b4C + _ac*_b4S (sin-addition, no extra trig)
          g.globalAlpha=ba*(0.5+0.5*(_as*_b4C+_ac*_b4S));
          bx(clashCX+_ac*_dist-1,clashCY+pH/2+_as*_dist*0.45-1,3,3,'#ffe060');
        }}
        if(evT===13){sfxSlash();}
      }
      g.globalAlpha=1;
    }
    if(ev.effect==='slash'&&evT<25){
      const tgtCX=ev.target===0?playerCX:oppCX;
      const tgtCY=ev.target===0?playerCY:oppCY;
      g.save();g.globalAlpha=1-evT/25;g.strokeStyle='#c82828';g.lineWidth=3;
      for(let i=0;i<4;i++){
        g.beginPath();
        g.moveTo(tgtCX-20+i*10,tgtCY-20+i*5);
        g.lineTo(tgtCX+20+i*10,tgtCY+20+i*5);
        g.stroke();
      }
      g.restore();if(evT===1)sfxSlash();
    }
    if(ev.effect==='shield'&&evT<30){
      const r_=evT*2.5,a_=1-evT/30;g.save();g.globalAlpha=a_;
      g.strokeStyle='#3060b0';g.lineWidth=3;
      g.beginPath();g.arc(playerCX,playerCY,r_,0,Math.PI*2);g.stroke();
      g.globalAlpha=a_*.6;g.strokeStyle='#64a0f0';g.lineWidth=2;
      g.beginPath();g.arc(playerCX,playerCY,r_*.7,0,Math.PI*2);g.stroke();
      // Shield icon
      if(evT<15){
        g.globalAlpha=1-evT/15;
        bx(playerCX-8,playerCY-12,16,20,'rgba(60,120,200,.5)');
        bx(playerCX-6,playerCY-10,12,16,'rgba(100,180,255,.4)');
      }
      g.globalAlpha=1;g.restore();if(evT===1){sfxShield();
        // v502: blue spark ring when barrier raised
        for(let _bri=0;_bri<10;_bri++){const _bra=(_bri/10)*Math.PI*2;const _brs=1+Math.random()*1.8;
          particles.push({x:playerCX,y:playerCY,vx:Math.cos(_bra)*_brs,vy:Math.sin(_bra)*_brs-1,life:12+Math.random()*8,c:Math.random()>.5?'rgba(80,130,220,1)':'rgba(160,210,255,1)'});
        }
      }
    }
    if(ev.effect==='shield_block'&&evT<30){
      const r_=evT*3,a_=1-evT/30;g.save();g.globalAlpha=a_;
      g.strokeStyle='#3060f0';g.lineWidth=4;
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
      g.restore();if(evT===1){sfxShield();
        // v484: blue/silver burst on successful block
        screenShake(2,5);
        for(let _bi=0;_bi<18;_bi++){const _ba=(_bi/18)*Math.PI*2;const _bs=1.5+Math.random()*2.8;
          particles.push({x:playerCX,y:playerCY,vx:Math.cos(_ba)*_bs,vy:Math.sin(_ba)*_bs-1.5,life:20+Math.random()*14,c:Math.random()>.5?'rgba(80,140,255,1)':'rgba(200,230,255,1)'});
        }
      }
    }
    if(ev.effect==='damage'&&evT<20){
      bpShakeTarget=ev.target!==undefined?ev.target:0;bpShakeTimer=20-evT;
      if(evT===1){sfxDamage();
        // v484: red impact sparks on damage hit
        const _tgX=ev.target===0?playerCX:oppCX;const _tgY=ev.target===0?playerCY:oppCY;
        for(let _hi=0;_hi<10;_hi++){const _ha=(_hi/10)*Math.PI*2;const _hs=1.2+Math.random()*2;
          particles.push({x:_tgX,y:_tgY,vx:Math.cos(_ha)*_hs,vy:Math.sin(_ha)*_hs-1,life:14+Math.random()*10,c:Math.random()>.5?'rgba(220,60,40,1)':'rgba(255,180,80,1)'});
        }
      }
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
      // v390: parabola 4x(1-x) ≈ sin(πx) for arc trajectory
      const cy_=playerCY+(rivalCY-playerCY)*eased-112*eased*(1-eased);
      const scl_=Math.max(0.3,1-eased*0.6);
      const cw_=36*scl_,ch_=50*scl_;
      // Red glow that follows card
      const glA=0.5*(1-eased);
      if(glA>0.02){
        g.globalAlpha=glA;g.drawImage(_btlCardHitGlow,(cx_-32)|0,(cy_-32)|0);g.globalAlpha=1;
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
        const ty_=playerCY+(rivalCY-playerCY)*tp-112*tp*(1-tp); // v390: parabola
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
      if(evT===32){
        screenShake(rar>=3?5:3, rar>=3?12:8);
        hitPause(rar>=4?6:rar>=3?5:4);
        // Impact flash — brief white overlay
        bx(0,0,W,H,rar>=3?'rgba(255,255,255,0.28)':'rgba(255,255,255,0.18)');
      }
    }
    if(ev.effect==='card_get'&&evT<35){
      // v114: Card rising with actual art and rarity glow
      const cardY=playerCY+30-evT*2;const scale_=Math.min(1,evT/15);
      const cw_=40*scale_,ch_=56*scale_;
      if(ev.cardId>0&&CD[ev.cardId-1]){
        const dcr=CD[ev.cardId-1];
        const rar=dcr.r||1;
        const rcol=_RES_RAR_COLS[rar]||'#d85840'; // v262: hoisted
        // Rarity glow halo
        if(rar>=2&&_cardRarGlow[rar]){
          const glA=0.25*(1-evT/35)*scale_;
          const cg=_cardRarGlow[rar];
          g.globalAlpha=glA;g.drawImage(cg.canvas,(playerCX-cg.hw)|0,(cardY-cg.hw)|0);g.globalAlpha=1;
        }
        // Actual card art
        g.save();g.translate(playerCX,cardY);g.scale(scale_,scale_);
        bx(-20,-28,40,56,dcr.d);bx(-18,-26,36,52,dcr.c);
        bx(-18,-26,36,36,dcr.d);bx(-17,-25,34,34,'rgba(255,255,255,.12)');
        if(scale_>0.4)drawCardCharacter(-16,-24,ev.cardId,1.3,fr);
        bx(-18,10,36,16,dcr.d);
        if(scale_>0.5)txShadow(dcr.n,-18+2,22,7,'#fff','rgba(0,0,0,.5)');
        // Rarity border
        bx(-20,-28,40,2,rcol);
        g.restore();
        // Card name flash at peak
        if(evT>12&&evT<28){
          const nA=Math.min(1,(evT-12)/4)*Math.max(0,(28-evT)/6);
          g.globalAlpha=nA;
          txShadow(dcr.n,playerCX-dcr.n.length*5,cardY-40,10,rcol,'rgba(0,0,0,.5)');
          g.globalAlpha=1;
        }
      }else{
        bx(playerCX-cw_/2,cardY-ch_/2,cw_,ch_,'#d85840');
        bx(playerCX-cw_/2+2,cardY-ch_/2+2,cw_-4,ch_-4,'#e87060');
        if(scale_>.5)txShadow('\u25B2',playerCX-6,cardY+4,Math.floor(12*scale_),'#fff','rgba(0,0,0,.35)');
      }
      // v390: sin-addition with _ORB_SI8/CI8 — 2 trig calls vs 16
      {const pa=Math.max(0,1-evT/35);g.globalAlpha=pa;g.fillStyle='#ffffc8';
      const _eS=Math.sin(evT*.15),_eC=Math.cos(evT*.15),_dist=12+evT*.8;
      for(let i=0;i<8;i++){g.fillRect(playerCX+(_eC*_ORB_CI8[i]-_eS*_ORB_SI8[i])*_dist,cardY+(_eS*_ORB_CI8[i]+_eC*_ORB_SI8[i])*_dist,3,3);}
      g.globalAlpha=1;}
      if(evT===1)sfxCardGet();
    }
    if(ev.effect==='card_get_rival'&&evT<35){
      // v121: Rival card acquisition with full art — mirrors v114 card_get, hostile tint
      const ri=ev.rivalIdx||0;
      const rcx=ri===0?oppCX:W-310;
      const rcy=ri===0?oppCY:140;
      const cardY=rcy+30-evT*1.8; // rises upward above rival center
      const scale_=Math.min(1,evT/15);
      const cw_=40*scale_,ch_=56*scale_;
      if(ev.cardId>0&&CD[ev.cardId-1]){
        const dcr=CD[ev.cardId-1];
        const rar=dcr.r||1;
        const rcol=_RES_RAR_COLS[rar]||'#d85840'; // v262: hoisted
        // Rarity glow halo
        if(rar>=2&&_cardRarGlow[rar]){
          const glA=0.22*(1-evT/35)*scale_;
          const cg=_cardRarGlow[rar];
          g.globalAlpha=glA;g.drawImage(cg.canvas,(rcx-cg.hw)|0,(cardY-cg.hw)|0);g.globalAlpha=1;
        }
        // Actual card art (scaled, translated to rival position)
        g.save();g.translate(rcx,cardY);g.scale(scale_,scale_);
        bx(-20,-28,40,56,dcr.d);bx(-18,-26,36,52,dcr.c);
        bx(-18,-26,36,36,dcr.d);bx(-17,-25,34,34,'rgba(255,255,255,.12)');
        if(scale_>0.4)drawCardCharacter(-16,-24,ev.cardId,1.3,fr);
        bx(-18,10,36,16,dcr.d);
        if(scale_>0.5)txShadow(dcr.n,-18+2,22,7,'#fff','rgba(0,0,0,.5)');
        // Rarity border top + rival red bar at bottom
        bx(-20,-28,40,2,rcol);
        bx(-20,26,40,2,'rgba(180,40,40,.7)');
        g.restore();
        // Card name flash (rival-colored)
        if(evT>12&&evT<28){
          const nA=Math.min(1,(evT-12)/4)*Math.max(0,(28-evT)/6);
          g.globalAlpha=nA;
          txShadow(dcr.n,rcx-dcr.n.length*5,cardY-40,10,rcol,'rgba(0,0,0,.5)');
          g.globalAlpha=1;
        }
      }else{
        bx(rcx-cw_/2,cardY-ch_/2,cw_,ch_,'#d85840');
        bx(rcx-cw_/2+2,cardY-ch_/2+2,cw_-4,ch_-4,'#e87060');
        if(scale_>.5)txShadow('\u25B2',rcx-6,cardY+4,Math.floor(12*scale_),'#fff','rgba(0,0,0,.35)');
      }
      // Hostile red-orange orbiting sparks — v390: sin-addition with _ORB_SI6/CI6
      {const pa=Math.max(0,1-evT/35);g.globalAlpha=pa;g.fillStyle='#dc6432';
      const _eS=Math.sin(evT*.18),_eC=Math.cos(evT*.18),_dist=10+evT*.7;
      for(let i=0;i<6;i++){g.fillRect(rcx+(_eC*_ORB_CI6[i]-_eS*_ORB_SI6[i])*_dist,cardY+(_eS*_ORB_CI6[i]+_eC*_ORB_SI6[i])*_dist,3,3);}
      g.globalAlpha=1;}
      if(evT===1)sfxCardGet();
    }
    if(ev.effect==='steal_get'&&evT<50){
      // Dramatic steal animation: card trajectory from rival to player + rarity burst
      const rar=ev.rarity||1;
      const rcol=_RES_STEAL_COLS[rar]||'#d85840'; // v262: hoisted
      const rglow=_RES_STEAL_GLOW[rar]||'rgba(200,80,80,.3)';
      // Card moves from rival (oppCX) to player (playerCX) over 30 frames
      const prog=Math.min(1,evT/30);
      const cx_=oppCX+(playerCX-oppCX)*prog;
      const cy_=oppCY-120*prog*(1-prog); // v390: parabola ≈ sin(πx) arc
      const scl_=Math.min(1,evT/8);
      const cw_=36*scl_,ch_=50*scl_;
      // Glow burst at card position — v391: pre-baked canvas replaces per-frame gradient
      if(evT<30&&_stealGlowCanvases[rar]){
        const glA=0.6*(1-prog);
        const sg=_stealGlowCanvases[rar];
        g.globalAlpha=glA;
        g.drawImage(sg.c,(cx_-sg.sz/2)|0,(cy_-sg.sz/2)|0);
        g.globalAlpha=1;
      }
      // v214: Card frame with rotation — card spins as it arcs through the air
      {const flyAngle=(prog-0.5)*0.9; // tilts left→right as it crosses
      g.save();g.translate(cx_,cy_);g.rotate(flyAngle);
      bx(-cw_/2,-ch_/2,cw_,ch_,rcol);
      bx(-cw_/2+2,-ch_/2+2,cw_-4,ch_-4,ev.stolenId?CD[ev.stolenId-1].c||'#303028':'#e87060');
      bx(-cw_/2,-ch_/2,cw_,2,rcol); // top rarity border line
      if(scl_>.5&&ev.stolenId){drawCardCharacter(-cw_/2+2,-ch_/2+2,ev.stolenId,scl_*0.6,fr);}
      g.restore();}
      // Rarity sparks orbit
      // v390: sin-addition for orbiting sparks — 2 trig calls regardless of sparkCount
      const sparkCount=2+rar*2;
      {const _spS=Math.sin(evT*0.25),_spC=Math.cos(evT*0.25);
      const _spDist=16+evT*0.6,_sa=Math.max(0,1-evT/50);
      const _spStep=Math.PI*2/sparkCount;
      const _spSStep=Math.sin(_spStep),_spCStep=Math.cos(_spStep);
      let _ss=0,_sc=1; // sin(0), cos(0) — advances by _spStep each iteration (Euler)
      for(let i=0;i<sparkCount;i++){
        const ang_c=_spC*_sc-_spS*_ss,ang_s=_spS*_sc+_spC*_ss;
        g.globalAlpha=_sa;
        bx(cx_+ang_c*_spDist-2,cy_+ang_s*_spDist-2,4,4,rcol);
        g.globalAlpha=1;
        // advance Euler: (sc,ss) rotated by _spStep
        const _ns=_ss*_spCStep+_sc*_spSStep;_sc=_sc*_spCStep-_ss*_spSStep;_ss=_ns;
      }}
      // Arrival: screen flash + burst + hitpause proportional to rarity (only once at frame 30)
      if(evT===30){
        if(rar>=4){flash();}
        sfxCardGet();
        screenShake(rar>=3?rar:2, rar>=3?rar*3:4);
        hitPause(rar>=5?5:rar>=4?4:rar>=3?3:2);
        triggerCardGetBurst(playerCX,playerCY-20,rcol);
      }
      // Rarity label: size and boldness scale with rarity
      if(evT>8&&evT<45){
        const stA=Math.min(1,(evT-8)/5)*Math.max(0,(45-evT)/8);
        const stLabel=rar>=5?'LEGENDARY!':rar>=4?'EPIC CARD!':rar>=3?'RARE CARD!':rar>=2?'GOT IT!':'CARD TAKEN!';
        const stSz=rar>=5?17:rar>=4?15:rar>=3?13:10;
        // v390: parabola-style clamp — sin((evT-8)*0.25) cycles, use as-is (1 minor call stays)
        const bounce=rar>=3?Math.max(0,Math.sin((evT-8)*0.25)*4):0;
        g.globalAlpha=stA;
        txShadow(stLabel,W/2-stLabel.length*stSz*0.3,playerCY-85-bounce,stSz,rcol,'rgba(0,0,0,.6)');
        g.globalAlpha=1;
      }
    }
    // v214: Floating HP damage number — rises above target sprite, fades out
    if(ev.dmg&&ev.dmg>0&&evT>=6&&evT<38){
      const dTgt=ev.effect==='card_lost'?0:(ev.target!==undefined?ev.target:0);
      const dCX=dTgt===0?playerCX:(dTgt===1?oppCX:W-310);
      const dCY=dTgt===0?playerCY-20:(dTgt===1?oppCY-30:120);
      const fProg=(evT-6)/32;
      const fY=dCY-fProg*55;
      const fA=Math.max(0,1-fProg*1.2);
      const fSc=1+Math.max(0,0.3*(1-fProg*2));
      g.globalAlpha=fA;
      g.save();g.translate(dCX,fY);g.scale(fSc,fSc);
      const dmgLabel='-'+ev.dmg+' HP';
      const dmgCol=ev.dmg>=2?'#ff2020':'#ff5030';
      txShadow(dmgLabel,-ev.dmg*9,0,ev.dmg>=2?16:14,dmgCol,'rgba(0,0,0,.7)');
      g.restore();g.globalAlpha=1;
    }
    // v214: Floating heal number for defense/recovery cards
    if(ev.heal&&ev.heal>0&&evT>=6&&evT<38){
      const fProg=(evT-6)/32;
      const fY=(playerCY-20)-fProg*55;
      const fA=Math.max(0,1-fProg*1.2);
      const fSc=1+Math.max(0,0.3*(1-fProg*2));
      g.globalAlpha=fA;
      g.save();g.translate(playerCX,fY);g.scale(fSc,fSc);
      txShadow('+1 HP',-18,0,14,'#40e880','rgba(0,0,0,.7)'); // v327: ev.heal always 1 when shown
      g.restore();g.globalAlpha=1;
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
    // v130: Scout reveal scan beam — sweeping emerald eye across target rival
    if(ev.effect==='scout_reveal'&&evT<45){
      const tgtIdx=ev.scoutTarget||1;
      const tgtCX=tgtIdx===1?oppCX:W-310;
      const tgtCY=tgtIdx===1?oppCY:140;
      // Horizontal scan beam rising up the target
      const sweep=Math.min(1,evT/20);
      const beamY=tgtCY+60-sweep*130;       // beam moves upward
      const beamAlpha=Math.max(0,1-evT/45);
      const beamW=90,beamH=3;
      g.globalAlpha=beamAlpha*0.8;
      // Scan line (bright emerald center with glow)
      bx(tgtCX-beamW/2,beamY,beamW,1,'rgba(0,255,120,.25)');
      bx(tgtCX-beamW/2,beamY,beamW,beamH,'rgba(0,220,100,.7)');
      bx(tgtCX-beamW/2+2,beamY,beamW-4,1,'rgba(180,255,220,.9)');
      g.globalAlpha=beamAlpha*0.35;
      bx(tgtCX-beamW/2,beamY-6,beamW,10,'rgba(0,200,80,.18)'); // soft glow above
      g.globalAlpha=1;
      // Orbiting scan particles — v390: sin-addition, hoist dist out of loop
      {const _eS22=Math.sin(evT*0.22),_eC22=Math.cos(evT*0.22);
      const _dist=20+Math.sin(evT*0.15)*5; // 1 call, was 5 (hoisted out of loop)
      const _eS18=Math.sin(evT*0.18),_eC18=Math.cos(evT*0.18);
      for(let i=0;i<5;i++){
        const _ac=_eC22*_ORB_CI5[i]-_eS22*_ORB_SI5[i],_as=_eS22*_ORB_CI5[i]+_eC22*_ORB_SI5[i];
        const pa=beamAlpha*(0.4+(_eS18*_IDX_CI[i]+_eC18*_IDX_SI[i])*0.4);
        g.globalAlpha=pa;
        bx(tgtCX+_ac*_dist-1,tgtCY+_as*_dist*0.6-1,2,2,'#40e090');
      }}
      g.globalAlpha=1;
      // "SCOUTING" text flash
      if(evT>6&&evT<36){
        const sA=Math.min(1,(evT-6)/6)*Math.max(0,(36-evT)/10);
        g.globalAlpha=sA;
        txShadow('SCOUTING...',tgtCX-50,tgtCY-55,10,'#40e090','rgba(0,0,0,.6)');
        g.globalAlpha=1;
      }
      if(evT===1)sfxShield(); // reuse shield sfx for scan tone
    }
    // v132: Rival scout — hostile red/amber scan beam from rival toward player
    if(ev.effect==='rival_scout'&&evT<50){
      const srcIdx=ev.scoutSource||1;
      const srcCX=srcIdx===1?oppCX:W-310;
      const srcCY=srcIdx===1?oppCY:140;
      const dstCX=playerCX,dstCY=playerCY;
      // Lerp beam origin from rival toward player as animation progresses
      const reach=Math.min(1,evT/22);
      const midCX=srcCX+(dstCX-srcCX)*reach*0.6;
      const midCY=srcCY+(dstCY-srcCY)*reach*0.6;
      const beamAlpha=Math.max(0,1-evT/50);
      // Hostile horizontal scan line (amber/red)
      const sweep=Math.min(1,evT/22);
      const beamY=dstCY+50-sweep*120;
      const beamW=85,beamH=3;
      g.globalAlpha=beamAlpha*0.85;
      bx(dstCX-beamW/2,beamY,beamW,1,'rgba(255,80,30,.22)');
      bx(dstCX-beamW/2,beamY,beamW,beamH,'rgba(255,100,40,.75)');
      bx(dstCX-beamW/2+2,beamY,beamW-4,1,'rgba(255,220,180,.9)');
      g.globalAlpha=beamAlpha*0.3;
      bx(dstCX-beamW/2,beamY-6,beamW,10,'rgba(200,60,20,.18)');
      g.globalAlpha=1;
      // Threat line from rival to player (faint directional ray)
      if(reach>0.1){
        g.globalAlpha=beamAlpha*0.22;
        g.strokeStyle='rgba(255,80,30,.5)';
        g.lineWidth=1;
        g.setLineDash([4,6]);
        g.beginPath();g.moveTo(srcCX,srcCY+20);g.lineTo(midCX,midCY+20);g.stroke();
        g.setLineDash([]);
        g.globalAlpha=1;
      }
      // Hostile orbiting particles — v390: sin-addition, hoist dist, +π via negation of CI/SI
      {const _eS25=Math.sin(evT*0.25),_eC25=Math.cos(evT*0.25);
      const _dist=18+Math.sin(evT*0.18)*4; // 1 call, hoisted out of loop
      const _eS20=Math.sin(evT*0.2),_eC20=Math.cos(evT*0.2);
      for(let i=0;i<5;i++){
        // ang+π: cos(ang+π)=-cos(ang), sin(ang+π)=-sin(ang)
        const _ac=-(_eC25*_ORB_CI5[i]-_eS25*_ORB_SI5[i]),_as=-(_eS25*_ORB_CI5[i]+_eC25*_ORB_SI5[i]);
        const pa=beamAlpha*(0.35+(_eS20*_IDX_CI[i]+_eC20*_IDX_SI[i])*0.35);
        g.globalAlpha=pa;
        bx(dstCX+_ac*_dist-1,dstCY+_as*_dist*0.55-1,2,2,'#ff5020');
      }}
      g.globalAlpha=1;
      // "SCANNING..." flash text near player (hostile amber)
      if(evT>5&&evT<38){
        const sA=Math.min(1,(evT-5)/6)*Math.max(0,(38-evT)/10);
        g.globalAlpha=sA;
        txShadow('SCANNING...',dstCX-52,dstCY-52,10,'#ff8040','rgba(0,0,0,.7)');
        g.globalAlpha=1;
      }
      if(evT===1)sfxSlash(); // reuse slash sfx for hostile scan
    }
    // v89: Enhanced QTE overlay
    if(qteActive){
      const qteProgress=qteFrame/qteWindow;
      const isUrgent=qteProgress>0.6;
      const isCritical=qteProgress>0.8;
      const isDefend=qteType==='defend';
      // Fullscreen edge vignette pulse (pre-baked canvas)
      const vigIntensity=isCritical?(0.35+(2*_sFr30*_cFr30)*0.15):isUrgent?0.18:0; // v371: double-angle sin(fr*0.6)=2sin(fr*0.3)cos(fr*0.3)
      if(vigIntensity>0){
        g.globalAlpha=vigIntensity;
        g.drawImage(isDefend?_qteVigDefend:_qteVigAttack,0,0);
        g.globalAlpha=1;
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
      txShadow(labelText,qPX+12,slideY+18,7,'rgba(200,200,200,.6)','rgba(0,0,0,.3)');
      // Z key icon (right side)
      const kx=qPX+qPW-52,ky=slideY+qPH/2-18;
      bx(kx,ky,36,36,'rgba(20,20,40,.9)');
      bx(kx,ky,36,1,accentCol);bx(kx,ky,1,36,accentCol);
      bx(kx,ky+35,36,1,accentCol);bx(kx+35,ky,1,36,accentCol);
      // Pulsing glow on key
      const kPulse=0.6+(2*_sFr20*_cFr20)*0.4; // v371: double-angle sin(fr*0.4)=2sin(fr*0.2)cos(fr*0.2)
      g.globalAlpha=kPulse*slideIn;
      g.shadowBlur=12;g.shadowColor=accentCol;
      txShadow('Z',kx+8,ky+30,22,accentCol,'rgba(0,0,0,.4)');
      g.shadowBlur=0;
      g.globalAlpha=slideIn;
      // Main prompt text with scale pulse
      const pScale=isCritical?(1+(2*_sFr25*_cFr25)*0.06):1; // v371: double-angle sin(fr*0.5)=2sin(fr*0.25)cos(fr*0.25)
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
        // v243: solid fill replaces createLinearGradient per frame
        g.fillStyle=barCol;
        g.fillRect(barX,barY,fillW,barH);
        // Subtle highlight on top half
        g.globalAlpha=0.25;
        g.fillStyle='#ffffff';
        g.fillRect(barX,barY,fillW,(barH/2)|0);
        g.globalAlpha=1;
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
    // v216: Rival KO overlay — pulsing red "KO!" above sprite when HP hits 0
    for(let ri=1;ri<=2;ri++){
      if(bpHP[ri]!==0)continue;
      const koCX=ri===1?oppCX:W-310;
      const koCY=ri===1?oppCY:140;
      const koPulse=0.65+0.35*_sFr30; // v369: cached
      g.globalAlpha=koPulse*0.3;bx(koCX-32,koCY-48,64,80,'#c02020');g.globalAlpha=1;
      const koScale=1+Math.max(0,_sFr18*0.12); // v369: cached
      g.save();g.translate(koCX,koCY-58);g.scale(koScale,koScale);
      g.globalAlpha=koPulse*0.95;
      txShadow('KO!',-(ri===1?14:16),0,20,'#ff3030','rgba(0,0,0,.85)');
      g.restore();g.globalAlpha=1;
      g.globalAlpha=koPulse*0.35;
      for(let xi=0;xi<4;xi++){
        const xOff=koCX-14+xi*10,yOff=koCY-22+((xi%2)*8);
        bx(xOff,yOff,2,2,'#ff2020');bx(xOff+2,yOff-2,2,2,'#ff2020');
      }
      g.globalAlpha=1;
    }
    // v216: Player defeat flash — red vignette + "DEFEATED!" when player HP 0
    if(bpHP[0]===0){
      // v483: one-shot death particle burst on first defeat frame
      if(fr-_defeatBurstFrame>120){_defeatBurstFrame=fr;screenShake(4,8);
        for(let _di=0;_di<22;_di++){const _da=(_di/22)*Math.PI*2;const _ds=1.5+Math.random()*3;
          particles.push({x:playerCX,y:playerCY,vx:Math.cos(_da)*_ds,vy:Math.sin(_da)*_ds-2.5,life:28+Math.random()*18,c:Math.random()>.5?'rgba(220,40,40,1)':'rgba(255,160,100,1)'});
        }
      }
      const defPulse=0.5+0.5*(_sFr20*_cFr02+_cFr20*_sFr02); // v371: sin-addition sin(fr*0.22)=sin(fr*0.2+fr*0.02)
      g.globalAlpha=defPulse*0.25;g.drawImage(_btlDefeatVig,0,0);g.globalAlpha=1;
      const defScale=1+_sFr15*0.06; // v369: cached
      g.save();g.translate(W/2,H/2-30);g.scale(defScale,defScale);
      txShadow('DEFEATED!',-42,0,18,'#ff4040','rgba(0,0,0,.9)');
      g.restore();
    }
    drawParticles(0,0); // v459: burst particles from card steals/gets now visible during battle
    _drawBpFloats(); // v454: floating damage/heal numbers
    // v312: Streak pop flash during resolve events
    if(streakDisplayTimer>0&&streakCount>0){
      const _spA=Math.min(1,streakDisplayTimer/14);
      const _scol=streakCount>=5?'#f0c830':streakCount>=3?'#e08040':'#a0e080';
      const _spX=W-138,_spY=68;
      g.globalAlpha=_spA*0.95;
      bx(_spX,_spY-14,128,20,'rgba(0,0,0,.7)');
      bx(_spX,_spY-14,128,2,_scol);
      txShadow(_BSTREAK_LBL[streakCount]||('\u2605 STREAK '+streakCount+'x'),_spX+8,_spY+1,9,_scol,'rgba(0,0,0,.5)'); // v327
      g.globalAlpha=1;
    }
  }else{
    // Anti-softlock: if player has 0 cards and 0 spells after resolve, give a pity card
    if(cdCount(pl[0].cd)===0&&sp.s<=0&&sp.b<=0&&sp.c<=0){
      const pityCard=pickAreaCard();
      addCardToPlayer(0,pityCard);
      lg.push('R'+rd+': A wandering spirit gave you '+CD[pityCard-1].n+'!');
    }
    battlePhase='result';bpFrame=fr;bpShakeTarget=-1;bpShakeTimer=0;
    if(x402Available)x402PushState(); // sync broker with post-battle card state
  }
}

// v454: render floating HP delta numbers above combatant sprites
function _drawBpFloats(){
  if(!bpDmgFloats||!bpDmgFloats.length)return;
  const LIFE=36;
  for(let i=bpDmgFloats.length-1;i>=0;i--){
    const f=bpDmgFloats[i];
    const age=fr-f.born;
    if(age>=LIFE){bpDmgFloats.splice(i,1);continue;}
    const alpha=age<LIFE-10?0.95:(LIFE-age)/10*0.95;
    const yOff=(age*(-1.1))|0;
    g.globalAlpha=alpha;
    const lbl=f.val>0?('+'+f.val+' HP'):(f.val+' HP');
    txShadow(lbl,f.x,f.y+yOff,9,f.col,'rgba(0,0,0,.7)');
    g.globalAlpha=1;
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
  // v458: KO celebration header — golden animated banner + orbiting sparks when rival reaches 0 HP
  {const _isKO=bpResolveQueue&&(bpResolveQueue._rival1KO||bpResolveQueue._rival2KO);
  if(_isKO){
    // Gold header strip behind KO text
    bx(panX+4,panY+4,panW-8,22,'rgba(70,42,0,.78)');
    bx(panX+4,panY+4,panW-8,2,'#f0c030');bx(panX+4,panY+24,panW-8,1,'#805010');
    // KO label centered, scale pop-in
    const _koName=bpResolveQueue._rival1KO?pl[1].n:pl[2].n;
    const _koLbl='!! '+_koName+' KO !!';
    const _koPop=Math.min(1,t<6?0.5+t/12*0.5:1);
    const _koCol=Math.floor(t/5)%2===0?'#fff080':'#f0c830'; // shimmer flicker
    g.save();g.translate(panX+panW/2,panY+17);g.scale(_koPop,_koPop);
    txShadow(_koLbl,-(_koLbl.length*7)|0,4,14,_koCol,'rgba(60,30,0,.9)');
    g.restore();
    // Orbiting gold sparks — sin-addition with _ORB_SI8/CI8 (2 trig calls for 8 sparks)
    const _koSpA=t<10?t/10:Math.max(0,(70-t)/16);
    if(_koSpA>0.02){
      const _spS=Math.sin(t*0.13),_spC=Math.cos(t*0.13),_spD=16+Math.min(t,30)*0.4;
      g.globalAlpha=_koSpA*slideIn_;
      for(let _ki=0;_ki<8;_ki++){
        const _kc=_spC*_ORB_CI8[_ki]-_spS*_ORB_SI8[_ki],_ks=_spS*_ORB_CI8[_ki]+_spC*_ORB_SI8[_ki];
        bx(panX+panW/2+_kc*_spD-2,panY+17+_ks*_spD*0.45-2,4,4,_ki%2===0?'#f0c030':'#ffe888');
      }
      g.globalAlpha=slideIn_;
    }
    // Gold screen-edge flash on first reveal
    if(t<10){g.globalAlpha=slideIn_*(1-t/10)*0.28;bx(0,0,W,H,'#f0a830');g.globalAlpha=slideIn_;}
  }else{
    txShadow(_ROUND_SUM[rd]||'ROUND '+rd+' SUMMARY',panX+panW/2-100,panY+22,14,'#308030','rgba(0,0,0,.3)'); // v305
  }}
  // v457: Round outcome badge — WIN/LOSS/DRAW pop-in at top-right of panel
  if(t>6&&bpResolveQueue){
    let _gotCard=false,_lostCard=false;
    for(let _oi=0;_oi<bpResolveQueue.length;_oi++){const _oe=bpResolveQueue[_oi].effect||'';if(_oe==='steal_get'||_oe==='card_get')_gotCard=true;else if(_oe==='card_lost')_lostCard=true;}
    const _outLabel=_gotCard&&!_lostCard?'WIN!':_lostCard&&!_gotCard?'LOSS':_gotCard&&_lostCard?'TRADE':'DRAW';
    // v494: one-shot badge pop spark
    if(t===8){
      const _bpx=panX+panW-16,_bpy=panY+16;
      if(_gotCard&&!_lostCard){screenShake(1,3);for(let _bi=0;_bi<10;_bi++){const _ba=(_bi/10)*Math.PI*2;const _bs=1+Math.random()*2;particles.push({x:_bpx,y:_bpy,vx:Math.cos(_ba)*_bs,vy:Math.sin(_ba)*_bs-1.5,life:12+Math.random()*8,c:Math.random()>.4?'rgba(64,232,128,1)':'rgba(200,255,220,1)'}); }}
      else if(_lostCard&&!_gotCard){for(let _bi=0;_bi<8;_bi++){const _ba=(_bi/8)*Math.PI*2;const _bs=0.8+Math.random()*1.5;particles.push({x:_bpx,y:_bpy,vx:Math.cos(_ba)*_bs,vy:Math.sin(_ba)*_bs-1,life:10+Math.random()*6,c:'rgba(220,60,60,1)'}); }}
    }
    const _outCol=_gotCard&&!_lostCard?'#40e880':_lostCard&&!_gotCard?'#ff4040':_gotCard?'#f0c030':'#888870';
    const _outBg=_gotCard&&!_lostCard?'rgba(0,60,20,.75)':_lostCard&&!_gotCard?'rgba(60,0,0,.75)':_gotCard?'rgba(60,40,0,.75)':'rgba(0,0,0,.4)';
    const _oBW=_outLabel.length*7+12;
    const _popT=Math.min(1,(t-6)/8);
    const _popSc=0.5+_popT*0.5;
    g.save();g.translate(panX+panW-_oBW/2-16,panY+16);g.scale(_popSc,_popSc);
    g.globalAlpha=slideIn_*Math.min(1,(t-6)/6);
    bx(-_oBW/2,-8,_oBW,18,_outBg);bx(-_oBW/2,-8,_oBW,2,_outCol);bx(-_oBW/2,8,_oBW,1,_outCol);
    txShadow(_outLabel,-_oBW/2+4,5,9,_outCol,'rgba(0,0,0,.6)');
    g.restore();g.globalAlpha=slideIn_;
  }
  // Divider
  bx(panX+16,panY+30,panW-32,1,'rgba(200,180,140,.3)');

  // Side-by-side rival actions
  // v262: actionNames hoisted to _ACTION_NAMES (defined in 07-battle.js, available in bundle)
  const colW=Math.floor((panW-48)/3);
  const _pActions=[bpAction,bpRivalActions[0],bpRivalActions[1]];
  const _pNames=['You',pl[1].n,pl[2].n];
  for(let col=0;col<3;col++){
    const p_action=_pActions[col],p_name=_pNames[col];
    const cx_=panX+16+col*(colW+8);
    const cy_=panY+38;
    const actAlpha=Math.min(1,Math.max(0,(t-15-col*6)/8));
    if(actAlpha<=0)continue;
    g.globalAlpha=actAlpha*slideIn_;
    // Name header
    const nameCol=col===0?'#4080d0':col===1?'#d060a0':'#d0a030';
    txShadow(p_name,cx_+4,cy_+12,9,nameCol,'rgba(0,0,0,.2)');
    // Action
    const actName=_ACTION_NAMES[p_action]||'???'; // v262: use hoisted constant
    let actCol='#686068';
    if(p_action===0)actCol='#48b8e8';
    else if(p_action===1)actCol='#b04040';
    else if(p_action===2)actCol='#3060b0';
    else if(p_action===3)actCol='#308030';
    else if(p_action===4)actCol='#806030';
    // v131: compact action icon (10×10) beside the action name
    {const ric=actCol,rix=cx_+4,riy=cy_+18;
    if(p_action===0){ // DRAW: card outline + down arrow
      bx(rix,riy+1,8,8,'rgba(0,0,0,.25)');bx(rix+1,riy,8,8,actCol==='#686068'?'#555':'#1c3846');
      bx(rix+1,riy,8,1,ric);bx(rix+1,riy+8,8,1,ric);bx(rix+1,riy,1,9,ric);bx(rix+8,riy,1,9,ric);
      bx(rix+4,riy+2,2,3,ric);bx(rix+3,riy+4,4,1,ric);bx(rix+4,riy+5,2,1,ric);
    }else if(p_action===1){ // STEAL: claw silhouette
      bx(rix,riy+5,7,4,ric);bx(rix+1,riy+3,2,3,ric);bx(rix+3,riy+1,2,5,ric);bx(rix+5,riy+3,2,3,ric);
    }else if(p_action===2){ // BARRIER: shield
      bx(rix+2,riy,6,1,ric);bx(rix,riy+1,10,4,ric);bx(rix+1,riy+5,8,2,ric);
      bx(rix+3,riy+7,4,1,ric);bx(rix+4,riy+8,2,1,ric);
      bx(rix+4,riy+1,2,5,'rgba(255,255,255,.35)');bx(rix+2,riy+3,6,1,'rgba(255,255,255,.25)');
    }else if(p_action===3){ // SCOUT: eye/lens
      bx(rix+1,riy+2,2,4,ric);bx(rix+7,riy+2,2,4,ric);
      bx(rix+3,riy+1,4,1,ric);bx(rix+3,riy+7,4,1,ric);
      bx(rix+2,riy+2,1,1,ric);bx(rix+7,riy+2,1,1,ric);
      bx(rix+4,riy+3,2,3,ric);bx(rix+4,riy+3,1,1,'rgba(255,255,255,.5)');
    }else{ // USE CARD: card + bolt
      bx(rix,riy,8,10,'rgba(0,0,0,.2)');bx(rix+1,riy+1,7,9,'#3a2810');
      bx(rix+1,riy+1,7,1,'#806030');bx(rix+1,riy+9,7,1,'#806030');
      bx(rix+1,riy+1,1,9,'#806030');bx(rix+7,riy+1,1,9,'#806030');
      bx(rix+5,riy+2,2,3,'#f0c030');bx(rix+4,riy+4,3,1,'#f0c030');bx(rix+4,riy+5,2,3,'#f0c030');
    }}
    txShadow(actName,cx_+4,cy_+28,8,actCol,'rgba(0,0,0,.2)');
    // Card count + v312: delta from round start
    const cc=cdCount(pl[col].cd);
    txShadow(_CC5_CARDS[cc]||(cc+'/5 cards'),cx_+4,cy_+42,7,'#988870','rgba(0,0,0,.15)'); // v327
    const _delta=cc-bpPreRoundCards[col];
    if(_delta!==0){
      const _dc=_delta>0?'#50d080':'#d05050';
      const _di=_delta+5;txShadow((_di>=0&&_di<11?_SIGNED_DELTA[_di]:((_delta>0?'+':'')+_delta)),cx_+colW-8,cy_+42,8,_dc,'rgba(0,0,0,.3)'); // v327
    }
    // Mini card bar — v448: type color top border for player's cards
    for(let i=0;i<5;i++){
      const cd=pl[col].cd[i];
      const sx_=cx_+4+i*22;
      if(cd>0){
        const cr=CD[cd-1];
        bx(sx_,cy_+48,20,10,cr.d);bx(sx_+1,cy_+49,18,8,cr.c);
        if(col===0){const _ti=_BTYPE_MAP[cr.t];if(_ti!==undefined)bx(sx_,cy_+48,20,1,_BTYPE_COL[_ti]);}
      }else{
        bx(sx_,cy_+48,20,10,'#383838');
      }
    }
  }
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
      txShadow(ev.text,panX+16,lineY+10,7,evCol,'rgba(0,0,0,.2)'); // v305: text pre-truncated at queue gen
      lineY+=16;
    }
  }
  g.globalAlpha=slideIn_;
  // v123: Spell counts with orb pips (consistent with HUD)
  {const _rSpVals=[sp.s,sp.b,sp.c];const rOW=5,rOH=5,rOG=2;
  txShadow('SPELLS:',panX+16,panY+panH-20,7,'#988870','rgba(0,0,0,.2)');
  for(let si=0;si<3;si++){
    const val=_rSpVals[si];const ox=panX+74+si*116,oy=panY+panH-28;
    txShadow(_RORB_LBL[si],ox,oy+10,6,_RORB_LCOL[si],'rgba(0,0,0,.2)');
    for(let o=0;o<3;o++){
      const filled=o<val;
      bx(ox+26+o*(rOW+rOG),oy+2,rOW,rOH,filled?_RORB_FILL[si]:_RORB_EMPTY[si]);
      if(filled)bx(ox+26+o*(rOW+rOG)+1,oy+3,1,1,'rgba(255,255,255,.3)');
    }
    if(val>3)txShadow(_EXCESS_CHG[val-4]||('+'+( val-3)),ox+26+3*(rOW+rOG)+2,oy+9,5,'#f0c830','rgba(0,0,0,.35)'); // v327
  }}
  g.globalAlpha=1;

  // v111: Stolen/gained card showcase — prominent display of card won this round
  if(t>18&&bpResolveQueue&&bpResolveQueue.length>0){
    // v283: counting loops replace .find() closures — runs every anim frame during resolve
    let stealEv=null;for(let _si=0;_si<bpResolveQueue.length;_si++){const _e=bpResolveQueue[_si];if(_e.effect==='steal_get'&&_e.stolenId>0){stealEv=_e;break;}}
    let drawEv=null;if(!stealEv){for(let _di=0;_di<bpResolveQueue.length;_di++){const _e=bpResolveQueue[_di];if(_e.effect==='card_get'){drawEv=_e;break;}}}
    const showcaseId=stealEv?stealEv.stolenId:(drawEv&&bpResolveQueue._pendingDrawCard>0?bpResolveQueue._pendingDrawCard:0);
    if(showcaseId>0&&CD[showcaseId-1]){
      const scr=CD[showcaseId-1];
      const showcaseAlpha=Math.min(1,(t-18)/14);
      const popT=Math.min(1,(t-18)/10);
      const popScale=0.5+popT*0.5; // zoom from 50% to 100%
      const sCX=panX+panW-62,sCY=panY+panH/2;
      const rar=scr.r||1;
      const rcol=_RES_RAR_COLS[rar]||'#d85840'; // v262: hoisted
      // Glow halo behind card
      if(rar>=2&&_cardRarGlow[rar]){
        // v243: pre-baked drawImage replaces createRadialGradient+arc per frame
        const glowR=22+rar*6+_sFr12*4; // v370: cached
        const cg=_cardRarGlow[rar];
        g.globalAlpha=showcaseAlpha*(0.2+_sFr10*0.1); // v370: cached
        g.drawImage(cg.canvas,(sCX-glowR+.5)|0,(sCY-glowR+.5)|0,(glowR*2)|0,(glowR*2)|0);
        g.globalAlpha=1;
      }
      // Card art (scaled up)
      g.save();
      g.globalAlpha=showcaseAlpha;
      g.translate(sCX,sCY);g.scale(popScale,popScale);
      bx(-22,-32,44,60,scr.d);bx(-20,-30,40,56,scr.c);
      bx(-20,-30,40,38,scr.d);bx(-19,-29,38,36,'rgba(255,255,255,.12)');
      drawCardCharacter(-18,-28,showcaseId,1.5,fr);
      bx(-20,10,40,18,scr.d);
      txShadow(scr.n,-20+2,24,9,'#fff','rgba(0,0,0,.5)');
      // Rarity border color
      bx(-22,-32,44,2,rcol);
      g.restore();
      // Card name and effect label below showcase
      g.globalAlpha=showcaseAlpha*0.9;
      const gotLabel=stealEv?'STOLEN!':'ACQUIRED!';
      const gotCol=stealEv?rcol:'#50e090';
      txShadow(gotLabel,sCX-25,sCY+34,9,gotCol,'rgba(0,0,0,.5)');
      txShadow(scr.f,sCX-25,sCY+48,7,'#988870','rgba(0,0,0,.3)');
      g.globalAlpha=1;
    }
  }

  // Rival post-battle reaction (appears after t>30)
  if(t>30){
    const reactAlpha=Math.min(1,(t-30)/10);
    g.globalAlpha=reactAlpha;
    // Determine who benefited from this round
    const evTexts=bpResolveQueue?_getBpEvTexts(bpResolveQueue):'';
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
      if(_reactNameRef!==rName){_reactNameRef=rName;_reactNameCache=rName+':';} // v327: lazy
      txShadow(_reactNameCache,reactX+8,reactY+16,9,rNameCol,'rgba(0,0,0,.4)');
      if(_reactQuoteRef!==reaction){_reactQuoteRef=reaction;_reactQuoteLbl='\u201C'+reaction+'\u201D';}
      txShadow(_reactQuoteLbl,reactX+70,reactY+16,9,'#f0e8c8','rgba(0,0,0,.4)'); // v348: lazy cache
    }
    g.globalAlpha=1;
  }

  // Tell accuracy reveal (appears at t>35, per-rival color) — v285: colors now applied
  if(t>35&&bpRivalTells[0]!==''){
    const tellFadeA=Math.min(1,(t-35)/10);
    const r1correct=bpTellWasAccurate[0];const r2correct=bpTellWasAccurate[1];
    const r1col=r1correct?'#48c848':'#c04040';const r2col=r2correct?'#48c848':'#c04040';
    // v331: lazy cache — only rebuild when accuracy combo changes
    const _tk=(r1correct?1:0)|(r2correct?2:0);
    if(_tellLblKey!==_tk){_tellLblKey=_tk;_tellLblCache[0]=pl[1].n+':'+(r1correct?'\u2713':'\u2717');_tellLblCache[1]=pl[2].n+':'+(r2correct?'\u2713':'\u2717');}
    g.globalAlpha=tellFadeA*0.85;
    txShadow(_tellLblCache[0],panX+16,panY+panH-8,7,r1col,'rgba(0,0,0,.3)');
    txShadow(_tellLblCache[1],panX+16+_tellLblCache[0].length*5+12,panY+panH-8,7,r2col,'rgba(0,0,0,.3)');
    g.globalAlpha=1;
  }

  // Press Z prompt
  if(t>25&&Math.floor(t/20)%2===0){
    txShadow('PRESS Z TO CONTINUE',W/2-120,panY+panH+12,10,'#989080','rgba(0,0,0,.3)');
  }
  drawParticles(0,0); // v459: linger particles visible in result phase
  _drawBpFloats(); // v454: floating damage/heal numbers persist into result phase
}

function dAct(){
  if(battlePhase==='vs_splash')drawVsSplash();
  else if(battlePhase==='select')drawSelectPhase();
  else if(battlePhase==='confirming'||battlePhase==='waiting')drawConfirmingPhase();
  else if(battlePhase==='resolving')drawResolvingPhase();
  else if(battlePhase==='result')drawResultPhase();
}

// ═══════════════════════════════════════
