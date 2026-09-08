// Runtime has already selected live or isolated practice adapters.
// This entrypoint only assembles the application and starts it.
import { getState, setState, wasRestored } from './src/state/battle-state.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';
import { injectPxIconSheet } from './src/lib/px-icons.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';
import { showToast, showTxToast } from './src/lib/ui-shared.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';
import { mountArchiveShell, setArchiveScreen } from './src/lib/archive-shell.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';
import { isPractice } from './src/lib/practice-mode.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';
import { injectEntryCSS } from './src/components/entry-screens.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';
import { SCREENS, GAME_ROUTES } from './src/app/screens.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';
import { createScreenRouter, listenForNavigation } from './src/app/router.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';
import { createLiveApp } from './src/app/live-app.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';
import { createPracticeApp } from './src/app/practice.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';
import { getWalletProvider } from './src/lib/wallet-provider.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';

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
      getProvider: getWalletProvider,
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
