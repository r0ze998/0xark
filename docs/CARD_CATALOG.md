# 0xARK Season 1 — Card Catalog v0.4

**Theme:** The Succession War of the Lost Kingdom of Elyon
**Total cards:** 60 (30 Common / 20 Uncommon / 6 Rare / 4 Legendary)
**Status:** Final — 2026-04-23, CC 実装依頼書 C1 の根拠文献
**Rules basis:** GDD v3.0-plus (NFT-native abilities: Burn / Evolve / Steal Lease-default / Imprint +1 BP cap)
**Supersedes:** Card Catalog v0.3 (2026-04-22)

---

## 🆕 Changes from v0.3

### 1. 12 cards replaced (v3.0-plus NFT-native abilities)
各 Clan 2 枚ずつ差し替え、rarity 分布 (30C/20U/6R/4L) 維持:

| Old # | Old Name | → | New Name | Ability Type |
|---|---|---|---|---|
| 1 | Sea Rat | → | **Powder-Charge Boarder** | Self-Burn |
| 5 | Powder Monkey | → | **Flare Saboteur** | Hand-Burn (on destroy) |
| 7 | Copper Clerk | → | **Novice Minter** | Evolve support |
| 8 | Spice Broker | → | **Coin Reforger** | Clan Evolve |
| 13 | Guard Recruit | → | **Oath-Branded Squire** | Veteran Imprint |
| 16 | Royal Courier | → | **Herald of Ashes** | Burn-counter scaler |
| 23 | Mountain Ranger | → | **Ancestral Ranger** | Imprint self-scale |
| 24 | Watchtower Scout | → | **Lineage Scout** | Owner-history scale |
| 25 | Market Pickpocket | → | **Shadow Lifter** | Ransom-Steal |
| 27 | Shadow Blade | → | **Soul-Binder** | On-Destroy Imprint |
| 35 | Gold-Blooded Banker | → | **Mint Master** | Clan Evolve + Imprint |
| 48 | Poisoner's Apprentice | → | **Soul-Thief** | Battle-Steal (Lease default) |

### 2. Day 23 Balance Patch (5 changes, #7 Copper Clerk は v3.0-plus 置換で skip)
- **#57 Sceptre of Valerius**: BP 3 → **5**, HP 3 → **5** (Legendary 感強化)
- **#40 Oathsworn Knight**: BP 7 → **6** (z-score +2.05 の OP 是正)
- **#46 Highland Chieftain**: BP 7 → **6** (z-score +1.88 の OP 是正)
- **#48 Poisoner's Apprentice**: v3.0-plus で Soul-Thief に置換、patch は不要

### 3. v3.0-plus Steal/Imprint 制約 (Manus + Gemini 反映)
- **Steal default 化**: 全 Steal が Lease (3 duel 返却)、Gold Hall Legendary のみ永久
- **Imprint +1 BP 上限**: 累積不可、Competitive Gold mode で無効化 option
- **Cosmetic Imprint 追加**: Stats に影響しない視覚 Imprint (Elder Frame, Kingslayer Crest 等)

### 4. Clan Functional Identity 公式化
- **Black Flag = Pillager** (略奪者): Self-Burn, Hand-Burn, Ransom-Steal
- **Sovereign Bourse = Alchemist** (錬金術士): Clan Evolve, Chaos Evolve, Mint
- **Hollow Blade = Burner** (焼却者): Target-Burn, Burn-counter scaling
- **Iron Circle = Archivist** (記録官): Imprint-scaling, Lineage
- **Nameless Silk = Soul Taker** (魂奪者): Battle-Steal, Legendary Steal

### 5. Burn-safe guarantee 明示
- **Legendary は Burn 対象外、永久保護**
- **Rare は conditional Burn のみ** (現状 v3.0-plus では実質対象外)
- **Common / Uncommon のみ Burn 可能** = 流動通貨として機能

---

## Season 1 narrative compass (v0.3 から継承)

Fifteen years ago, Wise-King Valerius of Elyon was assassinated in his own throne room. The heir was an infant prince who vanished that same night. The kingdom fractured. Five clans each proclaimed themselves the true successor.

Fifteen years of cold war. Public smiles at the royal funeral, private daggers in the dark. Poison, blackmail, forged documents, quiet bodies in the river.

Now, the **Sixty Tokens of the King** — ancient seals scattered by Valerius himself before his death — have begun to surface. Whoever gathers all sixty holds the kingdom's true legitimacy.

Among the 60, **four Legendary relics** anchor the narrative: the Sceptre, the Blade, the Crown, the Ring. Each represents a different philosophy of kingship held by a different clan.

The race has begun.

---

## The Four Legendaries of Season 1

| Legendary | Clan | Philosophy | Meaning |
|-----------|------|-----------|---------|
| **Sceptre of Valerius** | Hollow Blade | *Might* | The one who can defeat the king is king |
| **Nameless Blade** | Nameless Silk | *Erasure* | The throne itself is the enemy; kill kingship |
| **Elyon Crown** | Iron Circle | *Legitimacy* | The rightful heir, through blood and oath, is king |
| **Kingmaker's Ring** | Sovereign Bourse | *Patronage* | Whoever chooses the king holds real power |

Black Flag has no Legendary — pirates do not seek thrones. Their rejection of the succession drama is itself a statement.

---

## Five Clans & Their Elements

| Clan | Japanese | Element | Functional Role | Play style |
|------|----------|---------|-----------------|------------|
| **Black Flag** | 黒旗 | 💨 Wind | **Pillager** 略奪者 | Self-Burn aggro + Hand-Burn pressure |
| **Sovereign Bourse** | 主権市場 | 💰 Gold | **Alchemist** 錬金術士 | Evolve economy + Ash credit |
| **Hollow Blade** | 空の刃 | 🔥 Fire | **Burner** 焼却者 | Burn scaling + fire direct damage |
| **Iron Circle** | 鉄環 | 🌿 Earth | **Archivist** 記録官 | Imprint accumulation + defense |
| **Nameless Silk** | 無名の絹 | 🌑 Shadow | **Soul Taker** 魂奪者 | Battle-Steal + info warfare |

### Element affinity wheel (変更なし)

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

- **CHARACTER**: Has BP/HP/Initiative/Element, occupies a lane, can attack/defend
- **ENERGY**: Produces 1 element energy per round, no combat stats
- **EVENT**: One-shot spell, resolves immediately, no stats, no lane

---

# Common (30 cards — 6 per Clan)

## Black Flag — 6 Commons

### 1. Powder-Charge Boarder 🆕
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind
**BP:** 3 | **HP:** 2 | **Initiative:** 3 | **Cost:** 💨2 | **Lane:** Front only
**On-Summon:** *Burn 1 Common from your hand.*
**On-Burn-Success:** *This card gains +3 BP for the rest of this duel.*
**Flavor:** *"彼女は火薬樽を抱えて飛び込む。帰ってくる予定はない。"*
**Lore Shard 1:** *"She was last seen climbing onto the enemy deck with a burning match in her teeth. The enemy ship sank. No trace of her remained."*

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

### 5. Flare Saboteur 🆕
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind
**BP:** 2 | **HP:** 2 | **Initiative:** 2 | **Cost:** 💨1 | **Lane:** Front only
**On-Destroy:** *Burn 1 random Common from opponent's hand.*
**Flavor:** *"He is only useful by dying. He knows this, and accepts it."*
**Lore Shard 1:** *"He carried a single flare into the munitions hold. The raiders found the ship was empty. Then the hold detonated."*

### 6. Reef Pilot
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind
**BP:** 4 | **HP:** 3 | **Initiative:** 1 | **Cost:** 💨3
**Passive:** *—*
**Flavor:** *"No map shows these waters. The maps are in her head. She will not share."*

---

## Sovereign Bourse — 6 Commons

### 7. Novice Minter 🆕
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold
**BP:** 1 | **HP:** 3 | **Initiative:** 0 | **Cost:** 💰1
**Passive:** *Reduce Evolve cost by 1 energy when you trigger Evolve (minimum 0).*
**On-Summon:** *Gain 0.003 SOL to Shop credit (redeemable after duel).*
**Flavor:** *"初めて鋳造したコインを今も首に下げている。それが彼の年季証書である。"*
**Lore Shard 1:** *"Every coin he strikes bears a flaw only he can find. It is his signature. The treasury has never noticed."*

### 8. Coin Reforger 🆕
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold
**BP:** 2 | **HP:** 3 | **Initiative:** 1 | **Cost:** 💰2
**On-Summon:** *Sacrifice 1 of your Common cards (in play or from hand). Add 1 random Sovereign Bourse Uncommon to your hand.*
**Flavor:** *"古いコインは一度熔けて、新しい姿で戻ってくる。彼の金床はそれを覚えている。"*
**Lore Shard 1:** *"He melts down old currency under moonlight. The new coins carry faint ghosts of faces — kings who no longer rule."*

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

### 13. Oath-Branded Squire 🆕
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire
**BP:** 3 | **HP:** 3 | **Initiative:** 1 | **Cost:** 🔥2
**Passive (Imprint trigger):** *When this specific NFT is destroyed for the 5th cumulative time (tracked on-chain), permanently imprint +1 BP (Veteran Imprint, stat).*
**Flavor:** *"彼が戦場で死ぬたび、金属片が剣柄に刻まれる。五つ刻まれると、もう騎士である。"*
**Lore Shard 1:** *"The guard master adds a notch to his sword each time he falls. After five notches, the oath is complete. After ten, he outranks the master."*

### 14. Palace Sentinel
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire
**BP:** 4 | **HP:** 4 | **Initiative:** 1 | **Cost:** 🔥3 | **Lane:** Front or Middle
**Passive (Defender):** *Can defend (takes first hit in adjacent lanes).*
**Flavor:** *"He stood at the throne room door the night the king died. He has not slept since."*

### 15. Sword Instructor
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire
**BP:** 2 | **HP:** 3 | **Initiative:** 2 | **Cost:** 🔥2
**On-Summon:** *+1 BP to all your Hollow Blade characters in play.*
**Flavor:** *"Three thousand students. Six still living. Two still loyal."*

### 16. Herald of Ashes 🆕
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire
**BP:** 2 | **HP:** 2 | **Initiative:** 3 | **Cost:** 🔥1
**On-Summon:** *+1 BP for each Burn that has triggered this duel (either player, any card).*
**Flavor:** *"彼は焼け跡から現れる。彼の存在自体が、何かが燃えた証拠である。"*
**Lore Shard 1:** *"No one sees him arrive. He is always standing among the embers, as if he had been there first."*

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

### 23. Ancestral Ranger 🆕
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth
**BP:** 3 | **HP:** 4 | **Initiative:** 2 | **Cost:** 🌿3
**Passive (Imprint self-scale):** *Gain +1 BP for each permanent Stat Imprint on this specific NFT (maximum +3, since stat imprints cap at 3 per Common).*
**Flavor:** *"彼の剣には刻みが多い。剣が彼を覚えるのと同じだけ、彼も剣を覚える。"*
**Lore Shard 1:** *"The ranger carries a blade older than his grandfather. Each generation has added a mark. The blade no longer has room for more."*

### 24. Lineage Scout 🆕
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth
**BP:** 2 | **HP:** 3 | **Initiative:** 2 | **Cost:** 🌿1
**On-Summon:** *Choose 1 card you control. Draw 1 card for each entry in that card's owner_history metadata (max 3 cards drawn).*
**Flavor:** *"彼は古い物に話しかける。古い物は、古いほどよく語る。"*
**Lore Shard 1:** *"The scout does not read maps. She listens to what the maps have heard — the voices of their previous owners, faint but insistent."*

---

## Nameless Silk — 6 Commons

### 25. Shadow Lifter 🆕
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow
**BP:** 2 | **HP:** 2 | **Initiative:** 3 | **Cost:** 🌑1
**On-Destroy (this card):** *See 1 random card in opponent's hand. You may use that card for this duel only.*
**On-Duel-End:** *If you won, 25% chance to permanently steal the seen card (Ransom-Steal).*
**Flavor:** *"彼女は死に際に最後のものを奪う。生きるより、奪うために死ぬ。"*
**Lore Shard 1:** *"She left behind a purse no one remembered giving her. Inside were three rings belonging to three merchants who had never met."*

### 26. Tavern Informant
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow
**BP:** 2 | **HP:** 2 | **Initiative:** 2 | **Cost:** 🌑2
**Conditional Passive:** *+3 BP if opponent revealed their Identity this duel.*
**Flavor:** *"He pours wine. He remembers names. He sells both for the same price."*

### 27. Soul-Binder 🆕
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow
**BP:** 3 | **HP:** 2 | **Initiative:** 3 | **Cost:** 🌑2
**On-Destroy (this card):** *Destroy 1 opposing character (any lane). Record that species to this NFT's "souls_collected" Imprint.*
**Passive (Imprint self-scale):** *+1 BP for every 5 souls collected (max +1, stat cap).*
**Flavor:** *"彼女は殺される瞬間、相手の一部を連れていく。その魂が彼女の血となる。"*
**Lore Shard 1:** *"Her fingers are always cold. Those who have touched her say they felt something being taken, but could not say what."*

### 28. Rooftop Runner
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow
**BP:** 3 | **HP:** 2 | **Initiative:** 4 | **Cost:** 🌑2
**On-Summon:** *Place to any lane regardless of current placement.*
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

# Uncommon (20 cards)

Distribution: Black Flag 4, Sovereign Bourse 4, Hollow Blade 3, Iron Circle 3, Nameless Silk 4, Event 2.

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
**On-Summon:** *Take control of 1 opposing character with BP ≤ 2 in this lane (temporary, until end of duel).*
**Flavor:** *"He speaks softly to men who follow orders. By morning, those men follow him."*

---

## Sovereign Bourse — 4 Uncommons

### 35. Mint Master 🆕
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold
**BP:** 3 | **HP:** 4 | **Initiative:** 2 | **Cost:** 💰3
**On-Summon:** *Evolve: sacrifice 2 of your Common cards in play (same Clan). Mint and summon a specific Uncommon of that Clan (Clan Evolve).*
**Passive (Imprint trigger):** *At end of duel, if this card triggered Evolve 3+ times cumulatively (on-chain), gain +1 BP permanent Imprint (max +1).*
**Flavor:** *"彼の金床は二つの銅貨を一枚の銀に変える。魔法ではない、冶金である。"*
**Lore Shard 1:** *"Two copper coins, one silver. The trade is ancient. But no one else can perform it without wasting half the metal. He never wastes."*

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

## Hollow Blade — 3 Uncommons

### 39. Captain of the Guard
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire
**BP:** 5 | **HP:** 5 | **Initiative:** 2 | **Cost:** 🔥3
**On-Summon:** *+1 BP to all your Hollow Blade characters (all lanes).*
**Flavor:** *"He drew his sword at the king's funeral. He has not sheathed it since."*

### 40. Oathsworn Knight
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire
**BP:** 6 | **HP:** 6 | **Initiative:** 1 | **Cost:** 🔥4 | **Lane:** Front only
**Passive (Defender):** *Can defend adjacent allies. Gains +1 BP when defending.*
**Flavor:** *"The oath binds in ways the blade cannot. He has kept his. Others have not."*
**Day 23 patch:** BP 7 → **6** (Uncommon z-score +2.05 の是正)

### 41. Royal Inquisitor
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire
**BP:** 4 | **HP:** 3 | **Initiative:** 3 | **Cost:** 🔥3
**On-Summon:** *Look at opponent's full hand.*
**Flavor:** *"He asks the questions. Men answer. Men always answer."*

---

## Iron Circle — 3 Uncommons

### 42. Regional Warlord
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth
**BP:** 6 | **HP:** 5 | **Initiative:** 1 | **Cost:** 🌿4
**On-Summon:** *Opponent's next card costs 2 more.*
**Flavor:** *"Her province is half the kingdom. She hasn't visited the capital in twelve years."*

### 43. Fortress Baron
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth
**BP:** 5 | **HP:** 6 | **Initiative:** 1 | **Cost:** 🌿3 | **Lane:** Back only
**On-Turn-End:** *Opposing characters in adjacent lanes lose 1 BP until end of next round.*
**Flavor:** *"His walls have never fallen. Three times the king's army tried. Three times they went home poorer."*

### 44. Highland Chieftain
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth
**BP:** 6 | **HP:** 5 | **Initiative:** 2 | **Cost:** 🌿4
**On-Summon:** *+1 BP for each other Iron Circle character in play (all lanes).*
**Flavor:** *"He bowed to Valerius. He will bow to no other. He has not yet decided."*
**Day 23 patch:** BP 7 → **6** (Uncommon z-score +1.88 の是正)

---

## Nameless Silk — 4 Uncommons

### 45. Silent Assassin
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow
**BP:** 5 | **HP:** 3 | **Initiative:** 4 | **Cost:** 🌑3
**On-Summon:** *Destroy 1 opposing character with cost ≤ 2 in any lane.*
**Flavor:** *"You will not see her. You will not hear her. You will only stop."*

### 46. Soul-Thief 🆕
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow
**BP:** 4 | **HP:** 3 | **Initiative:** 4 | **Cost:** 🌑3
**On-Destroy (this card):** *50% chance to Lease-Steal the opposing highest-BP character (3 duel auto-return). Gold Hall + Legendary kill: 75% chance permanent Steal.*
**Flavor:** *"殺される瞬間、彼は相手の魂の一部を連れていく。取引は双方向である。"*
**Lore Shard 1:** *"The bounty hunter died in a duel with a noble. The noble's prized sword vanished that same night. The sword reappeared three duels later, in the hunter's successor's hand."*

### 47. Master of Coins
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow
**BP:** 4 | **HP:** 3 | **Initiative:** 3 | **Cost:** 🌑3
**Passive:** *Opponent's x402 Scout peek costs double (0.01 SOL) for the rest of this duel.*
**Flavor:** *"His clan sells information. He sells the cost of information."*

### 48. Doubleface
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow
**BP:** 4 | **HP:** 3 | **Initiative:** 3 | **Cost:** 🌑2
**Passive:** *All opposing Scout peeks this duel return a random non-Nameless-Silk card from your deck instead of your hand.*
**Flavor:** *"He is three men. None of them know the other two exist."*

---

## Event Uncommons — 2

### E1. Whispered Accusation
**Type:** EVENT | **Rarity:** Uncommon | **Cost:** 🌑2 OR 💰2 (choose one)
**Effect:** *Disable one random opposing character's On-Summon ability for the remainder of this round. (If no On-Summon this round, opponent takes 1 damage instead.)*
**Flavor:** *"No name. No voice. But by morning, the court has decided to kill her."*

### E2. Bloodline Claim
**Type:** EVENT | **Rarity:** Uncommon | **Cost:** 2 different elements × 2 (total 4 energy across 2 elements)
**Effect:** *All your characters in play gain +2 HP permanently (for the rest of the duel).*
**Flavor:** *"No evidence. No documents. But those who see her face fall to their knees."*

---

# Rare (6 cards)

### 49. Ghost Fleet Captain
**Type:** Character | **Clan:** Black Flag | **Element:** 💨 Wind | **Rarity:** Rare
**BP:** 8 | **HP:** 5 | **Initiative:** 4 | **Cost:** 💨5 | **Lane:** Front or Middle
**On-Summon:** *All your Black Flag characters gain +1 BP for the rest of the duel.*
**Flavor:** *"His ship was sunk by the royal navy seven years ago. His ship still sails. Nobody has explained."*
**Lore Shard 1:** *"Salvage divers report a hull shape on the seabed, matching the Calypso exactly. But the hull is empty. And the Calypso sails tomorrow."*

### 50. The King's Last Guard
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire | **Rarity:** Rare
**BP:** 9 | **HP:** 6 | **Initiative:** 2 | **Cost:** 🔥5
**On-Summon:** *+2 BP for every Hollow Blade character destroyed this duel (yours or opponent's).*
**Passive (Defender):** *Can defend two adjacent lanes simultaneously.*
**Flavor:** *"He was the last to leave the throne room. He has not said what he saw there."*
**Lore Shard 1:** *"The corridor was empty when the guards arrived. But there were footprints in the blood — three sets, walking away together."*

### 51. The Faceless Weaver
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow | **Rarity:** Rare
**BP:** 5 | **HP:** 4 | **Initiative:** 5 | **Cost:** 🌑3
**Passive:** *All opposing x402 peeks this duel (Scout, Identity, Hint) return false information.*
**Flavor:** *"She dresses the clans. She dresses the clans' lies. She dresses the clans' corpses. Same thread."*
**Lore Shard 1:** *"She has clothed all five clan leaders. Each believed their tailor was unique to them. Each paid in advance."*

### 52. The Prince in Exile
**Type:** Character | **Neutral** (plays for any clan) | **Element:** Null | **Rarity:** Rare
**BP:** 6 | **HP:** 5 | **Initiative:** 3 | **Cost:** 2 of any 2 different elements
**On-Summon:** *If your deck contains cards from 4+ clans, +3 BP and draw 1 card.*
**Flavor:** *"Some say the heir lived. Some say the heir is among us. Some are paid well to say nothing."*
**Lore Shard 1:** *"A boy with Valerius's eyes was seen in a border village, age 18, this spring. He was seen by exactly one farmer, who has since been paid enough to forget."*

### 53. The Assassin's Letter
**Type:** EVENT | **Rarity:** Rare | **Cost:** 💰1 + 🌑1
**Effect:** *Reveal opponent's Identity commitment immediately (permanent for rest of duel).*
**Flavor:** *"Fifteen years ago, someone wrote this. The writing has not aged. The ink is still wet."*
**Lore Shard 1:** *"The paper tested 15 years old by every method. The ink tested fresh. Two of the three scholars consulted have since vanished."*

### 54. The Kingdom's Forgotten Oath
**Type:** EVENT | **Rarity:** Rare | **Cost:** 0 (any element, but must be played when you have 5+ energy of single element)
**Effect:** *Target character gains permanent BP equal to your current energy in that element.*
**Flavor:** *"A promise older than the throne. A promise nobody remembers making. A promise that cannot be broken."*
**Lore Shard 1:** *"When spoken aloud, men grip their weapons without knowing why. When written down, the ink refuses to dry."*

---

# Legendary (4 cards — 10 NFTs each, 40 total per Season)

**Supply rule:** Each Legendary species has **10 NFT copies** minted per Season. Total Season 1 Legendary supply = 40 NFTs. First 10 players to claim each species receive mint #1-10 with narrative prestige. Once all 10 of a species are claimed, that species disappears from the Gold Hall reward pool.

**Acquisition:** Every 4 cumulative Gold Hall wins → 1 Legendary selection from the remaining pool. No upper limit per player.

**Transfer on duel loss:** Legendaries only transfer when lost in Gold Hall duels (Bronze/Silver duels cannot transfer Legendaries).

**🛡 Legendary Burn Protection (v3.0-plus 明示):** Legendaries are **NEVER burnable**, regardless of card effects or game states. This is a hard-coded onchain guarantee — the `burn_card` instruction will revert for any Legendary mint. This protection provides the supply floor for 0xARK's NFT economy.

### 55. Sceptre of Valerius
**Type:** Character | **Clan:** Hollow Blade | **Element:** 🔥 Fire | **Rarity:** Legendary
**BP:** 5 | **HP:** 5 | **Initiative:** 5 | **Cost:** 4 of any 4 different elements
**On-Summon:** *Reveal opponent's full hand. **Hand-Peek-Steal** 1 card from it (Gold Hall only: permanent; Bronze/Silver: Lease for 3 duels).*
**Philosophy:** *Might — the one who can defeat the king is king.*
**Flavor:** *"The Wise-King's sceptre was shattered the night he died. The fragments remember. They are still looking for a hand."*
**Lore Shard 1:** *"The sceptre shattered in the throne room. Seven fragments were recovered. Twelve fragments are on display in various halls. Nobody has explained this."*
**Visual:** Shattered black-and-gold fragments floating in midair, silhouette of a crowned figure in the background, glitch effect on the crown symbol.
**Day 23 patch:** BP 3 → **5**, HP 3 → **5** (Legendary feel 強化、pitch 映え)

### 56. Nameless Blade
**Type:** Character | **Clan:** Nameless Silk | **Element:** 🌑 Shadow | **Rarity:** Legendary
**BP:** 0 / 15 (conditional) | **HP:** 5 | **Initiative:** 4 | **Cost:** 🌑4
**Conditional Passive:** *BP is 15 if opponent used any x402 peek (Scout, Identity, Hint, Counter-peek) at any point in this duel. BP is 0 otherwise.*
**Philosophy:** *Erasure — the throne itself is the enemy; kill kingship.*
**Flavor:** *"The blade remembers every eye that has tried to read it. Those eyes do not close peacefully."*
**Lore Shard 1:** *"The blade has no name on its tang. It has been carried by 47 hands. Each hand eventually released it. Several did so unwillingly."*
**Visual:** A katana with the blade rendered in pure black (absorbing all light), hand grip wrapped in silk that shifts color based on holder's Clan identity commitment.

### 57. Elyon Crown
**Type:** Character | **Clan:** Iron Circle | **Element:** 🌿 Earth | **Rarity:** Legendary
**BP:** 7 | **HP:** 10 | **Initiative:** 0 | **Cost:** 🌿4 + 1 of any other element | **Lane:** Back only
**On-Summon:** *All your Iron Circle characters gain +2 HP for the rest of the duel.*
**Passive:** *While Elyon Crown is in play, all your lanes are immune to opponent's lane-lock and lane-destroy effects.*
**Philosophy:** *Legitimacy — the rightful heir, through blood and oath, is king.*
**Flavor:** *"The crown passes. Where the king is absent, the crown chooses the next king itself."*
**Lore Shard 1:** *"The crown was never recovered from the throne room. Seventeen claimants have displayed 'the crown' at various courts. None match the portrait of Valerius wearing it."*
**Visual:** An iron circlet etched with oath-runes; at rest, the runes glow faintly; during the duel, the runes brighten with each Iron Circle character summoned. Thin cracks visible around the band — it was repaired, once.

### 58. Kingmaker's Ring
**Type:** Character | **Clan:** Sovereign Bourse | **Element:** 💰 Gold | **Rarity:** Legendary
**BP:** 5 | **HP:** 7 | **Initiative:** 5 | **Cost:** 💰5
**On-Summon:** *Choose 1 opposing character. That character's next attack is redirected to target a character of YOUR choice (including their own allies).*
**Passive:** *Once per duel, you may trigger an Extra Action (Draw 1 / Half-cost Summon / Retarget Lane / Cancel Event) for 0 Shards cost.*
**Philosophy:** *Patronage — whoever chooses the king holds real power.*
**Flavor:** *"The king is chosen by the one who hands over the ring, not by the one who wears it."*
**Lore Shard 1:** *"The ring was a wedding gift from a queen to a king, two generations before Valerius. It has been on five different hands since his death. Each hand sold its king shortly thereafter."*
**Visual:** A simple gold band with a single black stone set deep into the metal. In low light, the stone appears to contain moving silhouettes — five figures, walking in a line, away from the viewer.

---

# Event Commons — 1

### E3. Seal of the Courtyard
**Type:** EVENT | **Rarity:** Common | **Cost:** 2 energy of any element
**Effect:** *All Summon costs for both players are +1 next round.*
**Flavor:** *"Who closed this door? The king himself, or the one who killed him? The seal does not speak."*
**Lore Shard 1:** *"The wax seal bears a mark nobody recognizes. A historian has spent three years identifying it. He has produced five different answers."*

---

## Final distribution (v0.4)

| Rarity | Count | Characters | Events |
|--------|-------|------------|--------|
| Common | 30 | 29 + 1 Event | Seal of the Courtyard |
| Uncommon | 20 | 18 + 2 Events | Whispered Accusation, Bloodline Claim |
| Rare | 6 | 4 + 2 Events | Assassin's Letter, Kingdom's Forgotten Oath |
| Legendary | 4 | 4 | — |
| **Total** | **60** | **55** | **5** |

### Clan distribution

| Clan | Common | Uncommon | Rare | Legendary | Total species |
|------|--------|----------|------|-----------|----------------|
| Black Flag | 6 | 4 | 1 | — | 11 |
| Sovereign Bourse | 6 | 4 | — | 1 (Kingmaker's Ring) | 11 |
| Hollow Blade | 6 | 3 | 1 | 1 (Sceptre of Valerius) | 11 |
| Iron Circle | 6 | 3 | — | 1 (Elyon Crown) | 10 |
| Nameless Silk | 6 | 4 | 1 | 1 (Nameless Blade) | 12 |
| Neutral / Any clan | — | — | 1 (Prince in Exile) | — | 1 |
| Event (cross-clan) | 1 (Seal) | 2 (Whispered, Bloodline) | 2 (Assassin, Oath) | — | 5 |
| **Total** | **30** | **20** | **6** | **4** | **60** |

### Initiative distribution (turn order balance)

Average Initiative by clan:
- Black Flag: 2.6 (aggressive, often goes first)
- Nameless Silk: 2.8 (highest, info priority)
- Hollow Blade: 2.0 (balanced)
- Sovereign Bourse: 1.8 (reactive, plays late)
- Iron Circle: 1.3 (defensive, often goes second to defend)

---

## v3.0-plus Ability Type Summary

各 ability type が登場するカード一覧:

### 🔥 Burn 系 (6 cards)
- **#1 Powder-Charge Boarder** (Self-Burn hand common)
- **#5 Flare Saboteur** (Hand-Burn on destroy)
- **#16 Herald of Ashes** (Burn counter scaler, passive)
- **#7 Novice Minter** (Evolve = internal Burn 2 枚)
- **#8 Coin Reforger** (Clan Evolve = Burn 2 mint 1)
- **#35 Mint Master** (Uncommon, Clan Evolve + Imprint)

### 🧬 Evolve 系 (3 cards)
- **#7 Novice Minter** (Evolve cost reduction passive)
- **#8 Coin Reforger** (random Uncommon Evolve)
- **#35 Mint Master** (specific Uncommon Evolve)

### 🗡 Steal 系 (3 cards)
- **#25 Shadow Lifter** (Ransom-Steal 25%)
- **#46 Soul-Thief** (Battle Lease-Steal 50%, Gold permanent 75%)
- **#55 Sceptre of Valerius** (Legendary, Hand-Peek-Steal)

### 📜 Imprint 系 (6 cards)
- **#13 Oath-Branded Squire** (Veteran Imprint trigger)
- **#23 Ancestral Ranger** (Imprint self-scale)
- **#24 Lineage Scout** (Owner history scaler)
- **#27 Soul-Binder** (Souls Imprint)
- **#35 Mint Master** (Evolve trigger Imprint)
- **#46 Soul-Thief** (Legendary kill history)

---

## Balance verification (v0.4)

### Power Curve (v3.0-plus 変更反映後の推定)

| Rarity | 旧 v0.3 avg | 新 v0.4 avg | Target range |
|---|---|---|---|
| Common | 6.26 | **~6.9** | 6-8 ✓ |
| Uncommon | 10.76 | **~10.5** | 10-12 ✓ (Highland/Oathsworn patch 反映) |
| Rare | 15.62 | 15.62 | 15-17 ✓ |
| Legendary | 16.25 | **~17.3** | 18+ 🟡 (Sceptre patch で改善) |

**Legendary ギャップ改善**: Sceptre BP/HP +2 で power 13.90 → 17.50、Legendary avg が Rare より +1.68 大きい状態に (以前 +0.62)。なお理想 +3-5 には届かないが、Nameless Blade の conditional 15 BP は統計外 = 実感値では 2-3 の差あり。

### Clan balance (既存 v0.3 から維持)

All 5 Clans ratio 3.13-3.77、±0.3 以内 = 健全。

---

## Implementation Notes for CC (v3.0-plus 実装時の参照)

### On-chain data changes required

1. **`register_card` instruction 実行時の seed data**: 12 枚の新カードを追加、6 枚 (Highland, Oathsworn, Sceptre + 既存 9 枚 Day 23 調整対象外) を update_card_metadata で BP 調整

2. **`CardBattleHistory` PDA 拡張**:
```rust
pub struct CardBattleHistory {
    // 既存 fields (wins, losses, times_destroyed, total_duels)
    ...

    // v3.0-plus 追加
    pub imprints: Vec<Imprint>,          // max 3 for Common, 4 for Rare, 5 for Legendary
    pub owner_history: Vec<Pubkey>,      // FIFO, max 10
    pub burn_count: u32,                 // this card が発動した Burn 回数
    pub souls_collected: u32,            // Soul-Binder 用
    pub legendary_kills: u32,            // Kingslayer Imprint 用
    pub evolved_from: Option<(Pubkey, Pubkey)>, // Evolve 由来なら親
}

pub struct Imprint {
    pub key: String,         // "veteran" / "elder" / "kingslayer" / "lineage" / "burner" / "evolved"
    pub value: i32,          // stat delta (0 if cosmetic)
    pub is_cosmetic: bool,   // Cosmetic Imprint は stats 変更なし
    pub acquired_at: i64,    // unix timestamp
}
```

3. **`SeasonStats` PDA 新規**:
```rust
pub struct SeasonStats {
    pub season_id: u32,
    pub total_minted: u64,
    pub total_burned: u64,
    pub total_evolved: u64,
    pub total_stolen: u64,   // Lease と permanent 両方
    pub total_imprints: u64,
}
```

### Client-side (`02-data.js`) changes required

- 12 cards replaced (new NFT-native ability cards)
- 3 cards stats updated (Sceptre BP/HP, Oathsworn BP, Highland BP)
- New ability handlers in battle engine:
  - `self_burn_common_for_bp_boost`
  - `hand_burn_on_destroy`
  - `burn_count_scaler`
  - `clan_evolve`
  - `evolve_cost_reduction`
  - `ransom_steal`
  - `battle_steal_probability`
  - `hand_peek_steal` (Sceptre 拡張)
  - `imprint_self_scale`
  - `owner_history_scaler`
  - `on_destroy_imprint_souls`
  - `veteran_imprint_trigger`

### Metadata changes (Metaplex)

各カードの metadata JSON に v0.4 の新 stats/ability を反映、Arweave に re-upload。既存 `legendary` instruction (Day 15 実装) の seed data 更新が必要。

---

*End of 0xARK Card Catalog v0.4*

*CC 実装依頼書 (C1) の根拠文献。GDD v3.0-plus と整合、Day 23 Balance Patch 統合済み、Manus + Gemini レビュー反映済み。*
