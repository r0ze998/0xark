// Phantom Wallet Integration for 0xARK
// This module handles wallet connection and transaction signing

const PROGRAM_ID = '5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN';
const DEVNET_RPC = 'https://api.devnet.solana.com';

let walletConnected = false;
let walletPublicKey = null;

async function connectPhantom() {
  if (!window.solana || !window.solana.isPhantom) {
    alert('Phantom wallet not found. Install it from phantom.app');
    return null;
  }
  try {
    const resp = await window.solana.connect();
    walletConnected = true;
    walletPublicKey = resp.publicKey.toString();
    console.log('Connected:', walletPublicKey);
    return walletPublicKey;
  } catch (err) {
    console.error('Wallet connection failed:', err);
    return null;
  }
}

async function disconnectPhantom() {
  if (window.solana) {
    await window.solana.disconnect();
    walletConnected = false;
    walletPublicKey = null;
  }
}

// Compute SHA256 hash for commit-reveal (matches on-chain verification)
async function computeCommitHash(actionType, targetPubkey, salt) {
  const data = new Uint8Array(1 + 32 + 32);
  data[0] = actionType;

  // Target pubkey (32 bytes)
  const targetBytes = new Uint8Array(32);
  if (targetPubkey) {
    // Convert base58 pubkey to bytes (simplified — use @solana/web3.js in production)
    const decoded = base58Decode(targetPubkey);
    targetBytes.set(decoded.slice(0, 32));
  }
  data.set(targetBytes, 1);

  // Salt (32 bytes)
  data.set(salt, 33);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(32));
}

// Simple base58 decoder (for pubkey conversion)
function base58Decode(str) {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const BASE = 58;
  let result = [0];
  for (const char of str) {
    let carry = ALPHABET.indexOf(char);
    if (carry === -1) throw new Error('Invalid base58 character');
    for (let j = 0; j < result.length; j++) {
      carry += result[j] * BASE;
      result[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      result.push(carry & 0xff);
      carry >>= 8;
    }
  }
  // Leading zeros
  for (const char of str) {
    if (char !== '1') break;
    result.push(0);
  }
  return new Uint8Array(result.reverse());
}

// Export for use in main game
window.oxarkWallet = {
  connect: connectPhantom,
  disconnect: disconnectPhantom,
  isConnected: () => walletConnected,
  getPublicKey: () => walletPublicKey,
  computeCommitHash,
  generateSalt,
  PROGRAM_ID,
};
