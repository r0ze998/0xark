import { practicePlayer, practiceOpponent, PRACTICE_PLAYER } from '../lib/practice-mode.js';

const PRACTICE_VIEWS = [['home','The Archive','Your next duel starts here.'],['main','Your collection','Explore six factions and inspect each card.'],['preparation','Build your hand','Select five cards. Choose their actions.'],['interruption','The sealed table','Study your opponent before the reveal.'],['reveal','The confrontation','See actions resolve on the battlefield.'],['loot','Victory','The duel recap and return to your collection.'],['loss','Defeat','A different ending. A chance to rethink your hand.'],['shop','Sealed packs','Try the opening ceremony. No purchase.'],['trade','The exchange','Browse the market interface. Trading is disabled.'],['card-detail','Card study','Art, statistics and abilities in one place.']];
export function mountPracticeMenu(container) {
  container.innerHTML = '<main class="archive-gallery"><p class="archive-eyebrow">0xARK / DESIGN STUDY 01</p><h1>The Drowned Archive</h1><p>A playable, isolated practice build. Sample cards only. No wallet, payments or live opponents.</p><div class="archive-gallery-grid">' + PRACTICE_VIEWS.map(([route,title,desc],i) => '<a href="?devview='+route+'"><span>0'+(i+1)+'</span><h2>'+title+'</h2><p>'+desc+'</p><b>Explore ↗</b></a>').join('') + '</div></main>';
}

// Fixtures belong only to explicit practice startup. Live adapters and storage
// isolation are selected by runtime.js before this application is imported.
export function createPracticeApp({ router, getState, setState, search }) {
  const view = new URLSearchParams(search).get('devview') || 'home';
  const playerState = practicePlayer();
  const gameWorld = { game_start_timestamp: Math.floor(Date.now() / 1000) - 3 * 86400 };
  function navigate(name, detail = {}) {
    return router.navigate(name, { ...getState(), playerState, gameWorld,
      pubkey: getState().playerPubkey, ...detail });
  }
  function start() {
    const field = [5, 18, 30, 43, 60].map((cardId, i) => ({ cardId, actionType: i }));
    setState({
      phase: 'main', playerPubkey: PRACTICE_PLAYER, vault: playerState.vault,
      isHost: true, duelP1IsMe: true, duelId: null, matchId: null, round: 1,
      fieldCards: field, opponentField: practiceOpponent(), hasPeeked: false,
      isWinner: true, p1RoundWins: 3, p2RoundWins: 1,
      battleResult: { winner: 'p1', log: [] },
    });
    if (!['loot', 'loss'].includes(view)) setState({ p1RoundWins: 0, p2RoundWins: 0 });

    if (view === 'menu') navigate('menu');
    else if (view === 'card-detail') {
      navigate('main', { mode: 'vault' });
      const revision = router.revision;
      import('../components/card-detail.js').then(({ CardDetailModal }) => {
        if (router.current !== 'main' || router.revision !== revision) return;
        CardDetailModal.show(document.querySelector('.ms-root'), 30, {});
      });
    } else if (view === 'loss') {
      setState({ isWinner: false, p1RoundWins: 1, p2RoundWins: 3, battleResult: { winner: 'p2', log: [] } });
      navigate('loot');
    } else {
      navigate(view === 'matchmaking' || PRACTICE_VIEWS.some(([name]) => name === view) ? view : 'home');
    }
  }
  return { start, navigate, home: detail => navigate('home', detail),
    showWallet: () => navigate('home'), dispose: () => router.dispose() };
}
