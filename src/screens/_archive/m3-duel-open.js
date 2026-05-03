// src/screens/m3-duel-open.js — M3 Duel Opening · ZK Commitment Phase
// mount(container, { round, maxRounds, playerName, playerClan }) / unmount(container)

const CLAN_SYMBOLS = {
  'black-flag':    '⚑',
  'hollow-blade':  '⚔',
  'iron-circle':   '◎',
  'bourse':        '◈',
  'nameless-silk': '◇',
};

const SPOKE_LABELS = ['POSEIDON', 'GROTH16', 'BN254', 'CIRCOM'];

let _commitTimer = null;

export function mount(container, detail = {}) {
  injectStyle();
  const ctx = {
    round:      detail.round      ?? 1,
    maxRounds:  detail.maxRounds  ?? 5,
    playerName: detail.playerName ?? 'CAPT. VEGA',
    playerClan: detail.playerClan ?? 'black-flag',
    hash:       mockHash(),
  };
  container.innerHTML = buildHTML(ctx);
  bindEvents(container, ctx);
}

export function unmount(container) {
  if (_commitTimer) { clearTimeout(_commitTimer); _commitTimer = null; }
  container.innerHTML = '';
}

/* ── Helpers ─────────────────────────────────────────────── */
function mockHash() {
  return Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function clanSymbol(clan) {
  return CLAN_SYMBOLS[clan] ?? '◆';
}

/* ── HTML ────────────────────────────────────────────────── */
function buildHTML(ctx) {
  const { round, maxRounds, playerName, playerClan, hash } = ctx;

  const playerCards = buildCardFan('player', playerClan, 4, false);
  const opponentCards = buildCardFan('opponent', 'unknown', 4, true);
  const spokes = buildSpokes();

  return `
<div class="m3-root" role="main" aria-label="ZK commitment phase">

  <header class="m3-topbar" role="banner">
    <div class="m3-player flex-row gap-8">
      <span class="chip m3-clan-badge m3-clan-badge--${playerClan}">${clanSymbol(playerClan)}</span>
      <span class="m3-player-name">${playerName}</span>
    </div>
    <div class="chip m3-round-label">
      ZK COMMIT <span class="sep">·</span>
      ROUND <span class="label-gold">${round}</span>
      <span class="sep">/</span>
      <span class="label-dim">${maxRounds}</span>
    </div>
    <div class="m3-opponent flex-row gap-8" aria-label="Opponent identity hidden">
      <span class="m3-opponent-name label-dim">???.????</span>
      <span class="chip m3-clan-badge m3-clan-badge--unknown">?</span>
    </div>
  </header>

  <div class="m3-stage" aria-label="Commitment arena">

    ${playerCards}

    <div class="m3-hex-zone" aria-hidden="true">
      <div class="m3-spokes" aria-hidden="true">${spokes}</div>
      <div class="m3-hex" id="m3-hex">
        <div class="m3-hex-ring"></div>
        <div class="m3-hex-inner">
          <span class="m3-hex-label" id="m3-hex-label">COMMIT</span>
        </div>
      </div>
    </div>

    ${opponentCards}

  </div>

  <div class="m3-hash-row" aria-label="Cryptographic commitment hash">
    <span class="label-dim m3-hash-prefix">COMMIT HASH:</span>
    <span class="mono m3-hash-val label-gold" id="m3-hash-val">${hash}...</span>
    <span class="label-dim m3-hash-suffix">· POSEIDON/BN254</span>
  </div>

  <footer class="m3-footer">
    <button class="gba-btn gba-btn--primary m3-commit-btn" id="m3-commit-btn"
      aria-label="Commit your hand to the ZK circuit">
      ▶ COMMIT HAND
    </button>
    <div class="m3-status label-dim" id="m3-status" aria-live="polite">~2s ON-CHAIN</div>
  </footer>

</div>`;
}

function buildCardFan(side, clan, count, faceDown) {
  const symbol = faceDown ? '?' : clanSymbol(clan);
  const rotations = count === 4 ? [-14, -5, 5, 14] : [-18, -8, 0, 8, 18];
  const rots = rotations.slice(0, count);
  const cards = rots.map((r, i) => `
    <div class="m3-card m3-card--${side}" style="transform: rotate(${r}deg) translateY(${Math.abs(r) * 0.8}px);"
      aria-hidden="true">
      <span class="m3-card-sym">${symbol}</span>
    </div>`).join('');

  const label = faceDown ? 'OPPONENT' : 'YOUR HAND';
  return `
<div class="m3-hand m3-hand--${side}" aria-label="${label} cards">
  ${cards}
</div>`;
}

function buildSpokes() {
  // 4 spokes at 45° intervals (NE, SE, SW, NW diagonals)
  const angles = [45, 135, 225, 315];
  return SPOKE_LABELS.map((label, i) => {
    const angle = angles[i];
    const rad = (angle * Math.PI) / 180;
    const len = 110;
    const x2 = Math.round(50 + Math.cos(rad) * len);
    const y2 = Math.round(50 + Math.sin(rad) * len);
    const lx = Math.round(50 + Math.cos(rad) * (len + 22));
    const ly = Math.round(50 + Math.sin(rad) * (len + 22));
    return `
  <svg class="m3-spoke m3-spoke--${i}" viewBox="-80 -80 260 260"
    preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <line x1="50" y1="50" x2="${x2}" y2="${y2}"
      stroke="var(--accent-gold)" stroke-width="1" opacity="0.4"/>
    <text x="${lx}" y="${ly}" font-family="VT323, monospace" font-size="13"
      fill="rgba(201,162,39,0.55)" text-anchor="middle" dominant-baseline="middle"
      letter-spacing="0.06em">${label}</text>
  </svg>`;
  }).join('');
}

/* ── Events ──────────────────────────────────────────────── */
function bindEvents(container, ctx) {
  const btn = container.querySelector('#m3-commit-btn');
  btn.addEventListener('click', () => handleCommit(container, ctx));
}

function handleCommit(container, ctx) {
  const btn    = container.querySelector('#m3-commit-btn');
  const label  = container.querySelector('#m3-hex-label');
  const status = container.querySelector('#m3-status');
  const hex    = container.querySelector('#m3-hex');

  btn.disabled = true;
  btn.textContent = '... COMMITTING';
  label.textContent = 'COMMITTING...';
  hex.classList.add('m3-hex--active');
  status.textContent = 'BROADCASTING TX...';

  _commitTimer = setTimeout(() => {
    _commitTimer = null;
    hex.classList.remove('m3-hex--active');
    hex.classList.add('m3-hex--done');
    label.textContent = 'SEALED';
    status.textContent = 'WAITING FOR OPPONENT...';
    btn.textContent = '✓ COMMITTED';

    document.dispatchEvent(new CustomEvent('zk:committed', {
      detail: { hash: ctx.hash },
    }));
  }, 1500);
}

/* ── Styles ──────────────────────────────────────────────── */
function injectStyle() {
  if (document.getElementById('style-m3-duel-open')) return;
  const el = document.createElement('style');
  el.id = 'style-m3-duel-open';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
/* M3 Duel Opening — ZK Commitment */
@keyframes m3-spin  { to { transform: rotate(360deg); } }
@keyframes m3-pulse { 0%,100% { opacity:0.35; } 50% { opacity:0.85; } }
@keyframes m3-fade-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }

.m3-root {
  position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main); background: var(--bg-deep);
  display: flex; flex-direction: column;
}

/* ── Top bar ── */
.m3-topbar { height:44px; flex-shrink:0; display:flex; align-items:center; justify-content:space-between; padding:0 16px; gap:12px; border-bottom:var(--border-dim); background:rgba(3,6,15,0.72); z-index:10; }
.m3-player-name, .m3-opponent-name { font-size:20px; letter-spacing:0.06em; white-space:nowrap; }
.m3-player-name { color:var(--text-cream); }
.m3-opponent-name { color:var(--text-dim); }
.m3-round-label { font-size:17px; letter-spacing:0.10em; white-space:nowrap; }
.m3-clan-badge { font-size:16px; padding:2px 8px; line-height:1.3; }
.m3-clan-badge--black-flag    { color:#6a9fd8; border-color:rgba(106,159,216,0.4); }
.m3-clan-badge--hollow-blade  { color:#e05070; border-color:rgba(224,80,112,0.4); }
.m3-clan-badge--iron-circle   { color:#5ab87a; border-color:rgba(90,184,122,0.4); }
.m3-clan-badge--bourse        { color:var(--accent-gold); border-color:rgba(201,162,39,0.4); }
.m3-clan-badge--nameless-silk { color:#a070e0; border-color:rgba(160,112,224,0.4); }
.m3-clan-badge--unknown       { color:var(--text-dim); border-color:rgba(232,223,200,0.2); }

/* ── Stage ── */
.m3-stage { flex:1; display:flex; align-items:center; justify-content:center; position:relative; min-height:0; padding:0 32px; }

/* ── Card fan ── */
.m3-hand { width:160px; flex-shrink:0; height:140px; display:flex; align-items:center; justify-content:center; position:relative; }
.m3-card { position:absolute; width:52px; height:76px; background:var(--bg-mid); border:var(--border-gold); display:flex; align-items:center; justify-content:center; transform-origin:center bottom; }
.m3-card--opponent { border-color:rgba(201,162,39,0.35); background:#101422; }
.m3-card-sym { font-size:22px; color:var(--accent-gold); opacity:0.70; }
.m3-card--opponent .m3-card-sym { opacity:0.30; }

/* ── Hex zone ── */
.m3-hex-zone { position:relative; width:320px; flex-shrink:0; height:300px; display:flex; align-items:center; justify-content:center; }
.m3-spokes { position:absolute; inset:0; pointer-events:none; }
.m3-spoke { position:absolute; width:320px; height:300px; top:0; left:0; animation:m3-pulse 2.4s ease-in-out infinite; }
.m3-spoke--0 { animation-delay:0s; } .m3-spoke--1 { animation-delay:0.6s; } .m3-spoke--2 { animation-delay:1.2s; } .m3-spoke--3 { animation-delay:1.8s; }
.m3-hex { position:relative; z-index:2; width:180px; height:200px; clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%); background:var(--bg-deep); display:flex; align-items:center; justify-content:center; outline:2px solid var(--accent-gold); outline-offset:-2px; transition:filter 300ms; }
.m3-hex--active { filter:brightness(1.25) drop-shadow(0 0 10px rgba(201,162,39,0.6)); }
.m3-hex--done   { filter:brightness(1.1)  drop-shadow(0 0  6px rgba(201,162,39,0.4)); }
.m3-hex-ring { position:absolute; width:110px; height:110px; border-radius:50%; border:1px dashed var(--accent-gold); opacity:0.55; animation:m3-spin 3s linear infinite; }
.m3-hex-inner { position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; }
.m3-hex-label { font-size:20px; letter-spacing:0.12em; color:var(--accent-gold); white-space:nowrap; animation:m3-fade-in 300ms ease both; }

/* ── Hash row ── */
.m3-hash-row { height:28px; flex-shrink:0; display:flex; align-items:center; justify-content:center; gap:10px; padding:0 16px; border-top:var(--border-dim); background:rgba(3,6,15,0.55); font-size:15px; white-space:nowrap; letter-spacing:0.06em; }
.m3-hash-val { font-size:15px; letter-spacing:0.10em; }

/* ── Footer ── */
.m3-footer { height:64px; flex-shrink:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; padding:0 16px; border-top:var(--border-dim); background:rgba(3,6,15,0.70); z-index:10; }
.m3-commit-btn { font-size:24px; padding:6px 48px; letter-spacing:0.10em; min-width:280px; }
.m3-status { font-size:15px; letter-spacing:0.08em; }
`;
