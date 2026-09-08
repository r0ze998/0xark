// A practice session is memory-only and may never consume live wallet adapters.
export function practiceEnabled(search = '', previewOnly = false) {
  return previewOnly === true || new URLSearchParams(search).has('devview');
}
export const isPractice = practiceEnabled(
  typeof location === 'undefined' ? '' : location.search,
  typeof window === 'undefined' ? false : window.OXARK_PREVIEW_ONLY,
);
export const PRACTICE_VAULT = Object.freeze([1, 3, 5, 8, 10, 11, 13, 15, 18, 20, 21, 23, 25, 28, 30, 31, 33, 35, 38, 40, 41, 43, 45, 48, 50, 51, 53, 55, 58, 60]);
export const PRACTICE_PLAYER = 'Practice';
export function practicePlayer() {
  return { vault: [...PRACTICE_VAULT], vault_count: PRACTICE_VAULT.length, energy: 5, energyLastTs: Math.floor(Date.now() / 1000) };
}
export function practiceOpponent(round = 1) {
  const hands = [[3, 15, 28, 41, 55], [8, 20, 33, 45, 58], [10, 23, 38, 48, 51], [5, 18, 30, 43, 60], [1, 25, 35, 40, 50]];
  return hands[(round - 1) % hands.length].map((cardId, i) => ({ cardId, actionType: (i + round - 1) % 5 }));
}
export function createPracticeAdapters() {
  const unavailable = async () => { throw new Error('Wallet actions are disabled in practice. No transaction was sent.'); };
  const reads = {
    getPlayerState: async () => practicePlayer(),
    getGameWorld: async () => ({ game_start_timestamp: Math.floor(Date.now() / 1000) - 3 * 86400 }),
    getOwnedCardMints: async () => new Map(),
    fetchAllListings: async () => [],
    getConnection: () => null,
  };
  const onchain = new Proxy(Object.freeze(reads), {
    get: (target, key) => key === 'then' || typeof key === 'symbol' ? undefined : target[key] ?? unavailable,
    set: () => false,
  });
  const wallet = Object.freeze({ isConnected: () => true, getPublicKey: () => PRACTICE_PLAYER,
    getPublicKeyString: () => PRACTICE_PLAYER, connect: unavailable, disconnect: async () => {},
    signTransaction: unavailable, signAllTransactions: unavailable, signMessage: unavailable });
  return { onchain, wallet };
}
