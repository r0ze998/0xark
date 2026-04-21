// ═══════════════════════════════════════════════════════════════════════════
// MODULE: 07-deck-editor.js
// Deck Editor UI — 2-panel canvas overlay (storage left, deck right).
// T-D5-2: frontend skeleton. T-D5-3: on-chain load/save via PlayerDeck +
// PlayerRegistry PDAs (raw getAccountInfo, no Metaplex dependency).
// ═══════════════════════════════════════════════════════════════════════════

// ── State ────────────────────────────────────────────────────────────────
let deckEditorOpen   = false;
let deckEditorFilter = 'all'; // 'all' | 'attack' | 'defense' | 'flee' | 'magic' | 'recovery'
let deckEditorScroll = 0;     // storage panel scroll offset (pixels)
let deckSlots        = new Array(20).fill(null); // null | card_id (1-60)
let deckSelectedCard = null;  // card_id hovered/selected in storage
let deckSaveStatus   = '';    // '' | 'saving' | 'saved' | 'error'

// ── RPC connection (lazy, same devnet as matchmaking) ─────────────────────
const DE_DEVNET_RPC = 'https://api.devnet.solana.com';
const DE_PROGRAM_ID_STR = '5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN';
let _deConn = null;
function _deGetConn() {
  if (!_deConn) _deConn = new solanaWeb3.Connection(DE_DEVNET_RPC, 'confirmed');
  return _deConn;
}

// Placeholder fallback storage (30 cards — used when no wallet or RPC fails)
let deckStorageCards = [];
function _initDeckStorageFallback() {
  deckStorageCards = [];
  for (let i = 1; i <= 30; i++) {
    deckStorageCards.push({ card_id: i, qty: 2 });
  }
}

// ── On-chain load: PlayerRegistry → storage panel ────────────────────────
// PlayerRegistry layout (Anchor, seeds: ["player_registry", player_pubkey]):
//   offset 0-7:   discriminator
//   offset 8-39:  owner Pubkey
//   offset 40-99: registered [bool; 60]  — each byte 1=owned, 0=not
//   offset 100+:  registered_at, count, season_complete, bump
async function loadStorageFromChain(playerKey) {
  const [pda] = solanaWeb3.PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('player_registry'), playerKey.toBytes()],
    new solanaWeb3.PublicKey(DE_PROGRAM_ID_STR),
  );
  const info = await _deGetConn().getAccountInfo(pda);
  if (!info || info.data.length < 100) return false;
  const data = new Uint8Array(info.data);
  const cards = [];
  for (let i = 0; i < 60; i++) {
    if (data[40 + i]) {
      cards.push({ card_id: i + 1, qty: 1 });
    }
  }
  deckStorageCards = cards.length ? cards : deckStorageCards;
  return cards.length > 0;
}

// ── On-chain load: PlayerDeck → deckSlots ────────────────────────────────
// PlayerDeck layout (Anchor, seeds: ["player_deck", player_pubkey]):
//   offset 0-7:  discriminator
//   offset 8-39: owner Pubkey
//   offset 40-59: deck_cards [u8; 20]  — 0 = empty
//   offset 60:   card_count u8
//   offset 61-68: locked_until i64 LE
//   offset 69-76: last_modified i64 LE
//   offset 77:   bump u8
async function loadDeckFromChain(playerKey) {
  const [pda] = solanaWeb3.PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('player_deck'), playerKey.toBytes()],
    new solanaWeb3.PublicKey(DE_PROGRAM_ID_STR),
  );
  const info = await _deGetConn().getAccountInfo(pda);
  if (!info || info.data.length < 61) return false;
  const data = new Uint8Array(info.data);
  const slots = new Array(20).fill(null);
  for (let i = 0; i < 20; i++) {
    const id = data[40 + i];
    slots[i] = (id >= 1 && id <= 60) ? id : null;
  }
  deckSlots = slots;
  return true;
}

// ── Save deck on-chain ────────────────────────────────────────────────────
async function deckSaveDeckTx() {
  if (deckSaveStatus === 'saving') return;
  const cards = deckSlots.filter(Boolean);
  if (!cards.length) return;

  if (!window.oxarkOnchain?.saveDeck) {
    deckSaveStatus = 'error: wallet not connected';
    return;
  }
  deckSaveStatus = 'saving';
  try {
    await window.oxarkOnchain.saveDeck(cards);
    deckSaveStatus = 'saved';
    setTimeout(() => { if (deckSaveStatus === 'saved') deckSaveStatus = ''; }, 3000);
  } catch (e) {
    const msg = (e.message ?? 'tx failed').slice(0, 40);
    deckSaveStatus = `error: ${msg}`;
    console.error('[DeckEditor] saveDeck failed:', e);
  }
}

// ── Card cost (for 30-point cap validation) ───────────────────────────────
function cardCost(card_id) {
  const r = CD[card_id - 1]?.r ?? 1;
  if (r === 5) return 5; // Legendary
  if (r >= 3)  return 2; // Rare
  return 1;              // Common/Uncommon
}

// ── Deck validation ────────────────────────────────────────────────────────
function deckValidation() {
  const counts = {};
  let totalCost = 0;
  let legendaryCount = 0;
  let rareCount = 0;
  let commonCount = 0;

  for (const id of deckSlots) {
    if (!id) continue;
    counts[id] = (counts[id] || 0) + 1;
    const cost = cardCost(id);
    totalCost += cost;
    const r = CD[id - 1]?.r ?? 1;
    if (r === 5) legendaryCount++;
    else if (r >= 3) rareCount++;
    else commonCount++;
  }

  const cardCount = deckSlots.filter(Boolean).length;
  const errors = [];
  if (totalCost > 30) errors.push(`Cost ${totalCost}/30 ⚠️`);
  if (legendaryCount > 2) errors.push(`Legendary ${legendaryCount}/2 ⚠️`);
  if (rareCount > 6) errors.push(`Rare ${rareCount}/6 ⚠️`);
  if (cardCount > 0 && commonCount < 12) errors.push(`Common ${commonCount}/12 ⚠️`);

  const duplicates = new Set(
    Object.entries(counts).filter(([, n]) => n > 2).map(([id]) => Number(id))
  );

  return { cardCount, totalCost, legendaryCount, rareCount, commonCount, errors, duplicates };
}

// ── Open / close ─────────────────────────────────────────────────────────
function openDeckEditor() {
  _initDeckStorageFallback(); // start with fallback immediately (fast)
  deckEditorOpen   = true;
  deckEditorFilter = 'all';
  deckEditorScroll = 0;
  deckSelectedCard = null;
  deckSaveStatus   = '';

  // Async load from chain if wallet is connected (replaces fallback when ready)
  const playerKey = window.solana?.publicKey;
  if (playerKey) {
    loadStorageFromChain(playerKey).catch(e => console.warn('[DeckEditor] loadStorage:', e.message));
    loadDeckFromChain(playerKey).catch(e => console.warn('[DeckEditor] loadDeck:', e.message));
  }
}

function closeDeckEditor() {
  deckEditorOpen = false;
  deckSaveStatus = '';
}

// ── Filtered storage list ─────────────────────────────────────────────────
function filteredStorage() {
  return deckStorageCards.filter(({ card_id }) => {
    if (deckEditorFilter === 'all') return true;
    const card = CD[card_id - 1];
    return card && card.t === deckEditorFilter;
  });
}

// ── Click storage card (add to first empty deck slot) ─────────────────────
function deckEditorClickStorage(card_id) {
  const firstEmpty = deckSlots.findIndex(s => !s);
  if (firstEmpty === -1) return; // deck full
  deckSlots[firstEmpty] = card_id;
}

// ── Click deck slot (remove card) ────────────────────────────────────────
function deckEditorClickDeck(slotIdx) {
  deckSlots[slotIdx] = null;
}

// ── Rarity color helper ──────────────────────────────────────────────────
function deckRarityColor(r) {
  return ['','#888898','#50d060','#b060e0','#e0a020','#ffe080'][r] ?? '#888';
}

// ── Draw ──────────────────────────────────────────────────────────────────
const DE_PAD    = 12;
const DE_BTN_H  = 28;
const DE_FILTER_H = 28;
const DE_TITLE_H  = 40;

function drawDeckEditor() {
  if (!deckEditorOpen) return;

  const ow = W, oh = H;
  const oy = 0;

  // Dark backdrop
  g.fillStyle = 'rgba(0,0,0,0.88)';
  g.fillRect(0, 0, ow, oh);

  // Panel background
  g.fillStyle = '#0b0b1c';
  g.fillRect(DE_PAD, DE_PAD, ow - DE_PAD * 2, oh - DE_PAD * 2);
  g.strokeStyle = '#c8a460';
  g.lineWidth = 2;
  g.strokeRect(DE_PAD + 1, DE_PAD + 1, ow - DE_PAD * 2 - 2, oh - DE_PAD * 2 - 2);

  // ── Title bar ──────────────────────────────────────────────────────────
  g.fillStyle = '#f0e0a0';
  g.font = 'bold 22px VT323, monospace';
  g.textAlign = 'center';
  g.fillText('💾 DECK EDITOR', ow / 2, DE_PAD + 30);

  // Close button (top-right)
  g.fillStyle = '#2a2a3a';
  g.fillRect(ow - DE_PAD - 50, DE_PAD + 6, 44, 22);
  g.strokeStyle = '#555';
  g.lineWidth = 1;
  g.strokeRect(ow - DE_PAD - 50, DE_PAD + 6, 44, 22);
  g.fillStyle = '#aaa';
  g.font = '14px VT323, monospace';
  g.textAlign = 'center';
  g.fillText('Close', ow - DE_PAD - 28, DE_PAD + 22);

  const contentY = DE_PAD + DE_TITLE_H;
  const contentH = oh - DE_PAD * 2 - DE_TITLE_H - DE_BTN_H - 8;
  const midX = ow / 2;

  // ── Filter bar ─────────────────────────────────────────────────────────
  const filters = ['all','attack','defense','flee','magic','recovery'];
  const fw = (midX - DE_PAD - 4) / filters.length;
  filters.forEach((f, i) => {
    const fx = DE_PAD + i * fw;
    const isActive = deckEditorFilter === f;
    g.fillStyle = isActive ? '#3040a0' : '#1a1a2a';
    g.fillRect(fx, contentY, fw - 2, DE_FILTER_H);
    g.strokeStyle = isActive ? '#6080e0' : '#333';
    g.lineWidth = 1;
    g.strokeRect(fx + 0.5, contentY + 0.5, fw - 3, DE_FILTER_H - 1);
    g.fillStyle = isActive ? '#e8e8ff' : '#666';
    g.font = '12px VT323, monospace';
    g.textAlign = 'center';
    g.fillText(f.toUpperCase(), fx + fw / 2 - 1, contentY + 19);
  });

  // ── Storage panel (left) ───────────────────────────────────────────────
  const storY = contentY + DE_FILTER_H + 4;
  const storH = contentH - DE_FILTER_H - 4;
  const storW = midX - DE_PAD - 8;
  const COLS = 5, CELL = 38;

  g.save();
  g.beginPath();
  g.rect(DE_PAD, storY, storW, storH);
  g.clip();

  g.fillStyle = '#444466';
  g.font = '11px VT323, monospace';
  g.textAlign = 'left';
  g.fillText('STORAGE — click to add to deck', DE_PAD + 4, storY + 14);

  const list = filteredStorage();
  const rows = Math.ceil(list.length / COLS);
  list.forEach(({ card_id, qty }, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const cx = DE_PAD + 4 + col * (CELL + 3);
    const cy = storY + 20 + row * (CELL + 3) - deckEditorScroll;
    if (cy + CELL < storY || cy > storY + storH) return; // clipped

    const card = CD[card_id - 1];
    const isSelected = deckSelectedCard === card_id;
    g.fillStyle = isSelected ? '#2a3060' : '#111128';
    g.fillRect(cx, cy, CELL, CELL);
    g.strokeStyle = isSelected ? '#6080ff' : (deckRarityColor(card?.r ?? 1));
    g.lineWidth = 1;
    g.strokeRect(cx + 0.5, cy + 0.5, CELL - 1, CELL - 1);

    // Card type icon
    g.fillStyle = card?.c ?? '#888';
    g.font = '16px VT323, monospace';
    g.textAlign = 'center';
    g.fillText(card?.i ?? '?', cx + CELL / 2, cy + 18);

    // Card name
    g.fillStyle = '#ccc';
    g.font = '9px VT323, monospace';
    g.fillText((card?.n ?? '?').slice(0, 5), cx + CELL / 2, cy + 27);

    // Rarity dot + qty
    g.fillStyle = deckRarityColor(card?.r ?? 1);
    g.font = '9px VT323, monospace';
    g.fillText(`×${qty}`, cx + CELL / 2, cy + CELL - 3);
  });

  g.restore();

  // Scroll indicators
  if (deckEditorScroll > 0) {
    g.fillStyle = '#888';
    g.font = '12px VT323, monospace';
    g.textAlign = 'center';
    g.fillText('▲', DE_PAD + storW / 2, storY + 4);
  }
  if (rows * (CELL + 3) - deckEditorScroll > storH - 20) {
    g.fillStyle = '#888';
    g.font = '12px VT323, monospace';
    g.textAlign = 'center';
    g.fillText('▼', DE_PAD + storW / 2, storY + storH - 2);
  }

  // Divider
  g.strokeStyle = '#333350';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(midX - 2, contentY);
  g.lineTo(midX - 2, oh - DE_PAD - DE_BTN_H - 8);
  g.stroke();

  // ── Deck panel (right) ─────────────────────────────────────────────────
  const deckX = midX + 4;
  const deckW = ow - DE_PAD - deckX;
  const DCOLS = 5, DCELL = 36;
  const DROWS = 4; // 5×4 = 20 slots

  const valid = deckValidation();

  g.fillStyle = '#444466';
  g.font = '11px VT323, monospace';
  g.textAlign = 'left';
  g.fillText(`DECK  ${valid.cardCount}/20  |  Cost: ${valid.totalCost}/30`, deckX, storY + 14);

  // Validation errors
  if (valid.errors.length) {
    g.fillStyle = '#cc4444';
    g.font = '10px VT323, monospace';
    g.fillText(valid.errors.join('  '), deckX, storY + 26);
  }

  const dStartY = storY + 32;
  deckSlots.forEach((card_id, idx) => {
    const col = idx % DCOLS;
    const row = Math.floor(idx / DCOLS);
    const cx = deckX + col * (DCELL + 4);
    const cy = dStartY + row * (DCELL + 4);

    const card = card_id ? CD[card_id - 1] : null;
    const isDuplicate = card_id && valid.duplicates.has(card_id);

    g.fillStyle = card_id ? '#111128' : '#0c0c1a';
    g.fillRect(cx, cy, DCELL, DCELL);
    g.strokeStyle = isDuplicate ? '#cc4444' : (card ? deckRarityColor(card.r) : '#2a2a3a');
    g.lineWidth = isDuplicate ? 2 : 1;
    g.strokeRect(cx + 0.5, cy + 0.5, DCELL - 1, DCELL - 1);

    if (card_id && card) {
      g.fillStyle = card.c ?? '#888';
      g.font = '14px VT323, monospace';
      g.textAlign = 'center';
      g.fillText(card.i ?? '?', cx + DCELL / 2, cy + 16);
      g.fillStyle = '#ccc';
      g.font = '8px VT323, monospace';
      g.fillText(card.n.slice(0, 5), cx + DCELL / 2, cy + 25);
      g.fillStyle = '#666';
      g.fillText(`${cardCost(card_id)}pt`, cx + DCELL / 2, cy + DCELL - 3);
    } else {
      g.fillStyle = '#2a2a3a';
      g.font = '14px VT323, monospace';
      g.textAlign = 'center';
      g.fillText('+', cx + DCELL / 2, cy + DCELL / 2 + 5);
    }
  });

  // ── Bottom action bar ──────────────────────────────────────────────────
  const barY = oh - DE_PAD - DE_BTN_H;
  g.fillStyle = '#1a1a2a';
  g.fillRect(DE_PAD, barY, ow - DE_PAD * 2, DE_BTN_H);

  // Save Deck button — enabled when deck has cards and wallet connected
  const canSave = valid.cardCount > 0 && !!(window.solana?.publicKey) && deckSaveStatus !== 'saving';
  const saveBtnX = ow - DE_PAD - 130;
  const saveBtnW = 124;
  if (deckSaveStatus === 'saving') {
    g.fillStyle = '#1a2a3a';
  } else if (deckSaveStatus.startsWith('error')) {
    g.fillStyle = '#2a1a1a';
  } else if (deckSaveStatus === 'saved') {
    g.fillStyle = '#1a3a1a';
  } else {
    g.fillStyle = canSave ? '#1a3a1a' : '#1a2a1a';
  }
  g.fillRect(saveBtnX, barY + 3, saveBtnW, DE_BTN_H - 6);
  g.strokeStyle = canSave ? '#4a8a4a' : '#2a4a2a';
  g.lineWidth = 1;
  g.strokeRect(saveBtnX, barY + 3, saveBtnW, DE_BTN_H - 6);

  let saveBtnLabel = 'Save Deck';
  if (deckSaveStatus === 'saving') saveBtnLabel = 'Saving…';
  else if (deckSaveStatus === 'saved') saveBtnLabel = '✓ Saved!';
  else if (deckSaveStatus.startsWith('error')) saveBtnLabel = 'Error — retry?';

  g.fillStyle = canSave ? '#80d080' : '#3a5a3a';
  g.font = '14px VT323, monospace';
  g.textAlign = 'center';
  g.fillText(saveBtnLabel, saveBtnX + saveBtnW / 2, barY + 19);

  // Status message or hint
  if (deckSaveStatus.startsWith('error')) {
    g.fillStyle = '#cc4444';
    g.font = '10px VT323, monospace';
    g.textAlign = 'left';
    g.fillText(deckSaveStatus.slice(0, 60), DE_PAD + 4, barY + 19);
  } else {
    g.fillStyle = '#444466';
    g.font = '10px VT323, monospace';
    g.textAlign = 'left';
    g.fillText('Click storage to add · Click deck slot to remove · Arrow keys scroll', DE_PAD + 4, barY + 19);
  }
}

// ── Input handlers (called from 10-input.js) ──────────────────────────────
// Returns true if the input was consumed.

function deckEditorKeydown(code) {
  if (!deckEditorOpen) return false;
  if (code === 'Escape' || code === 'KeyX') { closeDeckEditor(); return true; }
  if (code === 'ArrowDown' || code === 'KeyS') { deckEditorScroll = Math.min(deckEditorScroll + 40, 300); return true; }
  if (code === 'ArrowUp'   || code === 'KeyW') { deckEditorScroll = Math.max(deckEditorScroll - 40, 0); return true; }
  return true; // swallow all keys while editor is open
}

// ── Mouse/touch click handler ─────────────────────────────────────────────
// px/py = canvas pixel coords (accounting for CSS scale)
function deckEditorClick(px, py) {
  if (!deckEditorOpen) return false;

  const ow = W, oh = H;
  const midX = ow / 2;
  const contentY = DE_PAD + DE_TITLE_H;

  // Close button
  if (px >= ow - DE_PAD - 50 && px <= ow - DE_PAD - 6 && py >= DE_PAD + 6 && py <= DE_PAD + 28) {
    closeDeckEditor(); return true;
  }

  // Save Deck button (bottom-right)
  const barY = oh - DE_PAD - DE_BTN_H;
  if (px >= ow - DE_PAD - 130 && px <= ow - DE_PAD - 6 && py >= barY + 3 && py <= barY + DE_BTN_H - 3) {
    const canSave = deckSlots.filter(Boolean).length > 0 && !!(window.solana?.publicKey) && deckSaveStatus !== 'saving';
    if (canSave) deckSaveDeckTx().catch(e => console.error('[DeckEditor] save:', e));
    return true;
  }

  // Filter buttons
  const filters = ['all','attack','defense','flee','magic','recovery'];
  const fw = (midX - DE_PAD - 4) / filters.length;
  if (py >= contentY && py <= contentY + DE_FILTER_H) {
    const fi = Math.floor((px - DE_PAD) / fw);
    if (fi >= 0 && fi < filters.length) { deckEditorFilter = filters[fi]; deckEditorScroll = 0; }
    return true;
  }

  const storY = contentY + DE_FILTER_H + 4;
  const storH = oh - DE_PAD * 2 - DE_TITLE_H - DE_BTN_H - 8 - DE_FILTER_H - 4;
  const CELL = 38;

  // Storage panel click
  if (px >= DE_PAD && px < midX - 8 && py >= storY && py < storY + storH) {
    const list = filteredStorage();
    const col = Math.floor((px - DE_PAD - 4) / (CELL + 3));
    const row = Math.floor((py - storY - 20 + deckEditorScroll) / (CELL + 3));
    const idx = row * 5 + col;
    if (idx >= 0 && idx < list.length) {
      deckEditorClickStorage(list[idx].card_id);
    }
    return true;
  }

  // Deck panel click
  const deckX = midX + 4;
  const DCELL = 36;
  const dStartY = storY + 32;
  if (px >= deckX && py >= dStartY) {
    const col = Math.floor((px - deckX) / (DCELL + 4));
    const row = Math.floor((py - dStartY) / (DCELL + 4));
    const idx = row * 5 + col;
    if (idx >= 0 && idx < 20) deckEditorClickDeck(idx);
    return true;
  }

  return true; // swallow all clicks while open
}
