import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { fetchOwnedCards } from '../lib/onchain';

const RARITY: Record<number, { label: string; color: string }> = {
  1: { label: 'Common',    color: '#9ca3af' },
  2: { label: 'Uncommon',  color: '#34d399' },
  3: { label: 'Rare',      color: '#60a5fa' },
  4: { label: 'Epic',      color: '#a78bfa' },
  5: { label: 'Legendary', color: '#fbbf24' },
};

function cardRarity(id: number): typeof RARITY[1] {
  if (id <= 20)  return RARITY[1];
  if (id <= 35)  return RARITY[2];
  if (id <= 47)  return RARITY[3];
  if (id <= 55)  return RARITY[4];
  return RARITY[5];
}

interface InventoryPanelProps {
  gameId: bigint | null;
}

export function InventoryPanel({ gameId }: InventoryPanelProps) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [cards, setCards] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!publicKey || !gameId) return;
    setLoading(true);
    try {
      const owned = await fetchOwnedCards(connection, gameId, publicKey);
      setCards(owned);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, [publicKey, gameId, connection]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Listen for victory event from game canvas to auto-refresh
  useEffect(() => {
    const handler = () => { void refresh(); };
    window.addEventListener('game:card_minted', handler);
    return () => window.removeEventListener('game:card_minted', handler);
  }, [refresh]);

  if (!publicKey) return null;

  const legendaryCount = cards.filter(id => id > 55).length;
  const progress = cards.length;

  return (
    <div className="inventory-panel">
      <div className="inventory-header">
        <h2 className="inventory-title">Card Collection</h2>
        <button className="btn-refresh" onClick={refresh} disabled={loading}>
          {loading ? '⟳' : '↺'}
        </button>
      </div>

      <div className="collection-progress">
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${(progress / 60) * 100}%` }}
          />
        </div>
        <span className="progress-label">{progress} / 60</span>
      </div>

      {legendaryCount > 0 && (
        <div className="legendary-badge">
          ✨ {legendaryCount} Legendary{legendaryCount > 1 ? ' cards' : ' card'}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="empty-inventory">
          {loading ? 'Loading…' : 'No cards yet — win battles to collect NFT cards!'}
        </div>
      ) : (
        <div className="card-grid">
          {cards.map(id => {
            const rarity = cardRarity(id);
            const isSelected = selected === id;
            return (
              <button
                key={id}
                className={`card-slot ${isSelected ? 'selected' : ''}`}
                style={{ borderColor: rarity.color }}
                onClick={() => setSelected(isSelected ? null : id)}
                title={`Card #${id} — ${rarity.label}`}
              >
                <span className="card-id">#{id}</span>
                <span className="card-rarity" style={{ color: rarity.color }}>
                  {rarity.label[0]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selected !== null && (
        <div className="card-detail">
          <div className="card-detail-header">
            <strong>Card #{selected}</strong>
            <span className="card-detail-rarity" style={{ color: cardRarity(selected).color }}>
              {cardRarity(selected).label}
            </span>
          </div>
          <p className="card-detail-desc">
            On-chain NFT · 1-of-1 · Mint authority burned
          </p>
          <a
            className="card-detail-link"
            href={`https://explorer.solana.com/address/${selected}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Explorer ↗
          </a>
        </div>
      )}
    </div>
  );
}
