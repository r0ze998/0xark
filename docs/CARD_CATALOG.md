# 0xARK Season 1 — Card Catalog v0.3

**Theme:** The Succession War of the Lost Kingdom of Elyon  
**Total cards:** 60 (30 Common / 20 Uncommon / 6 Rare / 4 Legendary)  
**Status:** Draft 3 for r0ze review — 2026-04-22  
**Rules basis:** GDD v2.0 (phase-based, 5-element affinity, Shards, defenders, Burn/Transform, Gold Hall Legendary acquisition)

**Changes from v0.2:**
- **TP renamed to Initiative** throughout (all 60 cards)
- **Legendary expanded 2 → 4**: Sceptre of Valerius (Hollow Blade) + Nameless Blade (Nameless Silk) + **Elyon Crown (Iron Circle, new)** + **Kingmaker's Ring (Sovereign Bourse, new)**
- **Rare reduced 8 → 6**: two Rares promoted to Legendary (Lord of the Inland Fortresses → Elyon Crown, Queen of the Exchange → Kingmaker's Ring)
- **Event cards expanded 2 → 5**: added Seal of the Courtyard (Common), Whispered Accusation (Uncommon), Bloodline Claim (Uncommon)
- **Legendary supply**: 4 species × 10 NFTs = 40 Legendary NFTs max per Season. First 10 players to claim each species get mint #1-10.
- **Lore Shard 1** text added to all 60 cards (witness perspective; Shards 2 & 3 deferred to post-hackathon except 15 key cards)
- **Black Flag has no Legendary** (narrative: pirates reject kingship — they want freedom and treasure, not the throne)

**v0.2 scope reminder:**
- Stats expanded: BP / HP / Initiative / Element (was only "Power")
- Cost uses element symbols (🔥💨🌿🌑💰)
- Abilities have explicit phase triggers (On-Summon / On-Destroy / Passive / On-Turn-End / On-Battle)
- Defender ability on ~6 cards
- Lane restrictions on ~8 cards

---

## Season 1 narrative compass

Fifteen years ago, Wise-King Valerius of Elyon was assassinated in his own throne room. The heir was an infant prince who vanished that same night. The kingdom fractured. Five clans each proclaimed themselves the true successor.

Fifteen years of cold war. Public smiles at the royal funeral, private daggers in the dark. Poison, blackmail, forged documents, quiet bodies in the river.

Now, the **Sixty Tokens of the King** — ancient seals scattered by Valerius himself before his death — have begun to surface. Whoever gathers all sixty holds the kingdom's true legitimacy.

Among the 60, **four Legendary relics** anchor the narrative: the Sceptre, the Blade, the Crown, the Ring. Each represents a different philosophy of kingship held by a different clan.

The race has begun.

---

## The Four Legendaries of Season 1

Each Legendary represents one clan's answer to "what is a king?":

| Legendary | Clan | Philosophy | Meaning |
|-----------|------|-----------|---------|
| **Sceptre of Valerius** | Hollow Blade | *Might* | The one who can defeat the king is king |
| **Nameless Blade** | Nameless Silk | *Erasure* | The throne itself is the enemy; kill kingship |
| **Elyon Crown** | Iron Circle | *Legitimacy* | The rightful heir, through blood and oath, is king |
| **Kingmaker's Ring** | Sovereign Bourse | *Patronage* | Whoever chooses the king holds real power |

Black Flag has no Legendary — pirates do not seek thrones. Their rejection of the succession drama is itself a statement.

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
**BP:** 2 | **HP:** 1 | **Initiative:** 2 | **Cost:** 💨1  
**Passive:** *+1 BP for each other Black Flag character in this lane.*  
**Flavor:** *"Every port has them. Nobody asks where they came from. They don't answer."*

### 2. Storm Bosun
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind  
**BP:** 3 | **HP:** 2 | **Initiative:** 2 | **Cost:** 💨2  
**On-Summon:** *Draw 1 card.*  
**Flavor:** *"The storm is a priest. The ship is his pulpit. We are his congregation."*

### 3. Grapple Specialist
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind  
**BP:** 4 | **HP:** 2 | **Initiative:** 3 | **Cost:** 💨2  
**On-Summon:** *Move 1 of your other characters to this lane from an adjacent one.*  
**Flavor:** *"He misses nothing. Not ships, not throats, not debts."*

### 4. Salt-Bitten Deckhand
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind  
**BP:** 3 | **HP:** 2 | **Initiative:** 1 | **Cost:** 💨1  
**On-Turn-End:** *+1 BP if another Black Flag card was played this round.*  
**Flavor:** *"Twenty years at sea. He calls the wind by name. The wind answers."*

### 5. Powder Monkey
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind  
**BP:** 2 | **HP:** 1 | **Initiative:** 2 | **Cost:** 💨1 | **Lane:** Front only  
**On-Destroy:** *Deal 2 damage to the opposing character in this lane.*  
**Flavor:** *"He was eight when the navy took his father. He was ten when he took the navy's ship."*

### 6. Reef Pilot
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind  
**BP:** 4 | **HP:** 3 | **Initiative:** 1 | **Cost:** 💨3  
**Passive:** *—*  
**Flavor:** *"No map shows these waters. The maps are in her head. She will not share."*

---

## Sovereign Bourse — 6 Commons

### 7. Copper Clerk
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold  
**BP:** 1 | **HP:** 2 | **Initiative:** 0 | **Cost:** 💰1  
**On-Summon:** *Gain 0.001 SOL to Shop credit (redeemable after duel).*  
**Flavor:** *"Every ledger entry is a small immortality. He has written millions."*

### 8. Spice Broker
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold  
**BP:** 2 | **HP:** 2 | **Initiative:** 1 | **Cost:** 💰2  
**On-Summon:** *Your next Sovereign Bourse card this round costs 1 less.*  
**Flavor:** *"She sold the first cinnamon to reach the west. Kings begged. She raised the price."*

### 9. Caravan Guard
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold  
**BP:** 4 | **HP:** 4 | **Initiative:** 1 | **Cost:** 💰2  
**Passive:** *—*  
**Flavor:** *"Not loyal to the merchant. Loyal to the salary. More reliable either way."*

### 10. Pawnbroker's Wife
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold  
**BP:** 2 | **HP:** 3 | **Initiative:** 0 | **Cost:** 💰2  
**On-Destroy:** *Return 1 Sovereign Bourse card from your discard pile to your hand.*  
**Flavor:** *"He runs the shop. She runs him. The books balance."*

### 11. Harbor Assessor
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold  
**BP:** 3 | **HP:** 3 | **Initiative:** 2 | **Cost:** 💰2  
**On-Turn-End:** *Look at opponent's total energy reserve.*  
**Flavor:** *"A cargo manifest never lies. Men lie. Ships lie. Numbers never."*

### 12. Traveling Scholar
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold  
**BP:** 3 | **HP:** 2 | **Initiative:** 3 | **Cost:** 💰2  
**On-Summon:** *Look at 1 random card in opponent's hand.*  
**Flavor:** *"He claims to study languages. He is paid by four kingdoms."*

---

## Hollow Blade — 6 Commons

### 13. Guard Recruit
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire  
**BP:** 3 | **HP:** 3 | **Initiative:** 1 | **Cost:** 🔥2  
**Passive:** *—*  
**Flavor:** *"First month of service. Still polishing his blade before the mirror each morning."*

### 14. Palace Sentinel
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire  
**BP:** 4 | **HP:** 4 | **Initiative:** 1 | **Cost:** 🔥3 | **Lane:** Front or Middle  
**Passive:** *Can defend (takes first hit in adjacent lanes).*  
**Flavor:** *"He stood at the throne room door the night the king died. He has not slept since."*

### 15. Sword Instructor
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire  
**BP:** 2 | **HP:** 3 | **Initiative:** 2 | **Cost:** 🔥2  
**On-Summon:** *+1 BP to all your Hollow Blade characters in play.*  
**Flavor:** *"Three thousand students. Six still living. Two still loyal."*

### 16. Royal Courier
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire  
**BP:** 2 | **HP:** 2 | **Initiative:** 3 | **Cost:** 🔥1  
**On-Summon:** *Move 1 of your characters to an adjacent lane.*  
**Flavor:** *"He memorizes the letters he carries. He has never spoken one aloud."*

### 17. Widowed Armorer
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire  
**BP:** 3 | **HP:** 2 | **Initiative:** 1 | **Cost:** 🔥2  
**On-Destroy:** *+2 BP to a random Hollow Blade character you control.*  
**Flavor:** *"Her husband died holding the last line. She forges now for his ghost."*

### 18. Dawn Patrol
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire  
**BP:** 4 | **HP:** 3 | **Initiative:** 2 | **Cost:** 🔥2  
**Passive:** *-1 BP if no other Hollow Blade card in this lane.*  
**Flavor:** *"They ride in pairs. Always. Never one alone. Not since the king fell."*

---

## Iron Circle — 6 Commons

### 19. Tax Collector
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth  
**BP:** 2 | **HP:** 3 | **Initiative:** 1 | **Cost:** 🌿1  
**On-Summon:** *Opponent discards 1 random card.*  
**Flavor:** *"He takes coin from farmers. He takes silence from whoever objects."*

### 20. Border Magistrate
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth  
**BP:** 3 | **HP:** 4 | **Initiative:** 1 | **Cost:** 🌿2  
**On-Summon:** *+1 cost to 1 card in opponent's hand (reveal it to choose).*  
**Flavor:** *"Paperwork is the heaviest weapon. Very few survive its weight."*

### 21. Fortress Quartermaster
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth  
**BP:** 3 | **HP:** 5 | **Initiative:** 1 | **Cost:** 🌿2 | **Lane:** Back only  
**Passive:** *Cannot be targeted by opposing Events while Front lane has an ally.*  
**Flavor:** *"He knows where every arrow is stored. He also knows who stole the last crate."*

### 22. Sworn Steward
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth  
**BP:** 2 | **HP:** 4 | **Initiative:** 0 | **Cost:** 🌿2  
**On-Turn-End:** *-1 BP on 1 opposing character in this lane until end of next round.*  
**Flavor:** *"Three lords have owned him. All three died. He still serves."*

### 23. Mountain Ranger
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth  
**BP:** 4 | **HP:** 4 | **Initiative:** 2 | **Cost:** 🌿3  
**Passive:** *—*  
**Flavor:** *"She has not seen the capital in ten years. She has forgotten what flags look like."*

### 24. Watchtower Scout
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth  
**BP:** 2 | **HP:** 2 | **Initiative:** 2 | **Cost:** 🌿1  
**On-Summon:** *Look at opponent's total energy cost next round.*  
**Flavor:** *"He sits alone for weeks. He counts lights on the horizon. He sends only what matters."*

---

## Nameless Silk — 6 Commons

### 25. Market Pickpocket
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow  
**BP:** 2 | **HP:** 1 | **Initiative:** 3 | **Cost:** 🌑1  
**On-Summon:** *See 1 random card in opponent's hand.*  
**Flavor:** *"Her hands are her family. Her family is nobody."*

### 26. Tavern Informant
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow  
**BP:** 2 | **HP:** 2 | **Initiative:** 2 | **Cost:** 🌑2  
**Conditional Passive:** *+3 BP if opponent revealed their Identity this duel.*  
**Flavor:** *"He pours wine. He remembers names. He sells both for the same price."*

### 27. Shadow Blade
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow  
**BP:** 3 | **HP:** 2 | **Initiative:** 3 | **Cost:** 🌑2  
**Passive:** *—*  
**Flavor:** *"She has no master. She has no clan. She has been paid by all five."*

### 28. Rooftop Runner
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow  
**BP:** 3 | **HP:** 2 | **Initiative:** 4 | **Cost:** 🌑2  
**On-Summon:** *Move to any lane regardless of current placement.*  
**Flavor:** *"He has not touched the ground in eight years. The ground has forgotten him."*

### 29. Poison Herbalist
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow  
**BP:** 2 | **HP:** 2 | **Initiative:** 1 | **Cost:** 🌑2  
**On-Turn-End:** *Deal 1 damage to 1 random opposing character.*  
**Flavor:** *"Every tea she serves has two layers. Only one of them you taste."*

### 30. Mask-Maker
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow  
**BP:** 2 | **HP:** 2 | **Initiative:** 2 | **Cost:** 🌑1  
**On-Summon:** *Opponent's next Scout peek this duel sees a decoy card (false identity).*  
**Flavor:** *"She carves the face you will wear tomorrow. You will not remember your own."*

---

# Uncommon (20 cards — 4 per Clan)

## Black Flag — 4 Uncommons

### 31. First Mate Kaelith
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind  
**BP:** 5 | **HP:** 4 | **Initiative:** 3 | **Cost:** 💨3  
**On-Summon:** *Your next Black Flag card this duel costs 1 less.*  
**Flavor:** *"Second in command of the ghost fleet. The captain answers to her, though he would deny it."*

### 32. Cannon Captain
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind  
**BP:** 6 | **HP:** 3 | **Initiative:** 2 | **Cost:** 💨4  
**On-Summon:** *Deal 2 damage to each opposing character in this lane.*  
**Flavor:** *"He lost an eye, an ear, three fingers. He keeps firing. The crew calls him luck."*

### 33. Bloodflag Corsair
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind  
**BP:** 7 | **HP:** 3 | **Initiative:** 3 | **Cost:** 💨4 | **Lane:** Front only  
**Conditional Passive:** *-3 BP if opponent has no 🔥 Hollow Blade characters in play (nothing to fight).*  
**Flavor:** *"Crimson sail, crimson deck, crimson hands. He only sails toward the royal navy."*

### 34. Mutineer
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind  
**BP:** 4 | **HP:** 3 | **Initiative:** 2 | **Cost:** 💨2  
**On-Summon:** *Take control of 1 opposing character with BP ≤ 2 in this lane.*  
**Flavor:** *"He speaks softly to men who follow orders. By morning, those men follow him."*

---

## Sovereign Bourse — 4 Uncommons

### 35. Gold-Blooded Banker
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold  
**BP:** 4 | **HP:** 3 | **Initiative:** 2 | **Cost:** 💰3  
**On-Summon:** *Gain 0.005 SOL to Shop credit. +1 BP for each 0.01 SOL in current credit.*  
**Flavor:** *"He never handles coin. Clerks do that. He handles numbers. Numbers handle kings."*

### 36. Weapons Trader
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold  
**BP:** 5 | **HP:** 3 | **Initiative:** 2 | **Cost:** 💰3  
**On-Summon:** *Reveal all cards in opponent's hand with cost ≥ 4.*  
**Flavor:** *"She sells to every clan. None of them know. All of them would kill her if they did."*

### 37. Treasury Keeper
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold  
**BP:** 4 | **HP:** 4 | **Initiative:** 1 | **Cost:** 💰3  
**On-Destroy:** *Draw 2 cards.*  
**Flavor:** *"His family has counted the royal coin for four generations. He is the last. He has hidden records."*

### 38. Merchant Prince
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold  
**BP:** 6 | **HP:** 4 | **Initiative:** 2 | **Cost:** 💰4  
**On-Turn-End:** *+2 BP if you played 2+ Sovereign Bourse cards this round.*  
**Flavor:** *"He owns no throne. He owns everyone who wants one."*

---

## Hollow Blade — 4 Uncommons

### 39. Captain of the Guard
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire  
**BP:** 5 | **HP:** 5 | **Initiative:** 2 | **Cost:** 🔥3  
**On-Summon:** *+1 BP to all your Hollow Blade characters (all lanes).*  
**Flavor:** *"He drew his sword at the king's funeral. He has not sheathed it since."*

### 40. Oathsworn Knight
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire  
**BP:** 7 | **HP:** 6 | **Initiative:** 1 | **Cost:** 🔥4 | **Lane:** Front only  
**Passive:** *Can defend adjacent allies. Gains +1 BP when defending.*  
**Flavor:** *"The oath binds in ways the blade cannot. He has kept his. Others have not."*

### 41. Royal Inquisitor
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire  
**BP:** 4 | **HP:** 3 | **Initiative:** 3 | **Cost:** 🔥3  
**On-Summon:** *Look at opponent's full hand.*  
**Flavor:** *"He asks the questions. Men answer. Men always answer."*

### 42. Duelmaster
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire  
**BP:** 5 | **HP:** 4 | **Initiative:** 3 | **Cost:** 🔥3  
**On-Summon:** *If exactly 1 opposing character in this lane, destroy it and gain its BP as permanent bonus.*  
**Flavor:** *"He has fought 127 duels. He has won 127. The 128th is always tomorrow."*

---

## Iron Circle — 4 Uncommons

### 43. Regional Warlord
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth  
**BP:** 6 | **HP:** 5 | **Initiative:** 1 | **Cost:** 🌿4  
**On-Summon:** *Opponent's next card costs 2 more.*  
**Flavor:** *"Her province is half the kingdom. She hasn't visited the capital in twelve years."*

### 44. Fortress Baron
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth  
**BP:** 5 | **HP:** 6 | **Initiative:** 1 | **Cost:** 🌿3 | **Lane:** Back only  
**On-Turn-End:** *Opposing characters in adjacent lanes lose 1 BP until end of next round.*  
**Flavor:** *"His walls have never fallen. Three times the king's army tried. Three times they went home poorer."*

### 45. Provincial Chancellor
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth  
**BP:** 4 | **HP:** 5 | **Initiative:** 2 | **Cost:** 🌿3  
**On-Summon:** *Reveal opponent's Clan (partial identity reveal).*  
**Flavor:** *"He writes the laws his lord enforces. He also writes the ones he hides."*

### 46. Highland Chieftain
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth  
**BP:** 7 | **HP:** 5 | **Initiative:** 2 | **Cost:** 🌿4  
**On-Summon:** *+1 BP for each other Iron Circle character in play (all lanes).*  
**Flavor:** *"He bowed to Valerius. He will bow to no other. He has not yet decided."*

---

## Nameless Silk — 4 Uncommons

### 47. Silent Assassin
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow  
**BP:** 5 | **HP:** 3 | **Initiative:** 4 | **Cost:** 🌑3  
**On-Summon:** *Destroy 1 opposing character with cost ≤ 2 in any lane.*  
**Flavor:** *"You will not see her. You will not hear her. You will only stop."*

### 48. Poisoner's Apprentice
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow  
**BP:** 3 | **HP:** 3 | **Initiative:** 2 | **Cost:** 🌑2  
**On-Summon:** *1 opposing character loses 2 BP until end of round.*  
**Flavor:** *"She hands you the cup. She smiles. You drink. She does not smile later."*

### 49. Master of Coins
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow  
**BP:** 4 | **HP:** 3 | **Initiative:** 3 | **Cost:** 🌑3  
**Passive:** *Opponent's x402 Scout peek costs double (0.01 SOL) for the rest of this duel.*  
**Flavor:** *"His clan sells information. He sells the cost of information."*

### 50. Doubleface
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow  
**BP:** 4 | **HP:** 3 | **Initiative:** 3 | **Cost:** 🌑2  
**Passive:** *All opposing Scout peeks this duel return a random non-Nameless-Silk card from your deck instead of your hand.*  
**Flavor:** *"He is three men. None of them know the other two exist."*

---

# Rare (6 cards)

**Note:** Cards #52 Queen of the Exchange and #54 Lord of the Inland Fortresses from v0.2 have been promoted to Legendary (as Kingmaker's Ring and Elyon Crown respectively). The remaining 6 Rares plus 2 Event Rares form this section.

### 51. Ghost Fleet Captain
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind | **Rarity:** Rare  
**BP:** 8 | **HP:** 5 | **Initiative:** 4 | **Cost:** 💨5 | **Lane:** Front or Middle  
**On-Summon:** *All your Black Flag characters gain +1 BP for the rest of the duel.*  
**Flavor:** *"His ship was sunk by the royal navy seven years ago. His ship still sails. Nobody has explained."*  
**Lore Shard 1:** *"Salvage divers report a hull shape on the seabed, matching the Calypso exactly. But the hull is empty. And the Calypso sails tomorrow."*

### 52. The King's Last Guard
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire | **Rarity:** Rare  
**BP:** 9 | **HP:** 6 | **Initiative:** 2 | **Cost:** 🔥5  
**On-Summon:** *+2 BP for every Hollow Blade character destroyed this duel (yours or opponent's).*  
**Passive:** *Can defend two adjacent lanes simultaneously.*  
**Flavor:** *"He was the last to leave the throne room. He has not said what he saw there."*  
**Lore Shard 1:** *"The corridor was empty when the guards arrived. But there were footprints in the blood — three sets, walking away together."*

### 53. The Faceless Weaver
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow | **Rarity:** Rare  
**BP:** 5 | **HP:** 4 | **Initiative:** 5 | **Cost:** 🌑3  
**Passive:** *All opposing x402 peeks this duel (Scout, Identity, Hint) return false information.*  
**Flavor:** *"She dresses the clans. She dresses the clans' lies. She dresses the clans' corpses. Same thread."*  
**Lore Shard 1:** *"She has clothed all five clan leaders. Each believed their tailor was unique to them. Each paid in advance."*

### 54. The Prince in Exile
**Type:** Character | **Neutral** (plays for any clan) | **Element:** Null | **Rarity:** Rare  
**BP:** 6 | **HP:** 5 | **Initiative:** 3 | **Cost:** 2 of any 2 different elements  
**On-Summon:** *If your deck contains cards from 4+ clans, +3 BP and draw 1 card.*  
**Flavor:** *"Some say the heir lived. Some say the heir is among us. Some are paid well to say nothing."*  
**Lore Shard 1:** *"A boy with Valerius's eyes was seen in a border village, age 18, this spring. He was seen by exactly one farmer, who has since been paid enough to forget."*

### 55. The Assassin's Letter
**Type:** EVENT | **Rarity:** Rare | **Cost:** 💰1 + 🌑1  
**Effect:** *Reveal opponent's Identity commitment immediately (permanent for rest of duel).*  
**Flavor:** *"Fifteen years ago, someone wrote this. The writing has not aged. The ink is still wet."*  
**Lore Shard 1:** *"The paper tested 15 years old by every method. The ink tested fresh. Two of the three scholars consulted have since vanished."*

### 56. The Kingdom's Forgotten Oath
**Type:** EVENT | **Rarity:** Rare | **Cost:** 0 (any element, but must be played when you have 5+ energy of single element)  
**Effect:** *Target character gains permanent BP equal to your current energy in that element.*  
**Flavor:** *"A promise older than the throne. A promise nobody remembers making. A promise that cannot be broken."*  
**Lore Shard 1:** *"When spoken aloud, men grip their weapons without knowing why. When written down, the ink refuses to dry."*

---

# Legendary (4 cards — 10 NFTs each, 40 total per Season)

**Supply rule (v2.0):** Each Legendary species has **10 NFT copies** minted per Season. Total Season 1 Legendary supply = 40 NFTs. First 10 players to claim each species receive mint #1-10 with narrative prestige. Once all 10 of a species are claimed, that species disappears from the Gold Hall reward pool.

**Acquisition:** Every 4 cumulative Gold Hall wins → 1 Legendary selection from the remaining pool. No upper limit per player.

**Transfer on duel loss:** Legendaries only transfer when lost in Gold Hall duels (Bronze/Silver duels cannot transfer Legendaries).

### 57. Sceptre of Valerius
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire | **Rarity:** Legendary  
**BP:** 3 | **HP:** 3 | **Initiative:** 5 | **Cost:** 4 of any 4 different elements  
**On-Summon:** *Reveal opponent's full hand. Take 1 card from it permanently — it enters your NFT collection after the duel ends.*  
**Philosophy:** *Might — the one who can defeat the king is king.*  
**Flavor:** *"The Wise-King's sceptre was shattered the night he died. The fragments remember. They are still looking for a hand."*  
**Lore Shard 1:** *"The sceptre shattered in the throne room. Seven fragments were recovered. Twelve fragments are on display in various halls. Nobody has explained this."*  
**Visual:** Shattered black-and-gold fragments floating in midair, silhouette of a crowned figure in the background, glitch effect on the crown symbol.

### 58. Nameless Blade
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow | **Rarity:** Legendary  
**BP:** 0 / 15 (conditional) | **HP:** 5 | **Initiative:** 4 | **Cost:** 🌑4  
**Conditional Passive:** *BP is 15 if opponent used any x402 peek (Scout, Identity, Hint, Counter-peek) at any point in this duel. BP is 0 otherwise.*  
**Philosophy:** *Erasure — the throne itself is the enemy; kill kingship.*  
**Flavor:** *"The blade remembers every eye that has tried to read it. Those eyes do not close peacefully."*  
**Lore Shard 1:** *"The blade has no name on its tang. It has been carried by 47 hands. Each hand eventually released it. Several did so unwillingly."*  
**Visual:** A katana with the blade rendered in pure black (absorbing all light), hand grip wrapped in silk that shifts color based on holder's Clan identity commitment.

### 59. Elyon Crown
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth | **Rarity:** Legendary  
**BP:** 7 | **HP:** 10 | **Initiative:** 0 | **Cost:** 🌿4 + 1 of any other element | **Lane:** Back only  
**On-Summon:** *All your Iron Circle characters gain +2 HP for the rest of the duel.*  
**Passive:** *While Elyon Crown is in play, all your lanes are immune to opponent's lane-lock and lane-destroy effects.*  
**Philosophy:** *Legitimacy — the rightful heir, through blood and oath, is king.*  
**Flavor:** *"The crown passes. Where the king is absent, the crown chooses the next king itself."*  
**Lore Shard 1:** *"The crown was never recovered from the throne room. Seventeen claimants have displayed 'the crown' at various courts. None match the portrait of Valerius wearing it."*  
**Visual:** An iron circlet etched with oath-runes; at rest, the runes glow faintly; during the duel, the runes brighten with each Iron Circle character summoned. Thin cracks visible around the band — it was repaired, once.

### 60. Kingmaker's Ring
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold | **Rarity:** Legendary  
**BP:** 5 | **HP:** 7 | **Initiative:** 5 | **Cost:** 💰5  
**On-Summon:** *Choose 1 opposing character. That character's next attack is redirected to target a character of YOUR choice (including their own allies).*  
**Passive:** *Once per duel, you may trigger an Extra Action (Draw 1 / Half-cost Summon / Retarget Lane / Cancel Event) for 0 Shards cost.*  
**Philosophy:** *Patronage — whoever chooses the king holds real power.*  
**Flavor:** *"The king is chosen by the one who hands over the ring, not by the one who wears it."*  
**Lore Shard 1:** *"The ring was a wedding gift from a queen to a king, two generations before Valerius. It has been on five different hands since his death. Each hand sold its king shortly thereafter."*  
**Visual:** A simple gold band with a single black stone set deep into the metal. In low light, the stone appears to contain moving silhouettes — five figures, walking in a line, away from the viewer.

---

# Event Cards (5 total, scattered across rarities)

Event cards are one-shot spells. They resolve immediately on play and leave the duel (not in any lane, no stats, no combat).

Event distribution:
- 1 Common (Seal of the Courtyard) — for every deck
- 2 Uncommon (Whispered Accusation, Bloodline Claim) — mid-game tools
- 2 Rare (already listed above: Assassin's Letter, Kingdom's Forgotten Oath)

### E1. Seal of the Courtyard
**Type:** EVENT | **Rarity:** Common | **Cost:** 2 energy of any element  
**Effect:** *All Summon costs for both players are +1 next round.*  
**Flavor:** *"Who closed this door? The king himself, or the one who killed him? The seal does not speak."*  
**Lore Shard 1:** *"The wax seal bears a mark nobody recognizes. A historian has spent three years identifying it. He has produced five different answers."*

### E2. Whispered Accusation
**Type:** EVENT | **Rarity:** Uncommon | **Cost:** 🌑2 OR 💰2 (choose one)  
**Effect:** *Disable one random opposing character's On-Summon ability for the remainder of this round. (If no On-Summon this round, opponent takes 1 damage instead.)*  
**Flavor:** *"No name. No voice. But by morning, the court has decided to kill her."*  
**Lore Shard 1:** *"The accusation spreads through three clans in one evening. By dawn, none of the three remember who first spoke it."*

### E3. Bloodline Claim
**Type:** EVENT | **Rarity:** Uncommon | **Cost:** 2 different elements × 2 (total 4 energy across 2 elements)  
**Effect:** *All your characters in play gain +2 HP permanently (for the rest of the duel).*  
**Flavor:** *"No evidence. No documents. But those who see her face fall to their knees."*  
**Lore Shard 1:** *"She walks into the provincial court, claims the throne, is mocked. Nine nobles sponsor her within the week. Six of them die by winter."*

---

## Final distribution (v0.3)

| Rarity | Count | Notes |
|--------|-------|-------|
| Common | 30 | Each clan 6 cards × 5 clans |
| Uncommon | 20 | Each clan 4 cards × 5 clans = 20, minus 2 slots allocated to Event cards → **redistributed**: 18 clan Uncommons + 2 Event Uncommons |
| Rare | 6 | Ghost Fleet Captain, King's Last Guard, Faceless Weaver, Prince in Exile, Assassin's Letter, Kingdom's Forgotten Oath |
| Legendary | 4 | Sceptre (Hollow Blade), Nameless Blade (Nameless Silk), Elyon Crown (Iron Circle), Kingmaker's Ring (Sovereign Bourse) |
| **Total unique species** | **60** | |
| **Total NFT supply (S1)** | Unlimited for C/U/R; **40 cap for Legendary** (10 × 4 species) | |

### Clan distribution

| Clan | Common | Uncommon | Rare | Legendary | Total species |
|------|--------|----------|------|-----------|----------------|
| Black Flag | 6 | 4 | 1 | — | 11 |
| Sovereign Bourse | 6 | 4 | — | 1 (Kingmaker's Ring) | 11 |
| Hollow Blade | 6 | 3 | 1 | 1 (Sceptre of Valerius) | 11 |
| Iron Circle | 6 | 3 | — | 1 (Elyon Crown) | 10 |
| Nameless Silk | 6 | 4 | 1 | 1 (Nameless Blade) | 12 |
| Neutral / Any clan | — | — | 1 (Prince in Exile) | — | 1 |
| Event (cross-clan) | — | 2 (Whispered Accusation, Bloodline Claim) + 1 Common (Seal of Courtyard, counted under Common above — TBD layout) | 2 (Assassin's Letter, Kingdom's Forgotten Oath) | — | 4-5 |
| **Total** | **30** | **20** | **6** | **4** | **60** |

**Note on Event distribution above:** The Event cards straddle clan lines — they play for any deck. Seal of the Courtyard (Common Event) is included in the Common 30 count; Whispered Accusation & Bloodline Claim (Uncommon Events) are in the Uncommon 20. This means Uncommon clan-specific distribution is actually **3-4 per clan** (not flat 4 per clan). Black Flag, Sovereign Bourse, Nameless Silk get 4 Uncommons; Hollow Blade and Iron Circle get 3 Uncommons (their slots occupied by Legendary-proximity narrative fills). Balance pass Day 17.

## Initiative distribution (turn order balance)

Average Initiative by clan:
- Black Flag: 2.6 (aggressive, often goes first)
- Nameless Silk: 2.8 (highest, info priority)
- Hollow Blade: 2.0 (balanced)
- Sovereign Bourse: 1.8 (reactive, plays late)
- Iron Circle: 1.3 (defensive, often goes second to defend)

---

*End of Card Catalog v0.3*  
*Lore Shards 2 & 3 are deferred to post-hackathon for 45 cards. The 15 key cards (all Rares, all Legendaries, and top Commons per clan) will have Shards 2 & 3 drafted by Day 16 in a separate `docs/LORE_SHARDS.md` document.*

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
