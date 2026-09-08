//! Executes the freshly built SBF, not a JavaScript copy of the payout formula.
//! Admin success paths use LiteSVM signature-verification bypass ONLY in this
//! isolated test ledger. Signer/account constraints still run in the program.
use anchor_lang::prelude::Clock;
use anchor_lang::{AccountDeserialize, AccountSerialize, InstructionData, ToAccountMetas};
use litesvm::LiteSVM;
use oxark::state::{GameWorld, PlayerState};
use solana_instruction::{AccountMeta, Instruction};
use solana_keypair::Keypair;
use solana_message::{Message, VersionedMessage};
use solana_pubkey::Pubkey;
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;

fn world_key() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"game_world"], &oxark::id())
}
fn pool_key() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"prize_pool"], &oxark::id())
}
fn player_key(p: Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"player", p.as_ref()], &oxark::id()).0
}
fn put(svm: &mut LiteSVM, key: Pubkey, data: Vec<u8>) {
    svm.airdrop(
        &key,
        svm.minimum_balance_for_rent_exemption(data.len()) + 1_000_000,
    )
    .unwrap();
    let mut account = svm.get_account(&key).unwrap();
    account.owner = oxark::id();
    account.data = data;
    svm.set_account(key, account).unwrap();
}
fn bytes<T: AccountSerialize>(v: &T) -> Vec<u8> {
    let mut b = vec![];
    v.try_serialize(&mut b).unwrap();
    b
}
fn read_world(svm: &LiteSVM) -> GameWorld {
    GameWorld::try_deserialize(&mut svm.get_account(&world_key().0).unwrap().data.as_slice())
        .unwrap()
}
fn read_player(svm: &LiteSVM, p: Pubkey) -> PlayerState {
    PlayerState::try_deserialize(&mut svm.get_account(&player_key(p)).unwrap().data.as_slice())
        .unwrap()
}
fn set_time(svm: &mut LiteSVM, timestamp: i64) {
    let mut c: Clock = svm.get_sysvar();
    c.unix_timestamp = timestamp;
    svm.set_sysvar(&c);
}
fn setup() -> LiteSVM {
    let mut svm = LiteSVM::new().with_sigverify(false);
    svm.add_program(oxark::id(), include_bytes!("../target/deploy/oxark.so"))
        .unwrap();
    svm.airdrop(&oxark::constants::ADMIN_PUBKEY, 10_000_000_000)
        .unwrap();
    svm.airdrop(&pool_key().0, svm.minimum_balance_for_rent_exemption(0))
        .unwrap();
    set_time(&mut svm, 100);
    svm
}
fn run(svm: &mut LiteSVM, payer: Pubkey, ix: Instruction) -> litesvm::types::TransactionResult {
    svm.expire_blockhash();
    let message = Message::new_with_blockhash(&[ix], Some(&payer), &svm.latest_blockhash());
    let signatures = vec![Default::default(); message.header.num_required_signatures as usize];
    svm.send_transaction(VersionedTransaction {
        signatures,
        message: VersionedMessage::Legacy(message),
    })
}
fn ix(data: impl InstructionData, accounts: impl ToAccountMetas) -> Instruction {
    Instruction {
        program_id: oxark::id(),
        data: data.data(),
        accounts: accounts.to_account_metas(None),
    }
}
fn active_world(svm: &mut LiteSVM, n: u32) {
    let mut w = GameWorld::default();
    w.bump = world_key().1;
    w.prize_pool = pool_key().0;
    w.prize_pool_bump = pool_key().1;
    w.start_timestamp = 1;
    w.end_timestamp = 200;
    w.game_status = 1;
    w.total_participants = n;
    put(svm, world_key().0, bytes(&w));
}
fn player(svm: &mut LiteSVM, count: u8) -> Pubkey {
    let p = Keypair::new().pubkey();
    svm.airdrop(&p, 2_000_000_000).unwrap();
    let mut ps = PlayerState::default();
    ps.player = p;
    ps.deposit_amount = 500_000_000;
    for c in 1..=count {
        ps.set_vault_card(c);
    }
    put(svm, player_key(p), bytes(&ps));
    p
}
fn tally(svm: &mut LiteSVM, players: &[Pubkey]) -> litesvm::types::TransactionResult {
    let mut i = ix(
        oxark::instruction::FinalizeSeasonTally {
            players: players.to_vec(),
        },
        oxark::accounts::FinalizeSeasonTally {
            game_world: world_key().0,
            admin: oxark::constants::ADMIN_PUBKEY,
        },
    );
    i.accounts.extend(
        players
            .iter()
            .map(|p| AccountMeta::new_readonly(player_key(*p), false)),
    );
    run(svm, oxark::constants::ADMIN_PUBKEY, i)
}
fn end(svm: &mut LiteSVM) -> litesvm::types::TransactionResult {
    run(
        svm,
        oxark::constants::ADMIN_PUBKEY,
        ix(
            oxark::instruction::EndSeasonFinal {},
            oxark::accounts::EndSeasonFinal {
                game_world: world_key().0,
                admin: oxark::constants::ADMIN_PUBKEY,
                prize_pool: pool_key().0,
            },
        ),
    )
}
fn claim(svm: &mut LiteSVM, p: Pubkey) -> litesvm::types::TransactionResult {
    run(
        svm,
        p,
        ix(
            oxark::instruction::ClaimPrizeV2 {},
            oxark::accounts::ClaimPrizeV2 {
                player_state: player_key(p),
                game_world: world_key().0,
                prize_pool: pool_key().0,
                player: p,
                system_program: solana_sdk_ids::system_program::id(),
            },
        ),
    )
}

#[test]
fn full_settlement_snapshots_real_funds_and_pays_exact_amount_once() {
    let mut svm = setup();
    active_world(&mut svm, 2);
    let a = player(&mut svm, 60);
    let b = player(&mut svm, 50);
    let mut sorted = vec![a, b];
    sorted.sort();
    assert!(format!("{:?}", tally(&mut svm, &sorted).unwrap_err()).contains("SeasonNotDue"));
    set_time(&mut svm, 200);
    tally(&mut svm, &sorted[..1]).unwrap();
    assert!(format!("{:?}", end(&mut svm).unwrap_err()).contains("TallyIncomplete"));
    assert!(tally(&mut svm, &sorted[..1]).is_err());
    tally(&mut svm, &sorted[1..]).unwrap();
    // Previously unrecorded inflows must join the fixed allocation exactly once.
    svm.airdrop(&pool_key().0, 10_000_000_000).unwrap();
    end(&mut svm).unwrap();
    assert_eq!(read_world(&svm).total_prize_pool, 10_000_000_000);
    let before = svm.get_account(&pool_key().0).unwrap().lamports;
    claim(&mut svm, a).unwrap();
    assert_eq!(
        before - svm.get_account(&pool_key().0).unwrap().lamports,
        5_000_000_000
    );
    assert_eq!(read_player(&svm, a).deposit_amount, 0);
    assert!(format!("{:?}", claim(&mut svm, a).unwrap_err()).contains("NotRegistered"));
    let before = svm.get_account(&pool_key().0).unwrap().lamports;
    claim(&mut svm, b).unwrap();
    assert_eq!(
        before - svm.get_account(&pool_key().0).unwrap().lamports,
        2_500_000_000
    );
}

#[test]
fn underfunding_is_atomic_and_top_up_allows_full_retry() {
    let mut svm = setup();
    active_world(&mut svm, 1);
    let p = player(&mut svm, 60);
    set_time(&mut svm, 200);
    tally(&mut svm, &[p]).unwrap();
    svm.airdrop(&pool_key().0, 10_000_000_000).unwrap();
    end(&mut svm).unwrap();
    let mut pool = svm.get_account(&pool_key().0).unwrap();
    pool.lamports = 1_000_000_000;
    svm.set_account(pool_key().0, pool).unwrap();
    assert!(format!("{:?}", claim(&mut svm, p).unwrap_err()).contains("PrizeUnderfunded"));
    assert_eq!(read_player(&svm, p).deposit_amount, 500_000_000);
    assert_eq!(
        svm.get_account(&pool_key().0).unwrap().lamports,
        1_000_000_000
    );
    svm.airdrop(&pool_key().0, 5_000_000_000).unwrap();
    let before = svm.get_account(&pool_key().0).unwrap().lamports;
    claim(&mut svm, p).unwrap();
    assert_eq!(
        before - svm.get_account(&pool_key().0).unwrap().lamports,
        5_000_000_000
    );
}

#[test]
fn listing_cannot_change_collection_at_deadline_or_during_tally() {
    let mut svm = setup();
    active_world(&mut svm, 1);
    let p = player(&mut svm, 60);
    let listing = Pubkey::find_program_address(&[b"trade", p.as_ref(), &[1]], &oxark::id()).0;
    let create = || {
        ix(
            oxark::instruction::CreateListing {
                card_id: 1,
                price: 1_000_000,
            },
            oxark::accounts::CreateListing {
                seller: p,
                seller_state: player_key(p),
                listing,
                system_program: solana_sdk_ids::system_program::id(),
                game_world: world_key().0,
            },
        )
    };
    set_time(&mut svm, 200);
    assert!(format!("{:?}", run(&mut svm, p, create()).unwrap_err()).contains("CollectionFrozen"));
    assert_eq!(read_player(&svm, p).vault_count(), 60);
    set_time(&mut svm, 199);
    run(&mut svm, p, create()).unwrap();
    assert_eq!(read_player(&svm, p).vault_count(), 59);
    set_time(&mut svm, 200);
    tally(&mut svm, &[p]).unwrap();
    let cancel = || {
        ix(
            oxark::instruction::CancelListing { card_id: 1 },
            oxark::accounts::CancelListing {
                seller: p,
                seller_state: player_key(p),
                listing,
                game_world: world_key().0,
            },
        )
    };
    assert!(format!("{:?}", run(&mut svm, p, cancel()).unwrap_err()).contains("CollectionFrozen"));
    svm.airdrop(&pool_key().0, 2_000_000_000).unwrap();
    end(&mut svm).unwrap();
    claim(&mut svm, p).unwrap();
    run(&mut svm, p, cancel()).unwrap();
    assert_eq!(read_player(&svm, p).vault_count(), 60);
    assert!(claim(&mut svm, p).is_err());
}

#[test]
fn migration_preserves_participants_moves_only_recorded_funds_and_needs_legacy_signer() {
    let mut svm = setup();
    active_world(&mut svm, 3);
    let legacy = Keypair::new().pubkey();
    svm.airdrop(&legacy, 3_000_000_000).unwrap();
    let mut w = read_world(&svm);
    w.game_status = 0;
    w.total_prize_pool = 1_275_000_000;
    w.prize_pool = legacy;
    let mut old = bytes(&w);
    old.truncate(185);
    put(&mut svm, world_key().0, old.clone());
    let migration = || {
        ix(
            oxark::instruction::MigrateSeasonPrizes {},
            oxark::accounts::MigrateSeasonPrizes {
                game_world: world_key().0,
                admin: oxark::constants::ADMIN_PUBKEY,
                legacy_pool: legacy,
                prize_pool: pool_key().0,
                system_program: solana_sdk_ids::system_program::id(),
            },
        )
    };
    assert!(format!(
        "{:?}",
        run(&mut svm, oxark::constants::ADMIN_PUBKEY, migration()).unwrap_err()
    )
    .contains("Unauthorized"));
    assert_eq!(svm.get_account(&world_key().0).unwrap().data, old);
    let mut signed = migration();
    signed
        .accounts
        .iter_mut()
        .find(|a| a.pubkey == legacy)
        .unwrap()
        .is_signer = true;
    run(&mut svm, oxark::constants::ADMIN_PUBKEY, signed.clone()).unwrap();
    let after = read_world(&svm);
    assert_eq!(after.total_participants, 3);
    assert_eq!(after.total_prize_pool, 1_275_000_000);
    assert_eq!(after.prize_pool, pool_key().0);
    assert_eq!(after.prize_pool_bump, pool_key().1);
    assert_eq!(svm.get_account(&legacy).unwrap().lamports, 1_725_000_000);
    assert_eq!(
        svm.get_account(&world_key().0).unwrap().data.len(),
        GameWorld::SIZE
    );
    assert!(run(&mut svm, oxark::constants::ADMIN_PUBKEY, signed).is_err());
    assert_eq!(svm.get_account(&legacy).unwrap().lamports, 1_725_000_000);
}

#[test]
fn pack_revenue_is_recorded_and_purchases_freeze_at_deadline() {
    let mut svm = setup();
    active_world(&mut svm, 1);
    let p = player(&mut svm, 5);
    let ops = Keypair::new().pubkey();
    svm.airdrop(&ops, 1_000_000).unwrap();
    let mut w = read_world(&svm);
    w.ops_treasury = ops;
    put(&mut svm, world_key().0, bytes(&w));
    let slot_key = Pubkey::new_from_array(oxark::constants::SLOT_HASHES_ID_BYTES);
    // A correctly addressed SlotHashes fixture with a count/slot/hash entry.
    svm.airdrop(&slot_key, 1_000_000).unwrap();
    let mut slots = svm.get_account(&slot_key).unwrap();
    slots.data = vec![0; 48];
    slots.data[..8].copy_from_slice(&1u64.to_le_bytes());
    slots.data[16..].fill(42);
    svm.set_account(slot_key, slots).unwrap();
    let buy = || {
        ix(
            oxark::instruction::BuyPack { pack_type: 0 },
            oxark::accounts::BuyPack {
                buyer: p,
                player_state: player_key(p),
                game_world: world_key().0,
                ops_treasury: ops,
                prize_pool: pool_key().0,
                slot_hashes: slot_key,
                system_program: solana_sdk_ids::system_program::id(),
            },
        )
    };
    let before = svm.get_account(&pool_key().0).unwrap().lamports;
    run(&mut svm, p, buy()).unwrap();
    let w = read_world(&svm);
    assert_eq!(w.total_prize_pool, 25_000_000);
    assert_eq!(w.total_ops_revenue, 25_000_000);
    assert_eq!(
        svm.get_account(&pool_key().0).unwrap().lamports - before,
        25_000_000
    );
    set_time(&mut svm, 200);
    let before = bytes(&read_player(&svm, p));
    assert!(format!("{:?}", run(&mut svm, p, buy()).unwrap_err()).contains("CollectionFrozen"));
    assert_eq!(bytes(&read_player(&svm, p)), before);
    assert_eq!(read_world(&svm).total_prize_pool, 25_000_000);
}

#[test]
fn invalid_migration_and_unregistered_tally_leave_state_unchanged() {
    let mut svm = setup();
    active_world(&mut svm, 1);
    let p = player(&mut svm, 60);
    let mut ps = read_player(&svm, p);
    ps.deposit_amount = 0;
    put(&mut svm, player_key(p), bytes(&ps));
    set_time(&mut svm, 200);
    assert!(format!("{:?}", tally(&mut svm, &[p]).unwrap_err()).contains("NotRegistered"));
    assert_eq!(read_world(&svm).finalize_processed, 0);
    let mut w = read_world(&svm);
    w.game_status = 2;
    let mut old = bytes(&w);
    old.truncate(185);
    put(&mut svm, world_key().0, old.clone());
    let migration = ix(
        oxark::instruction::MigrateSeasonPrizes {},
        oxark::accounts::MigrateSeasonPrizes {
            game_world: world_key().0,
            admin: oxark::constants::ADMIN_PUBKEY,
            legacy_pool: pool_key().0,
            prize_pool: pool_key().0,
            system_program: solana_sdk_ids::system_program::id(),
        },
    );
    assert!(format!(
        "{:?}",
        run(&mut svm, oxark::constants::ADMIN_PUBKEY, migration).unwrap_err()
    )
    .contains("InvalidSeasonMigration"));
    assert_eq!(svm.get_account(&world_key().0).unwrap().data, old);
}

#[test]
fn zero_entitlement_can_recover_escrow_without_creating_a_claim() {
    let mut svm = setup();
    active_world(&mut svm, 1);
    let p = player(&mut svm, 1);
    let listing = Pubkey::find_program_address(&[b"trade", p.as_ref(), &[1]], &oxark::id()).0;
    run(
        &mut svm,
        p,
        ix(
            oxark::instruction::CreateListing {
                card_id: 1,
                price: 1_000_000,
            },
            oxark::accounts::CreateListing {
                seller: p,
                seller_state: player_key(p),
                listing,
                system_program: solana_sdk_ids::system_program::id(),
                game_world: world_key().0,
            },
        ),
    )
    .unwrap();
    set_time(&mut svm, 200);
    tally(&mut svm, &[p]).unwrap();
    end(&mut svm).unwrap();
    run(
        &mut svm,
        p,
        ix(
            oxark::instruction::CancelListing { card_id: 1 },
            oxark::accounts::CancelListing {
                seller: p,
                seller_state: player_key(p),
                listing,
                game_world: world_key().0,
            },
        ),
    )
    .unwrap();
    assert_eq!(read_player(&svm, p).vault_count(), 1);
    assert_eq!(read_player(&svm, p).deposit_amount, 0);
    assert!(claim(&mut svm, p).is_err());
}
