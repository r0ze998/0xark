// Subscribe once per provider. Disconnect does not mean the provider vanished.
export function createWalletEvents({ onDisconnect, onAccountChanged }) {
  let provider = null;
  let remove = () => {};
  return {
    attach(next) {
      if (next === provider || !next?.on) return;
      remove();
      provider = next;
      // Guard callbacks too: a provider without off/removeListener may retain
      // the registration after dispose, but must no longer affect this app.
      let active = true;
      const disconnect = () => { if (active) onDisconnect(); };
      const accountChanged = key => { if (active) onAccountChanged(key); };
      next.on('disconnect', disconnect);
      next.on('accountChanged', accountChanged);
      remove = () => {
        active = false;
        const off = next.off ?? next.removeListener;
        off?.call(next, 'disconnect', disconnect);
        off?.call(next, 'accountChanged', accountChanged);
      };
    },
    dispose() { remove(); provider = null; },
  };
}
