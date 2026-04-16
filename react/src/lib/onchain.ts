/**
 * 0xARK On-chain TypeScript client
 *
 * Typed wrappers around the Anchor program using @solana/web3.js.
 * Builds and returns serialized transactions for the caller to sign + submit.
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha2.js';

export const PROGRAM_ID = new PublicKey('2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3');
export const RPC_URL    = 'https://api.devnet.solana.com';

// ─── Seeds ────────────────────────────────────────────────────────────────────

const GAME_SEED        = Buffer.from('game');
const PLAYER_SEED      = Buffer.from('player');
const CARD_POOL_SEED   = Buffer.from('card_pool');
const COMMIT_SEED      = Buffer.from('commit');
const STAKE_VAULT_SEED = Buffer.from('stake_vault');
const CARD_MINT_SEED   = Buffer.from('card_mint');

// ─── PDA helpers ─────────────────────────────────────────────────────────────

export function gamePda(gameId: bigint): [PublicKey, number] {
  const gameIdBuf = Buffer.alloc(8);
  gameIdBuf.writeBigUInt64LE(gameId);
  return PublicKey.findProgramAddressSync([GAME_SEED, gameIdBuf], PROGRAM_ID);
}

export function cardPoolPda(gameId: bigint): [PublicKey, number] {
  const gameIdBuf = Buffer.alloc(8);
  gameIdBuf.writeBigUInt64LE(gameId);
  return PublicKey.findProgramAddressSync([CARD_POOL_SEED, gameIdBuf], PROGRAM_ID);
}

export function playerPda(gameId: bigint, player: PublicKey): [PublicKey, number] {
  const gameIdBuf = Buffer.alloc(8);
  gameIdBuf.writeBigUInt64LE(gameId);
  return PublicKey.findProgramAddressSync([PLAYER_SEED, gameIdBuf, player.toBuffer()], PROGRAM_ID);
}

export function commitPda(gameId: bigint, round: number, player: PublicKey): [PublicKey, number] {
  const gameIdBuf = Buffer.alloc(8);
  gameIdBuf.writeBigUInt64LE(gameId);
  return PublicKey.findProgramAddressSync(
    [COMMIT_SEED, gameIdBuf, Buffer.from([round]), player.toBuffer()],
    PROGRAM_ID,
  );
}

export function stakeVaultPda(gameId: bigint): [PublicKey, number] {
  const gameIdBuf = Buffer.alloc(8);
  gameIdBuf.writeBigUInt64LE(gameId);
  return PublicKey.findProgramAddressSync([STAKE_VAULT_SEED, gameIdBuf], PROGRAM_ID);
}

export function cardMintPda(gameId: bigint, cardId: number): [PublicKey, number] {
  const gameIdBuf = Buffer.alloc(8);
  gameIdBuf.writeBigUInt64LE(gameId);
  return PublicKey.findProgramAddressSync(
    [CARD_MINT_SEED, gameIdBuf, Buffer.from([cardId])],
    PROGRAM_ID,
  );
}

// ─── Discriminators ───────────────────────────────────────────────────────────

function disc(name: string): Buffer {
  return Buffer.from(sha256(new TextEncoder().encode(`global:${name}`))).subarray(0, 8);
}

// ─── Transaction builders ─────────────────────────────────────────────────────

/** Build a create_game transaction (unsigned). */
export function buildCreateGameTx(
  player: PublicKey,
  gameId: bigint,
  maxPlayers: number,
): Transaction {
  const [game]     = gamePda(gameId);
  const [cardPool] = cardPoolPda(gameId);

  const gameIdBuf = Buffer.alloc(8);
  gameIdBuf.writeBigUInt64LE(gameId);
  const data = Buffer.concat([disc('create_game'), gameIdBuf, Buffer.from([maxPlayers])]);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: game,             isSigner: false, isWritable: true  },
      { pubkey: cardPool,         isSigner: false, isWritable: true  },
      { pubkey: player,           isSigner: true,  isWritable: true  },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  return new Transaction().add(ix);
}

/** Build a join_game transaction (unsigned). */
export function buildJoinGameTx(player: PublicKey, gameId: bigint): Transaction {
  const [game]        = gamePda(gameId);
  const [playerState] = playerPda(gameId, player);

  const gameIdBuf = Buffer.alloc(8);
  gameIdBuf.writeBigUInt64LE(gameId);
  const data = Buffer.concat([disc('join_game'), gameIdBuf]);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: game,        isSigner: false, isWritable: true },
      { pubkey: playerState, isSigner: false, isWritable: true },
      { pubkey: player,      isSigner: true,  isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  return new Transaction().add(ix);
}

/** Build a deposit_stake transaction (unsigned). */
export function buildDepositStakeTx(player: PublicKey, gameId: bigint): Transaction {
  const [game]       = gamePda(gameId);
  const [stakeVault] = stakeVaultPda(gameId);

  const gameIdBuf = Buffer.alloc(8);
  gameIdBuf.writeBigUInt64LE(gameId);
  const data = Buffer.concat([disc('deposit_stake'), gameIdBuf]);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: game,       isSigner: false, isWritable: false },
      { pubkey: stakeVault, isSigner: false, isWritable: true  },
      { pubkey: player,     isSigner: true,  isWritable: true  },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  return new Transaction().add(ix);
}

/** Build a commit_action transaction (unsigned). */
export function buildCommitActionTx(
  player: PublicKey,
  gameId: bigint,
  round: number,
  commitHash: Uint8Array,
): Transaction {
  const [game]        = gamePda(gameId);
  const [playerState] = playerPda(gameId, player);
  const [commit]      = commitPda(gameId, round, player);

  const gameIdBuf = Buffer.alloc(8);
  gameIdBuf.writeBigUInt64LE(gameId);
  const data = Buffer.concat([disc('commit_action'), gameIdBuf, Buffer.from(commitHash)]);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: game,        isSigner: false, isWritable: true },
      { pubkey: playerState, isSigner: false, isWritable: true },
      { pubkey: commit,      isSigner: false, isWritable: true },
      { pubkey: player,      isSigner: true,  isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  return new Transaction().add(ix);
}

// ─── SHA-256 commit hash (mirrors on-chain verify) ────────────────────────────

export function computeCommitHash(
  actionType: number,
  target: PublicKey,
  salt: Uint8Array,
): Uint8Array {
  const combined = new Uint8Array(1 + 32 + salt.length);
  combined[0] = actionType;
  combined.set(target.toBytes(), 1);
  combined.set(salt, 33);
  return sha256(combined);
}

// ─── On-chain state queries ───────────────────────────────────────────────────

export interface GameState {
  gameId: bigint;
  host: PublicKey;
  status: number;   // 0=Lobby 1=CommitPhase 2=RevealPhase 3=Finished
  round: number;
  maxPlayers: number;
  playerCount: number;
}

/** Read on-chain game account. Returns null if account doesn't exist. */
export async function fetchGameState(
  connection: Connection,
  gameId: bigint,
): Promise<GameState | null> {
  const [game] = gamePda(gameId);
  const info   = await connection.getAccountInfo(game);
  if (!info) return null;

  // Layout after 8-byte discriminator:
  // game_id: u64 (8), host: Pubkey (32), status: u8 (1), round: u8 (1),
  // max_players: u8 (1), player_count: u8 (1), ...
  const d = info.data;
  const offset = 8;
  return {
    gameId:      d.readBigUInt64LE(offset),
    host:        new PublicKey(d.slice(offset + 8, offset + 40)),
    status:      d[offset + 40],
    round:       d[offset + 41],
    maxPlayers:  d[offset + 42],
    playerCount: d[offset + 43],
  };
}

export const STATUS_LABELS: Record<number, string> = {
  0: 'Lobby',
  1: 'Commit Phase',
  2: 'Reveal Phase',
  3: 'Finished',
};

/** Fetch all card NFT mints owned by a wallet (by querying card_mint PDAs). */
export async function fetchOwnedCards(
  connection: Connection,
  gameId: bigint,
  _owner: PublicKey,
): Promise<number[]> {
  // Check card_mint PDAs for cardId 1–60, filter those owned by `owner`
  const owned: number[] = [];
  // Batch in groups of 10 to avoid rate limiting
  for (let start = 1; start <= 60; start += 10) {
    const batch = Array.from({ length: Math.min(10, 61 - start) }, (_, i) => start + i);
    const infos = await connection.getMultipleAccountsInfo(
      batch.map(id => cardMintPda(gameId, id)[0]),
    );
    infos.forEach((info, i) => {
      if (info && info.data.length > 0) owned.push(batch[i]);
    });
  }
  return owned;
}
