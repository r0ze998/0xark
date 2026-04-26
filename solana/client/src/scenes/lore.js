// scenes/lore.js — Card catalog + Lore Shards
// Reads CD[] (02-data.js) + lore-shards.json for full card detail

(function() {
  let _loreShards = [];
  let _currentFilter = 'all';
  let _loreShardsLoaded = false;

  const RARITY_LABELS = { 1:'Common', 2:'Uncommon', 3:'Rare', 4:'Epic', 5:'Legendary' };
  const RARITY_COLORS = { 1:'#94a3b8', 2:'#34d399', 3:'#60a5fa', 4:'#c084fc', 5:'#fbbf24' };

  function loadLoreShards() {
    if (_loreShardsLoaded) return Promise.resolve(_loreShards);
    return fetch('src/data/lore_shards.json').then(function(r) { return r.json(); }).then(function(data) {
      _loreShards = data || [];
      _loreShardsLoaded = true;
      return _loreShards;
    }).catch(function() { return []; });
  }

  function buildCardList(filter) {
    const list = document.getElementById('lore-card-list');
    if (!list) return;
    list.innerHTML = '';
    const CDs = window.CD || [];
    CDs.forEach(function(cd, idx) {
      if (!cd) return;
      if (filter !== 'all' && cd.t !== filter) return;
      const r = cd.r || 1;
      const row = document.createElement('div');
      row.className = 'lore-card-row';
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');

      const iconEl = document.createElement('div');
      iconEl.className = 'lore-card-icon';
      iconEl.style.background = (cd.c || '#333') + '33';
      iconEl.textContent = cd.i || '🃏';

      const info = document.createElement('div');
      info.className = 'lore-card-info';

      const name = document.createElement('div');
      name.className = 'lore-card-name';
      name.textContent = cd.n || ('Card #' + (idx + 1));

      const meta = document.createElement('div');
      meta.className = 'lore-card-meta';
      meta.textContent = (RARITY_LABELS[r] || 'Common') + ' · ' + (cd.t || '');

      const hint = document.createElement('div');
      hint.className = 'lore-read-hint';
      hint.textContent = '> Tap to read lore';
      hint.style.color = 'var(--accent-primary)';
      hint.style.opacity = '0.7';

      info.appendChild(name);
      info.appendChild(meta);

      row.appendChild(iconEl);
      row.appendChild(info);
      row.appendChild(hint);

      row.addEventListener('click', function() { openLoreModal(idx); });
      row.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLoreModal(idx); }
      });
      list.appendChild(row);
    });
  }

  function openLoreModal(cdIdx) {
    const cd = (window.CD || [])[cdIdx];
    if (!cd) return;
    const r = cd.r || 1;
    const nameEl   = document.getElementById('lore-modal-name');
    const artEl    = document.getElementById('lore-modal-art');
    const tagsEl   = document.getElementById('lore-modal-tags');
    const flavorEl = document.getElementById('lore-modal-flavor');
    const shardsEl = document.getElementById('lore-modal-shards');

    if (nameEl) nameEl.textContent = cd.n || 'Card #' + (cdIdx + 1);
    if (artEl) {
      artEl.textContent = cd.i || '🃏';
      artEl.style.background = (cd.c || '#333') + '33';
    }
    if (tagsEl) {
      tagsEl.innerHTML =
        '<span class="lore-tag" style="color:' + (RARITY_COLORS[r] || '#fff') + '">' + (RARITY_LABELS[r] || 'Common') + '</span>' +
        '<span class="lore-tag">' + (cd.t || '') + '</span>' +
        (cd.f ? '<span class="lore-tag">' + cd.f + '</span>' : '');
    }
    if (flavorEl) flavorEl.textContent = cd.fl || cd.lo || '';
    if (shardsEl) {
      shardsEl.innerHTML = '<div class="loading-row"><div class="spinner"></div><span>Loading shards…</span></div>';
    }

    openModal('lore-card-modal');

    // Load shards
    loadLoreShards().then(function(shards) {
      if (!shardsEl) return;
      const entry = shards.find(function(s) { return s.card_id === cdIdx + 1; });
      if (!entry || !entry.shards) {
        const loreText = cd.lo || '';
        shardsEl.innerHTML = loreText
          ? '<div class="lore-shard">' + loreText + '</div>'
          : '<div class="lore-shard-locked">Lore shards coming soon.</div>';
        return;
      }
      shardsEl.innerHTML = '';
      [1, 2, 3].forEach(function(i) {
        const text = entry.shards[String(i)];
        const el = document.createElement('div');
        if (text) {
          el.className = 'lore-shard';
          el.textContent = 'Shard ' + i + ': ' + text;
        } else {
          el.className = 'lore-shard';
          const locked = document.createElement('span');
          locked.className = 'lore-shard-locked';
          locked.textContent = 'Shard ' + i + ': Locked — collect more cards to unlock';
          el.appendChild(locked);
        }
        shardsEl.appendChild(el);
      });
    });
  }

  registerScene('lore', {
    init: function() {
      _currentFilter = 'all';
      buildCardList('all');

      document.querySelectorAll('#lore-filter .chip').forEach(function(chip) {
        chip.onclick = function() {
          _currentFilter = chip.dataset.filter;
          document.querySelectorAll('#lore-filter .chip').forEach(function(c) {
            c.classList.toggle('active', c.dataset.filter === _currentFilter);
          });
          buildCardList(_currentFilter);
        };
      });

      const closeBtn = document.getElementById('lore-modal-close');
      if (closeBtn) closeBtn.onclick = function() { closeModal('lore-card-modal'); };

      // Pre-load shards in background
      loadLoreShards();
    },
    cleanup: function() {
      closeModal('lore-card-modal');
    }
  });
})();
