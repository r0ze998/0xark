// Pure preparation edits. A target is explicit; otherwise fill the next empty slot.
export function placeInHand(field, cardId, target = null) {
  if (field.some(card => card?.cardId === cardId)) return field;
  const index = target ?? field.findIndex(card => !card);
  if (!Number.isInteger(index) || index < 0 || index >= field.length) return field;
  return field.map((card, i) => i === index ? { cardId, actionType: 0 } : card);
}

// Timeout retains every player choice, including action types. The caller may
// shuffle candidates; duplicates and cards already in the hand are excluded.
export function completeHand(field, candidates) {
  const used = new Set(field.filter(Boolean).map(card => card.cardId));
  const available = [...new Set(candidates)].filter(id => !used.has(id));
  return field.map(card => card ?? (available.length ? { cardId: available.shift(), actionType: 0 } : null));
}

export function snapshotHand(field) {
  if (field.length !== 5 || field.some(card => !card)) throw new Error('Choose 5 cards first');
  if (new Set(field.map(card => card.cardId)).size !== 5) throw new Error('Choose 5 different cards');
  return Object.freeze(field.map(card => Object.freeze({ ...card })));
}
