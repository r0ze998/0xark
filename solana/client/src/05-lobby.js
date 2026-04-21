// ═══════════════════════════════════════════════════════════════════════════
// MODULE: 05-lobby.js
// LobbyScene — Phase D Reborn main hub
// 25×18 tile map, 6 buildings, WebSocket multiplayer (wired in T-D3-3).
// Uses PIRATE_SHEET (Kenney Monochrome Pirates, 17 cols × 8 rows, 16px, 1px gap).
// ═══════════════════════════════════════════════════════════════════════════

// ── Lobby map data (embedded from lobby-map.json) ────────────────────────
// Tile IDs are 1-indexed per Tiled convention; 0 = empty.
// Sheet: 17 cols × 8 rows, 16×16px per tile, 1px spacing = 17px stride.

const LOBBY_W = 25, LOBBY_H = 18;
const LOBBY_TS = 32;          // collision/movement unit (unchanged)
const LOBBY_RENDER_TS = 15;   // visual tile size: 18×15 = 270 = H
const LOBBY_RENDER_OX = Math.floor((480 - LOBBY_W * LOBBY_RENDER_TS) / 2); // (480-375)/2 = 52

// tx/ty/tw/th = tile coords (for collision + proximity).
// px/py/pw/ph = pixel coords in 480×270 canvas (for rendering, per UI_SPEC v2.0 §1.2 + r0ze M1 mockup).
const LOBBY_OBJECTS = [
  { name:'faction_hq',  tx:9,  ty:5,  tw:6, th:4, px:200, py:125, pw:80, ph:70, label:'FACTION HQ',  interaction:'enter_faction_hq'  },
  { name:'shop',        tx:0,  ty:8,  tw:4, th:4, px:40,  py:140, pw:60, ph:50, label:'SHOP',         interaction:'enter_shop'         },
  { name:'pc_box',      tx:21, ty:8,  tw:4, th:3, px:380, py:145, pw:55, ph:45, label:'PC BOX',       interaction:'enter_pc_box'       },
  { name:'bronze_hall', tx:0,  ty:12, tw:5, th:4, px:50,  py:205, pw:70, ph:55, label:'BRONZE HALL',  interaction:'enter_bronze_hall'  },
  { name:'silver_hall', tx:8,  ty:12, tw:6, th:4, px:185, py:200, pw:85, ph:60, label:'SILVER HALL',  interaction:'enter_silver_hall'  },
  { name:'gold_hall',   tx:19, ty:12, tw:6, th:4, px:340, py:195, pw:95, ph:65, label:'GOLD HALL',    interaction:'enter_gold_hall'    },
];

const LOBBY_SPAWN = { x:12, y:10 }; // open plaza row 10, clear between HQ (rows 5-8) and halls (rows 12-15)

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
// Tile ranges match LOBBY_OBJECTS tx/ty/tw/th fields.
const LOBBY_WALLS = (()=>{
  const HQ=56, BW=39, OC=18;
  const grid = Array.from({length:LOBBY_H}, ()=>Array(LOBBY_W).fill(0));
  // Ocean border rows 0-1
  for(let x=0;x<LOBBY_W;x++){grid[0][x]=OC;grid[1][x]=OC;}
  // Faction HQ: tx=9 ty=5 tw=6 th=4 → cols 9-14, rows 5-8
  for(let y=5;y<=8;y++) for(let x=9;x<=14;x++) grid[y][x]=HQ;
  // Shop: tx=0 ty=8 tw=4 th=4 → cols 0-3, rows 8-11
  for(let y=8;y<=11;y++) for(let x=0;x<=3;x++) grid[y][x]=BW;
  // PC Box: tx=21 ty=8 tw=4 th=3 → cols 21-24, rows 8-10
  for(let y=8;y<=10;y++) for(let x=21;x<=24;x++) grid[y][x]=BW;
  // Bronze Hall: tx=0 ty=12 tw=5 th=4 → cols 0-4, rows 12-15
  for(let y=12;y<=15;y++) for(let x=0;x<=4;x++) grid[y][x]=BW;
  // Silver Hall: tx=8 ty=12 tw=6 th=4 → cols 8-13, rows 12-15
  for(let y=12;y<=15;y++) for(let x=8;x<=13;x++) grid[y][x]=BW;
  // Gold Hall: tx=19 ty=12 tw=6 th=4 → cols 19-24, rows 12-15
  for(let y=12;y<=15;y++) for(let x=19;x<=24;x++) grid[y][x]=BW;
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

// Clan tints — confirmed by r0ze (msg 1644)
const CLAN_TINTS = {
  black_flag:       '#3A5998', // navy
  sovereign_bourse: '#E8C850', // gold
  hollow_blade:     '#C64A3F', // crimson
  iron_circle:      '#5A8A4A', // forest green
  nameless_silk:    '#7A4A9A', // deep purple
  null:             '#888888',
};

// ── Tile drawing helper ──────────────────────────────────────────────────
// Draws a single tile from PIRATE_SHEET at canvas coords (cx,cy).
// tileId is 1-indexed; 0 = skip (transparent).
// T-D8-2: new tile drawing with UI_SPEC v2.0 color recipes
function drawLobbyTile(tileId, cx, cy, ts) {
  const TS = ts || LOBBY_RENDER_TS;
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
// All functions fully proportional to (bx,by,bw,bh) for sizes 55–95px wide.

// sz = window size in px (default 7)
function _drawWindow(wx, wy, sz, color) {
  const s = sz || 7;
  g.fillStyle = color || '#c8d8e8';
  g.fillRect(wx, wy, s, s);
  g.strokeStyle = '#2a1808'; g.lineWidth = 1;
  g.strokeRect(wx, wy, s, s);
  g.strokeStyle = 'rgba(0,0,0,0.3)';
  g.beginPath(); g.moveTo(wx + s / 2, wy); g.lineTo(wx + s / 2, wy + s); g.stroke();
  g.beginPath(); g.moveTo(wx, wy + s / 2); g.lineTo(wx + s, wy + s / 2); g.stroke();
}

// T-D8-6: SHOP — cream stone, striped red/cream awning, door, 2 windows
function drawLobbyBuildingShop(bx, by, bw, bh) {
  const mg  = Math.max(2, Math.floor(bw * 0.06));
  const bX  = bx + mg, bW = bw - mg * 2;
  const topY = by + Math.floor(bh * 0.18);       // body top
  const bH  = bh - Math.floor(bh * 0.18) - mg;  // body height
  const awH = Math.floor(bH * 0.35);             // awning portion

  // Body
  g.fillStyle = '#d8c898';
  g.fillRect(bX, topY, bW, bH);
  g.strokeStyle = '#5a4020'; g.lineWidth = 1;
  g.strokeRect(bX, topY, bW, bH);

  // Awning stripes
  const sw = Math.max(4, Math.floor(bW / 6));
  for (let i = 0; i < Math.ceil(bW / sw); i++) {
    g.fillStyle = i % 2 === 0 ? '#cc3333' : '#e8d0a0';
    g.fillRect(bX + i * sw, topY, Math.min(sw, bW - i * sw), awH);
  }
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.fillRect(bX, topY + awH, bW, 2);

  // Windows — proportionally spaced, non-overlapping
  const wz  = Math.max(5, Math.floor(bW * 0.17));
  const wY  = topY + awH + 3;
  const wL  = bX + Math.floor(bW * 0.12);
  const wR  = bX + bW - Math.floor(bW * 0.12) - wz;
  if (wR >= wL + wz + 2) {
    _drawWindow(wL, wY, wz);
    _drawWindow(wR, wY, wz);
  }

  // Door
  const dW = Math.max(6, Math.floor(bW * 0.22));
  const dH = Math.max(8, Math.floor(bH * 0.48));
  const dX = bX + Math.floor((bW - dW) / 2);
  const dY = topY + bH - dH;
  g.fillStyle = '#7a4020';
  g.fillRect(dX, dY, dW, dH);
  g.strokeStyle = '#3a1a08'; g.lineWidth = 1;
  g.strokeRect(dX, dY, dW, dH);
  g.fillStyle = '#c8a040';
  g.fillRect(dX + dW - 3, dY + Math.floor(dH * 0.45), 2, 2);
}

// T-D8-7: FACTION HQ — pediment, columns, clan banners, crown
function drawLobbyBuildingFactionHQ(bx, by, bw, bh) {
  const pedH = Math.max(8, Math.floor(bh * 0.14));
  const mg   = Math.max(6, Math.floor(bw * 0.08));

  // Base body
  g.fillStyle = '#c0b898';
  g.fillRect(bx, by + pedH, bw, bh - pedH);

  // Columns (3 evenly spaced)
  const colW = Math.max(4, Math.floor(bw * 0.07));
  [1, 2, 3].forEach(i => {
    const cx2 = bx + Math.floor(i * bw / 4) - Math.floor(colW / 2);
    g.fillStyle = '#e8e0d0';
    g.fillRect(cx2, by + pedH, colW, bh - pedH);
    g.strokeStyle = '#a09070'; g.lineWidth = 1;
    g.strokeRect(cx2, by + pedH, colW, bh - pedH);
  });

  // Pediment
  g.fillStyle = '#c0b898';
  g.fillRect(bx + mg, by, bw - mg * 2, pedH);
  g.strokeStyle = '#5a4820'; g.lineWidth = 1;
  g.strokeRect(bx + mg, by, bw - mg * 2, pedH);

  // Clan banners — proportional size
  const banW = Math.max(6, Math.floor(bw * 0.10));
  const banH = Math.floor(bh * 0.52);
  const _drawBanner = (banx, col) => {
    g.fillStyle = col;
    g.fillRect(banx, by + pedH, banW, banH);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
    g.strokeRect(banx, by + pedH, banW, banH);
    g.beginPath();
    g.moveTo(banx, by + pedH + banH);
    g.lineTo(banx + banW / 2, by + pedH + banH + 4);
    g.lineTo(banx + banW, by + pedH + banH);
    g.fillStyle = col; g.closePath(); g.fill();
  };
  _drawBanner(bx + Math.floor(bw * 0.28) - Math.floor(banW / 2), LOBBY_BANNER_A_COLOR);
  _drawBanner(bx + Math.floor(bw * 0.72) - Math.floor(banW / 2), LOBBY_BANNER_B_COLOR);

  // Crown
  g.fillStyle = '#c8a040';
  g.font = '9px VT323, monospace'; g.textAlign = 'center';
  g.fillText('♛', bx + bw / 2, by + pedH - 1);
}

// T-D8-8: PC BOX — dark blue body, accent strip, diamond icon, 2 small windows
function drawLobbyBuildingPCBox(bx, by, bw, bh) {
  const mg  = Math.max(2, Math.floor(bw * 0.06));
  const bX  = bx + mg, bW = bw - mg * 2;
  const topY = by + Math.floor(bh * 0.20);
  const bH  = bh - Math.floor(bh * 0.20) - mg;
  const accH = Math.floor(bH * 0.28);

  // Body
  g.fillStyle = '#2a3050';
  g.fillRect(bX, topY, bW, bH);
  g.strokeStyle = '#404868'; g.lineWidth = 1;
  g.strokeRect(bX, topY, bW, bH);

  // Accent strip
  g.fillStyle = '#4060c0';
  g.fillRect(bX, topY, bW, accH);

  // Diamond icon
  g.fillStyle = '#80a0ff';
  g.font = `${Math.max(12, Math.floor(bW * 0.35))}px VT323, monospace`;
  g.textAlign = 'center';
  g.fillText('♦', bx + bw / 2, topY + accH + Math.floor((bH - accH) * 0.55));

  // Two windows (lower third, non-overlapping)
  const wz = Math.max(4, Math.floor(bW * 0.15));
  const wY = topY + bH - wz - 4;
  const wL = bX + Math.floor(bW * 0.10);
  const wR = bX + bW - Math.floor(bW * 0.10) - wz;
  if (wR >= wL + wz + 2) {
    _drawWindow(wL, wY, wz, '#4060c0');
    _drawWindow(wR, wY, wz, '#4060c0');
  }
}

// T-D8-9: ARENA HALLS — Bronze (tier=0) / Silver (tier=1) / Gold (tier=2)
function drawLobbyBuildingArenaHall(bx, by, bw, bh, tier) {
  const cfg = [
    { body: '#484858', star: '#888898', crown: '#c8a040' },
    { body: '#505868', star: '#c0c8d8', crown: '#b0b8c8' },
    { body: '#604820', star: '#e0c040', crown: '#e0c040' },
  ][tier];
  const borderColor = tier === 2 ? '#e0c040' : '#888898';
  const bdrW = tier === 2 ? 2 : 1;
  const topY = by + Math.floor(bh * 0.12);

  // Body
  g.fillStyle = cfg.body;
  g.fillRect(bx + 2, topY, bw - 4, bh - Math.floor(bh * 0.12));
  g.strokeStyle = borderColor; g.lineWidth = bdrW;
  g.strokeRect(bx + 2, topY, bw - 4, bh - Math.floor(bh * 0.12));

  // Crown + tier label top
  g.fillStyle = cfg.crown;
  g.font = '8px VT323, monospace'; g.textAlign = 'center';
  g.fillText('♛', bx + bw / 2, topY + 8);

  // Stars row (tier+2 stars, spacing scaled to bw)
  const stars  = tier + 2;
  const sSpacing = Math.min(10, Math.floor(bw / (stars + 1)));
  for (let s = 0; s < stars; s++) {
    g.fillStyle = cfg.star;
    g.fillText('★', bx + bw / 2 + (s - (stars - 1) / 2) * sSpacing, topY + 18);
  }

  // Oval entrance
  const ellW = Math.floor(bw * 0.35);
  const ellH = Math.floor(bh * 0.20);
  const ellCY = by + bh - ellH - 4;
  g.fillStyle = '#0a0a14';
  g.beginPath();
  g.ellipse(bx + bw / 2, ellCY, ellW, ellH, 0, 0, Math.PI * 2);
  g.fill();

  // Entrance glow lights
  g.fillStyle = '#40cc60';
  g.beginPath(); g.arc(bx + bw / 2 - ellW + 3, ellCY, 2, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(bx + bw / 2 + ellW - 3, ellCY, 2, 0, Math.PI * 2); g.fill();
}

// ── Player / remote player sprite (T-D8-11/12) ────────────────────────────
// Character spec (r0ze msg 1644, 12×16 logical px):
//   head  — 7px tall × 8px wide (slightly large head)
//   body  — 7px tall × 10px wide (compact torso)
//   legs  — 2px tall, two legs each 2px wide (4px total, gap between)
// cx/cy = top-left of tile cell in canvas coords; scale defaults to 1.
function drawLobbyCharacter(cx, cy, clanColor, nameStr, isLocal, scale) {
  const sc = scale || 1;
  const RTS = LOBBY_RENDER_TS; // 15px tile
  // When scale=1: sprite fits in tile; sx/sy = bottom-centre anchor
  const sx = cx + (RTS * sc) / 2;
  const sy = cy + RTS * sc - 2 * sc;

  // Drop shadow
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(sx - 5 * sc, sy + sc, 10 * sc, 2 * sc);

  // Legs — 2px tall × 2px each, 4px total, 2px gap between
  g.fillStyle = '#2a2028';
  g.fillRect(sx - 4 * sc,  sy - 2 * sc,  2 * sc, 2 * sc); // left leg
  g.fillRect(sx + 2 * sc,  sy - 2 * sc,  2 * sc, 2 * sc); // right leg

  // Body + arms — 10×7px, clan coloured
  g.fillStyle = clanColor || '#888888';
  g.fillRect(sx - 5 * sc,  sy - 9 * sc, 10 * sc, 7 * sc);
  g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = sc;
  g.strokeRect(sx - 5 * sc, sy - 9 * sc, 10 * sc, 7 * sc);

  // Head — 8×7px, skin tone
  g.fillStyle = '#c8a060';
  g.fillRect(sx - 4 * sc, sy - 16 * sc, 8 * sc, 7 * sc);
  g.strokeStyle = '#5a3818'; g.lineWidth = sc;
  g.strokeRect(sx - 4 * sc, sy - 16 * sc, 8 * sc, 7 * sc);

  // Eyes — 1×2px each
  g.fillStyle = '#2a1808';
  g.fillRect(sx - 3 * sc, sy - 14 * sc, sc, 2 * sc);
  g.fillRect(sx + 2 * sc, sy - 14 * sc, sc, 2 * sc);

  // Local player: 2px gold hat band at top of head
  if (isLocal) {
    g.fillStyle = '#e0c040';
    g.fillRect(sx - 4 * sc, sy - 16 * sc, 8 * sc, 2 * sc);
  }

  // Name tag above sprite
  g.fillStyle = isLocal ? '#f0e0a0' : '#8888aa';
  g.font = `${Math.max(7, Math.round(8 * sc))}px VT323, monospace`;
  g.textAlign = 'center';
  g.fillText((nameStr || '?').slice(0, 8), sx, cy + 2 * sc);
}

// ── Building proximity check ─────────────────────────────────────────────
function lobbyCheckProximity() {
  lobbyNearBuilding = null;
  for (const obj of LOBBY_OBJECTS) {
    // 1-tile proximity check (adjacent to tile footprint)
    if (lobbyPx >= obj.tx - 1 && lobbyPx <= obj.tx + obj.tw &&
        lobbyPy >= obj.ty - 1 && lobbyPy <= obj.ty + obj.th) {
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

// ── Camera: fixed (no scrolling) — scene fits in 480×270 with LOBBY_RENDER_TS=15 ─
function lobbyCamOffset() { return { ox: 0, oy: 0 }; }

// ── Main draw function ────────────────────────────────────────────────────
function dLobby() {
  if (lobbyMoveDebounce > 0) lobbyMoveDebounce--;
  if (lobbyInteractCooldown > 0) lobbyInteractCooldown--;

  const RTS = LOBBY_RENDER_TS;   // 15
  const ROX = LOBBY_RENDER_OX;   // 52 — left margin so 25×15=375 is centered in 480

  // ── Layer 1: Sky gradient + horizon (T-D8-1, fixed) ──────────────────────
  const skyH = Math.floor(H * 0.45); // ~121px
  const skyGrad = g.createLinearGradient(0, 0, 0, skyH);
  skyGrad.addColorStop(0.0, '#c04820');
  skyGrad.addColorStop(0.5, '#803060');
  skyGrad.addColorStop(1.0, '#2a1838');
  g.fillStyle = skyGrad;
  g.fillRect(0, 0, W, skyH);

  // Horizon silhouette strip
  g.fillStyle = '#141420';
  g.fillRect(0, Math.floor(H * 0.42), W, 10);
  [[40,6,0.08],[20,10,0.25],[30,4,0.6],[25,8,0.78],[18,6,0.9]].forEach(([tw,th,xr]) => {
    g.fillRect(Math.floor(xr * W), Math.floor(H * 0.42) - th, tw, th);
  });

  // Floor background (margin areas outside tile map)
  g.fillStyle = '#888898';
  g.fillRect(0, skyH, W, H - skyH);

  // ── Layer 2: Ground tiles — fixed scale, no scrolling (T-D8-2) ───────────
  for (let trow = 0; trow < LOBBY_H; trow++) {
    for (let tcol = 0; tcol < LOBBY_W; tcol++) {
      drawLobbyTile(LOBBY_GROUND[trow][tcol], ROX + tcol * RTS, trow * RTS, RTS);
    }
  }

  // ── Layer 3: Building sprites at fixed pixel positions (T-D8-6..9) ────────
  for (const obj of LOBBY_OBJECTS) {
    const { px: bx, py: by, pw: bw, ph: bh, name } = obj;
    if      (name === 'shop')         drawLobbyBuildingShop(bx, by, bw, bh);
    else if (name === 'faction_hq')   drawLobbyBuildingFactionHQ(bx, by, bw, bh);
    else if (name === 'pc_box')       drawLobbyBuildingPCBox(bx, by, bw, bh);
    else if (name === 'bronze_hall')  drawLobbyBuildingArenaHall(bx, by, bw, bh, 0);
    else if (name === 'silver_hall')  drawLobbyBuildingArenaHall(bx, by, bw, bh, 1);
    else if (name === 'gold_hall')    drawLobbyBuildingArenaHall(bx, by, bw, bh, 2);
  }

  // ── T-D8-10: Building labels below buildings ──────────────────────────────
  for (const obj of LOBBY_OBJECTS) {
    const lx = obj.px + obj.pw / 2;
    const ly = obj.py + obj.ph + 10;
    if (ly >= H - 36) continue; // skip if under bottom bar
    g.font = 'bold 9px VT323, monospace';
    g.textAlign = 'center';
    const lw = g.measureText(obj.label).width + 8;
    g.fillStyle = 'rgba(0,0,0,0.65)';
    g.fillRect(lx - lw / 2, ly - 9, lw, 11);
    g.fillStyle = '#f0e0a0';
    g.fillText(obj.label, lx, ly);
  }

  // ── Layer 4: Remote players (lerp + block character) ─────────────────────
  for (const [, rp] of lobbyRemotePlayers) {
    if (typeof rp.curX === 'undefined') { rp.curX = rp.targetX ?? rp.px; rp.curY = rp.targetY ?? rp.py; }
    rp.curX += ((rp.targetX ?? rp.px) - rp.curX) * 0.15;
    rp.curY += ((rp.targetY ?? rp.py) - rp.curY) * 0.15;
    const color = CLAN_TINTS[rp.clan] || CLAN_TINTS['null'];
    const rname = rp.wallet ? rp.wallet.slice(0, 6) + '…' : '?';
    drawLobbyCharacter(ROX + rp.curX * RTS, rp.curY * RTS, color, rname, false);
  }

  // ── Layer 5: Local player block character ─────────────────────────────────
  {
    // T-D8-11: local player uses clan colour (default Black Flag navy until clan assigned)
    const localClan = (typeof lobbyLocalClan !== 'undefined' && lobbyLocalClan) || 'black_flag';
    const localColor = CLAN_TINTS[localClan] || CLAN_TINTS['null'];
    const localName = window.solana?.publicKey
      ? window.solana.publicKey.toBase58().slice(0, 6) + '…'
      : 'YOU';
    drawLobbyCharacter(ROX + lobbyPx * RTS, lobbyPy * RTS, localColor, localName, true);
  }

  // ── T-D8-4: Area title "THE CROWN PLAZA" (fixed HUD, center-top) ─────────
  {
    const title = 'THE CROWN PLAZA';
    g.font = 'bold 13px VT323, monospace';
    g.textAlign = 'center';
    const tw = g.measureText(title).width + 22;
    const tx = (W - tw) / 2, ty = 4, th = 17;
    g.fillStyle = '#0e0e22';
    g.fillRect(tx, ty, tw, th);
    g.strokeStyle = '#c8a460'; g.lineWidth = 1;
    g.strokeRect(tx + 0.5, ty + 0.5, tw - 1, th - 1);
    g.fillStyle = '#f0e0a0';
    g.fillText(title, W / 2, ty + 12);
  }

  // ── T-D8-3: Top-right HUD — 3 stacked panels (400,10 / 400,36 / 400,56) ──
  {
    // Panel 1 — cards: x=400 y=10 w=75 h=22
    g.fillStyle = '#0e0e22';
    g.fillRect(400, 10, 75, 22);
    g.strokeStyle = '#c8a460'; g.lineWidth = 1;
    g.strokeRect(400, 10, 75, 22);
    g.textAlign = 'right'; g.font = 'bold 11px VT323, monospace';
    g.fillStyle = '#c8a460'; g.fillText('◆', 412, 25);
    g.fillStyle = '#f0d060';
    g.fillText(`${lobbyHudCards !== null ? lobbyHudCards : '—'}/60 CARDS`, 472, 25);

    // Panel 2 — day/season: x=400 y=36 w=75 h=16
    g.fillStyle = '#0e0e22';
    g.fillRect(400, 36, 75, 16);
    g.strokeStyle = '#333350'; g.lineWidth = 1;
    g.strokeRect(400, 36, 75, 16);
    g.fillStyle = '#8888cc'; g.font = '10px VT323, monospace';
    const dayStr = lobbyHudDay !== null
      ? `DAY ${lobbyHudDay}/${lobbyHudTotalDays}`
      : 'DAY —/—';
    g.fillText(dayStr, 472, 49);

    // Panel 3 — event name: x=400 y=56 w=75 h=14
    g.fillStyle = '#0c0c1c';
    g.fillRect(400, 56, 75, 14);
    g.strokeStyle = '#222240'; g.lineWidth = 1;
    g.strokeRect(400, 56, 75, 14);
    g.fillStyle = '#555570'; g.font = '9px VT323, monospace';
    const evName = lobbyHudEventName || 'SUCCESSION WAR';
    g.fillText(evName.slice(0, 14), 472, 67);
  }

  // ── T-D8-5: Bottom info bar (y=H-36=234) ─────────────────────────────────
  {
    const by2 = H - 36;
    g.fillStyle = '#1a2040';
    g.fillRect(0, by2, W, 36);
    g.strokeStyle = '#c8a460'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, by2); g.lineTo(W, by2); g.stroke();

    // LEFT — player info (w=148px)
    g.fillStyle = '#111830'; g.fillRect(0, by2, 148, 36);
    g.strokeStyle = '#333358'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(148, by2); g.lineTo(148, H); g.stroke();
    g.fillStyle = '#c8a460'; g.font = '11px VT323, monospace'; g.textAlign = 'left';
    g.fillText('▶', 6, by2 + 14);
    g.fillStyle = '#f0e0a0';
    g.fillText((lobbyBottomName || 'YOU').slice(0, 13), 18, by2 + 14);
    g.fillStyle = '#6080e0'; g.font = '10px VT323, monospace';
    g.fillText((lobbyBottomClan || '—').slice(0, 13), 18, by2 + 27);

    // CENTER — ticker (w~=248px from 148 to 396)
    g.fillStyle = '#aaaacc'; g.font = '10px VT323, monospace'; g.textAlign = 'center';
    const ticker = lobbyBottomTicker || 'THE KING IS DEAD.  THE CONTEST CONTINUES.';
    g.fillText(ticker.slice(0, 40), 148 + 124, by2 + 20);

    // RIGHT — SOL balance (w=84px from 396 to 480)
    g.fillStyle = '#111830'; g.fillRect(396, by2, 84, 36);
    g.strokeStyle = '#c8a460'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(396, by2); g.lineTo(396, H); g.stroke();
    g.fillStyle = '#c8a460'; g.font = '11px VT323, monospace'; g.textAlign = 'right';
    g.fillText('◆', 424, by2 + 14);
    g.fillStyle = '#f0d060';
    g.fillText(lobbyBottomSol !== null ? lobbyBottomSol : '—', 474, by2 + 14);
    g.fillStyle = '#555570'; g.font = '9px VT323, monospace';
    g.fillText('SOL', 474, by2 + 26);
  }

  // ── T-D8-13: Proximity prompt — floats above the building being approached ─
  if (lobbyNearBuilding) {
    const bld = lobbyNearBuilding;
    const pW = 160, pH = 20;
    // Centre horizontally over the building; keep within screen edges
    const pcx = Math.max(pW / 2 + 2, Math.min(W - pW / 2 - 2, bld.px + bld.pw / 2));
    const pcy = Math.max(pH + 4, bld.py - 6); // 6px gap above building top
    g.fillStyle = 'rgba(14,14,34,0.90)';
    g.fillRect(pcx - pW / 2, pcy - pH, pW, pH);
    g.strokeStyle = '#c8a460'; g.lineWidth = 1;
    g.strokeRect(pcx - pW / 2, pcy - pH, pW, pH);
    g.fillStyle = '#f0e0a0'; g.font = '11px VT323, monospace'; g.textAlign = 'center';
    g.fillText('[Z] Enter ' + bld.label, pcx, pcy - 5);
  }

  // Match found flash
  if (lobbyMatchFlash > 0) {
    lobbyMatchFlash--;
    g.fillStyle = `rgba(255,220,60,${(lobbyMatchFlash / 60) * 0.55})`;
    g.fillRect(0, 0, W, H);
    if (lobbyMatchFlash > 20) {
      g.fillStyle = '#fff'; g.font = 'bold 28px VT323, monospace'; g.textAlign = 'center';
      g.fillText('MATCH FOUND!', W / 2, H / 2);
    }
  }

  // Building dialog overlay
  drawLobbyDialog();

  // Deck editor overlay
  if (typeof deckEditorOpen !== 'undefined' && deckEditorOpen && typeof drawDeckEditor === 'function') {
    drawDeckEditor();
  }

}
