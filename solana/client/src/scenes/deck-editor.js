// scenes/deck-editor.js — Deck Editor (BUILD / EVOLVE tabs)
// Tap card in storage → add to deck. Tap card in deck → remove.
// Critical bug fix: card tap must NOT navigate away from this scene.

(function() {
  const MAX_DECK = 20;
  const MAX_COPIES = 2;
  let _currentFilter = 'all';
  let _playerDeck = []; // array of card indices (0-based into CD[])

  function getRarityColor(r) {
    return ['#94a3b8','#34d399','#60a5fa','#c084fc','#fbbf24'][r - 1] || '#94a3b8';
  }

  function getCardType(cd) {
    if (!cd) return 'unknown';
    return cd.t || 'unknown';
  }

  function buildCardThumb(cdIdx, count, inDeck, clickFn) {
    const cd = window.CD ? window.CD[cdIdx] : null;
    const el = document.createElement('div');
    el.className = 'card-thumb' + (inDeck ? ' in-deck' : '');
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.dataset.cdIdx = cdIdx;
    const r = cd ? cd.r : 1;
    el.style.borderColor = getRarityColor(r) + '55';

    const dot = document.createElement('div');
    dot.className = 'card-rarity-dot rarity-' + r;
    dot.style.background = getRarityColor(r);

    const icon = document.createElement('div');
    icon.className = 'card-icon';
    icon.textContent = cd ? (cd.i || '🃏') : '🃏';

    const cntEl = document.createElement('div');
    cntEl.className = 'card-count';
    cntEl.textContent = count > 1 ? '×' + count : '';

    el.appendChild(dot);
    el.appendChild(icon);
    el.appendChild(cntEl);

    el.addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();
      clickFn(cdIdx);
    });
    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        clickFn(cdIdx);
      }
    });
    return el;
  }

  function renderStorage(filter) {
    const grid = document.getElementById('storage-grid');
    const countEl = document.getElementById('storage-count');
    if (!grid) return;
    grid.innerHTML = '';

    const vault = (window.pl && window.pl[0] && window.pl[0].vault) ? window.pl[0].vault : new Set();
    const CDs = window.CD || [];

    // Build owned cards map: idx -> count
    const owned = {};
    if (vault instanceof Set) {
      vault.forEach(function(id) { owned[id - 1] = (owned[id - 1] || 0) + 1; });
    } else {
      // vault might be array of card indices
      (Array.isArray(vault) ? vault : []).forEach(function(id) { owned[id - 1] = (owned[id - 1] || 0) + 1; });
    }

    // If no cards in vault, show all 60 as demo (0 owned label)
    const showDemo = Object.keys(owned).length === 0;
    const indices = showDemo ? Array.from({length: 60}, function(_, i) { return i; }) : Object.keys(owned).map(Number);

    let shown = 0;
    indices.forEach(function(idx) {
      const cd = CDs[idx];
      if (!cd) return;
      if (filter !== 'all' && getCardType(cd) !== filter) return;
      const count = owned[idx] || (showDemo ? 1 : 0);
      const inDeck = _playerDeck.filter(function(x) { return x === idx; }).length > 0;
      const thumb = buildCardThumb(idx, count, inDeck, addCardToDeck);
      grid.appendChild(thumb);
      shown++;
    });

    if (countEl) countEl.textContent = '(' + (showDemo ? '0 owned · demo' : shown + ' owned') + ')';
  }

  function renderDeck() {
    const grid = document.getElementById('deck-grid');
    const countEl = document.getElementById('deck-count');
    if (!grid) return;
    grid.innerHTML = '';

    // Group deck cards by idx
    const grouped = {};
    _playerDeck.forEach(function(idx) { grouped[idx] = (grouped[idx] || 0) + 1; });
    const CDs = window.CD || [];

    Object.keys(grouped).forEach(function(idx) {
      const cdIdx = parseInt(idx, 10);
      const cd = CDs[cdIdx];
      if (!cd) return;
      const thumb = buildCardThumb(cdIdx, grouped[idx], true, removeCardFromDeck);
      grid.appendChild(thumb);
    });

    const total = _playerDeck.length;
    if (countEl) {
      countEl.textContent = total + ' / ' + MAX_DECK;
      countEl.style.background = total === MAX_DECK ? 'var(--status-success)' : '';
    }
  }

  function addCardToDeck(cdIdx) {
    if (_playerDeck.length >= MAX_DECK) {
      showToast('Deck is full (' + MAX_DECK + ' cards)', 'warn');
      return;
    }
    const copies = _playerDeck.filter(function(x) { return x === cdIdx; }).length;
    if (copies >= MAX_COPIES) {
      showToast('Max ' + MAX_COPIES + ' copies per card', 'warn');
      return;
    }
    _playerDeck.push(cdIdx);
    renderStorage(_currentFilter);
    renderDeck();
    showToast('Added to deck', 'success');
  }

  function removeCardFromDeck(cdIdx) {
    const i = _playerDeck.lastIndexOf(cdIdx);
    if (i !== -1) _playerDeck.splice(i, 1);
    renderStorage(_currentFilter);
    renderDeck();
  }

  function saveDeck() {
    // Save to player state for duel
    if (window.pl && window.pl[0]) {
      window.pl[0].deckIndices = _playerDeck.slice();
    }
    if (typeof saveDeckOnChain === 'function') {
      saveDeckOnChain(_playerDeck).catch(function(e) { showToast('Save failed: ' + e.message, 'error'); });
    }
    showToast('Deck saved!', 'success');
  }

  function buildEvolveGrid() {
    const grid = document.getElementById('evolve-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const CDs = window.CD || [];
    const vault = (window.pl && window.pl[0] && window.pl[0].vault) ? window.pl[0].vault : new Set();
    const owned = {};
    vault instanceof Set
      ? vault.forEach(function(id) { owned[id - 1] = (owned[id - 1] || 0) + 1; })
      : (Array.isArray(vault) ? vault : []).forEach(function(id) { owned[id - 1] = (owned[id - 1] || 0) + 1; });

    let hasEvolvable = false;
    Object.keys(owned).forEach(function(idx) {
      const cdIdx = parseInt(idx, 10);
      const cd = CDs[cdIdx];
      if (!cd || owned[idx] < 2 || cd.r >= 5) return;
      hasEvolvable = true;
      const thumb = buildCardThumb(cdIdx, owned[idx], false, function(i) { confirmEvolve(i); });
      grid.appendChild(thumb);
    });

    if (!hasEvolvable) {
      grid.innerHTML = '<div class="loading-row" style="justify-content:center;color:var(--text-muted)">No evolvable cards yet.<br>Collect 2+ copies of any card.</div>';
    }
  }

  function confirmEvolve(cdIdx) {
    const cd = (window.CD || [])[cdIdx];
    if (!cd) return;
    if (!confirm('Burn 2 copies of ' + (cd.n || 'card') + ' to evolve? This requires a Phantom signature.')) return;
    if (typeof evolveCard === 'function') {
      evolveCard(cdIdx).then(function() {
        showToast('Card evolved!', 'success');
        buildEvolveGrid();
      }).catch(function(e) { showToast('Evolve failed: ' + e.message, 'error'); });
    } else {
      showToast('Evolve requires on-chain tx (devnet)', 'warn');
    }
  }

  registerScene('deck_editor', {
    init: function() {
      // Load saved deck
      if (window.pl && window.pl[0] && window.pl[0].deckIndices) {
        _playerDeck = window.pl[0].deckIndices.slice();
      } else {
        _playerDeck = [];
      }

      _currentFilter = 'all';
      renderStorage('all');
      renderDeck();

      // Tab switching
      document.querySelectorAll('#scene-deck_editor .tab-btn').forEach(function(btn) {
        btn.onclick = function() {
          const tab = btn.dataset.tab;
          document.querySelectorAll('#scene-deck_editor .tab-btn').forEach(function(b) {
            b.classList.toggle('active', b.dataset.tab === tab);
          });
          document.getElementById('tab-build').classList.toggle('hidden', tab !== 'build');
          document.getElementById('tab-evolve').classList.toggle('hidden', tab !== 'evolve');
          if (tab === 'evolve') buildEvolveGrid();
        };
      });

      // Filter chips
      document.querySelectorAll('#deck-filter .chip').forEach(function(chip) {
        chip.onclick = function() {
          _currentFilter = chip.dataset.filter;
          document.querySelectorAll('#deck-filter .chip').forEach(function(c) {
            c.classList.toggle('active', c.dataset.filter === _currentFilter);
          });
          renderStorage(_currentFilter);
        };
      });

      const saveBtn = document.getElementById('btn-save-deck');
      if (saveBtn) saveBtn.onclick = saveDeck;
    }
  });
})();
