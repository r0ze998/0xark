# 0xARK Element Matrix v2 — 6-Element System

> Replaces the 4-element system (Tide/Abyss/Storm/Iron) with a 6-element dual-triad design.  
> See also: [GAMIFICATION_V2.md](./GAMIFICATION_V2.md) | [CARD_CATALOG.md](./CARD_CATALOG.md)

---

## Design Decision: 2-Triad Architecture

**6-way linear cycle** was considered but rejected — memory load is too high in PvP.  
**2-triad rock-paper-scissors** is adopted:

- Each triad is a self-contained 3-element RPS loop.
- Cross-triad matchups are always neutral (×1.0).
- Players can master one triad first, then learn the other.

---

## Triad 1 — Material World

```
    Fire (🔥)
   ↗         ↘
Earth (⛰)←Water (💧)
```

| Attacker → Defender | Fire | Water | Earth |
|---------------------|------|-------|-------|
| **Fire**            | 1.0  | 1.5   | 0.7   |
| **Water**           | 0.7  | 1.0   | 1.5   |
| **Earth**           | 1.5  | 0.7   | 1.0   |

**Narrative**: The material cycle. Fire evaporates water, water erodes earth, earth smothers fire.

---

## Triad 2 — Abstract Forces

```
    Wind (🌬)
   ↗          ↘
Light (✨)←Shadow (🌑)
```

| Attacker → Defender | Wind | Shadow | Light |
|---------------------|------|--------|-------|
| **Wind**            | 1.0  | 1.5    | 0.7   |
| **Shadow**          | 0.7  | 1.0    | 1.5   |
| **Light**           | 1.5  | 0.7    | 1.0   |

**Narrative**: The abstract cycle. Wind scatters shadow, shadow absorbs light, light parts wind.

---

## Cross-Triad Matchups

All cross-triad encounters (Material vs Abstract) are neutral:

| Material \ Abstract | Wind | Shadow | Light |
|--------------------|------|--------|-------|
| Fire               | 1.0  | 1.0    | 1.0   |
| Water              | 1.0  | 1.0    | 1.0   |
| Earth              | 1.0  | 1.0    | 1.0   |

---

## Complete 6×6 Multiplier Table

Rows = attacker element, Columns = defender element:

|          | Fire | Water | Wind | Earth | Shadow | Light |
|----------|------|-------|------|-------|--------|-------|
| **Fire** | 1.0  | 1.5   | 1.0  | 0.7   | 1.0    | 1.0   |
| **Water**| 0.7  | 1.0   | 1.0  | 1.5   | 1.0    | 1.0   |
| **Wind** | 1.0  | 1.0   | 1.0  | 1.0   | 1.5    | 0.7   |
| **Earth**| 1.5  | 0.7   | 1.0  | 1.0   | 1.0    | 1.0   |
| **Shadow**| 1.0 | 1.0   | 0.7  | 1.0   | 1.0    | 1.5   |
| **Light**| 1.0  | 1.0   | 1.5  | 1.0   | 0.7    | 1.0   |

Multipliers in 1000-integer form (for Rust integer math):
- Advantaged: `1500`
- Disadvantaged: `700`
- Neutral: `1000`

---

## Element ↔ Card ID Mapping

| Element | ID range | Count | Triad |
|---------|----------|-------|-------|
| Fire    | 1–10     | 10    | Material |
| Water   | 11–20    | 10    | Material |
| Wind    | 21–30    | 10    | Abstract |
| Earth   | 31–40    | 10    | Material |
| Shadow  | 41–50    | 10    | Abstract |
| Light   | 51–60    | 10    | Abstract |

```js
// JS: cardElement(cardId) → element index (0-5)
function cardElement(id) {
  if (id <= 10) return 0; // Fire
  if (id <= 20) return 1; // Water
  if (id <= 30) return 2; // Wind
  if (id <= 40) return 3; // Earth
  if (id <= 50) return 4; // Shadow
  return 5;               // Light
}
```

---

## Game Logic Implementation

### Rust: `calc_element_multiplier`

```rust
/// Returns damage multiplier × 1000 for integer math.
/// Elements: 0=Fire, 1=Water, 2=Wind, 3=Earth, 4=Shadow, 5=Light
pub fn calc_element_multiplier(attacker: u8, defender: u8) -> u32 {
    // Triad 1 — Material: Fire(0)→Water(1)→Earth(3)→Fire(0)
    const ADV_T1: [(u8, u8); 3] = [(0, 1), (1, 3), (3, 0)];
    // Triad 2 — Abstract: Wind(2)→Shadow(4)→Light(5)→Wind(2)
    const ADV_T2: [(u8, u8); 3] = [(2, 4), (4, 5), (5, 2)];

    for (a, d) in ADV_T1.iter().chain(ADV_T2.iter()) {
        if attacker == *a && defender == *d { return 1500; }
        if attacker == *d && defender == *a { return 700; }
    }
    1000
}
```

### JS: `calcElementMultiplier`

```js
// Elements: 0=Fire,1=Water,2=Wind,3=Earth,4=Shadow,5=Light
function calcElementMultiplier(atkEl, defEl) {
  const adv = [[0,1],[1,3],[3,0],[2,4],[4,5],[5,2]];
  for (const [a, d] of adv) {
    if (atkEl === a && defEl === d) return 1500;
    if (atkEl === d && defEl === a) return 700;
  }
  return 1000;
}

function cardElement(id) {
  if (id <= 10) return 0; // Fire
  if (id <= 20) return 1; // Water
  if (id <= 30) return 2; // Wind
  if (id <= 40) return 3; // Earth
  if (id <= 50) return 4; // Shadow
  return 5;               // Light
}
```

---

## Player-Facing Quick Reference

```
TRIAD 1 (Material)      TRIAD 2 (Abstract)
🔥 Fire                 🌬 Wind
 ↓ beats                 ↓ beats
💧 Water                🌑 Shadow
 ↓ beats                 ↓ beats
⛰ Earth                ✨ Light
 ↓ beats                 ↓ beats
🔥 Fire                 🌬 Wind

Cross-triad: always neutral
```

**Battle display:**
- SUPER EFFECTIVE! (×1.5) — gold banner
- not very effective… (×0.7) — grey banner
- Neutral — no banner

---

## Migration from v1 (4-element)

| v1 Element | v2 Element | ID range |
|------------|------------|----------|
| Tide (1)   | Water (1)  | 1–15 → 11–20 |
| Abyss (2)  | Shadow (4) | 16–30 → 41–50 |
| Storm (3)  | Wind (2)   | 31–45 → 21–30 |
| Iron (4)   | Earth (3)  | 46–60 → 31–40 |

Old IDs 1–15, 16–30, 31–45, 46–60 remapped to new 10-card bands.  
`calcElementMultiplier` signature changes from `(u8, u8) → u32` — interface identical, values updated.

---

## Testing Requirements

`t93-element-v2.js` must verify:
- All 6 advantaged pairs return 1500
- All 6 disadvantaged pairs return 700
- All 27 neutral pairs return 1000 (same-element + cross-triad)
- `cardElement()` maps all 60 IDs correctly

---

*Last updated: 2026-04-21 — MEGA5 Stage A*
