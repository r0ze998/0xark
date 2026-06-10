use crate::constants::{RARITY_COMMON, RARITY_UNCOMMON};
use crate::error::ErrorCode;
use crate::state::{CardBattleHistory, CardEvolvedEvent, Imprint, ImprintKey, SeasonStats};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount};

// ─── Accounts ─────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(parent_a_mint: Pubkey, parent_b_mint: Pubkey, child_mint: Pubkey, target_species_id: u16)]
pub struct EvolveCards<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    // Parent A accounts
    /// CHECK: validated by ATA constraint
    #[account(mut)]
    pub parent_a_mint_account: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint      = parent_a_mint_account,
        associated_token::authority = owner,
        constraint = parent_a_token_account.amount == 1 @ ErrorCode::InvalidAction,
    )]
    pub parent_a_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = owner,
        space = CardBattleHistory::LEN,
        seeds = [CardBattleHistory::CARD_BATTLE_HISTORY_SEED, parent_a_mint.as_ref()],
        bump,
    )]
    pub parent_a_history: Box<Account<'info, CardBattleHistory>>,

    // Parent B accounts
    /// CHECK: validated by ATA constraint
    #[account(mut)]
    pub parent_b_mint_account: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint      = parent_b_mint_account,
        associated_token::authority = owner,
        constraint = parent_b_token_account.amount == 1 @ ErrorCode::InvalidAction,
    )]
    pub parent_b_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = owner,
        space = CardBattleHistory::LEN,
        seeds = [CardBattleHistory::CARD_BATTLE_HISTORY_SEED, parent_b_mint.as_ref()],
        bump,
    )]
    pub parent_b_history: Box<Account<'info, CardBattleHistory>>,

    // Child card history (newly minted card; child_mint comes from the client
    // after off-chain / oxark-cards mint — provenance is recorded here)
    #[account(
        init,
        payer = owner,
        space = CardBattleHistory::LEN,
        seeds = [CardBattleHistory::CARD_BATTLE_HISTORY_SEED, child_mint.as_ref()],
        bump,
    )]
    pub child_history: Box<Account<'info, CardBattleHistory>>,

    #[account(
        mut,
        seeds = [SeasonStats::SEASON_STATS_SEED, &parent_a_history.created_at.to_le_bytes()],
        bump = season_stats.bump,
    )]
    pub season_stats: Box<Account<'info, SeasonStats>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

// ─── Handler ─────────────────────────────────────────────────────────────────

/// v3.0-plus: Evolve two Common parent NFTs into one Uncommon child NFT.
///
/// Onchain steps:
///   1. Validate both parents are Common (rarity param, server-verified)
///   2. Validate target is Uncommon
///   3. SPL Token burn parent A and parent B
///   4. Init child CardBattleHistory with provenance (evolved_from_a/b)
///   5. Update SeasonStats (+2 burned, +1 evolved)
///   6. Emit CardEvolvedEvent for client to Solscan-link
///
/// The child NFT mint is performed by oxark-cards (separate program) or off-chain
/// before calling this instruction; child_mint is passed in by the caller.
pub fn handle_evolve_cards(
    ctx: Context<EvolveCards>,
    parent_a_mint: Pubkey,
    parent_b_mint: Pubkey,
    child_mint: Pubkey,
    target_species_id: u16,
    parent_a_rarity: u8,
    parent_b_rarity: u8,
    _target_rarity: u8, // must be RARITY_UNCOMMON; validated below
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    // 1. Validate parent rarities (both must be Common)
    require!(
        parent_a_rarity == RARITY_COMMON,
        ErrorCode::EvolveParentMustBeCommon
    );
    require!(
        parent_b_rarity == RARITY_COMMON,
        ErrorCode::EvolveParentMustBeCommon
    );

    // 2. Validate target is Uncommon (Season 1 restriction)
    require!(
        _target_rarity == RARITY_UNCOMMON,
        ErrorCode::InvalidEvolveTarget
    );

    // 3. Capture parent win counts before burning
    let parent_a_wins = ctx.accounts.parent_a_history.wins;
    let parent_b_wins = ctx.accounts.parent_b_history.wins;
    let cumulative_wins = parent_a_wins.saturating_add(parent_b_wins);

    // 4. SPL Token burn — parent A
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            Burn {
                mint: ctx.accounts.parent_a_mint_account.to_account_info(),
                from: ctx.accounts.parent_a_token_account.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ),
        1,
    )?;

    // 5. SPL Token burn — parent B
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            Burn {
                mint: ctx.accounts.parent_b_mint_account.to_account_info(),
                from: ctx.accounts.parent_b_token_account.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ),
        1,
    )?;

    // 6. Init child CardBattleHistory with provenance
    let child = &mut ctx.accounts.child_history;
    child.card_mint = child_mint;
    child.created_at = now;
    child.current_owner_since = now;
    child.acquisition_source = 4; // 4 = evolved
    child.bump = ctx.bumps.child_history;
    child.is_evolved = true;
    child.evolved_from_a = parent_a_mint;
    child.evolved_from_b = parent_b_mint;
    // Inherit cumulative wins as "battle-hardened from birth"
    child.wins = cumulative_wins;
    // Grant Evolved Imprint automatically
    child.imprints[0] = Imprint {
        key: ImprintKey::Evolved as u8,
        value: 0,
        is_cosmetic: false,
        acquired_at: now,
        duel_id: 0,
    };
    child.imprints[1] = Imprint {
        key: ImprintKey::EvolvedHalo as u8,
        value: 0,
        is_cosmetic: true,
        acquired_at: now,
        duel_id: 0,
    };
    child.imprint_count = 2;

    // 7. Update SeasonStats
    let stats = &mut ctx.accounts.season_stats;
    stats.total_burned = stats.total_burned.saturating_add(2);
    stats.total_evolved = stats.total_evolved.saturating_add(1);
    stats.total_minted = stats.total_minted.saturating_add(1);

    emit!(CardEvolvedEvent {
        parent_a: parent_a_mint,
        parent_b: parent_b_mint,
        child_mint,
        target_species_id,
        cumulative_wins,
        timestamp: now,
    });

    msg!(
        "CardEvolved: child={} from=[{},{}] cumulative_wins={}",
        child_mint,
        parent_a_mint,
        parent_b_mint,
        cumulative_wins,
    );
    Ok(())
}
