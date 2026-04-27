// src/screens/title-b.js — Title B · Information Dense
// Data-rich title screen: live stats, leaderboard, season countdown.
// mount(container) / unmount(container)

const LEADERBOARD = [
  { rank: 1, name: 'PHANTOM VEGA',    clan: 'black-flag',    cards: 58, wins: 24, sol: 0.241 },
  { rank: 2, name: 'IRON WOLF',       clan: 'iron-circle',   cards: 51, wins: 19, sol: 0.183 },
  { rank: 3, name: 'SILK EMPRESS',    clan: 'nameless-silk', cards: 49, wins: 17, sol: 0.162 },
  { rank: 4, name: 'GOLD HAND',       clan: 'bourse',        cards: 47, wins: 15, sol: 0.141 },
  { rank: 5, name: 'HOLLOW REAPER',   clan: 'hollow-blade',  cards: 44, wins: 12, sol: 0.119 },
  { rank: 6, name: 'BLACK COMPASS',   clan: 'black-flag',    cards: 41, wins: 11, sol: 0.098 },
  { rank: 7, name: 'TIDE WARDEN',     clan: 'iron-circle',   cards: 39, wins: 9,  sol: 0.082 },
  { rank: 8, name: 'WHISPER BLADE',   clan: 'nameless-silk', cards: 36, wins: 8,  sol: 0.071 },
];

const CLAN_TEXT = {
  'black-flag':    '#6a9fd8',
  'hollow-blade':  '#e05070',
  'iron-circle':   '#5ab87a',
  'bourse':        '#c9a227',
  'nameless-silk': '#a070e0',
};

const SEASON_END = new Date('2026-05-11T00:00:00Z');

function getCountdown() {
  const now = Date.now();
  const ms = SEASON_END.getTime() - now;
  if (ms <= 0) return { days: 0, hours: 0, mins: 0, secs: 0 };
  const secs = Math.floor(ms / 1000);
  return {
    days:  Math.floor(secs / 86400),
    hours: Math.floor((secs % 86400) / 3600),
    mins:  Math.floor((secs % 3600) / 60),
    secs:  secs % 60,
  };
}

let _ticker = null;

export function mount(container, detail = {}) {
  injectStyle();
  container.innerHTML = buildHTML();
  bindEvents(container);
  _ticker = setInterval(() => {
    const cd = container.querySelector('#tb-cd');
    if (cd) cd.innerHTML = renderCountdown();
  }, 1000);
}

export function unmount(container) {
  if (_ticker) { clearInterval(_ticker); _ticker = null; }
  container.innerHTML = '';
}

/* ── HTML ──────────────────────────────────────────────────── */
function buildHTML() {
  const rows = LEADERBOARD.map(p => {
    const color = CLAN_TEXT[p.clan] ?? '#e8dfc8';
    return `
      <tr class="tb-lb-row${p.rank <= 3 ? ' tb-lb-row--top' : ''}">
        <td class="tb-lb-rank">${p.rank === 1 ? '◈' : p.rank}</td>
        <td class="tb-lb-name" style="color:${color};">${p.name}</td>
        <td class="tb-lb-cards label-gold">${p.cards}</td>
        <td class="tb-lb-wins">${p.wins}W</td>
        <td class="tb-lb-sol label-dim">${p.sol.toFixed(3)}</td>
      </tr>`;
  }).join('');

  return `
<div class="tb-root" role="main" aria-label="Title B — Information Dense">

  <!-- Top strip -->
  <div class="tb-topstrip">
    <span class="label-dim" style="font-size:13px;">SEASON 1 · DEVNET · LIVE</span>
    <span class="tb-live-dot" aria-hidden="true"></span>
    <span class="label-dim" style="font-size:13px;">37 PLAYERS ONLINE</span>
  </div>

  <div class="tb-main">

    <!-- Left: Branding + CTA -->
    <section class="tb-brand" aria-label="Game branding">
      <div class="tb-logo">0×ARK</div>
      <div class="tb-tagline">SUCCESSION WAR OF ELYON</div>
      <div class="tb-sub label-dim">On-chain TCG · ZK · x402 · AI · Solana</div>

      <div class="tb-cta-group">
        <button class="gba-btn gba-btn--primary tb-connect" id="tb-connect" aria-label="Connect wallet">
          ◎ CONNECT WALLET
        </button>
        <button class="gba-btn gba-btn--ghost tb-howtoplay" id="tb-howtoplay" aria-label="How to play">
          ? HOW TO PLAY
        </button>
      </div>

      <!-- Season countdown -->
      <div class="tb-countdown-wrap">
        <div class="label-dim" style="font-size:13px;letter-spacing:0.08em;">SEASON 1 ENDS IN</div>
        <div id="tb-cd">${renderCountdown()}</div>
      </div>

      <!-- Stats strip -->
      <div class="tb-stats">
        <div class="tb-stat-item">
          <div class="tb-stat-num label-gold">60</div>
          <div class="label-dim" style="font-size:13px;">CARDS</div>
        </div>
        <div class="tb-stat-item">
          <div class="tb-stat-num label-gold">5</div>
          <div class="label-dim" style="font-size:13px;">CLANS</div>
        </div>
        <div class="tb-stat-item">
          <div class="tb-stat-num label-gold">0.241</div>
          <div class="label-dim" style="font-size:13px;">TOP SOL</div>
        </div>
      </div>
    </section>

    <!-- Right: Leaderboard + Activity -->
    <section class="tb-data" aria-label="Leaderboard and activity">
      <div class="tb-panel">
        <div class="tb-panel-header">
          <span class="label-gold" style="font-size:16px;letter-spacing:0.10em;">◈ SUCCESSION BOARD</span>
          <span class="chip label-dim" style="font-size:13px;">SEASON 1</span>
        </div>
        <table class="tb-leaderboard" aria-label="Season 1 leaderboard">
          <thead>
            <tr class="tb-lb-head">
              <th>#</th><th>PLAYER</th><th>CARDS</th><th>WINS</th><th>SOL</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <div class="tb-activity-panel">
        <div class="tb-panel-header">
          <span class="label-gold" style="font-size:16px;letter-spacing:0.10em;">⚔ RECENT DUELS</span>
        </div>
        <div class="tb-activity">
          <div class="tb-act-row"><span style="color:#6a9fd8;">PHANTOM VEGA</span><span class="label-dim"> defeated </span><span style="color:#e05070;">HOLLOW REAPER</span><span class="label-dim"> · +2 cards</span></div>
          <div class="tb-act-row"><span style="color:#5ab87a;">IRON WOLF</span><span class="label-dim"> defeated </span><span style="color:#a070e0;">WHISPER BLADE</span><span class="label-dim"> · +1 card</span></div>
          <div class="tb-act-row"><span style="color:#c9a227;">GOLD HAND</span><span class="label-dim"> defeated </span><span style="color:#6a9fd8;">BLACK COMPASS</span><span class="label-dim"> · +1 card</span></div>
        </div>
      </div>
    </section>

  </div>

  <!-- Bottom bar -->
  <div class="tb-bottombar">
    <span class="label-dim" style="font-size:13px;">0xARK · Solana · Program 5i37jW...mN</span>
    <span class="sep">·</span>
    <span class="label-dim" style="font-size:13px;">ZK Groth16 · BN254 · Poseidon</span>
    <button class="gba-btn gba-btn--ghost tb-title-a" id="tb-title-a" style="font-size:13px;padding:2px 10px;margin-left:auto;">
      ◂ TITLE A
    </button>
    <button class="gba-btn gba-btn--ghost tb-title-c" id="tb-title-c" style="font-size:13px;padding:2px 10px;">
      TITLE C ▸
    </button>
  </div>

</div>`;
}

function renderCountdown() {
  const cd = getCountdown();
  return `
    <div class="tb-cd-inner">
      <div class="tb-cd-unit"><div class="tb-cd-val label-gold">${String(cd.days).padStart(2,'0')}</div><div class="label-dim tb-cd-lbl">DAYS</div></div>
      <div class="tb-cd-sep label-gold">:</div>
      <div class="tb-cd-unit"><div class="tb-cd-val label-gold">${String(cd.hours).padStart(2,'0')}</div><div class="label-dim tb-cd-lbl">HRS</div></div>
      <div class="tb-cd-sep label-gold">:</div>
      <div class="tb-cd-unit"><div class="tb-cd-val label-gold">${String(cd.mins).padStart(2,'0')}</div><div class="label-dim tb-cd-lbl">MIN</div></div>
      <div class="tb-cd-sep label-gold">:</div>
      <div class="tb-cd-unit"><div class="tb-cd-val label-gold">${String(cd.secs).padStart(2,'0')}</div><div class="label-dim tb-cd-lbl">SEC</div></div>
    </div>`;
}

/* ── Events ─────────────────────────────────────────────────── */
function bindEvents(container) {
  container.querySelector('#tb-connect').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:title'));
  });
  container.querySelector('#tb-howtoplay').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:howtoplay'));
  });
  container.querySelector('#tb-title-a').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:title'));
  });
  container.querySelector('#tb-title-c').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:title-c'));
  });
}

/* ── Styles ──────────────────────────────────────────────────── */
function injectStyle() {
  if (document.getElementById('style-title-b')) return;
  const el = document.createElement('style');
  el.id = 'style-title-b';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.tb-root {
  position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main); background: var(--bg-deep);
  display: flex; flex-direction: column;
}

/* Top strip */
.tb-topstrip {
  height: 28px; flex-shrink: 0; display: flex; align-items: center; gap: 8px;
  padding: 0 12px; border-bottom: var(--border-dim); background: rgba(3,6,15,0.80);
}
.tb-live-dot {
  width: 6px; height: 6px;
  background: #5ab87a; border-radius: 50%;
  box-shadow: 0 0 6px #5ab87a;
  animation: tb-pulse 2s ease-in-out infinite;
}
@keyframes tb-pulse {
  0%, 100% { opacity: 1; } 50% { opacity: 0.40; }
}

/* Main */
.tb-main { flex: 1; display: flex; min-height: 0; }

/* Brand column */
.tb-brand {
  width: 380px; flex-shrink: 0; border-right: var(--border-dim);
  display: flex; flex-direction: column; justify-content: center;
  padding: 20px 24px; gap: 14px; background: rgba(10,14,26,0.50);
}
.tb-logo {
  font-size: 64px; letter-spacing: 0.06em; color: var(--accent-gold);
  text-shadow: 0 0 20px rgba(201,162,39,0.40);
  line-height: 1;
}
.tb-tagline { font-size: 17px; letter-spacing: 0.14em; color: var(--text-cream); }
.tb-sub { font-size: 14px; letter-spacing: 0.06em; }
.tb-cta-group { display: flex; flex-direction: column; gap: 6px; }
.tb-connect { font-size: 20px; }
.tb-howtoplay { font-size: 16px; }

/* Countdown */
.tb-countdown-wrap { display: flex; flex-direction: column; gap: 4px; }
.tb-cd-inner { display: flex; align-items: center; gap: 6px; }
.tb-cd-unit { display: flex; flex-direction: column; align-items: center; }
.tb-cd-val { font-size: 28px; line-height: 1; }
.tb-cd-lbl { font-size: 11px; letter-spacing: 0.06em; }
.tb-cd-sep { font-size: 26px; line-height: 1; margin-bottom: 12px; }

/* Stats */
.tb-stats { display: flex; gap: 20px; }
.tb-stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.tb-stat-num { font-size: 26px; }

/* Data column */
.tb-data {
  flex: 1; display: flex; flex-direction: column; gap: 0; overflow: hidden;
}
.tb-panel { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.tb-panel-header {
  flex-shrink: 0; height: 36px; display: flex; align-items: center; justify-content: space-between;
  padding: 0 16px; border-bottom: var(--border-dim); background: rgba(3,6,15,0.50);
}

/* Leaderboard */
.tb-leaderboard { width: 100%; border-collapse: collapse; }
.tb-lb-head th {
  padding: 4px 12px; font-size: 13px; letter-spacing: 0.06em;
  color: var(--text-dim); border-bottom: 1px solid rgba(201,162,39,0.15);
  text-align: left; font-weight: normal;
}
.tb-lb-row td { padding: 5px 12px; font-size: 16px; border-bottom: 1px solid rgba(201,162,39,0.06); }
.tb-lb-row--top td { background: rgba(201,162,39,0.04); }
.tb-lb-rank { color: var(--text-dim); font-size: 14px; width: 24px; }
.tb-lb-name { }
.tb-lb-cards { font-size: 15px; }
.tb-lb-wins { font-size: 15px; color: var(--text-dim); }
.tb-lb-sol { font-size: 14px; }

/* Activity */
.tb-activity-panel {
  flex-shrink: 0; border-top: var(--border-dim);
}
.tb-activity { padding: 6px 16px; display: flex; flex-direction: column; gap: 4px; }
.tb-act-row { font-size: 15px; }

/* Bottom bar */
.tb-bottombar {
  height: 36px; flex-shrink: 0; display: flex; align-items: center;
  padding: 0 12px; gap: 0; border-top: var(--border-dim); background: rgba(3,6,15,0.80);
  font-size: 13px;
}
`;
