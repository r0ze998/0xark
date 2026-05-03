// src/screens/m4-victory.js — M4 Victory screen
// Shown when the local player wins a duel.
// mount(container, detail) / unmount(container)

const CARD_SYMBOLS = { '⚔': '⚔', '🛡': '🛡', '◎': '◎' };

const CARD_META = {
  'PHANTOM PISTOL':  { symbol: '⚔', type: 'ATK' },
  "CROW'S EYE":      { symbol: '◎', type: 'SPY' },
  'ANCHOR SHIELD':   { symbol: '🛡', type: 'DEF' },
};

function cardMeta(name) {
  return CARD_META[name] ?? { symbol: '◈', type: '???' };
}

const CLAN_LABELS = {
  'black-flag':    'BLACK FLAG',
  'hollow-blade':  'HOLLOW BLADE',
  'iron-circle':   'IRON CIRCLE',
  'bourse':        'BOURSE',
  'nameless-silk': 'NAMELESS SILK',
};

/* ── Public API ──────────────────────────────────────────── */

export function mount(container, detail = {}) {
  const d = {
    opponent:     detail.opponent     ?? 'IRON COMMANDER',
    opponentClan: detail.opponentClan ?? 'iron-circle',
    cardsWon:     detail.cardsWon     ?? ['PHANTOM PISTOL', "CROW'S EYE"],
    txHash:       detail.txHash       ?? '4xK2mNpQ7rXsT1uV',
    solEarned:    detail.solEarned    ?? 0.005,
  };

  injectStyle();
  container.innerHTML = buildHTML(d);
  bindEvents(container, d);

  // Entry animation — VICTORY title
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const title = container.querySelector('.m4-title');
      if (title) title.classList.add('m4-title--visible');
    });
  });
}

export function unmount(container) {
  container.innerHTML = '';
}

/* ── HTML ────────────────────────────────────────────────── */

function buildHTML(d) {
  const clanLabel = CLAN_LABELS[d.opponentClan] ?? d.opponentClan.toUpperCase();
  const clanClass = `clan-${d.opponentClan}`;

  const cardTrophies = d.cardsWon.map(name => {
    const { symbol, type } = cardMeta(name);
    return `
      <div class="m4-card" role="img" aria-label="${name}">
        <div class="m4-card-type">${type}</div>
        <div class="m4-card-symbol">${symbol}</div>
        <div class="m4-card-name">${name}</div>
      </div>`;
  }).join('');

  const txShort = d.txHash.length > 12
    ? `${d.txHash.slice(0, 4)}...${d.txHash.slice(-4)}`
    : d.txHash;

  const solscanUrl = `https://solscan.io/tx/${d.txHash}?cluster=devnet`;
  const solDisplay = d.solEarned.toFixed(3);

  return `
<div class="m4-root" role="main" aria-label="Victory screen">

  <!-- Radial gold glow -->
  <div class="m4-bg-glow" aria-hidden="true"></div>

  <!-- Top bar -->
  <header class="m4-topbar">
    <span class="label-dim" style="font-size:18px;letter-spacing:0.12em">0xARK</span>
    <span class="chip" style="font-size:14px;letter-spacing:0.08em">VICTORY REPORT</span>
  </header>

  <!-- VICTORY heading -->
  <h1 class="m4-title" aria-label="Victory">VICTORY</h1>

  <!-- Subtitle: opponent -->
  <div class="m4-subtitle">
    <span>YOU DEFEATED&nbsp;</span>
    <span class="${clanClass}">${d.opponent}</span>
    <span class="chip m4-clan-badge ${clanClass}" aria-label="Clan: ${clanLabel}">${clanLabel}</span>
  </div>

  <!-- Cards captured -->
  <section class="m4-cards-section" aria-label="Cards captured">
    <div class="m4-section-label">CARDS CAPTURED</div>
    <div class="m4-card-row">${cardTrophies}</div>
    <div class="m4-cards-total label-gold">+${d.cardsWon.length} CARD${d.cardsWon.length !== 1 ? 'S' : ''} TO COLLECTION</div>
  </section>

  <!-- On-chain TX -->
  <div class="m4-tx-row" aria-label="Transaction details">
    <span class="label-dim" style="font-size:14px;letter-spacing:0.1em">TX HASH</span>
    <span class="mono m4-tx-hash">${txShort}</span>
    <button class="gba-btn gba-btn--ghost m4-btn-solscan" id="btn-solscan"
            aria-label="View transaction on Solscan">
      VIEW ON SOLSCAN ↗
    </button>
  </div>

  <!-- Bottom actions -->
  <div class="m4-actions" role="group" aria-label="Post-game actions">
    <button class="gba-btn gba-btn--primary m4-btn-play-again" id="btn-play-again">
      ► PLAY AGAIN
    </button>
    <button class="gba-btn m4-btn-lobby" id="btn-lobby">
      RETURN TO PLAZA
    </button>
    <button class="gba-btn gba-btn--ghost m4-btn-collection" id="btn-collection">
      VIEW COLLECTION
    </button>
  </div>

  <!-- Footer -->
  <footer class="m4-footer" aria-label="Session earnings">
    <span class="label-gold">+${solDisplay} SOL EARNED</span>
    <span class="sep">·</span>
    <span class="label-dim">DEVNET</span>
  </footer>

</div>`;
}

/* ── Events ──────────────────────────────────────────────── */

function bindEvents(container, d) {
  container.querySelector('#btn-play-again').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:matchmaking'));
  });

  container.querySelector('#btn-lobby').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:lobby'));
  });

  container.querySelector('#btn-collection').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:deck-editor'));
  });

  container.querySelector('#btn-solscan').addEventListener('click', () => {
    const url = `https://solscan.io/tx/${d.txHash}?cluster=devnet`;
    window.open(url, '_blank', 'noopener,noreferrer');
  });
}

/* ── Style injection ─────────────────────────────────────── */

function injectStyle() {
  if (document.getElementById('style-m4-victory')) return;
  const el = document.createElement('style');
  el.id = 'style-m4-victory';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
/* M4 Victory screen */
.m4-root {
  position: relative;
  width: 1024px;
  height: 576px;
  overflow: hidden;
  font-family: var(--font-main);
  background: var(--bg-deep);
}

/* ── Radial gold glow ── */
.m4-bg-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse 55% 50% at 50% 48%,
    rgba(201, 162, 39, 0.13) 0%,
    rgba(201, 162, 39, 0.05) 45%,
    transparent 75%
  );
  z-index: 0;
}

/* ── Top bar ── */
.m4-topbar {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: var(--border-dim);
  background: rgba(3, 6, 15, 0.6);
  z-index: 10;
}

/* ── VICTORY heading ── */
.m4-title {
  position: absolute;
  top: 60px;
  left: 0; right: 0;
  text-align: center;
  font-family: var(--font-main);
  font-size: 96px;
  line-height: 1;
  color: var(--accent-gold);
  letter-spacing: 0.08em;
  text-shadow:
    0 0 40px rgba(201, 162, 39, 0.6),
    0 0 80px rgba(201, 162, 39, 0.25),
    3px 3px 0 #000;
  z-index: 5;
  /* entry animation start state */
  opacity: 0;
  transform: scale(1.5);
  transition: opacity 0.6s ease-out, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.m4-title--visible {
  opacity: 1;
  transform: scale(1);
}

/* ── Subtitle ── */
.m4-subtitle {
  position: absolute;
  top: 170px;
  left: 0; right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 24px;
  letter-spacing: 0.04em;
  color: var(--accent-red);
  z-index: 5;
}

.m4-clan-badge {
  font-size: 13px;
  padding: 2px 8px;
}

/* ── Cards section ── */
.m4-cards-section {
  position: absolute;
  top: 220px;
  left: 0; right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 5;
}

.m4-section-label {
  font-size: 16px;
  letter-spacing: 0.14em;
  color: var(--text-dim);
}

.m4-card-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

/* Individual card trophy */
.m4-card {
  width: 72px;
  height: 100px;
  border: 2px solid var(--accent-gold);
  background: var(--bg-mid);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 6px 4px 5px;
  box-shadow: 0 0 10px rgba(201, 162, 39, 0.2);
}

.m4-card-type {
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  align-self: flex-end;
}

.m4-card-symbol {
  font-size: 28px;
  line-height: 1;
}

.m4-card-name {
  font-size: 10px;
  letter-spacing: 0.05em;
  color: var(--text-cream);
  text-align: center;
  line-height: 1.2;
  word-break: break-word;
}

.m4-cards-total {
  font-size: 18px;
  letter-spacing: 0.06em;
}

/* ── TX row ── */
.m4-tx-row {
  position: absolute;
  top: 390px;
  left: 0; right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 5;
}

.m4-tx-hash {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: var(--text-dim);
  letter-spacing: 0.05em;
}

.m4-btn-solscan {
  font-size: 14px;
  padding: 4px 12px;
  letter-spacing: 0.06em;
}

/* ── Bottom actions ── */
.m4-actions {
  position: absolute;
  top: 460px;
  left: 0; right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 10;
}

/* ── Footer ── */
.m4-footer {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  letter-spacing: 0.06em;
  background: rgba(3, 6, 15, 0.75);
  border-top: var(--border-dim);
  white-space: nowrap;
  z-index: 10;
}
`;
