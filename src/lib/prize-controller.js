import { prizeQuote } from './season-prize.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';
import { NETWORK, PROGRAM_ID } from '../config.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';

export function createPrizeController({ owner, getOwner, api, storage, onChange }) {
  let active = true, busy = false, revision = 0;
  let snapshot = null, record = null, receipt = null, error = '', loading = true;
  const current = () => active && getOwner() === owner;
  const key = (source = snapshot) => `oxark:prize:${NETWORK}:${PROGRAM_ID}:${owner}:${source.world.game_start_timestamp}`;
  const emit = () => { if (current()) onChange({ snapshot, record, receipt, error, loading, busy }); };
  function loadRecord(source) {
    const raw = storage.getItem(key(source));
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(value.signature) || value.owner !== owner
        || value.network !== NETWORK || value.program !== PROGRAM_ID
        || value.season !== String(source.world.game_start_timestamp)
        || !Number.isSafeInteger(value.lastValidBlockHeight)) throw new Error('Saved claim could not be verified. Do not submit again until its transaction is checked.');
    return value;
  }
  async function refresh() {
    if (!current() || busy) return;
    const request = ++revision;
    loading = true; error = ''; emit();
    try {
      const next = await api.getPrizeSnapshot(owner);
      if (!current() || request !== revision) return;
      prizeQuote(next); // malformed or incomplete ended data must never enable a claim
      const nextRecord = loadRecord(next);
      let nextReceipt = null, receiptError = '';
      try { nextReceipt = nextRecord ? await api.getPrizeReceipt(nextRecord) : null; }
      catch (e) { nextReceipt = { state: 'pending' }; receiptError = e.message || 'Transaction verification unavailable.'; }
      if (!current() || request !== revision) return;
      snapshot = next; record = nextRecord; receipt = nextReceipt; error = receiptError;
    } catch (e) { if (current() && request === revision) error = e.message || 'Could not verify the season.'; }
    finally { if (current() && request === revision) { loading = false; emit(); } }
  }
  async function claim() {
    if (!current() || busy || loading || error || !snapshot || prizeQuote(snapshot).state !== 'claimable') return;
    if (record && !['failed', 'expired'].includes(receipt?.state)) return;
    busy = true; error = ''; ++revision; emit();
    try {
      await api.submitPrizeClaim(snapshot, { isCurrent: current, onSigned(value) {
        storage.setItem(key(), JSON.stringify(value));
        record = value; receipt = { state: 'pending' }; emit();
      } });
    } catch (e) { if (current()) error = e.message || 'Claim could not be submitted.'; }
    finally {
      busy = false;
      if (current()) {
        emit();
        if (record) await refresh();
      }
    }
  }
  return { refresh, claim, dispose() { active = false; ++revision; } };
}
