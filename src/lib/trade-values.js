/** Canonical account reader output; never infer ownership from catalog data. */
export function ownedCardIds(playerState) {
  if (!Array.isArray(playerState?.vault)) return [];
  return [...new Set(playerState.vault.filter(id => Number.isInteger(id) && id >= 1 && id <= 60))];
}

/** Exact decimal SOL input, rejecting rounding, infinities and unsafe integers. */
export function listingLamports(value) {
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,9})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const amount = BigInt(whole) * 1_000_000_000n + BigInt(fraction.padEnd(9, '0'));
  return amount >= 1_000_000n && amount <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(amount) : null;
}
