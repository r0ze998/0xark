// Timer.js — countdown timer component

/**
 * Starts a countdown timer.
 * @param {HTMLElement} el  — the element to update (textContent)
 * @param {number} totalSecs
 * @param {function} onExpire
 * @returns {function} stop — call to cancel the timer
 */
export function startTimer(el, totalSecs, onExpire) {
  let remaining = totalSecs;

  function render() {
    if (!el) return;
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    el.textContent = `${m}:${String(s).padStart(2, '0')}`;
    const urgent = remaining < 30;
    el.classList.toggle('timer--urgent', urgent);
    el.style.color = urgent ? 'var(--accent-red)' : 'var(--accent-gold)';
  }

  render();
  const id = setInterval(() => {
    remaining = Math.max(0, remaining - 1);
    render();
    if (remaining <= 0) {
      clearInterval(id);
      onExpire?.();
    }
  }, 1000);

  return () => clearInterval(id);
}
