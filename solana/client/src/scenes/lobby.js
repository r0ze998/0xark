// scenes/lobby.js — Battle Lobby (Hall selection)
// Bronze/Silver/Gold hall cards → confirm modal → matchmaking → duel

(function() {
  const HALLS = [
    { name: 'Bronze Hall', badge: '🥉', ante: '0.001 SOL', meta: 'ZK commit-reveal · AI agent', idx: 0 },
    { name: 'Silver Hall', badge: '🥈', ante: '0.005 SOL', meta: 'Ranked play', idx: 1 },
    { name: 'Gold Hall',   badge: '🥇', ante: '0.02 SOL',  meta: 'Legendary stake', idx: 2 },
  ];

  let _selectedHall = null;
  let _mode = 'casual';

  function bindHallCards() {
    document.querySelectorAll('.hall-card[data-hall]').forEach(function(card) {
      card.onclick = function() {
        const idx = parseInt(card.dataset.hall, 10);
        _selectedHall = HALLS[idx];
        const titleEl = document.getElementById('hall-modal-title');
        const bodyEl  = document.getElementById('hall-modal-body');
        if (titleEl) titleEl.textContent = _selectedHall.badge + ' ' + _selectedHall.name;
        if (bodyEl)  bodyEl.textContent  = 'Ante: ' + _selectedHall.ante + '. ' + _selectedHall.meta + '. ' + (_mode === 'competitive' ? 'Competitive mode.' : 'Casual mode.');
        openModal('hall-confirm-modal');
      };
    });
  }

  function bindModeToggle() {
    document.querySelectorAll('.mode-btn').forEach(function(btn) {
      btn.onclick = function() {
        _mode = btn.dataset.mode;
        document.querySelectorAll('.mode-btn').forEach(function(b) {
          b.classList.toggle('active', b.dataset.mode === _mode);
        });
      };
    });
  }

  function startMatch() {
    closeModal('hall-confirm-modal');
    showToast('Finding match…', '');

    // Kick off matchmaking (existing lobbyFindMatch / enterDuel flow)
    if (typeof lobbyFindMatch === 'function') {
      try { lobbyFindMatch(_selectedHall ? _selectedHall.idx : 0); } catch(e) {}
    }
    // Fall through to duel (AI or real match)
    if (typeof startDuelVsAI === 'function') {
      try { startDuelVsAI(); } catch(e) {}
    }
    // Transition to duel scene
    setTimeout(function() { enterScene('duel'); }, 300);
  }

  registerScene('lobby', {
    init: function() {
      bindHallCards();
      bindModeToggle();

      const confirmBtn = document.getElementById('hall-modal-confirm');
      const cancelBtn  = document.getElementById('hall-modal-cancel');
      if (confirmBtn) confirmBtn.onclick = startMatch;
      if (cancelBtn)  cancelBtn.onclick  = function() { closeModal('hall-confirm-modal'); };
    },
    cleanup: function() {
      closeModal('hall-confirm-modal');
    }
  });
})();
