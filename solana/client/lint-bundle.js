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
// Operates on already-stripped source. Emits { name, line } records for
// every top-level `const|let|var|class|function NAME` at brace/paren/
// bracket depth 0. Supports multi-binding `const A=1, B=2;` by scanning
// the rest of the declaration line for `, NAME =` pairs while the
// depth-after-prefix stays at 0.
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
    decls.push({ name: m[2], line: i + 1 });

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
          decls.push({ name: match[1], line: i + 1 });
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

// ── Check #3: same-file TDZ order (stub) ─────────────────────────────────
// Planned for v447b. Detects top-level `const|let NAME = <init>` where
// <init> references another top-level ident declared later in the same
// file. Catches v443 (IIFE form) and v444 (.map() form) without needing
// to enumerate RHS shapes.
//
// Returning `_notImplemented: true` so callers (build.js in v448) can
// treat it as non-fatal until v447b lands.
function checkTDZOrder(_files) {
  return { hits: [], ok: true, _notImplemented: true };
}

module.exports = {
  checkCollisions,
  checkTDZOrder,
  checkRgbaOutput,
  _stripStringsAndComments,
  _findTopLevelDecls,
};
