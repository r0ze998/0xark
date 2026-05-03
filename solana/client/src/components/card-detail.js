// card-detail.js — Phase 16: Card Detail modal with Burn & Evolve actions
// Usage: CardDetailModal.show(container, cardId, opts) / CardDetailModal.hide()
// opts: { onBurn(cardId), onEvolve(resultId, [parentA, parentB]), vault[] }

import { getCard, isBurnable, isMergeOnly, getMergeRecipe } from '../lib/cards.js';
import { CardHTML, injectCardCSS, CARD_NAMES, FACTION_NAMES, RARITY_LABELS, ACTION_LABELS } from './common/Card.js';
import { getState, setState } from '../state/battle-state.js';

let _onBurn   = null;
let _onEvolve = null;

export const CardDetailModal = {
  show(container, cardId, { onBurn, onEvolve } = {}) {
    injectStyle();
    injectCardCSS();
    _onBurn   = onBurn   ?? null;
    _onEvolve = onEvolve ?? null;
    _render(container, cardId);
  },
  hide(container) {
    const el = container.querySelector('#cd-modal-overlay');
    if (el) el.remove();
  },
};

function _render(container, cardId) {
  const existing = container.querySelector('#cd-modal-overlay');
  if (existing) existing.remove();

  const card = getCard(cardId);
  if (!card) return;

  const s       = getState();
  const vault   = s.vault ?? [];
  const owned   = vault.includes(cardId);
  const burnable = isBurnable(cardId) && owned;
  const mergeOnly = isMergeOnly(cardId);
  const recipe    = getMergeRecipe(cardId);
  const canEvolve = recipe && vault.includes(recipe.recipe[0]) && vault.includes(recipe.recipe[1]);

  const name     = CARD_NAMES[cardId] ?? `Card #${cardId}`;
  const faction  = FACTION_NAMES[card.faction] ?? '—';
  const rarity   = RARITY_LABELS[card.rarity] ?? '—';
  const action   = ACTION_LABELS[card.actionType] ?? '—';

  const abilityHTML = card.ability
    ? `<div class="cd-ability">
        <span class="cd-ability-type cd-ability-type--${card.ability.type}">${card.ability.type.toUpperCase()}</span>
        <span class="cd-ability-desc">${card.ability.description}</span>
      </div>`
    : '';

  const mergeOnlyBadge = mergeOnly
    ? `<span class="cd-badge cd-badge--merge">MERGE ONLY</span>`
    : '';

  const recipeHTML = recipe
    ? `<div class="cd-recipe label-dim">
        Evolve from: ${CARD_NAMES[recipe.recipe[0]]} + ${CARD_NAMES[recipe.recipe[1]]}
      </div>`
    : '';

  const burnBtn = burnable
    ? `<button class="gba-btn gba-btn--danger cd-burn-btn" id="cd-burn">🔥 BURN</button>`
    : '';

  const evolveBtn = mergeOnly && canEvolve
    ? `<button class="gba-btn gba-btn--primary cd-evolve-btn" id="cd-evolve">⚗ EVOLVE</button>`
    : mergeOnly
    ? `<button class="gba-btn gba-btn--ghost cd-evolve-btn" id="cd-evolve" disabled title="Need both source Commons">⚗ EVOLVE</button>`
    : '';

  const overlay = document.createElement('div');
  overlay.id        = 'cd-modal-overlay';
  overlay.className = 'cd-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', `Card detail: ${name}`);

  overlay.innerHTML = `
<div class="cd-modal">
  <button class="cd-close" id="cd-close" aria-label="Close">✕</button>

  <div class="cd-top">
    <div class="cd-card-wrap">
      ${CardHTML({ id: cardId, owned, compact: false })}
    </div>
    <div class="cd-info">
      <div class="cd-name">${name} ${mergeOnlyBadge}</div>
      <div class="cd-meta">
        <span class="chip cd-faction" style="--fc:var(--clan-${faction.toLowerCase()});">${faction.toUpperCase()}</span>
        <span class="chip">${rarity}</span>
        <span class="chip">${action}</span>
      </div>
      <div class="cd-stats">
        <div class="cd-stat"><span class="cd-stat-label">BP</span><span class="cd-stat-val label-gold">${card.bp}</span></div>
        <div class="cd-stat"><span class="cd-stat-label">HP</span><span class="cd-stat-val" style="color:#5ab87a">${card.hp}</span></div>
        <div class="cd-stat"><span class="cd-stat-label">INI</span><span class="cd-stat-val">${card.ini}</span></div>
      </div>
      ${abilityHTML}
      ${recipeHTML}
      <div class="cd-actions">
        ${burnBtn}
        ${evolveBtn}
      </div>
      <div class="cd-feedback label-dim" id="cd-feedback"></div>
    </div>
  </div>
</div>`;

  container.appendChild(overlay);
  _bindEvents(container, cardId, card, recipe);
}

function _bindEvents(container, cardId, card, recipe) {
  container.querySelector('#cd-close').addEventListener('click', () => {
    CardDetailModal.hide(container);
  });

  container.querySelector('#cd-modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) CardDetailModal.hide(container);
  });

  const burnBtn = container.querySelector('#cd-burn');
  if (burnBtn) {
    burnBtn.addEventListener('click', () => _handleBurn(container, cardId));
  }

  const evolveBtn = container.querySelector('#cd-evolve');
  if (evolveBtn && !evolveBtn.disabled) {
    evolveBtn.addEventListener('click', () => _handleEvolve(container, cardId, recipe));
  }
}

function _handleBurn(container, cardId) {
  const name = CARD_NAMES[cardId] ?? `Card #${cardId}`;
  if (!confirm(`BURN ${name}?\n\nThis permanently destroys the card and activates its effect.\nThis action cannot be undone.`)) return;

  const s   = getState();
  const abi = getCard(cardId)?.ability;

  // Remove from vault
  const newVault = s.vault.filter(id => id !== cardId);

  // Record burn effect for next battle
  const pendingBurnEffects = [
    ...(s.pendingBurnEffects ?? []),
    { effect: abi?.effect, ownSide: 'p1' },
  ];

  setState({ vault: newVault, pendingBurnEffects });

  const fb = container.querySelector('#cd-feedback');
  if (fb) fb.textContent = `✓ ${name} burned! Effect active for next battle.`;

  const burnBtn = container.querySelector('#cd-burn');
  if (burnBtn) { burnBtn.disabled = true; burnBtn.textContent = '✓ BURNED'; }

  if (_onBurn) _onBurn(cardId);

  // Call on-chain (mock for 5/11 demo)
  _callBurnOnchain(cardId).catch(err => console.warn('burn_card onchain:', err));
}

function _handleEvolve(container, cardId, recipe) {
  const name     = CARD_NAMES[cardId] ?? `Card #${cardId}`;
  const parentA  = CARD_NAMES[recipe.recipe[0]] ?? `#${recipe.recipe[0]}`;
  const parentB  = CARD_NAMES[recipe.recipe[1]] ?? `#${recipe.recipe[1]}`;

  if (!confirm(`EVOLVE → ${name}?\n\nConsumes: ${parentA} + ${parentB}\nCreates: ${name} (merge-only Uncommon)\n\nContinue?`)) return;

  const s        = getState();
  const [aId, bId] = recipe.recipe;

  // Remove parents, add child
  const newVault = s.vault.filter(id => id !== aId && id !== bId);
  newVault.push(cardId);
  setState({ vault: newVault });

  const fb = container.querySelector('#cd-feedback');
  if (fb) {
    fb.innerHTML = `<span class="label-gold">✓ ${name} evolved!</span> ${parentA} + ${parentB} consumed.`;
  }

  // Play evolve animation flash
  const wrap = container.querySelector('.cd-card-wrap');
  if (wrap) {
    wrap.innerHTML = `<div class="cd-evolve-flash">✦</div>`;
    setTimeout(() => { wrap.innerHTML = CardHTML({ id: cardId, owned: true, compact: false }); }, 600);
  }

  const evolveBtn = container.querySelector('#cd-evolve');
  if (evolveBtn) { evolveBtn.disabled = true; evolveBtn.textContent = '✓ EVOLVED'; }

  if (_onEvolve) _onEvolve(cardId, [aId, bId]);

  // Call on-chain (mock for 5/11 demo)
  _callEvolveOnchain(aId, bId, cardId).catch(err => console.warn('evolve_cards onchain:', err));
}

async function _callBurnOnchain(cardId) {
  if (window.oxarkOnchain?.burnCard) {
    await window.oxarkOnchain.burnCard(cardId);
  }
  // mock: log to console for demo
  console.log(`[demo] burn_card instruction: cardId=${cardId}`);
}

async function _callEvolveOnchain(parentA, parentB, childId) {
  if (window.oxarkOnchain?.evolveCards) {
    await window.oxarkOnchain.evolveCards(parentA, parentB, childId);
  }
  console.log(`[demo] evolve_cards instruction: ${parentA}+${parentB}→${childId}`);
}

function injectStyle() {
  if (document.getElementById('style-cd')) return;
  const el = document.createElement('style');
  el.id = 'style-cd';
  el.textContent = CSS;
  document.head.appendChild(el);
}

const CSS = `
.cd-overlay {
  position: absolute; inset: 0; z-index: 200;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(2px);
}
.cd-modal {
  position: relative; width: 560px;
  background: var(--bg-mid); border: var(--border-dim);
  box-shadow: 0 0 40px rgba(0,0,0,0.8);
  padding: 20px;
}
.cd-close {
  position: absolute; top: 10px; right: 12px;
  background: none; border: none; color: var(--text-dim);
  font-size: 18px; cursor: pointer; padding: 2px 6px;
  font-family: var(--font-main);
}
.cd-close:hover { color: var(--text-cream); }

.cd-top { display: flex; gap: 20px; align-items: flex-start; }
.cd-card-wrap { flex-shrink: 0; position: relative; }

.cd-info { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.cd-name {
  font-size: 22px; letter-spacing: 0.06em;
  color: var(--text-cream); display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.cd-meta { display: flex; gap: 6px; flex-wrap: wrap; }
.cd-faction { border-color: var(--fc, var(--accent-gold)); color: var(--fc, var(--accent-gold)); }

.cd-stats { display: flex; gap: 16px; }
.cd-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.cd-stat-label { font-size: 11px; color: var(--text-dim); letter-spacing: 0.08em; }
.cd-stat-val { font-size: 24px; color: var(--text-cream); line-height: 1; }

.cd-ability {
  display: flex; gap: 8px; align-items: flex-start;
  padding: 8px 10px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.03);
}
.cd-ability-type {
  font-size: 11px; letter-spacing: 0.08em; flex-shrink: 0;
  padding: 1px 5px; border: 1px solid;
}
.cd-ability-type--burn    { border-color: #d63b3b; color: #d63b3b; }
.cd-ability-type--passive { border-color: #6a8a6a; color: #6a8a6a; }
.cd-ability-desc { font-size: 13px; color: var(--text-dim); }

.cd-recipe { font-size: 12px; }

.cd-badge {
  font-size: 10px; padding: 2px 5px; border: 1px solid;
  letter-spacing: 0.06em;
}
.cd-badge--merge { border-color: var(--clan-merchant); color: var(--clan-merchant); }

.cd-actions { display: flex; gap: 8px; margin-top: 4px; }
.cd-burn-btn { background: rgba(214,59,59,0.15); border-color: var(--accent-red) !important; }
.cd-burn-btn:hover:not(:disabled) { background: rgba(214,59,59,0.3); }
.cd-evolve-btn { background: rgba(201,162,39,0.1); }

.cd-feedback { font-size: 12px; min-height: 18px; }

.cd-evolve-flash {
  width: 80px; height: 112px;
  display: flex; align-items: center; justify-content: center;
  font-size: 48px; color: var(--accent-gold);
  background: rgba(201,162,39,0.15);
  animation: cd-flash 0.6s ease forwards;
}
@keyframes cd-flash { 0%{opacity:1;transform:scale(1.3)} 100%{opacity:0;transform:scale(0.9)} }
`;
