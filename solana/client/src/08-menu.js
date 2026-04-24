// 08-menu.js — Top Menu Hub Scene (v3.0-plus reborn)
// 2×3 navigation grid: BATTLE / DECK / SHOP / AGENT / LORE / SETTINGS
// Entry: enterMenu()   Draw: drawMenuScene()
// Keyboard input handled in 10-input.js (sc==='menu' block)
// Dungeon/map files intentionally kept — scene routing is menu-centric; dungeon
// scenes remain reachable but are no longer the primary navigation path.

// ─── Cell definitions ─────────────────────────────────────────────────────────
const _MNU_CELLS = [
  { label:'BATTLE',   icon:'⚔️', sub1:'DUEL HALL',          sub2:'Bronze \xB7 Silver \xB7 Gold', stub:false },
  { label:'DECK',     icon:'🃏', sub1:'Build \xB7 Evolve',  sub2:'30 pt cap \xB7 60 cards',      stub:false },
  { label:'SHOP',     icon:'🛒', sub1:'Booster \xB7 Single',sub2:'x402 \xB7 0.01 SOL',           stub:true  },
  { label:'AGENT',    icon:'🤖', sub1:'Hire \xB7 Listing',  sub2:'0.05 SOL / session',            stub:true  },
  { label:'LORE',     icon:'📜', sub1:'Card Catalog',       sub2:'Lore Shards',                   stub:true  },
  { label:'SETTINGS', icon:'⚙️', sub1:'Wallet \xB7 Network',sub2:'Audio \xB7 Display',            stub:true  },
];

// ─── Grid geometry (480×270 canvas) ──────────────────────────────────────────
const _MH  = 26;  // header height
const _MF  = 14;  // footer height
const _MM  = 3;   // side margin
const _MG  = 5;   // gap between cells (both axes)
const _MCW = Math.floor((W - _MM * 2 - _MG) / 2);                        // cell width  ≈ 234
const _MCH = Math.floor((H - _MH - _MF - 1 - _MG * 2) / 3);             // cell height ≈ 73

// ─── State ────────────────────────────────────────────────────────────────────
let _mnuSel    = 0;
let _mnuTick   = 0;
let _mnuSolBal = null;  // '1.23' or null
let _mnuCards  = 0;
let _mnuLeg    = 0;
let _mnuPollId = null;

// ─── Entry/Exit ───────────────────────────────────────────────────────────────
function enterMenu() {
  _mnuSel  = 0;
  _mnuTick = 0;
  sc       = 'menu';
  if (typeof loadGame === 'function') { try { loadGame(); } catch(_) {} }
  _mnuPoll();
  if (_mnuPollId) clearInterval(_mnuPollId);
  _mnuPollId = setInterval(_mnuPoll, 30000);
}

function exitMenu() {
  if (_mnuPollId) { clearInterval(_mnuPollId); _mnuPollId = null; }
}

async function _mnuPoll() {
  try {
    const vault = pl && pl[0] && pl[0].vault;
    _mnuCards = vault ? vault.size : 0;
    _mnuLeg   = vault ? [...vault].filter(id => {
      const c = typeof CD !== 'undefined' ? CD.find(x => x.id === id) : null;
      return c && c.r >= 4;
    }).length : 0;
  } catch(_) {}
  if (walletConnected && walletPublicKey) {
    try {
      const resp = await fetch('https://api.devnet.solana.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'getBalance', params:[walletPublicKey] }),
      });
      const j = await resp.json();
      _mnuSolBal = (j.result && j.result.value != null)
        ? (j.result.value / 1e9).toFixed(2) : null;
    } catch(_) { _mnuSolBal = null; }
  } else {
    _mnuSolBal = null;
  }
}

// ─── Cell position helpers ────────────────────────────────────────────────────
function _mnuCX(col) { return _MM + col * (_MCW + _MG); }
function _mnuCY(row) { return _MH + 1 + row * (_MCH + _MG); }

// ─── Render ───────────────────────────────────────────────────────────────────
function drawMenuScene() {
  _mnuTick++;

  // Background — deep navy/purple
  bx(0, 0, W, H, '#0d0c1e');
  // Static star field (deterministic — no RNG per frame)
  g.globalAlpha = 0.18;
  g.fillStyle = '#7060a0';
  for (let s = 0; s < 48; s++) {
    g.fillRect((s * 79 + 11) % W, (s * 57 + 7) % H, 1, 1);
  }
  g.globalAlpha = 1;

  // ── Header ───────────────────────────────────────────────────────────────────
  bx(0, 0, W, _MH, '#08071a');
  // "0xARK" logo — two-tone (gold / cream)
  txShadow('0x', 8, _MH - 5, 14, '#b8935a', 'rgba(0,0,0,0.9)');
  setFont(Math.round(14 * 1.4));
  const _wox = g.measureText('0x').width;
  txShadow('ARK', 8 + _wox, _MH - 5, 14, '#efebe5', 'rgba(0,0,0,0.9)');
  _lastFontSz = -1; // invalidate cache after direct setFont
  // Wallet right side
  if (walletConnected && walletPublicKey) {
    const addr   = walletAddressTruncated();
    const balStr = (_mnuSolBal != null ? _mnuSolBal : '—') + ' SOL';
    txShadow(addr,   W - 100, 12, 8, '#50d8a8', 'rgba(0,0,0,0.7)');
    txShadow(balStr, W - 100, 23, 8, '#c8a448', 'rgba(0,0,0,0.7)');
    txShadow(_mnuCards + ' cards  ' + _mnuLeg + ' leg', 88, 17, 7, '#6878a0', 'rgba(0,0,0,0.5)');
  } else {
    txShadow('NO WALLET  [X → OPTIONS → BIND VAULT]', W / 2 - 108, _MH - 5, 7, '#6878a0', 'rgba(0,0,0,0.5)');
  }
  bx(0, _MH, W, 1, '#201a48');

  // ── Grid cells ───────────────────────────────────────────────────────────────
  for (let i = 0; i < 6; i++) {
    const col  = i % 2;
    const row  = Math.floor(i / 2);
    const cx   = _mnuCX(col);
    const cy   = _mnuCY(row);
    const cell = _MNU_CELLS[i];
    const sel  = (i === _mnuSel);

    // Background fill
    bx(cx, cy, _MCW, _MCH, sel ? '#1a1440' : '#0c0b20');

    // Border rim — 2px, gold when selected
    const rim = sel ? '#b8935a' : '#201a48';
    bx(cx,           cy,             _MCW, 2,    rim);
    bx(cx,           cy + _MCH - 2,  _MCW, 2,    rim);
    bx(cx,           cy,             2,    _MCH, rim);
    bx(cx + _MCW - 2,cy,             2,    _MCH, rim);

    // Animated gold highlight stripe on selected cell
    if (sel) {
      g.globalAlpha = 0.35 + Math.sin(_mnuTick * 0.09) * 0.25;
      bx(cx + 2, cy + 2, _MCW - 4, 2, '#c8a448');
      g.globalAlpha = 1;
    }

    // Icon — use system sans-serif so emoji render correctly
    const prevFont = g.font;
    g.font = '13px sans-serif';
    g.fillStyle = sel ? '#efebe5' : '#545470';
    g.fillText(cell.icon, cx + 8, cy + 20);
    g.font = prevFont;
    _lastFontSz = -1; // re-sync cache

    // ► cursor
    if (sel) txShadow('▶', cx + 24, cy + 21, 9, '#c8a448', 'rgba(0,0,0,0.5)');

    // Label
    txShadow(cell.label, cx + 36, cy + 22, 12, sel ? '#efebe5' : '#6878a0', 'rgba(0,0,0,0.7)');

    // Sub-labels
    const subCol = sel ? '#b8935a' : '#38344a';
    txShadow(cell.sub1, cx + 8, cy + 37, 8, subCol, 'rgba(0,0,0,0.5)');
    if (cell.sub2) txShadow(cell.sub2, cx + 8, cy + 49, 7, subCol, 'rgba(0,0,0,0.4)');

    // "SOON" badge on stub cells
    if (cell.stub) txShadow('SOON', cx + _MCW - 34, cy + 10, 7, '#3a3462', 'rgba(0,0,0,0.4)');
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  bx(0, H - _MF,     W, 1,       '#201a48');
  bx(0, H - _MF + 1, W, _MF - 1, '#07071a');
  const _day  = (typeof lobbyHudDay !== 'undefined' && lobbyHudDay) ? lobbyHudDay : 25;
  const _left = Math.max(0, 40 - _day);
  txShadow('Season 1  \xB7  Day ' + _day + '  \xB7  ' + _left + ' days left',
    W / 2 - 70, H - 4, 7, '#4a4a70', 'rgba(0,0,0,0.4)');
  txShadow('[X] Title',  6,      H - 4, 7, '#38344a', 'rgba(0,0,0,0.4)');
  txShadow('[Z] Enter',  W - 54, H - 4, 7, '#38344a', 'rgba(0,0,0,0.4)');

  // Deck editor draws itself on top of menu when opened from DECK button
  if (typeof deckEditorOpen !== 'undefined' && deckEditorOpen &&
      typeof drawDeckEditor === 'function') {
    drawDeckEditor();
  }
}

// ═══════════════════════════════════════
