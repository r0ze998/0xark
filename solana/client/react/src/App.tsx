import { useState } from 'react';
import { WalletPanel } from './components/WalletPanel';
import { LobbyPanel } from './components/LobbyPanel';
import { InventoryPanel } from './components/InventoryPanel';

type Tab = 'lobby' | 'inventory';

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('lobby');
  const [activeGameId, setActiveGameId] = useState<bigint | null>(null);

  return (
    <div id="oxark-ui" className="oxark-ui">
      {/* Wallet connection — always visible */}
      <WalletPanel />

      {/* Tab navigation */}
      <nav className="ui-tabs">
        <button
          className={`tab ${activeTab === 'lobby' ? 'active' : ''}`}
          onClick={() => setActiveTab('lobby')}
        >
          Lobby
        </button>
        <button
          className={`tab ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          Cards {activeGameId ? '●' : ''}
        </button>
      </nav>

      {/* Panel content */}
      <div className="ui-panel">
        {activeTab === 'lobby' && (
          <LobbyPanel onGameJoined={(id) => setActiveGameId(id)} />
        )}
        {activeTab === 'inventory' && (
          <InventoryPanel gameId={activeGameId} />
        )}
      </div>
    </div>
  );
}
