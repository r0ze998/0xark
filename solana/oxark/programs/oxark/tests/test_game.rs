use {
    anchor_lang::{
        solana_program::instruction::Instruction, AccountDeserialize, AccountSerialize,
        InstructionData, ToAccountMetas,
    },
    litesvm::LiteSVM,
    sha2::{Digest, Sha256},
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_pubkey::Pubkey,
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

// ── ZK proof byte arrays (generated from circuits/*/build/proof.json) ─────────
// Encoding: G1 = x_BE||y_BE (64 bytes); G2 = x_re_BE||x_im_BE||y_re_BE||y_im_BE (128 bytes)
// EIP-197 real-first ordering for G2 (opposite of snarkjs JSON [[x_im,x_re]...])

// commit_reveal circuit (277 constraints) — input: actionType=2, targetArea=1, salt=12345678901234567890123456789012
// Proof generated with fresh pot12 trusted setup (zkey regenerated; VK in verify_zk_proof.rs updated to match)
const PROOF_CR_A: [u8; 64] = [
    20, 21, 113, 24, 5, 43, 114, 72, 116, 241, 3, 169, 169, 45, 174, 204, 246, 215, 186, 43, 32,
    236, 219, 6, 158, 47, 206, 161, 143, 32, 66, 161, 0, 46, 43, 253, 47, 158, 23, 143, 68, 149,
    89, 23, 1, 246, 185, 177, 23, 174, 5, 178, 109, 25, 32, 127, 182, 107, 33, 162, 54, 124, 59,
    51,
];
const PROOF_CR_B: [u8; 128] = [
    17, 158, 72, 20, 86, 162, 118, 73, 205, 227, 150, 176, 150, 212, 60, 46, 180, 50, 79, 194, 186,
    176, 64, 48, 43, 18, 31, 254, 176, 130, 186, 3, 4, 102, 38, 151, 103, 56, 246, 85, 38, 215,
    215, 167, 232, 154, 97, 19, 89, 135, 160, 238, 214, 39, 78, 104, 40, 23, 124, 215, 204, 220,
    162, 121, 2, 1, 125, 233, 118, 180, 1, 67, 43, 131, 158, 159, 6, 12, 9, 249, 70, 84, 77, 165,
    116, 153, 232, 221, 96, 218, 124, 61, 17, 124, 69, 80, 15, 18, 74, 108, 175, 123, 67, 167, 30,
    202, 105, 37, 237, 13, 106, 145, 185, 83, 101, 178, 136, 47, 95, 229, 188, 102, 217, 151, 152,
    173, 219, 101,
];
const PROOF_CR_C: [u8; 64] = [
    42, 163, 66, 88, 82, 44, 191, 185, 184, 93, 226, 178, 135, 193, 79, 134, 100, 209, 200, 104,
    187, 189, 40, 47, 246, 203, 12, 156, 203, 111, 132, 232, 45, 190, 100, 178, 86, 24, 9, 48, 95,
    140, 216, 90, 27, 143, 131, 79, 73, 14, 186, 188, 110, 251, 89, 140, 134, 215, 101, 164, 246,
    108, 183, 72,
];
// commitHash = Poseidon(2, 1, 12345678901234567890123456789012) = 18900108544938186552350079369873888314453412378062376133398837163123226377055
const PUBLIC_CR_HASH: [u8; 32] = [
    41, 201, 21, 20, 162, 172, 152, 196, 113, 91, 6, 84, 21, 1, 203, 227, 176, 240, 18, 226, 247,
    243, 201, 204, 107, 155, 114, 150, 225, 142, 251, 95,
];
const PROOF_CR_A_BAD: [u8; 64] = [
    235, 21, 113, 24, 5, 43, 114, 72, 116, 241, 3, 169, 169, 45, 174, 204, 246, 215, 186, 43, 32,
    236, 219, 6, 158, 47, 206, 161, 143, 32, 66, 161, 0, 46, 43, 253, 47, 158, 23, 143, 68, 149,
    89, 23, 1, 246, 185, 177, 23, 174, 5, 178, 109, 25, 32, 127, 182, 107, 33, 162, 54, 124, 59,
    51,
];

// hand_commitment circuit v3 (Poseidon(6), 1103 constraints) — cards=[1,5,23,47,2],
// round=1, salt=0x11*32, prover keypair seed = [0x42; 32] (see HC_PROVER_SEED).
// Regenerate via circuits/hand_commitment build + the _genfix flow in the YKK-33 PR.
const PROOF_HC_A: [u8; 64] = [
    23, 149, 148, 64, 42, 125, 20, 194, 148, 243, 142, 186, 165, 55, 210, 35, 7, 21, 23, 30, 21,
    200, 147, 190, 176, 198, 117, 233, 176, 142, 36, 24, 31, 75, 62, 57, 122, 236, 88, 181, 159,
    242, 78, 216, 122, 247, 232, 71, 235, 254, 188, 145, 249, 72, 48, 87, 58, 228, 145, 49, 253,
    12, 102, 60,
];
const PROOF_HC_B: [u8; 128] = [
    6, 177, 81, 188, 195, 206, 130, 21, 54, 85, 10, 48, 72, 196, 226, 37, 30, 20, 65, 142, 161, 57,
    94, 199, 1, 10, 53, 28, 28, 203, 116, 4, 32, 73, 16, 44, 148, 24, 38, 189, 58, 204, 123, 38,
    155, 209, 49, 195, 193, 37, 175, 37, 93, 141, 119, 167, 254, 233, 186, 43, 16, 70, 195, 45, 36,
    35, 203, 232, 138, 200, 145, 243, 177, 126, 101, 176, 80, 121, 64, 161, 2, 0, 192, 110, 94, 96,
    106, 49, 173, 233, 251, 226, 122, 9, 180, 6, 9, 124, 172, 184, 55, 130, 156, 41, 118, 55, 216,
    83, 183, 121, 156, 141, 161, 242, 238, 208, 247, 110, 187, 17, 188, 101, 142, 93, 142, 82, 4,
    13,
];
const PROOF_HC_C: [u8; 64] = [
    6, 163, 91, 135, 143, 140, 203, 86, 113, 146, 11, 227, 255, 80, 159, 16, 186, 221, 216, 50,
    132, 202, 227, 109, 40, 171, 103, 60, 156, 135, 128, 76, 46, 27, 131, 80, 14, 136, 207, 113,
    164, 235, 232, 28, 106, 62, 73, 179, 154, 114, 241, 244, 119, 77, 110, 22, 164, 101, 146, 113,
    241, 207, 2, 190,
];
// public_signals: [commitment, round=1, pubkey_lo, pubkey_hi] for seed-0x42 keypair
const PUBLIC_HC_COMMITMENT: [u8; 32] = [
    0, 20, 134, 167, 18, 145, 144, 171, 251, 48, 134, 8, 236, 167, 231, 59, 141, 7, 30, 94, 76, 86,
    188, 46, 8, 141, 48, 255, 21, 157, 88, 35,
];
const PUBLIC_HC_ROUND: [u8; 32] = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
];
const PUBLIC_HC_PUBKEY_LO: [u8; 32] = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 33, 82, 248, 209, 155, 121, 29, 36, 69, 50, 66,
    225, 95, 46, 171, 108,
];
const PUBLIC_HC_PUBKEY_HI: [u8; 32] = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 183, 207, 250, 123, 106, 94, 211, 0, 151, 150,
    14, 6, 152, 129, 219, 18,
];
const PROOF_HC_A_BAD: [u8; 64] = [
    232, 149, 148, 64, 42, 125, 20, 194, 148, 243, 142, 186, 165, 55, 210, 35, 7, 21, 23, 30, 21,
    200, 147, 190, 176, 198, 117, 233, 176, 142, 36, 24, 31, 75, 62, 57, 122, 236, 88, 181, 159,
    242, 78, 216, 122, 247, 232, 71, 235, 254, 188, 145, 249, 72, 48, 87, 58, 228, 145, 49, 253,
    12, 102, 60,
];

/// Seed of the keypair the PROOF_HC_* fixture is bound to (pubkey_lo/hi public
/// signals). commit_hand validates proof-signer binding, so these tests must
/// sign with exactly this keypair. Regenerate fixtures with a different seed
/// via snarkjs fullProve against solana/client/hand_commitment_final.zkey.
const HC_PROVER_SEED: [u8; 32] = [0x42; 32];

fn setup() -> (LiteSVM, Keypair) {
    setup_with_cu(1_400_000)
}

fn setup_with_cu(compute_unit_limit: u64) -> (LiteSVM, Keypair) {
    use solana_compute_budget::compute_budget::ComputeBudget;
    let program_id = oxark::id();
    let payer = Keypair::new();
    // custom-heap is enabled by default: the program's BumpAllocator is 256KB.
    // The VM must map at least 256KB of heap or the first alloc causes an
    // access violation at ~0x30003ff38 (above the default 32KB mapped region).
    let base = ComputeBudget::new_with_defaults(false, false);
    let budget = ComputeBudget {
        heap_size: 256 * 1024,
        compute_unit_limit,
        ..base
    };
    let mut svm = LiteSVM::new().with_compute_budget(budget);
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
        &all_signers
            .iter()
            .map(|k| *k as &dyn solana_signer::Signer)
            .collect::<Vec<_>>(),
    )
    .unwrap();
    svm.send_transaction(tx).unwrap();
}

fn game_pda(game_id: u64) -> (solana_pubkey::Pubkey, u8) {
    solana_pubkey::Pubkey::find_program_address(&[b"game", &game_id.to_le_bytes()], &oxark::id())
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

fn commit_pda(
    game_id: u64,
    round: u8,
    player: &solana_pubkey::Pubkey,
) -> (solana_pubkey::Pubkey, u8) {
    solana_pubkey::Pubkey::find_program_address(
        &[
            b"commit",
            &game_id.to_le_bytes(),
            &round.to_le_bytes(),
            player.as_ref(),
        ],
        &oxark::id(),
    )
}

fn duel_pda(duel_id: &solana_pubkey::Pubkey) -> (solana_pubkey::Pubkey, u8) {
    solana_pubkey::Pubkey::find_program_address(&[b"duel", duel_id.as_ref()], &oxark::id())
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
    for s in extra_signers {
        signers.push(*s);
    }
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
        &oxark::instruction::CreateGame {
            game_id,
            max_players: 2,
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
            &oxark::instruction::CreateGame {
                game_id,
                max_players: 2,
            }
            .data(),
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
    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::CreateGame {
                game_id,
                max_players: 2,
            }
            .data(),
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
    let mut sa = oxark::accounts::StartGame {
        game: game_key,
        card_pool: pool_key,
        host: host.pubkey(),
    }
    .to_account_metas(None);
    sa.push(solana_instruction::AccountMeta::new(hp, false));
    sa.push(solana_instruction::AccountMeta::new(p2p, false));
    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::StartGame { game_id }.data(),
            sa,
        ),
        &host,
    );

    // Now in CommitPhase (round 1). Commit action for host.
    let round: u8 = 1;
    let hash = [0u8; 32]; // dummy hash for testing
    let (commit_pda, _) = commit_pda(game_id, round, &host.pubkey());

    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::CommitAction {
                game_id,
                hash,
                phase: 0,
                played_cards: vec![],
            }
            .data(),
            oxark::accounts::CommitActionCtx {
                game: game_key,
                player_state: hp,
                commit: commit_pda,
                player: host.pubkey(),
                system_program: solana_sdk_ids::system_program::id(),
            }
            .to_account_metas(None),
        ),
        &host,
    );

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
    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::CreateGame {
                game_id,
                max_players: 2,
            }
            .data(),
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
    let mut sa = oxark::accounts::StartGame {
        game: game_key,
        card_pool: pool_key,
        host: host.pubkey(),
    }
    .to_account_metas(None);
    sa.push(solana_instruction::AccountMeta::new(hp, false));
    sa.push(solana_instruction::AccountMeta::new(p2p, false));
    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::StartGame { game_id }.data(),
            sa,
        ),
        &host,
    );

    // === COMMIT PHASE (round 1) ===
    let round: u8 = 1;
    let zero_target = solana_pubkey::Pubkey::default();
    let salt1 = [1u8; 32];
    let salt2 = [2u8; 32];

    // Player 1 commits Draw (action_type=1)
    let hash1 = compute_hash(1, &zero_target, &salt1);
    let (c1, _) = commit_pda(game_id, round, &host.pubkey());
    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::CommitAction {
                game_id,
                hash: hash1,
                phase: 0,
                played_cards: vec![],
            }
            .data(),
            oxark::accounts::CommitActionCtx {
                game: game_key,
                player_state: hp,
                commit: c1,
                player: host.pubkey(),
                system_program: solana_sdk_ids::system_program::id(),
            }
            .to_account_metas(None),
        ),
        &host,
    );

    // Player 2 commits Draw (action_type=1)
    let hash2 = compute_hash(1, &zero_target, &salt2);
    let (c2, _) = commit_pda(game_id, round, &player2.pubkey());
    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::CommitAction {
                game_id,
                hash: hash2,
                phase: 0,
                played_cards: vec![],
            }
            .data(),
            oxark::accounts::CommitActionCtx {
                game: game_key,
                player_state: p2p,
                commit: c2,
                player: player2.pubkey(),
                system_program: solana_sdk_ids::system_program::id(),
            }
            .to_account_metas(None),
        ),
        &player2,
    );

    // Both committed — game should be in RevealPhase now

    // === REVEAL PHASE ===
    // Player 1 reveals
    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::RevealAction {
                game_id,
                action_type: 1,
                target: zero_target,
                salt: salt1,
                played_cards: vec![],
            }
            .data(),
            oxark::accounts::RevealActionCtx {
                game: game_key,
                player_state: hp,
                commit: c1,
                player: host.pubkey(),
            }
            .to_account_metas(None),
        ),
        &host,
    );

    // Player 2 reveals
    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::RevealAction {
                game_id,
                action_type: 1,
                target: zero_target,
                salt: salt2,
                played_cards: vec![],
            }
            .data(),
            oxark::accounts::RevealActionCtx {
                game: game_key,
                player_state: p2p,
                commit: c2,
                player: player2.pubkey(),
            }
            .to_account_metas(None),
        ),
        &player2,
    );

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
    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::CreateGame {
                game_id,
                max_players: 2,
            }
            .data(),
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

    // === Join both players ===
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

    // === Start game ===
    let mut sa = oxark::accounts::StartGame {
        game: game_key,
        card_pool: pool_key,
        host: host.pubkey(),
    }
    .to_account_metas(None);
    sa.push(solana_instruction::AccountMeta::new(hp, false));
    sa.push(solana_instruction::AccountMeta::new(p2p, false));
    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::StartGame { game_id }.data(),
            sa,
        ),
        &host,
    );

    // === COMMIT PHASE (round 1) ===
    let round: u8 = 1;
    let zero_target = solana_pubkey::Pubkey::default();
    let salt1 = [11u8; 32];
    let salt2 = [22u8; 32];

    // Both players commit Draw (action_type=1) with proper SHA256 hashes
    let hash1 = compute_hash(1, &zero_target, &salt1);
    let (c1, _) = commit_pda(game_id, round, &host.pubkey());
    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::CommitAction {
                game_id,
                hash: hash1,
                phase: 0,
                played_cards: vec![],
            }
            .data(),
            oxark::accounts::CommitActionCtx {
                game: game_key,
                player_state: hp,
                commit: c1,
                player: host.pubkey(),
                system_program: solana_sdk_ids::system_program::id(),
            }
            .to_account_metas(None),
        ),
        &host,
    );

    let hash2 = compute_hash(1, &zero_target, &salt2);
    let (c2, _) = commit_pda(game_id, round, &player2.pubkey());
    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::CommitAction {
                game_id,
                hash: hash2,
                phase: 0,
                played_cards: vec![],
            }
            .data(),
            oxark::accounts::CommitActionCtx {
                game: game_key,
                player_state: p2p,
                commit: c2,
                player: player2.pubkey(),
                system_program: solana_sdk_ids::system_program::id(),
            }
            .to_account_metas(None),
        ),
        &player2,
    );

    // === REVEAL PHASE ===
    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::RevealAction {
                game_id,
                action_type: 1,
                target: zero_target,
                salt: salt1,
                played_cards: vec![],
            }
            .data(),
            oxark::accounts::RevealActionCtx {
                game: game_key,
                player_state: hp,
                commit: c1,
                player: host.pubkey(),
            }
            .to_account_metas(None),
        ),
        &host,
    );
    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::RevealAction {
                game_id,
                action_type: 1,
                target: zero_target,
                salt: salt2,
                played_cards: vec![],
            }
            .data(),
            oxark::accounts::RevealActionCtx {
                game: game_key,
                player_state: p2p,
                commit: c2,
                player: player2.pubkey(),
            }
            .to_account_metas(None),
        ),
        &player2,
    );

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

    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::ResolveRound { game_id }.data(),
            resolve_accounts,
        ),
        &host,
    );

    // === VERIFY: game advanced to round 2 (CommitPhase) ===
    let game_data = svm.get_account(&game_key).unwrap();
    assert!(game_data.lamports > 0, "Game should exist after resolve");

    // Deserialize game state to check round
    // Layout: 8 (discriminator) + 8 (game_id) + 32 (host) + 1 (status) + 1 (round) ...
    let data = &game_data.data;
    let status_byte = data[8 + 8 + 32]; // GameStatus offset
    let round_byte = data[8 + 8 + 32 + 1]; // round offset

    // status should be CommitPhase (1) since game is not finished
    assert_eq!(
        status_byte, 1,
        "Game status should be CommitPhase (1) after resolve"
    );
    // round should be 2
    assert_eq!(round_byte, 2, "Game round should be 2 after first resolve");
}

// ── ZK E2E Tests ──────────────────────────────────────────────────────────────
//
// Each test exercises a real Groth16 proof (generated by snarkjs from circuits/**/build/)
// against the on-chain alt_bn128_pairing syscall.  Three circuits × 2 cases = 6 tests.

/// Helper: full game setup up to CommitPhase (create + join × 2 + start).
fn setup_game_commit_phase(svm: &mut LiteSVM, game_id: u64, host: &Keypair, player2: &Keypair) {
    let (game_key, _) = game_pda(game_id);
    let (pool_key, _) = card_pool_pda(game_id);
    let (hp, _) = player_pda(game_id, &host.pubkey());
    let (p2p, _) = player_pda(game_id, &player2.pubkey());

    send_ix(
        svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::CreateGame {
                game_id,
                max_players: 2,
            }
            .data(),
            oxark::accounts::CreateGame {
                game: game_key,
                card_pool: pool_key,
                host: host.pubkey(),
                system_program: solana_sdk_ids::system_program::id(),
            }
            .to_account_metas(None),
        ),
        host,
    );

    send_ix(
        svm,
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
        host,
    );

    send_ix(
        svm,
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
        player2,
    );

    let mut sa = oxark::accounts::StartGame {
        game: game_key,
        card_pool: pool_key,
        host: host.pubkey(),
    }
    .to_account_metas(None);
    sa.push(solana_instruction::AccountMeta::new(hp, false));
    sa.push(solana_instruction::AccountMeta::new(p2p, false));
    send_ix(
        svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::StartGame { game_id }.data(),
            sa,
        ),
        host,
    );
}

// ── Circuit 2 → hand_commitment v2 (verify_zk_proof) ────────────────────────

/// Ignored: requires a real hand_commitment v2 proof from the circom circuit.
/// Run offline: generate proof via snarkjs, paste vectors here, then remove #[ignore].
#[test]
#[ignore]
fn test_verify_zk_proof_valid() {
    let (mut svm, host) = setup();
    // duel_pda is now a full Pubkey (32 bytes) used as the PDA seed.
    let mut duel_pda_bytes = [0u8; 32];
    duel_pda_bytes[..8].copy_from_slice(&1003u64.to_le_bytes());
    let duel_pda = solana_pubkey::Pubkey::from(duel_pda_bytes);
    let round_u64: u64 = 1;

    // public_inputs: [commitment, round_fe, pubkey_lo_fe, pubkey_hi_fe]
    // Replace with real proof vectors from hand_commitment v2 circuit.
    let public_inputs: [[u8; 32]; 4] = [[0u8; 32]; 4];

    let (zk_record, _) = solana_pubkey::Pubkey::find_program_address(
        &[
            b"zk_proof",
            duel_pda.as_ref(),
            &round_u64.to_le_bytes(),
            host.pubkey().as_ref(),
        ],
        &oxark::id(),
    );
    let ix = Instruction::new_with_bytes(
        oxark::id(),
        &oxark::instruction::VerifyZkProof {
            proof_a: PROOF_CR_A,
            proof_b: PROOF_CR_B,
            proof_c: PROOF_CR_C,
            public_inputs,
            duel_pda,
            round: round_u64,
        }
        .data(),
        oxark::accounts::VerifyZkProof {
            signer: host.pubkey(),
            zk_proof_record: zk_record,
            system_program: solana_sdk_ids::system_program::id(),
        }
        .to_account_metas(None),
    );

    let meta = send_ix_result(&mut svm, ix, &host)
        .expect("verify_zk_proof with valid hand_commitment proof must succeed");
    let cu = meta.compute_units_consumed;
    println!("verify_zk_proof CU: {cu}");
    assert!(cu < 300_000, "CU budget exceeded: {cu}");
}

#[test]
fn test_verify_zk_proof_tampered() {
    let (mut svm, host) = setup();
    // duel_pda is now a full Pubkey (32 bytes) used as the PDA seed.
    let mut duel_pda_bytes = [0u8; 32];
    duel_pda_bytes[..8].copy_from_slice(&1004u64.to_le_bytes());
    let duel_pda = solana_pubkey::Pubkey::from(duel_pda_bytes);
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
        &[
            b"zk_proof",
            duel_pda.as_ref(),
            &round_u64.to_le_bytes(),
            host.pubkey().as_ref(),
        ],
        &oxark::id(),
    );
    let ix = Instruction::new_with_bytes(
        oxark::id(),
        &oxark::instruction::VerifyZkProof {
            proof_a: PROOF_CR_A_BAD, // tampered: not a valid hand_commitment v2 proof
            proof_b: PROOF_CR_B,
            proof_c: PROOF_CR_C,
            public_inputs,
            duel_pda,
            round: round_u64,
        }
        .data(),
        oxark::accounts::VerifyZkProof {
            signer: host.pubkey(),
            zk_proof_record: zk_record,
            system_program: solana_sdk_ids::system_program::id(),
        }
        .to_account_metas(None),
    );

    let result = send_ix_result(&mut svm, ix, &host);
    assert!(
        result.is_err(),
        "tampered hand_commitment proof must be rejected"
    );
}

// ── Circuit 3: hand_commitment ────────────────────────────────────────────────

#[test]
fn test_commit_hand_valid_proof() {
    let (mut svm, authority) = setup();
    let player1 = Keypair::new_from_array(HC_PROVER_SEED);
    let player2 = Keypair::new();
    svm.airdrop(&player1.pubkey(), 10_000_000_000).unwrap();
    svm.airdrop(&player2.pubkey(), 10_000_000_000).unwrap();

    // Use a fixed Pubkey as duel_id (derived from a known seed for reproducibility)
    let duel_id = solana_pubkey::Pubkey::new_unique();
    let (duel_key, _) = duel_pda(&duel_id);

    // Initialize duel: authority pays, player1 and player2 are participants
    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::InitDuel {
                duel_id,
                hall_tier: 0,
                ante: 0,
            }
            .data(),
            oxark::accounts::InitDuel {
                duel: duel_key,
                player_1: player1.pubkey(),
                player_2: player2.pubkey(),
                authority: authority.pubkey(),
                system_program: solana_sdk_ids::system_program::id(),
            }
            .to_account_metas(None),
        ),
        &authority,
    );

    // public_signals: [commitment, round=1, pubkey_lo, pubkey_hi]
    let public_signals = [
        PUBLIC_HC_COMMITMENT,
        PUBLIC_HC_ROUND,
        PUBLIC_HC_PUBKEY_LO,
        PUBLIC_HC_PUBKEY_HI,
    ];

    // player1 submits hand commitment (must be a duel participant)
    let ix = Instruction::new_with_bytes(
        oxark::id(),
        &oxark::instruction::CommitHand {
            duel_id,
            round: 1,
            proof_a: PROOF_HC_A,
            proof_b: PROOF_HC_B,
            proof_c: PROOF_HC_C,
            public_signals,
        }
        .data(),
        oxark::accounts::CommitHand {
            duel: duel_key,
            player: player1.pubkey(),
            player_state: player_state_pda(&player1.pubkey()).0,
        }
        .to_account_metas(None),
    );

    craft_player(&mut svm, &player1.pubkey(), 0);
    let meta = send_ix_result_multi(&mut svm, ix, &authority, &[&player1])
        .expect("commit_hand with valid hand_commitment proof must succeed");

    let cu = meta.compute_units_consumed;
    println!("commit_hand CU: {cu}");
    assert!(cu < 200_000, "CU budget exceeded: {cu} >= 200_000");
}

#[test]
fn test_commit_hand_tampered_proof() {
    let (mut svm, authority) = setup();
    let player1 = Keypair::new_from_array(HC_PROVER_SEED);
    let player2 = Keypair::new();
    svm.airdrop(&player1.pubkey(), 10_000_000_000).unwrap();
    svm.airdrop(&player2.pubkey(), 10_000_000_000).unwrap();

    let duel_id = solana_pubkey::Pubkey::new_unique();
    let (duel_key, _) = duel_pda(&duel_id);

    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::InitDuel {
                duel_id,
                hall_tier: 0,
                ante: 0,
            }
            .data(),
            oxark::accounts::InitDuel {
                duel: duel_key,
                player_1: player1.pubkey(),
                player_2: player2.pubkey(),
                authority: authority.pubkey(),
                system_program: solana_sdk_ids::system_program::id(),
            }
            .to_account_metas(None),
        ),
        &authority,
    );

    let public_signals = [
        PUBLIC_HC_COMMITMENT,
        PUBLIC_HC_ROUND,
        PUBLIC_HC_PUBKEY_LO,
        PUBLIC_HC_PUBKEY_HI,
    ];

    let ix = Instruction::new_with_bytes(
        oxark::id(),
        &oxark::instruction::CommitHand {
            duel_id,
            round: 1,
            proof_a: PROOF_HC_A_BAD, // tampered: first byte flipped
            proof_b: PROOF_HC_B,
            proof_c: PROOF_HC_C,
            public_signals,
        }
        .data(),
        oxark::accounts::CommitHand {
            duel: duel_key,
            player: player1.pubkey(),
            player_state: player_state_pda(&player1.pubkey()).0,
        }
        .to_account_metas(None),
    );

    craft_player(&mut svm, &player1.pubkey(), 0);
    let result = send_ix_result_multi(&mut svm, ix, &authority, &[&player1]);
    assert!(
        result.is_err(),
        "tampered hand_commitment proof must be rejected"
    );
}

// The salt and card_ids that the PROOF_HC_* / PUBLIC_HC_* fixtures were
// generated from (tools/gen-zk-test-fixtures.mjs: salt = [0x11; 32],
// cards [1,5,23,47,2] padded to 10, round 1). reveal_hand must be called with
// these exact values to recompute the same Poseidon commitment.
const HC_SALT: [u8; 32] = [0x11; 32];
const HC_CARD_IDS: [u64; 10] = [1, 5, 23, 47, 2, 0, 0, 0, 0, 0];

/// Full ZK dispatch happy path: init_duel → commit_hand → reveal_hand.
///
/// This is the integration test whose absence let the poseidon_helper lo/hi
/// swap (and earlier the orphaned commit_hand VK) ship undetected — the only
/// reveal tests exercised the unrelated SHA-256 commit_action/reveal_action
/// path, and the old Poseidon test ran the helper NATIVELY where CU cost is
/// invisible. Here commit_hand stores the circuit commitment and reveal_hand
/// recomputes Poseidon(6) ON-CHAIN via the sol_poseidon syscall over the same
/// pubkey/salt/cards; the recomputed commitment must match.
///
/// YKK-33: this previously had to be #[ignore]'d because the v2 on-chain
/// Poseidon(15) cost >8M CU (over Solana's 1.4M/tx max). v3 packs the cards and
/// uses Poseidon(6) via the syscall (~2,738 CU), so reveal_hand now fits — the
/// test asserts the measured CU is well under the 1.4M ceiling.
#[test]
fn test_commit_hand_then_reveal_hand_roundtrip() {
    let (mut svm, authority) = setup();
    let player1 = Keypair::new_from_array(HC_PROVER_SEED);
    let player2 = Keypair::new();
    svm.airdrop(&player1.pubkey(), 10_000_000_000).unwrap();
    svm.airdrop(&player2.pubkey(), 10_000_000_000).unwrap();

    let duel_id = solana_pubkey::Pubkey::new_unique();
    let (duel_key, _) = duel_pda(&duel_id);

    // init_duel
    send_ix(
        &mut svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::InitDuel {
                duel_id,
                hall_tier: 0,
                ante: 0,
            }
            .data(),
            oxark::accounts::InitDuel {
                duel: duel_key,
                player_1: player1.pubkey(),
                player_2: player2.pubkey(),
                authority: authority.pubkey(),
                system_program: solana_sdk_ids::system_program::id(),
            }
            .to_account_metas(None),
        ),
        &authority,
    );

    // commit_hand (round 1) — stores the circuit commitment + sets zk_verified
    let public_signals = [
        PUBLIC_HC_COMMITMENT,
        PUBLIC_HC_ROUND,
        PUBLIC_HC_PUBKEY_LO,
        PUBLIC_HC_PUBKEY_HI,
    ];
    let commit_ix = Instruction::new_with_bytes(
        oxark::id(),
        &oxark::instruction::CommitHand {
            duel_id,
            round: 1,
            proof_a: PROOF_HC_A,
            proof_b: PROOF_HC_B,
            proof_c: PROOF_HC_C,
            public_signals,
        }
        .data(),
        oxark::accounts::CommitHand {
            duel: duel_key,
            player: player1.pubkey(),
            player_state: player_state_pda(&player1.pubkey()).0,
        }
        .to_account_metas(None),
    );
    craft_player(&mut svm, &player1.pubkey(), 0);
    send_ix_result_multi(&mut svm, commit_ix, &authority, &[&player1])
        .expect("commit_hand with valid proof must succeed");

    // Build a reveal_hand instruction for the given card_ids.
    let reveal_ix = |card_ids: [u64; 10]| {
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::RevealHand {
                duel_id,
                round: 1,
                card_ids,
                salt: HC_SALT,
            }
            .data(),
            oxark::accounts::RevealHand {
                duel: duel_key,
                player: player1.pubkey(),
            }
            .to_account_metas(None),
        )
    };

    // Cheat direction first: reveal a different hand than was committed. The
    // recomputed Poseidon won't match the stored commitment → CommitmentMismatch.
    // A failed tx rolls back, so the honest reveal below still works.
    let cheat_cards: [u64; 10] = [1, 5, 23, 47, 3, 0, 0, 0, 0, 0];
    let cheat = send_ix_result_multi(&mut svm, reveal_ix(cheat_cards), &authority, &[&player1]);
    let cheat_err = cheat.expect_err("reveal_hand with mismatched card_ids must be rejected");
    assert!(
        cheat_err
            .meta
            .logs
            .iter()
            .any(|l| l.contains("CommitmentMismatch")),
        "expected CommitmentMismatch, got logs: {:?}",
        cheat_err.meta.logs
    );

    // Honest reveal: same pubkey/salt/cards as the committed proof → succeeds.
    let honest = send_ix_result_multi(&mut svm, reveal_ix(HC_CARD_IDS), &authority, &[&player1])
        .expect("honest reveal_hand must succeed (Poseidon commitment must match)");
    // YKK-33: reveal_hand must fit Solana's 1.4M CU/tx ceiling (v2 needed >8M).
    let reveal_cu = honest.compute_units_consumed;
    println!("reveal_hand CU (Poseidon(6) via sol_poseidon syscall): {reveal_cu}");
    assert!(
        reveal_cu < 1_400_000,
        "reveal_hand exceeded Solana CU/tx max: {reveal_cu} >= 1_400_000"
    );

    // The revealed hand is recorded on-chain.
    let acct = svm.get_account(&duel_key).expect("duel account exists");
    let mut data: &[u8] = &acct.data;
    let duel = oxark::state::DuelState::try_deserialize(&mut data).expect("deserialize DuelState");
    assert_eq!(
        duel.player_1_revealed[0], HC_CARD_IDS,
        "player_1 round-1 revealed cards must be recorded"
    );
}

// ─── YKK: claim_prize_v2 rank distribution + carry-over (post-settlement) ──────
//
// finalize_season_tally / end_season_final are ADMIN-gated (ADMIN_PUBKEY), whose
// key we don't hold in-process, so these e2e tests craft the GameWorld in its
// post-`end_season_final` state (status=2, tallies populated, timeout-champion
// already removed from its band) and exercise claim_prize_v2 — the player-facing
// path that the bug lived in. The carry-over math itself is unit-tested in
// claim_prize_v2.rs (`band_shares_*`). Non-admin rejection of the crank/end is
// covered below. (The admin-signed success paths of finalize/end can't be signed
// in litesvm — noted in the PR.)
//
// YKK-38: the prize pool is now the PDA seeds=[b"prize_pool"]; claim_prize_v2 pays
// out via invoke_signed, so the program (not the vault) signs. Tests below craft the
// pool as that PDA and claim with ONLY the player signing — exactly the production
// flow — proving payouts work without any external vault signature.

fn gw_pda() -> (Pubkey, u8) {
    solana_pubkey::Pubkey::find_program_address(&[b"game_world"], &oxark::id())
}
fn player_state_pda(p: &Pubkey) -> (Pubkey, u8) {
    solana_pubkey::Pubkey::find_program_address(&[b"player", p.as_ref()], &oxark::id())
}
fn prize_pool_pda() -> (Pubkey, u8) {
    solana_pubkey::Pubkey::find_program_address(&[b"prize_pool"], &oxark::id())
}

fn craft_owned(svm: &mut LiteSVM, addr: &Pubkey, data: Vec<u8>) {
    let lamports = svm.minimum_balance_for_rent_exemption(data.len()) + 2_000_000;
    svm.airdrop(addr, lamports).unwrap();
    let mut acc = svm.get_account(addr).unwrap();
    acc.data = data;
    acc.owner = oxark::id();
    svm.set_account(*addr, acc).unwrap();
}

fn craft_player(svm: &mut LiteSVM, player: &Pubkey, vault_count: usize) {
    let (pda, bump) = player_state_pda(player);
    let mut ps = oxark::state::PlayerState::default();
    ps.bump = bump; // canonical bump so commit_hand's `bump = player_state.bump` matches
    ps.deposit_amount = 500_000_000; // >0 so the C1 claim gate passes
    ps.energy = 5; // full energy so commit_hand's duel-entry gate passes
    for i in 0..vault_count {
        ps.vault_bitmap[i / 8] |= 1u8 << (i % 8);
    }
    let mut buf = Vec::new();
    ps.try_serialize(&mut buf).unwrap();
    craft_owned(svm, &pda, buf);
}

/// Craft a GameWorld already in the post-`end_season_final` (status=2) state.
#[allow(clippy::too_many_arguments)]
fn craft_ended_world(
    svm: &mut LiteSVM,
    total_prize_pool: u64,
    winner_60_count: u8,
    max_vault: u8,
    max_vault_count: u32,
    t2: u64,
    t3: u64,
    t4: u64,
    t5: u64,
) -> (Pubkey, Pubkey) {
    let (pda, bump) = gw_pda();
    let (pool_pda, pool_bump) = prize_pool_pda();
    let mut gw = oxark::state::GameWorld::default();
    gw.total_prize_pool = total_prize_pool;
    gw.game_status = 2;
    gw.winner_60_count = winner_60_count;
    gw.max_vault = max_vault;
    gw.max_vault_count = max_vault_count;
    gw.tier2_total_vault = t2;
    gw.tier3_total_vault = t3;
    gw.tier4_total_vault = t4;
    gw.tier5_total_vault = t5;
    gw.bump = bump;
    gw.prize_pool = pool_pda;
    gw.prize_pool_bump = pool_bump;
    let mut buf = Vec::new();
    gw.try_serialize(&mut buf).unwrap();
    craft_owned(svm, &pda, buf);
    // Fund the prize-pool PDA as a lamports-only System account (the production
    // shape: deposits land here, claim pays out via invoke_signed). The +10M
    // buffer keeps it above the rent-exempt floor after payouts.
    svm.airdrop(&pool_pda, total_prize_pool + 10_000_000)
        .unwrap();
    (pda, pool_pda)
}

/// Claim for `player` (player-only signature — production flow); returns the
/// prize_pool balance delta (= the payout).
fn do_claim(svm: &mut LiteSVM, player: &Keypair, prize_pool: &Pubkey, gw: &Pubkey) -> u64 {
    let (ps_pda, _) = player_state_pda(&player.pubkey());
    let before = svm.get_account(prize_pool).unwrap().lamports;
    let metas = oxark::accounts::ClaimPrizeV2 {
        player_state: ps_pda,
        game_world: *gw,
        prize_pool: *prize_pool,
        player: player.pubkey(),
        system_program: solana_sdk_ids::system_program::id(),
    }
    .to_account_metas(None);
    let ix = Instruction::new_with_bytes(
        oxark::id(),
        &oxark::instruction::ClaimPrizeV2 {}.data(),
        metas,
    );
    send_ix_result_multi(svm, ix, player, &[]).expect("claim_prize_v2 should succeed");
    let after = svm.get_account(prize_pool).unwrap().lamports;
    before - after
}

/// Timeout (no 60-collector): A(40)=champion, B(35)=tier3, C(10)=tier4.
/// Old bug: first two claimers each take 50% (whole pool), C gets 0.
/// Fixed: A=50% (Tier-1), B=tier3 with T2's empty 25% carried in (=40%), C=tier4 8%.
#[test]
fn claim_prize_v2_timeout_distributes_by_rank_not_arrival() {
    let (mut svm, _authority) = setup();
    let pool = 100_000_000_000u64; // 100 SOL
                                   // Post-end timeout state: champion (40) removed from tier3 → tier3 = B's 35.
    let (gw, prize_pool) = craft_ended_world(&mut svm, pool, 0, 40, 1, 0, 35, 10, 0);

    let a = Keypair::new();
    let b = Keypair::new();
    let c = Keypair::new();
    for k in [&a, &b, &c] {
        svm.airdrop(&k.pubkey(), 1_000_000_000).unwrap();
    }
    craft_player(&mut svm, &a.pubkey(), 40);
    craft_player(&mut svm, &b.pubkey(), 35);
    craft_player(&mut svm, &c.pubkey(), 10);

    let pa = do_claim(&mut svm, &a, &prize_pool, &gw);
    let pb = do_claim(&mut svm, &b, &prize_pool, &gw);
    let pc = do_claim(&mut svm, &c, &prize_pool, &gw);

    assert_eq!(pa, pool * 50 / 100, "champion A gets Tier-1 50%");
    assert_eq!(
        pb,
        pool * 40 / 100,
        "B (sole tier3) gets 15% + carried-down empty-T2 25%"
    );
    assert_eq!(pc, pool * 8 / 100, "C (sole tier4) gets 8%");
    assert!(pa + pb + pc <= pool, "Σ payouts must not exceed the pool");
    assert!(
        pc > 0,
        "C must not be starved — the old bug gave the 3rd claimer 0"
    );
    assert_ne!(
        pb,
        pool * 50 / 100,
        "B must NOT also receive a full 50% (old drain)"
    );
}

/// Same scenario, reversed claim order → identical payouts (order-independence).
#[test]
fn claim_prize_v2_payout_is_order_independent() {
    let (mut svm, _authority) = setup();
    let pool = 100_000_000_000u64;
    let (gw, prize_pool) = craft_ended_world(&mut svm, pool, 0, 40, 1, 0, 35, 10, 0);
    let a = Keypair::new();
    let b = Keypair::new();
    let c = Keypair::new();
    for k in [&a, &b, &c] {
        svm.airdrop(&k.pubkey(), 1_000_000_000).unwrap();
    }
    craft_player(&mut svm, &a.pubkey(), 40);
    craft_player(&mut svm, &b.pubkey(), 35);
    craft_player(&mut svm, &c.pubkey(), 10);

    // Reverse order: C, B, A.
    let pc = do_claim(&mut svm, &c, &prize_pool, &gw);
    let pb = do_claim(&mut svm, &b, &prize_pool, &gw);
    let pa = do_claim(&mut svm, &a, &prize_pool, &gw);

    assert_eq!(pa, pool * 50 / 100);
    assert_eq!(pb, pool * 40 / 100);
    assert_eq!(pc, pool * 8 / 100);
}

#[test]
fn finalize_and_end_reject_non_admin() {
    let (mut svm, _authority) = setup();
    let (gw, _pp) = craft_ended_world(&mut svm, 1_000_000_000, 0, 5, 1, 0, 0, 0, 5);
    let attacker = Keypair::new();
    svm.airdrop(&attacker.pubkey(), 1_000_000_000).unwrap();

    let fin = Instruction::new_with_bytes(
        oxark::id(),
        &oxark::instruction::FinalizeSeasonTally { players: vec![] }.data(),
        oxark::accounts::FinalizeSeasonTally {
            game_world: gw,
            admin: attacker.pubkey(),
        }
        .to_account_metas(None),
    );
    let r = send_ix_result_multi(&mut svm, fin, &attacker, &[]);
    assert!(
        format!("{:?}", r.unwrap_err()).contains("NotAdmin"),
        "finalize_season_tally must reject a non-admin signer"
    );

    let end = Instruction::new_with_bytes(
        oxark::id(),
        &oxark::instruction::EndSeasonFinal {}.data(),
        oxark::accounts::EndSeasonFinal {
            game_world: gw,
            admin: attacker.pubkey(),
        }
        .to_account_metas(None),
    );
    let r2 = send_ix_result_multi(&mut svm, end, &attacker, &[]);
    assert!(
        format!("{:?}", r2.unwrap_err()).contains("NotAdmin"),
        "end_season_final must reject a non-admin signer"
    );
}

/// Build a `ClaimPrizeV2` instruction (player-only signer) for the negative tests.
fn claim_ix(player: &Pubkey, prize_pool: &Pubkey, gw: &Pubkey) -> Instruction {
    let (ps_pda, _) = player_state_pda(player);
    Instruction::new_with_bytes(
        oxark::id(),
        &oxark::instruction::ClaimPrizeV2 {}.data(),
        oxark::accounts::ClaimPrizeV2 {
            player_state: ps_pda,
            game_world: *gw,
            prize_pool: *prize_pool,
            player: *player,
            system_program: solana_sdk_ids::system_program::id(),
        }
        .to_account_metas(None),
    )
}

/// YKK-38: after a claim, the prize-pool PDA must never drop below the rent-exempt
/// floor (a lamports-only System account with 0 data still needs minimum_balance(0)).
#[test]
fn claim_prize_v2_preserves_rent_exempt_floor() {
    let (mut svm, _authority) = setup();
    let pool = 100_000_000_000u64;
    // Single champion claims the full Tier-1 share; pool drains the most here.
    let (gw, prize_pool) = craft_ended_world(&mut svm, pool, 0, 40, 1, 0, 0, 0, 0);
    let a = Keypair::new();
    svm.airdrop(&a.pubkey(), 1_000_000_000).unwrap();
    craft_player(&mut svm, &a.pubkey(), 40);

    let paid = do_claim(&mut svm, &a, &prize_pool, &gw);
    assert_eq!(paid, pool * 50 / 100, "champion gets Tier-1 50%");

    let rent_floor = svm.minimum_balance_for_rent_exemption(0);
    let remaining = svm.get_account(&prize_pool).unwrap().lamports;
    assert!(
        remaining >= rent_floor,
        "pool ({remaining}) must stay at/above the rent-exempt floor ({rent_floor})"
    );
}

/// C1 invariant survives the invoke_signed rewrite: a second claim is rejected
/// (deposit_amount is zeroed after the first), so no one can drain twice.
#[test]
fn claim_prize_v2_double_claim_rejected() {
    let (mut svm, _authority) = setup();
    let pool = 100_000_000_000u64;
    let (gw, prize_pool) = craft_ended_world(&mut svm, pool, 0, 40, 1, 0, 0, 0, 0);
    let a = Keypair::new();
    svm.airdrop(&a.pubkey(), 1_000_000_000).unwrap();
    craft_player(&mut svm, &a.pubkey(), 40);

    let _first = do_claim(&mut svm, &a, &prize_pool, &gw);
    // New blockhash so the second tx is re-executed (not deduped as already
    // processed) and actually reaches the program's C1 deposit gate.
    svm.expire_blockhash();
    let r = send_ix_result_multi(&mut svm, claim_ix(&a.pubkey(), &prize_pool, &gw), &a, &[]);
    assert!(
        format!("{:?}", r.unwrap_err()).contains("NotRegistered"),
        "a second claim must be rejected by the C1 deposit gate"
    );
}

/// Claiming before the season is finalized (game_status != 2) is rejected.
#[test]
fn claim_prize_v2_rejects_before_game_ended() {
    let (mut svm, _authority) = setup();
    let pool = 100_000_000_000u64;
    let (gw_pda_addr, bump) = gw_pda();
    let (pool_pda, pool_bump) = prize_pool_pda();
    // Craft a world still ACTIVE (status 1), not ended.
    let mut gw = oxark::state::GameWorld::default();
    gw.total_prize_pool = pool;
    gw.game_status = 1;
    gw.max_vault = 40;
    gw.max_vault_count = 1;
    gw.bump = bump;
    gw.prize_pool = pool_pda;
    gw.prize_pool_bump = pool_bump;
    let mut buf = Vec::new();
    gw.try_serialize(&mut buf).unwrap();
    craft_owned(&mut svm, &gw_pda_addr, buf);
    svm.airdrop(&pool_pda, pool + 10_000_000).unwrap();

    let a = Keypair::new();
    svm.airdrop(&a.pubkey(), 1_000_000_000).unwrap();
    craft_player(&mut svm, &a.pubkey(), 40);

    let r = send_ix_result_multi(
        &mut svm,
        claim_ix(&a.pubkey(), &pool_pda, &gw_pda_addr),
        &a,
        &[],
    );
    assert!(
        format!("{:?}", r.unwrap_err()).contains("GameNotEnded"),
        "claim before game_status==2 must be rejected with GameNotEnded"
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Energy consumption at duel entry (YKK-44).
//
// The pure regen/spend math (`settle_and_spend`) is unit-tested in
// instructions::refill_energy. These tests cover the WIRING that `dc540b8` added
// to commit_hand: that entering a duel actually charges 1 energy on the player's
// first round-1 commit, and that a player with 0 energy is blocked. Without these,
// the gate could silently no-op (the same "tested primitive, untested wiring" gap
// that hid the settle_duel_history stack overflow).
//
// All three reuse the committed valid-proof fixture (HC_PROVER_SEED / PROOF_HC_*)
// so commit_hand's Groth16 check passes and we reach the energy charge.
// ─────────────────────────────────────────────────────────────────────────────

/// Craft the season PlayerState for `player` with a specific starting energy,
/// leaving the regen clock at 0 (so no natural regen interferes with the test —
/// litesvm's clock starts near 0 and these tests don't advance it a full 4h).
fn craft_player_energy(svm: &mut LiteSVM, player: &Pubkey, energy: u8) {
    let (pda, bump) = player_state_pda(player);
    let mut ps = oxark::state::PlayerState::default();
    ps.bump = bump;
    ps.deposit_amount = 500_000_000;
    ps.energy = energy;
    ps.last_energy_regen_at = 0;
    let mut buf = Vec::new();
    ps.try_serialize(&mut buf).unwrap();
    craft_owned(svm, &pda, buf);
}

/// Read a player's current energy by deserializing PlayerState (offset-agnostic).
fn read_energy(svm: &LiteSVM, player: &Pubkey) -> u8 {
    let (pda, _) = player_state_pda(player);
    let acc = svm.get_account(&pda).expect("player_state must exist");
    let mut data: &[u8] = &acc.data;
    let ps = oxark::state::PlayerState::try_deserialize(&mut data)
        .expect("deserialize PlayerState");
    ps.energy
}

/// Build the round-1 commit_hand instruction for the fixture prover.
fn fixture_commit_ix(
    duel_id: solana_pubkey::Pubkey,
    duel_key: Pubkey,
    player: &Pubkey,
) -> Instruction {
    Instruction::new_with_bytes(
        oxark::id(),
        &oxark::instruction::CommitHand {
            duel_id,
            round: 1,
            proof_a: PROOF_HC_A,
            proof_b: PROOF_HC_B,
            proof_c: PROOF_HC_C,
            public_signals: [
                PUBLIC_HC_COMMITMENT,
                PUBLIC_HC_ROUND,
                PUBLIC_HC_PUBKEY_LO,
                PUBLIC_HC_PUBKEY_HI,
            ],
        }
        .data(),
        oxark::accounts::CommitHand {
            duel: duel_key,
            player: *player,
            player_state: player_state_pda(player).0,
        }
        .to_account_metas(None),
    )
}

/// Init a fresh duel with the fixture prover as player_1. Returns (duel_id, duel_key).
fn init_fixture_duel(
    svm: &mut LiteSVM,
    authority: &Keypair,
    player1: &Pubkey,
    player2: &Pubkey,
) -> (solana_pubkey::Pubkey, Pubkey) {
    let duel_id = solana_pubkey::Pubkey::new_unique();
    let (duel_key, _) = duel_pda(&duel_id);
    send_ix(
        svm,
        Instruction::new_with_bytes(
            oxark::id(),
            &oxark::instruction::InitDuel {
                duel_id,
                hall_tier: 0,
                ante: 0,
            }
            .data(),
            oxark::accounts::InitDuel {
                duel: duel_key,
                player_1: *player1,
                player_2: *player2,
                authority: authority.pubkey(),
                system_program: solana_sdk_ids::system_program::id(),
            }
            .to_account_metas(None),
        ),
        authority,
    );
    (duel_id, duel_key)
}

#[test]
fn commit_hand_charges_one_energy_on_duel_entry() {
    let (mut svm, authority) = setup();
    let player1 = Keypair::new_from_array(HC_PROVER_SEED);
    let player2 = Keypair::new();
    svm.airdrop(&player1.pubkey(), 10_000_000_000).unwrap();

    let (duel_id, duel_key) = init_fixture_duel(&mut svm, &authority, &player1.pubkey(), &player2.pubkey());

    // Start at full energy (5). First round-1 commit should spend exactly 1 → 4.
    craft_player_energy(&mut svm, &player1.pubkey(), 5);
    assert_eq!(read_energy(&svm, &player1.pubkey()), 5, "precondition: energy 5");

    let ix = fixture_commit_ix(duel_id, duel_key, &player1.pubkey());
    send_ix_result_multi(&mut svm, ix, &authority, &[&player1])
        .expect("commit_hand with full energy must succeed");

    assert_eq!(
        read_energy(&svm, &player1.pubkey()),
        4,
        "duel entry must spend exactly 1 energy (5 → 4)"
    );
}

#[test]
fn commit_hand_blocked_when_zero_energy() {
    let (mut svm, authority) = setup();
    let player1 = Keypair::new_from_array(HC_PROVER_SEED);
    let player2 = Keypair::new();
    svm.airdrop(&player1.pubkey(), 10_000_000_000).unwrap();

    let (duel_id, duel_key) = init_fixture_duel(&mut svm, &authority, &player1.pubkey(), &player2.pubkey());

    // Zero energy, clock at 0 → no regen available → duel entry must be refused.
    craft_player_energy(&mut svm, &player1.pubkey(), 0);

    let ix = fixture_commit_ix(duel_id, duel_key, &player1.pubkey());
    let err = send_ix_result_multi(&mut svm, ix, &authority, &[&player1])
        .expect_err("commit_hand with 0 energy must fail");

    assert!(
        format!("{:?}", err).contains("InsufficientEnergy"),
        "expected InsufficientEnergy, got: {err:?}"
    );
    // Energy stays at 0 (the failed tx reverts any state).
    assert_eq!(read_energy(&svm, &player1.pubkey()), 0, "energy unchanged after rejected entry");
}

#[test]
fn commit_hand_charges_per_duel_entry_not_per_round() {
    // Honest per-duel semantics: entering duel A spends 1 (5→4), then entering a
    // SEPARATE duel B spends another 1 (4→3). This proves the charge is a
    // per-duel-entry cost that re-fires on each new duel — using only the fixture
    // proof (valid round-1 commits), no fabricated round-2 proof required.
    //
    // (The round==1 gate in commit_hand already prevents a second charge within the
    // same duel: round-2+ commits skip the charge block, and a repeat round-1
    // commit is rejected by AlreadyCommitted before the charge. This test locks in
    // the positive half — that each distinct duel entry costs exactly 1.)
    let (mut svm, authority) = setup();
    let player1 = Keypair::new_from_array(HC_PROVER_SEED);
    let player2 = Keypair::new();
    svm.airdrop(&player1.pubkey(), 10_000_000_000).unwrap();

    craft_player_energy(&mut svm, &player1.pubkey(), 5);

    // Duel A entry: 5 → 4.
    let (duel_id_a, duel_key_a) = init_fixture_duel(&mut svm, &authority, &player1.pubkey(), &player2.pubkey());
    let ix_a = fixture_commit_ix(duel_id_a, duel_key_a, &player1.pubkey());
    send_ix_result_multi(&mut svm, ix_a, &authority, &[&player1])
        .expect("duel A entry must succeed");
    assert_eq!(read_energy(&svm, &player1.pubkey()), 4, "duel A entry spends 1 (5→4)");

    // Duel B entry (fresh duel, same prover): 4 → 3.
    let (duel_id_b, duel_key_b) = init_fixture_duel(&mut svm, &authority, &player1.pubkey(), &player2.pubkey());
    let ix_b = fixture_commit_ix(duel_id_b, duel_key_b, &player1.pubkey());
    send_ix_result_multi(&mut svm, ix_b, &authority, &[&player1])
        .expect("duel B entry must succeed");
    assert_eq!(
        read_energy(&svm, &player1.pubkey()),
        3,
        "each distinct duel entry costs exactly 1 (4→3)"
    );
}
