// ═══════════════════════════════════════════════════════════════════════════
// MODULE: 10-card-detail.js
// T-D14-B: M5 Card Detail scene — three-panel card viewer
//
// Scene key: 'card_detail'
// Entry:  initCardDetailScene(cardInfo, returnScene)
// Render: drawCardDetailScene()
// Input:  handleCardDetailInput(px, py)
// Exit:   exitCardDetailScene()
//
// cardInfo shape:
//   { cdIdx: number,            // index into CD[] (required)
//     mint: string|null,        // NFT mint pubkey (null if unowned/demo)
//     owner: string|null,       // current owner wallet (truncated display)
//     ownerSince: string|null,  // e.g. "Day 3 (2026-04-14)"
//     source: string|null,      // "Duel Won" | "Shop" | "P2P" | "Gacha"
//     prevOwner: string|null,
//     hallContext: string|null, // "Bronze Hall · R4"
//     isVintage: bool,          // prev-season card
//   }
// returnScene: 'deck_editor' | 'lobby' | 'card_storage' | 'duel_victory' | 'duel' | 'shop'
// ═══════════════════════════════════════════════════════════════════════════

// ── State ─────────────────────────────────────────────────────────────────
let CDS = null;           // card detail scene state
let _cdsFrame = 0;

// ── Constants ─────────────────────────────────────────────────────────────
const CDS_PANEL_L = 0, CDS_PANEL_L_W = 120;
const CDS_PANEL_C = 120, CDS_PANEL_C_W = 220;
const CDS_PANEL_R = 340, CDS_PANEL_R_W = 140;
const CDS_BTN_Y = 254, CDS_BTN_H = 16;
const CDS_BTN_BACK  = {x:2,   w:78,  label:'BACK'};
const CDS_BTN_ADD   = {x:84,  w:108, label:'ADD TO DECK'};
const CDS_BTN_SELL  = {x:196, w:80,  label:'SELL'};

// Sell prices by rarity (SOL)
const CDS_SELL_PRICE = [0.005, 0.015, 0.03, 0.06, 0.1]; // r1..r5
// DECISION: BP/HP/Initiative derived from rarity if no on-chain data (T-D14-B2 approximation)
function _cdsStat(cr){
  const r = cr.r||1;
  return { bp: r*2, hp: Math.max(1,7-r), initiative: r };
}

// ── Entry point ────────────────────────────────────────────────────────────
/**
 * Open the Card Detail scene.
 * @param {Object} cardInfo   — see header for shape
 * @param {string} returnScene — scene key to return to on BACK
 */
function initCardDetailScene(cardInfo, returnScene){
  if(!cardInfo||cardInfo.cdIdx===undefined||cardInfo.cdIdx<0||cardInfo.cdIdx>=CD.length)return;
  const cr = CD[cardInfo.cdIdx];
  const cardId = cardInfo.cdIdx + 1; // lore card_id is 1-based
  const unlocks = getUnlockedShards(cardInfo.mint||'');
  const stats = _cdsStat(cr);
  const rar = cr.r||1;
  const sellPrice = CDS_SELL_PRICE[rar-1]||0.005;
  const loreEntry = _LORE_SHARDS_DATA[cardId]||null;

  CDS = {
    cdIdx:        cardInfo.cdIdx,
    cr:           cr,
    cardId:       cardId,
    mint:         cardInfo.mint||null,
    owner:        cardInfo.owner||'Unknown',
    ownerSince:   cardInfo.ownerSince||'—',
    source:       cardInfo.source||'Unknown',
    prevOwner:    cardInfo.prevOwner||null,
    hallContext:  cardInfo.hallContext||null,
    isVintage:    !!cardInfo.isVintage,
    returnScene:  returnScene||'lobby',
    unlocks:      unlocks,  // [bool,bool,bool]
    stats:        stats,
    sellPrice:    sellPrice,
    loreEntry:    loreEntry,
    // Shard reading UX
    activeShardIdx:    0,     // 0=none, 1/2/3 = reading that shard
    shardText:         '',    // full text to display
    shardDisplayed:    '',    // text so far (typewriter)
    shardTypeFrame:    0,     // frame counter for typewriter
    shardTypeComplete: false,
    // Sell confirmation
    sellConfirm: false,
    sellStatus:  '',   // ''|'pending'|'success'|'error'
    sellMsg:     '',
    // Add to deck feedback
    addStatus:   '',   // ''|'pending'|'success'|'error'
    addMsg:      '',
  };
  _cdsFrame = 0;

  fadeOut(function(){
    sc = 'card_detail';
    fadeIn();
  });
}

// ── Main render ────────────────────────────────────────────────────────────
function drawCardDetailScene(){
  if(!CDS)return;
  _cdsFrame++;
  const {cr,cardId,unlocks,stats,loreEntry,isVintage} = CDS;
  const rar = cr.r||1;
  const rarCol = CARD_RARITY_COL[rar-1]||'#606870';

  // Background
  bx(0,0,W,H,'#060d18');
  // Panel dividers
  bx(CDS_PANEL_L_W,0,1,H,'#1a2a3a');
  bx(CDS_PANEL_R,0,1,H,'#1a2a3a');
  // Bottom bar
  bx(0,CDS_BTN_Y-2,W,1,'#1a2a3a');
  bx(0,H-1,W,1,'#102030');

  _cdsDrawLeftPanel(cr,rarCol,rar);
  _cdsDrawCenterPanel(cr,cardId,rarCol,rar,stats,isVintage);
  _cdsDrawRightPanel(cr,cardId,rarCol,rar,loreEntry,unlocks);
  _cdsDrawShardOverlay();
  _cdsDrawButtons(cr,rar,rarCol);
  _cdsDrawToast();
}

// ── Left panel: Owner ──────────────────────────────────────────────────────
function _cdsDrawLeftPanel(cr,rarCol,rar){
  const lx=CDS_PANEL_L+4;
  tx('OWNER',lx,10,5,rarCol);
  bx(lx,13,CDS_PANEL_L_W-8,1,rarCol+'60');

  const ownerStr=CDS.owner||'Unknown';
  const ownerTrunc=ownerStr.length>12?ownerStr.slice(0,6)+'...'+ownerStr.slice(-4):ownerStr;
  tx(ownerTrunc,lx,24,5,'#c0d0e0');
  tx('Since:',lx,36,4,'#708090');
  tx(CDS.ownerSince,lx,45,4,'#a0b8c8');
  tx('Source:',lx,57,4,'#708090');
  tx(CDS.source,lx,66,4,'#a0b8c8');

  if(CDS.prevOwner){
    tx('Prev:',lx,80,4,'#708090');
    const p=CDS.prevOwner;
    tx(p.length>12?p.slice(0,6)+'...'+p.slice(-4):p,lx,89,4,'#90a8b8');
  }
  if(CDS.hallContext){
    tx('Acquired:',lx,103,4,'#708090');
    tx(CDS.hallContext,lx,112,4,'#90a8b8');
  }

  // Mint badge
  if(CDS.mint){
    const mx=CDS_PANEL_L+4, my=H-44;
    bx(mx,my,CDS_PANEL_L_W-8,10,'#0a1a2a');
    bx(mx,my,CDS_PANEL_L_W-8,1,'#203040');
    tx('NFT',mx+2,my+8,5,'#3080c8');
  }
}

// ── Center panel: Card ─────────────────────────────────────────────────────
function _cdsDrawCenterPanel(cr,cardId,rarCol,rar,stats,isVintage){
  const cx=CDS_PANEL_C, cw=CDS_PANEL_C_W;
  // Draw full card frame (120×160 at center of panel)
  const cardW=100, cardH=140;
  const cardX=cx+(cw-cardW)/2, cardY=20;
  drawCardFrame(cardX,cardY,cardW,cardH,CDS.cdIdx,true,false);

  // Vintage stripe
  if(isVintage){
    g.save();
    g.globalAlpha=0.75;
    bx(cardX,cardY,cardW,12,'#6a3010');
    tx('VINTAGE',cardX+2,cardY+9,5,'#ffd080');
    g.restore();
  }

  // Name
  const nSz=Math.max(5,Math.min(8,Math.floor(cw/(cr.n.length*0.72))));
  txShadow(cr.n,cx+cw/2-cr.n.length*nSz/2.1,cardY+cardH+14,nSz,'#f0e8d8','rgba(0,0,0,.6)');

  // Clan / type badge
  const typeLabel=(cr.t||'').toUpperCase();
  const typeBadgeW=typeLabel.length*4+8;
  bx(cx+cw/2-typeBadgeW/2,cardY+cardH+18,typeBadgeW,10,cr.d||'#102030');
  tx(typeLabel,cx+cw/2-typeLabel.length*4/2,cardY+cardH+26,4,cr.h||'#fff');

  // Stats row
  const sy=cardY+cardH+36;
  const statItems=[
    ['BP',stats.bp],
    ['HP',stats.hp],
    ['INIT',stats.initiative],
    ['R'+rar,'']
  ];
  const sw=Math.floor(cw/statItems.length);
  for(let i=0;i<statItems.length;i++){
    const [lbl,val]=statItems[i];
    const sx=cx+i*sw+sw/2;
    tx(lbl,sx-lbl.length*2,sy,4,'#708090');
    tx(String(val),sx-String(val).length*2.5,sy+9,5,rarCol);
  }

  // Ability text
  const abY=sy+24;
  bx(cx+4,abY-2,cw-8,1,'#1a2a3a');
  if(cr.f){
    tx('ABILITY',cx+4,abY+7,4,'#708090');
    tx(cr.f,cx+50,abY+7,5,cr.h||'#a0c0e0');
  }

  // Cost strip
  const costStr='COST: '+(cr.ct!==undefined?cr.ct:'—');
  const costY=abY+18;
  bx(cx+4,costY-2,cw-8,12,cr.d||'#102030');
  tx(costStr,cx+8,costY+8,5,rarCol);
}

// ── Right panel: Battle History + Lore Shards ─────────────────────────────
function _cdsDrawRightPanel(cr,cardId,rarCol,rar,loreEntry,unlocks){
  const rx=CDS_PANEL_R+4, rw=CDS_PANEL_R_W-8;

  tx('BATTLE HISTORY',rx,10,5,rarCol);
  bx(rx,13,rw,1,rarCol+'60');

  // Battle history — show placeholder (real data from CardBattleHistory PDA, wired Day 14+)
  // Safety gate: if PDA query failed, show 0/0/0/0
  const bh=CDS._battleHistory||null;
  if(bh){
    tx('S1: '+bh.wins+'W/'+bh.losses+'L',rx,24,4,'#90c8e0');
    tx(bh.kos+'KOs / '+bh.dmg_dealt+' dmg',rx,34,4,'#90c8e0');
    bx(rx,40,rw,1,'#1a2a3a');
    tx('Lifetime:',rx,50,4,'#708090');
    tx(bh.wins+'W/'+bh.losses+'L/'+bh.kos+'KO',rx,60,4,'#a0c0e0');
  }else{
    g.globalAlpha=0.55;
    tx('No battles yet',rx,28,4,'#606878');
    tx('0W / 0L / 0KO',rx,40,4,'#505868');
    g.globalAlpha=1;
  }

  // Previous owners
  const histY=74;
  tx('PREV OWNERS',rx,histY,4,'#708090');
  if(CDS.prevOwner){
    const p=CDS.prevOwner;
    tx(p.length>14?p.slice(0,6)+'...'+p.slice(-4):p,rx,histY+10,4,'#8090a0');
  }else{
    g.globalAlpha=0.4;tx('none on record',rx,histY+10,4,'#606878');g.globalAlpha=1;
  }

  // Lore Shards section
  const loreY=132;
  tx('LORE SHARDS',rx,loreY,5,rarCol);
  bx(rx,loreY+3,rw,1,rarCol+'60');

  for(let si=1;si<=3;si++){
    const shardX=rx+(si-1)*36+2;
    const shardY=loreY+14;
    const isUnlocked=si===1||(unlocks&&unlocks[si-1]);
    const hasText=loreEntry&&loreEntry.shards&&loreEntry.shards[String(si)];
    const isActive=CDS.activeShardIdx===si;

    // Gem icon
    const gemColor=isUnlocked?(hasText?'#50e090':'#e0b030'):isActive?'#e0e0e0':'#304050';
    const gemBg=isActive?'#0a2a18':'#060f18';
    bx(shardX-2,shardY-2,30,14,gemBg);
    bx(shardX-2,shardY-2,30,1,isUnlocked?'#205030':'#102030');
    tx('\u25C6',shardX,shardY+8,8,gemColor);
    tx(String(si),shardX+10,shardY+8,4,isUnlocked?'#90c8a0':'#304050');
    if(isActive){bx(shardX-2,shardY+12,30,1,gemColor);}
  }

  // Shard text preview (first line, non-interactive)
  const previewY=loreY+34;
  bx(rx,previewY,rw,50,'#060c16');
  bx(rx,previewY,rw,1,'#102030');
  if(CDS.activeShardIdx===0){
    g.globalAlpha=0.5;
    tx('Tap gem to read',rx+2,previewY+12,4,'#607080');
    g.globalAlpha=1;
  }
}

// ── Shard overlay (typewriter panel) ──────────────────────────────────────
function _cdsDrawShardOverlay(){
  if(CDS.activeShardIdx===0)return;
  const si=CDS.activeShardIdx;
  // Typewriter progress
  _cdsFrame++;
  const CHAR_DELAY=2; // frames per character
  if(!CDS.shardTypeComplete){
    const charsShown=Math.floor((_cdsFrame-CDS.shardTypeFrame)/CHAR_DELAY);
    if(charsShown>=CDS.shardText.length){
      CDS.shardDisplayed=CDS.shardText;
      CDS.shardTypeComplete=true;
    }else{
      CDS.shardDisplayed=CDS.shardText.slice(0,charsShown);
    }
  }

  // Overlay panel: bottom half of right panel
  const px=CDS_PANEL_R+2, py=168, pw=CDS_PANEL_R_W-4, ph=72;
  bx(px,py,pw,ph,'#050c1a');
  bx(px,py,pw,1,'#1a3a2a');
  bx(px,py+ph-1,pw,1,'#102030');

  // Shard header
  const rarCol=CARD_RARITY_COL[(CDS.cr.r||1)-1];
  tx('SHARD '+si,px+2,py+8,4,rarCol);
  // Close hint
  tx('[X]',px+pw-14,py+8,4,'#507090');

  // Wrapped text
  const words=CDS.shardDisplayed.split(' ');
  let line='',lineY=py+18,lineH=9,maxW=20;
  for(let wi=0;wi<words.length;wi++){
    const w=words[wi];
    if((line+w).length>maxW){
      g.globalAlpha=0.85;
      tx(line.trim(),px+2,lineY,4,'#b0c8a0');
      g.globalAlpha=1;
      lineY+=lineH;line=w+' ';
      if(lineY>py+ph-4)break;
    }else line+=w+' ';
  }
  if(line.trim()&&lineY<=py+ph-4){
    g.globalAlpha=0.85;tx(line.trim(),px+2,lineY,4,'#b0c8a0');g.globalAlpha=1;
  }
}

// ── Buttons ────────────────────────────────────────────────────────────────
function _cdsDrawButtons(cr,rar,rarCol){
  const by=CDS_BTN_Y, bh=CDS_BTN_H;

  // BACK
  _cdsBtn(CDS_BTN_BACK.x,by,CDS_BTN_BACK.w,bh,'BACK',true,'#203040','#c0d0e0');

  // ADD TO DECK
  const {canAdd,addReason}=_cdsCanAdd();
  const addCol=canAdd?'#205028':'#15201a';
  const addTextCol=canAdd?'#80d898':'#405048';
  _cdsBtn(CDS_BTN_ADD.x,by,CDS_BTN_ADD.w,bh,'ADD TO DECK',canAdd,addCol,addTextCol);
  if(!canAdd&&addReason){
    g.globalAlpha=0.55;
    tx(addReason,CDS_BTN_ADD.x+2,by-6,3,'#708090');
    g.globalAlpha=1;
  }

  // SELL
  const {canSell,sellReason}=_cdsCanSell();
  const sellCol=canSell?'#281515':'#111010';
  const sellTextCol=canSell?'#e08080':'#403830';
  const sellLabel=(CDS.sellConfirm?'CONFIRM?':'SELL '+(CDS_SELL_PRICE[rar-1]||0.005)+' SOL');
  _cdsBtn(CDS_BTN_SELL.x,by,CDS_BTN_SELL.w,bh,sellLabel,canSell,sellCol,sellTextCol);
  if(CDS.sellConfirm){
    g.globalAlpha=0.7;
    tx('CANCEL',CDS_BTN_SELL.x+CDS_BTN_SELL.w+2,by+bh/2+3,4,'#708090');
    g.globalAlpha=1;
  }
}

function _cdsBtn(x,y,w,h,label,enabled,bgCol,textCol){
  bx(x,y,w,h,bgCol);
  bx(x,y,w,1,enabled?'#304050':'#1a2030');
  bx(x,y+h-1,w,1,'#080c14');
  g.globalAlpha=enabled?1:0.45;
  tx(label,x+w/2-label.length*2.2,y+h/2+3,4,textCol);
  g.globalAlpha=1;
}

function _cdsCanAdd(){
  if(CDS.isVintage) return {canAdd:false,addReason:'Vintage: not playable'};
  const deck=typeof playerDeck!=='undefined'?playerDeck:[];
  if(deck.length>=20) return {canAdd:false,addReason:'Deck full (20/20)'};
  const copies=deck.filter(d=>d===CDS.cdIdx).length;
  if(copies>=2) return {canAdd:false,addReason:'Max 2 copies in deck'};
  return {canAdd:true,addReason:''};
}

function _cdsCanSell(){
  if(!CDS.mint) return {canSell:false,sellReason:'No NFT to sell'};
  return {canSell:true,sellReason:''};
}

// ── Toast ─────────────────────────────────────────────────────────────────
function _cdsDrawToast(){
  const msg=CDS.addMsg||CDS.sellMsg;
  if(!msg)return;
  const tw=msg.length*4+12;
  bx(W/2-tw/2,4,tw,14,'rgba(0,10,20,0.9)');
  bx(W/2-tw/2,4,tw,1,'#204040');
  tx(msg,W/2-msg.length*2,14,4,
    (CDS.addStatus==='success'||CDS.sellStatus==='success')?'#50e090':'#e08050');
}

// ── Input handler ──────────────────────────────────────────────────────────
function handleCardDetailInput(px_,py_){
  if(!CDS||sc!=='card_detail')return;

  // Close shard overlay on X area tap
  if(CDS.activeShardIdx>0){
    if(px_>=CDS_PANEL_R+CDS_PANEL_R_W-16&&px_<=W&&py_>=168&&py_<=180){
      CDS.activeShardIdx=0;return;
    }
    if(px_<CDS_PANEL_R){CDS.activeShardIdx=0;}
    return;
  }

  // Shard gem taps (3 gems in right panel)
  const loreY=132+CDS_PANEL_R;
  for(let si=1;si<=3;si++){
    const gx=CDS_PANEL_R+4+(si-1)*36;
    const gy=loreY-CDS_PANEL_R+14; // = 146+14 = nope let's compute absolute
    // From _cdsDrawRightPanel: shardY = loreY+14 = 132+14 = 146, shardX = rx+(si-1)*36+2
    const shardX=(CDS_PANEL_R+4)+(si-1)*36;
    const shardY=146;
    if(px_>=shardX-2&&px_<=shardX+28&&py_>=shardY-2&&py_<=shardY+12){
      _cdsTapShard(si);return;
    }
  }

  // Button taps
  if(py_>=CDS_BTN_Y&&py_<=CDS_BTN_Y+CDS_BTN_H){
    // BACK
    if(px_>=CDS_BTN_BACK.x&&px_<=CDS_BTN_BACK.x+CDS_BTN_BACK.w){
      exitCardDetailScene();return;
    }
    // ADD TO DECK
    if(px_>=CDS_BTN_ADD.x&&px_<=CDS_BTN_ADD.x+CDS_BTN_ADD.w){
      const {canAdd}=_cdsCanAdd();
      if(canAdd)_cdsAddToDeck();return;
    }
    // SELL
    if(px_>=CDS_BTN_SELL.x&&px_<=CDS_BTN_SELL.x+CDS_BTN_SELL.w){
      const {canSell}=_cdsCanSell();
      if(canSell){
        if(!CDS.sellConfirm){CDS.sellConfirm=true;}
        else{_cdsSell();}
      }
      return;
    }
    // Cancel sell (text beyond sell button)
    if(CDS.sellConfirm&&px_>CDS_BTN_SELL.x+CDS_BTN_SELL.w){
      CDS.sellConfirm=false;return;
    }
  }
}

function _cdsTapShard(si){
  const unlocks=CDS.unlocks||[true,false,false];
  const isUnlocked=si===1||unlocks[si-1];
  if(!isUnlocked){
    CDS.addMsg='Shard '+si+' is locked.';
    CDS.addStatus='error';
    setTimeout(()=>{if(CDS){CDS.addMsg='';CDS.addStatus='';}},1800);
    return;
  }
  const text=getLoreShardText(CDS.cardId,si,CDS.mint);
  CDS.activeShardIdx=si;
  CDS.shardText=text;
  CDS.shardDisplayed='';
  CDS.shardTypeFrame=_cdsFrame;
  CDS.shardTypeComplete=false;
}

// ── ADD TO DECK flow ───────────────────────────────────────────────────────
function _cdsAddToDeck(){
  const {canAdd,addReason}=_cdsCanAdd();
  if(!canAdd){CDS.addMsg=addReason;CDS.addStatus='error';return;}
  CDS.addStatus='pending';CDS.addMsg='Adding to deck...';
  // Client-side deck update
  if(typeof playerDeck==='undefined')window.playerDeck=[];
  playerDeck.push(CDS.cdIdx);
  const deckCount=playerDeck.length;
  // Call save_deck instruction if wallet connected
  const saveDeckFn=typeof window.oxarkSaveDeck==='function'?window.oxarkSaveDeck:null;
  if(saveDeckFn){
    saveDeckFn(playerDeck).then(()=>{
      CDS.addStatus='success';
      CDS.addMsg='Added '+CDS.cr.n+' to deck ('+deckCount+'/20)';
      setTimeout(()=>{if(CDS){exitCardDetailScene();}},1200);
    }).catch(e=>{
      // Rollback
      const idx=playerDeck.lastIndexOf(CDS.cdIdx);
      if(idx>=0)playerDeck.splice(idx,1);
      CDS.addStatus='error';
      CDS.addMsg='Failed: '+(e&&e.message?e.message.slice(0,30):'tx error');
    });
  }else{
    // Offline / no wallet — still update client state
    CDS.addStatus='success';
    CDS.addMsg='Added '+CDS.cr.n+' ('+deckCount+'/20)';
    setTimeout(()=>{if(CDS){exitCardDetailScene();}},1000);
  }
}

// ── SELL TO SHOP flow ──────────────────────────────────────────────────────
function _cdsSell(){
  if(!CDS.mint){CDS.sellMsg='No NFT mint';CDS.sellStatus='error';return;}
  CDS.sellStatus='pending';CDS.sellMsg='Selling...';CDS.sellConfirm=false;
  const sellFn=typeof window.oxarkSellCard==='function'?window.oxarkSellCard:null;
  if(sellFn){
    sellFn(CDS.mint,CDS.sellPrice).then(()=>{
      CDS.sellStatus='success';
      CDS.sellMsg='Sold for '+CDS.sellPrice+' SOL';
      setTimeout(()=>{if(CDS){exitCardDetailScene();}},1400);
    }).catch(e=>{
      CDS.sellStatus='error';
      CDS.sellMsg='Sell failed: '+(e&&e.message?e.message.slice(0,28):'err');
    });
  }else{
    // Stub: no on-chain sell available
    CDS.sellStatus='success';
    CDS.sellMsg='Sold '+CDS.cr.n+' (stub)';
    setTimeout(()=>{if(CDS){exitCardDetailScene();}},1000);
  }
}

// ── Exit ───────────────────────────────────────────────────────────────────
function exitCardDetailScene(){
  if(!CDS)return;
  const ret=CDS.returnScene||'lobby';
  fadeOut(function(){
    sc=ret;
    CDS=null;
    _cdsFrame=0;
    fadeIn();
  });
}
