//! oxark-test-support (YKK-61) — shared litesvm test harness.
//!
//! Houses the canonical PDA finders (`find_*_pda`) and the Instruction-based
//! send family used by the integration tests in BOTH the `oxark` crate
//! (`programs/oxark/tests/`) and the `oxark-tests` package (`tests/`). Extracted
//! to end the per-file duplication of these helpers and the two divergent PDA
//! naming conventions (`game_pda*` vs `find_*_pda`) — see the audit / YKK-60 PR-C.
//!
//! Program id comes from `oxark::id()`, so the finders track the declared id
//! automatically. The seeds are byte-identical to the originals they replace.
//!
//! NOTE: the `oxark-tests` package also keeps its own Result-returning `send_ix`
//! (accounts/data/signers → Result) — a deliberately distinct API used by its
//! rejection tests — so it is NOT part of this crate. Only the `oxark` crate's
//! Instruction-based panic/Result send family lives here.

use litesvm::LiteSVM;
use solana_instruction::Instruction;
use solana_keypair::Keypair;
use solana_message::{Message, VersionedMessage};
use solana_pubkey::Pubkey;
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;

// ─── PDA finders (canonical `find_*_pda`; program id from `oxark::id()`) ───────

pub fn find_game_pda(game_id: u64) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"game", &game_id.to_le_bytes()], &oxark::id())
}

pub fn find_card_pool_pda(game_id: u64) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"card_pool", &game_id.to_le_bytes()], &oxark::id())
}

pub fn find_player_pda(game_id: u64, player: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"player", &game_id.to_le_bytes(), player.as_ref()],
        &oxark::id(),
    )
}

pub fn find_commit_pda(game_id: u64, round: u8, player: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"commit", &game_id.to_le_bytes(), &round.to_le_bytes(), player.as_ref()],
        &oxark::id(),
    )
}

pub fn find_duel_pda(duel_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"duel", duel_id.as_ref()], &oxark::id())
}

pub fn find_stake_vault_pda(game_id: u64) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"stake_vault", &game_id.to_le_bytes()], &oxark::id())
}

pub fn find_agent_pda(agent_id: u32) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"agent", &agent_id.to_le_bytes()], &oxark::id())
}

// ─── Instruction-based send family (litesvm) ──────────────────────────────────

pub fn send_ix(svm: &mut LiteSVM, ix: Instruction, payer: &Keypair) {
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[payer]).unwrap();
    svm.send_transaction(tx).unwrap();
}

pub fn send_ix_with_signers(svm: &mut LiteSVM, ix: Instruction, payer: &Keypair, signers: &[&Keypair]) {
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let mut all_signers: Vec<&Keypair> = vec![payer];
    all_signers.extend_from_slice(signers);
    let tx = VersionedTransaction::try_new(
        VersionedMessage::Legacy(msg),
        &all_signers
            .iter()
            .map(|k| *k as &dyn Signer)
            .collect::<Vec<_>>(),
    )
    .unwrap();
    svm.send_transaction(tx).unwrap();
}

pub fn send_ix_result(
    svm: &mut LiteSVM,
    ix: Instruction,
    payer: &Keypair,
) -> litesvm::types::TransactionResult {
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[payer]).unwrap();
    svm.send_transaction(tx)
}

pub fn send_ix_result_multi(
    svm: &mut LiteSVM,
    ix: Instruction,
    payer: &Keypair,
    extra_signers: &[&Keypair],
) -> litesvm::types::TransactionResult {
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let mut signers: Vec<&dyn Signer> = vec![payer];
    for s in extra_signers {
        signers.push(*s);
    }
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &signers).unwrap();
    svm.send_transaction(tx)
}
