import { injectStyle } from '../lib/inject-style.js';
import { TRADE_SCREEN_CSS } from '../style/trade-screen.js';
import { CardFrameHTML, injectCardCSS } from './common/Card.js';
// trade-screen.js — Phase 20-C: Trade Floor marketplace
import { showToast } from '../lib/ui-shared.js';
import { factionOf, rarityKeyOf } from '../lib/card-meta.js';
import { createScreenScope } from '../lib/screen-scope.js';
const _toast = (msg, type) => showToast(msg, type, { className: 'trade-toast' });

function _injectCSS() {
  injectStyle('trade-css', TRADE_SCREEN_CSS);
}

// ── Card helpers ─────────────────────────────────────────────────────────────

function _rarityOf(id) {
  if (id >= 55) return 'legendary';
  if (id >= 49) return 'rare';
  if (id >= 31) return 'uncommon';
  return 'common';
}

function _cardFrameHTML(cardId) {
  return CardFrameHTML({ id: cardId });
}

function _shortAddr(addr) {
  const s = typeof addr === 'string' ? addr : (addr?.toString?.() ?? '');
  return s.length > 8 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s;
}

// ── Filter/sort helpers ───────────────────────────────────────────────────────
// Faction/rarity come from card-meta (cards.js data). The old CLAN_RANGES /
// _clanOf / _rarityKey modeled a fictional 6-per-clan interleave and mislabeled
// both filters — removed.

function _applyFilters(listings, filterClan, filterRarity, sortMode) {
  let out = listings.slice();
  if (filterClan !== '')   out = out.filter(l => factionOf(l.cardId) === parseInt(filterClan));
  if (filterRarity !== '') out = out.filter(l => rarityKeyOf(l.cardId) === filterRarity);
  if (sortMode === 'price-asc')  out.sort((a, b) => a.price - b.price);
  if (sortMode === 'price-desc') out.sort((a, b) => b.price - a.price);
  if (sortMode === 'newest')     out.sort((a, b) => b.createdAt - a.createdAt);
  return out;
}

// ── Module state ─────────────────────────────────────────────────────────────

let _screen = null;

function _isActive(screen) {
  return screen.scope.active && screen.root?.isConnected;
}

// ── Render listings ───────────────────────────────────────────────────────────

function _renderListings(listings, myPubkey) {
  if (listings.length === 0) {
    return '<div class="trade-empty">No listings found</div>';
  }
  return listings.map(l => {
    const isMine = l.seller === myPubkey;
    const btn = window.oxarkPreview ? '<button disabled class="listing-preview-btn">Sample listing</button>' : isMine
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
  if (window.oxarkPreview) return [10, 23, 40, 18, 55, 48].map((cardId, i) => ({ cardId, seller: 'Practice listing', price: (i + 1) * 12000000, createdAt: i }));
  if (!window.oxarkOnchain?.fetchAllListings) return [];
  try {
    return await window.oxarkOnchain.fetchAllListings();
  } catch (e) {
    console.error('fetchAllListings failed:', e);
    return [];
  }
}

// ── Re-render grid ────────────────────────────────────────────────────────────

async function _loadListings(screen) {
  if (!_isActive(screen)) return;
  const request = ++screen.listingRead;
  const listings = await _fetchAllListings();
  if (!_isActive(screen) || request !== screen.listingRead) return;
  screen.listings = listings;
  _refreshGrid(screen);
}

function _refreshGrid(screen) {
  if (!_isActive(screen)) return;
  const grid = screen.root.querySelector('#trade-grid');
  if (!grid) return;
  const filterClan   = screen.root.querySelector('#filter-clan')?.value   ?? '';
  const filterRarity = screen.root.querySelector('#filter-rarity')?.value ?? '';
  const sortMode     = screen.root.querySelector('#filter-sort')?.value   ?? 'price-asc';
  const filtered = _applyFilters(screen.listings, filterClan, filterRarity, sortMode);
  grid.innerHTML = _renderListings(filtered, screen.myPubkey);
  _bindGridButtons(screen, grid);
}

function _bindGridButtons(screen, grid) {
  grid.querySelectorAll('.buy-listing-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!_isActive(screen) || !btn.isConnected || btn.disabled) return;
      const cardId = parseInt(btn.dataset.cardId);
      const seller = btn.dataset.seller;
      btn.disabled = true;
      btn.textContent = '…';
      try {
        await window.oxarkOnchain.acceptListing(cardId, seller);
        if (!_isActive(screen)) return;
        _toast('Card purchased!', 'success');
        await _loadListings(screen);
      } catch (e) {
        if (!_isActive(screen)) return;
        _toast(e.message ?? 'Purchase failed', 'error');
        btn.disabled = false;
        btn.textContent = 'BUY';
      }
    });
  });
  grid.querySelectorAll('.cancel-listing-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!_isActive(screen) || !btn.isConnected || btn.disabled) return;
      const cardId = parseInt(btn.dataset.cardId);
      btn.disabled = true;
      btn.textContent = '…';
      try {
        await window.oxarkOnchain.cancelListing(cardId);
        if (!_isActive(screen)) return;
        _toast('Listing cancelled', 'success');
        await _loadListings(screen);
      } catch (e) {
        if (!_isActive(screen)) return;
        _toast(e.message ?? 'Cancel failed', 'error');
        btn.disabled = false;
        btn.textContent = 'CANCEL';
      }
    });
  });
}

// ── Create Listing modal ──────────────────────────────────────────────────────

function _showCreateListingModal(screen, playerState) {
  if (!_isActive(screen)) return;
  screen.closeModal?.();
  const scope = createScreenScope();
  // Decode vault bitmap → array of owned card ids
  const bitmap = playerState?.vault_bitmap ?? [];
  const myCards = [];
  for (let i = 0; i < 60; i++) {
    const byte = bitmap[Math.floor(i / 8)] ?? 0;
    if ((byte >> (i % 8)) & 1) myCards.push(i + 1);
  }

  // Filter out cards already listed by this player
  const listed = new Set(screen.listings.filter(l => l.seller === screen.myPubkey).map(l => l.cardId));
  const available = myCards.filter(id => !listed.has(id));

  let selectedCardId = null;
  let submitting = false;

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
  const close = screen.scope.defer(() => scope.dispose());
  screen.closeModal = close;
  scope.defer(() => {
    overlay.remove();
    if (screen.closeModal === close) screen.closeModal = null;
  });
  const isActive = () => _isActive(screen) && scope.active && overlay.isConnected;
  const btn = overlay.querySelector('#confirm-listing-btn');
  const priceInput = overlay.querySelector('#listing-price-input');

  // Card selection
  overlay.querySelectorAll('.modal-card-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      if (!isActive() || submitting) return;
      overlay.querySelectorAll('.modal-card-tile').forEach(t => t.classList.remove('selected'));
      tile.classList.add('selected');
      selectedCardId = parseInt(tile.dataset.id);
      btn.disabled = false;
    });
  });

  // Confirm
  btn.addEventListener('click', async () => {
    if (!isActive() || submitting || btn.disabled || !selectedCardId) return;
    const priceSOL = parseFloat(priceInput.value);
    if (!priceSOL || priceSOL < 0.001) { _toast('Minimum price is 0.001 SOL', 'error'); return; }
    const priceLamports = Math.round(priceSOL * 1e9);
    submitting = true;
    btn.disabled = true;
    btn.textContent = '…';
    try {
      await window.oxarkOnchain.createListing(selectedCardId, priceLamports);
      if (isActive()) {
        _toast(`Listed for ${priceSOL} SOL`, 'success');
        close();
      }
      // A dismissed dialog does not cancel a submitted transaction. Refresh its
      // still-mounted exchange after confirmation, without touching another modal.
      await _loadListings(screen);
    } catch (e) {
      if (!isActive()) return;
      submitting = false;
      _toast(e.message ?? 'Listing failed', 'error');
      btn.disabled = false;
      btn.textContent = 'LIST';
    }
  });

  overlay.querySelector('#cancel-modal-btn').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function mount(container, props = {}) {
  _screen?.scope.dispose();
  _injectCSS();
  injectCardCSS();
  const screen = { container, root: null, scope: createScreenScope(), listings: [],
    listingRead: 0, closeModal: null,
    myPubkey: window.oxarkWallet?.getPublicKey?.()?.toString?.() ?? '' };
  _screen = screen;

  container.innerHTML = `
    <div class="trade-screen">
      <div class="trade-header">
        <button class="trade-back-btn" id="trade-back">← Home</button>
        <h2>The exchange</h2>
        <button class="create-listing-btn" id="create-listing-btn" ${window.oxarkPreview ? 'disabled' : ''}>+ List a Card</button>
      </div>

      <div class="trade-filters">
        <select id="filter-clan" aria-label="Filter by faction">
          <option value="">All clans</option>
          <option value="0">Knight</option>
          <option value="1">Merchant</option>
          <option value="2">Pirate</option>
          <option value="3">Scholar</option>
          <option value="4">Monk</option>
          <option value="5">Engineer</option>
        </select>
        <select id="filter-rarity" aria-label="Filter by rarity">
          <option value="">All rarities</option>
          <option value="c">Common</option>
          <option value="u">Uncommon</option>
          <option value="r">Rare</option>
          <option value="l">Legendary</option>
        </select>
        <select id="filter-sort" aria-label="Sort listings">
          <option value="price-asc">Price: Low → High</option>
          <option value="price-desc">Price: High → Low</option>
          <option value="newest">Newest first</option>
        </select>
      </div>

      <div class="trade-grid" id="trade-grid">
        <div class="trade-loading">Loading listings…</div>
      </div>

      <div class="trade-info">
        <p>${window.oxarkPreview ? 'SAMPLE LISTINGS · Illustrative prices, not live offers. Buying and selling are disabled.' : '0% Trading Fee — Direct seller-to-buyer'}</p>
        <p>Card escrowed when listed, returned if cancelled</p>
      </div>
    </div>
  `;

  screen.root = container.querySelector('.trade-screen');
  screen.root.querySelector('#trade-back').addEventListener('click', () => {
    if (!_isActive(screen)) return;
    document.dispatchEvent(new CustomEvent('nav:home'));
  });

  screen.root.querySelector('#create-listing-btn').addEventListener('click', () => {
    _showCreateListingModal(screen, props.playerState ?? {});
  });

  ['filter-clan', 'filter-rarity', 'filter-sort'].forEach(id => {
    screen.root.querySelector('#' + id)?.addEventListener('change', () => _refreshGrid(screen));
  });

  // Load listings async
  await _loadListings(screen);
}

export function unmount(container) {
  if (_screen?.container === container) {
    _screen.scope.dispose();
    _screen = null;
  }
  container.innerHTML = '';
}
