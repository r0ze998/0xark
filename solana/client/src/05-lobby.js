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

// Remote players for multiplayer (populated by T-D3-3 WS wire-up)
// Each entry: { wallet, px, py, clan, card_count, tint, targetX, targetY }
const lobbyRemotePlayers = new Map();

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
  // TODO: T-D3-3 — send player_moved to WS server
}

// ── Lobby interact (called from 10-input.js on Enter/Space) ─────────────
function lobbyInteract() {
  if (lobbyInteractCooldown > 0) return;
  if (!lobbyNearBuilding) return;
  console.log('[Lobby] Interact:', lobbyNearBuilding.name, '—', lobbyNearBuilding.interaction);
  lobbyInteractCooldown = 30;
  // TODO: T-D4 — open building UI panel for each building type
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
  // TODO: T-D3-3 — open WS connection, send join_room "lobby-global"
}

function exitLobby() {
  // TODO: T-D3-3 — send leave_room, close WS
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

  // Remote players
  for (const [, rp] of lobbyRemotePlayers) {
    // Lerp toward target position (T-D3-4 interpolation)
    if (typeof rp.curX === 'undefined') { rp.curX = rp.px; rp.curY = rp.py; }
    rp.curX += (rp.targetX - rp.curX) * 0.15;
    rp.curY += (rp.targetY - rp.curY) * 0.15;
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
}
