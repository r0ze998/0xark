// Small DOM host for async ownership tests. It models attachment, selectors and
// events only; it does not render, lay out, or emulate a browser's dialog behavior.
export function createModalHost() {
  class Element {
    constructor(tagName) {
      this.tagName = tagName;
      this.children = [];
      this.parentNode = null;
      this.listeners = new Map();
      this.dataset = {};
      this.id = '';
      this.className = '';
      this.disabled = false;
      this.style = { setProperty() {} };
      this.classList = {
        add: name => { this.className += ' ' + name; },
        remove: name => { this.className = this.className.split(/\s+/).filter(c => c !== name).join(' '); },
      };
    }
    get isConnected() { return this === document.body || this === document.head || !!this.parentNode?.isConnected; }
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
    remove() {
      if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(c => c !== this);
      this.parentNode = null;
    }
    setAttribute(name, value) {
      if (name === 'class') this.className = value;
      else if (name === 'style') this.style.cssText = value;
      else if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
      else this[name] = name === 'disabled' ? true : value;
    }
    set innerHTML(html) {
      this._html = html;
      for (const child of this.children) child.parentNode = null;
      this.children = [];
      const stack = [this];
      for (const match of html.matchAll(/<(\/?)([\w-]+)\b([^>]*)>/g)) {
        const [, closing, tag, attrs] = match;
        if (closing) { if (stack.length > 1) stack.pop(); continue; }
        const element = new Element(tag);
        for (const [, name, value] of attrs.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) element.setAttribute(name, value ?? '');
        stack.at(-1).appendChild(element);
        if (!/\/\s*$/.test(attrs) && !['img', 'input', 'br', 'hr', 'source', 'meta', 'link'].includes(tag)) stack.push(element);
      }
    }
    get innerHTML() { return this._html ?? ''; }
    matches(selector) {
      return selector[0] === '#' ? this.id === selector.slice(1)
        : selector[0] === '.' ? this.className.split(/\s+/).includes(selector.slice(1))
          : this.tagName === selector;
    }
    querySelectorAll(selector) {
      const parts = selector.split(/\s+/);
      const descendants = this.children.flatMap(child => [child, ...child.querySelectorAll('*')]);
      if (selector === '*') return descendants;
      return descendants.filter(element => {
        if (!element.matches(parts.at(-1))) return false;
        let ancestor = element.parentNode;
        for (let i = parts.length - 2; i >= 0; i--) {
          while (ancestor && !ancestor.matches(parts[i])) ancestor = ancestor.parentNode;
          if (!ancestor) return false;
          ancestor = ancestor.parentNode;
        }
        return true;
      });
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
    addEventListener(type, callback) {
      const listeners = this.listeners.get(type) ?? [];
      listeners.push(callback);
      this.listeners.set(type, listeners);
    }
    async click() {
      if (this.disabled) return;
      await Promise.all((this.listeners.get('click') ?? []).map(fn => fn({ target: this, currentTarget: this })));
    }
    focus() { document.activeElement = this; }
    showModal() { this.open = true; }
  }
  const document = {
    createElement: tag => new Element(tag), dispatchEvent() {}, activeElement: null,
    createElementNS: (_namespace, tag) => new Element(tag),
    getElementById: id => document.head.querySelector('#' + id) ?? document.body.querySelector('#' + id),
  };
  document.head = new Element('head');
  document.body = new Element('body');
  const container = document.body.appendChild(new Element('main'));
  return { document, container };
}

export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

export const settle = () => new Promise(resolve => setImmediate(resolve));
