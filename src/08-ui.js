// CARD ACQUISITION ANIMATION
// ═══════════════════════════════════════
function startCardAcquisition(cardIdx){
  cardAcqIsNew=cardAcqWasNew;cardAcqWasNew=false; // v96: consume new-card flag
  cardAcqActive=true;cardAcqFrame=fr;cardAcqCard=cardIdx;cardAcqDone=false;
  cardAcqParticles.length=0;sfxCardGet();
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

  let cx_,cy_,scale,alpha=1;
  if(t<50){
    const p=t/50,ease=1-Math.pow(1-p,3);
    cx_=W/2;cy_=H+30-ease*(H/2+30);scale=.2+ease*.8;
  }else if(t<90){
    cx_=W/2;cy_=H/2-20;scale=1;
    if(t%3===0){
      const angle=Math.random()*Math.PI*2,speed=1+Math.random()*2;
      cardAcqParticles.push({x:cx_,y:cy_,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:20+Math.random()*10,c:Math.random()>.5?'#fff':'#f0c830'});
    }
  }else{
    const p=(t-90)/30,ease=p*p;
    cx_=W/2+(280-W/2)*ease;cy_=(H/2-20)+(H-40-(H/2-20))*ease;scale=1-ease*.85;
  }

  const cw=60*scale,ch=84*scale;
  g.globalAlpha=alpha;
  // Draw card frame with character
  drawCardFrame(cx_-cw/2,cy_-ch/2,cw,ch,cardAcqCard,scale>.6);
  g.globalAlpha=1;

  if(t>=50&&t<90){
    win(W/2-150,cy_+ch/2+12,300,40);
    txShadow('You obtained '+cr.n+'!',W/2-130,cy_+ch/2+38,14,'#303028','rgba(200,180,140,.3)');
    // v96: NEW card badge — shown when first time in vault
    if(cardAcqIsNew){
      const newBadgeAlpha=t<60?(t-50)/10:t>82?(90-t)/8:1;
      const vaultTotal=pl[0].vault?pl[0].vault.size:0;
      const newLabel='\u2605 NEW!  '+vaultTotal+'/60';
      const newLW=newLabel.length*6+14;
      g.globalAlpha=newBadgeAlpha;
      bx(W/2-newLW/2,cy_+ch/2-12,newLW,16,'rgba(0,0,0,.7)');
      bx(W/2-newLW/2,cy_+ch/2-12,newLW,1,'#f0c830');
      bx(W/2-newLW/2,cy_+ch/2+4,newLW,1,'#f0c830');
      g.font='bold 9px VT323, monospace';
      g.textAlign='center';
      g.fillStyle='#f0e040';
      g.shadowColor='#f0c830';g.shadowBlur=10;
      g.fillText(newLabel,W/2,cy_+ch/2);
      g.shadowBlur=0;g.textAlign='left';
      g.globalAlpha=1;
    }
  }

  for(let i=cardAcqParticles.length-1;i>=0;i--){
    const p=cardAcqParticles[i];p.x+=p.vx;p.y+=p.vy;p.life--;
    if(p.life<=0){cardAcqParticles.splice(i,1);continue;}
    g.globalAlpha=Math.min(1,p.life/10);bx(p.x,p.y,2,2,p.c);g.globalAlpha=1;
  }

}

// ═══════════════════════════════════════
// DISCARD OVERLAY
// ═══════════════════════════════════════
// ── DUNGEON ENTRY CONFIRMATION ──
function drawDungeonConfirm(){
  if(!dungeonConfirmActive)return;
  bx(0,0,W,H,'rgba(0,0,0,.65)');
  // v80: Expanded panel with intel briefing
  const cw=460,ch=300,cx_=W/2-cw/2,cy_=H/2-ch/2;
  win(cx_,cy_,cw,ch);
  bx(cx_,cy_,cw,28,'#1a0a0a');
  txShadow('ENTER DUNGEON?',cx_+cw/2-80,cy_+20,11,'#d04040','rgba(0,0,0,.5)');
  const handCount=pl[0].cd.filter(c=>c>0).length;
  const vaultSize=pl[0].vault?pl[0].vault.size:0;
  tx('Cards in hand: '+handCount+'     Vault: '+vaultSize+'/60',cx_+20,cy_+50,8,'#c8c0a0');
  bx(cx_+12,cy_+60,cw-24,1,'#282848');
  tx('\u26A0 Cards decay in 3.5 min — escape before they vanish!',cx_+12,cy_+74,6,'#d06030');
  tx('\u2694 Rivals can STEAL your cards each battle round.',cx_+12,cy_+89,6,'#d06030');
  tx('\u2190 Green arrows lead back to town safely.',cx_+12,cy_+104,6,'#40b060');

  // v80: Intel briefing section
  bx(cx_+12,cy_+116,cw-24,1,'#282858');
  txShadow('INTEL BRIEFING',cx_+20,cy_+130,7,'#7898c8','rgba(0,0,0,.4)');
  const flNums_=['TOWN','B1','B2','B3','B4','B5'];
  let intelY=cy_+146;
  // Rival positions + card counts
  for(let ri=0;ri<2;ri++){
    const r=pl[ri+1];
    const rFloor=rivalMaps[ri];
    const rcc=r.cd.filter(c=>c>0).length;
    const rCol=ri===0?'#d060a0':'#d0a030';
    const rLoc=flNums_[rFloor]||'B?';
    const rThreat=rcc>=4?' \u26A0 RICH TARGET':rcc===0?' (no cards)':'';
    tx(r.n+': '+rLoc+'  '+rcc+'\u2660 cards'+rThreat,cx_+20,intelY,7,rcc>=4?'#d04040':rCol);
    intelY+=16;
  }
  // Uncollected chests on floor 1
  const f1Uncollected=treasures.filter(t=>t.map===1&&!t.collected).length;
  const f1Total=treasures.filter(t=>t.map===1).length;
  if(f1Uncollected>0){
    tx('B1 treasure: '+f1Uncollected+'/'+f1Total+' chests uncollected',cx_+20,intelY,7,'#c0a840');
    intelY+=16;
  }
  // Active run mission reminder (last mission if failed)
  if(runMission&&!runMission.completed){
    tx('Last mission failed: '+runMission.desc,cx_+20,intelY,6,'#808878');
    intelY+=14;
  }
  // Gacha pity count
  const pityLeft=GACHA_PITY_THRESHOLD-gachaPityCount;
  if(gachaPityCount>0){
    const pityCol=pityLeft<=2?'#f0c830':pityLeft<=5?'#d0a030':'#686868';
    tx('Gacha pity: '+gachaPityCount+'/'+GACHA_PITY_THRESHOLD+(pityLeft<=3?' — RARE SOON!':''),cx_+20,intelY,6,pityCol);
  }

  bx(cx_+12,cy_+ch-34,cw-24,1,'#282848');
  const blink_=Math.floor(fr/22)%2===0;
  if(blink_)txShadow('[Z] ENTER   [X] STAY',cx_+cw/2-90,cy_+ch-14,10,'#f0c830','rgba(0,0,0,.5)');
}

// ── MARKETPLACE OVERLAY ──
function drawMarketplace(){
  if(!marketActive)return;
  bx(0,0,W,H,'rgba(0,0,0,.75)');
  const mw=W-60,mh=H-40,mx=30,my=20;
  win(mx,my,mw,mh);
  bx(mx,my,mw,28,'#0a1a0a');
  txShadow('CARD MARKETPLACE',mx+mw/2-90,my+20,12,'#40d080','rgba(0,0,0,.5)');
  // Tabs
  MARKET_TABS.forEach((tab,i)=>{
    const isActive=marketTab===i;
    const tw=100,tx2=mx+12+i*104;
    bx(tx2,my+32,tw,22,isActive?'#1a3a1a':'#0a120a');
    if(isActive)bx(tx2,my+32,tw,2,'#40d080');
    tx(tab,tx2+10,my+48,7,isActive?'#40d080':'#506850');
  });

  const vault=pl[0].vault||new Set();
  const vaultArr=[...vault];

  if(marketTab===0){
    // MY CARDS — show vault collection
    tx('Your collection ('+vaultArr.length+'/60):',mx+12,my+68,8,'#c8c0a0');
    const typeFilter=['attack','defense','flee','magic','recovery'];
    const typeLabel=['ATK','DEF','FLY','MAG','REC'];
    const typeColor=['#e05840','#48b8e8','#38c080','#d8b028','#e0c040'];
    let yi=my+82;
    typeFilter.forEach((typ,ti)=>{
      const cards=vaultArr.filter(id=>CD[id-1]&&CD[id-1].t===typ);
      if(cards.length===0)return;
      tx(typeLabel[ti]+' ('+cards.length+'):',mx+14,yi+10,7,typeColor[ti]);yi+=16;
      cards.slice(0,12).forEach((id,ci)=>{
        const cr=CD[id-1];
        const cx2=mx+14+ci*72;
        if(cx2+68>mx+mw-12){return;}
        bx(cx2,yi,66,16,cr.d+'33');
        bx(cx2,yi,3,16,cr.c);
        tx(cr.n,cx2+6,yi+12,5,cr.h||'#f8f0e0');
        tx('★'.repeat(cr.r),cx2+6,yi+24,4,RARITY_COLOR[cr.r]);
      });
      if(cards.length>12)tx('+'+(cards.length-12)+' more',mx+14+12*72,yi+12,5,'#888898');
      yi+=30;
    });
  }else if(marketTab===1){
    // BROWSE — placeholder for on-chain listings
    tx('On-chain marketplace listings:',mx+12,my+68,8,'#c8c0a0');
    bx(mx+12,my+86,mw-24,1,'#1a3a1a');
    // Show mock listings
    const mockListings=[
      {seller:'VEGA',card:6,price:'0.05'},
      {seller:'MIRA',card:20,price:'0.08'},
      {seller:'???',card:45,price:'0.15'},
      {seller:'???',card:1,price:'0.99'},
    ];
    mockListings.forEach((listing,li)=>{
      const cr=CD[listing.card-1];
      const ly=my+100+li*40;
      bx(mx+12,ly,mw-24,36,'#0d200d');
      drawMiniCard(mx+18,ly+8,listing.card);
      tx(cr.n,mx+52,ly+14,8,cr.c);
      tx(RARITY_LABEL[cr.r],mx+52,ly+26,6,RARITY_COLOR[cr.r]);
      tx(listing.seller,mx+mw-180,ly+14,7,'#888898');
      tx(listing.price+' SOL',mx+mw-110,ly+14,9,'#14F195');
      tx('[BUY]',mx+mw-60,ly+22,7,'#40d040');
    });
    tx('(On-chain trading: coming in next sprint)',mx+12,my+mh-50,6,'#404850');
  }else if(marketTab===2){
    // SELL — list a card from hand
    tx('Select a card to list for sale:',mx+12,my+68,8,'#c8c0a0');
    tx('(Listing feature: coming soon)',mx+12,my+90,7,'#404850');
  }
  bx(mx+12,my+mh-46,mw-24,1,'#1a3a1a');
  tx('[←/→] Tabs   [X] Close',mx+14,my+mh-26,7,'#506850');
}

function drawDiscardOverlay(){
  if(!discardActive)return;
  bx(0,0,W,H,'rgba(0,0,0,.65)');
  const discardVisible=Math.min(HAND_SIZE,8);
  const panH=60+discardVisible*44+28;
  const panY=Math.max(10,H/2-panH/2-20);
  win(W/2-220,panY,440,panH);
  bx(W/2-220,panY,440,28,'#1a0808');

  if(discardPendingCard>0){
    txShadow('HAND FULL — Discard a card',W/2-100,panY+20,10,'#d04040','rgba(0,0,0,.4)');
    // Show incoming card preview on right side
    const pendCr=CD[discardPendingCard-1];
    const rarCol=RARITY_COLOR[pendCr.r]||'#888898';
    const previewX=W/2+90,previewY=panY+34;
    bx(previewX,previewY,116,88,pendCr.d);bx(previewX+1,previewY+1,114,86,pendCr.c);
    drawCardCharacter(previewX+4,previewY+4,discardPendingCard,1.4,fr);
    tx('INCOMING:',previewX,previewY+68,5,'#a09080');
    txShadow(pendCr.n,previewX,previewY+80,6,rarCol,'rgba(0,0,0,.3)');
    tx(pendCr.f||'',previewX,previewY+90,5,'#c0b888');
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
    if(sel){bx(W/2-208,cy,202,40,'rgba(192,168,96,.22)');bx(W/2-208,cy,202,1,'#c0a040');}
    if(cd>0){
      const cr=CD[cd-1];
      bx(W/2-200,cy+6,28,28,cr.d);bx(W/2-198,cy+8,24,24,cr.c);
      drawCardCharacter(W/2-197,cy+8,cd,0.9,fr);
      tx(cr.n,W/2-160,cy+18,7,sel?'#c04040':'#303028');
      // v78: show decay timer
      if(cardTimers[i]>0){
        const remMs=Math.max(0,CARD_DECAY_MS-(Date.now()-cardTimers[i]));
        const remFrac=remMs/CARD_DECAY_MS;
        const secs=Math.ceil(remMs/1000);
        const mm=Math.floor(secs/60),ss=secs%60;
        const timeStr=mm>0?mm+'m'+('0'+ss).slice(-2)+'s':ss+'s';
        const barCol=remFrac>0.5?'#40d040':remFrac>0.25?'#d0c040':'#d04040';
        bx(W/2-160,cy+28,80,3,'#181828');
        bx(W/2-160,cy+28,Math.floor(80*remFrac),3,barCol);
        tx(timeStr,W/2-74,cy+32,5,remFrac<0.25?'#d04040':'#808878');
      }else{
        tx('safe',W/2-160,cy+32,5,'#508050');
      }
    }else{
      tx('(empty slot)',W/2-160,cy+22,6,'#a09888');
    }
    if(sel)tx('\u25B6',W/2-214,cy+24,7,'#c04040');
  }
  tx('Z=Discard  X=Skip',W/2-80,panY+panH-14,6,'#686068');
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
  pxIntroLines.forEach((lt, i) => {
    lt.text = lines[i] || '';
    const fadeT = Math.max(0, t - 5 - i*8);
    lt.alpha = Math.min(1, fadeT/10);
  });
  // Bouncing arrow
  pxIntroArrow.y = 320 + Math.sin(fr*0.1)*3;
  pxIntroArrow.visible = t > 30 && Math.floor(fr/20)%2===0;
  // Card teaser on last page
  pxIntroCardMsg.visible = introPage===INTRO_PAGES.length-1 && t>20 && pl[0].cd.filter(c=>c>0).length===0;
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
  txShadow((introPage+1)+'/'+INTRO_PAGES.length,W/2-16,140,7,'#686068','rgba(0,0,0,.3)');
  g.globalAlpha=1;
  const wx=W/2-240,wy=160,ww=480,wh=180;
  win(wx,wy,ww,wh);
  const lines=INTRO_PAGES[introPage].split('\n');
  lines.forEach((line,i)=>{
    g.globalAlpha=Math.min(1,Math.max(0,t-5-i*8)/10);
    tx(line,wx+20,wy+30+i*28,9,'#484050');
    g.globalAlpha=1;
  });
  if(t>30&&Math.floor(fr/20)%2===0)txShadow('\u25BC Z',wx+ww-60,wy+wh-20+Math.sin(fr*0.1)*3,8,FRLG.selHighlight,'rgba(0,0,0,.3)');
  if(introPage===INTRO_PAGES.length-1&&t>20&&pl[0].cd.filter(c=>c>0).length===0){
    g.globalAlpha=Math.min(1,(t-20)/15);
    txShadow('You receive a spirit card...',W/2-100,wy+wh+20,8,'#f0c830','rgba(0,0,0,.4)');
    g.globalAlpha=1;
  }
}

// ═══════════════════════════════════════
// AREA CARD INFO
// ═══════════════════════════════════════
const AREA_CARD_DESC=[
  'Safe zone — visit shops & trade cards',  // Town
  'Common & Uncommon cards roam here',     // Floor 1
  'Uncommon cards drop from enemies',       // Floor 2
  'Rare cards guard these corridors',       // Floor 3
  'Epic cards dwell in the dark',           // Floor 4
  'Legendary cards await the brave',        // Floor 5
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
  if(t<30){bx(0,0,W,H,`rgba(255,255,255,${t/30})`);return;}
  bx(0,0,W,H,'#f8f4f0');

  for(let i=0;i<8;i++){
    const st=(t+i*60)%200;
    if(st<30){const sx=50+i*55+st*3,sy=20+i*15+st*1.5;
      for(let j=0;j<4;j++)bx(sx-j*4,sy-j*2,2,1,`rgba(200,160,60,${Math.max(0,.6-j*.15)})`);
    }
  }
  for(let i=0;i<20;i++){
    const px_=(i*73+t*(.5+i*.03))%W,py_=(i*41+t*(1+i*.02))%H;
    bx(px_,py_,3,2,['#d8b028','#f0c830','#e8a020','#f8e060'][i%4]);
  }

  if(t>35){g.globalAlpha=Math.min(1,(t-35)/20);tx('CONGRATULATIONS!',W/2-140+1,101,14,'rgba(0,0,0,.2)');tx('CONGRATULATIONS!',W/2-140,100,14,'#c89820');g.globalAlpha=1;}
  if(t>40){g.globalAlpha=Math.min(1,(t-40)/15);tx('Information asymmetry is the ultimate weapon',W/2-180,124,7,'#a07848');g.globalAlpha=1;}
  if(t>45){g.globalAlpha=Math.min(1,(t-45)/15);drawBattleSprite(pl[0],W/2,200,3,false);g.globalAlpha=1;}

  if(t>60){
    // Show up to 7 hand cards in a fan, centered
    const cardsT=t-60;
    const handCards=pl[0].cd.map((c,i)=>({c,i})).filter(x=>x.c>0).slice(0,7);
    const totalShow=Math.min(7,handCards.length);
    for(let si=0;si<totalShow;si++){
      if(cardsT<si*12)break;
      const cardT=cardsT-si*12,slideIn=Math.min(1,cardT/12);
      const angle=(si-(totalShow-1)/2)*0.2;
      const cx_=W/2+(si-(totalShow-1)/2)*80,cy_=340+Math.abs(si-(totalShow-1)/2)*8;
      g.globalAlpha=slideIn;g.save();g.translate(cx_,cy_);g.rotate(angle*.25);
      const cd=handCards[si].c;
      drawCardFrame(-22,-32,44,62,cd-1,true);
      g.restore();g.globalAlpha=1;
      if(cardT>0&&cardT<20){
        for(let s=0;s<4;s++){
          const sa=s*(Math.PI*2/4)+cardT*.2,sd=8+cardT*.6;
          bx(cx_+Math.cos(sa)*sd,cy_+Math.sin(sa)*sd,2,2,`rgba(255,255,200,${Math.max(0,1-cardT/20)})`);
        }
      }
    }
    // Vault count display
    if(cardsT>30){
      const vaultSize=pl[0].vault?pl[0].vault.size:0;
      g.globalAlpha=Math.min(1,(cardsT-30)/20);
      txShadow(vaultSize+'/60 UNIQUE',W/2-60,390,9,'#f0c830','rgba(0,0,0,.5)');
      g.globalAlpha=1;
    }
  }

  // Stats + Solana row (same height range, side by side)
  if(t>130){
    g.globalAlpha=Math.min(1,(t-130)/15);
    win(W/2-200,420,400,28);
    const _elapsed=getPlayElapsed();const _em=Math.floor(_elapsed/60000);const _es=Math.floor((_elapsed%60000)/1000);
    const vaultSize=pl[0].vault?pl[0].vault.size:0;
    tx(`Time: ${_em}m${('0'+_es).slice(-2)}s   Battles: ${rd}   Cards: ${vaultSize}/60`,W/2-188,440,7,'#686068');
    g.globalAlpha=1;
  }
  // "You collected all 60" message
  if(t>140){
    win(6,456,W-12,28);
    if(playerHasAllSixty()){tx('You collected all 60 cards and claimed the Prize Pool!',14,476,7,'#303028');}
    else{tx('Time ran out! You collected '+hasUniqueCards(0).size+'/60 unique cards.',14,476,7,'#c04040');}
  }
  // Prize distribution display
  if(t>148){
    g.globalAlpha=Math.min(1,(t-148)/15);
    win(W/2-200,490,400,22);
    tx('1ST: 60%  |  2ND: 25%  |  3RD: 15%',W/2-150,506,7,'#f0c830');
    g.globalAlpha=1;
  }
  // "Verified on Solana" branding
  if(t>152){
    g.globalAlpha=Math.min(1,(t-152)/15);
    drawSolanaLogo(W/2-110,518,10);
    tx('Verified on Solana',W/2-90,522,7,'#9945FF');
    g.globalAlpha=1;
  }
  // Prize claim button when wallet connected and won
  if(t>158&&walletConnected&&playerHasAllSixty()){
    g.globalAlpha=Math.min(1,(t-158)/15);
    const claimBlink=Math.sin(fr*0.1)*0.15+0.85;
    g.globalAlpha*=claimBlink;
    win(W/2-160,540,320,28);
    drawSolanaIcon(W/2-140,544,8);
    tx('CLAIM PRIZE: '+stakePotAmount.toFixed(2)+' SOL',W/2-120,558,9,'#14F195');
    g.globalAlpha=1;
  }
  // MINT YOUR CARDS AS NFTs button
  if(t>162&&playerHasAllSixty()){
    g.globalAlpha=Math.min(1,(t-162)/15);
    const mintBlink=Math.sin(fr*0.08)*0.12+0.88;
    g.globalAlpha*=mintBlink;
    win(W/2-140,572,280,24);
    tx('MINT YOUR CARDS AS NFTs',W/2-108,590,8,'#9945FF');
    g.globalAlpha=1;
  }
  // Eternal inscription + LEGENDS
  if(t>166){
    g.globalAlpha=Math.min(1,(t-166)/15);
    win(W/2-160,600,320,22);
    const bcr=stats.bestClearRounds;const bct=stats.bestClearTime;
    const bcText=bcr>0?'BEST: Round '+bcr+' ('+Math.floor(bct/60)+'m'+('0'+(bct%60)).slice(-2)+'s)':'BEST CLEAR: not yet recorded';
    tx(bcText,W/2-140,616,6,bcr>0?'#f0c830':'#686068');
    g.globalAlpha=1;
  }
  if(t>170){
    win(W/2-180,H-24,360,20);
    tx('Z=Play Again   X=Title Screen',W/2-140,H-6,7,'#c89820');
  }
  if(t===31)sfxVictory();
}

// ═══════════════════════════════════════
// CARDS COLLECTION SCREEN (GDD v1.0 — 60 cards, paginated)
// ═══════════════════════════════════════
let crdPage=0; // 0-4, 12 cards per page (5 pages × 12 = 60)
const CRD_PER_PAGE=12;
const CRD_COLS=4;
const CRD_ROWS=3;
// v75: Card detail panel
let crdCursor=0; // currently highlighted card (0-11 within page)
let crdDetailActive=false; // showing full detail view
function dCrd(){
  bx(0,0,W,H,'#0c0c20');
  for(let i=0;i<80;i++)bx((i*47+13)%W,(i*31+7)%H,2,2,'rgba(255,255,255,.04)');
  // Header
  const vault=pl[0].vault||new Set();
  const collected=vault.size;
  win(10,6,W-20,38);
  tx('CARD COLLECTION',W/2-100,32,10);
  // Progress bar
  const pct=collected/60;
  const barX_=W-220,barY_=12,barW_=160,barH_=14;
  bx(barX_,barY_,barW_,barH_,'#1a1a30');
  bx(barX_,barY_,Math.round(barW_*pct),barH_,collected>=60?'#f0c830':'#5080d0');
  tx(collected+'/60',W-52,28,8,collected>=60?'#f0c830':'#c0d0f0');
  // v115: Milestone tick marks on progress bar
  CARD_MILESTONES.forEach(m=>{
    const tx_=barX_+Math.round(barW_*m/60);
    const reached=collected>=m;
    const tickCol=reached?'#f0c830':'#303048';
    bx(tx_-1,barY_-3,2,barH_+6,tickCol);
    if(reached){
      g.globalAlpha=0.5+Math.sin(fr*0.08+m)*0.3;
      bx(tx_-2,barY_-4,4,2,'#f0c830');
      g.globalAlpha=1;
    }
  });
  // Type tabs (5 types) with completion count
  const typeNames=['ATK','DEF','FLY','MAG','REC'];
  const typeColors=['#e05840','#48b8e8','#38c080','#d8b028','#e0c040'];
  for(let ti=0;ti<5;ti++){
    const tx2=10+ti*58,bw=54;
    const isActive=crdPage===ti;
    // Count owned cards in this type (12 per type)
    const typeOwned=Array.from({length:12},(_,j)=>ti*12+j+1).filter(id=>vault.has(id)).length;
    const typeComplete=typeOwned>=12;
    bx(tx2,46,bw,22,isActive?typeColors[ti]:'#1a1a30');
    tx(typeNames[ti],tx2+12,62,8,isActive?'#fff':typeColors[ti]);
    // v115: Completion count badge in top-right of each tab
    const countStr=typeOwned+'/12';
    tx(countStr,tx2+bw-countStr.length*5-2,54,5,typeComplete?'#f0c830':isActive?'rgba(255,255,255,.7)':'rgba(128,128,160,.6)');
    // Gold star if complete
    if(typeComplete){const s=Math.sin(fr*0.08+ti)*0.2+0.8;g.globalAlpha=s;tx('\u2605',tx2+4,54,5,'#f0c830');g.globalAlpha=1;}
  }
  // Card grid: 4×3 = 12 cards per page
  const typeStart=crdPage*12;
  const CARD_W=86,CARD_H=120,PAD=8;
  const gridX=10,gridY=74;
  for(let i=0;i<CRD_PER_PAGE;i++){
    const cardIdx=typeStart+i; // 0-based CD index
    if(cardIdx>=CD.length)break;
    const cr=CD[cardIdx];
    const col=i%CRD_COLS,row=Math.floor(i/CRD_COLS);
    const cx=gridX+col*(CARD_W+PAD),cy=gridY+row*(CARD_H+PAD);
    // v75: cursor highlight
    if(i===crdCursor){
      const pulse=Math.sin(fr*0.15)*0.15+0.85;
      g.globalAlpha=pulse;
      bx(cx-2,cy-2,CARD_W+4,CARD_H+4,'rgba(200,180,100,.35)');
      bx(cx-2,cy-2,CARD_W+4,1,'#d0b050');
      bx(cx-2,cy+CARD_H+2,CARD_W+4,1,'#d0b050');
      bx(cx-2,cy-2,1,CARD_H+4,'#d0b050');
      bx(cx+CARD_W+2,cy-2,1,CARD_H+4,'#d0b050');
      g.globalAlpha=1;
    }
    const cardId=cardIdx+1; // 1-based
    const owned=vault.has(cardId);
    // Card frame background
    bx(cx,cy,CARD_W,CARD_H,owned?cr.d:'#1a1830');
    bx(cx+1,cy+1,CARD_W-2,CARD_H-2,owned?cr.c:'#141428');
    if(owned){
      // Card art area
      bx(cx+2,cy+2,CARD_W-4,CARD_H*0.55,cr.d);
      drawCardCharacter(cx+CARD_W/2-8,cy+8,cardId,0.8,fr);
      // Rarity stars
      const rar=cr.r||1;
      const rarColor=RARITY_COLOR[rar]||'#888898';
      for(let s=0;s<rar;s++)tx('\u2605',cx+4+s*10,cy+CARD_H*0.55+12,7,rarColor);
      // Card name
      const nameFs=Math.max(5,Math.min(8,Math.floor(CARD_W/(cr.n.length*0.7))));
      tx(cr.n,cx+CARD_W/2-cr.n.length*nameFs/2.4,cy+CARD_H*0.55+26,nameFs,'#f0e8d0');
      // Type label
      tx(CARD_TYPE_LABEL[cr.t]||'',cx+4,cy+CARD_H-16,5,cr.h||'#888');
      // Special effect
      if(cr.f)tx(cr.f,cx+4,cy+CARD_H-6,5,'#c0b888');
    }else{
      // v116: Decorative card back — geometric mystery pattern
      bx(cx+4,cy+4,CARD_W-8,CARD_H-8,'#080818');
      // Checkerboard micro-pattern with slow pulse per slot
      const cellSz_=6;
      g.globalAlpha=0.10+0.04*Math.sin(fr*0.025+cardIdx*0.55);
      for(let row_=0;row_<Math.ceil((CARD_H-8)/cellSz_);row_++){
        for(let col_=0;col_<Math.ceil((CARD_W-8)/cellSz_);col_++){
          if((row_+col_)%2===0) bx(cx+4+col_*cellSz_,cy+4+row_*cellSz_,cellSz_-1,cellSz_-1,'#162090');
        }
      }
      g.globalAlpha=1;
      // Corner bracket ornaments
      bx(cx+7,cy+7,7,1,'#2030b8');bx(cx+7,cy+7,1,7,'#2030b8');
      bx(cx+CARD_W-14,cy+7,7,1,'#2030b8');bx(cx+CARD_W-8,cy+7,1,7,'#2030b8');
      bx(cx+7,cy+CARD_H-8,7,1,'#2030b8');bx(cx+7,cy+CARD_H-14,1,7,'#2030b8');
      bx(cx+CARD_W-14,cy+CARD_H-8,7,1,'#2030b8');bx(cx+CARD_W-8,cy+CARD_H-14,1,7,'#2030b8');
      // Central pulsing "?" emblem
      const pu_=0.5+Math.sin(fr*0.05+cardIdx*0.7)*0.5;
      g.globalAlpha=pu_*0.35;
      bx(cx+CARD_W/2-7,cy+CARD_H/2-9,14,14,'#2030b0');
      g.globalAlpha=0.55+pu_*0.45;
      tx('?',cx+CARD_W/2-5,cy+CARD_H/2+5,10,'#2840d0');
      g.globalAlpha=1;
      // Rarity hint stars (dim blue-tone)
      const rar_=cr.r||1;
      for(let s_=0;s_<rar_;s_++) tx('\u2605',cx+4+s_*10,cy+CARD_H-16,6,'#1e2858');
    }
    // v93: Rival ownership dots + IN HAND badge
    {
      const vegaHas=pl[1].cd.some(c=>c===cardId);
      const miraHas=pl[2].cd.some(c=>c===cardId);
      const inHand=pl[0].cd.some(c=>c===cardId);
      let dotX=cx+CARD_W-6;
      if(vegaHas){bx(dotX-10,cy+4,8,8,'#e060a0');dotX-=10;}
      if(miraHas){bx(dotX-10,cy+4,8,8,'#d0a030');dotX-=10;}
      if(inHand&&owned){
        // "HAND" badge at bottom
        bx(cx+CARD_W-30,cy+CARD_H-14,28,12,'rgba(40,120,40,.85)');
        bx(cx+CARD_W-30,cy+CARD_H-14,28,1,'#60e060');
        tx('HAND',cx+CARD_W-27,cy+CARD_H-5,5,'#60e060');
      }
    }
  }
  // v93: Legend for dots
  {
    const vegaTotal=pl[1].cd.filter(c=>c>0).length;
    const miraTotal=pl[2].cd.filter(c=>c>0).length;
    bx(W-190,12,8,8,'#e060a0');
    tx('V:'+vegaTotal,W-180,22,6,'#e060a0');
    bx(W-158,12,8,8,'#d0a030');
    tx('M:'+miraTotal,W-148,22,6,'#d0a030');
  }
  // v117: Persistent card info sidebar (right of grid)
  {
    const sidX=394,sidY=68,sidW=W-sidX-10,sidH=H-sidY-36;
    const typeStart=crdPage*12;
    const cardIdx=typeStart+crdCursor;
    const cr=CD[cardIdx]||CD[0];
    const cardId=cardIdx+1;
    const vault=pl[0].vault||new Set();
    const owned=vault.has(cardId);
    const rar=cr.r||1;
    const rarColor=RARITY_COLOR[rar]||'#888898';
    const rarNames=['','Common','Uncommon','Rare','Epic','Legendary'];
    const typeFullNames={attack:'ATTACK',defense:'DEFENSE',flee:'FLIGHT',magic:'MAGIC',recovery:'RECOVERY'};
    // Panel background
    win(sidX,sidY,sidW,sidH);
    bx(sidX+2,sidY+2,sidW-4,sidH-4,owned?cr.c:'#0e0c1a');
    // Art area
    const artH=170;
    bx(sidX+2,sidY+2,sidW-4,artH,owned?cr.d:'#08071a');
    if(owned){
      drawCardCharacter(sidX+sidW/2-20,sidY+10,cardId,2.8,fr);
      // Rarity glow for epic/legendary
      if(rar>=4){
        const gp=0.3+Math.sin(fr*0.06+cardIdx*0.5)*0.3;
        g.globalAlpha=gp;
        bx(sidX+2,sidY+2,sidW-4,artH,rar===5?'rgba(255,220,80,.1)':'rgba(200,160,30,.07)');
        g.globalAlpha=1;
      }
    }else{
      // Mystery pattern in art area
      const cellSz=10;
      g.globalAlpha=0.08+0.04*Math.sin(fr*0.02+cardIdx*0.4);
      for(let r2=0;r2<Math.ceil(artH/cellSz);r2++){
        for(let c2=0;c2<Math.ceil((sidW-4)/cellSz);c2++){
          if((r2+c2)%2===0) bx(sidX+2+c2*cellSz,sidY+2+r2*cellSz,cellSz-1,cellSz-1,'#162090');
        }
      }
      g.globalAlpha=1;
      const pu=0.5+Math.sin(fr*0.05+cardIdx*0.7)*0.5;
      g.globalAlpha=pu*0.5;
      bx(sidX+sidW/2-20,sidY+artH/2-24,40,40,'#1830b0');
      g.globalAlpha=pu*0.9;
      tx('?',sidX+sidW/2-22,sidY+artH/2+22,36,'#2840d0');
      g.globalAlpha=1;
    }
    // Card number badge
    bx(sidX+4,sidY+4,24,14,'rgba(0,0,0,.6)');
    tx('#'+String(cardId).padStart(2,'0'),sidX+5,sidY+15,6,owned?'#b0b8d0':'#2a2a60');
    // Info block
    const infoY=sidY+artH+14;
    // Card name
    const nameStr=owned?cr.n:'?????';
    const nameFs=Math.min(14,Math.max(8,Math.floor(sidW*0.85/(Math.max(1,nameStr.length)*0.72))));
    tx(nameStr,sidX+12,infoY,nameFs,owned?'#f0e8d0':'#202060');
    // Rarity row
    for(let s=0;s<rar;s++) tx('\u2605',sidX+12+s*14,infoY+20,10,owned?rarColor:'#1e2858');
    tx(rarNames[rar]||'',sidX+12+rar*14+6,infoY+20,7,owned?rarColor:'#1e2858');
    // Type label
    tx(typeFullNames[cr.t]||'',sidX+12,infoY+38,8,owned?cr.h||'#888898':'#1e2a6a');
    // Effect text
    if(cr.f){
      const effStr=owned?cr.f:'[locked]';
      tx(effStr,sidX+12,infoY+56,owned?7:6,owned?'#c0b888':'#1a2060');
    }
    // Source hint
    const srcStr=getCardSourceHint(cardId);
    tx('Find: '+srcStr,sidX+12,infoY+74,6,owned?'#686878':'#141848');
    // Status badge at bottom
    const badgeY=sidY+sidH-22;
    bx(sidX+2,badgeY-2,sidW-4,1,'rgba(255,255,255,.06)');
    if(owned){
      const inHand=pl[0].cd.some(c=>c===cardId);
      const vegaHas=pl[1].cd.some(c=>c===cardId);
      const miraHas=pl[2].cd.some(c=>c===cardId);
      bx(sidX+8,badgeY,80,16,inHand?'rgba(40,120,40,.8)':'rgba(30,60,120,.8)');
      tx(inHand?'IN YOUR HAND':'COLLECTED',sidX+10,badgeY+13,6,inHand?'#60e060':'#80b0f0');
      if(vegaHas){bx(sidX+96,badgeY,54,16,'rgba(180,40,100,.7)');tx('VEGA HOLDS',sidX+98,badgeY+13,5,'#e060a0');}
      if(miraHas){bx(sidX+158,badgeY,54,16,'rgba(160,120,20,.7)');tx('MIRA HOLDS',sidX+160,badgeY+13,5,'#d0a030');}
    }else{
      bx(sidX+8,badgeY,90,16,'rgba(30,20,50,.8)');
      tx('NOT YET OBTAINED',sidX+10,badgeY+13,6,'#3a3060');
    }
    // Z=detail hint
    tx('Z \u25BA full detail',sidX+sidW-80,badgeY+13,5,'#2a2a50');
  }
  // Navigation
  win(10,H-30,W-20,24);
  if(crdPage>0)tx('\u25C4 ←=PREV TYPE',20,H-12,7,'#8090c0');
  tx(typeNames[crdPage]+' '+(crdPage+1)+'/5',W/2-52,H-12,8,typeColors[crdPage]);
  if(crdPage<4)tx('NEXT TYPE= \u25BA',W-120,H-12,7,'#8090c0');
  tx('Z=DETAIL  X=BACK',W/2+16,H-12,7,'#686878');
}

// ═══════════════════════════════════════
// v75: CARD DETAIL PANEL
// ═══════════════════════════════════════
const CARD_SOURCE_HINTS=[
  // For each card index 0-59, which floor/source to find it
  // Floor 1=F1, 2=F2, etc., 0=any
  // Built from DUNGEON_FLOOR_CARDS in runtime below
];
function getCardSourceHint(cardId){
  // Check which dungeon floor pools contain this card
  const floors=[];
  for(let f=1;f<=5;f++){
    const pool=DUNGEON_FLOOR_CARDS[f];
    if(pool&&pool.includes(cardId))floors.push(f);
  }
  if(floors.length===0)return'Gacha / Trade';
  const floorNames=['','Floor I','Floor II','Floor III','Floor IV','Floor V'];
  return floors.map(f=>floorNames[f]).join(' / ');
}
function drawCardDetailPanel(){
  if(!crdDetailActive)return;
  const typeStart=crdPage*12;
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
  else{tx('?',px_+pw/2-18,py_+artH/2+16,40,'#201e38');}

  // Rarity stars
  const rar=cr.r||1;
  const rarCol=RARITY_COLOR[rar]||'#888898';
  const rarLabel=RARITY_LABEL[rar]||'';
  for(let s=0;s<rar;s++)tx('\u2605',px_+14+s*18,py_+artH+18,10,rarCol);
  tx(rarLabel,px_+14+rar*18+6,py_+artH+18,7,rarCol);

  // Card name
  const nameFs=Math.max(10,Math.min(16,Math.floor(pw/(cr.n.length*0.72))));
  txShadow(cr.n,px_+pw/2-(cr.n.length*nameFs/2.4),py_+artH+32,nameFs,owned?'#f0e8d0':'#403858','rgba(0,0,0,.5)');

  // Type
  const tLabel={attack:'ATTACK',defense:'DEFENSE',flee:'FLEE',magic:'MAGIC',heal:'HEAL'}[cr.t]||cr.t.toUpperCase();
  tx(tLabel,px_+pw/2-tLabel.length*3.5,py_+artH+50,7,owned?(cr.h||'#aaa'):'#40385a');

  // Separator
  bx(px_+20,py_+artH+58,pw-40,1,owned?cr.h+'80':'#20183040');

  // Effect / ability
  if(cr.f){
    tx('ABILITY: '+cr.f,px_+20,py_+artH+76,7,owned?'#f0e0c0':'#403858');
  }

  // Flavor text
  if(cr.fl&&owned){
    const words=cr.fl.split(' ');
    let line='';const lines=[];
    const maxW=42;
    words.forEach(w=>{
      if((line+w).length>maxW){lines.push(line.trim());line=w+' ';}
      else line+=w+' ';
    });
    if(line.trim())lines.push(line.trim());
    lines.forEach((ln,li)=>{
      g.globalAlpha=0.7;
      tx('\u201C'+ln+(li===lines.length-1?'\u201D':''),px_+20,py_+artH+96+li*16,6,'#c0b888');
      g.globalAlpha=1;
    });
  }else if(!owned){
    tx('??? — Card not yet collected',px_+20,py_+artH+96,6,'#302848');
  }

  // Source hint
  const src=getCardSourceHint(cardId);
  tx('Found: '+src,px_+20,py_+ph-44,6,owned?'#908880':'#302848');

  // In-hand indicator
  const inHand=pl[0].cd.includes(cardId);
  if(inHand)tx('\u2665 IN HAND',px_+20,py_+ph-28,6,'#d08050');
  else if(owned)tx('\u2713 IN VAULT',px_+20,py_+ph-28,6,'#50b050');
  else tx('\u2715 NOT COLLECTED',px_+20,py_+ph-28,6,'#604060');

  tx('X = BACK',px_+pw-70,py_+ph-28,6,'#686878');
}

// ═══════════════════════════════════════
// LOG SCREEN
// ═══════════════════════════════════════
function dLog(){
  // Dark background with subtle noise
  bx(0,0,W,H,'#0c0c18');
  for(let i=0;i<120;i++){
    const nx=(i*73+17)%W,ny=(i*41+23)%H;
    const na=Math.random()*0.04;
    bx(nx,ny,1,1,`rgba(255,255,255,${na})`);
  }

  // BATTLE LOG header in FRLG window
  win(16,10,W-32,42);
  txShadow('BATTLE LOG',W/2-90,38,14,'#f0e8c0','rgba(0,0,0,.5)');

  // Scrollable log entries
  const entryH=32;
  const maxVisible=14;
  const padTop=60;
  const totalEntries=lg.length;
  const maxScroll=Math.max(0,totalEntries-maxVisible);
  logScrollOff=Math.max(0,Math.min(logScrollOff,maxScroll));
  const startIdx=Math.max(0,totalEntries-maxVisible-logScrollOff);
  const endIdx=Math.min(totalEntries,startIdx+maxVisible);
  const visibleLogs=lg.slice(startIdx,endIdx);

  // Single window for all entries
  win(16,padTop-8,W-32,maxVisible*entryH+16);

  visibleLogs.forEach((l,i)=>{
    const y=padTop+i*entryH+4;
    // Determine entry color
    let col='#888898';
    if(l.includes('Steal')||l.includes('Ignis')||l.includes('ambush')){col='#e06060';}
    else if(l.includes('Block')||l.includes('Barrier')){col='#6090d0';}
    else if(l.includes('drew')||l.includes('Scout')||l.includes('Found')){col='#60c060';}
    else if(l.includes('Umbra')){col='#a878c8';}
    else if(l.includes('Wild')||l.includes('Fishing')){col='#e0c040';}
    else if(l.startsWith('[ON-CHAIN]')){col='#50e090';}
    else if(l.includes('entered')){col='#d08050';}

    // Color dot + text — bright white text for readability
    bx(30,y+4,6,6,col);
    const maxChars=68;
    const displayText=l.length>maxChars?l.substring(0,maxChars)+'...':l;
    txShadow(displayText,44,y+10,11,col,'#000');

    // Thin separator line
    if(i<visibleLogs.length-1) bx(30,y+entryH-2,W-76,1,'#1a1a30');
  });

  // Scroll indicators
  if(logScrollOff<maxScroll){
    // More entries above (older)
    const blink=Math.floor(fr/20)%2===0;
    if(blink)txShadow('\u25B2  older',W/2-50,padTop-6,8,'#d8b028','rgba(0,0,0,.4)');
  }
  if(logScrollOff>0){
    // More entries below (newer)
    const blink=Math.floor(fr/20)%2===0;
    if(blink)txShadow('\u25BC  newer',W/2-50,padTop+maxVisible*entryH+6,8,'#d8b028','rgba(0,0,0,.4)');
  }

  // Entry count
  txShadow(totalEntries+' entries',W-180,H-18,8,'#484858','rgba(0,0,0,.3)');

  // Back prompt
  win(W/2-100,H-38,200,28);
  txShadow('X = Back',W/2-32,H-16,8,FRLG.selHighlight,'rgba(0,0,0,.4)');
}

// ═══════════════════════════════════════
// FISHING MINIGAME (Corsair Bay docks)
// ═══════════════════════════════════════
function canFish(){
  if(currentMap!==0||fishingCooldownTimer>0||inBuilding)return false;
  const p=pl[0],m=getMap();
  // Check if player is on dock and facing water
  const tile=m[p.y]?.[p.x];
  if(tile!==10)return false;
  let fx=p.x,fy=p.y;
  if(p.dir===0)fy++;else if(p.dir===2)fy--;
  else if(p.dir===1)fx--;else if(p.dir===3)fx++;
  if(fx>=0&&fx<MW&&fy>=0&&fy<MH){
    const facingTile=m[fy]?.[fx];
    if(facingTile===0||facingTile===17)return true;
  }
  return false;
}

function startFishing(){
  fishingActive=true;
  fishingPhase='waiting';
  fishingTimer=60+Math.floor(Math.random()*120); // 1-3 seconds at 60fps
  sfxFishCast();
  twSet('Cast a line... wait for it...');
}

function updateFishing(){
  if(!fishingActive)return;
  if(fishingPhase==='waiting'){
    fishingTimer--;
    if(fishingTimer<=0){
      fishingPhase='bite';
      fishingBiteFrame=fr;
      sfxFishBite();
    }
  }else if(fishingPhase==='bite'){
    // Player has 30 frames (0.5s) to press Z
    if(fr-fishingBiteFrame>30){
      fishingPhase='miss';
      fishingTimer=60;
      sfxFishMiss();
      twSet('The catch got away!');
    }
  }else if(fishingPhase==='catch'){
    fishingTimer--;
    if(fishingTimer<=0){
      fishingActive=false;
      fishingCooldownTimer=FISHING_COOLDOWN;
    }
  }else if(fishingPhase==='miss'){
    fishingTimer--;
    if(fishingTimer<=0){
      fishingActive=false;
      fishingCooldownTimer=FISHING_COOLDOWN;
    }
  }
}

function fishingCatchCard(){
  fishingPhase='catch';
  fishingTimer=90;
  sfxFishCatch();
  // Random dock spirit card — prefer vault-new
  const pool=AREA_CARDS[currentMap]||AREA_CARDS[1];
  const vault_f=pl[0].vault||new Set();
  const newPool_f=pool.filter(id=>!vault_f.has(id));
  const usePool_f=newPool_f.length>0?newPool_f:pool;
  const cardId=usePool_f[Math.floor(Math.random()*usePool_f.length)];
  const cardIdx=cardId-1;
  const fAdded=addCardToPlayer(0,cardId); // updates vault + hand
  if(fAdded){
    startCardAcquisition(cardIdx);
    twSet('You caught a '+CD[cardIdx].n+' card!');
    lg.push('Fishing: Caught '+CD[cardIdx].n+'!');
    checkWinAndTransition(2000);
  }else{
    discardActive=true;discardSelIdx=0;discardPendingCard=cardId;discardSource='wild';
    twSet('Caught '+CD[cardIdx].n+'! Discard one to keep it.');
  }
}

function drawFishingOverlay(){
  if(!fishingActive)return;
  if(fishingPhase==='bite'){
    // Show "!" indicator
    const bobY=Math.sin(fr*0.3)*3;
    const px=pl[0].visualX-camX+8,py=pl[0].visualY-camY-30+bobY;
    bx(px-6,py-4,12,16,'#fff');
    bx(px-5,py-3,10,14,'#f0c830');
    tx('!',px-4,py+8,12,'#c04040');
    tx('Z NOW!',px-18,py+16,5,'#c04040');
  }else if(fishingPhase==='waiting'){
    // Show bobber animation
    const px=pl[0].visualX-camX,py=pl[0].visualY-camY;
    let bx_=px,by_=py;
    if(pl[0].dir===0){by_+=20;}else if(pl[0].dir===2){by_-=20;}
    else if(pl[0].dir===1){bx_-=20;}else{bx_+=20;}
    const bob=Math.sin(fr*0.1)*2;
    g.fillStyle='#c04040';g.beginPath();g.arc(bx_+8,by_+bob,3,0,Math.PI*2);g.fill();
    // Line from player to bobber
    g.strokeStyle='#a0a0a0';g.lineWidth=1;
    g.beginPath();g.moveTo(px+8,py);g.lineTo(bx_+8,by_+bob);g.stroke();
  }
}

// ═══════════════════════════════════════
// FOREST TRAPS
// ═══════════════════════════════════════
function checkForestTrap(){
  if(currentMap!==1)return false;
  const key='1-'+pl[0].x+'-'+pl[0].y;
  if(forestTraps.has(key)&&!triggeredTraps.has(key)){
    triggeredTraps.add(key);
    sfxTrap();
    flash();
    twSet('You triggered a trap!');
    // Reset streak on trap
    if(streakCount>0){streakCount=0;streakLostTimer=60;sfxStreakLost();}
    // Lose a random card
    const filled=[];
    for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)filled.push(i);}
    if(filled.length>0){
      const slot=filled[Math.floor(Math.random()*filled.length)];
      const lost=pl[0].cd[slot];
      pl[0].cd[slot]=0;
      syncCardCount(0);
      lg.push('Trap! Lost '+CD[lost-1].n+'!');
      objectInteractMsg='Lost '+CD[lost-1].n+' to a trap!';
      objectInteractTimer=120;
    }else{
      lg.push('Trap triggered but you had no cards!');
      objectInteractMsg='Trap triggered! Lucky - no cards to lose.';
      objectInteractTimer=120;
    }
    return true;
  }
  return false;
}

// ═══════════════════════════════════════
// RUINS PUZZLE
// ═══════════════════════════════════════
function checkPuzzleInteraction(){
  if(currentMap!==2||puzzleSolved)return false;
  const p=pl[0];
  let fx=p.x,fy=p.y;
  if(p.dir===0)fy++;else if(p.dir===2)fy--;
  else if(p.dir===1)fx--;else if(p.dir===3)fx++;
  // Check if facing a puzzle pillar
  for(let i=0;i<3;i++){
    const pp=puzzlePillarPositions[i];
    if(fx===pp.x&&fy===pp.y){
      // Cycle stone at position i
      puzzleStoneOrder[i]=(puzzleStoneOrder[i]+1)%3;
      sfxSelect();
      const name=puzzleNames[puzzleStoneOrder[i]];
      puzzleMessage='Stone '+String(i+1)+' is now '+name;
      puzzleMessageTimer=90;
      // Check if solved: 0=red(fire), 1=blue(water), 2=yellow(light)
      if(puzzleStoneOrder[0]===0&&puzzleStoneOrder[1]===1&&puzzleStoneOrder[2]===2){
        puzzleSolved=true;
        sfxPuzzle();
        puzzleMessage='The passage opens!';
        puzzleMessageTimer=180;
        twSet('The passage opens! A void card appears!');
        lg.push('Ruins puzzle solved!');
        // Give a rare card from the current floor pool — prefer vault-new
        const pzPool=AREA_CARDS[currentMap]||AREA_CARDS[1];
        const vault_pz=pl[0].vault||new Set();
        const pzNewPool=pzPool.filter(id=>!vault_pz.has(id));
        const pzCard=(pzNewPool.length>0?pzNewPool:pzPool)[Math.floor(Math.random()*(pzNewPool.length>0?pzNewPool:pzPool).length)];
        const pzAdded=addCardToPlayer(0,pzCard); // updates vault + hand
        if(pzAdded){
          startCardAcquisition(pzCard-1);
          checkWinAndTransition(2000);
        }else{
          discardActive=true;discardSelIdx=0;discardPendingCard=pzCard;discardSource='wild';
        }
      }
      return true;
    }
  }
  return false;
}

function drawPuzzlePillars(){
  if(currentMap!==2)return;
  for(let i=0;i<3;i++){
    const pp=puzzlePillarPositions[i];
    const px=pp.x*TW-camX,py=pp.y*TH-camY;
    if(px<-TW||px>W||py<-TH||py>H)continue;
    if(!fogRevealed[2][pp.y]?.[pp.x])continue;
    // Draw colored pillar
    const col=puzzleColors[puzzleStoneOrder[i]];
    if(!puzzleSolved){
      bx(px+4,py+2,8,12,col);
      bx(px+5,py+3,6,10,lighten(col,.15));
      bx(px+3,py,10,3,col);
      // Label
      const label=puzzleNames[puzzleStoneOrder[i]][0];
      tx(label,px+5,py+13,5,'#fff');
      // Glow
      const pulse=Math.sin(fr*.06+i*2)*.2+.4;
      g.fillStyle=col.replace(')',`,${pulse})`).replace('rgb','rgba');
      if(col[0]==='#'){
        g.fillStyle=`rgba(${parseInt(col.slice(1,3),16)},${parseInt(col.slice(3,5),16)},${parseInt(col.slice(5,7),16)},${pulse})`;
      }
      g.beginPath();g.arc(px+8,py+8,8,0,Math.PI*2);g.fill();
    }
  }
}

function drawPuzzleMessage(){
  if(puzzleMessageTimer<=0)return;
  puzzleMessageTimer--;
  const alpha=puzzleMessageTimer>20?1:puzzleMessageTimer/20;
  g.globalAlpha=alpha;
  win(W/2-160,H/2-20,320,36);
  tx(puzzleMessage,W/2-140,H/2+4,7,'#d0c040');
  g.globalAlpha=1;
}

// ═══════════════════════════════════════
// BUILDING INTERIORS
// ═══════════════════════════════════════
function enterBuilding(type,doorX,doorY){
  buildingType=type;
  buildingReturnX=pl[0].x;
  buildingReturnY=pl[0].y;
  buildingReturnMap=currentMap;
  buildingPlayerX=4;
  buildingPlayerY=6;
  buildingPlayerDir=2;
  sfxDoorOpen();
  // Door opening animation: dark rectangle expanding from door position
  const doorScreenX=doorX*TW-camX+TW/2;
  const doorScreenY=doorY*TH-camY+TH/2;
  startWipe('door_open',20,()=>{
    inBuilding=true;
    startWipe('door_close',15);
  },doorScreenX,doorScreenY);
}

function exitBuilding(){
  sfxDoorOpen();
  // Door close animation then restore map
  startWipe('door_open',15,()=>{
    inBuilding=false;
    pl[0].x=buildingReturnX;
    pl[0].y=buildingReturnY;
    currentMap=buildingReturnMap;
    startWipe('door_close',15,null,W/2,H/2);
  },W/2,H/2);
}

function getBuildingMap(){
  if(buildingType==='shop')return BUILDING_SHOP;
  if(buildingType==='info')return BUILDING_INFO;
  return BUILDING_SHOP;
}

function buildingTileWalkable(t){return t===0||t===4||t===5;}

function checkBuildingEntry(){
  const p=pl[0],m=getMap();
  let fx=p.x,fy=p.y;
  if(p.dir===0)fy++;else if(p.dir===2)fy--;
  else if(p.dir===1)fx--;else if(p.dir===3)fx++;
  if(fx>=0&&fx<MW&&fy>=0&&fy<MH){
    const t=m[fy]?.[fx];
    // Trading Post / Spy Masters Den — tile 5 or 15 at specific locations in town
    if(currentMap===0&&t===5){
      // Check which building: (8,5) is trading post, (22,5)=spy master area -> (22,6 door)
      if(fx===8&&fy===5){enterBuilding('shop',fx,fy);return true;}
      if(fx===20&&fy===11){enterBuilding('shop',fx,fy);return true;}
    }
    if(currentMap===0&&t===15){
      // Blue building = Spy Masters Den
      if(fx===22&&fy===5){enterBuilding('info',fx,fy);return true;}
    }
  }
  return false;
}

function drawBuildingInterior(){
  // Black background
  bx(0,0,W,H,'#1a1a2a');
  const bm=getBuildingMap();
  const tileSize=32; // Larger tiles for interior
  const offsetX=W/2-BUILDING_W*tileSize/2;
  const offsetY=H/2-BUILDING_H*tileSize/2-20;

  for(let y=0;y<BUILDING_H;y++){
    for(let x=0;x<BUILDING_W;x++){
      const t=bm[y][x];
      const px=offsetX+x*tileSize,py=offsetY+y*tileSize;
      if(t===0){
        // Floor
        bx(px,py,tileSize,tileSize,'#c0b090');
        bx(px,py,tileSize,1,'#d0c0a0');
        if((x+y)%2===0)bx(px,py,tileSize,tileSize,'rgba(0,0,0,.04)');
      }else if(t===1){
        // Wall
        bx(px,py,tileSize,tileSize,'#605848');
        bx(px+1,py+1,tileSize-2,tileSize-2,'#706858');
        // Brick pattern
        for(let by=0;by<tileSize;by+=8){
          for(let bxx=0;bxx<tileSize;bxx+=12){
            bx(px+bxx,py+by,11,7,'#786858');
          }
        }
      }else if(t===2){
        // Counter
        bx(px,py,tileSize,tileSize,'#c0b090');
        bx(px,py+4,tileSize,tileSize-4,'#805830');
        bx(px+1,py+5,tileSize-2,tileSize-6,'#906838');
        bx(px,py+4,tileSize,2,'#a07840');
      }else if(t===3){
        // Shelf
        bx(px,py,tileSize,tileSize,'#706858');
        bx(px+2,py+4,tileSize-4,6,'#805830');
        bx(px+2,py+16,tileSize-4,6,'#805830');
        // Card displays on shelf
        for(let i=0;i<3;i++){
          const cx=px+4+i*9,cy=py+5;
          const cr=CD[i%5];
          bx(cx,cy-2,7,4,cr.c);
          bx(cx,cy+10,7,4,cr.c);
        }
      }else if(t===4){
        // Exit door
        bx(px,py,tileSize,tileSize,'#c0b090');
        bx(px+4,py,tileSize-8,tileSize,'#483838');
        bx(px+6,py+2,tileSize-12,tileSize-4,'#382828');
        // Arrow indicator
        const bob=Math.sin(fr*0.1)*2;
        tx('EXIT',px+4,py+tileSize/2+4+bob,5,'#f0c830');
      }else if(t===5){
        // NPC position (floor underneath)
        bx(px,py,tileSize,tileSize,'#c0b090');
        if((x+y)%2===0)bx(px,py,tileSize,tileSize,'rgba(0,0,0,.04)');
      }
    }
  }

  // Draw NPC in building
  const npcX=4,npcY=4; // NPC behind counter
  const npx=offsetX+npcX*tileSize,npy=offsetY+npcY*tileSize;
  // Simple NPC sprite (larger)
  bx(npx+8,npy+4,16,20,'#f0dcc0');
  if(buildingType==='shop'){
    bx(npx+6,npy+10,20,14,'#8050a0');
    bx(npx+8,npy,16,8,'#404048');
  }else{
    bx(npx+6,npy+10,20,14,'#407048');
    bx(npx+8,npy,16,8,'#604830');
  }
  bx(npx+10,npy+6,4,3,'#181820');bx(npx+18,npy+6,4,3,'#181820');
  // Diamond above NPC
  const bobY=Math.sin(fr*0.08)*2;
  bx(npx+14,npy-8+bobY,4,4,buildingType==='shop'?'#4080d0':'#40b060');

  // Draw player in building
  const ppx=offsetX+buildingPlayerX*tileSize,ppy=offsetY+buildingPlayerY*tileSize;
  // Simplified sprite at interior scale
  bx(ppx+8,ppy+16,16,8,'#4050a0'); // pants
  bx(ppx+6,ppy+8,20,10,'#4080d0'); // shirt
  bx(ppx+8,ppy,16,10,'#f0dcc0'); // head
  bx(ppx+8,ppy-2,16,6,'#282830'); // hair
  if(buildingPlayerDir===2){
    bx(ppx+10,ppy+4,4,3,'#181820');bx(ppx+18,ppy+4,4,3,'#181820');
  }

  // HUD for building
  const hudY=H-40;
  win(0,hudY,W,40);
  tx(buildingType==='shop'?'TRADING POST':'SPY MASTERS DEN',10,hudY+20,8,'#806030');
  if(buildingType==='info'){
    const statusClr=x402Available?'#40a060':'#605060';
    const statusTxt=x402Available?'x402 ONLINE':'x402 OFFLINE';
    tx(statusTxt,140,hudY+20,5,statusClr);
  }
  tx('Z=Interact  X=Exit  Arrows=Move',280,hudY+20,6,'#686068');

  // Building NPC dialog
  if(buildingNpcDialog){
    const line=buildingNpcLines[buildingNpcIdx]||'';
    const line2=buildingNpcLines[buildingNpcIdx+1]||'';
    win(6,H-120,W-12,70);
    win(10,H-130,buildingNpcName.length*9+20,20);
    tx(buildingNpcName,20,H-115,7,'#c04040');
    tx(line,20,H-90,7,'#303028');
    if(line2)tx(line2,20,H-72,7,'#303028');
    const arrowBounce=Math.sin(fr*0.15)*2;
    tx('\u25BC',W-24,H-58+arrowBounce,7,'#c04040');
  }

  // Info broker confirm/result
  if(infoBrokerConfirm){
    bx(0,0,W,H,'rgba(0,0,0,.4)');
    win(W/2-180,H/2-60,360,120);
    tx('Pay 1 card for rival locations?',W/2-160,H/2-30,7,'#303028');
    tx('Z=Yes  X=No',W/2-60,H/2+10,7,'#c04040');
  }
  if(infoBrokerResultTimer>0){
    infoBrokerResultTimer--;
    const a=infoBrokerResultTimer>20?1:infoBrokerResultTimer/20;
    g.globalAlpha=a;
    win(W/2-200,H/2-40,400,80);
    // Word wrap
    const maxC=46;
    let l1=infoBrokerResult,l2='';
    if(infoBrokerResult.length>maxC){
      let brk=infoBrokerResult.lastIndexOf(' ',maxC);
      if(brk<1)brk=maxC;
      l1=infoBrokerResult.substring(0,brk);
      l2=infoBrokerResult.substring(brk+1);
    }
    tx(l1,W/2-180,H/2-10,7,'#303028');
    if(l2)tx(l2,W/2-180,H/2+8,7,'#303028');
    g.globalAlpha=1;
  }

  // ── GACHA OVERLAY ──
  if(gachaActive){
    bx(0,0,W,H,'rgba(0,0,0,.7)');
    const gw=400,gh=340,gx=W/2-gw/2,gy=H/2-gh/2;
    win(gx,gy,gw,gh);
    // Header
    bx(gx,gy,gw,28,'#1a1a30');
    txShadow('GACHA',gx+gw/2-42,gy+20,14,'#f8c840','rgba(0,0,0,.5)');
    // Vault progress
    const vSize=pl[0].vault?pl[0].vault.size:0;
    txShadow('Collection: '+vSize+'/60',gx+8,gy+40,7,'#c8c0a0','rgba(0,0,0,.3)');

    if(gachaPhase==='menu'){
      tx('Choose a draw type:',gx+16,gy+58,8,'#d0c8a0');
      GACHA_TIERS.forEach((t,i)=>{
        const isSelected=gachaSelectedTier===i;
        const ty_=gy+76+i*62;
        bx(gx+12,ty_,gw-24,54,isSelected?'#2a2a50':'#181828');
        if(isSelected)bx(gx+12,ty_,gw-24,54,'rgba(248,200,64,.1)');
        bx(gx+12,ty_,3,54,isSelected?'#f8c840':'#3a3a60');
        tx(t.name,gx+22,ty_+14,9,isSelected?'#f8f0e0':'#b0a8c0');
        tx(t.label,gx+22,ty_+28,8,'#f0c040');
        // Rarity preview dots
        const uniqueR=[...new Set(t.rarities)].sort();
        uniqueR.forEach((r,ri)=>{
          const dotX=gx+gw-80+ri*14;
          bx(dotX,ty_+14,10,10,RARITY_COLOR[r]);
          tx('★',dotX,ty_+25,5,RARITY_COLOR[r]);
        });
        if(isSelected)tx('\u25b6',gx+gw-30,ty_+26,8,'#f8c840');
      });
      bx(gx+12,gy+gh-44,gw-24,1,'#282848');
      // Pity counter
      const pityLeft=GACHA_PITY_THRESHOLD-gachaPityCount;
      const pityCol=gachaPityCount>=7?'#f0c830':gachaPityCount>=4?'#e08040':'#686878';
      tx('PITY: '+gachaPityCount+'/'+GACHA_PITY_THRESHOLD+(pityLeft<=3?' — RARE SOON!':''),gx+16,gy+gh-40,6,pityCol);
      tx('[Z] Draw   [X] Cancel',gx+16,gy+gh-26,7,'#686878');
      // v86: Pull history panel (right of main panel)
      if(gachaHistory.length>0){
        const hx=gx+gw+8,hy=gy,hw=180,hh=gh;
        win(hx,hy,hw,hh);
        bx(hx,hy,hw,28,'#1a1a30');
        txShadow('RECENT',hx+hw/2-36,hy+20,11,'#c8b870','rgba(0,0,0,.4)');
        bx(hx,hy+28,hw,1,'#282848');
        const rarLabels=['','Common','Uncommon','Rare','Epic','Legendary'];
        const rarColors_=['','#50d060','#5090f0','#b060e0','#e0a020','#fff8e0'];
        gachaHistory.forEach((h,i)=>{
          const hy2=hy+36+i*36;
          const cr3=CD[h.cardId-1];
          const rcol3=rarColors_[h.rarity]||'#888888';
          // Rarity dot
          bx(hx+10,hy2-6,10,10,rcol3);
          // Card name
          const nm=cr3.n.length>14?cr3.n.substring(0,13)+'.':cr3.n;
          tx(nm,hx+26,hy2+2,7,i===0?'#f8f0e0':'#a0a0a0');
          // Rarity label tiny
          tx(rarLabels[h.rarity]||'',hx+26,hy2+14,5,rcol3);
        });
      }
    }else if(gachaPhase==='spinning'){
      gachaSpinFrame++;
      const sf=gachaSpinFrame;
      // Know the result card already — use its rarity for color teaser
      const resultCr=gachaResultCard>0?CD[gachaResultCard-1]:null;
      const rar=resultCr?resultCr.r:1;
      const rarCol=RARITY_COLOR[rar]||'#f8c840';
      const cx_=W/2,cy_=H/2-20;
      // Phase 1 (0-30): Dark energy sphere gathering
      if(sf<30){
        const grow=sf/30;
        const pulse=0.5+0.5*Math.sin(sf*0.4);
        // Pulsing dark sphere
        const r1=20+grow*30;
        const grd=g.createRadialGradient(cx_,cy_,0,cx_,cy_,r1);
        grd.addColorStop(0,'rgba(40,20,80,.8)');
        grd.addColorStop(0.7,'rgba(20,10,40,.6)');
        grd.addColorStop(1,'rgba(0,0,0,0)');
        g.fillStyle=grd;g.fillRect(cx_-r1-5,cy_-r1-5,r1*2+10,r1*2+10);
        // Energy sparks converging to center
        for(let i=0;i<8;i++){
          const ang=sf*0.1+i*(Math.PI*2/8);
          const dist=(1-grow)*80+8;
          g.fillStyle=`rgba(120,80,220,${pulse*.8})`;
          g.fillRect(cx_+Math.cos(ang)*dist-2,cy_+Math.sin(ang)*dist-2,4,4);
        }
        txShadow('DRAWING...',cx_-52,cy_+62,9,'#6060a0','rgba(0,0,0,.5)');
      }
      // Phase 2 (30-55): Sphere cracks — rarity color teaser
      else if(sf<55){
        const prog=(sf-30)/25;
        const glowR=50+prog*20;
        const glowGrd=g.createRadialGradient(cx_,cy_,0,cx_,cy_,glowR);
        glowGrd.addColorStop(0,rarCol.replace('#','rgba(').split('').join('')); // approximate
        g.globalAlpha=prog*0.6;
        // Simplified: just draw color rings
        g.strokeStyle=rarCol;g.lineWidth=2+prog*4;
        g.globalAlpha=prog*0.5;
        g.beginPath();g.arc(cx_,cy_,glowR*0.6,0,Math.PI*2);g.stroke();
        g.beginPath();g.arc(cx_,cy_,glowR*0.3,0,Math.PI*2);g.stroke();
        g.globalAlpha=1;
        // Pulsing ? symbol in rarity color
        const qPulse=0.5+0.5*Math.sin(sf*0.5);
        g.globalAlpha=qPulse;
        txShadow('?',cx_-12,cy_+12,24,rarCol,'rgba(0,0,0,.6)');
        g.globalAlpha=1;
        txShadow('Something is emerging...',cx_-88,cy_+62,8,rarCol,'rgba(0,0,0,.4)');
      }
      // Phase 3 (55-75): Card silhouette materializes
      else if(sf<75){
        const prog=(sf-55)/20;
        const cardW_=80,cardH_=110;
        const cardX_=cx_-cardW_/2,cardY_=cy_-cardH_/2;
        // Silhouette (dark with rarity border)
        bx(cardX_,cardY_,cardW_,cardH_,rarCol);
        bx(cardX_+2,cardY_+2,cardW_-4,cardH_-4,'#0c0c20');
        // Rarity color seeps in proportionally
        g.globalAlpha=prog;
        if(gachaResultCard>0){drawCardFrame(cardX_,cardY_,cardW_,cardH_,gachaResultCard-1,true);}
        g.globalAlpha=1;
        // Rarity burst sparks
        for(let i=0;i<6;i++){
          const ang=sf*0.12+i*(Math.PI*2/6);
          const dist=60+prog*30;
          g.globalAlpha=0.8*(1-prog)*0.5;
          g.fillStyle=rarCol;g.fillRect(cx_+Math.cos(ang)*dist-3,cy_+Math.sin(ang)*dist-3,6,6);
          g.globalAlpha=1;
        }
      }
      // Transition to result
      if(sf>=75){
        gachaPhase='result';gachaResultFrame=fr;
        if(rar>=4)screenShake(rar-2,rar*3);
        if(rar>=5)flash();
      }
    }else if(gachaPhase==='result'&&gachaResultCard>0){
      const t2=fr-gachaResultFrame;
      const cr=CD[gachaResultCard-1];
      const slideIn=Math.min(1,t2/20);
      g.globalAlpha=slideIn;
      // Card display
      const cardX=W/2-50,cardY=H/2-70;
      drawCardFrame(cardX,cardY,100,130,gachaResultCard-1,true);
      // Rarity label
      bx(gx+gw/2-60,gy+gh-90,120,20,RARITY_COLOR[cr.r]+'33');
      txShadow(RARITY_LABEL[cr.r]+'  '+cr.n,gx+gw/2-56,gy+gh-76,9,RARITY_COLOR[cr.r],'rgba(0,0,0,.5)');
      // Is new?
      const isNew=!pl[0].vault||!pl[0].vault.has(gachaResultCard);
      if(isNew&&t2>15){txShadow('NEW!',W/2+40,H/2-60,12,'#f0c830','rgba(0,0,0,.6)');}
      // Pity pull indicator
      if(gachaPityTriggered&&t2>20){
        const ppA=Math.min(1,(t2-20)/8);g.globalAlpha=ppA;
        txShadow('PITY PULL!',gx+gw/2-50,gy+gh-54,10,'#f0c830','rgba(0,0,0,.5)');
        g.globalAlpha=1;
      }
      g.globalAlpha=1;
      if(t2>30){tx('[Z] Take   [X] Close',gx+16,gy+gh-36,7,'#686878');}
    }
  }

  // x402 shop overlay
  if(x402ShopOpen){
    bx(0,0,W,H,'rgba(0,0,0,.5)');
    const shopW=440,shopH=x402ShopItems.length*26+80;
    const sx=W/2-shopW/2,sy=H/2-shopH/2;
    win(sx,sy,shopW,shopH);
    tx('BUY INTEL',sx+shopW/2-40,sy+18,9,'#c04040');
    // x402 status with endpoint URL
    if(x402Available){
      tx('x402 ONLINE',sx+shopW-100,sy+14,5,'#40a060');
      tx(x402ServerUrl,sx+shopW-100,sy+24,4,'#40a060');
    }else{
      tx('OFFLINE',sx+shopW-80,sy+18,5,'#a04040');
    }
    for(let i=0;i<x402ShopItems.length;i++){
      const item=x402ShopItems[i];
      const iy=sy+38+i*26;
      const sel=i===x402ShopIdx;
      if(sel)bx(sx+8,iy-4,shopW-16,22,'rgba(60,60,100,.4)');
      tx((sel?'> ':' ')+item.label,sx+16,iy+8,7,sel?'#e0e0f0':'#808098');
      // Show USDC price when x402 is online, card cost when offline
      const displayPrice=x402Available?item.price:(item.priceOffline||item.price);
      const priceCol=item.cardCost===0?'#40a060':'#c08040';
      tx(displayPrice,sx+shopW-120,iy+8,6,priceCol);
      // Show endpoint path when online
      if(x402Available&&!item.isInfo){
        tx(item.endpoint,sx+shopW-120,iy+16,4,'#555580');
      }
    }
    tx('Z=Buy  X=Close',sx+shopW/2-60,sy+shopH-18,6,'#686068');
    if(x402ShopLoading){
      bx(0,0,W,H,'rgba(0,0,0,.3)');
      tx('Fetching intel...',W/2-70,H/2,8,'#80c0e0');
    }
  }
  // x402 "HOW IT WORKS" info overlay
  if(x402HowItWorksActive){
    bx(0,0,W,H,'rgba(0,0,0,.6)');
    const iw=440,ih=x402HowItWorksText.length*18+50;
    const ix=W/2-iw/2,iy=H/2-ih/2;
    win(ix,iy,iw,ih);
    tx('HOW x402 WORKS',ix+iw/2-70,iy+20,9,'#14F195');
    for(let i=0;i<x402HowItWorksText.length;i++){
      tx(x402HowItWorksText[i],ix+20,iy+42+i*18,6,'#c0c0d0');
    }
    tx('Press Z or X to close',ix+iw/2-80,iy+ih-16,6,'#686068');
  }
  // AGENT MARKETPLACE overlay
  if(agentMarketplaceActive){
    bx(0,0,W,H,'rgba(0,0,0,.6)');
    const amw=440,amh=agentMarketplaceText.length*18+50;
    const amx=W/2-amw/2,amy=H/2-amh/2;
    win(amx,amy,amw,amh);
    tx('AGENT MARKETPLACE',amx+amw/2-80,amy+20,9,'#9945FF');
    for(let i=0;i<agentMarketplaceText.length;i++){
      tx(agentMarketplaceText[i],amx+20,amy+42+i*18,6,'#c0c0d0');
    }
    tx('Press Z or X to close',amx+amw/2-80,amy+amh-16,6,'#686068');
  }

  // x402 shop result overlay
  if(x402ShopResultTimer>0&&!x402ShopOpen){
    x402ShopResultTimer--;
    const a=x402ShopResultTimer>20?1:x402ShopResultTimer/20;
    g.globalAlpha=a;
    win(W/2-220,H/2-50,440,100);
    tx('INTEL REPORT',W/2-50,H/2-30,8,'#c04040');
    // Word wrap the result
    const maxC2=52;
    const rr=x402ShopResult;
    let rl1=rr,rl2='',rl3='';
    if(rr.length>maxC2){
      let b=rr.lastIndexOf(' ',maxC2);if(b<1)b=maxC2;
      rl1=rr.substring(0,b);const rest=rr.substring(b+1);
      if(rest.length>maxC2){let b2=rest.lastIndexOf(' ',maxC2);if(b2<1)b2=maxC2;rl2=rest.substring(0,b2);rl3=rest.substring(b2+1);}
      else rl2=rest;
    }
    tx(rl1,W/2-200,H/2-8,6,'#303028');
    if(rl2)tx(rl2,W/2-200,H/2+8,6,'#303028');
    if(rl3)tx(rl3,W/2-200,H/2+24,6,'#303028');
    g.globalAlpha=1;
  }
}

// ═══════════════════════════════════════
// INTERACTABLE OBJECTS
// ═══════════════════════════════════════
function getFacingTile(){
  const p=pl[0],m=getMap();
  let fx=p.x,fy=p.y;
  if(p.dir===0)fy++;else if(p.dir===2)fy--;
  else if(p.dir===1)fx--;else if(p.dir===3)fx++;
  if(fx>=0&&fx<MW&&fy>=0&&fy<MH)return{x:fx,y:fy,tile:m[fy]?.[fx]};
  return null;
}

function checkObjectInteraction(){
  const ft=getFacingTile();
  if(!ft)return false;
  const key=currentMap+'-'+ft.x+'-'+ft.y;

  // Tree interaction (type 3)
  if(ft.tile===3){
    if(shakenTrees.has(key)){
      objectInteractMsg='Already shaken this tree.';
      objectInteractTimer=60;
      return true;
    }
    shakenTrees.add(key);
    if(Math.random()<0.1){
      // 10% chance: card falls out — prefer vault-new
      const treePool=AREA_CARDS[currentMap]||AREA_CARDS[1];
      const vault_t=pl[0].vault||new Set();
      const treeNewPool=treePool.filter(id=>!vault_t.has(id));
      const treeCardId=(treeNewPool.length>0?treeNewPool:treePool)[Math.floor(Math.random()*(treeNewPool.length>0?treeNewPool:treePool).length)];
      const cardIdx=treeCardId-1;
      const treeAdded=addCardToPlayer(0,treeCardId); // updates vault + hand
      if(treeAdded){
        startCardAcquisition(cardIdx);
        objectInteractMsg='A card fell from the tree!';
        lg.push('Shook tree: Found '+CD[cardIdx].n+'!');
        checkWinAndTransition(2000);
      }else{
        discardActive=true;discardSelIdx=0;discardPendingCard=treeCardId;discardSource='wild';
        objectInteractMsg='Found '+CD[cardIdx].n+'! Discard to keep.';
      }
    }else{
      objectInteractMsg='Nothing fell from the tree.';
    }
    objectInteractTimer=90;
    sfxSelect();
    return true;
  }

  // Rock interaction (type 8)
  if(ft.tile===8){
    if(pushedRocks.has(key)){
      objectInteractMsg='Already checked this rock.';
      objectInteractTimer=60;
      return true;
    }
    pushedRocks.add(key);
    sfxSelect();
    if(Math.random()<0.2){
      const areaCards=AREA_CARDS[currentMap]||AREA_CARDS[1];
      const vault_r=pl[0].vault||new Set();
      const rockNewPool=areaCards.filter(id=>!vault_r.has(id));
      const cardId=(rockNewPool.length>0?rockNewPool:areaCards)[Math.floor(Math.random()*(rockNewPool.length>0?rockNewPool:areaCards).length)];
      const rockAdded=addCardToPlayer(0,cardId); // updates vault + hand
      if(rockAdded){
        startCardAcquisition(cardId-1);
        objectInteractMsg='Found a hidden card under the rock!';
        lg.push('Rock: Found '+CD[cardId-1].n+'!');
        checkWinAndTransition(2000);
      }else{
        discardActive=true;discardSelIdx=0;discardPendingCard=cardId;discardSource='wild';
        objectInteractMsg='Found '+CD[cardId-1].n+'! Discard to keep.';
      }
    }else{
      objectInteractMsg='Nothing under the rock.';
    }
    objectInteractTimer=90;
    return true;
  }

  // Campfire interaction (type 29, Forest only)
  if(ft.tile===29&&currentMap===1){
    if(campfireUsed){
      objectInteractMsg='Already rested here.';
      objectInteractTimer=60;
      return true;
    }
    campfireUsed=true;
    sfxConfirm();
    // Restore 1 spell charge: rotate Steal->Barrier->Scout
    if(sp.s<3){sp.s++;objectInteractMsg='Rested by campfire. +1 Steal charge!';lg.push('Campfire: +1 Steal!');}
    else if(sp.b<3){sp.b++;objectInteractMsg='Rested by campfire. +1 Barrier charge!';lg.push('Campfire: +1 Barrier!');}
    else if(sp.c<3){sp.c++;objectInteractMsg='Rested by campfire. +1 Scout charge!';lg.push('Campfire: +1 Scout!');}
    else{
      // All spells full — extend nearest-to-expiry card timer by 60s
      let nearestSlot=-1,nearestAge=0;
      for(let i=0;i<HAND_SIZE;i++){if(cardTimers[i]>0){const age=Date.now()-cardTimers[i];if(age>nearestAge){nearestAge=age;nearestSlot=i;}}}
      if(nearestSlot>=0){cardTimers[nearestSlot]+=60000;objectInteractMsg='Rested. '+CD[pl[0].cd[nearestSlot]-1].n+' decay slowed!';lg.push('Campfire: Extended '+CD[pl[0].cd[nearestSlot]-1].n+' timer!');}
      else{objectInteractMsg='Rested, but nothing to restore.';}
    }
    objectInteractTimer=120;
    return true;
  }

  // Fountain interaction (type 20, Corsair Bay)
  if(ft.tile===20&&currentMap===0){
    const filled=[];
    for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)filled.push(i);}
    if(filled.length===0){
      objectInteractMsg='Toss a card? You have none!';
      objectInteractTimer=90;
      return true;
    }
    fountainActive=true;
    fountainConfirm=true;
    sfxSelect();
    return true;
  }

  // Crystal interaction (type 26, any dungeon floor)
  if(ft.tile===26&&inDungeon){
    if(usedCrystals.has(key)){
      objectInteractMsg='This crystal is spent.';
      objectInteractTimer=60;
      return true;
    }
    usedCrystals.add(key);
    sfxSelect();
    if(Math.random()<0.5){
      // Reveal rivals on minimap for 60 seconds (3600 frames)
      crystalRevealTimer=3600;
      objectInteractMsg='The crystal glows! Rivals revealed!';
      lg.push('Crystal: Rivals revealed for 60s!');
    }else{
      objectInteractMsg='The crystal shattered! Nothing happened.';
      lg.push('Crystal shattered.');
    }
    objectInteractTimer=120;
    flash();
    return true;
  }

  // Altar interaction (type 27, deep dungeon floors 3-5)
  if(ft.tile===27&&inDungeon){
    if(usedCrystals.has(key+'_altar')){
      objectInteractMsg='The altar is silent.';
      objectInteractTimer=60;
      return true;
    }
    usedCrystals.add(key+'_altar');
    sfxSelect();flash();
    const roll=Math.random();
    if(roll<0.4){
      // Restore a spell charge (prayer answered)
      if(sp.s<3){sp.s++;objectInteractMsg='The altar hums. +1 Steal charge!';lg.push('Altar: +1 Steal!');}
      else if(sp.b<3){sp.b++;objectInteractMsg='The altar hums. +1 Barrier charge!';lg.push('Altar: +1 Barrier!');}
      else{sp.c=Math.min(3,sp.c+1);objectInteractMsg='The altar hums. +1 Scout charge!';lg.push('Altar: +1 Scout!');}
    }else if(roll<0.7){
      // Extend decay on the most-decayed card
      let nearestSlot=-1,nearestAge=0;
      for(let i=0;i<HAND_SIZE;i++){if(cardTimers[i]>0){const age=Date.now()-cardTimers[i];if(age>nearestAge){nearestAge=age;nearestSlot=i;}}}
      if(nearestSlot>=0&&pl[0].cd[nearestSlot]>0){
        cardTimers[nearestSlot]+=90000; // +1.5 min extra
        objectInteractMsg='The altar preserved '+CD[pl[0].cd[nearestSlot]-1].n+'! +1.5min';
        lg.push('Altar: Extended '+CD[pl[0].cd[nearestSlot]-1].n+' by 1.5min!');
      }else{
        objectInteractMsg='The altar glows... but no cards to protect.';
      }
    }else{
      // Nothing / minor flash
      objectInteractMsg='The altar is cold. Nothing happens.';
      lg.push('Altar: No effect.');
    }
    objectInteractTimer=120;
    return true;
  }

  return false;
}

function doFountainExchange(){
  const filled=[];
  for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]>0)filled.push(i);}
  if(filled.length===0)return;
  // Remove random card, give vault-new card if possible
  const slot=filled[Math.floor(Math.random()*filled.length)];
  const oldCard=pl[0].cd[slot];
  const vault_fn=pl[0].vault||new Set();
  const ownedInHand_fn=new Set(pl[0].cd.filter(c=>c>0));
  const fnNew=[],fnOwned=[];
  for(let i=1;i<=60;i++){
    if(i===oldCard)continue;
    if(!vault_fn.has(i))fnNew.push(i);
    else if(!ownedInHand_fn.has(i))fnOwned.push(i);
  }
  let newCard;
  if(fnNew.length>0)newCard=fnNew[Math.floor(Math.random()*fnNew.length)];
  else if(fnOwned.length>0)newCard=fnOwned[Math.floor(Math.random()*fnOwned.length)];
  else{do{newCard=Math.floor(Math.random()*60)+1;}while(newCard===oldCard);}
  pl[0].cd[slot]=0;cardTimers[slot]=0;syncCardCount(0); // clear old slot
  addCardToPlayer(0,newCard); // updates vault + hand
  startCardAcquisition(newCard-1);
  fountainResult='The fountain glows! Received '+CD[newCard-1].n+'!';
  fountainResultTimer=120;
  lg.push('Fountain: Traded '+CD[oldCard-1].n+' for '+CD[newCard-1].n+'!');
  sfxShopTrade();
  checkWinAndTransition(2000);
}

// v85: Floor-clear fanfare — dramatic cinematic overlay on floor descent
function drawFloorClearFanfare(){
  if(!floorFanfareActive||!floorFanfareData)return;
  floorFanfareTimer++;
  const maxT=130;
  if(floorFanfareTimer>maxT){floorFanfareActive=false;floorFanfareData=null;return;}
  const t=floorFanfareTimer;
  const d=floorFanfareData;
  // Fade in 0-15, hold 15-110, fade out 110-130
  const alpha=t<15?t/15:t>110?(maxT-t)/20:1;
  const rar=d.rarity;
  const rarCols=['','#50d060','#5090f0','#b060e0','#e0a020','#fff8e0'];
  const rcol=rarCols[rar]||'#c0c0c0';
  const floorNums=['','I','II','III','IV','V'];
  // Dim background overlay
  g.globalAlpha=alpha*0.78;
  g.fillStyle='rgba(4,4,14,1)';g.fillRect(0,0,W,H);
  g.globalAlpha=1;
  // Panel
  const pw=440,ph=220,px_=W/2-pw/2,py_=H/2-ph/2-20;
  g.globalAlpha=alpha;
  win(px_,py_,pw,ph);
  // Rarity-colored header bar
  bx(px_,py_,pw,3,rcol);
  bx(px_,py_+ph-1,pw,1,'rgba(200,180,100,.3)');
  // "FLOOR X CLEARED!" header
  const flRoman=floorNums[d.floor]||d.floor;
  txShadow('FLOOR '+flRoman+' CLEARED',px_+pw/2-130,py_+28,16,'#f0e0a0','rgba(0,0,0,.6)');
  bx(px_+16,py_+34,pw-32,1,'rgba(200,180,100,.2)');
  // Card display (left side of panel)
  const cX=px_+60,cY=py_+80;
  const cw_=56,ch_=80;
  // Rarity glow behind card
  const glA=0.5+Math.sin(t*0.12)*0.2;
  g.globalAlpha=alpha*glA;
  const grd=g.createRadialGradient(cX+cw_/2,cY+ch_/2,0,cX+cw_/2,cY+ch_/2,50);
  grd.addColorStop(0,rcol.replace('#','rgba(').replace(/([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/,
    (_,r,g_,b)=>`${parseInt(r,16)},${parseInt(g_,16)},${parseInt(b,16)}`)+',0.5)').replace('rgba(','rgba(').replace('#','')||'rgba(200,160,80,0.5)';
  // Simpler glow:
  g.globalAlpha=alpha*glA*0.55;
  bx(cX-12,cY-12,cw_+24,ch_+24,rcol+'40'||'rgba(200,160,80,.3)');
  g.globalAlpha=alpha;
  // Card frame
  const cr2=CD[d.cardId-1];
  bx(cX,cY,cw_,ch_,cr2.d);bx(cX+2,cY+2,cw_-4,ch_-4,cr2.c);
  drawCardCharacter(cX+4,cY+4,d.cardId,1.8,fr+t);
  // Rarity orbit sparks
  const sparkCount=2+rar*2;
  for(let i=0;i<sparkCount;i++){
    const ang=t*0.12+i*(Math.PI*2/sparkCount);
    const dist=38+Math.sin(t*0.1)*4;
    g.globalAlpha=alpha*0.75;
    bx(cX+cw_/2+Math.cos(ang)*dist-2,cY+ch_/2+Math.sin(ang)*dist-2,4,4,rcol);
  }
  g.globalAlpha=alpha;
  // Card info (right side)
  const infoX=cX+cw_+24;
  txShadow(d.isNew?'NEW CARD!':'GOT:',infoX,py_+68,9,'#a09878','rgba(0,0,0,.3)');
  txShadow(cr2.n,infoX,py_+90,12,d.isNew?rcol:'#e8e0c8','rgba(0,0,0,.4)');
  const rarLabel=['','Common','Uncommon','Rare','Epic','Legendary'];
  txShadow(rarLabel[rar]||'',infoX,py_+110,9,rcol,'rgba(0,0,0,.3)');
  txShadow(cr2.f||'',infoX,py_+128,7,'#888878','rgba(0,0,0,.2)');
  // "Continue deeper" footer
  if(t>50){
    const ftA=Math.min(1,(t-50)/20);
    g.globalAlpha=alpha*ftA*(0.5+Math.abs(Math.sin(t*0.06))*0.5);
    txShadow('Descending deeper...',px_+pw/2-90,py_+ph-22,8,'#686880','rgba(0,0,0,.3)');
  }
  g.globalAlpha=1;
}

function drawObjectInteractMsg(){
  if(objectInteractTimer<=0)return;
  objectInteractTimer--;
  const alpha=objectInteractTimer>20?1:objectInteractTimer/20;
  g.globalAlpha=alpha;
  win(W/2-200,H/2-20,400,36);
  tx(objectInteractMsg,W/2-190,H/2+4,6,'#303028');
  g.globalAlpha=1;
}

// v76: Exit proximity tooltip — show destination info when near an exit
function drawExitProximityTooltip(){
  if(!inDungeon||sc!=='map'||mapTransitioning)return;
  const p=pl[0];
  // Find nearest exit tile within 2 tiles
  let nearExit=null,nearDist=99;
  for(const ex of exits){
    if(ex.fromMap!==currentMap)continue;
    for(const [etx,ety] of ex.tiles){
      const d=Math.abs(p.x-etx)+Math.abs(p.y-ety);
      if(d<=2&&d<nearDist){nearDist=d;nearExit=ex;}
    }
  }
  if(!nearExit)return;

  const isEsc=nearExit.isEscape;
  const targetFloor=nearExit.targetMap;
  const flNums=['','I','II','III','IV','V'];
  const rarLabels=['','Common','Uncommon','Rare','Epic','Legendary'];
  const rarCols=['','#888898','#60b060','#6090d8','#c060c0','#f0c830'];
  // Determine rarity tier for target floor
  const floorRar=[0,1,2,3,4,5]; // floor → rarity
  const mainRar=isEsc?0:Math.min(5,floorRar[targetFloor]||1);

  const ttW=200,ttH=isEsc?44:62;
  const ttX=W/2-ttW/2,ttY=H-HUD_HEIGHT-ttH-56;

  // Background
  const bgCol=isEsc?'rgba(20,50,20,.92)':'rgba(20,20,50,.92)';
  bx(ttX,ttY,ttW,ttH,bgCol);
  bx(ttX,ttY,ttW,1,isEsc?'#40c060':'#6080c0');
  bx(ttX,ttY+ttH-1,ttW,1,isEsc?'#40c060':'#6080c0');

  const arrow=isEsc?'↖ ESCAPE':'↘ DESCEND';
  const dest=isEsc?'← TOWN':'FLOOR '+(flNums[targetFloor]||targetFloor);
  tx(arrow,ttX+10,ttY+14,6,isEsc?'#50e080':'#a0b0d8');
  txShadow(dest,ttX+ttW/2-dest.length*4.5,ttY+30,9,isEsc?'#40e070':'#c8d8f0','rgba(0,0,0,.5)');

  if(!isEsc&&mainRar>0){
    const rarTxt=rarLabels[mainRar]+' cards';
    tx(rarTxt,ttX+ttW/2-rarTxt.length*3,ttY+46,6,rarCols[mainRar]||'#888');
  }
}

function drawFountainDialog(){
  if(!fountainActive)return;
  if(fountainConfirm){
    bx(0,0,W,H,'rgba(0,0,0,.4)');
    win(W/2-180,H/2-50,360,100);
    tx('Toss a card into the fountain?',W/2-160,H/2-24,7,'#303028');
    tx('You will get a random card back.',W/2-160,H/2-4,6,'#686068');
    tx('Z=Yes  X=No',W/2-60,H/2+24,7,'#c04040');
  }
  if(fountainResultTimer>0){
    fountainResultTimer--;
    const a=fountainResultTimer>20?1:fountainResultTimer/20;
    g.globalAlpha=a;
    win(W/2-180,H/2-20,360,36);
    tx(fountainResult,W/2-170,H/2+4,6,'#3060b0');
    g.globalAlpha=1;
    if(fountainResultTimer<=0)fountainActive=false;
  }
}

// ═══════════════════════════════════════
// MAP CARD USE SYSTEM
// ═══════════════════════════════════════
function getMapUsableCards(){
  // Returns [{slot, cardId, name}] for cards that can be used on map
  // Card 2=UMBRA: stealth, Card 3=IGNIS: burn, Card 28=PHASE: walk through walls,
  // Card 29=BLINK: teleport, Card 30=SHADOW: longer stealth
  const MAP_CARD_IDS=new Set([2,3,28,29,30,35,36]);
  const result=[];
  for(let i=0;i<HAND_SIZE;i++){
    const cd=pl[0].cd[i];
    if(!MAP_CARD_IDS.has(cd))continue;
    const cr=CD[cd-1];
    let desc='';
    if(cd===2)desc='Invisible 30 steps';
    else if(cd===3)desc='Burn tree/bush ahead';
    else if(cd===28)desc='Phase through wall in direction';
    else if(cd===29)desc='Teleport 5 tiles in direction';
    else if(cd===30)desc='Invisible 60 steps';
    else if(cd===35)desc='Escape to Town instantly!';
    else if(cd===36)desc='Escape & restart from Town';
    result.push({slot:i,cardId:cd,name:cr.n,desc});
  }
  return result;
}

function openMapCardUse(){
  const usable=getMapUsableCards();
  if(usable.length===0){
    twSet('No usable cards! UMBRA/IGNIS/PHASE/BLINK/SHADOW/ARK GATE/GENESIS can be used on the map.');
    return;
  }
  mapCardUseActive=true;
  mapCardUseIdx=0;
  sfxSelect();
}

function executeMapCard(cardId,slot){
  if(cardId===3){
    // IGNIS: burn tree/bush in direction
    mapCardDirSelect=true;
    mapCardDirIdx=pl[0].dir;
    mapCardPendingType=3;
    return;
  }else if(cardId===2){
    // UMBRA: invisible 30 steps
    pl[0].cd[slot]=0;cardTimers[slot]=0;
    syncCardCount(0);
    shadowStepsLeft=30;
    mapCardUseActive=false;
    sfxShadow();
    twSet('UMBRA: You became invisible for 30 steps!');
    lg.push('Used UMBRA on map: 30 invisible steps!');
  }else if(cardId===30){
    // SHADOW: invisible 60 steps (longer stealth)
    pl[0].cd[slot]=0;cardTimers[slot]=0;
    syncCardCount(0);
    shadowStepsLeft=60;
    mapCardUseActive=false;
    sfxShadow();
    twSet('SHADOW: You became invisible for 60 steps!');
    lg.push('Used SHADOW on map: 60 invisible steps!');
  }else if(cardId===28){
    // PHASE: walk through wall in direction
    mapCardDirSelect=true;
    mapCardDirIdx=pl[0].dir;
    mapCardPendingType=28;
    return;
  }else if(cardId===29){
    // BLINK: teleport 5 tiles in direction
    mapCardDirSelect=true;
    mapCardDirIdx=pl[0].dir;
    mapCardPendingType=29;
    return;
  }else if(cardId===35){
    // ARK GATE: instant escape from dungeon to town (dungeon-only)
    mapCardUseActive=false;
    if(!inDungeon){twSet('ARK GATE only works in the dungeon!');return;}
    pl[0].cd[slot]=0;cardTimers[slot]=0;syncCardCount(0);
    sfxMapChange();sfxAreaEntry();
    lg.push('Used ARK GATE — escaped dungeon instantly!');
    startWipe('vslide',16,()=>{
      currentMap=0;inDungeon=false;currentFloor=0;
      pl[0].x=35;pl[0].y=13;pl[0].dir=1;
      pl[0].visualX=35*TW;pl[0].visualY=13*TH;
      for(let i=0;i<HAND_SIZE;i++){cardTimers[i]=0;decayWarn[i]=0;}
      escapeUrgencyActive=false;escapeUrgencyPulse=0;
      sp.s=2;sp.b=3;sp.c=2;
      fogRevealAll(0);fogSave();
      encounterCooldown=600;
      camX=pl[0].visualX-W/2;camY=pl[0].visualY-H/2;
      camTargetX=camX;camTargetY=camY;
      edgeCacheDirty=true;fogCacheDirty=true;
      showBanner('はじまりの街','ARK GATE: Escaped from dungeon!');
      twSet('ARK GATE activated! Cards preserved — you\'re safe in town.');
      saveGame();
      startWipe('vslide_out',16);
    });
  }else if(cardId===36){
    // GENESIS: escape dungeon to town (dungeon-only)
    mapCardUseActive=false;
    if(!inDungeon){twSet('GENESIS only works in the dungeon!');return;}
    pl[0].cd[slot]=0;cardTimers[slot]=0;syncCardCount(0);
    sfxMapChange();sfxAreaEntry();
    lg.push('Used GENESIS — escaped dungeon instantly!');
    startWipe('vslide',16,()=>{
      currentMap=0;inDungeon=false;currentFloor=0;
      pl[0].x=35;pl[0].y=13;pl[0].dir=1;
      pl[0].visualX=35*TW;pl[0].visualY=13*TH;
      for(let i=0;i<HAND_SIZE;i++){cardTimers[i]=0;decayWarn[i]=0;}
      escapeUrgencyActive=false;escapeUrgencyPulse=0;
      sp.s=2;sp.b=3;sp.c=2;
      fogRevealAll(0);fogSave();
      encounterCooldown=600;
      camX=pl[0].visualX-W/2;camY=pl[0].visualY-H/2;
      camTargetX=camX;camTargetY=camY;
      edgeCacheDirty=true;fogCacheDirty=true;
      showBanner('はじまりの街','GENESIS: Reborn in town!');
      twSet('GENESIS activated! Escaped — cards intact, back to safety!');
      saveGame();
      startWipe('vslide_out',16);
    });
  }
}

function executeDirCard(dir){
  const p=pl[0],m=getMap();
  let dx=0,dy=0;
  if(dir===0){dy=1;}else if(dir===2){dy=-1;}
  else if(dir===1){dx=-1;}else if(dir===3){dx=1;}
  const tx_=p.x+dx,ty_=p.y+dy;

  if(mapCardPendingType===3){
    // Flame: burn tree or bush
    if(tx_>=0&&tx_<MW&&ty_>=0&&ty_<MH){
      const tile=m[ty_]?.[tx_];
      if(tile===3||tile===12||tile===13){
        // Find the slot with Flame
        let slot=-1;
        for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]===3){slot=i;break;}}
        if(slot>=0){
          pl[0].cd[slot]=0;cardTimers[slot]=0;
          syncCardCount(0);
          // Replace tile with grass
          maps[currentMap][ty_][tx_]=1;
          burnedTiles.push({mapIdx:currentMap,x:tx_,y:ty_});
          edgeCacheDirty=true;
          sfxBurn();
          flash();
          twSet('The obstacle burns away!');
          lg.push('Used Ignis: burned tile at ('+tx_+','+ty_+')');
        }
      }else{
        twSet('Nothing to burn there.');
      }
    }
  }else if(mapCardPendingType===28){
    // PHASE: walk through 1 wall tile (2 tiles in direction)
    const fx=p.x+dx*2,fy=p.y+dy*2;
    if(fx>=0&&fx<MW&&fy>=0&&fy<MH&&WALKABLE.has(m[fy]?.[fx])){
      let slot=-1;
      for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]===28){slot=i;break;}}
      if(slot>=0){
        pl[0].cd[slot]=0;cardTimers[slot]=0;
        syncCardCount(0);
        p.x=fx;p.y=fy;p.visualX=fx*TW;p.visualY=fy*TH;
        fogRevealRadius(currentMap,fx,fy,3);fogSave();
        edgeCacheDirty=true;
        sfxPhase();
        flash();
        twSet('PHASE: You walked through the wall!');
        lg.push('Used PHASE: phased to ('+fx+','+fy+')');
      }
    }else{
      twSet('Cannot phase there — no walkable tile beyond.');
    }
  }else if(mapCardPendingType===29){
    // BLINK: teleport up to 5 tiles in direction
    const origX=p.x,origY=p.y;
    let bestX=p.x,bestY=p.y;
    for(let step=1;step<=5;step++){
      const nx=p.x+dx*step,ny=p.y+dy*step;
      if(nx<0||nx>=MW||ny<0||ny>=MH)break;
      if(WALKABLE.has(m[ny]?.[nx])){bestX=nx;bestY=ny;}
      else break;
    }
    if(bestX!==origX||bestY!==origY){
      let slot=-1;
      for(let i=0;i<HAND_SIZE;i++){if(pl[0].cd[i]===29){slot=i;break;}}
      if(slot>=0){
        pl[0].cd[slot]=0;cardTimers[slot]=0;
        syncCardCount(0);
        const dist=Math.abs(bestX-origX)+Math.abs(bestY-origY);
        p.x=bestX;p.y=bestY;p.visualX=bestX*TW;p.visualY=bestY*TH;
        fogRevealRadius(currentMap,bestX,bestY,3);fogSave();
        edgeCacheDirty=true;
        sfxPhase();
        flash();
        twSet('BLINK: Teleported '+dist+' tiles!');
        lg.push('Used BLINK: teleported to ('+bestX+','+bestY+')');
      }
    }else{
      twSet('BLINK: No open tile to teleport to!');
    }
  }
  mapCardDirSelect=false;
  mapCardUseActive=false;
}

function drawMapCardUseOverlay(){
  if(!mapCardUseActive)return;
  const usable=getMapUsableCards();
  if(usable.length===0){mapCardUseActive=false;return;}

  if(mapCardDirSelect){
    // Direction selection
    bx(0,0,W,H,'rgba(0,0,0,.45)');
    win(W/2-120,H/2-50,240,100);
    tx('Select direction:',W/2-80,H/2-26,7,'#806030');
    const dirNames=['DOWN','LEFT','UP','RIGHT'];
    const dirCodes=[0,1,2,3];
    for(let i=0;i<4;i++){
      const y=H/2-6+Math.floor(i/2)*22;
      const x=W/2-100+(i%2)*120;
      if(dirCodes[i]===mapCardDirIdx){
        tx('\u25B6',x-10,y+12,7,'#c04040');
        tx(dirNames[i],x,y+12,7,'#c04040');
      }else{
        tx(dirNames[i],x,y+12,7,'#303028');
      }
    }
    tx('Z=Confirm  X=Cancel',W/2-90,H/2+42,5,'#686068');
    return;
  }

  bx(0,0,W,H,'rgba(0,0,0,.45)');
  const mh=usable.length*32+48;
  win(W/2-140,H/2-mh/2,280,mh);
  tx('USE CARD ON MAP',W/2-80,H/2-mh/2+22,7,'#806030');
  usable.forEach((item,j)=>{
    const cr=CD[item.cardId-1];
    const y=H/2-mh/2+38+j*32;
    if(j===mapCardUseIdx){
      bx(W/2-130,y-2,260,28,'rgba(192,168,96,.22)');
      tx('\u25B6',W/2-134,y+14,7,'#c04040');
    }
    bx(W/2-118,y+2,20,20,cr.d);bx(W/2-116,y+4,16,16,cr.c);
    drawCardCharacter(W/2-115,y+3,item.cardId,0.6,fr);
    tx(item.name,W/2-92,y+14,7,j===mapCardUseIdx?'#c04040':'#303028');
    tx(item.desc,W/2+10,y+14,5,'#908878');
  });
  tx('Z=Use  X=Cancel',W/2-70,H/2+mh/2-10,5,'#686068');
}

// ═══════════════════════════════════════
// STATS SCREEN
// ═══════════════════════════════════════
function dStats(){
  // Dark background matching LOG screen
  bx(0,0,W,H,'#0c0c18');
  for(let i=0;i<120;i++){
    const nx=(i*73+17)%W,ny=(i*41+23)%H;
    const na=Math.random()*0.04;
    bx(nx,ny,1,1,`rgba(255,255,255,${na})`);
  }

  // Header
  win(16,10,W-32,42);
  txShadow('SESSION STATS',W/2-110,38,14,'#f0e8c0','rgba(0,0,0,.5)');

  const elapsed=Math.floor((Date.now()-stats.sessionStart)/1000);
  const mins=Math.floor(elapsed/60),secs=elapsed%60;
  const favIdx=stats.areaTime.indexOf(Math.max(...stats.areaTime));
  const favArea=stats.areaTime[favIdx]>0?mapNames[favIdx]:'None yet';
  const totalAreaTime=stats.areaTime.reduce((a,b)=>a+b,0)||1;

  // Single window for all stats — clean list format
  const padTop=60;
  win(16,padTop-8,W-32,440);

  const allRows=[
    {label:'GAME',value:'',header:true,col:'#f0c830'},
    {label:'Games Played',value:''+stats.gamesPlayed,col:'#888898'},
    {label:'Steps Walked',value:''+stats.stepsWalked,col:'#888898'},
    {label:'Play Time',value:mins+'m '+secs+'s',col:'#888898'},
    {label:'Cards Collected',value:''+stats.cardsCollected,col:'#888898'},
    {label:'Cards Lost',value:''+stats.cardsLost,col:'#888898'},
    {label:'Battles',value:''+rd,col:'#888898'},
    {label:'Season Left',value:formatTimeRemaining(getSeasonRemaining()),col:getSeasonRemaining()<86400000?'#d0a030':'#888898'},
    {label:'',value:'',header:false,col:''},
    {label:'COMBAT',value:'',header:true,col:'#c04848'},
    {label:'Steals Attempted',value:''+stats.stealsAttempted,col:'#888898'},
    {label:'Steals Blocked',value:''+stats.stealsBlocked,col:'#888898'},
    {label:'Scout Uses',value:''+stats.scoutUses,col:'#888898'},
    {label:'Win Streak',value:''+streakCount,col:'#888898'},
    {label:'Steal Success',value:stats.stealsAttempted>0?Math.round((1-stats.stealsBlocked/(stats.stealsAttempted||1))*100)+'%':'--',col:'#888898'},
    {label:'Best Clear',value:stats.bestClearTime>0?Math.floor(stats.bestClearTime/60)+'m'+('0'+(stats.bestClearTime%60)).slice(-2)+'s':'--',col:stats.bestClearTime>0?'#f0c830':'#888898'},
    {label:'',value:'',header:false,col:''},
    {label:'AREA',value:'',header:true,col:'#f0c830'},
    {label:'Favorite Area',value:favArea,col:'#888898'},
  ];

  let rowY=padTop+6;
  allRows.forEach(r=>{
    if(!r.label&&!r.value){rowY+=8;return;} // spacer
    if(r.header){
      txShadow(r.label,36,rowY+14,12,r.col,'rgba(0,0,0,.5)');
      bx(36,rowY+20,W-104,1,'#282840');
      rowY+=26;
    }else{
      txShadow(r.label,44,rowY+14,11,'#8888a8','rgba(0,0,0,.3)');
      txShadow(r.value,W-60-r.value.length*10,rowY+14,12,'#f8f0e0','rgba(0,0,0,.4)');
      bx(36,rowY+20,W-104,1,'#1a1a30');
      rowY+=24;
    }
  });

  // Area time distribution bar at bottom of the single window
  const barX=36,barY_=rowY+8,barW=W-104,barH=16;
  bx(barX,barY_,barW,barH,'#181838');
  const areaColors=['#3060b0','#302848','#403058','#503060','#403850','#503848'];
  let accX=barX;
  stats.areaTime.forEach((t,ai_)=>{
    const ratio=t/totalAreaTime;
    const segW=Math.max(0,Math.floor(barW*ratio));
    if(segW>0){
      bx(accX,barY_,segW,barH,areaColors[ai_%areaColors.length]);
      accX+=segW;
    }
  });

  // Legend below bar (show town + floors compactly)
  const legendNames=['TOWN','B1','B2','B3','B4','B5'];
  legendNames.forEach((name,ai_)=>{
    const legendX=36+ai_*120;
    const legendY=barY_+28;
    bx(legendX,legendY-8,10,10,areaColors[ai_%areaColors.length]);
    const pct=Math.round(((stats.areaTime[ai_]||0)/totalAreaTime)*100);
    txShadow(name+' '+pct+'%',legendX+14,legendY,8,'#c8c0a0','rgba(0,0,0,.3)');
  });

  // Back prompt
  win(W/2-100,H-42,200,30);
  txShadow('X = Back',W/2-32,H-22,10,FRLG.selHighlight,'rgba(0,0,0,.4)');
}

// ═══════════════════════════════════════
// CREDITS SCREEN (scrolling text)
// ═══════════════════════════════════════
function dCredits(){
  bx(0,0,W,H,'#0c0c18');
  // Stars
  for(let i=0;i<80;i++){
    const sx=(i*47+13)%W,sy=(i*31+7)%H;
    const a=Math.sin(creditsFrame*.02+i*1.7)*.35+.5;
    bx(sx,sy,1,1,`rgba(255,255,255,${a*.3})`);
  }
  const scrollSpeed=0.6;
  const startY=H;
  const lineHeight=36;
  CREDITS_LINES.forEach((line,i)=>{
    const y=startY-creditsFrame*scrollSpeed+i*lineHeight;
    if(y<-30||y>H+30)return;
    const isTitle=(line==='0 x A R K');
    const sz=isTitle?24:(line.length>30?6:10);
    const col=isTitle?'#f8f0e0':(line.startsWith('Powered')?'#9945FF':(line.startsWith('Solana')?'#14F195':'#c8c0a0'));
    const tw_=line.length*(isTitle?14:sz*0.7);
    txShadow(line,W/2-tw_/2,y,sz,col,'rgba(0,0,0,.5)');
  });
  // End: loop or go back
  const totalScroll=(CREDITS_LINES.length*lineHeight+H)/scrollSpeed;
  if(creditsFrame>totalScroll){creditsActive=false;creditsFrame=0;}
  // Back prompt
  txShadow('X = Back',W/2-32,H-16,7,'#555570','rgba(0,0,0,.3)');
}

// Story sequence removed — replaced by PixiJS intro tutorial

// ═══════════════════════════════════════
// GAME OVER - TIME'S UP SCREEN
// ═══════════════════════════════════════
function dGameOver(){
  const t=fr-victoryFrame;
  if(t<30){bx(0,0,W,H,`rgba(0,0,0,${t/30})`);return;}
  bx(0,0,W,H,'#0c0c18');
  // Dramatic red flicker
  const flicker=Math.sin(t*0.08)*0.03;
  bx(0,0,W,H,`rgba(180,40,40,${flicker})`);

  if(t>35){g.globalAlpha=Math.min(1,(t-35)/20);txShadow('SEASON OVER',W/2-100,80,20,'#d04040','rgba(0,0,0,.6)');g.globalAlpha=1;}
  if(t>45){g.globalAlpha=Math.min(1,(t-45)/15);win(W/2-220,100,440,28);txShadow('SEASON 1 RESULTS',W/2-76,120,10,'#f0c830','rgba(0,0,0,.4)');g.globalAlpha=1;}

  // Rank all 3 players by unique card count
  if(t>60){
    const rankings=[];
    for(let i=0;i<3;i++){
      const unique=hasUniqueCards(i).size;
      rankings.push({idx:i,name:pl[i].n,unique:unique,cards:[...pl[i].cd]});
    }
    rankings.sort((a,b)=>b.unique-a.unique);
    const medals=['1ST','2ND','3RD'];
    const medalColors=['#f0c830','#c0c0c0','#c08040'];
    rankings.forEach((r,rank)=>{
      const fadeT=t-60-rank*20;
      if(fadeT<0)return;
      const alpha=Math.min(1,fadeT/15);
      g.globalAlpha=alpha;
      const y=148+rank*120;
      const isPlayer=r.idx===0;
      win(W/2-260,y,520,110);
      // Medal
      txShadow(medals[rank],W/2-240,y+30,14,medalColors[rank],'rgba(0,0,0,.4)');
      // Name
      txShadow(r.name,W/2-160,y+30,12,isPlayer?'#48b8e8':'#c8c0a0','rgba(0,0,0,.4)');
      // Unique count
      txShadow(r.unique+'/60',W/2+140,y+30,10,r.unique>=60?'#40d040':'#c8c0a0','rgba(0,0,0,.4)');
      // Show cards in a row
      for(let ci=0;ci<5;ci++){
        const cx_=W/2-140+ci*56;
        const cy_=y+46;
        if(r.cards[ci]>0){
          drawCardFrame(cx_,cy_,46,56,r.cards[ci]-1,false);
        }else{
          bx(cx_,cy_,46,56,'#383848');bx(cx_+2,cy_+2,42,52,'#2a2a38');
          tx('?',cx_+16,cy_+36,12,'#484858');
        }
      }
      g.globalAlpha=1;
    });
  }

  if(t>140){
    g.globalAlpha=Math.min(1,(t-140)/15);
    win(W/2-200,H-60,400,50);
    const blink_=Math.floor(fr/25)%2===0;
    if(blink_)txShadow('Z = Play Again    X = Title',W/2-140,H-30,8,FRLG.selHighlight,'rgba(0,0,0,.4)');
    g.globalAlpha=1;
  }
}

// ═══════════════════════════════════════
