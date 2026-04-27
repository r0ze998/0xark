// src/screens/s7-howtoplay.js — S7 How To Play
// Rules reference and tutorial.
// mount(container) / unmount(container)

const PAGES = [
  {
    id: 'overview',
    label: 'OVERVIEW',
    icon: '◎',
    title: 'SUCCESSION WAR OF ELYON',
    content: [
      { type: 'p', text: '0xARK is an on-chain TCG where players commit cards using ZK proofs — your opponent cannot see your hand until the REVEAL phase.' },
      { type: 'p', text: 'Win duels to steal cards from your opponents. Build the most powerful deck across 14 days of Season 1.' },
      { type: 'divider' },
      { type: 'stat-row', label: 'DECK SIZE',     value: '20 cards' },
      { type: 'stat-row', label: 'COLLECTION',    value: 'Up to 60 cards' },
      { type: 'stat-row', label: 'SEASON LENGTH', value: '14 days' },
      { type: 'stat-row', label: 'NETWORK',       value: 'Solana Devnet → Mainnet' },
    ],
  },
  {
    id: 'phases',
    label: 'BATTLE PHASES',
    icon: '⚔',
    title: 'THE FOUR PHASES',
    content: [
      { type: 'phase', num: '1', name: 'DRAW',    color: '#4a90d9', text: 'Both players draw to 5 cards from their sealed deck.' },
      { type: 'phase', num: '2', name: 'COMMIT',  color: '#a070e0', text: 'Select up to 3 cards. Hash your hand using ZK-Poseidon. Submit the commitment on-chain. Opponent cannot see your selection.' },
      { type: 'phase', num: '3', name: 'REVEAL',  color: '#c9a227', text: 'Both players reveal their committed hands simultaneously. ZK proof is verified on-chain by the Groth16 verifier (BN254 curve).' },
      { type: 'phase', num: '4', name: 'RESOLVE', color: '#d63b3b', text: 'ATK vs DEF is calculated per lane. Winner steals 1–2 cards from the loser\'s collection. Prize pool is distributed via SPL Token transfer.' },
    ],
  },
  {
    id: 'zk',
    label: 'ZK MECHANICS',
    icon: '⬡',
    title: 'ZERO-KNOWLEDGE PROOF',
    content: [
      { type: 'p', text: 'Your committed hand is a Poseidon hash of your card selection + a random salt. The hash is posted on-chain before the reveal.' },
      { type: 'divider' },
      { type: 'stat-row', label: 'HASH FUNCTION', value: 'Poseidon (BN254-native)' },
      { type: 'stat-row', label: 'PROOF SYSTEM',  value: 'Groth16' },
      { type: 'stat-row', label: 'CIRCUIT',       value: 'Circom' },
      { type: 'stat-row', label: 'ROLLUP',        value: 'MagicBlock Ephemeral Rollup' },
      { type: 'divider' },
      { type: 'p', text: 'You cannot change your hand after the COMMIT phase. The ZK proof guarantees your reveal matches your original commit.' },
    ],
  },
  {
    id: 'cards',
    label: 'CARD TYPES',
    icon: '◈',
    title: 'CARD TYPES & CLANS',
    content: [
      { type: 'card-type', type: 'ATK', color: '#d63b3b', text: 'Deals damage in the RESOLVE phase. Higher ATK bypasses low DEF cards.' },
      { type: 'card-type', type: 'DEF', color: '#4a90d9', text: 'Blocks ATK damage. Stacked DEF reduces card-stealing risk.' },
      { type: 'card-type', type: 'SPY', color: '#a070e0', text: 'Reveals one of the opponent\'s committed cards before REVEAL. Intel advantage.' },
      { type: 'card-type', type: 'REL', color: '#c9a227', text: 'Relics — rare cards with passive effects active for the full season.' },
      { type: 'divider' },
      { type: 'p', text: 'Clans: Black Flag · Hollow Blade · Iron Circle · Bourse · Nameless Silk · Royal' },
    ],
  },
  {
    id: 'x402',
    label: 'x402 & STAKES',
    icon: '◆',
    title: 'x402 PAYMENT PROTOCOL',
    content: [
      { type: 'p', text: 'Every duel requires a SOL stake deposited via the x402 HTTP payment protocol. Stakes go into a shared prize pool.' },
      { type: 'divider' },
      { type: 'stat-row', label: 'MIN STAKE',   value: '0.005 SOL / duel' },
      { type: 'stat-row', label: 'PRIZE SPLIT', value: 'Winner takes 90%, 10% protocol fee' },
      { type: 'stat-row', label: 'ENDPOINT',    value: 'TBD · Fly.io deploy pending' },
      { type: 'divider' },
      { type: 'p', text: 'Stakes are locked in escrow during the duel and released on-chain after ZK proof verification.' },
    ],
  },
];

let _activePage = 'overview';

export function mount(container, detail = {}) {
  injectStyle();
  _activePage = detail.page ?? 'overview';
  container.innerHTML = buildHTML();
  bindEvents(container);
}

export function unmount(container) {
  container.innerHTML = '';
}

/* ── HTML ──────────────────────────────────────────────────── */
function buildHTML() {
  const nav = PAGES.map(p => `
    <button class="s7-nav-btn${p.id === _activePage ? ' s7-nav-btn--active' : ''}"
      data-page="${p.id}" aria-selected="${p.id === _activePage}">
      <span class="s7-nav-icon">${p.icon}</span>
      <span>${p.label}</span>
    </button>`).join('');

  return `
<div class="s7-root" role="main" aria-label="How to Play">

  <header class="s7-topbar" role="banner">
    <button class="gba-btn gba-btn--ghost s7-back" id="s7-back" aria-label="Crown Plaza">◂ CROWN PLAZA</button>
    <div class="chip s7-location">HOW TO PLAY</div>
    <span class="chip label-dim">RULES · TUTORIAL</span>
  </header>

  <div class="s7-body">

    <!-- Left nav -->
    <nav class="s7-nav" role="tablist" aria-label="Tutorial sections">
      ${nav}
    </nav>

    <!-- Right content -->
    <article class="s7-content" id="s7-content" aria-label="Tutorial content">
      ${renderPage(_activePage)}
    </article>

  </div>

  <footer class="s7-footer">
    <button class="gba-btn gba-btn--ghost s7-prev" id="s7-prev" aria-label="Previous page">◂ PREV</button>
    <span class="s7-page-indicator label-dim" id="s7-indicator">
      ${PAGES.findIndex(p => p.id === _activePage) + 1} / ${PAGES.length}
    </span>
    <button class="gba-btn gba-btn--ghost s7-next" id="s7-next" aria-label="Next page">NEXT ▸</button>
    <button class="gba-btn gba-btn--ghost" id="s7-menu" style="font-size:13px;padding:2px 8px;margin-left:auto;">≡ CABIN</button>
  </footer>

</div>`;
}

function renderPage(pageId) {
  const page = PAGES.find(p => p.id === pageId);
  if (!page) return '';

  const body = page.content.map(item => {
    if (item.type === 'p')       return `<p class="s7-para">${item.text}</p>`;
    if (item.type === 'divider') return `<div class="s7-divider"></div>`;
    if (item.type === 'stat-row') return `
      <div class="s7-stat-row">
        <span class="s7-stat-label label-dim">${item.label}</span>
        <span class="s7-stat-val label-gold">${item.value}</span>
      </div>`;
    if (item.type === 'phase') return `
      <div class="s7-phase">
        <div class="s7-phase-num" style="color:${item.color};border-color:${item.color}55;">${item.num}</div>
        <div class="s7-phase-info">
          <div class="s7-phase-name" style="color:${item.color};">${item.name}</div>
          <div class="s7-phase-text">${item.text}</div>
        </div>
      </div>`;
    if (item.type === 'card-type') return `
      <div class="s7-card-type-row">
        <div class="s7-ctr-badge" style="color:${item.color};border-color:${item.color}44;">${item.type}</div>
        <div class="s7-ctr-text">${item.text}</div>
      </div>`;
    return '';
  }).join('');

  return `
    <div class="s7-page-content">
      <h2 class="s7-title label-gold">${page.title}</h2>
      ${body}
    </div>`;
}

/* ── Events ─────────────────────────────────────────────────── */
function bindEvents(container) {
  container.querySelector('#s7-back').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:lobby'));
  });
  container.querySelector('#s7-menu').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:menu'));
  });

  container.querySelectorAll('.s7-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchPage(container, btn.dataset.page));
  });

  container.querySelector('#s7-prev').addEventListener('click', () => {
    const idx = PAGES.findIndex(p => p.id === _activePage);
    if (idx > 0) switchPage(container, PAGES[idx - 1].id);
  });

  container.querySelector('#s7-next').addEventListener('click', () => {
    const idx = PAGES.findIndex(p => p.id === _activePage);
    if (idx < PAGES.length - 1) switchPage(container, PAGES[idx + 1].id);
  });
}

function switchPage(container, pageId) {
  _activePage = pageId;
  container.querySelectorAll('.s7-nav-btn').forEach(b => {
    const on = b.dataset.page === pageId;
    b.classList.toggle('s7-nav-btn--active', on);
    b.setAttribute('aria-selected', String(on));
  });
  const content = container.querySelector('#s7-content');
  if (content) content.innerHTML = renderPage(pageId);
  const indicator = container.querySelector('#s7-indicator');
  if (indicator) {
    const idx = PAGES.findIndex(p => p.id === pageId);
    indicator.textContent = `${idx + 1} / ${PAGES.length}`;
  }
}

/* ── Styles ──────────────────────────────────────────────────── */
function injectStyle() {
  if (document.getElementById('style-s7-howtoplay')) return;
  const el = document.createElement('style');
  el.id = 'style-s7-howtoplay';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.s7-root {
  position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main); background: var(--bg-deep);
  display: flex; flex-direction: column;
}
.s7-topbar {
  height: 44px; flex-shrink: 0; display: flex; align-items: center;
  justify-content: space-between; padding: 0 12px; gap: 8px;
  border-bottom: var(--border-dim); background: rgba(3,6,15,0.72); z-index: 10;
}
.s7-back { font-size: 15px; padding: 3px 10px; white-space: nowrap; }
.s7-location { font-size: 17px; letter-spacing: 0.12em; color: var(--accent-gold); border-color: var(--accent-gold); }
.s7-body { flex: 1; display: flex; min-height: 0; }

.s7-nav {
  width: 200px; flex-shrink: 0; border-right: var(--border-dim);
  background: rgba(10,14,26,0.60); display: flex; flex-direction: column;
  padding: 8px 0;
}
.s7-nav-btn {
  display: flex; align-items: center; gap: 8px; padding: 10px 16px;
  font-family: var(--font-main); font-size: 14px; letter-spacing: 0.06em;
  border: none; background: transparent; color: var(--text-dim);
  cursor: pointer; transition: background 80ms, color 80ms; text-align: left;
  border-left: 3px solid transparent;
}
.s7-nav-btn:hover, .s7-nav-btn:focus-visible { background: rgba(201,162,39,0.06); color: var(--text-cream); outline: none; }
.s7-nav-btn--active { color: var(--text-cream); border-left-color: var(--accent-gold); background: rgba(201,162,39,0.08); }
.s7-nav-icon { font-size: 16px; flex-shrink: 0; width: 18px; text-align: center; }

.s7-content { flex: 1; overflow-y: auto; padding: 20px 24px; }
.s7-content::-webkit-scrollbar { width: 3px; }
.s7-content::-webkit-scrollbar-thumb { background: rgba(201,162,39,0.25); }

.s7-page-content { display: flex; flex-direction: column; gap: 14px; max-width: 620px; }
.s7-title { font-size: 22px; letter-spacing: 0.10em; margin-bottom: 4px; }
.s7-para { font-size: 17px; color: var(--text-dim); line-height: 1.5; }
.s7-divider { height: 1px; border-top: 1px solid rgba(201,162,39,0.15); }
.s7-stat-row { display: flex; justify-content: space-between; font-size: 17px; padding: 4px 0; }
.s7-stat-label { font-size: 15px; }
.s7-stat-val { font-size: 16px; }

.s7-phase { display: flex; gap: 12px; align-items: flex-start; }
.s7-phase-num {
  width: 32px; height: 32px; border: 2px solid;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.s7-phase-info { flex: 1; }
.s7-phase-name { font-size: 18px; letter-spacing: 0.08em; margin-bottom: 4px; }
.s7-phase-text { font-size: 15px; color: var(--text-dim); line-height: 1.4; }

.s7-card-type-row { display: flex; gap: 12px; align-items: flex-start; }
.s7-ctr-badge {
  font-size: 14px; letter-spacing: 0.08em; padding: 2px 10px;
  border: 1px solid; flex-shrink: 0; min-width: 44px; text-align: center;
}
.s7-ctr-text { font-size: 16px; color: var(--text-dim); line-height: 1.4; flex: 1; }

.s7-footer {
  height: 40px; flex-shrink: 0; display: flex; align-items: center; gap: 12px;
  padding: 0 16px; border-top: var(--border-dim); background: rgba(3,6,15,0.75); z-index: 10;
}
.s7-page-indicator { font-size: 16px; }
.s7-prev, .s7-next { font-size: 15px; padding: 3px 10px; }
`;
