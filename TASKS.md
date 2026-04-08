# 0xARK Development Tasks

## Active Sprint (W1: 4/8-14)

### Priority 1: Game Completeness
- [x] v16: 8 critical gameplay bugs fixed
- [x] v17: Pixel-perfect rendering
- [x] v18: Resolution upgrade 640x480, 16x16 tiles
- [x] v19: Battle UI redesign (FRLG-style, sprites, effects, grid menu)
- [ ] Game balance pass (encounter rates, card distribution, difficulty curve)
- [ ] Edge case testing (hand full, all spells used, etc.)

### Priority 2: Blockchain
- [ ] devnet deploy (faucet down 30+ hours — retry every attempt)
- [ ] Phantom wallet connection in game client
- [ ] On-chain commit-reveal flow in frontend

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

## Infrastructure
- [x] Anchor program (7 instructions, area system, 5 tests)
- [x] ZK circuit (Circom Poseidon, 264 constraints, proof verified)
- [x] x402 AI agent broker (4 endpoints)
- [x] Phantom wallet module
- [x] Local validator deploy verified
- [x] GDD v0.3, README, Arena draft, X drafts
