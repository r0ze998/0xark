import { ALL_CARD_IDS, getCard, MERGE_RECIPES } from './lib/cards.js';
import { CardFrameHTML, CARD_NAMES, FACTION_NAMES, injectCardCSS } from './components/common/Card.js';
import { ART_BRIEFS, cardArtUrl } from './lib/card-art-briefs.js';

// This gallery uses catalog data and the game's shared frame. It has no wallet,
// runtime, transaction or multiplayer imports. It shares the approved game art.
injectCardCSS();

const RARITIES = ['Common', 'Uncommon', 'Rare', 'Legendary'];
const FACTION_MATERIALS = ['青鋼・象牙', '真鍮・羊皮紙', '赤錆・縄', '菫色・レンズ', 'セージ・祈り石', '銅・潮力機構'];
const byId = new Map(ART_BRIEFS.map(brief => [brief.id, brief]));
const loadedIds = new Set();
const failedIds = new Set();
const grid = document.querySelector('#art-grid');
const factionFilter = document.querySelector('#art-faction');
const rarityFilter = document.querySelector('#art-rarity');
const dialog = document.querySelector('#art-dialog');
let visibleIds = [...ALL_CARD_IDS];
let detailId = null;
let opener = null;

FACTION_NAMES.forEach((name, index) => factionFilter.add(new Option(name, index)));
RARITIES.forEach((name, index) => rarityFilter.add(new Option(name, index)));
document.querySelector('#faction-counts').replaceChildren(...FACTION_NAMES.map((name, index) => {
  const count = ALL_CARD_IDS.filter(id => getCard(id).faction === index).length;
  const item = document.createElement('div');
  const title = document.createElement('span');
  const material = document.createElement('small');
  title.textContent = `${name} / ${count}`;
  material.textContent = FACTION_MATERIALS[index];
  item.append(title, material);
  return item;
}));

function updateProgress() {
  const missing = failedIds.size ? ` · ${failedIds.size}枚は準備中` : '';
  document.querySelector('#art-progress').textContent = `画像 ${loadedIds.size} / ${ALL_CARD_IDS.length}枚 読み込み済み${missing}`;
}

function prepareImage(image, id, host, { eager = false } = {}) {
  const status = document.createElement('span');
  status.className = 'art-image-status';
  status.textContent = 'アートを読み込み中';
  host.dataset.artState = 'loading';
  failedIds.delete(id);
  // Keep a layout box while loading: display:none prevents a lazy image from
  // entering the viewport and can leave every card waiting indefinitely.
  image.style.opacity = '0';
  image.loading = eager ? 'eager' : 'lazy';
  image.decoding = 'async';
  image.alt = '';
  image.addEventListener('load', () => {
    // Filters detach entire cards; dialog navigation reuses the media host.
    // Neither request may change the current gallery after it is superseded.
    if (!image.isConnected || image.parentElement !== host) return;
    image.style.opacity = '1';
    status.hidden = true;
    host.dataset.artState = 'ready';
    loadedIds.add(id);
    failedIds.delete(id);
    updateProgress();
  }, { once: true });
  image.addEventListener('error', () => {
    if (!image.isConnected || image.parentElement !== host) return;
    image.style.opacity = '0';
    status.hidden = false;
    status.textContent = 'アート準備中';
    host.dataset.artState = 'pending';
    failedIds.add(id);
    loadedIds.delete(id);
    updateProgress();
  }, { once: true });
  // Set the unique candidate URL before this element enters the document.
  // A missing illustration must never be replaced by the old faction portrait.
  image.src = cardArtUrl(id);
  host.append(status);
  updateProgress();
}

function makeCard(id) {
  const brief = byId.get(id);
  const item = document.createElement('article');
  item.className = 'art-item';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'art-card-button';
  button.setAttribute('aria-label', `${CARD_NAMES[id]}のアートと制作意図を見る`);

  // Keep the frame inert until loading listeners and status are attached.
  const template = document.createElement('template');
  template.innerHTML = CardFrameHTML({ id });
  const frame = template.content.firstElementChild;
  const portrait = frame.querySelector('.art-window');
  prepareImage(frame.querySelector('.card-art-img'), id, portrait);
  button.append(frame);
  button.addEventListener('click', () => openDetail(id, button));

  const caption = document.createElement('div');
  caption.className = 'art-caption';
  const number = document.createElement('span');
  number.className = 'art-caption-number';
  number.textContent = String(id).padStart(3, '0');
  const name = document.createElement('h3');
  name.textContent = CARD_NAMES[id];
  const concept = document.createElement('p');
  concept.textContent = brief.concept.split('。')[0] + '。';
  caption.append(number, name, concept);
  item.append(button, caption);
  return item;
}

function renderGallery() {
  visibleIds = ALL_CARD_IDS.filter(id => {
    const card = getCard(id);
    return (factionFilter.value === 'all' || card.faction === Number(factionFilter.value))
      && (rarityFilter.value === 'all' || card.rarity === Number(rarityFilter.value));
  });
  grid.replaceChildren(...visibleIds.map(makeCard));
  const faction = factionFilter.value === 'all' ? '全陣営' : FACTION_NAMES[Number(factionFilter.value)];
  const rarity = rarityFilter.value === 'all' ? '全レアリティ' : RARITIES[Number(rarityFilter.value)];
  document.querySelector('#catalog-count').textContent = `${visibleIds.length}枚 / ${faction} / ${rarity}`;
  document.querySelector('#art-empty').hidden = visibleIds.length !== 0;
  updateProgress();
}

function fillDetails(id) {
  detailId = id;
  const card = getCard(id);
  const brief = byId.get(id);
  const index = visibleIds.indexOf(id);
  document.querySelector('#detail-position').textContent = `No. ${String(id).padStart(3, '0')} / 060`;
  document.querySelector('#detail-meta').textContent = `${FACTION_NAMES[card.faction]} / ${RARITIES[card.rarity]}`;
  document.querySelector('#detail-name').textContent = CARD_NAMES[id];
  document.querySelector('#detail-concept').textContent = brief.concept;
  document.querySelector('#detail-stats').replaceChildren(...[['BP', card.bp], ['HP', card.hp], ['INI', card.ini]].map(([label, value]) => {
    const pair = document.createElement('div');
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    pair.append(term, description);
    return pair;
  }));
  document.querySelector('#detail-notes').replaceChildren(...[
    ['輪郭と姿', brief.silhouette], ['道具と意匠', brief.motifs], ['受け継ぐもの', brief.continuity],
  ].map(([label, value]) => {
    const pair = document.createElement('div');
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    pair.append(term, description);
    return pair;
  }));
  const media = document.querySelector('#detail-media');
  const image = document.createElement('img');
  media.replaceChildren(image);
  prepareImage(image, id, media, { eager: true });

  const lineage = document.querySelector('#detail-lineage');
  lineage.replaceChildren();
  const recipe = MERGE_RECIPES[id]?.recipe;
  lineage.hidden = !recipe;
  if (recipe) {
    const label = document.createElement('p');
    label.textContent = '合成元のアートを見比べる';
    lineage.append(label);
    recipe.forEach(sourceId => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${String(sourceId).padStart(3, '0')} ${CARD_NAMES[sourceId]} ↗`;
      button.addEventListener('click', () => {
        fillDetails(sourceId);
        document.querySelector('#detail-name').focus({ preventScroll: true });
      });
      lineage.append(button);
    });
  }
  document.querySelector('#detail-previous').disabled = index <= 0;
  document.querySelector('#detail-next').disabled = index < 0 || index >= visibleIds.length - 1;
  dialog.scrollTop = 0;
}

function openDetail(id, source) {
  opener = source;
  fillDetails(id);
  document.body.classList.add('art-dialog-open');
  dialog.showModal();
}

factionFilter.addEventListener('change', renderGallery);
rarityFilter.addEventListener('change', renderGallery);
document.querySelector('#art-size').addEventListener('change', event => {
  grid.style.setProperty('--card-width', `${event.target.value}px`);
});
document.querySelectorAll('input[name="art-view"]').forEach(input => {
  input.addEventListener('change', () => { if (input.checked) grid.dataset.view = input.value; });
});
document.querySelector('#detail-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  document.body.classList.remove('art-dialog-open');
  if (opener?.isConnected) opener.focus({ preventScroll: true });
});
document.querySelector('#detail-previous').addEventListener('click', () => {
  const index = visibleIds.indexOf(detailId);
  if (index > 0) fillDetails(visibleIds[index - 1]);
});
document.querySelector('#detail-next').addEventListener('click', () => {
  const index = visibleIds.indexOf(detailId);
  if (index >= 0 && index < visibleIds.length - 1) fillDetails(visibleIds[index + 1]);
});
renderGallery();
