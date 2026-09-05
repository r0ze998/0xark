import { injectStyle } from '../lib/inject-style.js';
import { CARD_DETAIL_CSS } from '../style/card-detail.js';
// card-detail.js — Phase 16 / F1-4: Card Detail modal with Burn & Promote actions.
// The old 2-burn merge path (new mint, severed history) is gone: promotion is
// single-card, in-place, provenance-gated (promote_card). Usage:
//   CardDetailModal.show(container, cardId, opts) / CardDetailModal.hide()
//   opts: { onBurn(cardId), onPromote(cardId), vault[] }

import { getCard, isBurnable } from '../lib/cards.js';
import { pxIcon } from '../lib/px-icons.js';
import { CardFrameHTML, injectCardCSS, CARD_NAMES, FACTION_NAMES, RARITY_LABELS, RARITY_COLORS, ACTION_LABELS } from './common/Card.js';
import { evaluatePromotion, RARITY_LABEL } from '../lib/promotion.js';
import { showToast, txLink } from '../lib/ui-shared.js';
import { getState, setState } from '../state/battle-state.js';
import { createScreenScope } from '../lib/screen-scope.js';

// Only the current modal is shared. Target data, callbacks and async reads belong
// to its session, so an old card's provenance can never select a newer card's mint.
let _modal = null;

function _isActive(modal) {
  return modal.scope.active && modal.overlay?.isConnected;
}

function _close(modal, restoreFocus = true) {
  if (!modal?.scope.active) return;
  modal.scope.dispose();
  modal.overlay?.remove();
  if (_modal === modal) _modal = null;
  if (restoreFocus && modal.previousFocus?.isConnected) modal.previousFocus.focus();
}

export const CardDetailModal = {
  show(container, cardId, { onBurn, onPromote } = {}) {
    const previousFocus = _modal?.previousFocus ?? document.activeElement;
    _close(_modal, false);
    injectCardDetailCSS();
    injectCardCSS();
    const modal = { container, cardId, onBurn, onPromote, previousFocus,
      scope: createScreenScope(), overlay: null, promotionRead: 0 };
    _modal = modal;
    _render(modal);
  },
  hide(container) {
    if (_modal && (!container || _modal.container === container)) _close(_modal);
  },
};

function _render(modal) {
  const { container, cardId } = modal;
  const existing = container.querySelector('#cd-modal-overlay');
  if (existing) existing.remove();

  const card = getCard(cardId);
  if (!card) { _close(modal, false); return; }

  const s       = getState();
  const vault   = s.vault ?? [];
  const owned   = vault.includes(cardId);
  const burnable = isBurnable(cardId) && owned;

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

  const burnBtn = burnable
    ? `<button class="gba-btn gba-btn--danger cd-burn-btn" id="cd-burn" ${window.oxarkPreview ? 'disabled title="Burning is disabled in practice"' : ''}>${pxIcon('burn')} BURN</button>`
    : '';

  const overlay = document.createElement('dialog');
  modal.overlay = overlay;
  overlay.id        = 'cd-modal-overlay';
  overlay.className = 'cd-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', `Card detail: ${name}`);

  overlay.innerHTML = `
<div class="cd-modal">
  <button class="cd-close" id="cd-close" aria-label="Close">${pxIcon('cross')}</button>

  <div class="cd-top">
    <div class="cd-card-wrap">
      ${CardFrameHTML({ id: cardId, owned })}
    </div>
    <div class="cd-info">
      <div class="cd-name">${name}</div>
      <div class="cd-meta">
        <span class="chip cd-faction" style="--fc:var(--clan-${faction.toLowerCase()});">${faction.toUpperCase()}</span>
        <span class="chip" id="cd-rarity-chip">${rarity}</span>
        <span class="chip">${action}</span>
      </div>
      <div class="cd-stats">
        <div class="cd-stat"><span class="cd-stat-label">BP</span><span class="cd-stat-val label-gold">${card.bp}</span></div>
        <div class="cd-stat"><span class="cd-stat-label">HP</span><span class="cd-stat-val" style="color:var(--hp-green)">${card.hp}</span></div>
        <div class="cd-stat"><span class="cd-stat-label">INI</span><span class="cd-stat-val">${card.ini}</span></div>
      </div>
      ${abilityHTML}
      <div class="cd-promote" id="cd-promote"></div>
      <div class="cd-actions">
        ${burnBtn}
      </div>
      <div class="cd-feedback label-dim" id="cd-feedback">${window.oxarkPreview ? 'Sample collection · Burning and promotion are disabled in practice.' : ''}</div>
    </div>
  </div>
</div>`;

  container.appendChild(overlay);
  overlay.addEventListener('cancel', event => { event.preventDefault(); _close(modal); });
  overlay.showModal();
  _bindEvents(modal);
  if (owned) _loadPromote(modal, card);
}

function _bindEvents(modal) {
  const { overlay } = modal;
  overlay.querySelector('#cd-close').addEventListener('click', () => {
    _close(modal);
  });

  overlay.addEventListener('click', e => {
    if (e.target === e.currentTarget) _close(modal);
  });

  const burnBtn = overlay.querySelector('#cd-burn');
  if (burnBtn) {
    burnBtn.addEventListener('click', () => _handleBurn(modal));
  }
}

// Burn — pending→confirm (F1-5 §6). No fire-and-forget: the vault mutates and the
// success state shows ONLY after the burn tx confirms; on failure the button is
// restored and the vault is untouched.
async function _handleBurn(modal) {
  if (!_isActive(modal)) return;
  const { overlay, cardId } = modal;
  const burnBtn = overlay.querySelector('#cd-burn');
  if (!burnBtn || burnBtn.disabled) return;
  const name = CARD_NAMES[cardId] ?? `Card #${cardId}`;
  if (!confirm(`BURN ${name}?\n\nThis permanently destroys the card and activates its effect.\nThis action cannot be undone.`)) return;

  const fb = overlay.querySelector('#cd-feedback');
  if (burnBtn) { burnBtn.disabled = true; burnBtn.innerHTML = 'BURNING…'; }
  if (fb) fb.textContent = '';

  try {
    let sig = null;
    if (window.oxarkOnchain?.burnCard) {
      sig = await window.oxarkOnchain.burnCard(cardId);   // awaited — gates everything below
    } else {
      console.log(`[demo] burn_card instruction: cardId=${cardId}`); // no-chain demo path
    }

    // Confirmed → now mutate local vault + record the pending burn effect.
    const s   = getState();
    const abi = getCard(cardId)?.ability;
    setState({
      vault: s.vault.filter(id => id !== cardId),
      pendingBurnEffects: [...(s.pendingBurnEffects ?? []), { effect: abi?.effect, ownSide: 'p1' }],
    });

    // Confirmation still updates the vault after closure; only the discarded UI
    // and its callbacks are suppressed.
    if (!_isActive(modal)) return;
    if (burnBtn) burnBtn.innerHTML = `${pxIcon('check')} BURNED`;
    if (fb) {
      fb.innerHTML = sig
        ? `${name} burned — effect active next battle ${txLink(sig)}`
        : `${name} burned — effect active next battle`;
    }
    modal.onBurn?.(cardId);
  } catch (err) {
    if (!_isActive(modal)) return;
    const msg = err?.message ?? String(err);
    if (burnBtn) { burnBtn.disabled = false; burnBtn.innerHTML = `${pxIcon('burn')} BURN`; }
    if (fb) fb.textContent = `Burn failed: ${msg.slice(0, 60)}`;
    showToast('Burn failed — card not destroyed', 'error');
  }
}

/* ── PROMOTE (F1-4) ─────────────────────────────────────────────────────────
 * Provenance-gated single-card promotion. Reads the owner's mints for this
 * cardId, v1 auto-selects the copy with the highest wins (multi-copy selector is
 * F3), evaluates the gate (mirror of evaluate_promotion in promotion.js) and
 * renders per-condition progress. Asset reflection is pending→confirm: the frame
 * only re-renders at the new rarity AFTER the on-chain tx confirms.               */
async function _loadPromote(modal, card) {
  if (!_isActive(modal)) return;
  const { overlay, cardId } = modal;
  const read = ++modal.promotionRead;
  const isCurrent = () => _isActive(modal) && modal.promotionRead === read;
  const host = overlay.querySelector('#cd-promote');
  if (!host) return;
  const oc = window.oxarkOnchain;
  if (typeof oc?.getOwnedCardMints !== 'function' || typeof oc?.getCardBattleHistory !== 'function') {
    host.innerHTML = ''; // no reader (demo/devview) — hide the section
    return;
  }
  host.innerHTML = `<div class="cd-promote-loading label-dim">reading provenance…</div>`;
  try {
    const map = await oc.getOwnedCardMints();
    if (!isCurrent()) return;
    const copies = map.get(cardId) ?? [];
    if (!copies.length) { host.innerHTML = ''; return; }

    // v1: auto-select the copy with the highest wins.
    const withCbh = await Promise.all(copies.map(async c => ({
      ...c, cbh: await oc.getCardBattleHistory(c.mint).catch(() => null),
    })));
    if (!isCurrent()) return;
    withCbh.sort((a, b) => (b.cbh?.wins ?? 0) - (a.cbh?.wins ?? 0));
    const best = withCbh[0];
    const rarity = best.rarity ?? card.rarity;
    const ev = evaluatePromotion(best.cbh ?? {}, rarity);
    const promoteState = { mint: best.mint, copies: copies.length, rarity, ...ev };

    host.innerHTML = _promoteSectionHTML(promoteState);
    _reflectRarity(overlay, rarity);
    const btn = host.querySelector('#cd-promote-btn');
    if (btn) btn.addEventListener('click', () => _doPromote(modal, card, promoteState, btn));
  } catch (err) {
    if (!isCurrent()) return;
    console.warn('[promote] load failed:', err?.message ?? err);
    host.innerHTML = '';
  }
}

function _promoteSectionHTML(st) {
  if (st.maxTier) {
    return `<div class="cd-promote-box">
      <div class="cd-promote-title">PROMOTE</div>
      <div class="cd-maxtier label-gold">MAX TIER ${pxIcon('star')}</div>
    </div>`;
  }
  const copyNote = st.copies > 1
    ? `<div class="cd-promote-copy label-dim">best copy shown (${st.copies} owned)</div>` : '';
  const rows = st.conditions.map(_condRow).join('');
  const next = st.nextTier != null ? RARITY_LABEL[st.nextTier].toUpperCase() : '';
  return `<div class="cd-promote-box">
    <div class="cd-promote-title">PROMOTE → ${next}</div>
    ${copyNote}
    <div class="cd-promote-conds">${rows}</div>
    <button class="gba-btn gba-btn--primary cd-promote-btn" id="cd-promote-btn" ${st.allMet ? '' : 'disabled'}>
      ${pxIcon('arrow-up')} PROMOTE — ${st.costSol} SOL
    </button>
  </div>`;
}

function _condRow(c) {
  const met = c.met ? 'cd-cond--met' : '';
  if (c.kind === 'progress') {
    const pct = c.required ? Math.min(100, Math.round((100 * c.current) / c.required)) : 0;
    return `<div class="cd-cond ${met}">
      <span class="cd-cond-label">${c.met ? pxIcon('check') : ''} ${c.label}</span>
      <span class="cd-cond-bar"><span class="cd-cond-fill" style="width:${pct}%"></span></span>
      <span class="cd-cond-num">${c.current}/${c.required}</span>
    </div>`;
  }
  return `<div class="cd-cond ${met}">
    <span class="cd-cond-label">${c.met ? pxIcon('check') : pxIcon('cross')} ${c.label}</span>
    <span class="cd-cond-note label-dim">${c.note ?? ''}</span>
  </div>`;
}

async function _doPromote(modal, card, promoteState, btn) {
  if (!_isActive(modal) || !btn.isConnected || btn.disabled || !promoteState.mint) return;
  const { cardId } = modal;
  const costSol = promoteState.costSol;
  btn.disabled = true;
  btn.innerHTML = 'PROMOTING…';
  try {
    const sig = await window.oxarkOnchain.promoteCard(promoteState.mint);
    if (!_isActive(modal)) return;
    // pending→confirm: only NOW reflect the new tier (chain confirmed).
    _promoteRitual(modal);
    await _loadPromote(modal, card); // re-read fresh rarity + CBH
    if (!_isActive(modal)) return;
    const t = showToast('Promoted', 'success');
    try { t.innerHTML = `${pxIcon('check')} Promoted ${txLink(sig)}`; } catch (_) {}
    modal.onPromote?.(cardId);
  } catch (err) {
    if (!_isActive(modal)) return;
    const msg = err?.message ?? String(err);
    const friendly = /InsufficientWins/i.test(msg) ? 'Not enough wins yet'
      : /MissingRareProvenance/i.test(msg) ? 'Needs a legendary kill or prior-owner drop'
      : /NotDuelWon/i.test(msg) ? 'Must have been won in a duel'
      : /InsufficientKos/i.test(msg) ? 'Not enough KOs yet'
      : /AlreadyMax/i.test(msg) ? 'Already max tier'
      : /insufficient.*(lamports|funds|balance)/i.test(msg) ? 'Not enough SOL'
      : `Promote failed: ${msg.slice(0, 50)}`;
    showToast(friendly, 'error');
    btn.disabled = false;
    btn.innerHTML = `${pxIcon('arrow-up')} PROMOTE — ${costSol} SOL`;
  }
}

// PROMOTE ritual: rarity-color flash across the card frame (DESIGN.md Rituals).
function _promoteRitual(modal) {
  const wrap = modal.overlay.querySelector('.cd-card-wrap');
  if (!wrap) return;
  wrap.classList.add('cd-promote-flash');
  modal.scope.timeout(() => wrap.classList.remove('cd-promote-flash'), 700);
}

// Reflect the on-chain rarity on the modal (chip text + frame bar color). The
// static card table can't express per-mint promotion, so we override here.
function _reflectRarity(container, rarity) {
  const chip = container.querySelector('#cd-rarity-chip');
  if (chip) chip.textContent = RARITY_LABELS[rarity] ?? RARITY_LABEL[rarity] ?? '—';
  const frame = container.querySelector('.cd-card-wrap .card-frame');
  const bar = container.querySelector('.cd-card-wrap .rarity-bar');
  const rColor = RARITY_COLORS[rarity];
  if (frame && rColor) frame.style.setProperty('--rc', rColor);
  if (bar && rColor) bar.style.background = rColor;
}

function injectCardDetailCSS() {
  injectStyle('style-cd', CARD_DETAIL_CSS);
}
