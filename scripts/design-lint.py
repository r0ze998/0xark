#!/usr/bin/env python3
"""design-lint.py — 0xARK legacy-component regression linter (DESIGN.md v2).

One linter, identical on macOS and CI (GNU/BSD grep disagree on -P + astral
ranges, so we do NOT shell out to grep). Scans the active client JS
(solana/client/src/**/*.js + solana/client/app.js; tokens.css excluded — it is
the one file allowed to hold raw palette hex).

Categories (all must be 0 to PASS):
  brand-hex     raw hex that HAS a token → must go through var(--token)
  sub-13px      font-size in px below the 13px floor
  sub-floor-rem font-size in rem below ~0.81rem (13px @16) → 0.0–0.7 range
  faux-bold     font-weight:bold / "bold ... VT323" (VT323 ships one weight)
  emoji         OS emoji / symbol glyphs in UI strings (reports LINES + OCCURRENCES)
  round-hardcode (ENFORCED since F1-1) hardcoded round arg `duelId, 1,`
  bare-import   (ENFORCED since F1-1) shared symbol used with no import/definition

Usage: python3 scripts/design-lint.py [--root DIR]
Exit 0 = PASS, 1 = violations in an enforced category.
"""
import argparse
import os
import re
import sys
from pathlib import Path

# Scan root is derived from THIS script's location, not cwd — running from /tmp
# (or anywhere) must scan the real tree, never zero files. scripts/design-lint.py
# → parents[1] == repo root.
REPO_ROOT = Path(__file__).resolve().parents[1]

# Belt-and-suspenders against a vacuous pass: a healthy client tree has well over
# this many JS files. If we scan fewer, the root is wrong or the tree moved —
# hard-FAIL loudly rather than report a misleading PASS over nothing.
MIN_SCANNED_FILES = 20

# Palette hex that has a tokens.css variable. Untokenized greys (#888/#555/…)
# and the residual grey ladder are intentionally NOT listed yet.
TOKENED_HEX = [
    "#c9a227", "#0a0e1a", "#1a1f33", "#d63b3b", "#4a90d9", "#e8dfc8", "#d8b034",
    "#8a8a8a", "#4a9c6f", "#4a7ab5", "#5ab87a", "#f5c842",
]
HEX_RE = re.compile("|".join(re.escape(h) for h in TOKENED_HEX), re.IGNORECASE)
SUB13_PX_RE = re.compile(r"font-size:\s*(?:8|9|10|11|12)px")
SUB_FLOOR_REM_RE = re.compile(r"font-size:\s*0\.[0-7]")
FAUX_BOLD_RE = re.compile(r"font-weight:\s*bold|bold\s+[^;'\"]*VT323")
EMOJI_RE = re.compile("[\U0001F300-\U0001FAFF☀-➿⌀-⏿]")
ROUND_HARDCODE_RE = re.compile(r"duelId,\s*1,")

# ── bare-import guard (ENFORCED since F1-1 V-2) ──────────────────────────────
# Shared symbols live in their own modules and MUST be imported (or defined) in
# any file that calls them. ES modules do NOT leak scope, so a bare reference is
# a runtime ReferenceError, not a warning. This class shipped three times during
# F0-4 (preparation/interruption/loot all used pxIcon() with no import). Any file
# that uses `SYM(` or `${SYM` without importing or defining SYM fails the lint.
SHARED_SYMBOLS = [
    "pxIcon", "showToast", "tierForVault", "CardHTML", "CardFrameHTML",
    "ACTION_NAMES", "ACTION_LABELS", "RoundHudHTML", "showRoundBridge",
    "injectRoundUiCSS", "advanceRound", "rarityOf", "factionOf", "rarityKeyOf",
    # YKK-15: onchain.js split into src/onchain/{pda,readers,tx,rpc}.js. These are
    # the INTERNAL cross-module exports (never on the window.oxarkOnchain public
    # surface, so screens never reference them) — any src/onchain module using one
    # must import it. Surface symbols (createGame, getPlayerState, findGamePDA, …)
    # are intentionally omitted: screens call them as oxarkOnchain.<name>(), which
    # this guard would otherwise flag as a bare use.
    "getConnection", "disc", "getProgramId", "getCardsProgramId",
    "getDelegationProgramId", "computeBudgetIxs", "requestHeapFrameIx",
    "writeU8", "writeU32LE", "writeU64LE", "writeI64LE", "writeBytes", "writeBool",
    "encodeCreateMetadataV3", "findAssociatedTokenAddress", "findMetadataPDA",
    "findSoloCardMintPDA", "findCardMintRecordPDA", "findCardPoolPDA",
    "findDelegationPDAs",  # NB: findPrizePoolPDA omitted — a config.js comment
    # references "findPrizePoolPDA()" and this guard does not strip comments.
    "ANCHOR_ERRORS", "COMPUTE_BUDGET", "HEAP_FRAME_BYTES", "NFT_CARD_NAMES",
    "OPS_TREASURY_PK", "SETTLE_BATCH", "SLOT_HASHES_PUBKEY", "DEVNET_RPC",
    "SPL_TOKEN_PROGRAM_ID", "ASSOCIATED_TOKEN_PROGRAM_ID", "SYSVAR_RENT_PUBKEY",
    "TOKEN_METADATA_PROGRAM_ID",
]
IMPORT_STMT_RE = re.compile(r"import\b.*?from\s*['\"][^'\"]+['\"]", re.S)


def _uses_symbol(sym, line):
    # call form `SYM(` or template-interpolation form `${SYM`, not a longer ident.
    call = re.search(r"(?<![\w$])" + re.escape(sym) + r"\s*\(", line)
    interp = re.search(r"\$\{\s*" + re.escape(sym) + r"(?![\w$])", line)
    return bool(call or interp)


def _has_binding(sym, content, imports_blob):
    # imported (named/default) anywhere, or locally defined.
    if re.search(r"\b" + re.escape(sym) + r"\b", imports_blob):
        return True
    return bool(re.search(r"\b(?:function|const|let|var)\s+" + re.escape(sym) + r"\b", content))


def scan_bare_imports(root):
    violations = []  # (rel, lineno, sym)
    for path in js_files(root):
        rel = os.path.relpath(path, root)
        try:
            with open(path, encoding="utf-8") as fh:
                content = fh.read()
        except (OSError, UnicodeDecodeError) as e:
            print(f"WARN: could not read {rel}: {e}", file=sys.stderr)
            continue
        imports_blob = "\n".join(IMPORT_STMT_RE.findall(content))
        for sym in SHARED_SYMBOLS:
            if _has_binding(sym, content, imports_blob):
                continue
            for lineno, line in enumerate(content.splitlines(), 1):
                if _uses_symbol(sym, line):
                    violations.append((rel, lineno, sym))
                    break  # one hit per (file, symbol) is enough to fail
    return violations


def js_files(root):
    client = os.path.join(root, "solana", "client")
    out = []
    for base, _dirs, files in os.walk(os.path.join(client, "src")):
        for f in files:
            if f.endswith(".js") and f != "tokens.css":
                out.append(os.path.join(base, f))
    app = os.path.join(client, "app.js")
    if os.path.exists(app):
        out.append(app)
    return sorted(out)


def scan(root):
    checks = {
        "brand-hex": (HEX_RE, True),
        "sub-13px": (SUB13_PX_RE, True),
        "sub-floor-rem": (SUB_FLOOR_REM_RE, True),
        "faux-bold": (FAUX_BOLD_RE, True),
        # ENFORCED since F0-4: the 72 emoji were replaced by the px-icon SVG sprite
        # (src/lib/px-icons.js). OS emoji are banned in UI strings (DESIGN.md).
        "emoji": (EMOJI_RE, True),
        # ENFORCED since F1-1: the hardcoded round arg `duelId, 1,` was removed
        # (reveal.js now passes s.round; interruption's premature reveal was deleted).
        # advanceRound() is the only round transition — no literal round may recur.
        "round-hardcode": (ROUND_HARDCODE_RE, True),
    }
    # name -> {"lines": [(file, lineno, text)], "occ": int}
    results = {k: {"lines": [], "occ": 0} for k in checks}
    round_confined = os.path.join("src", "components")
    for path in js_files(root):
        rel = os.path.relpath(path, root)
        try:
            with open(path, encoding="utf-8") as fh:
                for lineno, line in enumerate(fh, 1):
                    for name, (rx, _enforced) in checks.items():
                        if name == "round-hardcode" and round_confined not in rel:
                            continue
                        found = rx.findall(line)
                        if found:
                            results[name]["lines"].append((rel, lineno, line.rstrip("\n")))
                            results[name]["occ"] += len(found)
        except (OSError, UnicodeDecodeError) as e:
            print(f"WARN: could not read {rel}: {e}", file=sys.stderr)
    return checks, results


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=str(REPO_ROOT),
                    help="scan root (defaults to the repo root derived from this script's path)")
    ap.add_argument("-v", "--verbose", action="store_true", help="print every offending line")
    args = ap.parse_args()

    # Vacuous-scan guard: refuse to report PASS over an empty/wrong tree.
    scanned = len(js_files(args.root))
    if scanned < MIN_SCANNED_FILES:
        print("── 0xARK design-lint ─────────────────────────────")
        print(f"  FAIL  scanned only {scanned} file(s) under {args.root} "
              f"(expected ≥ {MIN_SCANNED_FILES}).")
        print("  The scan root is wrong or the client tree moved — refusing a "
              "vacuous PASS.")
        print("────────────────────────────────────────────────────────")
        print("RESULT: FAIL")
        return 1

    checks, results = scan(args.root)
    failed = False
    print("── 0xARK design-lint ─────────────────────────────")
    print(f"  scanned {scanned} JS files under {os.path.relpath(args.root)}")
    for name, (_rx, enforced) in checks.items():
        r = results[name]
        n_lines = len(r["lines"])
        n_occ = r["occ"]
        tag = "" if enforced else "  (report-only)"
        unit = f"{n_lines} lines / {n_occ} occ" if name == "emoji" else f"{n_lines} hits"
        status = "ok" if (n_lines == 0 or not enforced) else "FAIL"
        print(f"  {status:4} {name:16} {unit}{tag}")
        if enforced and n_lines:
            failed = True
        if (args.verbose or (enforced and n_lines)) and n_lines:
            for rel, lineno, text in r["lines"][:200]:
                print(f"        {rel}:{lineno}: {text.strip()[:110]}")

    # bare-import guard (whole-file analysis, ENFORCED)
    bare = scan_bare_imports(args.root)
    b_status = "ok" if not bare else "FAIL"
    print(f"  {b_status:4} {'bare-import':16} {len(bare)} hits")
    if bare:
        failed = True
        for rel, lineno, sym in bare[:200]:
            print(f"        {rel}:{lineno}: {sym}() used without import/definition")
    print("────────────────────────────────────────────────────────")
    if failed:
        print("RESULT: FAIL")
        return 1
    print("RESULT: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
