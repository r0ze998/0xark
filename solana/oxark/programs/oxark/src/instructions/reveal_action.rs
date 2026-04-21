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
    #[account(
        seeds = [COMMIT_SEED, game_id.to_le_bytes().as_ref(), game.round.to_le_bytes().as_ref(), player.key().as_ref()],
        bump = commit.bump,
    )]
    pub commit: Account<'info, CommitAction>,
    pub player: Signer<'info>,
}

pub fn handle_reveal(
    ctx: Context<RevealActionCtx>,
    game_id: u64,
    action_type: u8,
    target: Pubkey,
    salt: [u8; 32],
    // Reborn: card IDs played in this phase (empty Vec = legacy Phase C reveal path).
    // When non-empty: commitment = SHA-256(played_cards_bytes + salt + round + phase).
    // TODO: Reborn Day 8 — replace action_type/target with lane scoring inputs.
    played_cards: Vec<u64>,
) -> Result<()> {
    let game = &mut ctx.accounts.game;
    require!(game.status == GameStatus::RevealPhase, ErrorCode::NotRevealPhase);

    let ps = &mut ctx.accounts.player_state;
    require!(ps.has_committed, ErrorCode::NotCommitted);
    require!(!ps.has_revealed, ErrorCode::AlreadyRevealed);

    use sha2::{Sha256, Digest};

    if played_cards.is_empty() {
        // ── Phase C legacy path: SHA256(action_type | target | salt) ──────────
        // #[deprecated(since = "reborn")] — remove when Duel client ships (Day 8)
        let mut hasher = Sha256::new();
        hasher.update([action_type]);
        hasher.update(target.as_ref());
        hasher.update(salt);
        let computed: [u8; 32] = hasher.finalize().into();
        require!(computed == ctx.accounts.commit.hash, ErrorCode::HashMismatch);
    } else {
        // ── Reborn path: SHA256(card_ids_le_bytes + salt + round + phase) ──────
        // commitment binds: which cards, which nonce, which round, which phase.
        let mut hasher = Sha256::new();
        for &cid in &played_cards {
            hasher.update(cid.to_le_bytes());
        }
        hasher.update(salt);
        hasher.update([game.round]);
        hasher.update([ctx.accounts.commit.phase]);
        let computed: [u8; 32] = hasher.finalize().into();
        require!(computed == ctx.accounts.commit.hash, ErrorCode::HashMismatch);
        // TODO: Reborn Day 8 — store played_cards in PlayerState for lane resolution.
    }

    // Validate action
    let at = ActionType::from(action_type);
    validate_action(ps, at, target, ctx.accounts.player.key())?;

    // Store revealed action
    ps.revealed_action = action_type;
    ps.revealed_target = target;
    ps.has_revealed = true;
    game.reveal_count += 1;

    msg!("Player {} revealed action {} for round {}", ctx.accounts.player.key(), action_type, game.round);
    Ok(())
}

fn validate_action(ps: &PlayerState, at: ActionType, target: Pubkey, caller: Pubkey) -> Result<()> {
    match at {
        ActionType::Draw => {},
        ActionType::Steal => {
            require!(ps.steal_count > 0, ErrorCode::NoSpellsLeft);
            require!(target != caller, ErrorCode::CannotTargetSelf);
        },
        ActionType::Barrier => {
            require!(ps.barrier_count > 0, ErrorCode::NoSpellsLeft);
        },
        ActionType::Scout => {
            require!(ps.scout_count > 0, ErrorCode::NoSpellsLeft);
            require!(target != caller, ErrorCode::CannotTargetSelf);
        },
        ActionType::UseCrystal => {
            require!(has_card(&ps.cards, 1), ErrorCode::CardNotFound);
        },
        ActionType::UseShadow => {
            require!(has_card(&ps.cards, 2), ErrorCode::CardNotFound);
        },
        ActionType::UseFlame => {
            require!(has_card(&ps.cards, 3), ErrorCode::CardNotFound);
            require!(target != caller, ErrorCode::CannotTargetSelf);
        },
        ActionType::UseStorm => {
            require!(has_card(&ps.cards, 4), ErrorCode::CardNotFound);
        },
        ActionType::UseVoid => {
            require!(has_card(&ps.cards, 5), ErrorCode::CardNotFound);
            require!(target != caller, ErrorCode::CannotTargetSelf);
        },
        ActionType::Move => {
            // Move is always valid — target encodes the destination area in low byte
        },
        ActionType::None => {
            return Err(ErrorCode::InvalidAction.into());
        },
    }
    Ok(())
}

fn has_card(cards: &[u8; 5], card_id: u8) -> bool {
    cards.contains(&card_id)
}
