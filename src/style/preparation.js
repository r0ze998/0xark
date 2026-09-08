// Base styles for preparation.js. Kept as a module to preserve synchronous,
// lazy installation and the existing cascade beneath archive.css.
export const PREPARATION_CSS = `
.prep-root {
  position: relative; width: 1024px; height: 576px; overflow: hidden;
  font-family: var(--font-main); background: var(--bg-deep);
  display: flex; flex-direction: column;
}

/* Top bar */
.prep-topbar {
  height: 44px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 16px; border-bottom: var(--border-dim);
  background: rgba(3,6,15,0.75); z-index: 10;
}
.prep-phase-label { font-size: 16px; letter-spacing: 0.1em; color: var(--accent-gold); border-color: var(--accent-gold); }
.prep-timer-wrap { display: flex; align-items: baseline; gap: 6px; }
.prep-timer {
  font-size: 32px; color: var(--accent-gold); letter-spacing: 0.04em; line-height: 1;
  transition: color 0.3s;
}
.prep-timer.timer--urgent { color: var(--accent-red); animation: pulse 0.6s ease-in-out infinite alternate; }
@keyframes pulse { from { opacity: 1; } to { opacity: 0.6; } }

/* Body */
.prep-body { flex: 1; display: flex; min-height: 0; }

/* Field panel */
.prep-field-panel {
  width: 488px; flex-shrink: 0;
  display: flex; flex-direction: column; gap: 4px; overflow-y: auto;
  padding: 12px; border-right: var(--border-dim);
  background: rgba(10,14,26,0.5);
}
.prep-field-title {
  font-size: 24px; letter-spacing: 0.08em; color: var(--text-cream); flex-shrink: 0;
}

/* 5 slots row */
.prep-slots {
  display: flex; gap: 8px; flex-shrink: 0;
}
.prep-slot {
  flex: 1; min-width: 0; height: 136px; border: 2px solid;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px; cursor: pointer; position: relative; overflow: hidden;
  transition: border-color 80ms, background 80ms;
}
.prep-slot--empty {
  border-color: rgba(201,162,39,0.2); border-style: dashed;
  background: rgba(201,162,39,0.03);
}
.prep-slot--empty:hover { border-color: rgba(201,162,39,0.5); background: rgba(201,162,39,0.07); }
.prep-slot--filled { border-color: rgba(201,162,39,0.4); border-style: solid; background: rgba(10,14,26,0.8); }
.prep-slot--active { border-color: var(--accent-gold) !important; background: rgba(201,162,39,0.08) !important; }
.prep-slot-num { font-size: 20px; color: var(--text-dim); }
.prep-slot-action { display: flex; align-items: center; justify-content: center; gap: 0; width: 100%; font-size: 13px; color: var(--accent-gold); text-align: center; }
.prep-slot-action .px-icon { display: none; }
.prep-slot .ark-card { border: 0; cursor: inherit; background: transparent; }
.prep-slot-index { position: absolute; top: 0; left: 4px; font-size: 13px; color: var(--text-dim); z-index: 2; }
.prep-slot-empty-label { font-size: 13px; color: var(--text-dim); }
.prep-slot--next.prep-slot--empty { border-color: var(--accent-gold); }
.prep-field-heading { display: flex; align-items: center; justify-content: space-between; }
.prep-next { min-height: 20px; font-size: 16px; color: var(--accent-gold); }
.prep-timeout-note { font-size: 13px; text-align: center; }
.prep-action-desc { min-height: 24px; margin-top: 4px; font-size: 16px; line-height: 1.4; color: var(--text-cream); }
.prep-action-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
.prep-remove-selected { padding: 4px 8px; font-size: 13px; flex-shrink: 0; }
.prep-slot[aria-disabled="true"], .prep-vault-grid [aria-disabled="true"] { cursor: wait; }
.prep-root[aria-busy="true"] .prep-slots { border-bottom: 2px solid var(--accent-gold); }
.prep-root :focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  .prep-root *, .prep-root *::before, .prep-root *::after { animation: none !important; transition: none !important; }
}
.prep-vault-grid .card-frame { width: 112px; }

/* Action picker */
.prep-action-picker {
  flex-shrink: 0; padding: 8px; background: var(--bg-mid);
  border: var(--border-dim);
}
.prep-action-title { font-size: 16px; color: var(--text-cream); letter-spacing: 0.04em; }
.prep-action-picker .ats-root { flex-wrap: nowrap; }
.prep-action-picker .ats-btn { flex: 1; min-width: 0; padding: 4px; }

/* Confirm */
.prep-confirm-btn {
  width: 100%; justify-content: center; font-size: 20px; padding: 8px; flex-shrink: 0;
}
.prep-hint { font-size: 13px; line-height: 1.4; text-align: center; flex-shrink: 0; color: var(--text-cream); user-select: text; }
.prep-topbar-right { display: flex; align-items: center; gap: 14px; }
.prep-energy-note { font-size: 13px; text-align: center; flex-shrink: 0; display: flex; align-items: center; justify-content: center; gap: 3px; }

/* Vault panel */
.prep-vault-panel {
  flex: 1; display: flex; flex-direction: column; min-width: 0;
  padding: 8px 10px; overflow: hidden;
}
.prep-vault-header {
  display: flex; flex-direction: column; gap: 4px;
  margin-bottom: 8px; flex-shrink: 0;
}
.prep-vault-title { font-size: 16px; letter-spacing: 0.1em; color: var(--accent-gold); }
.prep-vault-grid {
  flex: 1; overflow-y: auto;
  display: flex; flex-wrap: wrap; gap: 8px; align-content: start;
  padding-bottom: 4px;
}
.prep-vault-grid::-webkit-scrollbar { width: 3px; }
.prep-vault-grid::-webkit-scrollbar-thumb { background: rgba(201,162,39,0.2); }
`;
