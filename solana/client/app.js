// app.js — Phase 15 battle UI entry point + screen router
// Screens: walletGate → register → main → preparation → interruption → reveal → loot → main

import { mount as mountMain,         unmount as unmountMain         } from './src/components/main-screen.js';
import { mount as mountPrep,         unmount as unmountPrep         } from './src/components/preparation.js';
import { mount as mountIntr,         unmount as unmountIntr         } from './src/components/interruption.js';
import { mount as mountReveal,       unmount as unmountReveal       } from './src/components/reveal.js';
import { mount as mountLoot,         unmount as unmountLoot         } from './src/components/loot.js';
import { getState } from './src/state/battle-state.js';
import { PRIZE_POOL_PUBKEY, OPS_TREASURY_PUBKEY } from './src/config.js';

const SCREENS = {
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

function navigate(name, detail = {}) {
  const app = document.getElementById('app');
  if (!app) return;

  if (_currentUnmount) {
    _currentUnmount(app);
    _currentUnmount = null;
  }

  const screen = SCREENS[name];
  if (!screen) { console.warn('Unknown screen:', name); return; }

  _currentScreen  = name;
  _currentUnmount = screen.unmount;
  screen.mount(app, { ...getState(), ...detail });
}

// Navigation event listeners
document.addEventListener('nav:main',         e => navigate('main',         e.detail ?? {}));
document.addEventListener('nav:matchmaking',  e => navigate('matchmaking',  e.detail ?? {}));
document.addEventListener('nav:preparation',  e => navigate('preparation',  e.detail ?? {}));
document.addEventListener('nav:interruption', e => navigate('interruption', e.detail ?? {}));
document.addEventListener('nav:reveal',       e => navigate('reveal',       e.detail ?? {}));
document.addEventListener('nav:loot',         e => navigate('loot',         e.detail ?? {}));
document.addEventListener('nav:wallet-required', () => showWalletConnectScreen());

// ── Wallet gate ────────────────────────────────────────────────────────────

function _isWalletConnected() {
  return !!window.oxarkWallet?.isConnected?.();
}

async function initApp() {
  if (!_isWalletConnected()) {
    showWalletConnectScreen();
    return;
  }

  const pubkey = window.oxarkWallet.getPublicKey?.();
  if (!pubkey) { showWalletConnectScreen(); return; }

  try {
    const registered = await window.oxarkOnchain.checkPlayerStateExists(pubkey);
    if (!registered) {
      showRegisterScreen();
      return;
    }
  } catch {
    // RPC failure — fall through to main screen so offline demo still works
  }

  navigate('main', { pubkey: pubkey.toString(), vault: getDemoVault() });
}

function showRegisterScreen() {
  if (_currentUnmount) {
    const app = document.getElementById('app');
    if (app) _currentUnmount(app);
    _currentUnmount = null;
    _currentScreen  = null;
  }

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
      const result = await window.oxarkOnchain.registerWaitlist(
        PRIZE_POOL_PUBKEY,
        OPS_TREASURY_PUBKEY
      );
      _showToast(`Registered! tx: ${result.signature.slice(0, 8)}…`, 'info');
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
  min-height: 100vh; padding: 2rem; text-align: center;
  font-family: 'VT323', monospace; background: #0a0e1a; color: #e8dfc8;
}
.reg-logo { font-size: 4rem; letter-spacing: 0.2em; color: #c9a227; margin-bottom: 0.5rem; }
.reg-subtitle { color: #888; margin-bottom: 3rem; letter-spacing: 0.1em; font-size: 1.1rem; }
.reg-prompt {
  max-width: 500px; width: 100%; padding: 2rem;
  border: 2px solid #c9a227; background: rgba(201,162,39,0.05);
}
.reg-title { color: #c9a227; margin: 0 0 0.75rem; letter-spacing: 0.1em; font-size: 1.6rem; }
.reg-desc { font-size: 1rem; color: #b0a890; margin-bottom: 1.25rem; }
.reg-benefits { list-style: none; padding: 0; text-align: left; margin: 1.25rem 0; }
.reg-benefits li { padding: 4px 0 4px 20px; position: relative; font-size: 1rem; }
.reg-benefits li::before { content: '▸'; position: absolute; left: 0; color: #c9a227; }
.reg-cost {
  margin: 1.25rem 0; padding: 0.75rem 1rem; background: rgba(0,0,0,0.3);
  border: 1px solid #4a90d9; display: flex; justify-content: space-between; align-items: center;
}
.reg-cost-label { color: #888; font-size: 1rem; }
.reg-cost-amount { color: #c9a227; font-size: 1.5rem; font-weight: bold; }
.reg-primary-btn {
  font-family: 'VT323', monospace; font-size: 1.4rem; letter-spacing: 0.1em;
  padding: 1rem 2.5rem; background: #c9a227; color: #0a0e1a;
  border: 2px solid #000; cursor: pointer; width: 100%; margin: 1rem 0;
  transition: background 0.15s, transform 0.15s;
}
.reg-primary-btn:hover:not(:disabled) { background: #d8b034; transform: translateY(-2px); }
.reg-primary-btn:disabled { background: #444; color: #888; cursor: not-allowed; transform: none; }
.reg-error { margin-top: 0.5rem; color: #e55; font-size: 0.95rem; }
.reg-note { font-size: 0.85rem; color: #888; margin-top: 0.5rem; }
.reg-wallet-info {
  margin-top: 2rem; display: flex; align-items: center; gap: 1rem;
  color: #888; font-size: 0.9rem;
}
.reg-addr { color: #c9a227; }
.reg-link-btn {
  background: none; border: none; color: #4a90d9;
  text-decoration: underline; cursor: pointer; font-family: inherit; font-size: 0.9rem;
}
`;
  document.head.appendChild(s);
}

function showWalletConnectScreen() {
  if (_currentUnmount) {
    const app = document.getElementById('app');
    if (app) _currentUnmount(app);
    _currentUnmount = null;
    _currentScreen  = null;
  }

  _injectWalletCSS();

  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="wg-screen">
      <div class="wg-logo">0xARK</div>
      <div class="wg-subtitle">Card Battle on Solana × ZK × x402</div>

      <div class="wg-connect-block">
        <p class="wg-prompt">Connect your wallet to start playing</p>
        <button id="wg-connect-btn" class="wg-btn-primary">CONNECT WALLET</button>
        <div id="wg-error" class="wg-error" style="display:none;"></div>
      </div>

      <div class="wg-help">
        <p>Don't have a wallet?</p>
        <a href="https://phantom.app/" target="_blank" rel="noopener">Install Phantom</a>
      </div>

      <div class="wg-network">
        <p>Network: Devnet</p>
        <small>Make sure your wallet is set to Devnet</small>
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

function _showToast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `wg-toast wg-toast--${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function _injectWalletCSS() {
  if (document.getElementById('wg-css')) return;
  const s = document.createElement('style');
  s.id = 'wg-css';
  s.textContent = `
.wg-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  text-align: center;
  font-family: 'VT323', monospace;
  background: #0a0e1a;
  color: #e8dfc8;
}
.wg-logo {
  font-size: 4rem;
  letter-spacing: 0.2em;
  margin-bottom: 0.5rem;
  color: #c9a227;
}
.wg-subtitle {
  font-size: 1.2rem;
  color: #888;
  margin-bottom: 3rem;
  letter-spacing: 0.1em;
}
.wg-connect-block { margin: 2rem 0; }
.wg-prompt {
  font-size: 1.2rem;
  margin-bottom: 1rem;
}
.wg-btn-primary {
  font-family: 'VT323', monospace;
  font-size: 1.4rem;
  letter-spacing: 0.1em;
  padding: 1rem 2.5rem;
  background: #c9a227;
  color: #0a0e1a;
  border: 2px solid #000;
  cursor: pointer;
  transition: background 0.15s, transform 0.15s;
}
.wg-btn-primary:hover:not(:disabled) {
  background: #d8b034;
  transform: translateY(-2px);
}
.wg-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.wg-error {
  margin-top: 0.75rem;
  color: #e55;
  font-size: 1rem;
}
.wg-help {
  margin-top: 3rem;
  color: #888;
}
.wg-help a {
  color: #4a90d9;
  text-decoration: underline;
}
.wg-network {
  margin-top: 4rem;
  padding: 1rem;
  background: rgba(74,144,217,0.1);
  border: 1px solid #4a90d9;
  color: #4a90d9;
  font-size: 1rem;
}
.wg-network small { font-size: 0.85rem; }
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
.wg-toast--warn  { background: #7a5200; color: #f5c842; border: 1px solid #f5c842; }
.wg-toast--info  { background: #0a1e3a; color: #4a90d9; border: 1px solid #4a90d9; }
.wg-toast--error { background: #3a0a0a; color: #e55;    border: 1px solid #e55; }
@keyframes wg-toast-in { from { opacity:0; bottom:0.5rem; } to { opacity:1; bottom:1.5rem; } }
`;
  document.head.appendChild(s);
}

// ── Boot ───────────────────────────────────────────────────────────────────

function boot() {
  initApp();
}
boot();

// Demo vault for local testing — first 30 cards owned
function getDemoVault() {
  return Array.from({ length: 30 }, (_, i) => i + 1);
}
