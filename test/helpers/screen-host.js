// A unit-level screen host, not a browser. Distinct nodes survive in test
// references after remount so stale writes and listeners remain observable.
export class Element {
  constructor(tag = 'div') {
    this.tag = tag; this.children = []; this.ids = new Map(); this.listeners = new Map();
    this.textContent = ''; this.disabled = false; this.style = {}; this.attributes = {};
    this.dataset = {}; this.scrollTop = 0; this.scrollHeight = 0; this.clientHeight = 0;
    this.classes = new Set();
    this.classList = {
      add: (...classes) => classes.forEach(c => this.classes.add(c)),
      remove: (...classes) => classes.forEach(c => this.classes.delete(c)),
      toggle: (c, force) => force ? this.classes.add(c) : this.classes.delete(c),
    };
  }
  set innerHTML(html) {
    this.html = html;
    for (const child of this.children) child.parent = null;
    this.children = []; this.ids.clear();
    for (const match of html.matchAll(/<[^>]*\bid="([^"]+)"[^>]*>/g)) {
      const node = new Element();
      node.id = match[1]; node.disabled = /\sdisabled(?:\s|>|=)/.test(match[0]);
      this.ids.set(node.id, node); this.appendChild(node);
    }
  }
  get innerHTML() { return this.html ?? ''; }
  querySelector(selector) { return selector.startsWith('#') ? this.ids.get(selector.slice(1)) ?? null : null; }
  querySelectorAll() { return []; }
  addEventListener(type, callback) { this.listeners.set(type, callback); }
  removeEventListener(type) { this.listeners.delete(type); }
  click() { return this.listeners.get('click')?.({ target: this, currentTarget: this }); }
  setAttribute(name, value) { this.attributes[name] = value; }
  appendChild(child) { this.children.push(child); child.parent = this; return child; }
  append(...children) { children.forEach(child => this.appendChild(child)); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); this.parent = null; }
  showModal() { this.open = true; }
  focus() { this.focused = true; }
  get isConnected() { return !!this.parent; }
}

export function createScreenHost() {
  const app = new Element();
  const body = new Element();
  const head = new Element();
  const events = [];
  // The page owns the static icon sheet before a screen mounts.
  const iconSheet = new Element('svg');
  const document = {
    body, head, activeElement: null,
    createElement: tag => new Element(tag),
    getElementById: id => id === 'px-icon-sheet' ? iconSheet : id === 'app' ? app : app.querySelector(`#${id}`) ?? head.children.find(node => node.id === id),
    dispatchEvent: event => events.push(event),
  };
  return { app, body, head, events, document };
}

export function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

export async function flushMicrotasks() {
  // Seed derivation, tx confirmation and the playback coroutine each await
  // their own stage. This drains that bounded chain without advancing timers.
  for (let i = 0; i < 12; i++) await Promise.resolve();
}
