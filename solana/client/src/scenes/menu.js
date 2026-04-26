// scenes/menu.js — Menu Hub (2×3 grid)
// Wallet info card · 6 feature cells · season footer

(function() {
  const DAY_ONE = new Date('2026-04-01').getTime();
  const SEASON_DAYS = 41; // Season 1 = 41 days

  function refreshWalletCard() {
    const addrEl = document.getElementById('menu-wallet-addr');
    const solEl  = document.getElementById('menu-sol-bal');
    const cardEl = document.getElementById('menu-card-count');
    if (!addrEl) return;

    const pk = window.walletPubkey || (window.solana && window.solana.publicKey && window.solana.publicKey.toString());
    if (pk) {
      const short = pk.slice(0, 4) + '...' + pk.slice(-4);
      addrEl.textContent = short;
    } else {
      addrEl.textContent = 'Not connected';
    }

    const sol = window.walletSolBalance != null ? window.walletSolBalance.toFixed(3) : '—';
    solEl.textContent = '💰 ' + sol + ' SOL';

    const cardCount = (window.pl && window.pl[0] && window.pl[0].vault) ? window.pl[0].vault.size : '—';
    cardEl.textContent = '🃏 ' + cardCount + ' cards';

    // Fetch SOL balance in background
    if (pk && window.solanaWeb3) {
      try {
        const conn = new window.solanaWeb3.Connection('https://api.devnet.solana.com', 'confirmed');
        conn.getBalance(new window.solanaWeb3.PublicKey(pk)).then(function(lamports) {
          window.walletSolBalance = lamports / 1e9;
          if (solEl) solEl.textContent = '💰 ' + window.walletSolBalance.toFixed(3) + ' SOL';
        }).catch(function(){});
      } catch(e){}
    }
  }

  function updateFooter() {
    const el = document.getElementById('menu-footer');
    if (!el) return;
    const now = Date.now();
    const dayNum = Math.floor((now - DAY_ONE) / 86400000) + 1;
    const daysLeft = Math.max(0, SEASON_DAYS - dayNum + 1);
    el.textContent = 'Season 1 · Day ' + dayNum + ' · ' + daysLeft + ' days left';
  }

  registerScene('menu', {
    init: function() {
      refreshWalletCard();
      updateFooter();

      // Settings shortcut in header
      const settingsBtn = document.getElementById('menu-settings-btn');
      if (settingsBtn) settingsBtn.onclick = function() { enterScene('settings'); };
    }
  });
})();
