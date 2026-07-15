# 0xARK Anchor workspace
#
# IMPORTANT: the litesvm integration tests execute target/deploy/oxark.so via
# include_bytes! — `cargo test` alone does NOT rebuild that binary, so running
# it after Rust changes silently tests a stale program. Always go through
# `make test` (or run `anchor build` yourself first).

.PHONY: build test test-fast clippy fmt

# anchor build also regenerates target/idl/*.json. CI uses cargo build-sbf
# directly (no anchor CLI there); both produce target/deploy/oxark.so.
# YKK-53: after anchor build, auto-sync the offline client IDL copy
# (solana/client/oxark-idl.json) — anchor build does NOT copy it, so it went
# stale on every instruction add (hand-cp'd 63->66 on 2026-07-05). The cargo
# build-sbf fallback (CI, no anchor) emits no IDL, so it is skipped there —
# CI staleness is caught by scripts/check-idl-sync.py instead.
build:
	@command -v anchor >/dev/null 2>&1 \
		&& { anchor build && cp target/idl/oxark.json ../client/oxark-idl.json; } \
		|| cargo build-sbf --manifest-path programs/oxark/Cargo.toml

test: build
	cargo test

# Skip the SBF rebuild — ONLY safe when no program source changed since the
# last `make build` (e.g. iterating on test-only code).
test-fast:
	cargo test

clippy:
	cargo clippy

fmt:
	cargo fmt
