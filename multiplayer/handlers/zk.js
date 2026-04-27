// handlers/zk.js — submit_tx: relay client-signed transactions to Solana RPC

import { VersionedTransaction, Transaction } from '@solana/web3.js';
import { rooms, connection, COMMITMENT, send, broadcast, extractError } from '../state.js';

export async function _handleSubmitTx(ws, msg) {
  const room = ws.roomId ? rooms.get(ws.roomId) : null;
  if (!room) return;

  let txBuffer;
  try {
    txBuffer = Buffer.from(msg.txBase64, 'base64');
  } catch {
    send(ws, { type: 'tx_failed', error: 'Invalid base64 encoding', txType: msg.txType, playerId: ws.playerId });
    return;
  }

  // Support both versioned and legacy transactions
  let tx;
  try {
    tx = VersionedTransaction.deserialize(txBuffer);
  } catch {
    try {
      tx = Transaction.from(txBuffer);
    } catch {
      send(ws, { type: 'tx_failed', error: 'Cannot deserialize transaction', txType: msg.txType, playerId: ws.playerId });
      return;
    }
  }
  void tx; // deserialized for validation; sendRawTransaction takes the raw buffer

  try {
    const sig = await connection.sendRawTransaction(txBuffer, {
      skipPreflight: false,
      preflightCommitment: COMMITMENT,
      maxRetries: 3,
    });
    await connection.confirmTransaction(sig, COMMITMENT);
    broadcast(room, { type: 'tx_confirmed', sig, txType: msg.txType ?? 'unknown', playerId: ws.playerId });
  } catch (e) {
    const error = extractError(e);
    send(ws, { type: 'tx_failed', error, txType: msg.txType ?? 'unknown', playerId: ws.playerId });
    broadcast(room, { type: 'tx_failed', error: 'Transaction failed', txType: msg.txType ?? 'unknown', playerId: ws.playerId }, ws.playerId);
  }
}
