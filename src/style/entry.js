// Kept as synchronous injected CSS to preserve the existing cascade and URLs.
export const WALLET_CSS = `
.wg-screen {
  height: 100%; display: flex; flex-direction: column;
  padding: 0 32px; font-family: var(--font-main);
  background: var(--bg-deep); color: var(--text-cream);
}
.wg-topbar {
  height: 64px; flex-shrink: 0; display: flex; align-items: center;
  justify-content: space-between; border-bottom: var(--border-dim);
}
.wg-logo { font-size: 32px; letter-spacing: var(--ls-display); color: var(--accent-gold); }
.wg-topbar .chip { color: var(--accent-blue); border-color: var(--accent-blue); }
.wg-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 336px; gap: 32px; padding: 24px 0; }
.wg-intro { min-width: 0; }
.wg-eyebrow { font-size: 13px; letter-spacing: var(--ls-wide); color: var(--accent-gold); }
.wg-intro h1 { font-size: 48px; line-height: 1; font-weight: normal; margin: 8px 0; }
.wg-story { font-size: 20px; line-height: 1.2; }
.wg-card-lineup { display: flex; align-items: center; gap: 16px; margin-top: 16px; }
.wg-card-lineup .card-frame { width: 144px; flex-shrink: 0; cursor: default; }
.wg-card-lineup .card-frame:hover { transform: none; box-shadow: none; }
.wg-catalog-note { margin-top: 8px; font-size: 13px; color: var(--text-dim); letter-spacing: var(--ls-caption); }
.wg-connect-block {
  min-height: 0; padding: 24px; border: var(--border-dim); background: var(--bg-mid);
  display: flex; flex-direction: column; align-items: flex-start; overflow-y: auto;
}
.wg-seal { color: var(--accent-gold); margin-bottom: 12px; }
.wg-connect-block h2 { font-size: 32px; line-height: 1.1; font-weight: normal; margin: 8px 0 12px; }
.wg-prompt { font-size: 20px; line-height: 1.2; margin-bottom: 16px; }
.wg-btn-primary {
  width: 100%; min-height: 48px; flex-shrink: 0; padding: 12px 16px;
  font-family: var(--font-main); font-size: 22px; letter-spacing: var(--ls-wide);
  background: var(--accent-gold); color: var(--bg-deep); border: var(--border-hard);
  cursor: pointer; transition: background var(--t-fast);
}
.wg-btn-primary:hover:not(:disabled) { background: var(--accent-gold-bright); }
.wg-btn-primary:active:not(:disabled) { transform: translateY(1px); }
.wg-btn-primary:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 4px; }
.wg-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.wg-connection-note { margin-top: 8px; font-size: 13px; line-height: 1.3; color: var(--text-dim); }
.wg-error { margin-top: 12px; color: var(--accent-red); font-size: 16px; overflow-wrap: anywhere; }
.wg-help { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; font-size: 16px; }
.wg-help a { color: var(--accent-blue); text-decoration: underline; }
.wg-network { margin-top: auto; padding-top: 16px; font-size: 13px; line-height: 1.3; color: var(--accent-blue); }
.wg-network span { color: var(--text-dim); }
.wg-toast {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.6rem 1.4rem;
  font-family: 'VT323', monospace;
  font-size: 1.1rem;
  border-radius: 2px;
  z-index: 9999;
  animation: wg-toast-in 0.2s ease;
}
.wg-toast--warn  { background: var(--bg-panel); color: var(--accent-warn); border: 1px solid var(--accent-warn); }
.wg-toast--info  { background: var(--bg-panel); color: var(--accent-blue); border: 1px solid var(--accent-blue); }
.wg-toast--error { background: var(--bg-panel); color: var(--accent-red); border: 1px solid var(--accent-red); }
.wg-toast--success { background: var(--bg-panel); color: var(--success); border: 1px solid var(--success); }
@keyframes wg-toast-in { from { opacity:0; bottom:0.5rem; } to { opacity:1; bottom:1.5rem; } }
`;
export const REGISTER_CSS = `
.reg-screen {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; padding: 0.75rem 1rem; text-align: center;
  font-family: 'VT323', monospace; background: var(--bg-deep); color: var(--text-cream);
}
.reg-logo { font-size: 2.5rem; letter-spacing: 0.2em; color: var(--accent-gold); margin-bottom: 0.2rem; }
.reg-subtitle { color: #888; margin-bottom: 0.5rem; letter-spacing: 0.1em; font-size: 1rem; }
.reg-prompt {
  max-width: 500px; width: 100%; padding: 0.75rem 1.25rem;
  border: 2px solid var(--accent-gold); background: rgba(201,162,39,0.05);
}
.reg-title { color: var(--accent-gold); margin: 0 0 0.4rem; letter-spacing: 0.1em; font-size: 1.6rem; }
.reg-desc { font-size: 1rem; color: #b0a890; margin-bottom: 0.5rem; }
.reg-benefits { list-style: none; padding: 0; text-align: left; margin: 0.5rem 0; }
.reg-benefits li { padding: 2px 0 2px 20px; position: relative; font-size: 0.95rem; }
.reg-benefits li::before { content: '▸'; position: absolute; left: 0; color: var(--accent-gold); }
.reg-cost {
  margin: 0.5rem 0; padding: 0.5rem 1rem; background: rgba(0,0,0,0.3);
  border: 1px solid var(--accent-blue); display: flex; justify-content: space-between; align-items: center;
}
.reg-cost-label { color: #888; font-size: 1rem; }
.reg-cost-amount { color: var(--accent-gold); font-size: 1.4rem; }
.reg-primary-btn {
  font-family: 'VT323', monospace; font-size: 1.4rem; letter-spacing: 0.1em;
  padding: 0.6rem 2.5rem; background: var(--accent-gold); color: var(--bg-deep);
  border: 2px solid #000; cursor: pointer; width: 100%; margin: 0.4rem 0;
  transition: background 0.15s, transform 0.15s;
}
.reg-primary-btn:hover:not(:disabled) { background: var(--accent-gold-bright); transform: translateY(-2px); }
.reg-primary-btn:disabled { background: #444; color: #888; cursor: not-allowed; transform: none; }
.reg-error { margin-top: 0.3rem; color: #e55; font-size: 0.95rem; }
.reg-note { font-size: 0.85rem; color: #888; margin-top: 0.3rem; }
.reg-wallet-info {
  margin-top: 0.5rem; display: flex; align-items: center; gap: 1rem;
  color: #888; font-size: 0.9rem;
}
.reg-addr { color: var(--accent-gold); }
.reg-link-btn {
  background: none; border: none; color: var(--accent-blue);
  text-decoration: underline; cursor: pointer; font-family: inherit; font-size: 0.9rem;
}
`;
