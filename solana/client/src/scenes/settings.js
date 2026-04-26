// scenes/settings.js — Wallet / Network / Audio / About

(function() {
  const PROGRAM_ID = '5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN';

  function refresh() {
    const addrEl = document.getElementById('settings-addr');
    const balEl  = document.getElementById('settings-balance');
    const progEl = document.getElementById('settings-program');
    if (progEl) progEl.textContent = PROGRAM_ID.slice(0, 4) + '...' + PROGRAM_ID.slice(-4);

    const pk = window.walletPubkey || (window.solana && window.solana.publicKey && window.solana.publicKey.toString());
    if (addrEl) addrEl.textContent = pk ? pk.slice(0, 6) + '...' + pk.slice(-4) : 'Not connected';

    if (balEl) {
      const sol = window.walletSolBalance != null ? window.walletSolBalance.toFixed(4) + ' SOL' : '—';
      balEl.textContent = sol;
    }
  }

  function disconnect() {
    if (window.solana && typeof window.solana.disconnect === 'function') {
      window.solana.disconnect().catch(function(){});
    }
    window.walletConnected = false;
    window.walletPubkey = null;
    window.walletSolBalance = null;
    showToast('Wallet disconnected', '');
    refresh();
    setTimeout(function() { enterScene('title'); }, 800);
  }

  function loadAudio() {
    const sfxEl   = document.getElementById('settings-sfx');
    const musicEl = document.getElementById('settings-music');
    try {
      const saved = JSON.parse(localStorage.getItem('0xark-audio') || '{}');
      if (sfxEl)   sfxEl.value   = saved.sfx   != null ? saved.sfx   : 80;
      if (musicEl) musicEl.value = saved.music  != null ? saved.music : 60;
    } catch(e){}
    if (sfxEl)   sfxEl.oninput   = function() { saveAudio(); };
    if (musicEl) musicEl.oninput = function() { saveAudio(); };
  }

  function saveAudio() {
    const sfxEl   = document.getElementById('settings-sfx');
    const musicEl = document.getElementById('settings-music');
    try {
      localStorage.setItem('0xark-audio', JSON.stringify({
        sfx:   sfxEl   ? parseInt(sfxEl.value,   10) : 80,
        music: musicEl ? parseInt(musicEl.value, 10) : 60,
      }));
    } catch(e){}
    // Apply to existing audio nodes if present
    if (typeof setSfxVolume   === 'function' && sfxEl)   setSfxVolume(parseInt(sfxEl.value, 10) / 100);
    if (typeof setMusicVolume === 'function' && musicEl) setMusicVolume(parseInt(musicEl.value, 10) / 100);
  }

  registerScene('settings', {
    init: function() {
      refresh();
      loadAudio();
      const disconnBtn = document.getElementById('btn-disconnect-wallet');
      if (disconnBtn) disconnBtn.onclick = disconnect;
    }
  });
})();
