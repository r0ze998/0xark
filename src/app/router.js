// One owner for the mounted screen, including loading and wallet entry screens.
// Screen modules retain their existing mount(container, props) / unmount API.
export function createScreenRouter({ container, screens, onChange = () => {} }) {
  let current = null;
  let revision = 0;
  let unmount = null;

  function leave() {
    const cleanup = unmount;
    unmount = null;
    current = null;
    ++revision;
    cleanup?.(container);
  }

  return {
    get current() { return current; },
    get revision() { return revision; },
    has(name) { return Object.hasOwn(screens, name); },
    navigate(name, props = {}) {
      // Invalid routes must not tear down the screen that the player is using.
      if (!Object.hasOwn(screens, name)) return false;
      leave();
      const screen = screens[name];
      current = name;
      unmount = screen.unmount ?? null;
      onChange(name);
      screen.mount(container, { ...screen.defaults, ...props });
      return true;
    },
    dispose: leave,
  };
}

// Return a disposer so remounts/tests cannot accumulate document listeners.
export function listenForNavigation(target, routes) {
  const listeners = Object.entries(routes).map(([name, handler]) => {
    const listener = event => handler(event.detail ?? {});
    target.addEventListener(`nav:${name}`, listener);
    return [name, listener];
  });
  return () => {
    for (const [name, listener] of listeners) target.removeEventListener(`nav:${name}`, listener);
  };
}
