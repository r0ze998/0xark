import { encodeBase58, decodeBase58 } from '../lib/base58.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';
import { getConnection } from './rpc.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';
import { getWalletProvider } from '../lib/wallet-provider.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';
import { NETWORK, PROGRAM_ID, PRIZE_CLAIMS_ENABLED } from '../config.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';
import { decodePrizeWorld, decodePrizePlayer, lamports, prizeQuote } from '../lib/season-prize.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';
import { findGameWorldPDA, findPlayerStatePDA, findPrizePoolPDA, getProgramId, disc, computeBudgetIxs, requestHeapFrameIx, HEAP_FRAME_BYTES, COMPUTE_BUDGET } from './pda.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';

async function validateAccount(info, name) {
  if (!info || info.owner.toString() !== PROGRAM_ID) throw new Error(`${name} account unavailable`);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`account:${name}`)));
  if (!hash.slice(0, 8).every((byte, i) => info.data[i] === byte)) throw new Error(`Invalid ${name} account`);
}
export async function getPrizeSnapshot(owner) {
  const wallet = new solanaWeb3.PublicKey(owner);
  const worldKey = findGameWorldPDA()[0], playerKey = findPlayerStatePDA(wallet)[0], poolKey = findPrizePoolPDA()[0];
  const conn = getConnection();
  const [{ value, context }, rent] = await Promise.all([
    conn.getMultipleAccountsInfoAndContext([worldKey, playerKey, poolKey], 'confirmed'),
    conn.getMinimumBalanceForRentExemption(0, 'confirmed'),
  ]);
  await validateAccount(value[0], 'GameWorld');
  if (value[1]) await validateAccount(value[1], 'PlayerState');
  if (!value[2] || value[2].owner.toString() !== solanaWeb3.SystemProgram.programId.toString()) throw new Error('Prize vault unavailable');
  const balance = lamports(value[2].lamports), floor = lamports(rent);
  return { owner, slot: context.slot, poolAddress: poolKey.toString(),
    world: decodePrizeWorld(value[0].data), player: value[1] ? decodePrizePlayer(value[1].data) : null,
    spendable: (balance > floor ? balance - floor : 0n).toString() };
}

// The signed signature is saved BEFORE broadcasting, including ambiguous RPC failures.
// This separate path leaves other transaction callers unchanged.
export async function sendPrizeClaimTransaction(snapshot, { isCurrent, onSigned }) {
  const provider = getWalletProvider();
  const owner = snapshot.owner;
  const valid = () => isCurrent() && provider?.isConnected && provider.publicKey?.toString() === owner
    && getWalletProvider() === provider;
  if (!valid()) throw new Error('Wallet changed. Refresh before claiming.');
  const fresh = await getPrizeSnapshot(owner);
  const freshQuote = prizeQuote(fresh), shownQuote = prizeQuote(snapshot);
  if (String(fresh.world.game_start_timestamp) !== String(snapshot.world.game_start_timestamp)
      || freshQuote.state !== 'claimable' || freshQuote.amount !== shownQuote.amount) throw new Error('Prize eligibility changed. Refresh the season.');
  if (!valid()) throw new Error('Claim cancelled before signing.');
  const conn = getConnection(), player = new solanaWeb3.PublicKey(owner);
  const ix = new solanaWeb3.TransactionInstruction({ programId: getProgramId(), data: await disc('claim_prize_v2'), keys: [
    { pubkey: findPlayerStatePDA(player)[0], isSigner: false, isWritable: true },
    { pubkey: findGameWorldPDA()[0], isSigner: false, isWritable: true },
    { pubkey: findPrizePoolPDA()[0], isSigner: false, isWritable: true },
    { pubkey: player, isSigner: true, isWritable: true },
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ] });
  const tx = new solanaWeb3.Transaction();
  tx.add(requestHeapFrameIx(HEAP_FRAME_BYTES), ...computeBudgetIxs(COMPUTE_BUDGET.default), ix);
  tx.feePayer = player;
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  const sim = await conn.simulateTransaction(tx);
  if (sim.value.err) throw new Error('Claim simulation failed. Refresh eligibility; no transaction was sent.');
  if (!valid()) throw new Error('Claim cancelled before signing.');
  const signed = await provider.signTransaction(tx);
  if (!valid()) throw new Error('Wallet or screen changed. No transaction was sent.');
  if (!signed.signature) throw new Error('Wallet did not sign the claim.');
  const record = { signature: encodeBase58(signed.signature), blockhash, lastValidBlockHeight,
    owner, season: String(fresh.world.game_start_timestamp), network: NETWORK, program: PROGRAM_ID };
  onSigned(record); // durable storage failure must prevent broadcasting
  try { await conn.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 5 }); }
  catch { /* Unknown broadcast outcome: retain the signature and verify; never resend blindly. */ }
  return record;
}

export async function getPrizeReceipt(record) {
  const conn = getConnection();
  const statuses = await conn.getSignatureStatuses([record.signature], { searchTransactionHistory: true });
  const status = statuses.value[0];
  if (!status) {
    return await conn.getBlockHeight('finalized') > record.lastValidBlockHeight ? { state: 'expired' } : { state: 'pending' };
  }
  if (status.confirmationStatus !== 'finalized') return { state: 'pending' };
  if (status.err) return { state: 'failed' };
  const tx = await conn.getParsedTransaction(record.signature, { commitment: 'finalized', maxSupportedTransactionVersion: 0 });
  if (!tx?.meta) return { state: 'pending' };
  if (tx.meta.err) return { state: 'failed' };
  if (!Number.isFinite(tx.blockTime) || tx.blockTime < Number(record.season)) throw new Error('Receipt does not belong to this season.');
  const expected = await disc('claim_prize_v2');
  const instructions = tx.transaction.message.instructions;
  const index = instructions.findIndex(ix => ix.programId?.toString() === PROGRAM_ID && ix.data
    && (() => { const data = decodeBase58(ix.data); return data.length === 8 && expected.every((b, i) => b === data[i]); })());
  if (index < 0) throw new Error('Transaction is not a prize claim for this game');
  const keys = tx.transaction.message.accountKeys;
  if (!keys.some(k => k.signer && k.pubkey.toString() === record.owner)) throw new Error('Prize recipient does not match');
  const pool = findPrizePoolPDA()[0].toString();
  const transfers = tx.meta.innerInstructions?.find(group => group.index === index)?.instructions ?? [];
  let received = 0n;
  for (const ix of transfers) {
    const info = ix.parsed?.info;
    if (ix.programId?.toString() === solanaWeb3.SystemProgram.programId.toString() && ix.parsed?.type === 'transfer'
        && info.source === pool && info.destination === record.owner) received += lamports(info.lamports);
  }
  if (received <= 0n) throw new Error('Prize transfer not found. Receipt is not verified.');
  return { state: 'received', amount: received.toString(), fee: lamports(tx.meta.fee).toString(), signature: record.signature };
}

export async function submitPrizeClaim(snapshot, callbacks) {
  if (!PRIZE_CLAIMS_ENABLED) throw new Error('Live prize claims are not open in this release.');
  return sendPrizeClaimTransaction(snapshot, callbacks);
}
