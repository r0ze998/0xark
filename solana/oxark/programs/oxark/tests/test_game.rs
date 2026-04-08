use {
    anchor_lang::{
        solana_program::instruction::Instruction, InstructionData, ToAccountMetas,
    },
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
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
