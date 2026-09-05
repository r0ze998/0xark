import { isPractice, createPracticeAdapters } from './lib/practice-mode.js';

function classic(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error('A required game connection could not load. Please retry.'));
    document.head.appendChild(script);
  });
}

async function start() {
  window.oxarkPreview = isPractice;
  if (isPractice) {
    const { wallet, onchain } = createPracticeAdapters();
    Object.defineProperty(window, 'oxarkWallet', { value: wallet, writable: false });
    Object.defineProperty(window, 'oxarkOnchain', { value: onchain, writable: false });
    window.x402 = null;
    window.zkCardCommit = null;
  } else {
    await classic('https://cdn.jsdelivr.net/npm/@solana/web3.js@1.98.0/lib/index.iife.min.js');
    await import('./onchain/index.js');
    await classic('src/02-x402.js');
    await classic('https://cdn.jsdelivr.net/npm/snarkjs@0.7.4/build/snarkjs.min.js');
    await import('./lib/wallet-adapter.js');
    await classic('src/03-zk-prove.js');
  }
  await import('../app.js');
  document.getElementById('app-loading')?.remove();
}
start().catch(err => {
  const loading = document.getElementById('app-loading');
  if (loading) {
    loading.replaceChildren();
    const title = document.createElement('h1'); title.textContent = 'Unable to open the Archive';
    const message = document.createElement('p'); message.textContent = err.message;
    const retry = document.createElement('a'); retry.href = location.href; retry.textContent = 'Try again'; retry.className = 'gba-btn';
    loading.append(title, message, retry);
  }
  console.error(err);
});
