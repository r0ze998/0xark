# 0xARK Development Tasks

## Active Sprint (W1: 4/8-14)

### Priority 1: Game Completeness
- [x] v16: 8 critical gameplay bugs fixed
- [x] v17: Pixel-perfect rendering
- [x] v18: Resolution upgrade 640x480, 16x16 tiles
- [x] v19: Battle UI redesign (FRLG-style, sprites, effects, grid menu)
- [x] Game balance pass (v57: spell rebalance, card distribution, streak cap, rubber-banding, rival AI)
- [x] Edge case testing (steal-hand-full bug, campfire decay reset, first-battle tutorial, rival win warning)

### Priority 2: Blockchain
- [x] devnet deploy (Program ID: 5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN)
- [x] Phantom wallet connection in game client
- [x] On-chain commit-reveal flow in frontend (simulated mode, real TX when wallet connected)

### Priority 3: Submission Prep
- [ ] Arena registration (needs web account)
- [ ] X post #1 (draft ready, needs posting)
- [x] Pitch video script (written, needs recording)
- [x] Technical demo script (written, needs recording)
- [x] GitHub Pages live demo (r0ze998.github.io/0xark)
- [x] All submission materials updated with devnet program ID

## Version History
- v1-v10: Core game (maps, NPCs, battle, cards, fog)
- v11: Smooth animations, delta-time, offscreen caching
- v12: Shop, events, tutorial, card tracker, battle wipe
- v13: Ambient audio (ocean/wind/drone), 10 SFX, M mute
- v14: Mobile touch D-pad, save/load, auto-save, CONTINUE
- v15: Enhanced minimap, day/night cycle, NPC diamonds
- v16: 8 bug fixes (completable game loop)
- v17: Pixel-perfect integer rendering
- v18: 640x480 resolution, 16x16 tiles, 16x24 sprites
- v19: FRLG battle UI (arena bg, sprites, 2x2 grid, card effects)
- v20: Balance pass (steal bug fix, spell rebalance 2/3/2, streak cap 25%, rubber-banding, rival AI buff, rival win warning, spell recharge every 10 rounds, campfire decay extension, first-battle tutorial)
- v21: Screen shake, card lost particles, devnet verification, best clear time tracking, clippy fixes
- v22: VT323 font, 7-day season system (no round limit), intro tutorial + random card
- v23: PixiJS WebGL renderer, FRLG UI framework, native menu/textbox/intro
- v24: Circular fog of war (Iwayama Tunnel style), PixiJS particles
- v25: Refactor + mobile touch improvements (52px buttons, D-pad hold repeat, canvas direct on mobile)
- v26: 2 CRITICAL + 5 HIGH bug fixes (draw dispatch, x402 CORS, QTE cap, wallet security, refund)
- v27: Browser snarkjs ZK proof generation, real Phantom→devnet TX, AI agent rival prediction
- v28: FRLG polish (window themes, mosaic wipe, title sparkles, player aura, 30fps mobile throttle)
- v43-v44: Vault-aware card giving (fishing, puzzle, fountain, gacha, wild, tree, rock)
- v45: Target select FLED display in battle
- v46: Victory screen layout fix (no overlap)
- v47-v48: Black flash fix attempt (PixiJS ticker control)
- v49: Black flash root fix — game canvas shown directly, PixiJS as transparent UI overlay only
- v50: Dark vignette removed from town (safe zone); pulsing DUNGEON label at entrance
- v51: Transparent PixiJS overlay (root fix for black flash); image-rendering:pixelated; double-render eliminated
- v52: Dungeon staircase labels (◀ ESCAPE / DEEPER ▶); floor-depth color tint (deeper = warmer); improved tutorial hint panel
- v137: ZK proof commit hash fixed (poseidon-lite), onchain commit includes round in PDA seeds, real reveal TX, x402 broker rewritten (GDD v1.0: 60 cards, VEGA/MIRA), README with technical architecture
- v138: x402 shop VEGA/MIRA labels+prices fixed, vault state push fixed (60-slot), response parsers match broker schema, MIRA Hand intel added, ZK artifacts at repo root (GitHub Pages), periodic broker sync post-battle + every 2min, title screen prize pool display
- v141: fix rival steal missing result event when player hand empty (both rivals)
- v142: fix x402 broker always receiving round:0 (turnCount undefined → use rd)
- v143: fix checkForestTrap bypassing removeCardFromPlayer (missing decayWarn/stats reset)
- v144: fix discard handler not resetting decayWarn — new card inherited stale warning state
- v145: guard checkWinAndTransition against double-fire (stats.gamesPlayed++ safe)
- v146: fix NPC wander facing direction (inverted vs player/rival convention)
- v147: guard USE CARD against decayed-slot crash in generateResolveEvents
- v148: checkWinAndTransition after floor-clear card reward (win-miss if card 60 arrived via floor clear)
- v149: checkWinAndTransition after synthesis and mission bonus_card (same win-miss pattern)
- v150: reset gachaPityCount and milestonesReached on new game (milestone toasts retrigger correctly)
- fix: multiplayer server disconnect stall — remove player from commits/reveals on close, re-check thresholds
- fix: x402 agent-broker usedSignatures Set cap at 10k with LRU eviction (prevents unbounded memory growth)
- refactor: split 01-foundation.js (2236 lines) → 01-pixi.js / 01-draw.js / 01-net.js
- refactor: split 07-screens.js (4132 lines) → 07-map.js / 07-battle.js / 07-battle-resolve.js
- refactor: split 08-ui.js (2536 lines) → 08-overlays.js / 08-world-interact.js / 08-screens.js
- build: MODULES array updated (11 → 17 files); output unchanged (15552 lines)
- test: 53 unit tests for card engine (node tests/card-engine.test.js — all pass)
- infra: ecosystem.config.cjs (pm2) + start.sh for x402 broker + multiplayer server startup
- v151: victory screen C=Claim Prize (simulated tx) + M=Mint NFTs (60-card sequential mint with progress bar)
- v414: battle HUD refactor — _drawHPHearts + _drawAccuracyReveal helpers extracted (eliminates 80+ duplicate bx calls across 4 draw sites)
- v415: 07-map.js silent syntax bug fix — 4 water-tile bx() calls were inside // comment, suppressing all water-edge rendering (v304 regression)
- v416: onchain.js discriminator fix — disc('handle_verify_zk') → disc('verify_zk_proof') to match Rust fn name
- v417: x402 broker + multiplayer server hardening — recipient check, singleton Connection, playerId validation, chat 200-char cap, coordinate bounds
- v418: InventoryPanel.tsx — fixed broken Explorer link (was using raw card ID integer, now uses cardMintPda PDA address)
- v419: LobbyPanel.tsx — fixed deprecated confirmTransaction API in all 3 tx flows (blockhash + lastValidBlockHeight form)
- v420: sfxDefeat added (descending minor arpeggio); dGameOver triggers it at t===31; dStats+dLog star field changed from Math.random() to deterministic sin twinkle; marketplace SELL tab shows card picker grid; victory screen T=Share opens X tweet
- v421: test suite expanded to 114 total (53 card-engine + 49 battle-mechanics + 12 Anchor/litesvm); GitHub Actions CI added (4 jobs: Node tests, Rust tests, React build, game build); README + CU benchmark table + security section
- v422: Anchor lib.rs fully commented (module-level arch doc + all 13 instructions); CI + test + devnet badges in README; PWA manifest.json; OGP/Twitter Card meta in template.html + rebuilt index.html; multiplayer + x402 verified clean
- v423: .gitignore updated (CLAUDE.md, TASKS.md, client/ Dojo proto, GDD-v0.2/v0.3 hidden); .gitattributes added (Cairo language attribution fixed, build outputs excluded from linguist); WebSocket rate limiting (20 msg/s, 3 tx/s, 32KB frame cap, 24-char name limit); compute budget + priority fee in onchain.js (all instructions get setComputeUnitLimit + setComputeUnitPrice; verify_zk_proof gets 300k CU); README: Why Now / Why Us / GTM / Ecosystem sponsor table / Q2-Q4 Roadmap added

## Infrastructure
- [x] Anchor program (7 core instructions, devnet deployed)
- [x] Program ID: 5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN
- [x] ZK circuit (Circom Poseidon, 264 constraints) + browser snarkjs proof generation
- [x] x402 AI agent broker (4 endpoints + rival prediction engine)
- [x] Phantom wallet (real devnet transactions via @solana/web3.js)
- [x] WebSocket multiplayer server (rooms, commit-reveal coordination)
- [x] PixiJS v7 WebGL renderer + FRLG UI framework (menus, textbox, intro, title effects, player aura)
- [x] Game client v52 (fully playable, live on GitHub Pages, mobile optimized)
- [x] GDD v0.3, README v3, Arena draft, X drafts, Pitch + Demo scripts
