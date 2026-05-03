// 02-data.js — Phase 16 re-export wrapper
// Aggregates card data and ability handlers for scripts that import from this path.
// Previously referenced by t53-dungeon-exp.js, t61-rarity.js, t74-town-integration.js
// and other legacy test runners.

export {
  CARD_DATA,
  cardById,
  getCard,
  LEGENDARY_IDS,
  ALL_CARD_IDS,
  CARD_ABILITIES,
  MERGE_RECIPES,
  MERGE_ONLY_IDS,
  isBurnable,
  isMergeOnly,
  getMergeRecipe,
} from './lib/cards.js';

export {
  applyBurnEffects,
  applyPassiveAbilities,
  computePostBattleImprints,
} from './lib/abilities.js';
