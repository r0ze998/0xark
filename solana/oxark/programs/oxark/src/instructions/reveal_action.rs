use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
#[instruction(game_id: u64, action_type: u8, target: Pubkey, salt: [u8; 32])]
pub struct RevealActionCtx<'info> {
    #[account(
        mut,
        seeds = [GAME_SEED, game_id.to_le_bytes().as_ref()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,
    #[account(
        mut,
        seeds = [PLAYER_SEED, game_id.to_le_bytes().as_ref(), player.key().as_ref()],
        bump = player_state.bump,
    )]
    pub player_state: Account<'info, PlayerState>,
    /// Mutable so we can write verified played_cards back for resolve_round lane scoring.
    #[account(
        mut,
        seeds = [COMMIT_SEED, game_id.to_le_bytes().as_ref(), game.round.to_le_bytes().as_ref(), player.key().as_ref()],
        bump = commit.bump,
    )]
    pub commit: Account<'info, CommitAction>,
    pub player: Signer<'info>,
}

/// Reveal the committed action and verify the hash.
///
/// Reborn path (played_cards non-empty):
///   commitment = SHA-256(card_ids_le_bytes || salt || round || phase)
///   Verified played_cards are written into commit.played_cards so that
///   resolve_round can read them for lane-based element affinity scoring.
///
/// Legacy path (played_cards empty):
///   commitment = SHA-256(action_type | target | salt)  — Phase C compat
pub fn handle_reveal(
    ctx: Context<RevealActionCtx>,
    game_id: u64,
    action_type: u8,
    target: Pubkey,
    salt: [u8; 32],
    played_cards: Vec<u64>,
) -> Result<()> {
    let game = &mut ctx.accounts.game;
    require!(game.status == GameStatus::RevealPhase, ErrorCode::NotRevealPhase);

    let ps = &mut ctx.accounts.player_state;
    require!(ps.has_committed, ErrorCode::NotCommitted);
    require!(!ps.has_revealed, ErrorCode::AlreadyRevealed);

    use solana_sha256_hasher::hashv;

    if played_cards.is_empty() {
        // ── Phase C legacy path ─────────────────────────────────────────────
        let computed = hashv(&[&[action_type], target.as_ref(), &salt]).to_bytes();
        require!(computed == ctx.accounts.commit.hash, ErrorCode::HashMismatch);
    } else {
        // ── Reborn lane path ────────────────────────────────────────────────
        // Build input slices: each card_id (8 bytes LE) + salt + round + phase
        let card_bytes: Vec<[u8; 8]> = played_cards.iter().map(|c| c.to_le_bytes()).collect();
        let mut parts: Vec<&[u8]> = card_bytes.iter().map(|b| b.as_slice()).collect();
        parts.push(&salt);
        parts.push(std::slice::from_ref(&game.round));
        parts.push(std::slice::from_ref(&ctx.accounts.commit.phase));
        let computed = hashv(&parts).to_bytes();
        require!(computed == ctx.accounts.commit.hash, ErrorCode::HashMismatch);

        // Store verified played_cards in CommitAction for lane resolution
        let card_count = played_cards.len().min(3);
        let commit = &mut ctx.accounts.commit;
        commit.played_cards = [0u64; 3];
        for i in 0..card_count {
            commit.played_cards[i] = played_cards[i];
        }
        commit.played_cards_len = card_count as u8;
    }

    // Validate and store revealed action (legacy path compatibility)
    let at = ActionType::from(action_type);
    validate_action(ps, at, target, ctx.accounts.player.key())?;

    ps.revealed_action = action_type;
    ps.revealed_target = target;
    ps.has_revealed    = true;
    game.reveal_count  += 1;

    msg!(
        "Player {} revealed action={} played_cards={} round={}",
        ctx.accounts.player.key(), action_type, played_cards.len(), game.round,
    );
    Ok(())
}

fn validate_action(_ps: &PlayerState, at: ActionType, target: Pubkey, caller: Pubkey) -> Result<()> {
    // Phase 15: ActionType validation uses vault_bitmap on the v2 battle path.
    // For the legacy commit-reveal path these basic target checks still apply.
    match at {
        ActionType::UseCrystal | ActionType::Barrier | ActionType::UseStorm | ActionType::UseShadow => {},
        ActionType::UseFlame | ActionType::UseVoid => {
            require!(target != caller, ErrorCode::CannotTargetSelf);
        },
    }
    Ok(())
}
