// Exact lamport arithmetic, mirroring claim_prize_v2.rs (including division order).
export const BAND_SHARES = [50, 25, 15, 8, 2];
export function lamports(value) {
  if (typeof value === 'bigint' && value >= 0n) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value);
  if (Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  throw new Error('Exact prize amount unavailable');
}
export function sol(value) {
  if (value == null) return '—';
  const n = lamports(value);
  const fraction = (n % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/, '');
  return `${n / 1_000_000_000n}${fraction ? '.' + fraction : ''}`;
}
export function effectiveShares(populated) {
  let carry = 0;
  return BAND_SHARES.map((share, i) => {
    if (!populated[i]) { carry += share; return 0; }
    const result = share + carry; carry = 0; return result;
  });
}
export function prizeQuote(snapshot, now = Date.now() / 1000) {
  const { world: w, player: p, spendable } = snapshot;
  if (!w || ![0, 1, 2].includes(w.game_status)) throw new Error('Season data unavailable');
  const pool = lamports(w.total_prize_pool);
  const count = p?.vault?.length ?? 0;
  if (count > 60 || (p && new Set(p.vault).size !== count)) throw new Error('Invalid collection');
  const phase = w.game_status === 2 ? 'ended' : w.game_status === 0 ? 'waiting'
    : w.finalize_processed > 0 || now >= w.end_timestamp ? 'settling' : 'active';
  const base = { phase, pool, count, amount: null, entitlement: null, tier: count === 60 ? 1 : count >= 50 ? 2 : count >= 30 ? 3 : count >= 10 ? 4 : count ? 5 : null };
  if (phase !== 'ended') return base;
  if (w.finalize_processed !== w.total_participants) throw new Error('Season tally is incomplete');
  if (!p) return { ...base, state: 'ineligible' };
  // Zero deposit blocks a second claim on chain, but alone is not a receipt.
  if (lamports(p.deposit_amount) === 0n) return { ...base, state: 'closed' };
  if (!count) return { ...base, state: 'ineligible' };
  const timeout = w.winner_60_count === 0;
  const divisor = lamports(timeout ? w.max_vault_count : w.winner_60_count);
  const totals = [divisor, ...w.tier_totals.map(lamports)];
  const shares = effectiveShares(totals.map(n => n > 0n));
  const champion = timeout ? count === w.max_vault : count === 60;
  const band = champion ? 0 : count >= 50 ? 1 : count >= 30 ? 2 : count >= 10 ? 3 : 4;
  const denominator = totals[band];
  const entitlement = denominator === 0n ? 0n : pool * BigInt(shares[band]) / 100n * (champion ? 1n : BigInt(count)) / denominator;
  const balance = lamports(spendable);
  const amount = entitlement < balance ? entitlement : balance;
  // The contract would permanently consume the claim even on partial payment.
  // Do not offer that irreversible partial payout through the client.
  return { ...base, tier: band + 1, shares, entitlement, amount, champion,
    state: entitlement === 0n ? 'ineligible' : amount < entitlement ? 'underfunded' : 'claimable' };
}

// Layouts from state.rs. Prize reads reject legacy/truncated layouts.
export function decodePrizeWorld(data) {
  if (data.length < 227) throw new Error('Season account upgrade required');
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const u64 = offset => v.getBigUint64(offset, true).toString();
  const time = offset => Number(v.getBigInt64(offset, true));
  if (![0, 1, 2].includes(data[59])) throw new Error('Invalid season status');
  return { game_start_timestamp: time(8), end_timestamp: time(16), waitlist_close_timestamp: time(24),
    total_participants: v.getUint32(32, true), total_prize_pool: u64(36),
    winner_60_count: data[58], game_status: data[59], tier_totals: [60, 68, 76, 84].map(u64),
    max_vault: data[185], max_vault_count: v.getUint32(186, true), finalize_processed: v.getUint32(190, true) };
}
export function decodePrizePlayer(data) {
  if (data.length < 170 || ![0, 1].includes(data[169])) throw new Error('Invalid player account');
  const offset = data[169] === 0 ? 170 : 202;
  if (data.length < offset + 16) throw new Error('Incomplete player account');
  if (data[offset + 7] & 240) throw new Error('Invalid collection bitmap');
  const vault = [];
  for (let id = 1; id <= 60; id++) if (data[offset + ((id - 1) >> 3)] & (1 << ((id - 1) % 8))) vault.push(id);
  return { vault, deposit_amount: new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(offset + 8, true).toString() };
}
