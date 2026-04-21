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
  { name:'bronze_hall', x:10, y:14, w:4, h:3, label:'🥉 BRONZE',     interaction:'enter_bronze_hall'  },
  { name:'silver_hall', x:15, y:14, w:4, h:3, label:'🥈 SILVER',     interaction:'enter_silver_hall'  },
  { name:'gold_hall',   x:20, y:14, w:4, h:3, label:'🥇 GOLD',       interaction:'enter_gold_hall'    },
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
        title: '🛒 Shop',
        lines: ['Booster packs, singles, and Clan starters.', 'Coming Day 4-6'],
        buttons: [{ label: 'Close', action: 'close', disabled: false }],
        focusIdx: 0,
      };
      break;
    case 'pc_box':
      lobbyDialog = {
        title: '💾 PC Box',
        lines: ['Storage & Deck Editor', 'Coming Day 4-6'],
        buttons: [{ label: 'Open Deck Editor', action: 'open_deck_editor', disabled: true }, { label: 'Close', action: 'close', disabled: false }],
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
  const dw = 320, dh = 200;
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

  // Buttons
  const btnY = dy + dh - 50;
  const btnW = 120, btnH = 28, gap = 12;
  const totalW = lobbyDialog.buttons.length * btnW + (lobbyDialog.buttons.length - 1) * gap;
  let bx = dx + (dw - totalW) / 2;
  lobbyDialog.buttons.forEach((btn, i) => {
    const isFocus = i === lobbyDialog.focusIdx;
    g.fillStyle = btn.disabled ? '#1a1a2a' : isFocus ? '#3040a0' : '#222238';
    g.fillRect(bx, btnY, btnW, btnH);
    g.strokeStyle = btn.disabled ? '#333' : isFocus ? '#6080e0' : '#444466';
    g.lineWidth = 1;
    g.strokeRect(bx + 0.5, btnY + 0.5, btnW - 1, btnH - 1);
    g.fillStyle = btn.disabled ? '#444' : isFocus ? '#e8e8ff' : '#8888aa';
    g.font = '14px VT323, monospace';
    g.textAlign = 'center';
    g.fillText(btn.label, bx + btnW / 2, btnY + 19);
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
function drawLobbyTile(tileId, cx, cy) {
  if (!tileId || !PIRATE_SHEET.complete || !PIRATE_SHEET.naturalWidth) {
    // Fallback solid color based on tile category
    if (tileId === 18) g.fillStyle='#0a1a3a'; // ocean → dark blue
    else if (tileId === 36) g.fillStyle='#4a3a2a'; // cliff → brown
    else if (tileId === 3)  g.fillStyle='#a89060'; // path → sandy
    else if (tileId >= 39 && tileId <= 60) g.fillStyle='#5a4030'; // building → brown
    else g.fillStyle='#6a8040'; // default ground → green
    g.fillRect(cx, cy, LOBBY_TS, LOBBY_TS);
    return;
  }
  const idx = tileId - 1;
  const sc = idx % LOBBY_SHEET_COLS;
  const sr = Math.floor(idx / LOBBY_SHEET_COLS);
  const sx = sc * LOBBY_SHEET_STRIDE;
  const sy = sr * LOBBY_SHEET_STRIDE;
  g.drawImage(PIRATE_SHEET, sx, sy, 16, 16, cx, cy, LOBBY_TS, LOBBY_TS);
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

  // Background fill
  g.fillStyle = '#0a1218';
  g.fillRect(0, 0, W, H);

  g.save();
  g.translate(-ox, -oy);

  // Ground layer
  for (let ty = 0; ty < LOBBY_H; ty++) {
    for (let tx = 0; tx < LOBBY_W; tx++) {
      const cx = tx * LOBBY_TS, cy = ty * LOBBY_TS;
      drawLobbyTile(LOBBY_GROUND[ty][tx], cx, cy);
    }
  }

  // Building footprints + labels
  for (const obj of LOBBY_OBJECTS) {
    // Roof/wall color overlay (on top of ground tile)
    g.fillStyle = 'rgba(60,40,20,0.7)';
    g.fillRect(obj.x * LOBBY_TS, obj.y * LOBBY_TS, obj.w * LOBBY_TS, obj.h * LOBBY_TS);
    // Building border
    g.strokeStyle = '#c8a460';
    g.lineWidth = 2;
    g.strokeRect(obj.x * LOBBY_TS + 1, obj.y * LOBBY_TS + 1, obj.w * LOBBY_TS - 2, obj.h * LOBBY_TS - 2);
    // Building label
    g.fillStyle = '#f0e0a0';
    g.font = 'bold 10px VT323, monospace';
    g.textAlign = 'center';
    g.fillText(obj.label,
      (obj.x + obj.w / 2) * LOBBY_TS,
      (obj.y + obj.h / 2) * LOBBY_TS + 4
    );
  }

  // Wall collision debug overlay (disabled in prod — set LOBBY_DEBUG=true to enable)
  // if (window.LOBBY_DEBUG) { ... }

  // Remote players — lerp toward target position (smooth movement)
  for (const [, rp] of lobbyRemotePlayers) {
    if (typeof rp.curX === 'undefined') { rp.curX = rp.targetX ?? rp.px; rp.curY = rp.targetY ?? rp.py; }
    rp.curX += ((rp.targetX ?? rp.px) - rp.curX) * 0.15;
    rp.curY += ((rp.targetY ?? rp.py) - rp.curY) * 0.15;
    const rx = rp.curX * LOBBY_TS, ry = rp.curY * LOBBY_TS;
    g.fillStyle = CLAN_TINTS[rp.clan] || CLAN_TINTS['null'];
    g.fillRect(rx + 6, ry + 4, LOBBY_TS - 12, LOBBY_TS - 8);
    g.fillStyle = '#fff';
    g.font = '8px VT323, monospace';
    g.textAlign = 'center';
    g.fillText(rp.wallet ? rp.wallet.slice(0,6)+'…' : '?', rx + LOBBY_TS / 2, ry - 2);
  }

  // Local player sprite
  const px = lobbyPx * LOBBY_TS, py = lobbyPy * LOBBY_TS;
  // Player body (colored square — sprite sheet integration in T-D4)
  g.fillStyle = '#e8c870';
  g.fillRect(px + 6, py + 4, LOBBY_TS - 12, LOBBY_TS - 8);
  // Player direction indicator (small triangle)
  g.fillStyle = '#fff';
  g.beginPath();
  if (lobbyDir === 0) { g.moveTo(px+LOBBY_TS/2,py+LOBBY_TS-4);g.lineTo(px+LOBBY_TS/2-4,py+LOBBY_TS-10);g.lineTo(px+LOBBY_TS/2+4,py+LOBBY_TS-10); }
  else if (lobbyDir === 1) { g.moveTo(px+LOBBY_TS/2,py+4);g.lineTo(px+LOBBY_TS/2-4,py+10);g.lineTo(px+LOBBY_TS/2+4,py+10); }
  else if (lobbyDir === 2) { g.moveTo(px+4,py+LOBBY_TS/2);g.lineTo(px+10,py+LOBBY_TS/2-4);g.lineTo(px+10,py+LOBBY_TS/2+4); }
  else                     { g.moveTo(px+LOBBY_TS-4,py+LOBBY_TS/2);g.lineTo(px+LOBBY_TS-10,py+LOBBY_TS/2-4);g.lineTo(px+LOBBY_TS-10,py+LOBBY_TS/2+4); }
  g.fill();

  g.restore(); // un-translate camera

  // HUD overlay (on top, not scrolled)
  // Nearby building prompt
  if (lobbyNearBuilding) {
    g.fillStyle = 'rgba(0,0,0,0.7)';
    g.fillRect(W/2-100, H-52, 200, 28);
    g.fillStyle = '#f0e0a0';
    g.font = '14px VT323, monospace';
    g.textAlign = 'center';
    g.fillText(`[Z] Enter ${lobbyNearBuilding.label}`, W/2, H-34);
  }

  // Position debug HUD (top-left)
  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.fillRect(4, 4, 130, 18);
  g.fillStyle = '#aaa';
  g.font = '10px VT323, monospace';
  g.textAlign = 'left';
  g.fillText(`LOBBY  x:${lobbyPx} y:${lobbyPy}`, 8, 17);

  // Match found celebration flash
  if (lobbyMatchFlash > 0) {
    lobbyMatchFlash--;
    const fAlpha = (lobbyMatchFlash / 60) * 0.55;
    g.fillStyle = `rgba(255,220,60,${fAlpha})`;
    g.fillRect(0, 0, W, H);
    // "MATCH FOUND!" text
    if (lobbyMatchFlash > 20) {
      g.fillStyle = '#fff';
      g.font = 'bold 32px VT323, monospace';
      g.textAlign = 'center';
      g.fillText('⚔️ MATCH FOUND!', W / 2, H / 2);
    }
  }

  // Building dialog overlay (drawn last — on top of everything)
  drawLobbyDialog();
}
