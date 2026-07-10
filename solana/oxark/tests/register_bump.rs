// register_bump.rs — regression for the YKK register-bump bug.
//
// register_waitlist creates PlayerState but NEVER wrote player_state.bump, leaving
// it at init's zero. Every consumer that re-derives with `bump = player_state.bump`
// (refill_energy, commit_hand — the whole F1 energy path) then computes a THIRD
// address (bump 0 != canonical) and fails ConstraintSeeds(2006). Existing coverage
// never exercised this because it injected PlayerState via set_account with a correct
// bump — it never ran against register-created state. This test closes that gap:
//   1. register_waitlist → PlayerState.bump == canonical (not 0)
//   2. register_waitlist → refill_energy succeeds (the exact 2006 path)
//
// NOTE: authored against source; run `cargo test` (after `anchor build`) to verify —
// the SBF .so must be rebuilt from the fixed source for this to pass.

use {
    anchor_lang::{AccountDeserialize, AccountSerialize, InstructionData, ToAccountMetas},
    anchor_lang::solana_program::instruction::Instruction,
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_pubkey::Pubkey,
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

fn setup() -> LiteSVM {
    use solana_compute_budget::compute_budget::ComputeBudget;
    let base = ComputeBudget::new_with_defaults(false, false);
    let budget = ComputeBudget { heap_size: 256 * 1024, compute_unit_limit: 1_400_000, ..base };
    let mut svm = LiteSVM::new().with_compute_budget(budget);
    let bytes = include_bytes!("../target/deploy/oxark.so");
    svm.add_program(oxark::id(), bytes).unwrap();
    svm
}

fn send(svm: &mut LiteSVM, ix: Instruction, signers: &[&Keypair]) -> litesvm::types::TransactionResult {
    let payer = signers[0];
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let s: Vec<&dyn solana_signer::Signer> = signers.iter().map(|k| *k as &dyn solana_signer::Signer).collect();
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &s).unwrap();
    svm.send_transaction(tx)
}

fn game_world_pda() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"game_world"], &oxark::id())
}
fn prize_pool_pda() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"prize_pool"], &oxark::id())
}
fn player_state_pda(player: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"player", player.as_ref()], &oxark::id())
}

// Craft a program-owned, waitlist-OPEN GameWorld (bypasses the admin-gated
// init_game_world, whose ADMIN key we don't hold — same pattern as the other tests).
fn craft_game_world(svm: &mut LiteSVM, ops_treasury: Pubkey) {
    let (gw_pda, gw_bump) = game_world_pda();
    let (pp_pda, pp_bump) = prize_pool_pda();
    let gw = oxark::state::GameWorld {
        start_timestamp: 0,
        end_timestamp: i64::MAX,
        waitlist_close_timestamp: i64::MAX, // now < MAX → waitlist open
        total_participants: 0,
        total_prize_pool: 0,
        total_ops_revenue: 0,
        legendary_acquired_count: [0u8; 6],
        winner_60_count: 0,
        game_status: 0, // waitlist
        tier2_total_vault: 0,
        tier3_total_vault: 0,
        tier4_total_vault: 0,
        tier5_total_vault: 0,
        bump: gw_bump,
        ops_treasury,
        prize_pool: pp_pda,
        shop_phase_threshold_seconds: 0,
        legendary_drop_rate_phase1: 0,
        legendary_drop_rate_phase2: 0,
        rare_drop_rate_phase1: 0,
        rare_drop_rate_phase2: 0,
        uncommon_drop_rate: 0,
        max_vault: 0,
        max_vault_count: 0,
        finalize_processed: 0,
        finalize_cursor: Pubkey::default(),
        prize_pool_bump: pp_bump,
    };
    let mut buf = Vec::new();
    gw.try_serialize(&mut buf).unwrap();
    let lamports = svm.minimum_balance_for_rent_exemption(buf.len()) + 2_000_000;
    svm.airdrop(&gw_pda, lamports).unwrap();
    let mut acc = svm.get_account(&gw_pda).unwrap();
    acc.data = buf;
    acc.owner = oxark::id();
    svm.set_account(gw_pda, acc).unwrap();
    // prize_pool + ops_treasury are System-owned recipients of the 0.5 SOL deposit —
    // airdrop makes them exist (system-owned) so register's transfers land.
    svm.airdrop(&pp_pda, 1_000_000).unwrap();
    svm.airdrop(&ops_treasury, 1_000_000).unwrap();
}

fn register_ix(player: &Pubkey, ops_treasury: Pubkey) -> Instruction {
    let (player_state, _) = player_state_pda(player);
    let (game_world, _) = game_world_pda();
    let (prize_pool, _) = prize_pool_pda();
    Instruction::new_with_bytes(
        oxark::id(),
        &oxark::instruction::RegisterWaitlist {}.data(),
        oxark::accounts::RegisterWaitlist {
            player_state,
            game_world,
            prize_pool,
            ops_treasury,
            player: *player,
            system_program: solana_sdk_ids::system_program::id(),
        }
        .to_account_metas(None),
    )
}

fn refill_ix(player: &Pubkey, ops_treasury: Pubkey) -> Instruction {
    let (player_state, _) = player_state_pda(player);
    let (game_world, _) = game_world_pda();
    Instruction::new_with_bytes(
        oxark::id(),
        &oxark::instruction::RefillEnergy {}.data(),
        oxark::accounts::RefillEnergy {
            player: *player,
            player_state,
            game_world,
            ops_treasury,
            system_program: solana_sdk_ids::system_program::id(),
        }
        .to_account_metas(None),
    )
}

fn bootstrap() -> (LiteSVM, Keypair, Pubkey) {
    let mut svm = setup();
    let ops = Keypair::new().pubkey();
    craft_game_world(&mut svm, ops);
    let player = Keypair::new();
    svm.airdrop(&player.pubkey(), 2_000_000_000).unwrap(); // 0.5 deposit + fees
    (svm, player, ops)
}

#[test]
fn register_waitlist_persists_player_state_bump() {
    let (mut svm, player, ops) = bootstrap();
    send(&mut svm, register_ix(&player.pubkey(), ops), &[&player])
        .expect("register_waitlist must succeed");

    let (ps_pda, canonical_bump) = player_state_pda(&player.pubkey());
    let acc = svm.get_account(&ps_pda).expect("player_state must exist");
    let ps = oxark::state::PlayerState::try_deserialize(&mut &acc.data[..])
        .expect("player_state must deserialize");
    assert_ne!(ps.bump, 0, "regression: register_waitlist left player_state.bump = 0");
    assert_eq!(ps.bump, canonical_bump, "player_state.bump must be the canonical PDA bump");
}

#[test]
fn register_then_refill_energy_succeeds() {
    // The exact path that threw ConstraintSeeds(2006) before the fix: refill_energy
    // re-derives player_state with `bump = player_state.bump`.
    let (mut svm, player, ops) = bootstrap();
    send(&mut svm, register_ix(&player.pubkey(), ops), &[&player])
        .expect("register_waitlist must succeed");
    send(&mut svm, refill_ix(&player.pubkey(), ops), &[&player])
        .expect("refill_energy must succeed on register-created PlayerState (was 2006)");
}
