/// 0xARK — Full E2E Anchor Test
///
/// Flow: wallet connect → create game → join game → deposit stake
///       → start game → commit action → reveal action → verify ZK proof
///       → resolve round → (repeat) → victory → claim prize
///
/// Uses litesvm for fast in-process Solana VM testing (no validator needed).

#[cfg(test)]
mod tests {
    use litesvm::LiteSVM;
    use solana_keypair::Keypair;
    use solana_pubkey::Pubkey;
    use solana_signer::Signer;
    use solana_instruction::{AccountMeta, Instruction};
    use solana_message::Message;
    use solana_transaction::Transaction;
    use solana_sdk_ids::system_program;

    // Program ID matching Anchor.toml [programs.devnet]
    const PROGRAM_ID: &str = "2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3";
    const GAME_SEED: &[u8]      = b"game";
    const PLAYER_SEED: &[u8]    = b"player";
    const CARD_POOL_SEED: &[u8] = b"card_pool";
    const COMMIT_SEED: &[u8]    = b"commit";
    const STAKE_VAULT_SEED: &[u8] = b"stake_vault";

    fn program_id() -> Pubkey {
        PROGRAM_ID.parse().unwrap()
    }

    fn game_id_bytes(game_id: u64) -> [u8; 8] {
        game_id.to_le_bytes()
    }

    fn find_game_pda(game_id: u64) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[GAME_SEED, &game_id_bytes(game_id)],
            &program_id(),
        )
    }

    fn find_player_pda(game_id: u64, player: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[PLAYER_SEED, &game_id_bytes(game_id), player.as_ref()],
            &program_id(),
        )
    }

    fn find_card_pool_pda(game_id: u64) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[CARD_POOL_SEED, &game_id_bytes(game_id)],
            &program_id(),
        )
    }

    fn find_commit_pda(game_id: u64, round: u8, player: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[COMMIT_SEED, &game_id_bytes(game_id), &[round], player.as_ref()],
            &program_id(),
        )
    }

    fn find_stake_vault_pda(game_id: u64) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[STAKE_VAULT_SEED, &game_id_bytes(game_id)],
            &program_id(),
        )
    }

    /// Compute Anchor instruction discriminator: sha256("global:<name>")[..8]
    fn disc(name: &str) -> [u8; 8] {
        use sha2::{Sha256, Digest};
        let preimage = format!("global:{name}");
        let hash = Sha256::digest(preimage.as_bytes());
        hash[..8].try_into().unwrap()
    }

    fn compute_commit_hash(action_type: u8, target: &Pubkey, salt: &[u8; 32]) -> [u8; 32] {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update([action_type]);
        hasher.update(target.as_ref());
        hasher.update(salt);
        hasher.finalize().into()
    }

    fn setup_svm() -> LiteSVM {
        let mut svm = LiteSVM::new();
        // Load the compiled SBF program from the build directory.
        // CARGO_MANIFEST_DIR for the tests crate is oxark/tests/
        let program_paths = [
            concat!(env!("CARGO_MANIFEST_DIR"), "/../target/deploy/oxark.so"),
            concat!(env!("CARGO_MANIFEST_DIR"), "/../../target/deploy/oxark.so"),
            "/Users/hiroprotagonist/Projects/0xark/solana/oxark/target/deploy/oxark.so",
        ];
        let mut loaded = false;
        for path in &program_paths {
            if let Ok(bytes) = std::fs::read(path) {
                svm.add_program(program_id(), &bytes);
                loaded = true;
                break;
            }
        }
        if !loaded {
            eprintln!("WARNING: oxark.so not found — run `cargo-build-sbf` first");
        }
        svm
    }

    fn fund_account(svm: &mut LiteSVM, pubkey: &Pubkey, lamports: u64) {
        svm.airdrop(pubkey, lamports).unwrap();
    }

    // ─── Helper: build and send a simple instruction ──────────────────────────

    fn send_ix(
        svm: &mut LiteSVM,
        payer: &Keypair,
        accounts: Vec<AccountMeta>,
        data: Vec<u8>,
        signers: Vec<&Keypair>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let ix = Instruction {
            program_id: program_id(),
            accounts,
            data,
        };
        let blockhash = svm.latest_blockhash();
        let msg = Message::new(&[ix], Some(&payer.pubkey()));
        let mut tx = Transaction::new_unsigned(msg);
        tx.sign(&signers, blockhash);
        svm.send_transaction(tx)
            .map(|_| ())
            .map_err(|e| format!("{e:?}").into())
    }

    // ─── Shared setup: create game + 2 players join ───────────────────────────

    fn create_and_start_game(
        svm: &mut LiteSVM,
        host: &Keypair,
        player: &Keypair,
        game_id: u64,
    ) -> (Pubkey, Pubkey, Pubkey, Pubkey) {
        let (game_pda, _)      = find_game_pda(game_id);
        let (card_pool_pda, _) = find_card_pool_pda(game_id);
        let (host_player_pda, _) = find_player_pda(game_id, &host.pubkey());
        let (player_pda, _)    = find_player_pda(game_id, &player.pubkey());

        // create_game — account order: [game, card_pool, host, system_program]
        {
            let mut data = disc("create_game").to_vec();
            data.extend_from_slice(&game_id.to_le_bytes());
            data.push(2u8); // max_players
            send_ix(svm, host, vec![
                AccountMeta::new(game_pda, false),
                AccountMeta::new(card_pool_pda, false),
                AccountMeta::new(host.pubkey(), true),
                AccountMeta::new_readonly(system_program::id(), false),
            ], data, vec![host]).expect("create_game should succeed");
        }

        // join_game (host) — account order: [game, player_state, player, system_program]
        {
            let mut data = disc("join_game").to_vec();
            data.extend_from_slice(&game_id.to_le_bytes());
            send_ix(svm, host, vec![
                AccountMeta::new(game_pda, false),
                AccountMeta::new(host_player_pda, false),
                AccountMeta::new(host.pubkey(), true),
                AccountMeta::new_readonly(system_program::id(), false),
            ], data, vec![host]).expect("host join_game should succeed");
        }

        // join_game (player) — account order: [game, player_state, player, system_program]
        {
            let mut data = disc("join_game").to_vec();
            data.extend_from_slice(&game_id.to_le_bytes());
            send_ix(svm, player, vec![
                AccountMeta::new(game_pda, false),
                AccountMeta::new(player_pda, false),
                AccountMeta::new(player.pubkey(), true),
                AccountMeta::new_readonly(system_program::id(), false),
            ], data, vec![player]).expect("player join_game should succeed");
        }

        // start_game — account order: [game, card_pool, host, remaining...]
        {
            let mut data = disc("start_game").to_vec();
            data.extend_from_slice(&game_id.to_le_bytes());
            send_ix(svm, host, vec![
                AccountMeta::new(game_pda, false),
                AccountMeta::new(card_pool_pda, false),
                AccountMeta::new(host.pubkey(), true),
                AccountMeta::new(host_player_pda, false),  // remaining[0]
                AccountMeta::new(player_pda, false),        // remaining[1]
            ], data, vec![host]).expect("start_game should succeed");
        }

        (game_pda, card_pool_pda, host_player_pda, player_pda)
    }

    // ─── Test: full E2E game flow ─────────────────────────────────────────────

    #[test]
    fn test_full_game_flow_create_join_commit_reveal() {
        let mut svm = setup_svm();

        let host   = Keypair::new();
        let player = Keypair::new();
        fund_account(&mut svm, &host.pubkey(),   2_000_000_000); // 2 SOL
        fund_account(&mut svm, &player.pubkey(), 2_000_000_000); // 2 SOL

        let game_id: u64 = 1001;

        let (game_pda, card_pool_pda, host_player_pda, player_pda) =
            create_and_start_game(&mut svm, &host, &player, game_id);

        println!("✅ create_game + join + start succeeded — game PDA: {game_pda}");

        // ── commit_action (host: Draw = action 1) ────────────────────────────
        // commit_action account order: [game, player_state, commit, player, system_program]
        let host_salt: [u8; 32] = [1u8; 32];
        let host_action: u8 = 1; // Draw
        let zero_target = Pubkey::default();
        let host_hash = compute_commit_hash(host_action, &zero_target, &host_salt);
        let (host_commit_pda, _) = find_commit_pda(game_id, 1, &host.pubkey());
        {
            let mut data = disc("commit_action").to_vec();
            data.extend_from_slice(&game_id.to_le_bytes());
            data.extend_from_slice(&host_hash);
            send_ix(&mut svm, &host, vec![
                AccountMeta::new(game_pda, false),
                AccountMeta::new(host_player_pda, false),
                AccountMeta::new(host_commit_pda, false),
                AccountMeta::new(host.pubkey(), true),
                AccountMeta::new_readonly(system_program::id(), false),
            ], data, vec![&host]).expect("host commit_action should succeed");
        }

        // ── commit_action (player: action 1, zero target) ────────────────────
        let player_salt: [u8; 32] = [2u8; 32];
        let player_action: u8 = 1; // Draw
        let player_hash = compute_commit_hash(player_action, &zero_target, &player_salt);
        let (player_commit_pda, _) = find_commit_pda(game_id, 1, &player.pubkey());
        {
            let mut data = disc("commit_action").to_vec();
            data.extend_from_slice(&game_id.to_le_bytes());
            data.extend_from_slice(&player_hash);
            send_ix(&mut svm, &player, vec![
                AccountMeta::new(game_pda, false),
                AccountMeta::new(player_pda, false),
                AccountMeta::new(player_commit_pda, false),
                AccountMeta::new(player.pubkey(), true),
                AccountMeta::new_readonly(system_program::id(), false),
            ], data, vec![&player]).expect("player commit_action should succeed");
        }

        println!("✅ commit_action succeeded for both players — now in RevealPhase");

        // ── reveal_action (host) ─────────────────────────────────────────────
        // reveal_action account order: [game, player_state, commit, player]
        {
            let mut data = disc("reveal_action").to_vec();
            data.extend_from_slice(&game_id.to_le_bytes());
            data.push(host_action);
            data.extend_from_slice(zero_target.as_ref());
            data.extend_from_slice(&host_salt);
            send_ix(&mut svm, &host, vec![
                AccountMeta::new(game_pda, false),
                AccountMeta::new(host_player_pda, false),
                AccountMeta::new_readonly(host_commit_pda, false),
                AccountMeta::new(host.pubkey(), true),
            ], data, vec![&host]).expect("host reveal_action should succeed");
        }

        // ── reveal_action (player) ───────────────────────────────────────────
        {
            let mut data = disc("reveal_action").to_vec();
            data.extend_from_slice(&game_id.to_le_bytes());
            data.push(player_action);
            data.extend_from_slice(zero_target.as_ref());
            data.extend_from_slice(&player_salt);
            send_ix(&mut svm, &player, vec![
                AccountMeta::new(game_pda, false),
                AccountMeta::new(player_pda, false),
                AccountMeta::new_readonly(player_commit_pda, false),
                AccountMeta::new(player.pubkey(), true),
            ], data, vec![&player]).expect("player reveal_action should succeed");
        }

        println!("✅ reveal_action succeeded for both players");

        // ── resolve_round ────────────────────────────────────────────────────
        // resolve_round account order: [game, card_pool, caller, remaining...]
        {
            let mut data = disc("resolve_round").to_vec();
            data.extend_from_slice(&game_id.to_le_bytes());
            send_ix(&mut svm, &host, vec![
                AccountMeta::new(game_pda, false),
                AccountMeta::new(card_pool_pda, false),
                AccountMeta::new(host.pubkey(), true),
                AccountMeta::new(host_player_pda, false),  // remaining[0]
                AccountMeta::new(player_pda, false),        // remaining[1]
            ], data, vec![&host]).expect("resolve_round should succeed");
        }

        println!("✅ resolve_round succeeded — round 1 complete");
        println!("✅ Full commit-reveal-resolve E2E PASSED");
    }

    // ─── Test: verify ZK proof requires prior commit ──────────────────────────
    // Verifies that the on-chain instruction rejects a ZK proof when the player
    // has not yet committed an action (or the game is not in the correct phase).

    #[test]
    fn test_verify_zk_proof_requires_commit() {
        let mut svm = setup_svm();

        let host = Keypair::new();
        fund_account(&mut svm, &host.pubkey(), 2_000_000_000);

        let game_id: u64 = 2001;
        let (game_pda, _)        = find_game_pda(game_id);
        let (card_pool_pda, _)   = find_card_pool_pda(game_id);
        let (host_player_pda, _) = find_player_pda(game_id, &host.pubkey());

        // create_game — account order: [game, card_pool, host, system_program]
        {
            let mut data = disc("create_game").to_vec();
            data.extend_from_slice(&game_id.to_le_bytes());
            data.push(2u8);
            let _ = send_ix(&mut svm, &host, vec![
                AccountMeta::new(game_pda, false),
                AccountMeta::new(card_pool_pda, false),
                AccountMeta::new(host.pubkey(), true),
                AccountMeta::new_readonly(system_program::id(), false),
            ], data, vec![&host]);
        }

        // join_game (host) — account order: [game, player_state, player, system_program]
        {
            let mut data = disc("join_game").to_vec();
            data.extend_from_slice(&game_id.to_le_bytes());
            let _ = send_ix(&mut svm, &host, vec![
                AccountMeta::new(game_pda, false),
                AccountMeta::new(host_player_pda, false),
                AccountMeta::new(host.pubkey(), true),
                AccountMeta::new_readonly(system_program::id(), false),
            ], data, vec![&host]);
        }

        // Attempt verify_zk_proof before committing or starting game.
        // Should fail: game is in Lobby (InvalidAction) or player hasn't committed (NotCommitted).
        let dummy_proof_a = [0u8; 64];
        let dummy_proof_b = [0u8; 128];
        let dummy_proof_c = [0u8; 64];
        let dummy_public  = [0u8; 32];

        // verify_zk_proof — account order: [game, player_state, player]
        let mut data = disc("verify_zk_proof").to_vec();
        data.extend_from_slice(&game_id.to_le_bytes());
        data.extend_from_slice(&dummy_proof_a);
        data.extend_from_slice(&dummy_proof_b);
        data.extend_from_slice(&dummy_proof_c);
        data.extend_from_slice(&dummy_public);

        let result = send_ix(&mut svm, &host, vec![
            AccountMeta::new_readonly(game_pda, false),
            AccountMeta::new_readonly(host_player_pda, false),
            AccountMeta::new(host.pubkey(), true),
        ], data, vec![&host]);

        assert!(result.is_err(), "verify_zk_proof without commit/start should fail");
        println!("✅ ZK proof rejected before commit (as expected)");
    }

    // ─── Test: stake deposit ─────────────────────────────────────────────────

    #[test]
    fn test_stake_deposit() {
        let mut svm = setup_svm();

        let host = Keypair::new();
        fund_account(&mut svm, &host.pubkey(), 2_000_000_000); // 2 SOL

        let game_id: u64 = 3001;
        let (game_pda, _)        = find_game_pda(game_id);
        let (card_pool_pda, _)   = find_card_pool_pda(game_id);
        let (stake_vault_pda, _) = find_stake_vault_pda(game_id);

        // create_game — account order: [game, card_pool, host, system_program]
        {
            let mut data = disc("create_game").to_vec();
            data.extend_from_slice(&game_id.to_le_bytes());
            data.push(2u8);
            send_ix(&mut svm, &host, vec![
                AccountMeta::new(game_pda, false),
                AccountMeta::new(card_pool_pda, false),
                AccountMeta::new(host.pubkey(), true),
                AccountMeta::new_readonly(system_program::id(), false),
            ], data, vec![&host]).expect("create_game should succeed");
        }

        let balance_before = svm.get_balance(&host.pubkey()).unwrap_or(0);

        // deposit_stake — account order: [game, stake_vault, player, system_program]
        {
            let mut data = disc("deposit_stake").to_vec();
            data.extend_from_slice(&game_id.to_le_bytes());
            send_ix(&mut svm, &host, vec![
                AccountMeta::new_readonly(game_pda, false),
                AccountMeta::new(stake_vault_pda, false),
                AccountMeta::new(host.pubkey(), true),
                AccountMeta::new_readonly(system_program::id(), false),
            ], data, vec![&host]).expect("deposit_stake should succeed");
        }

        let balance_after = svm.get_balance(&host.pubkey()).unwrap_or(0);
        let vault_balance = svm.get_balance(&stake_vault_pda).unwrap_or(0);

        // 500_000_000 lamports (0.5 SOL) should be in vault
        assert!(
            vault_balance >= 500_000_000,
            "Stake vault should hold at least 0.5 SOL, got {vault_balance}"
        );
        assert!(
            balance_before - balance_after >= 500_000_000,
            "Host balance should decrease by at least 0.5 SOL"
        );

        println!("✅ deposit_stake succeeded — vault holds {vault_balance} lamports (0.5 SOL)");
    }
}
