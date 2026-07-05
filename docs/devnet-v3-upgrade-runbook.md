# Devnet upgrade + verify runbook (main @ `ff1e141`)

> **Updated 2026-07-05 for `ff1e141`.** The original of this file was written at
> YKK-12/YKK-33 time (PR #19/#20) to close the round-1 e2e gap. Since then main
> gained, via PR #32 + #33: `settle_duel_history` (P0 fix), `claim_timeout_win`
> (stall timeout), `refill_energy` + energy fields on PlayerState, the full
> promote-ladder + tier costs, and season prize settlement. **lib.rs is now 66
> `pub fn` (was 52).** This deploy ships all of that — not just the v3 circuit.
>
> The ZK layer is UNCHANGED since v3 (none of the new work touches the circuit),
> so the VK gate (`check-deployed-vk.py`) and the client zkey/wasm are still
> correct and verified current (hashes below match the repo at `ff1e141`).
>
> **Human runs deploy + keys;** cc prepared this and re-runs the e2e once step 5
> = PASS.

Prereqs: clean checkout of `main` at `ff1e141` (or later). solana CLI on PATH:

```sh
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"   # Agave 3.1.x
```

## 0. Confirm cluster = devnet
```sh
solana config get        # RPC URL must be https://api.devnet.solana.com
# if not: solana config set --url https://api.devnet.solana.com
```

## 1. Build from `ff1e141`
```sh
cd solana/oxark
make build               # anchor build → target/deploy/oxark.so + target/idl/oxark.json
ls -la target/deploy/oxark.so
```

## 2. ⚠️ SIZE GATE (new — the old "no extend needed" claim is stale)
At PR #19 the program was ~1,159,336 bytes and fit under the deployed ProgramData
allocation of **~1,246,408 bytes (1.25 MB)**. The +14 instructions since then have
grown the binary. **You must check whether it still fits before deploying** — a
one-shot `solana program deploy` FAILS if the new code exceeds the existing
allocation.

```sh
SO_SIZE=$(stat -c%s target/deploy/oxark.so 2>/dev/null || stat -f%z target/deploy/oxark.so)
echo "oxark.so = $SO_SIZE bytes"
# Deployed ProgramData allocation (authoritative — read it live, don't assume):
solana program show 5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN --url https://api.devnet.solana.com
#   → note the "Data Length" / ProgramData size.
```

Decision:
- **If `oxark.so` ≤ deployed Data Length** → proceed to step 3 as a normal upgrade.
- **If `oxark.so` > deployed Data Length** → you must extend FIRST (needs upgrade
  authority; costs a little devnet SOL for the added rent):
  ```sh
  # extend by the shortfall + headroom (example: +64 KB). ADDITIONAL_BYTES is the
  # amount to ADD, not the new total.
  solana program extend 5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN <ADDITIONAL_BYTES> \
    --url https://api.devnet.solana.com \
    --keypair /path/to/upgrade-authority.json
  ```
  Then proceed to step 3.

(Rule of thumb: if `oxark.so` is, say, 1,270,000 and allocation is 1,246,408, add
at least `1,270,000 - 1,246,408 = 23,592` plus headroom → extend by 65536.)

## 3. PRE-deploy VK gate (verify the LOCAL build is v3 before touching devnet)
```sh
python3 check-deployed-vk.py target/deploy/oxark.so
# expect: v3 delta present, v2/orphan absent  →  RESULT: PASS
```
If this fails, the build isn't right — stop, don't deploy. (This still works: the
circuit is unchanged since v3, so the delta_g2 fingerprint is unchanged.)

## 4. Upgrade-deploy to devnet  ⚠️ HUMAN — needs the upgrade-authority key
Program is upgradeable (BPFLoaderUpgradeable). ProgramData already holds ~8.6 SOL;
the fee payer just needs a little devnet SOL.

- program-id: `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN`
- upgrade authority: `DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R`
  (keypair at `/path/to/upgrade-authority.json` — **never commit it**)

Primary (one-shot; only valid if the size gate passed without extend, or after a
successful extend):
```sh
solana program deploy solana/oxark/target/deploy/oxark.so \
  --program-id 5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN \
  --upgrade-authority /path/to/upgrade-authority.json \
  --url https://api.devnet.solana.com \
  --with-compute-unit-price 1
```

Fallback if devnet drops mid-deploy (buffer survives; resume instead of re-paying):
```sh
solana program write-buffer solana/oxark/target/deploy/oxark.so \
  --buffer-authority /path/to/upgrade-authority.json \
  --url https://api.devnet.solana.com            # prints "Buffer: <BUFFER>"

solana program deploy \
  --program-id 5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN \
  --buffer <BUFFER> \
  --upgrade-authority /path/to/upgrade-authority.json \
  --url https://api.devnet.solana.com
# orphaned buffer? reclaim rent: solana program close <BUFFER> \
#   --buffer-authority /path/to/upgrade-authority.json --url https://api.devnet.solana.com
```

## 5. POST-deploy gate (re-opens the e2e)
```sh
solana program show 5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN   # "Last Deployed In Slot" should advance
solana program dump 5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN /tmp/onchain.so
python3 solana/oxark/check-deployed-vk.py /tmp/onchain.so
# expect: RESULT: PASS  (v3 delta present, v2/orphan absent)
```

> ⚠️ Don't compare sizes/hashes of the dump. `solana program dump` returns the full
> ProgramData account, zero-padded after the code, so it won't hash-match the local
> build. The `check-deployed-vk.py` substring grep is the correct verification.

## 5b. NEW-INSTRUCTION smoke gate (the VK gate alone can't see these)
The VK gate only checks the ZK circuit. Confirm the newly-added instructions are
actually in the deployed binary before handing off to e2e. Cheapest reliable check
is one real call each on devnet (read-only-ish; use throwaway/expected-fail inputs):

- `refill_energy` — call with a funded player that already has a PlayerState (from
  `register_waitlist`). Success (energy→5, small SOL to ops) proves it's deployed.
- `settle_duel_history` — call against a NOT-finished duel; expect `DuelNotOver`.
  Getting that specific error (not "instruction not found"/discriminator mismatch)
  proves the instruction is present.
- `claim_timeout_win` — call before the stall deadline; expect the "too early"
  error. Same logic: a *domain* error (not a dispatch error) = deployed.

If any returns an unknown-instruction / discriminator error, the deployed binary is
not `ff1e141` — re-check steps 1–4.

## 6. Refresh the served client (gh-pages)  ⚠️ two things, not one
**(a) ZK artifacts** — must serve v3, or commit_hand fails `ZkProofInvalid`.
These are UNCHANGED since v3 and verified current at `ff1e141`:
```
solana/client/hand_commitment_final.zkey  sha256 6fe2b94a98cfef4d8fb49a8b8bb3a6f31512a63dc8af2cd8c621e11eb03d2f23
solana/client/hand_commitment.wasm        sha256 8cfaeed6c0bb9b94811a89d8837fb0e7eb4e542a4d2891e86f4d4df6ab8279f5
```
If gh-pages already served v3, no change needed here — re-confirm the hashes match.

**(b) IDL — likely a no-op for the client, but sync for tooling.** `anchor build`
regenerated `target/idl/oxark.json` (66 instructions). There is NO automatic copy to
`solana/client/oxark-idl.json`, so that file is stale. **However, `onchain.js` does
NOT read any IDL at runtime — it hand-builds instruction data via `disc()`** and
already has wrappers for every new instruction (`settleDuelHistory`, `claimTimeoutWin`,
`refillEnergy`, `promoteCard`). So the stale client IDL does **not** block e2e calls.
Sync it anyway if any offline tooling/tests consume it, for hygiene:
```sh
cp solana/oxark/target/idl/oxark.json solana/client/oxark-idl.json
git diff --stat solana/client/oxark-idl.json
```
Verified at `ff1e141`: the client has all four new methods wired by hand; no
client-code change is required before e2e exercises settle/timeout/energy.

## 7. Re-request the e2e
When step 5 = PASS and 5b shows domain errors (not dispatch errors), ping cc to run
the round-1 devnet e2e (init_duel → commit_hand → reveal_hand, both wallets), then
rounds 2–5. Note that commit_hand now charges energy, so the e2e wallets need a
PlayerState with energy (via register_waitlist, or the round-1 first commit fails
`InsufficientEnergy`).

---
**Mainnet note (unchanged, still true):** the v3 zkey came from a **dev** trusted
setup — fine for devnet, NOT mainnet. A production ceremony (regenerate VK + client
zkey, re-embed, redeploy) is required before mainnet (YKK-35).

**Stale-doc note:** `CLAUDE.md`'s "52 pub fn / IDL in sync" table is out of date
(now 66). Worth fixing next time CLAUDE.md is touched.
