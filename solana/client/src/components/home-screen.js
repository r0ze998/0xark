// home-screen.js — Phase 20-C: 4-button navigation hub (SHOP + TRADE enabled)

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
  font-size: 1.5rem; font-weight: bold; letter-spacing: 0.1em;
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
  if (vaultCount >= 60) return { tier: 1, percent: 50 };
  if (vaultCount >= 50) return { tier: 2, percent: 25 };
  if (vaultCount >= 30) return { tier: 3, percent: 15 };
  if (vaultCount >= 10) return { tier: 4, percent: 8 };
  return { tier: 5, percent: 2 };
}

function _toast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `wg-toast wg-toast--${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

export function mount(container, props = {}) {
  _injectCSS();

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
      </div>

      <div class="home-grid">
        <button class="home-btn" id="btn-battle">
          <span class="home-btn-icon">⚔</span>
          <span class="home-btn-title">BATTLE</span>
          <span class="home-btn-subtitle">Find a duel</span>
        </button>

        <button class="home-btn" id="btn-vault">
          <span class="home-btn-icon">📦</span>
          <span class="home-btn-title">VAULT</span>
          <span class="home-btn-subtitle">See cards</span>
        </button>

        <button class="home-btn" id="btn-shop">
          <span class="home-btn-icon">💰</span>
          <span class="home-btn-title">SHOP</span>
          <span class="home-btn-subtitle">Buy card packs</span>
        </button>

        <button class="home-btn" id="btn-trade">
          <span class="home-btn-icon">🤝</span>
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
}

export function unmount(container) {
  container.innerHTML = '';
}
