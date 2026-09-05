import { createPlayerSession } from './player-session.js';
import { createWalletEvents } from './wallet-events.js';
import { OPS_TREASURY_PUBKEY } from '../config.js';

// Live entry/registration and collection refresh policy. Screen rendering stays
// in the router, and no RPC dependency is imported into the practice bootstrap.
export function createLiveApp({ router, getState, setState, wasRestored,
  getWallet, getOnchain, getProvider, reload, openWalletSite, showToast: notifyToast, showTxToast }) {
  const session = createPlayerSession({ getWallet, getOnchain, setBattleState: setState });
  let generation = 0;
  const walletEvents = createWalletEvents({
    onDisconnect() { notifyToast('Wallet disconnected', 'warn'); showWallet(); },
    onAccountChanged(key) { if (key) reload(); else showWallet(); },
  });
  const current = request => request === generation;
  const owner = () => getWallet()?.getPublicKey?.()?.toString();

  function context(detail = {}) {
    return { ...getState(), playerState: session.player, gameWorld: session.world,
      pubkey: getState().playerPubkey, ...detail };
  }

  function navigate(name, detail = {}) {
    if (!router.has(name)) return false;
    if (!session.player || !session.isConnected()) { showWallet(); return false; }
    ++generation;
    return router.navigate(name, context(detail));
  }

  function showWallet(retry = false) {
    ++generation;
    session.clear();
    router.navigate('welcome', { onConnect: connect, retry });
  }

  async function connect() {
    const request = generation;
    const wallet = getWallet();
    if (!wallet) {
      openWalletSite();
      throw new Error('No wallet found — install Phantom or Solflare');
    }
    await wallet.connect();
    if (!current(request)) return;
    walletEvents.attach(getProvider());
    await start();
  }

  async function disconnect() {
    const request = generation;
    try { await getWallet()?.disconnect?.(); } catch { /* provider may already be disconnected */ }
    if (current(request)) showWallet();
  }

  async function register() {
    const request = generation;
    const pubkey = owner();
    if (!session.isConnected() || !pubkey) { showWallet(); return; }
    // Prize pool is a program PDA; only the operations treasury is external.
    const result = await getOnchain().registerWaitlist(OPS_TREASURY_PUBKEY);
    if (!current(request) || pubkey !== owner()) return;
    showTxToast('Registration confirmed', typeof result === 'string' ? result : result.signature);
    await start();
  }

  async function start() {
    const request = ++generation;
    if (!session.isConnected() || !owner()) { showWallet(); return; }
    walletEvents.attach(getProvider());
    const pubkey = owner();
    try {
      const registered = await getOnchain().checkPlayerStateExists(getWallet().getPublicKey());
      if (!current(request)) return;
      if (pubkey !== owner()) { showWallet(); return; }
      if (!registered) {
        router.navigate('register', { pubkey, onRegister: register, onDisconnect: disconnect });
        return;
      }
      if (!await session.load(() => current(request))) return;
    } catch {
      if (current(request)) showWallet(true);
      return;
    }
    if (!current(request)) return;
    if (wasRestored) {
      const { phase } = getState();
      // A reload loses the matchmaking socket. Other phases recover themselves.
      if (phase === 'matchmaking' || phase === 'main') navigate('main', { mode: 'battle' });
      else if (['preparation', 'interruption', 'reveal', 'loot'].includes(phase)) navigate(phase);
      else navigate('home');
    } else navigate('home');
  }

  async function home(detail = {}) {
    const request = ++generation;
    // Read before mounting paid controls, so a late refresh never replaces an
    // in-flight refill's lock or confirmed energy with an old cached value.
    router.navigate('home-loading');
    try {
      if (await session.load(() => current(request)) && current(request)) navigate('home', detail);
    } catch {
      if (current(request)) showWallet(true);
    }
  }

  return { start, navigate, home, showWallet,
    dispose() { ++generation; session.clear(); walletEvents.dispose(); router.dispose(); },
  };
}
