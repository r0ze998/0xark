// ═══════════════════════════════════════════════════════════════════════════
// MODULE: 05-lobby.js
// LobbyScene — Phase D Reborn main hub
// 25×18 tile map, 6 buildings, WebSocket multiplayer (wired in T-D3-3).
// Uses PIRATE_SHEET (Kenney Monochrome Pirates, 17 cols × 8 rows, 16px, 1px gap).
// ═══════════════════════════════════════════════════════════════════════════

// ── Lobby map data (embedded from lobby-map.json) ────────────────────────
// Tile IDs are 1-indexed per Tiled convention; 0 = empty.
// Sheet: 17 cols × 8 rows, 16×16px per tile, 1px spacing = 17px stride.

const LOBBY_W = 25, LOBBY_H = 18, LOBBY_TS = 32; // rendered tile size
const LOBBY_SHEET_COLS = 17, LOBBY_SHEET_STRIDE = 17; // 16px + 1px gap

const LOBBY_OBJECTS = [
  { name:'faction_hq',  x:9,  y:3,  w:7, h:3, label:'FACTION HQ',   interaction:'enter_faction_hq'  },
  { name:'shop',        x:0,  y:14, w:4, h:3, label:'SHOP',          interaction:'enter_shop'         },
  { name:'pc_box',      x:5,  y:14, w:4, h:3, label:'PC BOX',        interaction:'enter_pc_box'       },
  { name:'bronze_hall', x:10, y:14, w:4, h:3, label:'BRONZE HALL',   interaction:'enter_bronze_hall'  },
  { name:'silver_hall', x:15, y:14, w:4, h:3, label:'SILVER HALL',   interaction:'enter_silver_hall'  },
  { name:'gold_hall',   x:20, y:14, w:4, h:3, label:'GOLD HALL',     interaction:'enter_gold_hall'    },
];

const LOBBY_SPAWN = { x:12, y:10 };

// Ground layer (25×18, row-major). 0=black fallback, 1=ground, 3=path, 18=ocean, 36=cliff
const LOBBY_GROUND = (()=>{
  const G=1,P=3,O=18,R=36,_=G;
  return [
    [O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O], // row 0
    [O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O,O], // row 1
    [R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R], // row 2
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], // row 3 (HQ)
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], // row 4
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], // row 5
    [_,_,_,_,_,_,_,_,_,_,_,_,P,_,_,_,_,_,_,_,_,_,_,_,_], // row 6
    [_,_,_,_,_,_,_,_,_,_,_,_,P,_,_,_,_,_,_,_,_,_,_,_,_], // row 7
    [_,_,_,_,_,_,_,_,_,_,_,_,P,_,_,_,_,_,_,_,_,_,_,_,_], // row 8
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], // row 9
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], // row 10 (spawn)
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], // row 11
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], // row 12
    [P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P], // row 13 (path)
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], // row 14 (buildings)
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], // row 15
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], // row 16
    [P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P], // row 17
  ];
})();

// Walls layer — non-zero = impassable collision. 56=HQ stone, 39=building wall.
const LOBBY_WALLS = (()=>{
  const HQ=56, BW=39, OC=18, __=0;
  const grid = Array.from({length:LOBBY_H}, ()=>Array(LOBBY_W).fill(0));
  // Border
  for(let x=0;x<LOBBY_W;x++){grid[0][x]=OC;grid[1][x]=OC;}
  // Faction HQ x=9-15 y=3-5
  for(let y=3;y<=5;y++) for(let x=9;x<=15;x++) grid[y][x]=HQ;
  // Bottom buildings
  [[0,3],[5,8],[10,13],[15,18],[20,23]].forEach(([x0,x1])=>{
    for(let y=14;y<=16;y++) for(let x=x0;x<=x1;x++) grid[y][x]=BW;
  });
  return grid;
})();

// ── Lobby state ──────────────────────────────────────────────────────────
let lobbyPx = LOBBY_SPAWN.x;    // player tile X
let lobbyPy = LOBBY_SPAWN.y;    // player tile Y
let lobbyDir = 0;               // facing: 0=down,1=up,2=left,3=right
let lobbyMoveDebounce = 0;      // frames until next move allowed
const LOBBY_MOVE_DELAY = 9;     // ~150ms at 60fps
let lobbyNearBuilding = null;   // currently nearby building object or null
let lobbyInteractCooldown = 0;  // prevent double-trigger

// Remote players for multiplayer
// Each entry: { wallet, px, py, targetX, targetY, curX, curY, clan, card_count }
const lobbyRemotePlayers = new Map();

// ── Lobby HUD state (T-D6-2 + T-D8) ─────────────────────────────────────
let lobbyHudCards     = null;  // number 0-60 or null (not loaded)
let lobbyHudDay       = null;  // current season day (1-N)
let lobbyHudTotalDays = 14;    // default 14-day season
let lobbyHudEventName = null;  // event name from Season PDA or null (uses hardcoded default)
const _DE_DEVNET_RPC_LOBBY = 'https://api.devnet.solana.com';
const _DE_PROGRAM_ID_LOBBY = '5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN';

// ── Bottom info bar state (T-D8-5) ───────────────────────────────────────
let lobbyBottomName   = 'YOU';
let lobbyBottomClan   = '—';
let lobbyBottomTicker = '';
let lobbyBottomSol    = null;

// ── Clan banner colors for Faction HQ (T-D8-7) ───────────────────────────
let LOBBY_BANNER_A_COLOR = '#cc3333';
let LOBBY_BANNER_B_COLOR = '#c8a020';

async function _loadLobbyHUD() {
  const playerKey = window.solana?.publicKey;
  if (!playerKey) return;
  const conn = new solanaWeb3.Connection(_DE_DEVNET_RPC_LOBBY, 'confirmed');
  const pid = new solanaWeb3.PublicKey(_DE_PROGRAM_ID_LOBBY);

  // PlayerRegistry PDA — count at offset 580
  try {
    const [regPDA] = solanaWeb3.PublicKey.findProgramAddressSync(
      [new TextEncoder().encode('player_registry'), playerKey.toBytes()], pid,
    );
    const info = await conn.getAccountInfo(regPDA);
    if (info && info.data.length > 580) {
      lobbyHudCards = new Uint8Array(info.data)[580];
    }
  } catch (_) {}

  // Season PDA (season 1) — season_start + season_end
  try {
    const seasonIdBuf = new Uint8Array(4);
    new DataView(seasonIdBuf.buffer).setUint32(0, 1, true); // season_id=1 LE
    const [seasonPDA] = solanaWeb3.PublicKey.findProgramAddressSync(
      [new TextEncoder().encode('season'), seasonIdBuf], pid,
    );
    const sInfo = await conn.getAccountInfo(seasonPDA);
    if (sInfo && sInfo.data.length >= 90) {
      // Layout after 8 disc: season_id(4) + authority(32) + entry_fee(8) + prize_pool(8)
      //   + player_count(4) + max_players(4) + status(1) + winner(32) + winner_time(8)
      //   + fastest_clear_rounds(1) + season_start(8) + season_end(8)
      const dv = new DataView(sInfo.data.buffer, sInfo.data.byteOffset);
      const base = 8 + 4 + 32 + 8 + 8 + 4 + 4 + 1 + 32 + 8 + 1; // = 110
      if (sInfo.data.length >= base + 16) {
        const seasonStart = Number(dv.getBigInt64(base, true));
        const seasonEnd   = Number(dv.getBigInt64(base + 8, true));
        const now = Math.floor(Date.now() / 1000);
        lobbyHudTotalDays = Math.max(1, Math.ceil((seasonEnd - seasonStart) / 86400));
        lobbyHudDay = Math.min(lobbyHudTotalDays, Math.max(1, Math.floor((now - seasonStart) / 86400) + 1));
      }
    }
  } catch (_) {}
}

// ── WebSocket multiplayer ─────────────────────────────────────────────────
// WS_SERVER_URL can be set globally before build (defaults to Railway deploy).
const LOBBY_WS_URL = (typeof WS_SERVER_URL !== 'undefined')
  ? WS_SERVER_URL
  : 'wss://0xark-multiplayer.up.railway.app';
const LOBBY_ROOM_KEY = 'oxark_lobby_room'; // localStorage key for shared room

let lobbyWS       = null;
let lobbyPlayerId = null;
let lobbyConnecting = false;

function lobbyWSConnect() {
  if (lobbyConnecting || lobbyWS) return;
  lobbyConnecting = true;
  const storedRoom = localStorage.getItem(LOBBY_ROOM_KEY);

  let ws;
  try { ws = new WebSocket(LOBBY_WS_URL); }
  catch { lobbyConnecting = false; return; }

  ws.onopen = () => {
    lobbyConnecting = false;
    const wallet = (typeof window !== 'undefined' && window._oxarkWallet) ? window._oxarkWallet : null;
    const name   = wallet ? wallet.slice(0, 6) + '…' : 'Anon';
    const payload = { name, wallet, clan: null, card_count: 0, season: 1 };

    if (storedRoom) {
      ws.send(JSON.stringify({ type: 'join_room', roomId: storedRoom, ...payload }));
    } else {
      ws.send(JSON.stringify({ type: 'create_room', gameId: 'lobby-global', ...payload }));
    }
  };

  ws.onmessage = (evt) => {
    let msg;
    try { msg = JSON.parse(evt.data); } catch { return; }

    switch (msg.type) {
      case 'room_created':
        lobbyPlayerId = msg.playerId;
        localStorage.setItem(LOBBY_ROOM_KEY, msg.roomId);
        break;

      case 'room_joined':
        lobbyPlayerId = msg.playerId;
        (msg.players || []).forEach(p => {
          if (p.id === lobbyPlayerId) return;
          const x = p.position?.x ?? LOBBY_SPAWN.x;
          const y = p.position?.y ?? LOBBY_SPAWN.y;
          lobbyRemotePlayers.set(p.id, {
            wallet: p.wallet, clan: p.clan, card_count: p.card_count,
            px: x, py: y, targetX: x, targetY: y,
          });
        });
        break;

      case 'error':
        // Stored room likely expired — clear it and create fresh
        if (storedRoom) {
          localStorage.removeItem(LOBBY_ROOM_KEY);
          lobbyWS = null;
          lobbyWSConnect();
        }
        break;

      case 'player_joined': {
        const pj = msg.player;
        if (!pj || pj.id === lobbyPlayerId) break;
        const x = pj.position?.x ?? LOBBY_SPAWN.x;
        const y = pj.position?.y ?? LOBBY_SPAWN.y;
        lobbyRemotePlayers.set(pj.id, {
          wallet: pj.wallet, clan: pj.clan, card_count: pj.card_count,
          px: x, py: y, targetX: x, targetY: y,
        });
        break;
      }

      case 'player_left':
        lobbyRemotePlayers.delete(msg.playerId);
        break;

      case 'player_moved':
        if (msg.playerId === lobbyPlayerId) break;
        const rp = lobbyRemotePlayers.get(msg.playerId);
        if (rp) { rp.targetX = msg.x; rp.targetY = msg.y; }
        break;

      case 'presence_update':
        for (const [, p] of lobbyRemotePlayers) {
          if (p.wallet === msg.wallet) {
            p.clan = msg.clan; p.card_count = msg.card_count; break;
          }
        }
        break;
    }
  };

  ws.onclose = () => { lobbyWS = null; lobbyConnecting = false; };
  ws.onerror = () => { console.warn('[Lobby] WS offline — solo mode'); lobbyWS = null; lobbyConnecting = false; };

  lobbyWS = ws;
}

function lobbyWSSendMove(x, y) {
  if (lobbyWS && lobbyWS.readyState === 1) {
    lobbyWS.send(JSON.stringify({ type: 'move', x, y, area: 0 }));
  }
}

function lobbyWSDisconnect() {
  if (lobbyWS) { lobbyWS.close(); lobbyWS = null; }
  lobbyPlayerId = null;
  lobbyConnecting = false;
  lobbyRemotePlayers.clear();
}

// ── Match celebration flash ───────────────────────────────────────────────
let lobbyMatchFlash = 0; // frames remaining (60 = 1 second)
function lobbyTriggerMatchFlash() { lobbyMatchFlash = 60; }

// ── Building dialog system ────────────────────────────────────────────────
// lobbyDialog: null = no dialog, else { title, lines[], buttons[{label,action,disabled,hint}], focusIdx }
let lobbyDialog = null;

const HALL_ANTES   = ['0.005 SOL', '0.01 SOL', '0.05 SOL'];
const HALL_EMOJIS  = ['🥉', '🥈', '🥇'];
const HALL_NAMES   = ['Bronze Hall', 'Silver Hall', 'Gold Hall'];

// wins_at_tier placeholder — read from PlayerBattleStats PDA when available
function _lobbyTierWins() {
  return (typeof playerBattleStatsWins !== 'undefined') ? playerBattleStatsWins : [0, 0, 0];
}

function lobbyOpenDialog(buildingName) {
  switch (buildingName) {
    case 'bronze_hall':
    case 'silver_hall':
    case 'gold_hall': {
      const tierIdx = ['bronze_hall','silver_hall','gold_hall'].indexOf(buildingName);
      const wins = _lobbyTierWins();
      let locked = false;
      let lockReason = '';
      if (tierIdx === 1 && wins[0] < 5) { locked = true; lockReason = `Requires 5 Bronze wins (current: ${wins[0]})`; }
      if (tierIdx === 2 && wins[1] < 3) { locked = true; lockReason = `Requires 3 Silver wins (current: ${wins[1]})`; }
      lobbyDialog = {
        title: `${HALL_EMOJIS[tierIdx]} ${HALL_NAMES[tierIdx]}`,
        lines: [
          `Ante: ${HALL_ANTES[tierIdx]}`,
          `Current queue: — players`,
          locked ? `🔒 LOCKED — ${lockReason}` : 'Ready to duel',
        ],
        buttons: [
          { label: 'Find Match', action: 'find_match', disabled: locked, hint: locked ? lockReason : null },
          { label: 'Close',      action: 'close',      disabled: false },
        ],
        focusIdx: locked ? 1 : 0,
        meta: { tier: tierIdx },
      };
      break;
    }
    case 'shop':
      lobbyDialog = {
        title: '🛒 SHOP',
        lines: [
          'Choose your purchase:',
          '  Booster Pack — 3 random cards',
          '  Targeted Single — pick a card type',
          '  Clan Starter — 5-card clan bundle',
        ],
        buttons: [
          { label: 'Booster Pack',    action: 'shop_booster',  disabled: false },
          { label: 'Targeted Single', action: 'shop_single',   disabled: false },
          { label: 'Clan Starter',    action: 'shop_clan',     disabled: false },
          { label: 'Leave',           action: 'close',         disabled: false },
        ],
        focusIdx: 0,
        meta: { shop: true },
      };
      break;
    case 'pc_box':
      lobbyDialog = {
        title: '💾 PC Box',
        lines: ['Storage: — cards  |  Deck: —/20', 'Open Deck Editor to build your deck.', 'Coming Day 5'],
        buttons: [{ label: 'Open Deck Editor', action: 'open_deck_editor', disabled: false }, { label: 'Close', action: 'close', disabled: false }],
        focusIdx: 1,
      };
      break;
    case 'faction_hq':
      lobbyDialog = {
        title: '🏴 Faction HQ',
        lines: ['Join or manage your Clan.', 'Coming Day 4-6'],
        buttons: [{ label: 'Close', action: 'close', disabled: false }],
        focusIdx: 0,
      };
      break;
    default:
      lobbyDialog = {
        title: buildingName.replace(/_/g,' ').toUpperCase(),
        lines: ['Coming soon.'],
        buttons: [{ label: 'Close', action: 'close', disabled: false }],
        focusIdx: 0,
      };
  }
}

function lobbyDialogConfirm() {
  if (!lobbyDialog) return;
  const btn = lobbyDialog.buttons[lobbyDialog.focusIdx];
  if (!btn || btn.disabled) return;
  if (btn.action === 'close') { lobbyDialog = null; return; }
  if (btn.action === 'find_match') {
    // Delegate to matchmaking module (06-matchmaking.js)
    if (typeof lobbyFindMatch === 'function') {
      lobbyFindMatch(lobbyDialog.meta?.tier ?? 0);
    } else {
      console.log('[Lobby] Find Match (offline stub) tier:', lobbyDialog.meta?.tier);
      lobbyDialog = null;
    }
    return;
  }
  if (btn.action === 'cancel_match') {
    if (typeof leaveQueue === 'function') leaveQueue().catch(console.warn);
    lobbyDialog = null;
    return;
  }
  if (btn.action === 'open_deck_editor') {
    lobbyDialog = null;
    if (typeof openDeckEditor === 'function') openDeckEditor();
    return;
  }
  // Shop purchase actions — placeholder responses until x402 micropayment integration
  if (btn.action === 'shop_booster' || btn.action === 'shop_single' || btn.action === 'shop_clan') {
    const labels = {
      shop_booster: 'Booster Pack (0.05 SOL)',
      shop_single:  'Targeted Single (0.02 SOL)',
      shop_clan:    'Clan Starter (0.1 SOL)',
    };
    lobbyDialog = {
      title: '🛒 SHOP',
      lines: [
        `${labels[btn.action]}`,
        '',
        'Purchase flow not yet implemented.',
        'x402 micropayment integration coming.',
      ],
      buttons: [
        { label: 'Back',  action: 'shop_back', disabled: false },
        { label: 'Close', action: 'close',     disabled: false },
      ],
      focusIdx: 0,
    };
    return;
  }
  if (btn.action === 'shop_back') {
    // Re-open shop main menu
    lobbyOpenDialog('shop');
    return;
  }
  // Other actions: close dialog
  lobbyDialog = null;
}

function lobbyDialogCancel() {
  lobbyDialog = null;
}

function lobbyDialogMoveFocus(dir) {
  if (!lobbyDialog) return;
  const n = lobbyDialog.buttons.length;
  lobbyDialog.focusIdx = (lobbyDialog.focusIdx + dir + n) % n;
}

function drawLobbyDialog() {
  if (!lobbyDialog) return;

  // Dialog width scales with button count so buttons always fit
  const n = lobbyDialog.buttons.length;
  const btnH = 28, gap = 10;
  // Minimum button width to show label; max so they fit in dialog
  const btnW = Math.min(120, Math.max(70, Math.floor((W - 48 - (n - 1) * gap) / n)));
  const dw = Math.min(W - 16, Math.max(300, n * (btnW + gap) + 32));
  const dh = 200 + Math.max(0, (lobbyDialog.lines.length - 4) * 20);
  const dx = (W - dw) / 2, dy = (H - dh) / 2;

  // Backdrop
  g.fillStyle = 'rgba(0,0,0,0.72)';
  g.fillRect(0, 0, W, H);

  // Panel
  g.fillStyle = '#0e0e22';
  g.fillRect(dx, dy, dw, dh);
  g.strokeStyle = '#c8a460';
  g.lineWidth = 2;
  g.strokeRect(dx + 1, dy + 1, dw - 2, dh - 2);

  // Title
  g.fillStyle = '#f0e0a0';
  g.font = 'bold 18px VT323, monospace';
  g.textAlign = 'center';
  g.fillText(lobbyDialog.title, dx + dw / 2, dy + 30);

  // Divider
  g.strokeStyle = '#333350';
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(dx + 16, dy + 38); g.lineTo(dx + dw - 16, dy + 38); g.stroke();

  // Body lines
  g.font = '14px VT323, monospace';
  g.textAlign = 'center';
  lobbyDialog.lines.forEach((line, i) => {
    g.fillStyle = line.startsWith('🔒') ? '#cc4444' : '#aaaacc';
    g.fillText(line, dx + dw / 2, dy + 58 + i * 20);
  });

  // Buttons — centered in dialog
  const btnY = dy + dh - 50;
  const totalW = n * btnW + (n - 1) * gap;
  let bx = dx + (dw - totalW) / 2;
  lobbyDialog.buttons.forEach((btn, i) => {
    const isFocus = i === lobbyDialog.focusIdx;
    g.fillStyle = btn.disabled ? '#1a1a2a' : isFocus ? '#3040a0' : '#222238';
    g.fillRect(bx, btnY, btnW, btnH);
    g.strokeStyle = btn.disabled ? '#333' : isFocus ? '#6080e0' : '#444466';
    g.lineWidth = 1;
    g.strokeRect(bx + 0.5, btnY + 0.5, btnW - 1, btnH - 1);
    g.fillStyle = btn.disabled ? '#444' : isFocus ? '#e8e8ff' : '#8888aa';
    g.font = '13px VT323, monospace';
    g.textAlign = 'center';
    g.fillText(btn.label.length > 12 ? btn.label.slice(0, 12) : btn.label, bx + btnW / 2, btnY + 19);
    bx += btnW + gap;
  });

  // Controls hint
  g.fillStyle = '#444466';
  g.font = '10px VT323, monospace';
  g.textAlign = 'center';
  g.fillText('← → navigate  Z/Enter confirm  X/Esc close', dx + dw / 2, dy + dh - 10);
}

// Clan tints (hex → use in g.fillStyle when clan assigned)
const CLAN_TINTS = {
  black_flag:       '#2244aa',
  sovereign_bourse: '#ccaa00',
  hollow_blade:     '#cc2222',
  iron_circle:      '#226622',
  nameless_silk:    '#882299',
  null:             '#888888',
};

// ── Tile drawing helper ──────────────────────────────────────────────────
// Draws a single tile from PIRATE_SHEET at canvas coords (cx,cy).
// tileId is 1-indexed; 0 = skip (transparent).
// T-D8-2: new tile drawing with UI_SPEC v2.0 color recipes
function drawLobbyTile(tileId, cx, cy) {
  const TS = LOBBY_TS;
  if (tileId === 18) {
    // Ocean
    g.fillStyle = '#1a2840';
    g.fillRect(cx, cy, TS, TS);
  } else if (tileId === 36) {
    // Cliff / border
    g.fillStyle = '#4a3828';
    g.fillRect(cx, cy, TS, TS);
  } else if (tileId === 3) {
    // Path — sandy with crosshatch
    g.fillStyle = '#a89878';
    g.fillRect(cx, cy, TS, TS);
    g.strokeStyle = 'rgba(0,0,0,0.08)';
    g.lineWidth = 0.5;
    for (let d = 0; d < TS * 2; d += 8) {
      g.beginPath(); g.moveTo(cx + d, cy); g.lineTo(cx, cy + d); g.stroke();
    }
  } else {
    // Ground stone cobblestone
    g.fillStyle = '#888898';
    g.fillRect(cx, cy, TS, TS);
    g.strokeStyle = 'rgba(60,60,80,0.3)';
    g.lineWidth = 1;
    g.strokeRect(cx, cy, TS, TS);
  }
}

// ── Building sprite helpers (T-D8-6..9) ─────────────────────────────────

function _drawWindow(wx, wy, color) {
  const c = color || '#c8d8e8';
  g.fillStyle = c;
  g.fillRect(wx, wy, 16, 16);
  g.strokeStyle = '#2a1808'; g.lineWidth = 1;
  g.strokeRect(wx, wy, 16, 16);
  // cross dividers
  g.strokeStyle = 'rgba(0,0,0,0.3)';
  g.beginPath(); g.moveTo(wx + 8, wy); g.lineTo(wx + 8, wy + 16); g.stroke();
  g.beginPath(); g.moveTo(wx, wy + 8); g.lineTo(wx + 16, wy + 8); g.stroke();
}

function drawLobbyBuildingShop(bx, by, bw, bh) {
  // Body — cream stone
  g.fillStyle = '#d8c898';
  g.fillRect(bx + 4, by + 12, bw - 8, bh - 16);
  g.strokeStyle = '#5a4020'; g.lineWidth = 1;
  g.strokeRect(bx + 4, by + 12, bw - 8, bh - 16);
  // Awning — alternating red/cream stripes
  const aw = bw - 8, aStride = 8;
  for (let i = 0; i < Math.ceil(aw / aStride); i++) {
    g.fillStyle = i % 2 === 0 ? '#cc3333' : '#e8d0a0';
    g.fillRect(bx + 4 + i * aStride, by + 12, Math.min(aStride, aw - i * aStride), 14);
  }
  // Awning shadow
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(bx + 4, by + 26, bw - 8, 3);
  // Windows
  _drawWindow(bx + 20, by + 32);
  _drawWindow(bx + bw - 36, by + 32);
  // Door
  g.fillStyle = '#7a4020';
  g.fillRect(bx + bw / 2 - 7, by + bh - 22, 14, 22);
  g.strokeStyle = '#3a1a08'; g.lineWidth = 1;
  g.strokeRect(bx + bw / 2 - 7, by + bh - 22, 14, 22);
  // Door knob
  g.fillStyle = '#c8a040';
  g.fillRect(bx + bw / 2 + 2, by + bh - 12, 3, 3);
}

function drawLobbyBuildingFactionHQ(bx, by, bw, bh) {
  // Base body — grey-cream stone
  g.fillStyle = '#c0b898';
  g.fillRect(bx, by + 8, bw, bh - 8);
  // Columns
  const colXs = [1, 2, 3, 4].map(i => bx + i * (bw / 5) - 4);
  colXs.forEach(cx2 => {
    g.fillStyle = '#e8e0d0';
    g.fillRect(cx2, by + 10, 8, bh - 10);
    g.strokeStyle = '#a09070'; g.lineWidth = 1;
    g.strokeRect(cx2, by + 10, 8, bh - 10);
  });
  // Pediment top
  g.fillStyle = '#c0b898';
  g.fillRect(bx + 8, by, bw - 16, 12);
  g.strokeStyle = '#5a4820'; g.lineWidth = 1;
  g.strokeRect(bx + 8, by, bw - 16, 12);
  // Clan banners
  const _drawBanner = (banx, bany, baw, bah, col) => {
    g.fillStyle = col;
    g.fillRect(banx, bany, baw, bah);
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1;
    g.strokeRect(banx, bany, baw, bah);
    // Banner tip (triangle at bottom)
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(banx, bany + bah);
    g.lineTo(banx + baw / 2, bany + bah + 6);
    g.lineTo(banx + baw, bany + bah);
    g.closePath(); g.fill();
  };
  _drawBanner(bx + bw * 0.35 - 7, by + 10, 14, 38, LOBBY_BANNER_A_COLOR);
  _drawBanner(bx + bw * 0.65 - 7, by + 10, 14, 38, LOBBY_BANNER_B_COLOR);
  // Crown icon top-center
  g.fillStyle = '#c8a040';
  g.font = '10px VT323, monospace';
  g.textAlign = 'center';
  g.fillText('♛', bx + bw / 2, by + 9);
}

function drawLobbyBuildingPCBox(bx, by, bw, bh) {
  // Body — dark blue-grey
  g.fillStyle = '#2a3050';
  g.fillRect(bx + 4, by + 12, bw - 8, bh - 16);
  g.strokeStyle = '#404868'; g.lineWidth = 1;
  g.strokeRect(bx + 4, by + 12, bw - 8, bh - 16);
  // Blue accent strip
  g.fillStyle = '#4060c0';
  g.fillRect(bx + 4, by + 12, bw - 8, 12);
  // Diamond icon
  g.fillStyle = '#80a0ff';
  g.font = '22px VT323, monospace';
  g.textAlign = 'center';
  g.fillText('♦', bx + bw / 2, by + bh / 2 + 8);
  // Two small windows
  _drawWindow(bx + 14, by + bh - 30, '#4060c0');
  _drawWindow(bx + bw - 30, by + bh - 30, '#4060c0');
}

function drawLobbyBuildingArenaHall(bx, by, bw, bh, tier) {
  const cfg = [
    { body: '#484858', star: '#888898', crown: '#c8a040', label: 'BRONZE HALL' },
    { body: '#505868', star: '#c0c8d8', crown: '#b0b8c8', label: 'SILVER HALL' },
    { body: '#604820', star: '#e0c040', crown: '#e0c040', label: 'GOLD HALL'   },
  ][tier];
  const borderColor = tier === 2 ? '#e0c040' : '#888898';
  // Body
  g.fillStyle = cfg.body;
  g.fillRect(bx + 2, by + 8, bw - 4, bh - 10);
  g.strokeStyle = borderColor; g.lineWidth = 2;
  g.strokeRect(bx + 2, by + 8, bw - 4, bh - 10);
  // Crown icon top-center
  g.fillStyle = cfg.crown;
  g.font = '10px VT323, monospace';
  g.textAlign = 'center';
  g.fillText('♛', bx + bw / 2, by + 18);
  // Stars row
  const stars = tier + 2;
  for (let s = 0; s < stars; s++) {
    g.fillStyle = cfg.star;
    g.fillText('★', bx + bw / 2 + (s - (stars - 1) / 2) * 12, by + 28);
  }
  // Oval entrance (dark)
  g.fillStyle = '#0a0a14';
  g.beginPath();
  g.ellipse(bx + bw / 2, by + bh - 24, 22, 14, 0, 0, Math.PI * 2);
  g.fill();
  // Entrance glow lights
  g.fillStyle = '#40cc60';
  g.beginPath(); g.arc(bx + bw / 2 - 18, by + bh - 24, 3, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(bx + bw / 2 + 18, by + bh - 24, 3, 0, Math.PI * 2); g.fill();
}

// ── Player / remote player sprite (T-D8-11/12) ────────────────────────────
function drawLobbyCharacter(cx, cy, clanColor, nameStr, isLocal) {
  const TS = LOBBY_TS;
  const sx = cx + TS / 2, sy = cy + TS / 2;

  // Drop shadow
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(sx - 7, sy + 9, 14, 4);

  // Legs
  g.fillStyle = '#2a2028';
  g.fillRect(sx - 5, sy + 3, 4, 6);
  g.fillRect(sx + 1, sy + 3, 4, 6);

  // Body — clan colored
  g.fillStyle = clanColor || '#888888';
  g.fillRect(sx - 6, sy - 5, 12, 10);
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1;
  g.strokeRect(sx - 6, sy - 5, 12, 10);

  // Head
  g.fillStyle = '#c8a060';
  g.fillRect(sx - 5, sy - 14, 10, 10);
  g.strokeStyle = '#5a3818'; g.lineWidth = 1;
  g.strokeRect(sx - 5, sy - 14, 10, 10);

  // Eyes
  g.fillStyle = '#2a1808';
  g.fillRect(sx - 3, sy - 12, 2, 2);
  g.fillRect(sx + 1, sy - 12, 2, 2);

  // Local player: yellow hat strip
  if (isLocal) {
    g.fillStyle = '#e0c040';
    g.fillRect(sx - 5, sy - 15, 10, 3);
  }

  // Name label above sprite
  g.fillStyle = isLocal ? '#f0e0a0' : '#8888aa';
  g.font = '9px VT323, monospace';
  g.textAlign = 'center';
  g.fillText((nameStr || '?').slice(0, 8), sx, cy + 2);
}

// ── Building proximity check ─────────────────────────────────────────────
function lobbyCheckProximity() {
  lobbyNearBuilding = null;
  for (const obj of LOBBY_OBJECTS) {
    // 1-tile proximity check (adjacent to footprint)
    if (lobbyPx >= obj.x - 1 && lobbyPx <= obj.x + obj.w &&
        lobbyPy >= obj.y - 1 && lobbyPy <= obj.y + obj.h) {
      lobbyNearBuilding = obj;
      break;
    }
  }
}

// ── Player movement (called from 10-input.js) ────────────────────────────
function lobbyMove(dx, dy) {
  if (lobbyMoveDebounce > 0) return;
  const nx = lobbyPx + dx, ny = lobbyPy + dy;
  if (nx < 0 || nx >= LOBBY_W || ny < 0 || ny >= LOBBY_H) return;
  if (LOBBY_WALLS[ny][nx] !== 0) return; // collision
  lobbyPx = nx; lobbyPy = ny;
  lobbyMoveDebounce = LOBBY_MOVE_DELAY;
  if (dx > 0) lobbyDir = 3;
  else if (dx < 0) lobbyDir = 2;
  else if (dy > 0) lobbyDir = 0;
  else lobbyDir = 1;
  lobbyCheckProximity();
  lobbyWSSendMove(lobbyPx, lobbyPy);
}

// ── Lobby interact (called from 10-input.js on Enter/Space) ─────────────
function lobbyInteract() {
  if (lobbyDialog) { lobbyDialogConfirm(); return; }
  if (lobbyInteractCooldown > 0) return;
  if (!lobbyNearBuilding) return;
  lobbyInteractCooldown = 30;
  lobbyOpenDialog(lobbyNearBuilding.name);
}

// ── Enter / exit lobby ───────────────────────────────────────────────────
function enterLobby() {
  lobbyPx = LOBBY_SPAWN.x;
  lobbyPy = LOBBY_SPAWN.y;
  lobbyDir = 0;
  lobbyMoveDebounce = 0;
  lobbyInteractCooldown = 0;
  lobbyCheckProximity();
  sc = 'lobby';
  lobbyWSConnect();
  // Async load HUD data (card count + season day)
  _loadLobbyHUD().catch(e => console.warn('[Lobby HUD]', e.message));
  // Async load bottom bar data (wallet name + SOL balance)
  const pk = window.solana?.publicKey;
  if (pk) {
    const stored = localStorage.getItem('oxark_wallet_name');
    lobbyBottomName = stored || (pk.toBase58().slice(0, 6) + '…');
    try {
      const _c = new solanaWeb3.Connection(_DE_DEVNET_RPC_LOBBY, 'confirmed');
      _c.getBalance(pk).then(lam => { lobbyBottomSol = (lam / 1e9).toFixed(3); }).catch(() => {});
    } catch (_) {}
  }
}

function exitLobby() {
  lobbyWSDisconnect();
  sc = 'map';
}

// ── Camera: center on player ─────────────────────────────────────────────
function lobbyCamOffset() {
  const mapPxW = LOBBY_W * LOBBY_TS; // 800
  const mapPxH = LOBBY_H * LOBBY_TS; // 576
  const centerX = lobbyPx * LOBBY_TS + LOBBY_TS / 2 - W / 2;
  const centerY = lobbyPy * LOBBY_TS + LOBBY_TS / 2 - H / 2;
  return {
    ox: Math.max(0, Math.min(mapPxW - W, centerX)),
    oy: Math.max(0, Math.min(mapPxH - H, centerY)),
  };
}

// ── Main draw function ────────────────────────────────────────────────────
function dLobby() {
  if (lobbyMoveDebounce > 0) lobbyMoveDebounce--;
  if (lobbyInteractCooldown > 0) lobbyInteractCooldown--;

  const { ox, oy } = lobbyCamOffset();

  // ── T-D8-1: Sky gradient + horizon silhouette (fixed, not camera-scrolled) ─
  const skyH = H * 0.45;
  const skyGrad = g.createLinearGradient(0, 0, 0, skyH);
  skyGrad.addColorStop(0.0, '#c04820');
  skyGrad.addColorStop(0.5, '#803060');
  skyGrad.addColorStop(1.0, '#2a1838');
  g.fillStyle = skyGrad;
  g.fillRect(0, 0, W, skyH);

  // Horizon silhouette
  g.fillStyle = '#141420';
  g.fillRect(0, H * 0.42, W, 10);
  const towers = [[40, 6, 0.08], [20, 10, 0.25], [30, 4, 0.6], [25, 8, 0.78], [18, 6, 0.9]];
  towers.forEach(([tw, th, xr]) => { g.fillRect(xr * W, H * 0.42 - th, tw, th); });

  // Floor background (below sky)
  g.fillStyle = '#888898';
  g.fillRect(0, skyH, W, H - skyH);

  g.save();
  g.translate(-ox, -oy);

  // ── T-D8-2: Ground layer — new tile recipes via drawLobbyTile ─────────────
  for (let ty = 0; ty < LOBBY_H; ty++) {
    for (let tx = 0; tx < LOBBY_W; tx++) {
      const cx = tx * LOBBY_TS, cy = ty * LOBBY_TS;
      drawLobbyTile(LOBBY_GROUND[ty][tx], cx, cy);
    }
  }

  // Building footprints + labels (placeholder rects — sprites in T-D8-6..9)
  for (const obj of LOBBY_OBJECTS) {
    g.fillStyle = 'rgba(60,40,20,0.7)';
    g.fillRect(obj.x * LOBBY_TS, obj.y * LOBBY_TS, obj.w * LOBBY_TS, obj.h * LOBBY_TS);
    g.strokeStyle = '#c8a460'; g.lineWidth = 2;
    g.strokeRect(obj.x * LOBBY_TS + 1, obj.y * LOBBY_TS + 1, obj.w * LOBBY_TS - 2, obj.h * LOBBY_TS - 2);
    g.fillStyle = '#f0e0a0'; g.font = 'bold 10px VT323, monospace'; g.textAlign = 'center';
    g.fillText(obj.label, (obj.x + obj.w / 2) * LOBBY_TS, (obj.y + obj.h / 2) * LOBBY_TS + 4);
  }

  // Remote players — lerp toward target position (smooth movement)
  for (const [, rp] of lobbyRemotePlayers) {
    if (typeof rp.curX === 'undefined') { rp.curX = rp.targetX ?? rp.px; rp.curY = rp.targetY ?? rp.py; }
    rp.curX += ((rp.targetX ?? rp.px) - rp.curX) * 0.15;
    rp.curY += ((rp.targetY ?? rp.py) - rp.curY) * 0.15;
    const rx = rp.curX * LOBBY_TS, ry = rp.curY * LOBBY_TS;
    g.fillStyle = CLAN_TINTS[rp.clan] || CLAN_TINTS['null'];
    g.fillRect(rx + 6, ry + 4, LOBBY_TS - 12, LOBBY_TS - 8);
    g.fillStyle = '#fff'; g.font = '8px VT323, monospace'; g.textAlign = 'center';
    g.fillText(rp.wallet ? rp.wallet.slice(0, 6) + '…' : '?', rx + LOBBY_TS / 2, ry - 2);
  }

  // Local player sprite
  const px = lobbyPx * LOBBY_TS, py = lobbyPy * LOBBY_TS;
  g.fillStyle = '#e8c870';
  g.fillRect(px + 6, py + 4, LOBBY_TS - 12, LOBBY_TS - 8);
  g.fillStyle = '#fff';
  g.beginPath();
  if (lobbyDir === 0) { g.moveTo(px+LOBBY_TS/2,py+LOBBY_TS-4);g.lineTo(px+LOBBY_TS/2-4,py+LOBBY_TS-10);g.lineTo(px+LOBBY_TS/2+4,py+LOBBY_TS-10); }
  else if (lobbyDir === 1) { g.moveTo(px+LOBBY_TS/2,py+4);g.lineTo(px+LOBBY_TS/2-4,py+10);g.lineTo(px+LOBBY_TS/2+4,py+10); }
  else if (lobbyDir === 2) { g.moveTo(px+4,py+LOBBY_TS/2);g.lineTo(px+10,py+LOBBY_TS/2-4);g.lineTo(px+10,py+LOBBY_TS/2+4); }
  else                     { g.moveTo(px+LOBBY_TS-4,py+LOBBY_TS/2);g.lineTo(px+LOBBY_TS-10,py+LOBBY_TS/2-4);g.lineTo(px+LOBBY_TS-10,py+LOBBY_TS/2+4); }
  g.fill();

  g.restore(); // un-translate camera

  // HUD overlay (fixed, not scrolled) — proximity prompt
  if (lobbyNearBuilding) {
    g.fillStyle = 'rgba(0,0,0,0.7)';
    g.fillRect(W / 2 - 100, H - 52, 200, 28);
    g.fillStyle = '#f0e0a0'; g.font = '14px VT323, monospace'; g.textAlign = 'center';
    g.fillText(`[Z] Enter ${lobbyNearBuilding.label}`, W / 2, H - 34);
  }

  // T-D6-2: Permanent HUD — card count + season day (top-right)
  {
    const cardStr = lobbyHudCards !== null ? `${lobbyHudCards}/60 cards` : '—/60 cards';
    const dayStr  = lobbyHudDay   !== null ? `Day ${lobbyHudDay}/${lobbyHudTotalDays} — Season 1` : 'Season 1';
    g.font = '13px VT323, monospace'; g.textAlign = 'right';
    const hx = W - 6;
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(W - 110, 4, 106, 30);
    g.fillStyle = '#e0d080'; g.fillText(cardStr, hx, 17);
    g.fillStyle = '#8888aa'; g.fillText(dayStr, hx, 30);
  }

  // Match found celebration flash
  if (lobbyMatchFlash > 0) {
    lobbyMatchFlash--;
    const fAlpha = (lobbyMatchFlash / 60) * 0.55;
    g.fillStyle = `rgba(255,220,60,${fAlpha})`;
    g.fillRect(0, 0, W, H);
    if (lobbyMatchFlash > 20) {
      g.fillStyle = '#fff'; g.font = 'bold 32px VT323, monospace'; g.textAlign = 'center';
      g.fillText('⚔️ MATCH FOUND!', W / 2, H / 2);
    }
  }

  // Building dialog overlay (drawn last — on top of everything)
  drawLobbyDialog();

  // Deck editor overlay (above dialog, if open)
  if (typeof deckEditorOpen !== 'undefined' && deckEditorOpen && typeof drawDeckEditor === 'function') {
    drawDeckEditor();
  }
}
