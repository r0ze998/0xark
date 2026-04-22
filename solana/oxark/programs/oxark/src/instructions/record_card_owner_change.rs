use anchor_lang::prelude::*;
use crate::state::{CardBattleHistory, CardOwnerChanged};
use crate::instructions::update_card_battle_history::CARD_BATTLE_HISTORY_SEED;

// ─── Accounts ─────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(card_mint: Pubkey)]
pub struct RecordCardOwnerChange<'info> {
    #[account(
        init_if_needed,
        payer = payer,
        space = CardBattleHistory::LEN,
        seeds = [CARD_BATTLE_HISTORY_SEED, card_mint.as_ref()],
        bump,
    )]
    pub card_battle_history: Account<'info, CardBattleHistory>,

    /// The current owner being displaced (their key is written into owners_history).
    pub current_owner: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ─── Handler ─────────────────────────────────────────────────────────────────

/// T-D13-A3: Record a card ownership change (duel win, P2P trade, shop).
///
/// Maintains a ring buffer of the last 10 owners.  The current_owner is pushed
/// to index 0 and older entries shift right; the 11th entry drops off.
pub fn handle_record_card_owner_change(
    ctx: Context<RecordCardOwnerChange>,
    card_mint: Pubkey,
    new_owner: Pubkey,
    source: u8,   // 0=mint, 1=shop, 2=duel_won, 3=p2p_trade
) -> Result<()> {
    let history    = &mut ctx.accounts.card_battle_history;
    let old_owner  = ctx.accounts.current_owner.key();

    // Initialize on first write.
    if history.card_mint == Pubkey::default() {
        history.card_mint  = card_mint;
        history.created_at = Clock::get()?.unix_timestamp;
        history.bump       = ctx.bumps.card_battle_history;
    }

    // Shift owners_history right by 1, prepend old_owner at index 0.
    if (history.owners_history_len as usize) < 10 {
        let len = history.owners_history_len as usize;
        for i in (1..=len).rev() {
            history.owners_history[i] = history.owners_history[i - 1];
        }
        history.owners_history[0] = old_owner;
        history.owners_history_len += 1;
    } else {
        // Buffer full — oldest entry drops off (index 9 is lost).
        for i in (1..10).rev() {
            history.owners_history[i] = history.owners_history[i - 1];
        }
        history.owners_history[0] = old_owner;
        history.owners_dropped_count = history.owners_dropped_count.saturating_add(1);
    }

    history.acquisition_source    = source;
    history.current_owner_since   = Clock::get()?.unix_timestamp;

    emit!(CardOwnerChanged {
        card_mint,
        old_owner,
        new_owner,
        source,
        timestamp: history.current_owner_since,
    });

    msg!(
        "CardOwnerChanged: mint={} old={} new={} source={}",
        card_mint,
        old_owner,
        new_owner,
        source,
    );

    Ok(())
}
