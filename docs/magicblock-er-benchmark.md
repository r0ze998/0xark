# MagicBlock ER Benchmark — 0xARK Phase 10

> Run `DEVNET_RPC=https://api.devnet.solana.com node solana/oxark/t15-e2e.js` to reproduce.

## Results (devnet — 2026-04-28)

> Populate this table after running t15-e2e.js on devnet.

| Step | Layer | Latency (ms) | Sig |
|------|-------|-------------|-----|
| create_game | Base | — | — |
| join_game | Base | — | — |
| start_game | Base | — | — |
| delegate_session | Base | — | — |
| commit_action | Base (baseline) | SKIP (delegated) | — |
| commit_action | ER (Magic Router) | — | — |
| reveal_action | ER (Magic Router) | — | — |
| undelegate_session | ER (Magic Router) | — | — |

## Latency Comparison

| Metric | Value |
|--------|-------|
| Base layer commit | — ms |
| ER commit | — ms |
| ER reveal | — ms |
| Speedup | — x |
| Devnet RPC ping | — ms |
| Magic Router ping | — ms |

## ER Cycle Verdict

`PASS / FAIL` — commit→reveal via Magic Router

## Notes

- Delegation uses `ASIA_VALIDATOR` (`commit_frequency_ms: 3000`)
- ER router endpoint: `https://devnet-router.magicblock.app`
- `game` and `playerState` PDAs are delegated; `commit` PDA remains on base chain
- Base layer commit SKIP after delegation is expected and confirms delegation is active
