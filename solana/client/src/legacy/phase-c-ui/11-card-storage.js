// ═══════════════════════════════════════════════════════════════════════════
// MODULE: 11-card-storage.js
// T-D14-C: PC Box Card Storage — grid view of owned cards
//
// Scene key: 'card_storage'
// Entry:  initCardStorageScene()
// Render: drawCardStorageScene()
// Input:  handleCardStorageInput(px, py)
// Exit:   exitCardStorageScene()
// ═══════════════════════════════════════════════════════════════════════════

// ── Constants ─────────────────────────────────────────────────────────────
const CST_COLS = 8;
const CST_CARD_W = 54, CST_CARD_H = 58;
const CST_GRID_X = 2, CST_GRID_Y = 30, CST_GRID_W = W-4, CST_GRID_H = 210;
const CST_BAR_Y = 240, CST_BAR_H = 30;
const CST_CLANS = ['All','Black Flag','Sovereign Bourse','Hollow Blade','Iron Circle','Nameless Silk'];
// Map card type to approximate clan for display (DECISION: type→clan approximation until NFT metadata)
const CST_TYPE_CLAN = {attack:'Black Flag', defense:'Iron Circle', magic:'Nameless Silk', flee:'Hollow Blade', recovery:'Sovereign Bourse'};
const CST_CLAN_BORDER = {'Black Flag':'#c03020','Sovereign Bourse':'#a09030','Hollow Blade':'#7040b0','Iron Circle':'#5090d0','Nameless Silk':'#30a060','All':'#406080'};

// ── State ──────────────────────────────────────────────────────────────────
let CST = null;

// ── Helpers ────────────────────────────────────────────────────────────────
function _cstGetPlayerCards(){
  // Returns array of { cdIdx, mint, count, inDeck }
  // Uses pl[0].vault (Set of card_ids) when available, falls back to all cards (demo mode)
  const vault = (typeof pl !== 'undefined' && pl[0] && pl[0].vault) ? pl[0].vault : null;
  const deck  = (typeof playerDeck !== 'undefined') ? playerDeck : [];
  const result = [];
  for(let i = 0; i < CD.length; i++){
    const cardId = i+1;
    const owned = !vault || vault.has(cardId);
    if(!owned) continue;
    const count = deck.filter(d=>d===i).length;
    result.push({ cdIdx:i, cardId, mint:null, inDeck:count, count:1 });
  }
  // If vault is null (demo), return all 60 cards
  if(!vault && result.length===0){
    for(let i=0;i<CD.length;i++) result.push({cdIdx:i,cardId:i+1,mint:null,inDeck:0,count:1});
  }
  return result;
}

function _cstFilterSort(cards, clanFilter, showDups, showInDeck){
  let out = cards.slice();
  if(clanFilter && clanFilter !== 'All'){
    out = out.filter(c=>{
      const clan = CST_TYPE_CLAN[CD[c.cdIdx].t]||'';
      return clan===clanFilter;
    });
  }
  if(showDups) out = out.filter(c=>c.count>=2);
  if(showInDeck) out = out.filter(c=>c.inDeck>0);
  // Sort: clan → rarity desc → initiative desc
  out.sort((a,b)=>{
    const ca=CST_TYPE_CLAN[CD[a.cdIdx].t]||'';
    const cb=CST_TYPE_CLAN[CD[b.cdIdx].t]||'';
    if(ca!==cb)return ca<cb?-1:1;
    const ra=CD[a.cdIdx].r||1, rb=CD[b.cdIdx].r||1;
    if(ra!==rb)return rb-ra;
    return 0;
  });
  return out;
}

// ── Entry ─────────────────────────────────────────────────────────────────
function initCardStorageScene(){
  const allCards = _cstGetPlayerCards();
  CST = {
    allCards,
    clanFilter:  'All',
    showDups:    false,
    showInDeck:  false,
    scrollY:     0,
    maxScrollY:  0,
    hoverIdx:    -1,
    // Filter button rects (computed in draw)
    filterBtns:  [],
    speciesCt:   new Set(allCards.map(c=>c.cardId)).size,
  };
  _cstRefreshFiltered();

  fadeOut(function(){
    sc = 'card_storage';
    fadeIn();
  });
}

function _cstRefreshFiltered(){
  if(!CST)return;
  CST.filtered = _cstFilterSort(CST.allCards, CST.clanFilter, CST.showDups, CST.showInDeck);
  const rows = Math.ceil(CST.filtered.length / CST_COLS);
  CST.maxScrollY = Math.max(0, rows * (CST_CARD_H+2) - CST_GRID_H);
  CST.scrollY = Math.min(CST.scrollY, CST.maxScrollY);
}

// ── Render ─────────────────────────────────────────────────────────────────
function drawCardStorageScene(){
  if(!CST)return;

  // Background
  bx(0,0,W,H,'#060d18');

  // Top bar
  bx(0,0,W,CST_GRID_Y,'#08131e');
  bx(0,CST_GRID_Y-1,W,1,'#1a2a3a');
  tx('CARD STORAGE',4,14,7,'#a0c8e0');

  // Clan filter buttons
  _cstDrawFilterBar();

  // Card grid
  _cstDrawGrid();

  // Bottom bar
  bx(0,CST_BAR_Y,W,CST_BAR_H,'#08131e');
  bx(0,CST_BAR_Y,W,1,'#1a2a3a');
  const specStr=CST.speciesCt+'/60 species';
  tx(specStr,4,CST_BAR_Y+18,5,'#7090a8');
  // Toggle buttons
  _cstDrawToggle(W-130,CST_BAR_Y+5,60,18,'Dups Only',CST.showDups,'cst_dups');
  _cstDrawToggle(W-66,CST_BAR_Y+5,60,18,'In Deck',CST.showInDeck,'cst_indeck');
  // Back button
  bx(W-30,CST_BAR_Y+4,28,20,'#102030');
  bx(W-30,CST_BAR_Y+4,28,1,'#203040');
  tx('BACK',W-28,CST_BAR_Y+17,4,'#8090a8');
}

function _cstDrawFilterBar(){
  if(!CST)return;
  CST.filterBtns=[];
  let bx_=100, by_=4, bh=18;
  for(let i=0;i<CST_CLANS.length;i++){
    const clan=CST_CLANS[i];
    const bw=clan.length*3+10;
    const active=CST.clanFilter===clan;
    const bcol=active?(CST_CLAN_BORDER[clan]||'#406080'):'#0d1a28';
    bx(bx_,by_,bw,bh,bcol);
    bx(bx_,by_,bw,1,active?'#ffffff40':'#1a2a3a');
    tx(clan,bx_+3,by_+bh-5,4,active?'#e0e8f0':'#608090');
    CST.filterBtns.push({x:bx_,y:by_,w:bw,h:bh,clan});
    bx_+=bw+3;
  }
}

function _cstDrawToggle(x,y,w,h,label,active,key){
  bx(x,y,w,h,active?'#1a3028':'#0d1828');
  bx(x,y,w,1,active?'#30a060':'#1a2a3a');
  tx((active?'[x] ':'[ ] ')+label,x+2,y+h-5,3,active?'#60c888':'#5080a0');
}

function _cstDrawGrid(){
  if(!CST||!CST.filtered)return;
  const cards=CST.filtered;
  // Clip to grid area
  g.save();
  g.rect(CST_GRID_X,CST_GRID_Y,CST_GRID_W,CST_GRID_H);
  g.clip();

  const scroll=Math.round(CST.scrollY);
  for(let i=0;i<cards.length;i++){
    const col=i%CST_COLS;
    const row=Math.floor(i/CST_COLS);
    const cx_=CST_GRID_X+col*(CST_CARD_W+2);
    const cy_=CST_GRID_Y+row*(CST_CARD_H+2)-scroll;
    if(cy_+CST_CARD_H<CST_GRID_Y||cy_>CST_GRID_Y+CST_GRID_H)continue;

    const c=cards[i];
    const cr=CD[c.cdIdx];
    if(!cr)continue;
    const rar=cr.r||1;
    const rarCol=CARD_RARITY_COL[rar-1]||'#606870';
    const clan=CST_TYPE_CLAN[cr.t]||'';
    const clanBorder=CST_CLAN_BORDER[clan]||'#406080';

    // Card mini frame
    drawCardFrame(cx_,cy_,CST_CARD_W,CST_CARD_H,c.cdIdx,false,false);

    // Clan border stripe (top)
    bx(cx_,cy_,CST_CARD_W,2,clanBorder);

    // In-deck check badge
    if(c.inDeck>0){
      bx(cx_+CST_CARD_W-10,cy_,10,10,'#20401a');
      tx('\u2713',cx_+CST_CARD_W-9,cy_+8,5,'#50d068');
    }
    // Duplicate badge
    if(c.count>=2){
      const xs='x'+c.count;
      bx(cx_,cy_+CST_CARD_H-10,xs.length*4+4,10,'#1a1428');
      tx(xs,cx_+2,cy_+CST_CARD_H-3,4,'#c0a8e0');
    }
    // Legendary badge
    if(rar>=5){
      tx('L',cx_+2,cy_+10,5,'#e8c840');
    }
    // Name truncated (very small, bottom of card)
    const n=cr.n.length>7?cr.n.slice(0,6)+'.':cr.n;
    g.globalAlpha=0.7;
    tx(n,cx_+CST_CARD_W/2-n.length*1.8,cy_+CST_CARD_H-3,3,'#c0c8d0');
    g.globalAlpha=1;
  }
  g.restore();

  // Scrollbar
  if(CST.maxScrollY>0){
    const sbH=CST_GRID_H;
    const sbW=3,sbX=W-sbW-1,sbY=CST_GRID_Y;
    bx(sbX,sbY,sbW,sbH,'#0d1828');
    const thumbH=Math.max(12,Math.floor(sbH*(CST_GRID_H/(CST_GRID_H+CST.maxScrollY))));
    const thumbY=sbY+Math.round((CST.scrollY/CST.maxScrollY)*(sbH-thumbH));
    bx(sbX,thumbY,sbW,thumbH,'#304858');
  }
}

// ── Input ──────────────────────────────────────────────────────────────────
function handleCardStorageInput(px_,py_){
  if(!CST||sc!=='card_storage')return;

  // Filter bar taps
  if(py_<=CST_GRID_Y){
    for(const btn of CST.filterBtns){
      if(px_>=btn.x&&px_<=btn.x+btn.w&&py_>=btn.y&&py_<=btn.y+btn.h){
        CST.clanFilter=btn.clan;
        _cstRefreshFiltered();
        return;
      }
    }
    return;
  }

  // Bottom bar
  if(py_>=CST_BAR_Y){
    // BACK
    if(px_>=W-30){exitCardStorageScene();return;}
    // Dups toggle
    if(px_>=W-130&&px_<=W-70){CST.showDups=!CST.showDups;_cstRefreshFiltered();return;}
    // In Deck toggle
    if(px_>=W-66&&px_<=W-6){CST.showInDeck=!CST.showInDeck;_cstRefreshFiltered();return;}
    return;
  }

  // Grid card taps
  if(py_>=CST_GRID_Y&&py_<=CST_GRID_Y+CST_GRID_H){
    const gridPy=py_-CST_GRID_Y+Math.round(CST.scrollY);
    const col=Math.floor((px_-CST_GRID_X)/(CST_CARD_W+2));
    const row=Math.floor(gridPy/(CST_CARD_H+2));
    const idx=row*CST_COLS+col;
    if(col>=0&&col<CST_COLS&&idx>=0&&idx<CST.filtered.length){
      const c=CST.filtered[idx];
      if(c&&c.cdIdx>=0){
        const cardInfo={
          cdIdx:   c.cdIdx,
          mint:    c.mint||null,
          owner:   (typeof window.walletAddress!=='undefined'?window.walletAddress:null),
          ownerSince:'—',
          source:  'Collection',
          prevOwner:null,
          hallContext:null,
          isVintage:false,
        };
        if(typeof initCardDetailScene==='function'){
          initCardDetailScene(cardInfo,'card_storage');
        }
      }
    }
    return;
  }
}

// ── Scroll ─────────────────────────────────────────────────────────────────
function cardStorageScroll(delta){
  if(!CST)return;
  CST.scrollY=Math.max(0,Math.min(CST.maxScrollY,CST.scrollY+delta));
}

// ── Exit ───────────────────────────────────────────────────────────────────
function exitCardStorageScene(){
  if(!CST)return;
  fadeOut(function(){
    sc='lobby';
    CST=null;
    fadeIn();
  });
}
