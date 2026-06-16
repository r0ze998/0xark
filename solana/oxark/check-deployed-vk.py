#!/usr/bin/env python3
"""Sanity-check the built program binary embeds the correct hand_commitment VK.

The hand_commitment Groth16 verification key is embedded in the program as byte
arrays (groth16::hand_commitment_vk). The delta_g2 point uniquely fingerprints a
trusted setup, so we grep the compiled .so for the expected delta and assert the
known-bad deltas are absent. alpha_g1/beta_g2/gamma_g2 come from the shared ptau
and are identical across setups, so they CANNOT distinguish versions — only delta
can. Run after `make build`:

    python3 check-deployed-vk.py [path/to/oxark.so]
"""
import sys

SO_PATH = sys.argv[1] if len(sys.argv) > 1 else "target/deploy/oxark.so"

# v3 (YKK-33, Poseidon(6) syscall circuit) delta_g2 — the CURRENT correct VK.
CORRECT_DELTA = bytes([
    44, 106, 199, 25, 100, 165, 242, 95, 71, 185, 181, 145, 193, 230, 115, 209,
    9, 48, 245, 5, 191, 155, 202, 239, 187, 197, 78, 223, 83, 47, 54, 142,
])

# Known-bad deltas that must NOT appear:
#   v2 (Poseidon(15)) delta — reveal_hand couldn't run on-chain (>8M CU).
STALE_V2_DELTA = bytes([
    20, 240, 89, 229, 101, 154, 207, 46, 168, 230, 92, 111, 116, 62, 55, 252,
])
#   orphaned commit_hand VK delta (the 0b69efe bug) — no matching zkey ever existed.
ORPHAN_DELTA = bytes([
    28, 19, 210, 173, 36, 148, 143, 250, 29, 242, 173, 209, 159, 185, 144, 103,
])

so = open(SO_PATH, "rb").read()
correct = so.count(CORRECT_DELTA)
stale = so.count(STALE_V2_DELTA)
orphan = so.count(ORPHAN_DELTA)

print(f".so: {SO_PATH} ({len(so)} bytes)")
print(f"v3 delta (correct) present : {correct > 0}  (count={correct})")
print(f"v2 delta (stale)   present : {stale > 0}  (count={stale})")
print(f"orphan delta       present : {orphan > 0}  (count={orphan})")

ok = correct > 0 and stale == 0 and orphan == 0
print("RESULT:", "PASS — only the v3 hand_commitment VK is embedded" if ok else "FAIL")
sys.exit(0 if ok else 1)
