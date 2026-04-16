import { StrictMode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { App } from './App';

// Wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

function Root() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets  = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

// Mount into #react-root injected by the game page
function mount() {
  const container = document.getElementById('react-root');
  if (!container) {
    console.warn('[0xARK] #react-root not found — React UI not mounted');
    return;
  }
  createRoot(container).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  );
}

// Mount immediately if DOM is ready, otherwise defer
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
