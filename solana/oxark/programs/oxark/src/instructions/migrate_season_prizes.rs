//! One-time, admin-authorized migration of the 185-byte pre-settlement world.
//! Preserve participants and collection accounts. An external legacy vault must
//! ALSO sign; only its recorded season allocation moves, never its whole balance.
use crate::{
    constants::ADMIN_PUBKEY,
    error::ErrorCode,
    state::{GameWorld, PlayerState},
};
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

#[derive(Accounts)]
pub struct MigrateSeasonPrizes<'info> {
    /// CHECK: canonical PDA + owner checked here; legacy discriminator/layout checked below.
    #[account(mut, seeds = [GameWorld::SEED], bump, owner = crate::ID)]
    pub game_world: UncheckedAccount<'info>,
    #[account(mut, constraint = admin.key() == ADMIN_PUBKEY @ ErrorCode::NotAdmin)]
    pub admin: Signer<'info>,
    /// CHECK: validated against the legacy world's recorded pool, owner and data length.
    #[account(mut)]
    pub legacy_pool: UncheckedAccount<'info>,
    #[account(mut, seeds = [GameWorld::PRIZE_POOL_SEED], bump)]
    pub prize_pool: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_migrate_season_prizes(
    ctx: Context<MigrateSeasonPrizes>,
    registered_players: Vec<Pubkey>,
    additional_prize_lamports: u64,
) -> Result<()> {
    let info = ctx.accounts.game_world.to_account_info();
    let original = info.try_borrow_data()?.to_vec();
    require!(original.len() == 185, ErrorCode::InvalidSeasonMigration);
    let mut expanded = original.clone();
    expanded.resize(GameWorld::SIZE, 0);
    let mut world = GameWorld::try_deserialize(&mut expanded.as_slice())?;
    require!(
        world.bump == ctx.bumps.game_world
            && world.game_status <= 1
            && world.winner_60_count == 0
            && world.tier2_total_vault == 0
            && world.tier3_total_vault == 0
            && world.tier4_total_vault == 0
            && world.tier5_total_vault == 0,
        ErrorCode::InvalidSeasonMigration
    );
    require_keys_eq!(
        ctx.accounts.legacy_pool.key(),
        world.prize_pool,
        ErrorCode::InvalidAccount
    );
    require_keys_eq!(
        *ctx.accounts.legacy_pool.owner,
        anchor_lang::system_program::ID,
        ErrorCode::InvalidAccountOwner
    );
    require!(
        ctx.accounts.legacy_pool.data_is_empty(),
        ErrorCode::InvalidSeasonMigration
    );

    // The admin attests that this is the COMPLETE canonical participant set.
    // Legacy reset/re-registration inflated the event counter; validate every
    // supplied identity and retain all player balances/cards while repairing it.
    let old_count = world.total_participants;
    require!(
        registered_players.len() == ctx.remaining_accounts.len()
            && registered_players.len() <= old_count as usize
            && (old_count == 0 || !registered_players.is_empty()),
        ErrorCode::InvalidSeasonMigration
    );
    let mut previous = Pubkey::default();
    for (owner, account) in registered_players.iter().zip(ctx.remaining_accounts.iter()) {
        require!(*owner > previous, ErrorCode::TallyOutOfOrder);
        let expected = Pubkey::find_program_address(&[b"player", owner.as_ref()], &crate::ID).0;
        require_keys_eq!(account.key(), expected, ErrorCode::InvalidAccount);
        require_keys_eq!(*account.owner, crate::ID, ErrorCode::InvalidAccountOwner);
        let ps = PlayerState::try_deserialize(&mut account.try_borrow_data()?.as_ref())?;
        require!(
            ps.player == *owner && ps.deposit_amount > 0,
            ErrorCode::NotRegistered
        );
        previous = *owner;
    }
    world.total_participants = registered_players.len() as u32;
    // Explicit, audited historical inflows only; never sweep an external wallet.
    world.total_prize_pool = world
        .total_prize_pool
        .checked_add(additional_prize_lamports)
        .ok_or(ErrorCode::SeasonArithmeticOverflow)?;
    msg!(
        "MigrationReconciliation: old_count={} unique_count={} additional_prize={}",
        old_count,
        world.total_participants,
        additional_prize_lamports
    );

    let floor = Rent::get()?.minimum_balance(0);
    // Admin funds rent, separately from the recorded prize liability.
    let rent_topup = floor.saturating_sub(ctx.accounts.prize_pool.lamports());
    if rent_topup > 0 {
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.admin.to_account_info(),
                    to: ctx.accounts.prize_pool.to_account_info(),
                },
            ),
            rent_topup,
        )?;
    }
    if world.prize_pool != ctx.accounts.prize_pool.key() {
        require!(ctx.accounts.legacy_pool.is_signer, ErrorCode::Unauthorized);
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.legacy_pool.to_account_info(),
                    to: ctx.accounts.prize_pool.to_account_info(),
                },
            ),
            world.total_prize_pool,
        )?;
    }
    require!(
        ctx.accounts.prize_pool.lamports().saturating_sub(floor) >= world.total_prize_pool,
        ErrorCode::PrizeUnderfunded
    );
    let rent = Rent::get()?
        .minimum_balance(GameWorld::SIZE)
        .saturating_sub(info.lamports());
    if rent > 0 {
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.admin.to_account_info(),
                    to: info.clone(),
                },
            ),
            rent,
        )?;
    }
    info.resize(GameWorld::SIZE)?;
    world.prize_pool = ctx.accounts.prize_pool.key();
    world.prize_pool_bump = ctx.bumps.prize_pool;
    world.try_serialize(&mut &mut info.try_borrow_mut_data()?[..])?;
    msg!(
        "MigrateSeasonPrizes: participants={} recorded_prize={} old_pool={} new_pool={}",
        world.total_participants,
        world.total_prize_pool,
        ctx.accounts.legacy_pool.key(),
        world.prize_pool
    );
    Ok(())
}
