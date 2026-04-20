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
}
