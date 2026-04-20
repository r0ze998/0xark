# CDN Bill of Materials — 0xARK

> Pinned 2026-04-20 (T28 黒画面 fix + CDN 堅牢化)

| Library | CDN | Pinned version | Previous | Reason for pin | Last audited |
|---------|-----|---------------|----------|----------------|--------------|
| pixi.js | jsdelivr | **7.1.4** | `@7` (major-only) | v7.2.0 introduced Color class with stricter rgba parsing — unpinned @7 pulled latest minor and broke canvas init (`display:none` never cleared → black screen) | 2026-04-20 |
| snarkjs | jsdelivr | 0.7.4 | — already pinned | — | 2026-04-20 |
| @solana/web3.js | unpkg | 1.95.3 | — already pinned | — | 2026-04-20 |
| poseidon-lite | esm.sh | 0.2.1 | — already pinned | — | 2026-04-20 |

## PixiJS version boundary

| Version | Change | Impact |
|---------|--------|--------|
| v7.1.4 | **← pinned here** | Last release before Color class |
| v7.2.0 | Introduced `Color` class; `TextStyle.fill` and other color inputs now parsed by stricter `Color.setValue()` | `rgba(undefined,undefined,undefined,1)` error if any color value is malformed or constructed at init time |
| v7.3.0 | `TextStyle` fill accepts alpha via Color class | Wider surface area for parse errors |

## Audit procedure

```bash
grep -rn "cdn.jsdelivr.net\|unpkg.com\|cdnjs.cloudflare.com\|esm.sh" . \
  --include="*.html" --include="*.js" | grep -v node_modules
```

Re-audit before any PixiJS upgrade. To upgrade to v7.2+, audit all PixiJS
color inputs (TextStyle.fill, Graphics.beginFill, tint, etc.) and ensure
none receive null, undefined, or dynamically-computed rgba strings.
