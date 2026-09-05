// Base styles for home-screen.js. Kept as a module to preserve synchronous,
// lazy installation and the existing cascade beneath archive.css.
export const HOME_SCREEN_CSS = `
.home-screen {
  height:100%; box-sizing:border-box; padding:20px 24px;
  display:grid; grid-template-rows:52px minmax(0,1fr) 80px 16px; gap:12px;
  font-family:var(--font-main); color:var(--text-cream); background:var(--bg-deep);
  font-size:var(--fs-ui); text-align:left;
}
.home-screen * { box-sizing:border-box; }
.home-screen button { font-family:inherit; border-radius:0; }
.home-screen h1,.home-screen h2,.home-screen p { margin:0; font-weight:normal; }
.home-screen .home-header { display:flex; align-items:center; justify-content:space-between; border-bottom:var(--border-dim); padding-bottom:12px; }
.home-screen .home-brand { display:flex; align-items:center; gap:16px; }
.home-screen .home-brand h1 { font-size:40px; line-height:1; letter-spacing:0.12em; color:var(--accent-gold); }
.home-screen .home-brand-label { border-left:var(--border-dim); padding-left:16px; letter-spacing:var(--ls-wide); }
.home-screen .home-session { display:flex; align-items:center; gap:16px; color:var(--text-cream); }
.home-screen .home-day { font-size:var(--fs-caption); color:var(--text-dim); }
.home-screen .home-wallet { font-size:var(--fs-caption); border:var(--border-dim); padding:8px 12px; }
.home-screen .home-main { display:grid; grid-template-columns:minmax(0,1fr) 336px; gap:24px; min-height:0; }
.home-screen .home-showcase { min-width:0; position:relative; display:flex; flex-direction:column; border-bottom:var(--border-dim); }
.home-screen .home-showcase-heading { display:flex; align-items:flex-start; justify-content:space-between; padding:12px 0 0; }
.home-screen .home-eyebrow { color:var(--text-dim); font-size:var(--fs-caption); letter-spacing:var(--ls-wide); }
.home-screen .home-showcase h2 { font-size:var(--fs-title); line-height:1.1; margin-top:4px; }
.home-screen .home-card-note { max-width:156px; padding-top:4px; text-align:right; color:var(--text-dim); font-size:var(--fs-caption); line-height:1.4; }
.home-screen .home-gallery { flex:1; min-height:0; display:flex; align-items:center; justify-content:center; gap:12px; padding:12px 0 8px; position:relative; }
.home-screen .home-gallery::before { content:''; position:absolute; left:8px; right:8px; top:40%; bottom:28px; border:var(--border-dim); background:var(--bg-mid); }
.home-screen .home-card { position:relative; width:144px; padding:0; background:transparent; border:0; cursor:pointer; transition:transform var(--t-fast); }
.home-screen .home-card:first-child { margin-top:24px; }
.home-screen .home-card:last-child:not(:first-child) { margin-top:24px; }
.home-screen .home-card:nth-child(2) { width:168px; }
.home-screen .home-card:hover { transform:translateY(-4px); }
.home-screen .home-card:active { transform:translateY(1px); }
.home-screen .home-card .card-frame { cursor:inherit; }
.home-screen .home-card .name-banner { font-size:13px; left:13%; right:13%; }
.home-screen .home-card .stats-panel { left:12%; right:12%; padding:0; }
.home-screen .home-card .stat-label { font-size:13px; }
.home-screen .home-card .stat-value { font-size:15px; }
.home-screen .home-showcase-caption { padding:0 0 8px; font-size:var(--fs-caption); color:var(--text-dim); text-align:center; letter-spacing:var(--ls-caption); }
.home-screen .home-empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; margin:16px 0; border:var(--border-dim); background:var(--bg-mid); text-align:center; padding:16px 32px; }
.home-screen .home-empty > .px-icon { color:var(--accent-gold); }
.home-screen .home-empty p { font-size:var(--fs-body); }
.home-screen .home-empty span { color:var(--text-dim); line-height:1.4; }
.home-screen .home-battle { display:flex; flex-direction:column; background:var(--bg-mid); border:var(--border-dim); border-top:2px solid var(--accent-gold); padding:20px; min-height:0; }
.home-screen .home-battle-title { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
.home-screen .home-battle-title > .px-icon { color:var(--accent-gold); }
.home-screen .home-battle h2 { font-size:var(--fs-title); line-height:1; margin-top:4px; }
.home-screen .home-battle-copy { font-size:var(--fs-body); line-height:1.2; }
.home-screen .home-rule { display:flex; align-items:center; gap:8px; margin-top:12px; padding:8px 0; border-top:var(--border-dim); border-bottom:var(--border-dim); font-size:var(--fs-caption); color:var(--text-dim); }
.home-screen .home-rule .px-icon { color:var(--accent-gold); }
.home-screen .home-energy { margin-top:12px; min-height:40px; }
.home-screen .energy-hud { display:flex; flex-wrap:wrap; column-gap:8px; row-gap:4px; }
.home-screen .energy-count { font-size:16px; }
.home-screen .energy-next { flex-basis:100%; color:var(--text-dim); }
.home-screen .home-energy-unknown { display:flex; align-items:center; gap:8px; font-size:16px; }
.home-screen .home-energy-unknown .px-icon { color:var(--text-dim); }
.home-screen .home-battle-action { margin-top:auto; padding-top:8px; }
.home-screen .home-battle-button { width:100%; display:flex; align-items:center; justify-content:space-between; padding:12px 16px; font-size:32px; line-height:1; letter-spacing:var(--ls-wide); border:var(--border-hard); background:var(--accent-gold); color:var(--bg-deep); cursor:pointer; transition:background var(--t-fast),transform var(--t-fast); }
.home-screen .home-battle-button:hover:not(:disabled) { background:var(--accent-gold-bright); }
.home-screen .home-battle-button:active:not(:disabled) { transform:translateY(1px); }
.home-screen .home-battle-button:disabled { opacity:0.45; cursor:not-allowed; }
.home-screen .home-readiness { font-size:var(--fs-caption); color:var(--text-dim); margin-top:6px; line-height:1.2; min-height:16px; }
.home-screen .home-destinations { display:grid; grid-template-columns:minmax(0,1.65fr) 1fr 1fr; gap:12px; }
.home-screen .home-destination { min-width:0; display:flex; align-items:center; gap:12px; padding:12px 16px; border:var(--border-dim); background:var(--bg-deep); color:var(--text-cream); text-align:left; cursor:pointer; transition:background var(--t-fast),border-color var(--t-fast); }
.home-screen .home-destination:hover { background:var(--bg-mid); border-color:var(--accent-gold); }
.home-screen .home-destination:active { transform:translateY(1px); }
.home-screen .home-destination > .px-icon { color:var(--accent-gold); }
.home-screen .home-destination-label { display:block; font-size:24px; line-height:1; letter-spacing:var(--ls-wide); }
.home-screen .home-destination-copy { display:block; font-size:13px; line-height:1.3; color:var(--text-dim); margin-top:4px; }
.home-screen .home-vault-info { flex:1; min-width:0; }
.home-screen .home-vault-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.home-screen .home-vault-count { color:var(--accent-gold); font-size:20px; }
.home-screen .home-progress { display:block; height:4px; margin-top:8px; background:var(--bg-mid); }
.home-screen .home-progress-fill { display:block; height:100%; background:var(--accent-gold); }
.home-screen .home-footer { display:flex; justify-content:space-between; align-items:center; font-size:var(--fs-caption); color:var(--text-dim); letter-spacing:var(--ls-caption); }
.home-screen button:focus-visible { outline:2px solid var(--accent-gold); outline-offset:3px; }
@media (prefers-reduced-motion:reduce) { .home-screen .home-card,.home-screen button { transition:none; transform:none; } }
`;
