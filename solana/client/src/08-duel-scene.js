// ═══════════════════════════════════════════════════════════════════════════
// 08-DUEL-SCENE.JS — M2 Duel Board (Day 10)
// 4-phase state machine: Draw → Energy → Summon → Battle (×5 rounds)
// Modes: Local Hotseat (dev) | Find Match (AI stub)
// ═══════════════════════════════════════════════════════════════════════════

// ── Layout constants (UI_SPEC v2.0 §2) ──────────────────────────────────────
const DL = {
  // Left game area
  GW: 340, GH: 270,
  // Opponent HP bar
  OHP_Y: 0, OHP_H: 30,
  // Opponent lanes
  OL_Y: 30, OL_H: 80,
  // Battle line
  BL_Y: 110, BL_H: 5,
  // Player lanes
  PL_Y: 115, PL_H: 80,
  // Round indicator
  RI_Y: 195, RI_H: 30,
  // Player hand strip
  HAND_Y: 225, HAND_H: 43,
  // Right panel
  RP_X: 340, RP_W: 140,
  // Right panel sections
  TABS_Y: 0, TABS_H: 40,
  ENERGY_Y: 40, ENERGY_H: 90,
  SHARDS_Y: 130, SHARDS_H: 22,
  LOG_Y: 152, LOG_H: 50,
  LOCKIN_Y: 202, LOCKIN_H: 40,
  LEAVE_Y: 242, LEAVE_H: 28,
  // Lane geometry (3 lanes in GW=340, with margins)
  LANE_X: [4, 117, 230],
  LANE_W: 110,
  // Hand card geometry
  HCARD_W: 38, HCARD_H: 40, HCARD_GAP: 42,
  HCARD_X0: 4,
};

// ── Element system ───────────────────────────────────────────────────────────
const EL5     = ['fire', 'earth', 'wind', 'shadow', 'gold'];
const EL_ICON = { fire:'🔥', earth:'🌿', wind:'💨', shadow:'🌑', gold:'💰' };
const EL_HEX  = { fire:'#e05030', earth:'#60a040', wind:'#40b0d0', shadow:'#8050a0', gold:'#d0a820' };
const EL_STRONG = { fire:'earth', earth:'wind', wind:'shadow', shadow:'gold', gold:'fire' };
const EL_WEAK   = { fire:'gold',  earth:'fire', wind:'earth',  shadow:'wind', gold:'shadow' };

const HALL_ANTES  = ['0.01 SOL', '0.05 SOL', '0.1 SOL'];
const HALL_NAMES  = ['BRONZE', 'SILVER', 'GOLD'];
const HALL_COLORS = ['#c07830', '#a0a0b0', '#d0b020'];

const PHASE_ORDER = ['draw', 'energy', 'summon', 'battle'];
const PHASE_LABEL = { draw:'DRAW', energy:'ENERGY', summon:'SUMMON', battle:'BATTLE' };
const PHASE_AUTO_DELAY = 80; // frames before auto-advancing draw/energy/battle
const MAX_ROUNDS = 5;
const STARTING_HP = 20;
const STARTING_HAND = 5;
const EXTRA_ACTION_MAX = 2;
const SCOUT_PEEK_MAX = 3;
const COUNTER_PEEK_MAX = 2;

// ── Named ability card IDs (CARD_CATALOG v0.3 cross-ref) ─────────────────────
// Ability IDs derived from card name lookup at runtime in _getAbilityId()
const ABILITY_CARDS = {
  'Ghost Fleet Captain': 'on_summon_draw1',
  'Storm Bosun':         'on_summon_energy1',
  'Prince in Exile':     'on_summon_shards2',
  'Powder Monkey':       'on_destroy_damage2',
  'Faceless Weaver':     'on_summon_halfcost',
  "King's Last Guard":   'defender_twolane',
  'Iron Sentinel':       'defender_basic',
  'Tide Warden':         'defender_basic',
};

// ── Test decks ───────────────────────────────────────────────────────────────
// 20 Common/Uncommon cards — used as fallback + AI stub deck
const TEST_DECK_IDS = [4,5,6,7,16,17,18,19,28,29,30,31,40,41,42,43,52,53,54,55];
const AI_DECK_IDS   = [4,5,6,7,8,16,17,18,19,20,28,29,30,31,40,41,42,52,53,54];

// ── DUEL_STATS lookup: derived from CD[] at boot ─────────────────────────────
// Assigns BP, HP, Initiative, element, and summon cost to each of the 60 cards.
// CD[] must be defined (02-data.js loads before this module in build.js).
const DUEL_STATS = (function () {
  // T-D17-A: Balance pass — stat tables indexed by rarity (1-5),
  // by type index: 0=attack 1=defense 2=flee 3=magic 4=recovery
  //
  // Changes from v1.0:
  //  - Attack R1-R2: BP raised slightly (+1) to make early aggression viable
  //  - Defense R3+: HP raised (+1) so tanks survive mid-game rounds
  //  - Flee: initiative bumped by 1 across all rarities (flee should go first)
  //  - Recovery: HP raised (+1) so healers can stay alive to use their effect
  //  - Magic: BP normalised (was equal to attack, now -1 BP but keeps utility)
  //  - Legendary (R5): HP cap raised for attack/defense by +1 (high-stakes matches)
  const BP_TBL  = [[4,2,1,3,1],[6,3,2,3,2],[7,4,3,5,3],[9,5,4,6,4],[12,6,5,7,5]];
  const HP_TBL  = [[2,5,1,3,5],[3,7,2,4,6],[4,9,3,5,7],[5,11,4,6,8],[7,14,5,7,9]];
  const INI_TBL = [[3,1,5,2,2],[4,2,6,3,3],[5,3,7,4,4],[6,4,8,5,5],[7,5,9,6,6]];
  // Energy cost by rarity — R1 stays cheap, R4 dropped from 4→3 for playability
  const COST    = [1,2,2,3,3];
  const TYPES   = ['attack','defense','flee','magic','recovery'];
  const out = {};
  (typeof CD !== 'undefined' ? CD : []).forEach(function (card, idx) {
    const id      = idx + 1;
    const typeIdx = TYPES.indexOf(card.t);
    const ri      = (card.r || 1) - 1;            // 0-indexed rarity
    const elIdx   = (idx + typeIdx) % 5;           // cycle within type block
    const el      = EL5[elIdx];
    const cost    = {};
    cost[el]      = COST[ri];
    out[id] = {
      bp: BP_TBL[ri][typeIdx],
      hp: HP_TBL[ri][typeIdx],
      ini: INI_TBL[ri][typeIdx],
      element: el,
      cost,
      clan: ['hollow_blade','iron_circle','black_flag','nameless_silk','sovereign_bourse'][typeIdx],
    };
  });
  return out;
})();

// ── Build a full duel card object ────────────────────────────────────────────
function _buildDuelCard(cardId, owner) {
  const base  = (typeof CD !== 'undefined') ? CD[cardId - 1] : null;
  const stats = DUEL_STATS[cardId] || { bp:2, hp:3, ini:3, element:'fire', cost:{fire:1} };
  return {
    id:       cardId,
    name:     base ? base.n : `Card ${cardId}`,
    type:     base ? base.t : 'attack',
    rarity:   base ? base.r : 1,
    color:    base ? base.c : '#888888',
    icon:     base ? base.i : '?',
    flavor:   base ? base.fl : '',
    lore:     base ? base.lo : '',
    element:  stats.element,
    clan:     stats.clan,
    bp:       stats.bp,
    maxBp:    stats.bp,
    hp:       stats.hp,
    maxHp:    stats.hp,
    ini:      stats.ini,
    cost:     Object.assign({}, stats.cost),
    owner,
    isDefender:  base ? !!(base.f && base.f.toLowerCase().includes('def')) : false,
    defTwoLane:  false, // King's Last Guard special case
  };
}

// ── Shuffle helper (Fisher-Yates with seed) ──────────────────────────────────
function _seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Global duel state ────────────────────────────────────────────────────────
let DS = null; // null when not in a duel

function _makeSide(deckIds, who) {
  return {
    hp:         STARTING_HP,
    shards:     0,
    energy:     { fire:0, earth:0, wind:0, shadow:0, gold:0 },
    deck:       deckIds.map(id => _buildDuelCard(id, who)),
    hand:       [],
    lanes:      { front:null, middle:null, back:null },
    lockedIn:   false,
    selected:   null,   // index into hand (null = none selected)
    scoutReveal: null,  // { cardIdx, expireFrame } or null
    dmgDealt:   0,      // cumulative damage dealt (for tiebreak)
    cardsSummoned: 0,
  };
}

// ── initDuelScene ────────────────────────────────────────────────────────────
// mode: 'hotseat' | 'ai_stub'
// hallTier: 0=Bronze 1=Silver 2=Gold
function initDuelScene(mode, hallTier) {
  // Determine decks
  const playerDeckIds = _getPlayerDeckIds();
  const oppDeckIds    = mode === 'ai_stub' ? AI_DECK_IDS.slice() : _getPlayerDeckIds();

  // Shuffle with reproducible seed (timestamp low 16 bits XOR hallTier)
  const seed  = ((Date.now() & 0xffff) ^ (hallTier << 8)) >>> 0;
  const pDeck = _seededShuffle(playerDeckIds, seed);
  const oDeck = _seededShuffle(oppDeckIds, seed ^ 0xabcd);

  DS = {
    mode,
    hallTier,
    round:         1,
    phase:         'draw',
    phaseTimer:    0,        // frame counter within current phase
    activeSide:    0,        // 0=player, 1=opponent (summon phase hotseat only)
    over:          false,
    winner:        null,     // 0=player, 1=opponent
    winReason:     '',

    p:             [_makeSide(pDeck, 0), _makeSide(oDeck, 1)],

    extraActUsed:   0,
    scoutPeekUsed:  0,
    counterPeekUsed: 0,

    log:           [],       // string[] (last 4 visible)
    toast:         null,     // { text, expireFrame, color }
    dmgPopups:     [],       // { x, y, text, frame, color, ttl }
    flashEffect:   null,     // { color, expireFrame }

    // Modal state
    modal:         null,     // null | { type:'extra_action'|'scout_confirm'|'leave_confirm', choice }

    // Scout peek UI
    scoutActive:   false,
    scoutExpire:   0,
    scoutCardIdx:  -1,
    // Counter-peek UI
    counterPeekActive: false,
    counterPeekExpire: 0,
    counterPeekCardIdx: -1,

    // UI scroll for hand (if > 8 cards)
    handScroll:    0,

    // M3: Duel start intro cutscene (T-D12-E)
    _introDuration: 105,   // frames (~1.75s)
    _introFrame:    0,     // current frame within intro
    _introActive:   true,

    // ZK commitment state (per-round)
    _duelId:       null,   // on-chain duel PDA id, set when known
  };

  _addLog(`Duel started — Round 1 of ${MAX_ROUNDS} — ${HALL_NAMES[hallTier]} Hall`);
  _startDrawPhase();
}

// ── Resolve player deck ──────────────────────────────────────────────────────
function _getPlayerDeckIds() {
  // Use deck editor's deckSlots if a valid 20-card deck is saved
  if (typeof deckSlots !== 'undefined') {
    const valid = deckSlots.filter(Boolean);
    if (valid.length === 20) return valid;
  }
  return TEST_DECK_IDS.slice();
}

// ── exitDuelScene ────────────────────────────────────────────────────────────
function exitDuelScene() {
  DS = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN RENDER
// ═══════════════════════════════════════════════════════════════════════════
function drawDuelScene() {
  if (!DS) return;
  _updateAnimations();

  // Background
  g.fillStyle = '#111820';
  g.fillRect(0, 0, W, H);

  // Divider between game area and panel
  g.strokeStyle = '#2a3040';
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(DL.RP_X, 0); g.lineTo(DL.RP_X, H); g.stroke();

  // Screen shake (B1)
  if (DS.screenShake && fr < DS.screenShake.endFrame) {
    const amp = DS.screenShake.amplitude;
    g.save();
    g.translate(
      (Math.random() * 2 - 1) * amp,
      (Math.random() * 2 - 1) * amp
    );
  }

  _drawGameArea();
  _drawRightPanel();
  _drawAttackArrows();   // B2: attack arrows
  _drawParticles();      // B1: destruction particles
  _drawDmgPopups();
  if (DS.flashEffect && fr < DS.flashEffect.expireFrame) _drawFlash();
  if (DS.toast && fr < DS.toast.expireFrame) _drawToast();
  if (DS.modal) _drawModal();
  if (DS.over) _drawDuelOver();

  if (DS.screenShake && fr < DS.screenShake.endFrame) {
    g.restore();
  }

  // M3: Intro cutscene overlay (T-D12-E)
  if (DS._introActive) {
    _drawDuelIntroCutscene();
    DS._introFrame++;
    if (DS._introFrame >= DS._introDuration) DS._introActive = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// M3: DUEL INTRO CUTSCENE (T-D12-E)
// ═══════════════════════════════════════════════════════════════════════════

function _drawDuelIntroCutscene() {
  const t  = DS._introFrame;
  const dur = DS._introDuration;

  // Fade in (0–20) → hold (20–80) → fade out (80–105)
  let alpha;
  if (t < 20)       alpha = t / 20;
  else if (t < 80)  alpha = 1;
  else               alpha = 1 - (t - 80) / (dur - 80);
  alpha = Math.max(0, Math.min(1, alpha));

  const cx = W / 2, cy = H / 2;

  // Dim background
  g.save();
  g.globalAlpha = alpha * 0.82;
  g.fillStyle = '#080e18';
  g.fillRect(0, 0, W, H);
  g.globalAlpha = alpha;

  // Hexagonal ZK seal — scale in during first 25 frames
  const hexScale = t < 25 ? t / 25 : 1;
  const hexR     = 42 * hexScale;
  _drawHexSeal(cx, cy, hexR, t);

  // 6 orbiting tokens
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + t * 0.04;
    const orbitR = hexR + 14;
    const tx2 = cx + Math.cos(angle) * orbitR;
    const ty2 = cy + Math.sin(angle) * orbitR;
    const ORBIT_COLORS = ['#ff6040','#40c0ff','#80ff80','#ffd040','#c080ff','#ff80c0'];
    g.beginPath();
    g.arc(tx2, ty2, 3.5, 0, Math.PI * 2);
    g.fillStyle = ORBIT_COLORS[i];
    g.fill();
  }

  // Hall name
  const HALL_COLORS = ['#cd7f32', '#c0c0c0', '#ffd700'];
  g.fillStyle = HALL_COLORS[DS.hallTier] || '#ffffff';
  g.font = 'bold 11px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(`${HALL_NAMES[DS.hallTier].toUpperCase()} HALL`, cx, cy - hexR - 18);

  // "DUEL" title
  g.fillStyle = '#ffffff';
  g.font = 'bold 14px monospace';
  g.fillText('DUEL', cx, cy);

  // Round count
  g.fillStyle = '#8899aa';
  g.font = '8px monospace';
  g.fillText(`${MAX_ROUNDS} ROUNDS`, cx, cy + hexR + 16);

  // ZK status line — changes after commitment
  const zkLabel = DS.p[0]._handCommitment ? 'ZK COMMITTED ✓' : 'ZK SEALING…';
  const zkColor = DS.p[0]._handCommitment ? '#40e080' : '#80c0ff';
  g.fillStyle = zkColor;
  g.font = '7px monospace';
  g.fillText(zkLabel, cx, cy + hexR + 26);

  g.restore();
}

function _drawHexSeal(cx, cy, r, t) {
  const SIDES = 6;
  // Outer hex
  g.beginPath();
  for (let i = 0; i < SIDES; i++) {
    const a = (i / SIDES) * Math.PI * 2 - Math.PI / 6;
    if (i === 0) g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    else         g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  g.closePath();
  g.strokeStyle = '#40c0ff';
  g.lineWidth = 1.5;
  g.stroke();

  // Inner rotating hex
  const innerR = r * 0.6;
  const rot = t * 0.02;
  g.beginPath();
  for (let i = 0; i < SIDES; i++) {
    const a = (i / SIDES) * Math.PI * 2 - Math.PI / 6 + rot;
    if (i === 0) g.moveTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR);
    else         g.lineTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR);
  }
  g.closePath();
  g.strokeStyle = '#1a6080';
  g.lineWidth = 1;
  g.stroke();

  // Center dot
  g.beginPath();
  g.arc(cx, cy, 3, 0, Math.PI * 2);
  g.fillStyle = '#40c0ff';
  g.fill();

  // Spoke lines from center to vertices
  g.strokeStyle = '#1a4060';
  g.lineWidth = 0.5;
  for (let i = 0; i < SIDES; i++) {
    const a = (i / SIDES) * Math.PI * 2 - Math.PI / 6;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    g.stroke();
  }
}

function _drawGameArea() {
  // Opponent area (top)
  _drawHPBar(1, DL.OHP_Y);
  _drawOppHand();           // DEF-3: face-down hand strip
  _drawLanes(1, DL.OL_Y);
  // Battle line
  _drawBattleLine();
  // Player area (bottom)
  _drawLanes(0, DL.PL_Y);
  _drawRoundIndicator();
  _drawHPBar(0, DL.RI_Y + DL.RI_H);
  _drawPlayerHand();
}

function _drawHPBar(who, y) {
  const side = DS.p[who];
  const label = who === 0 ? (DS.mode === 'hotseat' && DS.activeSide === 1 ? '← P2' : 'YOU') : (DS.mode === 'ai_stub' ? 'AI' : 'OPP');
  const hpFrac = side.hp / STARTING_HP;
  const barX = 4, barW = DL.GW - 50, barH = 10;
  const barY = y + 10;

  // Label
  g.fillStyle = '#c0c8d8';
  g.font = '6px monospace';
  g.textBaseline = 'top';
  g.fillText(label, barX, y + 2);

  // HP bar bg
  g.fillStyle = '#2a3040';
  g.fillRect(barX, barY, barW, barH);

  // HP bar fill
  const col = hpFrac > 0.5 ? '#40b060' : hpFrac > 0.25 ? '#d0a820' : '#d04030';
  g.fillStyle = col;
  g.fillRect(barX, barY, Math.floor(barW * hpFrac), barH);

  // HP text
  g.fillStyle = '#ffffff';
  g.font = 'bold 7px monospace';
  g.textBaseline = 'middle';
  g.fillText(`${side.hp}/${STARTING_HP}`, DL.GW - 44, barY + barH / 2);

  // Shards on the right
  const sx = DL.GW - 16;
  for (let i = 0; i < 5; i++) {
    g.fillStyle = i < side.shards ? '#d0a820' : '#2a3040';
    g.fillRect(sx, y + 2 + i * 5, 6, 4);
  }
}

function _drawBattleLine() {
  const y = DL.BL_Y;
  g.fillStyle = '#2a3040';
  g.fillRect(0, y, DL.GW, DL.BL_H);
  g.fillStyle = '#4060a0';
  g.fillRect(0, y + 2, DL.GW, 1);
  g.fillStyle = '#607090';
  g.font = '5px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('─── BATTLE LINE ───', DL.GW / 2, y + 2);
  g.textAlign = 'left';
}

function _drawLanes(who, baseY) {
  const side   = DS.p[who];
  const lNames = ['FRONT', 'MID', 'BACK'];
  for (let li = 0; li < 3; li++) {
    const lx   = DL.LANE_X[li];
    const lKey = ['front','middle','back'][li];
    const card  = side.lanes[lKey];

    // Lane background
    const isSelected = (who === 0 && DS.phase === 'summon' &&
                        DS.p[0].selected !== null && !card);
    g.fillStyle = isSelected ? '#1a2840' : '#161e2c';
    g.fillRect(lx, baseY, DL.LANE_W, DL.OL_H);

    // Lane border
    const selCard = DS.p[0].selected !== null ? DS.p[0].hand[DS.p[0].selected] : null;
    if (isSelected && selCard) {
      const canPlace = _canPlace(0, selCard, lKey);
      g.strokeStyle = canPlace ? '#40a060' : '#a04030';
    } else {
      g.strokeStyle = '#2a3848';
    }
    g.lineWidth = 1;
    g.strokeRect(lx + 0.5, baseY + 0.5, DL.LANE_W - 1, DL.OL_H - 1);

    // Lane label
    g.fillStyle = '#3a5068';
    g.font = '5px monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(lNames[li], lx + DL.LANE_W / 2, baseY + DL.OL_H - 6);
    g.textAlign = 'left';

    // Card in lane
    if (card) {
      _drawLaneCard(card, lx + 5, baseY + 4, DL.LANE_W - 10, DL.OL_H - 14);
    }
  }
}

function _drawLaneCard(card, x, y, w, h) {
  const clanColor = (typeof CLAN_TINTS !== 'undefined') ? (CLAN_TINTS[card.clan] || '#888888') : '#888888';
  const elColor   = EL_HEX[card.element] || '#888888';

  // Card body
  g.fillStyle = '#1e2838';
  g.fillRect(x, y, w, h);

  // Clan color top bar
  g.fillStyle = clanColor;
  g.fillRect(x, y, w, 4);

  // Element strip (left)
  g.fillStyle = elColor;
  g.fillRect(x, y + 4, 4, h - 4);

  // Card name
  g.fillStyle = '#dde4f0';
  g.font = 'bold 6px monospace';
  g.textBaseline = 'top';
  const truncName = card.name.length > 9 ? card.name.slice(0, 8) + '…' : card.name;
  g.fillText(truncName, x + 7, y + 5);

  // Element icon + BP/HP line
  g.fillStyle = elColor;
  g.font = '5px monospace';
  g.fillText(EL_ICON[card.element] || '?', x + 7, y + 13);

  g.fillStyle = '#a0c8e0';
  g.font = 'bold 6px monospace';
  g.fillText(`${card.bp}/${card.hp}`, x + 7, y + 21);

  // Initiative (top right)
  g.fillStyle = '#f0c840';
  g.font = '5px monospace';
  g.textAlign = 'right';
  g.fillText(`i${card.ini}`, x + w - 2, y + 5);
  g.textAlign = 'left';

  // HP bar at bottom
  const hpFrac = card.hp / card.maxHp;
  g.fillStyle = '#2a3040';
  g.fillRect(x, y + h - 4, w, 4);
  g.fillStyle = hpFrac > 0.5 ? '#40b060' : '#d04030';
  g.fillRect(x, y + h - 4, Math.floor(w * hpFrac), 4);
}

function _drawRoundIndicator() {
  const y = DL.RI_Y;
  g.fillStyle = '#1a2030';
  g.fillRect(0, y, DL.GW, DL.RI_H);
  g.fillStyle = HALL_COLORS[DS.hallTier] || '#c07830';
  g.font = 'bold 8px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(`ROUND ${DS.round}/${MAX_ROUNDS}  ·  ${HALL_NAMES[DS.hallTier]} HALL`, DL.GW / 2, y + DL.RI_H / 2);
  g.textAlign = 'left';

  // Hotseat active player indicator
  if (DS.mode === 'hotseat' && DS.phase === 'summon') {
    g.fillStyle = '#80c0ff';
    g.font = '6px monospace';
    g.textAlign = 'center';
    g.fillText(DS.activeSide === 0 ? 'P1 — Summon' : 'P2 — Summon', DL.GW / 2, y + DL.RI_H - 4);
    g.textAlign = 'left';
  }
}

// DEF-3: Opponent hand face-down strip
// Rendered between opponent HP bar and opponent lanes (DL.OHP_H = 30, OL_Y = 30)
// Shows N face-down card backs; Scout Peek / Counter-Peek reveals specific card
function _drawOppHand() {
  const opp  = DS.p[1];
  const cnt  = opp.hand.length;
  if (cnt === 0) return;

  const stripH = 14;
  const stripY = DL.OHP_H; // y=30, sits between HP bar and lanes
  const cardW  = 12, cardH = 12, cardGap = 14;
  const startX = 4;

  // Strip background
  g.fillStyle = '#0b1018';
  g.fillRect(0, stripY, DL.GW, stripH);

  // Determine if scout/counter-peek is revealing a card
  const revealIdx = (DS.scoutActive && fr < DS.scoutExpire) ? DS.scoutCardIdx :
                    (DS.counterPeekActive && fr < DS.counterPeekExpire) ? DS.counterPeekCardIdx : -1;

  for (let i = 0; i < Math.min(cnt, 20); i++) {
    const cx = startX + i * cardGap;
    const cy = stripY + 1;

    if (i === revealIdx) {
      // Revealed card — show name/element briefly
      const rc = opp.hand[i];
      const elCol = EL_HEX[rc.element] || '#888888';
      g.fillStyle = '#1e3040';
      g.fillRect(cx, cy, cardW, cardH);
      g.fillStyle = elCol;
      g.fillRect(cx, cy, cardW, 2);
      g.fillStyle = '#d0e8ff';
      g.font = '4px monospace';
      g.textBaseline = 'top';
      const label = rc.name.length > 4 ? rc.name.slice(0, 3) + '…' : rc.name;
      g.fillText(label, cx + 1, cy + 3);
      // Pulsing glow border
      const pulse = (fr % 30 < 15) ? '#f0d040' : '#a08020';
      g.strokeStyle = pulse;
      g.lineWidth = 1;
      g.strokeRect(cx + 0.5, cy + 0.5, cardW - 1, cardH - 1);
    } else {
      // Face-down card back
      g.fillStyle = '#1a2434';
      g.fillRect(cx, cy, cardW, cardH);
      // Card back pattern — simple cross hatch
      g.strokeStyle = '#2a3c54';
      g.lineWidth = 0.5;
      g.strokeRect(cx + 1.5, cy + 1.5, cardW - 3, cardH - 3);
      g.fillStyle = '#2a3c54';
      g.fillRect(cx + 4, cy + 4, 4, 4);
      g.strokeStyle = '#1a2434';
      g.lineWidth = 0.5;
      g.strokeRect(cx + 0.5, cy + 0.5, cardW - 1, cardH - 1);
    }
  }

  // Card count label
  g.fillStyle = '#506070';
  g.font = '5px monospace';
  g.textBaseline = 'middle';
  g.textAlign = 'right';
  g.fillText(`OPP: ${cnt}`, DL.GW - 4, stripY + stripH / 2);
  g.textAlign = 'left';
}

function _drawPlayerHand() {
  const side = DS.p[0];
  const y    = DL.HAND_Y;

  // Background
  g.fillStyle = '#141c28';
  g.fillRect(0, y, DL.GW, DL.HAND_H);
  g.strokeStyle = '#2a3848';
  g.lineWidth = 1;
  g.strokeRect(0.5, y + 0.5, DL.GW - 1, DL.HAND_H - 1);

  const startIdx = DS.handScroll;
  const visCount = Math.min(side.hand.length, Math.floor((DL.GW - 8) / DL.HCARD_GAP));

  for (let i = 0; i < visCount; i++) {
    const handIdx = startIdx + i;
    if (handIdx >= side.hand.length) break;
    const card = side.hand[handIdx];
    const cx   = DL.HCARD_X0 + i * DL.HCARD_GAP;
    const cy   = y + 2;
    const sel  = side.selected === handIdx;

    _drawHandCardThumb(card, cx, cy, sel);
  }

  // Card count hint
  g.fillStyle = '#606878';
  g.font = '5px monospace';
  g.textBaseline = 'bottom';
  g.textAlign = 'right';
  g.fillText(`${side.hand.length} cards`, DL.GW - 4, y + DL.HAND_H - 2);
  g.textAlign = 'left';

  // Scroll arrows if needed
  if (side.hand.length > visCount) {
    if (startIdx > 0) {
      g.fillStyle = '#8090b0';
      g.font = '10px monospace';
      g.textBaseline = 'middle';
      g.fillText('◄', 0, y + DL.HAND_H / 2);
    }
    if (startIdx + visCount < side.hand.length) {
      g.fillStyle = '#8090b0';
      g.font = '10px monospace';
      g.textAlign = 'right';
      g.fillText('►', DL.GW - 2, y + DL.HAND_H / 2);
      g.textAlign = 'left';
    }
  }
}

function _drawHandCardThumb(card, x, y, selected) {
  const clanColor = (typeof CLAN_TINTS !== 'undefined') ? (CLAN_TINTS[card.clan] || '#888888') : '#888888';
  const elColor   = EL_HEX[card.element] || '#888888';
  const w = DL.HCARD_W, h = DL.HCARD_H;

  // Selected glow
  if (selected) {
    g.strokeStyle = '#f0d040';
    g.lineWidth = 2;
    g.strokeRect(x - 1, y - 1, w + 2, h + 2);
  }

  g.fillStyle = '#1e2838';
  g.fillRect(x, y, w, h);

  // Clan top strip
  g.fillStyle = clanColor;
  g.fillRect(x, y, w, 3);

  // Element left strip
  g.fillStyle = elColor;
  g.fillRect(x, y + 3, 3, h - 3);

  // Name
  g.fillStyle = '#c8d8e8';
  g.font = '5px monospace';
  g.textBaseline = 'top';
  const n = card.name.length > 7 ? card.name.slice(0, 6) + '…' : card.name;
  g.fillText(n, x + 5, y + 4);

  // BP/HP
  g.fillStyle = '#80b0d0';
  g.font = '5px monospace';
  g.fillText(`${card.bp}/${card.hp}`, x + 5, y + 12);

  // Element icon
  g.fillStyle = elColor;
  g.fillText(EL_ICON[card.element] || '', x + 5, y + 20);

  // Cost
  g.fillStyle = '#a09060';
  const costEntry = Object.entries(card.cost)[0] || ['?', '?'];
  g.fillText(`${costEntry[0][0].toUpperCase()}${costEntry[1]}`, x + 18, y + 20);

  // Border
  g.strokeStyle = selected ? '#f0d040' : '#2a3848';
  g.lineWidth = 1;
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

// ═══════════════════════════════════════════════════════════════════════════
// RIGHT PANEL (x=340..480)
// ═══════════════════════════════════════════════════════════════════════════
function _drawRightPanel() {
  const rx = DL.RP_X;
  g.fillStyle = '#0e1420';
  g.fillRect(rx, 0, DL.RP_W, H);

  _drawPhaseTabs(rx);
  _drawEnergyPool(rx);
  _drawShardsRow(rx);
  _drawLogPanel(rx);
  _drawLockInButton(rx);
  _drawLeaveButton(rx);
}

function _drawPhaseTabs(rx) {
  const tabW = DL.RP_W / 4;
  PHASE_ORDER.forEach(function (ph, i) {
    const tx     = rx + i * tabW;
    const active = DS.phase === ph;
    // B3: Active tab pulses with subtle brightness wave (1 sec cycle)
    const pulse = active ? 0.5 + 0.5 * Math.sin((fr / 60) * Math.PI * 2) : 0;
    const bgAlpha = active ? (0.18 + pulse * 0.07) : 0.08;

    g.fillStyle = active ? `rgba(64,128,192,${bgAlpha + 0.12})` : '#141c28';
    g.fillRect(tx, DL.TABS_Y, tabW, DL.TABS_H);

    // Active glow border
    g.strokeStyle = active ? `rgba(80,160,220,${0.6 + pulse * 0.4})` : '#1e2838';
    g.lineWidth = active ? 1.5 : 1;
    g.strokeRect(tx + 0.5, DL.TABS_Y + 0.5, tabW - 1, DL.TABS_H - 1);

    // Bottom accent line on active tab
    if (active) {
      g.fillStyle = `rgba(80,180,255,${0.6 + pulse * 0.4})`;
      g.fillRect(tx + 1, DL.TABS_Y + DL.TABS_H - 2, tabW - 2, 2);
    }

    g.fillStyle = active ? '#d0e8ff' : '#607080';
    g.font = (active ? 'bold ' : '') + '5px monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(PHASE_LABEL[ph], tx + tabW / 2, DL.TABS_Y + DL.TABS_H / 2);
  });
  g.textAlign = 'left';
}

function _drawEnergyPool(rx) {
  const ey  = DL.ENERGY_Y;
  const eH  = DL.ENERGY_H;
  const rowH = eH / 5;

  g.fillStyle = '#0c1220';
  g.fillRect(rx, ey, DL.RP_W, eH);

  // Label
  g.fillStyle = '#5a6878';
  g.font = '5px monospace';
  g.textBaseline = 'top';
  g.fillText('ENERGY POOL', rx + 4, ey + 2);

  // Per side: show active side's energy during summon, or player's otherwise
  const side = DS.p[0];

  EL5.forEach(function (el, i) {
    const ry  = ey + 8 + i * ((eH - 8) / 5);
    const cnt = side.energy[el] || 0;
    // Icon
    g.fillStyle = EL_HEX[el];
    g.font = '7px monospace';
    g.textBaseline = 'middle';
    g.fillText(EL_ICON[el], rx + 4, ry + 6);
    // Diamonds
    for (let d = 0; d < Math.min(cnt, 10); d++) {
      const dx = rx + 18 + d * 11;
      g.fillStyle = EL_HEX[el];
      g.fillRect(dx + 3, ry + 2, 7, 7);
      g.fillStyle = 'rgba(255,255,255,0.15)';
      g.fillRect(dx + 3, ry + 2, 3, 3);
    }
    // Count number
    if (cnt > 0) {
      g.fillStyle = '#b0c8e0';
      g.font = '5px monospace';
      g.textBaseline = 'middle';
      g.textAlign = 'right';
      g.fillText(`${cnt}`, rx + DL.RP_W - 4, ry + 6);
      g.textAlign = 'left';
    }
  });
}

function _drawShardsRow(rx) {
  const sy   = DL.SHARDS_Y;
  const side = DS.p[0];

  g.fillStyle = '#0c1220';
  g.fillRect(rx, sy, DL.RP_W, DL.SHARDS_H);

  g.fillStyle = '#6a7888';
  g.font = '5px monospace';
  g.textBaseline = 'middle';
  g.fillText('SHARDS', rx + 4, sy + 7);

  for (let i = 0; i < 5; i++) {
    const dx = rx + 44 + i * 18;
    const filled = i < side.shards;
    g.fillStyle = filled ? '#d0a820' : '#1e2838';
    g.strokeStyle = filled ? '#f0c840' : '#3a4858';
    g.lineWidth = 1;
    // Diamond shape
    g.beginPath();
    g.moveTo(dx + 7, sy + 3);
    g.lineTo(dx + 14, sy + 9);
    g.lineTo(dx + 7, sy + 18);
    g.lineTo(dx, sy + 9);
    g.closePath();
    g.fill(); g.stroke();
  }

  // Extra action button (right of shards)
  if (DS.phase === 'summon' && DS.extraActUsed < EXTRA_ACTION_MAX) {
    const canUse = side.shards >= 3;
    _drawSmallButton(rx + 4, sy, 36, DL.SHARDS_H, 'EXTRA', canUse ? '#d0a820' : '#506080', canUse);
  }
}

function _drawLogPanel(rx) {
  const ly  = DL.LOG_Y;
  g.fillStyle = '#0c1018';
  g.fillRect(rx, ly, DL.RP_W, DL.LOG_H);
  g.strokeStyle = '#1e2838';
  g.lineWidth = 1;
  g.strokeRect(rx + 0.5, ly + 0.5, DL.RP_W - 1, DL.LOG_H - 1);

  g.fillStyle = '#506070';
  g.font = '5px monospace';
  g.textBaseline = 'top';
  g.fillText('LOG', rx + 4, ly + 2);

  const visible = DS.log.slice(-4);
  visible.forEach(function (entry, i) {
    g.fillStyle = i === visible.length - 1 ? '#b0c8e0' : '#5a6878';
    g.font = '5px monospace';
    g.textBaseline = 'top';
    // Word-wrap at ~22 chars
    const maxW = DL.RP_W - 8;
    const words = entry.split(' ');
    let line = '', ly2 = ly + 8 + i * 10;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (test.length > 22) {
        g.fillText(line, rx + 4, ly2);
        line = word; ly2 += 7;
      } else {
        line = test;
      }
    }
    if (line) g.fillText(line.slice(0, 22), rx + 4, ly2);
  });
}

function _drawLockInButton(rx) {
  const by      = DL.LOCKIN_Y;
  const bh      = DL.LOCKIN_H;
  const enabled = DS.phase === 'summon' && !DS.over;
  const isBattle = DS.phase === 'battle';
  // B4: pulse brightness cycle
  const pulseFr = fr % 60;
  const pulse   = enabled && pulseFr < 30;
  const justPressed = DS._lockInFlash && fr < DS._lockInFlash;

  let bgCol, borderCol, txCol, label;
  if (justPressed) {
    bgCol = '#ffffffcc'; borderCol = '#ffffff'; txCol = '#000000'; label = '✓';
  } else if (isBattle) {
    bgCol = '#0e1418'; borderCol = '#2a3040'; txCol = '#3a5058'; label = 'BATTLE...';
  } else if (enabled) {
    bgCol = pulse ? '#1e5030' : '#183828';
    borderCol = pulse ? '#40c060' : '#2a6040';
    txCol = '#60e080';
    label = 'LOCK IN';
  } else {
    bgCol = '#141820'; borderCol = '#2a3040'; txCol = '#3a4858'; label = 'LOCK IN';
  }

  g.fillStyle = bgCol;
  g.fillRect(rx + 4, by + 4, DL.RP_W - 8, bh - 8);
  g.strokeStyle = borderCol;
  g.lineWidth = enabled && !justPressed ? 1.5 : 1;
  g.strokeRect(rx + 4 + 0.5, by + 4 + 0.5, DL.RP_W - 9, bh - 9);

  g.fillStyle = txCol;
  g.font = 'bold 8px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label, rx + DL.RP_W / 2, by + bh / 2);
  g.textAlign = 'left';

  // Scout peek + Counter-peek buttons (above lock in, only in summon phase)
  if (DS.phase === 'summon') {
    const peekW = (DL.RP_W - 12) / 2;
    const peekY = by - 20;
    if (DS.scoutPeekUsed < SCOUT_PEEK_MAX) {
      _drawSmallButton(rx + 4, peekY, peekW, 18, `SCOUT(${SCOUT_PEEK_MAX - DS.scoutPeekUsed})`, '#5080a0', true);
    }
    if (DS.counterPeekUsed < COUNTER_PEEK_MAX) {
      _drawSmallButton(rx + 4 + peekW + 4, peekY, peekW, 18, `CNTR(${COUNTER_PEEK_MAX - DS.counterPeekUsed})`, '#a050c0', true);
    }
  }
}

function _drawLeaveButton(rx) {
  const by = DL.LEAVE_Y;
  const canLeave = DS.phase === 'summon' && !DS.over;
  const bgCol = canLeave ? '#300810' : '#0e1010';
  const txCol = canLeave ? '#e06060' : '#2a3040';

  g.fillStyle = bgCol;
  g.fillRect(rx + 4, by + 2, DL.RP_W - 8, DL.LEAVE_H - 4);
  g.strokeStyle = canLeave ? '#602020' : '#1a2020';
  g.lineWidth = 1;
  g.strokeRect(rx + 4 + 0.5, by + 2 + 0.5, DL.RP_W - 9, DL.LEAVE_H - 5);

  g.fillStyle = txCol;
  g.font = '6px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('LEAVE DUEL', rx + DL.RP_W / 2, by + DL.LEAVE_H / 2);
  g.textAlign = 'left';
}

function _drawSmallButton(x, y, w, h, label, color, enabled) {
  g.fillStyle = enabled ? '#1a2030' : '#0e1418';
  g.fillRect(x, y, w, h);
  g.strokeStyle = enabled ? color : '#1e2838';
  g.lineWidth = 1;
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  g.fillStyle = enabled ? color : '#3a4858';
  g.font = '5px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label, x + w / 2, y + h / 2);
  g.textAlign = 'left';
}

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATIONS & FX
// ═══════════════════════════════════════════════════════════════════════════

function _addDmgPopup(x, y, text, color) {
  DS.dmgPopups.push({ x, y, text, color: color || '#ff4040', startFrame: fr, expire: fr + 60 });
}

function _drawDmgPopups() {
  DS.dmgPopups.forEach(function (p) {
    const age = fr - p.startFrame;
    const alpha = Math.max(0, 1 - age / 60);
    const dy = -age * 0.5;
    g.globalAlpha = alpha;
    g.fillStyle = p.color;
    g.font = 'bold 9px monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(p.text, p.x, p.y + dy);
    g.textAlign = 'left';
    g.globalAlpha = 1;
  });
}

function _drawFlash() {
  const ef = DS.flashEffect;
  const age = fr - (ef.expireFrame - 25);
  const alpha = Math.max(0, 0.4 - age * 0.016);
  g.globalAlpha = alpha;
  g.fillStyle = ef.color;
  g.fillRect(0, 0, W, H);
  g.globalAlpha = 1;
}

function _addLog(msg) {
  DS.log.push(msg);
  if (DS.log.length > 20) DS.log.shift();
}

function _showToast(text, color, durationFrames) {
  DS.toast = { text, color: color || '#f0c840', expireFrame: fr + (durationFrames || 120) };
}

function _drawToast() {
  const t = DS.toast;
  if (!t) return;
  const alpha = Math.min(1, (t.expireFrame - fr) / 20);
  g.globalAlpha = alpha;
  g.fillStyle = 'rgba(0,0,0,0.75)';
  g.fillRect(10, H / 2 - 12, DL.GW - 20, 24);
  g.strokeStyle = t.color;
  g.lineWidth = 1;
  g.strokeRect(10.5, H / 2 - 11.5, DL.GW - 21, 23);
  g.fillStyle = t.color;
  g.font = 'bold 7px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(t.text, DL.GW / 2, H / 2);
  g.textAlign = 'left';
  g.globalAlpha = 1;
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE LOGIC
// ═══════════════════════════════════════════════════════════════════════════
function _startDrawPhase() {
  DS.phase      = 'draw';
  DS.phaseTimer = fr;
  const R       = DS.round;

  // Draw cards for each side
  [0, 1].forEach(function (who) {
    const side  = DS.p[who];
    const count = (R === 1) ? STARTING_HAND : 1;
    for (let i = 0; i < count; i++) {
      if (side.deck.length > 0) {
        const card = side.deck.shift();
        side.hand.push(card);
        if (who === 0) _addLog(`R${R}: Drew ${card.name}`);
      } else {
        // Fatigue
        side.hp -= 2;
        if (who === 0) _addLog(`R${R}: Deck empty — 2 fatigue damage`);
        else            _addLog(`R${R}: Opponent: deck empty — 2 fatigue`);
        _addDmgPopup(who === 0 ? 80 : 80, who === 0 ? 210 : 60, '-2 FATIGUE', '#ff6040');
        if (_checkWinConditions()) return;
      }
    }
  });

  // Auto-advance to energy after delay
  _schedulePhaseAdvance('energy', PHASE_AUTO_DELAY);
}

function _schedulePhaseAdvance(nextPhase, delay) {
  // Use a simple flag: when phaseTimer + delay <= fr, advance
  DS._nextPhase  = nextPhase;
  DS._advanceAt  = fr + delay;
}

function _startEnergyPhase() {
  DS.phase      = 'energy';
  DS.phaseTimer = fr;
  const R = DS.round;
  // T-D17-A: Energy floor = 2 so round 1 always gives 2 (not 1) per element.
  // Curve: R1→2, R2→2, R3→3, R4→4, R5→5.  Prevents round 1 summon lockout.
  const EnergyGain = Math.max(2, R);

  [0, 1].forEach(function (who) {
    const side = DS.p[who];
    EL5.forEach(function (el) {
      side.energy[el] = (side.energy[el] || 0) + EnergyGain;
    });
  });

  _addLog(`R${R}: Energy +${EnergyGain} each element`);
  _schedulePhaseAdvance('summon', PHASE_AUTO_DELAY);
}

function _startSummonPhase() {
  DS.phase      = 'summon';
  DS.phaseTimer = fr;
  DS._nextPhase = null;
  DS._advanceAt = null;
  DS.activeSide = 0;
  DS.p[0].lockedIn = false;
  DS.p[1].lockedIn = false;

  // In AI stub mode, immediately schedule AI turn after player locks in
  _addLog(`R${DS.round}: Summon phase — place cards then Lock In`);
}

function _lockIn() {
  if (DS.phase !== 'summon' || DS.over) return;

  // B4: flash pressed state for 6 frames
  DS._lockInFlash = fr + 6;

  const side = DS.p[DS.activeSide];
  side.lockedIn = true;
  side.selected = null;
  _addLog(`R${DS.round}: ${DS.activeSide === 0 ? 'You' : 'P2'} locked in`);

  if (DS.mode === 'hotseat') {
    if (DS.activeSide === 0) {
      // Switch to P2
      DS.activeSide = 1;
      _showToast('P2 — Summon your cards', '#80c0ff', 90);
    } else {
      // Both done, go to battle
      _startBattlePhase();
    }
  } else {
    // ai_stub / online: player 0 locks in → generate ZK hand commitment (T-D12-C3)
    if (DS.activeSide === 0 && typeof snarkjs !== 'undefined') {
      _commitHandZK();
    }
    // ai_stub: AI takes turn immediately
    _aiSummonTurn();
    _startBattlePhase();
  }
}

// T-D12-C3: async ZK hand commitment — fire-and-forget, non-blocking
async function _commitHandZK() {
  try {
    _showToast('(COMMITTING…)', '#80d0ff', 120);

    // Resolve player pubkey
    let pubkeyArg;
    if (typeof walletPublicKey !== 'undefined' && walletPublicKey && typeof solanaWeb3 !== 'undefined') {
      try { pubkeyArg = new solanaWeb3.PublicKey(walletPublicKey); } catch (_) {}
    }
    if (!pubkeyArg) {
      // Demo mode — use zero pubkey
      pubkeyArg = { toBytes: () => new Uint8Array(32) };
    }

    const { proofBytes, salt, commitmentBytes } = await generateHandCommitmentProof(
      DS.p[0].hand,
      DS.round,
      pubkeyArg
    );

    // Store salt for later reveal
    DS.p[0]._handSalt = salt;
    DS.p[0]._handCommitment = commitmentBytes;
    DS.p[0]._handProof = proofBytes;

    _showToast('COMMITTED ✓', '#40e080', 90);
    _addLog(`R${DS.round}: Hand committed (ZK)`);

    // Emit on-chain commit_hand instruction if wallet connected
    if (typeof walletConnected !== 'undefined' && walletConnected && DS._duelId) {
      _emitCommitHandTx(DS._duelId, proofBytes, commitmentBytes).catch(function (e) {
        console.warn('[ZK] commit_hand TX failed:', e.message);
      });
    }
  } catch (err) {
    console.warn('[ZK] Hand commitment failed:', err.message);
    _showToast('ZK commit failed (demo)', '#ff8040', 90);
  }
}

// Build and send commit_hand on-chain instruction
async function _emitCommitHandTx(duelId, proofBytes, commitmentBytes) {
  if (!solanaWeb3 || !window.solana) return;

  const playerKey = new solanaWeb3.PublicKey(walletPublicKey);
  const duelIdBuf = new ArrayBuffer(8);
  new DataView(duelIdBuf).setBigUint64(0, BigInt(duelId), true);
  const duelIdBytes = new Uint8Array(duelIdBuf);

  const [duelPda] = solanaWeb3.PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('duel'), duelIdBytes],
    PROGRAM_PUBKEY
  );

  // Discriminator for commit_hand (sha256("global:commit_hand")[0..8])
  const disc = [12, 181, 32, 198, 47, 22, 71, 109];

  // Pack args: proof_a[64] + proof_b[128] + proof_c[64] + public_signals[4*32] = 384 bytes total
  const args = new Uint8Array(64 + 128 + 64 + 128);
  args.set(proofBytes.a, 0);
  args.set(proofBytes.b, 64);
  args.set(proofBytes.c, 192);
  // Pack 4 public signals as [u8; 32] each
  for (let i = 0; i < 4; i++) {
    const fieldBytes = fieldToBytes(BigInt(proofBytes.publicSignals[i] || '0'));
    args.set(fieldBytes, 256 + i * 32);
  }

  const data = anchorInstructionData(disc, args);

  const ix = new solanaWeb3.TransactionInstruction({
    programId: PROGRAM_PUBKEY,
    keys: [
      { pubkey: duelPda,  isSigner: false, isWritable: true },
      { pubkey: playerKey, isSigner: true,  isWritable: false },
    ],
    data: data,
  });

  const tx = new solanaWeb3.Transaction().add(ix);
  const { blockhash } = await solConnection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = playerKey;

  const signed = await window.solana.signTransaction(tx);
  const sig = await solConnection.sendRawTransaction(signed.serialize());
  _addLog(`[TX] commit_hand: ${sig.slice(0, 8)}…`);
}

function _aiSummonTurn() {
  const side = DS.p[1];
  const opp  = DS.p[0];
  const laneKeys = ['front', 'middle', 'back'];

  // Simple AI: play cards in order of increasing initiative to fill lanes
  const playable = side.hand.filter(c => _canPlace(1, c, null));
  playable.sort((a, b) => a.ini - b.ini);

  for (const card of playable) {
    // Find first open lane
    for (const lk of laneKeys) {
      if (!side.lanes[lk] && _canPlaceLane(1, card, lk)) {
        _placeCard(1, side.hand.indexOf(card), lk);
        break;
      }
    }
    // Stop if all lanes full
    if (laneKeys.every(lk => side.lanes[lk])) break;
  }
  side.lockedIn = true;
}

function _startBattlePhase() {
  DS.phase      = 'battle';
  DS.phaseTimer = fr;
  DS._nextPhase = null;
  _addLog(`R${DS.round}: Battle!`);

  // Resolve combat
  _resolveBattlePhase();

  if (!DS.over) {
    _schedulePhaseAdvance('_next_round', PHASE_AUTO_DELAY);
  }
}

// Update tick — called each frame from drawDuelScene
function _updateAnimations() {
  DS.dmgPopups = DS.dmgPopups.filter(p => fr < p.expire);
  // Scout/counter peek expiry
  if (DS.scoutActive && fr >= DS.scoutExpire) {
    DS.scoutActive = false; DS.scoutCardIdx = -1;
  }
  if (DS.counterPeekActive && fr >= DS.counterPeekExpire) {
    DS.counterPeekActive = false; DS.counterPeekCardIdx = -1;
  }
  // Particle update
  if (DS.particles) {
    DS.particles = DS.particles.filter(function (p) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.08; // gravity
      p.life--;
      return p.life > 0;
    });
  }
  // Attack arrow update
  if (DS.attackArrows) {
    DS.attackArrows = DS.attackArrows.filter(p => fr < p.expire);
  }
  // Auto-phase advance
  if (DS._advanceAt && fr >= DS._advanceAt) {
    const next = DS._nextPhase;
    DS._advanceAt = null;
    DS._nextPhase = null;
    if (next === 'energy')           _startEnergyPhase();
    else if (next === 'summon')      _startSummonPhase();
    else if (next === '_next_round') _nextRound();
  }
}

// ── Particle burst on card destruction (B1) ──────────────────────────────────
function _spawnDestroyParticles(x, y, elColor) {
  if (!DS.particles) DS.particles = [];
  const count = 10;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const speed = 1 + Math.random() * 2;
    DS.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      color: elColor,
      life: 25 + Math.floor(Math.random() * 15),
    });
  }
  // Brief screen shake (2px amplitude, 12 frames)
  DS.screenShake = { endFrame: fr + 12, amplitude: 2 };
}

function _drawParticles() {
  if (!DS.particles || DS.particles.length === 0) return;
  DS.particles.forEach(function (p) {
    const alpha = p.life / 30;
    g.globalAlpha = Math.min(1, alpha);
    g.fillStyle = p.color;
    g.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 2, 4, 4);
  });
  g.globalAlpha = 1;
}

// ── Attack arrow visualization (B2) ─────────────────────────────────────────
function _spawnAttackArrow(fromX, fromY, toX, toY, elColor) {
  if (!DS.attackArrows) DS.attackArrows = [];
  DS.attackArrows.push({
    fromX, fromY, toX, toY, color: elColor,
    startFrame: fr, expire: fr + 30,
  });
}

function _drawAttackArrows() {
  if (!DS.attackArrows || DS.attackArrows.length === 0) return;
  DS.attackArrows.forEach(function (a) {
    const age = fr - a.startFrame;
    const progress = Math.min(1, age / 20); // grow over 20 frames
    const alpha = age > 20 ? Math.max(0, 1 - (age - 20) / 10) : 1;
    const cx = a.fromX + (a.toX - a.fromX) * progress;
    const cy = a.fromY + (a.toY - a.fromY) * progress;

    g.globalAlpha = alpha;
    g.strokeStyle = a.color;
    g.lineWidth = 2;
    g.setLineDash([4, 2]);
    g.beginPath();
    g.moveTo(a.fromX, a.fromY);
    g.lineTo(cx, cy);
    g.stroke();
    g.setLineDash([]);

    // Arrowhead at current progress point
    if (progress > 0.2) {
      const angle = Math.atan2(a.toY - a.fromY, a.toX - a.fromX);
      g.fillStyle = a.color;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx - 6 * Math.cos(angle - 0.4), cy - 6 * Math.sin(angle - 0.4));
      g.lineTo(cx - 6 * Math.cos(angle + 0.4), cy - 6 * Math.sin(angle + 0.4));
      g.closePath();
      g.fill();
    }
    g.globalAlpha = 1;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// CARD PLACEMENT
// ═══════════════════════════════════════════════════════════════════════════
function _canPlace(who, card, laneKey) {
  if (!card) return false;
  const side = DS.p[who];
  // Any open lane with enough energy
  const laneKeys = laneKey ? [laneKey] : ['front', 'middle', 'back'];
  return laneKeys.some(lk => _canPlaceLane(who, card, lk));
}

function _canPlaceLane(who, card, lk) {
  const side = DS.p[who];
  if (side.lanes[lk]) return false; // occupied
  // Energy check
  for (const [el, amt] of Object.entries(card.cost)) {
    if ((side.energy[el] || 0) < amt) return false;
  }
  return true;
}

function _placeCard(who, handIdx, lk) {
  const side = DS.p[who];
  const card = side.hand[handIdx];
  if (!card) return false;
  if (!_canPlaceLane(who, card, lk)) return false;

  // Deduct energy
  for (const [el, amt] of Object.entries(card.cost)) {
    side.energy[el] = (side.energy[el] || 0) - amt;
  }
  // Move to lane
  card._lane = lk;
  side.lanes[lk] = card;
  side.hand.splice(handIdx, 1);
  side.selected = null;
  side.cardsSummoned++;

  if (who === 0) _addLog(`R${DS.round}: Summoned ${card.name} → ${lk}`);

  // DEF-2: trigger on-summon abilities
  _triggerAbility(card, 'on_summon', who);
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// ABILITY FRAMEWORK (DEF-2) — Day 11
// Triggers named card abilities on summon or on destroy.
// ═══════════════════════════════════════════════════════════════════════════
function _getAbilityId(card) {
  return ABILITY_CARDS[card.name] || null;
}

function _triggerAbility(card, trigger, who) {
  const abilityId = _getAbilityId(card);
  if (!abilityId) return;
  if (!abilityId.startsWith(trigger)) return;

  const side = DS.p[who];
  const opp  = DS.p[1 - who];

  switch (abilityId) {
    case 'on_summon_draw1':
      // Ghost Fleet Captain: draw 1 additional card on summon
      if (side.deck.length > 0) {
        side.hand.push(side.deck.pop());
        _addLog(`R${DS.round}: ${card.name} — Draw 1 (ability)`);
        _showToast(`${card.name}: Draw 1!`, '#60e0ff', 120);
      }
      break;

    case 'on_summon_energy1':
      // Storm Bosun: gain +1 of each energy on summon
      EL5.forEach(el => { side.energy[el] = (side.energy[el] || 0) + 1; });
      _addLog(`R${DS.round}: ${card.name} — +1 all energy (ability)`);
      _showToast(`${card.name}: +1 All Energy!`, '#40d0a0', 120);
      break;

    case 'on_summon_shards2':
      // Prince in Exile: gain +2 Shards on summon
      side.shards = Math.min(5, (side.shards || 0) + 2);
      _addLog(`R${DS.round}: ${card.name} — +2 Shards (ability)`);
      _showToast(`${card.name}: +2 Shards!`, '#d0a820', 120);
      break;

    case 'on_summon_halfcost':
      // Faceless Weaver: next card placed this summon phase costs half energy
      DS._halfCostNext = true;
      _addLog(`R${DS.round}: ${card.name} — Half-Cost next summon (ability)`);
      _showToast(`${card.name}: Half-Cost activated!`, '#e080ff', 120);
      break;

    case 'defender_twolane':
      // King's Last Guard: intercepts attacks from two adjacent lanes
      card.defTwoLane = true;
      _addLog(`R${DS.round}: ${card.name} — Two-Lane Defender (ability)`);
      _showToast(`${card.name}: Two-Lane Defense!`, '#60a0e0', 120);
      break;

    case 'defender_basic':
      // Iron Sentinel / Tide Warden: standard defender (isDefender already true from card data)
      _addLog(`R${DS.round}: ${card.name} — Defender ready`);
      break;

    default:
      break;
  }
}

function _triggerDestroyAbility(card, who) {
  const abilityId = _getAbilityId(card);
  if (!abilityId || !abilityId.startsWith('on_destroy')) return;

  const opp = DS.p[1 - who];

  switch (abilityId) {
    case 'on_destroy_damage2':
      // Powder Monkey: deal 2 damage to opponent Heart HP on destroy
      opp.hp = Math.max(0, opp.hp - 2);
      _addLog(`R${DS.round}: ${card.name} — Explosion! 2 dmg to opponent (on-destroy)`);
      _showToast(`${card.name}: BOOM! 2 damage!`, '#ff6040', 120);
      DS.flashEffect = { color: '#ff2000', expireFrame: fr + 30 };
      _checkWinConditions();
      break;
    default:
      break;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BATTLE RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════
function _resolveBattlePhase() {
  const laneKeys = ['front', 'middle', 'back'];

  laneKeys.forEach(function (lk) {
    const pCard = DS.p[0].lanes[lk];
    const oCard = DS.p[1].lanes[lk];

    if (pCard && oCard) {
      _resolveLane(pCard, oCard, lk);
    } else if (pCard && !oCard) {
      // Check for defender interception
      const defender = _findDefender(1, lk);
      if (defender) {
        _resolveVsDefender(pCard, defender, 0, lk);
      } else {
        _dealHeartDamage(1, pCard, lk);
      }
    } else if (!pCard && oCard) {
      const defender = _findDefender(0, lk);
      if (defender) {
        _resolveVsDefender(oCard, defender, 1, lk);
      } else {
        _dealHeartDamage(0, oCard, lk);
      }
    }
    // Neither: nothing happens
  });
}

function _resolveLane(pCard, oCard, lk) {
  // Determine attack order by initiative
  const pFirst = pCard.ini >= oCard.ini;
  const first  = pFirst ? pCard : oCard;
  const second = pFirst ? oCard : pCard;
  const firstOwner  = pFirst ? 0 : 1;
  const secondOwner = pFirst ? 1 : 0;

  // B2: Spawn attack arrow from first to second
  const lx = _laneCenterX(lk);
  const fy = firstOwner === 0 ? DL.PL_Y + 40 : DL.OL_Y + 40;
  const ty = firstOwner === 0 ? DL.OL_Y + 40 : DL.PL_Y + 40;
  _spawnAttackArrow(lx, fy, lx, ty, EL_HEX[first.element] || '#ffffff');

  const firstBP = applyElementAffinity(first.element, second.element, first.bp);
  _logAffinityFx(first, second, firstBP);
  second.hp -= firstBP;

  if (second.hp <= 0) {
    _destroyCard(secondOwner, lk, first, firstOwner);
  } else {
    // Second retaliates
    const secondBP = applyElementAffinity(second.element, first.element, second.bp);
    _logAffinityFx(second, first, secondBP);
    first.hp -= secondBP;
    if (first.hp <= 0) {
      _destroyCard(firstOwner, lk, second, secondOwner);
    } else {
      _addLog(`R${DS.round}: ${lk} — ${first.name} (${first.hp}hp) vs ${second.name} (${second.hp}hp)`);
    }
  }
}

function _logAffinityFx(atk, def, bp) {
  const base = atk.bp;
  if (bp > base) {
    const lx = _laneCenterX(atk._lane);
    const ly = atk.owner === 0 ? DL.PL_Y + 30 : DL.OL_Y + 30;
    _addDmgPopup(lx, ly, `+2 EL!`, '#80ff80');
  } else if (bp < base) {
    const lx = _laneCenterX(atk._lane);
    const ly = atk.owner === 0 ? DL.PL_Y + 30 : DL.OL_Y + 30;
    _addDmgPopup(lx, ly, `-1 EL`, '#ff8080');
  }
}

function _laneCenterX(lk) {
  const i = ['front','middle','back'].indexOf(lk);
  return DL.LANE_X[i < 0 ? 0 : i] + DL.LANE_W / 2;
}

function applyElementAffinity(atkEl, defEl, baseBP) {
  if (!atkEl || !defEl) return baseBP;
  if (EL_STRONG[atkEl] === defEl) return baseBP + 2;
  if (EL_WEAK[atkEl]   === defEl) return baseBP - 1;
  return baseBP;
}

function _findDefender(who, targetLane) {
  // Look for a Defender card on `who`'s side that can intercept an attack on `targetLane`
  const side = DS.p[who];
  const laneKeys = ['front', 'middle', 'back'];
  const tIdx = laneKeys.indexOf(targetLane);

  for (const lk of laneKeys) {
    const card = side.lanes[lk];
    if (!card || !card.isDefender) continue;
    const cIdx = laneKeys.indexOf(lk);
    // Standard: adjacent lanes only
    const adjacent = Math.abs(cIdx - tIdx) === 1;
    // Two-lane: middle defender covers 2 away too
    const twoLane = card.defTwoLane && Math.abs(cIdx - tIdx) <= 2;
    // Can't defend own lane
    if (cIdx === tIdx) continue;
    if (adjacent || twoLane) return card;
  }
  return null;
}

function _resolveVsDefender(attacker, defender, defenderOwner, targetLane) {
  const atkBP = applyElementAffinity(attacker.element, defender.element, attacker.bp);
  defender.hp -= atkBP;
  _addLog(`R${DS.round}: ${defender.name} intercepted attack on ${targetLane} — took ${atkBP}`);

  const popX = _laneCenterX(defender._lane);
  const popY = defenderOwner === 0 ? DL.PL_Y + 20 : DL.OL_Y + 20;
  _addDmgPopup(popX, popY, `-${atkBP}`, '#ff6040');

  if (defender.hp <= 0) {
    _destroyCard(defenderOwner, defender._lane, attacker, 1 - defenderOwner);
  } else {
    // Counter-attack (half BP)
    const counterBP = Math.floor(defender.bp / 2);
    attacker.hp -= counterBP;
    if (attacker.hp <= 0) {
      _destroyCard(1 - defenderOwner, attacker._lane, defender, defenderOwner);
    }
  }
}

function _dealHeartDamage(who, attCard, lk) {
  const side = DS.p[who];
  const dmg  = attCard.bp;
  side.hp -= dmg;
  const ownerStr = who === 0 ? 'Your HP' : 'Opp HP';
  _addLog(`R${DS.round}: ${attCard.name} dealt ${dmg} to ${ownerStr} (${lk})`);
  const py = who === 0 ? DL.OHP_Y + 15 : H - 50;
  _addDmgPopup(_laneCenterX(lk), who === 0 ? 45 : 215, `-${dmg} HP`, '#ff4040');

  DS.p[who].dmgDealt = (DS.p[who].dmgDealt || 0); // note: dmgDealt tracks what this side took
  DS.p[1 - who].dmgDealt = (DS.p[1 - who].dmgDealt || 0) + dmg;

  _checkWinConditions();
}

function _destroyCard(who, lk, destroyer, destroyerOwner) {
  const side    = DS.p[who];
  const destroyed = side.lanes[lk];
  if (!destroyed) return;

  side.lanes[lk] = null;
  _addLog(`R${DS.round}: ${destroyer.name} destroyed ${destroyed.name}!`);

  const popX = _laneCenterX(lk);
  const popY = who === 0 ? DL.PL_Y + 30 : DL.OL_Y + 30;
  _addDmgPopup(popX, popY, 'DESTROYED', '#ff8020');

  // Destroyer gains +1 Shard
  const dstSide = DS.p[destroyerOwner];
  dstSide.shards = Math.min(5, (dstSide.shards || 0) + 1);
  _addDmgPopup(popX, DL.SHARDS_Y + 10, '+1 SHARD', '#d0a820');

  // B1: Destruction particle burst + screen shake
  _spawnDestroyParticles(popX, popY, EL_HEX[destroyed.element] || '#ff8020');

  // Flash effect
  DS.flashEffect = { color: '#ff6020', expireFrame: fr + 25 };

  // DEF-2: trigger on-destroy abilities
  _triggerDestroyAbility(destroyed, who);

  _checkWinConditions();
}

// ═══════════════════════════════════════════════════════════════════════════
// WIN CONDITIONS
// ═══════════════════════════════════════════════════════════════════════════
function _checkWinConditions() {
  const p0Dead = DS.p[0].hp <= 0;
  const p1Dead = DS.p[1].hp <= 0;

  if (p0Dead && p1Dead) {
    _endDuel(_applyTieBreaker('both_dead'), 'Both HP hit 0 — tiebreak');
    return true;
  }
  if (p0Dead) { _endDuel(1, 'Opponent HP reached 0'); return true; }
  if (p1Dead) { _endDuel(0, 'Your HP reached 0'); return true; }
  return false;
}

function _checkRound5End() {
  if (DS.p[0].hp !== DS.p[1].hp) {
    const winner = DS.p[0].hp > DS.p[1].hp ? 0 : 1;
    _endDuel(winner, 'Round 5 — higher HP wins');
    return true;
  }
  // Tiebreak 1: total BP on board
  const bp0 = _totalBPOnBoard(0), bp1 = _totalBPOnBoard(1);
  if (bp0 !== bp1) {
    _endDuel(bp0 > bp1 ? 0 : 1, 'Tie: BP on board');
    return true;
  }
  // Tiebreak 2: cumulative damage dealt
  const d0 = DS.p[0].dmgDealt || 0, d1 = DS.p[1].dmgDealt || 0;
  if (d0 !== d1) {
    _endDuel(d0 > d1 ? 0 : 1, 'Tie: cumulative damage');
    return true;
  }
  // Tiebreak 3: hotseat/AI → player 1 wins; tie4: duelId fallback
  _endDuel(0, 'Tie: player 1 default win');
  return true;
}

function _totalBPOnBoard(who) {
  const lanes = DS.p[who].lanes;
  return ['front','middle','back'].reduce((sum, lk) => sum + (lanes[lk] ? lanes[lk].bp : 0), 0);
}

function _applyTieBreaker(reason) {
  return 0; // Player 1 wins on all-dead tie
}

function _endDuel(winner, reason) {
  DS.over     = true;
  DS.winner   = winner;
  DS.winReason = reason;
  DS.flashEffect = { color: winner === 0 ? '#40b060' : '#b03020', expireFrame: fr + 60 };
  _addLog(`DUEL OVER: ${winner === 0 ? 'YOU WIN' : 'OPPONENT WINS'} — ${reason}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUND PROGRESSION
// ═══════════════════════════════════════════════════════════════════════════
function _nextRound() {
  if (DS.over) return;

  // Clear per-round state
  DS.p[0].lockedIn = false;
  DS.p[1].lockedIn = false;

  if (DS.round >= MAX_ROUNDS) {
    _checkRound5End();
    return;
  }

  DS.round++;
  _addLog(`--- Round ${DS.round} ---`);
  _startDrawPhase();
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTRA ACTION
// ═══════════════════════════════════════════════════════════════════════════
function _openExtraActionModal() {
  if (DS.phase !== 'summon' || DS.extraActUsed >= EXTRA_ACTION_MAX) return;
  const side = DS.p[0];
  const hasShards = side.shards >= 3;
  DS.modal = {
    type: 'extra_action',
    canUseShards: hasShards,
    choices: [
      { id: 'draw',    label: 'Draw 1 card',          desc: 'Draw 1 from your deck' },
      { id: 'half',    label: 'Half-cost Summon',      desc: 'Next summon costs half' },
      { id: 'retarget',label: 'Retarget Lane',         desc: 'Move a card to new lane' },
      { id: 'cancel',  label: 'Cancel Event',          desc: 'Undo opponent Event card' },
    ],
    selected: 0,
    payMethod: hasShards ? 'shards' : 'x402',
  };
}

function _applyExtraAction(choiceId) {
  const side = DS.p[0];
  const payMethod = DS.modal ? DS.modal.payMethod : 'shards';

  // Deduct cost — then close modal and apply
  if (payMethod === 'shards') {
    side.shards -= 3;
    DS.modal = null;
    _doApplyExtraAction(choiceId);
  } else {
    // x402 path — close modal immediately, verify payment async, then apply
    DS.modal = null;
    _showToast('Verifying payment...', '#8090a8', 240);
    _x402Mock('/x402/extra-action', { action: choiceId }).then(function (result) {
      if (!result.ok) return; // toast shown by _x402Mock
      _doApplyExtraAction(choiceId); // increments DS.extraActUsed internally
    });
  }
}

function _doApplyExtraAction(choiceId) {
  const side = DS.p[0];
  DS.extraActUsed++;

  // Flash
  DS.flashEffect = { color: '#d0a820', expireFrame: fr + 25 };
  _addLog(`R${DS.round}: Extra Action — ${choiceId}`);

  switch (choiceId) {
    case 'draw':
      if (side.deck.length > 0) {
        side.hand.push(side.deck.shift());
        _addLog(`Drew extra card`);
      } else {
        _showToast('Deck empty!', '#ff6040', 90);
      }
      break;
    case 'half':
      // Flag next card placement as half-cost
      DS._halfCostNext = true;
      _showToast('Next summon: half cost', '#d0a820', 90);
      break;
    case 'retarget':
      _showToast('Tap a card in a lane to move it', '#80c0ff', 150);
      DS._retargetMode = true;
      break;
    case 'cancel':
      _showToast('Opponent Event cancelled', '#e080ff', 90);
      break;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SCOUT PEEK
// ═══════════════════════════════════════════════════════════════════════════
async function _triggerScoutPeek() {
  if (DS.scoutPeekUsed >= SCOUT_PEEK_MAX) return;
  const oppHand = DS.p[1].hand;
  if (oppHand.length === 0) {
    _showToast('Opponent hand is empty', '#ff6040', 90);
    return;
  }

  // Real x402 path — Phantom wallet + broker
  const wallet = window.solana;
  const conn = typeof solConnection !== 'undefined' ? solConnection : null;
  if (wallet?.publicKey && window.x402?.scoutPeek && conn) {
    _showToast('Approve 0.005 SOL in wallet…', '#8090a8', 360);
    try {
      const gameId = DS.gameId || 0;
      const target = DS.opponentPubkey || wallet.publicKey.toBase58();
      await window.x402.scoutPeek(gameId, target, wallet, conn);
      const idx = Math.floor(Math.random() * oppHand.length);
      DS.scoutPeekUsed++;
      DS.scoutActive = true;
      DS.scoutExpire = fr + 300;
      DS.scoutCardIdx = idx;
      _addLog(`R${DS.round}: Scout Peek (x402 paid) — saw ${oppHand[idx].name}`);
      _showToast(`Peeked: ${oppHand[idx].name}!`, '#80c0ff', 180);
      return;
    } catch (err) {
      console.warn('[scoutPeek] x402 error:', err.message);
      _showToast('Payment failed — demo mode', '#8090a8', 120);
    }
  }

  // Fallback: multiplayer server polling (demo / wallet not connected)
  _showToast('Verifying payment...', '#8090a8', 240);
  _x402Mock('/x402/scout-peek', { duelId: 'mock' }).then(function (result) {
    if (!result.ok) return;
    const idx = Math.floor(Math.random() * oppHand.length);
    DS.scoutPeekUsed++;
    DS.scoutActive = true;
    DS.scoutExpire = fr + 300;
    DS.scoutCardIdx = idx;
    _addLog(`R${DS.round}: Scout Peek — saw ${oppHand[idx].name}`);
    _showToast(`Peeked: ${oppHand[idx].name}!`, '#80c0ff', 180);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// COUNTER-PEEK (DEF-1) — Day 11
// During opponent's summon phase (battle phase in ai_stub), reveals one
// specific card from the opponent's hand based on a name hint.
// Cost: x402 0.01 SOL mock. Uses counterPeekUsed counter (max 2/duel).
// ═══════════════════════════════════════════════════════════════════════════
function _triggerCounterPeek() {
  if (DS.counterPeekUsed >= COUNTER_PEEK_MAX) {
    _showToast('Counter-Peek limit reached (2/duel)', '#ff6040', 90);
    return;
  }
  const oppHand = DS.p[1].hand;
  if (oppHand.length === 0) {
    _showToast('Opponent hand is empty', '#ff6040', 90);
    return;
  }
  _showToast('Verifying payment...', '#8090a8', 240);
  _x402Mock('/x402/counter-peek', { duelId: 'mock' }).then(function (result) {
    if (!result.ok) return;
    // Reveal the highest-BP card (strategic: see the biggest threat)
    let best = 0;
    for (let i = 1; i < oppHand.length; i++) {
      if (oppHand[i].bp > oppHand[best].bp) best = i;
    }
    DS.counterPeekUsed++;
    DS.counterPeekActive = true;
    DS.counterPeekExpire = fr + 300; // 5 sec
    DS.counterPeekCardIdx = best;
    _addLog(`R${DS.round}: Counter-Peek — identified ${oppHand[best].name} (${oppHand[best].bp}BP)`);
    _showToast(`Counter: ${oppHand[best].name}!`, '#e080ff', 180);
  });
}

// x402 endpoint — Day 11: real verification via multiplayer server
// Falls back to mock if server unreachable (offline/demo mode).
function _x402Mock(endpoint, params) {
  // Resolve server base (same host as WS, or localhost in dev)
  const base = (typeof WS_URL !== 'undefined' && WS_URL)
    ? WS_URL.replace('ws://', 'http://').replace('wss://', 'https://')
    : 'http://localhost:3500';
  const url = base.replace(/\/$/, '') + endpoint;

  // Get player pubkey from wallet connection (if available)
  const playerPubkey = (typeof walletPubkey !== 'undefined' && walletPubkey) ? walletPubkey : 'demo';

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ playerPubkey }, params)),
    signal: AbortSignal.timeout(6000), // 6 sec timeout
  })
    .then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          // 402 = payment required
          _showToast(data.error || 'Payment required', '#ff6040', 150);
          return { ok: false, error: data.error };
        }
        return data;
      });
    })
    .catch(function (err) {
      // Network error / server offline — fall back to demo mode
      console.warn('[x402] Server unreachable, using demo mode:', err.message);
      return { ok: true, demo: true };
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERLAYS
// ═══════════════════════════════════════════════════════════════════════════
function _drawModal() {
  if (!DS.modal) return;
  const m = DS.modal;

  if (m.type === 'extra_action') _drawExtraActionModal(m);
  else if (m.type === 'leave_confirm') _drawLeaveConfirmModal();
}

function _drawExtraActionModal(m) {
  // Dim
  g.fillStyle = 'rgba(0,0,0,0.7)';
  g.fillRect(0, 0, W, H);

  const mx = 20, my = 30, mw = 200, mh = 200;
  g.fillStyle = '#141e2c';
  g.fillRect(mx, my, mw, mh);
  g.strokeStyle = '#d0a820';
  g.lineWidth = 1;
  g.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1);

  g.fillStyle = '#d0a820';
  g.font = 'bold 8px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'top';
  g.fillText('EXTRA ACTION', mx + mw / 2, my + 6);

  const costStr = m.payMethod === 'shards' ? '3 Shards' : '0.01 SOL (x402)';
  g.fillStyle = '#8090a8';
  g.font = '6px monospace';
  g.fillText(`Cost: ${costStr}`, mx + mw / 2, my + 18);
  g.textAlign = 'left';

  m.choices.forEach(function (ch, i) {
    const cy    = my + 32 + i * 38;
    const sel   = i === m.selected;
    g.fillStyle = sel ? '#1e3050' : '#0e1820';
    g.fillRect(mx + 8, cy, mw - 16, 34);
    g.strokeStyle = sel ? '#4080c0' : '#2a3848';
    g.lineWidth = 1;
    g.strokeRect(mx + 8 + 0.5, cy + 0.5, mw - 17, 33);

    g.fillStyle = sel ? '#d0e8ff' : '#8090a8';
    g.font = 'bold 7px monospace';
    g.textBaseline = 'top';
    g.fillText(ch.label, mx + 14, cy + 6);

    g.fillStyle = '#5a6878';
    g.font = '5px monospace';
    g.fillText(ch.desc, mx + 14, cy + 18);
  });

  // Footer
  g.fillStyle = '#506070';
  g.font = '5px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'bottom';
  g.fillText('Tap to select · LOCK IN to confirm · ESC to cancel', mx + mw / 2, my + mh - 4);
  g.textAlign = 'left';
}

function _drawLeaveConfirmModal() {
  g.fillStyle = 'rgba(0,0,0,0.7)';
  g.fillRect(0, 0, W, H);

  const mx = 60, my = 80, mw = 200, mh = 100;
  g.fillStyle = '#1a0c0c';
  g.fillRect(mx, my, mw, mh);
  g.strokeStyle = '#d04030';
  g.lineWidth = 1;
  g.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1);

  g.fillStyle = '#e06060';
  g.font = 'bold 8px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('LEAVE DUEL?', mx + mw / 2, my + 20);

  g.fillStyle = '#a08080';
  g.font = '6px monospace';
  g.fillText("You'll forfeit your ante.", mx + mw / 2, my + 36);
  g.fillText('Opponent wins.', mx + mw / 2, my + 48);

  // Buttons
  _drawSmallButton(mx + 10, my + 64, 80, 24, 'CONFIRM LEAVE', '#d04030', true);
  _drawSmallButton(mx + mw - 90, my + 64, 80, 24, 'STAY', '#40a060', true);
  g.textAlign = 'left';
}

function _drawDuelOver() {
  // Full-screen overlay
  g.fillStyle = 'rgba(0,0,0,0.85)';
  g.fillRect(0, 0, W, H);

  const won = DS.winner === 0;
  const banner = won ? '✦ VICTORY ✦' : '✦ DEFEAT ✦';
  const bannerColor = won ? '#60e080' : '#e06060';

  // Banner
  g.fillStyle = bannerColor;
  g.font = 'bold 16px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(banner, W / 2, 50);

  // Subtitle
  g.fillStyle = '#8090a8';
  g.font = '7px monospace';
  g.fillText('DUEL COMPLETE', W / 2, 70);

  // Stats
  const p0 = DS.p[0], p1 = DS.p[1];
  const stats = [
    `Rounds played:    ${DS.round} / ${MAX_ROUNDS}`,
    `Your HP:          ${p0.hp}`,
    `Opp HP:           ${p1.hp}`,
    `Cards summoned:   ${p0.cardsSummoned}`,
    `Damage dealt:     ${p0.dmgDealt || 0}`,
    `Reason: ${DS.winReason}`,
  ];
  g.fillStyle = '#a0b8c8';
  g.font = '6px monospace';
  stats.forEach(function (s, i) {
    g.fillText(s, W / 2 - 70, 88 + i * 11);
  });

  // Continue button
  const bx = W / 2 - 50, by = 165;
  const bw = 100, bh = 22;
  const pulse = fr % 40 < 20;
  g.fillStyle = pulse ? '#1e3828' : '#141e20';
  g.fillRect(bx, by, bw, bh);
  g.strokeStyle = '#40a060';
  g.lineWidth = 1;
  g.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  g.fillStyle = '#60e080';
  g.font = 'bold 8px monospace';
  g.fillText('CONTINUE', W / 2, by + bh / 2);

  g.textAlign = 'left';
}

// ═══════════════════════════════════════════════════════════════════════════
// T-D13-E: Duel resolution → Victory scene bridge
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the duelResult object from DS state and launch M4 Victory scene.
 * Called when player clicks CONTINUE on the duel-over overlay.
 */
function _launchVictoryScene() {
  if (!DS) return;
  const p0 = DS.p[0], p1 = DS.p[1];
  const won = DS.winner === 0;

  // Determine winner/loser HP
  const winnerSide = DS.winner === 0 ? p0 : p1;
  const loserSide  = DS.winner === 0 ? p1 : p0;

  // Card count from global state (falls back gracefully if not available)
  const cardCountBefore = (typeof cards !== 'undefined' && Array.isArray(cards))
    ? cards.length : 0;

  // T-D13-B: Select cards to transfer (stub — uses empty arrays until NFT infra lands)
  // DECISION: NFT transfer deferred post-hackathon; Victory scene shows stub data.
  // Proper selectTransferCards call will fire once fetchPlayerCards is wired to devnet.
  const duelResult = {
    won,
    hallTier:         DS.hallTier || 0,
    ante:             DS.ante     || 0,
    roundsPlayed:     DS.round,
    finalWinnerHP:    winnerSide.hp,
    finalLoserHP:     loserSide.hp,
    totalDamageDealt: (p0.dmgDealt || 0),
    shardsEarned:     (typeof shards !== 'undefined' ? shards : 0),
    cardCountBefore,
    // NFT transfer: populated async once devnet transfer lands
    transferredCards: [],   // POST-HACKATHON: fill from selectTransferCards()
    transferTxHash:   null,
    transferFallback: null,
    // T-D15-E: Legendary bonus transfer on Gold Hall loss
    // When selectTransferCards is wired, pass result.legendary here.
    // For demo: if Gold Hall duel and loser held a Legendary, DS.loserLegendary is set.
    legendaryTransferred: (DS.hallTier >= 2 && DS.loserLegendary) ? DS.loserLegendary : null,
  };

  if (typeof triggerVictoryScene === 'function') {
    triggerVictoryScene(duelResult);
  } else {
    // Fallback if 09-victory-scene.js not loaded
    exitDuelScene();
    if (typeof fadeOut === 'function') {
      fadeOut(function () { sc = 'lobby'; if (typeof fadeIn === 'function') fadeIn(); });
    } else { sc = 'lobby'; }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ZK HAND SERIALIZATION (DEF-E, Day 11 prep for Day 12 circuit)
// ═══════════════════════════════════════════════════════════════════════════

// Generate cryptographically random 32-byte salt (as Uint8Array)
function generateHandSalt() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const salt = new Uint8Array(32);
    crypto.getRandomValues(salt);
    return salt;
  }
  // Fallback: seeded from timestamp (not cryptographically secure, dev only)
  const salt = new Uint8Array(32);
  let s = Date.now();
  for (let i = 0; i < 32; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    salt[i] = s & 0xff;
  }
  return salt;
}

// Serialize a player's hand for ZK circuit input (Day 12).
// Input: hand array from DS.p[who].hand, round number, Uint8Array salt
// Output: { card_ids: [u64; 10], salt: [u8; 32], phase: u8, player_pubkey: [u8; 32] }
//
// Card IDs are padded to MAX_HAND_SIZE=10 with 0 (empty slot sentinel).
// phase = round number (1-5).
// player_pubkey = 32 bytes from wallet (or zero-array in demo mode).
function serializeHandForZK(hand, round, salt) {
  const MAX_HAND_SIZE = 10;
  const card_ids = new Array(MAX_HAND_SIZE).fill(0);
  for (let i = 0; i < Math.min(hand.length, MAX_HAND_SIZE); i++) {
    card_ids[i] = hand[i].id || 0;
  }

  // Player pubkey: 32-byte array from wallet, or zeros
  const player_pubkey = new Uint8Array(32);
  if (typeof walletPubkey !== 'undefined' && walletPubkey) {
    // Decode base58 pubkey to bytes (simplified — Day 12 wires real decode)
    try {
      const bytes = _base58ToBytes(walletPubkey);
      player_pubkey.set(bytes.slice(0, 32));
    } catch (_) { /* leave zeros in demo mode */ }
  }

  return {
    card_ids,            // u64[] padded to 10 (circuit input)
    salt: Array.from(salt), // u8[32]
    phase: round & 0xff, // u8 (round 1-5)
    player_pubkey: Array.from(player_pubkey), // u8[32]
    // Metadata for debugging (not circuit input)
    _meta: {
      hand_count: hand.length,
      round,
      generated_at: Date.now(),
    },
  };
}

// Simplified base58 decoder for pubkey bytes
function _base58ToBytes(b58) {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let bytes = [0];
  for (const ch of b58) {
    let carry = ALPHABET.indexOf(ch);
    if (carry < 0) throw new Error('Invalid base58 char: ' + ch);
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) { bytes.push(carry & 0xff); carry >>= 8; }
  }
  // Add leading zeros
  for (const ch of b58) {
    if (ch !== '1') break;
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

// ═══════════════════════════════════════════════════════════════════════════
// ZK PROOF GENERATION (T-D12-C2)
// ═══════════════════════════════════════════════════════════════════════════

function bytesToBigInt(bytes) {
  let result = 0n;
  for (const b of bytes) {
    result = (result << 8n) | BigInt(b);
  }
  return result;
}

function fieldToBytes(bigintVal) {
  const hex = bigintVal.toString(16).padStart(64, '0');
  const arr = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

function proofG1ToBytes(g1) {
  // g1 = [x_str, y_str] — affine coordinates as decimal strings
  const out = new Uint8Array(64);
  const xBytes = fieldToBytes(BigInt(g1[0]));
  const yBytes = fieldToBytes(BigInt(g1[1]));
  out.set(xBytes, 0);
  out.set(yBytes, 32);
  return out;
}

function proofG2ToBytes(g2) {
  // g2 = [[x0, x1], [y0, y1]] — EIP-197 expects (x1, x0, y1, y0) ordering
  const out = new Uint8Array(128);
  out.set(fieldToBytes(BigInt(g2[0][1])), 0);
  out.set(fieldToBytes(BigInt(g2[0][0])), 32);
  out.set(fieldToBytes(BigInt(g2[1][1])), 64);
  out.set(fieldToBytes(BigInt(g2[1][0])), 96);
  return out;
}

async function generateHandCommitmentProof(playerHand, round, playerPubkey) {
  const cardIds = playerHand.map(c => c.card_id).concat(
    Array(Math.max(0, 10 - playerHand.length)).fill(0)
  ).slice(0, 10);

  const salt = crypto.getRandomValues(new Uint8Array(32));
  const pubkeyBytes = playerPubkey.toBytes ? playerPubkey.toBytes()
    : _base58ToBytes(playerPubkey.toString());

  const pubkey_lo = bytesToBigInt(pubkeyBytes.slice(16, 32));
  const pubkey_hi = bytesToBigInt(pubkeyBytes.slice(0, 16));
  const salt_lo   = bytesToBigInt(salt.slice(16, 32));
  const salt_hi   = bytesToBigInt(salt.slice(0, 16));

  const input = {
    round:      String(round),
    pubkey_lo:  pubkey_lo.toString(),
    pubkey_hi:  pubkey_hi.toString(),
    card_ids:   cardIds.map(String),
    salt_lo:    salt_lo.toString(),
    salt_hi:    salt_hi.toString(),
  };

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    '/hand_commitment.wasm',
    '/hand_commitment_final.zkey'
  );

  // commitment is publicSignals[0]
  const commitmentBytes = fieldToBytes(BigInt(publicSignals[0]));

  const proofBytes = {
    a:     proofG1ToBytes(proof.pi_a),
    b:     proofG2ToBytes(proof.pi_b),
    c:     proofG1ToBytes(proof.pi_c),
    commitment: commitmentBytes,
    publicSignals,
  };

  return { proofBytes, salt, commitmentBytes };
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT HANDLING
// ═══════════════════════════════════════════════════════════════════════════
function handleDuelInput(px, py) {
  if (!DS) return;

  // Duel over — launch M4 Victory/Defeat scene (T-D13-E)
  if (DS.over) {
    const bx = W / 2 - 50, by = 165, bw = 100, bh = 22;
    if (px >= bx && px <= bx + bw && py >= by && py <= by + bh) {
      _launchVictoryScene();
    }
    return;
  }

  // Modal input
  if (DS.modal) {
    _handleModalInput(px, py);
    return;
  }

  // Right panel hits
  if (px >= DL.RP_X) {
    _handlePanelInput(px, py);
    return;
  }

  // Summon phase only for lane/hand interaction
  if (DS.phase !== 'summon') return;

  // Hotseat: only active side can interact
  const activeSide = DS.mode === 'hotseat' ? DS.activeSide : 0;
  if (activeSide !== 0) {
    // P2's turn in hotseat — we still let P2 interact via same mouse
    // (dev mode: both players share tab)
    _handleGameAreaInput(px, py, DS.activeSide);
    return;
  }
  _handleGameAreaInput(px, py, 0);
}

function _handleGameAreaInput(px, py, who) {
  const side = DS.p[who];

  // Tap player's own lanes
  const ownLaneY = (who === 0) ? DL.PL_Y : DL.OL_Y;
  if (py >= ownLaneY && py < ownLaneY + DL.OL_H) {
    for (let li = 0; li < 3; li++) {
      if (px >= DL.LANE_X[li] && px < DL.LANE_X[li] + DL.LANE_W) {
        const lk = ['front','middle','back'][li];

        // Retarget mode
        if (DS._retargetMode && side.lanes[lk]) {
          DS._retargetMode = false;
          DS._retargetCard = { card: side.lanes[lk], fromLane: lk };
          _showToast('Tap destination lane', '#80c0ff', 120);
          return;
        }
        if (DS._retargetCard && !side.lanes[lk]) {
          const rc = DS._retargetCard;
          side.lanes[rc.fromLane] = null;
          rc.card._lane = lk;
          side.lanes[lk] = rc.card;
          DS._retargetCard = null;
          _addLog(`R${DS.round}: Moved ${rc.card.name} to ${lk}`);
          return;
        }

        // Place selected card
        if (side.selected !== null) {
          const card = side.hand[side.selected];
          if (!card) { side.selected = null; return; }
          if (!_canPlaceLane(who, card, lk)) {
            // Half-cost: check again after halving cost
            if (DS._halfCostNext) {
              const halfCost = {};
              for (const [el, v] of Object.entries(card.cost)) halfCost[el] = Math.ceil(v / 2);
              const origCost = card.cost;
              card.cost = halfCost;
              const placed = _placeCard(who, side.selected, lk);
              if (!placed) card.cost = origCost;
              else DS._halfCostNext = false;
              return;
            }
            const reason = side.lanes[lk] ? 'Lane occupied' : 'Not enough energy';
            _showToast(`Invalid: ${reason}`, '#ff6040', 90);
            return;
          }
          _placeCard(who, side.selected, lk);
        }
        return;
      }
    }
  }

  // Tap hand cards (player 0 only)
  if (who === 0 && py >= DL.HAND_Y && py < DL.HAND_Y + DL.HAND_H) {
    const startIdx = DS.handScroll;
    const visCount = Math.floor((DL.GW - 8) / DL.HCARD_GAP);

    // DEF-8: Scroll left arrow (leftmost 10px)
    if (px < 10 && startIdx > 0) {
      DS.handScroll = Math.max(0, startIdx - 1);
      return;
    }
    // DEF-8: Scroll right arrow (rightmost 10px)
    if (px >= DL.GW - 10 && startIdx + visCount < side.hand.length) {
      DS.handScroll = Math.min(side.hand.length - visCount, startIdx + 1);
      return;
    }

    for (let i = 0; i < visCount; i++) {
      const hIdx = startIdx + i;
      if (hIdx >= side.hand.length) break;
      const cx = DL.HCARD_X0 + i * DL.HCARD_GAP;
      if (px >= cx && px < cx + DL.HCARD_W) {
        if (side.selected === hIdx) {
          side.selected = null; // deselect
        } else {
          side.selected = hIdx;
        }
        return;
      }
    }
  }
}

function _handlePanelInput(px, py) {
  const rx = DL.RP_X;

  // Lock In button
  if (py >= DL.LOCKIN_Y && py < DL.LOCKIN_Y + DL.LOCKIN_H && DS.phase === 'summon') {
    _lockIn();
    return;
  }

  // Scout Peek + Counter-Peek buttons (above Lock In)
  if (DS.phase === 'summon') {
    const peekW = (DL.RP_W - 12) / 2;
    const peekY = DL.LOCKIN_Y - 20;
    if (py >= peekY && py < peekY + 18) {
      // Scout peek (left half)
      if (px < rx + 4 + peekW && DS.scoutPeekUsed < SCOUT_PEEK_MAX) {
        _triggerScoutPeek();
        return;
      }
      // Counter-peek (right half)
      if (px >= rx + 4 + peekW + 4 && DS.counterPeekUsed < COUNTER_PEEK_MAX) {
        _triggerCounterPeek();
        return;
      }
    }
  }

  // Extra Action button area (in Shards row region)
  if (py >= DL.SHARDS_Y && py < DL.SHARDS_Y + DL.SHARDS_H &&
      DS.phase === 'summon' && DS.extraActUsed < EXTRA_ACTION_MAX) {
    if (px >= rx + 4 && px < rx + 40) {
      _openExtraActionModal();
      return;
    }
  }

  // Leave Duel
  if (py >= DL.LEAVE_Y && DS.phase === 'summon') {
    DS.modal = { type: 'leave_confirm' };
    return;
  }
}

function _handleModalInput(px, py) {
  const m = DS.modal;
  if (!m) return;

  if (m.type === 'extra_action') {
    const mx = 20, my = 30, mw = 200;
    m.choices.forEach(function (ch, i) {
      const cy = my + 32 + i * 38;
      if (px >= mx + 8 && px < mx + mw - 8 && py >= cy && py < cy + 34) {
        m.selected = i;
      }
    });
    // Clicking a selection twice (or Lock In button) confirms
    if (py >= DL.LOCKIN_Y && py < DL.LOCKIN_Y + DL.LOCKIN_H) {
      _applyExtraAction(m.choices[m.selected].id);
    }
  } else if (m.type === 'leave_confirm') {
    const mx = 60, my = 80, mw = 200;
    // Confirm leave
    if (px >= mx + 10 && px < mx + 90 && py >= my + 64 && py < my + 88) {
      DS.modal = null;
      _endDuel(1, 'Player forfeited');
    }
    // Stay
    if (px >= mx + mw - 90 && px < mx + mw - 10 && py >= my + 64 && py < my + 88) {
      DS.modal = null;
    }
  }
}

function handleDuelKey(code) {
  if (!DS) return;

  if (DS.modal && DS.modal.type === 'extra_action') {
    const m = DS.modal;
    if (code === 'ArrowDown') m.selected = (m.selected + 1) % m.choices.length;
    if (code === 'ArrowUp')   m.selected = (m.selected - 1 + m.choices.length) % m.choices.length;
    if (code === 'KeyZ' || code === 'Enter') _applyExtraAction(m.choices[m.selected].id);
    if (code === 'Escape' || code === 'KeyX') DS.modal = null;
    return;
  }

  if (code === 'Escape' || code === 'KeyX') {
    if (DS.p[0].selected !== null) {
      DS.p[0].selected = null;
    }
  }
}
