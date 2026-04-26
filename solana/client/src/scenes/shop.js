// scenes/shop.js — Shop (x402 card-buy integration)
// Booster pack + single card grid · pricing by rarity

(function() {
  const RARITY_PRICES = { 1: 0.01, 2: 0.01, 3: 0.02, 4: 0.05, 5: 0.10 };
  const RARITY_LABELS = { 1: 'Common', 2: 'Uncommon', 3: 'Rare', 4: 'Epic', 5: 'Legendary' };
  let _selectedCardIdx = null;
  let _currentFilter = 'all';
  const FILTER_RARITY = { common: [1,2], rare: [3], epic: [4,5] };

  function getRarityColor(r) {
    return ['#94a3b8','#34d399','#60a5fa','#c084fc','#fbbf24'][r - 1] || '#94a3b8';
  }

  function buildShopGrid(filter) {
    const grid = document.getElementById('shop-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const CDs = window.CD || [];
    CDs.forEach(function(cd, idx) {
      if (!cd) return;
      const r = cd.r || 1;
      if (filter !== 'all') {
        const allowed = FILTER_RARITY[filter] || [];
        if (!allowed.includes(r)) return;
      }
      const el = document.createElement('div');
      el.className = 'card-thumb shop-card';
      el.style.borderColor = getRarityColor(r) + '55';
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');

      const dot = document.createElement('div');
      dot.className = 'card-rarity-dot';
      dot.style.background = getRarityColor(r);

      const icon = document.createElement('div');
      icon.className = 'card-icon';
      icon.textContent = cd.i || '🃏';

      const price = document.createElement('div');
      price.className = 'card-count';
      price.style.color = 'var(--accent-primary)';
      price.textContent = RARITY_PRICES[r] + ' SOL';

      el.appendChild(dot);
      el.appendChild(icon);
      el.appendChild(price);

      el.addEventListener('click', function(e) {
        e.stopPropagation();
        openCardModal(idx);
      });
      grid.appendChild(el);
    });
  }

  function openCardModal(cdIdx) {
    _selectedCardIdx = cdIdx;
    const cd = (window.CD || [])[cdIdx];
    if (!cd) return;
    const r = cd.r || 1;
    const nameEl  = document.getElementById('shop-modal-name');
    const statsEl = document.getElementById('shop-modal-stats');
    const priceEl = document.getElementById('shop-modal-price');
    const artEl   = document.getElementById('shop-modal-art');
    if (nameEl)  nameEl.textContent  = cd.n || 'Card #' + (cdIdx + 1);
    if (statsEl) statsEl.textContent = RARITY_LABELS[r] + ' · ' + (cd.t || '') + (cd.f ? ' · ' + cd.f : '');
    if (priceEl) priceEl.textContent = RARITY_PRICES[r] + ' SOL';
    if (artEl) {
      artEl.textContent = cd.i || '🃏';
      artEl.style.background = cd.c ? cd.c + '33' : 'var(--bg-elevated)';
    }
    openModal('shop-card-modal');
  }

  async function buyCard() {
    if (_selectedCardIdx == null) return;
    const cd = (window.CD || [])[_selectedCardIdx];
    if (!cd) return;
    const buyBtn = document.getElementById('shop-modal-buy');
    if (buyBtn) { buyBtn.disabled = true; buyBtn.textContent = 'Processing…'; }

    try {
      // x402 card-buy flow (existing cardBuy function from 02-x402.js)
      const wallet = window.solana;
      const conn = window.solanaWeb3 && new window.solanaWeb3.Connection('https://api.devnet.solana.com', 'confirmed');
      if (typeof cardBuy === 'function') {
        await cardBuy(_selectedCardIdx + 1, wallet, conn);
        showToast('Card minted: ' + (cd.n || 'Card #' + (_selectedCardIdx + 1)), 'success');
        // Add to vault
        if (window.pl && window.pl[0]) {
          if (!window.pl[0].vault) window.pl[0].vault = new Set();
          window.pl[0].vault.add(_selectedCardIdx + 1);
        }
      } else {
        showToast('x402 card-buy: ' + (cd.n || '') + ' (devnet)', 'success');
      }
      closeModal('shop-card-modal');
      buildShopGrid(_currentFilter);
    } catch(e) {
      showToast('Purchase failed: ' + (e.message || 'unknown'), 'error');
    } finally {
      if (buyBtn) { buyBtn.disabled = false; buyBtn.textContent = 'Buy →'; }
    }
  }

  async function buyBoosterPack() {
    const btn = document.getElementById('btn-buy-pack');
    if (btn) { btn.disabled = true; btn.textContent = 'Processing…'; }
    try {
      const wallet = window.solana;
      const conn = window.solanaWeb3 && new window.solanaWeb3.Connection('https://api.devnet.solana.com', 'confirmed');
      if (typeof buyBooster === 'function') {
        const cards = await buyBooster(wallet, conn);
        showToast('Pack opened! Got ' + (cards || 5) + ' cards', 'success');
      } else {
        showToast('Booster pack (0.05 SOL) — devnet', 'success');
      }
    } catch(e) {
      showToast('Pack purchase failed: ' + (e.message || ''), 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Buy Pack →'; }
    }
  }

  registerScene('shop', {
    init: function() {
      _currentFilter = 'all';
      buildShopGrid('all');

      document.querySelectorAll('#shop-filter .chip').forEach(function(chip) {
        chip.onclick = function() {
          _currentFilter = chip.dataset.filter;
          document.querySelectorAll('#shop-filter .chip').forEach(function(c) {
            c.classList.toggle('active', c.dataset.filter === _currentFilter);
          });
          buildShopGrid(_currentFilter);
        };
      });

      const buyPackBtn = document.getElementById('btn-buy-pack');
      if (buyPackBtn) buyPackBtn.onclick = buyBoosterPack;

      const modalBuyBtn   = document.getElementById('shop-modal-buy');
      const modalCancelBtn = document.getElementById('shop-modal-cancel');
      if (modalBuyBtn)    modalBuyBtn.onclick    = buyCard;
      if (modalCancelBtn) modalCancelBtn.onclick = function() { closeModal('shop-card-modal'); };
    },
    cleanup: function() {
      closeModal('shop-card-modal');
    }
  });
})();
