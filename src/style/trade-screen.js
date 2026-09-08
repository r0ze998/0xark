// Base styles for trade-screen.js. Kept as a module to preserve synchronous,
// lazy installation and the existing cascade beneath archive.css.
export const TRADE_SCREEN_CSS = `
.trade-screen {
  font-family: 'VT323', monospace;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: var(--bg-deep);
  color: var(--text-cream);
}
.trade-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 960px;
  margin-bottom: 0.75rem;
  flex-shrink: 0;
}
.trade-back-btn {
  background: none;
  border: 1px solid #555;
  color: #888;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  font-family: 'VT323', monospace;
  font-size: 1rem;
  transition: border-color 0.2s, color 0.2s;
}
.trade-back-btn:hover { border-color: var(--accent-gold); color: var(--accent-gold); }
.trade-header h2 { font-size: 2rem; letter-spacing: 0.2em; color: var(--accent-gold); margin: 0; flex: 1; }
.create-listing-btn {
  background: rgba(201, 162, 39, 0.1);
  border: 1px solid var(--accent-gold);
  color: var(--accent-gold);
  padding: 0.5rem 1.2rem;
  cursor: pointer;
  font-family: 'VT323', monospace;
  font-size: 1.1rem;
  transition: background 0.2s;
}
.create-listing-btn:hover { background: rgba(201, 162, 39, 0.2); }
.trade-filters {
  display: flex;
  gap: 1rem;
  margin: 0 0 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
  width: 100%;
  max-width: 960px;
  flex-shrink: 0;
}
.trade-filters select {
  background: #0d1221;
  border: 1px solid #333;
  color: var(--text-cream);
  padding: 0.4rem 0.8rem;
  font-family: 'VT323', monospace;
  font-size: 1rem;
  cursor: pointer;
}
.trade-filters select:focus { outline: 1px solid var(--accent-gold); }
.trade-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1.5rem;
  width: 100%;
  max-width: 960px;
}
.listing-card {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--accent-gold);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: background 0.15s, transform 0.15s;
}
.listing-card:hover { background: rgba(201, 162, 39, 0.07); transform: translateY(-2px); }
.trade-card-frame {
  width: 120px;
  height: 170px;
  border: 2px solid var(--rarity-color, #555);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  position: relative;
  margin-bottom: 0.5rem;
}
.trade-card-id {
  font-size: 2rem;
  color: var(--rarity-color, #888);

}
.trade-card-name {
  font-size: 0.8rem;
  color: #aaa;
  text-align: center;
  padding: 0 4px;
  margin-top: 4px;
}
.trade-card-rarity {
  font-size: var(--fs-caption);
  letter-spacing: 0.1em;
  color: var(--rarity-color, #888);
  text-transform: uppercase;
  margin-top: 4px;
}
.listing-info {
  margin-top: 0.5rem;
  text-align: center;
  width: 100%;
}
.listing-price {
  font-size: 1.2rem;
  color: var(--accent-gold);

  margin: 0 0 0.2rem;
}
.listing-seller {
  font-size: 0.8rem;
  color: #666;
  margin: 0 0 0.5rem;
}
.buy-listing-btn, .cancel-listing-btn {
  padding: 0.4rem 1rem;
  font-family: 'VT323', monospace;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.15s;
  width: 100%;
}
.buy-listing-btn {
  background: rgba(201, 162, 39, 0.1);
  border: 1px solid var(--accent-gold);
  color: var(--accent-gold);
}
.buy-listing-btn:hover { background: rgba(201, 162, 39, 0.25); }
.cancel-listing-btn {
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid #dc3545;
  color: #dc3545;
}
.cancel-listing-btn:hover { background: rgba(220, 53, 69, 0.25); }
.trade-empty {
  grid-column: 1 / -1;
  text-align: center;
  color: #555;
  font-size: 1.3rem;
  padding: 4rem 0;
}
.trade-info {
  margin-top: 1rem;
  color: #555;
  font-size: 0.9rem;
  text-align: center;
  line-height: 1.8;
}
.trade-loading {
  color: #555;
  font-size: 1.3rem;
  margin: 4rem 0;
}
/* Modal */
.trade-modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.trade-modal {
  background: #0d1221;
  border: 2px solid var(--accent-gold);
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  font-family: 'VT323', monospace;
  color: var(--text-cream);
}
.trade-modal h3 {
  font-size: 1.8rem;
  color: var(--accent-gold);
  margin: 0 0 1rem;
  letter-spacing: 0.1em;
}
.modal-vault-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 0.75rem;
  max-height: 240px;
  overflow-y: auto;
  margin: 1rem 0;
}
.modal-card-tile {
  border: 2px solid #333;
  cursor: pointer;
  padding: 0.4rem;
  text-align: center;
  background: rgba(0,0,0,0.3);
  transition: border-color 0.15s, background 0.15s;
}
.modal-card-tile:hover { border-color: #888; background: rgba(201,162,39,0.07); }
.modal-card-tile.selected { border-color: var(--accent-gold); background: rgba(201,162,39,0.15); }
.modal-card-num { font-size: 1.6rem; color: var(--accent-gold); display: block; }
.modal-card-label { font-size: var(--fs-caption); color: #888; }
.price-input-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1rem 0;
}
.price-input-row label { color: #888; font-size: 1rem; }
.price-input-row input {
  background: var(--bg-deep);
  border: 1px solid #555;
  color: var(--text-cream);
  padding: 0.4rem 0.6rem;
  font-family: 'VT323', monospace;
  font-size: 1.1rem;
  width: 120px;
}
.price-input-row input:focus { outline: 1px solid var(--accent-gold); }
.modal-actions { display: flex; gap: 1rem; margin-top: 1rem; }
.modal-btn-primary {
  flex: 1;
  background: rgba(201,162,39,0.15);
  border: 1px solid var(--accent-gold);
  color: var(--accent-gold);
  padding: 0.6rem;
  cursor: pointer;
  font-family: 'VT323', monospace;
  font-size: 1.2rem;
  transition: background 0.15s;
}
.modal-btn-primary:hover:not(:disabled) { background: rgba(201,162,39,0.3); }
.modal-btn-primary:disabled { opacity: 0.4; cursor: default; }
.modal-btn-secondary {
  background: none;
  border: 1px solid #555;
  color: #888;
  padding: 0.6rem 1.2rem;
  cursor: pointer;
  font-family: 'VT323', monospace;
  font-size: 1.2rem;
}
.modal-btn-secondary:hover { border-color: #888; color: #aaa; }
/* Toast */
.trade-toast {
  position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
  padding: 0.75rem 1.5rem;
  font-family: 'VT323', monospace;
  font-size: 1.2rem;
  z-index: 200;
  border: 1px solid;
  animation: toastIn 0.2s ease;
}
.trade-toast--success { background: rgba(40,167,69,0.9); border-color: #28a745; color: #fff; }
.trade-toast--error   { background: rgba(220,53,69,0.9);  border-color: #dc3545; color: #fff; }
.trade-toast--info    { background: rgba(0,0,0,0.9);       border-color: #555;    color: var(--text-cream); }
@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
`;
