// ═══════════════════════════════════════
// BATTLE / ACTION SCREEN (FRLG STYLE)
// ═══════════════════════════════════════

// v262: Hoist battle per-frame inline literals to module scope
const _ACTION_NAMES=['DRAW','STEAL','BARRIER','SCOUT','USE CARD'];
// v305: pre-baked BATTLE round header labels; cache TX sig truncation
const _BATTLE_HDR=['','BATTLE 1','BATTLE 2','BATTLE 3','BATTLE 4','BATTLE 5','BATTLE 6','BATTLE 7','BATTLE 8','BATTLE 9','BATTLE 10'];
let _txLblCache='TX:--',_txLblSig='';
const _ACTION_NAMES_EX=['DRAW!','STEAL!','BARRIER!','SCOUT!','USE CARD!'];
const _ACTION_COLORS_EX=['#48b8e8','#d04040','#3060b0','#308030','#c08030'];
const __ACT_ABBR=['DRW','STL','BAR','SCT','CRD'],__ACT_COL=['#48b8e8','#d04040','#3060b0','#38a038','#c08030'];
const _SPIN=['|','/','-','\\'];
// v261: rivalUniqSize — allocation-free rival hand unique count (replaces new Set() × 2 per frame in game-loop)
// v250: Static battle HUD arrays — eliminates per-frame object/array allocation in spell orb + type strip rendering
const _BORB_LBL=['STL','BAR','SCT'],_BORB_FILL=['#c04848','#3868c0','#38a038'],_BORB_EMPTY=['#2a1010','#101028','#0e1e0e'],_BORB_LCOL=['#d05050','#4878d0','#48b048'];
// v254: Static scout panel arrays — eliminates rivalInfo object array per scout panel render
const _RIVAL_COL=['#d060a0','#d0a030'],_RIVAL_LBL=['VEGA','MIRA'];
// v264: Hoist BARRIER + SCOUT panel per-frame inline arrays/objects
const _BAR_THREAT_COLS=['#50b050','#c0b030','#d07030','#d04040'];
const _BAR_THREAT_LBLS=['LOW','MED','HIGH','MAX'];
const _SCT_TYPE_COL={attack:'#d04040',defense:'#4090d0',flee:'#40c080',magic:'#c060c0',recovery:'#d0c040'};
// v265: Pre-bake USE CARD effect panel info — was TYPE_INFO object created every frame during card select
const _CARD_TYPE_INFO_S={
  attack:{col:'#e05040',label:'ATTACK',lines:['Force steal (ignores barrier).','Success rate scales with rarity.','Higher rarity = more reliable.']},
  flee:  {col:'#40c080',label:'FLEE',  lines:['Ends battle immediately.','No cards lost this round.','Use when overwhelmed.']},
  magic: {col:'#c070e0',label:'MAGIC', lines:['Nullifies ALL barriers.','Guaranteed steal attempt.','Cannot be blocked this round.']},
};
const _DEF_TYPE_INFOS=(()=>{const a=[];for(let r=1;r<=5;r++)a.push({col:'#4080d0',label:'DEFENSE',lines:['Raises Barrier this round.','Restores +'+(Math.ceil(r/2))+' Barrier charges.','Protects against incoming Steal.']});return a;})();
const _REC_TYPE_INFOS=(()=>{const a=[];for(let r=1;r<=5;r++)a.push({col:'#e0c030',label:'RECOVERY',lines:['Restores spell energy:','+'+Math.ceil(r/2)+' Steal, +1 Barrier, +1 Scout.','Use when spells are depleted.']});return a;})();
const _UNK_TYPE_INFO={col:'#888',label:'UNKNOWN',lines:['Unknown effect.','','']};
// v316: pre-baked vs_splash labels, ZK spinner strings, round/action labels
const _PWR_LBL=(()=>{const a=[];for(let i=0;i<=25;i++)a.push('PWR:'+i);return a;})();
// v318: pre-baked battle info-box strings — eliminates per-frame alloc in select hot path
const _CARDS_OVER5=['0/5','1/5','2/5','3/5','4/5','5/5'];
// v320: pre-baked action grid badge strings
const _NEW_IN_POOL=(()=>{const a=[''];for(let i=1;i<=60;i++)a.push('+'+i+' NEW');return a;})();
const _SCOUT_DATA_LBL=(()=>{const a=[];for(let i=0;i<=10;i++)a.push('R'+i+' DATA');return a;})();
const _HAND_READY_LBL=['','1 card ready','2 cards ready','3 cards ready','4 cards ready','5 cards ready'];
// v324: pre-baked "+N more..." / "+N more hidden" panel overflow labels (index = N, where N >= 1)
const _MORE_LBL=(()=>{const a=[''];for(let i=1;i<=56;i++)a.push('+'+i+' more...');return a;})();
const _MORE_HIDDEN_LBL=(()=>{const a=[''];for(let i=1;i<=20;i++)a.push('+'+i+' more hidden');return a;})();
let _hashLblCache='',_hashLblRef=''; // v324: lazy cache for wallet hash label
// v329: pre-baked scout/barrier panel strings
const _UNK_CARD_LBL=['\u2753 0 cards','\u2753 1 card','\u2753 2 cards','\u2753 3 cards','\u2753 4 cards','\u2753 5 cards'];
const _SCOUT_HDR=(()=>{const a=[];for(let i=0;i<2;i++)a.push('SCOUT: '+_RIVAL_LBL[i]);return a;})();
const _RD_DATA_LBL=(()=>{const a=[];for(let i=0;i<=10;i++)a.push('R'+i+' data');return a;})();
const _BTYPE_UC={'attack':'A','defense':'D','flee':'F','magic':'M','recovery':'R'}; // first letter uppercase
const _EXCESS_CHG=['+1','+2','+3','+4','+5','+6','+7','+8','+9'];
const _STALE_RD_LBL=(()=>{const a=[];for(let i=0;i<=10;i++)a.push('(R'+i+')');return a;})();
const _BTYPE_CNT_LBL=(()=>{const a=[];for(let ti=0;ti<5;ti++){const b=[];for(let n=0;n<=5;n++)b.push(_BTYPE_ABB[ti]+':'+n);a.push(b);}return a;})();
const _SPLASH_CARD_LBL=['0 cards','1 card','2 cards','3 cards','4 cards','5 cards'];
// v332: pre-baked STEAL target rarity labels (hoisted from per-frame local array in drawActionGrid)
const _STL_RAR_LBL=['','\u26A1C TARGET','\u26A1U TARGET','\u26A1R TARGET','\u26A1E TARGET','\u26A1L TARGET'];
// v332: DRAW action badge lazy cache — pool scan is O(pool.length) per frame without this
let _drawBadge='',_drawBadgeCol='#606060',_drawBadgeBg='rgba(0,0,0,.35)',_drawBadgeKey=-1;
const _POSEIDON_SPIN=['Computing Poseidon hash... |','Computing Poseidon hash... /','Computing Poseidon hash... -','Computing Poseidon hash... \\'];
const _ZK_PROOF_SPIN=['ZK proof: generating |','ZK proof: generating /','ZK proof: generating -','ZK proof: generating \\'];
const _ZK_VERIFIED_SPIN=['ZK proof: verified |','ZK proof: verified /','ZK proof: verified -','ZK proof: verified \\'];
const _GROTH16_SNARK_SPIN=['Generating Groth16 proof (snarkjs)... |','Generating Groth16 proof (snarkjs)... /','Generating Groth16 proof (snarkjs)... -','Generating Groth16 proof (snarkjs)... \\'];
const _GROTH16_VIS_SPIN=['Generating Groth16 proof... |','Generating Groth16 proof... /','Generating Groth16 proof... -','Generating Groth16 proof... \\'];
const _ROUND_LBL=['R0','R1','R2','R3','R4','R5','R6','R7','R8','R9','R10'];
const _SCOUTED_RD=['scouted R0','scouted R1','scouted R2','scouted R3','scouted R4','scouted R5','scouted R6','scouted R7','scouted R8','scouted R9','scouted R10'];
const _V_ACT_LBL=['V:DRW','V:STL','V:BAR','V:SCT','V:CRD'];
const _M_ACT_LBL=['M:DRW','M:STL','M:BAR','M:SCT','M:CRD'];
// v336: pre-baked "You chose X!" labels — eliminates per-frame string concat during confirming phase
const _CHOSE_LBL=_ACTION_NAMES.map(n=>'You chose '+n+'!');
function _getTypeInfo(t,r){
  if(t==='defense')return _DEF_TYPE_INFOS[Math.min(4,(r||1)-1)];
  if(t==='recovery')return _REC_TYPE_INFOS[Math.min(4,(r||1)-1)];
  return _CARD_TYPE_INFO_S[t]||_UNK_TYPE_INFO;
}
// v266: reusable slot buffer for USE CARD select — eliminates filled=[] per frame while card select open
const _csFilledBuf=new Int8Array(7);
const _BTYPE_MAP={attack:0,defense:1,flee:2,magic:3,recovery:4}; // v277: hoisted from hand type strip
const _BTYPES=['attack','defense','flee','magic','recovery'],_BTYPE_ABB=['ATK','DEF','FLY','MAG','REC'],_BTYPE_COL=['#c83838','#3888c8','#30b870','#a840c0','#c8a830'];
const _btCounts=new Int32Array(5); // reused each frame, zero-filled
// v245: Pre-baked VS gold circle — eliminates arc per battle-intro frame
const _vsGoldCircle=(()=>{const c=document.createElement('canvas');c.width=58;c.height=58;const ctx=c.getContext('2d');ctx.fillStyle='#f0c830';ctx.beginPath();ctx.arc(29,29,28,0,Math.PI*2);ctx.fill();return c;})();
// v221: Pre-baked battle BG static layers — eliminates per-frame gradient creation during battle
// Dungeon floor atmosphere data (shared between baking and runtime animated draws)
const _floorAtm=[
  null, // index 0 unused
  [42,38,52, 55,50,62, '#504850','#606060', '#706858','#908070'], // F1: stone grey
  [32,28,42, 42,36,50, '#403848','#504858', '#605048','#807060'], // F2: deeper, cooler
  [28,20,48, 38,28,58, '#503868','#705890', '#604868','#907898'], // F3: crystal purple
  [48,22,18, 60,28,22, '#603828','#804838', '#703828','#904840'], // F4: lava red
  [12,10,18, 18,14,22, '#201828','#302030', '#282028','#403040'], // F5: void/darkness
];
const _btlHorizonY=Math.floor(H*0.42),_btlPlayerPlatY=H-70,_btlEnemyPlatY=Math.floor(H*0.42)+30;
(function _bakeBattleBGs(){
  // Helper: create offscreen canvas and temporarily redirect g to it
  function bake(drawFn){
    const c=document.createElement('canvas');c.width=W;c.height=H;
    const ctx=c.getContext('2d');const _mc=g;g=ctx;drawFn();g=_mc;return c;
  }
  // Town BG (static layers: sky, ocean, platforms — waves excluded)
  window._btlBgTown=bake(()=>{
    const hy=_btlHorizonY,py=_btlPlayerPlatY,ey=_btlEnemyPlatY;
    const gd=g.createLinearGradient(0,0,0,hy);gd.addColorStop(0,'rgb(130,190,240)');gd.addColorStop(1,'rgb(180,220,250)');g.fillStyle=gd;g.fillRect(0,0,W,hy);
    bx(0,hy-2,W,4,'rgba(255,255,255,.15)');
    const gd2=g.createLinearGradient(0,hy,0,H);gd2.addColorStop(0,'rgb(80,140,200)');gd2.addColorStop(1,'rgb(100,160,180)');g.fillStyle=gd2;g.fillRect(0,hy,W,H-hy);
    bx(40,py,320,12,'#8B7355');bx(40,py,320,2,'#A08860');bx(40,py+12,320,50,'#7B6345');
    for(let x=50;x<350;x+=40){bx(x,py+2,2,10,'#6B5335');}
    bx(W-380,ey,300,8,'#9B8365');bx(W-380,ey,300,2,'#B09870');bx(W-380,ey+8,300,30,'#8B7355');
  });
  // Dungeon BG per floor (static layers: ceiling, pillar structure, horizon, floor, cracks, platforms, label)
  window._btlBgDungeon=[null];
  for(let fl=1;fl<=5;fl++){
    const a=_floorAtm[fl];
    window._btlBgDungeon.push(bake(()=>{
      const hy=_btlHorizonY,py=_btlPlayerPlatY,ey=_btlEnemyPlatY;
      const gd=g.createLinearGradient(0,0,0,hy);
      gd.addColorStop(0,`rgb(${Math.floor(a[0]*.6)},${Math.floor(a[1]*.6)},${Math.floor(a[2]*.6)})`);
      gd.addColorStop(1,`rgb(${a[0]},${a[1]},${a[2]})`);
      g.fillStyle=gd;g.fillRect(0,0,W,hy);
      for(let i=0;i<4;i++){const px_=60+i*160;bx(px_,10,24,hy-10,a[6]);bx(px_+2,10,20,hy-10,a[7]);bx(px_-4,8,32,8,a[7]);bx(px_-2,10,28,4,a[6]);}
      bx(0,hy-2,W,6,a[6]);bx(0,hy-2,W,2,a[7]);
      const gd2=g.createLinearGradient(0,hy,0,H);
      gd2.addColorStop(0,`rgb(${a[3]},${a[4]},${a[5]})`);
      gd2.addColorStop(1,`rgb(${a[3]+20},${a[4]+18},${a[5]+20})`);
      g.fillStyle=gd2;g.fillRect(0,hy,W,H-hy);
      const cc=2+fl;for(let i=0;i<cc;i++){
        const cx_=30+i*Math.floor(W/cc);const crk=fl>=4?'#d03010':fl===3?'#503080':'#403830';
        bx(cx_,hy+30+i*8,14+fl*2,1,crk);bx(cx_+4,hy+31+i*8,10+fl,1,crk);
      }
      bx(40,py,320,10,a[8]);bx(40,py,320,2,a[9]);bx(40,py+10,320,50,a[6]);
      bx(W-380,ey,300,8,a[9]);bx(W-380,ey,300,2,a[9]);bx(W-380,ey+8,300,25,a[6]);
      const flN=['','FLOOR I','FLOOR II','FLOOR III','FLOOR IV','THE DEEP'];
      const flC=fl===5?'#8060c0':fl===4?'#c05040':fl===3?'#9060c0':'#707888';
      g.globalAlpha=0.35;txShadow(flN[fl],W/2-30,16,6,flC,'rgba(0,0,0,.4)');g.globalAlpha=1;
    }));
  }
})();
// v224: Pre-bake center light gradient — used every frame in dungeon battle
const _btlCenterLightH=_btlPlayerPlatY-_btlHorizonY;
const _btlCenterLightW=Math.floor(W*0.3);
const _btlCenterLight=(()=>{
  const c=document.createElement('canvas');c.width=_btlCenterLightW;c.height=_btlCenterLightH;
  const ctx=c.getContext('2d');
  const grd=ctx.createLinearGradient(0,0,0,_btlCenterLightH);
  grd.addColorStop(0,'rgba(255,240,200,0)');
  grd.addColorStop(0.3,'rgba(255,240,200,1)');
  grd.addColorStop(1,'rgba(255,240,200,0)');
  ctx.fillStyle=grd;ctx.fillRect(0,0,_btlCenterLightW,_btlCenterLightH);
  return c;
})();

// New SFX for battle effects
function sfxCrystal(){if(!soundEnabled)return;beep(880,.06,.07);setTimeout(()=>beep(1100,.04,.06),50);setTimeout(()=>beep(1320,.06,.07),100);setTimeout(()=>beep(1760,.08,.08),150);}
function sfxShadow(){if(!soundEnabled)return;try{const o=AC.createOscillator(),gn=AC.createGain();o.type='sine';o.frequency.setValueAtTime(400,AC.currentTime);o.frequency.linearRampToValueAtTime(100,AC.currentTime+.2);gn.gain.setValueAtTime(.06,AC.currentTime);gn.gain.linearRampToValueAtTime(0,AC.currentTime+.2);o.connect(gn);gn.connect(AC.destination);o.start();o.stop(AC.currentTime+.2);}catch(e){}}
function sfxFlame(){if(!soundEnabled)return;try{const s=AC.createBufferSource(),gn=AC.createGain(),f=AC.createBiquadFilter();s.buffer=noiseBuf;f.type='bandpass';f.frequency.value=1200;f.Q.value=2;gn.gain.setValueAtTime(.08,AC.currentTime);gn.gain.linearRampToValueAtTime(0,AC.currentTime+.15);s.connect(f);f.connect(gn);gn.connect(AC.destination);s.start();s.stop(AC.currentTime+.15);}catch(e){}}
function sfxStorm(){if(!soundEnabled)return;try{const s=AC.createBufferSource(),gn=AC.createGain(),f=AC.createBiquadFilter();s.buffer=noiseBuf;f.type='highpass';f.frequency.value=3000;gn.gain.setValueAtTime(.1,AC.currentTime);gn.gain.linearRampToValueAtTime(0,AC.currentTime+.2);s.connect(f);f.connect(gn);gn.connect(AC.destination);s.start();s.stop(AC.currentTime+.2);}catch(e){}}
function sfxVoid(){if(!soundEnabled)return;try{const o=AC.createOscillator(),gn=AC.createGain();o.type='triangle';o.frequency.setValueAtTime(600,AC.currentTime);o.frequency.linearRampToValueAtTime(200,AC.currentTime+.15);gn.gain.setValueAtTime(.07,AC.currentTime);gn.gain.linearRampToValueAtTime(0,AC.currentTime+.15);o.connect(gn);gn.connect(AC.destination);o.start();o.stop(AC.currentTime+.15);}catch(e){}}

function drawBattleBG(){
  // FRLG-style layered battle backgrounds — static layers from pre-baked canvases, animated on top
  const horizonY=_btlHorizonY;
  const playerPlatY=_btlPlayerPlatY;
  const enemyPlatY=_btlEnemyPlatY;

  if(currentMap===0&&!inDungeon){
    // Blit pre-baked static layers (sky + ocean + platforms)
    g.drawImage(_btlBgTown,0,0);
    // Waves (animated — fr-dependent)
    for(let i=0;i<6;i++){
      const wy=horizonY+20+i*18+Math.sin(fr*0.04+i)*4;
      bx(0,wy,W,2,_btlWaveAlphas[i]);
    }
  }else{
    // Dungeon battle BG — blit pre-baked static layers, then draw animated elements on top
    const fl=Math.max(1,Math.min(5,currentFloor||1));
    const a=_floorAtm[fl]||_floorAtm[1];
    g.drawImage(_btlBgDungeon[fl],0,0);
    // Animated elements drawn on top of baked canvas:
    // Pillar-top animations (torches / lava glow / void cracks)
    for(let i=0;i<4;i++){
      const px_=60+i*160;
      if(fl<=3){
        const flamCol=fl===3?'#a040d0':fl===2?'#d06020':'#e08020';
        const glowCol=fl===3?'#c070f0':fl===2?'#f08040':'#f0c040';
        const flicker=Math.sin(fr*0.15+i*2)*2;
        bx(px_+8,4+flicker,8,6,flamCol);bx(px_+9,2+flicker,6,4,glowCol);
        bx(px_+10,0+flicker,4,3,'rgba(255,255,200,.8)');
      }else if(fl===4){
        const lavaA=0.4+Math.sin(fr*0.08+i)*0.2;
        g.globalAlpha=lavaA;bx(px_-2,horizonY-16,28,16,'#d03010');g.globalAlpha=1;
      }else{
        const voidA=0.3+Math.sin(fr*0.06+i*1.3)*0.2;
        g.globalAlpha=voidA;bx(px_+4,horizonY-24,16,24,'#6030a0');g.globalAlpha=1;
      }
    }
    // F3: crystal shard shimmer
    if(fl===3){
      for(let i=0;i<6;i++){
        const csx=80+i*120,csy=horizonY-20-Math.abs(Math.sin(i*1.7))*30;
        const crystA=0.5+Math.sin(fr*0.07+i)*0.25;
        g.globalAlpha=crystA;
        bx(csx,csy,4,18,'#7050c0');bx(csx+1,csy,2,12,'#a080e0');
        g.globalAlpha=1;
      }
    }
    // F4: rising ember particles + crack lava seep
    if(fl===4){
      for(let i=0;i<8;i++){
        const emberPhase=(fr*0.03+i*0.7)%1;
        const ex_=80+i*100+Math.sin(i*2.1)*20;
        const ey_=H-(emberPhase*H*0.6)-20;
        const ea=Math.sin(emberPhase*Math.PI)*0.7;
        g.globalAlpha=ea;bx(ex_,ey_,2,2,'#f06020');g.globalAlpha=1;
      }
      const cc=2+fl;for(let i=0;i<cc;i++){
        const cx_=30+i*Math.floor(W/cc);
        const seepA=0.3+Math.sin(fr*0.1+i)*0.2;
        g.globalAlpha=seepA;bx(cx_+1,horizonY+30+i*8,12,1,'#f06020');g.globalAlpha=1;
      }
    }
    // Center downward light pulse (pre-baked shape, fr-dependent globalAlpha)
    {const lightPulse=0.08+0.025*Math.sin(fr*0.04);
    g.globalAlpha=lightPulse;
    g.drawImage(_btlCenterLight,Math.floor(W*0.35),horizonY);
    g.globalAlpha=1;}
  }
  // v134: Rival-themed atmospheric overlay — VEGA (magenta) or MIRA (gold)
  // v210: vignette pre-baked to offscreen canvas — drawImage replaces createRadialGradient per frame
  const vsRiv=(encounterExclTarget>=1&&encounterExclTarget<=2)?encounterExclTarget:1;
  if(vsRiv===1){
    // VEGA: dark magenta screen-edge vignette + drifting orbs
    g.drawImage(_btlVigVega,0,0);
    // Three drifting dark-energy orbs near VEGA's side (pre-baked canvases)
    for(let i=0;i<3;i++){
      const phase=fr*0.018+i*2.1;
      const ox=W-220+Math.cos(phase)*28+i*22;
      const oy=100+Math.sin(phase*0.7)*22+i*16;
      const ora=0.12+Math.sin(phase*1.3)*0.06;
      const vo=_vegaOrbs[i];
      g.globalAlpha=ora;g.drawImage(vo[0].canvas,(ox-vo[0].hw)|0,(oy-vo[0].hw)|0);
      g.globalAlpha=ora*0.4;g.drawImage(vo[1].canvas,(ox-vo[1].hw)|0,(oy-vo[1].hw)|0);
    }
    g.globalAlpha=1;
  }else{
    // MIRA: warm amber screen-edge vignette + drifting coin sparks
    g.drawImage(_btlVigMira,0,0);
    // Drifting coin-glint sparks near MIRA's side
    for(let i=0;i<4;i++){
      const phase=fr*0.022+i*1.6;
      const ox=W-290+Math.cos(phase)*24+i*18;
      const oy=120+Math.sin(phase*0.6)*18+i*14;
      const ora=0.10+Math.sin(phase*1.1)*0.05;
      g.globalAlpha=ora;
      bx(ox-2,oy-2,4,4,'#e0c040');
      g.globalAlpha=ora*0.45;
      bx(ox-4,oy-4,8,1,'#f0e060');bx(ox-4,oy+3,8,1,'#f0e060');
      bx(ox-4,oy-4,1,8,'#f0e060');bx(ox+3,oy-4,1,8,'#f0e060');
    }
    g.globalAlpha=1;
  }
}

// Draw FRLG-style card count bar (like HP bar) with rounded container and segmented fill
function drawCardBar(x,y,w,cards,maxCards){
  const filledCount=cdCount(cards);
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

// v236: Pre-baked VEGA orb canvases (6 small: 3 inner + 3 outer) — replaces 6 arc/frame in VEGA battle
function _mkVegaOrb(r){
  const c=document.createElement('canvas');c.width=r*2+2;c.height=r*2+2;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#c040a0';ctx.beginPath();ctx.arc(r+1,r+1,r,0,Math.PI*2);ctx.fill();
  return {canvas:c,hw:r+1};
}
// [i][0]=inner orb, [i][1]=outer orb; i=0..2
const _vegaOrbs=[[_mkVegaOrb(5),_mkVegaOrb(10)],[_mkVegaOrb(7),_mkVegaOrb(13)],[_mkVegaOrb(9),_mkVegaOrb(16)]];
// Pre-computed wave alpha strings — avoids 6 template literals per frame during town battle
const _btlWaveAlphas=['rgba(255,255,255,0.1)','rgba(255,255,255,0.088)','rgba(255,255,255,0.076)','rgba(255,255,255,0.064)','rgba(255,255,255,0.052)','rgba(255,255,255,0.04)'];

// v230: Pre-baked battle sprite shadow/glow ellipses — replaces per-frame ellipse() calls
// Shadow ellipse (dark oval under sprite feet): one per scale variant
const _btlShadow3=(()=>{
  const c=document.createElement('canvas');c.width=48;c.height=20;
  const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(24,10,21,7.2,0,0,Math.PI*2);ctx.fill();
  return c;
})(); // scale=3 sprites
const _btlShadow22=(()=>{
  const c=document.createElement('canvas');c.width=36;c.height=16;
  const ctx=c.getContext('2d');
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(18,8,15.4,5.3,0,0,Math.PI*2);ctx.fill();
  return c;
})(); // scale=2.2 sprites
// Glow aura ellipses: one per character (color-coded)
function _mkGlow(sw,sh,col){
  const c=document.createElement('canvas');c.width=sw*2+4;c.height=sh*2+4;
  const ctx=c.getContext('2d');const cx_=sw+2,cy_=sh+2;
  ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(cx_,cy_,sw,sh,0,0,Math.PI*2);ctx.fill();
  return {canvas:c,hw:sw+2,hh:sh+2};
}
const _btlGlowPlayer=_mkGlow(19,33,'rgba(40,88,200,.22)');   // player (scale 3)
const _btlGlowVega=_mkGlow(19,33,'rgba(200,32,40,.22)');     // VEGA (scale 3)
const _btlGlowMira=_mkGlow(14,24,'rgba(40,180,160,.22)');    // MIRA (scale 2.2)
// Low-HP battle vignette (pre-baked at alpha=1, globalAlpha=dangerPulse at draw time)
const _btlLowHpVig=(()=>{
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const ctx=c.getContext('2d');
  const grd=ctx.createRadialGradient(W/2,H/2,H*0.28,W/2,H/2,H*0.72);
  grd.addColorStop(0,'rgba(0,0,0,0)');grd.addColorStop(1,'rgba(200,20,20,1)');
  ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);return c;
})();

// Draw FRLG-style opponent info box (top-left)
function drawOpponentInfoBox(){
  const rival=pl[1]; // Primary opponent (VEGA)
  let sx=0,sy=0;
  if(bpShakeTarget===1&&bpShakeTimer>0){sx=Math.sin(bpShakeTimer*1.2)*3;sy=Math.cos(bpShakeTimer*1.6)*2;}
  // Expand box when tells are visible during select, or when scout intel is known
  const showTells=(battlePhase==='select'&&bpRivalTells[0]!==''&&bpRivalTells[1]!=='');
  // v311: tell accuracy reveal — first 45 frames of resolving phase
  const _revT=fr-bpFrame;
  const showAccuracyReveal=(battlePhase==='resolving'&&_revT<45&&bpRivalTells[0]!=='');
  const showScout0=!!bpScoutedCards[0],showScout1=!!bpScoutedCards[1];
  const hasScout=showScout0||showScout1;
  const bx_=8+sx,by_=16+sy,bw=300;
  // Height: base 64, +36 for tells/reveal, +16 per scouted rival
  let bh=64;
  if(showTells||showAccuracyReveal)bh=100;
  if(showScout0)bh+=16;
  if(showScout1)bh+=16;
  win(bx_,by_,bw,bh);
  // Crimson top bar for rival danger indicator
  bx(bx_+4,by_+4,bw-8,22,'rgba(80,10,10,.5)');
  // Rival 1 (VEGA)
  txShadow(rival.n,bx_+10,by_+20,12,'#d06080','rgba(0,0,0,.5)');
  // HP hearts rival 1
  {const r1hp=bpHP[1],hx=bx_+80,hy=by_+9;
  const dmgFlash1=bpHPDmgAnim[1]>0&&Math.floor(fr/3)%2===0;
  for(let h=0;h<BATTLE_HP_MAX;h++){
    const filled=h<r1hp;
    const hc=filled?(dmgFlash1?'#ff8888':'#e84040'):'#401818';
    const hhi=hx+h*14,hhj=hy;
    bx(hhi+1,hhj,3,1,hc);bx(hhi,hhj+1,6,1,hc);bx(hhi,hhj+2,6,2,hc);
    bx(hhi+1,hhj+4,4,1,hc);bx(hhi+2,hhj+5,2,1,hc);bx(hhi+3,hhj+6,1,1,hc);
    if(filled)bx(hhi+1,hhj+2,1,1,'rgba(255,255,255,.4)');
  }}
  txShadow('CARDS',bx_+120,by_+20,7,ARK.textDim,'rgba(0,0,0,.3)');
  drawCardBar(bx_+168,by_+12,80,rival.cd,5);
  const r1Cards=cardCount(rival);
  const r1DangerColor=r1Cards>=4?ARK.dangerBright:r1Cards>=3?'#d08030':ARK.textDim;
  txShadow(_CARDS_OVER5[rival.cc]||(rival.cc+'/5'),bx_+202,by_+34,8,r1DangerColor,'rgba(0,0,0,.3)'); // v318
  // Near-win warning
  if(r1Cards>=4){
    const wA=0.5+Math.sin(fr*0.18)*0.5;
    g.globalAlpha=wA*0.9;
    bx(bx_+6,by_+27,76,13,ARK.danger);
    g.globalAlpha=1;
    txShadow(r1Cards>=5?'!! FULL HAND !':'! DANGEROUS',bx_+10,by_+37,6,'#fff','rgba(0,0,0,.6)');
  }
  // Tell for Rival 1 (during select only)
  if(showTells&&bpRivalTells[0]){
    const tellFade=Math.min(1,(fr-bpFrame)/12);
    g.globalAlpha=tellFade*0.85;
    bx(bx_+4,by_+34,bw-8,14,'rgba(40,100,130,.4)');
    txShadow(bpRivalTells[0],bx_+8,by_+44,6,ARK.tealBright,'rgba(0,0,0,.3)');
    g.globalAlpha=1;
  }
  // v311: tell accuracy reveal block for rival 1
  if(showAccuracyReveal){
    const _revA=_revT<35?Math.min(1,_revT/8):(45-_revT)/10;
    const _acc0=bpTellWasAccurate[0];
    g.globalAlpha=_revA*0.92;
    bx(bx_+4,by_+34,bw-8,14,_acc0?'rgba(20,80,40,.5)':'rgba(80,20,20,.5)');
    txShadow(_acc0?'\u2713 TELL WAS TRUE':'\u2717 VEGA BLUFFED',bx_+8,by_+44,6,_acc0?'#50d080':'#d05050','rgba(0,0,0,.3)');
    g.globalAlpha=1;
  }
  // Separator
  const sepY=(showTells||showAccuracyReveal)?by_+52:by_+44;
  bx(bx_+8,sepY,bw-16,1,ARK.border);
  // Rival 2 (MIRA)
  const hunter=pl[2];
  const r2alive=cardCount(hunter)>0;
  const hunterCol=r2alive?ARK.gold:ARK.dangerBright;
  txShadow(hunter.n+(r2alive?'':' FLED'),bx_+10,sepY+16,9,hunterCol,'rgba(0,0,0,.4)');
  // HP hearts rival 2
  if(r2alive){const r2hp=bpHP[2],hx=bx_+80,hy=sepY+7;
  const dmgFlash2=bpHPDmgAnim[2]>0&&Math.floor(fr/3)%2===0;
  for(let h=0;h<BATTLE_HP_MAX;h++){
    const filled=h<r2hp;
    const hc=filled?(dmgFlash2?'#ffcc88':'#e8a040'):'#402018';
    const hhi=hx+h*14,hhj=hy;
    bx(hhi+1,hhj,3,1,hc);bx(hhi,hhj+1,6,1,hc);bx(hhi,hhj+2,6,2,hc);
    bx(hhi+1,hhj+4,4,1,hc);bx(hhi+2,hhj+5,2,1,hc);bx(hhi+3,hhj+6,1,1,hc);
    if(filled)bx(hhi+1,hhj+2,1,1,'rgba(255,255,255,.4)');
  }}
  if(r2alive){
    drawCardBar(bx_+168,sepY+8,80,hunter.cd,5);
    const r2Cards=cardCount(hunter);
    const r2DangerColor=r2Cards>=4?ARK.dangerBright:r2Cards>=3?'#d08030':ARK.textDim;
    txShadow(_CARDS_OVER5[hunter.cc]||(hunter.cc+'/5'),bx_+202,sepY+16,7,r2DangerColor,'rgba(0,0,0,.3)'); // v318
    // Near-win warning for MIRA
    if(r2Cards>=4){
      const wA2=0.5+Math.sin(fr*0.18+1)*0.5;
      g.globalAlpha=wA2*0.8;
      bx(bx_+6,sepY+19,70,12,ARK.danger);
      g.globalAlpha=1;
      txShadow(r2Cards>=5?'!! FULL HAND !':'! DANGEROUS',bx_+10,sepY+28,6,'#fff','rgba(0,0,0,.6)');
    }
    // Tell for Rival 2
    if(showTells&&bpRivalTells[1]){
      const tellFade2=Math.min(1,(fr-bpFrame)/12);
      g.globalAlpha=tellFade2*0.85;
      bx(bx_+4,sepY+26,bw-8,14,'rgba(80,60,10,.4)');
      txShadow(bpRivalTells[1],bx_+8,sepY+36,6,ARK.gold,'rgba(0,0,0,.3)');
      g.globalAlpha=1;
    }
    // v311: tell accuracy reveal block for rival 2 (MIRA)
    if(showAccuracyReveal&&bpRivalTells[1]){
      const _revA=_revT<35?Math.min(1,_revT/8):(45-_revT)/10;
      const _acc1=bpTellWasAccurate[1];
      g.globalAlpha=_revA*0.88;
      bx(bx_+4,sepY+26,bw-8,14,_acc1?'rgba(20,80,40,.5)':'rgba(80,20,20,.5)');
      txShadow(_acc1?'\u2713 TELL WAS TRUE':'\u2717 MIRA BLUFFED',bx_+8,sepY+36,6,_acc1?'#50d080':'#d05050','rgba(0,0,0,.3)');
      g.globalAlpha=1;
    }
  }
  // Scout intel
  if(hasScout){
    let intelY=by_+bh-4;
    if(showScout0){
      intelY=by_+bh-(showScout1?32:16);
      const sd=bpScoutedCards[0];
      const staleLabel=rd-sd.round>0?(_STALE_RD_LBL[sd.round]||'(R'+sd.round+')'):''; // v318
      g.globalAlpha=rd-sd.round>1?0.5:0.85;
      bx(bx_+4,intelY,bw-8,14,'rgba(30,80,120,.4)');
      txShadow('\u{1F50D}'+pl[1].n[0]+': '+(sd.nameStr||'empty')+staleLabel,bx_+8,intelY+11,5,ARK.tealBright,'rgba(0,0,0,.3)'); // v261: pre-joined
      g.globalAlpha=1;
    }
    if(showScout1){
      const sd2=bpScoutedCards[1];
      const intelY2=by_+bh-16;
      const staleLabel2=rd-sd2.round>0?(_STALE_RD_LBL[sd2.round]||'(R'+sd2.round+')'):''; // v318
      g.globalAlpha=rd-sd2.round>1?0.5:0.85;
      bx(bx_+4,intelY2,bw-8,14,'rgba(80,60,10,.35)');
      txShadow('\u{1F50D}'+pl[2].n[0]+': '+(sd2.nameStr||'empty')+staleLabel2,bx_+8,intelY2+11,5,ARK.gold,'rgba(0,0,0,.3)'); // v261: pre-joined
      g.globalAlpha=1;
    }
  }
}

// Draw FRLG-style player info box (bottom-right)
function drawPlayerInfoBox(){
  let sx=0,sy=0;
  if(bpShakeTarget===0&&bpShakeTimer>0){sx=Math.sin(bpShakeTimer*1.2)*3;sy=Math.cos(bpShakeTimer*1.6)*2;}
  const bx_=W-310+sx,by_=H-154+sy,bw=300,bh=86; // v104: +14px for hand type row
  win(bx_,by_,bw,bh);
  // Navy top bar for player identity
  bx(bx_+4,by_+4,bw-8,22,'rgba(10,24,60,.55)');
  // Name
  txShadow(pl[0].n,bx_+10,by_+20,14,ARK.textBright,'rgba(0,0,0,.5)');
  // HP hearts (player)
  {const php=bpHP[0],hx=bx_+90,hy=by_+9;
  const dmgFlash=bpHPDmgAnim[0]>0&&Math.floor(fr/3)%2===0;
  for(let h=0;h<BATTLE_HP_MAX;h++){
    const filled=h<php;
    const hc=filled?(dmgFlash?'#ff8888':'#e84040'):'#401818';
    const hhi=hx+h*18,hhj=hy;
    bx(hhi+2,hhj,4,1,hc);bx(hhi,hhj+1,8,1,hc);
    bx(hhi,hhj+2,8,3,hc);bx(hhi+1,hhj+5,6,1,hc);
    bx(hhi+2,hhj+6,4,1,hc);bx(hhi+3,hhj+7,2,1,hc);
    bx(hhi+4,hhj+8,1,1,hc);
    if(filled){bx(hhi+1,hhj+2,2,1,'rgba(255,255,255,.35)');}
  }}
  // Card bar
  txShadow('CARDS',bx_+10,by_+36,8,ARK.textDim,'rgba(0,0,0,.3)');
  drawCardBar(bx_+60,by_+28,148,pl[0].cd,Math.min(HAND_SIZE,10));
  const _vSz=hasUniqueCards(0).size; // v311: cache to avoid double-call + use pre-baked _UNIQ60
  txShadow(_UNIQ60[_vSz]||(_vSz+'/60'),bx_+214,by_+36,9,ARK.gold,'rgba(0,0,0,.3)');
  // Win indicator (60/60)
  if(_vSz>=60){
    const flash_=Math.sin(fr*0.15)*0.3+0.7;
    g.globalAlpha=flash_;
    txShadow('60/60\u2192WIN!',bx_+160,by_+52,10,ARK.goldBright,'rgba(0,0,0,.4)');
    g.globalAlpha=1;
  }
  // v277: Spell charge orb pips — si-indexed direct access, zero arrays
  {const oW=6,oH=6,oG=2,blink=Math.floor(fr/12)%2===0;
  for(let si=0;si<3;si++){
    const ox=bx_+10+si*97,oy=by_+44,val=si===0?sp.s:si===1?sp.b:sp.c;
    const spWarn=(si===0&&sp.s===0)||(si===2&&sp.c===0);
    const lc=spWarn&&blink?ARK.dangerBright:_BORB_LCOL[si];
    txShadow(_BORB_LBL[si],ox,oy+10,6,lc,'rgba(0,0,0,.3)');
    for(let o=0;o<3;o++){
      const filled=o<val;
      bx(ox+26+o*(oW+oG),oy+2,oW,oH,filled?_BORB_FILL[si]:_BORB_EMPTY[si]);
      if(filled)bx(ox+26+o*(oW+oG)+1,oy+3,2,1,'rgba(255,255,255,.3)');
    }
    if(val>3)txShadow(_EXCESS_CHG[val-4]||('+'+( val-3)),ox+26+3*(oW+oG)+2,oy+9,5,ARK.goldBright,'rgba(0,0,0,.3)'); // v318
  }}
  // Area label
  txShadow(mapNames[currentMap],bx_+10,by_+64,8,ARK.textDim,'rgba(0,0,0,.3)');
  // v330: most critical card decay countdown (shown when < 60s remaining during dungeon battle)
  if(inDungeon){
    let _minRem=Infinity;
    for(let _di=0;_di<HAND_SIZE;_di++){if(pl[0].cd[_di]>0&&cardTimers[_di]>0){const _r=Math.max(0,CARD_DECAY_MS-(Date.now()-cardTimers[_di]));if(_r<_minRem)_minRem=_r;}}
    if(_minRem<60000){
      const _dsec=Math.ceil(_minRem/1000);
      const _dcol=_minRem<15000?'#ff4040':_minRem<30000?'#ff9020':'#ffe040';
      txShadow(_SECS_STR[_dsec]||(_dsec+'s'),bx_+bw-38,by_+64,8,_dcol,'rgba(0,0,0,.3)');
    }
  }
  // Hand type composition strip (v250: reused Int32Array, no new arrays)
  {
    _btCounts[0]=_btCounts[1]=_btCounts[2]=_btCounts[3]=_btCounts[4]=0;
    for(let _ci=0,_cl=pl[0].cd.length;_ci<_cl;_ci++){const id=pl[0].cd[_ci];if(id>0&&CD[id-1]){const ti=_BTYPE_MAP[CD[id-1].t];if(ti!==undefined)_btCounts[ti]++;}} // v277: _typeMap hoisted
    bx(bx_+4,by_+68,bw-8,1,ARK.border);
    let dotX=bx_+8;
    for(let ti=0;ti<5;ti++){
      const cnt=_btCounts[ti];
      if(cnt===0)continue;
      const col=_BTYPE_COL[ti];
      for(let d=0;d<cnt;d++){bx(dotX+d*6,by_+74,5,5,col);}
      dotX+=cnt*6+3;
    }
    let labelX=bx_+bw-8;
    for(let ti=4;ti>=0;ti--){
      const cnt=_btCounts[ti];
      if(cnt===0)continue;
      const lbl=_BTYPE_CNT_LBL[ti][cnt]||(_BTYPE_ABB[ti]+':'+cnt); // v318
      labelX-=lbl.length*5+4;
      g.globalAlpha=0.75;
      txShadow(lbl,labelX,by_+80,5,_BTYPE_COL[ti],'rgba(0,0,0,.3)');
      g.globalAlpha=1;
    }
  }
}

// Draw battle sprite (front-facing for opponent, back-facing for player)
function drawBattleSprite(p,cx,cy,scale,facingAway){
  const s=scale;
  // Idle breathing bob — each character breathes out of phase
  const breathPhase=p===pl[0]?0:p===pl[1]?1.1:2.3;
  const breathAmp=scale*0.5;
  cy=cy+Math.round(Math.sin(fr*0.055+breathPhase)*breathAmp);
  const w=14*s,h=20*s;
  const ox=cx-w/2,oy=cy-h/2;
  // Shadow (pre-baked canvas — no path/rasterize overhead)
  const _shC=s>=2.5?_btlShadow3:_btlShadow22,_shHW=s>=2.5?24:18,_shHH=s>=2.5?10:8;
  g.drawImage(_shC,(cx-_shHW)|0,(oy+h+2*s-_shHH)|0);

  // === KENNEY BATTLE SPRITE ===
  if(pirateSheetLoaded){
    const kChar=p===pl[0]?K.captain:(p===pl[1]?K.pirate2:K.pirate3);
    // Glow aura
    const gc=p===pl[0]?_btlGlowPlayer:p===pl[1]?_btlGlowVega:_btlGlowMira;
    g.drawImage(gc.canvas,(cx-gc.hw)|0,(cy-gc.hh)|0);
    // Scale the 16px sprite to battle size (scale*2 for tile size = 32px baseline)
    const tileScale=s/1.0; // s=3 → 48px sprite
    const sprW=16*tileScale*2, sprH=16*tileScale*2;
    const sx=cx-sprW/2, sy=cy-sprH/2;
    if(facingAway){
      // Player faces away: flip vertically (mirror top-to-bottom look, not perfect but readable)
      g.save();g.translate(sx+sprW,sy);g.scale(-1,1);
      drawKenneyTile(kChar[0],kChar[1],0,0,tileScale*2);
      // Back overlay to distinguish from front
      g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,0,sprW,sprH*0.4);
      g.restore();
    }else{
      drawKenneyTile(kChar[0],kChar[1],sx,sy,tileScale*2);
    }
    return;
  }

  // === FALLBACK FILLRECT BATTLE SPRITE ===
  let shirtC,shirtH,hairC,hairH;
  if(p===pl[0]){shirtC='#4080d0';shirtH='#5090e0';hairC='#282830';hairH='#383840';}
  else if(p===pl[1]){shirtC='#d060a0';shirtH='#e070b0';hairC='#804020';hairH='#905030';}
  else{shirtC='#d0a030';shirtH='#e0b040';hairC='#585040';hairH='#686058';}
  bx(ox+2*s,oy+17*s,4*s,3*s,'#383030');bx(ox+8*s,oy+17*s,4*s,3*s,'#383030');
  bx(ox+3*s,oy+14*s,8*s,4*s,'#4050a0');
  bx(ox+2*s,oy+8*s,10*s,7*s,shirtC);bx(ox+3*s,oy+9*s,8*s,5*s,shirtH);
  bx(ox-1*s,oy+9*s,4*s,6*s,shirtC);bx(ox+11*s,oy+9*s,4*s,6*s,shirtC);
  bx(ox-1*s,oy+14*s,3*s,2*s,'#e8d0b0');bx(ox+12*s,oy+14*s,3*s,2*s,'#e8d0b0');
  bx(ox+3*s,oy+1*s,8*s,8*s,'#f0dcc0');bx(ox+4*s,oy+2*s,6*s,6*s,'#e8d0b0');
  if(facingAway){
    bx(ox+3*s,oy,8*s,6*s,hairC);bx(ox+4*s,oy+s,6*s,5*s,hairH);
    bx(ox+2*s,oy+s,2*s,3*s,hairC);bx(ox+10*s,oy+s,2*s,3*s,hairC);
    bx(ox+4*s,oy+10*s,6*s,3*s,'#305080');bx(ox+5*s,oy+11*s,4*s,1*s,'#4070a0');
  }else{
    bx(ox+4*s,oy+4*s,2*s,2*s,'#181820');bx(ox+8*s,oy+4*s,2*s,2*s,'#181820');
    bx(ox+4*s,oy+4*s,s,s,'#fff');bx(ox+8*s,oy+4*s,s,s,'#fff');
    bx(ox+6*s,oy+7*s,2*s,s,'#c0a090');
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
  // v284: hoist vsRivalIdx + pre-compute power sums once per call (avoids 4× reduce per frame)
  const vsRivalIdx=(encounterExclTarget>=1&&encounterExclTarget<=2)?encounterExclTarget:1;
  const vsSplashRival=pl[vsRivalIdx];
  let _ypwr=0,_rpwr=0;
  for(let _i=0;_i<HAND_SIZE;_i++){const _id=pl[0].cd[_i];if(_id>0)_ypwr+=(CD[_id-1]?.r||0);}
  for(let _i=0;_i<HAND_SIZE;_i++){const _id=vsSplashRival.cd[_i];if(_id>0)_rpwr+=(CD[_id-1]?.r||0);}
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
  // Show the rival that triggered this encounter (v284: vsRivalIdx/vsSplashRival hoisted to top)
  drawBattleSprite(vsSplashRival,rX,H/2-10,3,false);

  // Player name (left side, slides in)
  if(t>10){
    const nameAlpha=Math.min(1,(t-10)/10);
    g.globalAlpha=nameAlpha;
    txShadow('YOU',60,H/2-60,14,'#78c0f0','rgba(0,0,0,.6)');
    const yourCards=cardCount(pl[0]);
    txShadow(_SPLASH_CARD_LBL[yourCards]||(yourCards+' cards'),60,H/2-42,8,'rgba(255,255,255,.6)','rgba(0,0,0,.4)'); // v316
    // v106: hand power score = sum of card rarities (v284: pre-computed above)
    txShadow(_PWR_LBL[_ypwr]||('PWR:'+_ypwr),60,H/2-26,7,'#78c0f0','rgba(0,0,0,.35)'); // v316
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
    const rivalCards=cardCount(vsSplashRival);
    txShadow(_SPLASH_CARD_LBL[rivalCards]||(rivalCards+' cards'),rivalNameX,H/2-28,7,'rgba(255,255,255,.5)','rgba(0,0,0,.35)'); // v316
    // v106: rival power + advantage label (v284: pre-computed above)
    txShadow(_PWR_LBL[_rpwr]||('PWR:'+_rpwr),rivalNameX,H/2-12,7,rivalNameCol,'rgba(0,0,0,.35)'); // v316
    g.globalAlpha=1;
  }

  // v106: power assessment label — appears between power scores
  if(t>20){
    const assAlpha=Math.min(1,(t-20)/10);
    g.globalAlpha=assAlpha;
    const diff=_ypwr-_rpwr; // v284: use pre-computed values
    let assLabel,assCol;
    if(diff>=4){assLabel='ADVANTAGE';assCol='#40d080';}
    else if(diff<=-4){assLabel='OUTMATCHED';assCol='#d04040';}
    else{assLabel='BALANCED';assCol='#d0c040';}
    const assW=assLabel.length*9+16;
    bx(W/2-assW/2,H/2-80,assW,20,'rgba(0,0,0,.5)');
    txShadow(assLabel,W/2-assW/2+8,H/2-64,10,assCol,'rgba(0,0,0,.5)');
    g.globalAlpha=1;
  }

  // VS text with pop-in scale + glow pulse
  if(t===16){hitPause(3);}
  if(t>15){
    const vsA=Math.min(1,(t-15)/8);
    const vsScale=t<20?1+(20-t)*0.08:1;   // slight overshoot pop-in
    const glowA=vsA*0.5*(0.7+Math.sin(t*0.3)*0.3);
    g.globalAlpha=glowA;
    // v245: pre-baked drawImage replaces arc per frame
    {const r_=28*vsScale;g.globalAlpha=glowA*0.35;g.drawImage(_vsGoldCircle,(W/2-8-r_+.5)|0,(H/2+30-r_+.5)|0,(r_*2)|0,(r_*2)|0);g.globalAlpha=glowA;}
    g.globalAlpha=vsA;
    g.save();g.translate(W/2-8,H/2+30);g.scale(vsScale,vsScale);g.translate(-(W/2-8),-(H/2+30));
    txShadow('VS',W/2-28,H/2+14,36,'#f0c830','#000');
    g.restore();
    g.globalAlpha=1;
  }
  // Flash
  if(t>=28&&t<=35){g.globalAlpha=(35-t)/7*.9;g.fillStyle='#ffffff';g.fillRect(0,0,W,H);g.globalAlpha=1;}

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
  if(i===4&&cardCount(pl[0])<=0)return false;
  return true;
}
function bothRivalsEliminated(){return cardCount(pl[1])===0&&cardCount(pl[2])===0;}

// Phase banner colors and text
const PHASE_COLORS={select:'#3060b0',confirming:'#d8b028',resolving:'#c04040',result:'#308030'};
const PHASE_LABELS={select:'COMMIT PHASE',confirming:'REVEALING...',resolving:'RESOLVING!',result:'COMPLETE'};

function drawPhaseBanner(phase){
  const col=PHASE_COLORS[phase]||'#383830';
  const label=PHASE_LABELS[phase]||'';
  bx(0,0,W,28,col);
  bx(0,0,W,1,'rgba(255,255,255,.2)');
  // Round info on left
  txShadow(_BATTLE_HDR[rd]||'BATTLE '+rd,6,20,10,'#fff','rgba(0,0,0,.5)'); // v305
  // Phase label centered (bigger, bold-like with shadow)
  const labelW=label.length*10;
  txShadow(label,W/2-labelW/2,20,16,'#fff','rgba(0,0,0,.5)');
  // Area on right
  txShadow(mapNames[currentMap],W-160,20,8,'rgba(255,255,255,.8)','rgba(0,0,0,.4)');
  // TX indicator when on-chain mode active
  if(walletConnected){
    // v305: cache TX label — only rebuild when sig changes, not every frame
    const _curSig=onchainLastTxSig||'';
    if(_txLblSig!==_curSig){_txLblSig=_curSig;_txLblCache=_curSig?'TX:'+_curSig.slice(0,8)+'..':'TX:--';}
    txShadow(_txLblCache,W-160,38,5,'#40d080','rgba(0,0,0,.5)');
  }
  // Commit hash display during commit phase (wallet integration)
  if(walletConnected&&walletLastCommitHash&&(phase==='confirming'||phase==='resolving')){
    if(_hashLblRef!==walletLastCommitHash){_hashLblRef=walletLastCommitHash;_hashLblCache='Hash: '+walletLastCommitHash;} // v324: lazy
    txShadow(_hashLblCache,W/2-100,38,5,'#80c0ff','rgba(0,0,0,.5)');
  }
  // v101: Battle momentum strip — card gain/loss net balance shown as a tug-of-war bar
  bx(0,26,W,3,'rgba(0,0,0,.55)');
  if(battleRoundHistory.length>0){
    const norm=Math.max(-1,Math.min(1,_battleRoundNet/Math.max(1,battleRoundHistory.length))); // v284: cached net
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
  const r2alive=cardCount(pl[2])>0;
  g.globalAlpha=r2alive?0.85:0.3;
  drawBattleSprite(pl[2],W-310+o2sx,140+o2sy,2.2,false);
  g.globalAlpha=1;
  // Rival 2 name tag
  if(!r2alive){
    txShadow('FLED',W-310,175,7,'#c04040','rgba(0,0,0,.4)');
  }else{
    txShadow(pl[2].n,W-330,175,6,'#986840','rgba(0,0,0,.3)');
  }
  // v217: Tell speech bubbles — "!" floats above rival when their intent is known
  if(battlePhase==='select'&&bpRivalTells[0]){
    const tellPulse=0.7+0.3*Math.sin(fr*0.25);
    // VEGA tell bubble (rival 1)
    const vbX=W-168,vbY=60;
    const vbW=18,vbH=18;
    g.globalAlpha=tellPulse*0.92;
    bx(vbX,vbY,vbW,vbH,'rgba(60,0,80,.8)');
    bx(vbX,vbY,vbW,1,'#c040d0');bx(vbX,vbY,1,vbH,'#c040d0');
    bx(vbX+vbW-1,vbY,1,vbH,'#802090');bx(vbX,vbY+vbH-1,vbW,1,'#802090');
    // Bubble tail pointing down-left toward VEGA sprite
    bx(vbX+2,vbY+vbH,4,3,'rgba(60,0,80,.8)');bx(vbX+3,vbY+vbH+3,2,2,'rgba(60,0,80,.6)');
    txShadow('!',vbX+6,vbY+13,12,'#e060f0','rgba(0,0,0,.5)');
    g.globalAlpha=1;
  }
  if(battlePhase==='select'&&bpRivalTells[1]&&r2alive){
    const tellPulse2=0.7+0.3*Math.sin(fr*0.25+1.4);
    // MIRA tell bubble (rival 2)
    const mbX=W-318,mbY=88;
    const mbW=18,mbH=18;
    g.globalAlpha=tellPulse2*0.85;
    bx(mbX,mbY,mbW,mbH,'rgba(60,40,0,.8)');
    bx(mbX,mbY,mbW,1,'#d0a030');bx(mbX,mbY,1,mbH,'#d0a030');
    bx(mbX+mbW-1,mbY,1,mbH,'#906020');bx(mbX,mbY+mbH-1,mbW,1,'#906020');
    bx(mbX+12,mbY+mbH,4,3,'rgba(60,40,0,.8)');bx(mbX+13,mbY+mbH+3,2,2,'rgba(60,40,0,.6)');
    txShadow('!',mbX+6,mbY+13,12,'#f0c040','rgba(0,0,0,.5)');
    g.globalAlpha=1;
  }
}

// FRLG-style 2x2 action grid
let _drawPoolPreviewCache=null,_drawPoolPreviewMap=-1; // v275: cache pool preview slice
let _agSpS=-1,_agSpB=-1,_agSpC=-1; // v306: cache spell counts for action grid desc rebuild
let _scoutedSlice=null,_scoutedSliceRef=null; // v306: cache sd.cards.slice result
const _AG_ACTIONS=[ // v274: hoisted action grid objects — only desc is rebuilt per frame
  {name:'DRAW',   desc:'floor card pool',  col:'#303028',icon:'#48b8e8'},
  {name:'STEAL',  desc:'',                  col:'#b04040',icon:'#b04040'},
  {name:'BARRIER',desc:'',                  col:'#3060b0',icon:'#3060b0'},
  {name:'SCOUT',  desc:'',                  col:'#308030',icon:'#308030'}
];
function drawActionGrid(){
  const gridX=8,gridY=H-164,cellW=160,cellH=42,gap=4;
  // v306: rebuild action descs only when spell counts change
  if(_agSpS!==sp.s){_agSpS=sp.s;_AG_ACTIONS[1].desc=sp.s+'\u00D7 takes rival card';}
  if(_agSpB!==sp.b){_agSpB=sp.b;_AG_ACTIONS[2].desc=sp.b+'\u00D7 blocks steal';}
  if(_agSpC!==sp.c){_agSpC=sp.c;_AG_ACTIONS[3].desc=sp.c+'\u00D7 view rival hand';}
  const actions=_AG_ACTIONS;
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
        bx(cx_,cy_,cellW,cellH,'#1c2c50');bx(cx_,cy_,cellW,1,ARK.gold);
        bx(cx_,cy_+cellH-1,cellW,1,ARK.goldDim);
        bx(cx_,cy_,1,cellH,ARK.gold);bx(cx_+cellW-1,cy_,1,cellH,ARK.goldDim);
      }else{
        bx(cx_,cy_,cellW,cellH,avail?'#0e1828':'#0a1018');
        bx(cx_,cy_,cellW,1,avail?ARK.border:'#111820');
      }
      // v129: Themed pixel-art icons
      const iconCol=avail?actions[idx].icon:'#989088';
      const ic=iconCol,ix=cx_+4,iy=cy_+6;
      if(!avail){
        bx(ix,iy,18,18,'#989088');bx(ix+1,iy+1,16,16,'rgba(0,0,0,.1)');
      }else if(idx===0){ // DRAW: card outline + down-arrow
        bx(ix+3,iy+1,12,15,'rgba(0,0,0,.28)');    // drop shadow
        bx(ix+2,iy,12,15,'#1c3846');               // card body
        bx(ix+2,iy,12,1,ic);bx(ix+2,iy+14,12,1,ic); // top/bottom borders
        bx(ix+2,iy,1,15,ic);bx(ix+13,iy,1,15,ic);   // side borders
        bx(ix+7,iy+3,2,5,ic);                        // arrow shaft
        bx(ix+5,iy+7,6,2,ic);                        // arrowhead wide
        bx(ix+6,iy+9,4,1,ic);                        // arrowhead mid
        bx(ix+7,iy+10,2,1,ic);                       // arrowhead tip
      }else if(idx===1){ // STEAL: claw/hand
        bx(ix+1,iy+10,12,6,ic);                      // palm
        for(let fi=0;fi<4;fi++){                      // four fingers
          const fx=ix+1+fi*3;
          const fh=4+(fi===1||fi===2?2:0);            // middle fingers taller
          bx(fx,iy+10-fh,2,fh,ic);
        }
        bx(ix+14,iy+5,3,1,'rgba(255,255,255,.5)');   // motion lines
        bx(ix+14,iy+8,3,1,'rgba(255,255,255,.38)');
        bx(ix+14,iy+11,3,1,'rgba(255,255,255,.25)');
      }else if(idx===2){ // BARRIER: pentagon shield
        bx(ix+4,iy,10,1,ic);                         // top arc
        bx(ix+2,iy+1,14,6,ic);                       // upper body
        bx(ix+2,iy+7,14,2,ic);
        bx(ix+3,iy+9,12,2,ic);                       // taper
        bx(ix+5,iy+11,8,2,ic);
        bx(ix+7,iy+13,4,2,ic);                       // point
        bx(ix+8,iy+15,2,1,ic);
        bx(ix+4,iy+1,10,6,'rgba(0,0,100,.45)');      // inner fill
        bx(ix+8,iy+2,2,8,'rgba(255,255,255,.5)');    // emblem cross
        bx(ix+5,iy+5,8,2,'rgba(255,255,255,.5)');
      }else if(idx===3){ // SCOUT: magnifying glass
        bx(ix+2,iy+3,2,5,ic);bx(ix+12,iy+3,2,5,ic);  // lens sides
        bx(ix+4,iy+1,6,2,ic);bx(ix+4,iy+10,6,2,ic);  // lens top/bottom
        bx(ix+3,iy+2,2,1,ic);bx(ix+11,iy+2,2,1,ic);  // corners
        bx(ix+3,iy+11,2,1,ic);bx(ix+11,iy+11,2,1,ic);
        bx(ix+6,iy+4,4,5,ic);                         // pupil fill
        bx(ix+7,iy+5,2,2,'rgba(255,255,255,.55)');    // pupil glint
        bx(ix+12,iy+10,2,2,ic);bx(ix+13,iy+12,2,2,ic); // handle
        bx(ix+14,iy+14,2,2,ic);bx(ix+15,iy+16,2,1,ic);
      }
      // v212: Selected cell — inner shimmer band + larger action name
      const textCol=avail?(sel?ARK.goldBright:actions[idx].col):ARK.textDim;
      if(sel&&avail){
        // Horizontal shimmer scan line inside selected cell
        const shimY=cy_+Math.floor(((fr*0.7)%(cellH-4)))+2;
        g.globalAlpha=0.12;bx(cx_+1,shimY,cellW-2,2,'#f0e080');g.globalAlpha=1;
        // Brighter inner glow behind action name area
        const glowA=0.08+0.05*Math.sin(fr*0.18);
        g.globalAlpha=glowA;bx(cx_+24,cy_+6,cellW-28,cellH-10,'#f0c830');g.globalAlpha=1;
        txShadow(actions[idx].name,cx_+26,cy_+20,16,textCol,'rgba(0,0,0,.5)');
      }else{
        txShadow(actions[idx].name,cx_+26,cy_+18,14,textCol,'rgba(0,0,0,.4)');
      }
      txShadow(actions[idx].desc,cx_+26,cy_+32,10,avail?ARK.textDim:'#404858','rgba(0,0,0,.3)');
      // Cursor arrow
      if(sel&&avail){
        const bob_=Math.sin(fr*0.15)*2;
        txShadow('\u25B6',cx_-12+bob_,cy_+22,10,ARK.gold,'rgba(0,0,0,.4)');
      }
      // v92: Smart context badges (top-right corner of each cell)
      if(avail&&battlePhase==='select'){
        let badge='',badgeCol='#606060',badgeBg='rgba(0,0,0,.35)';
        const vsRivalIdx=(encounterExclTarget>=1&&encounterExclTarget<=2)?encounterExclTarget:1;
        if(idx===0){// DRAW — lazy cache pool scan (v332: was O(pool) per frame → O(1) until vault changes)
          const _dbKey=currentMap*10000+(pl[0].vault?pl[0].vault.size:0);
          if(_drawBadgeKey!==_dbKey){
            _drawBadgeKey=_dbKey;
            const pool_=DUNGEON_FLOOR_CARDS[currentMap]||[];
            const vault_=pl[0].vault||new Set();
            let newInPool=0,maxNewRar=0;
            for(let _pi=0;_pi<pool_.length;_pi++){const _cid=pool_[_pi];if(!vault_.has(_cid)){newInPool++;const _cr=CD[_cid-1];if(_cr&&_cr.r>maxNewRar)maxNewRar=_cr.r;}}
            if(newInPool>0){
              if(maxNewRar>=5){_drawBadge='\u2605 LEGEND';_drawBadgeCol='#ffe080';_drawBadgeBg='rgba(40,30,0,.7)';}
              else if(maxNewRar>=4){_drawBadge='\u2605 EPIC';_drawBadgeCol='#f0c030';_drawBadgeBg='rgba(30,20,0,.7)';}
              else if(maxNewRar>=3){_drawBadge='\u2605 RARE';_drawBadgeCol='#b060e0';_drawBadgeBg='rgba(20,5,30,.7)';}
              else{_drawBadge=_NEW_IN_POOL[newInPool]||'+'+newInPool+' NEW';_drawBadgeCol='#50e090';_drawBadgeBg='rgba(0,40,20,.6)';}
            }else if(pool_.length>0){_drawBadge='ALL OWNED';_drawBadgeCol='#888870';_drawBadgeBg='rgba(0,0,0,.3)';}
            else{_drawBadge='';_drawBadgeCol='#606060';_drawBadgeBg='rgba(0,0,0,.35)';}
          }
          badge=_drawBadge;badgeCol=_drawBadgeCol;badgeBg=_drawBadgeBg;
        }else if(idx===1){// STEAL — show barrier state + scouted rarity when known (v322)
          const tgtBarrier=bpRivalActions[vsRivalIdx-1]===2;
          if(tgtBarrier){badge='BLOCKED';badgeCol='#6080d0';badgeBg='rgba(10,20,60,.6)';}
          else if(pl[vsRivalIdx].cc===0){badge='NO CARDS';badgeCol='#808880';badgeBg='rgba(0,0,0,.35)';}
          else{
            // Check if we have fresh scout data to show target rarity
            const _stSd=bpScoutedCards[vsRivalIdx-1];
            if(_stSd&&rd-_stSd.round<=1&&_stSd.cards.length>0){
              let _maxR=0;for(let _si=0;_si<_stSd.cards.length;_si++){if(_stSd.cards[_si].r>_maxR)_maxR=_stSd.cards[_si].r;}
              badge=_STL_RAR_LBL[_maxR]||'\u26A1? TARGET'; // v332: pre-baked, _rNames local removed
              badgeCol=_maxR>=5?'#ffe080':_maxR>=4?'#f0c030':_maxR>=3?'#b060e0':'#e08030';
              badgeBg=_maxR>=4?'rgba(40,30,0,.6)':'rgba(40,20,0,.6)';
            }else{badge='\u2714 OPEN';badgeCol='#e08030';badgeBg='rgba(40,20,0,.6)';}
          }
        }else if(idx===2){// BARRIER — use this round's rival action prediction (v326)
          const rivalPlanSteal=bpRivalActions[vsRivalIdx-1]===1;
          if(rivalPlanSteal&&!bpPlayerBarrier){badge='DEFEND!';badgeCol='#e05040';badgeBg='rgba(40,0,0,.6)';}
          else if(bpPlayerBarrier){badge='ACTIVE';badgeCol='#4080d0';badgeBg='rgba(0,20,50,.6)';}
          else{badge='OPTIONAL';badgeCol='#608880';badgeBg='rgba(0,0,0,.35)';}
        }else if(idx===3){// SCOUT — show staleness
          const sc0=bpScoutedCards[vsRivalIdx-1];
          if(sc0&&sc0.round===rd){badge='FRESH';badgeCol='#50e090';badgeBg='rgba(0,30,10,.6)';}
          else if(sc0&&rd-sc0.round<=1){badge=_SCOUT_DATA_LBL[sc0.round]||'R'+sc0.round+' DATA';badgeCol='#c0b030';badgeBg='rgba(30,20,0,.6)';} // v320
          else if(sc0){badge='STALE';badgeCol='#888870';badgeBg='rgba(0,0,0,.35)';}
          else{badge='UNSCOUTED';badgeCol='#b0b0a0';badgeBg='rgba(0,0,0,.3)';}
        }
        if(badge){
          const bW=badge.length*5+8,bH=11;
          const bx_=cx_+cellW-bW-4,by_=cy_+4;
          g.globalAlpha=sel?0.95:0.7;
          bx(bx_,by_,bW,bH,badgeBg);
          bx(bx_,by_,bW,1,badgeCol);
          txShadow(badge,bx_+3,by_+9,5,badgeCol,'rgba(0,0,0,.3)');
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
    bx(ucX,ucY,ucW,ucH,'#1c2c50');bx(ucX,ucY,ucW,1,ARK.gold);
    bx(ucX,ucY+ucH-1,ucW,1,ARK.goldDim);
    bx(ucX,ucY,1,ucH,ARK.gold);bx(ucX+ucW-1,ucY,1,ucH,ARK.goldDim);
  }else{
    bx(ucX,ucY,ucW,ucH,ucAvail?'#0e1828':'#0a1018');
    bx(ucX,ucY,ucW,1,ucAvail?ARK.border:'#111820');
  }
  // USE CARD icon — card with lightning bolt
  {const uix=ucX+4,uiy=ucY+4;
  bx(uix+3,uiy+1,12,15,'rgba(0,0,0,.25)');
  bx(uix+2,uiy,12,15,'#1c2c40');
  bx(uix+2,uiy,12,1,ARK.goldDim);bx(uix+2,uiy+14,12,1,ARK.goldDim);
  bx(uix+2,uiy,1,15,ARK.goldDim);bx(uix+13,uiy,1,15,ARK.goldDim);
  bx(uix+8,uiy+2,3,4,ARK.gold);
  bx(uix+6,uiy+6,5,2,ARK.gold);
  bx(uix+7,uiy+8,3,4,ARK.gold);
  bx(uix+9,uiy+3,1,2,'rgba(255,255,255,.5)');
  }
  txShadow('USE CARD',ucX+26,ucY+18,14,ucAvail?(ucSel?ARK.goldBright:ARK.gold):ARK.textDim,'rgba(0,0,0,.4)');
  const _handCount=cardCount(pl[0]);
  txShadow(_handCount>0?(_HAND_READY_LBL[_handCount]||_handCount+' cards ready'):'hand empty',ucX+140,ucY+18,10,ucAvail?ARK.textDim:'#404858','rgba(0,0,0,.3)'); // v320
  if(ucSel&&ucAvail){
    const bob_=Math.sin(fr*0.15)*2;
    txShadow('\u25B6',ucX-12+bob_,ucY+20,10,ARK.gold,'rgba(0,0,0,.4)');
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
      // v315: composite cache key — refresh when map changes OR vault grows (new card acquired)
      const _pKey=currentMap*100+Math.min(99,(pl[0].vault?pl[0].vault.size:0));
      if(_drawPoolPreviewMap!==_pKey){
        _drawPoolPreviewMap=_pKey;
        const _sub=pool.slice(0,Math.min(8,pool.length));
        // Sort: unowned (NEW) cards first so player sees their best draws immediately
        _sub.sort((a,b)=>(vault_.has(a)?1:0)-(vault_.has(b)?1:0));
        _drawPoolPreviewCache=_sub.slice(0,Math.min(4,_sub.length));
      }
      const previewCards=_drawPoolPreviewCache; // v275: cached
      const ppW=220,ppH=60+previewCards.length*26;
      const ppX=328,ppY=H-164;
      const slideA=Math.min(1,(fr-bpFrame)/10);
      g.globalAlpha=slideA*0.95;
      win(ppX,ppY,ppW,ppH);
      bx(ppX,ppY,ppW,3,'#48b8e8');
      txShadow('FLOOR POOL',ppX+8,ppY+20,9,'#48b8e8','rgba(0,0,0,.3)');
      txShadow(mapNames[currentMap],ppX+ppW-8-mapNames[currentMap].length*5,ppY+20,6,'#686878','rgba(0,0,0,.2)');
      bx(ppX+6,ppY+26,ppW-12,1,'rgba(200,180,100,.2)');
      for(let pi=0;pi<previewCards.length;pi++){
        const cid=previewCards[pi];const cr=CD[cid-1];const rar=cr.r||1;
        const rarCol=RARITY_COLOR[rar]||'#888888';
        const owned=vault_.has(cid);
        const py2=ppY+32+pi*26;
        bx(ppX+10,py2-8,12,16,cr.d);bx(ppX+11,py2-7,10,14,cr.c);
        drawCardCharacter(ppX+11,py2-7,cid,0.45,fr);
        const nCol=owned?'#888878':'#e8e0c8';
        txShadow(cr.n,ppX+28,py2+2,7,nCol,'rgba(0,0,0,.3)');
        for(let s=0;s<rar;s++)txShadow('\u2605',ppX+ppW-8-(rar-s)*9,py2+2,5,rarCol,'rgba(0,0,0,.3)');
        if(!owned){txShadow('NEW',ppX+ppW-8-rar*9-26,py2+2,5,'#50e090','rgba(0,0,0,.3)');}
      }
      if(pool.length>4){
        txShadow(_MORE_LBL[pool.length-4]||('+'+( pool.length-4)+' more...'),ppX+10,ppY+ppH-12,6,'#686878','rgba(0,0,0,.2)'); // v324
      }
      g.globalAlpha=1;
    }
  }
  // v124: STEAL target preview panel (shown when STEAL is highlighted, mirrors DRAW pool panel)
  if(ai===1&&!bpCardSelectActive&&!bpTargetSelectActive&&sp.s>0){
    const vsRival=(encounterExclTarget>=1&&encounterExclTarget<=2)?encounterExclTarget:1;
    const target=pl[vsRival];
    const tCC=cardCount(target);
    const sd=bpScoutedCards[vsRival-1];
    const tBarrier=bpRivalActions[vsRival-1]===2;
    const rCol=vsRival===1?'#d060a0':'#d0a030';
    // v274: typeC hoisted to _SCT_TYPE_COL (no per-frame object alloc)
    const scoutLines=sd&&sd.cards.length>0?sd.cards.length:tCC;
    const ppW=220,ppH=60+Math.min(5,Math.max(1,scoutLines))*26;
    const ppX=328,ppY=H-164;
    const slideA=Math.min(1,(fr-bpFrame)/10);
    g.globalAlpha=slideA*0.95;
    win(ppX,ppY,ppW,ppH);
    bx(ppX,ppY,ppW,3,rCol);
    txShadow('STEAL TARGET',ppX+8,ppY+20,9,'#d04040','rgba(0,0,0,.3)');
    txShadow(target.n,ppX+ppW-8-target.n.length*6,ppY+20,7,rCol,'rgba(0,0,0,.2)');
    bx(ppX+6,ppY+26,ppW-12,1,'rgba(200,180,100,.2)');
    if(tBarrier){
      bx(ppX+8,ppY+34,ppW-16,22,'rgba(40,60,140,.6)');
      bx(ppX+8,ppY+34,ppW-16,1,'#3060b0');
      txShadow('\u26CA BARRIER — steal blocked',ppX+12,ppY+50,7,'#6080d0','rgba(0,0,0,.3)');
    }else if(tCC===0){
      txShadow('No cards to steal',ppX+10,ppY+48,7,'#888898','rgba(0,0,0,.2)');
    }else if(sd&&sd.cards.length>0){
      // Scouted intel — show card details
      const staleRd=rd-sd.round;
      const stLabel=staleRd>0?(_SCOUTED_RD[sd.round]||'scouted R'+sd.round):'fresh intel'; // v316
      txShadow('\u{1F50D} '+stLabel,ppX+10,ppY+33,5,staleRd>0?'#888860':'#50e090','rgba(0,0,0,.2)');
      if(_scoutedSliceRef!==sd){_scoutedSliceRef=sd;_scoutedSlice=sd.cards.slice(0,Math.min(4,sd.cards.length));} // v306: cache slice
      const show_=_scoutedSlice;
      for(let ci=0;ci<show_.length;ci++){
        const c=show_[ci];const rar=c.r||1;const rarCol=RARITY_COLOR[rar]||'#888888';
        const tCol_=_SCT_TYPE_COL[c.t]||'#808898'; // v274: hoisted
        const py2=ppY+38+ci*26;
        const dimC=staleRd>1?0.45:0.85;
        g.globalAlpha=slideA*dimC;
        bx(ppX+10,py2-8,12,16,tCol_);bx(ppX+11,py2-7,10,14,'rgba(0,0,0,.4)');
        txShadow(c.t?c.t[0].toUpperCase():'?',ppX+13,py2+4,6,'#fff','rgba(0,0,0,.4)');
        txShadow(c.n,ppX+28,py2+2,7,staleRd>1?'#888870':'#e8e0c8','rgba(0,0,0,.3)');
        for(let s=0;s<rar;s++)txShadow('\u2605',ppX+ppW-8-(rar-s)*9,py2+2,5,rarCol,'rgba(0,0,0,.3)');
        g.globalAlpha=slideA*0.95;
      }
      if(sd.cards.length>4){txShadow(_MORE_LBL[sd.cards.length-4]||('+'+( sd.cards.length-4)+' more...'),ppX+10,ppY+ppH-12,6,'#686878','rgba(0,0,0,.2)');} // v324
    }else{
      // Unknown hand — show mystery card silhouettes
      for(let i=0;i<Math.min(tCC,4);i++){
        const py2=ppY+36+i*26;
        bx(ppX+10,py2-8,12,16,'#201828');bx(ppX+11,py2-7,10,14,'#1a1020');
        txShadow('?',ppX+14,py2+4,7,'#2030a0','rgba(0,0,0,.4)');
        txShadow('Unknown card',ppX+28,py2+2,7,'#3a3060','rgba(0,0,0,.3)');
      }
      if(tCC>4){txShadow(_MORE_HIDDEN_LBL[tCC-4]||('+'+( tCC-4)+' more hidden'),ppX+10,ppY+ppH-12,6,'#303050','rgba(0,0,0,.2)');} // v324
      txShadow('SCOUT to reveal',ppX+10,ppY+ppH-32,5,'#608060','rgba(0,0,0,.2)');
    }
    g.globalAlpha=1;
  }
  // v126: BARRIER prediction panel (shown when BARRIER is highlighted)
  if(ai===2&&!bpCardSelectActive&&!bpTargetSelectActive&&sp.b>0){
    const ppX=328,ppW=220;
    const slideA=Math.min(1,(fr-bpFrame)/10);
    // Analyze recent steal history — v264: no slice/filter alloc
    const _bhLen=Math.min(4,battleRoundHistory.length);
    let totalSteals=0;for(let _bhi=0;_bhi<_bhLen;_bhi++){const _bh=battleRoundHistory[_bhi];if(_bh.r1a===1||_bh.r2a===1)totalSteals++;}
    const lastRound=battleRoundHistory[0];
    const theyStoleLast=lastRound&&(lastRound.r1a===1||lastRound.r2a===1);
    const barrierActive=bpPlayerBarrier;
    // Threat level: 0-3
    const threatLvl=Math.min(3,totalSteals+(theyStoleLast?1:0));
    const threatCol=_BAR_THREAT_COLS[threatLvl]; // v264: hoisted
    // v329: current-round steal prediction from bpRivalActions
    const vsRiv_=(encounterExclTarget>=1&&encounterExclTarget<=2)?encounterExclTarget:1;
    const rivalPlanSteal_=bpRivalActions[vsRiv_-1]===1;
    const ppH=barrierActive?70:(70+(rivalPlanSteal_?18:0)+_bhLen*18);
    const panY=H-164-Math.max(0,ppH-80);
    g.globalAlpha=slideA*0.95;
    win(ppX,panY,ppW,ppH);
    bx(ppX,panY,ppW,3,'#3060b0');
    txShadow('BARRIER ANALYSIS',ppX+8,panY+18,8,'#3060b0','rgba(0,0,0,.3)');
    bx(ppX+6,panY+22,ppW-12,1,'rgba(200,180,100,.2)');
    if(barrierActive){
      bx(ppX+8,panY+30,ppW-16,28,'rgba(20,40,120,.5)');
      bx(ppX+8,panY+30,ppW-16,1,'#3060b0');
      txShadow('\u26CA BARRIER ALREADY ACTIVE',ppX+12,panY+44,7,'#4080d0','rgba(0,0,0,.3)');
      txShadow('Using again extends duration',ppX+12,panY+56,6,'#6090c0','rgba(0,0,0,.2)');
    }else{
      // Threat meter bar
      txShadow('STEAL THREAT:',ppX+8,panY+34,7,'#908878','rgba(0,0,0,.2)');
      const _tLbl=_BAR_THREAT_LBLS[threatLvl]; // v264: hoisted
      txShadow(_tLbl,ppX+ppW-8-_tLbl.length*8,panY+34,8,threatCol,'rgba(0,0,0,.3)');
      const tmX=ppX+8,tmY=panY+38,tmW=ppW-16,tmH=8;
      bx(tmX,tmY,tmW,tmH,'#181838');
      if(threatLvl>0)bx(tmX,tmY,Math.floor(tmW*(threatLvl/3)),tmH,threatCol);
      bx(tmX,tmY,tmW,1,'#282848');
      // v329: current-round steal prediction alert row
      const _histOff=rivalPlanSteal_?18:0;
      if(rivalPlanSteal_){
        bx(ppX+8,panY+52,ppW-16,16,'rgba(50,0,0,.75)');
        bx(ppX+8,panY+52,ppW-16,1,'#c04040');
        txShadow('\u26A1 PLANS TO STEAL THIS ROUND!',ppX+12,panY+62,6,'#e05040','rgba(0,0,0,.4)');
      }
      // Recent round action breakdown — use battleRoundHistory directly (no slice alloc)
      if(_bhLen>0){
        bx(ppX+6,panY+52+_histOff,ppW-12,1,'rgba(200,180,100,.15)');
        txShadow('RECENT ROUNDS:',ppX+8,panY+64+_histOff,6,'#888870','rgba(0,0,0,.2)');
        for(let ri=0;ri<_bhLen;ri++){
          const h=battleRoundHistory[ri];const hy=panY+68+_histOff+ri*18;
          txShadow(_ROUND_LBL[h.rd]||('R'+h.rd),ppX+8,hy+10,6,'#686860','rgba(0,0,0,.3)'); // v316
          // V action
          const vStole=h.r1a===1;
          bx(ppX+28,hy,24,14,'rgba(0,0,0,.4)');
          bx(ppX+28,hy,24,1,vStole?'#d04040':'#686060');
          txShadow(_V_ACT_LBL[h.r1a]||'V:???',ppX+30,hy+10,5,vStole?'#d04040':'#687070','rgba(0,0,0,.3)'); // v316
          // M action
          const mStole=h.r2a===1;
          bx(ppX+56,hy,24,14,'rgba(0,0,0,.4)');
          bx(ppX+56,hy,24,1,mStole?'#d04040':'#686060');
          txShadow(_M_ACT_LBL[h.r2a]||'M:???',ppX+58,hy+10,5,mStole?'#d04040':'#687070','rgba(0,0,0,.3)'); // v316
          // Outcome
          if(h.lost){bx(ppX+84,hy,30,14,'rgba(80,0,0,.4)');txShadow('STOLEN',ppX+86,hy+10,5,'#d04040','rgba(0,0,0,.3)');}
          else if(h.got){bx(ppX+84,hy,20,14,'rgba(0,40,0,.4)');txShadow('+CARD',ppX+86,hy+10,5,'#40a050','rgba(0,0,0,.3)');}
        }
      }else{
        txShadow('No history yet',ppX+8,panY+56+_histOff,6,'#686870','rgba(0,0,0,.2)');
      }
    }
    g.globalAlpha=1;
  }
  // v125: SCOUT intel preview panel (shown when SCOUT is highlighted)
  if(ai===3&&!bpCardSelectActive&&!bpTargetSelectActive&&sp.c>0){
    const vsRival=(encounterExclTarget>=1&&encounterExclTarget<=2)?encounterExclTarget:1;
    const target=pl[vsRival];
    const ppX=328,ppW=220;
    const slideA=Math.min(1,(fr-bpFrame)/10);
    // v264: typeC hoisted to _SCT_TYPE_COL; _sds=[sd0,sd1] removed — use bpScoutedCards[_rvi] directly
    let panY=H-164;
    for(let _rvi=0;_rvi<2;_rvi++){
      const _rv_p=pl[_rvi+1],_rv_sd=bpScoutedCards[_rvi]; // v264: direct access, no _sds array
      const ccnt=cardCount(_rv_p);
      if(ccnt===0&&!_rv_sd)continue;
      const panH=_rv_sd&&_rv_sd.cards.length>0?54+Math.min(4,_rv_sd.cards.length)*22:46;
      g.globalAlpha=slideA*0.95;
      win(ppX,panY,ppW,panH);
      bx(ppX,panY,ppW,3,_RIVAL_COL[_rvi]);
      txShadow(_SCOUT_HDR[_rvi]||('SCOUT: '+_RIVAL_LBL[_rvi]),ppX+8,panY+18,8,'#38a038','rgba(0,0,0,.3)'); // v329
      if(_rv_sd&&_rv_sd.cards.length>0){
        const staleRd=rd-_rv_sd.round;
        const stLabel=staleRd>0?(_RD_DATA_LBL[_rv_sd.round]||'R'+_rv_sd.round+' data'):'fresh'; // v329
        txShadow(stLabel,ppX+ppW-8-stLabel.length*5,panY+18,6,staleRd>0?'#888860':'#50e090','rgba(0,0,0,.2)');
        bx(ppX+6,panY+24,ppW-12,1,'rgba(200,180,100,.2)');
        const _scLen=Math.min(4,_rv_sd.cards.length);
        for(let ci=0;ci<_scLen;ci++){
          const c=_rv_sd.cards[ci];
          const tCol_=_SCT_TYPE_COL[c.t]||'#808898'; // v264: hoisted
          const rar=c.r||1;const rarCol=RARITY_COLOR[rar]||'#888898';
          const py2=panY+28+ci*22;
          const dimA=staleRd>1?0.5:0.9;
          g.globalAlpha=slideA*dimA;
          bx(ppX+8,py2-6,10,14,tCol_);bx(ppX+9,py2-5,8,12,'rgba(0,0,0,.4)');
          txShadow(c.t?(_BTYPE_UC[c.t]||c.t[0].toUpperCase()):'?',ppX+11,py2+5,5,'#fff','rgba(0,0,0,.4)'); // v329
          txShadow(c.n,ppX+22,py2+2,6,staleRd>1?'#888870':'#e0d8c0','rgba(0,0,0,.3)');
          for(let s=0;s<rar;s++)txShadow('\u2605',ppX+ppW-8-(rar-s)*8,py2+2,5,rarCol,'rgba(0,0,0,.3)');
          g.globalAlpha=slideA*0.95;
        }
      }else{
        txShadow(_UNK_CARD_LBL[ccnt]||('\u2753 '+ccnt+' card'+(ccnt!==1?'s':'')),ppX+8,panY+36,8,'#506840','rgba(0,0,0,.2)'); // v329
        bx(ppX+8,panY+40,ppW-16,1,'rgba(200,180,100,.1)');
      }
      g.globalAlpha=1;
      panY-=panH+6;
    }
  }
  // v90: Battle round history panel (right side, shown from round 2 onward)
  if(battleRoundHistory.length>0&&!bpCardSelectActive&&!bpTargetSelectActive){
    // v262: _ACT_ABBR, _ACT_COL hoisted to __ACT_ABBR, __ACT_COL
    const histCount=Math.min(3,battleRoundHistory.length);
    const hpW=178,hpH=28+histCount*22;
    const hpX=W-hpW-8,hpY=130;
    const histAlpha=Math.min(1,(fr-bpFrame)/12)*0.95;
    g.globalAlpha=histAlpha;
    win(hpX,hpY,hpW,hpH);
    bx(hpX,hpY,hpW,3,'#806030'); // amber top border
    txShadow('ROUND LOG',hpX+8,hpY+18,8,'#c0a060','rgba(0,0,0,.3)');
    // v313: W/L tally — lazy cache, rebuild once per round
    if(_histWLRd!==rd){
      _histWLRd=rd;let _w=0,_l=0;
      for(let _bhi=0;_bhi<battleRoundHistory.length;_bhi++){const _bh=battleRoundHistory[_bhi];if(_bh.got)_w++;if(_bh.lost)_l++;}
      _histWLStr='W:'+_w+' L:'+_l;
    }
    txShadow(_histWLStr,hpX+hpW-64,hpY+18,6,_battleRoundNet>0?'#50d080':_battleRoundNet<0?'#d05050':'#888070','rgba(0,0,0,.3)');
    bx(hpX+6,hpY+22,hpW-12,1,'rgba(200,180,100,.2)');
    for(let i=0;i<histCount;i++){
      const h=battleRoundHistory[i];
      const hy=hpY+28+i*22;
      const rowA=i===0?1:0.7-i*0.1;
      g.globalAlpha=histAlpha*rowA;
      // Round label
      txShadow(_ROUND_LBL[h.rd]||('R'+h.rd),hpX+6,hy+12,6,i===0?'#e8e0c0':'#888070','rgba(0,0,0,.3)'); // v316
      // Player action badge
      const pCol=_ACT_COL[h.pa]||'#888';
      bx(hpX+28,hy,34,16,'rgba(0,0,0,.5)');
      bx(hpX+28,hy,34,1,pCol);
      txShadow('YOU',hpX+30,hy+7,5,'rgba(200,200,200,.5)','rgba(0,0,0,.3)');
      txShadow(_ACT_ABBR[h.pa]||'???',hpX+30,hy+14,6,pCol,'rgba(0,0,0,.3)');
      // Rival 1 action (VEGA)
      const r1Col=_ACT_COL[h.r1a]||'#888';
      bx(hpX+66,hy,34,16,'rgba(0,0,0,.5)');
      bx(hpX+66,hy,34,1,'#d060a0');
      txShadow('V',hpX+68,hy+7,5,'rgba(200,160,180,.5)','rgba(0,0,0,.3)');
      txShadow(_ACT_ABBR[h.r1a]||'???',hpX+68,hy+14,6,r1Col,'rgba(0,0,0,.3)');
      // Rival 2 action (MIRA)
      const r2Col=_ACT_COL[h.r2a]||'#888';
      bx(hpX+104,hy,34,16,'rgba(0,0,0,.5)');
      bx(hpX+104,hy,34,1,'#d0a030');
      txShadow('M',hpX+106,hy+7,5,'rgba(200,180,100,.5)','rgba(0,0,0,.3)');
      txShadow(_ACT_ABBR[h.r2a]||'???',hpX+106,hy+14,6,r2Col,'rgba(0,0,0,.3)');
      // Outcome dot
      if(h.got){g.globalAlpha=histAlpha*rowA;bx(hpX+hpW-16,hy+4,8,8,'#40d080');}
      else if(h.lost){g.globalAlpha=histAlpha*rowA;bx(hpX+hpW-16,hy+4,8,8,'#d04040');}
    }
    // v315: momentum badge when strongly positive or negative
    if(_battleRoundNet>=3){
      const mbA=0.7+Math.sin(fr*0.2)*0.3;
      g.globalAlpha=histAlpha*mbA;
      bx(hpX+4,hpY+hpH,hpW-8,14,'rgba(20,80,40,.6)');
      txShadow('\u25B2 ON A ROLL!',hpX+10,hpY+hpH+11,6,'#50d080','rgba(0,0,0,.3)');
      g.globalAlpha=1;
    }else if(_battleRoundNet<=-3){
      const mbA=0.7+Math.sin(fr*0.2)*0.3;
      g.globalAlpha=histAlpha*mbA;
      bx(hpX+4,hpY+hpH,hpW-8,14,'rgba(80,20,20,.6)');
      txShadow('\u25BC UNDER PRESSURE',hpX+10,hpY+hpH+11,6,'#d05050','rgba(0,0,0,.3)');
      g.globalAlpha=1;
    }
    g.globalAlpha=1;
  }
  // Card selection submenu for USE CARD
  if(bpCardSelectActive){
    bx(0,0,W,H,'rgba(0,0,0,.5)');
    // v266: reuse _csFilledBuf — no array alloc per frame while card select open
    let _csN=0;for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)_csFilledBuf[_csN++]=i;}
    const cardH=48;
    const mh=_csN*cardH+56;
    const cardW=380;
    win(W/2-cardW/2,H/2-mh/2,cardW,mh);
    txShadow('Use which card?',W/2-90,H/2-mh/2+26,14,'#806030','rgba(0,0,0,.2)');
    const spacing=_csN<=3?Math.min(cardH+8,(mh-56)/Math.max(1,_csN)):cardH;
    for(let j=0;j<_csN;j++){
      const slot=_csFilledBuf[j];const cd=pl[0].cd[slot],cr=CD[cd-1];
      const y=H/2-mh/2+46+j*spacing;
      if(j===bpCardSelectIdx){bx(W/2-cardW/2+8,y-4,cardW-16,cardH-4,'rgba(192,168,96,.25)');txShadow('\u25B6',W/2-cardW/2+4,y+20,12,'#c04040','rgba(0,0,0,.3)');}
      // Larger card frame with character sprite
      const frameX=W/2-cardW/2+28;
      bx(frameX,y+2,36,36,cr.d);bx(frameX+2,y+4,32,32,cr.c);
      drawCardCharacter(frameX+3,y+5,cd,1.2,fr);
      // Card name clearly below/beside
      txShadow(cr.n,frameX+44,y+20,14,j===bpCardSelectIdx?'#c04040':'#303028','rgba(0,0,0,.2)');
      txShadow(cr.f,frameX+44,y+36,11,'#908878','rgba(0,0,0,.15)');
    }
    // v91: Effect preview panel for selected card (shown to the right of card list)
    if(_csN>0&&bpCardSelectIdx>=0&&bpCardSelectIdx<_csN){
      const selSlot=_csFilledBuf[bpCardSelectIdx];
      const selCard=pl[0].cd[selSlot];
      if(selCard>0){
        const scr=CD[selCard-1];
        // v265: pre-baked type info — _getTypeInfo() replaces per-frame TYPE_INFO object
        const ti=_getTypeInfo(scr.t,scr.r);
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
        for(let s=0;s<scr.r;s++)txShadow('\u2605',finalEpX+epW-8-(scr.r-s)*10,epY+22,7,rarCol,'rgba(0,0,0,.3)');
        // Divider
        bx(finalEpX+8,epY+30,epW-16,1,'rgba(200,180,100,.25)');
        // Effect description lines
        for(let li=0;li<ti.lines.length;li++){
          const ln=ti.lines[li];if(ln)txShadow(ln,finalEpX+10,epY+44+li*18,6,li===0?'#e8e0c0':'#a09888','rgba(0,0,0,.3)');
        }
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
      const tFled=cardCount(pl[t])===0;
      if(t===bpTargetSelectIdx){bx(W/2-130,y-2,260,28,'rgba(192,168,96,.22)');txShadow('\u25B6',W/2-134,y+14,10,'#c04040','rgba(0,0,0,.3)');}
      g.globalAlpha=tFled?0.45:1;
      txShadow(pl[t].n,W/2-106,y+14,14,t===bpTargetSelectIdx?'#c04040':'#303028','rgba(0,0,0,.2)');
      txShadow(tFled?'FLED':(_SPLASH_CARD_LBL[pl[t].cc]||(pl[t].cc+' cards')),W/2+40,y+14,10,tFled?'#a04040':'#908878','rgba(0,0,0,.15)');
      g.globalAlpha=1;
    }
  }
  // v217: Low HP danger pulse — screen-edge red vignette when player HP critical
  if(bpHP[0]===1){
    const dangerPulse=0.25+0.22*Math.sin(fr*0.28);
    g.globalAlpha=dangerPulse;g.drawImage(_btlLowHpVig,0,0);g.globalAlpha=1;
    // "DANGER" text, very faint, top-center
    const dA=0.12+0.10*Math.sin(fr*0.28);
    g.globalAlpha=dA;
    txShadow('! CRITICAL !',W/2-56,H-8,8,'#ff4040','rgba(0,0,0,.5)');
    g.globalAlpha=1;
  }
  g.restore();
}

function drawConfirmingPhase(){
  drawBattleBG();
  drawPhaseBanner('confirming');
  drawBattleArena();
  drawOpponentInfoBox();
  drawPlayerInfoBox();
  // v135: Action commitment shout — brief screen-center flash of chosen action name
  {const t0=fr-bpFrame;
  if(t0<16){
    const act=Math.min(bpAction,4);const aCol=_ACTION_COLORS_EX[act]; // v262: hoisted
    const aName=_ACTION_NAMES_EX[act];
    const fadeIn=Math.min(1,t0/5);const fadeOut=t0>9?Math.max(0,(16-t0)/7):1;
    const shoutA=fadeIn*fadeOut;
    const sz=Math.floor(12+Math.min(1,t0/7)*28); // font size 12→40 as it snaps in
    const textW=aName.length*sz*0.62;
    const shoutX=W/2-textW/2,shoutY=H/2-20;
    // Background color burst
    g.globalAlpha=shoutA*0.18;
    bx(0,shoutY-sz-16,W,sz+40,aCol);
    // Horizontal scanline accent
    g.globalAlpha=shoutA*0.55;
    bx(0,shoutY-sz/2,W,2,'rgba(255,255,255,.3)');
    // Action name text
    g.globalAlpha=shoutA;
    txShadow(aName,shoutX,shoutY+sz*0.8,sz,aCol,'rgba(0,0,0,0.85)');
    g.globalAlpha=1;
  }}
  // Text box at bottom
  win(4,H-70,W-8,64);
  const t=fr-bpFrame; // v262: actionNames hoisted to _ACTION_NAMES
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
      txShadow((zkProofGenerating?_GROTH16_SNARK_SPIN:_GROTH16_VIS_SPIN)[Math.floor(t/3)%4],16,H-38,12,'#14F195','rgba(0,0,0,.3)'); // v316
      const proofT=t-65;
      if(proofT>5)txShadow('\u03C0_A',16,H-22,7,'#9945FF','rgba(0,0,0,.3)');
      if(proofT>10)txShadow('\u03C0_B',80,H-22,7,'#14F195','rgba(0,0,0,.3)');
      if(proofT>15)txShadow('\u03C0_C',144,H-22,7,'#80c0ff','rgba(0,0,0,.3)');
    }else if(t<100){
      const vMsg=zkProofStatus==='verified'?'ZK Proof VERIFIED (264 constraints) \u2713':'Proof verified (264 constraints) \u2713';
      txShadow(vMsg,16,H-38,12,'#40d080','rgba(0,0,0,.3)');
      txShadow('\u03C0_A, \u03C0_B, \u03C0_C \u2014 valid',16,H-22,7,'#14F195','rgba(0,0,0,.3)');
    }else{
      txShadow(_WAIT_DOTS[Math.floor(t/12)%3],16,H-38,14,'#686068','rgba(200,180,140,.3)'); // v315
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
        if(arrowProg>0.5)txShadow('\u25B6',flowX+14+arrowLen-6,flowY+14,6,'#40d080','rgba(0,0,0,.3)');
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
        txShadow('\u25B6',flowX+38,flowY+14,6,'#80c0ff','rgba(0,0,0,.3)');
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
        txShadow('\u25B6',flowX+52,flowY+14,6,'#f0c830','rgba(0,0,0,.3)');
        txShadow('result',flowX+62,flowY+14,5,'#f0c830','rgba(0,0,0,.3)');
        // arrows to all players
        bx(flowX+100,flowY+11,30,2,'#48b8e8');
        txShadow('ALL',flowX+134,flowY+14,5,'#48b8e8','rgba(0,0,0,.3)');
      }
    }
  }else{
    if(t<40)txShadow(_CHOSE_LBL[bpAction]||('You chose '+_ACTION_NAMES[bpAction]+'!'),16,H-38,14,'#303028','rgba(200,180,140,.3)');
    else if(t<60){txShadow(_POSEIDON_SPIN[Math.floor(t/4)%4],16,H-38,12,'#9945FF','rgba(0,0,0,.3)');} // v316
    else if(t<80){
      txShadow((zkProofStatus==='verified'?_ZK_VERIFIED_SPIN:_ZK_PROOF_SPIN)[Math.floor(t/3)%4],16,H-38,12,zkProofStatus==='verified'?'#40d080':'#14F195','rgba(0,0,0,.3)'); // v316
      if(walletLastCommitHash)txShadow(walletLastCommitHash,16,H-18,7,'#80c0ff','rgba(0,0,0,.3)');
    }
    else{txShadow(_RESOLVING_DOTS[Math.floor(t/12)%3],16,H-38,14,'#686068','rgba(200,180,140,.3)');} // v315
  }
  // Commit phase: on-chain TX + ZK proof (both paths)
  if(t===1&&walletConnected){
    onchainCommitPhase=true;
    onchainCommit(rd,bpAction,encounterExclTarget||0).then(result=>{
      if(result){
        walletLastCommitHash=result.hash;
        logOnchain('Commit: '+result.hash.slice(0,10)+'..'+'  TX:'+result.txSig.slice(0,8)+'..');
        // Generate ZK proof using the same salt that was committed on-chain
        if(onchainPendingSalt){
          zkProofStatus='generating';
          zkGenerateProof(bpAction+1, encounterExclTarget||0, onchainPendingSalt);
        }
      }
      onchainCommitPhase=false;
    }).catch(()=>{onchainCommitPhase=false;});
  }
  if(t===1&&!walletConnected){
    const salt=generateSalt();
    computeCommitHash(bpAction,new Uint8Array(32),salt).then(hash=>{
      walletLastCommitHash=hexFromBytes(hash);
      lg.push('Commit hash: '+walletLastCommitHash.slice(0,10)+'..');
    }).catch(()=>{});
    // ZK proof: proves knowledge of action preimage without wallet
    zkGenerateProof(bpAction+1, encounterExclTarget||0, salt);
  }
  // On-chain reveal phase
  if(t===70&&walletConnected&&onchainPendingSalt){
    onchainRevealPhase=true;
    onchainReveal(rd,bpAction,encounterExclTarget||0,onchainPendingSalt).then(result=>{
      if(result){
        logOnchain('Reveal TX:'+result.txSig.slice(0,8)+'..');
      }
      onchainRevealPhase=false;onchainPendingSalt=null;
    }).catch(()=>{onchainRevealPhase=false;});
  }
  if(t>=120){battlePhase='resolving';bpFrame=fr;bpResolveIdx=0;bpResolveQueue=generateResolveEvents();
    // v305: pre-truncate long event texts once; eliminates per-frame substring in drawResultPhase
    for(let _ei=0;_ei<bpResolveQueue.length;_ei++){const _e=bpResolveQueue[_ei];if(_e.text&&_e.text.length>54)_e.text=_e.text.substring(0,52)+'..';}
  }
}

// Dungeon floor card drop tables (GDD v1.0)
// Town (map 0): no drops. Dungeon floors 1-5: progressively rarer cards
// Floor 1: Common (1-2 per type), Floor 2: Uncommon, Floor 3: Rare, Floor 4: Epic, Floor 5: Legendary
const DUNGEON_FLOOR_CARDS=[
  [],                                           // map 0 = Town: no drops
  [4,5,13,14,25,26,39,40,49,50],              // Floor 1: Common/Uncommon
  [6,7,15,16,27,28,41,42,51,52],              // Floor 2: Uncommon
  [3,8,9,10,17,18,19,29,30,31,43,44,45,53,54,55], // Floor 3: Rare (16 cards — IGNIS added)
  [11,20,21,22,32,33,34,46,47,56,57,58],     // Floor 4: Epic
  [1,2,12,23,24,35,36,37,38,48,59,60],       // Floor 5: Legendary (including originals)
];
// AREA_CARDS: 1-indexed card pools per map (same as DUNGEON_FLOOR_CARDS, used by encounters/rocks)
const AREA_CARDS=[
  [4,5,13,14,25,26,39,40,49,50],    // map 0 Town (fallback only — encounters blocked in town)
  [4,5,13,14,25,26,39,40,49,50],    // map 1 Floor 1: Common/Uncommon
  [6,7,15,16,27,28,41,42,51,52],    // map 2 Floor 2: Uncommon
  [3,8,9,10,17,18,19,29,30,31,43,44,45,53,54,55], // map 3 Floor 3: Rare
  [11,20,21,22,32,33,34,46,47,56,57,58], // map 4 Floor 4: Epic
  [1,2,12,23,24,35,36,37,38,48,59,60],  // map 5 Floor 5: Legendary
];
function pickAreaCardForMap(mapIdx){
  const ac=DUNGEON_FLOOR_CARDS[mapIdx];
  if(!ac||ac.length===0)return 1+(Math.floor(Math.random()*60)); // fallback: any card
  return ac[Math.floor(Math.random()*ac.length)];
}
// v299: vault-new preference pick — no .filter() array, single-pass random scan
// Replaces the pool.filter(id=>!vault.has(id)) pattern used across multiple systems
function pickFromPool(pool){
  if(!pool||!pool.length)return 0;
  const vault=pl[0].vault;
  const start=Math.floor(Math.random()*pool.length);
  if(vault){for(let i=0;i<pool.length;i++){const id=pool[(start+i)%pool.length];if(!vault.has(id))return id;}}
  return pool[start]; // all owned or no vault: random pick
}
function cardCount(p){ return cdCount(p.cd); }
function syncCardCount(pIdx){
  const p=pl[pIdx];
  if(pIdx===0&&p.vault){p.cc=p.vault.size;}
  else{p.cc=cardCount(p);}
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
  if(slotOrRandom===-1){// random — v298: count filled first, pick by index, no filled[] array
    let _fn=0;for(let i=0;i<handLimit;i++){if(p.cd[i]>0)_fn++;}
    if(_fn===0)return 0;
    let _ft=Math.floor(Math.random()*_fn),_fc=0;
    for(let i=0;i<handLimit;i++){if(p.cd[i]>0){if(_fc===_ft){const card=p.cd[i];p.cd[i]=0;if(pIdx===0){cardTimers[i]=0;decayWarn[i]=0;stats.cardsLost++;}syncCardCount(pIdx);return card;}_fc++;}}
    return 0;
  }
  const card=p.cd[slotOrRandom];if(card>0){p.cd[slotOrRandom]=0;if(pIdx===0){cardTimers[slotOrRandom]=0;decayWarn[slotOrRandom]=0;stats.cardsLost++;}syncCardCount(pIdx);}return card;
}
function hasUniqueCards(pIdx){
  // For player: return vault (all ever collected); for rivals: derive from hand
  if(pIdx===0&&pl[0].vault)return pl[0].vault;
  const s=new Set();for(let _ci=0,_cl=pl[pIdx].cd.length;_ci<_cl;_ci++){if(pl[pIdx].cd[_ci]>0)s.add(pl[pIdx].cd[_ci]);}return s;
}
// v261: allocation-free rival unique card count — O(n²) dedup on 5-slot hand, no Set created
function rivalUniqSize(pIdx){
  const cd=pl[pIdx].cd,l=cd.length;let n=0;
  for(let i=0;i<l;i++){const c=cd[i];if(c<=0)continue;let dup=false;for(let j=0;j<i;j++){if(cd[j]===c){dup=true;break;}}if(!dup)n++;}
  return n;
}
function playerHasAllSixty(){return pl[0].vault&&pl[0].vault.size>=60;}
let _winTransitionPending=false; // guard against double-win transition
function checkWinAndTransition(delayMs){
  if(!playerHasAllSixty()||_winTransitionPending)return;
  _winTransitionPending=true;
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
  const rCardCount=cardCount(r);
  if(rCardCount<2)return 0;// Draw if low
  const roll=Math.random();
  // v298: rivalUniqSize is allocation-free (was hasUniqueCards → new Set per round)
  const rUniq=rivalUniqSize(rIdx);

  if(ai.personality==='hunter'){
    // Aggressive: mostly Steal + Scout
    if(rUniq>=4){
      if(roll<0.4)return 2;// barrier to protect lead
      if(roll<0.7)return 1;// steal
      return 3;// scout
    }
    if(cardCount(pl[0])>=2){
      if(roll<0.5)return 1;// steal from player
      if(roll<0.75)return 3;// scout player
      return 0;// draw
    }
    if(roll<0.4)return 1;if(roll<0.7)return 0;return 3;
  }else{
    // Collector: mostly Draw + Barrier, but will steal when behind
    if(rUniq>=4){
      if(roll<0.5)return 2;// barrier to protect lead
      if(roll<0.8)return 0;// draw to complete set
      return 3;// scout to plan
    }
    // Steal if player has more unique types than rival
    const playerUniq=pl[0].vault?pl[0].vault.size:rivalUniqSize(0);
    const needsFromPlayer=rCardCount>=3&&playerUniq>rUniq;
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
let bpPreRoundCards=[0,0,0]; // v312: card counts at round start, for delta display in result
let bpTellWasAccurate=[false,false]; // whether each rival's tell matched actual action
let bpRdIncremented=false; // guard: prevent double-increment of rd when pending discard
let bpActionsGenerated=false; // guard: only generate once per round
let bpScoutedCards=[null,null]; // [{round,cards:[{n,r,t}]}, null] — persists until battle ends
let battleRoundHistory=[]; // v90: [{rd,pa,r1a,r2a,outcome}] per round (pa=playerAction 0-4)
let _battleRoundNet=0; // v284: running got-lost net, updated at unshift — avoids per-frame reduce

let _histWLStr='W:0 L:0',_histWLRd=-1; // v313: W/L tally cache for round log panel
// v315: pre-baked ellipsis strings — eliminates '.'.repeat() per frame in confirming phase
const _WAIT_DOTS=['Waiting for others.','Waiting for others..','Waiting for others...'];
const _RESOLVING_DOTS=['Resolving.','Resolving..','Resolving...'];
// v300: Personality-specific bluff rates — VEGA 45% (unpredictable hunter), MIRA 20% (calculated)
const _BLUFF_RATES=[0.45,0.20];
// v293: Pre-computed "other action" indices — eliminates [0,1,2,3].filter per round
const _TELL_OTHERS=[[1,2,3],[0,2,3],[0,1,3],[0,1,2]];
// Rival tells: atmospheric body-language hints (65% accurate, 35% misleading)
const RIVAL_BATTLE_TELLS=[
  // VEGA (index 0) — physical, predatory
  {
    0:['VEGA scans the dungeon floor...','VEGA reaches into the ether.','VEGA draws from the dark.','VEGA\'s gaze drifts down.','VEGA breathes slowly, patient.'],
    1:['VEGA\'s eyes lock onto your hand.','VEGA steps forward hungrily.','VEGA narrows their eyes.','VEGA grins, low and quiet.','VEGA\'s fingers flex.'],
    2:['VEGA plants both feet firmly.','VEGA braces, arms crossed.','VEGA shields their cards.','VEGA stands unmoved.','VEGA exhales — ready.'],
    3:['VEGA tilts their head, watching.','VEGA studies the battlefield.','VEGA assesses the odds.','VEGA\'s gaze sweeps the room.','VEGA stores information silently.'],
  },
  // MIRA (index 1) — calculated, collector
  {
    0:['MIRA reaches toward the pile...','MIRA is adding to her set.','MIRA scans the floor carefully.','MIRA traces the floor pattern.','MIRA is methodical, precise.'],
    1:['MIRA steps forward, purposeful.','MIRA watches your cards closely.','MIRA calculates the exchange.','MIRA identifies her target.','MIRA adjusts her stance slightly.'],
    2:['MIRA folds her arms.','MIRA builds a quiet wall.','MIRA shields her collection.','MIRA won\'t show her hand.','MIRA is unreadable.'],
    3:['MIRA glances between both hands.','MIRA notes something quietly.','MIRA evaluates everything.','MIRA catalogs in silence.','MIRA sees the whole board.'],
  },
];

function generateRivalTells(){
  bpRivalActions[0]=rivalChooseAction(1);
  bpRivalActions[1]=rivalChooseAction(2);
  bpActionsGenerated=true;
  bpPreRoundCards[0]=cdCount(pl[0].cd);bpPreRoundCards[1]=cdCount(pl[1].cd);bpPreRoundCards[2]=cdCount(pl[2].cd); // v312: capture pre-round counts
  for(let ri=0;ri<2;ri++){
    const actualAct=bpRivalActions[ri];
    const tells=RIVAL_BATTLE_TELLS[ri];
    let actForTell=actualAct;
    const isMisdirect=Math.random()<_BLUFF_RATES[ri]; // v300: per-personality rate
    if(isMisdirect){
      const others=_TELL_OTHERS[actualAct%4]; // v293: pre-computed, no alloc
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
  // v297: actionNames dead — _ACTION_NAMES already at module scope (v262); rivalBarriers → 2 vars
  const events=[];
  bpPlayerBarrier=(bpAction===2);
  if(!bpActionsGenerated){bpRivalActions[0]=rivalChooseAction(1);bpRivalActions[1]=rivalChooseAction(2);}
  const rb0=bpRivalActions[0]===2,rb1=bpRivalActions[1]===2; // rivalBarrier[0] and [1]

  // ── PLAYER ACTION ──
  if(bpAction===0){// DRAW
    const cardId=pickAreaCardForMap(currentMap);const cr=CD[cardId-1];
    events.push({type:'action',who:'You',action:'DRAW',text:'You used DRAW!',effect:'none'});
    // v297: replace .some() closure with loop
    let wasInHandBefore=false;for(let _wci=0;_wci<pl[0].cd.length;_wci++){if(pl[0].cd[_wci]===cardId){wasInHandBefore=true;break;}}
    if(addCardToPlayer(0,cardId)){
      events.push({type:'result',text:'You obtained '+cr.n+'!',effect:'card_get',cardName:cr.n,cardId:cardId});
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
    const tgtBarrier=tgt===1?rb0:rb1;
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
        // Successful steal → target loses 1 HP
        bpHP[tgt]=Math.max(0,bpHP[tgt]-1);bpHPDmgAnim[tgt]=20;
        if(tgt===1&&bpHP[1]<=0)events._rival1KO=true;
        if(tgt===2&&bpHP[2]<=0)events._rival2KO=true;
        events.push({type:'result',text:'You stole '+stolenCard.n+' from '+pl[tgt].n+'! (-1 HP)',effect:'steal_get',target:tgt,isCritical:true,stolenId:stolen,rarity:stolenCard.r,dmg:1});
        lg.push('R'+rd+': Stole '+stolenCard.n+' from '+pl[tgt].n+'! ('+RARITY_LABEL[stolenCard.r]+') -HP');
        streakCount++;streakDisplayTimer=60;sfxStreakUp();
        // v79: track steal_win mission
        if(runMission&&runMission.type==='steal_win'&&!runMission.completed){runMission.progress=1;runMission.completed=true;}
      }else if(stolen>0){
        // Hand full — queue discard prompt so stolen card isn't lost
        const stolenCard=CD[stolen-1];
        bpHP[tgt]=Math.max(0,bpHP[tgt]-1);bpHPDmgAnim[tgt]=20;
        if(tgt===1&&bpHP[1]<=0)events._rival1KO=true;
        if(tgt===2&&bpHP[2]<=0)events._rival2KO=true;
        events.push({type:'result',text:'You stole '+stolenCard.n+' but hand full! Discard one after battle.',effect:'steal_get',target:tgt,isCritical:true,stolenId:stolen,rarity:stolenCard.r,dmg:1});
        events._pendingDrawCard=stolen;
        lg.push('R'+rd+': Stole '+stolenCard.n+' - hand full! -HP');
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
    events.push({type:'action',who:'You',action:'SCOUT',text:'You used SCOUT on '+pl[tgt].n+'!',effect:'scout_reveal',scoutTarget:tgt});
    // v297: single-pass scout build replaces filter+map+map+map (3 allocs → 1)
    let _snComma='',_snDot='';const _scArr=[];
    for(let _sci=0;_sci<HAND_SIZE;_sci++){const _sc=pl[tgt].cd[_sci];if(_sc>0){const _cr=CD[_sc-1];_scArr.push({n:_cr.n,r:_cr.r,t:_cr.t});if(_snComma){_snComma+=', ';_snDot+='\u00B7 ';}_snComma+=_cr.n;_snDot+=_cr.n;}}
    const scoutMsg=_snComma?pl[tgt].n+' has: '+_snComma:pl[tgt].n+' has no cards!';
    events.push({type:'result',text:scoutMsg,effect:'none'});
    lg.push('R'+rd+': Scout > '+scoutMsg);
    bpScoutedCards[tgt-1]={round:rd,cards:_scArr,nameStr:_snDot||'empty'}; // v261/v297: pre-join for render
  }else if(bpAction===4){// USE CARD
    // Consume selected card in hand for effect based on card TYPE (not ID)
    // v297: track first filled slot instead of filled[] array
    let _firstFilled=-1;for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0){_firstFilled=i;break;}}
    const safeSlot=(pl[0].cd[bpSelectedCardSlot]>0)?bpSelectedCardSlot:_firstFilled;
    if(_firstFilled>=0&&safeSlot>=0){
      const slot=safeSlot;const card=removeCardFromPlayer(0,slot);
      if(!card||!CD[card-1]){events.push({type:'result',text:'Your card vanished before use!',effect:'none'});lg.push('R'+rd+': USE CARD — card gone');
      }else{
      const cr=CD[card-1];
      events.push({type:'action',who:'You',action:'USE CARD',text:'You consumed '+cr.n+'!',effect:'none'});
      const tgt=bpSelectedTarget;
      // Effect scales with rarity (r=1 common, r=5 legendary)
      if(cr.t==='attack'){
        // Attack: deal 1 HP damage + force steal (ignore barrier) — power scales with rarity
        const dmg=Math.min(2,1+Math.floor((cr.r-1)/2));
        bpHP[tgt]=Math.max(0,bpHP[tgt]-dmg);bpHPDmgAnim[tgt]=20;
        if(tgt===1&&bpHP[1]<=0)events._rival1KO=true;
        if(tgt===2&&bpHP[2]<=0)events._rival2KO=true;
        if(Math.random()<0.2+cr.r*0.15){
          const stolen=removeCardFromPlayer(tgt,-1);
          if(stolen>0&&addCardToPlayer(0,stolen)){
            const sc_=CD[stolen-1];
            events.push({type:'result',text:cr.n+': -'+dmg+' HP! Power steal! Got '+sc_.n+'!',effect:'steal_get',target:tgt,isCritical:true,stolenId:stolen,rarity:sc_.r,dmg});
            lg.push('R'+rd+': '+cr.n+' -'+dmg+'HP power steal → '+sc_.n+'! ('+RARITY_LABEL[sc_.r]+')');streakCount++;streakDisplayTimer=60;sfxStreakUp();
          }else if(stolen>0){
            events._pendingDrawCard=stolen;
            const sc_=CD[stolen-1];
            events.push({type:'result',text:cr.n+': -'+dmg+' HP! Stole '+sc_.n+'! Hand full.',effect:'steal_get',target:tgt,isCritical:true,stolenId:stolen,rarity:sc_.r,dmg});
          }else{events.push({type:'result',text:cr.n+': -'+dmg+' HP damage! '+pl[tgt].n+' has no cards.',effect:'none'});}
        }else{
          events.push({type:'result',text:cr.n+': Strike landed but foe dodged!',effect:'slash',target:tgt});
          lg.push('R'+rd+': '+cr.n+' strike — missed steal!');
        }
      }else if(cr.t==='defense'){
        // Defense: barrier + restore spell energy + heal 1 HP
        bpPlayerBarrier=true;
        const restore=Math.min(2,Math.ceil(cr.r/2));
        sp.b=Math.min(5,sp.b+restore);
        const healed=bpHP[0]<BATTLE_HP_MAX;
        if(healed)bpHP[0]=Math.min(BATTLE_HP_MAX,bpHP[0]+1);
        events.push({type:'result',text:cr.n+': Barrier! +'+restore+' charge.'+(healed?' Restored 1 HP!':''),effect:'shield',heal:healed?1:0});
        lg.push('R'+rd+': '+cr.n+' barrier +'+restore+(healed?' +HP':'')+'!');
      }else if(cr.t==='flee'){
        // Flee: escape battle immediately (no card loss)
        events.push({type:'result',text:cr.n+': ESCAPED! No cards lost this round!',effect:'shield'});
        lg.push('R'+rd+': '+cr.n+' — escaped battle!');
        events._escaped=true; // signal battle result handler to skip to map immediately
      }else if(cr.t==='magic'){
        // Magic: strip all barriers + 2 HP damage to both rivals + guaranteed steal
        /* rb0/rb1 go out of scope after magic; bpPlayerBarrier covers player */bpPlayerBarrier=false;
        bpHP[1]=Math.max(0,bpHP[1]-2);bpHP[2]=Math.max(0,bpHP[2]-1);
        bpHPDmgAnim[1]=20;bpHPDmgAnim[2]=20;
        const stolen=removeCardFromPlayer(tgt,-1);
        if(stolen>0&&addCardToPlayer(0,stolen)){
          events.push({type:'result',text:cr.n+': Magic! -2 HP all rivals. Stole '+CD[stolen-1].n+'!',effect:'damage',target:tgt,isCritical:true,dmg:2});
          lg.push('R'+rd+': '+cr.n+' magic → '+CD[stolen-1].n+' stolen! -HP rivals');streakCount++;streakDisplayTimer=60;sfxStreakUp();
        }else if(stolen>0){
          events._pendingDrawCard=stolen;
          events.push({type:'result',text:cr.n+': Magic! Barriers nulled. Stole '+CD[stolen-1].n+'!',effect:'damage',target:tgt,isCritical:true,dmg:2});
        }else{
          events.push({type:'result',text:cr.n+': Magic! Barriers nulled. -HP rivals.',effect:'none'});
          lg.push('R'+rd+': '+cr.n+' magic — barriers cleared, HP drained!');
        }
        // Check rival KO by HP
        if(bpHP[1]<=0){events._rival1KO=true;}
        if(bpHP[2]<=0){events._rival2KO=true;}
      }else if(cr.t==='recovery'){
        // Recovery: restore all spell energy + 1 HP
        sp.s=Math.min(5,sp.s+Math.ceil(cr.r/2));
        sp.b=Math.min(5,sp.b+1);
        sp.c=Math.min(3,sp.c+1);
        bpHP[0]=Math.min(BATTLE_HP_MAX,bpHP[0]+1);
        events.push({type:'result',text:cr.n+': Recovery! +'+Math.ceil(cr.r/2)+' Steal, +1 Barrier, +1 Scout. +1 HP!',effect:'card_get',heal:1});
        lg.push('R'+rd+': '+cr.n+' restored energy + HP!');
      }
      } // end else(card valid)
    }else{
      events.push({type:'action',who:'You',action:'USE CARD',text:'No cards to use!',effect:'none'});
    }
  }

  // ── RIVAL 1 ACTION ──
  const r1Act=bpRivalActions[0];
  if(r1Act===0){// Rival draws
    const cardId=pickAreaCardForMap(rivalMaps[0]);const cr=CD[cardId-1];
    if(addCardToPlayer(1,cardId)){
      events.push({type:'action',who:pl[1].n,action:'DRAW',text:pl[1].n+' used DRAW and got '+cr.n+'!',effect:'card_get_rival',cardId,rivalIdx:0});
      lg.push('R'+rd+': '+pl[1].n+' drew '+cr.n+'!');
    }else{
      // Rival hand full - discard random then draw
      removeCardFromPlayer(1,-1);
      addCardToPlayer(1,cardId);
      events.push({type:'action',who:pl[1].n,action:'DRAW',text:pl[1].n+' swapped a card for '+cr.n+'!',effect:'card_get_rival',cardId,rivalIdx:0});
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
          removeCardFromPlayer(1,-1);
          addCardToPlayer(1,stolen);
        }
        // Rival steal success → player loses 1 HP
        bpHP[0]=Math.max(0,bpHP[0]-1);bpHPDmgAnim[0]=20;
        if(bpHP[0]<=0)events._playerDefeated=true;
        events.push({type:'result',text:pl[1].n+' stole your '+CD[stolen-1].n+'! (-1 HP)',effect:'card_lost',target:0,isCritical:true,stolenId:stolen,rarity:CD[stolen-1].r,rivalIdx:0,dmg:1});
        lg.push('R'+rd+': '+pl[1].n+' stole your '+CD[stolen-1].n+'! -HP');
        screenShake(4,10);
        if(streakCount>0){streakCount=0;streakLostTimer=60;sfxStreakLost();}
      }else{
        events.push({type:'result',text:'You had no cards to steal!',effect:'none'});
        lg.push('R'+rd+': '+pl[1].n+' Steal failed - hand empty!');
      }
    }
  }else if(r1Act===2){// Rival barrier (already tracked)
    events.push({type:'action',who:pl[1].n,action:'BARRIER',text:pl[1].n+' raised a BARRIER!',effect:'shield'});
    lg.push('R'+rd+': '+pl[1].n+' raised Barrier!');
  }else{// Scout
    events.push({type:'action',who:pl[1].n,action:'SCOUT',text:pl[1].n+' used SCOUT on you!',effect:'rival_scout',scoutSource:1});
    lg.push('R'+rd+': '+pl[1].n+' scouted you!');
  }

  // ── RIVAL 2 (HUNTER) ACTION ──
  const r2Act=bpRivalActions[1];
  if(r2Act===0){
    const cardId=pickAreaCardForMap(rivalMaps[1]);const cr=CD[cardId-1];
    if(addCardToPlayer(2,cardId)){
      events.push({type:'action',who:pl[2].n,action:'DRAW',text:pl[2].n+' used DRAW and got '+cr.n+'!',effect:'card_get_rival',cardId,rivalIdx:1});
      lg.push('R'+rd+': '+pl[2].n+' drew '+cr.n+'!');
    }else{
      removeCardFromPlayer(2,-1);
      addCardToPlayer(2,cardId);
      events.push({type:'action',who:pl[2].n,action:'DRAW',text:pl[2].n+' swapped a card for '+cr.n+'!',effect:'card_get_rival',cardId,rivalIdx:1});
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
        // Rival steal success → player loses 1 HP
        bpHP[0]=Math.max(0,bpHP[0]-1);bpHPDmgAnim[0]=20;
        if(bpHP[0]<=0)events._playerDefeated=true;
        events.push({type:'result',text:pl[2].n+' stole your '+CD[stolen-1].n+'! (-1 HP)',effect:'card_lost',target:0,isCritical:true,stolenId:stolen,rarity:CD[stolen-1].r,rivalIdx:1,dmg:1});
        lg.push('R'+rd+': '+pl[2].n+' stole your '+CD[stolen-1].n+'! -HP');
        screenShake(4,10);
        if(streakCount>0){streakCount=0;streakLostTimer=60;sfxStreakLost();}
      }else{
        events.push({type:'result',text:'You had no cards to steal!',effect:'none'});
        lg.push('R'+rd+': '+pl[2].n+' Steal failed - hand empty!');
      }
    }
  }else if(r2Act===2){
    events.push({type:'action',who:pl[2].n,action:'BARRIER',text:pl[2].n+' raised a BARRIER!',effect:'shield'});
  }else{
    events.push({type:'action',who:pl[2].n,action:'SCOUT',text:pl[2].n+' used SCOUT!',effect:'rival_scout',scoutSource:2});
  }

  return events;
}

