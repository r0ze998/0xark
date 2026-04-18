# BUILD_LINT_TODO — bundle-time static checks

**Status**: TODO, not implemented.
**Priority**: **Phase B2 blocker** (escalated 2026-04-19). Checks #1 + #3 must
land before Phase B2 kickoff. Check #2 is optional (fix already applied
for the one known case — v442). Check #4 deferred (needs AST).

**Trigger chain**: five consecutive latent bugs (v441-v445) surfaced in
rapid succession once v441 removed the v262 `_FLOOR_NAMES` SyntaxError that
had been masking everything downstream. All five were statically detectable
had the lint existed:

| bug | class | static detection |
|---|---|---|
| v441 `_FLOOR_NAMES` | cross-file `const` collision at bundle scope | Check #1 |
| v442 `_dungVigGrads` | off-by-one → `rgba(undefined,...,1)` in output | Check #2 |
| v443 `_BTYPE_ABB` | same-file TDZ: IIFE reads later-declared const | Check #3 |
| v444 `_MKT_LISTINGS` | same-file TDZ: `.map()` reads later-declared const | Check #3 (broadened RHS) |
| v445 bare `walkFrame` | free identifier at runtime — copy-paste typo | Check #4 (deferred, needs AST) |

The escalation rationale: three Phase-B2-blocking bugs in two days, all of
the same static class, with working proof-of-concept checks (`/tmp/tdz-check3.js`)
that would have caught four of five. The ROI flipped — the lint is
paying for itself *now*, not "after Phase B."

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

## Check #1: cross-file top-level identifier collision

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

## Placement (applies to Checks #1 + #3)

- Put the lint in `solana/client/lint-bundle.js` (new file) exposing
  `checkCollisions(modules)` and `checkTDZOrder(modules)`.
- Call from `build.js` at the top of `build()`, before `generateTokensModule()`
  so a broken manifest fails fast without regenerating tokens.
- Check #2 (rgba output scan) runs at the *end* of `build()`, after writing
  `index.html` — it inspects the final artifact.
- Expose `node build.js --lint-only` for CI.
- Acceptance: Checks #1 + #3 must each add ≤1s to `build()`. If slower,
  cache file-level decl maps by mtime.

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

---

## Check #3: same-file TDZ-order violation

**Trigger**: v443 `_BTYPE_ABB` and v444 `_MKT_LISTINGS`. Both were same-file
ordering bugs: a top-level `const X = <expr>;` executed its initializer at
module load, and `<expr>` referenced a later-declared top-level `const Y`
from the same file:

```js
// v443 pattern — IIFE initializer:
const _BTYPE_CNT_LBL = (() => { ... _BTYPE_ABB[ti] ... })();   // line 87
// ...
const _BTYPE_ABB = ['ATK','DEF','FLY','MAG','REC'];             // line 119 → TDZ

// v444 pattern — direct method-call initializer:
const _MKT_LISTING_PRICE_LBL = _MKT_LISTINGS.map(l => l.price); // line 249
// ...
const _MKT_LISTINGS = [ ... ];                                  // line 266 → TDZ
```

Both throw `ReferenceError: Cannot access 'X' before initialization` at
script load. Like Check #1, parse succeeds; only runtime reveals it.

### What

For every top-level `const X = <expr>;` or `let X = <expr>;`, walk the
initializer and report any identifier reference where the referenced
name is declared at a *later* source line in the same file.

Function declarations are hoisted, so they must be excluded from the
"declared later" lookup (ordering doesn't matter for `function foo()`).

Variables declared inside nested scopes (function bodies, arrow callbacks,
`.map(() => { const b = ... })`) must NOT be registered in the file-level
declarations map. The check is for top-level-to-top-level ordering only.

### Working prototype

`/tmp/tdz-check3.js` (~80 lines, built during v444 investigation) caught
both v443 and v444 correctly. Promote it as the starting point for
`solana/client/lint-bundle.js`. Required fixes before production use:

1. **Strip comments from the identifier-extraction pass** — current version
   misreports `townWeatherTimer → WEATHER_CYCLE_FRAMES` because the
   identifier appears in a `// cycles at WEATHER_CYCLE_FRAMES` trailing
   comment, not the initializer.
2. **Strip string contents from identifier-extraction pass** — current
   version misreports `const c=document.getElementById('g')` as
   referencing later-declared `g`, because `'g'` is a string literal.
3. **Skip function declarations in "declared later" lookup** — hoisting
   means function-order TDZ is impossible.
4. **Brace/paren depth tracking must survive arrow-function bodies** —
   current version leaked a nested `const b` from inside `.map(h => {...})`
   into the top-level decl map, causing `_sBufCmp=(a,b)=>b.uniq-a.uniq` to
   false-positive on the parameter `b`.

With those fixes, the prototype produced **1 true positive, 0 false
positives** in the v444 investigation (before the fix landed).

### Implementation sketch (regex-based)

For each `src/*.js` file:

```
1. Strip // and /* */ comments.
2. Strip string/template literal contents (keep quote delimiters).
3. Track paren/brace depth to identify lines at indent 0 (top-level).
4. Build top-level decl map: identifier → line (const/let/var/class only;
   function is hoisted, skip for ordering purposes).
5. For each top-level `const|let X = ...`, capture the initializer
   expression (multi-line until depth == 0 AND trailing `;`).
6. Extract all identifier references from the initializer.
7. For each reference, if it resolves to a decl at a LATER line than
   the declaration being checked, report it.
```

Acceptance: regex-based is enough to catch v443 + v444. AST upgrade only
if false positives grow beyond what eyeballing can triage.

### Related to Check #4 (deferred)

Check #3 only catches order violations for identifiers declared *somewhere*
in the same file. Bare references to identifiers that don't exist anywhere
(like v445's `walkFrame`) slip through. Those need Check #4 (scope-chain
analysis, AST-required).

---

## Check #4 (DEFERRED): free-identifier / unresolved reference

**Trigger**: v445 `walkFrame` — `drawNPCSprite` body referenced bare
`walkFrame` where `npc.walkFrame` was intended. ReferenceError at runtime;
not TDZ, not collision — just a name that doesn't exist in any reachable
scope.

### Why deferred

Correct implementation needs real scope-chain analysis:
- Function parameters (including destructured, rest, defaults)
- Function locals (nested declarations, for-loop headers, catch params,
  arrow-function parameters including single-param shorthand)
- Outer lexical scopes walking outward
- Module top-level
- Bundle-concat top-level (since `build.js` flattens modules)
- Browser + project globals (document, window, PIXI, solanaWeb3, anchor,
  splToken, snarkjs, oxarkUi, Buffer, ...)

A regex-based attempt during v445 investigation produced **563 suspects
across 753 hits** — signal-to-noise ratio too poor to be actionable. The
false positives came from:

- Multi-binding `const A=1,B=2;` secondary bindings missed as decls
- Object-literal keys (`{homeX: 10, walking: false}`) flagged as refs
- Object destructuring (`const {a,b} = obj`) bindings missed as locals
- Arrow-function parameters missed in some shapes (`(a,b)=>{}`)
- PixiJS TextStyle config object keys flagged as refs

A *targeted* variant that only scans for known entity-property names
(`walkFrame`, `visualX`, `moveTimer`, etc.) as bare references **does**
work as a spot-check — see `/tmp/bare-prop-check2.js`, 0 hits after v445
fix. That's the 80/20 path if we want *some* protection without AST.

### Implementation path (when we take it up)

1. Use `acorn` or `@babel/parser` with `ecmaVersion: 'latest'`.
2. Walk each `FunctionDeclaration` / `FunctionExpression` / `ArrowFunction`.
3. Build scope-chain from `acorn-walk` with scope tracking plugin
   (or `eslint-scope` for battle-tested version).
4. For each `Identifier` node in a `Reference` position (not a property
   key, not a property access RHS), check if it resolves to any binding
   in the chain up through bundle top-level + globals whitelist.
5. Report unresolved refs with function name + line.

Estimated cost: 1-2 days of work. Not Phase B2 blocker. Re-evaluate after
Checks #1 + #3 land and we see how many real bugs remain.

### 80/20 stopgap (optional, low cost)

Build out `/tmp/bare-prop-check2.js` into a curated list of entity-property
names (sourced from `04-state.js` player/NPC object construction + known
idiomatic `obj.X` patterns). Run as part of lint. Catches the walkFrame
class specifically without full scope analysis. Cheap to maintain but
won't catch unknown-shape bugs.
