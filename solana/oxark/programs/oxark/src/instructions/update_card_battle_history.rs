use anchor_lang::prelude::*;
use crate::state::{CardBattleHistory, CardBattleHistoryUpdated};

pub const CARD_BATTLE_HISTORY_SEED: &[u8] = b"card_battle_history";

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

// ─── Handler ─────────────────────────────────────────────────────────────────

/// T-D13-A2: Update per-NFT battle stats after a duel.
///
/// Called once per card per duel: deltas for wins / losses / kos / dmg / summons.
/// On first call (fresh PDA), initializes immutable fields.
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

    // Initialize immutable fields on first write.
    if history.card_mint == Pubkey::default() {
        history.card_mint  = card_mint;
        history.created_at = Clock::get()?.unix_timestamp;
        history.bump       = ctx.bumps.card_battle_history;
    }

    history.wins            = history.wins.saturating_add(wins_delta);
    history.losses          = history.losses.saturating_add(losses_delta);
    history.kos             = history.kos.saturating_add(kos_delta);
    history.dmg_dealt       = history.dmg_dealt.saturating_add(dmg_delta);
    history.times_summoned  = history.times_summoned.saturating_add(summon_delta);

    emit!(CardBattleHistoryUpdated {
        card_mint,
        wins:      history.wins,
        losses:    history.losses,
        kos:       history.kos,
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
