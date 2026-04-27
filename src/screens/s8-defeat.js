// src/screens/s8-defeat.js — S8 Defeat screen
// Mirror of M4 Victory — shown when the local player loses.
// mount(container, { opponent, opponentClan, cardsLost, txHash, solLost }) / unmount(container)

const CARD_META = {
  'PHANTOM PISTOL':  { symbol: '⚔', type: 'ATK' },
  "CROW'S EYE":      { symbol: '◎', type: 'SPY' },
  'ANCHOR SHIELD':   { symbol: '🛡', type: 'DEF' },
  'IRON FIST':       { symbol: '⚔', type: 'ATK' },
  'SHADOW CLOAK':    { symbol: '◎', type: 'SPY' },
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

export function mount(container, detail = {}) {
  const d = {
    opponent:     detail.opponent     ?? 'IRON COMMANDER',
    opponentClan: detail.opponentClan ?? 'iron-circle',
    cardsLost:    detail.cardsLost    ?? ['PHANTOM PISTOL'],
    txHash:       detail.txHash       ?? '7zN3pKqRsXt2mVwA',
    solLost:      detail.solLost      ?? 0.005,
  };

  injectStyle();
  container.innerHTML = buildHTML(d);
  bindEvents(container, d);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const title = container.querySelector('.s8-title');
      if (title) title.classList.add('s8-title--visible');
    });
  });
}

export function unmount(container) {
  container.innerHTML = '';
}

/* ── HTML ──────────────────────────────────────────────────── */
function buildHTML(d) {
  const clanLabel = CLAN_LABELS[d.opponentClan] ?? d.opponentClan.toUpperCase();
  const clanClass = `clan-${d.opponentClan}`;

  const lostCards = d.cardsLost.map(name => {
    const { symbol, type } = cardMeta(name);
    return `
      <div class="s8-card" role="img" aria-label="${name}">
        <div class="s8-card-type">${type}</div>
        <div class="s8-card-symbol">${symbol}</div>
        <div class="s8-card-name">${name}</div>
      </div>`;
  }).join('');

  const txShort = d.txHash.length > 12
    ? `${d.txHash.slice(0, 4)}...${d.txHash.slice(-4)}`
    : d.txHash;
  const solDisplay = d.solLost.toFixed(3);
  const solscanUrl = `https://solscan.io/tx/${d.txHash}?cluster=devnet`;

  return `
<div class="s8-root" role="main" aria-label="Defeat screen">

  <!-- Dark radial backdrop -->
  <div class="s8-bg-glow" aria-hidden="true"></div>
  <div class="s8-bg-rain" aria-hidden="true"></div>

  <!-- DEFEAT title -->
  <div class="s8-title-wrap flex-center">
    <h1 class="s8-title" aria-live="polite">DEFEAT</h1>
  </div>

  <!-- Main content -->
  <div class="s8-content">

    <!-- Opponent info -->
    <section class="s8-opponent panel" aria-label="Opponent">
      <div class="s8-opp-label label-dim">DEFEATED BY</div>
      <div class="s8-opp-name">${d.opponent}</div>
      <div class="s8-opp-clan ${clanClass}">${clanLabel}</div>
    </section>

    <!-- Cards seized -->
    <section class="s8-seized" aria-label="Cards seized by opponent">
      <div class="s8-seized-label">
        <span class="label-dim">SEIZED BY OPPONENT</span>
        <span class="label-red">${d.cardsLost.length} CARD${d.cardsLost.length !== 1 ? 'S' : ''}</span>
      </div>
      <div class="s8-cards-row" role="list">
        ${lostCards}
      </div>
    </section>

    <!-- Hero placeholder: Bloodhand -->
    <div class="s8-hero-wrap" aria-hidden="true">
      <div class="s8-hero-placeholder">
        <span class="s8-hero-label">BLOODHAND</span>
      </div>
    </div>

    <!-- TX row -->
    <div class="s8-tx flex-row gap-8">
      <span class="label-dim">TX</span>
      <span class="mono">${txShort}</span>
      <a class="s8-tx-link gba-btn gba-btn--ghost" href="${solscanUrl}" target="_blank" rel="noopener"
         aria-label="View transaction on Solscan">SOLSCAN ↗</a>
    </div>

    <!-- SOL lost -->
    <div class="s8-sol-row flex-row gap-8">
      <span class="label-dim">LOST</span>
      <span class="s8-sol-value label-red">−${solDisplay} SOL</span>
    </div>

  </div>

  <!-- Actions -->
  <div class="s8-actions flex-row gap-16">
    <button class="gba-btn s8-rematch" id="s8-rematch" aria-label="Rematch">↻ REMATCH</button>
    <button class="gba-btn gba-btn--ghost s8-plaza" id="s8-plaza" aria-label="Return to Crown Plaza">◂ CROWN PLAZA</button>
    <button class="gba-btn gba-btn--ghost s8-menu" id="s8-menu" aria-label="Captain's Cabin">≡ CABIN</button>
  </div>

</div>`;
}

/* ── Events ─────────────────────────────────────────────────── */
function bindEvents(container, d) {
  container.querySelector('#s8-rematch').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:matchmaking'));
  });
  container.querySelector('#s8-plaza').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:lobby'));
  });
  container.querySelector('#s8-menu').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:menu'));
  });
}

/* ── Styles ──────────────────────────────────────────────────── */
function injectStyle() {
  if (document.getElementById('style-s8-defeat')) return;
  const el = document.createElement('style');
  el.id = 'style-s8-defeat';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.s8-root {
  position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main); background: var(--bg-deep);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0;
}

/* BG atmosphere */
.s8-bg-glow {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse 60% 50% at 50% 45%, rgba(214,59,59,0.11) 0%, transparent 70%);
}
.s8-bg-rain {
  position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(
    175deg,
    transparent, transparent 18px,
    rgba(214,59,59,0.03) 18px, rgba(214,59,59,0.03) 19px
  );
}

/* DEFEAT title */
.s8-title-wrap {
  position: absolute; top: 28px; left: 0; right: 0; pointer-events: none;
}
.s8-title {
  font-size: 84px; letter-spacing: 0.14em; color: var(--accent-red);
  text-shadow: 0 0 24px rgba(214,59,59,0.55), 0 2px 0 #000;
  opacity: 0; transform: scale(1.4);
  transition: opacity 500ms ease-out, transform 500ms ease-out;
}
.s8-title--visible { opacity: 1; transform: scale(1); }

/* Content area */
.s8-content {
  position: relative; z-index: 2; margin-top: 110px;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  width: 100%;
}

/* Opponent panel */
.s8-opponent {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 10px 32px; border-color: var(--accent-red);
}
.s8-opp-label { font-size: 14px; letter-spacing: 0.10em; }
.s8-opp-name { font-size: 26px; letter-spacing: 0.10em; }
.s8-opp-clan { font-size: 16px; letter-spacing: 0.08em; }

/* Cards seized */
.s8-seized { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.s8-seized-label { display: flex; gap: 16px; font-size: 15px; letter-spacing: 0.08em; }
.s8-cards-row { display: flex; gap: 10px; }

/* Card tile */
.s8-card {
  width: 72px; height: 100px;
  background: rgba(214,59,59,0.12); border: 2px solid var(--accent-red);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; padding: 4px;
}
.s8-card-type { font-size: 11px; letter-spacing: 0.06em; color: var(--accent-red); }
.s8-card-symbol { font-size: 26px; line-height: 1; }
.s8-card-name { font-size: 11px; letter-spacing: 0.04em; text-align: center; line-height: 1.2; color: var(--text-dim); }

/* Hero placeholder */
.s8-hero-wrap {
  position: absolute; right: 60px; top: 80px;
}
.s8-hero-placeholder {
  width: 80px; height: 120px;
  background: rgba(214,59,59,0.08); border: 1px dashed rgba(214,59,59,0.35);
  display: flex; align-items: flex-end; justify-content: center; padding-bottom: 6px;
}
.s8-hero-label { font-size: 11px; letter-spacing: 0.04em; color: rgba(214,59,59,0.50); }

/* TX / SOL rows */
.s8-tx { font-size: 16px; }
.s8-tx-link { font-size: 13px; padding: 2px 8px; }
.mono { font-family: 'Courier New', monospace; font-size: 13px; color: var(--text-dim); }
.s8-sol-row { font-size: 18px; }
.s8-sol-value { font-size: 22px; }

/* Actions */
.s8-actions {
  position: absolute; bottom: 20px; left: 0; right: 0;
  display: flex; justify-content: center; gap: 16px; z-index: 2;
}
.s8-rematch { font-size: 20px; border-color: var(--accent-red); }
.s8-rematch:hover { background: var(--accent-red); color: #fff; }
`;
