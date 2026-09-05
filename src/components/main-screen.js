import { injectStyle } from '../lib/inject-style.js';
import { MAIN_SCREEN_CSS } from '../style/main-screen.js';
// main-screen.js — collection and battle lobby. Chain state owns assets and energy.
import { pxIcon } from '../lib/px-icons.js';
import { ALL_CARD_IDS, getCard } from '../lib/cards.js';
import { CardFrameHTML, injectCardCSS, FACTION_NAMES, FACTION_COLORS, CARD_NAMES } from './common/Card.js';
import { LegendaryProgressHTML, injectLegendaryProgressCSS } from './common/LegendaryProgress.js';
import { EnergyHudHTML, attachEnergyHud, injectEnergyCss, computeEnergy } from './common/energy-hud.js';
import { NETWORK, PROGRAM_ID, STEAL_ENABLED } from '../config.js';
import { getState, setState, resetBattle } from '../state/battle-state.js';
import { CardDetailModal } from './card-detail.js';
import * as duelWs from '../lib/duel-ws.js';

let _detachEnergy = () => {};
let _energyNow = null;
let _generation = 0;
let _energyRequest = 0;
let _searching = false;
let _matchError = '';
let _matchDisposers = [];

function _unsubMatchmaking() {
  _matchDisposers.forEach(dispose => dispose());
  _matchDisposers = [];
}

export function mount(container, detail = {}) {
  CardDetailModal.hide();
  _generation++;
  _energyNow = null;
  _matchError = '';
  _searching = false;
  _detachEnergy();
  _unsubMatchmaking();
  if (!window.oxarkWallet?.isConnected?.()) {
    document.dispatchEvent(new CustomEvent('nav:wallet-required'));
    return;
  }
  injectMainScreenCSS();
  injectCardCSS();
  injectLegendaryProgressCSS();
  injectEnergyCss();
  const s = getState();
  const vault = detail.vault ?? s.vault ?? [];
  const pubkey = detail.pubkey ?? s.playerPubkey
    ?? window.oxarkWallet?.getPublicKey?.()?.toString() ?? '';
  const perso = detail.personalities ?? s.personalities ?? {};
  setState({ vault, playerPubkey: pubkey, personalities: perso, phase: 'main' });
  if (detail.mode === 'battle') {
    _mountBattle(container, { ...detail, vault, pubkey });
  } else {
    container.innerHTML = buildHTML({ vault, pubkey, perso, playerState: detail.playerState });
    bindEvents(container);
    _refreshVaultGrid(container);
  }
  _applyEnergyGate(container);
  _loadEnergy(container, pubkey, detail.playerState);
}

export function unmount(container) {
  CardDetailModal.hide();
  _generation++;
  _energyRequest++;
  _detachEnergy();
  _detachEnergy = () => {};
  _unsubMatchmaking();
  if (_searching) duelWs.cancelMatchmaking();
  _searching = false;
  _energyNow = null;
  container.innerHTML = '';
}

const _shortKey = pubkey => pubkey.length >= 8 ? `${pubkey.slice(0, 4)}…${pubkey.slice(-4)}` : (pubkey || '—');
const _ownedIds = () => ALL_CARD_IDS.filter(id => (getState().vault ?? []).includes(id));
const _costCopy = '1 energy when you seal · Solana network fees apply';
const _stealCopy = () => STEAL_ENABLED ? '' : `${pxIcon('lock')} STEAL IS OFF · Your cards stay yours after a duel.`;

function _footer(pubkey) {
  return `<footer class="ms-footer"><span class="selectable">${_shortKey(pubkey)}</span><span>${NETWORK.toUpperCase()}</span><span class="selectable">PROGRAM ${PROGRAM_ID.slice(0, 6)}…${PROGRAM_ID.slice(-4)}</span></footer>`;
}

function buildHTML({ vault, pubkey, perso, playerState }) {
  const count = new Set(vault).size;
  return `<div class="ms-root" role="main" aria-label="Card vault" data-scope="owned" data-faction="all">
    <header class="ms-topbar">
      <div class="ms-brand"><button class="ms-back-btn" id="ms-home-btn">← Home</button><span class="ms-brand-name">0xARK</span><span class="ms-tagline">THE VAULT</span></div>
      <div class="ms-hud"><span class="chip" id="ms-vault-count">${count}/${ALL_CARD_IDS.length} COLLECTED</span>${EnergyHudHTML(playerState, { refill: true })}<span class="chip ms-wallet-btn selectable" id="ms-wallet" title="${pubkey}">${pxIcon('check')} ${_shortKey(pubkey)}</span></div>
    </header>
    <div class="ms-body">
      <section class="ms-vault-panel" aria-label="Your collection">
        <div class="ms-panel-header"><div><span class="ms-eyebrow">YOUR COLLECTION</span><h1 class="ms-panel-title">Every card has a story.</h1></div><span class="ms-collection-total" id="ms-collection-total">${count}<span> / ${ALL_CARD_IDS.length}</span></span></div>
        <div class="ms-vault-progress" role="progressbar" aria-label="Collection complete" aria-valuemin="0" aria-valuenow="${count}" aria-valuemax="${ALL_CARD_IDS.length}"><div class="ms-vault-progress-fill" style="width:${count / ALL_CARD_IDS.length * 100}%"></div></div>
        <div id="ms-pane-vault">
          <div class="ms-scope-filters" role="group" aria-label="Collection scope">
            <button class="ms-scope-btn" data-scope="owned" aria-pressed="true">OWNED</button><button class="ms-scope-btn" data-scope="all" aria-pressed="false">ALL CARDS</button><button class="ms-scope-btn" data-scope="missing" aria-pressed="false">MISSING</button>
          </div>
          <div class="ms-faction-filters" role="group" aria-label="Filter by faction"><button class="ms-faction-btn" data-faction="all" aria-pressed="true">ALL FACTIONS</button>${FACTION_NAMES.map((name, faction) => `<button class="ms-faction-btn" data-faction="${faction}" style="--fc:${FACTION_COLORS[faction]}" aria-pressed="false">${name.toUpperCase()}</button>`).join('')}</div>
          <div class="ms-grid-summary"><span id="ms-filter-count" role="status"></span><span>ARROWS TO BROWSE · ENTER TO INSPECT</span></div>
          <div class="ms-card-grid" id="ms-card-grid" role="group" aria-label="Collection cards"></div>
        </div>
      </section>
      <aside class="ms-side">
        <section class="ms-side-section"><span class="ms-eyebrow">THE LONG GAME</span><h2 class="ms-side-title">Legendary paths</h2><p class="ms-side-copy">Your personality progress toward the six Legendary cards.</p><div id="ms-legendary-progress">${LegendaryProgressHTML(perso, undefined, vault)}</div></section>
        <div class="ms-matchmaking"><button class="gba-btn gba-btn--primary ms-start-btn" id="ms-start">${pxIcon('battle')} START BATTLE</button><p class="ms-match-info" id="ms-match-info" role="status"></p><span class="ms-cost">${_costCopy}</span><p class="ms-steal-note">${_stealCopy()}</p></div>
      </aside>
    </div>${_footer(pubkey)}
  </div>`;
}

function _cardButton(id, owned, first = false) {
  const name = CARD_NAMES[id] ?? `Card #${id}`;
  return `<button type="button" class="ms-card-button${owned ? '' : ' ms-card-button--missing'}" data-card-id="${id}" tabindex="${first ? 0 : -1}" aria-label="${name}, ${owned ? 'owned' : 'not owned'}. Inspect card">${CardFrameHTML({ id, owned })}<span class="ms-card-caption">${owned ? 'INSPECT CARD' : 'NOT OWNED · INSPECT'}</span></button>`;
}

function bindEvents(container) {
  container.querySelector('#ms-home-btn')?.addEventListener('click', () => document.dispatchEvent(new CustomEvent('nav:home')));
  container.querySelectorAll('.ms-scope-btn, .ms-faction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const root = container.querySelector('.ms-root');
      const key = btn.classList.contains('ms-scope-btn') ? 'scope' : 'faction';
      root.dataset[key] = btn.dataset[key];
      _refreshVaultGrid(container);
    });
  });
  _bindCards(container, '#ms-card-grid');
  container.querySelector('#ms-start')?.addEventListener('click', () => startMatchmaking(container));
}

function _bindCards(container, selector) {
  const grid = container.querySelector(selector);
  grid?.addEventListener('click', event => {
    const button = event.target.closest('[data-card-id]');
    if (!button) return;
    const id = Number(button.dataset.cardId);
    const root = container.querySelector('.ms-root');
    CardDetailModal.show(root, id, { onBurn: () => _refreshVaultGrid(container), onPromote: () => _refreshVaultGrid(container) });
    if (!(getState().vault ?? []).includes(id)) {
      const label = document.createElement('div');
      label.className = 'ms-not-owned';
      label.textContent = 'NOT OWNED · Collection preview';
      root.querySelector('.cd-info')?.prepend(label);
    }
  });
  grid?.addEventListener('keydown', event => {
    if (!event.target.matches('[data-card-id]')) return;
    const cards = [...grid.querySelectorAll('[data-card-id]')];
    const index = cards.indexOf(event.target);
    const columns = cards.filter(card => card.offsetTop === cards[0]?.offsetTop).length || 1;
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns };
    let next;
    if (event.key in moves) next = Math.max(0, Math.min(cards.length - 1, index + moves[event.key]));
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = cards.length - 1;
    else return;
    event.preventDefault();
    cards.forEach((card, i) => card.tabIndex = i === next ? 0 : -1);
    cards[next]?.focus();
  });
  grid?.addEventListener('focusin', event => {
    if (!event.target.matches('[data-card-id]')) return;
    grid.querySelectorAll('[data-card-id]').forEach(card => card.tabIndex = card === event.target ? 0 : -1);
  });
}

function _refreshVaultGrid(container) {
  const root = container.querySelector('.ms-root');
  const grid = container.querySelector('#ms-card-grid');
  if (!root) return;
  const owned = new Set(_ownedIds());
  const s = getState();
  if (grid) {
    const { scope, faction } = root.dataset;
    const ids = ALL_CARD_IDS.filter(id => (faction === 'all' || getCard(id)?.faction === Number(faction)) && (scope === 'all' || (scope === 'owned' ? owned.has(id) : !owned.has(id))));
    const focusedId = document.activeElement?.dataset?.cardId;
    const scrollTop = grid.scrollTop;
    grid.innerHTML = ids.length ? ids.map((id, i) => _cardButton(id, owned.has(id), i === 0)).join('') : '<div class="ms-empty"><span>No cards here yet.</span><p>Try another faction or switch to All cards to explore the collection.</p></div>';
    grid.scrollTop = scrollTop;
    if (focusedId) (grid.querySelector(`[data-card-id="${focusedId}"]`) ?? grid.querySelector('[data-card-id]'))?.focus();
    container.querySelector('#ms-filter-count').textContent = `${ids.length} ${scope === 'all' ? 'CARDS' : scope.toUpperCase()} · ${faction === 'all' ? 'ALL FACTIONS' : FACTION_NAMES[Number(faction)].toUpperCase()}`;
    root.querySelectorAll('.ms-scope-btn, .ms-faction-btn').forEach(button => {
      const key = button.classList.contains('ms-scope-btn') ? 'scope' : 'faction';
      button.setAttribute('aria-pressed', String(button.dataset[key] === root.dataset[key]));
    });
    container.querySelector('#ms-vault-count').textContent = `${owned.size}/${ALL_CARD_IDS.length} COLLECTED`;
    container.querySelector('#ms-collection-total').innerHTML = `${owned.size}<span> / ${ALL_CARD_IDS.length}</span>`;
    container.querySelector('.ms-vault-progress').setAttribute('aria-valuenow', owned.size);
    container.querySelector('.ms-vault-progress-fill').style.width = `${owned.size / ALL_CARD_IDS.length * 100}%`;
    container.querySelector('#ms-legendary-progress').innerHTML = LegendaryProgressHTML(s.personalities, undefined, s.vault);
  }
  const preview = container.querySelector('#ms-battle-cards');
  if (preview) preview.innerHTML = _battleCards();
  _applyEnergyGate(container);
}

async function _loadEnergy(container, pubkey, seedPlayerState) {
  const generation = _generation;
  const request = ++_energyRequest;
  const current = () => generation === _generation && request === _energyRequest;
  const apply = ps => {
    if (!current()) return;
    _energyNow = computeEnergy(ps).energyNow;
    _detachEnergy();
    _detachEnergy = attachEnergyHud(container, { playerState: ps, refill: true,
      onChange: energyNow => { if (current()) { _energyNow = energyNow; _applyEnergyGate(container); } },
    });
    _applyEnergyGate(container);
  };
  apply(seedPlayerState);
  // Keep a known HUD mounted throughout refill: it owns pending state and
  // confirmed energy, and onChange above keeps the battle gate synchronized.
  if (_energyNow != null) return;
  if (typeof window.oxarkOnchain?.getPlayerState !== 'function' || !pubkey) return;
  try {
    const ps = await window.oxarkOnchain.getPlayerState(pubkey);
    if (ps) apply(ps);
  } catch (err) {
    if (current()) console.warn('[energy] getPlayerState failed:', err?.message ?? err);
  }
}

function _applyEnergyGate(container) {
  const btn = container.querySelector('#ms-start');
  const info = container.querySelector('#ms-match-info');
  if (!btn || !info) return;
  const count = _ownedIds().length;
  btn.disabled = _searching || count < 5 || _energyNow === 0;
  if (_searching) return;
  btn.innerHTML = `${pxIcon('battle')} ${window.oxarkPreview ? 'PLAY PRACTICE' : _matchError ? 'RETRY MATCHMAKING' : 'START BATTLE'}`;
  info.textContent = count < 5 ? `Collect ${5 - count} more ${5 - count === 1 ? 'card' : 'cards'} to bring a hand of five.`
    : _energyNow === 0 ? 'Out of energy. Refill above or wait for the next charge.'
    : _matchError || (_energyNow == null ? 'Energy not loaded. It will be checked when you seal.' : 'Ready for a duel. First to three round wins.');
}

async function startMatchmaking(container) {
  if (_searching || _energyNow === 0 || _ownedIds().length < 5) return;
  if (window.oxarkPreview) {
    resetBattle();
    setState({ isHost: true, duelP1IsMe: true, phase: 'preparation' });
    document.dispatchEvent(new CustomEvent('nav:preparation'));
    return;
  }
  const generation = _generation;
  const current = () => generation === _generation && _searching;
  const btn = container.querySelector('#ms-start');
  const info = container.querySelector('#ms-match-info');
  if (!btn || !info) return;
  _searching = true;
  _matchError = '';
  btn.disabled = true;
  btn.textContent = 'FINDING OPPONENT…';
  info.textContent = 'Connecting to the duel server…';
  const fail = message => {
    if (!current()) return;
    _unsubMatchmaking();
    duelWs.cancelMatchmaking();
    _searching = false;
    _matchError = message;
    _applyEnergyGate(container);
  };
  try {
    await duelWs.connect();
    if (!current()) return;
    if (!duelWs.isConnected()) throw new Error('Connection is not ready');
    _matchDisposers = [
      duelWs.on('matchmaking_waiting', () => { if (current()) info.textContent = 'In the queue. Waiting for another player…'; }),
      duelWs.on('ws_closed', () => fail('Connection lost. Retry when you are ready.')),
      duelWs.on('error', () => fail('The server could not start a duel. Please retry.')),
      duelWs.on('matchmaking_matched', ({ roomId, duelId, role, opponentWallet, opponentId }) => {
        if (!current()) return;
        _unsubMatchmaking();
        _searching = false;
        setState({ matchId: roomId, opponentPubkey: opponentWallet ?? null, isHost: role === 'host',
          // Legacy server suffix: this duel ID remains constant across all rounds.
          duelId: duelId ?? `${roomId}-R1`, opponentPlayerId: opponentId, phase: 'preparation' });
        document.dispatchEvent(new CustomEvent('nav:preparation', { detail: { matchId: roomId } }));
      }),
    ];
    const s = getState();
    duelWs.enqueueMatchmaking({ wallet: s.playerPubkey || null, name: (s.playerPubkey || 'Player').slice(0, 8), card_count: s.vault.length });
  } catch {
    fail('Duel server unavailable. Retry to reconnect.');
  }
}

function _battleCards() {
  const cards = _ownedIds().slice(0, 5);
  return Array.from({ length: 5 }, (_, index) => cards[index]
    ? _cardButton(cards[index], true, index === 0)
    : `<div class="ms-card-slot">${pxIcon('vault', { size: 32 })}<span>CARD ${index + 1}</span><span>Not collected</span></div>`).join('');
}

function _mountBattle(container, detail) {
  container.innerHTML = `<div class="ms-root ms-battle-root" role="main" aria-label="Battle lobby">
    <header class="ms-topbar"><div class="ms-brand"><button class="ms-back-btn" id="ms-battle-back">← Home</button><span class="ms-brand-name">0xARK</span><span class="ms-tagline">DUEL LOBBY</span></div>${EnergyHudHTML(detail.playerState, { refill: true })}</header>
    <div class="ms-battle-body">
      <div class="ms-battle-heading"><div><span class="ms-eyebrow">FIVE CARDS. ONE SEA.</span><h1 class="ms-battle-title">Make your next move.</h1></div><span class="chip">FIRST TO 3 · UP TO 5 ROUNDS</span></div>
      <div class="ms-battle-layout"><section class="ms-battle-deck" aria-label="Owned card preview"><div class="ms-deck-label"><span>FROM YOUR VAULT</span><span>Choose your hand after matching</span></div><div class="ms-battle-cards" id="ms-battle-cards" role="group" aria-label="Five cards from your vault">${_battleCards()}</div><p class="ms-deck-note">Your cards. Your strategy. Inspect any card before entering the queue.</p><p class="ms-steal-note">${_stealCopy()}</p></section>
      <aside class="ms-battle-brief"><ol class="ms-battle-steps"><li><span class="ms-step-number">01</span><div><span>SELECT</span><p>Choose five owned cards and set their actions.</p></div></li><li><span class="ms-step-number">02</span><div><span>SEAL</span><p>Commit your hidden hand with a ZK proof.</p></div></li><li><span class="ms-step-number">03</span><div><span>REVEAL</span><p>Play each round. First to three wins takes the duel.</p></div></li></ol><div class="ms-battle-action"><button class="gba-btn gba-btn--primary ms-start-btn" id="ms-start">${pxIcon('battle')} START BATTLE</button><p class="ms-cost">${_costCopy}</p><p class="ms-match-info" id="ms-match-info" role="status"></p></div></aside></div>
    </div>${_footer(detail.pubkey)}</div>`;
  container.querySelector('#ms-battle-back').addEventListener('click', () => document.dispatchEvent(new CustomEvent('nav:home')));
  container.querySelector('#ms-start').addEventListener('click', () => startMatchmaking(container));
  _bindCards(container, '#ms-battle-cards');
}

function injectMainScreenCSS() {
  injectStyle('style-ms', MAIN_SCREEN_CSS);
}
