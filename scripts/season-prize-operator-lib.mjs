import { decodePrizePlayer } from '../solana/client/src/lib/season-prize.js';
import { encodeBase58 } from '../solana/client/src/lib/base58.js';

export function operatorPlayerOwner(data) {
  // PlayerState starts with discriminator(8), game_id(u64), then player(Pubkey).
  // Derive the PDA from this owner, never from the game_id-prefixed bytes.
  if (data.length < 48) throw new Error('Incomplete player identity');
  return encodeBase58(data.subarray(16, 48));
}

export function decodeOperatorPlayer(data) {
  return { ...decodePrizePlayer(data), owner: operatorPlayerOwner(data) };
}
