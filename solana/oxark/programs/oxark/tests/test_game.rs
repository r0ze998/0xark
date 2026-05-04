use {
    anchor_lang::{
        solana_program::instruction::Instruction, InstructionData, ToAccountMetas,
    },
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
    sha2::{Sha256, Digest},
};

// ── ZK proof byte arrays (generated from circuits/*/build/proof.json) ─────────
// Encoding: G1 = x_BE||y_BE (64 bytes); G2 = x_re_BE||x_im_BE||y_re_BE||y_im_BE (128 bytes)
// EIP-197 real-first ordering for G2 (opposite of snarkjs JSON [[x_im,x_re]...])

// dungeon_position circuit (625 constraints)
const PROOF_DM_A: [u8; 64] = [
    0x06, 0x21, 0x53, 0x4d, 0xbb, 0x5a, 0xbc, 0x38, 0xfa, 0x10, 0xd6, 0xb1, 0x1e, 0x64, 0x06, 0x4b,
    0xde, 0xd6, 0x0e, 0xe9, 0x6d, 0x85, 0x0f, 0x68, 0xd7, 0x60, 0x0d, 0x53, 0x61, 0x66, 0x77, 0xb0,
    0x0a, 0x1e, 0xb7, 0x0d, 0xeb, 0xbb, 0x75, 0x8e, 0xa8, 0xb7, 0xa8, 0xa6, 0x91, 0xd3, 0xbc, 0xaf,
    0xb0, 0x5a, 0xa2, 0x1b, 0x9f, 0x13, 0xa4, 0xaa, 0x03, 0x1c, 0x98, 0xce, 0xf0, 0x02, 0xa3, 0x12,
];
const PROOF_DM_B: [u8; 128] = [
    0x1d, 0x3a, 0x82, 0xe9, 0xeb, 0x2e, 0xec, 0x6d, 0xbe, 0xb3, 0x12, 0xe7, 0x0a, 0xf6, 0x4a, 0x71,
    0xa8, 0xfa, 0x24, 0xa6, 0x10, 0x96, 0x1a, 0x29, 0xc2, 0x87, 0x50, 0x5d, 0xbd, 0xa8, 0xcc, 0xc1,
    0x02, 0x63, 0xe6, 0x16, 0xd5, 0xc9, 0xcf, 0x7c, 0xd5, 0x78, 0x39, 0x36, 0xea, 0xb7, 0x4d, 0xbb,
    0x46, 0xcd, 0x06, 0xfb, 0x40, 0xb0, 0x7b, 0x14, 0x76, 0xd1, 0x11, 0x89, 0x78, 0x9a, 0x03, 0x70,
    0x1c, 0x55, 0x92, 0xde, 0x9f, 0x63, 0xab, 0x95, 0xd0, 0x06, 0xfe, 0x9b, 0x11, 0xff, 0xbb, 0xd0,
    0x44, 0x4d, 0xc2, 0x5e, 0x9c, 0x1f, 0x45, 0xc5, 0x32, 0xdd, 0x3e, 0xec, 0xe9, 0x1a, 0xde, 0x8d,
    0x01, 0xcf, 0x89, 0x33, 0xc5, 0xb4, 0x35, 0x48, 0xbc, 0x6a, 0x56, 0xbb, 0xe9, 0xf0, 0xc2, 0x08,
    0x9f, 0x5e, 0xec, 0xd6, 0x92, 0xef, 0x1f, 0x05, 0xd0, 0x07, 0x1f, 0x1a, 0xca, 0x89, 0x6c, 0xd4,
];
const PROOF_DM_C: [u8; 64] = [
    0x23, 0x2e, 0x09, 0x2a, 0x2f, 0x39, 0x9d, 0x66, 0xd6, 0x8c, 0x01, 0x23, 0x23, 0x80, 0x1c, 0x19,
    0x45, 0x94, 0x92, 0x9d, 0x14, 0x5e, 0xa3, 0xce, 0x0d, 0x01, 0xca, 0x73, 0xaf, 0x7b, 0xd5, 0x6e,
    0x25, 0xf7, 0x07, 0x64, 0xe4, 0xf8, 0xf6, 0x05, 0x50, 0x25, 0xfa, 0x79, 0x79, 0xc8, 0x4a, 0x92,
    0x93, 0x5f, 0x98, 0x80, 0x13, 0xd1, 0x5c, 0xb7, 0xaa, 0x5a, 0x60, 0x44, 0xcd, 0xc3, 0xb1, 0x18,
];
// public[0] = old_commitment = 4493193737375249868515347432860810969140867202363742203298502554108550134423
const PUBLIC_DM_OLD: [u8; 32] = [
    0x09, 0xef, 0x0e, 0xba, 0x78, 0x12, 0x02, 0x3b, 0xe0, 0xd7, 0x6b, 0xca, 0xc4, 0x37, 0xa0, 0xa7,
    0x4b, 0x72, 0xd7, 0xd3, 0xf0, 0x04, 0xd3, 0x15, 0x74, 0x36, 0x13, 0x67, 0x11, 0xd3, 0x3a, 0x97,
];
// public[1] = new_commitment = 18052127481429945192058376372470398440470043119119312788628425142576310732002
const PUBLIC_DM_NEW: [u8; 32] = [
    0x27, 0xe9, 0x24, 0x5e, 0xdf, 0x02, 0xa0, 0x42, 0xe0, 0x93, 0xe1, 0xa6, 0x57, 0x6c, 0x0e, 0x93,
    0x1a, 0x93, 0x47, 0x53, 0xf7, 0xfd, 0x19, 0xd5, 0xb3, 0xc4, 0xaa, 0x91, 0x65, 0xb5, 0x44, 0xe2,
];
const PROOF_DM_A_BAD: [u8; 64] = [
    0xf9, 0x21, 0x53, 0x4d, 0xbb, 0x5a, 0xbc, 0x38, 0xfa, 0x10, 0xd6, 0xb1, 0x1e, 0x64, 0x06, 0x4b,
    0xde, 0xd6, 0x0e, 0xe9, 0x6d, 0x85, 0x0f, 0x68, 0xd7, 0x60, 0x0d, 0x53, 0x61, 0x66, 0x77, 0xb0,
    0x0a, 0x1e, 0xb7, 0x0d, 0xeb, 0xbb, 0x75, 0x8e, 0xa8, 0xb7, 0xa8, 0xa6, 0x91, 0xd3, 0xbc, 0xaf,
    0xb0, 0x5a, 0xa2, 0x1b, 0x9f, 0x13, 0xa4, 0xaa, 0x03, 0x1c, 0x98, 0xce, 0xf0, 0x02, 0xa3, 0x12,
];

// commit_reveal circuit (277 constraints) — input: actionType=2, targetArea=1, salt=12345678901234567890123456789012
// Proof generated with fresh pot12 trusted setup (zkey regenerated; VK in verify_zk_proof.rs updated to match)
const PROOF_CR_A: [u8; 64] = [
    20,21,113,24,5,43,114,72,116,241,3,169,169,45,174,204,
    246,215,186,43,32,236,219,6,158,47,206,161,143,32,66,161,
    0,46,43,253,47,158,23,143,68,149,89,23,1,246,185,177,
    23,174,5,178,109,25,32,127,182,107,33,162,54,124,59,51,
];
const PROOF_CR_B: [u8; 128] = [
    17,158,72,20,86,162,118,73,205,227,150,176,150,212,60,46,
    180,50,79,194,186,176,64,48,43,18,31,254,176,130,186,3,
    4,102,38,151,103,56,246,85,38,215,215,167,232,154,97,19,
    89,135,160,238,214,39,78,104,40,23,124,215,204,220,162,121,
    2,1,125,233,118,180,1,67,43,131,158,159,6,12,9,249,
    70,84,77,165,116,153,232,221,96,218,124,61,17,124,69,80,
    15,18,74,108,175,123,67,167,30,202,105,37,237,13,106,145,
    185,83,101,178,136,47,95,229,188,102,217,151,152,173,219,101,
];
const PROOF_CR_C: [u8; 64] = [
    42,163,66,88,82,44,191,185,184,93,226,178,135,193,79,134,
    100,209,200,104,187,189,40,47,246,203,12,156,203,111,132,232,
    45,190,100,178,86,24,9,48,95,140,216,90,27,143,131,79,
    73,14,186,188,110,251,89,140,134,215,101,164,246,108,183,72,
];
// commitHash = Poseidon(2, 1, 12345678901234567890123456789012) = 18900108544938186552350079369873888314453412378062376133398837163123226377055
const PUBLIC_CR_HASH: [u8; 32] = [
    41,201,21,20,162,172,152,196,113,91,6,84,21,1,203,227,
    176,240,18,226,247,243,201,204,107,155,114,150,225,142,251,95,
];
const PROOF_CR_A_BAD: [u8; 64] = [
    235,21,113,24,5,43,114,72,116,241,3,169,169,45,174,204,
    246,215,186,43,32,236,219,6,158,47,206,161,143,32,66,161,
    0,46,43,253,47,158,23,143,68,149,89,23,1,246,185,177,
    23,174,5,178,109,25,32,127,182,107,33,162,54,124,59,51,
];

// hand_commitment circuit (576 constraints) — input: cards=[1,5,23,47,2,...], round=1, pubkey_lo/hi example
const PROOF_HC_A: [u8; 64] = [
    0x29, 0x2a, 0x8f, 0x29, 0x7d, 0x00, 0x45, 0xef, 0xc0, 0xf6, 0x80, 0x39, 0xa8, 0x1e, 0xf1, 0x7e,
    0x1c, 0x18, 0xbe, 0x9b, 0x49, 0x40, 0x29, 0x6a, 0x2f, 0x6d, 0x5a, 0x8b, 0x63, 0x3d, 0x78, 0xfd,
    0x19, 0xd2, 0xa2, 0x8e, 0x83, 0x73, 0x08, 0xdc, 0x7d, 0xa1, 0x97, 0x35, 0xb7, 0xb3, 0x30, 0xda,
    0xe4, 0x4b, 0xf5, 0x10, 0x9b, 0xb4, 0xc3, 0xc5, 0xb4, 0x00, 0x90, 0xc9, 0xce, 0x16, 0xd9, 0x1d,
];
const PROOF_HC_B: [u8; 128] = [
    0x0b, 0x6a, 0x3e, 0x52, 0x5b, 0xed, 0x59, 0x81, 0xf7, 0x87, 0xef, 0x56, 0x9b, 0xee, 0xef, 0x15,
    0x6f, 0x29, 0x07, 0xda, 0xa2, 0x29, 0x7a, 0xfa, 0xfb, 0xfa, 0x17, 0x7e, 0xdf, 0xe8, 0xe9, 0x3f,
    0x18, 0x05, 0x79, 0x9d, 0x31, 0x5e, 0xac, 0x3e, 0x79, 0xd0, 0x06, 0x79, 0xed, 0x83, 0xab, 0xf0,
    0x9a, 0xe2, 0x0a, 0xdc, 0x05, 0xd0, 0x56, 0x75, 0x7c, 0x7f, 0x37, 0xc9, 0x10, 0x3d, 0xc9, 0x56,
    0x00, 0x26, 0x8b, 0xb4, 0x98, 0xd7, 0xd1, 0xe6, 0xab, 0xfa, 0x5a, 0xc0, 0x14, 0x14, 0x52, 0xda,
    0x37, 0x57, 0x5d, 0x46, 0x53, 0x93, 0xab, 0xce, 0x86, 0x14, 0x4c, 0xad, 0xb0, 0xdd, 0x27, 0xd6,
    0x15, 0xa9, 0xfa, 0x73, 0x79, 0x86, 0xa6, 0x13, 0xb7, 0x7c, 0xd7, 0x78, 0xd7, 0x4b, 0x21, 0x0f,
    0xee, 0x5f, 0xe8, 0xbb, 0xe2, 0xe4, 0x82, 0x27, 0x84, 0xf0, 0x19, 0x93, 0x4e, 0xeb, 0x14, 0xce,
];
const PROOF_HC_C: [u8; 64] = [
    0x0c, 0x2e, 0xc8, 0x34, 0x8e, 0x43, 0x70, 0x58, 0xfe, 0x5c, 0x0a, 0x41, 0xb3, 0x05, 0xbb, 0x93,
    0x66, 0x23, 0x81, 0x17, 0x3b, 0x9c, 0x60, 0xe6, 0xee, 0x67, 0x0e, 0x05, 0x6b, 0x5d, 0x7a, 0xf4,
    0x0b, 0xd2, 0x7b, 0x96, 0xd4, 0x80, 0x16, 0xcc, 0x81, 0x28, 0xb6, 0x6c, 0xa4, 0x58, 0x46, 0x1e,
    0x1e, 0x1b, 0xff, 0x1d, 0xa5, 0x0f, 0xa9, 0x6c, 0x8a, 0xbb, 0x13, 0x2f, 0xe0, 0x77, 0xe0, 0xb4,
];
// public_signals: [commitment, round=1, pubkey_lo=147573952589676412927, pubkey_hi=295147905179352825855]
const PUBLIC_HC_COMMITMENT: [u8; 32] = [
    0x16, 0x54, 0x76, 0x26, 0xec, 0xae, 0x34, 0x41, 0x48, 0xf3, 0xbb, 0x41, 0x1d, 0xbe, 0xc7, 0x9c,
    0xf1, 0xf0, 0xd5, 0x48, 0x2a, 0xe0, 0x63, 0xef, 0x0a, 0xab, 0xe5, 0xab, 0x4e, 0x14, 0xfe, 0x65,
];
const PUBLIC_HC_ROUND: [u8; 32] = [
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
];
const PUBLIC_HC_PUBKEY_LO: [u8; 32] = [
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x07, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
];
const PUBLIC_HC_PUBKEY_HI: [u8; 32] = [
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
];
const PROOF_HC_A_BAD: [u8; 64] = [
    0xd6, 0x2a, 0x8f, 0x29, 0x7d, 0x00, 0x45, 0xef, 0xc0, 0xf6, 0x80, 0x39, 0xa8, 0x1e, 0xf1, 0x7e,
    0x1c, 0x18, 0xbe, 0x9b, 0x49, 0x40, 0x29, 0x6a, 0x2f, 0x6d, 0x5a, 0x8b, 0x63, 0x3d, 0x78, 0xfd,
    0x19, 0xd2, 0xa2, 0x8e, 0x83, 0x73, 0x08, 0xdc, 0x7d, 0xa1, 0x97, 0x35, 0xb7, 0xb3, 0x30, 0xda,
    0xe4, 0x4b, 0xf5, 0x10, 0x9b, 0xb4, 0xc3, 0xc5, 0xb4, 0x00, 0x90, 0xc9, 0xce, 0x16, 0xd9, 0x1d,
];

fn setup() -> (LiteSVM, Keypair) {
    let program_id = oxark::id();
    let payer = Keypair::new();
    let mut svm = LiteSVM::new();
    let bytes = include_bytes!("../../../target/deploy/oxark.so");
    svm.add_program(program_id, bytes).unwrap();
    svm.airdrop(&payer.pubkey(), 10_000_000_000).unwrap();
    (svm, payer)
}

fn send_ix(svm: &mut LiteSVM, ix: Instruction, payer: &Keypair) {
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[payer]).unwrap();
    svm.send_transaction(tx).unwrap();
}

fn send_ix_with_signers(svm: &mut LiteSVM, ix: Instruction, payer: &Keypair, signers: &[&Keypair]) {
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let mut all_signers: Vec<&Keypair> = vec![payer];
    all_signers.extend_from_slice(signers);
    let tx = VersionedTransaction::try_new(
        VersionedMessage::Legacy(msg),
        &all_signers.iter().map(|k| *k as &dyn solana_signer::Signer).collect::<Vec<_>>(),
    )
    .unwrap();
    svm.send_transaction(tx).unwrap();
}

fn game_pda(game_id: u64) -> (solana_pubkey::Pubkey, u8) {
    solana_pubkey::Pubkey::find_program_address(
        &[b"game", &game_id.to_le_bytes()],
        &oxark::id(),
    )
}

fn card_pool_pda(game_id: u64) -> (solana_pubkey::Pubkey, u8) {
    solana_pubkey::Pubkey::find_program_address(
        &[b"card_pool", &game_id.to_le_bytes()],
        &oxark::id(),
    )
}

fn player_pda(game_id: u64, player: &solana_pubkey::Pubkey) -> (solana_pubkey::Pubkey, u8) {
    solana_pubkey::Pubkey::find_program_address(
        &[b"player", &game_id.to_le_bytes(), player.as_ref()],
        &oxark::id(),
    )
}

fn commit_pda(game_id: u64, round: u8, player: &solana_pubkey::Pubkey) -> (solana_pubkey::Pubkey, u8) {
    solana_pubkey::Pubkey::find_program_address(
        &[b"commit", &game_id.to_le_bytes(), &round.to_le_bytes(), player.as_ref()],
        &oxark::id(),
    )
}

fn duel_pda(duel_id: &solana_pubkey::Pubkey) -> (solana_pubkey::Pubkey, u8) {
    solana_pubkey::Pubkey::find_program_address(
        &[b"duel", duel_id.as_ref()],
        &oxark::id(),
    )
}

fn send_ix_result(
    svm: &mut LiteSVM,
    ix: Instruction,
    payer: &Keypair,
) -> litesvm::types::TransactionResult {
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[payer]).unwrap();
    svm.send_transaction(tx)
}

fn send_ix_result_multi(
    svm: &mut LiteSVM,
    ix: Instruction,
    payer: &Keypair,
    extra_signers: &[&Keypair],
) -> litesvm::types::TransactionResult {
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let mut signers: Vec<&dyn solana_signer::Signer> = vec![payer];
    for s in extra_signers { signers.push(*s); }
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &signers).unwrap();
    svm.send_transaction(tx)
}

#[test]
fn test_create_game() {
    let (mut svm, host) = setup();
    let game_id: u64 = 1;
    let (game_pda, _) = game_pda(game_id);
    let (pool_pda, _) = card_pool_pda(game_id);

    let ix = Instruction::new_with_bytes(
        oxark::id(),
        &oxark::instruction::CreateGame {
            game_id,
            max_players: 3,
        }
        .data(),
        oxark::accounts::CreateGame {
            game: game_pda,
            card_pool: pool_pda,
            host: host.pubkey(),
            system_program: solana_sdk_ids::system_program::id(),
        }
        .to_account_metas(None),
    );

    send_ix(&mut svm, ix, &host);

    // Verify game account
    let game_data = svm.get_account(&game_pda).unwrap();
    assert!(game_data.lamports > 0, "Game account should exist");
}

#[test]
fn test_join_game() {
    let (mut svm, host) = setup();
    let player2 = Keypair::new();
    svm.airdrop(&player2.pubkey(), 10_000_000_000).unwrap();

    let game_id: u64 = 1;
    let (game_pda, _) = game_pda(game_id);
    let (pool_pda, _) = card_pool_pda(game_id);

    // Create game
    let create_ix = Instruction::new_with_bytes(
        oxark::id(),
        &oxark::instruction::CreateGame { game_id, max_players: 2 }.data(),
        oxark::accounts::CreateGame {
            game: game_pda,
            card_pool: pool_pda,
            host: host.pubkey(),
            system_program: solana_sdk_ids::system_program::id(),
        }
        .to_account_metas(None),
    );
    send_ix(&mut svm, create_ix, &host);

    // Host joins
    let (host_player_pda, _) = player_pda(game_id, &host.pubkey());
    let join_ix1 = Instruction::new_with_bytes(
        oxark::id(),
        &oxark::instruction::JoinGame { game_id }.data(),
        oxark::accounts::JoinGame {
            game: game_pda,
            player_state: host_player_pda,
            player: host.pubkey(),
            system_program: solana_sdk_ids::system_program::id(),
        }
        .to_account_metas(None),
    );
    send_ix(&mut svm, join_ix1, &host);

    // Player 2 joins
    let (p2_player_pda, _) = player_pda(game_id, &player2.pubkey());
    let join_ix2 = Instruction::new_with_bytes(
        oxark::id(),
        &oxark::instruction::JoinGame { game_id }.data(),
        oxark::accounts::JoinGame {
            game: game_pda,
            player_state: p2_player_pda,
            player: player2.pubkey(),
            system_program: solana_sdk_ids::system_program::id(),
        }
        .to_account_metas(None),
    );
    send_ix(&mut svm, join_ix2, &player2);

    // Verify player accounts exist
    let p1_data = svm.get_account(&host_player_pda).unwrap();
    let p2_data = svm.get_account(&p2_player_pda).unwrap();
    assert!(p1_data.lamports > 0);
    assert!(p2_data.lamports > 0);
}

#[test]
fn test_create_and_start_game() {
    let (mut svm, host) = setup();
    let player2 = Keypair::new();
    svm.airdrop(&player2.pubkey(), 10_000_000_000).unwrap();

    let game_id: u64 = 1;
    let (game_key, _) = game_pda(game_id);
    let (pool_key, _) = card_pool_pda(game_id);

    // Create
    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::CreateGame { game_id, max_players: 2 }.data(),
            oxark::accounts::CreateGame {
                game: game_key,
                card_pool: pool_key,
                host: host.pubkey(),
                system_program: solana_sdk_ids::system_program::id(),
            }
            .to_account_metas(None),
        ),
        &host,
    );

    // Join host
    let (hp, _) = player_pda(game_id, &host.pubkey());
    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::JoinGame { game_id }.data(),
            oxark::accounts::JoinGame {
                game: game_key,
                player_state: hp,
                player: host.pubkey(),
                system_program: solana_sdk_ids::system_program::id(),
            }
            .to_account_metas(None),
        ),
        &host,
    );

    // Join player2
    let (p2p, _) = player_pda(game_id, &player2.pubkey());
    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::JoinGame { game_id }.data(),
            oxark::accounts::JoinGame {
                game: game_key,
                player_state: p2p,
                player: player2.pubkey(),
                system_program: solana_sdk_ids::system_program::id(),
            }
            .to_account_metas(None),
        ),
        &player2,
    );

    // Start game — pass player states as remaining accounts
    let mut start_accounts = oxark::accounts::StartGame {
        game: game_key,
        card_pool: pool_key,
        host: host.pubkey(),
    }
    .to_account_metas(None);
    // Add remaining accounts (player PDAs, writable)
    start_accounts.push(solana_instruction::AccountMeta::new(hp, false));
    start_accounts.push(solana_instruction::AccountMeta::new(p2p, false));

    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::StartGame { game_id }.data(),
            start_accounts,
        ),
        &host,
    );

    // Game should now be in CommitPhase — verify game account exists and has been modified
    let game_data = svm.get_account(&game_key).unwrap();
    assert!(game_data.lamports > 0, "Game should exist after start");
}

#[test]
fn test_commit_action() {
    let (mut svm, host) = setup();
    let player2 = Keypair::new();
    svm.airdrop(&player2.pubkey(), 10_000_000_000).unwrap();

    let game_id: u64 = 42;
    let (game_key, _) = game_pda(game_id);
    let (pool_key, _) = card_pool_pda(game_id);
    let (hp, _) = player_pda(game_id, &host.pubkey());
    let (p2p, _) = player_pda(game_id, &player2.pubkey());

    // Create + Join + Join + Start
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::CreateGame { game_id, max_players: 2 }.data(),
        oxark::accounts::CreateGame { game: game_key, card_pool: pool_key, host: host.pubkey(), system_program: solana_sdk_ids::system_program::id() }.to_account_metas(None)), &host);
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::JoinGame { game_id }.data(),
        oxark::accounts::JoinGame { game: game_key, player_state: hp, player: host.pubkey(), system_program: solana_sdk_ids::system_program::id() }.to_account_metas(None)), &host);
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::JoinGame { game_id }.data(),
        oxark::accounts::JoinGame { game: game_key, player_state: p2p, player: player2.pubkey(), system_program: solana_sdk_ids::system_program::id() }.to_account_metas(None)), &player2);
    let mut sa = oxark::accounts::StartGame { game: game_key, card_pool: pool_key, host: host.pubkey() }.to_account_metas(None);
    sa.push(solana_instruction::AccountMeta::new(hp, false));
    sa.push(solana_instruction::AccountMeta::new(p2p, false));
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::StartGame { game_id }.data(), sa), &host);

    // Now in CommitPhase (round 1). Commit action for host.
    let round: u8 = 1;
    let hash = [0u8; 32]; // dummy hash for testing
    let (commit_pda, _) = commit_pda(game_id, round, &host.pubkey());

    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::CommitAction { game_id, hash, phase: 0, played_cards: vec![] }.data(),
        oxark::accounts::CommitActionCtx {
            game: game_key,
            player_state: hp,
            commit: commit_pda,
            player: host.pubkey(),
            system_program: solana_sdk_ids::system_program::id(),
        }.to_account_metas(None)), &host);

    // Verify commit account exists
    let commit_data = svm.get_account(&commit_pda).unwrap();
    assert!(commit_data.lamports > 0, "Commit should exist");
}

/// Helper: compute SHA256 hash matching on-chain verification
fn compute_hash(action_type: u8, target: &solana_pubkey::Pubkey, salt: &[u8; 32]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update([action_type]);
    hasher.update(target.as_ref());
    hasher.update(salt);
    hasher.finalize().into()
}

#[test]
fn test_full_commit_reveal_round() {
    let (mut svm, host) = setup();
    let player2 = Keypair::new();
    svm.airdrop(&player2.pubkey(), 10_000_000_000).unwrap();

    let game_id: u64 = 99;
    let (game_key, _) = game_pda(game_id);
    let (pool_key, _) = card_pool_pda(game_id);
    let (hp, _) = player_pda(game_id, &host.pubkey());
    let (p2p, _) = player_pda(game_id, &player2.pubkey());

    // Create + Join + Join + Start
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::CreateGame { game_id, max_players: 2 }.data(),
        oxark::accounts::CreateGame { game: game_key, card_pool: pool_key, host: host.pubkey(), system_program: solana_sdk_ids::system_program::id() }.to_account_metas(None)), &host);
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::JoinGame { game_id }.data(),
        oxark::accounts::JoinGame { game: game_key, player_state: hp, player: host.pubkey(), system_program: solana_sdk_ids::system_program::id() }.to_account_metas(None)), &host);
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::JoinGame { game_id }.data(),
        oxark::accounts::JoinGame { game: game_key, player_state: p2p, player: player2.pubkey(), system_program: solana_sdk_ids::system_program::id() }.to_account_metas(None)), &player2);
    let mut sa = oxark::accounts::StartGame { game: game_key, card_pool: pool_key, host: host.pubkey() }.to_account_metas(None);
    sa.push(solana_instruction::AccountMeta::new(hp, false));
    sa.push(solana_instruction::AccountMeta::new(p2p, false));
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::StartGame { game_id }.data(), sa), &host);

    // === COMMIT PHASE (round 1) ===
    let round: u8 = 1;
    let zero_target = solana_pubkey::Pubkey::default();
    let salt1 = [1u8; 32];
    let salt2 = [2u8; 32];

    // Player 1 commits Draw (action_type=1)
    let hash1 = compute_hash(1, &zero_target, &salt1);
    let (c1, _) = commit_pda(game_id, round, &host.pubkey());
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::CommitAction { game_id, hash: hash1, phase: 0, played_cards: vec![] }.data(),
        oxark::accounts::CommitActionCtx { game: game_key, player_state: hp, commit: c1, player: host.pubkey(), system_program: solana_sdk_ids::system_program::id() }.to_account_metas(None)), &host);

    // Player 2 commits Draw (action_type=1)
    let hash2 = compute_hash(1, &zero_target, &salt2);
    let (c2, _) = commit_pda(game_id, round, &player2.pubkey());
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::CommitAction { game_id, hash: hash2, phase: 0, played_cards: vec![] }.data(),
        oxark::accounts::CommitActionCtx { game: game_key, player_state: p2p, commit: c2, player: player2.pubkey(), system_program: solana_sdk_ids::system_program::id() }.to_account_metas(None)), &player2);

    // Both committed — game should be in RevealPhase now

    // === REVEAL PHASE ===
    // Player 1 reveals
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::RevealAction { game_id, action_type: 1, target: zero_target, salt: salt1, played_cards: vec![] }.data(),
        oxark::accounts::RevealActionCtx { game: game_key, player_state: hp, commit: c1, player: host.pubkey() }.to_account_metas(None)), &host);

    // Player 2 reveals
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::RevealAction { game_id, action_type: 1, target: zero_target, salt: salt2, played_cards: vec![] }.data(),
        oxark::accounts::RevealActionCtx { game: game_key, player_state: p2p, commit: c2, player: player2.pubkey() }.to_account_metas(None)), &player2);

    // Both revealed — game should be ready for resolve
    // Verify accounts are still valid
    let game_data = svm.get_account(&game_key).unwrap();
    assert!(game_data.lamports > 0, "Game should exist after reveals");
}

#[test]
fn test_full_round_with_resolve() {
    let (mut svm, host) = setup();
    let player2 = Keypair::new();
    svm.airdrop(&player2.pubkey(), 10_000_000_000).unwrap();

    let game_id: u64 = 200;
    let (game_key, _) = game_pda(game_id);
    let (pool_key, _) = card_pool_pda(game_id);
    let (hp, _) = player_pda(game_id, &host.pubkey());
    let (p2p, _) = player_pda(game_id, &player2.pubkey());

    // === Create game ===
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::CreateGame { game_id, max_players: 2 }.data(),
        oxark::accounts::CreateGame { game: game_key, card_pool: pool_key, host: host.pubkey(), system_program: solana_sdk_ids::system_program::id() }.to_account_metas(None)), &host);

    // === Join both players ===
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::JoinGame { game_id }.data(),
        oxark::accounts::JoinGame { game: game_key, player_state: hp, player: host.pubkey(), system_program: solana_sdk_ids::system_program::id() }.to_account_metas(None)), &host);
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::JoinGame { game_id }.data(),
        oxark::accounts::JoinGame { game: game_key, player_state: p2p, player: player2.pubkey(), system_program: solana_sdk_ids::system_program::id() }.to_account_metas(None)), &player2);

    // === Start game ===
    let mut sa = oxark::accounts::StartGame { game: game_key, card_pool: pool_key, host: host.pubkey() }.to_account_metas(None);
    sa.push(solana_instruction::AccountMeta::new(hp, false));
    sa.push(solana_instruction::AccountMeta::new(p2p, false));
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::StartGame { game_id }.data(), sa), &host);

    // === COMMIT PHASE (round 1) ===
    let round: u8 = 1;
    let zero_target = solana_pubkey::Pubkey::default();
    let salt1 = [11u8; 32];
    let salt2 = [22u8; 32];

    // Both players commit Draw (action_type=1) with proper SHA256 hashes
    let hash1 = compute_hash(1, &zero_target, &salt1);
    let (c1, _) = commit_pda(game_id, round, &host.pubkey());
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::CommitAction { game_id, hash: hash1, phase: 0, played_cards: vec![] }.data(),
        oxark::accounts::CommitActionCtx { game: game_key, player_state: hp, commit: c1, player: host.pubkey(), system_program: solana_sdk_ids::system_program::id() }.to_account_metas(None)), &host);

    let hash2 = compute_hash(1, &zero_target, &salt2);
    let (c2, _) = commit_pda(game_id, round, &player2.pubkey());
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::CommitAction { game_id, hash: hash2, phase: 0, played_cards: vec![] }.data(),
        oxark::accounts::CommitActionCtx { game: game_key, player_state: p2p, commit: c2, player: player2.pubkey(), system_program: solana_sdk_ids::system_program::id() }.to_account_metas(None)), &player2);

    // === REVEAL PHASE ===
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::RevealAction { game_id, action_type: 1, target: zero_target, salt: salt1, played_cards: vec![] }.data(),
        oxark::accounts::RevealActionCtx { game: game_key, player_state: hp, commit: c1, player: host.pubkey() }.to_account_metas(None)), &host);
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::RevealAction { game_id, action_type: 1, target: zero_target, salt: salt2, played_cards: vec![] }.data(),
        oxark::accounts::RevealActionCtx { game: game_key, player_state: p2p, commit: c2, player: player2.pubkey() }.to_account_metas(None)), &player2);

    // === RESOLVE ROUND ===
    // Build the ResolveRound instruction with both player state PDAs as remaining_accounts
    let mut resolve_accounts = oxark::accounts::ResolveRound {
        game: game_key,
        card_pool: pool_key,
        caller: host.pubkey(),
    }
    .to_account_metas(None);
    // Append both player state PDAs as writable remaining accounts
    resolve_accounts.push(solana_instruction::AccountMeta::new(hp, false));
    resolve_accounts.push(solana_instruction::AccountMeta::new(p2p, false));

    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::ResolveRound { game_id }.data(),
        resolve_accounts), &host);

    // === VERIFY: game advanced to round 2 (CommitPhase) ===
    let game_data = svm.get_account(&game_key).unwrap();
    assert!(game_data.lamports > 0, "Game should exist after resolve");

    // Deserialize game state to check round
    // Layout: 8 (discriminator) + 8 (game_id) + 32 (host) + 1 (status) + 1 (round) ...
    let data = &game_data.data;
    let status_byte = data[8 + 8 + 32]; // GameStatus offset
    let round_byte = data[8 + 8 + 32 + 1]; // round offset

    // status should be CommitPhase (1) since game is not finished
    assert_eq!(status_byte, 1, "Game status should be CommitPhase (1) after resolve");
    // round should be 2
    assert_eq!(round_byte, 2, "Game round should be 2 after first resolve");
}

// ── ZK E2E Tests ──────────────────────────────────────────────────────────────
//
// Each test exercises a real Groth16 proof (generated by snarkjs from circuits/**/build/)
// against the on-chain alt_bn128_pairing syscall.  Three circuits × 2 cases = 6 tests.

/// Helper: full game setup up to CommitPhase (create + join × 2 + start).
fn setup_game_commit_phase(
    svm: &mut LiteSVM,
    game_id: u64,
    host: &Keypair,
    player2: &Keypair,
) {
    let (game_key, _) = game_pda(game_id);
    let (pool_key, _) = card_pool_pda(game_id);
    let (hp, _) = player_pda(game_id, &host.pubkey());
    let (p2p, _) = player_pda(game_id, &player2.pubkey());

    send_ix(svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::CreateGame { game_id, max_players: 2 }.data(),
        oxark::accounts::CreateGame { game: game_key, card_pool: pool_key, host: host.pubkey(),
            system_program: solana_sdk_ids::system_program::id() }.to_account_metas(None)), host);

    send_ix(svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::JoinGame { game_id }.data(),
        oxark::accounts::JoinGame { game: game_key, player_state: hp, player: host.pubkey(),
            system_program: solana_sdk_ids::system_program::id() }.to_account_metas(None)), host);

    send_ix(svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::JoinGame { game_id }.data(),
        oxark::accounts::JoinGame { game: game_key, player_state: p2p, player: player2.pubkey(),
            system_program: solana_sdk_ids::system_program::id() }.to_account_metas(None)), player2);

    let mut sa = oxark::accounts::StartGame { game: game_key, card_pool: pool_key, host: host.pubkey() }
        .to_account_metas(None);
    sa.push(solana_instruction::AccountMeta::new(hp, false));
    sa.push(solana_instruction::AccountMeta::new(p2p, false));
    send_ix(svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::StartGame { game_id }.data(), sa), host);
}

// ── Circuit 1: dungeon_position ───────────────────────────────────────────────

#[test]
fn test_verify_dungeon_move_valid_proof() {
    let (mut svm, host) = setup();
    let player2 = Keypair::new();
    svm.airdrop(&player2.pubkey(), 10_000_000_000).unwrap();
    let game_id: u64 = 1001;

    setup_game_commit_phase(&mut svm, game_id, &host, &player2);

    let (game_key, _) = game_pda(game_id);
    let (hp, _) = player_pda(game_id, &host.pubkey());

    // Set initial position commitment = PUBLIC_DM_OLD
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::InitPosition { game_id, commitment: PUBLIC_DM_OLD }.data(),
        oxark::accounts::InitPosition { game: game_key, player_state: hp, player: host.pubkey() }
            .to_account_metas(None)), &host);

    // public_inputs = old_commitment || new_commitment
    let mut public_inputs = [0u8; 64];
    public_inputs[..32].copy_from_slice(&PUBLIC_DM_OLD);
    public_inputs[32..].copy_from_slice(&PUBLIC_DM_NEW);

    let ix = Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::VerifyDungeonMove {
            game_id,
            proof_a: PROOF_DM_A,
            proof_b: PROOF_DM_B,
            proof_c: PROOF_DM_C,
            public_inputs,
        }.data(),
        oxark::accounts::VerifyDungeonMove { game: game_key, player_state: hp, player: host.pubkey() }
            .to_account_metas(None));

    let meta = send_ix_result(&mut svm, ix, &host)
        .expect("verify_dungeon_move with valid proof must succeed");

    let cu = meta.compute_units_consumed;
    println!("verify_dungeon_move CU: {cu}");
    assert!(cu < 200_000, "CU budget exceeded: {cu} >= 200_000");
}

#[test]
fn test_verify_dungeon_move_tampered_proof() {
    let (mut svm, host) = setup();
    let player2 = Keypair::new();
    svm.airdrop(&player2.pubkey(), 10_000_000_000).unwrap();
    let game_id: u64 = 1002;

    setup_game_commit_phase(&mut svm, game_id, &host, &player2);

    let (game_key, _) = game_pda(game_id);
    let (hp, _) = player_pda(game_id, &host.pubkey());

    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::InitPosition { game_id, commitment: PUBLIC_DM_OLD }.data(),
        oxark::accounts::InitPosition { game: game_key, player_state: hp, player: host.pubkey() }
            .to_account_metas(None)), &host);

    let mut public_inputs = [0u8; 64];
    public_inputs[..32].copy_from_slice(&PUBLIC_DM_OLD);
    public_inputs[32..].copy_from_slice(&PUBLIC_DM_NEW);

    let ix = Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::VerifyDungeonMove {
            game_id,
            proof_a: PROOF_DM_A_BAD,  // tampered: first byte flipped
            proof_b: PROOF_DM_B,
            proof_c: PROOF_DM_C,
            public_inputs,
        }.data(),
        oxark::accounts::VerifyDungeonMove { game: game_key, player_state: hp, player: host.pubkey() }
            .to_account_metas(None));

    let result = send_ix_result(&mut svm, ix, &host);
    assert!(result.is_err(), "tampered proof must be rejected");
}

// ── Circuit 2 → hand_commitment v2 (verify_zk_proof) ────────────────────────

/// Ignored: requires a real hand_commitment v2 proof from the circom circuit.
/// Run offline: generate proof via snarkjs, paste vectors here, then remove #[ignore].
#[test]
#[ignore]
fn test_verify_zk_proof_valid() {
    let (mut svm, host) = setup();
    let duel_id: u64 = 1003;
    let round_u64: u64 = 1;

    // public_inputs: [commitment, round_fe, pubkey_lo_fe, pubkey_hi_fe]
    // Replace with real proof vectors from hand_commitment v2 circuit.
    let public_inputs: [[u8; 32]; 4] = [[0u8; 32]; 4];

    let (zk_record, _) = solana_pubkey::Pubkey::find_program_address(
        &[b"zk_proof", &duel_id.to_le_bytes(), &round_u64.to_le_bytes(), host.pubkey().as_ref()],
        &oxark::id(),
    );
    let ix = Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::VerifyZkProof {
            proof_a: PROOF_CR_A,
            proof_b: PROOF_CR_B,
            proof_c: PROOF_CR_C,
            public_inputs,
            duel_id,
            round: round_u64,
        }.data(),
        oxark::accounts::VerifyZkProof {
            signer: host.pubkey(),
            zk_proof_record: zk_record,
            system_program: solana_sdk_ids::system_program::id(),
        }.to_account_metas(None));

    let meta = send_ix_result(&mut svm, ix, &host)
        .expect("verify_zk_proof with valid hand_commitment proof must succeed");
    let cu = meta.compute_units_consumed;
    println!("verify_zk_proof CU: {cu}");
    assert!(cu < 300_000, "CU budget exceeded: {cu}");
}

#[test]
fn test_verify_zk_proof_tampered() {
    let (mut svm, host) = setup();
    let duel_id: u64 = 1004;
    let round_u64: u64 = 1;

    // Build public_inputs with correct round + pubkey so validation passes,
    // but tampered proof_a so pairing fails.
    let mut round_fe = [0u8; 32];
    round_fe[24..32].copy_from_slice(&round_u64.to_be_bytes());
    let host_bytes = host.pubkey().to_bytes();
    let mut pubkey_lo = [0u8; 32];
    let mut pubkey_hi = [0u8; 32];
    pubkey_lo[16..32].copy_from_slice(&host_bytes[0..16]);
    pubkey_hi[16..32].copy_from_slice(&host_bytes[16..32]);

    let public_inputs: [[u8; 32]; 4] = [[0u8; 32], round_fe, pubkey_lo, pubkey_hi];

    let (zk_record, _) = solana_pubkey::Pubkey::find_program_address(
        &[b"zk_proof", &duel_id.to_le_bytes(), &round_u64.to_le_bytes(), host.pubkey().as_ref()],
        &oxark::id(),
    );
    let ix = Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::VerifyZkProof {
            proof_a: PROOF_CR_A_BAD,  // tampered: not a valid hand_commitment v2 proof
            proof_b: PROOF_CR_B,
            proof_c: PROOF_CR_C,
            public_inputs,
            duel_id,
            round: round_u64,
        }.data(),
        oxark::accounts::VerifyZkProof {
            signer: host.pubkey(),
            zk_proof_record: zk_record,
            system_program: solana_sdk_ids::system_program::id(),
        }.to_account_metas(None));

    let result = send_ix_result(&mut svm, ix, &host);
    assert!(result.is_err(), "tampered hand_commitment proof must be rejected");
}

// ── Circuit 3: hand_commitment ────────────────────────────────────────────────

#[test]
fn test_commit_hand_valid_proof() {
    let (mut svm, authority) = setup();
    let player1 = Keypair::new();
    let player2 = Keypair::new();
    svm.airdrop(&player1.pubkey(), 10_000_000_000).unwrap();
    svm.airdrop(&player2.pubkey(), 10_000_000_000).unwrap();

    // Use a fixed Pubkey as duel_id (derived from a known seed for reproducibility)
    let duel_id = solana_pubkey::Pubkey::new_unique();
    let (duel_key, _) = duel_pda(&duel_id);

    // Initialize duel: authority pays, player1 and player2 are participants
    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::InitDuel { duel_id, hall_tier: 0, ante: 0 }.data(),
        oxark::accounts::InitDuel {
            duel: duel_key,
            player_1: player1.pubkey(),
            player_2: player2.pubkey(),
            authority: authority.pubkey(),
            system_program: solana_sdk_ids::system_program::id(),
        }.to_account_metas(None)), &authority);

    // public_signals: [commitment, round=1, pubkey_lo, pubkey_hi]
    let public_signals = [
        PUBLIC_HC_COMMITMENT,
        PUBLIC_HC_ROUND,
        PUBLIC_HC_PUBKEY_LO,
        PUBLIC_HC_PUBKEY_HI,
    ];

    // player1 submits hand commitment (must be a duel participant)
    let ix = Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::CommitHand {
            duel_id,
            round: 1,
            proof_a: PROOF_HC_A,
            proof_b: PROOF_HC_B,
            proof_c: PROOF_HC_C,
            public_signals,
        }.data(),
        oxark::accounts::CommitHand { duel: duel_key, player: player1.pubkey() }
            .to_account_metas(None));

    let meta = send_ix_result_multi(&mut svm, ix, &authority, &[&player1])
        .expect("commit_hand with valid hand_commitment proof must succeed");

    let cu = meta.compute_units_consumed;
    println!("commit_hand CU: {cu}");
    assert!(cu < 200_000, "CU budget exceeded: {cu} >= 200_000");
}

#[test]
fn test_commit_hand_tampered_proof() {
    let (mut svm, authority) = setup();
    let player1 = Keypair::new();
    let player2 = Keypair::new();
    svm.airdrop(&player1.pubkey(), 10_000_000_000).unwrap();
    svm.airdrop(&player2.pubkey(), 10_000_000_000).unwrap();

    let duel_id = solana_pubkey::Pubkey::new_unique();
    let (duel_key, _) = duel_pda(&duel_id);

    send_ix(&mut svm, Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::InitDuel { duel_id, hall_tier: 0, ante: 0 }.data(),
        oxark::accounts::InitDuel {
            duel: duel_key,
            player_1: player1.pubkey(),
            player_2: player2.pubkey(),
            authority: authority.pubkey(),
            system_program: solana_sdk_ids::system_program::id(),
        }.to_account_metas(None)), &authority);

    let public_signals = [
        PUBLIC_HC_COMMITMENT,
        PUBLIC_HC_ROUND,
        PUBLIC_HC_PUBKEY_LO,
        PUBLIC_HC_PUBKEY_HI,
    ];

    let ix = Instruction::new_with_bytes(oxark::id(),
        &oxark::instruction::CommitHand {
            duel_id,
            round: 1,
            proof_a: PROOF_HC_A_BAD,  // tampered: first byte flipped
            proof_b: PROOF_HC_B,
            proof_c: PROOF_HC_C,
            public_signals,
        }.data(),
        oxark::accounts::CommitHand { duel: duel_key, player: player1.pubkey() }
            .to_account_metas(None));

    let result = send_ix_result_multi(&mut svm, ix, &authority, &[&player1]);
    assert!(result.is_err(), "tampered hand_commitment proof must be rejected");
}
