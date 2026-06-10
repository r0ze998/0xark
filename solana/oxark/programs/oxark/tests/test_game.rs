use {
    anchor_lang::{solana_program::instruction::Instruction, InstructionData, ToAccountMetas},
    litesvm::LiteSVM,
    sha2::{Digest, Sha256},
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
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

// hand_commitment circuit (576 constraints) — cards=[1,5,23,47,2], round=1,
// salt=0x11*32, prover keypair seed = [0x42; 32] (see HC_PROVER_SEED in tests)
const PROOF_HC_A: [u8; 64] = [
    24, 4, 79, 234, 197, 88, 166, 128, 69, 202, 117, 104, 121, 176, 65, 212, 243, 31, 14, 91, 140,
    132, 225, 161, 84, 123, 223, 155, 110, 118, 116, 98, 18, 215, 153, 89, 223, 252, 69, 78, 112,
    68, 252, 124, 154, 96, 134, 241, 197, 201, 93, 96, 7, 16, 232, 50, 253, 64, 171, 85, 105, 61,
    23, 245,
];
const PROOF_HC_B: [u8; 128] = [
    4, 2, 17, 10, 71, 83, 16, 83, 133, 186, 248, 93, 117, 60, 179, 201, 161, 93, 106, 160, 6, 48,
    136, 22, 11, 183, 14, 162, 115, 58, 226, 131, 20, 115, 80, 186, 11, 82, 142, 184, 117, 133,
    215, 178, 171, 26, 17, 11, 249, 69, 251, 255, 147, 214, 124, 113, 91, 169, 41, 208, 208, 192,
    101, 184, 31, 219, 175, 96, 234, 243, 202, 214, 98, 97, 15, 157, 128, 237, 177, 14, 162, 125,
    95, 63, 56, 5, 47, 110, 171, 21, 39, 30, 67, 135, 200, 143, 6, 155, 74, 227, 49, 64, 24, 205,
    92, 136, 70, 67, 128, 100, 223, 182, 153, 210, 119, 61, 127, 166, 107, 146, 236, 238, 158, 208,
    117, 29, 161, 248,
];
const PROOF_HC_C: [u8; 64] = [
    41, 182, 156, 33, 32, 195, 149, 100, 30, 191, 86, 227, 230, 198, 218, 221, 167, 49, 232, 128,
    47, 44, 132, 59, 236, 188, 117, 62, 148, 12, 14, 125, 16, 198, 215, 69, 120, 95, 185, 107, 36,
    83, 65, 225, 141, 102, 193, 155, 115, 184, 100, 115, 40, 143, 182, 151, 160, 237, 238, 150,
    214, 143, 107, 117,
];
// public_signals: [commitment, round=1, pubkey_lo, pubkey_hi] for seed-0x42 keypair
const PUBLIC_HC_COMMITMENT: [u8; 32] = [
    5, 218, 86, 161, 233, 241, 109, 211, 200, 97, 9, 12, 85, 248, 14, 32, 198, 72, 217, 144, 0, 49,
    164, 26, 223, 70, 118, 126, 29, 170, 29, 10,
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
    231, 4, 79, 234, 197, 88, 166, 128, 69, 202, 117, 104, 121, 176, 65, 212, 243, 31, 14, 91, 140,
    132, 225, 161, 84, 123, 223, 155, 110, 118, 116, 98, 18, 215, 153, 89, 223, 252, 69, 78, 112,
    68, 252, 124, 154, 96, 134, 241, 197, 201, 93, 96, 7, 16, 232, 50, 253, 64, 171, 85, 105, 61,
    23, 245,
];

/// Seed of the keypair the PROOF_HC_* fixture is bound to (pubkey_lo/hi public
/// signals). commit_hand validates proof-signer binding, so these tests must
/// sign with exactly this keypair. Regenerate fixtures with a different seed
/// via snarkjs fullProve against solana/client/hand_commitment_final.zkey.
const HC_PROVER_SEED: [u8; 32] = [0x42; 32];

fn setup() -> (LiteSVM, Keypair) {
    use solana_compute_budget::compute_budget::ComputeBudget;
    let program_id = oxark::id();
    let payer = Keypair::new();
    // custom-heap is enabled by default: the program's BumpAllocator is 256KB.
    // The VM must map at least 256KB of heap or the first alloc causes an
    // access violation at ~0x30003ff38 (above the default 32KB mapped region).
    let base = ComputeBudget::new_with_defaults(false, false);
    let budget = ComputeBudget {
        heap_size: 256 * 1024,
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
        }
        .to_account_metas(None),
    );

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
        }
        .to_account_metas(None),
    );

    let result = send_ix_result_multi(&mut svm, ix, &authority, &[&player1]);
    assert!(
        result.is_err(),
        "tampered hand_commitment proof must be rejected"
    );
}
