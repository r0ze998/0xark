// settle_duel_history — trustless CardBattleHistory writes derived from DuelState.
//
// WHY THIS EXISTS (the provenance-gate hole):
// `promote_card` (YKK-45) gates rarity promotion on `CardBattleHistory.wins`, but
// the only writer of that field was `update_card_battle_history`, which accepted
// caller-supplied deltas from ANY signer — the same caller-trusted class as C5
// (caller-supplied rarity) and C6 (win records without DuelState proof). Any wallet
// could mint 10 fake wins and promote for free, voiding design v3's core promise
// that upper tiers are "unlockable only through history, never money".
//
// THE FIX: history deltas are now DERIVED from a finished on-chain DuelState —
// an artifact the program itself wrote through the ZK commit/reveal flow — instead
// of being trusted from arguments. `update_card_battle_history` is ADMIN-gated
// (migration escape hatch); this instruction is the player-facing path.
//
// Per call, ONE card is settled (typed Anchor accounts + init_if_needed for the
// history PDA; batching happens client-side by packing several of these
// instructions into one transaction). Checks, in order:
//   1. duel ended (ended_at != 0)
//   2. caller is a participant of that duel
//   3. CardMintRecord pinned to the card_mint seed (YKK-32 pattern)
//   4. the record's card_id appears in the CALLER's revealed hands of this duel
//      (card_id 0 is rejected: 0 is the empty-slot sentinel in revealed arrays)
//   5. not already settled for this (duel, player, card_id) — DuelSettleRecord bitmap
// Then: winner side ⇒ wins += 1, loser side ⇒ losses += 1, draw ⇒ no stat delta
// (participation is still marked in the bitmap so a draw can't be re-litigated).
// Threshold auto-imprints (Veteran/Elder) run through the same shared helper as
// the admin path.
//
// RESIDUAL RISK (documented, out of scope here): this makes forged history
// impossible, not self-played history. A player can duel their own second wallet;
// those wins are *real on-chain events* (full ZK flow, fees paid) — pricing that
// grind is the economics layer's job (ante collection, energy costs: YKK-43/44).

use crate::error::ErrorCode;
use crate::instructions::init_duel::DUEL_SEED;
use crate::instructions::update_card_battle_history::apply_threshold_imprints;
use crate::state::{CardBattleHistory, CardMintRecord, DuelHistorySettled, DuelSettleRecord, DuelState};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(duel_id: Pubkey, card_mint: Pubkey)]
pub struct SettleDuelHistory<'info> {
    /// The finished duel this settlement draws from. Program-owned: only the
    /// ZK commit/reveal flow ever writes revealed hands / winner into it.
    #[account(
        seeds = [DUEL_SEED, duel_id.as_ref()],
        bump = duel.bump,
    )]
    pub duel: Account<'info, DuelState>,

    /// The participant settling their own side of the duel. Pays for the
    /// lazily-created PDAs below.
    #[account(mut)]
    pub player: Signer<'info>,

    /// Per-(duel, player) dedup ledger — bit `card_id` set once settled.
    #[account(
        init_if_needed,
        payer = player,
        space = DuelSettleRecord::SIZE,
        seeds = [DuelSettleRecord::SEED, duel_id.as_ref(), player.key().as_ref()],
        bump,
    )]
    pub settle_record: Account<'info, DuelSettleRecord>,

    /// On-chain card identity: bridges mint → card_id (species) and rarity.
    #[account(
        seeds = [CardMintRecord::SEED, card_mint.as_ref()],
        bump = card_mint_record.bump,
    )]
    pub card_mint_record: Account<'info, CardMintRecord>,

    /// The provenance ledger being credited. Created here on first credit so a
    /// fresh card's first real duel initializes its history.
    #[account(
        init_if_needed,
        payer = player,
        space = CardBattleHistory::LEN,
        seeds = [CardBattleHistory::CARD_BATTLE_HISTORY_SEED, card_mint.as_ref()],
        bump,
    )]
    pub card_battle_history: Account<'info, CardBattleHistory>,

    pub system_program: Program<'info, System>,
}

pub fn handle_settle_duel_history(
    ctx: Context<SettleDuelHistory>,
    duel_id: Pubkey,
    card_mint: Pubkey,
) -> Result<()> {
    let duel = &ctx.accounts.duel;
    require!(duel.id == duel_id, ErrorCode::WrongDuel);

    // 1. Only finished duels produce history. reveal_hand sets ended_at exactly
    //    once, when the outcome is decided (3-win majority or round-5 tally).
    require!(duel.ended_at != 0, ErrorCode::DuelNotEnded);

    // 2. Participant check.
    let player_key = ctx.accounts.player.key();
    let is_p1 = player_key == duel.player_1;
    let is_p2 = player_key == duel.player_2;
    require!(is_p1 || is_p2, ErrorCode::NotADuelParticipant);

    // 3. Pin the mint record to the seed argument (YKK-32 pattern): the caller
    //    cannot aim the settlement at a different card's record.
    let record = &ctx.accounts.card_mint_record;
    require!(record.card_mint == card_mint, ErrorCode::InvalidAccount);

    // 4. Membership: this species must appear in the CALLER's revealed hands.
    //    Revealed rows use 0 as the empty-slot padding sentinel, so id 0 is not
    //    settleable — a real card must never be assigned on-chain id 0 (see
    //    docs note; enforced here defensively).
    let card_id = record.card_id;
    require!(card_id != 0, ErrorCode::UnsupportedCardId);
    require!((card_id as usize) < 64, ErrorCode::UnsupportedCardId);

    let revealed = if is_p1 {
        &duel.player_1_revealed
    } else {
        &duel.player_2_revealed
    };
    let played = revealed
        .iter()
        .any(|round_row| round_row.iter().any(|&id| id == card_id as u64));
    require!(played, ErrorCode::CardNotInRevealedHand);

    // 5. Dedup via the per-(duel, player) bitmap.
    let settle = &mut ctx.accounts.settle_record;
    if settle.player == Pubkey::default() {
        // First settle for this (duel, player): stamp identity fields.
        settle.duel_id = duel_id;
        settle.player = player_key;
        settle.bump = ctx.bumps.settle_record;
    } else {
        // Defense-in-depth: the PDA seeds already bind these, but verify anyway.
        require!(
            settle.duel_id == duel_id && settle.player == player_key,
            ErrorCode::WrongSettleRecord
        );
    }
    let bit = 1u64 << card_id;
    require!((settle.settled_bitmap & bit) == 0, ErrorCode::CardAlreadySettled);
    settle.settled_bitmap |= bit;

    // Credit. Draw (winner == Pubkey::default()) marks participation but moves
    // no stats — a drawn duel is neither a win nor a loss for provenance.
    let history = &mut ctx.accounts.card_battle_history;
    let now = Clock::get()?.unix_timestamp;
    history.ensure_initialized(card_mint, now, ctx.bumps.card_battle_history);

    let won = duel.winner == player_key;
    let lost = duel.winner != Pubkey::default() && !won;
    let old_wins = history.wins;
    if won {
        history.wins = history.wins.saturating_add(1);
    } else if lost {
        history.losses = history.losses.saturating_add(1);
    }
    history.times_summoned = history.times_summoned.saturating_add(1);
    apply_threshold_imprints(history, old_wins, now);

    emit!(DuelHistorySettled {
        duel_id,
        player: player_key,
        card_mint,
        card_id,
        won,
    });
    msg!(
        "settle_duel_history: duel={} player={} card_id={} won={} wins={} losses={}",
        duel_id,
        player_key,
        card_id,
        won,
        history.wins,
        history.losses,
    );
    Ok(())
}
