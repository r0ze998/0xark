# Sixty individual card illustrations

The first complete art edition for the current 0xARK six-faction catalog.
Each actual card ID has a distinct 1254×1254 illustration. Every faction contains
five Common, three Uncommon, one Rare and one Legendary image.

Review the full set at `solana/client/card-art.html`. The page can filter faction
and rarity, show the production frame at 140/220/320px, switch to complete artwork,
and open a large illustration with its Japanese visual brief and merge lineage.
It imports no wallet, payment or matchmaking adapter.

## Direction and review

The set retains the Drowned Archive's coastal stone, old brass and storm light,
and the established illustrated character language. The six Legendary portraits
retain their main identities. Other characters vary in age, face, silhouette,
costume, occupation and focal object. Powder Charge, Burning Tome, Schematic and
Colossus also provide object/construct-led compositions.

Merge cards inherit concrete details from both source cards; these are visual
interpretations of existing recipes. Burn-card art uses expended objects rather
than changing game rules. These new scenes are art proposals, not a replacement
for canonical lore. Retired five-clan lore was deliberately excluded.

All sixty images were generated individually with the built-in image generator
and visually inspected. Two Monk images received targeted revisions: excess paper
in Mantra Burner, and an overly similar face in Monk Ascender. Rarity changes
narrative scope and silhouette, not the production quality of the illustration.

## Files and provenance

- `ART_DIRECTION.md` defines shared visual constraints and faction materials.
- `briefs-*.json` contain the sixty original per-card specifications.
- `production-*.json` preserve the exact prompts, references and visual reviews.
- `asset-manifest.json` links every card ID to the published image and its hashes.
- `solana/client/public/img/cards/archive/*.webp` are browser deliverables.

Original generated PNGs are preserved separately. The tracked WebP derivatives
retain the full1254×1254 composition and use quality90 encoding. No crop, retouch,
resizing or compositing is applied during encoding. Regeneration of browser
derivatives uses `node scripts/encode-card-art.mjs` with ImageMagick installed and
the original PNGs locally present; it validates dimensions and publishes atomically.

This edition is available in the separate art-review page. The live game's
`CARD_ART_URLS` remains on its previously approved portraits until an integration
change is made; reviewing artwork does not modify ownership, abilities or stats.
