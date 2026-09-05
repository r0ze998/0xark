// Runtime has already selected live or isolated practice adapters.
// This entrypoint only assembles the application and starts it.
import { getState, setState, wasRestored } from './src/state/battle-state.js';
import { injectPxIconSheet } from './src/lib/px-icons.js';
import { showToast, showTxToast } from './src/lib/ui-shared.js';
import { mountArchiveShell, setArchiveScreen } from './src/lib/archive-shell.js';
import { isPractice } from './src/lib/practice-mode.js';
import { injectEntryCSS } from './src/components/entry-screens.js';
import { SCREENS, GAME_ROUTES } from './src/app/screens.js';
import { createScreenRouter, listenForNavigation } from './src/app/router.js';
import { createLiveApp } from './src/app/live-app.js';
import { createPracticeApp } from './src/app/practice.js';

injectPxIconSheet();
injectEntryCSS(); // Shared toasts also work with an already connected wallet.
mountArchiveShell(isPractice);
const router = createScreenRouter({ container: document.getElementById('app'),
  screens: SCREENS, onChange: setArchiveScreen });
const application = isPractice
  ? createPracticeApp({ router, getState, setState, search: location.search })
  : createLiveApp({ router, getState, setState, wasRestored,
      getWallet: () => window.oxarkWallet,
      getOnchain: () => window.oxarkOnchain,
      getProvider: () => {
        const phantom = window.phantom?.solana;
        const solflare = window.solflare;
        return phantom?.isPhantom ? phantom : solflare?.isSolflare ? solflare : null;
      },
      reload: () => window.location.reload(),
      openWalletSite: () => window.open('https://phantom.app/', '_blank', 'noopener'),
      showToast, showTxToast,
    });

listenForNavigation(document, {
  ...Object.fromEntries(GAME_ROUTES.map(name => [name, detail => application.navigate(name, detail)])),
  home: detail => application.home(detail),
  'wallet-required': () => application.showWallet(),
});
application.start();
