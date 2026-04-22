# 0xARK Balance Log — Day 17

**Date:** 2026-04-22  
**Branch:** phase-d-reborn  
**Build:** v455

---

## Changes applied (T-D17-A)

### Stat table adjustments

| Stat table | Before (R1→R5) | After (R1→R5) | Rationale |
|---|---|---|---|
| Attack BP | 3,5,7,9,11 | 4,6,7,9,12 | R1/R2 aggression viable, R5 Legendary impactful |
| Defense HP | 4,6,8,10,12 | 5,7,9,11,14 | Tanks survive mid-game rounds (R3-R4) |
| Flee INI | 4,5,6,7,8 | 5,6,7,8,9 | Flee should reliably go first vs Attack/Magic |
| Recovery HP | 4,5,6,7,8 | 5,6,7,8,9 | Healers need to survive to use effects |
| Magic BP | same as attack | -1 vs attack | Magic utility > raw damage |
| Energy cost | [1,2,2,3,4] | [1,2,2,3,3] | R4 from 4→3 reduces late-rarity lockout |

### Energy floor

- **Before:** Round N → +N per element (R1=+1, starving)
- **After:** Round N → +max(2,N) per element (R1=+2, R2=+2, R3+unchanged)
- **Rationale:** Round 1 players couldn't summon R2+ cards at all (cost 2, income 1)

---

## Known issues to investigate in beta

- [ ] Legendary vs Legendary matchup — high BP values may one-shot lower-rarity defense cards
- [ ] Flee cards with BP=1 (R1): effectively useless in battle; intended? GDD unclear
- [ ] Element affinity: +2/-1 asymmetry may be too swingy at R1 (3+2=5 vs 3=3 means 67% more damage)
- [ ] Energy carryover between rounds: currently unlimited — hoarding fire in R1-2 then burst in R3?
- [ ] Scout Peek max 3/duel — too generous if duels only last 3-4 rounds with lucky kills

---

## Beta feedback link

In-game feedback button added to lobby bottom-left (T-D17-B).  
Links to: `https://forms.gle/0xARKBetaFeedback`  
(Replace with real Google Form URL before beta invite goes out.)

---

## Next steps

- Watch for element hoarding exploits in playtesting
- If Legendary BP=12 is too dominant, consider soft cap at +R+2 vs lower rarity
- Track win rates by hall tier (Bronze/Silver/Gold) via AI agent logs
