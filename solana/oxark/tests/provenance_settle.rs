// Integration tests for the provenance-gate fix:
//   - settle_duel_history: trustless CardBattleHistory writes from a finished DuelState
//   - claim_timeout_win: stall-refusal guard
//   - promote_card gate: forged history is impossible, real duel wins promote
//   - update_card_battle_history: now ADMIN-gated (non-admin rejected)
//
// These craft DuelState / CardMintRecord PDAs directly (the same pattern the
// claim_prize_v2 tests use for GameWorld) so we can exercise settle/timeout logic
// deterministically without generating a valid Groth16 proof per round — the ZK
// commit→reveal path itself is covered by test_commit_hand_then_reveal_hand_roundtrip.

use {
    anchor_lang::{
        solana_program::instruction::Instruction, AccountDeserialize, AccountSerialize,
        InstructionData, ToAccountMetas,
    },
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_pubkey::Pubkey,
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

// ADMIN keypair seed is unknown (ADMIN_PUBKEY is a fixed const with no matching
// secret in-repo), so admin-signed *success* of update_card_battle_history can't
// be produced here — we assert the non-admin *rejection*, which is the security
// property. The happy path for history writes is settle_duel_history below.

fn setup() -> (LiteSVM, Keypair) {
    use solana_compute_budget::compute_budget::ComputeBudget;
    let payer = Keypair::new();
    let base = ComputeBudget::new_with_defaults(false, false);
    let budget = ComputeBudget {
        heap_size: 256 * 1024,
        compute_unit_limit: 1_400_000,
        ..base
    };
    let mut svm = LiteSVM::new().with_compute_budget(budget);
    let bytes = include_bytes!("../target/deploy/oxark.so");
    svm.add_program(oxark::id(), bytes).unwrap();
    svm.airdrop(&payer.pubkey(), 10_000_000_000).unwrap();
    (svm, payer)
}

fn send(svm: &mut LiteSVM, ix: Instruction, signers: &[&Keypair]) -> litesvm::types::TransactionResult {
    let payer = signers[0];
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let s: Vec<&dyn solana_signer::Signer> = signers.iter().map(|k| *k as &dyn solana_signer::Signer).collect();
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &s).unwrap();
    svm.send_transaction(tx)
}

fn duel_pda(id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"duel", id.as_ref()], &oxark::id())
}
fn mint_record_pda(mint: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"card_mint_record", mint.as_ref()], &oxark::id())
}
fn battle_history_pda(mint: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"card_battle_history", mint.as_ref()], &oxark::id())
}
fn settle_record_pda(id: &Pubkey, player: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"duel_settle", id.as_ref(), player.as_ref()], &oxark::id())
}

fn craft_owned(svm: &mut LiteSVM, addr: &Pubkey, data: Vec<u8>) {
    let lamports = svm.minimum_balance_for_rent_exemption(data.len()) + 2_000_000;
    svm.airdrop(addr, lamports).unwrap();
    let mut acc = svm.get_account(addr).unwrap();
    acc.data = data;
    acc.owner = oxark::id();
    svm.set_account(*addr, acc).unwrap();
}

/// Craft a finished DuelState: p1 wins, both revealed the given hands in round 1.
fn craft_finished_duel(
    svm: &mut LiteSVM,
    duel_id: &Pubkey,
    p1: &Pubkey,
    p2: &Pubkey,
    p1_cards: [u64; 10],
    p2_cards: [u64; 10],
    winner: Pubkey,
) {
    let (pda, bump) = duel_pda(duel_id);
    let mut d = oxark::state::DuelState::default();
    d.id = *duel_id;
    d.player_1 = *p1;
    d.player_2 = *p2;
    d.round = 3;
    d.started_at = 1_000;
    d.ended_at = 2_000; // finished
    d.winner = winner;
    d.bump = bump;
    d.player_1_revealed[0] = p1_cards;
    d.player_2_revealed[0] = p2_cards;
    d.last_progress_at = 2_000;
    let mut buf = Vec::new();
    d.try_serialize(&mut buf).unwrap();
    craft_owned(svm, &pda, buf);
}

/// Craft an OPEN duel stalled on `round`, with the given commit/reveal presence
/// flags for p1/p2, and last_progress_at set `stalled_secs` before `now_hint`.
#[allow(clippy::too_many_arguments)]
fn craft_open_duel(
    svm: &mut LiteSVM,
    duel_id: &Pubkey,
    p1: &Pubkey,
    p2: &Pubkey,
    round: u8,
    p1_commit: bool,
    p2_commit: bool,
    p1_reveal: bool,
    p2_reveal: bool,
    last_progress_at: i64,
) {
    let (pda, bump) = duel_pda(duel_id);
    let mut d = oxark::state::DuelState::default();
    d.id = *duel_id;
    d.player_1 = *p1;
    d.player_2 = *p2;
    d.round = round;
    d.started_at = 0;
    d.ended_at = 0;
    d.winner = Pubkey::default();
    d.bump = bump;
    let idx = (round - 1) as usize;
    if p1_commit {
        d.player_1_commitment[idx] = [7u8; 32];
    }
    if p2_commit {
        d.player_2_commitment[idx] = [9u8; 32];
    }
    if p1_reveal {
        d.player_1_revealed[idx] = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
    if p2_reveal {
        d.player_2_revealed[idx] = [2, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
    d.last_progress_at = last_progress_at;
    let mut buf = Vec::new();
    d.try_serialize(&mut buf).unwrap();
    craft_owned(svm, &pda, buf);
}

fn craft_mint_record(svm: &mut LiteSVM, mint: &Pubkey, card_id: u8, rarity: u8) {
    let (pda, bump) = mint_record_pda(mint);
    let rec = oxark::state::CardMintRecord {
        card_mint: *mint,
        card_id,
        rarity,
        bump,
    };
    let mut buf = Vec::new();
    rec.try_serialize(&mut buf).unwrap();
    craft_owned(svm, &pda, buf);
}

fn read_history(svm: &LiteSVM, mint: &Pubkey) -> oxark::state::CardBattleHistory {
    let (pda, _) = battle_history_pda(mint);
    let acc = svm.get_account(&pda).expect("history exists");
    let mut data: &[u8] = &acc.data;
    oxark::state::CardBattleHistory::try_deserialize(&mut data).expect("deserialize history")
}

fn settle_ix(duel_id: Pubkey, card_mint: Pubkey, player: &Pubkey) -> Instruction {
    let (duel, _) = duel_pda(&duel_id);
    let (settle, _) = settle_record_pda(&duel_id, player);
    let (record, _) = mint_record_pda(&card_mint);
    let (hist, _) = battle_history_pda(&card_mint);
    Instruction::new_with_bytes(
        oxark::id(),
        &oxark::instruction::SettleDuelHistory { duel_id, card_mint }.data(),
        oxark::accounts::SettleDuelHistory {
            duel,
            player: *player,
            settle_record: settle,
            card_mint_record: record,
            card_battle_history: hist,
            system_program: solana_sdk_ids::system_program::id(),
        }
        .to_account_metas(None),
    )
}

// ── settle_duel_history ───────────────────────────────────────────────────

#[test]
fn settle_credits_winner_and_is_idempotent() {
    let (mut svm, _payer) = setup();
    let p1 = Keypair::new();
    let p2 = Keypair::new();
    svm.airdrop(&p1.pubkey(), 5_000_000_000).unwrap();
    let duel_id = Pubkey::new_unique();
    let card_mint = Pubkey::new_unique();

    // p1 played card_id 12 and won.
    craft_finished_duel(
        &mut svm, &duel_id, &p1.pubkey(), &p2.pubkey(),
        [12, 5, 0, 0, 0, 0, 0, 0, 0, 0], [7, 3, 0, 0, 0, 0, 0, 0, 0, 0],
        p1.pubkey(),
    );
    craft_mint_record(&mut svm, &card_mint, 12, 0);

    send(&mut svm, settle_ix(duel_id, card_mint, &p1.pubkey()), &[&p1])
        .expect("winner settle should succeed");
    let h = read_history(&svm, &card_mint);
    assert_eq!(h.wins, 1, "winner card gets +1 win");
    assert_eq!(h.losses, 0);

    // Second settle of the same card for the same duel must be rejected.
    // Fresh blockhash so the identical retry is a distinct signature (not a
    // duplicate-tx rejection) and actually reaches the program's dedup check.
    svm.expire_blockhash();
    let dup = send(&mut svm, settle_ix(duel_id, card_mint, &p1.pubkey()), &[&p1]);
    let err = dup.expect_err("double settle must fail");
    assert!(
        err.meta.logs.iter().any(|l| l.contains("CardAlreadySettled")),
        "expected CardAlreadySettled, logs: {:?}", err.meta.logs
    );
    let h2 = read_history(&svm, &card_mint);
    assert_eq!(h2.wins, 1, "wins must not double");
}

#[test]
fn settle_credits_loser_and_rejects_non_participant() {
    let (mut svm, _payer) = setup();
    let p1 = Keypair::new();
    let p2 = Keypair::new();
    let outsider = Keypair::new();
    svm.airdrop(&p2.pubkey(), 5_000_000_000).unwrap();
    svm.airdrop(&outsider.pubkey(), 5_000_000_000).unwrap();
    let duel_id = Pubkey::new_unique();
    let card_mint = Pubkey::new_unique();

    // p1 wins; p2 played card_id 33 and lost.
    craft_finished_duel(
        &mut svm, &duel_id, &p1.pubkey(), &p2.pubkey(),
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0], [33, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        p1.pubkey(),
    );
    craft_mint_record(&mut svm, &card_mint, 33, 0);

    // Outsider cannot settle.
    let bad = send(&mut svm, settle_ix(duel_id, card_mint, &outsider.pubkey()), &[&outsider]);
    let err = bad.expect_err("non-participant must be rejected");
    assert!(
        err.meta.logs.iter().any(|l| l.contains("NotADuelParticipant")),
        "expected NotADuelParticipant, logs: {:?}", err.meta.logs
    );

    // p2 settles their loss.
    send(&mut svm, settle_ix(duel_id, card_mint, &p2.pubkey()), &[&p2])
        .expect("loser settle should succeed");
    let h = read_history(&svm, &card_mint);
    assert_eq!(h.losses, 1, "loser card gets +1 loss");
    assert_eq!(h.wins, 0);
}

#[test]
fn settle_rejects_card_not_in_revealed_hand() {
    let (mut svm, _payer) = setup();
    let p1 = Keypair::new();
    let p2 = Keypair::new();
    svm.airdrop(&p1.pubkey(), 5_000_000_000).unwrap();
    let duel_id = Pubkey::new_unique();
    let card_mint = Pubkey::new_unique();

    // p1's revealed hand is [1,5]; card_id 40 was never played.
    craft_finished_duel(
        &mut svm, &duel_id, &p1.pubkey(), &p2.pubkey(),
        [1, 5, 0, 0, 0, 0, 0, 0, 0, 0], [2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        p1.pubkey(),
    );
    craft_mint_record(&mut svm, &card_mint, 40, 0);

    let bad = send(&mut svm, settle_ix(duel_id, card_mint, &p1.pubkey()), &[&p1]);
    let err = bad.expect_err("card not in hand must be rejected");
    assert!(
        err.meta.logs.iter().any(|l| l.contains("CardNotInRevealedHand")),
        "expected CardNotInRevealedHand, logs: {:?}", err.meta.logs
    );
}

#[test]
fn settle_rejects_unfinished_duel() {
    let (mut svm, _payer) = setup();
    let p1 = Keypair::new();
    let p2 = Keypair::new();
    svm.airdrop(&p1.pubkey(), 5_000_000_000).unwrap();
    let duel_id = Pubkey::new_unique();
    let card_mint = Pubkey::new_unique();

    // Open duel (ended_at == 0), p1 revealed card 12.
    craft_open_duel(
        &mut svm, &duel_id, &p1.pubkey(), &p2.pubkey(),
        1, true, true, true, false, 5_000,
    );
    craft_mint_record(&mut svm, &card_mint, 1, 0);

    let bad = send(&mut svm, settle_ix(duel_id, card_mint, &p1.pubkey()), &[&p1]);
    let err = bad.expect_err("unfinished duel must be rejected");
    assert!(
        err.meta.logs.iter().any(|l| l.contains("DuelNotEnded")),
        "expected DuelNotEnded, logs: {:?}", err.meta.logs
    );
}

// ── promote_card gate: covered indirectly ───────────────────────────────────
//
// promote_card reads `CardBattleHistory.wins`. Its gate (`wins >= N`) is correct
// by inspection once that field is proven un-forgeable, which the tests here do:
//   - update_card_battle_history_rejects_non_admin: the forged-wins path is closed
//   - settle_credits_* : wins are only ever produced by a real finished DuelState
// An end-to-end promote_card success test needs a real SPL Mint + owner ATA in the
// VM (promote_card validates `Account<Mint>` + `associated_token::*` before the
// handler runs). That requires loading the SPL Token/ATA programs into litesvm —
// the same setup YKK-36 deferred for evolve_cards — so the promote_card e2e rides
// that same follow-up rather than being faked here.

// ── claim_timeout_win ───────────────────────────────────────────────────────

fn set_clock(svm: &mut LiteSVM, unix_ts: i64) {
    let mut clock: anchor_lang::solana_program::clock::Clock = svm.get_sysvar();
    clock.unix_timestamp = unix_ts;
    svm.set_sysvar(&clock);
}

fn timeout_ix(duel_id: Pubkey, claimant: &Pubkey) -> Instruction {
    let (duel, _) = duel_pda(&duel_id);
    Instruction::new_with_bytes(
        oxark::id(),
        &oxark::instruction::ClaimTimeoutWin { duel_id }.data(),
        oxark::accounts::ClaimTimeoutWin { duel, claimant: *claimant }.to_account_metas(None),
    )
}

#[test]
fn timeout_win_when_opponent_never_revealed() {
    let (mut svm, _payer) = setup();
    let p1 = Keypair::new();
    let p2 = Keypair::new();
    svm.airdrop(&p1.pubkey(), 5_000_000_000).unwrap();
    let duel_id = Pubkey::new_unique();

    // Round 1: both committed, p1 revealed, p2 did NOT. last progress at t=1000.
    craft_open_duel(
        &mut svm, &duel_id, &p1.pubkey(), &p2.pubkey(),
        1, true, true, true, false, 1_000,
    );
    // Now = 1000 + 600 = exactly the timeout boundary.
    set_clock(&mut svm, 1_600);

    send(&mut svm, timeout_ix(duel_id, &p1.pubkey()), &[&p1])
        .expect("p1 should claim timeout win");

    let (pda, _) = duel_pda(&duel_id);
    let acc = svm.get_account(&pda).unwrap();
    let mut data: &[u8] = &acc.data;
    let d = oxark::state::DuelState::try_deserialize(&mut data).unwrap();
    assert_eq!(d.winner, p1.pubkey(), "p1 wins the stalled duel");
    assert!(d.ended_at != 0, "duel is now ended");
}

#[test]
fn timeout_rejected_before_deadline() {
    let (mut svm, _payer) = setup();
    let p1 = Keypair::new();
    let p2 = Keypair::new();
    svm.airdrop(&p1.pubkey(), 5_000_000_000).unwrap();
    let duel_id = Pubkey::new_unique();

    craft_open_duel(
        &mut svm, &duel_id, &p1.pubkey(), &p2.pubkey(),
        1, true, true, true, false, 1_000,
    );
    set_clock(&mut svm, 1_599); // one second short

    let r = send(&mut svm, timeout_ix(duel_id, &p1.pubkey()), &[&p1]);
    let err = r.expect_err("must fail before deadline");
    assert!(
        err.meta.logs.iter().any(|l| l.contains("TimeoutNotReached")),
        "expected TimeoutNotReached, logs: {:?}", err.meta.logs
    );
}

#[test]
fn timeout_rejected_when_claimant_owes_the_reveal() {
    let (mut svm, _payer) = setup();
    let p1 = Keypair::new();
    let p2 = Keypair::new();
    svm.airdrop(&p1.pubkey(), 5_000_000_000).unwrap(); // p1 pays for its own (rejected) claim tx
    svm.airdrop(&p2.pubkey(), 5_000_000_000).unwrap();
    let duel_id = Pubkey::new_unique();

    // Both committed, p2 revealed, p1 did NOT. p1 is the staller, so p1 must not
    // be able to claim (they owe the reveal).
    craft_open_duel(
        &mut svm, &duel_id, &p1.pubkey(), &p2.pubkey(),
        1, true, true, false, true, 1_000,
    );
    set_clock(&mut svm, 5_000); // well past deadline

    let r = send(&mut svm, timeout_ix(duel_id, &p1.pubkey()), &[&p1]);
    let err = r.expect_err("staller must not claim");
    assert!(
        err.meta.logs.iter().any(|l| l.contains("OpponentNotStalled")),
        "expected OpponentNotStalled, logs: {:?}", err.meta.logs
    );

    // But p2 (who did their part) CAN claim against p1's missing reveal.
    send(&mut svm, timeout_ix(duel_id, &p2.pubkey()), &[&p2])
        .expect("p2 should claim against p1's missing reveal");
}

#[test]
fn timeout_rejected_on_mutual_stall() {
    let (mut svm, _payer) = setup();
    let p1 = Keypair::new();
    let p2 = Keypair::new();
    svm.airdrop(&p1.pubkey(), 5_000_000_000).unwrap();
    let duel_id = Pubkey::new_unique();

    // Neither committed round 1 → nobody has done their part → no timeout winner.
    craft_open_duel(
        &mut svm, &duel_id, &p1.pubkey(), &p2.pubkey(),
        1, false, false, false, false, 1_000,
    );
    set_clock(&mut svm, 5_000);

    let r = send(&mut svm, timeout_ix(duel_id, &p1.pubkey()), &[&p1]);
    let err = r.expect_err("mutual stall has no timeout winner");
    assert!(
        err.meta.logs.iter().any(|l| l.contains("OpponentNotStalled")),
        "expected OpponentNotStalled, logs: {:?}", err.meta.logs
    );
}

// ── update_card_battle_history: now ADMIN-gated ─────────────────────────────

#[test]
fn update_card_battle_history_rejects_non_admin() {
    let (mut svm, _payer) = setup();
    let attacker = Keypair::new();
    svm.airdrop(&attacker.pubkey(), 5_000_000_000).unwrap();
    let card_mint = Pubkey::new_unique();
    let (hist, _) = battle_history_pda(&card_mint);

    // Attacker tries to inject 10 wins to clear the promote gate for free.
    let ix = Instruction::new_with_bytes(
        oxark::id(),
        &oxark::instruction::UpdateCardBattleHistory {
            card_mint,
            wins_delta: 10,
            losses_delta: 0,
            kos_delta: 0,
            dmg_delta: 0,
            summon_delta: 0,
        }
        .data(),
        oxark::accounts::UpdateCardBattleHistory {
            card_battle_history: hist,
            admin: attacker.pubkey(),
            system_program: solana_sdk_ids::system_program::id(),
        }
        .to_account_metas(None),
    );
    let r = send(&mut svm, ix, &[&attacker]);
    let err = r.expect_err("non-admin update must be rejected");
    assert!(
        err.meta.logs.iter().any(|l| l.contains("NotAdmin")),
        "expected NotAdmin, logs: {:?}", err.meta.logs
    );
}
