import { pxIcon } from './px-icons.js';

// Game-native navigation. Preview links reload isolated fixtures deliberately.
const NAV = [['home','home','Play'],['main','vault','Collection'],['shop','pack','Packs'],['trade','trade','Exchange']];
export function mountArchiveShell(preview) {
  if (document.getElementById('archive-rail')) return;
  document.documentElement.classList.add('archive-ui');
  document.documentElement.classList.toggle('is-preview', preview);
  const rail = document.createElement('nav');
  rail.id = 'archive-rail'; rail.className = 'archive-rail'; rail.setAttribute('aria-label','Game navigation');
  rail.innerHTML = `<a class="archive-mark" href="${preview ? '?devview=home' : '?'}" aria-label="0xARK home">0<span>×</span>A</a><div class="rail-links">${NAV.map(([route,icon,label])=>`<a href="${preview ? '?devview='+route : '#'+route}" data-route="${route}">${pxIcon(icon,{size:24})}<span>${label}</span></a>`).join('')}</div><span class="rail-edition">0xARK<br>ARCHIVE / 01</span>`;
  if (!preview) rail.addEventListener('click', event => {
    const link = event.target.closest('a'); if (!link) return;
    if (link.getAttribute('aria-disabled') === 'true') { event.preventDefault(); return; }
    if (!link.dataset.route) return;
    event.preventDefault(); document.dispatchEvent(new CustomEvent(`nav:${link.dataset.route}`));
  });
  document.body.prepend(rail);
  if (preview) {
    const strip = document.createElement('aside'); strip.className = 'archive-preview';
    strip.setAttribute('aria-label','Practice mode notice');
    strip.innerHTML = '<span><i></i> PRACTICE <span class="preview-description">· Sample collection · No wallet or payments</span></span><a href="?devview=preparation">Build a hand</a><a href="?devview=menu">All screens</a>';
    document.body.appendChild(strip);
  }
}
export function setArchiveScreen(name) {
  document.getElementById('app').dataset.screen = name;
  const selected = ['preparation','interruption','reveal','loot','matchmaking'].includes(name) ? 'home' : name;
  const battleActive = ['preparation','interruption','reveal','loot'].includes(name);
  document.querySelectorAll('#archive-rail a').forEach(link => {
    const locked = !window.oxarkPreview && battleActive;
    link.setAttribute('aria-disabled', String(locked));
    link.tabIndex = locked ? -1 : 0;
    link.title = locked ? 'Finish the duel before leaving the table' : '';
  });
  document.querySelectorAll('#archive-rail [data-route]').forEach(link=> {
    if (link.dataset.route === selected) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
}
