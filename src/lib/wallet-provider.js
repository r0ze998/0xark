// One provider for connection, events, messages and transactions.
export function detectWalletProvider(scope = window) {
  if (scope.phantom?.solana?.isPhantom) return scope.phantom.solana;
  if (scope.solflare?.isSolflare) return scope.solflare;
  return scope.solana ?? null;
}

export function getWalletProvider(scope = window) {
  return scope.oxarkWallet?.provider ?? detectWalletProvider(scope);
}

export async function signWalletMessage(provider, message) {
  const result = await provider.signMessage(message, 'utf8');
  const signature = result?.signature ?? result; // Phantom / Solflare respectively
  if (!(signature instanceof Uint8Array) || signature.length !== 64) throw new Error('Wallet returned an invalid message signature');
  return signature;
}
