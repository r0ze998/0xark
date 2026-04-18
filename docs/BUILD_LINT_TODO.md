# BUILD_LINT_TODO — bundle-time identifier collision check

**Status**: TODO, not implemented.
**Priority**: after Phase B (B1/B2/B3) lands. Low-urgency infra polish.
**Trigger**: v441 — silent top-level `const _FLOOR_NAMES` collision between `src/07-map.js` and `src/08-overlays.js` produced a black-screen SyntaxError that was not caught until the game failed to boot in the browser.

---

## Why

`solana/client/build.js` concatenates ~18 `src/*.js` modules into a single
`<script>` block inside `index.html`. No IIFE wrapping, no module wrapping —
every file shares a single top-level script scope.

That means any two files that hoist a top-level `const`/`let`/`class` with the
same name produce `SyntaxError: Identifier 'X' has already been declared`.
The error surfaces **only at runtime**, only when the bundled page loads, and
it aborts the entire script (breaking the game with no visible stack beyond
the first error).

v441 (`_FLOOR_NAMES`) exposed this: two independent perf-hoist commits (v262)
each added a top-level `const _FLOOR_NAMES = [...]` with a different-casing
array, neither noticed the other. The bug sat dormant until somebody happened
to load the browser build.

Scope of risk: every per-file hoist commit (v260s era onwards has many) is a
potential collision. `var` redeclaration would be silent; `const`/`let`/`class`
at least throw — but only at runtime.

---

## What

Add a build-time lint step in `build.js` (or a sibling script called before
`build()` runs) that:

1. For each `src/*.js` module in the `MODULES` manifest, extract the set of
   **top-level** `const`/`let`/`var`/`class`/`function` identifiers.
2. Merge into a single `Map<identifier, string[] /* files */>` across all
   modules.
3. If any identifier appears in more than one file, fail the build (or warn
   loudly + exit non-zero in CI) with a message like:

   ```
   BUILD_LINT: identifier collision detected
     _FLOOR_NAMES
       src/07-map.js:45
       src/08-overlays.js:231
   Rename one side (e.g. _FLOOR_NAMES_UC / _FLOOR_NAMES_TC) or move to a
   shared source.
   ```

4. Exclude `00-tokens.js` (generated, only declares `window.TOKENS` — a
   property assignment, not a top-level binding, so it would not trip this
   check anyway; listed for clarity).

## Implementation sketch

**Option A — regex-based** (fastest, ~50 lines):
- Scan each file line-by-line.
- Skip lines inside `/* ... */` and `// ...` and template literals and
  string literals (crude state machine).
- Match `^(const|let|var|class|function)\s+([A-Za-z_$][\w$]*)` at indent 0.
- False positives possible inside multi-line strings; acceptable for this
  codebase's style (no IIFE patterns, indent-0 always means top-level).

**Option B — AST-based** (correct, more deps):
- `acorn` or `@babel/parser` parses each file.
- Walk the top-level `body[]` and collect `VariableDeclaration`,
  `ClassDeclaration`, `FunctionDeclaration` bindings.
- No regex false positives. Requires adding a dev dependency.

Start with A — it's enough to catch the class of bugs v441 represented. Move
to B only if A turns out to flag too many false positives.

## Placement

- Put the lint in `solana/client/lint-bundle.js` (new file) exposing
  `checkCollisions(modules)`.
- Call from `build.js` at the top of `build()`, before `generateTokensModule()`
  so a broken manifest fails fast without regenerating tokens.
- Optionally expose `node build.js --lint-only` for CI.

## Related safeguards (out of scope for first pass)

- Warn on top-level `var` (preferring `const`/`let` would have made v441
  into an immediate TDZ error rather than silent-but-fatal).
- Warn on shadowing between modules (same identifier reused deliberately —
  still a smell).
- Detect stray `window.X =` assignments that collide with top-level `const X`.

These are nice-to-haves; the collision check alone handles the concrete
failure mode that motivated this TODO.

---

## Check #2: malformed `rgba()` strings in the built bundle

**Trigger**: v442 — `_dungVigGrads` in `src/07-map.js` shipped a
`const cols=[[],[],[80,140,200],...]` table with two leading `[]`. The loop
indexed `fl=1..5`, so `cols[1]=[]` destructured to `[undefined,undefined,undefined]`,
producing `ctx.addColorStop(0, 'rgba(undefined,undefined,undefined,1)')` —
which Canvas 2D throws on at runtime (not parse time). Latent since
b331777 (v228, 2026-04-16); masked by the v262 `_FLOOR_NAMES` SyntaxError
until v441 removed the parse-time mask.

### What

Add a bundle-output grep for the literal tokens below:

```
rgba(undefined
rgba(null
rgba(NaN
rgb(undefined
rgb(null
rgb(NaN
```

If any appear in the generated `index.html`, fail the build and print the
line + surrounding 3 lines.

### Why a post-build check (not static)

Most `rgba(...)` strings in this codebase are built via template literals
from numeric variables. A static source scan would need to trace data flow
to catch "the variable is `undefined` at runtime." The bundle grep catches
only the cases where the template-literal inputs are **constant-foldable**
to `undefined`/`null`/`NaN` — which covers the v442 regression (the empty
`[]` destructures at module top-level and the build does not execute it,
but the output string is in the bundle the moment the IIFE runs on load).

In practice this check would have fired if we ran the bundle through any
node-side smoke test (`node -e "require('./index.html')"`-style eval of
the script block). Deferring the "actually evaluate" approach; the grep
is the 80% win for 10% of the work.

### Implementation sketch

At the end of `build()` in `build.js`, after writing `index.html`:

```js
const html = fs.readFileSync(OUTPUT_PATH, 'utf8');
const badRgba = /rgba?\((?:undefined|null|NaN)/g;
const hits = [...html.matchAll(badRgba)];
if (hits.length) {
  for (const m of hits) {
    const lineNo = html.slice(0, m.index).split('\n').length;
    console.error(`BUILD_LINT: malformed rgba at line ${lineNo}: ${m[0]}`);
  }
  process.exit(1);
}
```

Caveat: this runs on the *output*, so it catches both generated artifacts
(`00-tokens.js`) and hand-written modules uniformly. Good — a bad
`component.*.highlight_rgba` token would fail the same way.

### What it would NOT have caught

- Dynamic `rgba(${fn(x)},...)` where `fn` returns `undefined` only at
  runtime for certain inputs. Needs runtime tracing (Puppeteer / eval).
- String concatenation like `'rgba(' + r + ',' + ...`. The grep assumes
  the template literal leaves `undefined` as a literal substring, which is
  what happens when `r` is `undefined` in a template literal but not in a
  `+` concatenation (`+` stringifies `undefined` → `"undefined"` too, so
  actually it still catches it — just double-check when implementing).
