// Wallet-owned collection cache. A failed read never becomes a demo collection.
// Dependencies are supplied by the entrypoint so races can be tested without RPC.
export function createPlayerSession({ getWallet, getOnchain, setBattleState }) {
  let player = null;
  let world = null;
  let generation = 0;

  return {
    get player() { return player; },
    get world() { return world; },
    isConnected() { return !!getWallet()?.isConnected?.(); },
    clear() {
      ++generation;
      player = null;
      world = null;
    },
    async load(isCurrent = () => true) {
      const request = ++generation;
      const pubkey = getWallet()?.getPublicKey?.();
      const owner = pubkey?.toString();
      const onchain = getOnchain();
      if (!owner || !onchain?.getPlayerState) throw new Error('Collection connection unavailable');
      const [playerRead, worldRead] = await Promise.allSettled([
        onchain.getPlayerState(pubkey),
        onchain.getGameWorld?.(),
      ]);
      // Validate BEFORE committing either the cache or persistent battle state.
      if (request !== generation || !isCurrent()) return false;
      if (!getWallet()?.isConnected?.() || owner !== getWallet()?.getPublicKey?.()?.toString()) {
        throw new Error('Wallet changed while loading');
      }
      if (playerRead.status !== 'fulfilled' || !Array.isArray(playerRead.value?.vault)) {
        throw new Error('Could not load your collection');
      }
      player = playerRead.value;
      world = worldRead.status === 'fulfilled' ? worldRead.value ?? null : null;
      setBattleState({ vault: player.vault, playerPubkey: owner });
      return true;
    },
  };
}
