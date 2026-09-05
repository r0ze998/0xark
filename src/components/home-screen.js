import { injectStyle } from '../lib/inject-style.js';
import { HOME_SCREEN_CSS } from '../style/home-screen.js';
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
  injectStyle('home-css', HOME_SCREEN_CSS);
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
