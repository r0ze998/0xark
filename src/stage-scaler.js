// Native-sized fluid layout replaces the fixed 1024px canvas and zoom.
// Tactical panels reflow; smaller displays never silently shrink text.
const app = document.getElementById('app');
if (app) { app.style.zoom = ''; app.style.transform = ''; }
document.documentElement.classList.remove('is-portrait');
