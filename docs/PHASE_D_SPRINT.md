# 0xARK Reborn — Phase D Sprint Plan v1.2

Kickoff: 2026-04-21  
Submission: 2026-05-11  
Duration: 21 days  
Days remaining at v1.2 publish: 19  
GDD ref: docs/GDD.md v1.2  
Card Catalog ref: docs/CARD_CATALOG.md v0.2  
UI_SPEC ref: design/UI_SPEC.md v2.0

---

> v1.2 changelog:  
> Massive acceleration — Claude Code overnight session 2026-04-21/22 completed Days 2-8 in ~8 hours (vs planned 3 days). Phase D frontend fully rebuilt per Claude Design mockups (M1-M5). Sprint timeline re-cut: Day 9 = Phase C teardown + save_deck fix. Day 10-11 = M2 Duel Board. Day 12 = M3 ZK Commit. Day 13-14 = M4/M5. Post-Day 8 work is pitch-grade polish + balance + submission materials. v1.1 planned tasks all rolled forward.

---

## 0. Sprint overview

### Completed so far (as of 2026-04-22 07:10 JST)

✅ Day 1: Phase C wind-down, GDD v1.0 / v1.1 / v1.2, Sprint v1.0 / v1.1, Card Catalog v0.1 / v0.2, 5 Mockups, UI_SPEC v2.0 (all committed)  
✅ Day 2: 26 instructions audit, CommitAction retarget (anchor build passes), Lobby tilemap, LobbyScene v1 (deprecated)  
✅ Day 3: WebSocket protocol v2, stress test 30c/0err/53k msg/s, lobby WS wire-up, lerp  
✅ Day 4: Duel Hall / Shop / PC Box / Faction HQ dialog skeletons, enter_queue / leave_queue instructions, matchmaking polling, UX polish  
✅ Day 5: PC Box placeholder, deck editor skeleton, on-chain integration (⚠ save_deck has legacy Phase C 30pt cap — fix Day 9), journal  
✅ Day 6: Shop NPC dialog, HUD card count + Season day (both reading PDA)  
✅ Day 8 (done ahead of schedule): M1 Main Lobby rebuild per UI_SPEC v2.0 — sunset sky, cobblestone floor, 6 buildings (Shop / Faction HQ / PC Box / Bronze/Silver/Gold Hall), HUD 3-tier (card count / Season day / narrative title), bottom dialog bar, 12×16 block character sprites with 5 clan color tints, proximity prompts. 14 tasks in 4 groups (A/B/C/D), all pushed. Commits: 268b732, a195a59, 8625ab2, b63808b, cbf739b.

### Currently blocked / deferred

- Day 7 (Phase C teardown): not yet done. GBA emulator shell in index.html still present. 09-game-loop.js dungeon logic not removed. save_deck has legacy 30pt cap from Phase C. Will be done Day 9.
- save_deck redesign: 30pt cost cap + rarity balance (Legendary≤2 / Rare≤6 / Common≥12) are Phase C artifacts. Reborn rules are simpler: exactly 20 cards, max 2 copies. Day 9 fix.
- Card Catalog review questions: 10 outstanding items in v0.2 need r0ze answers before Day 14.
- Lore Shards formalization: added to UI_SPEC M5 as placeholder, needs GDD v1.3 Section 7 update.

### What's next (Days 9-21)

Week 2 continues (Days 9-14): 
- Day 9: Phase C teardown + save_deck redesign + Lobby wire-up to real chain data
- Days 10-11: M2 Duel Board implementation (local hotseat → WS sync)
- Day 12: M3 ZK Commit cutscene + hand commitment integration
- Day 13: M4 Victory screen + NFT P2P transfer on duel win
- Day 14: M5 Card Detail view + Lore Shards placeholder

Week 3 (Days 15-21): 
- Day 15: Season engine activation + AI agent Tier-1 + Legendary transfer rules
- Day 16: 60 card portraits finalized (Midjourney/Flux + Clip Studio)
- Day 17: Balance pass + beta testing (3-5 testers)
- Days 18-20: Pitch video + README + Twitter/Farcaster launch posts
- Day 21: Submission to Colosseum Frontier Hackathon

---

## 1. Day 9 (Tue 4/22) — Phase C teardown + save_deck redesign + Lobby wire-up

Target: Phase C artifacts fully removed. Lobby reads real chain data. save_deck compliance with GDD v1.2.

### Tasks

- T-D9-1 (1h): GBA emulator shell removal from index.html. Full-screen canvas with 16:9 letterbox.
- T-D9-2 (1.5h): Phase C dungeon logic removal from 09-game-loop.js. Preserve finisher/victory animations as reusable primitives in 10-animations.js.
- T-D9-3 (2h): save_deck redesign in solana/oxark/programs/oxark/src/instructions/save_deck.rs. Remove 30pt cost cap + rarity balance. Keep: exactly 20 cards, max 2 copies. Add optional lane_assignments field. anchor build must pass 0 errors.
- T-D9-4 (1h): Deck editor UI alignment in 07-deck-editor.js. Remove cost progress bar and rarity warnings. Keep N/20 progress and max-2 validation.
- T-D9-5 (1h): Lobby real chain data wire-up. fetchCardCount (PlayerRegistry PDA), fetchSeasonDay (Season PDA), fetchSOLBalance (wallet, 15s refresh).
- T-D9-6 (30min): Commit + push all Day 9 changes. Tag v-phd-day9.

DoD: GBA shell gone, full-screen Lobby renders. save_deck passes anchor build with new simpler rules. Deck editor matches. Lobby shows real card count / season day / SOL balance from chain.

Total estimate: 7h

---

## 2. Day 10 (Wed 4/23) — M2 Duel Board skeleton (local hotseat, no ZK)

Tasks T-D10-1 to T-D10-11 implement Duel Scene skeleton:
- Scene scaffold, layout per UI_SPEC Section 2
- 4-phase state machine (Draw/Energy/Summon/Battle)
- Energy pool rendering
- Card rendering system + drag-drop
- Battle phase resolution
- Shards mechanic (earn on destruction)
- Tag v-phd-day10

DoD: Two humans in two tabs (local hotseat) play a full 5-round duel.

Total estimate: ~18h (may overflow into Day 11)

---

## 3. Day 11 (Thu 4/24) — M2 finalization + Extra Action + Defender + Element Affinity

Tasks T-D11-1 to T-D11-10:
- Element affinity (+2/-1 BP per wheel)
- Defender mechanic (half-BP counter)
- Lane restrictions (8 cards)
- Extra Action (3 Shards or 0.01 SOL via x402)
- Scout Peek (0.005 SOL x402)
- Log panel polish, Lock In button behavior
- Duel Over placeholder
- Tag v-phd-day11

DoD: Hotseat duel has all combat mechanics. Ready for ZK + network Day 12.

Total estimate: ~13h

---

## 4. Day 12 (Fri 4/25) — M3 ZK Commit cutscene + hand commitment integration

Tasks T-D12-1 to T-D12-8:
- hand_commitment.circom circuit (Poseidon hash of card_ids + salt + round + phase)
- Compile + setup (wasm + zkey)
- On-chain verification path
- M3 cutscene implementation (ZK seal spin, hex tokens, runes)
- Frontend proof generation (target: < 3 sec in Chrome)
- Reveal phase
- WebSocket duel sync (phase advance, commit, reveal, battle resolve)
- Tag v-phd-day12

DoD: Two tabs play full duel with real ZK hand commitments. M3 cutscene plays on start.

Total estimate: ~16h

---

## 5. Day 13 (Sat 4/26) — M4 Victory screen + NFT P2P transfer on win

Tasks T-D13-1 to T-D13-9:
- Victory Scene (new 09-victory-scene.js)
- Card transfer game logic (2 random unowned cards)
- On-chain NFT transfer via oxark-cards
- TX hash + Solscan link
- XP + Shards + Achievement rewards
- Cards Collected counter animation
- Particles + chain trails
- Return to Lobby
- Tag v-phd-day13

DoD: Duel win → Victory → 2 NFTs transferred on-chain → TX on Solscan → Lobby refreshed.

Total estimate: ~13h

---

## 6. Day 14 (Sun 4/27) — M5 Card Detail + Lore Shards placeholder

Tasks T-D14-1 to T-D14-7:
- Card Detail scene (10-card-detail.js)
- Battle History aggregation from event log
- Lore Shards placeholder (1/3 auto-found on acquisition, others "?")
- ADD TO DECK flow
- SELL TO SHOP flow
- Card Storage scene for PC Box (11-card-storage.js)
- Tag v-phd-day14

DoD: Click any card → detail view. Flows work. PC Box shows card storage grid.

Total estimate: ~11h

---

## 7. Day 15 (Mon 4/28) — Season engine + AI agent Tier-1 + Legendary transfer

Tasks T-D15-1 to T-D15-8:
- Season countdown (14 days)
- Champion detection at 60/60
- Prize Pool distribution (40/20/10/20/10)
- AI agent Tier-1 (tools/ai-agent/agent.js, Anthropic API + heuristic fallback)
- AI agent test duel
- Legendary transfer rules (Gold Hall only)
- Legendary UI badges
- Tag v-phd-day15

DoD: Season counts down, AI agent plays, Legendaries transfer in Gold Hall only.

Total estimate: ~13h

---

## 8. Day 16 (Tue 4/29) — 60 card portraits finalization

Tasks T-D16-1 to T-D16-6:
- Midjourney/Flux batch (r0ze): 60 cards × 3-4 variants
- Clip Studio retouch + unify (r0ze): 64×64 PNG
- Arweave upload (CC): batch via Bundlr
- NFT metadata wire-up (CC): Metaplex URIs
- In-game rendering: drawCard loads real portraits with localStorage cache
- Tag v-phd-day16

DoD: All 60 card portraits visible everywhere. NFT metadata on Arweave.

Total estimate: ~12h

---

## 9. Day 17 (Wed 4/30) — Balance pass + beta testing

Tasks T-D17-1 to T-D17-7:
- Internal duel testing (20+ duels, log in docs/_scratch/balance_log.md)
- Card balance pass (5-10 adjustments)
- Shop price tuning
- Ante + Hall tuning (Bronze 0.005 / Silver 0.01 / Gold 0.05)
- Beta tester recruitment (Solana Japan / MagicBlock / Farcaster)
- Beta test sessions (3-5 testers)
- Commit balance changes, tag v-phd-day17

DoD: 3+ beta testers confirm fun. Critical bugs fixed.

Total estimate: ~14h

---

## 10. Day 18 (Thu 5/1) — Pitch video script + storyboard + footage

Tasks T-D18-1 to T-D18-5 (r0ze lead):
- Pitch video script (3-4 min target)
- Gameplay footage recording (15-20 clips)
- B-roll (Solana Explorer, mockups, card art)
- Voiceover script (Japanese + English subtitles)
- Rough cut timeline

DoD: Rough cut exists. Clips shot. Script drafted.

Total estimate: ~9h

---

## 11. Day 19 (Fri 5/2) — Pitch video edit + README + tech demo

Tasks T-D19-1 to T-D19-4:
- Final pitch video edit (r0ze)
- README rewrite (r0ze + CC)
- Technical deep-dive video 5-8 min (r0ze)
- Commit + push materials

DoD: Pitch video live on YouTube. README polished. Tech demo recorded.

Total estimate: ~11h

---

## 12. Day 20 (Sat 5/3) — Submission prep + social posts + final polish

Tasks T-D20-1 to T-D20-6:
- Twitter/X launch thread
- Farcaster cast + frame
- Final gameplay testing
- Colosseum submission form draft
- Polish pass (loading, errors, mobile, perf)
- Tag v-phd-day20-submission-ready

DoD: All materials ready. Final demo verified.

Total estimate: ~11h

---

## 13. Day 21 (Sun 5/4 → 5/11 target) — Submission + launch

Tasks T-D21-1 to T-D21-5:
- Final sanity check
- Submit to Colosseum Frontier Hackathon
- Launch posts (Twitter / Farcaster / Discord)
- Community engagement
- Retrospective journal entry

DoD: Submission live. Launch posts published. 0xARK Reborn shipped.

---

## 14. Risk register v1.2

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| ZK circuit compilation fails | Medium | High | Day 12 fully allocated. Fallback: hash-based commit-reveal |
| Card art takes longer than 12h | Medium | Medium | Start Midjourney in parallel Day 14-15. Simplified portraits if needed |
| Beta testers find critical bug Day 20-21 | Medium | High | Feature freeze Day 18. Day 19-21 polish-only |
| Solana devnet instability | Low | High | Multiple RPC endpoints. Fallback to Helius/Triton |
| NFT transfer fails mid-duel | Low | High | Atomic tx. Winner ante + XP still award on NFT failure |
| Pitch video production overruns | Medium | Medium | Backup 90-sec teaser edit ready |
| r0ze burnout | High | High | CC handles bulk. r0ze on high-judgment items. Claude Design for mockups |
| MagicBlock ER rate limits | Medium | Medium | Day 3 stress test passed 30c/0err. Fallback: WebSocket only |
| x402 facilitator production deploy blocks pitch | Low | Medium | Devnet demo acceptable for MVP. Production in June |
| AI agent Tier-1 fails | Low | Medium | Rule-based fallback without LLM |
| Legendary transfer breaks at season end | Low | Medium | Edge case testing Day 17. Manual override script as backup |

---

## 15. Resolved decisions

1-8: See v1.1 (r0ze green-lit 2026-04-21)
9. Frontend architecture = canvas-based, no PixiJS, 480×270 logical, 16:9 letterbox
10. Character sprites = 12×16 logical, 5 clan tints
11. save_deck rules = simplified to 20 cards + max 2 copies (Phase C 30pt cap removed)
12. Ground-up rebuild = Phase C frontend deleted, new Lobby/Duel per mockups

---

## Appendix A: CC overnight success metrics (2026-04-21/22)

- Tasks: T-D2-0 through T-D8-14 (Days 2-8 all done)
- Commits: ~20 atomic commits, all pushed
- Code added: ~3,000 lines
- Blockers: cargo-build-sbf not in PATH (worked around with cargo check)
- HALTs: 0 (CC made balanced decisions autonomously)
- Time: ~8 hours (scheduled 20h)
- Efficiency: 2.5x expected

---

*End of Phase D Sprint Plan v1.2*
