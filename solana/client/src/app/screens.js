import { mount as mountHome,         unmount as unmountHome         } from '../components/home-screen.js';
import { mount as mountShop,         unmount as unmountShop         } from '../components/shop-screen.js';
import { mount as mountTrade,        unmount as unmountTrade        } from '../components/trade-screen.js';
import { mount as mountMain,         unmount as unmountMain         } from '../components/main-screen.js';
import { mount as mountPrep,         unmount as unmountPrep         } from '../components/preparation.js';
import { mount as mountIntr,         unmount as unmountIntr         } from '../components/interruption.js';
import { mount as mountReveal,       unmount as unmountReveal       } from '../components/reveal.js';
import { mount as mountLoot,         unmount as unmountLoot         } from '../components/loot.js';
import { mountWallet, mountRegister, unmount as unmountEntry } from '../components/entry-screens.js';
import { mountPracticeMenu } from './practice.js';

export const GAME_ROUTES = ['home', 'shop', 'trade', 'main', 'matchmaking',
  'preparation', 'interruption', 'reveal', 'loot'];

export const SCREENS = {
  menu: { mount: mountPracticeMenu },
  home:          { mount: mountHome,   unmount: unmountHome   },
  shop:          { mount: mountShop,   unmount: unmountShop   },
  trade:         { mount: mountTrade,  unmount: unmountTrade  },
  main:          { mount: mountMain,   unmount: unmountMain, defaults: { mode: 'vault' } },
  matchmaking:   { mount: mountMain,   unmount: unmountMain, defaults: { mode: 'battle' } },
  preparation:   { mount: mountPrep,   unmount: unmountPrep   },
  interruption:  { mount: mountIntr,   unmount: unmountIntr   },
  reveal:        { mount: mountReveal, unmount: unmountReveal },
  loot:          { mount: mountLoot,   unmount: unmountLoot   },
  welcome: { mount: mountWallet, unmount: unmountEntry },
  register: { mount: mountRegister, unmount: unmountEntry },
  'home-loading': { mount(container) {
    container.innerHTML = '<div id="app-loading" role="status"><div class="load-logo">0xARK</div><p class="load-sub">LOADING YOUR COLLECTION…</p></div>';
  } },
};
