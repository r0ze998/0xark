// Base styles for main-screen.js. Kept as a module to preserve synchronous,
// lazy installation and the existing cascade beneath archive.css.
export const MAIN_SCREEN_CSS = `
.ms-root { position:relative; width:1024px; height:576px; overflow:hidden; font-family:var(--font-main); color:var(--text-cream); background:var(--bg-deep); display:flex; flex-direction:column; }
.ms-root *, .ms-root *::before, .ms-root *::after { box-sizing:border-box; }
.ms-root h1, .ms-root h2, .ms-root p { margin:0; font-weight:normal; }
.ms-topbar { height:56px; flex-shrink:0; display:flex; align-items:center; justify-content:space-between; padding:0 var(--sp-4); border-bottom:var(--border-dim); background:var(--bg-panel); z-index:var(--z-hud); }
.ms-brand, .ms-hud { display:flex; align-items:center; gap:var(--sp-3); }
.ms-brand-name { font-size:var(--fs-heading); color:var(--accent-gold); letter-spacing:var(--ls-display); }
.ms-tagline, .ms-eyebrow { color:var(--text-dim); font-size:var(--fs-caption); letter-spacing:var(--ls-wide); }
.ms-wallet-btn { font-size:var(--fs-ui); padding:var(--sp-1) var(--sp-2); }
.ms-back-btn { background:transparent; border:var(--border-dim); color:var(--text-cream); padding:var(--sp-1) var(--sp-3); cursor:pointer; font:var(--fs-ui) var(--font-main); }
.ms-back-btn:hover { border-color:var(--accent-gold); }
.ms-body { flex:1; display:flex; min-height:0; }
.ms-vault-panel { flex:1; display:flex; flex-direction:column; min-width:0; min-height:0; padding:var(--sp-4); border-right:var(--border-dim); }
.ms-panel-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--sp-3); flex-shrink:0; }
.ms-panel-title { font-size:var(--fs-title); line-height:var(--lh-ui); margin-top:var(--sp-1) !important; }
.ms-collection-total { color:var(--accent-gold); font-size:var(--fs-title); }
.ms-collection-total span { color:var(--text-dim); font-size:var(--fs-ui); }
.ms-vault-progress { height:4px; background:var(--bg-mid); flex-shrink:0; margin-bottom:var(--sp-3); }
.ms-vault-progress-fill { height:100%; background:var(--accent-gold); transition:width var(--t-base); }
#ms-pane-vault { display:flex; flex-direction:column; flex:1; min-height:0; }
.ms-scope-filters, .ms-faction-filters { display:flex; gap:var(--sp-1); flex-shrink:0; margin-bottom:var(--sp-2); }
.ms-scope-btn, .ms-faction-btn { background:transparent; border:var(--border-dim); color:var(--text-cream); cursor:pointer; font:var(--fs-ui) var(--font-main); padding:var(--sp-1) var(--sp-2); }
.ms-scope-btn { flex:1; padding:var(--sp-2); }
.ms-scope-btn[aria-pressed="true"] { background:var(--accent-gold); border-color:var(--accent-gold); color:var(--bg-deep); }
.ms-faction-btn { font-size:var(--fs-caption); flex:1; white-space:nowrap; }
.ms-faction-btn[aria-pressed="true"], .ms-faction-btn:hover { border-color:var(--fc,var(--accent-gold)); color:var(--fc,var(--accent-gold)); }
.ms-grid-summary { display:flex; justify-content:space-between; color:var(--text-dim); font-size:var(--fs-caption); padding:var(--sp-1) 0 var(--sp-2); }
.ms-card-grid { flex:1; min-height:0; overflow-y:auto; display:grid; grid-template-columns:repeat(5,minmax(112px,1fr)); gap:var(--sp-2); align-content:start; padding:var(--sp-1); scrollbar-color:var(--accent-gold) var(--bg-mid); scrollbar-width:thin; }
.ms-card-button { min-width:0; width:100%; border:0; padding:0; background:transparent; color:var(--text-cream); font-family:var(--font-main); cursor:pointer; text-align:center; }
.ms-card-button .card-frame { width:100%; pointer-events:none; }
.ms-card-button .card-frame .stat-label { display:none; }
.ms-card-button .card-frame--locked { opacity:0.65; }
.ms-card-button:hover .card-frame { outline:1px solid var(--accent-gold); }
.ms-card-caption { display:block; padding:var(--sp-1) 0; font-size:var(--fs-caption); color:var(--text-dim); }
.ms-card-button--missing .ms-card-caption { color:var(--text-cream); }
.ms-empty { grid-column:1/-1; padding:var(--sp-6) var(--sp-4); text-align:center; border:var(--border-dim); }
.ms-empty > span { font-size:var(--fs-heading); }
.ms-empty p { margin-top:var(--sp-2); font-size:var(--fs-ui); }
.ms-side { width:284px; flex-shrink:0; display:flex; flex-direction:column; min-height:0; padding:var(--sp-4); gap:var(--sp-3); overflow-y:auto; }
.ms-side-section { display:flex; flex:1; min-height:0; flex-direction:column; gap:var(--sp-2); }
#ms-legendary-progress { min-height:0; overflow-y:auto; }
.ms-side-title { font-size:var(--fs-heading); }
.ms-side-copy { font-size:var(--fs-ui); line-height:var(--lh-ui); }
.ms-vault-tip { font-size:var(--fs-caption); color:var(--text-dim); line-height:var(--lh-body); }
.ms-matchmaking { flex-shrink:0; display:flex; flex-direction:column; gap:var(--sp-2); margin-top:auto; padding-top:var(--sp-3); border-top:var(--border-dim); }
.ms-start-btn { width:100%; justify-content:center; font-size:var(--fs-heading); padding:var(--sp-3); letter-spacing:var(--ls-normal); }
.ms-start-btn:disabled { opacity:0.45; cursor:not-allowed; }
.ms-match-info { font-size:var(--fs-ui); line-height:var(--lh-ui); }
.ms-cost { font-size:var(--fs-caption); color:var(--text-dim); line-height:var(--lh-body); }
.ms-steal-note { font-size:var(--fs-caption); color:var(--text-dim); line-height:var(--lh-body); }
.ms-footer { height:32px; flex-shrink:0; display:flex; align-items:center; justify-content:space-between; padding:0 var(--sp-4); font-size:var(--fs-caption); color:var(--text-dim); border-top:var(--border-dim); }
.ms-not-owned { color:var(--accent-blue); font-size:var(--fs-ui); margin-bottom:var(--sp-2); }
.ms-battle-body { flex:1; min-height:0; display:flex; flex-direction:column; padding:var(--sp-5); gap:var(--sp-5); }
.ms-battle-heading { display:flex; justify-content:space-between; align-items:center; }
.ms-battle-title { font-size:var(--fs-display); line-height:var(--lh-tight); margin-top:var(--sp-1) !important; }
.ms-battle-layout { flex:1; display:grid; grid-template-columns:minmax(0,1fr) 288px; gap:var(--sp-5); min-height:0; }
.ms-battle-deck { min-width:0; display:flex; flex-direction:column; gap:var(--sp-3); }
.ms-deck-label { display:flex; justify-content:space-between; font-size:var(--fs-caption); color:var(--text-dim); }
.ms-deck-label > span:first-child { color:var(--accent-gold); }
.ms-battle-cards { display:grid; grid-template-columns:repeat(5,minmax(112px,1fr)); gap:var(--sp-2); padding:var(--sp-1); }
.ms-card-slot { aspect-ratio:5/7; border:var(--border-dim); display:flex; align-items:center; justify-content:center; flex-direction:column; gap:var(--sp-2); color:var(--text-dim); font-size:var(--fs-caption); background:var(--bg-mid); }
.ms-deck-note { font-size:var(--fs-ui); line-height:var(--lh-body); }
.ms-battle-brief { display:flex; flex-direction:column; gap:var(--sp-4); border-left:var(--border-dim); padding-left:var(--sp-5); }
.ms-battle-steps { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:var(--sp-3); }
.ms-battle-steps li { display:flex; gap:var(--sp-3); }
.ms-step-number { color:var(--accent-gold); font-size:var(--fs-heading); }
.ms-battle-steps li div > span { font-size:var(--fs-ui); letter-spacing:var(--ls-wide); }
.ms-battle-steps p { font-size:var(--fs-ui); line-height:var(--lh-ui); margin-top:var(--sp-1); }
.ms-battle-action { display:flex; flex-direction:column; gap:var(--sp-2); margin-top:auto; }
`;
