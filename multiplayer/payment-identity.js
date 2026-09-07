/** Reject unrelated, failed or expired payment proofs before consuming them. */
export function paymentIdentityError(tx, player, now = Date.now()) {
  if (!tx?.meta || tx.meta.err != null) return 'Payment transaction failed';
  const message = tx.transaction?.message;
  const keys = message?.staticAccountKeys ?? message?.accountKeys ?? [];
  const payer = keys[0]?.toBase58?.() ?? String(keys[0] ?? '');
  if (!player || payer !== player) return 'Payment payer does not match wallet';
  if (!(message?.header?.numRequiredSignatures >= 1)) return 'Payment is not signed';
  if (!Number.isFinite(tx.blockTime) || now - tx.blockTime * 1000 > 300_000 || tx.blockTime * 1000 > now + 30_000) {
    return 'Payment proof expired or timestamp unavailable';
  }
  return null;
}
