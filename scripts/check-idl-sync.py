#!/usr/bin/env python3
"""check-idl-sync.py — fail if solana/client/oxark-idl.json is stale vs the program.

`anchor build` regenerates solana/oxark/target/idl/oxark.json, but nothing copies
it to solana/client/oxark-idl.json (the offline-tooling copy). It was hand-cp'd
63->66 on 2026-07-05 and silently drifts on every instruction add (YKK-53).

CANONICAL SYNC PATH: run `make build` in the canonical tree
(solana/oxark, which has the git-ignored program keypairs). anchor build
regenerates target/idl/oxark.json and the Makefile cp's it to the client. That is
the ONLY supported way to resync the client IDL. Do NOT hand-edit the client IDL —
hand-editing bypasses the one mechanism that guarantees it matches what anchor
derives from source. (If `anchor build` reports a "Program ID mismatch", that is
the missing-keypair signal — target/deploy/*-keypair.json is git-ignored, so a
fresh worktree lacks it — not a reason to edit the IDL by hand.)

This guard is the toolchain-free backstop. CI has no anchor CLI (it builds via
`cargo build-sbf`, which emits no IDL), so this compares the committed client IDL
against the authoritative source (lib.rs `#[program]`) directly:

  1. Instruction SET — every `pub fn` name must appear in the client IDL and vice
     versa (catches added/removed/renamed instructions).
  2. Instruction ARGS — for each instruction, the client IDL's arg NAMES must match
     the lib.rs signature's args (in order), and their TYPES must match where the
     Rust->IDL mapping is known. This is the layer that catches an arg being
     added/removed/renamed without resyncing the IDL (e.g. claim_battle_loot's
     `loser_field` removal). Exotic/custom arg types the mapper can't resolve are
     reported as warnings, never false failures.

Usage:  python3 scripts/check-idl-sync.py
Exit 0 = in sync, 1 = drift (prints the offending instruction/arg names).
"""
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
LIB_RS = REPO / "solana" / "oxark" / "programs" / "oxark" / "src" / "lib.rs"
CLIENT_IDL = REPO / "solana" / "client" / "oxark-idl.json"

PUB_FN_RE = re.compile(r"\bpub\s+fn\s+([a-z_][a-z0-9_]*)\s*(?:<[^>]*>)?\s*\(")

# Rust scalar type name == IDL type name (lowercase).
SCALARS = {
    "u8", "u16", "u32", "u64", "u128",
    "i8", "i16", "i32", "i64", "i128",
    "bool", "bytes",
}
_ARRAY_RE = re.compile(r"\[\s*(.+?)\s*;\s*(\d+)\s*\]\Z", re.DOTALL)
_OPTION_RE = re.compile(r"Option\s*<\s*(.+)\s*>\Z", re.DOTALL)
_VEC_RE = re.compile(r"Vec\s*<\s*(.+)\s*>\Z", re.DOTALL)


def _program_body(lib_rs: Path) -> str:
    """The balanced `{...}` body of the `#[program]` module."""
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
    return text[brace:i]


def _split_top_commas(s: str) -> list:
    """Split on commas that are not nested inside <>, [], (), {}."""
    parts, depth, cur = [], 0, ""
    for c in s:
        if c in "<[({":
            depth += 1
        elif c in ">])}":
            depth -= 1
        if c == "," and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += c
    if cur.strip():
        parts.append(cur)
    return [p.strip() for p in parts if p.strip()]


def program_fn_args(lib_rs: Path) -> dict:
    """{fn_name: [(arg_name, rust_type), ...]} for every `pub fn` in `#[program]`.

    The leading `ctx: Context<...>` is dropped — it is not an IDL arg.
    """
    body = _program_body(lib_rs)
    out = {}
    for m in PUB_FN_RE.finditer(body):
        name = m.group(1)
        # Balanced-paren scan of the argument list, starting at the `(`.
        i = m.end() - 1
        depth = 0
        start = i + 1
        while i < len(body):
            if body[i] == "(":
                depth += 1
            elif body[i] == ")":
                depth -= 1
                if depth == 0:
                    break
            i += 1
        arg_str = body[start:i]
        args = []
        for part in _split_top_commas(arg_str):
            if ":" not in part:
                continue
            nm, ty = part.split(":", 1)
            nm, ty = nm.strip(), ty.strip()
            if ty.startswith("Context"):
                continue  # the ctx handle — not an instruction arg
            args.append((nm, ty))
        out[name] = args
    return out


def rust_to_idl_type(ty: str):
    """Map a Rust type to its anchor-IDL encoding, or None if unmappable."""
    ty = ty.strip()
    if ty == "Pubkey":
        return "pubkey"
    if ty == "String":
        return "string"
    if ty in SCALARS:
        return ty
    m = _ARRAY_RE.match(ty)
    if m:
        inner = rust_to_idl_type(m.group(1))
        return None if inner is None else {"array": [inner, int(m.group(2))]}
    m = _OPTION_RE.match(ty)
    if m:
        inner = rust_to_idl_type(m.group(1))
        return None if inner is None else {"option": inner}
    m = _VEC_RE.match(ty)
    if m:
        inner_ty = m.group(1).strip()
        if inner_ty == "u8":
            return "bytes"  # anchor special-cases Vec<u8> as "bytes" (not {vec:u8})
        inner = rust_to_idl_type(inner_ty)
        return None if inner is None else {"vec": inner}
    return None  # custom struct / unknown — caller warns, no false failure


def _norm_idl_type(t):
    """Normalize an IDL type for comparison (older IDLs used 'publicKey')."""
    if t == "publicKey":
        return "pubkey"
    return t


def idl_instruction_args(idl: Path) -> dict:
    data = json.loads(idl.read_text(encoding="utf-8"))
    return {
        ix["name"]: [(a["name"], a.get("type")) for a in ix.get("args", [])]
        for ix in data.get("instructions", [])
    }


def main() -> int:
    if not LIB_RS.exists():
        sys.exit(f"FAIL: {LIB_RS} not found")
    if not CLIENT_IDL.exists():
        sys.exit(f"FAIL: {CLIENT_IDL} not found")

    lib_args = program_fn_args(LIB_RS)
    idl_args = idl_instruction_args(CLIENT_IDL)
    fns = set(lib_args)
    idl = set(idl_args)

    missing_from_idl = sorted(fns - idl)   # in lib.rs, not in client IDL
    extra_in_idl = sorted(idl - fns)       # in client IDL, not in lib.rs

    print(f"lib.rs #[program] pub fns : {len(fns)}")
    print(f"client IDL instructions   : {len(idl)}")

    errors = []
    warnings = []

    # ── Layer 2: per-instruction arg check (names strict, types best-effort) ──────
    for name in sorted(fns & idl):
        lib_a = lib_args[name]
        idl_a = idl_args[name]
        lib_names = [n for n, _ in lib_a]
        idl_names = [n for n, _ in idl_a]
        if lib_names != idl_names:
            errors.append(
                f"  {name}: arg NAMES differ\n"
                f"      lib.rs : {lib_names}\n"
                f"      IDL    : {idl_names}"
            )
            continue  # names already drifted — skip type check for this ix
        for (an, rust_ty), (_, idl_ty) in zip(lib_a, idl_a):
            mapped = rust_to_idl_type(rust_ty)
            if mapped is None:
                warnings.append(
                    f"  {name}.{an}: Rust type `{rust_ty}` not mapped — type not checked"
                )
                continue
            want = mapped if isinstance(mapped, dict) else _norm_idl_type(mapped)
            got = idl_ty if isinstance(idl_ty, dict) else _norm_idl_type(idl_ty)
            if want != got:
                errors.append(
                    f"  {name}.{an}: TYPE differs — lib.rs `{rust_ty}` -> {want!r}, IDL {got!r}"
                )

    for w in warnings:
        print(f"WARN {w}")

    if not missing_from_idl and not extra_in_idl and not errors:
        print("OK  solana/client/oxark-idl.json is in sync with lib.rs (names + args)")
        return 0

    print("\nFAIL  solana/client/oxark-idl.json is STALE — resync it:")
    print("      run `make build` in solana/oxark (the canonical tree, with keypairs)")
    print("      — do NOT hand-edit the client IDL.")
    if missing_from_idl:
        print("  instructions in lib.rs but MISSING from client IDL:")
        for n in missing_from_idl:
            print(f"    + {n}")
    if extra_in_idl:
        print("  instructions in client IDL but GONE from lib.rs:")
        for n in extra_in_idl:
            print(f"    - {n}")
    if errors:
        print("  argument drift:")
        for e in errors:
            print(e)
    return 1


if __name__ == "__main__":
    sys.exit(main())
