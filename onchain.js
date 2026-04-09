/**
 * 0xARK On-Chain Transaction Module
 *
 * Handles all Solana transaction building and sending.
 * Works with Phantom wallet connection from wallet.js.
 *
 * Usage: Include after wallet.js in index.html, then call:
 *   await oxarkOnchain.createGame(gameId, maxPlayers)
 *   await oxarkOnchain.joinGame(gameId)
 *   await oxarkOnchain.startGame(gameId, playerPDAs)
 *   await oxarkOnchain.commitAction(gameId, actionType, target, salt)
 *   await oxarkOnchain.revealAction(gameId, actionType, target, salt)
 *   await oxarkOnchain.resolveRound(gameId, playerPDAs)
 */

const PROGRAM_ID = '3QEaocNMYiAMSqxXhnyBSzpcn3kjnzumrfGS67Gbbwum';
const DEVNET_RPC = 'https://api.devnet.solana.com';

// Seed constants (must match Anchor program)
const GAME_SEED = new TextEncoder().encode('game');
const PLAYER_SEED = new TextEncoder().encode('player');
const CARD_POOL_SEED = new TextEncoder().encode('card_pool');
const COMMIT_SEED = new TextEncoder().encode('commit');

// Find PDA helper
function findPDA(seeds, programId) {
  // In production, use @solana/web3.js PublicKey.findProgramAddressSync
  // For now, this is a placeholder that would be replaced with actual PDA derivation
  return { pubkey: null, bump: 0 };
}

// Build and send transaction via Phantom
async function sendTransaction(instruction) {
  if (!window.solana || !window.solana.isPhantom) {
    throw new Error('Phantom wallet not connected');
  }

  const connection = new (await import('https://esm.sh/@solana/web3.js')).Connection(DEVNET_RPC);
  const { Transaction, SystemProgram } = await import('https://esm.sh/@solana/web3.js');

  const tx = new Transaction();
  tx.add(instruction);
  tx.feePayer = window.solana.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  const signed = await window.solana.signTransaction(tx);
  const sig = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(sig, 'confirmed');

  return sig;
}

// Compute SHA256 hash for commit-reveal
async function computeCommitHash(actionType, targetPubkeyBytes, salt) {
  const data = new Uint8Array(1 + 32 + 32);
  data[0] = actionType;
  data.set(targetPubkeyBytes, 1);
  data.set(salt, 33);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}

function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(32));
}

// Game state reading
async function readGameAccount(gameId) {
  try {
    const connection = new (await import('https://esm.sh/@solana/web3.js')).Connection(DEVNET_RPC);
    const { PublicKey } = await import('https://esm.sh/@solana/web3.js');
    const programPubkey = new PublicKey(PROGRAM_ID);

    const [gamePDA] = PublicKey.findProgramAddressSync(
      [GAME_SEED, new Uint8Array(new BigUint64Array([BigInt(gameId)]).buffer)],
      programPubkey
    );

    const accountInfo = await connection.getAccountInfo(gamePDA);
    if (!accountInfo) return null;

    // Parse Game struct from account data (skip 8-byte discriminator)
    const data = accountInfo.data;
    return {
      gameId: Number(new DataView(data.buffer).getBigUint64(8, true)),
      // host: data.slice(16, 48), // 32 bytes pubkey
      status: data[48], // 0=Lobby, 1=CommitPhase, 2=RevealPhase, 3=Finished
      round: data[49],
      maxRounds: data[50],
      playerCount: data[51],
      maxPlayers: data[52],
      cardsInPool: data[53],
      // winner: data.slice(54, 86), // 32 bytes pubkey
      commitCount: data[86],
      revealCount: data[87],
    };
  } catch (e) {
    console.error('Failed to read game account:', e);
    return null;
  }
}

async function readPlayerState(gameId, playerPubkey) {
  try {
    const connection = new (await import('https://esm.sh/@solana/web3.js')).Connection(DEVNET_RPC);
    const { PublicKey } = await import('https://esm.sh/@solana/web3.js');
    const programPubkey = new PublicKey(PROGRAM_ID);

    const [playerPDA] = PublicKey.findProgramAddressSync(
      [PLAYER_SEED, new Uint8Array(new BigUint64Array([BigInt(gameId)]).buffer), new PublicKey(playerPubkey).toBuffer()],
      programPubkey
    );

    const accountInfo = await connection.getAccountInfo(playerPDA);
    if (!accountInfo) return null;

    const data = accountInfo.data;
    // Skip 8 disc + 8 game_id + 32 player + 1 index + 1 area
    const offset = 8 + 8 + 32 + 1 + 1;
    return {
      area: data[8 + 8 + 32 + 1],
      cards: Array.from(data.slice(offset, offset + 5)),
      cardCount: data[offset + 5],
      stealCount: data[offset + 6],
      barrierCount: data[offset + 7],
      scoutCount: data[offset + 8],
      hasCommitted: !!data[offset + 9],
      hasRevealed: !!data[offset + 10],
    };
  } catch (e) {
    console.error('Failed to read player state:', e);
    return null;
  }
}

// Export
window.oxarkOnchain = {
  PROGRAM_ID,
  computeCommitHash,
  generateSalt,
  readGameAccount,
  readPlayerState,
  sendTransaction,
};

console.log('0xARK on-chain module loaded. Program ID:', PROGRAM_ID);
