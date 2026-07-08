// shop-screen.js — Phase 20-B: Pack shop with reveal animation

function _injectCSS() {
  if (document.getElementById('shop-css')) return;
  const s = document.createElement('style');
  s.id = 'shop-css';
  s.textContent = `
.shop-screen {
  font-family: 'VT323', monospace;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: var(--bg-deep);
  color: var(--text-cream);
}
.shop-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 800px;
  margin-bottom: 0.75rem;
  flex-shrink: 0;
}
.shop-back-btn {
  background: none;
  border: 1px solid #555;
  color: #888;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  font-family: 'VT323', monospace;
  font-size: 1rem;
  transition: border-color 0.2s, color 0.2s;
}
.shop-back-btn:hover { border-color: var(--accent-gold); color: var(--accent-gold); }
.shop-header h2 { font-size: 2rem; letter-spacing: 0.2em; color: var(--accent-gold); margin: 0; }
.shop-phase-badge {
  margin-left: auto;
  font-size: 0.85rem;
  color: #888;
  border: 1px solid #333;
  padding: 0.2rem 0.6rem;
}
.shop-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  max-width: 800px;
  width: 100%;
  margin: 0 auto 0.5rem;
}
.pack-card {
  background: rgba(201, 162, 39, 0.05);
  border: 2px solid var(--accent-gold);
  padding: 1rem 1.25rem;
  text-align: center;
  transition: background 0.2s, transform 0.15s;
}
.pack-card:hover { background: rgba(201, 162, 39, 0.1); transform: translateY(-2px); }
.pack-card.pack-premium { border-color: #e8d4a0; background: rgba(216, 176, 52, 0.08); }
.pack-card.pack-premium:hover { background: rgba(216, 176, 52, 0.15); }
.pack-icon { font-size: 2.5rem; margin-bottom: 0.25rem; display: block; }
.pack-card h3 { font-size: 1.6rem; color: var(--accent-gold); margin: 0 0 0.5rem; letter-spacing: 0.1em; }
.pack-card.pack-premium h3 { color: #e8d4a0; }
.pack-content { font-size: 1rem; color: #aaa; margin: 0.25rem 0; }
.pack-rates {
  font-size: 0.82rem;
  color: #888;
  margin: 0.75rem 0;
  line-height: 1.5;
  border-top: 1px solid #222;
  padding-top: 0.5rem;
}
.pack-price { font-size: 1.8rem; color: var(--accent-gold); margin: 0.75rem 0; font-weight: bold; }
.pack-card.pack-premium .pack-price { color: #e8d4a0; }
.pack-buy-btn {
  background: rgba(201, 162, 39, 0.1);
  border: 2px solid var(--accent-gold);
  color: var(--accent-gold);
  padding: 0.75rem 2rem;
  cursor: pointer;
  font-family: 'VT323', monospace;
  font-size: 1.3rem;
  letter-spacing: 0.1em;
  width: 100%;
  transition: background 0.2s;
}
.pack-buy-btn:hover:not(:disabled) { background: rgba(201, 162, 39, 0.25); }
.pack-buy-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pack-card.pack-premium .pack-buy-btn { border-color: #e8d4a0; color: #e8d4a0; background: rgba(216, 176, 52, 0.08); }
.pack-card.pack-premium .pack-buy-btn:hover:not(:disabled) { background: rgba(216, 176, 52, 0.2); }
.shop-info {
  text-align: center;
  margin-top: 1rem;
  color: #555;
  font-size: 0.85rem;
  line-height: 1.8;
}

/* Pack reveal modal */
.reveal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  font-family: 'VT323', monospace;
}
.reveal-title { font-size: 2rem; color: var(--accent-gold); letter-spacing: 0.2em; margin-bottom: 1.5rem; }
.reveal-cards { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; margin-bottom: 1.5rem; }
.reveal-card-slot {
  width: 80px; height: 120px;
  border: 2px solid #333;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-deep);
  transition: all 0.4s ease;
  position: relative;
  overflow: hidden;
}
.reveal-card-slot.flipping { animation: cardFlip 0.6s ease forwards; }
.reveal-card-slot.revealed { border-color: var(--accent-gold); background: rgba(201, 162, 39, 0.1); }
.reveal-card-slot.rarity-uncommon { border-color: #4a9; background: rgba(68, 170, 136, 0.1); }
.reveal-card-slot.rarity-rare     { border-color: #66f; background: rgba(102, 102, 255, 0.1); }
.reveal-card-slot.rarity-legendary{ border-color: #f90; background: rgba(255, 153, 0, 0.15);
  box-shadow: 0 0 12px rgba(255, 153, 0, 0.4); }
.reveal-card-id { font-size: 1.6rem; color: var(--accent-gold); }
.reveal-card-label { font-size: 0.7rem; color: #888; }
.reveal-close-btn {
  background: none;
  border: 2px solid var(--accent-gold);
  color: var(--accent-gold);
  padding: 0.5rem 2rem;
  font-family: 'VT323', monospace;
  font-size: 1.2rem;
  cursor: pointer;
  letter-spacing: 0.1em;
}
.reveal-close-btn:hover { background: rgba(201, 162, 39, 0.15); }
@keyframes cardFlip {
  0%   { transform: rotateY(0deg);   }
  50%  { transform: rotateY(90deg);  }
  100% { transform: rotateY(0deg);   }
}

/* Toast */
.wg-toast {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.6rem 1.4rem;
  font-family: 'VT323', monospace;
  font-size: 1rem;
  border-radius: 2px;
  z-index: 200;
  animation: toastIn 0.2s ease;
}
.wg-toast--success { background: #1a3a2a; border: 1px solid #4a9; color: #4a9; }
.wg-toast--error   { background: #3a1a1a; border: 1px solid #a44; color: #a44; }
.wg-toast--info    { background: #1a2230; border: 1px solid var(--accent-gold); color: var(--accent-gold); }
@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
`;
  document.head.appendChild(s);
}

function _toast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `wg-toast wg-toast--${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function _cardRarity(id) {
  if (id >= 55) return 'legendary';
  if (id >= 49) return 'rare';
  if (id >= 31) return 'uncommon';
  return 'common';
}

function _rarityLabel(id) {
  const map = { legendary: 'LEGENDARY', rare: 'RARE', uncommon: 'UNCOMMON', common: 'COMMON' };
  return map[_cardRarity(id)] || 'COMMON';
}

function _showRevealModal(cardIds) {
  const overlay = document.createElement('div');
  overlay.className = 'reveal-overlay';

  const title = document.createElement('div');
  title.className = 'reveal-title';
  title.textContent = 'PACK OPENED!';

  const cardsRow = document.createElement('div');
  cardsRow.className = 'reveal-cards';

  const slots = cardIds.map(() => {
    const slot = document.createElement('div');
    slot.className = 'reveal-card-slot';
    slot.innerHTML = '<span style="color:#333;font-size:2rem">?</span>';
    cardsRow.appendChild(slot);
    return slot;
  });

  const closeBtn = document.createElement('button');
  closeBtn.className = 'reveal-close-btn';
  closeBtn.textContent = 'CONTINUE';
  closeBtn.onclick = () => overlay.remove();

  overlay.append(title, cardsRow, closeBtn);
  document.body.appendChild(overlay);

  // Flip each card 800ms apart
  cardIds.forEach((id, i) => {
    setTimeout(() => {
      const slot = slots[i];
      slot.classList.add('flipping');
      setTimeout(() => {
        slot.classList.remove('flipping');
        slot.classList.add('revealed', `rarity-${_cardRarity(id)}`);
        slot.innerHTML = `<span class="reveal-card-id">#${id}</span><span class="reveal-card-label">${_rarityLabel(id)}</span>`;
      }, 300);
    }, i * 800);
  });
}

function _buildPhaseInfo(gameWorld) {
  if (!gameWorld?.game_start_timestamp) return 'Phase 1';
  const elapsed = Math.floor(Date.now() / 1000) - gameWorld.game_start_timestamp;
  const thresholdSecs = gameWorld.shop_phase_threshold_seconds ?? 7 * 24 * 3600;
  return elapsed >= thresholdSecs ? 'Phase 2 (Legendary unlocked)' : 'Phase 1 (Day 1-7)';
}

export function mount(container, props = {}) {
  _injectCSS();
  const { gameWorld = {} } = props;
  const phaseInfo = _buildPhaseInfo(gameWorld);

  container.innerHTML = `
    <div class="shop-screen">
      <div class="shop-header">
        <button class="shop-back-btn" id="shop-back-btn">← Home</button>
        <h2>SHOP</h2>
        <span class="shop-phase-badge">${phaseInfo}</span>
      </div>

      <div class="shop-grid">
        <div class="pack-card pack-standard">
          <span class="pack-icon">📦</span>
          <h3>Standard Pack</h3>
          <p class="pack-content">5 random cards</p>
          <p class="pack-rates">
            Common 80% · Uncommon 18% · Rare 2%<br>
            Legendary 0% → 1.5% (Phase 2)
          </p>
          <p class="pack-price">0.05 SOL</p>
          <button class="pack-buy-btn" id="buy-standard-btn">BUY</button>
        </div>

        <div class="pack-card pack-premium">
          <span class="pack-icon">✨</span>
          <h3>Premium Pack</h3>
          <p class="pack-content">3 cards</p>
          <p class="pack-rates">
            +1 Uncommon GUARANTEED<br>
            +2 cards at standard rates
          </p>
          <p class="pack-price">0.15 SOL</p>
          <button class="pack-buy-btn" id="buy-premium-btn">BUY</button>
        </div>
      </div>

      <div class="shop-info">
        <p>📊 Revenue: 50% Operations / 50% Prize Pool</p>
        <p>🎲 Verifiable randomness via Solana SlotHashes</p>
      </div>
    </div>
  `;

  document.getElementById('shop-back-btn').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:home'));
  });

  document.getElementById('buy-standard-btn').addEventListener('click', () => _buyPack(0));
  document.getElementById('buy-premium-btn').addEventListener('click', () => _buyPack(1));
}

async function _buyPack(packType) {
  const btnId = packType === 0 ? 'buy-standard-btn' : 'buy-premium-btn';
  const btn   = document.getElementById(btnId);
  if (!btn) return;

  try {
    btn.disabled    = true;
    btn.textContent = 'CONFIRMING...';

    const result = await window.oxarkOnchain.buyPack(packType);
    _toast(`Pack opened! ${result.cardIds.length} cards received.`, 'success');
    _showRevealModal(result.cardIds);
  } catch (err) {
    _toast(`Purchase failed: ${err.message}`, 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'BUY';
  }
}

export function unmount(container) {
  container.innerHTML = '';
}
