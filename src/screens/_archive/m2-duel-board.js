// src/screens/m2-duel-board.js — M2 Duel Board · 4-Phase Battle
// Main battle screen: 5×3 grid, hand tray, energy pool, action count, battle log.
// mount(container, { round, maxRounds, phase }) / unmount(container)

const PHASES = ['DRAW', 'COMMIT', 'REVEAL', 'RESOLVE'];

const HAND_CARDS = [
  { id: 'cutlass',    name: 'CUTLASS',    type: '⚔', typeLabel: 'ATK', clan: 'black-flag'   },
  { id: 'anchor',     name: 'ANCHOR',     type: '🛡', typeLabel: 'DEF', clan: 'hollow-blade' },
  { id: 'phantom',    name: 'PHANTOM',    type: '◎', typeLabel: 'SPL', clan: 'nameless-silk' },
  { id: 'crows-eye',  name: "CROW'S EYE", type: '⚔', typeLabel: 'ATK', clan: 'iron-circle'  },
];

const LOG_LINES = [
  'HOLLOW BLADE drew CUTLASS',
  'BLACK FLAG played ANCHOR',
  '[waiting...]',
];

// face-down cards: [col, row] indices (0-based), 0-1 = opp zone, 2 = player zone
const FACEDOWN_CELLS = [[0,0],[2,0],[4,0],[1,1],[3,1]];

let _selectedCard = null;

export function mount(container, detail = {}) {
  injectStyle();
  const round      = detail.round      ?? 1;
  const maxRounds  = detail.maxRounds  ?? 5;
  const phase      = detail.phase      ?? 'COMMIT';
  _selectedCard    = null;

  container.innerHTML = buildHTML(round, maxRounds, phase);
  bindEvents(container, round);
}

export function unmount(container) {
  _selectedCard = null;
  container.innerHTML = '';
}

/* ── HTML ─────────────────────────────────────────────────────── */
function buildHTML(round, maxRounds, phase) {
  return `
<div class="m2-root" role="main" aria-label="Duel board">
  ${buildTopBar(round, maxRounds, phase)}
  <div class="m2-body">
    ${buildField()}
    ${buildSidebar()}
  </div>
  ${buildHandTray()}
</div>`;
}

function buildTopBar(round, maxRounds, phase) {
  return `
<header class="m2-topbar" role="banner">
  <div class="m2-player-tag chip">CAPT. VEGA · BLACK FLAG</div>
  <div class="m2-center flex-row gap-8">
    <span class="chip m2-title-chip">DUEL</span>
    <span class="chip m2-round-chip">R <span class="label-gold">${round}/${maxRounds}</span></span>
    <span class="chip m2-phase-chip">${phase}</span>
  </div>
  <div class="m2-right-group flex-row gap-8">
    <div class="m2-opp-tag chip">OPP. COMMANDER · ???</div>
    <span class="chip m2-hud-chip">R ${round}/${maxRounds}</span>
    <span class="chip m2-hud-chip">◆ 0.005</span>
  </div>
</header>`;
}

function buildField() {
  let rows = '';
  for (let r = 0; r < 3; r++) {
    const zoneClass = r < 2 ? 'm2-zone-opp' : 'm2-zone-player';
    let cells = '';
    for (let c = 0; c < 5; c++) {
      const isFacedown = FACEDOWN_CELLS.some(([fc, fr]) => fc === c && fr === r);
      cells += `<div class="m2-cell ${zoneClass}" data-col="${c}" data-row="${r}" aria-label="cell ${c},${r}">
        ${isFacedown ? buildFacedownCard(r) : '<span class="m2-empty-dot" aria-hidden="true">·</span>'}
      </div>`;
    }
    rows += `<div class="m2-row">${cells}</div>`;
  }
  return `
<section class="m2-field" aria-label="Battle field">
  <div class="m2-grid">${rows}</div>
</section>`;
}

function buildFacedownCard(row) {
  const clanIcon = row < 2 ? '☠' : '⚓';
  return `<div class="m2-facedown" aria-hidden="true"><span class="m2-facedown-icon">${clanIcon}</span></div>`;
}

function buildSidebar() {
  const pips = Array.from({ length: 5 }, (_, i) =>
    `<span class="m2-pip${i < 3 ? ' m2-pip--filled' : ''}" aria-hidden="true">◆</span>`
  ).join('');

  const logLines = LOG_LINES.map(line =>
    `<div class="m2-log-line label-dim">${line}</div>`
  ).join('');

  return `
<aside class="m2-sidebar" aria-label="Actions and log">
  <div class="m2-energy-block">
    <div class="m2-section-label label-gold">◆ ENERGY</div>
    <div class="m2-pips flex-row gap-8">${pips}</div>
  </div>
  <div class="m2-actions-block">
    <div class="m2-section-label">ACTIONS: <span class="label-gold">2 / 3</span></div>
  </div>
  <div class="m2-commit-btns flex-row gap-8">
    <button class="gba-btn gba-btn--primary m2-lockin" id="m2-lockin" aria-label="Lock in moves">
      ► LOCK IN
    </button>
    <button class="gba-btn gba-btn--secondary m2-ai-delegate" id="m2-ai-delegate"
      aria-label="Delegate move to AI — costs 0.005 SOL">
      ✦ AI ◎0.005
    </button>
  </div>
  <div class="m2-ai-result label-dim" id="m2-ai-result" aria-live="polite"></div>
  <div class="m2-log" aria-label="Battle log" aria-live="polite">
    <div class="m2-log-header label-dim">LOG</div>
    ${logLines}
  </div>
</aside>`;
}

function buildHandTray() {
  const cards = HAND_CARDS.map(card => `
    <button class="m2-card" id="m2-card-${card.id}" data-card-id="${card.id}"
      aria-label="${card.name} ${card.typeLabel}" aria-pressed="false">
      <span class="m2-card-type">${card.type}</span>
      <span class="m2-card-name clan-${card.clan}">${card.name}</span>
      <span class="m2-card-badge label-dim">${card.typeLabel}</span>
    </button>`).join('');

  return `
<section class="m2-hand-tray" aria-label="Player hand">
  <div class="m2-hand-inner">${cards}</div>
</section>`;
}

/* ── Events ───────────────────────────────────────────────────── */
function bindEvents(container, round) {
  container.querySelector('#m2-lockin').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('duel:locked', { detail: { round } }));
  });

  const aiBtn = container.querySelector('#m2-ai-delegate');
  if (aiBtn) {
    aiBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('duel:ai-move', { detail: { round } }));
    });
    document.addEventListener('duel:ai-result', (e) => {
      const el = container.querySelector('#m2-ai-result');
      if (!el) return;
      const { action_type, target } = e.detail ?? {};
      el.textContent = `AI chose: action ${action_type ?? '?'} → ${(target ?? '').slice(0, 8)}…`;
    }, { once: true });
  }

  container.querySelectorAll('.m2-card').forEach(cardEl => {
    cardEl.addEventListener('click', () => {
      const id = cardEl.dataset.cardId;
      if (_selectedCard === id) {
        // deselect
        cardEl.classList.remove('m2-card--selected');
        cardEl.setAttribute('aria-pressed', 'false');
        _selectedCard = null;
      } else {
        // deselect previous
        if (_selectedCard) {
          const prev = container.querySelector(`#m2-card-${_selectedCard}`);
          if (prev) {
            prev.classList.remove('m2-card--selected');
            prev.setAttribute('aria-pressed', 'false');
          }
        }
        cardEl.classList.add('m2-card--selected');
        cardEl.setAttribute('aria-pressed', 'true');
        _selectedCard = id;
      }
    });
  });
}

/* ── Styles ───────────────────────────────────────────────────── */
function injectStyle() {
  if (document.getElementById('style-m2-duel-board')) return;
  const el = document.createElement('style');
  el.id = 'style-m2-duel-board';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
/* Root */
.m2-root {
  position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main); background: var(--bg-deep);
  display: flex; flex-direction: column;
}

/* Top bar */
.m2-topbar {
  height: 36px; flex-shrink: 0; display: flex; align-items: center;
  justify-content: space-between; padding: 0 10px; gap: 8px;
  border-bottom: var(--border-dim); background: rgba(3,6,15,0.80); z-index: 10;
}
.m2-player-tag { font-size: 14px; letter-spacing: 0.06em; white-space: nowrap; }
.m2-opp-tag    { font-size: 14px; letter-spacing: 0.06em; white-space: nowrap; color: var(--text-dim); }
.m2-center     { flex-shrink: 0; }
.m2-title-chip { font-size: 13px; letter-spacing: 0.12em; color: var(--accent-gold); }
.m2-round-chip { font-size: 13px; white-space: nowrap; }
.m2-phase-chip { font-size: 13px; letter-spacing: 0.08em; color: var(--accent-blue); white-space: nowrap; }
.m2-right-group { flex-shrink: 0; }
.m2-hud-chip   { font-size: 13px; white-space: nowrap; }

/* Body */
.m2-body { flex: 1; display: flex; min-height: 0; }

/* Field */
.m2-field {
  flex: 1; display: flex; align-items: center; justify-content: center;
  padding: 12px 16px;
}
.m2-grid { display: flex; flex-direction: column; gap: 4px; }
.m2-row  { display: flex; gap: 4px; }

/* Cells */
.m2-cell {
  width: 80px; height: 80px;
  border: 1px solid rgba(201,162,39,0.25);
  display: flex; align-items: center; justify-content: center;
  transition: background 80ms;
}
.m2-zone-opp    { background: rgba(140,28,46,0.08); }
.m2-zone-player { background: rgba(26,58,92,0.12); }
.m2-zone-player:hover { background: rgba(26,58,92,0.22); }

.m2-empty-dot { color: rgba(201,162,39,0.20); font-size: 20px; }

/* Face-down card */
.m2-facedown {
  width: 54px; height: 70px;
  background: rgba(20,24,38,0.85);
  border: 1px solid rgba(201,162,39,0.30);
  display: flex; align-items: center; justify-content: center;
}
.m2-facedown-icon { font-size: 22px; color: rgba(201,162,39,0.35); line-height: 1; }

/* Sidebar */
.m2-sidebar {
  width: 180px; flex-shrink: 0; display: flex; flex-direction: column;
  gap: 12px; padding: 12px 10px;
  border-left: var(--border-dim); background: rgba(10,14,26,0.60);
}
.m2-section-label { font-size: 14px; letter-spacing: 0.08em; margin-bottom: 4px; }
.m2-energy-block, .m2-actions-block { flex-shrink: 0; }
.m2-pips { flex-wrap: nowrap; }
.m2-pip         { font-size: 16px; color: rgba(201,162,39,0.25); line-height: 1; }
.m2-pip--filled { color: var(--accent-gold); }

/* Lock In button */
.m2-lockin {
  width: 100%; justify-content: center;
  font-size: 20px; letter-spacing: 0.10em; padding: 9px 0;
}

/* Battle log */
.m2-log { flex: 1; display: flex; flex-direction: column; gap: 3px; overflow: hidden; }
.m2-log-header { font-size: 12px; letter-spacing: 0.10em; margin-bottom: 2px; }
.m2-log-line   { font-size: 13px; letter-spacing: 0.04em; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Hand tray */
.m2-hand-tray {
  height: 88px; flex-shrink: 0;
  border-top: var(--border-dim); background: rgba(3,6,15,0.75);
  display: flex; align-items: center; padding: 0 16px;
}
.m2-hand-inner { display: flex; gap: 8px; align-items: center; }

/* Hand card */
.m2-card {
  width: 72px; height: 72px;
  background: var(--bg-mid); border: var(--border-dim);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; cursor: pointer; padding: 4px;
  font-family: var(--font-main); transition: border-color 80ms, background 80ms;
}
.m2-card:hover, .m2-card:focus-visible {
  background: rgba(26,31,51,0.90); border-color: rgba(201,162,39,0.60); outline: none;
}
.m2-card--selected { border: var(--border-gold); background: rgba(201,162,39,0.08); }
.m2-card-type  { font-size: 18px; line-height: 1; }
.m2-card-name  { font-size: 12px; letter-spacing: 0.04em; white-space: nowrap; line-height: 1.2; }
.m2-card-badge { font-size: 11px; letter-spacing: 0.06em; line-height: 1; }

/* AI delegate */
.m2-commit-btns { flex-wrap: wrap; }
.m2-ai-delegate { font-size: 11px; letter-spacing: 0.06em; padding: 4px 8px; opacity: 0.9; }
.m2-ai-delegate:hover { opacity: 1; }
.m2-ai-result { min-height: 14px; font-size: 11px; margin-top: 4px; color: var(--accent-blue); }
`;
