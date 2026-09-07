import { detectWalletProvider } from './wallet-provider.js';

// Late injection is supported; retain the chosen provider throughout signing.
let adapter = null;
Object.defineProperty(window, 'oxarkWallet', {
  configurable: true,
  get() {
    if (adapter) return adapter;
    const provider = detectWalletProvider();
    if (!provider) return null;
    adapter = {
      provider,
      connect: () => provider.connect(),
      disconnect: () => provider.disconnect?.(),
      getPublicKey: () => provider.publicKey ?? null,
      isConnected: () => !!provider.isConnected,
    };
    return adapter;
  },
});
