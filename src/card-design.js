import { ArchiveCardStudy } from './components/common/ArchiveCardStudy.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';
import { ALL_CARD_IDS, getCard } from './lib/cards.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';
import { FACTION_NAMES } from './components/common/Card.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';
import { injectPxIconSheet } from './lib/px-icons.js?v=77ad227ec8af177423afb2231a00ef4e30b5a65e';

injectPxIconSheet();
document.querySelector('#hero-card').innerHTML = ArchiveCardStudy({ id: 40 });
document.querySelector('#faction-gallery').innerHTML = FACTION_NAMES.map((name, i) => `<figure>${ArchiveCardStudy({ id: (i + 1) * 10 })}<figcaption><span>0${i + 1}</span>${name}</figcaption></figure>`).join('');
document.querySelector('#state-gallery').innerHTML = [
  ['Ready', { id: 1 }], ['Hand selected', { id: 1, selected: true, action: 1 }],
  ['Damage received', { id: 1, hp: 3, action: 1 }], ['Knocked out', { id: 1, hp: 0, destroyed: true, action: 1 }], ['Sealed', { hidden: true }],
].map(([label, options]) => `<figure>${ArchiveCardStudy(options)}<figcaption>${label}</figcaption></figure>`).join('');
const filter = document.querySelector('#faction-filter');
FACTION_NAMES.forEach((name, index) => filter.add(new Option(name, index)));
const gallery = document.querySelector('#catalog-gallery');
function renderCatalog() {
  const ids = ALL_CARD_IDS.filter(id => filter.value === 'all' || getCard(id).faction === Number(filter.value));
  gallery.innerHTML = ids.map(id => ArchiveCardStudy({ id })).join('');
  document.querySelector('#catalog-count').textContent = `${ids.length} cards · Catalog statistics`;
}
filter.addEventListener('change', renderCatalog);
document.querySelector('#card-size').addEventListener('change', event => gallery.style.setProperty('--card-width', `${event.target.value}px`));
renderCatalog();
