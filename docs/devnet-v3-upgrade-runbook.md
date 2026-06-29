# Devnet v3 upgrade + verify runbook (YKK-12 / YKK-33)

Closes the deploy gap that blocked the round-1 e2e. **Human runs deploy + keys;**
cc only prepared this and re-runs the e2e once step 4 = PASS.

Prereqs: PR #19 then #20 merged into `main`; working from a clean checkout of
merged `main`. Put the solana CLI on PATH:

```sh
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"   # solana-cli 3.1.12 (Agave)
```

## 0. Confirm cluster = devnet
```sh
solana config get        # RPC URL must be https://api.devnet.solana.com
# if not: solana config set --url https://api.devnet.solana.com
```

## 1. Build v3 from merged main
```sh
cd solana/oxark
make build               # anchor build → target/deploy/oxark.so  (~1,159,336 bytes)
```

## 2. PRE-deploy gate (verify the LOCAL build is v3 before touching devnet)
```sh
python3 check-deployed-vk.py target/deploy/oxark.so
# expect: v3 delta present, v2/orphan absent  →  RESULT: PASS
```
If this fails, the build isn't from merged main — stop, don't deploy.

## 3. Upgrade-deploy to devnet  ⚠️ HUMAN — needs the upgrade-authority key
Program is upgradeable (BPFLoaderUpgradeable). v3 (1.16MB) is **smaller** than the
deployed program (1.25MB), so the existing ProgramData account has room — no
`solana program extend` needed. ProgramData already holds ~8.6 SOL; the fee payer
just needs a little devnet SOL.

- program-id: `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN`
- upgrade authority: `DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R`
  (place its keypair at `/path/to/upgrade-authority.json` — **never commit it**)

Primary (one-shot):
```sh
solana program deploy solana/oxark/target/deploy/oxark.so \
  --program-id 5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN \
  --upgrade-authority /path/to/upgrade-authority.json \
  --url https://api.devnet.solana.com \
  --with-compute-unit-price 1
```

Fallback if devnet drops mid-deploy (buffer survives; resume/recover instead of
re-paying from scratch). Set the buffer authority to the upgrade-authority key so
the subsequent deploy-from-buffer is allowed:
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
(The deploy fee payer defaults to your configured keypair — `solana config get` /
`--keypair` — which needs a little devnet SOL.)

## 4. POST-deploy gate (this is what re-opens the e2e)
```sh
solana program show 5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN   # "Last Deployed In Slot" should advance
solana program dump 5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN /tmp/onchain_v3.so
python3 solana/oxark/check-deployed-vk.py /tmp/onchain_v3.so
# expect: RESULT: PASS  (v3 delta present, v2/orphan absent)
```

> ⚠️ Don't compare sizes/hashes of the dump. `solana program dump` returns the
> full ProgramData account, which keeps its original ~1.25MB allocation and is
> zero-padded after the smaller v3 code — so `/tmp/onchain_v3.so` stays
> ~1,246,408 bytes and its sha256 won't match the local build. The
> `check-deployed-vk.py` substring grep is the correct verification.

## 5. Refresh the served client (gh-pages)
The deployed client must serve the **v3** artifacts, or commit_hand fails with
`ZkProofInvalid`:
```
hand_commitment_final.zkey  sha256 6fe2b94a98cfef4d8fb49a8b8bb3a6f31512a63dc8af2cd8c621e11eb03d2f23
hand_commitment.wasm        sha256 8cfaeed6c0bb9b94811a89d8837fb0e7eb4e542a4d2891e86f4d4df6ab8279f5
```

## 6. Re-request the e2e
When step 4 returns PASS, ping cc to run the round-1 devnet e2e (init_duel →
commit_hand → reveal_hand, both wallets), then rounds 2–5.

---
Note: the v3 zkey came from a **dev** trusted setup — fine for devnet validation,
not mainnet. A production ceremony is required before mainnet (regenerate VK +
client zkey, re-embed, redeploy).
