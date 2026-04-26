// scenes/result.js — Duel result (Victory / Defeat)
// Called after duel ends via showDuelResult({victory, round, duration, earned, card})

(function() {
  function spawnVictoryParticles() {
    const container = document.getElementById('result-particles');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const x = Math.random() * 100;
      const delay = Math.random() * 3;
      const dur = 3 + Math.random() * 4;
      const drift = (Math.random() - 0.5) * 120;
      p.style.cssText = 'left:' + x + '%;bottom:-4px;animation-delay:' + delay + 's;animation-duration:' + dur + 's;--drift:' + drift + 'px';
      container.appendChild(p);
    }
  }

  registerScene('result', {
    init: function(params) {
      params = params || {};
      const statusEl   = document.getElementById('result-status');
      const roundEl    = document.getElementById('result-round');
      const durEl      = document.getElementById('result-duration');
      const rewardsEl  = document.getElementById('result-rewards');

      if (statusEl) {
        statusEl.textContent = params.victory ? 'VICTORY' : 'DEFEAT';
        statusEl.className = 'result-status ' + (params.victory ? 'victory' : 'defeat');
      }
      if (roundEl)   roundEl.textContent   = params.round    || '—';
      if (durEl)     durEl.textContent     = params.duration || '—';
      if (rewardsEl) {
        let html = '';
        if (params.earned != null) html += 'Stake ' + (params.victory ? 'earned' : 'lost') + ': ' + (params.victory ? '+' : '-') + params.earned + ' SOL<br>';
        if (params.card)           html += 'Card earned: ' + params.card;
        rewardsEl.innerHTML = html || (params.victory ? 'Well played!' : 'Better luck next time.');
      }

      if (params.victory) spawnVictoryParticles();

      const playAgainBtn = document.getElementById('result-play-again');
      const backMenuBtn  = document.getElementById('result-back-menu');
      if (playAgainBtn) playAgainBtn.onclick = function() { enterScene('lobby'); };
      if (backMenuBtn)  backMenuBtn.onclick  = function() { enterScene('menu'); };
    }
  });

  // Global entry point called by duel logic
  window.showDuelResult = function(params) {
    enterScene('result', params);
  };
})();
