// home-screen.js — Phase 20-C: 4-button navigation hub (SHOP + TRADE enabled)
import { pxIcon } from '../lib/px-icons.js';
import { tierForVault, PRIZE_TIERS } from '../lib/ui-shared.js';
import { EnergyHudHTML, attachEnergyHud, injectEnergyCss } from './common/energy-hud.js';

let _detachEnergy = () => {};

function _injectCSS() {
  if (document.getElementById('home-css')) return;
  const s = document.createElement('style');
  s.id = 'home-css';
  s.textContent = `
.home-screen {
  font-family: 'VT323', monospace;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1rem;
  text-align: center;
  background: var(--bg-deep);
  color: var(--text-cream);
}
.home-header h1 {
  font-size: 3rem;
  letter-spacing: 0.2em;
  color: var(--accent-gold);
  margin: 0 0 0.25rem;
}
.home-meta {
  color: #888;
  font-size: 1rem;
  margin-bottom: 0.75rem;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  max-width: 600px;
}
.home-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  max-width: 560px;
  width: 100%;
  margin: 0 auto;
}
.home-btn {
  background: rgba(201, 162, 39, 0.05);
  border: 2px solid var(--accent-gold);
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
  font-family: 'VT323', monospace;
  color: var(--text-cream);
}
.home-btn:hover { background: rgba(201, 162, 39, 0.15); transform: translateY(-2px); }
.home-btn:active { transform: translateY(0); }
.home-btn-icon  { font-size: 2rem; margin-bottom: 0.25rem; display: block; }
.home-btn-title {
  font-size: 1.5rem; letter-spacing: 0.1em;
  color: var(--accent-gold); display: block;
}
.home-btn-subtitle { font-size: 0.9rem; color: #aaa; margin-top: 0.1rem; display: block; }
.home-btn--dim { opacity: 0.5; border-color: #555; }
.home-btn--dim .home-btn-title { color: #888; }
.home-footer { margin-top: 0.75rem; color: #555; font-size: 0.9rem; }
`;
  document.head.appendChild(s);
}

function _shortAddr(pubkey) {
  const s = typeof pubkey === 'string' ? pubkey : (pubkey?.toString?.() ?? '');
  return s ? `${s.slice(0, 4)}...${s.slice(-4)}` : '—';
}

function _calculateDay(gameStartTimestamp) {
  if (!gameStartTimestamp) return 1;
  const elapsed = Math.floor((Date.now() / 1000 - gameStartTimestamp) / 86400);
  return Math.min(elapsed + 1, 14);
}

function _calculateTier(vaultCount) {
  // Canonical tiers from ui-shared (PRIZE_TIERS). 0 cards falls back to the
  // bottom tier for display, matching the previous local behavior.
  return tierForVault(vaultCount) ?? PRIZE_TIERS[PRIZE_TIERS.length - 1];
}

export function mount(container, props = {}) {
  _injectCSS();
  injectEnergyCss();

  const { playerState = {}, gameWorld = {}, pubkey = '' } = props;
  const vaultCount = playerState.vault_count ?? 0;
  const day        = _calculateDay(gameWorld.game_start_timestamp);
  const tier       = _calculateTier(vaultCount);

  container.innerHTML = `
    <div class="home-screen">
      <div class="home-header">
        <h1>0xARK</h1>
        <div class="home-meta">
          <span>Day ${day} / 14</span>
          <span>Vault ${vaultCount} / 60</span>
          <span>Tier ${tier.tier} (${tier.percent}%)</span>
        </div>
        <div class="home-energy">${EnergyHudHTML(playerState, { refill: true })}</div>
      </div>

      <div class="home-grid">
        <button class="home-btn" id="btn-battle">
          <span class="home-btn-icon">${pxIcon('battle')}</span>
          <span class="home-btn-title">BATTLE</span>
          <span class="home-btn-subtitle">Find a duel</span>
        </button>

        <button class="home-btn" id="btn-vault">
          <span class="home-btn-icon">${pxIcon('vault')}</span>
          <span class="home-btn-title">VAULT</span>
          <span class="home-btn-subtitle">See cards</span>
        </button>

        <button class="home-btn" id="btn-shop">
          <span class="home-btn-icon">${pxIcon('shop')}</span>
          <span class="home-btn-title">SHOP</span>
          <span class="home-btn-subtitle">Buy card packs</span>
        </button>

        <button class="home-btn" id="btn-trade">
          <span class="home-btn-icon">${pxIcon('trade')}</span>
          <span class="home-btn-title">TRADE</span>
          <span class="home-btn-subtitle">P2P marketplace</span>
        </button>
      </div>

      <div class="home-footer">Wallet: ${_shortAddr(pubkey)}</div>
    </div>
  `;

  document.getElementById('btn-battle').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:matchmaking'));
  });
  document.getElementById('btn-vault').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:main'));
  });
  document.getElementById('btn-shop').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:shop'));
  });
  document.getElementById('btn-trade').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:trade'));
  });

  _detachEnergy();
  _detachEnergy = attachEnergyHud(container, {
    playerState,
    refill: true,
    onRefill: () => document.dispatchEvent(new CustomEvent('nav:home')),
  });
}

export function unmount(container) {
  _detachEnergy(); _detachEnergy = () => {};
  container.innerHTML = '';
}
