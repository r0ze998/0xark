// trade-screen.js — Phase 20-C: Trade Floor marketplace

function _injectCSS() {
  if (document.getElementById('trade-css')) return;
  const s = document.createElement('style');
  s.id = 'trade-css';
  s.textContent = `
.trade-screen {
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
.trade-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 960px;
  margin-bottom: 0.75rem;
  flex-shrink: 0;
}
.trade-back-btn {
  background: none;
  border: 1px solid #555;
  color: #888;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  font-family: 'VT323', monospace;
  font-size: 1rem;
  transition: border-color 0.2s, color 0.2s;
}
.trade-back-btn:hover { border-color: var(--accent-gold); color: var(--accent-gold); }
.trade-header h2 { font-size: 2rem; letter-spacing: 0.2em; color: var(--accent-gold); margin: 0; flex: 1; }
.create-listing-btn {
  background: rgba(201, 162, 39, 0.1);
  border: 1px solid var(--accent-gold);
  color: var(--accent-gold);
  padding: 0.5rem 1.2rem;
  cursor: pointer;
  font-family: 'VT323', monospace;
  font-size: 1.1rem;
  transition: background 0.2s;
}
.create-listing-btn:hover { background: rgba(201, 162, 39, 0.2); }
.trade-filters {
  display: flex;
  gap: 1rem;
  margin: 0 0 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
  width: 100%;
  max-width: 960px;
  flex-shrink: 0;
}
.trade-filters select {
  background: #0d1221;
  border: 1px solid #333;
  color: var(--text-cream);
  padding: 0.4rem 0.8rem;
  font-family: 'VT323', monospace;
  font-size: 1rem;
  cursor: pointer;
}
.trade-filters select:focus { outline: 1px solid var(--accent-gold); }
.trade-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1.5rem;
  width: 100%;
  max-width: 960px;
}
.listing-card {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--accent-gold);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: background 0.15s, transform 0.15s;
}
.listing-card:hover { background: rgba(201, 162, 39, 0.07); transform: translateY(-2px); }
.trade-card-frame {
  width: 120px;
  height: 170px;
  border: 2px solid var(--rarity-color, #555);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  position: relative;
  margin-bottom: 0.5rem;
}
.trade-card-id {
  font-size: 2rem;
  color: var(--rarity-color, #888);

}
.trade-card-name {
  font-size: 0.8rem;
  color: #aaa;
  text-align: center;
  padding: 0 4px;
  margin-top: 4px;
}
.trade-card-rarity {
  font-size: var(--fs-caption);
  letter-spacing: 0.1em;
  color: var(--rarity-color, #888);
  text-transform: uppercase;
  margin-top: 4px;
}
.listing-info {
  margin-top: 0.5rem;
  text-align: center;
  width: 100%;
}
.listing-price {
  font-size: 1.2rem;
  color: var(--accent-gold);

  margin: 0 0 0.2rem;
}
.listing-seller {
  font-size: 0.8rem;
  color: #666;
  margin: 0 0 0.5rem;
}
.buy-listing-btn, .cancel-listing-btn {
  padding: 0.4rem 1rem;
  font-family: 'VT323', monospace;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.15s;
  width: 100%;
}
.buy-listing-btn {
  background: rgba(201, 162, 39, 0.1);
  border: 1px solid var(--accent-gold);
  color: var(--accent-gold);
}
.buy-listing-btn:hover { background: rgba(201, 162, 39, 0.25); }
.cancel-listing-btn {
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid #dc3545;
  color: #dc3545;
}
.cancel-listing-btn:hover { background: rgba(220, 53, 69, 0.25); }
.trade-empty {
  grid-column: 1 / -1;
  text-align: center;
  color: #555;
  font-size: 1.3rem;
  padding: 4rem 0;
}
.trade-info {
  margin-top: 1rem;
  color: #555;
  font-size: 0.9rem;
  text-align: center;
  line-height: 1.8;
}
.trade-loading {
  color: #555;
  font-size: 1.3rem;
  margin: 4rem 0;
}
/* Modal */
.trade-modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.trade-modal {
  background: #0d1221;
  border: 2px solid var(--accent-gold);
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  font-family: 'VT323', monospace;
  color: var(--text-cream);
}
.trade-modal h3 {
  font-size: 1.8rem;
  color: var(--accent-gold);
  margin: 0 0 1rem;
  letter-spacing: 0.1em;
}
.modal-vault-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 0.75rem;
  max-height: 240px;
  overflow-y: auto;
  margin: 1rem 0;
}
.modal-card-tile {
  border: 2px solid #333;
  cursor: pointer;
  padding: 0.4rem;
  text-align: center;
  background: rgba(0,0,0,0.3);
  transition: border-color 0.15s, background 0.15s;
}
.modal-card-tile:hover { border-color: #888; background: rgba(201,162,39,0.07); }
.modal-card-tile.selected { border-color: var(--accent-gold); background: rgba(201,162,39,0.15); }
.modal-card-num { font-size: 1.6rem; color: var(--accent-gold); display: block; }
.modal-card-label { font-size: var(--fs-caption); color: #888; }
.price-input-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1rem 0;
}
.price-input-row label { color: #888; font-size: 1rem; }
.price-input-row input {
  background: var(--bg-deep);
  border: 1px solid #555;
  color: var(--text-cream);
  padding: 0.4rem 0.6rem;
  font-family: 'VT323', monospace;
  font-size: 1.1rem;
  width: 120px;
}
.price-input-row input:focus { outline: 1px solid var(--accent-gold); }
.modal-actions { display: flex; gap: 1rem; margin-top: 1rem; }
.modal-btn-primary {
  flex: 1;
  background: rgba(201,162,39,0.15);
  border: 1px solid var(--accent-gold);
  color: var(--accent-gold);
  padding: 0.6rem;
  cursor: pointer;
  font-family: 'VT323', monospace;
  font-size: 1.2rem;
  transition: background 0.15s;
}
.modal-btn-primary:hover:not(:disabled) { background: rgba(201,162,39,0.3); }
.modal-btn-primary:disabled { opacity: 0.4; cursor: default; }
.modal-btn-secondary {
  background: none;
  border: 1px solid #555;
  color: #888;
  padding: 0.6rem 1.2rem;
  cursor: pointer;
  font-family: 'VT323', monospace;
  font-size: 1.2rem;
}
.modal-btn-secondary:hover { border-color: #888; color: #aaa; }
/* Toast */
.trade-toast {
  position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
  padding: 0.75rem 1.5rem;
  font-family: 'VT323', monospace;
  font-size: 1.2rem;
  z-index: 200;
  border: 1px solid;
  animation: toastIn 0.2s ease;
}
.trade-toast--success { background: rgba(40,167,69,0.9); border-color: #28a745; color: #fff; }
.trade-toast--error   { background: rgba(220,53,69,0.9);  border-color: #dc3545; color: #fff; }
.trade-toast--info    { background: rgba(0,0,0,0.9);       border-color: #555;    color: var(--text-cream); }
@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
`;
  document.head.appendChild(s);
}

// ── Card helpers ─────────────────────────────────────────────────────────────

const CARD_NAMES = [
  '', // 0 unused
  'Aegis','Umbra','Ignis','Tempest','Nihil','Alethea',           // 1-6  Common Knight
  'Riven','Dusk','Cinder','Zephyr','Null','Lumen',              // 7-12 Common Merchant
  'Verdant','Drift','Ember','Gale','Abyss','Beam',              // 13-18 Common Pirate
  'Warden','Shade','Pyre','Gust','Void','Ray',                  // 19-24 Common Scholar
  'Bastion','Shadow','Blaze','Surge','Rift','Gleam',            // 25-30 Common Monk
  'Crusader','Phantom','Salamander','Seer','Observer','Enigma', // 31-36 Uncommon
  'Champion','Wraith','Phoenix','Oracle','Specter','Mystic',    // 37-42 Uncommon
  'Paladin','Revenant','Inferno','Cyclone','Nihility','Radiance',// 43-48 Uncommon
  'Vanguard','Nightfall','Volcano','Typhoon','Abyss Rift','Nova',// 49-54 Rare
  'Kingmaker','Nameless Blade','Elyon Crown','Sceptre','Void Lord','Ascendant', // 55-60 Legendary
];

function _rarityOf(id) {
  if (id >= 55) return 'legendary';
  if (id >= 49) return 'rare';
  if (id >= 31) return 'uncommon';
  return 'common';
}

function _rarityColor(id) {
  if (id >= 55) return '#f0b93a';
  if (id >= 49) return '#9b59b6';
  if (id >= 31) return '#3498db';
  return '#7f8c8d';
}

function _cardFrameHTML(cardId) {
  const name   = CARD_NAMES[cardId] ?? `Card #${cardId}`;
  const rarity = _rarityOf(cardId);
  const color  = _rarityColor(cardId);
  return `
    <div class="trade-card-frame" style="--rarity-color:${color}">
      <span class="trade-card-id">${cardId}</span>
      <span class="trade-card-name">${name}</span>
      <span class="trade-card-rarity">${rarity}</span>
    </div>`;
}

function _shortAddr(addr) {
  const s = typeof addr === 'string' ? addr : (addr?.toString?.() ?? '');
  return s.length > 8 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s;
}

// ── Filter/sort helpers ───────────────────────────────────────────────────────

const CLAN_RANGES = [
  { name: 'Knight',   start: 1  },
  { name: 'Merchant', start: 7  },
  { name: 'Pirate',   start: 13 },
  { name: 'Scholar',  start: 19 },
  { name: 'Monk',     start: 25 },
  { name: 'Engineer', start: 31 },
];

function _clanOf(id) {
  if (id <= 0 || id > 60) return -1;
  if (id >= 31) {
    const off = (id - 31) % 6;
    return off; // 0-5 = clan index for Uncommon/Rare/Legendary (shared clan mapping)
  }
  return Math.floor((id - 1) / 6);
}

function _rarityKey(id) {
  if (id >= 55) return 'l';
  if (id >= 49) return 'r';
  if (id >= 31) return 'u';
  return 'c';
}

function _applyFilters(listings, filterClan, filterRarity, sortMode) {
  let out = listings.slice();
  if (filterClan !== '')   out = out.filter(l => _clanOf(l.cardId) === parseInt(filterClan));
  if (filterRarity !== '') out = out.filter(l => _rarityKey(l.cardId) === filterRarity);
  if (sortMode === 'price-asc')  out.sort((a, b) => a.price - b.price);
  if (sortMode === 'price-desc') out.sort((a, b) => b.price - a.price);
  if (sortMode === 'newest')     out.sort((a, b) => b.createdAt - a.createdAt);
  return out;
}

// ── Module state ─────────────────────────────────────────────────────────────

let _container = null;
let _listings   = [];
let _myPubkey   = '';

// ── Toast ─────────────────────────────────────────────────────────────────────

function _toast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `trade-toast trade-toast--${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── Render listings ───────────────────────────────────────────────────────────

function _renderListings(listings) {
  if (listings.length === 0) {
    return '<div class="trade-empty">No listings found</div>';
  }
  return listings.map(l => {
    const isMine = l.seller === _myPubkey;
    const btn = isMine
      ? `<button class="cancel-listing-btn" data-card-id="${l.cardId}">CANCEL</button>`
      : `<button class="buy-listing-btn"    data-card-id="${l.cardId}" data-seller="${l.seller}">BUY</button>`;
    return `
      <div class="listing-card" data-card-id="${l.cardId}" data-seller="${l.seller}">
        ${_cardFrameHTML(l.cardId)}
        <div class="listing-info">
          <p class="listing-price">${(l.price / 1e9).toFixed(3)} SOL</p>
          <p class="listing-seller">${_shortAddr(l.seller)}</p>
          ${btn}
        </div>
      </div>`;
  }).join('');
}

// ── Fetch all listings ────────────────────────────────────────────────────────

async function _fetchAllListings() {
  if (!window.oxarkOnchain?.fetchAllListings) return [];
  try {
    return await window.oxarkOnchain.fetchAllListings();
  } catch (e) {
    console.error('fetchAllListings failed:', e);
    return [];
  }
}

// ── Re-render grid ────────────────────────────────────────────────────────────

function _refreshGrid() {
  const grid = document.getElementById('trade-grid');
  if (!grid) return;
  const filterClan   = document.getElementById('filter-clan')?.value   ?? '';
  const filterRarity = document.getElementById('filter-rarity')?.value ?? '';
  const sortMode     = document.getElementById('filter-sort')?.value   ?? 'price-asc';
  const filtered = _applyFilters(_listings, filterClan, filterRarity, sortMode);
  grid.innerHTML = _renderListings(filtered);
  _bindGridButtons(grid);
}

function _bindGridButtons(grid) {
  grid.querySelectorAll('.buy-listing-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cardId = parseInt(btn.dataset.cardId);
      const seller = btn.dataset.seller;
      btn.disabled = true;
      btn.textContent = '…';
      try {
        await window.oxarkOnchain.acceptListing(cardId, seller);
        _toast('Card purchased!', 'success');
        _listings = await _fetchAllListings();
        _refreshGrid();
      } catch (e) {
        _toast(e.message ?? 'Purchase failed', 'error');
        btn.disabled = false;
        btn.textContent = 'BUY';
      }
    });
  });
  grid.querySelectorAll('.cancel-listing-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cardId = parseInt(btn.dataset.cardId);
      btn.disabled = true;
      btn.textContent = '…';
      try {
        await window.oxarkOnchain.cancelListing(cardId);
        _toast('Listing cancelled', 'success');
        _listings = await _fetchAllListings();
        _refreshGrid();
      } catch (e) {
        _toast(e.message ?? 'Cancel failed', 'error');
        btn.disabled = false;
        btn.textContent = 'CANCEL';
      }
    });
  });
}

// ── Create Listing modal ──────────────────────────────────────────────────────

function _showCreateListingModal(playerState) {
  // Decode vault bitmap → array of owned card ids
  const bitmap = playerState?.vault_bitmap ?? [];
  const myCards = [];
  for (let i = 0; i < 60; i++) {
    const byte = bitmap[Math.floor(i / 8)] ?? 0;
    if ((byte >> (i % 8)) & 1) myCards.push(i + 1);
  }

  // Filter out cards already listed by this player
  const listed = new Set(_listings.filter(l => l.seller === _myPubkey).map(l => l.cardId));
  const available = myCards.filter(id => !listed.has(id));

  let selectedCardId = null;

  const overlay = document.createElement('div');
  overlay.className = 'trade-modal-overlay';
  overlay.innerHTML = `
    <div class="trade-modal">
      <h3>List a Card</h3>
      <p style="color:#888;font-size:0.95rem">Select a card from your vault:</p>
      <div class="modal-vault-grid">
        ${available.length === 0
          ? '<p style="color:#555;grid-column:1/-1">No cards available to list</p>'
          : available.map(id => `
            <div class="modal-card-tile" data-id="${id}">
              <span class="modal-card-num">${id}</span>
              <span class="modal-card-label">${_rarityOf(id)}</span>
            </div>`).join('')}
      </div>
      <div class="price-input-row">
        <label>Price (SOL):</label>
        <input type="number" id="listing-price-input" min="0.001" step="0.001" value="0.05">
      </div>
      <div class="modal-actions">
        <button id="confirm-listing-btn" class="modal-btn-primary" disabled>LIST</button>
        <button id="cancel-modal-btn"    class="modal-btn-secondary">CANCEL</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  // Card selection
  overlay.querySelectorAll('.modal-card-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      overlay.querySelectorAll('.modal-card-tile').forEach(t => t.classList.remove('selected'));
      tile.classList.add('selected');
      selectedCardId = parseInt(tile.dataset.id);
      document.getElementById('confirm-listing-btn').disabled = false;
    });
  });

  // Confirm
  document.getElementById('confirm-listing-btn').addEventListener('click', async () => {
    if (!selectedCardId) return;
    const priceSOL = parseFloat(document.getElementById('listing-price-input').value);
    if (!priceSOL || priceSOL < 0.001) { _toast('Minimum price is 0.001 SOL', 'error'); return; }
    const priceLamports = Math.round(priceSOL * 1e9);
    const btn = document.getElementById('confirm-listing-btn');
    btn.disabled = true;
    btn.textContent = '…';
    try {
      await window.oxarkOnchain.createListing(selectedCardId, priceLamports);
      _toast(`Listed for ${priceSOL} SOL`, 'success');
      overlay.remove();
      _listings = await _fetchAllListings();
      _refreshGrid();
    } catch (e) {
      _toast(e.message ?? 'Listing failed', 'error');
      btn.disabled = false;
      btn.textContent = 'LIST';
    }
  });

  document.getElementById('cancel-modal-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function mount(container, props = {}) {
  _injectCSS();
  _container = container;
  _myPubkey  = window.oxarkWallet?.getPublicKey?.()?.toString?.() ?? '';

  container.innerHTML = `
    <div class="trade-screen">
      <div class="trade-header">
        <button class="trade-back-btn" id="trade-back">← Home</button>
        <h2>TRADE FLOOR</h2>
        <button class="create-listing-btn" id="create-listing-btn">+ List a Card</button>
      </div>

      <div class="trade-filters">
        <select id="filter-clan">
          <option value="">All clans</option>
          <option value="0">Knight</option>
          <option value="1">Merchant</option>
          <option value="2">Pirate</option>
          <option value="3">Scholar</option>
          <option value="4">Monk</option>
          <option value="5">Engineer</option>
        </select>
        <select id="filter-rarity">
          <option value="">All rarities</option>
          <option value="c">Common</option>
          <option value="u">Uncommon</option>
          <option value="r">Rare</option>
          <option value="l">Legendary</option>
        </select>
        <select id="filter-sort">
          <option value="price-asc">Price: Low → High</option>
          <option value="price-desc">Price: High → Low</option>
          <option value="newest">Newest first</option>
        </select>
      </div>

      <div class="trade-grid" id="trade-grid">
        <div class="trade-loading">Loading listings…</div>
      </div>

      <div class="trade-info">
        <p>0% Trading Fee — Direct seller-to-buyer</p>
        <p>Card escrowed when listed, returned if cancelled</p>
      </div>
    </div>
  `;

  document.getElementById('trade-back').addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('nav:home'));
  });

  document.getElementById('create-listing-btn').addEventListener('click', () => {
    _showCreateListingModal(props.playerState ?? {});
  });

  ['filter-clan', 'filter-rarity', 'filter-sort'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', _refreshGrid);
  });

  // Load listings async
  _listings = await _fetchAllListings();
  _refreshGrid();
}

export function unmount(container) {
  _container = null;
  container.innerHTML = '';
}
