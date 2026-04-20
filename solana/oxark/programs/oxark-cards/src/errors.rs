use anchor_lang::prelude::*;

#[error_code]
pub enum CardsError {
    #[msg("card_id must be between 1 and 60")]
    InvalidCardId,
    #[msg("Game is not finished yet")]
    GameNotFinished,
    #[msg("Caller is not the game winner")]
    NotWinner,
    #[msg("Price must be greater than 0")]
    InvalidPrice,
    #[msg("CardListing is not active")]
    ListingNotActive,
    #[msg("Seller key does not match listing")]
    SellerMismatch,
}
