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
