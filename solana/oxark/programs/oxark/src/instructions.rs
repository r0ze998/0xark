pub mod add_xp;
pub mod agent_hire;
pub mod agent_registry;
pub mod commit_hand;
pub mod delegate_session;
pub mod init_duel;
pub mod initialize;
pub mod lock_deck;
pub mod record_battle_result;
pub mod record_card_owner_change;
pub mod register_card;
pub mod reveal_hand;
pub mod save_deck;
pub mod season;
pub mod season_supply;
pub mod set_title;
pub mod undelegate_session;
pub mod unlock_achievement;
pub mod unlock_lore_shard;
pub mod update_card_battle_history;

pub use add_xp::*;
pub use agent_hire::*;
pub use agent_registry::*;
pub use commit_hand::*;
pub use delegate_session::*;
pub use init_duel::*;
pub use initialize::*;
pub use lock_deck::*;
pub use record_battle_result::*;
pub use record_card_owner_change::*;
pub use register_card::*;
pub use reveal_hand::*;
pub use save_deck::*;
pub use season::*;
pub use season_supply::*;
pub use set_title::*;
pub use undelegate_session::*;
pub use unlock_achievement::*;
pub use unlock_lore_shard::*;
pub use update_card_battle_history::*;
pub mod legendary;
pub use legendary::*;
// v3.0-plus
pub mod burn_card;
// Provenance-gate fix: trustless history settlement + stall-timeout guard.
pub mod claim_timeout_win;
pub mod settle_duel_history;
pub use claim_timeout_win::*;
pub use settle_duel_history::*;

// Energy system (YKK-44 gate / YKK-43 sink): refill_energy + pure regen/spend math.
pub mod refill_energy;
pub use refill_energy::*;

pub mod init_season_stats;
pub mod promote_card;
pub use burn_card::*;
pub use init_season_stats::*;
pub use promote_card::*;
// Phase 15
pub mod check_legendary;
pub mod claim_prize_v2;
pub mod init_game_world;
pub mod register_waitlist;
pub use check_legendary::*;
pub use claim_prize_v2::*;
pub use init_game_world::*;
pub use register_waitlist::*;
// Phase 19
pub mod claim_battle_loot;
pub use claim_battle_loot::*;
// Phase 20-B: Shop
pub mod buy_pack;
pub mod reset_player_state;
pub mod set_waitlist_deadline;
pub mod update_game_params;
pub use buy_pack::*;
pub use reset_player_state::*;
pub use set_waitlist_deadline::*;
pub use update_game_params::*;
// Phase 20-C: Trade Floor
pub mod accept_listing;
pub mod cancel_listing;
pub mod create_listing;
pub use accept_listing::*;
pub use cancel_listing::*;
pub use create_listing::*;
// C5 fix: admin registers on-chain rarity for each NFT card mint
pub mod init_card_mint_record;
pub use init_card_mint_record::*;

// YKK season-end prize settlement (finalize → end → claim).
pub mod activate_season;
pub mod end_season_final;
pub mod finalize_season_tally;
pub use activate_season::*;
pub use end_season_final::*;
pub use finalize_season_tally::*;
