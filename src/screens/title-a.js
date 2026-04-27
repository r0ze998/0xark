// src/screens/title-a.js — Title A · Cinematic Hero (Wave 1)
// Entry point. Wallet connect → dispatches 'nav:lobby'
// Hero sprite: placeholder until Hero Sheet Pack v1 arrives

const SEASON_LAUNCH = new Date('2026-05-11T00:00:00Z');
const STATS = { tests: 408, nfts: 60, cu: '94k', rounds: '1,247' };
const CLANS = [
  { id: 'black-flag',    label: 'BLACK FLAG',    symbol: '⚑' },
  { id: 'hollow-blade',  label: 'HOLLOW BLADE',  symbol: '⚔' },
  { id: 'iron-circle',   label: 'IRON CIRCLE',   symbol: '◎' },
  { id: 'bourse',        label: 'BOURSE',         symbol: '◈' },
  { id: 'nameless-silk', label: 'NAMELESS SILK',  symbol: '◇' },
];

let _tickerId = null;

export function mount(container) {
  injectStyle();
  container.innerHTML = buildHTML();
  bindEvents(container);
  startCountdown(container);
}

export function unmount(container) {
  if (_tickerId) { clearInterval(_tickerId); _tickerId = null; }
  container.innerHTML = '';
}

/* ── HTML ────────────────────────────────────────────────── */
function buildHTML() {
  const banners = CLANS.map(c => `
    <div class="ta-banner ta-banner--${c.id}" role="presentation">
      <span class="ta-banner-sym">${c.symbol}</span>
      <span class="ta-banner-name">${c.label}</span>
    </div>`).join('');

  return `
<div class="ta-root" role="main" aria-label="0xARK title screen">

  <!-- Background layers -->
  <div class="ta-bg" aria-hidden="true">
    <div class="ta-sky"></div>
    <div class="ta-horizon-glow"></div>
    <div class="ta-stars"></div>
    <div class="ta-moon"></div>
    <div class="ta-cityline"></div>
  </div>

  <!-- Top bar -->
  <header class="ta-topbar">
    <span class="ta-wordmark label-dim">0xARK</span>
    <div class="chip ta-countdown" aria-label="Days until Season 1">
      <span class="ta-cd-num">14</span>
      <span class="ta-cd-label"> DAYS · SEASON 1</span>
    </div>
  </header>

  <!-- Center hero block -->
  <div class="ta-center" aria-hidden="true">
    <h1 class="ta-logo">0×ARK</h1>
    <p class="ta-subtitle">◆ SUCCESSION WAR OF ELYON ◆</p>

    <!-- Capt. Vega — placeholder, replace with Hero Sheet Pack v1 -->
    <div class="ta-hero-sprite" title="Capt. Vega (sprite pending)">
      <div class="ta-sprite-ph">
        <span class="ta-sprite-name">CAPT. VEGA</span>
      </div>
    </div>
  </div>

  <!-- Clan banners -->
  <div class="ta-banners" aria-label="Five clans of Elyon">
    ${banners}
  </div>

  <!-- CTA row -->
  <div class="ta-ctas" role="group" aria-label="Main actions">
    <button class="gba-btn gba-btn--primary ta-btn-connect" id="btn-connect">
      ▸ CONNECT WALLET
    </button>
    <button class="gba-btn ta-btn-howto" id="btn-howto">
      HOW TO PLAY
    </button>
    <button class="gba-btn gba-btn--ghost ta-btn-spectate" id="btn-spectate">
      SPECTATOR
    </button>
  </div>

  <!-- Credibility strip -->
  <footer class="ta-footer" aria-label="Project stats">
    <span>${STATS.tests} TESTS</span>
    <span class="sep">·</span>
    <span>${STATS.nfts} NFTs</span>
    <span class="sep">·</span>
    <span>${STATS.cu} AVG CU</span>
    <span class="sep">·</span>
    <span>${STATS.rounds} ROUNDS</span>
    <span class="sep">·</span>
    <span class="label-dim">SOLANA DEVNET</span>
  </footer>

</div>`;
}

/* ── Events ──────────────────────────────────────────────── */
function bindEvents(container) {
  container.querySelector('#btn-connect').addEventListener('click', () => handleConnect(container));
  container.querySelector('#btn-howto').addEventListener('click', handleHowToPlay);
  container.querySelector('#btn-spectate').addEventListener('click', handleSpectate);
}

async function handleConnect(container) {
  const btn = container.querySelector('#btn-connect');

  if (!window.solana?.isPhantom) {
    btn.textContent = '✗ INSTALL PHANTOM';
    setTimeout(() => { btn.textContent = '▸ CONNECT WALLET'; }, 3000);
    window.open('https://phantom.app', '_blank', 'noopener');
    return;
  }

  btn.textContent = '... CONNECTING';
  btn.disabled = true;

  try {
    const resp = await window.solana.connect();
    const pubkey = resp.publicKey.toString();
    document.dispatchEvent(new CustomEvent('wallet:connected', { detail: { pubkey } }));
  } catch {
    btn.textContent = '▸ CONNECT WALLET';
    btn.disabled = false;
  }
}

function handleHowToPlay() {
  document.dispatchEvent(new CustomEvent('nav:howtoplay'));
}

function handleSpectate() {
  document.dispatchEvent(new CustomEvent('nav:lobby', { detail: { spectator: true } }));
}

/* ── Countdown ───────────────────────────────────────────── */
function startCountdown(container) {
  function tick() {
    const el = container.querySelector('.ta-cd-num');
    if (!el) { clearInterval(_tickerId); return; }
    const days = Math.max(0, Math.ceil((SEASON_LAUNCH - Date.now()) / 86_400_000));
    el.textContent = days;
  }
  tick();
  _tickerId = setInterval(tick, 60_000);
}

/* ── Styles ──────────────────────────────────────────────── */
function injectStyle() {
  if (document.getElementById('style-title-a')) return;
  const el = document.createElement('style');
  el.id = 'style-title-a';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
/* Title A — Cinematic Hero */
.ta-root {
  position: relative;
  width: 1024px;
  height: 576px;
  overflow: hidden;
  font-family: var(--font-main);
}

/* ── Background ── */
.ta-bg { position: absolute; inset: 0; pointer-events: none; }

.ta-sky {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    #03060f 0%,
    #080d1c 18%,
    #0a1020 35%,
    #0d1228 55%,
    #0f1830 75%,
    #081018 100%
  );
}

.ta-horizon-glow {
  position: absolute;
  left: 0; right: 0;
  bottom: 130px;
  height: 120px;
  background: radial-gradient(
    ellipse 60% 100% at 68% 100%,
    rgba(180, 110, 20, 0.22) 0%,
    rgba(100, 55, 10, 0.10) 50%,
    transparent 100%
  );
}

.ta-moon {
  position: absolute;
  top: 52px;
  right: 192px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f0e8c0;
  box-shadow:
    0 0 0 2px #0a0e1a,
    0 0 18px rgba(240, 232, 192, 0.55),
    0 0 40px rgba(201, 162, 39, 0.20);
}

/* 8-point star field via box-shadow */
.ta-stars {
  position: absolute;
  top: 8px; left: 8px;
  width: 2px; height: 2px;
  background: #e8dfc8;
  box-shadow:
    40px 18px #d0c8a8, 120px 32px #c0b890, 200px 12px #e0d8c0,
    310px 44px #d8d0b8, 390px 8px #c8c0a0, 480px 28px #e0d8c0,
    560px 16px #d0c8a8, 640px 38px #c8c0a0, 720px 10px #e8dfc8,
    800px 30px #d8d0b8, 880px 14px #c0b890, 950px 24px #d0c8a8,
    60px 55px #c8c0a0,  150px 68px #d0c8a8, 260px 60px #c0b890,
    350px 75px #d8d0b8, 440px 50px #e0d8c0, 530px 70px #c8c0a0,
    620px 45px #d0c8a8, 710px 62px #c0b890, 800px 58px #d8d0b8,
    890px 48px #e8dfc8, 980px 66px #c8c0a0;
}

/* Crown Plaza silhouette */
.ta-cityline {
  position: absolute;
  bottom: 108px;
  left: 0; right: 0;
  height: 90px;
  background:
    /* Tower spires using steps */
    linear-gradient(to bottom,
      transparent 0px,
      transparent 10px,
      #06090f 10px,
      #06090f 90px
    );
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1024' height='90' viewBox='0 0 1024 90'%3E%3Cpolygon fill='black' points='0,90 0,50 40,50 40,30 60,30 60,50 90,50 90,35 110,35 110,50 140,50 140,20 160,20 160,50 200,50 200,40 220,40 220,50 270,50 270,15 290,15 290,50 340,50 340,38 360,38 360,50 400,50 400,25 416,10 432,25 432,50 480,50 480,40 500,40 500,50 550,50 550,28 570,28 570,50 610,50 610,42 630,42 630,50 680,50 680,18 700,18 700,50 750,50 750,35 770,35 770,50 820,50 820,45 840,45 840,50 890,50 890,28 910,28 910,50 960,50 960,38 1024,38 1024,90'/%3E%3C/svg%3E");
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1024' height='90' viewBox='0 0 1024 90'%3E%3Cpolygon fill='black' points='0,90 0,50 40,50 40,30 60,30 60,50 90,50 90,35 110,35 110,50 140,50 140,20 160,20 160,50 200,50 200,40 220,40 220,50 270,50 270,15 290,15 290,50 340,50 340,38 360,38 360,50 400,50 400,25 416,10 432,25 432,50 480,50 480,40 500,40 500,50 550,50 550,28 570,28 570,50 610,50 610,42 630,42 630,50 680,50 680,18 700,18 700,50 750,50 750,35 770,35 770,50 820,50 820,45 840,45 840,50 890,50 890,28 910,28 910,50 960,50 960,38 1024,38 1024,90'/%3E%3C/svg%3E");
  mask-size: 1024px 90px;
  -webkit-mask-size: 1024px 90px;
  mask-repeat: no-repeat;
  -webkit-mask-repeat: no-repeat;
}

/* ── Top bar ── */
.ta-topbar {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: var(--border-dim);
  background: rgba(3, 6, 15, 0.6);
  z-index: 10;
}

.ta-wordmark {
  font-size: 18px;
  letter-spacing: 0.12em;
}

.ta-countdown {
  font-size: 16px;
}

.ta-cd-num {
  color: var(--accent-gold);
  font-size: 20px;
}

/* ── Center hero ── */
.ta-center {
  position: absolute;
  top: 44px;
  left: 0; right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 32px;
  z-index: 5;
}

.ta-logo {
  font-size: 96px;
  line-height: 1;
  color: var(--accent-gold);
  letter-spacing: 0.08em;
  text-shadow:
    0 0 30px rgba(201, 162, 39, 0.45),
    2px 2px 0 #000;
}

.ta-subtitle {
  font-size: 22px;
  color: var(--accent-red);
  letter-spacing: 0.15em;
  margin-top: 4px;
  white-space: nowrap;
}

/* Capt. Vega placeholder */
.ta-hero-sprite {
  margin-top: 18px;
  width: 80px;
  height: 130px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.ta-sprite-ph {
  width: 56px;
  height: 110px;
  background: rgba(80, 80, 100, 0.45);
  border: 1px solid rgba(201, 162, 39, 0.25);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 4px;
}

.ta-sprite-name {
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--text-dim);
  white-space: nowrap;
}

/* ── Clan banners ── */
.ta-banners {
  position: absolute;
  bottom: 98px;
  left: 0; right: 0;
  height: 44px;
  display: flex;
  border-top: var(--border-hard);
  border-bottom: var(--border-hard);
  z-index: 5;
}

.ta-banner {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 15px;
  letter-spacing: 0.06em;
  border-right: var(--border-hard);
  white-space: nowrap;
}

.ta-banner:last-child { border-right: none; }

.ta-banner-sym { font-size: 14px; opacity: 0.75; }

.ta-banner--black-flag    { background: rgba(26, 58, 92, 0.75);  color: #8abde0; }
.ta-banner--hollow-blade  { background: rgba(140, 28, 46, 0.75); color: #e08090; }
.ta-banner--iron-circle   { background: rgba(45, 90, 61, 0.75);  color: #7ad0a0; }
.ta-banner--bourse        { background: rgba(100, 80, 10, 0.75); color: var(--accent-gold); }
.ta-banner--nameless-silk { background: rgba(90, 42, 122, 0.75); color: #c090f0; }

/* ── CTAs ── */
.ta-ctas {
  position: absolute;
  bottom: 42px;
  left: 0; right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 10;
}

.ta-btn-connect { font-size: 22px; padding: 8px 28px; }

/* ── Footer strip ── */
.ta-footer {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 40px;
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
