// 09-game-loop.js — v2 canvas loop (duel-only) + background systems
// All DOM scenes are handled by 02-router.js and scenes/*.js
// This file: rAF loop, duel canvas draw/update, x402 polling, multiplayer ping

// ── Pre-baked math tables (used by duel canvas rendering) ────────────────────
const _SHAKE_N=(()=>{const t=new Float32Array(32);for(let i=0;i<32;i++)t[i]=(Math.random()-0.5)*2;return t;})();
let _sBpST12=0,_cBpST12=0,_cBpST16=0;
let _sFr004=0,_cFr004=0,_sFr006=0,_cFr006=0,_sFr007=0,_cFr007=0,_sFr008=0,_sFr012=0,_sFr015=0,_cFr015=0,_sFr018=0,_cFr018=0,_sFr02=0,_cFr02=0,_sFr022=0,_cFr022=0,_sFr025=0,_cFr025=0,_sFr028=0,_cFr028=0,_sFr03=0,_cFr03=0,_sFr035=0,_cFr035=0,_sFr042=0,_cFr042=0,_sFr04=0,_cFr04=0,_sFr045=0,_cFr045=0,_sFr05=0,_cFr05=0,_sFr052=0,_cFr052=0,_sFr055=0,_cFr055=0,_sFr06=0,_cFr06=0,_sFr07=0,_cFr07=0,_sFr08=0,_cFr08=0,_sFr09=0,_cFr09=0,_sFr10=0,_cFr10=0,_sFr12=0,_cFr12=0,_sFr15=0,_cFr15=0,_sFr18=0,_cFr18=0,_sFr20=0,_cFr20=0,_sFr25=0,_cFr25=0,_sFr28=0,_sFr30=0,_cFr30=0;
const _SIN_INT=(()=>{const a=new Float32Array(16);for(let i=0;i<16;i++)a[i]=Math.sin(i);return a;})();
const _COS_INT=(()=>{const a=new Float32Array(16);for(let i=0;i<16;i++)a[i]=Math.cos(i);return a;})();

// ── Update ───────────────────────────────────────────────────���────────────────
function update(){
  if(hitPauseFrames>0){hitPauseFrames--;return;}
  fr++;
  if(fr%20===0)wt++;
  twTick();
  fadeUpdate();updateWipe();updateParticles();updateBanner();

  // Timers used by duel canvas
  if(flashT>0)flashT-=dt;
  if(bpShakeTimer>0)bpShakeTimer-=dt;
  for(let hi=0;hi<3;hi++){if(bpHPDmgAnim[hi]>0)bpHPDmgAnim[hi]-=dt;}

  // Background services (always)
  x402CheckTimer++;
  if(x402CheckTimer>=1800){x402CheckTimer=0;x402CheckServer();}
  if(x402Available&&fr%7200===0)x402PushState();

  if(typeof mp!=='undefined'&&mp.connected&&fr%300===0)mpPing();

  // Stats save
  if(fr%600===0)saveStats();
}

// ── Draw ─────────────────────────────────────────────────────────────��────────
function draw(){
  // Only draw to canvas when duel scene is active
  if(!isDuelCanvasActive()) return;

  g.fillStyle='#080810';g.fillRect(0,0,W,H);
  _lastFontSz=-1;_shadowReady=false;
  if(bpShakeTimer>0){_sBpST12=Math.sin(bpShakeTimer*1.2);_cBpST12=Math.cos(bpShakeTimer*1.2);_cBpST16=Math.cos(bpShakeTimer*1.6);}else{_sBpST12=0;_cBpST12=1;_cBpST16=1;}
  const _fr2=fr*0.02,_fr3=fr*0.03,_fr4=fr*0.04,_fr5=fr*0.05,_fr015=fr*0.015;
  _sFr004=Math.sin(fr*0.004);_cFr004=Math.cos(fr*0.004);
  _sFr006=Math.sin(fr*0.006);_cFr006=Math.cos(fr*0.006);
  _sFr02=Math.sin(_fr2);_cFr02=Math.cos(_fr2);_sFr022=Math.sin(fr*0.022);_cFr022=Math.cos(fr*0.022);_sFr028=Math.sin(fr*0.028);_cFr028=Math.cos(fr*0.028);
  _sFr025=Math.sin(fr*0.025);_cFr025=Math.cos(fr*0.025);
  _sFr03=Math.sin(_fr3);_cFr03=Math.cos(_fr3);
  _sFr007=Math.sin(fr*0.007);_cFr007=Math.cos(fr*0.007);_sFr008=Math.sin(fr*0.008);_sFr012=Math.sin(fr*0.012);_sFr035=Math.sin(fr*0.035);_cFr035=Math.cos(fr*0.035);_sFr042=Math.sin(fr*0.042);_cFr042=Math.cos(fr*0.042);_sFr052=Math.sin(fr*0.052);_cFr052=Math.cos(fr*0.052);_sFr04=Math.sin(_fr4);_cFr04=Math.cos(_fr4);_sFr045=Math.sin(fr*0.045);_cFr045=Math.cos(fr*0.045);
  _sFr05=Math.sin(_fr5);_cFr05=Math.cos(_fr5);
  _sFr015=Math.sin(_fr015);_cFr015=Math.cos(_fr015);_sFr018=Math.sin(fr*0.018);_cFr018=Math.cos(fr*0.018);
  _sFr06=Math.sin(fr*0.06);_cFr06=Math.cos(fr*0.06);_sFr055=Math.sin(fr*0.055);_cFr055=Math.cos(fr*0.055);_sFr07=Math.sin(fr*0.07);_cFr07=Math.cos(fr*0.07);_sFr08=Math.sin(fr*0.08);_cFr08=Math.cos(fr*0.08);_sFr09=Math.sin(fr*0.09);_cFr09=Math.cos(fr*0.09);_sFr10=Math.sin(fr*0.1);_cFr10=Math.cos(fr*0.1);
  const _fr12=fr*0.12;_sFr12=Math.sin(_fr12);_cFr12=Math.cos(_fr12);
  _sFr15=Math.sin(fr*0.15);_cFr15=Math.cos(fr*0.15);_sFr18=Math.sin(fr*0.18);_cFr18=Math.cos(fr*0.18);_sFr20=Math.sin(fr*0.2);_cFr20=Math.cos(fr*0.2);_sFr25=Math.sin(fr*0.25);_cFr25=Math.cos(fr*0.25);_sFr28=Math.sin(fr*0.28);_sFr30=Math.sin(fr*0.3);_cFr30=Math.cos(fr*0.3);

  // Screen shake
  let _shaking=false;
  if(shakeT>0){
    _shaking=true;
    const _si=fr&31;
    const sx=Math.round(_SHAKE_N[_si]*shakeIntensity*(shakeT/8));
    const sy=Math.round(_SHAKE_N[(_si+16)&31]*shakeIntensity*(shakeT/8));
    g.save();g.translate(sx,sy);
    shakeT--;
  }

  // Duel canvas
  if(sc==='duel')drawDuelScene();
  else if(sc==='duel_victory')drawVictoryScene();
  else if(sc==='act')dAct();

  drawWipe();fadeDraw();

  if(flashT>0){g.globalAlpha=(flashT>10?1:flashT/10)*.8;g.fillStyle='#ffffff';g.fillRect(0,0,W,H);g.globalAlpha=1;}
  if(_shaking)g.restore();
}

// ── rAF loop ──────────────────────────────────────────────────────────────────
const _isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
const _frameInterval = _isMobile ? 33 : 16.67;
let lastTime = 0;

function loop(now){
  if(!lastTime)lastTime=now;
  const delta=now-lastTime;
  if(delta<_frameInterval){requestAnimationFrame(loop);return;}
  dt=Math.min(3,Math.max(0.1,delta/16.67));
  lastTime=now;
  update();draw();
  requestAnimationFrame(loop);
}

function updatePixiHud(){}
