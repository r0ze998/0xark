import { createPrizeController } from '../lib/prize-controller.js';
import { prizeQuote, sol, BAND_SHARES } from '../lib/season-prize.js';
import { createScreenScope } from '../lib/screen-scope.js';
import { injectStyle } from '../lib/inject-style.js';
import { PRIZE_SCREEN_CSS } from '../style/prize-screen.js';
import { NETWORK, EXPLORER_TX_URL, PRIZE_CLAIMS_ENABLED } from '../config.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
let cleanup = () => {};
const labels = { active:'Season in progress', waiting:'Before the season', settling:'Results are being tallied', ended:'Season results' };
export function mount(container, props = {}) {
  cleanup();
  injectStyle('prize-screen-css', PRIZE_SCREEN_CSS);
  const scope = createScreenScope();
  const practice = !!window.oxarkPreview;
  const owner = () => window.oxarkWallet?.getPublicKey?.()?.toString();
  let controller;
  let example = 'active';
  let cancelPoll = () => {};
  function render(view) {
    if (!scope.active) return;
    cancelPoll();
    const focusedId = document.activeElement?.id;
    const { snapshot, record, receipt, busy, loading, error } = view;
    let quote;
    try { if (snapshot) quote = prizeQuote(snapshot); } catch { /* keep an unavailable state */ }
    const world = snapshot?.world;
    const verified = receipt?.state === 'received';
    const pending = record && !['failed', 'expired', 'received'].includes(receipt?.state);
    const retryable = ['failed', 'expired'].includes(receipt?.state);
    const canClaim = PRIZE_CLAIMS_ENABLED && !practice && !loading && !busy && !error && quote?.state === 'claimable' && (!record || retryable);
    const title = verified ? (practice ? 'Example: prize received.' : 'Your prize has arrived.') : labels[quote?.phase] ?? 'Season & prizes';
    const amount = verified ? receipt.amount : quote?.state === 'claimable' ? quote.amount : null;
    const message = verified ? (practice ? 'This is a receipt example. No SOL was sent and no wallet was used.' : 'The prize transfer to your wallet is finalized on Solana.')
      : pending ? 'Your claim has a transaction signature. Verify it before trying again.'
      : quote?.state === 'closed' ? 'No open claim for this wallet. A zero registration balance alone does not prove a prize was received.'
      : quote?.state === 'underfunded' ? 'The pool cannot cover your full allocation. Claiming is paused to avoid a partial payout that would close your claim.'
      : quote?.state === 'ineligible' ? 'No prize is available for this wallet in this season.'
      : quote?.phase === 'ended' ? 'The season tally is complete. Review your allocation and claim it to your connected wallet.'
      : quote?.phase === 'settling' ? 'The deadline or tally stage has been reached. Claims open only after the complete results are confirmed on chain.'
      : 'Collect all 60 unique cards to reach Tier 1. Your reward is determined after the season is settled; completing the collection does not send an automatic payment.';
    const end = world?.end_timestamp > 0 ? new Date(world.end_timestamp * 1000).toLocaleString() : 'Unavailable';
    const progress = quote?.count ?? 0;
    container.innerHTML = `<main class="prize-screen" aria-label="Season and prizes">
      <header class="prize-header"><button class="gba-btn" id="prize-home">← Home</button><span>${practice ? 'PRACTICE · NO PAYMENTS' : `SOLANA / ${escape(NETWORK.toUpperCase())}`}</span></header>
      <div class="prize-layout"><section class="prize-summary"><p class="prize-eyebrow">THE SEASON REWARD</p><h1>${title}</h1>
        <p class="prize-intro">${message}</p>
        ${practice ? '<p class="prize-notice">This screen explains the real reward rules. Practice cards do not earn SOL. All amounts below are examples, not live balances.</p><label class="prize-example">Preview state <select id="prize-example"><option value="active">During the season</option><option value="settling">Awaiting results</option><option value="ready">Ready to claim</option><option value="received">Prize received</option></select></label>' : ''}
        <div class="prize-metrics"><div><span>${practice ? 'Example season pool' : 'Recorded prize allocation'}</span><strong>${sol(quote?.pool)} <small>SOL</small></strong><p>Recorded season allocation, before payouts.</p></div>
        <div><span>${verified ? 'Received in your wallet' : 'Your claimable prize'}</span><strong>${sol(amount)} <small>SOL</small></strong><p>${verified ? `Network fee: ${sol(receipt.fee)} SOL, paid separately.` : quote?.phase === 'ended' ? 'Checked against the available vault balance. Network fees apply.' : 'Not fixed until the final tally.'}</p></div></div>
        <div class="prize-collection"><span>${progress} / 60 unique cards</span><span>${quote?.tier ? `Tier ${quote.tier}` : 'No tier yet'}</span></div>
        <progress aria-label="Collection progress" value="${progress}" max="60"></progress>
        <dl class="prize-facts"><dt>${practice ? 'Example available balance' : 'Available prize vault balance'}</dt><dd>${sol(snapshot?.spendable)} SOL</dd><dt>Season deadline (your local time)</dt><dd>${escape(end)}</dd><dt>Tier 1 collectors (final tally)</dt><dd>${quote?.phase === 'ended' ? (world.winner_60_count || world.max_vault_count) : 'Not final'}</dd><dt>Participants tallied</dt><dd>${world ? `${world.finalize_processed} / ${world.total_participants}` : '—'}</dd><dt>Prize recipient</dt><dd class="prize-address">${practice ? 'Practice only' : escape(snapshot?.owner ?? owner() ?? 'Connect your wallet')}</dd></dl>
        <div class="prize-feedback" role="status" aria-live="polite">${escape(error || (loading ? 'Checking chain data…' : busy ? 'Approve the claim in your wallet…' : retryable ? 'The previous transaction failed or expired. Refresh eligibility before retrying.' : ''))}</div>
        ${!practice && !PRIZE_CLAIMS_ENABLED ? '<p class="prize-notice">Live prize claims are not open in this release. You can check the pool and season results here.</p>' : ''}<div class="prize-actions"><button class="gba-btn gba-btn--primary" id="prize-claim" ${canClaim ? '' : 'disabled'}>${verified ? 'Prize received' : pending ? 'Awaiting verification' : 'Claim prize'}</button><button class="gba-btn" id="prize-refresh" ${practice || busy || loading ? 'disabled' : ''}>${pending ? 'Verify transaction' : 'Refresh status'}</button></div>
        ${record ? `<p><a class="prize-receipt" target="_blank" rel="noopener" href="${escape(EXPLORER_TX_URL(record.signature))}">View claim transaction ↗</a></p>` : ''}
      </section><aside class="prize-rules"><p class="prize-eyebrow">COLLECT WITH A PURPOSE</p><h2>60 cards.<br>A share of the prize.</h2><p>One copy of each card counts. Extra copies do not increase your collection count.</p>
        <table><caption>Base share of the pool for each tier</caption><thead><tr><th>Unique cards</th><th>Pool share</th></tr></thead><tbody>${['60','50–59','30–49','10–29','1–9'].map((range,i)=>`<tr${quote?.tier === i+1 ? ' class="is-your-tier"' : ''}><td>${range}</td><td>${BAND_SHARES[i]}%</td></tr>`).join('')}</tbody></table>
        <p>The 60-card holders split Tier 1 equally. Within other tiers, rewards are proportional to each player’s unique-card count.</p><p>If nobody completes all 60 cards, the highest collectors share Tier 1. They are not paid again in a lower tier.</p><p>An empty tier’s share moves to the next occupied lower tier. If none exists, it stays in the pool.</p><p>Season results must be tallied and closed by the operator before claims open. Amounts are in ${escape(NETWORK === 'devnet' ? 'devnet SOL (test tokens)' : 'SOL')}.</p>
      </aside></div></main>`;
    if (practice) {
      const select = container.querySelector('#prize-example');
      select.value = example;
      select.addEventListener('change', () => { example = select.value; showExample(); });
    }
    container.querySelector('#prize-home').addEventListener('click', () => document.dispatchEvent(new CustomEvent('nav:home')));
    container.querySelector('#prize-claim').addEventListener('click', () => controller?.claim());
    container.querySelector('#prize-refresh').addEventListener('click', () => controller?.refresh());
    if (['prize-example', 'prize-refresh', 'prize-claim'].includes(focusedId)) {
      const focusTarget = container.querySelector('#' + focusedId);
      if (focusTarget && !focusTarget.disabled) focusTarget.focus();
    }
    if (pending && !busy && !loading && !error) cancelPoll = scope.timeout(() => controller?.refresh(), 8000);
  }
  cleanup = () => { scope.dispose(); controller?.dispose(); };
  function showExample() {
    const ended = ['ready', 'received'].includes(example);
    const count = ended ? 60 : (props.playerState?.vault?.length ?? 30);
    render({ snapshot: { world: { game_status: ended ? 2 : 1, total_prize_pool: '10000000000',
      end_timestamp: Math.floor(Date.now()/1000) + (example === 'active' ? 11*86400 : -86400),
      finalize_processed: ended ? 10 : example === 'settling' ? 4 : 0, total_participants: 10,
      winner_60_count: 2, tier_totals: ['100','80','30','4'], max_vault:60,max_vault_count:2 },
      player:{vault:Array.from({length:count},(_,i)=>i+1),deposit_amount:example === 'received'?'0':'500000000'},spendable:'10000000000' },
      receipt:example === 'received'?{state:'received',amount:'2500000000',fee:'5000'}:null });
  }
  if (practice) { showExample(); return; }
  // Storage is required before broadcasting so reloads cannot lose an uncertain claim.
  const storage = { getItem: key => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value) };
  controller = createPrizeController({ owner: owner(), getOwner: owner, api: window.oxarkOnchain, storage, onChange: render });
  render({ loading: true });
  controller.refresh();
}
export function unmount(container) { cleanup(); cleanup = () => {}; container.innerHTML = ''; }
