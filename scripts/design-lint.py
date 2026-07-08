#!/usr/bin/env python3
"""design-lint.py — canonical Sprite Seas design-floor linter (DESIGN.md Appendix B).

One linter, identical on macOS and CI (GNU/BSD grep disagree on -P + astral
ranges, so we do NOT shell out to grep). Scans the active client JS
(solana/client/src/**/*.js + solana/client/app.js; tokens.css excluded — it is
the one file allowed to hold raw palette hex).

Categories (all must be 0 to PASS, except round-hardcode which is report-only):
  brand-hex     raw hex that HAS a token → must go through var(--token)
  sub-13px      font-size in px below the 13px floor
  sub-floor-rem font-size in rem below ~0.81rem (13px @16) → 0.0–0.7 range
  faux-bold     font-weight:bold / "bold ... VT323" (VT323 ships one weight)
  emoji         OS emoji / symbol glyphs in UI strings (reports LINES + OCCURRENCES)
  round-hardcode (REPORT-ONLY, F1 scope) hardcoded round arg `duelId, 1,`

Usage: python3 scripts/design-lint.py [--root DIR]
Exit 0 = PASS, 1 = violations in an enforced category.
"""
import argparse
import os
import re
import sys

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
        # emoji cleanup is PR-C (F0-4 px-icon set). Report-only until then; PR-C
        # flips this to True once the 72 glyphs are replaced by the SVG sprite.
        "emoji": (EMOJI_RE, False),
        "round-hardcode": (ROUND_HARDCODE_RE, False),  # report-only (F1 scope)
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
    ap.add_argument("--root", default=os.getcwd())
    ap.add_argument("-v", "--verbose", action="store_true", help="print every offending line")
    args = ap.parse_args()

    checks, results = scan(args.root)
    failed = False
    print("── Sprite Seas design-lint ─────────────────────────────")
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
    print("────────────────────────────────────────────────────────")
    if failed:
        print("RESULT: FAIL")
        return 1
    print("RESULT: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
