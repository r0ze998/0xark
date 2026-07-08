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

let _onBurn    = null;
let _onPromote = null;
let _promoteState = null; // { mint, copies, rarity, allMet, conditions, costSol, nextTier, maxTier }

export const CardDetailModal = {
  show(container, cardId, { onBurn, onPromote } = {}) {
    injectStyle();
    injectCardCSS();
    _onBurn    = onBurn    ?? null;
    _onPromote = onPromote ?? null;
    _promoteState = null;
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
    ? `<button class="gba-btn gba-btn--danger cd-burn-btn" id="cd-burn">${pxIcon('burn')} BURN</button>`
    : '';

  const overlay = document.createElement('div');
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
      <div class="cd-feedback label-dim" id="cd-feedback"></div>
    </div>
  </div>
</div>`;

  container.appendChild(overlay);
  _bindEvents(container, cardId, card);
  if (owned) _loadPromote(container, cardId, card);
}

function _bindEvents(container, cardId, card) {
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
}

// Burn — pending→confirm (F1-5 §6). No fire-and-forget: the vault mutates and the
// success state shows ONLY after the burn tx confirms; on failure the button is
// restored and the vault is untouched.
async function _handleBurn(container, cardId) {
  const name = CARD_NAMES[cardId] ?? `Card #${cardId}`;
  if (!confirm(`BURN ${name}?\n\nThis permanently destroys the card and activates its effect.\nThis action cannot be undone.`)) return;

  const fb   = container.querySelector('#cd-feedback');
  const burnBtn = container.querySelector('#cd-burn');
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

    if (burnBtn) burnBtn.innerHTML = `${pxIcon('check')} BURNED`;
    if (fb) {
      fb.innerHTML = sig
        ? `${name} burned — effect active next battle ${txLink(sig)}`
        : `${name} burned — effect active next battle`;
    }
    _onBurn?.(cardId);
  } catch (err) {
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
async function _loadPromote(container, cardId, card) {
  const host = container.querySelector('#cd-promote');
  if (!host) return;
  const oc = window.oxarkOnchain;
  if (typeof oc?.getOwnedCardMints !== 'function' || typeof oc?.getCardBattleHistory !== 'function') {
    host.innerHTML = ''; // no reader (demo/devview) — hide the section
    return;
  }
  host.innerHTML = `<div class="cd-promote-loading label-dim">reading provenance…</div>`;
  try {
    const map = await oc.getOwnedCardMints();
    const copies = map.get(cardId) ?? [];
    if (!copies.length) { host.innerHTML = ''; return; }

    // v1: auto-select the copy with the highest wins.
    const withCbh = await Promise.all(copies.map(async c => ({
      ...c, cbh: await oc.getCardBattleHistory(c.mint).catch(() => null),
    })));
    withCbh.sort((a, b) => (b.cbh?.wins ?? 0) - (a.cbh?.wins ?? 0));
    const best = withCbh[0];
    const rarity = best.rarity ?? card.rarity;
    const ev = evaluatePromotion(best.cbh ?? {}, rarity);
    _promoteState = { mint: best.mint, copies: copies.length, rarity, ...ev };

    host.innerHTML = _promoteSectionHTML(_promoteState);
    _reflectRarity(container, rarity);
    const btn = container.querySelector('#cd-promote-btn');
    if (btn) btn.addEventListener('click', () => _doPromote(container, cardId, card));
  } catch (err) {
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

async function _doPromote(container, cardId, card) {
  const btn = container.querySelector('#cd-promote-btn');
  if (!btn || btn.disabled || !_promoteState?.mint) return;
  const costSol = _promoteState.costSol;
  btn.disabled = true;
  btn.innerHTML = 'PROMOTING…';
  try {
    const sig = await window.oxarkOnchain.promoteCard(_promoteState.mint);
    // pending→confirm: only NOW reflect the new tier (chain confirmed).
    _promoteRitual(container, cardId);
    await _loadPromote(container, cardId, card); // re-read fresh rarity + CBH
    const t = showToast('Promoted', 'success');
    try { t.innerHTML = `${pxIcon('check')} Promoted ${txLink(sig)}`; } catch (_) {}
    _onPromote?.(cardId);
  } catch (err) {
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
function _promoteRitual(container, cardId) {
  const wrap = container.querySelector('.cd-card-wrap');
  if (!wrap) return;
  wrap.classList.add('cd-promote-flash');
  setTimeout(() => wrap.classList.remove('cd-promote-flash'), 700);
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
  position: relative; width: 680px; max-height: 90%;
  background: var(--bg-mid); border: var(--border-dim);
  box-shadow: 0 0 40px rgba(0,0,0,0.8);
  padding: 20px; overflow: hidden;
}
.cd-close {
  position: absolute; top: 10px; right: 12px;
  background: none; border: none; color: var(--text-dim);
  font-size: 18px; cursor: pointer; padding: 2px 6px;
  font-family: var(--font-main);
}
.cd-close:hover { color: var(--text-cream); }

/* ── 2-column layout: card (left) | details (right) ── */
.cd-top { display: flex; gap: 24px; align-items: flex-start; }

.cd-card-wrap {
  flex-shrink: 0;
  width: 240px;     /* 240 × 7/5 = 336px tall — fits in 576px game screen */
  position: relative;
}
.cd-card-wrap .card-frame { width: 100%; }

.cd-info {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; gap: 10px;
  overflow-y: auto; max-height: 360px;
}
.cd-name {
  font-size: 20px; letter-spacing: 0.06em;
  color: var(--text-cream); display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.cd-meta { display: flex; gap: 6px; flex-wrap: wrap; }
.cd-faction { border-color: var(--fc, var(--accent-gold)); color: var(--fc, var(--accent-gold)); }

.cd-stats { display: flex; gap: 16px; }
.cd-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.cd-stat-label { font-size: 13px; color: var(--text-dim); letter-spacing: 0.08em; }
.cd-stat-val { font-size: 24px; color: var(--text-cream); line-height: 1; }

.cd-ability {
  display: flex; gap: 8px; align-items: flex-start;
  padding: 8px 10px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.03);
}
.cd-ability-type {
  font-size: 13px; letter-spacing: 0.08em; flex-shrink: 0;
  padding: 1px 5px; border: 1px solid;
}
.cd-ability-type--burn    { border-color: var(--accent-red); color: var(--accent-red); }
.cd-ability-type--passive { border-color: #6a8a6a; color: #6a8a6a; }
.cd-ability-desc { font-size: 13px; color: var(--text-dim); }

.cd-actions { display: flex; gap: 8px; margin-top: 4px; }
.cd-burn-btn { background: rgba(214,59,59,0.15); border-color: var(--accent-red) !important; }
.cd-burn-btn:hover:not(:disabled) { background: rgba(214,59,59,0.3); }

.cd-feedback { font-size: 13px; min-height: 18px; }

/* ── PROMOTE section ── */
.cd-promote-box {
  border: var(--border-dim); padding: 8px 10px;
  display: flex; flex-direction: column; gap: 6px; background: rgba(201,162,39,0.04);
}
.cd-promote-title { font-size: 14px; letter-spacing: 0.08em; color: var(--accent-gold); }
.cd-promote-copy { font-size: 13px; }
.cd-maxtier { font-size: 15px; letter-spacing: 0.08em; display: flex; align-items: center; gap: 4px; }
.cd-promote-loading { font-size: 13px; }
.cd-promote-conds { display: flex; flex-direction: column; gap: 4px; }
.cd-cond { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-dim); }
.cd-cond--met { color: var(--accent-gold); }
.cd-cond-label { display: flex; align-items: center; gap: 3px; min-width: 118px; }
.cd-cond-bar {
  flex: 1; height: 7px; background: rgba(255,255,255,0.08); overflow: hidden; min-width: 60px;
}
.cd-cond-fill { display: block; height: 100%; background: var(--accent-gold); transition: width 0.4s; }
.cd-cond-num { min-width: 46px; text-align: right; color: var(--text-cream); }
.cd-cond-note { font-size: 13px; }
.cd-promote-btn { justify-content: center; font-size: 15px; padding: 7px; }

.cd-card-wrap.cd-promote-flash::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: var(--rc, var(--accent-gold)); mix-blend-mode: screen;
  animation: cd-promote-flash 0.7s var(--ease-out, ease-out) forwards;
}
@keyframes cd-promote-flash { 0%{opacity:0} 30%{opacity:0.85} 100%{opacity:0} }
`;
