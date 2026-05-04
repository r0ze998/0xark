use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Game is not in lobby")]
    NotInLobby,
    #[msg("Game is full")]
    GameFull,
    #[msg("Not enough players")]
    NotEnoughPlayers,
    #[msg("Only host can start")]
    NotHost,
    #[msg("Not in commit phase")]
    NotCommitPhase,
    #[msg("Not in reveal phase")]
    NotRevealPhase,
    #[msg("Already committed")]
    AlreadyCommitted,
    #[msg("Already revealed")]
    AlreadyRevealed,
    #[msg("Not committed yet")]
    NotCommitted,
    #[msg("Hash mismatch")]
    HashMismatch,
    #[msg("Invalid action")]
    InvalidAction,
    #[msg("No spells left")]
    NoSpellsLeft,
    #[msg("Cannot target self")]
    CannotTargetSelf,
    #[msg("Card not found in hand")]
    CardNotFound,
    #[msg("Pool is empty")]
    PoolEmpty,
    #[msg("No cards left in area pool to draw")]
    PoolEmptyForArea,
    #[msg("Players must be in the same area")]
    NotInSameArea,
    #[msg("Area ID is out of range")]
    InvalidArea,
    #[msg("Game is already finished")]
    GameFinished,
    #[msg("Round limit reached")]
    RoundLimitReached,
    #[msg("ZK proof is invalid")]
    InvalidProof,
    // ── MagicBlock delegation errors ──────────────────────────────────────
    #[msg("Wrong magic program address")]
    WrongMagicProgram,
    #[msg("Wrong magic context address")]
    WrongMagicContext,
    #[msg("Wrong game account (PDA mismatch)")]
    WrongGameAccount,
    #[msg("Wrong player_state account (PDA mismatch)")]
    WrongPlayerStateAccount,
    #[msg("Wrong delegation program address")]
    WrongDelegationProgram,
    #[msg("Wrong owner program address")]
    WrongOwnerProgram,
    // ── ZK position ───────────────────────────────────────────────────────────
    #[msg("Position commitment already initialized")]
    AlreadyInitialized,
    #[msg("Position commitment mismatch: old_commitment != stored commitment")]
    CommitmentMismatch,
    // ── Agent hire ────────────────────────────────────────────────────────────
    #[msg("Agent is not active")]
    AgentNotActive,
    #[msg("Duration must be > 0 seconds")]
    InvalidDuration,
    // ── Deck system ───────────────────────────────────────────────────────────
    #[msg("Invalid deck composition (cost cap, Legendary ≤2, Rare ≤6, Common ≥12)")]
    InvalidDeckComposition,
    #[msg("Deck is locked — unlock timer has not expired")]
    DeckLocked,
    // ── D4 Reborn: Matchmaking queue ─────────────────────────────────────────
    #[msg("Tier locked — insufficient wins at prerequisite tier")]
    TierLocked,
    #[msg("Player is already in a matchmaking queue")]
    AlreadyInQueue,
    #[msg("Player is not in this queue")]
    NotInQueue,
    #[msg("Matchmaking queue is full (max 64 players)")]
    QueueFull,
    // ── D12: ZK Duel ──────────────────────────────────────────────────────────
    #[msg("Duel ID mismatch")]
    WrongDuel,
    #[msg("Round mismatch")]
    WrongRound,
    #[msg("Caller is not a participant in this duel")]
    NotADuelParticipant,
    #[msg("Hand commitment not set for this round")]
    CommitmentNotSet,
    #[msg("Hand already revealed for this round")]
    HandAlreadyRevealed,
    #[msg("Duel is already over")]
    DuelOver,
    // ── T-D13-A0: DEF-16 ────────────────────────────────────────────────────────
    #[msg("Poseidon hash computation failed (invalid inputs)")]
    PoseidonHashFailed,
    // ── T-D15-B: Legendary / Season ─────────────────────────────────────────────
    #[msg("Invalid state for this operation")]
    InvalidState,
    #[msg("Legendary supply cap reached for this species")]
    LegendaryCapReached,
    #[msg("No pending Legendary claim for this player")]
    NoPendingLegendaryClaim,
    #[msg("Season has not ended")]
    SeasonNotEnded,
    // ── v3.0-plus: Burn / Evolve / Steal / Imprint ───────────────────────────────
    #[msg("Legendary cards are permanently protected from Burn")]
    LegendariesAreProtectedFromBurn,
    #[msg("Rare cards require a special conditional Burn (not available in Season 1)")]
    RareRequiresConditionalBurn,
    #[msg("Both Evolve parents must be Common rarity")]
    EvolveParentMustBeCommon,
    #[msg("Evolve target must be Uncommon rarity (Season 1 restriction)")]
    InvalidEvolveTarget,
    #[msg("Stat Imprint limit reached for this card's rarity")]
    StatImprintLimitReached,
    #[msg("Starter deck cards are protected from Steal")]
    StarterCardProtected,
    #[msg("Permanent Steal (Hand-Peek / Legendary) requires Gold Hall")]
    PermanentStealRequiresGoldHall,
    #[msg("Legendary cards can only be stolen via Legendary Steal in Gold Hall")]
    LegendaryRequiresLegendarySteal,
    #[msg("Legendary Steal requires Gold Hall tier")]
    LegendaryRequiresGoldHall,
    #[msg("SeasonStats PDA for this season already initialized")]
    SeasonStatsAlreadyInitialized,
    #[msg("Card has no active lease to return")]
    NoActiveLease,
    #[msg("Lease has not expired yet")]
    LeaseNotExpired,
    // ── claim_battle_loot ────────────────────────────────────────────────────
    #[msg("Cannot loot from yourself")]
    CannotLootSelf,
    #[msg("You are not the winner of this battle")]
    NotWinner,
    #[msg("Wrong loser specified")]
    WrongLoser,
    #[msg("Battle field size must be exactly 5")]
    InvalidFieldSize,
    #[msg("SlotHashes sysvar unavailable or too short")]
    SlotHashesUnavailable,
    #[msg("Loser does not own the stolen card in their vault")]
    LoserDoesNotOwnCard,
    #[msg("Invalid card ID (must be 1-60)")]
    InvalidCardId,
    #[msg("Card not owned by player")]
    CardNotOwned,
    // ── Phase 15: Admin / Waitlist / Season v2 ──────────────────────────────
    #[msg("Caller is not the authorized admin")]
    Unauthorized,
    #[msg("Waitlist registration is closed")]
    WaitlistClosed,
    #[msg("Player is already registered for this season")]
    AlreadyRegistered,
    #[msg("Game is not active (status != 1)")]
    GameNotActive,
    #[msg("Game has not ended (status != 2)")]
    GameNotEnded,
    #[msg("Player has no deposit — not registered")]
    NotRegistered,
    #[msg("No prize to claim (vault_count == 0 or tier has no pool)")]
    NoPrizeClaim,
    // ── ZK Proof v2 (hand_commitment circuit) ───────────────────────────────
    #[msg("ZK proof pubkey does not match signer")]
    ZkPubkeyMismatch,
    #[msg("ZK proof round does not match instruction argument")]
    ZkRoundMismatch,
    #[msg("ZK proof verification failed")]
    ZkProofInvalid,
    #[msg("ZK proof already verified for this duel/round/signer")]
    ZkProofAlreadyVerified,
}
