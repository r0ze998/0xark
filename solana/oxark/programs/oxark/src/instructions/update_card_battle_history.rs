use crate::error::ErrorCode;
use crate::state::{
    CardBattleHistory, CardBattleHistoryUpdated, CardMintRecord, Imprint, ImprintGrantedEvent,
    ImprintKey,
};
use anchor_lang::prelude::*;

/// Canonical seed lives on the struct in state.rs; this alias keeps the
/// `#[account(seeds = ...)]` attributes below readable.
const CARD_BATTLE_HISTORY_SEED: &[u8] = CardBattleHistory::CARD_BATTLE_HISTORY_SEED;

// ─── Accounts ─────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(card_mint: Pubkey)]
pub struct UpdateCardBattleHistory<'info> {
    #[account(
        init_if_needed,
        payer = payer,
        space = CardBattleHistory::LEN,
        seeds = [CARD_BATTLE_HISTORY_SEED, card_mint.as_ref()],
        bump,
    )]
    pub card_battle_history: Account<'info, CardBattleHistory>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(card_mint: Pubkey)]
pub struct GrantImprint<'info> {
    #[account(
        init_if_needed,
        payer = payer,
        space = CardBattleHistory::LEN,
        seeds = [CARD_BATTLE_HISTORY_SEED, card_mint.as_ref()],
        bump,
    )]
    pub card_battle_history: Account<'info, CardBattleHistory>,

    // C5 fix (YKK-32): rarity is read from this on-chain record, not trusted
    // from a caller argument. Seeded by the same card_mint that seeds the
    // battle history, so the caller cannot point it at a different card.
    #[account(
        seeds = [CardMintRecord::SEED, card_mint.as_ref()],
        bump  = card_mint_record.bump,
    )]
    pub card_mint_record: Account<'info, CardMintRecord>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ─── Handler: battle stat update ─────────────────────────────────────────────

/// T-D13-A2 (v3.0-plus extended): Update per-NFT battle stats after a duel.
///
/// Automatically checks Imprint conditions and grants earned Imprints:
///   - Veteran: cumulative wins ≥ 10
///   - Elder:   cumulative wins ≥ 50
pub fn handle_update_card_battle_history(
    ctx: Context<UpdateCardBattleHistory>,
    card_mint: Pubkey,
    wins_delta: u32,
    losses_delta: u32,
    kos_delta: u32,
    dmg_delta: u64,
    summon_delta: u32,
) -> Result<()> {
    let history = &mut ctx.accounts.card_battle_history;
    let now = Clock::get()?.unix_timestamp;
    history.ensure_initialized(card_mint, now, ctx.bumps.card_battle_history);

    let old_wins = history.wins;
    history.wins = history.wins.saturating_add(wins_delta);
    history.losses = history.losses.saturating_add(losses_delta);
    history.kos = history.kos.saturating_add(kos_delta);
    history.dmg_dealt = history.dmg_dealt.saturating_add(dmg_delta);
    history.times_summoned = history.times_summoned.saturating_add(summon_delta);

    // Auto-grant Veteran Imprint at 10 cumulative wins (first time crossing threshold)
    if old_wins < 10 && history.wins >= 10 {
        try_grant_imprint(history, ImprintKey::Veteran, 1, false, 0, now);
    }

    // Auto-grant Elder Imprint at 50 cumulative wins
    if old_wins < 50 && history.wins >= 50 {
        try_grant_imprint(history, ImprintKey::Elder, 1, false, 0, now);
        try_grant_imprint(history, ImprintKey::ElderFrame, 0, true, 0, now);
    }

    // Auto-grant Lineage Mark when owner ring has ≥ 3 entries
    if history.owners_history_len >= 3 {
        let has_lineage = history.imprints[..history.imprint_count as usize]
            .iter()
            .any(|imp| imp.key == ImprintKey::LineageMark as u8);
        if !has_lineage {
            try_grant_imprint(history, ImprintKey::LineageMark, 0, true, 0, now);
        }
    }

    emit!(CardBattleHistoryUpdated {
        card_mint,
        wins: history.wins,
        losses: history.losses,
        kos: history.kos,
        dmg_dealt: history.dmg_dealt,
    });

    msg!(
        "CardBattleHistory updated: mint={} wins={} losses={} kos={} dmg={}",
        card_mint,
        history.wins,
        history.losses,
        history.kos,
        history.dmg_dealt,
    );
    Ok(())
}

// ─── Handler: manual Imprint grant ───────────────────────────────────────────

/// v3.0-plus: Explicitly grant an Imprint to a card's battle history.
///
/// `imprint_key_val` is the u8 value of ImprintKey enum.
/// Rarity (0=Common .. 3=Legendary) gates stat imprint limits and is read
/// from the on-chain CardMintRecord PDA (C5 fix, YKK-32) — never trusted
/// from the caller. Cosmetic imprints have no limit; stat imprints are
/// capped by rarity.
pub fn handle_grant_imprint(
    ctx: Context<GrantImprint>,
    card_mint: Pubkey,
    imprint_key_val: u8,
    is_cosmetic: bool,
    duel_id: u64,
) -> Result<()> {
    // C5 fix: pin the rarity record to the card actually being imprinted, then
    // source rarity from chain state instead of a caller argument.
    require!(
        ctx.accounts.card_mint_record.card_mint == card_mint,
        ErrorCode::InvalidAccount
    );
    let rarity = ctx.accounts.card_mint_record.rarity;

    let history = &mut ctx.accounts.card_battle_history;
    let now = Clock::get()?.unix_timestamp;
    history.ensure_initialized(card_mint, now, ctx.bumps.card_battle_history);

    // Stat imprint limit check
    if !is_cosmetic {
        let stat_count = history.imprints[..history.imprint_count as usize]
            .iter()
            .filter(|i| !i.is_cosmetic)
            .count();
        require!(
            stat_count < CardBattleHistory::max_stat_imprints(rarity),
            ErrorCode::StatImprintLimitReached
        );
    }

    let key = ImprintKey::from(imprint_key_val);
    let value = stat_delta_for(key);
    let granted = try_grant_imprint(history, key, value, is_cosmetic, duel_id, now);

    if granted {
        emit!(ImprintGrantedEvent {
            card_mint,
            imprint_key: imprint_key_val,
            is_cosmetic,
            duel_id,
            timestamp: now,
        });
        msg!("ImprintGranted: mint={} key={}", card_mint, imprint_key_val);
    }

    Ok(())
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/// Returns the stat delta associated with a stat Imprint type.
fn stat_delta_for(key: ImprintKey) -> i32 {
    match key {
        ImprintKey::Veteran => 1,    // +1 BP
        ImprintKey::Elder => 1,      // +1 HP
        ImprintKey::Kingslayer => 2, // +2 BP vs Legendary
        _ => 0,
    }
}

/// Insert an imprint if not already present and if space allows.
/// Returns true if the imprint was added.
pub fn try_grant_imprint(
    history: &mut CardBattleHistory,
    key: ImprintKey,
    value: i32,
    is_cosmetic: bool,
    duel_id: u64,
    now: i64,
) -> bool {
    let count = history.imprint_count as usize;
    if count >= 5 {
        return false;
    }

    // Deduplicate: don't grant the same key twice (except None)
    let already_has = history.imprints[..count]
        .iter()
        .any(|i| i.key == key as u8 && key != ImprintKey::None);
    if already_has {
        return false;
    }

    history.imprints[count] = Imprint {
        key: key as u8,
        value,
        is_cosmetic,
        acquired_at: now,
        duel_id,
    };
    history.imprint_count += 1;
    true
}
