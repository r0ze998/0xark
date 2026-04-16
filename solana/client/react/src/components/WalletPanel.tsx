import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect } from 'react';

export function WalletPanel() {
  const { publicKey, connected, disconnect } = useWallet();

  // Notify the vanilla-JS game canvas when wallet connects/disconnects
  useEffect(() => {
    if (connected && publicKey) {
      window.dispatchEvent(new CustomEvent('wallet:connected', {
        detail: { pubkey: publicKey.toBase58() },
      }));
    } else {
      window.dispatchEvent(new CustomEvent('wallet:disconnected'));
    }
  }, [connected, publicKey]);

  return (
    <div className="wallet-panel">
      <WalletMultiButton />
      {connected && publicKey && (
        <div className="wallet-info">
          <span className="wallet-address">
            {publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}
          </span>
          <button className="btn-disconnect" onClick={() => disconnect()}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
