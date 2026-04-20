// v303: log entry classification cache — classify once per entry, O(1) on repeat frames
const _lgMeta=[]; // parallel to lg[]; entries: {col, icon}; cleared when lg resets
function _classifyLog(l){
  if(l.includes('stole')||l.includes('Steal')||l.includes('STEAL')||l.includes('ambush'))return{col:'#e06060',icon:'\u2694'};
  if(l.includes('Block')||l.includes('Barrier')||l.includes('BARRIER'))return{col:'#6090d0',icon:'\u25A0'};
  if(l.includes('Scout')||l.includes('SCOUT'))return{col:'#40b860',icon:'\u25CE'};
  if(l.includes('drew')||l.includes('obtained')||l.includes('Found')||l.includes('got a')||l.includes('Wild:'))return{col:'#60c060',icon:'\u2605'};
  if(l.includes('Fishing'))return{col:'#e0c040',icon:'\u223F'};
  if(l.startsWith('[ON-CHAIN]'))return{col:'#50e090',icon:'\u26D3'};
  if(l.includes('entered')||l.includes('Escaped')||l.includes('DUNGEON'))return{col:'#d08050',icon:'\u25B6'};
  if(l.includes('MISSION'))return{col:'#f0c830',icon:'\u25C6'};
  if(l.includes('Event:')||l.includes('Campfire')||l.includes('Altar'))return{col:'#c060c0',icon:'\u26A1'};
  if(l.includes('Umbra')||l.includes('Ignis'))return{col:'#a878c8',icon:'\u2620'};
  if(l.includes('Back in town')||l.includes('spell energy'))return{col:'#40a040',icon:'\u2605'};
  return{col:'#888898',icon:'\u00B7'};
}

// v378: pre-baked per-card phase tables (60 entries, fractional steps for gacha overlay)
const _CARD_SI55=new Float32Array(60);const _CARD_CI55=new Float32Array(60);
const _CARD_SI07=new Float32Array(60);const _CARD_CI07=new Float32Array(60);
const _CARD_SI05=new Float32Array(60);const _CARD_CI05=new Float32Array(60);
const _CARD_SI04=new Float32Array(60);const _CARD_CI04=new Float32Array(60);
for(let i=0;i<60;i++){
  _CARD_SI55[i]=Math.sin(i*0.55);_CARD_CI55[i]=Math.cos(i*0.55);
  _CARD_SI07[i]=Math.sin(i*0.7);_CARD_CI07[i]=Math.cos(i*0.7);
  _CARD_SI05[i]=Math.sin(i*0.5);_CARD_CI05[i]=Math.cos(i*0.5);
  _CARD_SI04[i]=Math.sin(i*0.4);_CARD_CI04[i]=Math.cos(i*0.4);
}

// CARD ACQUISITION ANIMATION
// ═══════════════════════════════════════
function startCardAcquisition(cardIdx){
  cardAcqIsNew=cardAcqWasNew;cardAcqWasNew=false; // v96: consume new-card flag
  cardAcqActive=true;cardAcqFrame=fr;cardAcqCard=cardIdx;cardAcqDone=false;
  cardAcqParticles.length=0;sfxCardGet();
  // Particle burst (canvas layer) scaled by rarity
  const _acqCr=CD[cardIdx];
  const _acqRarCols=['','#888898','#50d060','#b060e0','#e0a020','#ffe080'];
  const _acqCol=_acqRarCols[_acqCr?.r||1]||'#f0c030';
  triggerCardGetBurst(pl[0].visualX-camX,pl[0].visualY-camY-8,_acqCol);
  if((_acqCr?.r||1)>=3){hitPause((_acqCr?.r||1)>=4?4:2);}
  // PixiJS sparkle burst
  const cardColors=[0x4080D0,0x9060C0,0xD04040,0xD0A030,0x404060];
  pxSpawnParticle(W/2,H/2,cardColors[cardIdx%5]||0xF0C830,12,3,25);
  // Start reveal animation (silhouette -> color over 30 frames)
  startCardReveal(cardIdx+1);
  // Trigger floating "+" effect
  triggerCardGetAnim(pl[0].visualX-camX,pl[0].visualY-camY-7);
  // Pulse the progress bar
  triggerProgressPulse();
}

function drawCardAcquisition(){
  if(!cardAcqActive)return;
  const t=fr-cardAcqFrame,totalFrames=120;
  if(t>=totalFrames){cardAcqActive=false;cardAcqDone=true;return;}
  const cr=CD[cardAcqCard];if(!cr)return;
  // v222: Rarity-specific visual effects
  const rar=cr.r-1; // 0=common,1=uncommon,2=rare,3=epic,4=legendary
  const rarCol=CARD_RARITY_COL[rar]||'#f0c830';
  const isEpicPlus=rar>=3;

  let cx_,cy_,scale,alpha=1;
  if(t<50){
    const p=t/50,ease=1-Math.pow(1-p,3);
    cx_=W/2;cy_=H+30-ease*(H/2+30);scale=.2+ease*.8;
  }else if(t<90){
    cx_=W/2;cy_=H/2-20;scale=1;
    if(t%3===0){
      const angle=Math.random()*Math.PI*2,speed=1+Math.random()*2;
      // v222: Particle colors based on rarity
      const pc=isEpicPlus?(Math.random()>.5?rarCol:'#fff'):(Math.random()>.5?'#fff':'#f0c830');
      cardAcqParticles.push({x:cx_,y:cy_,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:20+Math.random()*10,c:pc});
      // Epic/Legendary: extra burst particles at card edges
      if(isEpicPlus&&t%6===0){
        const bAng=Math.random()*Math.PI*2,bSpd=2+Math.random()*3;
        cardAcqParticles.push({x:cx_+(Math.random()-.5)*40,y:cy_+(Math.random()-.5)*56,vx:Math.cos(bAng)*bSpd,vy:Math.sin(bAng)*bSpd,life:14+Math.random()*8,c:rarCol});
      }
    }
  }else{
    const p=(t-90)/30,ease=p*p;
    cx_=W/2+(280-W/2)*ease;cy_=(H/2-20)+(H-40-(H/2-20))*ease;scale=1-ease*.85;
  }

  // v222: Background dim overlay during card display (frames 20-110)
  if(t>=20&&t<110){
    const dimA=Math.min(0.55,(t<30?(t-20)/10*0.55:(t>100?(110-t)/10*0.55:0.55)));
    g.globalAlpha=dimA;bx(0,0,W,H,'#000');g.globalAlpha=1;
  }

  const cw=60*scale,ch=84*scale;

  // v222: Rarity glow ring behind card during hold phase
  if(t>=50&&t<90){
    const ringPulse=0.6+0.4*_sFr20; // v369: cached
    const ringR=48+_sFr15*4; // v369: cached
    g.globalAlpha=ringPulse*(isEpicPlus?0.55:0.3);
    g.fillStyle=rarCol;
    g.beginPath();g.arc(cx_,cy_,ringR+6,0,Math.PI*2);g.fill();
    g.globalAlpha=ringPulse*(isEpicPlus?0.35:0.18);
    g.beginPath();g.arc(cx_,cy_,ringR+14,0,Math.PI*2);g.fill();
    // Spinning sparkle dots — v393: sin-addition with _sFr07/_cFr07 + _ORB_SI6/CI6
    // (fr*0.07 ≡ π/3 per step; _ORB_CI6[si]=cos(si*π/3), _ORB_SI6[si]=sin(si*π/3))
    if(isEpicPlus){
      const _rr4=ringR+4;
      for(let si=0;si<6;si++){
        const sx=cx_+(_cFr07*_ORB_CI6[si]-_sFr07*_ORB_SI6[si])*_rr4;
        const sy=cy_+(_sFr07*_ORB_CI6[si]+_cFr07*_ORB_SI6[si])*_rr4;
        g.globalAlpha=0.7*ringPulse;bx(sx-1,sy-1,3,3,rarCol);
      }
    }
    g.globalAlpha=1;
  }

  g.globalAlpha=alpha;
  drawCardFrame(cx_-cw/2,cy_-ch/2,cw,ch,cardAcqCard,scale>.6);
  g.globalAlpha=1;

  if(t>=50&&t<90){
    win(W/2-150,cy_+ch/2+12,300,52); // UX-3: taller window for bigger text
    if(_acqObtainedRef!==cr){_acqObtainedRef=cr;_acqObtainedLbl='You obtained '+cr.n+'!';} // v338: lazy cache
    txShadow(_acqObtainedLbl,W/2-130,cy_+ch/2+42,20,'#303028','rgba(200,180,140,.3)'); // UX-3: 14→20
    // v96: NEW card badge — shown when first time in vault
    if(cardAcqIsNew){
      const newBadgeAlpha=t<60?(t-50)/10:t>82?(90-t)/8:1;
      const vaultTotal=pl[0].vault?pl[0].vault.size:0;
      if(_acqNewVault!==vaultTotal){_acqNewVault=vaultTotal;_acqNewLbl='\u2605 NEW!  '+vaultTotal+'/60';} // v338: lazy cache
      const newLabel=_acqNewLbl;
      const newLW=newLabel.length*6+14;
      g.globalAlpha=newBadgeAlpha;
      bx(W/2-newLW/2,cy_+ch/2-12,newLW,16,'rgba(0,0,0,.7)');
      bx(W/2-newLW/2,cy_+ch/2-12,newLW,1,rarCol);
      bx(W/2-newLW/2,cy_+ch/2+4,newLW,1,rarCol);
      g.font='bold 9px VT323, monospace';
      g.textAlign='center';
      g.fillStyle=isEpicPlus?rarCol:'#f0e040';
      g.shadowColor=rarCol;g.shadowBlur=10;
      g.fillText(newLabel,W/2,cy_+ch/2);
      g.shadowBlur=0;g.textAlign='left';
      g.globalAlpha=1;
    }
  }

  for(let i=cardAcqParticles.length-1;i>=0;i--){
    const p=cardAcqParticles[i];p.x+=p.vx;p.y+=p.vy;p.life--;
    if(p.life<=0){const _last=cardAcqParticles.length-1;if(i<_last)cardAcqParticles[i]=cardAcqParticles[_last];cardAcqParticles.length--;continue;}
    g.globalAlpha=Math.min(1,p.life/10);bx(p.x,p.y,2,2,p.c);g.globalAlpha=1;
  }

}

// ═══════════════════════════════════════
// DISCARD OVERLAY
// ═══════════════════════════════════════
// ── DUNGEON ENTRY CONFIRMATION (v189: txShadow + slide) ──
let dungeonConfirmOpenFrame_=0;
function drawDungeonConfirm(){
  if(!dungeonConfirmActive){dungeonConfirmOpenFrame_=0;return;}
  if(!dungeonConfirmOpenFrame_)dungeonConfirmOpenFrame_=fr;
  const cw=460,ch=300;
  const cyBase=H/2-ch/2;
  // Slide in from above (easeOut, 7 frames)
  const tSlide=Math.min(1,(fr-dungeonConfirmOpenFrame_)/7);
  const eSlide=1-Math.pow(1-tSlide,3);
  const cx_=W/2-cw/2,cy_=cyBase-(1-eSlide)*ch;

  bx(0,0,W,H,'rgba(0,0,0,.65)');
  win(cx_,cy_,cw,ch);
  bx(cx_,cy_,cw,28,'#1a0a0a');
  bx(cx_,cy_,4,28,'#d04040'); // red left accent
  txShadow('ENTER DUNGEON?',cx_+cw/2-80,cy_+20,11,'#d04040','rgba(0,0,0,.5)');
  const handCount=cdCount(pl[0].cd);
  const vaultSize=pl[0].vault?pl[0].vault.size:0;
  const _dsk=handCount*100+vaultSize;if(_dunStatsKey!==_dsk){_dunStatsKey=_dsk;_dunStatsLbl='Cards in hand: '+handCount+'     Vault: '+(_UNIQ60[vaultSize]||(vaultSize+'/60'));} // v328: lazy
  txShadow(_dunStatsLbl,cx_+20,cy_+50,8,'#c8c0a0','rgba(0,0,0,.3)');
  bx(cx_+12,cy_+60,cw-24,1,'#282848');
  txShadow('\u26A0 Cards decay in 3.5 min \u2014 escape before they vanish!',cx_+12,cy_+74,6,'#d06030','rgba(0,0,0,.3)');
  txShadow('\u2694 Rivals can STEAL your cards each battle round.',cx_+12,cy_+89,6,'#d06030','rgba(0,0,0,.3)');
  txShadow('\u2190 Green arrows lead back to town safely.',cx_+12,cy_+104,6,'#40b060','rgba(0,0,0,.3)');

  // Intel briefing section
  bx(cx_+12,cy_+116,cw-24,1,'#282858');
  txShadow('INTEL BRIEFING',cx_+20,cy_+130,7,'#7898c8','rgba(0,0,0,.4)');
  let intelY=cy_+146; // v262: flNums_ hoisted to _DNG_FLOOR_LABELS
  for(let ri=0;ri<2;ri++){
    const r=pl[ri+1];
    const rFloor=rivalMaps[ri];
    const rcc=cdCount(r.cd);
    const rCol=ri===0?'#d060a0':'#d0a030';
    const rLoc=_DNG_FLOOR_LABELS[rFloor]||'B?';
    const rThreat=rcc>=4?' \u26A0 RICH TARGET':rcc===0?' (no cards)':'';
    const _riKey=rFloor*10+rcc;if(_rIntelKey[ri]!==_riKey){_rIntelKey[ri]=_riKey;_rIntelLbl[ri]=r.n+': '+rLoc+'  '+rcc+'\u2660'+rThreat;} // v333: lazy
    txShadow(_rIntelLbl[ri],cx_+20,intelY,7,rcc>=4?'#e05050':rCol,'rgba(0,0,0,.3)');
    intelY+=16;
  }
  // v265: allocation-free counting (was filter×2 per frame while confirm open)
  let f1Uncollected=0,f1Total=0;
  for(let _ti=0;_ti<treasures.length;_ti++){const _tr=treasures[_ti];if(_tr.map===1){f1Total++;if(!_tr.collected)f1Uncollected++;}}
  // v339: B1 danger level indicator
  {const _dv=areaDanger[1]||0;const _di=_dv>=DANGER_HIGH_THRESH?2:_dv>=DANGER_LOW_THRESH?1:0;
  const _dcol=['#40b060','#d0a030','#d04040'][_di];
  txShadow(_B1_DANGER_LBL[_di],cx_+cw-110,cy_+50,7,_dcol,'rgba(0,0,0,.3)');}
  if(f1Uncollected>0){
    const _ck=f1Uncollected*100+f1Total;if(_f1ChestKey!==_ck){_f1ChestKey=_ck;_f1ChestLbl='\u25cf B1 chests: '+f1Uncollected+'/'+f1Total+' uncollected';} // v339: lazy cache
    txShadow(_f1ChestLbl,cx_+20,intelY,7,'#c0a840','rgba(0,0,0,.3)');
    intelY+=16;
  }
  if(runMission&&!runMission.completed){
    if(_missionDescRef!==runMission){_missionDescRef=runMission;_missionDescLbl='\u25CE Mission: '+runMission.desc;}
    txShadow(_missionDescLbl,cx_+20,intelY,6,'#8898c8','rgba(0,0,0,.3)'); // v345: lazy cache
    intelY+=14;
  }
  const pityLeft=GACHA_PITY_THRESHOLD-gachaPityCount;
  if(gachaPityCount>0){
    const pityCol=pityLeft<=2?'#f0c830':pityLeft<=5?'#d0a030':'#686868';
    txShadow(_GACHA_PITY_LBL[gachaPityCount]||('Gacha pity: '+gachaPityCount+'/'+GACHA_PITY_THRESHOLD),cx_+20,intelY,6,pityCol,'rgba(0,0,0,.3)'); // v333
  }

  bx(cx_+12,cy_+ch-34,cw-24,1,'#282848');
  const blink_=Math.floor(fr/22)%2===0;
  if(blink_)txShadow('[Z] ENTER   [X] STAY',cx_+cw/2-90,cy_+ch-14,10,'#f0c830','rgba(0,0,0,.5)');
}

// v269: victory screen hand card buffer — eliminates map+filter+slice per frame
const _vcHandBuf=new Uint8Array(7);
// v262: Hoist card-screen per-frame inline literals
const _CRD_TYPE_NAMES=['ATK','DEF','FLY','MAG','REC'];
const _CRD_TYPE_COLS=['#e05840','#48b8e8','#38c080','#d8b028','#e0c040'];
const _CRD_RAR_NAMES=['','Common','Uncommon','Rare','Epic','Legendary'];
const _CRD_TYPE_FULL={attack:'ATTACK',defense:'DEFENSE',flee:'FLIGHT',magic:'MAGIC',recovery:'RECOVERY'};
const _FLOOR_NAMES_TC=['','Floor I','Floor II','Floor III','Floor IV','Floor V'];
const _DNG_FLOOR_LABELS=['TOWN','B1','B2','B3','B4','B5'];
const _LOG_STAT_ICONS=['\u2694','\u2605','\u2717','\u2660'];
// v321: pre-baked catalog/market strings — eliminates per-frame alloc in overlay hot paths
const _CRD_PAGE_TITLE=(()=>{const a=[];for(let i=0;i<5;i++)a.push(_CRD_TYPE_NAMES[i]+' '+(i+1)+'/5');return a;})();
const _OVER12_LBL=(()=>{const a=[];for(let i=0;i<=12;i++)a.push(i+'/12');return a;})();
// v328: pre-baked overlay strings
const _VEGA_LBL=(()=>{const a=[];for(let i=0;i<=60;i++)a.push('V:'+i);return a;})();
const _MIRA_LBL=(()=>{const a=[];for(let i=0;i<=60;i++)a.push('M:'+i);return a;})();
const _INSCRIBING_LBL=(()=>{const a=[];for(let i=0;i<=60;i++)a.push('Inscribing '+i+'/60...');return a;})();
const _INTRO_PG_LBL=(()=>{const a=[];for(let i=0;i<INTRO_PAGES.length;i++)a.push((i+1)+'/'+INTRO_PAGES.length);return a;})();
let _dunStatsLbl='',_dunStatsKey=-1; // dungeon confirm stats lazy (key=handCount*100+vaultSize)
const _mktTabLbl=['','','','',''],_mktTabKey=[-1,-1,-1,-1,-1]; // marketplace type tab labels
// v333: pre-baked gacha pity labels 0..GACHA_PITY_THRESHOLD
const _GACHA_PITY_LBL=(()=>{const a=[];for(let i=0;i<=GACHA_PITY_THRESHOLD;i++)a.push('Gacha pity: '+i+'/'+GACHA_PITY_THRESHOLD+(GACHA_PITY_THRESHOLD-i<=3?' \u2014 RARE SOON!':''));return a;})();
// v333: lazy rival intel strip labels for dungeon confirm (key = rFloor*10+rcc per rival)
let _rIntelLbl=['',''],_rIntelKey=[-1,-1];
// v444: hoisted above _MKT_LISTING_PRICE_LBL — the .map() below reads
// _MKT_LISTINGS at load time, so the declaration must precede it.
const _MKT_LISTINGS=[
  {seller:'VEGA',card:6,price:'0.05'},
  {seller:'MIRA',card:20,price:'0.08'},
  {seller:'???',card:45,price:'0.15'},
  {seller:'???',card:1,price:'0.99'},
];
// v333: marketplace listing price labels (baked from _MKT_LISTINGS static data)
const _MKT_LISTING_PRICE_LBL=_MKT_LISTINGS.map(l=>l.price+' SOL');
const _LOG_STAT_LABELS=['btl','got','lost',''];
// v338: pre-baked card decay countdown strings 0..210s (CARD_DECAY_MS=210000)
const _DECAY_TIME_LBL=(()=>{const a=[];for(let s=0;s<=300;s++){const mm=Math.floor(s/60),ss2=s%60;a.push(mm>0?mm+'m'+(ss2<10?'0':'')+ss2+'s':s+'s');}return a;})();
// v352: pre-baked B1 danger labels
const _B1_DANGER_LBL=['\u26A0 B1: SAFE','\u26A0 B1: LOW DANGER','\u26A0 B1: HIGH DANGER'];
// v339: lazy cache for B1 chest intel label in dungeon confirm
let _f1ChestLbl='',_f1ChestKey=-1;
// v345: lazy cache for mission desc label in dungeon confirm
let _missionDescLbl='',_missionDescRef=null;
// v338: lazy cache for card acquisition "You obtained X!" label and NEW badge label
let _acqObtainedLbl='',_acqObtainedRef=null;
let _acqNewLbl='',_acqNewVault=-1;
// v256: Hoisted market overlay statics — eliminates per-frame inline literal allocs
const _MKT_TYPE_FILTER=['attack','defense','flee','magic','recovery'];
const _MKT_TYPE_LABEL=['ATK','DEF','FLY','MAG','REC'];
const _MKT_TYPE_COLOR=['#e05840','#48b8e8','#38c080','#d8b028','#e0c040'];
// v263: vault cache — rebuilt only when vault.size changes, not every frame
let _mktVaultCache=null,_mktVaultSz=-1;
const _mktTypeCache=[[],[],[],[],[]];
// ── MARKETPLACE OVERLAY (v188: slide-in + polish) ──
let marketOpenFrame_=0;
function drawMarketplace(){
  if(!marketActive){marketOpenFrame_=0;return;}
  if(!marketOpenFrame_)marketOpenFrame_=fr;
  const mw=W-60,mh=H-40,mx=30,my=20;
  // Slide in from top (easeOut cubic, 10 frames)
  const tSlide=Math.min(1,(fr-marketOpenFrame_)/10);
  const eSlide=1-Math.pow(1-tSlide,3);
  const myA=my-(1-eSlide)*mh;

  bx(0,0,W,H,'rgba(0,0,0,.75)');
  win(mx,myA,mw,mh);
  // Header: dark green + left accent bar
  bx(mx,myA,mw,28,'#061806');
  bx(mx,myA,4,28,'#40d080');
  txShadow('CARD MARKETPLACE',mx+mw/2-90,myA+20,12,'#40d080','rgba(0,0,0,.5)');

  // Collection progress bar directly below header
  const vault=pl[0].vault||new Set();
  // v263: rebuild per-type cache only when vault changes, not every frame
  if(vault.size!==_mktVaultSz){
    _mktVaultSz=vault.size;
    _mktVaultCache=[];for(const _vid of vault)_mktVaultCache.push(_vid);
    for(let _ti=0;_ti<5;_ti++){
      const tc=_mktTypeCache[_ti];tc.length=0;
      const tp=_MKT_TYPE_FILTER[_ti];
      for(let _vi=0;_vi<_mktVaultCache.length;_vi++){const _id=_mktVaultCache[_vi];if(CD[_id-1]&&CD[_id-1].t===tp)tc.push(_id);}
    }
  }
  const vaultArr=_mktVaultCache||[];
  const collFrac=Math.min(1,vaultArr.length/60);
  const barW=mw-24;
  bx(mx+12,myA+30,barW,5,'#0a180a');
  bx(mx+12,myA+30,Math.floor(barW*collFrac),5,'#40d080');
  txShadow((_UNIQ60[vaultArr.length]||vaultArr.length+'/60')+' collected',mx+mw-100,myA+25,6,'#60c880','rgba(0,0,0,.3)'); // v321

  // Tabs
  for(let i=0;i<MARKET_TABS.length;i++){
    const tab=MARKET_TABS[i];const isActive=marketTab===i;
    const tw=100,tx2=mx+12+i*104;
    bx(tx2,myA+37,tw,22,isActive?'#122812':'#080e08');
    bx(tx2,myA+37,tw,isActive?2:1,isActive?'#40d080':'#1a3a1a');
    if(isActive)bx(tx2,myA+37,2,22,'#40d080');
    txShadow(tab,tx2+8,myA+53,7,isActive?'#40d080':'#4a6a4a',isActive?'rgba(0,0,0,.3)':'rgba(0,0,0,.15)');
  }

  const contentY=myA+63;

  if(marketTab===0){
    // MY CARDS — vault collection grouped by type (_MKT_TYPE_* hoisted to module scope)
    txShadow('Your collection:',mx+12,contentY+14,8,'#a8c8a8','rgba(0,0,0,.3)');
    let yi=contentY+22;
    for(let ti=0;ti<5;ti++){
      const cards=_mktTypeCache[ti]; // v263: pre-computed, no filter alloc
      if(cards.length===0)continue;
      const _tl=cards.length;if(_mktTabKey[ti]!==_tl){_mktTabKey[ti]=_tl;_mktTabLbl[ti]=_MKT_TYPE_LABEL[ti]+' ('+_tl+')';} // v328: lazy
      txShadow(_mktTabLbl[ti],mx+14,yi+10,7,_MKT_TYPE_COLOR[ti],'rgba(0,0,0,.3)');yi+=16;
      const _cLen=Math.min(12,cards.length);
      for(let ci=0;ci<_cLen;ci++){
        const id=cards[ci];const cr=CD[id-1];
        const cx2=mx+14+ci*72;
        if(cx2+68>mx+mw-12)break;
        bx(cx2,yi,66,16,cr.d+'33');
        bx(cx2,yi,3,16,RARITY_COLOR[cr.r]||cr.c);
        txShadow(cr.n,cx2+6,yi+12,5,cr.h||'#f8f0e0','rgba(0,0,0,.3)');
        for(let s=0;s<(cr.r||1);s++)txShadow('\u2605',cx2+6+s*8,yi+24,4,RARITY_COLOR[cr.r],'rgba(0,0,0,.3)');
      }
      if(cards.length>12)txShadow(_MORE_LBL[cards.length-12]||('+'+( cards.length-12)+' more'),mx+14+12*72,yi+12,5,'#888898','rgba(0,0,0,.3)'); // v333: reuse _MORE_LBL
      yi+=30;
    }
  }else if(marketTab===1){
    // BROWSE (_MKT_LISTINGS hoisted to module scope)
    txShadow('On-chain marketplace listings:',mx+12,contentY+14,8,'#a8c8a8','rgba(0,0,0,.3)');
    bx(mx+12,contentY+24,mw-24,1,'#1a3a1a');
    for(let li=0;li<_MKT_LISTINGS.length;li++){
      const listing=_MKT_LISTINGS[li];const cr=CD[listing.card-1];if(!cr)continue;
      const ly=contentY+32+li*40;
      bx(mx+12,ly,mw-24,36,'#0b1a0b');
      bx(mx+12,ly,3,36,RARITY_COLOR[cr.r]||'#888898');
      drawMiniCard(mx+20,ly+8,listing.card);
      txShadow(cr.n,mx+54,ly+14,8,cr.c||'#d0c8a8','rgba(0,0,0,.3)');
      txShadow(RARITY_LABEL[cr.r],mx+54,ly+26,6,RARITY_COLOR[cr.r],'rgba(0,0,0,.3)');
      txShadow(listing.seller,mx+mw-178,ly+14,7,'#9898a8','rgba(0,0,0,.3)');
      txShadow(_MKT_LISTING_PRICE_LBL[li]||(listing.price+' SOL'),mx+mw-108,ly+14,9,'#14F195','rgba(0,0,0,.4)'); // v333
      txShadow('[BUY]',mx+mw-58,ly+22,7,'#40d040','rgba(0,0,0,.4)');
    }
    txShadow('(On-chain trading: coming soon)',mx+12,myA+mh-52,6,'#304830','rgba(0,0,0,.3)');
  }else if(marketTab===2){
    // v420: SELL — card picker grid from vault (on-chain listing stub)
    txShadow('Select a card to list:',mx+12,contentY+14,8,'#a8c8a8','rgba(0,0,0,.3)');
    const sellCards=vaultArr.slice(0,20); // up to 20 cards shown
    if(sellCards.length===0){
      txShadow('No cards in vault yet.',mx+12,contentY+36,7,'#304030','rgba(0,0,0,.3)');
    }else{
      const _cw=56,_ch=36,_cols=8,_gap=6;
      for(let si=0;si<sellCards.length;si++){
        const id=sellCards[si];const cr=CD[id-1];if(!cr)continue;
        const col=si%_cols,row=Math.floor(si/_cols);
        const sx=mx+12+col*(_cw+_gap),sy=contentY+24+row*(_ch+_gap);
        bx(sx,sy,_cw,_ch,cr.d+'44');
        bx(sx,sy,2,_ch,RARITY_COLOR[cr.r]||cr.c);
        txShadow('#'+id,sx+4,sy+13,5,cr.h||'#d0c8a8','rgba(0,0,0,.3)');
        txShadow(cr.n.slice(0,7),sx+4,sy+25,4,'#a0988c','rgba(0,0,0,.2)');
      }
      txShadow('(On-chain listing: coming soon)',mx+12,contentY+24+Math.ceil(sellCards.length/_cols)*(_ch+_gap)+8,6,'#304830','rgba(0,0,0,.3)');
    }
  }
  bx(mx+12,myA+mh-46,mw-24,1,'#1a3a1a');
  txShadow('[←/→] Tabs   \u2502   [X] Close',mx+14,myA+mh-26,7,'#4a7a4a','rgba(0,0,0,.3)');
}

// v187: discard overlay — slide-in + polish (local frame tracker avoids multi-file edit)
let discardOpenFrame_=0;
function drawDiscardOverlay(){
  if(!discardActive){discardOpenFrame_=0;return;}
  if(!discardOpenFrame_)discardOpenFrame_=fr;
  const discardVisible=Math.min(HAND_SIZE,8);
  const panH=60+discardVisible*44+28;
  const panYBase=Math.max(10,H/2-panH/2-20);
  // Slide in from above (easeOut cubic, 8 frames)
  const tSlide=Math.min(1,(fr-discardOpenFrame_)/8);
  const eSlide=1-Math.pow(1-tSlide,3);
  const panY=panYBase-(1-eSlide)*panH;

  bx(0,0,W,H,'rgba(0,0,0,.65)');
  win(W/2-220,panY,440,panH);

  // Header: dark background + incoming card rarity accent stripe
  const pendCr=discardPendingCard>0?CD[discardPendingCard-1]:null;
  const headerRarCol=pendCr?(RARITY_COLOR[pendCr.r]||'#c04040'):'#b06030';
  bx(W/2-220,panY,440,28,'#100810');
  bx(W/2-220,panY,4,28,headerRarCol);

  if(pendCr){
    txShadow('HAND FULL \u2014 Discard a card',W/2-96,panY+20,10,'#d04040','rgba(0,0,0,.4)');
    // Incoming card preview (right side of panel)
    const previewX=W/2+90,previewY=panY+34;
    bx(previewX,previewY,116,88,pendCr.d);bx(previewX+1,previewY+1,114,86,pendCr.c);
    bx(previewX,previewY,3,88,headerRarCol); // rarity left bar on preview
    drawCardCharacter(previewX+4,previewY+4,discardPendingCard,1.4,fr);
    txShadow('INCOMING:',previewX,previewY+66,5,'#c0a880','rgba(0,0,0,.3)');
    txShadow(pendCr.n,previewX,previewY+78,7,headerRarCol,'rgba(0,0,0,.3)');
    for(let s=0;s<(pendCr.r||1);s++)txShadow('\u2605',previewX+s*10,previewY+89,8,headerRarCol,'rgba(0,0,0,.3)');
    txShadow(pendCr.f||'',previewX,previewY+100,5,'#c0b888','rgba(0,0,0,.3)');
  }else{
    txShadow('DISCARD a card',W/2-70,panY+20,10,'#b06030','rgba(0,0,0,.4)');
  }

  // Card list
  const discardStart=Math.max(0,discardSelIdx-3);
  for(let vi=0;vi<discardVisible;vi++){
    const i=discardStart+vi;
    if(i>=HAND_SIZE)break;
    const cd=pl[0].cd[i],cy=panY+36+vi*44;
    const sel=(i===discardSelIdx);
    if(sel){
      bx(W/2-208,cy,202,40,'rgba(192,80,80,.18)');
      bx(W/2-208,cy,202,1,'#c04040');
      bx(W/2-208,cy,3,40,'#c04040'); // selected: red left accent bar
    }
    if(cd>0){
      const cr=CD[cd-1];
      bx(W/2-200,cy+6,28,28,cr.d);bx(W/2-198,cy+8,24,24,cr.c);
      drawCardCharacter(W/2-197,cy+8,cd,0.9,fr);
      txShadow(cr.n,W/2-160,cy+18,7,sel?'#ff6060':'#d0c8a8','rgba(0,0,0,.35)');
      // Rarity stars inline
      {const rar=cr.r||1;const rc=RARITY_COLOR[rar]||'#888898';for(let s=0;s<rar;s++)txShadow('\u2605',W/2-36+s*7,cy+18,5,rc,'rgba(0,0,0,.3)');}
      // Decay timer bar
      if(cardTimers[i]>0){
        const remMs=Math.max(0,CARD_DECAY_MS-(Date.now()-cardTimers[i]));
        const remFrac=remMs/CARD_DECAY_MS;
        const secs=Math.ceil(remMs/1000);
        const timeStr=_DECAY_TIME_LBL[secs]||(secs+'s'); // v338: pre-baked, eliminates 3 allocs/card/frame
        const barCol=remFrac>0.5?'#40d040':remFrac>0.25?'#d0c040':'#d04040';
        bx(W/2-160,cy+28,80,3,'#181828');
        bx(W/2-160,cy+28,Math.floor(80*remFrac),3,barCol);
        txShadow(timeStr,W/2-74,cy+32,5,remFrac<0.25?'#ff5050':'#b0b090','rgba(0,0,0,.3)');
      }else{
        txShadow('safe',W/2-160,cy+32,5,'#60c060','rgba(0,0,0,.3)');
      }
    }else{
      txShadow('(empty slot)',W/2-160,cy+22,6,'#706050','rgba(0,0,0,.3)');
    }
    if(sel)txShadow('\u25B6',W/2-214,cy+24,7,'#c04040','rgba(0,0,0,.4)');
  }
  txShadow('[Z] Discard  \u2502  [X] Skip',W/2-80,panY+panH-12,7,'#a898c8','rgba(0,0,0,.4)');
}

// ═══════════════════════════════════════
// TUTORIAL MESSAGE OVERLAY
// ═══════════════════════════════════════
function drawTutorialMsg(){
  if(tutorialMsgTimer<=0||!tutorialMsg)return;
  tutorialMsgTimer--;
  const alpha=tutorialMsgTimer>20?1:tutorialMsgTimer/20;
  g.globalAlpha=alpha;
  // Wider window with colored header stripe
  const tmW=440,tmH=44,tmX=W/2-tmW/2,tmY=H-90;
  win(tmX,tmY,tmW,tmH);
  bx(tmX,tmY,tmW,3,'#3060b0');
  txShadow('HINT',tmX+8,tmY+16,8,'#3060b0','rgba(0,0,0,.3)');
  txShadow(tutorialMsg,tmX+46,tmY+16,7,'#e8e0c8','rgba(0,0,0,.4)');
  g.globalAlpha=1;
}

// Intro tutorial: now PixiJS-native
const pxIntro = new PIXI.Container();
pxIntro.visible = false;
pixiLayers.ui.addChild(pxIntro);
// Dark overlay
const pxIntroDim = new PIXI.Graphics();
pxIntroDim.beginFill(0x08081A, 0.88); pxIntroDim.drawRect(0, 0, W, H); pxIntroDim.endFill();
pxIntro.addChild(pxIntroDim);
// Title
const pxIntroTitle = pxTextShadow('0xARK', 42, 0xF8F0E0);
pxIntroTitle.anchor = {x:0.5,y:0}; pxIntroTitle.x = W/2; pxIntroTitle.y = 50;
pxIntro.addChild(pxIntroTitle);
const pxIntroSub = pxTextShadow('THE RULES', 20, 0xA07848);
pxIntroSub.anchor = {x:0.5,y:0}; pxIntroSub.x = W/2; pxIntroSub.y = 95;
pxIntro.addChild(pxIntroSub);
// Page indicator
const pxIntroPage = pxTextShadow('1/6', 16, 0x686068);
pxIntroPage.anchor = {x:0.5,y:0}; pxIntroPage.x = W/2; pxIntroPage.y = 120;
pxIntro.addChild(pxIntroPage);
// Window
const pxIntroWin = pxWin(500, 200);
pxIntroWin.x = W/2-250; pxIntroWin.y = 145;
pxIntro.addChild(pxIntroWin);
// Text content (3 lines)
const pxIntroLines = [];
for(let i=0;i<3;i++){
  const lt = pxText('', 24, PX_FRLG.textColor);
  lt.x = W/2-230; lt.y = 168 + i*36;
  pxIntro.addChild(lt);
  pxIntroLines.push(lt);
}
// Bouncing arrow
const pxIntroArrow = pxTextShadow('\u25BC Z', 18, PX_FRLG.selHighlight);
pxIntroArrow.x = W/2+180; pxIntroArrow.y = 320;
pxIntro.addChild(pxIntroArrow);
// Card teaser
const pxIntroCardMsg = pxTextShadow('You receive a spirit card...', 20, 0xF0C830);
pxIntroCardMsg.anchor = {x:0.5,y:0}; pxIntroCardMsg.x = W/2; pxIntroCardMsg.y = 360;
pxIntroCardMsg.visible = false;
pxIntro.addChild(pxIntroCardMsg);

function updatePixiIntro(){
  pxIntro.visible = introActive;
  if(!introActive)return;
  const t = fr - introFrame;
  // Fade in title
  pxIntroTitle.alpha = Math.min(1, t/20);
  pxIntroSub.alpha = Math.min(1, t/20);
  // Page number
  pxIntroPage.text = (introPage+1)+'/'+INTRO_PAGES.length;
  // Update text lines
  const pageText = INTRO_PAGES[introPage];
  const lines = pageText.split('\n');
  for(let i=0;i<pxIntroLines.length;i++){
    pxIntroLines[i].text=lines[i]||'';
    const fadeT=Math.max(0,t-5-i*8);
    pxIntroLines[i].alpha=Math.min(1,fadeT/10);
  }
  // Bouncing arrow
  pxIntroArrow.y = 320 + _sFr10*3; // v377: cached
  pxIntroArrow.visible = t > 30 && Math.floor(fr/20)%2===0;
  // Card teaser on last page
  pxIntroCardMsg.visible = introPage===INTRO_PAGES.length-1 && t>20 && cdCount(pl[0].cd)===0;
  if(pxIntroCardMsg.visible) pxIntroCardMsg.alpha = Math.min(1,(t-20)/15);
}

function drawIntroTutorial(){
  if(!_isMobile)return; // Desktop: handled by PixiJS (updatePixiIntro)
  if(!introActive)return;
  const t=fr-introFrame;
  bx(0,0,W,H,'rgba(8,8,20,0.88)');
  g.globalAlpha=Math.min(1,t/20);
  txShadow('0xARK',W/2-64,80,24,'#f8f0e0','rgba(0,0,0,.6)');
  txShadow('THE RULES',W/2-44,108,10,'#a07848','rgba(0,0,0,.4)');
  txShadow(_INTRO_PG_LBL[introPage]||((introPage+1)+'/'+INTRO_PAGES.length),W/2-16,140,7,'#686068','rgba(0,0,0,.3)'); // v328
  g.globalAlpha=1;
  const wx=W/2-240,wy=160,ww=480,wh=180;
  win(wx,wy,ww,wh);
  const lines=INTRO_PAGES[introPage].split('\n');
  for(let i=0;i<lines.length;i++){
    g.globalAlpha=Math.min(1,Math.max(0,t-5-i*8)/10);
    txShadow(lines[i],wx+20,wy+30+i*28,9,'#484050','rgba(255,255,255,.15)');
    g.globalAlpha=1;
  }
  if(t>30&&Math.floor(fr/20)%2===0)txShadow('\u25BC Z',wx+ww-60,wy+wh-20+_sFr10*3,8,FRLG.selHighlight,'rgba(0,0,0,.3)'); // v377: cached
  if(introPage===INTRO_PAGES.length-1&&t>20&&cdCount(pl[0].cd)===0){
    g.globalAlpha=Math.min(1,(t-20)/15);
    txShadow('You receive a spirit card...',W/2-100,wy+wh+20,8,'#f0c830','rgba(0,0,0,.4)');
    g.globalAlpha=1;
  }
}

// ═══════════════════════════════════════
// AREA CARD INFO
// ═══════════════════════════════════════
const AREA_CARD_DESC=[
  'The only safe harbor left on ARK Isle',            // Town
  'Common & Uncommon cards haunt the flooded halls',  // B1 Sunken Galleries
  'Drowned scholars left Uncommon cards behind',      // B2 Drowned Archives
  'Ancient engines hum — Rare cards pulse within',    // B3 Echo Chambers
  'Epic cards sealed here by the ARK\'s last crew',   // B4 The Deep Vault
  'The ARK\'s heart. Legendary cards await an heir',  // B5 ARK Core
];
// Card area location info (indexed by card rarity)
const CARD_AREA_INFO=CD.map(card=>{
  const rarityMap=['','Floor 1','Floor 2','Floor 3','Floor 4','Floor 5'];
  return rarityMap[card.r]||'Dungeon';
});
// Card type labels
const CARD_TYPE_LABEL={attack:'Attack',defense:'Defense',flee:'Flee',magic:'Magic',recovery:'Recovery'};
const RARITY_LABEL=['','Common','Uncommon','Rare','Epic','Legendary'];
const RARITY_COLOR=['','#888898','#60b060','#6090d8','#c060c0','#f0c830'];

// ═══════════════════════════════════════
// VICTORY SCREEN
// ═══════════════════════════════════════
function dVictory(){
  const t=fr-victoryFrame;
  if(t<30){g.globalAlpha=t/30;g.fillStyle=_RC('menu_blue');g.fillRect(0,0,W,H);g.globalAlpha=1;return;}
  // B2-7: GBA Victory backdrop — radial amber→red→navy
  bx(0,0,W,H,_RC('menu_blue'));
  const _vgr=g.createRadialGradient(W/2,H*0.65,0,W/2,H*0.65,H*0.75);
  _vgr.addColorStop(0,_RC('mira_amber'));
  _vgr.addColorStop(0.38,_RC('flag_red'));
  _vgr.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=_vgr;g.globalAlpha=0.8;g.fillRect(0,0,W,H);g.globalAlpha=1;
  // Sparkle star decorators (✦ pulse)
  const _vstPos=[[30,40],[W-50,60],[80,H-70],[W-32,H-52]];
  for(let _vi=0;_vi<4;_vi++){
    const _vp=0.7+(_sFr08*_IDX_CI[_vi]+_cFr08*_IDX_SI[_vi])*0.3;
    g.globalAlpha=_vp;
    txShadow('\u2726',_vstPos[_vi][0],_vstPos[_vi][1]+8,_vi%2===0?8:5,_RC('menu_border'),'rgba(0,0,0,.4)');
    g.globalAlpha=1;
  }

  for(let i=0;i<8;i++){
    const st=(t+i*60)%200;
    if(st<30){const sx=50+i*55+st*3,sy=20+i*15+st*1.5;
      g.fillStyle=_RC('mira_amber');for(let j=0;j<4;j++){g.globalAlpha=Math.max(0,.6-j*.15);g.fillRect(sx-j*4,sy-j*2,2,1);}g.globalAlpha=1;
    }
  }
  for(let i=0;i<20;i++){
    const px_=(i*73+t*(.5+i*.03))%W,py_=(i*41+t*(1+i*.02))%H;
    bx(px_,py_,3,2,_CONFETTI_COLS[i%4]); // v272: hoisted
  }

  if(t>35){
    g.globalAlpha=Math.min(1,(t-35)/20);
    // B2-7: GBA title panel
    win(W/2-160,78,320,34);
    // Purple rune aura behind title
    g.globalAlpha*=0.3+_sFr08*0.15;bx(W/2-156,80,312,28,ARK.rune); // v370: cached
    g.globalAlpha=Math.min(1,(t-35)/20);
    txShadow('THE SEAL IS BROKEN',W/2-144,100,14,_RC('menu_border'),'rgba(0,0,0,.5)');
    g.globalAlpha=1;
  }
  if(t>40){g.globalAlpha=Math.min(1,(t-40)/15);txShadow('Information asymmetry is the ultimate weapon',W/2-180,124,7,_RC('mira_amber'),'rgba(0,0,0,.5)');g.globalAlpha=1;}
  if(t>45){g.globalAlpha=Math.min(1,(t-45)/15);drawBattleSprite(pl[0],W/2,200,3,false);g.globalAlpha=1;}

  if(t>60){
    // Show up to 7 hand cards in a fan — v269: typed buffer, no map/filter/slice
    const cardsT=t-60;
    let _vcN=0;for(let _vi=0;_vi<pl[0].cd.length&&_vcN<7;_vi++){if(pl[0].cd[_vi]>0)_vcHandBuf[_vcN++]=pl[0].cd[_vi];}
    const totalShow=_vcN;
    for(let si=0;si<totalShow;si++){
      if(cardsT<si*12)break;
      const cardT=cardsT-si*12,slideIn=Math.min(1,cardT/12);
      const angle=(si-(totalShow-1)/2)*0.2;
      const cx_=W/2+(si-(totalShow-1)/2)*80,cy_=340+Math.abs(si-(totalShow-1)/2)*8;
      g.globalAlpha=slideIn;g.save();g.translate(cx_,cy_);g.rotate(angle*.25);
      const cd=_vcHandBuf[si];
      drawCardFrame(-22,-32,44,62,cd-1,true);
      g.restore();g.globalAlpha=1;
      // v393: N=4 orbit unrolled — sin(i*π/2) = {0,1,0,-1}, cos = {1,0,-1,0}
      if(cardT>0&&cardT<20){
        const _spS=Math.sin(cardT*.2),_spC=Math.cos(cardT*.2),_spd=8+cardT*.6;
        g.globalAlpha=Math.max(0,1-cardT/20);g.fillStyle=_RC('sparkle_cream');
        g.fillRect(cx_+_spC*_spd,cy_+_spS*_spd,2,2);
        g.fillRect(cx_-_spS*_spd,cy_+_spC*_spd,2,2);
        g.fillRect(cx_-_spC*_spd,cy_-_spS*_spd,2,2);
        g.fillRect(cx_+_spS*_spd,cy_-_spC*_spd,2,2);
        g.globalAlpha=1;
      }
    }
    // Vault count display
    if(cardsT>30){
      const vaultSize=pl[0].vault?pl[0].vault.size:0;
      g.globalAlpha=Math.min(1,(cardsT-30)/20);
      txShadow(vaultSize+'/60 UNIQUE',W/2-60,390,9,_RC('menu_border'),'rgba(0,0,0,.5)');
      g.globalAlpha=1;
    }
  }

  // Stats + Solana row (same height range, side by side)
  if(t>130){
    g.globalAlpha=Math.min(1,(t-130)/15);
    win(W/2-200,420,400,28);
    const _elapsed=getPlayElapsed();const _em=Math.floor(_elapsed/60000);const _es=Math.floor((_elapsed%60000)/1000);
    const vaultSize=pl[0].vault?pl[0].vault.size:0;
    txShadow(`Time: ${_em}m${('0'+_es).slice(-2)}s   Battles: ${rd}   Cards: ${vaultSize}/60`,W/2-188,440,7,_RC('text_light'),'rgba(0,0,0,.35)');
    g.globalAlpha=1;
  }
  // "You collected all 60" message
  if(t>140){
    win(6,456,W-12,28);
    if(playerHasAllSixty()){txShadow('You collected all 60 cards and claimed the Prize Pool!',14,476,7,_RC('text_dark'),'rgba(255,255,255,.15)');}
    else{txShadow('Time ran out! You collected '+hasUniqueCards(0).size+'/60 unique cards.',14,476,7,_RC('flag_red'),'rgba(0,0,0,.35)');}
  }
  // Prize distribution display
  if(t>148){
    g.globalAlpha=Math.min(1,(t-148)/15);
    win(W/2-200,490,400,22);
    txShadow('1ST: 60%  |  2ND: 25%  |  3RD: 15%',W/2-150,506,7,_RC('menu_border'),'rgba(0,0,0,.4)');
    g.globalAlpha=1;
  }
  // "Verified on Solana" branding
  if(t>152){
    g.globalAlpha=Math.min(1,(t-152)/15);
    drawSolanaLogo(W/2-110,518,10);
    txShadow('Soul-inscribed on Solana',W/2-106,522,7,'#9945FF','rgba(0,0,0,.4)');
    g.globalAlpha=1;
  }
  // Prize claim button — C to trigger
  if(t>158&&playerHasAllSixty()){
    g.globalAlpha=Math.min(1,(t-158)/15);
    win(W/2-190,536,380,28);
    drawSolanaIcon(W/2-170,540,8);
    if(victoryClaimed){
      txShadow('\u2713 Grand Seal Claimed! TX: '+victoryClaimedTx,W/2-162,554,7,'#14F195','rgba(0,0,0,.4)');
    }else if(walletConnected){
      const claimBlink=_sFr10*0.15+0.85; // v370: cached
      g.globalAlpha*=claimBlink;
      txShadow('[C] BREAK THE SEAL: '+stakePotAmount.toFixed(2)+' SOL',W/2-165,554,8,'#14F195','rgba(0,0,0,.4)');
    }else{
      txShadow('Connect wallet to claim '+stakePotAmount.toFixed(2)+' SOL prize',W/2-165,554,7,_RC('text_light'),'rgba(0,0,0,.35)');
    }
    g.globalAlpha=1;
  }
  // MINT YOUR CARDS AS NFTs button — M to trigger
  if(t>162&&playerHasAllSixty()){
    g.globalAlpha=Math.min(1,(t-162)/15);
    win(W/2-180,568,360,24);
    if(victoryMinted){
      txShadow('\u2713 60 Relics soul-bound on Solana!',W/2-160,584,8,'#9945FF','rgba(0,0,0,.4)');
    }else if(victoryMinting){
      const bar=Math.floor((victoryMintProgress/60)*28);
      bx(W/2-140,573,bar*5,14,'rgba(153,69,255,.5)');
      txShadow(_INSCRIBING_LBL[victoryMintProgress]||('Inscribing '+victoryMintProgress+'/60...'),W/2-88,584,8,'#c090ff','rgba(0,0,0,.4)'); // v328
    }else{
      const mintBlink=_sFr08*0.12+0.88; // v370: cached
      g.globalAlpha*=mintBlink;
      txShadow('[M] INSCRIBE SOULS ON SOLANA',W/2-148,584,8,'#9945FF','rgba(0,0,0,.4)');
    }
    g.globalAlpha=1;
  }
  // Eternal inscription + LEGENDS
  if(t>166){
    g.globalAlpha=Math.min(1,(t-166)/15);
    win(W/2-160,596,320,22);
    const bcr=stats.bestClearRounds;const bct=stats.bestClearTime;
    const bcText=bcr>0?'BEST: Round '+bcr+' ('+Math.floor(bct/60)+'m'+('0'+(bct%60)).slice(-2)+'s)':'BEST CLEAR: not yet recorded';
    txShadow(bcText,W/2-140,612,6,bcr>0?_RC('menu_border'):_RC('text_light'),'rgba(0,0,0,.35)');
    g.globalAlpha=1;
  }
  if(t>170){
    win(W/2-200,H-24,400,20);
    // v420: include T=Share shortcut in hints bar
    const hints=playerHasAllSixty()?'C=Claim  M=Mint  T=Share  Z=Play Again  X=Title':'T=Share  Z=Play Again   X=Title';
    txShadow(hints,W/2-190,H-6,7,_RC('menu_border'),'rgba(0,0,0,.4)');
  }
  if(t===31)sfxVictory();
}

// ═══════════════════════════════════════
// CARDS COLLECTION SCREEN (GDD v1.0 — 60 cards, paginated)
// ═══════════════════════════════════════
let crdPage=0; // 0-1 (page 0 = cards 1-40, page 1 = cards 41-60)
const CRD_PER_PAGE=40; // B2-6: 8-col × 5-row binder grid
const CRD_COLS=8;
const CRD_ROWS=5;
const CRD_MAX_PAGE=1; // 2 pages total (0 and 1)
// v75: Card detail panel
let crdCursor=0; // currently highlighted card (0-39 within page)
let crdDetailActive=false; // showing full detail view
function dCrd(){
  // B2-6: GBA binder layout — 8×5 grid, 2 pages (1-40 / 41-60)
  const vault=pl[0].vault||new Set();
  const collected=vault.size;

  // Full background fill
  bx(0,0,W,H,_RC('menu_blue'));

  // HUD strip
  win(0,0,W,26);
  txShadow('BINDER \u00B7 '+collected+'/60',8,18,8,_RC('menu_border'),'rgba(0,0,0,.5)');
  txShadow('\u25BA CLOSE',W-60,18,7,_RC('text_light'),'rgba(0,0,0,.4)');
  // Thin progress bar under HUD
  bx(8,22,W-16,3,_RC('text_dark'));
  bx(8,22,Math.round((W-16)*Math.min(1,collected/60)),3,collected>=60?_RC('menu_border'):_RC('vega_pulse'));

  // Binder grid — 8 cols × 5 rows = 40 per page
  const pageStart=crdPage*CRD_PER_PAGE;
  const SLOT_W=53,SLOT_H=51,SLOT_GAP=4;
  const gridX=Math.floor((W-SLOT_W*CRD_COLS-SLOT_GAP*(CRD_COLS-1))/2);
  const gridY=30;
  for(let i=0;i<CRD_PER_PAGE;i++){
    const cardIdx=pageStart+i;
    if(cardIdx>=60)break;
    const cardId=cardIdx+1;
    const cr=CD[cardIdx];
    const col_=i%CRD_COLS,row_=Math.floor(i/CRD_COLS);
    const cx_=gridX+col_*(SLOT_W+SLOT_GAP);
    const cy_=gridY+row_*(SLOT_H+SLOT_GAP);
    const owned_=vault.has(cardId);
    drawGBABinderSlot(cx_,cy_,SLOT_W,SLOT_H,cardId,owned_,(i===crdCursor),cr?cr.r||1:1);
  }

  // Bottom navigation bar
  bx(0,H-22,W,22,_RC('text_dark'));
  bx(0,H-22,W,1,_RC('menu_border'));
  if(crdPage>0) txShadow('\u25C4 PREV',10,H-6,7,_RC('text_light'),'rgba(0,0,0,.4)');
  txShadow('PAGE '+(crdPage+1)+'/2',W/2-26,H-6,7,_RC('menu_border'),'rgba(0,0,0,.4)');
  if(crdPage<CRD_MAX_PAGE) txShadow('NEXT \u25BA',W-54,H-6,7,_RC('text_light'),'rgba(0,0,0,.4)');
  txShadow('Z=DETAIL  X=CLOSE',W/2-44,H-6,5,'rgba(200,200,180,.5)','rgba(0,0,0,.3)');
}

// ═══════════════════════════════════════
// v75: CARD DETAIL PANEL
// ═══════════════════════════════════════
// v278: Pre-bake source hints at startup — getCardSourceHint() becomes O(1) array lookup
const CARD_SOURCE_HINTS=(()=>{
  const h=new Array(61).fill('Gacha / Trade');
  for(let f=1;f<=5;f++){
    const pool=DUNGEON_FLOOR_CARDS[f];if(!pool)continue;
    const name=_FLOOR_NAMES_TC[f];
    for(let i=0;i<pool.length;i++){const id=pool[i];h[id]=h[id]==='Gacha / Trade'?name:h[id]+' / '+name;}
  }
  return h;
})();
function getCardSourceHint(cardId){return CARD_SOURCE_HINTS[cardId]||'Gacha / Trade';}
// v346: pre-baked per-card label arrays (avoids per-frame string alloc in card browser + detail panel)
const _CARD_NUM_LBL=(()=>{const a=[];for(let i=0;i<=60;i++)a.push('#'+String(i).padStart(2,'0'));return a;})();
const _CARD_FIND_LBL=(()=>{const a=[];for(let i=0;i<=60;i++)a.push('Find: '+(CARD_SOURCE_HINTS[i]||'Gacha / Trade'));return a;})();
const _CARD_FOUND_LBL=(()=>{const a=[];for(let i=0;i<=60;i++)a.push('Found: '+(CARD_SOURCE_HINTS[i]||'Gacha / Trade'));return a;})();
// v346: lazy caches for card detail panel per-cr fields
let _detAbilityLbl='',_detAbilityRef=null;
// v434: lazy cache for flavor text word-wrap (expensive split+loop, runs every frame while panel open)
let _detFlavorRef=null,_detFlavorLines=[];
function drawCardDetailPanel(){
  if(!crdDetailActive)return;
  const typeStart=crdPage*CRD_PER_PAGE;
  const cardIdx=typeStart+crdCursor;
  if(cardIdx>=CD.length){crdDetailActive=false;return;}
  const cr=CD[cardIdx];
  const cardId=cardIdx+1;
  const vault=pl[0].vault||new Set();
  const owned=vault.has(cardId);

  bx(0,0,W,H,'rgba(0,0,0,.82)');

  const pw=360,ph=420,px_=W/2-pw/2,py_=H/2-ph/2;
  bx(px_,py_,pw,ph,owned?cr.d:'#18161a');
  bx(px_+1,py_+1,pw-2,ph-2,owned?cr.c:'#12101e');
  bx(px_,py_,pw,1,owned?cr.h:'#30285a');
  bx(px_,py_+ph-1,pw,1,owned?cr.h:'#30285a');

  // Large card art area
  const artH=160;
  bx(px_+2,py_+2,pw-4,artH,owned?cr.d:'#0e0c18');
  if(owned){drawCardCharacter(px_+pw/2-16,py_+8,cardId,2.2,fr);}
  else{txShadow('?',px_+pw/2-18,py_+artH/2+16,40,'#201e38','rgba(0,0,0,.3)');}

  // Rarity stars
  const rar=cr.r||1;
  const rarCol=RARITY_COLOR[rar]||'#888898';
  const rarLabel=RARITY_LABEL[rar]||'';
  for(let s=0;s<rar;s++)txShadow('\u2605',px_+14+s*18,py_+artH+18,10,rarCol,'rgba(0,0,0,.35)');
  txShadow(rarLabel,px_+14+rar*18+6,py_+artH+18,7,rarCol,'rgba(0,0,0,.35)');

  // Card name
  const nameFs=Math.max(10,Math.min(16,Math.floor(pw/(cr.n.length*0.72))));
  txShadow(cr.n,px_+pw/2-(cr.n.length*nameFs/2.4),py_+artH+32,nameFs,owned?'#f0e8d0':'#403858','rgba(0,0,0,.5)');

  // Type — v346: use existing _CRD_TYPE_FULL lookup (eliminates inline object alloc)
  const tLabel=_CRD_TYPE_FULL[cr.t]||cr.t.toUpperCase();
  txShadow(tLabel,px_+pw/2-tLabel.length*3.5,py_+artH+50,7,owned?(cr.h||'#aaa'):'#40385a','rgba(0,0,0,.35)');

  // Separator
  bx(px_+20,py_+artH+58,pw-40,1,owned?cr.h+'80':'#20183040');

  // Effect / ability — v346: lazy cache keyed on cr reference
  if(cr.f){
    if(_detAbilityRef!==cr){_detAbilityRef=cr;_detAbilityLbl='ABILITY: '+cr.f;}
    txShadow(_detAbilityLbl,px_+20,py_+artH+76,7,owned?'#f0e0c0':'#403858','rgba(0,0,0,.35)');
  }

  // Flavor text — v434: lazy word-wrap cache (split+loop was repeating every frame)
  if(cr.fl&&owned){
    if(_detFlavorRef!==cr){
      _detFlavorRef=cr;_detFlavorLines=[];
      const _flWords=cr.fl.split(' ');let _flLine='';const _flMaxW=42;
      for(let _wi=0;_wi<_flWords.length;_wi++){
        const w=_flWords[_wi];
        if((_flLine+w).length>_flMaxW){_detFlavorLines.push(_flLine.trim());_flLine=w+' ';}
        else _flLine+=w+' ';
      }
      if(_flLine.trim())_detFlavorLines.push(_flLine.trim());
    }
    for(let li=0;li<_detFlavorLines.length;li++){
      g.globalAlpha=0.7;
      txShadow('\u201C'+_detFlavorLines[li]+(li===_detFlavorLines.length-1?'\u201D':''),px_+20,py_+artH+96+li*16,6,'#c0b888','rgba(0,0,0,.3)');
      g.globalAlpha=1;
    }
  }else if(!owned){
    txShadow('??? — Card not yet collected',px_+20,py_+artH+96,6,'#302848','rgba(0,0,0,.3)');
  }

  // T61: 4-axis stat bars (Power / Speed / Cost / Duration)
  if(owned&&cr.pw!==undefined){
    const statY=py_+ph-90,statW=pw-40,barH=5;
    const stats_=[['PWR',cr.pw,10,'#e05838'],['SPD',cr.sp,5,'#38b868'],['COST',cr.ct,3,'#b858e8'],['DUR',cr.du,3,'#e0b030']];
    txShadow('STATS',px_+20,statY-2,5,'#707080','rgba(0,0,0,.3)');
    bx(px_+20,statY,statW,1,'#30285060');
    for(let si=0;si<stats_.length;si++){
      const [lbl,val,max,col]=stats_[si];
      const sY=statY+4+si*14;
      txShadow(lbl,px_+20,sY+barH,5,'#888898','rgba(0,0,0,.3)');
      const bx_=px_+58,bW=statW-42;
      bx(bx_,sY,bW,barH,'#181830');
      bx(bx_,sY,Math.round(bW*val/max),barH,col);
      txShadow(String(val),bx_+bW+4,sY+barH,5,col,'rgba(0,0,0,.3)');
    }
    bx(px_+20,statY+4+4*14,statW,1,'#30285060');
  }

  // Source hint — v346: pre-baked array lookup
  txShadow(_CARD_FOUND_LBL[cardId]||('Found: '+getCardSourceHint(cardId)),px_+20,py_+ph-44,6,owned?'#908880':'#302848','rgba(0,0,0,.35)');

  // In-hand indicator
  const inHand=pl[0].cd.includes(cardId);
  if(inHand)txShadow('\u2665 IN HAND',px_+20,py_+ph-28,6,'#d08050','rgba(0,0,0,.35)');
  else if(owned)txShadow('\u2713 IN VAULT',px_+20,py_+ph-28,6,'#50b050','rgba(0,0,0,.35)');
  else txShadow('\u2715 NOT COLLECTED',px_+20,py_+ph-28,6,'#604060','rgba(0,0,0,.3)');

  txShadow('X = BACK',px_+pw-70,py_+ph-28,6,'#686878','rgba(0,0,0,.35)');
}

// ═══════════════════════════════════════
// LOG SCREEN
// ═══════════════════════════════════════
function dLog(){
  // v120: Log screen overhaul — event icons + stats header
  bx(0,0,W,H,'#0c0c18');
  // v420: deterministic twinkle (same fix as dStats) — no Math.random() per frame
  g.fillStyle='#ffffff';
  for(let i=0;i<120;i++){
    const nx=(i*73+17)%W,ny=(i*41+23)%H;
    g.globalAlpha=0.01+Math.abs(Math.sin(fr*0.07+i*1.3))*0.03;g.fillRect(nx,ny,1,1);
  }
  g.globalAlpha=1;

  // Header
  win(16,10,W-32,38);
  txShadow('BATTLE LOG',W/2-80,34,12,'#f0e8c0','rgba(0,0,0,.5)');

  // v120: Compact stats banner (battles / cards gained / cards lost / collection)
  const vaultSz=pl[0].vault?pl[0].vault.size:0;
  const statBannerY=52;
  win(16,statBannerY,W-32,26);
  bx(16,statBannerY,W-32,2,'#3048a0');
  // v272: Stat banner — 4 slots inlined, zero array alloc per frame
  {const _vc=vaultSz>=60?'#f0c830':'#7888c8';
  const _sd=['#c04848','#50e090','#d04040',_vc];
  const _sv=[rd+'',stats.cardsCollected+'',stats.cardsLost+'',vaultSz+'/60'];
  for(let si=0;si<4;si++){
    const sx=36+si*230;
    txShadow(_LOG_STAT_ICONS[si],sx,statBannerY+18,8,_sd[si],'rgba(0,0,0,.35)');
    txShadow(_sv[si],sx+12,statBannerY+18,8,'#f0e8d0','rgba(0,0,0,.35)');
    if(_LOG_STAT_LABELS[si])txShadow(_LOG_STAT_LABELS[si],sx+12+_sv[si].length*7,statBannerY+18,6,'#505070','rgba(0,0,0,.3)');
  }}

  // Scrollable log entries
  const entryH=30;
  const maxVisible=14;
  const padTop=84;
  const totalEntries=lg.length;
  const maxScroll=Math.max(0,totalEntries-maxVisible);
  logScrollOff=Math.max(0,Math.min(logScrollOff,maxScroll));
  const startIdx=Math.max(0,totalEntries-maxVisible-logScrollOff);
  const endIdx=Math.min(totalEntries,startIdx+maxVisible);
  // Direct index access — eliminates lg.slice() array alloc + forEach closure per log frame
  const visibleCount=endIdx-startIdx;

  // Single window for all entries
  win(16,padTop-6,W-32,maxVisible*entryH+12);

  for(let i=0;i<visibleCount;i++){
    const _lgIdx=startIdx+i;const l=lg[_lgIdx];const y=padTop+i*entryH;
    // v303: lazy classify — compute once per entry index, O(1) on repeat frames
    if(!_lgMeta[_lgIdx])_lgMeta[_lgIdx]=_classifyLog(l);
    const{col,icon}=_lgMeta[_lgIdx];
    // Recent entries (last 3) get slight highlight
    const isRecent=totalEntries-logScrollOff-endIdx+i>=totalEntries-3;
    if(isRecent&&logScrollOff===0){
      g.globalAlpha=0.12;bx(22,y,W-44,entryH-2,col);g.globalAlpha=1;
    }
    // Icon box
    bx(24,y+6,16,16,'rgba(0,0,0,.5)');
    bx(24,y+6,16,1,col);
    txShadow(icon,25,y+18,8,col,'rgba(0,0,0,.35)');
    // Entry text
    const maxChars=70;
    const displayText=l.length>maxChars?l.substring(0,maxChars)+'..':l;
    txShadow(displayText,46,y+18,10,col,'rgba(0,0,0,.7)');
    // Thin separator
    if(i<visibleCount-1) bx(40,y+entryH-2,W-80,1,'#161628');
  }

  // Scroll indicators
  if(logScrollOff<maxScroll){
    const blink=Math.floor(fr/20)%2===0;
    if(blink)txShadow('\u25B2 older',W/2-40,padTop-4,7,'#d8b028','rgba(0,0,0,.4)');
  }
  if(logScrollOff>0){
    const blink=Math.floor(fr/20)%2===0;
    if(blink)txShadow('\u25BC newer',W/2-40,padTop+maxVisible*entryH+6,7,'#d8b028','rgba(0,0,0,.4)');
  }

  // Entry count
  txShadow(totalEntries+' entries',W-140,H-16,7,'#484858','rgba(0,0,0,.3)');

  // Back prompt
  win(W/2-100,H-36,200,26);
  txShadow('X = Back',W/2-32,H-16,8,FRLG.selHighlight,'rgba(0,0,0,.4)');
}

// ═══════════════════════════════════════
// TITLE OPTIONS OVERLAY (Phase B2-1, v452)
// Opened from Title screen via X key. Holds BIND VAULT / MULTIPLAYER /
// CREDITS — the connective-tissue menu items not present in the
// preview-strict 2-item main menu. Reuses drawGBADialog primitive.
// ═══════════════════════════════════════
function drawTitleOptionsOverlay(){
  if(!optionsOverlayOpen) return;
  // Scrim
  bx(0,0,W,H, window.TOKENS.resolveColor('overlay_scrim'));
  // Dialog — 360×220 centered
  const dw=360, dh=220;
  const dx=((W-dw)/2)|0, dy=((H-dh)/2)|0;
  drawGBADialog(dx, dy, dw, dh, 'menu_blue', 'text_dark', 'menu_border');
  // Title
  const accent=window.TOKENS.resolveColor('gold_accent');
  txShadow('OPTIONS', dx+24, dy+34, 18, accent, 'rgba(0,0,0,0.5)');
  // Underline under header (gold hairline across dialog interior)
  bx(dx+20, dy+46, dw-40, 1, window.TOKENS.resolveColor('menu_border'));

  // Menu rows — 3 items, 28px step
  const rowX=dx+32, rowY0=dy+64, rowStep=36, rowW=dw-64;
  const sel=optionsMenuIdx|0;
  drawMenuButton(rowX, rowY0,           rowW,
    walletConnected ? 'UNBIND VAULT' : 'BIND VAULT', sel===0, 16);
  drawMenuButton(rowX, rowY0+rowStep,   rowW, 'MULTIPLAYER',    sel===1, 16);
  drawMenuButton(rowX, rowY0+rowStep*2, rowW, 'CREDITS',        sel===2, 16);

  // Right-side status annotations
  const statusX=dx+dw-120;
  if(walletConnected){
    txShadow(walletAddressTruncated(), statusX, rowY0+16, 9,
      window.TOKENS.resolveColor('hp_full'), 'rgba(0,0,0,0.4)');
  }
  if(mp.connected){
    txShadow('ONLINE', statusX+24, rowY0+rowStep+16, 9,
      window.TOKENS.resolveColor('hp_full'), 'rgba(0,0,0,0.4)');
  }

  // Footer hint
  const hintY=dy+dh-20;
  txShadow('[Z] SELECT   [X] CLOSE', dx+24, hintY, 10,
    window.TOKENS.resolveColor('fg_muted'), 'rgba(0,0,0,0.4)');
}

// T62: Synergy banner — flashes at battle round start when hand synergy detected
function drawSynergyBanner(){
  if(!activeSynergy)return;
  const age=fr-synergyBannerFrame;
  if(age<0||age>60)return; // show for 60 frames (~1s)
  const fadeIn=Math.min(1,age/8);
  const fadeOut=age>44?Math.max(0,(60-age)/16):1;
  const alpha=fadeIn*fadeOut;
  if(alpha<=0)return;
  const s=activeSynergy;
  // Animated slide-down from top
  const slideY=Math.max(0,(1-Math.min(1,age/10))*(-32));
  const bw=220,bh=36;
  const bx_=((W-bw)/2)|0, by_=(14+slideY)|0;
  g.save();
  g.globalAlpha=alpha;
  // Background pill
  g.fillStyle=s.col;
  g.beginPath();
  g.roundRect(bx_,by_,bw,bh,10);
  g.fill();
  // Dark border
  g.strokeStyle='rgba(0,0,0,0.5)';g.lineWidth=2;
  g.stroke();
  g.restore();
  // Synergy label
  g.save();
  g.globalAlpha=alpha;
  txShadow('⚡ '+s.label+' ⚡',W/2,by_+13,13,'#1a1a2e','rgba(255,255,255,0.4)');
  // Bonus hint below
  const bonusStr=_synergyBonusStr(s.bonus);
  if(bonusStr)txShadow(bonusStr,W/2,by_+26,9,'rgba(20,20,40,0.9)','rgba(255,255,255,0.3)');
  g.restore();
}

function _synergyBonusStr(bonus){
  const parts=[];
  if(bonus.pw_add)parts.push('+'+bonus.pw_add+' PWR');
  if(bonus.block)parts.push('BLOCK');
  if(bonus.escape_bonus)parts.push('ESCAPE+');
  if(bonus.echo)parts.push('ECHO');
  return parts.join(' · ');
}

// T63: Step-by-step tutorial overlay
// Shows a compact bottom-left guide panel during the 6 tutorial steps.
// [X] = skip tutorial, [Z] = advance/confirm when a step can be skipped manually.
function drawTutorialStepOverlay(){
  if(!isTutorial)return;
  if(tutorialStep>=TUTORIAL_STEPS.length)return;
  // Hide during battle scenes (clutters the battle UI)
  if(sc==='battle')return;
  const step=TUTORIAL_STEPS[tutorialStep];
  const pw=220, ph=64;
  const px=6, py=H-ph-6;
  const age=fr-tutorialStepFrame;
  const alpha=Math.min(1,age/14)*0.95;
  if(alpha<=0)return;
  g.save();
  g.globalAlpha=alpha;
  // Panel background
  g.fillStyle='rgba(12,8,20,0.82)';
  g.beginPath();g.roundRect(px,py,pw,ph,8);g.fill();
  g.strokeStyle='rgba(100,80,160,0.55)';g.lineWidth=1.5;g.stroke();
  // Step indicator dots
  for(let i=0;i<TUTORIAL_STEPS.length;i++){
    const dotX=px+8+i*16, dotY=py+7;
    bx(dotX-3,dotY-3,6,6,i<tutorialStep?'#80d080':i===tutorialStep?'#f0c830':'rgba(100,90,130,0.5)');
  }
  // Step goal (bold)
  txShadow(step.goal,px+8,py+20,10,'#e8d8f8','rgba(0,0,0,0.5)');
  // Objective detail
  txShadow(step.obj,px+8,py+34,8,'#a098b8','rgba(0,0,0,0.4)');
  // Hint line
  txShadow(step.hint,px+8,py+48,7,'#807080','rgba(0,0,0,0.35)');
  // Skip button
  txShadow('[X] Skip',px+pw-48,py+ph-10,7,'rgba(140,120,160,0.7)','rgba(0,0,0,0.3)');
  g.restore();
}

// Handle tutorial skip from input — called when X pressed globally
function handleTutorialSkip(){
  if(!isTutorial)return false;
  // Check if not in a UI that uses X for other things
  if(battlePhase&&battlePhase!=='select')return false;
  if(optionsOverlayOpen||marketplaceActive||synthActive||discardActive)return false;
  skipTutorial();
  return true;
}

// ─── T54 UX-9: Toast / Error Notification System ──────────────────────────────
// Up to 3 simultaneous toasts, stacked from bottom-right
const _toasts=[]; // [{msg, col, frame, dur}]

function showToast(msg,col,dur){
  if(_toasts.length>=3)_toasts.shift();
  _toasts.push({msg:msg||'',col:col||'#e0e0e0',frame:fr,dur:dur||150});
}

function showError(msg){
  sfxError();
  showToast(msg,'#e86060',200);
}

function drawToasts(){
  let active=0;
  for(let i=_toasts.length-1;i>=0;i--){
    const t=_toasts[i];
    const age=fr-t.frame;
    if(age>t.dur){_toasts.splice(i,1);continue;}
    const fadeIn=Math.min(1,age/10);
    const fadeOut=age>t.dur-20?Math.max(0,(t.dur-age)/20):1;
    const alpha=fadeIn*fadeOut;
    if(alpha<=0){_toasts.splice(i,1);continue;}
    const tw=Math.min(240,t.msg.length*6+24);
    const th=20;
    const tx_=W-tw-6, ty_=H-30-active*26;
    g.save();
    g.globalAlpha=alpha*0.9;
    g.fillStyle='rgba(12,10,20,0.8)';
    g.beginPath();g.roundRect(tx_,ty_,tw,th,6);g.fill();
    g.strokeStyle=t.col;g.lineWidth=1;g.stroke();
    g.restore();
    g.save();
    g.globalAlpha=alpha;
    txShadow(t.msg,tx_+8,ty_+7,8,t.col,'rgba(0,0,0,0.4)');
    g.restore();
    active++;
  }
}

// T54 UX-8: Wallet HUD indicator (tiny bottom-left dot when wallet is connected)
function drawWalletHUD(){
  if(sc==='battle'||sc==='title')return;
  if(!walletConnected)return;
  const dotX=8,dotY=H-8;
  g.save();
  g.globalAlpha=0.75;
  g.fillStyle='#50e888';
  g.beginPath();g.arc(dotX,dotY,4,0,Math.PI*2);g.fill();
  g.strokeStyle='rgba(0,0,0,0.4)';g.lineWidth=1;g.stroke();
  txShadow(walletAddressTruncated(),dotX+8,dotY+3,7,'#80e8a8','rgba(0,0,0,0.4)');
  g.restore();
}

// T54 UX-10: First-visit onboarding prompt (show once, leads to intro tutorial)
let _onboardShown=(()=>{try{return localStorage.getItem('oxark_onboard')!==null;}catch(e){return true;}})();
let _onboardFrame=-9999;
function initOnboard(){
  if(_onboardShown)return;
  _onboardShown=true;
  _onboardFrame=fr;
  try{localStorage.setItem('oxark_onboard','1');}catch(e){}
}

function drawOnboardPrompt(){
  const age=fr-_onboardFrame;
  if(age<0||age>300)return; // show for 5 seconds
  if(introActive||battlePhase)return;
  const alpha=Math.min(1,age/20)*(age>260?Math.max(0,(300-age)/40):1);
  if(alpha<=0)return;
  const bw=260,bh=42;
  const bx_=(W-bw)/2|0, by_=H/2-bh-30;
  g.save();
  g.globalAlpha=alpha*0.92;
  g.fillStyle='rgba(15,10,28,0.88)';
  g.beginPath();g.roundRect(bx_,by_,bw,bh,10);g.fill();
  g.strokeStyle='rgba(140,100,200,0.5)';g.lineWidth=1.5;g.stroke();
  g.restore();
  g.save();
  g.globalAlpha=alpha;
  txShadow('Welcome to 0xARK!',W/2,by_+14,12,'#e8d8f8','rgba(0,0,0,0.5)');
  txShadow('Press Z to read the rules  |  Arrow keys to move',W/2,by_+30,8,'#a090c0','rgba(0,0,0,0.4)');
  g.restore();
}

// T70: "[Z] Enter" proximity hint — shown when player is adjacent to a town interactable
function drawTownHint(){
  if(!nearInteractable||inDungeon||battlePhase||mo||introActive||townShopActive)return;
  const t=nearInteractable;
  const bw=300,bh=44;
  const bx_=(W-bw)/2|0, by_=H-HUD_HEIGHT-bh-12;
  const pulse=0.8+0.2*Math.sin(fr*0.08);
  g.save();
  g.globalAlpha=0.92*pulse;
  g.fillStyle='rgba(8,6,20,0.88)';
  g.beginPath();g.roundRect(bx_,by_,bw,bh,10);g.fill();
  g.strokeStyle=t.col;g.lineWidth=1.5;g.stroke();
  // Left accent bar
  g.fillStyle=t.col;
  g.beginPath();g.roundRect(bx_,by_,3,bh,10);g.fill();
  g.restore();
  g.save();
  g.globalAlpha=0.95;
  // Icon + label on left, [Z] badge on right
  txShadow(t.icon+' '+t.label,bx_+18,by_+14,9,t.accentCol,'rgba(0,0,0,0.5)');
  txShadow(t.hint,bx_+18,by_+30,7,'#a0a0c0','rgba(0,0,0,0.4)');
  // [Z] key badge
  const kx=bx_+bw-46,ky=by_+(bh-22)/2;
  g.fillStyle=t.col;
  g.beginPath();g.roundRect(kx,ky,22,22,5);g.fill();
  txShadow('Z',kx+11,ky+14,10,'#ffffff','rgba(0,0,0,0.5)');
  g.restore();
}

// T70: Town shop modal — base shell dispatches to specific shop type (T71/T72/T73 fill content)
function drawTownShopModal(){
  if(!townShopActive)return;
  const t=TOWN_INTERACTABLES.find(ti=>ti.id===townShopType);
  if(!t)return;
  const cw=520,ch=380;
  const cx_=W/2-cw/2, cy_=H/2-ch/2;
  // Slide-in animation
  if(!townShopOpenFrame)townShopOpenFrame=fr;
  const tSlide=Math.min(1,(fr-townShopOpenFrame)/8);
  const eSlide=1-Math.pow(1-tSlide,3);
  const cy_anim=cy_-(1-eSlide)*ch;

  bx(0,0,W,H,'rgba(0,0,0,.7)');
  win(cx_,cy_anim,cw,ch);
  // Title bar
  bx(cx_,cy_anim,cw,30,t.col.replace(')',',0.3)').replace('rgb','rgba'));
  bx(cx_,cy_anim,4,30,t.col);
  txShadow(t.icon+' '+t.label,cx_+cw/2,cy_anim+21,12,t.accentCol,'rgba(0,0,0,.5)');
  // Divider
  bx(cx_+12,cy_anim+32,cw-24,1,'rgba(255,255,255,0.1)');

  // Dispatch to specific shop renderer (stubs replaced by T71/T72/T73)
  if(townShopType==='dungeon_gate'){drawDungeonGateShop(cx_,cy_anim,cw,ch);}
  else if(townShopType==='nft_trading'){drawNFTTradingShop(cx_,cy_anim,cw,ch);}
  else if(townShopType==='item_shop'){drawItemShop(cx_,cy_anim,cw,ch);}

  // [X] close hint
  txShadow('[X] Close',cx_+cw-60,cy_anim+ch-14,7,'#807090','rgba(0,0,0,.4)');
}

// T70 stubs — overridden in T71/T72/T73
function drawDungeonGateShop(cx,cy,cw,ch){
  txShadow('DUNGEON GATE',cx+cw/2,cy+ch/2-20,14,'#ff8080','rgba(0,0,0,.5)');
  txShadow('Challenge the dungeon depths',cx+cw/2,cy+ch/2+6,8,'#c0a0a0','rgba(0,0,0,.4)');
  txShadow('Full implementation in T71',cx+cw/2,cy+ch/2+26,7,'#807090','rgba(0,0,0,.4)');
}
function drawNFTTradingShop(cx,cy,cw,ch){
  txShadow('NFT TRADING HOUSE',cx+cw/2,cy+ch/2-20,14,'#88ccff','rgba(0,0,0,.5)');
  txShadow('Trade & list your card NFTs',cx+cw/2,cy+ch/2+6,8,'#a0b8c0','rgba(0,0,0,.4)');
  txShadow('Full implementation in T72',cx+cw/2,cy+ch/2+26,7,'#807090','rgba(0,0,0,.4)');
}
function drawItemShop(cx,cy,cw,ch){
  txShadow('GENERAL SHOP',cx+cw/2,cy+ch/2-20,14,'#80ffb0','rgba(0,0,0,.5)');
  txShadow('Buy items & boosters',cx+cw/2,cy+ch/2+6,8,'#a0c0b0','rgba(0,0,0,.4)');
  txShadow('Full implementation in T73',cx+cw/2,cy+ch/2+26,7,'#807090','rgba(0,0,0,.4)');
}

