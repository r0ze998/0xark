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
- [x] devnet deploy (Program ID: 2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3)
- [x] Phantom wallet connection in game client
- [x] On-chain commit-reveal flow in frontend (simulated mode, real TX when wallet connected)

### Priority 3: Submission Prep
- [ ] Arena registration
- [ ] X post #1 (development announcement)
- [ ] Pitch video script
- [ ] Technical demo script

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

## Infrastructure
- [x] Anchor program (7 core instructions, devnet deployed)
- [x] Program ID: 2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3
- [x] ZK circuit (Circom Poseidon, 264 constraints, proof verified)
- [x] x402 AI agent broker (4 endpoints)
- [x] Phantom wallet module (connected to devnet program)
- [x] WebSocket multiplayer server (rooms, commit-reveal coordination)
- [x] Game client v57 (9400+ lines, fully playable)
- [x] GDD v0.3, README v3, Arena draft, X drafts, Pitch + Demo scripts
