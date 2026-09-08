// A mount owns its UI resources. Async work captures this scope before awaiting
// and checks `active` before applying results to a screen or round that may have
// changed. Disposal does not cancel submitted transactions or their confirmation.
export function createScreenScope() {
  let active = true;
  const cleanups = new Set();

  function defer(cleanup) {
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      cleanups.delete(release);
      cleanup();
    };
    if (active) cleanups.add(release);
    else release();
    return release;
  }

  function timeout(callback, milliseconds) {
    if (!active) return () => {};
    const timer = setTimeout(() => {
      cancel();
      if (active) callback();
    }, milliseconds);
    const cancel = defer(() => clearTimeout(timer));
    return cancel;
  }

  function dispose() {
    if (!active) return;
    active = false;
    const errors = [];
    for (const release of [...cleanups].reverse()) {
      try { release(); } catch (error) { errors.push(error); }
    }
    if (errors.length) throw new AggregateError(errors, 'Screen cleanup failed');
  }

  return { get active() { return active; }, defer, timeout, dispose };
}
