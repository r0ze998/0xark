// Install a component's base styles at first mount. Looking up the DOM each time
// keeps this safe across repeated mounts without moving styles in the cascade.
export function injectStyle(id, css) {
  const existing = document.getElementById(id);
  if (existing) return existing;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
  return style;
}
