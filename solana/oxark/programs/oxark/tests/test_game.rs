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
