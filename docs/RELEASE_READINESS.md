# Devnet release readiness

This is release preparation, not a completed real-wallet or mainnet sign-off.
Network stays Devnet; STEAL and unavailable paid PEEK remain disabled.

## Verification

Run `npm test` and `npm run check` in `solana/client`, then from repository root:

```sh
node --test multiplayer/test/release.test.js
python3 scripts/design-lint.py
python3 scripts/check-idl-sync.py
docker build -f multiplayer/Dockerfile -t oxark-relay:check .
```

CI also builds the relay image. HTTP tests start the real server, verify CORS and
quote behavior, and reject unavailable services before requesting payment.
Unit tests cover payer identity, proof age and concurrent in-memory replay claims.
Actual Redis-backed concurrency/outage testing remains a deployment gate.

Pre-merge checks on 2026-09-07: 101 client tests and 3 relay tests passed;
86 client JavaScript files parsed, 67 source modules linked, design lint passed,
and IDL names/arguments matched 52 Rust instructions. Desktop browser review
covered the card catalog faction filter and 160px long names, then practice hand
selection/action assignment, sealing, peek, tactical note, combat HP updates and
the next-round reset. No application console errors were observed in those flows.
This does not cover real mobile devices or signed wallet operations.

## Deployment

The relay now needs the repository root as Docker build context so it can include
the AI sources and dependencies. From repository root:

```sh
fly deploy --config multiplayer/fly.toml --dockerfile multiplayer/Dockerfile
```

Set `SOLANA_RPC_URL`, `TREASURY_PUBKEY`, `REDIS_URL` in the hosting secret manager.
Use `SOLANA_NETWORK=devnet` and production mode. Missing required secrets abort
startup. AI needs `ANTHROPIC_API_KEY`; without it, AI endpoints return 503.
Confirm approved split recipients and client allowlists before any paid test.
Pages deployment does not deploy the relay or configure Fly secrets.
The `/health` response reports liveness, not full RPC/Redis readiness.

## Outstanding gates

- Two real Devnet wallets: register/starter, queue, proof/commit/reveal, best-of-five
  settlement, confirmed signatures and account state. Cloud wallet setup remains required.
- Actual pack, list/buy/cancel, burn/promote, engrave and energy operations.
- Deployed program bytecode, account layout and proof/verifying-key parity.
- Refresh after commitment: salt is not persisted, so missing recovery data blocks
  reveal. Never regenerate salt after commit. Test timeout/recovery separately.
- Relay deployment and Redis-backed replay/outage tests; paid AI delivery recovery
  after a confirmed payment. A service failure must not cause a blind second payment.
- Real mobile/touch, wallet app return, reduced motion and keyboard interaction.
- Distinct card illustrations and art review (the frame uses existing faction portraits).

## Card proposal

`solana/client/card-design.html` contains the separate Archive Standard study:
green-black stone and brass, opaque name/stat bands, fixed BP/HP/INI positions,
faction text/crest/color, rarity text/marks, current/base HP, explicit selection/KO,
and a sealed back without identity. Selected actions remain outside the frame.
It includes six factions, all 60 catalog cards and 160/208/260px widths.
The six existing portraits are representative faction images, not 60 finished
illustrations. No wallet or payment adapter is loaded by this page.
The production shared card frame now uses the same opaque identity/stat-band
direction, retaining its existing combat, selection and HP-update hooks. The
standalone study remains a catalog reference, not a second game renderer.

Local preview uses Vite only for development; Pages still publishes the buildless
client directly. Install the client lockfile before `npm run dev`. Production does
not need Vite or an npm install.

## Rollback

Keep the previous successful Pages SHA and relay release/image. Revert via a new
reviewed commit; do not force-push main. Restore the previous relay image while
retaining the persistent replay store. Never use development mode or disable
payment verification to work around a production failure.
