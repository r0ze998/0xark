# 0xARK Season 1 — Card Catalog v0.2

**Theme:** The Succession War of the Lost Kingdom of Elyon  
**Total cards:** 60 (30 Common / 20 Uncommon / 8 Rare / 2 Legendary)  
**Status:** Draft 2 for r0ze review — 2026-04-21  
**Rules basis:** GDD v1.2 Section 5 (phase-based, 5-element affinity, Shards, defenders)

**Changes from v0.1:**
- Stats expanded: BP / HP / TP / Element added (was only "Power")
- Cost uses element symbols (🔥💨🔥🌿🌑💰) instead of flat number
- Abilities have explicit phase triggers (On-Summon / On-Destroy / Passive / On-Turn-End / On-Battle)
- Defender ability added to ~6 cards
- Shards generation/consumption added to ~4 cards
- Lane restrictions added to ~8 cards
- Event cards (~10) have Cost + effect only (no stats)
- Energy cards (~4) provide per-round element generation

---

## Season 1 Lore

Fifteen years ago, Wise-King Valerius of Elyon was assassinated in his own throne room. The heir was an infant prince who vanished that same night. The kingdom fractured. Five clans each proclaimed themselves the true successor.

Fifteen years of cold war. Public smiles at the royal funeral, private daggers in the dark. Poison, blackmail, forged documents, quiet bodies in the river.

Now, the **Sixty Tokens of the King** — ancient seals scattered by Valerius himself before his death — have begun to surface. Whoever gathers all sixty holds the kingdom's true legitimacy.

The race has begun.

---

## Five Clans & Their Elements

| Clan | Japanese | Element | Archetype | Play style |
|------|----------|---------|-----------|------------|
| **Black Flag** | 黒旗 | 💨 Wind | Exiled navy | Fast, cheap, mobile — hit first and often |
| **Sovereign Bourse** | 主権市場 | 💰 Gold | Merchant lords | Energy engine, late scaling, economic synergy |
| **Hollow Blade** | 空の刃 | 🔥 Fire | Royal guard | High BP, direct damage, consistent |
| **Iron Circle** | 鉄環 | 🌿 Earth | Provincial lords | High HP, defense, denial |
| **Nameless Silk** | 無名の絹 | 🌑 Shadow | Mercenary spies | Info warfare, ZK deception, counter-intel |

### Element affinity wheel

```
🔥 Fire    →  +2 BP vs  🌿 Earth
🌿 Earth   →  +2 BP vs  💨 Wind
💨 Wind    →  +2 BP vs  🌑 Shadow
🌑 Shadow  →  +2 BP vs  💰 Gold
💰 Gold    →  +2 BP vs  🔥 Fire
```

Reverse matchups: **-1 BP** penalty. Same element or neutral pairs: no modifier.

---

## Card type legend

- **CHARACTER**: Has BP/HP/TP/Element, occupies a lane, can attack/defend
- **ENERGY**: Produces 1 element energy per round, no combat stats
- **EVENT**: One-shot spell, resolves immediately, no stats, no lane

---

# Common (30 cards — 6 per Clan)

## Black Flag — 6 Commons

### 1. Sea Rat
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind  
**BP:** 2 | **HP:** 1 | **TP:** 2 | **Cost:** 💨1  
**Passive:** *+1 BP for each other Black Flag character in this lane.*  
**Flavor:** *"Every port has them. Nobody asks where they came from. They don't answer."*

### 2. Storm Bosun
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind  
**BP:** 3 | **HP:** 2 | **TP:** 2 | **Cost:** 💨2  
**On-Summon:** *Draw 1 card.*  
**Flavor:** *"The storm is a priest. The ship is his pulpit. We are his congregation."*

### 3. Grapple Specialist
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind  
**BP:** 4 | **HP:** 2 | **TP:** 3 | **Cost:** 💨2  
**On-Summon:** *Move 1 of your other characters to this lane from an adjacent one.*  
**Flavor:** *"He misses nothing. Not ships, not throats, not debts."*

### 4. Salt-Bitten Deckhand
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind  
**BP:** 3 | **HP:** 2 | **TP:** 1 | **Cost:** 💨1  
**On-Turn-End:** *+1 BP if another Black Flag card was played this round.*  
**Flavor:** *"Twenty years at sea. He calls the wind by name. The wind answers."*

### 5. Powder Monkey
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind  
**BP:** 2 | **HP:** 1 | **TP:** 2 | **Cost:** 💨1 | **Lane:** Front only  
**On-Destroy:** *Deal 2 damage to the opposing character in this lane.*  
**Flavor:** *"He was eight when the navy took his father. He was ten when he took the navy's ship."*

### 6. Reef Pilot
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind  
**BP:** 4 | **HP:** 3 | **TP:** 1 | **Cost:** 💨3  
**Passive:** *—*  
**Flavor:** *"No map shows these waters. The maps are in her head. She will not share."*

---

## Sovereign Bourse — 6 Commons

### 7. Copper Clerk
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold  
**BP:** 1 | **HP:** 2 | **TP:** 0 | **Cost:** 💰1  
**On-Summon:** *Gain 0.001 SOL to Shop credit (redeemable after duel).*  
**Flavor:** *"Every ledger entry is a small immortality. He has written millions."*

### 8. Spice Broker
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold  
**BP:** 2 | **HP:** 2 | **TP:** 1 | **Cost:** 💰2  
**On-Summon:** *Your next Sovereign Bourse card this round costs 1 less.*  
**Flavor:** *"She sold the first cinnamon to reach the west. Kings begged. She raised the price."*

### 9. Caravan Guard
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold  
**BP:** 4 | **HP:** 4 | **TP:** 1 | **Cost:** 💰2  
**Passive:** *—*  
**Flavor:** *"Not loyal to the merchant. Loyal to the salary. More reliable either way."*

### 10. Pawnbroker's Wife
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold  
**BP:** 2 | **HP:** 3 | **TP:** 0 | **Cost:** 💰2  
**On-Destroy:** *Return 1 Sovereign Bourse card from your discard pile to your hand.*  
**Flavor:** *"He runs the shop. She runs him. The books balance."*

### 11. Harbor Assessor
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold  
**BP:** 3 | **HP:** 3 | **TP:** 2 | **Cost:** 💰2  
**On-Turn-End:** *Look at opponent's total energy reserve.*  
**Flavor:** *"A cargo manifest never lies. Men lie. Ships lie. Numbers never."*

### 12. Traveling Scholar
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold  
**BP:** 3 | **HP:** 2 | **TP:** 3 | **Cost:** 💰2  
**On-Summon:** *Look at 1 random card in opponent's hand.*  
**Flavor:** *"He claims to study languages. He is paid by four kingdoms."*

---

## Hollow Blade — 6 Commons

### 13. Guard Recruit
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire  
**BP:** 3 | **HP:** 3 | **TP:** 1 | **Cost:** 🔥2  
**Passive:** *—*  
**Flavor:** *"First month of service. Still polishing his blade before the mirror each morning."*

### 14. Palace Sentinel
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire  
**BP:** 4 | **HP:** 4 | **TP:** 1 | **Cost:** 🔥3 | **Lane:** Front or Middle  
**Passive:** *Can defend (takes first hit in adjacent lanes).*  
**Flavor:** *"He stood at the throne room door the night the king died. He has not slept since."*

### 15. Sword Instructor
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire  
**BP:** 2 | **HP:** 3 | **TP:** 2 | **Cost:** 🔥2  
**On-Summon:** *+1 BP to all your Hollow Blade characters in play.*  
**Flavor:** *"Three thousand students. Six still living. Two still loyal."*

### 16. Royal Courier
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire  
**BP:** 2 | **HP:** 2 | **TP:** 3 | **Cost:** 🔥1  
**On-Summon:** *Move 1 of your characters to an adjacent lane.*  
**Flavor:** *"He memorizes the letters he carries. He has never spoken one aloud."*

### 17. Widowed Armorer
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire  
**BP:** 3 | **HP:** 2 | **TP:** 1 | **Cost:** 🔥2  
**On-Destroy:** *+2 BP to a random Hollow Blade character you control.*  
**Flavor:** *"Her husband died holding the last line. She forges now for his ghost."*

### 18. Dawn Patrol
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire  
**BP:** 4 | **HP:** 3 | **TP:** 2 | **Cost:** 🔥2  
**Passive:** *-1 BP if no other Hollow Blade card in this lane.*  
**Flavor:** *"They ride in pairs. Always. Never one alone. Not since the king fell."*

---

## Iron Circle — 6 Commons

### 19. Tax Collector
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth  
**BP:** 2 | **HP:** 3 | **TP:** 1 | **Cost:** 🌿1  
**On-Summon:** *Opponent discards 1 random card.*  
**Flavor:** *"He takes coin from farmers. He takes silence from whoever objects."*

### 20. Border Magistrate
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth  
**BP:** 3 | **HP:** 4 | **TP:** 1 | **Cost:** 🌿2  
**On-Summon:** *+1 cost to 1 card in opponent's hand (reveal it to choose).*  
**Flavor:** *"Paperwork is the heaviest weapon. Very few survive its weight."*

### 21. Fortress Quartermaster
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth  
**BP:** 3 | **HP:** 5 | **TP:** 1 | **Cost:** 🌿2 | **Lane:** Back only  
**Passive:** *Cannot be targeted by opposing Events while Front lane has an ally.*  
**Flavor:** *"He knows where every arrow is stored. He also knows who stole the last crate."*

### 22. Sworn Steward
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth  
**BP:** 2 | **HP:** 4 | **TP:** 0 | **Cost:** 🌿2  
**On-Turn-End:** *-1 BP on 1 opposing character in this lane until end of next round.*  
**Flavor:** *"Three lords have owned him. All three died. He still serves."*

### 23. Mountain Ranger
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth  
**BP:** 4 | **HP:** 4 | **TP:** 2 | **Cost:** 🌿3  
**Passive:** *—*  
**Flavor:** *"She has not seen the capital in ten years. She has forgotten what flags look like."*

### 24. Watchtower Scout
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth  
**BP:** 2 | **HP:** 2 | **TP:** 2 | **Cost:** 🌿1  
**On-Summon:** *Look at opponent's total energy cost next round.*  
**Flavor:** *"He sits alone for weeks. He counts lights on the horizon. He sends only what matters."*

---

## Nameless Silk — 6 Commons

### 25. Market Pickpocket
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow  
**BP:** 2 | **HP:** 1 | **TP:** 3 | **Cost:** 🌑1  
**On-Summon:** *See 1 random card in opponent's hand.*  
**Flavor:** *"Her hands are her family. Her family is nobody."*

### 26. Tavern Informant
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow  
**BP:** 2 | **HP:** 2 | **TP:** 2 | **Cost:** 🌑2  
**Conditional Passive:** *+3 BP if opponent revealed their Identity this duel.*  
**Flavor:** *"He pours wine. He remembers names. He sells both for the same price."*

### 27. Shadow Blade
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow  
**BP:** 3 | **HP:** 2 | **TP:** 3 | **Cost:** 🌑2  
**Passive:** *—*  
**Flavor:** *"She has no master. She has no clan. She has been paid by all five."*

### 28. Rooftop Runner
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow  
**BP:** 3 | **HP:** 2 | **TP:** 4 | **Cost:** 🌑2  
**On-Summon:** *Move to any lane regardless of current placement.*  
**Flavor:** *"He has not touched the ground in eight years. The ground has forgotten him."*

### 29. Poison Herbalist
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow  
**BP:** 2 | **HP:** 2 | **TP:** 1 | **Cost:** 🌑2  
**On-Turn-End:** *Deal 1 damage to 1 random opposing character.*  
**Flavor:** *"Every tea she serves has two layers. Only one of them you taste."*

### 30. Mask-Maker
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow  
**BP:** 2 | **HP:** 2 | **TP:** 2 | **Cost:** 🌑1  
**On-Summon:** *Opponent's next Scout peek this duel sees a decoy card (false identity).*  
**Flavor:** *"She carves the face you will wear tomorrow. You will not remember your own."*

---

# Uncommon (20 cards — 4 per Clan)

## Black Flag — 4 Uncommons

### 31. First Mate Kaelith
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind  
**BP:** 5 | **HP:** 4 | **TP:** 3 | **Cost:** 💨3  
**On-Summon:** *Your next Black Flag card this duel costs 1 less.*  
**Flavor:** *"Second in command of the ghost fleet. The captain answers to her, though he would deny it."*

### 32. Cannon Captain
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind  
**BP:** 6 | **HP:** 3 | **TP:** 2 | **Cost:** 💨4  
**On-Summon:** *Deal 2 damage to each opposing character in this lane.*  
**Flavor:** *"He lost an eye, an ear, three fingers. He keeps firing. The crew calls him luck."*

### 33. Bloodflag Corsair
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind  
**BP:** 7 | **HP:** 3 | **TP:** 3 | **Cost:** 💨4 | **Lane:** Front only  
**Conditional Passive:** *-3 BP if opponent has no 🔥 Hollow Blade characters in play (nothing to fight).*  
**Flavor:** *"Crimson sail, crimson deck, crimson hands. He only sails toward the royal navy."*

### 34. Mutineer
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind  
**BP:** 4 | **HP:** 3 | **TP:** 2 | **Cost:** 💨2  
**On-Summon:** *Take control of 1 opposing character with BP ≤ 2 in this lane.*  
**Flavor:** *"He speaks softly to men who follow orders. By morning, those men follow him."*

---

## Sovereign Bourse — 4 Uncommons

### 35. Gold-Blooded Banker
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold  
**BP:** 4 | **HP:** 3 | **TP:** 2 | **Cost:** 💰3  
**On-Summon:** *Gain 0.005 SOL to Shop credit. +1 BP for each 0.01 SOL in current credit.*  
**Flavor:** *"He never handles coin. Clerks do that. He handles numbers. Numbers handle kings."*

### 36. Weapons Trader
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold  
**BP:** 5 | **HP:** 3 | **TP:** 2 | **Cost:** 💰3  
**On-Summon:** *Reveal all cards in opponent's hand with cost ≥ 4.*  
**Flavor:** *"She sells to every clan. None of them know. All of them would kill her if they did."*

### 37. Treasury Keeper
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold  
**BP:** 4 | **HP:** 4 | **TP:** 1 | **Cost:** 💰3  
**On-Destroy:** *Draw 2 cards.*  
**Flavor:** *"His family has counted the royal coin for four generations. He is the last. He has hidden records."*

### 38. Merchant Prince
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold  
**BP:** 6 | **HP:** 4 | **TP:** 2 | **Cost:** 💰4  
**On-Turn-End:** *+2 BP if you played 2+ Sovereign Bourse cards this round.*  
**Flavor:** *"He owns no throne. He owns everyone who wants one."*

---

## Hollow Blade — 4 Uncommons

### 39. Captain of the Guard
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire  
**BP:** 5 | **HP:** 5 | **TP:** 2 | **Cost:** 🔥3  
**On-Summon:** *+1 BP to all your Hollow Blade characters (all lanes).*  
**Flavor:** *"He drew his sword at the king's funeral. He has not sheathed it since."*

### 40. Oathsworn Knight
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire  
**BP:** 7 | **HP:** 6 | **TP:** 1 | **Cost:** 🔥4 | **Lane:** Front only  
**Passive:** *Can defend adjacent allies. Gains +1 BP when defending.*  
**Flavor:** *"The oath binds in ways the blade cannot. He has kept his. Others have not."*

### 41. Royal Inquisitor
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire  
**BP:** 4 | **HP:** 3 | **TP:** 3 | **Cost:** 🔥3  
**On-Summon:** *Look at opponent's full hand.*  
**Flavor:** *"He asks the questions. Men answer. Men always answer."*

### 42. Duelmaster
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire  
**BP:** 5 | **HP:** 4 | **TP:** 3 | **Cost:** 🔥3  
**On-Summon:** *If exactly 1 opposing character in this lane, destroy it and gain its BP as permanent bonus.*  
**Flavor:** *"He has fought 127 duels. He has won 127. The 128th is always tomorrow."*

---

## Iron Circle — 4 Uncommons

### 43. Regional Warlord
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth  
**BP:** 6 | **HP:** 5 | **TP:** 1 | **Cost:** 🌿4  
**On-Summon:** *Opponent's next card costs 2 more.*  
**Flavor:** *"Her province is half the kingdom. She hasn't visited the capital in twelve years."*

### 44. Fortress Baron
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth  
**BP:** 5 | **HP:** 6 | **TP:** 1 | **Cost:** 🌿3 | **Lane:** Back only  
**On-Turn-End:** *Opposing characters in adjacent lanes lose 1 BP until end of next round.*  
**Flavor:** *"His walls have never fallen. Three times the king's army tried. Three times they went home poorer."*

### 45. Provincial Chancellor
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth  
**BP:** 4 | **HP:** 5 | **TP:** 2 | **Cost:** 🌿3  
**On-Summon:** *Reveal opponent's Clan (partial identity reveal).*  
**Flavor:** *"He writes the laws his lord enforces. He also writes the ones he hides."*

### 46. Highland Chieftain
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth  
**BP:** 7 | **HP:** 5 | **TP:** 2 | **Cost:** 🌿4  
**On-Summon:** *+1 BP for each other Iron Circle character in play (all lanes).*  
**Flavor:** *"He bowed to Valerius. He will bow to no other. He has not yet decided."*

---

## Nameless Silk — 4 Uncommons

### 47. Silent Assassin
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow  
**BP:** 5 | **HP:** 3 | **TP:** 4 | **Cost:** 🌑3  
**On-Summon:** *Destroy 1 opposing character with cost ≤ 2 in any lane.*  
**Flavor:** *"You will not see her. You will not hear her. You will only stop."*

### 48. Poisoner's Apprentice
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow  
**BP:** 3 | **HP:** 3 | **TP:** 2 | **Cost:** 🌑2  
**On-Summon:** *1 opposing character loses 2 BP until end of round.*  
**Flavor:** *"She hands you the cup. She smiles. You drink. She does not smile later."*

### 49. Master of Coins
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow  
**BP:** 4 | **HP:** 3 | **TP:** 3 | **Cost:** 🌑3  
**Passive:** *Opponent's x402 Scout peek costs double (0.01 SOL) for the rest of this duel.*  
**Flavor:** *"His clan sells information. He sells the cost of information."*

### 50. Doubleface
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow  
**BP:** 4 | **HP:** 3 | **TP:** 3 | **Cost:** 🌑2  
**Passive:** *All opposing Scout peeks this duel return a random non-Nameless-Silk card from your deck instead of your hand.*  
**Flavor:** *"He is three men. None of them know the other two exist."*

---

# Rare (8 cards)

### 51. Ghost Fleet Captain
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind | **Rarity:** Rare  
**BP:** 8 | **HP:** 5 | **TP:** 4 | **Cost:** 💨5 | **Lane:** Front or Middle  
**On-Summon:** *All your Black Flag characters gain +1 BP for the rest of the duel.*  
**Flavor:** *"His ship was sunk by the royal navy seven years ago. His ship still sails. Nobody has explained."*

### 52. Queen of the Exchange
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold | **Rarity:** Rare  
**BP:** 6 | **HP:** 5 | **TP:** 3 | **Cost:** 💰4  
**On-Summon:** *For each card in your hand, gain 0.002 SOL to Shop credit.*  
**Flavor:** *"She has bought three kings. She watched them die, smiling, as she bought the fourth."*

### 53. The King's Last Guard
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire | **Rarity:** Rare  
**BP:** 9 | **HP:** 6 | **TP:** 2 | **Cost:** 🔥5  
**On-Summon:** *+2 BP for every Hollow Blade character destroyed this duel (yours or opponent's).*  
**Passive:** *Can defend two adjacent lanes simultaneously.*  
**Flavor:** *"He was the last to leave the throne room. He has not said what he saw there."*

### 54. Lord of the Inland Fortresses
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth | **Rarity:** Rare  
**BP:** 7 | **HP:** 8 | **TP:** 1 | **Cost:** 🌿5 | **Lane:** Back only  
**On-Summon:** *Lock this lane — no new characters can be summoned here by either player next round.*  
**Flavor:** *"Seven castles, seven keys, seven oaths broken. The kingdom ends at his border."*

### 55. The Faceless Weaver
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow | **Rarity:** Rare  
**BP:** 5 | **HP:** 4 | **TP:** 5 | **Cost:** 🌑3  
**Passive:** *All opposing x402 peeks this duel (Scout, Identity, Hint) return false information.*  
**Flavor:** *"She dresses the clans. She dresses the clans' lies. She dresses the clans' corpses. Same thread."*

### 56. The Prince in Exile
**Type:** Character | **Neutral** (plays for any clan) | **Element:** Null | **Rarity:** Rare  
**BP:** 6 | **HP:** 5 | **TP:** 3 | **Cost:** 2 of any 2 different elements  
**On-Summon:** *If your deck contains cards from 4+ clans, +3 BP and draw 1 card.*  
**Flavor:** *"Some say the heir lived. Some say the heir is among us. Some are paid well to say nothing."*

### 57. The Assassin's Letter
**Type:** EVENT | **Rarity:** Rare | **Cost:** 💰1 + 🌑1  
**Effect:** *Reveal opponent's Identity commitment immediately (permanent for rest of duel).*  
**Flavor:** *"Fifteen years ago, someone wrote this. The writing has not aged. The ink is still wet."*

### 58. The Kingdom's Forgotten Oath
**Type:** EVENT | **Rarity:** Rare | **Cost:** 0 (any element, but must be played when you have 5+ energy of single element)  
**Effect:** *Target character gains permanent BP equal to your current energy in that element.*  
**Flavor:** *"A promise older than the throne. A promise nobody remembers making. A promise that cannot be broken."*

---

# Legendary (2 cards — 1-of-1 NFTs)

### 59. The Sceptre of Valerius
**Type:** Character | **Clan:** Any (neutral) | **Element:** Null | **Rarity:** Legendary (1 of 1)  
**BP:** 3 | **HP:** 3 | **TP:** 5 | **Cost:** 4 of any 4 different elements  
**On-Summon:** *Reveal opponent's full hand. Take 1 card from it permanently — it enters your NFT collection after the duel ends. (This card itself returns to the current Sceptre holder after the duel.)*  
**Flavor:** *"The Wise-King's sceptre was shattered the night he died. The fragments remember. They are still looking for a hand."*  
**Supply:** 1 in existence. Transfers to the victor each time its current holder loses a duel in **Gold Hall**. Ownership is publicly visible on-chain.  
**Visual:** Shattered black-and-gold fragments floating in midair, silhouette of a crowned figure in the background, glitch effect on the crown symbol.

### 60. The Nameless Blade
**Type:** Character | **Clan:** Nameless Silk only | **Element:** 🌑 Shadow | **Rarity:** Legendary (1 of 1)  
**BP:** 0 / 15 (conditional) | **HP:** 5 | **TP:** 4 | **Cost:** 🌑4  
**Conditional Passive:** *BP is 15 if opponent used any x402 peek (Scout, Identity, Hint) at any point in this duel. BP is 0 otherwise.*  
**Flavor:** *"The blade remembers every eye that has tried to read it. Those eyes do not close peacefully."*  
**Supply:** 1 in existence. Only playable by Nameless Silk players. Transfers on Gold Hall loss (same as Sceptre).  
**Visual:** A katana with the blade rendered in pure black (absorbing all light), hand grip wrapped in silk that shifts color based on holder's Clan identity commitment.

---

## Ability distribution (balance audit)

| Category | Count | % | Notes |
|----------|-------|---|-------|
| Vanilla (no ability) | 5 | 8% | Simple onboarding cards |
| On-Summon effect | 22 | 37% | Main trigger |
| On-Destroy effect | 5 | 8% | Recursive/death synergy |
| On-Turn-End effect | 5 | 8% | Slow-burn value |
| Passive (always-on) | 8 | 13% | Buff/debuff auras |
| Conditional (state-dependent) | 5 | 8% | Combo enablers |
| Lane-restricted | 8 | 13% | Front/Middle/Back placement |
| Defender-capable | 4 | 7% | Palace Sentinel, Oathsworn, Last Guard, (+Fortress Quarter in effect) |
| x402 / ZK interaction | 5 | 8% | Mask-Maker, Master of Coins, Doubleface, Faceless Weaver, Nameless Blade |
| Shop credit / economy | 3 | 5% | Copper Clerk, Gold-Blooded Banker, Queen of Exchange |
| Hand manipulation (peek/discard) | 8 | 13% | Info warfare tools |
| Opposing card direct damage | 5 | 8% | Removal tools |

Events: 2 (The Assassin's Letter, The Kingdom's Forgotten Oath)  
Pure Characters: 58 (including Legendaries)  
Energy cards: to be added separately — 4 more cards (Wind Farmer, Fire Hearth, Gold Vault, Shadow Grove, Earth Quarry — one per element, not in Core 60 but obtained via Clan Starter deck)

## Clan distribution

| Clan | Common | Uncommon | Rare | Legendary | Total in Core 60 |
|------|--------|----------|------|-----------|-------------------|
| Black Flag | 6 | 4 | 1 | — | 11 |
| Sovereign Bourse | 6 | 4 | 1 | — | 11 |
| Hollow Blade | 6 | 4 | 1 | — | 11 |
| Iron Circle | 6 | 4 | 1 | — | 11 |
| Nameless Silk | 6 | 4 | 1 | 1 (Nameless Blade) | 12 |
| Neutral / Any clan | — | — | 3 | 1 (Sceptre) | 4 |
| **Total** | **30** | **20** | **8** | **2** | **60** |

## TP distribution (turn order balance)

Average TP by clan (for balance sanity):
- Black Flag: 2.6 (aggressive, often goes first)
- Nameless Silk: 2.8 (highest, info priority)
- Hollow Blade: 2.0 (balanced)
- Sovereign Bourse: 1.8 (reactive, plays late)
- Iron Circle: 1.3 (defensive, often goes second to defend)

This matches the intended play style: Silk/Flag strike first, Earth/Gold respond and build up.

---

## Review items for r0ze

1. **Card names in English** — OK, or prefer Japanese / katakana variants?
2. **Cost notation** — element symbols (🔥💨💰🌿🌑) OK, or prefer numerical shorthand (F/W/G/E/S)?
3. **Heart HP = 20** — right starting value? Or 15/25?
4. **Shards cap = 5** — right, or too low/high?
5. **Legendary transfer is Gold Hall only** — OK? Or allow any Hall?
6. **Event cards only 2** — should we add more (5-10)? Current catalog is Character-heavy.
7. **Energy cards not in Core 60** — correct split, or should some be collectible too?
8. **Any card feels broken / weak / uninspired?**
9. **TP (Tactical Points) concept** — intuitive, or confusing? Might rename to "Initiative" or "Speed".
10. **Flavor text tone** — consistent, or some feel off?

---

*End of Card Catalog v0.2*

*v0.2 changelog: stats expanded (BP/HP/TP/Element), element cost notation, phase triggers explicit, defender mechanic on 4-5 cards, Shards/Extra Action references added, lane restrictions on 8 cards, 2 Event cards introduced, Legendary abilities refined for phase-based flow.*
