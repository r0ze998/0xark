#!/usr/bin/env python3
"""check-idl-sync.py — fail if solana/client/oxark-idl.json is stale vs the program.

`anchor build` regenerates solana/oxark/target/idl/oxark.json, but nothing copies
it to solana/client/oxark-idl.json (the offline-tooling copy). It was hand-cp'd
63->66 on 2026-07-05 and silently drifts on every instruction add (YKK-53).

The Makefile `build` target now auto-copies the fresh IDL after `anchor build`.
This guard catches the case where a commit added/removed/renamed an instruction
but the committed client IDL was not resynced — it compares the client IDL's
instruction set against the authoritative `pub fn` set in lib.rs (the same source
`anchor build` derives the IDL from). CI has no anchor CLI (it builds via
`cargo build-sbf`, which does not emit an IDL), so this source-level comparison is
the deterministic, toolchain-free equivalent of a fresh-build diff.

Usage:  python3 scripts/check-idl-sync.py
Exit 0 = in sync, 1 = drift (prints the offending instruction names).
"""
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
LIB_RS = REPO / "solana" / "oxark" / "programs" / "oxark" / "src" / "lib.rs"
CLIENT_IDL = REPO / "solana" / "client" / "oxark-idl.json"

PUB_FN_RE = re.compile(r"\bpub\s+fn\s+([a-z_][a-z0-9_]*)\s*(?:<[^>]*>)?\s*\(")


def program_fns(lib_rs: Path) -> set:
    """Instruction handlers = every `pub fn` inside the `#[program]` module."""
    text = lib_rs.read_text(encoding="utf-8")
    marker = text.find("#[program]")
    if marker == -1:
        sys.exit(f"FAIL: no #[program] module found in {lib_rs}")
    brace = text.find("{", marker)
    depth, i = 0, brace
    while i < len(text):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                break
        i += 1
    body = text[brace:i]
    return set(PUB_FN_RE.findall(body))


def idl_instructions(idl: Path) -> set:
    data = json.loads(idl.read_text(encoding="utf-8"))
    return {ix["name"] for ix in data.get("instructions", [])}


def main() -> int:
    if not LIB_RS.exists():
        sys.exit(f"FAIL: {LIB_RS} not found")
    if not CLIENT_IDL.exists():
        sys.exit(f"FAIL: {CLIENT_IDL} not found")

    fns = program_fns(LIB_RS)
    idl = idl_instructions(CLIENT_IDL)

    missing_from_idl = sorted(fns - idl)   # in lib.rs, not in client IDL (stale IDL)
    extra_in_idl = sorted(idl - fns)       # in client IDL, not in lib.rs (removed/renamed)

    print(f"lib.rs #[program] pub fns : {len(fns)}")
    print(f"client IDL instructions   : {len(idl)}")

    if not missing_from_idl and not extra_in_idl:
        print("OK  solana/client/oxark-idl.json is in sync with lib.rs")
        return 0

    print("\nFAIL  solana/client/oxark-idl.json is STALE — resync it:")
    print("      cp solana/oxark/target/idl/oxark.json solana/client/oxark-idl.json")
    print("      (or run `make build` from solana/oxark with the anchor CLI installed)")
    if missing_from_idl:
        print("  instructions in lib.rs but MISSING from client IDL:")
        for n in missing_from_idl:
            print(f"    + {n}")
    if extra_in_idl:
        print("  instructions in client IDL but GONE from lib.rs:")
        for n in extra_in_idl:
            print(f"    - {n}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
