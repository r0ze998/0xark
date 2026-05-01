// app.js — Phase 15 battle UI entry point + screen router
// Screens: main → preparation → interruption → reveal → loot → main

import { mount as mountMain,         unmount as unmountMain         } from './src/components/main-screen.js';
import { mount as mountPrep,         unmount as unmountPrep         } from './src/components/preparation.js';
import { mount as mountIntr,         unmount as unmountIntr         } from './src/components/interruption.js';
import { mount as mountReveal,       unmount as unmountReveal       } from './src/components/reveal.js';
import { mount as mountLoot,         unmount as unmountLoot         } from './src/components/loot.js';
import { getState } from './src/state/battle-state.js';

const SCREENS = {
  main:          { mount: mountMain,   unmount: unmountMain   },
  matchmaking:   { mount: mountMain,   unmount: unmountMain   },
  preparation:   { mount: mountPrep,   unmount: unmountPrep   },
  interruption:  { mount: mountIntr,   unmount: unmountIntr   },
  reveal:        { mount: mountReveal, unmount: unmountReveal },
  loot:          { mount: mountLoot,   unmount: unmountLoot   },
};

let _currentScreen = null;
let _currentUnmount = null;

function navigate(name, detail = {}) {
  const app = document.getElementById('app');
  if (!app) return;

  if (_currentUnmount) {
    _currentUnmount(app);
    _currentUnmount = null;
  }

  const screen = SCREENS[name];
  if (!screen) { console.warn('Unknown screen:', name); return; }

  _currentScreen  = name;
  _currentUnmount = screen.unmount;
  screen.mount(app, { ...getState(), ...detail });
}

// Navigation event listeners
document.addEventListener('nav:main',         e => navigate('main',         e.detail ?? {}));
document.addEventListener('nav:matchmaking',  e => navigate('matchmaking',  e.detail ?? {}));
document.addEventListener('nav:preparation',  e => navigate('preparation',  e.detail ?? {}));
document.addEventListener('nav:interruption', e => navigate('interruption', e.detail ?? {}));
document.addEventListener('nav:reveal',       e => navigate('reveal',       e.detail ?? {}));
document.addEventListener('nav:loot',         e => navigate('loot',         e.detail ?? {}));

// Boot
document.addEventListener('DOMContentLoaded', () => {
  // Attempt wallet auto-connect
  if (window.oxarkWallet?.isConnected?.()) {
    const pub = window.oxarkWallet.getPublicKey?.()?.toString() ?? '';
    navigate('main', { pubkey: pub, vault: getDemoVault() });
  } else {
    navigate('main', { vault: getDemoVault() });
  }
});

// Demo vault for local testing — first 30 cards owned
function getDemoVault() {
  return Array.from({ length: 30 }, (_, i) => i + 1);
}
