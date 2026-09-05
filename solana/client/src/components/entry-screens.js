// Entry screens own presentation and pending button state; the live controller
// owns wallet/session operations and navigation.
import { NETWORK } from '../config.js';
import { pxIcon } from '../lib/px-icons.js';
import { CardFrameHTML, injectCardCSS } from './common/Card.js';
import { injectStyle } from '../lib/inject-style.js';
import { createScreenScope } from '../lib/screen-scope.js';
import { WALLET_CSS, REGISTER_CSS } from '../style/entry.js';

let _scope = null;
export function injectEntryCSS() { injectStyle('wg-css', WALLET_CSS); }
export function unmount(container) {
  _scope?.dispose();
  _scope = null;
  container.innerHTML = '';
}

export function mountWallet(container, { onConnect, retry = false }) {
  unmount(container);
  const scope = _scope = createScreenScope();
  injectEntryCSS();
  injectCardCSS();
  container.innerHTML = `
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
  const btn = container.querySelector('#wg-connect-btn');
  const err = container.querySelector('#wg-error');
  if (retry) {
    container.querySelector('.wg-prompt').textContent = 'Your collection could not be loaded. Reconnect to try again.';
    btn.textContent = 'RETRY CONNECTION';
  }
  btn.addEventListener('click', async () => {
    if (!scope.active || btn.disabled) return;
    btn.disabled = true;
    btn.textContent = 'CONNECTING…';
    err.style.display = 'none';
    try {
      await onConnect();
    } catch (error) {
      if (!scope.active) return;
      btn.disabled = false;
      btn.textContent = 'CONNECT WALLET';
      err.textContent = error.message ?? 'Connection failed';
      err.style.display = 'block';
    }
  });
}

export function mountRegister(container, { pubkey = '', onRegister, onDisconnect }) {
  unmount(container);
  const scope = _scope = createScreenScope();
  injectStyle('reg-css', REGISTER_CSS);
  const short = pubkey ? `${pubkey.slice(0, 4)}...${pubkey.slice(-4)}` : '—';
  container.innerHTML = `
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
  const btn = container.querySelector('#reg-btn');
  const errEl = container.querySelector('#reg-error');
  btn.addEventListener('click', async () => {
    if (!scope.active || btn.disabled) return;
    btn.disabled = true;
    btn.textContent = 'CONFIRMING…';
    errEl.style.display = 'none';
    try {
      await onRegister();
    } catch (err) {
      if (!scope.active) return;
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
  container.querySelector('#reg-disconnect-btn').addEventListener('click', () => {
    if (scope.active) onDisconnect();
  });
}
