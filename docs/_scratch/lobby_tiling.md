# Lobby Tilemap — Tile ID Reference

**Source:** `assets/pirates/Default/Tilemap/tilemap_packed.png`
**Tileset:** 17 columns × 8 rows = 136 tiles (IDs 1–136, 1-indexed per Tiled convention)
**Tile size:** 16×16px in source; rendered at 32×32px in game (2× scale)

## Tile ID Assignments

### Ground Layer (base walkable surface)
| Tile ID | Description | Usage in Lobby |
|---------|-------------|----------------|
| 1 | Light sandy ground (open) | Main Square, paths, general walkable |
| 3 | Slightly textured ground | Plaza accent tiles, path center |
| 5 | Dark ground / cobblestone | Building interiors, doorstep |
| 18 | Ocean / deep blue (impassable) | Map border (rows 0-1) |
| 36 | Cliff/rock edge | Top border accent |

### Wall Layer (impassable building footprints)
| Tile ID | Description | Usage in Lobby |
|---------|-------------|----------------|
| 39 | Wooden wall / building horizontal | Building footprints (left/right sides) |
| 40 | Wooden wall / building corner | Building footprint corners |
| 56 | Stone/building wall mid | Faction HQ base |
| 57 | Building wall variant | Building side walls |
| 74 | Building vertical side | Shop/hall sides |

### Decoration Layer (non-blocking visual details)
| Tile ID | Description | Usage in Lobby |
|---------|-------------|----------------|
| 90 | Palm tree / tree top | Border vegetation, plaza corners |
| 91 | Tree trunk | Below tile 90 (tree trunk) |
| 93 | Small bush | Scattered decoration |
| 104 | Flag / banner top | Faction HQ entrance |
| 106 | Banner side | Building facades |
| 110 | Barrel | Shop entrance |
| 117 | Chest / treasure | Gold Hall decoration |

## Layout Summary (25 × 18 tile grid)

```
Row  0-1:  Ocean border (tile 18)
Row  2:    Rocky cliff edge (tile 36/18 mix)
Row  3-5:  FACTION HQ building (x=9-15, wall tiles + decorations)
Row  6-8:  Central path from HQ to Main Square (tile 3)
Row  9-12: MAIN SQUARE — open grass (tile 1), player spawn at x=12,y=10
Row  13:   Horizontal path at bottom of square (tile 3)
Row 14-16: 5 building footprints: SHOP(0-3) PCBOX(5-8) BRONZE(10-13) SILVER(15-18) GOLD(20-23)
Row  17:   Bottom path / border
```

## DECISION log

- Used tile 1 for walkable ground (matches overworld sample's ground tile)
- Used tile 18 for border (ocean tile, acts as hard impassable boundary)
- Used tile 3 for paths (slightly different texture distinguishes paths from open ground)
- Building footprints in walls layer (tile 39) = collision detected by client
- Decoration tiles (90, 91, 93) added at corners for visual interest; no collision
- Gap at x=4 and x=9 between bottom buildings = player paths between buildings
