# 0xARK Card Art Prompts v2.1 — Final

**Date**: 2026-04-24  
**Cards**: 60 total (30 Common / 20 Uncommon / 6 Rare / 4 Legendary)  
**Lore setting**: Succession War of the Lost Kingdom of Elyon  
**Status**: Ready for Midjourney batch after r0ze selects style variant in §1

---

## §1. Style Anchor Variants — Choose One Before Batching

**DO NOT decide for r0ze.** Read all 4 variants, pick one, then append it to every scene in §3.

---

### Variant A — 冒険アニメ系 (HxH / Shonen Adventure)

**Aesthetic**: Hunter x Hunter × Fullmetal Alchemist Brotherhood.  
Vivid cel-shading, strong outlines, expressive faces, bold color fields.  
Characters feel alive — posture conveys personality instantly.  
Backgrounds are minimal but atmospheric (single color wash + light detail).

```
Anchor string to append to every prompt:
, Hunter x Hunter art style, anime cel-shaded, bold lineart, vivid color palette, shonen adventure, Yoshihiro Togashi influence, clean flat colors --ar 1:1 --style raw --stylize 250 --no photorealistic, grimdark, blood, gore, western dark fantasy, Frazetta, heavy shadows, moody realism
```

**Best for**: Clan characters with strong personality (Black Flag pirates, Hollow Blade knights).  
**Risk**: May feel "too anime" for judges expecting a serious card game.

---

### Variant B — レトロアニメ系 (1990s JRPG, Rurouni Kenshin)

**Aesthetic**: Late-90s anime: Rurouni Kenshin, Lodoss War, Tales of series.  
Softer line weights, muted watercolor-adjacent palette, slightly painterly fills.  
A nostalgic elegance — serious but not grim.

```
Anchor string to append to every prompt:
, 1990s anime illustration style, Nobuhiro Watsuki influence, Tales of series concept art, muted watercolor palette, soft lineart, nostalgic JRPG aesthetic, character portrait --ar 1:1 --style raw --stylize 180 --no photorealistic, grimdark, blood, gore, heavy shadows, western dark fantasy
```

**Best for**: Sovereign Bourse (merchants), Iron Circle (archivists), court intrigue cards.  
**Risk**: May feel dated compared to modern card game aesthetics.

---

### Variant C — A × B Blend (海賊 + 懐かしさ)

**Aesthetic**: One Piece × Rurouni Kenshin: the adventurous boldness of Variant A combined with the warm palette of Variant B. Outlines are present but not heavy. Color fields are slightly desaturated.

```
Anchor string to append to every prompt:
, anime illustration, One Piece early arc character design, Rurouni Kenshin lineart quality, warm muted color palette, adventure card game art, expressive character portrait, clean cel-shading --ar 1:1 --style raw --stylize 220 --no photorealistic, grimdark, blood, gore, heavy shadows, ultra-realistic
```

**Best for**: Mixed-clan scenes, Events, Legendary cards.  
**Recommended default**: This blend reads well across all 5 clans.

---

### Variant D — Octopath / HD-2D × JRPG (保守案)

**Aesthetic**: Octopath Traveler character art × Bravely Default portrait style.  
Full painterly detail, rich fabric textures, sophisticated lighting.  
Most "premium card game" look — closest to Legends of Runeterra.

```
Anchor string to append to every prompt:
, Octopath Traveler character art style, HD-2D JRPG portrait, Bravely Default aesthetic, painterly detail, rich fabric textures, sophisticated character illustration, premium TCG card art --ar 1:1 --style raw --stylize 300 --no photorealistic, blood, gore, heavy shadows, western dark fantasy, Frazetta
```

**Best for**: Legendary cards (the 4 relics need premium treatment), Rare cards.  
**Risk**: More expensive/harder to generate consistently; may slow batch speed.

---

## §2. Clan Palette Spec (confirmed — do not change)

| Clan | Primary | Secondary | Accent | Element |
|---|---|---|---|---|
| **Black Flag** | `#1a1a2e` (deep navy) | `#e94560` (blood red) | `#f5a623` (gold) | 💨 Wind |
| **Sovereign Bourse** | `#2d1b0e` (dark oak) | `#c9a84c` (antique gold) | `#7ecba1` (jade) | 💰 Gold |
| **Hollow Blade** | `#1a0a00` (char black) | `#d44000` (forge orange) | `#fff3e0` (ash white) | 🔥 Fire |
| **Iron Circle** | `#0f1a0f` (forest dark) | `#5a7a3a` (moss green) | `#c8d8a8` (pale leaf) | 🌿 Earth |
| **Nameless Silk** | `#0d0d1a` (void) | `#6a0dad` (deep violet) | `#e8d5f5` (lavender mist) | 🌑 Shadow |
| **Neutral** | `#1c1c1c` (slate) | `#888` (grey) | `#ddd` (silver) | Null |
| **Event** | Clan-of-primary-effect | — | — | mixed |

**Usage rule**: Each card's background should use the Clan Primary as the darkest tone, with the Secondary as the main character color field.

---

## §3. 60 Card Scene Descriptions

**Format**: Copy the scene → append Clan anchor → append chosen §1 variant → append §4 universal rules → paste into Midjourney.

**Clan anchors** (append after scene, before style variant):
- Black Flag: `, dark navy background, red sail silhouette, wind and sea`
- Sovereign Bourse: `, antique gold background, merchant ledgers, coins and scales`
- Hollow Blade: `, forge-black background, ember glow, crumbling castle stone`
- Iron Circle: `, deep forest background, moss-covered stone walls, oath runes`
- Nameless Silk: `, void-black background, violet silk ribbons, shadow and identity`
- Neutral: `, grey stone throne room, five clan symbols visible in background`
- Event: `, parchment and seal visual, dramatic lighting`

---

### Common (30 cards)

#### Black Flag — 6 Commons

**#1 Powder-Charge Boarder** `Common | Wind`  
Young woman in ragged pirate coat mid-leap, holding a powder barrel with a lit fuse, silhouetted against ocean spray. Her expression: fierce, certain. No hesitation.

**#2 Storm Bosun**  `Common | Wind`  
Weathered bosun gripping a rigging rope in howling winds, face upturned to the storm. His posture is reverence, not fear. Salt-white beard, captain's coat shredded by gales.

**#3 Grapple Specialist** `Common | Wind`  
Athletic figure swinging on a grappling hook between two ship decks, coiled rope looped at shoulder. Low angle shot — the hook catches mid-flight, just before boarding.

**#4 Salt-Bitten Deckhand** `Common | Wind`  
Seasoned deckhand leaning on the ship rail, watching the horizon. Deeply weathered face, two decades of sun and salt visible. Eyes know something the ocean hasn't revealed yet.

**#5 Flare Saboteur** `Common | Wind`  
Slight, wiry figure in munitions hold, holding a single lit flare aloft. The hold is full of powder barrels. His expression is calm. He knows exactly what happens next.

**#6 Reef Pilot** `Common | Wind`  
Skilled woman at a ship's helm, eyes tracking channels only she can see. No map in hand. The reef stretches below in the water; she steers without looking down.

---

#### Sovereign Bourse — 6 Commons

**#7 Novice Minter** `Common | Gold`  
Young apprentice at a mint workbench, striking a freshly minted coin with a die. First coin of the day. He wears it on a cord around his neck; the imprint is still warm.

**#8 Coin Reforger** `Common | Gold`  
Broad-shouldered smith at a moonlit anvil, pouring liquid gold into a mold. Old coin silhouettes visible melting in the crucible. The new shape rising is different — cleaner.

**#9 Caravan Guard** `Common | Gold`  
Stoic guard standing at a merchant wagon gate, spear vertical, face neutral. Not loyal to the merchant behind him. Loyal to the salary. He knows the difference.

**#10 Pawnbroker's Wife** `Common | Gold`  
Middle-aged woman behind a cluttered shop counter, ledger open, ink pen raised. The husband is visible in the background arranging shelves. She runs everything. He doesn't know.

**#11 Harbor Assessor** `Common | Gold`  
Official in port authority uniform reviewing cargo manifests, dock in background. His fingers trace numbers. Men have tried to falsify these papers. Once.

**#12 Traveling Scholar** `Common | Gold`  
Young man in traveling cloak poring over a multilingual map at a tavern table, four language scripts visible simultaneously. Paid by four kingdoms. Loyal to none.

---

#### Hollow Blade — 6 Commons

**#13 Oath-Branded Squire** `Common | Fire`  
Young squire kneeling before a forge, sword held out for marking. Five notch-cuts visible on the blade's handle — each representing a fall in battle. The fifth is fresh.

**#14 Palace Sentinel** `Common | Fire`  
Guard standing at full attention at a stone doorway, eyes hollow, sleepless. He has not moved from this post since the night the king died. He will not explain what he saw.

**#15 Sword Instructor** `Common | Fire`  
Lean instructor in mid-demonstration, sword extended toward three students. His form is flawless. Three thousand students trained. Six still living.

**#16 Herald of Ashes** `Common | Fire`  
Slim figure emerging from the edge of a fire scene — not fleeing it, walking through it. The ashes part around him. He arrived after the burning began. Or before.

**#17 Widowed Armorer** `Common | Fire`  
Middle-aged woman at a forge, hammering a breastplate. Her posture radiates grief converted to purpose. A soldier's portrait visible pinned to the forge wall behind her.

**#18 Dawn Patrol** `Common | Fire`  
Two guards on horseback riding through early morning fog, side by side. They always ride in pairs. Never one alone. This is not protocol. It is a pact.

---

#### Iron Circle — 6 Commons

**#19 Tax Collector** `Common | Earth`  
Thin official in formal robes walking through a village square, ledger under arm. Every door closes as he passes. He takes coin from farmers. He takes silence from whoever objects.

**#20 Border Magistrate** `Common | Earth`  
Judge at a checkpoint desk, pile of documents in hand, one eyebrow raised at a traveler we cannot see. A single stamp could end someone's journey. He knows this.

**#21 Fortress Quartermaster** `Common | Earth`  
Heavyset supply officer standing before fortress storage shelves, inventory list in hand. He knows where every arrow is stored. He knows who stole the last crate. He said nothing.

**#22 Sworn Steward** `Common | Earth`  
Composed steward in formal livery, hands clasped, watching the door of an empty lord's chamber. Three lords have owned him. All three died. He still serves.

**#23 Ancestral Ranger** `Common | Earth`  
Ranger in forest clearing, blade raised to examine its surface — dozens of carved marks, each a memory. The blade is older than his grandfather. There is no room for more marks.

**#24 Lineage Scout** `Common | Earth`  
Young woman scout crouching by an old boundary stone, pressing her palm to the inscription. She listens to what the stone has heard. The stone is speaking.

---

#### Nameless Silk — 6 Commons

**#25 Shadow Lifter** `Common | Shadow`  
Slight, quick figure in mid-fall after being struck down — but her hand is still outstretched, fingers curling around something stolen in her final moment. Even in death, she takes.

**#26 Tavern Informant** `Common | Shadow`  
Soft-faced man pouring wine at a busy tavern, head tilted toward a nearby conversation he was not invited to join. He remembers names. He sells both.

**#27 Soul-Binder** `Common | Shadow`  
Pale woman mid-combat, struck through — but the energy that strikes her is being redirected, absorbed. Her eyes are open, calm. She is taking something back.

**#28 Rooftop Runner** `Common | Shadow`  
Parkour figure leaping between tiled rooftops at dusk, silhouette clean against orange sky. He has not touched the ground in eight years. The city does not know he exists.

**#29 Poison Herbalist** `Common | Shadow`  
Quiet woman preparing two cups of tea at a table, a bundle of dried herbs beside her. One layer you taste. One layer you do not. She pours both equally.

**#30 Mask-Maker** `Common | Shadow`  
Artisan carving a blank mask, surrounded by completed masks hung on the wall — each face of a different person, all unknown. She carves the face you will wear tomorrow.

---

### Uncommon (18 character + 2 event)

#### Black Flag — 4 Uncommons

**#31 First Mate Kaelith** `Uncommon | Wind`  
Silver-haired woman in a corsair officer coat, standing at the prow of a ghostship in sea mist, posture commanding the horizon. She gives the orders. The captain agrees later.

**#32 Cannon Captain** `Uncommon | Wind`  
One-eyed, three-fingered artilleryman at a ship cannon, match lit, laughing into the explosion. Missing an eye, an ear, three fingers. Still firing. The crew calls him luck.

**#33 Bloodflag Corsair** `Uncommon | Wind`  
Massive corsair in crimson coat standing at a ship's bow, royal navy flag visible burning behind him. He only sails toward them. The crimson sail is deliberate.

**#34 Mutineer** `Uncommon | Wind`  
Silver-tongued figure leaning in close to a soldier, speaking quietly, hand on the man's shoulder. By morning, that soldier will follow him. Nobody sees it happen. It always happens.

---

#### Sovereign Bourse — 4 Uncommons

**#35 Mint Master** `Uncommon | Gold`  
Master craftsman at a glowing anvil, transforming two copper coins into one perfect silver coin via a precise hammer strike. Two become one. Nothing is wasted. Magic? Metallurgy.

**#36 Weapons Trader** `Uncommon | Gold`  
Elegant woman showing a sword to a buyer, but her eyes are elsewhere — scanning the room, measuring other buyers. She sells to every clan. None of them know.

**#37 Treasury Keeper** `Uncommon | Gold`  
Elderly treasurer in a vault surrounded by royal ledgers, running a finger down columns of figures. His family has counted the royal coin for four generations. He has hidden the records.

**#38 Merchant Prince** `Uncommon | Gold`  
Richly dressed young man at a banquet table, surrounded by petitioners, coin purse in hand. He owns no throne. He owns everyone who wants one.

---

#### Hollow Blade — 3 Uncommons

**#39 Captain of the Guard** `Uncommon | Fire`  
Battle-scarred captain in full plate, sword drawn at a royal funeral procession. He has not sheathed it since the king fell. He is still waiting for the enemy to show themselves.

**#40 Oathsworn Knight** `Uncommon | Fire`  
Massive knight in ceremonial armor kneeling in a chapel, one hand on sword, one on the altar stone. The oath binds in ways the blade cannot. He is the last to keep it.

**#41 Royal Inquisitor** `Uncommon | Fire`  
Sharp-eyed official in a torch-lit interrogation room, leaning toward someone we cannot see. He asks the questions. He has never needed to ask twice.

---

#### Iron Circle — 3 Uncommons

**#42 Regional Warlord** `Uncommon | Earth`  
Armor-clad noblewoman surveying a provincial map spread across a war table, alone in a vast hall. Her province is half the kingdom. She has not visited the capital in twelve years.

**#43 Fortress Baron** `Uncommon | Earth`  
Heavy-browed lord at the top of fortress walls, looking down at the plains below. Three armies tried to take these walls. He watched all three go home.

**#44 Highland Chieftain** `Uncommon | Earth`  
Kilted chieftain on a highland ridge, wind pulling at his plaid. He bowed to Valerius once. He will bow to no one else. He has not yet decided what comes next.

---

#### Nameless Silk — 4 Uncommons

**#45 Silent Assassin** `Uncommon | Shadow`  
Figure in shadow at the edge of a lit room, just before entering. You will not see her. You will not hear her. The only evidence she was here is absence.

**#46 Soul-Thief** `Uncommon | Shadow`  
Mysterious figure walking away from a duel scene, opponent collapsed behind them, the victor's prized sword now mysteriously absent from the scene. The transfer happened at the moment of death.

**#47 Master of Coins** `Uncommon | Shadow`  
Cloaked information broker at a corner table, fingers steepled, watching two other factions negotiate — too far away to hear, but he knows the price of what they're discussing.

**#48 Doubleface** `Uncommon | Shadow`  
Figure wearing two different half-masks simultaneously — one facing forward, one turned sideways. Three men. None of them know the others exist.

---

#### Events

**E1. Whispered Accusation** `Uncommon | Event`  
A sealed letter being slipped under a courtroom door by an unseen hand. No name. No voice. But by morning, the court has decided. Styled as a dramatic parchment document, court seal in wax.

**E2. Bloodline Claim** `Uncommon | Event`  
A young woman in plain dress standing before a stunned royal court, a single physical mark visible on her wrist — a clan birthmark nobody can deny. Those who see it fall to their knees.

---

### Rare (4 character + 2 event)

**#49 Ghost Fleet Captain** `Rare | Wind`  
Ghostly captain at the helm of a ship that is simultaneously intact and wrecked — the hull shows battle damage in one eyeline, perfectly whole from another angle. He was sunk. He still sails.

**#50 The King's Last Guard** `Rare | Fire`  
Colossal guard standing alone at the entrance of an empty throne room — doors blown open, no king inside, sword still drawn. He was the last to leave. He has not said what he saw.

**#51 The Faceless Weaver** `Rare | Shadow`  
Tailor with no distinct face, surrounded by garments for each of the five clan lords hung on mannequins. Same seamstress. Each clan believes she works only for them. The thread is the same.

**#52 The Prince in Exile** `Rare | Neutral`  
Young man in peasant clothes at a border village fountain, carrying nothing. His eyes carry something impossible to name — familiarity with something he should not know. Some say the heir lived.

**E3/53. The Assassin's Letter** `Rare | Event`  
A weathered parchment unrolling across a stone floor, the ink visibly fresh despite paper aged 15 years. The letter was written before anyone was named. The ink refuses to dry.

**E4/54. The Kingdom's Forgotten Oath** `Rare | Event`  
An ancient seal impression in stone, glowing faintly. Soldiers nearby instinctively grip their weapons without knowing why. The oath predates the throne. It cannot be broken.

---

### Legendary (4 cards)

**#55 Sceptre of Valerius** `Legendary | Hollow Blade | Fire`  
**Full illustration**: Seven fragments of a black-and-gold sceptre floating in midair, orbiting a silhouette of a crowned figure standing in the ruins of a throne room. The fragments glow — they are still looking for a hand. A glitch/distortion effect surrounds the crown symbol. The overall feeling: power without a wielder.

**#56 Nameless Blade** `Legendary | Nameless Silk | Shadow`  
**Full illustration**: A katana rendered in absolute black — the blade absorbs all light, a negative space weapon. The hand grip is wrapped in silk that shifts color. In the background, 47 faint silhouettes of previous wielders, each releasing the blade. The blade has no name on its tang. The ones who have touched it did not release it willingly.

**#57 Elyon Crown** `Legendary | Iron Circle | Earth`  
**Full illustration**: An iron circlet etched with oath-runes floating above a stone altar in a forest clearing. The runes glow with each Iron Circle symbol carved into the surrounding trees. Thin cracks around the band — it was repaired once, after the assassination. The crown was never recovered from the throne room. This is one of seventeen fakes. Or the real one.

**#58 Kingmaker's Ring** `Legendary | Sovereign Bourse | Gold`  
**Full illustration**: A simple gold band with a single black stone set deep into the metal. In the stone, five miniature silhouettes walk in a line, away from the viewer. The ring rests on a velvet cushion surrounded by five royal seals, each belonging to a different dead king. The one who hands over the ring, not the one who wears it, chooses the king.

---

### Event Commons

**E0/59. Seal of the Courtyard** `Common | Event`  
A wax seal pressed into a heavy door, closing it — the mark is unknown. A historian has spent three years identifying it. He has produced five different answers. The door does not open.

*(Card #60 slot = Ghost Fleet Captain counted as #49 = catalog uses #1-58 + E1-E3 + E0 for 60 unique art pieces)*

---

## §4. Universal Rules + Parameters

Append **after** the scene description AND after the clan anchor AND after the chosen variant anchor:

```
portrait composition, character face clearly visible, silhouette readable at small size, flat background, 
no text or UI elements, no speech bubbles, single character focus (unless Event card)
```

**Final full example for #1 Powder-Charge Boarder (Variant C selected)**:
```
Young woman in ragged pirate coat mid-leap, holding a powder barrel with a lit fuse, silhouetted against ocean spray. Her expression: fierce, certain. No hesitation. , dark navy background, red sail silhouette, wind and sea , anime illustration, One Piece early arc character design, Rurouni Kenshin lineart quality, warm muted color palette, adventure card game art, expressive character portrait, clean cel-shading , portrait composition, character face clearly visible, silhouette readable at small size, flat background, no text or UI elements --ar 1:1 --style raw --stylize 220 --no photorealistic, grimdark, blood, gore, heavy shadows, ultra-realistic
```

---

## §5. Pixelation Pipeline (Clip Studio Paint)

**Goal**: Convert Midjourney output → 64×64 pixel sprite suitable for 0xARK card frame.

### Step-by-step

1. **Export from Midjourney**: Download best candidate at native resolution (typically 1024×1024 or 2048×2048). Save as PNG.

2. **Open in Clip Studio Paint**  
   File → New → Document: 64×64 px, 72 dpi, RGB, Transparent background

3. **Place Midjourney image**  
   Layer → New Layer → Import image. Scale down to fit 64×64 frame.  
   Tool: Transform → Scale. Hold Shift to maintain aspect ratio.

4. **Apply pixelation**  
   Filter → Effect → Pixelate. Set block size to 2-3 px for "pixel art" look, or 1 px for clean small portrait.  
   Alternatively: Filter → Correction → Level Correction to increase contrast before downsampling.

5. **Reduce colors (optional)**  
   Layer → New Adjustment Layer → Posterize → Level 8-12  
   This gives a clean limited-palette pixel aesthetic.

6. **Export**  
   File → Export (single layer) → PNG  
   Filename convention: `card_{id}_{name_snake}.png` e.g. `card_001_powder_charge_boarder.png`

7. **Figma integration**  
   Upload to Figma card frame template (frame: 64×64, corner radius 4px, border 1px clan color).  
   Overlay the card stats text layer on top.

### Batch tip

Use CSP's batch export feature (File → Batch Process) if processing 10+ cards at once.  
Apply the same filter settings to all via the batch action recorder.

---

## §6. Batch Execution — Morning Procedure for r0ze

### Before you start (5 min)

- [ ] Read §1 variants A-D above
- [ ] Look at 2-3 real card games for comparison (Legends of Runeterra, Slay the Spire, Inscryption)
- [ ] Pick **one** variant. Write it down. Do not change mid-batch.

### Prompt assembly (per card)

Copy this template, fill in the blanks from §3:

```
[scene from §3] , [clan anchor from §3 header] , [chosen variant anchor string from §1] , portrait composition, character face clearly visible, silhouette readable at small size, flat background, no text or UI elements
```

### Midjourney batch flow

1. Open Midjourney in Discord
2. `/imagine prompt:` → paste assembled prompt → Enter
3. Wait 60s → 4 candidates appear
4. Press `U1`–`U4` to upscale best candidate
5. Download PNG
6. Move to `nft/img/{card_id}.png`
7. Repeat

### Estimated time

- 60 cards × 2 min per card (prompt + wait + select) = **~2 hours total**
- Do in batches of 10-15 cards per session to avoid Midjourney queue limits

### Priority order (if time is short)

1. 4 Legendaries (highest pitch value) — #55-58
2. 6 Rare/Event Rares — #49-54
3. 8 Uncommon Clan leaders — #31, 35, 39, 42, 45, 46, 49, 51
4. Remaining 42 Commons

### File destination

```
nft/img/
├── card_055_sceptre_of_valerius.png
├── card_056_nameless_blade.png
├── ...
└── card_001_powder_charge_boarder.png
```

Then run `npm run gen-og` to regenerate any OG images that reference card art.
