// scenes/title.js — Title hero scene
// Wallet connect / Enter Arena · How to Play · particle background

(function() {
  const PARTICLE_COUNT = 28;

  function spawnParticles() {
    const container = document.getElementById('title-particles');
    if (!container || container.childElementCount > 0) return;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const x = Math.random() * 100;
      const delay = Math.random() * 12;
      const dur = 8 + Math.random() * 10;
      const drift = (Math.random() - 0.5) * 80;
      p.style.cssText = `left:${x}%;bottom:-4px;animation-delay:${delay}s;animation-duration:${dur}s;--drift:${drift}px`;
      container.appendChild(p);
    }
  }

  function updateButtons() {
    const connectBtn = document.getElementById('btn-connect-wallet');
    if (!connectBtn) return;
    const connected = window.walletConnected || (window.solana && window.solana.isConnected);
    connectBtn.textContent = connected ? 'Enter Arena →' : 'Connect Wallet →';
  }

  function handleConnect() {
    const connected = window.walletConnected || (window.solana && window.solana.isConnected);
    if (connected) {
      enterScene('menu');
      return;
    }
    // Attempt Phantom connect
    if (window.solana && window.solana.isPhantom) {
      window.solana.connect().then(function() {
        window.walletConnected = true;
        updateButtons();
        enterScene('menu');
      }).catch(function(err) {
        showToast('Wallet connection cancelled', '');
      });
    } else if (typeof connectWallet === 'function') {
      connectWallet().then(function() {
        updateButtons();
        enterScene('menu');
      }).catch(function() {
        showToast('Install Phantom to connect', 'warn');
      });
    } else {
      showToast('Install Phantom from phantom.app', 'warn');
      // Allow entry without wallet for demo
      setTimeout(function() { enterScene('menu'); }, 1000);
    }
  }

  registerScene('title', {
    init: function() {
      spawnParticles();
      updateButtons();

      const connectBtn = document.getElementById('btn-connect-wallet');
      const howBtn = document.getElementById('btn-how-to-play');
      if (connectBtn) connectBtn.onclick = handleConnect;
      if (howBtn) howBtn.onclick = function() { enterScene('how_to_play'); };
    }
  });
})();
