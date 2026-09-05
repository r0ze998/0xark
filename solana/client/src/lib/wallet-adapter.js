// Loaded only by the live-game runtime. Never imported in practice mode.
(function detectWallet() {
      var p  = window.phantom?.solana;
      var sf = window.solflare;
      var raw = (p?.isPhantom) ? p : (sf?.isSolflare) ? sf : null;
      if (!raw) { window.oxarkWallet = null; return; }
      window.oxarkWallet = {
        connect:      function() { return raw.connect(); },
        disconnect:   function() { return raw.disconnect?.(); },
        getPublicKey: function() { return raw.publicKey ?? null; },
        isConnected:  function() { return !!raw.isConnected; },
      };
    })();

    // If Phantom injects after this script runs, re-detect on first connect attempt.
    // main-screen.js calls window.oxarkWallet?.connect — the getter below ensures
    // we always read the freshest wallet state.
    Object.defineProperty(window, 'oxarkWallet', {
      get: function() {
        if (this._oxarkWallet) return this._oxarkWallet;
        var p  = window.phantom?.solana;
        var sf = window.solflare;
        var raw = (p?.isPhantom) ? p : (sf?.isSolflare) ? sf : null;
        if (!raw) return null;
        this._oxarkWallet = {
          connect:      function() { return raw.connect(); },
          disconnect:   function() { return raw.disconnect?.(); },
          getPublicKey: function() { return raw.publicKey ?? null; },
          isConnected:  function() { return !!raw.isConnected; },
        };
        return this._oxarkWallet;
      },
      set: function(v) { this._oxarkWallet = v; },
      configurable: true,
    });
