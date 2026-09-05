// Home is the player's lobby: an owned-card showcase and one clear way into battle.
import { pxIcon } from '../lib/px-icons.js';
import { getCard } from '../lib/cards.js';
import { NETWORK } from '../config.js';
import { getState, setState, resetBattle } from '../state/battle-state.js';
import { tierForVault, PRIZE_TIERS } from '../lib/ui-shared.js';
import { CardFrameHTML, CARD_NAMES, injectCardCSS } from './common/Card.js';
import { EnergyHudHTML, attachEnergyHud, injectEnergyCss, computeEnergy } from './common/energy-hud.js';

let _cleanup = () => {};

function _injectCSS() {
  if (document.getElementById('home-css')) return;
  const s = document.createElement('style');
  s.id = 'home-css';
  s.textContent = `
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
  document.head.appendChild(s);
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
}

function dayLabel(world) {
  const start = Number(world?.game_start_timestamp);
  if (!Number.isFinite(start) || start <= 0) return 'GAME DAY UNAVAILABLE';
  const elapsed = Math.floor((Date.now() / 1000 - start) / 86400);
  return elapsed < 0 ? 'SEASON NOT STARTED' : elapsed >= 14 ? 'SEASON ENDED' : `DAY ${elapsed + 1} / 14`;
}

export function mount(container, props = {}) {
  _cleanup();
  injectCardCSS();
  injectEnergyCss();
  _injectCSS();
  const state = getState();
  const ps = props.playerState ?? state.playerState ?? {};
  const world = props.gameWorld ?? state.gameWorld ?? {};
  // An explicitly empty chain vault remains empty; never substitute preview cards.
  const source = Array.isArray(ps.vault) ? ps.vault : Array.isArray(props.vault) ? props.vault : state.vault;
  const vault = [...new Set((Array.isArray(source) ? source : []).filter(id => Number.isInteger(id) && getCard(id)))];
  const count = vault.length;
  const featured = [...vault].sort((a,b) => getCard(b).rarity - getCard(a).rarity).slice(0,3);
  // Keep the strongest frame at the center of a three-card showcase.
  if (featured.length === 3) [featured[0], featured[1]] = [featured[1], featured[0]];
  const tier = tierForVault(count);
  const nextTier = [...PRIZE_TIERS].reverse().find(t => t.min > count);
  const progressText = nextTier ? `${nextTier.min - count} to Tier ${nextTier.tier}` : count ? 'Collection complete' : 'Start your collection';
  const pubkey = String(props.pubkey ?? props.playerPubkey ?? state.playerPubkey ?? '');
  const wallet = pubkey ? `${pubkey.slice(0,4)}…${pubkey.slice(-4)}` : 'Wallet unavailable';
  let energyNow = computeEnergy(ps).energyNow;
  const energyKnown = energyNow != null;
  const disabledReason = () => count < 5 ? `Own ${5-count} more card${5-count === 1 ? '' : 's'} to enter a duel.` : energyNow === 0 ? 'No energy. Refill or wait for regeneration.' : '';
  const energyHTML = energyKnown ? EnergyHudHTML(ps, { refill:true }) : `<div class="home-energy-unknown">${pxIcon('bolt', { size:16 })} Energy unavailable</div>`;
  const practice = !!window.oxarkPreview;
  container.innerHTML = `
    <main class="home-screen" aria-label="0xARK lobby">
      <header class="home-header">
        <div class="home-brand"><h1>0xARK</h1><span class="home-brand-label">THE DROWNED ARCHIVE</span></div>
        <div class="home-session"><span class="home-day">${dayLabel(world)}</span><span class="home-wallet selectable">${practice ? 'Practice collection' : escapeHTML(wallet)}</span></div>
      </header>
      <div class="home-main">
        <section class="home-battle" aria-labelledby="home-battle-title">
          <p class="home-eyebrow">TACTICAL CARD DUELS</p>
          <h2 id="home-battle-title">A quiet hand.<br><em>A decisive move.</em></h2>
          <p class="home-battle-copy">Five cards. Six possible actions.<br>Lock your choices before the reveal.</p>
          <div class="home-rule"><span>01 &nbsp; BUILD</span><span>02 &nbsp; SEAL</span><span>03 &nbsp; REVEAL</span></div>
          <div class="home-battle-action"><button type="button" class="home-battle-button" id="btn-battle" aria-describedby="home-readiness" ${disabledReason() ? 'disabled' : ''}><span>${practice ? 'Play a practice duel' : 'Enter the arena'}</span>${pxIcon('battle',{size:24})}</button><p class="home-readiness" id="home-readiness" role="status">${practice ? 'No wallet needed · First to three round wins' : disabledReason() || '1 energy per duel · Network fees apply'}</p></div>
          <div class="home-energy" aria-label="Battle energy">${energyHTML}</div>
        </section>
        <section class="home-showcase" aria-label="Featured cards from your collection">
          <div class="home-showcase-heading"><p class="home-eyebrow">SELECTED FROM YOUR VAULT</p><span class="home-gallery-index">I / III</span></div>
          ${featured.length ? `<div class="home-gallery">${featured.map(id=>`<button type="button" class="home-card" data-home-nav="main" aria-label="Inspect collection: ${escapeHTML(CARD_NAMES[id])}">${CardFrameHTML({id})}</button>`).join('')}</div><p class="home-showcase-caption">COLLECT THE CARDS. LEARN THEIR POSSIBILITIES.</p>` : `<div class="home-empty">${pxIcon('vault',{size:48})}<p>Your collection begins here.</p><button class="gba-btn" data-home-nav="shop">Explore packs</button></div>`}
        </section>
      </div>
      <nav class="home-destinations" aria-label="Explore 0xARK">
        <button type="button" class="home-destination" id="btn-vault" data-home-nav="main"><span class="destination-number">01</span><span class="home-vault-info"><span class="home-vault-heading"><span class="home-destination-label">The collection</span><span class="home-vault-count">${count}<span class="home-day"> / 60</span></span></span><span class="home-progress" role="progressbar" aria-label="Vault collection" aria-valuenow="${count}" aria-valuemin="0" aria-valuemax="60"><span class="home-progress-fill" style="width:${count/60*100}%"></span></span><span class="home-destination-copy">${progressText}</span></span></button>
        <button type="button" class="home-destination" id="btn-shop" data-home-nav="shop"><span class="destination-number">02</span><span><span class="home-destination-label">Sealed packs</span><span class="home-destination-copy">Discover your next possibility</span></span>${pxIcon('pack',{size:24})}</button>
        <button type="button" class="home-destination" id="btn-trade" data-home-nav="trade"><span class="destination-number">03</span><span><span class="home-destination-label">The exchange</span><span class="home-destination-copy">Find the missing piece</span></span>${pxIcon('trade',{size:24})}</button>
      </nav>
      <footer class="home-footer"><span>COLLECT · COMMIT · REVEAL</span><span>${practice ? 'LOCAL PRACTICE / NOT ON-CHAIN' : 'SOLANA / ' + NETWORK.toUpperCase()}</span></footer>
    </main>`;

  const onClick = (event) => {
    const nav = event.target.closest('[data-home-nav]');
    if (nav) document.dispatchEvent(new CustomEvent(`nav:${nav.dataset.homeNav}`));
    const battle = event.target.closest('#btn-battle');
    if (battle && !disabledReason()) {
      if (practice) { resetBattle(); setState({ isHost: true, duelP1IsMe: true }); }
      document.dispatchEvent(new CustomEvent(practice ? 'nav:preparation' : 'nav:matchmaking'));
    }
  };
  container.addEventListener('click', onClick);
  const detachEnergy = energyKnown ? attachEnergyHud(container, {
    playerState:ps,
    refill:true,
    onChange:(value) => {
      energyNow = value;
      const button = container.querySelector('#btn-battle');
      if (!button) return;
      const reason = disabledReason();
      button.disabled = !!reason;
      const status = container.querySelector('#home-readiness');
      const text = practice ? 'No wallet needed · First to three round wins' : reason || (value == null ? 'Energy will be checked before battle.' : '1 energy to duel · Select your hand next');
      if (status.textContent !== text) status.textContent = text;
    },
  }) : () => {};
  _cleanup = () => {
    detachEnergy();
    container.removeEventListener('click', onClick);
  };
}

export function unmount(container) {
  _cleanup();
  _cleanup = () => {};
  container.innerHTML = '';
}
