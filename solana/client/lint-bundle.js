// ═════════════════════════════════════════════════════════════════════════
// 0xARK bundle linter — Checks #1 + #2 + Check #3 (stub)
//
// Motivation: the bundle-concat model (no IIFE wrapping, flat script scope
// across 18 src/*.js modules) lets latent bugs go undetected until the
// single erroring module blocks another. v262 cleared a SyntaxError that
// unmasked v441-v445 — five same-type bugs in a row. This lint catches
// each class statically so they stop reaching runtime.
//
// Checks:
//   #1 checkCollisions  — same top-level identifier declared in ≥2 files
//                         (SyntaxError at bundle time, silent in each file).
//   #2 checkRgbaOutput  — runtime `rgba(undefined,...,1)` etc. in built HTML
//                         (off-by-one colour table produces these).
//   #3 checkTDZOrder    — top-level const/let whose initializer reads a
//                         later-declared identifier (stubbed here; v447b).
//
// Design constraints:
//   · zero npm dependencies (node built-ins only)
//   · CommonJS (build.js is CommonJS; we stay consistent)
//   · pure functions: each check returns `{ hits, ok }`
//   · helpers are exported with `_`-prefix so tests can exercise them
// ═════════════════════════════════════════════════════════════════════════

'use strict';

const fs = require('fs');
const path = require('path');

// ── Identifier filter sets (Check #3) ────────────────────────────────────
// Reserved words + common builtins/runtime globals the 0xark bundle touches
// at top level. Adding a global here is a declaration that the ident is
// NOT a file-local top-level binding the linter should track. If a real
// TDZ bug gets masked because its target name appears here, remove it.
const _KEYWORDS = new Set([
  'const', 'let', 'var', 'class', 'function', 'if', 'else', 'for', 'while',
  'do', 'return', 'new', 'typeof', 'instanceof', 'in', 'of', 'true', 'false',
  'null', 'undefined', 'this', 'void', 'delete', 'throw', 'try', 'catch',
  'finally', 'break', 'continue', 'switch', 'case', 'default', 'yield',
  'await', 'async', 'import', 'export', 'from', 'as', 'NaN', 'Infinity',
  'get', 'set', 'static', 'extends', 'super', 'debugger',
]);

const _GLOBALS = new Set([
  'Math', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'JSON',
  'RegExp', 'Error', 'TypeError', 'ReferenceError', 'SyntaxError', 'Set',
  'Map', 'WeakMap', 'WeakSet', 'Promise', 'Symbol', 'Int8Array', 'Uint8Array',
  'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array', 'Float32Array',
  'Float64Array', 'Uint8ClampedArray', 'ArrayBuffer', 'DataView', 'Proxy',
  'Reflect', 'console', 'document', 'window', 'globalThis', 'navigator',
  'location', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'atob',
  'btoa', 'fetch', 'URL', 'URLSearchParams', 'FormData', 'Blob', 'File',
  'FileReader', 'HTMLCanvasElement', 'CanvasRenderingContext2D', 'Image',
  'WebSocket', 'HTMLElement', 'HTMLImageElement', 'Event', 'MouseEvent',
  'KeyboardEvent', 'CustomEvent', 'localStorage', 'sessionStorage', 'crypto',
  'TextEncoder', 'TextDecoder', 'BigInt', 'parseInt', 'parseFloat', 'isNaN',
  'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'encodeURI',
  'decodeURI', 'PIXI', 'solanaWeb3', 'anchor', 'splToken', 'snarkjs',
  'oxarkUi', 'Buffer', 'process', 'alert', 'prompt', 'confirm',
  'AudioContext', 'webkitAudioContext', 'MediaSource', 'AbortController',
  'IntersectionObserver', 'ResizeObserver', 'MutationObserver',
]);

// ── String/comment stripping ─────────────────────────────────────────────
// Walks source char-by-char, producing a version where comments are removed
// and string bodies are replaced with spaces (delimiters preserved so
// regex-based decl scanning still lines up correctly). Template literals
// are stripped between backticks EXCEPT `${...}` interior, which is JS and
// must survive so identifiers inside it are scanned. Nested templates
// inside `${}` are out of scope for v447a — the codebase doesn't use them.
//
// Returns a string the same length as the input (line/column preserving).
function _stripStringsAndComments(src) {
  const out = new Array(src.length);
  let i = 0;
  const N = src.length;
  // state: 'code' | 'line-comment' | 'block-comment' | 'sq' | 'dq' | 'tpl' | 'tpl-expr'
  let state = 'code';
  let tplExprDepth = 0; // brace depth inside ${ ... }

  while (i < N) {
    const c = src[i];
    const n = i + 1 < N ? src[i + 1] : '';

    if (state === 'code') {
      if (c === '/' && n === '/') {
        out[i] = ' '; out[i + 1] = ' ';
        i += 2;
        state = 'line-comment';
        continue;
      }
      if (c === '/' && n === '*') {
        out[i] = ' '; out[i + 1] = ' ';
        i += 2;
        state = 'block-comment';
        continue;
      }
      if (c === "'") { out[i] = c; i++; state = 'sq'; continue; }
      if (c === '"') { out[i] = c; i++; state = 'dq'; continue; }
      if (c === '`') { out[i] = c; i++; state = 'tpl'; continue; }
      out[i] = c; i++;
      continue;
    }

    if (state === 'line-comment') {
      if (c === '\n') { out[i] = '\n'; i++; state = 'code'; continue; }
      out[i] = c === '\t' ? '\t' : ' ';
      i++;
      continue;
    }

    if (state === 'block-comment') {
      if (c === '*' && n === '/') {
        out[i] = ' '; out[i + 1] = ' ';
        i += 2;
        state = 'code';
        continue;
      }
      out[i] = c === '\n' ? '\n' : (c === '\t' ? '\t' : ' ');
      i++;
      continue;
    }

    if (state === 'sq' || state === 'dq') {
      const q = state === 'sq' ? "'" : '"';
      if (c === '\\' && n) {
        out[i] = ' ';
        out[i + 1] = n === '\n' ? '\n' : ' ';
        i += 2;
        continue;
      }
      if (c === q) { out[i] = c; i++; state = 'code'; continue; }
      out[i] = c === '\n' ? '\n' : (c === '\t' ? '\t' : ' ');
      i++;
      continue;
    }

    if (state === 'tpl') {
      if (c === '\\' && n) {
        out[i] = ' ';
        out[i + 1] = n === '\n' ? '\n' : ' ';
        i += 2;
        continue;
      }
      if (c === '`') { out[i] = c; i++; state = 'code'; continue; }
      if (c === '$' && n === '{') {
        out[i] = '$'; out[i + 1] = '{';
        i += 2;
        tplExprDepth = 1;
        state = 'tpl-expr';
        continue;
      }
      out[i] = c === '\n' ? '\n' : (c === '\t' ? '\t' : ' ');
      i++;
      continue;
    }

    if (state === 'tpl-expr') {
      // Inside ${...} — treat as code but track `{` / `}` depth so the
      // matching `}` returns us to template mode. We do NOT recurse into
      // nested templates (deliberately out of scope for v447a).
      if (c === '{') { out[i] = c; i++; tplExprDepth++; continue; }
      if (c === '}') {
        tplExprDepth--;
        out[i] = c;
        i++;
        if (tplExprDepth === 0) state = 'tpl';
        continue;
      }
      out[i] = c;
      i++;
      continue;
    }
  }

  return out.join('');
}

// ── Top-level declaration scanner ────────────────────────────────────────
// Operates on already-stripped source. Emits { name, line, kind } records
// for every top-level `const|let|var|class|function NAME` at brace/paren/
// bracket depth 0. `kind` is the literal keyword ('const'|'let'|'var'|
// 'class'|'function'). For multi-binding `const A=1, B=2;` all bindings
// share the kind of the head (all 'const', etc.).
//
// Caveats (acceptable for this codebase):
//   · Multi-line `const A = 1,\n    B = 2;` — records A only. The project
//     writes multi-binding consts on one line; if that changes, promote
//     this to a statement-spanning scanner.
//   · Destructuring `const { a, b } = obj;` — records `{` as not an ident
//     so nothing is emitted. Not used at top level in this project.
function _findTopLevelDecls(stripped) {
  const lines = stripped.split('\n');
  const decls = [];

  // Pre-compute brace depth at the START of each line.
  const depthAtLineStart = new Array(lines.length);
  let depth = 0;
  for (let i = 0; i < lines.length; i++) {
    depthAtLineStart[i] = depth;
    const ln = lines[i];
    for (let k = 0; k < ln.length; k++) {
      const ch = ln[k];
      if (ch === '{' || ch === '(' || ch === '[') depth++;
      else if (ch === '}' || ch === ')' || ch === ']') depth--;
    }
  }

  const declRe = /^(const|let|var|class|function)\s+([A-Za-z_$][\w$]*)/;
  for (let i = 0; i < lines.length; i++) {
    if (depthAtLineStart[i] !== 0) continue;
    const line = lines[i];
    const m = line.match(declRe);
    if (!m) continue;
    decls.push({ name: m[2], line: i + 1, kind: m[1] });

    // multi-binding: `const|let|var A = ..., B = ..., C = ...;`
    if (m[1] === 'const' || m[1] === 'let' || m[1] === 'var') {
      // Walk the rest of the line (past the first binding), tracking depth.
      // Record `, NAME =` tokens when we are at depth 0 relative to the
      // start of the declaration body (i.e. outside nested {}/[]/() ).
      const startIdx = line.indexOf(m[2]) + m[2].length;
      let d = 0;
      const rest = line.slice(startIdx);
      const re = /,\s*([A-Za-z_$][\w$]*)\s*=/g;
      // Build a depth map over `rest` so we only accept matches at d==0.
      const depthAt = new Array(rest.length);
      for (let k = 0; k < rest.length; k++) {
        depthAt[k] = d;
        const ch = rest[k];
        if (ch === '{' || ch === '(' || ch === '[') d++;
        else if (ch === '}' || ch === ')' || ch === ']') d--;
      }
      let match;
      while ((match = re.exec(rest)) !== null) {
        if (depthAt[match.index] === 0) {
          decls.push({ name: match[1], line: i + 1, kind: m[1] });
        }
      }
    }
  }
  return decls;
}

// ── Check #1: cross-file top-level collisions ───────────────────────────
// Returns { hits: [{ name, locations: [{file, line}] }], ok }.
// A hit means the same top-level name is declared in ≥2 distinct files.
// Same-file duplicates are not this check's concern (Node parser catches
// those with SyntaxError: Identifier 'X' has already been declared).
//
// Input: files = [{ name, source }] — typically the MODULES list, read
// from disk before bundling. `name` is used verbatim in hit locations.
function checkCollisions(files) {
  const seen = new Map(); // name -> Array<{file, line}>
  for (const { name, source } of files) {
    const stripped = _stripStringsAndComments(source);
    const decls = _findTopLevelDecls(stripped);
    // Dedupe within a file: a name declared twice in the same file is a
    // local concern (SyntaxError). Only the first occurrence enters the
    // cross-file map.
    const localSeen = new Set();
    for (const { name: n, line } of decls) {
      if (localSeen.has(n)) continue;
      localSeen.add(n);
      if (!seen.has(n)) seen.set(n, []);
      seen.get(n).push({ file: name, line });
    }
  }
  const hits = [];
  for (const [n, locations] of seen.entries()) {
    if (locations.length >= 2) hits.push({ name: n, locations });
  }
  hits.sort((a, b) => a.name.localeCompare(b.name));
  return { hits, ok: hits.length === 0 };
}

// ── Check #2: literal `rgba(undefined,...)` / null / NaN in built HTML ──
// Returns { hits: [{ line, match }], ok }.
// Scans the bundled output for any rgba() call whose first numeric
// position is one of the three sentinel literals. These reach the canvas
// as "rgba(undefined,undefined,undefined,1)" strings which addColorStop()
// silently rejects (grey gradient at runtime). v442 was the prototype:
// `_dungVigGrads` indexed `cols[fl]` with fl=1..5 against a table that
// had an extra leading `[]`.
function checkRgbaOutput(htmlOrJs) {
  const lines = htmlOrJs.split('\n');
  const re = /rgba?\s*\(\s*(?:undefined|null|NaN)/g;
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(line)) !== null) {
      hits.push({ line: i + 1, match: m[0] });
    }
  }
  return { hits, ok: hits.length === 0 };
}

// ── Check #3: same-file TDZ order ────────────────────────────────────────
// Returns { hits: [{ file, line, name, referencedName, referencedLine }], ok }.
// Flags top-level `const|let NAME = <init>` where <init> references another
// top-level ident declared LATER in the same file, when evaluating <init>
// would cross the TDZ. Catches v443 (IIFE form) and v444 (.map() form).
//
// 4 production fixes over the /tmp/tdz-check3.js prototype:
//   (a) comment/string strip — use _stripStringsAndComments (length-
//       preserving); eliminates false positives from `// …VAR…` and
//       `'VAR'` style content the prototype scanned as refs.
//   (b) function-hoist skip — top-level `function NAME(){}` is hoisted,
//       so reading it before its declaration line is legal. Targets of
//       kind 'function' are excluded from flagging.
//   (c) nested-scope leak guard — `_findTopLevelDecls` already tracks
//       brace depth, so multi-binding `const … , X = …` inside a nested
//       arrow/IIFE does not pollute the top-level decl map. Additionally,
//       we scan the initializer body for local const/let/var/function/
//       class decls and exclude those names from the reference check.
//   (d) arrow/function param tracking — arrow params like `(a, b) =>` and
//       `x =>`, plus traditional `function(a, b)` params, are collected
//       into the local-name set so they are not flagged when they shadow
//       a later top-level const. Destructured/defaulted params fall back
//       to first-word extraction per comma segment; this handles the
//       common `(a, b) =>` / `x => …` / `function(x, y) {…}` shapes that
//       show up across src/.
//
// Context-aware ref filtering (applied during ident extraction):
//   · property access  `obj.prop`      → skip `prop`
//   · property key     `{ KEY: val }`  → skip `KEY`
//   · method shorthand `{ method(){} }`→ skip `method`
//   These remove a class of false positives the prototype didn't filter.
//
// Known limitations (accepted for v447b; revisit if real FPs appear):
//   · Multi-binding top-level const `const A = 1, B = <init>;` — the
//     second binding's initializer is NOT checked. Detector skips the
//     whole decl when a `,` appears at depth 0 in the walk.
//   · Object-literal method/getter bodies reference-inside are treated as
//     top-level refs. Safe-side: flags may be technically wrong if the
//     method is never called before the later decl, but in practice
//     top-level consts holding objects that call later-declared globals
//     from their methods DO run into real TDZ when invoked; worth a hit.
//   · Class field initializers (`class { X = otherRef; }`) not specifically
//     handled; they run at class evaluation (decl time) so flagging IS
//     correct when `otherRef` is later. Covered as a by-product.
function checkTDZOrder(files) {
  const hits = [];
  for (const { name: fileName, source } of files) {
    const stripped = _stripStringsAndComments(source);
    const decls = _findTopLevelDecls(stripped);

    // Build name -> { line, kind } map. First occurrence wins.
    const declMap = new Map();
    for (const d of decls) {
      if (!declMap.has(d.name)) declMap.set(d.name, { line: d.line, kind: d.kind });
    }

    const lines = stripped.split('\n');
    // depth-at-line-start, same approach as _findTopLevelDecls.
    const depthAtLineStart = new Array(lines.length);
    {
      let depth = 0;
      for (let i = 0; i < lines.length; i++) {
        depthAtLineStart[i] = depth;
        for (const ch of lines[i]) {
          if (ch === '{' || ch === '(' || ch === '[') depth++;
          else if (ch === '}' || ch === ')' || ch === ']') depth--;
        }
      }
    }

    for (let i = 0; i < lines.length; i++) {
      if (depthAtLineStart[i] !== 0) continue;
      const line = lines[i];
      const m = line.match(/^(const|let)\s+([A-Za-z_$][\w$]*)\s*=/);
      if (!m) continue;
      const selfName = m[2];
      // Find `=` sign that binds this decl (first `=` after the name).
      const nameStart = line.indexOf(selfName, m[0].indexOf(selfName));
      const eqIdx = line.indexOf('=', nameStart + selfName.length);
      if (eqIdx === -1) continue;

      // Walk body char-by-char from eqIdx+1 across subsequent lines.
      // Terminate at first `;` at depth 0. Abort (skip this decl) if a
      // `,` appears at depth 0 — that means multi-binding, out of scope.
      let d = 0;
      let body = '';
      let terminated = false;
      let skipMulti = false;
      outer: for (let j = i; j < lines.length; j++) {
        const ln = lines[j];
        const start = j === i ? eqIdx + 1 : 0;
        for (let k = start; k < ln.length; k++) {
          const ch = ln[k];
          if (d === 0 && ch === ';') { terminated = true; break outer; }
          if (d === 0 && ch === ',') { skipMulti = true; break outer; }
          if (ch === '{' || ch === '(' || ch === '[') d++;
          else if (ch === '}' || ch === ')' || ch === ']') d--;
          body += ch;
        }
        body += '\n';
      }
      if (!terminated || skipMulti) continue;

      // Collect local decls + params from the body into a shadow set so
      // references to those names are not treated as top-level refs.
      const localNames = new Set();
      const localDeclRe = /\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g;
      let lm;
      while ((lm = localDeclRe.exec(body)) !== null) localNames.add(lm[1]);

      // Arrow function params — paren form `(a, b, …) =>`
      const arrowParensRe = /\(([^()]*)\)\s*=>/g;
      let ap;
      while ((ap = arrowParensRe.exec(body)) !== null) {
        for (const seg of ap[1].split(',')) {
          const mm = seg.trim().match(/^([A-Za-z_$][\w$]*)/);
          if (mm) localNames.add(mm[1]);
        }
      }
      // Arrow function single-param form `x =>`
      const arrowSingleRe = /\b([A-Za-z_$][\w$]*)\s*=>/g;
      let as;
      while ((as = arrowSingleRe.exec(body)) !== null) localNames.add(as[1]);

      // Traditional function params: `function [NAME](a, b, …)`
      const fnParamsRe = /\bfunction\b(?:\s+[A-Za-z_$][\w$]*)?\s*\(([^()]*)\)/g;
      let fp;
      while ((fp = fnParamsRe.exec(body)) !== null) {
        for (const seg of fp[1].split(',')) {
          const mm = seg.trim().match(/^([A-Za-z_$][\w$]*)/);
          if (mm) localNames.add(mm[1]);
        }
      }

      // Context-aware identifier walk: emit each ident with info about
      // its preceding / following non-whitespace neighbors so we can
      // skip property access / property key / method shorthand patterns.
      const seen = new Set();
      const N = body.length;
      let p = 0;
      while (p < N) {
        const c = body[p];
        const isIdStart = (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c === '_' || c === '$';
        if (!isIdStart) { p++; continue; }
        const idStart = p;
        while (p < N) {
          const cc = body[p];
          const isIdCont = (cc >= 'A' && cc <= 'Z') || (cc >= 'a' && cc <= 'z') || (cc >= '0' && cc <= '9') || cc === '_' || cc === '$';
          if (!isIdCont) break;
          p++;
        }
        const ident = body.slice(idStart, p);

        // Prev non-whitespace char.
        let pp = idStart - 1;
        while (pp >= 0 && (body[pp] === ' ' || body[pp] === '\t' || body[pp] === '\n')) pp--;
        const prev = pp >= 0 ? body[pp] : '';
        // Next non-whitespace char.
        let np = p;
        while (np < N && (body[np] === ' ' || body[np] === '\t' || body[np] === '\n')) np++;
        const next = np < N ? body[np] : '';

        // Property access: `obj.prop` — skip `prop`. Guard against `...`.
        if (prev === '.' && (pp < 1 || body[pp - 1] !== '.')) continue;
        // Object property key: `{ KEY:` or `, KEY:` → skip.
        if (next === ':' && (prev === '{' || prev === ',')) continue;
        // Method shorthand: `{ method(` or `, method(` → skip.
        if (next === '(' && (prev === '{' || prev === ',')) continue;

        if (ident === selfName) continue;
        if (seen.has(ident)) continue;
        if (_KEYWORDS.has(ident) || _GLOBALS.has(ident)) continue;
        if (localNames.has(ident)) continue;
        seen.add(ident);

        const target = declMap.get(ident);
        if (!target) continue;
        if (target.kind === 'function') continue; // hoisted
        if (target.line > i + 1) {
          hits.push({
            file: fileName,
            line: i + 1,
            name: selfName,
            referencedName: ident,
            referencedLine: target.line,
          });
        }
      }
    }
  }
  return { hits, ok: hits.length === 0 };
}

module.exports = {
  checkCollisions,
  checkTDZOrder,
  checkRgbaOutput,
  _stripStringsAndComments,
  _findTopLevelDecls,
};
