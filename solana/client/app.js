// app.js — Phase 20-C battle UI entry point + screen router
// Screens: walletGate → register → home → main/matchmaking/shop/trade → preparation → interruption → reveal → loot

import { mount as mountHome,         unmount as unmountHome         } from './src/components/home-screen.js';
import { mount as mountShop,         unmount as unmountShop         } from './src/components/shop-screen.js';
import { mount as mountTrade,        unmount as unmountTrade        } from './src/components/trade-screen.js';
import { mount as mountMain,         unmount as unmountMain         } from './src/components/main-screen.js';
import { mount as mountPrep,         unmount as unmountPrep         } from './src/components/preparation.js';
import { mount as mountIntr,         unmount as unmountIntr         } from './src/components/interruption.js';
import { mount as mountReveal,       unmount as unmountReveal       } from './src/components/reveal.js';
import { mount as mountLoot,         unmount as unmountLoot         } from './src/components/loot.js';
import { getState, setState, wasRestored } from './src/state/battle-state.js';
import { OPS_TREASURY_PUBKEY, NETWORK } from './src/config.js';
import { injectPxIconSheet, pxIcon } from './src/lib/px-icons.js';
import { showToast as _showToast, showTxToast, setDemoMode } from './src/lib/ui-shared.js';
import { CardFrameHTML, injectCardCSS } from './src/components/common/Card.js';

import { mountArchiveShell, setArchiveScreen } from './src/lib/archive-shell.js';
import { isPractice, practicePlayer, practiceOpponent, PRACTICE_PLAYER } from './src/lib/practice-mode.js';

const _devView = isPractice ? new URLSearchParams(location.search).get('devview') || 'home' : null;
const SCREENS = {
  home:          { mount: mountHome,   unmount: unmountHome   },
  shop:          { mount: mountShop,   unmount: unmountShop   },
  trade:         { mount: mountTrade,  unmount: unmountTrade  },
  main:          { mount: mountMain,   unmount: unmountMain   },
  matchmaking:   { mount: mountMain,   unmount: unmountMain   },
  preparation:   { mount: mountPrep,   unmount: unmountPrep   },
  interruption:  { mount: mountIntr,   unmount: unmountIntr   },
  reveal:        { mount: mountReveal, unmount: unmountReveal },
  loot:          { mount: mountLoot,   unmount: unmountLoot   },
};

let _currentScreen  = null;
let _currentUnmount = null;
let _walletEventsAttached = false;
let _loadGeneration = 0;
let _homeGeneration = 0;

function navigate(name, detail = {}) {
  const app = document.getElementById('app');
  if (!app) return;
  if (!isPractice && (!_playerState || !_isWalletConnected())) { showWalletConnectScreen(); return; }

  if (_currentUnmount) {
    _currentUnmount(app);
    _currentUnmount = null;
  }

  const screen = SCREENS[name];
  if (!screen) { console.warn('Unknown screen:', name); return; }

  setArchiveScreen(name);
  _currentScreen  = name;
  _currentUnmount = screen.unmount;
  screen.mount(app, {
    ...getState(),
    playerState: _playerState,
    gameWorld: _gameWorld,
    pubkey: getState().playerPubkey,
    ...detail,
  });
}

// Navigation event listeners
document.addEventListener('nav:home', e => {
  const generation = ++_homeGeneration;
  if (_devView) { navigate('home', e.detail ?? {}); return; }
  // Load before mounting interactive paid controls. A background remount could
  // discard a refill's pending lock or replace its confirmed state with a cache.
  const app = document.getElementById('app');
  if (!app) return;
  _currentUnmount?.(app);
  _currentUnmount = null;
  _currentScreen = 'home-loading';
  app.innerHTML = '<div id="app-loading" role="status"><div class="load-logo">0xARK</div><p class="load-sub">LOADING YOUR COLLECTION…</p></div>';
  _loadPlayerState().then(() => {
    if (_currentScreen === 'home-loading' && generation === _homeGeneration) navigate('home', e.detail ?? {});
  }).catch(() => {
    if (_currentScreen === 'home-loading' && generation === _homeGeneration) showConnectionRetry();
  });
});
document.addEventListener('nav:shop',         e => navigate('shop',         { ...(_gameWorld ? { gameWorld: _gameWorld } : {}), ...(e.detail ?? {}) }));
document.addEventListener('nav:trade',        e => navigate('trade',        { ...(_playerState ? { playerState: _playerState } : {}), ...(e.detail ?? {}) }));
document.addEventListener('nav:main',         e => navigate('main',         { mode: 'vault',  ...(e.detail ?? {}) }));
document.addEventListener('nav:matchmaking',  e => navigate('matchmaking',  { mode: 'battle', ...(e.detail ?? {}) }));
document.addEventListener('nav:preparation',  e => navigate('preparation',  e.detail ?? {}));
document.addEventListener('nav:interruption', e => navigate('interruption', e.detail ?? {}));
document.addEventListener('nav:reveal',       e => navigate('reveal',       e.detail ?? {}));
document.addEventListener('nav:loot',         e => navigate('loot',         e.detail ?? {}));
document.addEventListener('nav:wallet-required', () => showWalletConnectScreen());

// ── Wallet gate ────────────────────────────────────────────────────────────

function _isWalletConnected() {
  return !!window.oxarkWallet?.isConnected?.();
}

// ── Player state (Phase 20-A) ──────────────────────────────────────────────

let _playerState = null;
let _gameWorld   = null;

async function _loadPlayerState() {
  const pubkey = window.oxarkWallet?.getPublicKey?.();
  if (!pubkey || !window.oxarkOnchain?.getPlayerState) throw new Error('Collection connection unavailable');
  const [player, world] = await Promise.allSettled([
    window.oxarkOnchain.getPlayerState(pubkey),
    window.oxarkOnchain.getGameWorld?.(),
  ]);
  if (pubkey.toString() !== window.oxarkWallet?.getPublicKey?.()?.toString()) {
    throw new Error('Wallet changed while loading');
  }
  if (player.status !== 'fulfilled' || !Array.isArray(player.value?.vault)) {
    throw new Error('Could not load your collection');
  }
  _playerState = player.value;
  _gameWorld = world.status === 'fulfilled' ? world.value ?? null : null;
  setState({ vault: _playerState.vault, playerPubkey: pubkey.toString() });
}

async function initApp() {
  const generation = ++_loadGeneration;
  if (!_isWalletConnected()) {
    showWalletConnectScreen();
    return;
  }

  const pubkey = window.oxarkWallet.getPublicKey?.();
  if (!pubkey) { showWalletConnectScreen(); return; }

  try {
    const registered = await window.oxarkOnchain.checkPlayerStateExists(pubkey);
    if (generation !== _loadGeneration) return;
    if (!registered) {
      showRegisterScreen();
      return;
    }
  } catch {
    if (generation === _loadGeneration) showConnectionRetry();
    return;
  }

  try {
    await _loadPlayerState();
  } catch {
    if (generation === _loadGeneration) showConnectionRetry();
    return;
  }
  if (generation !== _loadGeneration) return;

  if (wasRestored) {
    const { phase } = getState();
    // matchmaking: WS connection died on reload — drop back to battle lobby
    if (phase === 'matchmaking' || phase === 'main') {
      navigate('main', { mode: 'battle' });
    } else {
      // preparation / interruption / reveal / loot — navigate directly; the
      // component is responsible for handling null zkProofBytes / salt after reload.
      navigate(phase);
    }
    return;
  }

  navigate('home', {
    pubkey:      pubkey.toString(),
    playerState: _playerState,
    gameWorld:   _gameWorld,
  });
}

// A failed read is not a new player or a fabricated demo collection.
function showConnectionRetry() {
  showWalletConnectScreen();
  const prompt = document.querySelector('.wg-prompt');
  const button = document.getElementById('wg-connect-btn');
  if (prompt) prompt.textContent = 'Your collection could not be loaded. Reconnect to try again.';
  if (button) button.textContent = 'RETRY CONNECTION';
}

function showRegisterScreen() {
  if (_currentUnmount) {
    const app = document.getElementById('app');
    if (app) _currentUnmount(app);
    _currentUnmount = null;
    _currentScreen  = null;
  }

  setArchiveScreen('register');
  _injectRegisterCSS();

  const app = document.getElementById('app');
  if (!app) return;

  const pubkey = window.oxarkWallet.getPublicKey?.()?.toString() ?? '';
  const short  = pubkey ? `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}` : '—';

  app.innerHTML = `
    <div class="reg-screen">
      <div class="reg-logo">0xARK</div>
      <div class="reg-subtitle">Card Battle on Solana</div>

      <div class="reg-prompt">
        <h2 class="reg-title">JOIN THE WAITLIST</h2>
        <p class="reg-desc">Deposit 0.5 SOL to register and receive 5 starter cards</p>

        <ul class="reg-benefits">
          <li>5 random starter cards from 60 unique cards</li>
          <li>14 days of on-chain card battles</li>
          <li>Prize Pool funded by deposits + x402 fees</li>
          <li>Tier 1 (60 cards) gets 50% of prize pool</li>
        </ul>

        <div class="reg-cost">
          <span class="reg-cost-label">Entry Fee</span>
          <span class="reg-cost-amount">0.5 SOL</span>
        </div>

        <button id="reg-btn" class="reg-primary-btn">JOIN WAITLIST</button>
        <div id="reg-error" class="reg-error" style="display:none;"></div>
        <p class="reg-note">15% → operations / 85% → prize pool</p>
        <a class="archive-practice-link" href="?devview=home">Explore the game first — free practice ↗</a>
      </div>

      <div class="reg-wallet-info">
        <span>Connected: <span class="reg-addr">${short}</span></span>
        <button id="reg-disconnect-btn" class="reg-link-btn">Disconnect</button>
      </div>
    </div>
  `;

  const btn = document.getElementById('reg-btn');
  const errEl = document.getElementById('reg-error');

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'CONFIRMING…';
    errEl.style.display = 'none';

    try {
      // YKK-38: prize pool is a program PDA derived on-chain; only ops treasury
      // is passed as an external address.
      const result = await window.oxarkOnchain.registerWaitlist(
        OPS_TREASURY_PUBKEY
      );
      showTxToast('Registration confirmed', typeof result === 'string' ? result : result.signature);
      await initApp();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'JOIN WAITLIST';
      const msg = err?.message ?? String(err);
      if (msg.includes('insufficient') || err?.code === 'InsufficientFunds') {
        errEl.textContent = 'Insufficient SOL. You need at least 0.5 SOL + tx fees.';
      } else if (err?.code === 4001 || msg.includes('User rejected')) {
        errEl.textContent = 'Registration cancelled.';
      } else {
        errEl.textContent = `Registration failed: ${msg}`;
      }
      errEl.style.display = 'block';
    }
  });

  document.getElementById('reg-disconnect-btn').addEventListener('click', async () => {
    try { await window.oxarkWallet?.disconnect?.(); } catch { /* ignore */ }
    _walletEventsAttached = false;
    showWalletConnectScreen();
  });
}

function _injectRegisterCSS() {
  if (document.getElementById('reg-css')) return;
  const s = document.createElement('style');
  s.id = 'reg-css';
  s.textContent = `
.reg-screen {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; padding: 0.75rem 1rem; text-align: center;
  font-family: 'VT323', monospace; background: var(--bg-deep); color: var(--text-cream);
}
.reg-logo { font-size: 2.5rem; letter-spacing: 0.2em; color: var(--accent-gold); margin-bottom: 0.2rem; }
.reg-subtitle { color: #888; margin-bottom: 0.5rem; letter-spacing: 0.1em; font-size: 1rem; }
.reg-prompt {
  max-width: 500px; width: 100%; padding: 0.75rem 1.25rem;
  border: 2px solid var(--accent-gold); background: rgba(201,162,39,0.05);
}
.reg-title { color: var(--accent-gold); margin: 0 0 0.4rem; letter-spacing: 0.1em; font-size: 1.6rem; }
.reg-desc { font-size: 1rem; color: #b0a890; margin-bottom: 0.5rem; }
.reg-benefits { list-style: none; padding: 0; text-align: left; margin: 0.5rem 0; }
.reg-benefits li { padding: 2px 0 2px 20px; position: relative; font-size: 0.95rem; }
.reg-benefits li::before { content: '▸'; position: absolute; left: 0; color: var(--accent-gold); }
.reg-cost {
  margin: 0.5rem 0; padding: 0.5rem 1rem; background: rgba(0,0,0,0.3);
  border: 1px solid var(--accent-blue); display: flex; justify-content: space-between; align-items: center;
}
.reg-cost-label { color: #888; font-size: 1rem; }
.reg-cost-amount { color: var(--accent-gold); font-size: 1.4rem; }
.reg-primary-btn {
  font-family: 'VT323', monospace; font-size: 1.4rem; letter-spacing: 0.1em;
  padding: 0.6rem 2.5rem; background: var(--accent-gold); color: var(--bg-deep);
  border: 2px solid #000; cursor: pointer; width: 100%; margin: 0.4rem 0;
  transition: background 0.15s, transform 0.15s;
}
.reg-primary-btn:hover:not(:disabled) { background: var(--accent-gold-bright); transform: translateY(-2px); }
.reg-primary-btn:disabled { background: #444; color: #888; cursor: not-allowed; transform: none; }
.reg-error { margin-top: 0.3rem; color: #e55; font-size: 0.95rem; }
.reg-note { font-size: 0.85rem; color: #888; margin-top: 0.3rem; }
.reg-wallet-info {
  margin-top: 0.5rem; display: flex; align-items: center; gap: 1rem;
  color: #888; font-size: 0.9rem;
}
.reg-addr { color: var(--accent-gold); }
.reg-link-btn {
  background: none; border: none; color: var(--accent-blue);
  text-decoration: underline; cursor: pointer; font-family: inherit; font-size: 0.9rem;
}
`;
  document.head.appendChild(s);
}

function showWalletConnectScreen() {
  _playerState = null;
  _gameWorld = null;
  ++_loadGeneration;
  ++_homeGeneration;
  if (_currentUnmount) {
    const app = document.getElementById('app');
    if (app) _currentUnmount(app);
    _currentUnmount = null;
    _currentScreen  = null;
  }

  setArchiveScreen('welcome');
  _injectWalletCSS();
  injectCardCSS();

  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="wg-screen" role="main" aria-label="Welcome to 0xARK">
      <header class="wg-topbar">
        <div class="wg-logo">0xARK</div>
        <span class="chip">${NETWORK.toUpperCase()}${NETWORK === 'mainnet-beta' ? '' : ' · TEST NETWORK'}</span>
      </header>
      <div class="wg-body">
        <section class="wg-intro">
          <p class="wg-eyebrow">SIX FACTIONS. YOUR STRATEGY.</p>
          <h1>Five cards.<br>One sealed plan.</h1>
          <p class="wg-story">Choose your cards. Set their actions.<br>Reveal together and let the battle unfold.</p>
          <div class="wg-card-lineup" aria-label="Cards from the catalog, not your collection">
            ${[10, 30, 60].map(id => CardFrameHTML({ id })).join('')}
          </div>
          <p class="wg-catalog-note">FROM THE CARD CATALOG · 60 CARDS TO DISCOVER</p>
        </section>
        <section class="wg-connect-block" aria-label="Connect to play">
          <span class="wg-seal">${pxIcon('lock', { size: 32 })}</span>
          <p class="wg-eyebrow">ENTER THE ARENA</p>
          <h2>Your cards.<br>Your next move.</h2>
          <p class="wg-prompt">Connect your wallet to load your collection.</p>
          <button id="wg-connect-btn" class="wg-btn-primary">CONNECT WALLET</button>
          <a class="archive-practice-link" href="?devview=home">Play without a wallet — practice ↗</a>
          <p class="wg-connection-note">Connecting does not spend SOL.<br>Review paid actions before signing.</p>
          <div id="wg-error" class="wg-error selectable" role="alert" style="display:none;"></div>
          <div class="wg-help">
            <span>New to Solana?</span>
            <a href="https://phantom.app/" target="_blank" rel="noopener">Get a wallet ↗</a>
          </div>
          <div class="wg-network">Set your wallet to ${NETWORK}.${NETWORK === 'mainnet-beta' ? '' : '<br><span>Test-network play uses test SOL.</span>'}</div>
        </section>
      </div>
    </div>
  `;

  document.getElementById('wg-connect-btn').addEventListener('click', async () => {
    const btn = document.getElementById('wg-connect-btn');
    const err = document.getElementById('wg-error');
    btn.disabled = true;
    btn.textContent = 'CONNECTING…';
    err.style.display = 'none';

    try {
      await connectWallet();
      setupWalletEvents();
      await initApp();
    } catch (e) {
      btn.disabled = false;
      btn.textContent = 'CONNECT WALLET';
      err.textContent = e.message ?? 'Connection failed';
      err.style.display = 'block';
    }
  });
}

async function connectWallet() {
  const w = window.oxarkWallet;
  if (!w) {
    window.open('https://phantom.app/', '_blank', 'noopener');
    throw new Error('No wallet found — install Phantom or Solflare');
  }
  await w.connect();
}

function setupWalletEvents() {
  if (_walletEventsAttached) return;
  _walletEventsAttached = true;

  const p  = window.phantom?.solana;
  const sf = window.solflare;
  const raw = p?.isPhantom ? p : sf?.isSolflare ? sf : null;
  if (!raw?.on) return;

  raw.on('disconnect', () => {
    _showToast('Wallet disconnected', 'warn');
    _walletEventsAttached = false;
    showWalletConnectScreen();
  });

  raw.on('accountChanged', (publicKey) => {
    if (publicKey) {
      window.location.reload();
    } else {
      showWalletConnectScreen();
    }
  });
}

function _injectWalletCSS() {
  if (document.getElementById('wg-css')) return;
  const s = document.createElement('style');
  s.id = 'wg-css';
  s.textContent = `
.wg-screen {
  height: 100%; display: flex; flex-direction: column;
  padding: 0 32px; font-family: var(--font-main);
  background: var(--bg-deep); color: var(--text-cream);
}
.wg-topbar {
  height: 64px; flex-shrink: 0; display: flex; align-items: center;
  justify-content: space-between; border-bottom: var(--border-dim);
}
.wg-logo { font-size: 32px; letter-spacing: var(--ls-display); color: var(--accent-gold); }
.wg-topbar .chip { color: var(--accent-blue); border-color: var(--accent-blue); }
.wg-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 336px; gap: 32px; padding: 24px 0; }
.wg-intro { min-width: 0; }
.wg-eyebrow { font-size: 13px; letter-spacing: var(--ls-wide); color: var(--accent-gold); }
.wg-intro h1 { font-size: 48px; line-height: 1; font-weight: normal; margin: 8px 0; }
.wg-story { font-size: 20px; line-height: 1.2; }
.wg-card-lineup { display: flex; align-items: center; gap: 16px; margin-top: 16px; }
.wg-card-lineup .card-frame { width: 144px; flex-shrink: 0; cursor: default; }
.wg-card-lineup .card-frame:hover { transform: none; box-shadow: none; }
.wg-catalog-note { margin-top: 8px; font-size: 13px; color: var(--text-dim); letter-spacing: var(--ls-caption); }
.wg-connect-block {
  min-height: 0; padding: 24px; border: var(--border-dim); background: var(--bg-mid);
  display: flex; flex-direction: column; align-items: flex-start; overflow-y: auto;
}
.wg-seal { color: var(--accent-gold); margin-bottom: 12px; }
.wg-connect-block h2 { font-size: 32px; line-height: 1.1; font-weight: normal; margin: 8px 0 12px; }
.wg-prompt { font-size: 20px; line-height: 1.2; margin-bottom: 16px; }
.wg-btn-primary {
  width: 100%; min-height: 48px; flex-shrink: 0; padding: 12px 16px;
  font-family: var(--font-main); font-size: 22px; letter-spacing: var(--ls-wide);
  background: var(--accent-gold); color: var(--bg-deep); border: var(--border-hard);
  cursor: pointer; transition: background var(--t-fast);
}
.wg-btn-primary:hover:not(:disabled) { background: var(--accent-gold-bright); }
.wg-btn-primary:active:not(:disabled) { transform: translateY(1px); }
.wg-btn-primary:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 4px; }
.wg-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.wg-connection-note { margin-top: 8px; font-size: 13px; line-height: 1.3; color: var(--text-dim); }
.wg-error { margin-top: 12px; color: var(--accent-red); font-size: 16px; overflow-wrap: anywhere; }
.wg-help { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; font-size: 16px; }
.wg-help a { color: var(--accent-blue); text-decoration: underline; }
.wg-network { margin-top: auto; padding-top: 16px; font-size: 13px; line-height: 1.3; color: var(--accent-blue); }
.wg-network span { color: var(--text-dim); }
.wg-toast {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.6rem 1.4rem;
  font-family: 'VT323', monospace;
  font-size: 1.1rem;
  border-radius: 2px;
  z-index: 9999;
  animation: wg-toast-in 0.2s ease;
}
.wg-toast--warn  { background: var(--bg-panel); color: var(--accent-warn); border: 1px solid var(--accent-warn); }
.wg-toast--info  { background: var(--bg-panel); color: var(--accent-blue); border: 1px solid var(--accent-blue); }
.wg-toast--error { background: var(--bg-panel); color: var(--accent-red); border: 1px solid var(--accent-red); }
.wg-toast--success { background: var(--bg-panel); color: var(--success); border: 1px solid var(--success); }
@keyframes wg-toast-in { from { opacity:0; bottom:0.5rem; } to { opacity:1; bottom:1.5rem; } }
`;
  document.head.appendChild(s);
}

// ── Boot ───────────────────────────────────────────────────────────────────

injectPxIconSheet(); // global icon sprite before any screen mounts
_injectWalletCSS(); // shared toasts must also work for an already connected wallet

function boot() {
  initApp();
}

// Explicit fixtures never touch production session storage, adapters or payment clients.
mountArchiveShell(isPractice);
if (isPractice) {
  _playerState = practicePlayer();
  _gameWorld = { game_start_timestamp: Math.floor(Date.now() / 1000) - 3 * 86400 };
  const field = [5, 18, 30, 43, 60].map((cardId, i) => ({ cardId, actionType: i }));
  setState({
    phase: 'main', playerPubkey: PRACTICE_PLAYER, vault: _playerState.vault,
    isHost: true, duelP1IsMe: true, duelId: null, matchId: null, round: 1,
    fieldCards: field, opponentField: practiceOpponent(), hasPeeked: false,
    isWinner: true, p1RoundWins: 3, p2RoundWins: 1,
    battleResult: { winner: 'p1', log: [] },
  });
  if (!['loot', 'loss'].includes(_devView)) setState({ p1RoundWins: 0, p2RoundWins: 0 });
  if (_devView === 'menu') {
    setArchiveScreen('menu');
    const views = [['home','The Archive','Your next duel starts here.'],['main','Your collection','Explore six factions and inspect each card.'],['preparation','Build your hand','Select five cards. Choose their actions.'],['interruption','The sealed table','Study your opponent before the reveal.'],['reveal','The confrontation','See actions resolve on the battlefield.'],['loot','Victory','The duel recap and return to your collection.'],['loss','Defeat','A different ending. A chance to rethink your hand.'],['shop','Sealed packs','Try the opening ceremony. No purchase.'],['trade','The exchange','Browse the market interface. Trading is disabled.'],['card-detail','Card study','Art, statistics and abilities in one place.']];
    document.getElementById('app').innerHTML = '<main class="archive-gallery"><p class="archive-eyebrow">0xARK / DESIGN STUDY 01</p><h1>The Drowned Archive</h1><p>A playable, isolated practice build. Sample cards only. No wallet, payments or live opponents.</p><div class="archive-gallery-grid">' + views.map(([route,title,desc],i) => '<a href="?devview='+route+'"><span>0'+(i+1)+'</span><h2>'+title+'</h2><p>'+desc+'</p><b>Explore ↗</b></a>').join('') + '</div></main>';
  } else if (_devView === 'card-detail') {
    navigate('main', { mode: 'vault' });
    import('./src/components/card-detail.js').then(({ CardDetailModal }) => {
      CardDetailModal.show(document.querySelector('.ms-root'), 30, {});
    });
  } else if (_devView === 'loss') {
    setState({ isWinner: false, p1RoundWins: 1, p2RoundWins: 3, battleResult: { winner: 'p2', log: [] } });
    navigate('loot');
  } else {
    navigate(SCREENS[_devView] ? _devView : 'home', _devView === 'main' ? { mode: 'vault' } : {});
  }
} else {
  boot();
}
