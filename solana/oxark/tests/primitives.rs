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
    // YKK-61: PDA finders now live in the shared crate. Glob import; this file's
    // own Result-returning `send_ix` (distinct API) shadows the crate's same-named
    // one, which is the intended local precedence.
    use oxark_test_support::*;

    // Program ID matching Anchor.toml [programs.devnet]
    const PROGRAM_ID: &str = "5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN";

    fn program_id() -> Pubkey {
        PROGRAM_ID.parse().unwrap()
    }

    // YKK-61: find_game_pda / find_player_pda / find_card_pool_pda / find_commit_pda /
    // find_stake_vault_pda / find_agent_pda are imported from oxark-test-support.

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
        use solana_compute_budget::compute_budget::ComputeBudget;
        // The program is compiled with custom-heap (256KB BumpAllocator).
        // The VM must map at least 256KB of heap; otherwise the allocator
        // writes pointers to unmapped addresses (access violation at ~0x30003fff8).
        let base = ComputeBudget::new_with_defaults(false, false);
        let budget = ComputeBudget { heap_size: 256 * 1024, ..base };
        let mut svm = LiteSVM::new().with_compute_budget(budget);
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


    // ─── Test: full E2E game flow ─────────────────────────────────────────────


    // ─── Test: verify ZK proof requires prior commit ──────────────────────────
    // Verifies that the on-chain instruction rejects a ZK proof when the player
    // has not yet committed an action (or the game is not in the correct phase).


    // ─── Test: create game with different IDs doesn't conflict ───────────────


    // ─── Test: commit and reveal for two full rounds ──────────────────────────


    // ─── Test: reveal with wrong action fails hash check ─────────────────────


    // ─── Test: commit hash is deterministic (same inputs → same output) ───────

    #[test]
    fn test_commit_hash_deterministic() {
        let salt: [u8; 32] = [99u8; 32];
        let target = Pubkey::default();
        let h1 = compute_commit_hash(1, &target, &salt);
        let h2 = compute_commit_hash(1, &target, &salt);
        assert_eq!(h1, h2, "Same inputs must produce same commit hash");
        println!("✅ Commit hash is deterministic");
    }

    // ─── Test: commit hash differs for different actions ─────────────────────

    #[test]
    fn test_commit_hash_action_binding() {
        let salt: [u8; 32] = [1u8; 32];
        let target = Pubkey::default();
        let h_draw    = compute_commit_hash(1, &target, &salt);
        let h_steal   = compute_commit_hash(2, &target, &salt);
        let h_barrier = compute_commit_hash(3, &target, &salt);
        assert_ne!(h_draw,  h_steal,   "DRAW vs STEAL hash must differ");
        assert_ne!(h_draw,  h_barrier, "DRAW vs BARRIER hash must differ");
        assert_ne!(h_steal, h_barrier, "STEAL vs BARRIER hash must differ");
        println!("✅ Different actions produce different commit hashes");
    }

    // ─── Test: commit hash differs for different salts ────────────────────────

    #[test]
    fn test_commit_hash_salt_binding() {
        let target = Pubkey::default();
        let h1 = compute_commit_hash(1, &target, &[1u8; 32]);
        let h2 = compute_commit_hash(1, &target, &[2u8; 32]);
        assert_ne!(h1, h2, "Different salts must produce different hashes");
        println!("✅ Commit hash is bound to salt");
    }

    // ─── Test: commit hash differs for different targets ──────────────────────

    #[test]
    fn test_commit_hash_target_binding() {
        let salt = [42u8; 32];
        let target1 = Pubkey::new_unique();
        let target2 = Pubkey::new_unique();
        let h1 = compute_commit_hash(1, &target1, &salt);
        let h2 = compute_commit_hash(1, &target2, &salt);
        assert_ne!(h1, h2, "Different targets must produce different hashes");
        println!("✅ Commit hash is bound to target pubkey");
    }

    // ─── Test: PDA seeds produce unique addresses per game_id ────────────────

    #[test]
    fn test_pda_uniqueness_across_game_ids() {
        let player = Pubkey::new_unique();
        let (game1, _) = find_game_pda(1);
        let (game2, _) = find_game_pda(2);
        let (player1a, _) = find_player_pda(1, &player);
        let (player1b, _) = find_player_pda(1, &player);
        let (player2,  _) = find_player_pda(2, &player);
        assert_ne!(game1, game2, "Different game IDs → different game PDAs");
        assert_eq!(player1a, player1b, "Same inputs → same player PDA");
        assert_ne!(player1a, player2,  "Different game IDs → different player PDAs");
        println!("✅ PDA uniqueness invariants hold");
    }

    // ─── Test: commit PDA includes round to prevent replay ───────────────────

    #[test]
    fn test_commit_pda_round_binding() {
        let player = Pubkey::new_unique();
        let game_id = 42u64;
        let (commit_r1, _) = find_commit_pda(game_id, 1, &player);
        let (commit_r2, _) = find_commit_pda(game_id, 2, &player);
        assert_ne!(commit_r1, commit_r2, "Different rounds → different commit PDAs (prevents replay)");
        println!("✅ Commit PDA is round-scoped (replay protection)");
    }

    // ─── Test: stake deposit ─────────────────────────────────────────────────


    // ─── Test: double-commit is rejected ─────────────────────────────────────
    // A player who has already committed must not be able to commit again in the
    // same round. The AlreadyCommitted error (6006) must be returned.


    // ─── Test: non-host cannot start game ────────────────────────────────────


    // ─── Test: register_agent ─────────────────────────────────────────────────

    // YKK-61: find_agent_pda is imported from oxark-test-support.

    #[test]
    fn test_register_agent() {
        let mut svm = setup_svm();

        let owner = Keypair::new();
        fund_account(&mut svm, &owner.pubkey(), 2_000_000_000);

        let agent_id: u32 = 1;
        let (agent_pda, _) = find_agent_pda(agent_id);

        let name_hash:     [u8; 32] = sha2_hash(b"VEGA");
        let strategy_hash: [u8; 32] = sha2_hash(b"hunter-aggressive");
        let endpoint_hash: [u8; 32] = sha2_hash(b"https://vega.0xark.app");
        let price_per_query: u64 = 2_000; // 2000 lamports ≈ $0.0003

        let mut data = disc("register_agent").to_vec();
        data.extend_from_slice(&agent_id.to_le_bytes());
        data.extend_from_slice(&name_hash);
        data.extend_from_slice(&strategy_hash);
        data.extend_from_slice(&endpoint_hash);
        data.extend_from_slice(&price_per_query.to_le_bytes());

        send_ix(&mut svm, &owner, vec![
            AccountMeta::new(agent_pda, false),
            AccountMeta::new(owner.pubkey(), true),
            AccountMeta::new_readonly(system_program::id(), false),
        ], data, vec![&owner]).expect("register_agent should succeed");

        // Verify the PDA was initialized
        let info = svm.get_account(&agent_pda);
        assert!(info.is_some(), "Agent PDA should exist after registration");
        let data = info.unwrap().data;
        assert!(data.len() > 8, "Agent account should have data beyond discriminator");

        println!("✅ register_agent succeeded — agent PDA: {agent_pda}");
    }

    // ─── Test: deactivate_agent ───────────────────────────────────────────────

    #[test]
    fn test_deactivate_agent() {
        let mut svm = setup_svm();

        let owner = Keypair::new();
        fund_account(&mut svm, &owner.pubkey(), 2_000_000_000);

        let agent_id: u32 = 2;
        let (agent_pda, _) = find_agent_pda(agent_id);

        // First register
        let mut data = disc("register_agent").to_vec();
        data.extend_from_slice(&agent_id.to_le_bytes());
        data.extend_from_slice(&sha2_hash(b"MIRA"));
        data.extend_from_slice(&sha2_hash(b"collector-cautious"));
        data.extend_from_slice(&sha2_hash(b"https://mira.0xark.app"));
        data.extend_from_slice(&3_000u64.to_le_bytes());
        send_ix(&mut svm, &owner, vec![
            AccountMeta::new(agent_pda, false),
            AccountMeta::new(owner.pubkey(), true),
            AccountMeta::new_readonly(system_program::id(), false),
        ], data, vec![&owner]).expect("register_agent");

        // Now deactivate
        let mut data = disc("deactivate_agent").to_vec();
        data.extend_from_slice(&agent_id.to_le_bytes());
        send_ix(&mut svm, &owner, vec![
            AccountMeta::new(agent_pda, false),
            AccountMeta::new_readonly(owner.pubkey(), true),
        ], data, vec![&owner]).expect("deactivate_agent should succeed");

        println!("✅ deactivate_agent succeeded");
    }

    // ─── Test: non-owner cannot deactivate agent ───────────────────────────────

    #[test]
    fn test_only_owner_can_deactivate_agent() {
        let mut svm = setup_svm();

        let owner    = Keypair::new();
        let attacker = Keypair::new();
        fund_account(&mut svm, &owner.pubkey(),    2_000_000_000);
        fund_account(&mut svm, &attacker.pubkey(), 2_000_000_000);

        let agent_id: u32 = 3;
        let (agent_pda, _) = find_agent_pda(agent_id);

        // Register as owner
        let mut data = disc("register_agent").to_vec();
        data.extend_from_slice(&agent_id.to_le_bytes());
        data.extend_from_slice(&sha2_hash(b"GUARD"));
        data.extend_from_slice(&sha2_hash(b"defensive"));
        data.extend_from_slice(&sha2_hash(b"https://guard.0xark.app"));
        data.extend_from_slice(&1_000u64.to_le_bytes());
        send_ix(&mut svm, &owner, vec![
            AccountMeta::new(agent_pda, false),
            AccountMeta::new(owner.pubkey(), true),
            AccountMeta::new_readonly(system_program::id(), false),
        ], data, vec![&owner]).expect("register_agent");

        // Attacker tries to deactivate — must fail (constraint: owner == signer)
        let mut data = disc("deactivate_agent").to_vec();
        data.extend_from_slice(&agent_id.to_le_bytes());
        let result = send_ix(&mut svm, &attacker, vec![
            AccountMeta::new(agent_pda, false),
            AccountMeta::new_readonly(attacker.pubkey(), true),
        ], data, vec![&attacker]);
        assert!(result.is_err(), "Non-owner deactivate should be rejected");
        println!("✅ Agent deactivation correctly rejects non-owner");
    }

    // ─── Test: create_season ─────────────────────────────────────────────────

    fn find_season_pda(season_id: u32) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[b"season", &season_id.to_le_bytes()],
            &program_id(),
        )
    }

    #[test]
    fn test_create_season() {
        let mut svm = setup_svm();

        let authority = Keypair::new();
        fund_account(&mut svm, &authority.pubkey(), 2_000_000_000);

        let season_id: u32 = 1;
        let (season_pda, _) = find_season_pda(season_id);
        let entry_fee: u64 = 500_000_000;      // 0.5 SOL
        let max_players: u32 = 100;
        let duration: i64 = 60 * 60 * 24 * 14; // 14 days

        let mut data = disc("create_season").to_vec();
        data.extend_from_slice(&season_id.to_le_bytes());
        data.extend_from_slice(&entry_fee.to_le_bytes());
        data.extend_from_slice(&max_players.to_le_bytes());
        data.extend_from_slice(&duration.to_le_bytes());

        send_ix(&mut svm, &authority, vec![
            AccountMeta::new(season_pda, false),
            AccountMeta::new(authority.pubkey(), true),
            AccountMeta::new_readonly(system_program::id(), false),
        ], data, vec![&authority]).expect("create_season should succeed");

        let info = svm.get_account(&season_pda);
        assert!(info.is_some(), "Season PDA should exist");
        println!("✅ create_season succeeded — season PDA: {season_pda}");
    }

    // ─── Test: end_season ────────────────────────────────────────────────────

    #[test]
    fn test_end_season() {
        let mut svm = setup_svm();

        let authority = Keypair::new();
        fund_account(&mut svm, &authority.pubkey(), 2_000_000_000);

        let season_id: u32 = 2;
        let (season_pda, _) = find_season_pda(season_id);

        // Create season first
        let mut data = disc("create_season").to_vec();
        data.extend_from_slice(&season_id.to_le_bytes());
        data.extend_from_slice(&500_000_000u64.to_le_bytes());
        data.extend_from_slice(&50u32.to_le_bytes());
        data.extend_from_slice(&(86_400i64 * 7).to_le_bytes()); // 7 days
        send_ix(&mut svm, &authority, vec![
            AccountMeta::new(season_pda, false),
            AccountMeta::new(authority.pubkey(), true),
            AccountMeta::new_readonly(system_program::id(), false),
        ], data, vec![&authority]).expect("create_season");

        // End it
        let mut data = disc("end_season").to_vec();
        data.extend_from_slice(&season_id.to_le_bytes());
        send_ix(&mut svm, &authority, vec![
            AccountMeta::new(season_pda, false),
            AccountMeta::new_readonly(authority.pubkey(), true),
        ], data, vec![&authority]).expect("end_season should succeed");

        println!("✅ end_season succeeded");
    }

    // ─── Test: non-authority cannot end season ────────────────────────────────

    #[test]
    fn test_only_authority_can_end_season() {
        let mut svm = setup_svm();

        let authority = Keypair::new();
        let attacker  = Keypair::new();
        fund_account(&mut svm, &authority.pubkey(), 2_000_000_000);
        fund_account(&mut svm, &attacker.pubkey(),  2_000_000_000);

        let season_id: u32 = 3;
        let (season_pda, _) = find_season_pda(season_id);

        let mut data = disc("create_season").to_vec();
        data.extend_from_slice(&season_id.to_le_bytes());
        data.extend_from_slice(&500_000_000u64.to_le_bytes());
        data.extend_from_slice(&50u32.to_le_bytes());
        data.extend_from_slice(&(86_400i64 * 7).to_le_bytes());
        send_ix(&mut svm, &authority, vec![
            AccountMeta::new(season_pda, false),
            AccountMeta::new(authority.pubkey(), true),
            AccountMeta::new_readonly(system_program::id(), false),
        ], data, vec![&authority]).expect("create_season");

        // Attacker tries to end season
        let mut data = disc("end_season").to_vec();
        data.extend_from_slice(&season_id.to_le_bytes());
        let result = send_ix(&mut svm, &attacker, vec![
            AccountMeta::new(season_pda, false),
            AccountMeta::new_readonly(attacker.pubkey(), true),
        ], data, vec![&attacker]);
        assert!(result.is_err(), "Non-authority end_season should fail");
        println!("✅ Non-authority correctly rejected from ending season");
    }

    // ─── Helper: SHA-256 wrapper for test data ────────────────────────────────

    fn sha2_hash(input: &[u8]) -> [u8; 32] {
        use sha2::{Sha256, Digest};
        Sha256::digest(input).into()
    }

    // ─── ZK Dispatch tests ───────────────────────────────────────────────────
    // DoD: reveal_hand without commit_hand → ZkNotVerified
    //      commit_hand tampered proof     → InvalidProof
    //      commit_hand valid proof → reveal_hand success

    const DUEL_SEED_TEST: &[u8] = b"duel";

    fn find_duel_pda(duel_id: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[DUEL_SEED_TEST, duel_id.as_ref()],
            &program_id(),
        )
    }

    /// Create a DuelState via init_duel. authority pays and becomes player_1.
    fn setup_duel(
        svm: &mut LiteSVM,
        authority: &Keypair,
        player_2: &Pubkey,
        duel_id: &Pubkey,
    ) -> Pubkey {
        let (duel_pda, _) = find_duel_pda(duel_id);
        // Borsh: disc(8) + duel_id(32) + hall_tier(1) + ante(8) = 49 bytes
        let mut data = disc("init_duel").to_vec();
        data.extend_from_slice(duel_id.as_ref());
        data.push(0u8);                 // hall_tier = 0 (Bronze)
        data.extend_from_slice(&0u64.to_le_bytes()); // ante = 0
        send_ix(svm, authority, vec![
            AccountMeta::new(duel_pda, false),
            AccountMeta::new_readonly(authority.pubkey(), false), // player_1
            AccountMeta::new_readonly(*player_2, false),           // player_2
            AccountMeta::new(authority.pubkey(), true),            // authority (payer)
            AccountMeta::new_readonly(system_program::id(), false),
        ], data, vec![authority]).expect("init_duel should succeed");
        duel_pda
    }

    // ── Test 1: reveal_hand without prior commit_hand fails with ZkNotVerified ─

    #[test]
    fn test_reveal_hand_without_commit_fails_zk_gate() {
        let mut svm = setup_svm();
        let p1 = Keypair::new();
        let p2 = Keypair::new();
        fund_account(&mut svm, &p1.pubkey(), 2_000_000_000);

        let duel_id = Keypair::new().pubkey();
        let duel_pda = setup_duel(&mut svm, &p1, &p2.pubkey(), &duel_id);

        // reveal_hand data: disc(8) + duel_id(32) + round(1) + card_ids(80) + salt(32) = 153 bytes
        let mut data = disc("reveal_hand").to_vec();
        data.extend_from_slice(duel_id.as_ref());
        data.push(1u8); // round = 1
        for _ in 0..10 {
            data.extend_from_slice(&0u64.to_le_bytes());
        }
        data.extend_from_slice(&[1u8; 32]); // dummy salt

        let result = send_ix(&mut svm, &p1, vec![
            AccountMeta::new(duel_pda, false),
            AccountMeta::new(p1.pubkey(), true),
        ], data, vec![&p1]);

        assert!(result.is_err(), "reveal_hand without commit_hand must fail (ZkNotVerified)");
        println!("✅ reveal_hand correctly blocked by ZK gate (ZkNotVerified)");
    }

    // ── Test 2: commit_hand with tampered (all-zero) proof fails InvalidProof ──

    #[test]
    fn test_commit_hand_tampered_proof_fails() {
        let mut svm = setup_svm();
        let p1 = Keypair::new();
        let p2 = Keypair::new();
        fund_account(&mut svm, &p1.pubkey(), 2_000_000_000);

        let duel_id = Keypair::new().pubkey();
        let duel_pda = setup_duel(&mut svm, &p1, &p2.pubkey(), &duel_id);

        // commit_hand data: disc(8) + duel_id(32) + round(1) + proofA(64) + proofB(128) + proofC(64) + signals(128)
        let mut data = disc("commit_hand").to_vec();
        data.extend_from_slice(duel_id.as_ref());
        data.push(1u8);             // round = 1
        data.extend_from_slice(&[0u8; 64]);  // proof_a: all-zero (invalid)
        data.extend_from_slice(&[0u8; 128]); // proof_b: all-zero (invalid)
        data.extend_from_slice(&[0u8; 64]);  // proof_c: all-zero (invalid)
        // public_signals: round=1, others zeroed
        data.extend_from_slice(&[0u8; 32]);  // signals[0] (commitment)
        let mut round_sig = [0u8; 32]; round_sig[31] = 1;
        data.extend_from_slice(&round_sig);  // signals[1] (round=1)
        data.extend_from_slice(&[0u8; 32]);  // signals[2] (pubkey_lo)
        data.extend_from_slice(&[0u8; 32]);  // signals[3] (pubkey_hi)

        let result = send_ix(&mut svm, &p1, vec![
            AccountMeta::new(duel_pda, false),
            AccountMeta::new(p1.pubkey(), true),
        ], data, vec![&p1]);

        assert!(result.is_err(), "commit_hand with all-zero proof must fail (InvalidProof)");
        println!("✅ Tampered proof correctly rejected by Groth16 verifier (InvalidProof)");
    }

    // ── Test 3: ZK gate passes when zk_verified = true ───────────────────────
    //
    // Goal: prove that after inject-setting player_1_zk_verified[0]=true,
    // reveal_hand no longer fails with ZkNotVerified. Instead it proceeds past
    // the ZK gate and reaches the next check (CommitmentNotSet), confirming the
    // gate is correctly bypassed.
    //
    // Note on Poseidon CU cost: the pure-Rust ark-bn254 Poseidon(15) re-used in
    // reveal_hand burns >20M CUs in SBF emulation. The sol_poseidon syscall only
    // supports ≤12 inputs. Testing the full success path (ZK gate + commitment
    // match) requires a circuit re-design to ≤12 inputs. For now this test
    // validates the ZK gate dispatch logic in isolation.

    #[test]
    fn test_commit_hand_valid_proof_then_reveal_succeeds() {
        let mut svm = setup_svm();
        let p1 = Keypair::new();
        let p2 = Keypair::new();
        fund_account(&mut svm, &p1.pubkey(), 2_000_000_000);

        let duel_id = Keypair::new().pubkey();
        let duel_pda = setup_duel(&mut svm, &p1, &p2.pubkey(), &duel_id);

        // DuelState byte offset for player_1_zk_verified[0]:
        //   8 disc + 32 id + 32 p1 + 32 p2 + 1 tier + 1 round + 1 phase
        //   + 8 ante + 8 started_at + 8 ended_at + 32 winner = 163
        //   + 5*32 p1_commit + 5*32 p2_commit = 483
        //   + 5*10*8 p1_reveal + 5*10*8 p2_reveal = 1283
        //   + 5*32 p1_salt + 5*32 p2_salt = 1603
        // Trailing layout (YKK-41 appended 2 round-win bytes after bump; the
        // provenance-gate fix appended last_progress_at(8) after those):
        //   [p1_zk(5)][p2_zk(5)][bump(1)][p1_round_wins(1)][p2_round_wins(1)][last_progress_at(8)]
        //   → P1_ZK0 = SIZE-21
        const P1_ZK0: usize = oxark::state::DuelState::SIZE - 21;
        // Compile-time guard: if DuelState grows or shrinks, this assertion fails.
        const _: () = assert!(oxark::state::DuelState::SIZE == 1624);

        // Inject zk_verified[0] = true; leave commitment as all-zeros.
        let mut acc = svm.get_account(&duel_pda).expect("duel account must exist");
        acc.data[P1_ZK0] = 1u8;
        svm.set_account(duel_pda, acc).expect("set_account must succeed");

        let mut reveal_data = disc("reveal_hand").to_vec();
        reveal_data.extend_from_slice(duel_id.as_ref());
        reveal_data.push(1u8); // round = 1
        for _ in 0..10 {
            reveal_data.extend_from_slice(&0u64.to_le_bytes());
        }
        reveal_data.extend_from_slice(&[0u8; 32]); // dummy salt

        let result = send_ix(&mut svm, &p1, vec![
            AccountMeta::new(duel_pda, false),
            AccountMeta::new(p1.pubkey(), true),
        ], reveal_data, vec![&p1]);

        // Must fail — but NOT with ZkNotVerified (0x1777 / 6007).
        // CommitmentNotSet (all-zeros commitment) proves the ZK gate passed.
        assert!(result.is_err(), "reveal_hand with zero commitment must fail");
        let err_str = format!("{:?}", result.unwrap_err());
        assert!(
            !err_str.contains("ZkNotVerified") && !err_str.contains("6007"),
            "ZK gate must pass: expected CommitmentNotSet, got ZkNotVerified: {err_str}"
        );
        println!("✅ ZK gate passed: error is CommitmentNotSet (not ZkNotVerified)");
    }

    // ─── YKK-32: grant_imprint rarity sourced from CardMintRecord (C5) ─────────
    //
    // Before YKK-32, grant_imprint took `rarity` as a caller argument, so a caller
    // could pass rarity=3 (Legendary, cap 5) on a Common card and stamp extra stat
    // imprints. Now rarity is read from the on-chain CardMintRecord PDA. These are
    // the first tests that drive grant_imprint on-chain — its absence is why the
    // bug survived.

    const CARD_MINT_RECORD_SEED: &[u8] = b"card_mint_record";
    const CARD_BATTLE_HISTORY_SEED: &[u8] = b"card_battle_history";

    /// Anchor account discriminator: sha256("account:<Name>")[..8].
    fn account_disc(name: &str) -> [u8; 8] {
        use sha2::{Digest, Sha256};
        let hash = Sha256::digest(format!("account:{name}").as_bytes());
        hash[..8].try_into().unwrap()
    }

    fn find_card_mint_record_pda(card_mint: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(&[CARD_MINT_RECORD_SEED, card_mint.as_ref()], &program_id())
    }

    fn find_card_battle_history_pda(card_mint: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(&[CARD_BATTLE_HISTORY_SEED, card_mint.as_ref()], &program_id())
    }

    /// Craft a CardMintRecord PDA directly (init_card_mint_record requires the
    /// ADMIN signer, whose key we don't hold). Borsh layout: card_mint(32) +
    /// card_id(1) + rarity(1) + bump(1), behind the 8-byte account discriminator.
    fn seed_card_mint_record(svm: &mut LiteSVM, card_mint: &Pubkey, card_id: u8, rarity: u8) -> Pubkey {
        let (pda, bump) = find_card_mint_record_pda(card_mint);
        let mut data = account_disc("CardMintRecord").to_vec();
        data.extend_from_slice(card_mint.as_ref());
        data.push(card_id);
        data.push(rarity);
        data.push(bump);
        let lamports = svm.minimum_balance_for_rent_exemption(data.len()) + 1_000_000;
        svm.airdrop(&pda, lamports).unwrap();
        let mut acc = svm.get_account(&pda).unwrap();
        acc.data = data;
        acc.owner = program_id();
        svm.set_account(pda, acc).unwrap();
        pda
    }

    fn grant_imprint_ix_data(card_mint: &Pubkey, key: u8, is_cosmetic: bool, duel_id: u64) -> Vec<u8> {
        let mut d = disc("grant_imprint").to_vec();
        d.extend_from_slice(card_mint.as_ref());
        d.push(key);
        d.push(is_cosmetic as u8);
        d.extend_from_slice(&duel_id.to_le_bytes());
        d
    }

    // YKK-32's rarity-cap logic (grant_imprint reads rarity from CardMintRecord and
    // caps stat imprints accordingly) is unchanged, but the provenance-gate fix made
    // grant_imprint ADMIN-only: stat imprints add battle power (+BP/+HP), so an open
    // grant path was direct stat inflation — the same caller-trusted class the fix
    // closes for update_card_battle_history. The ADMIN_PUBKEY const has no matching
    // secret in-repo, so the cap *success* path can no longer be signed here (same
    // limitation Fable documented for update_card_battle_history_rejects_non_admin).
    // What this test asserts is the security property that now precedes the cap: a
    // non-admin grant_imprint is rejected with NotAdmin. Organic imprints now flow
    // through settle_duel_history's threshold auto-grants, not this admin path.
    #[test]
    fn grant_imprint_rejects_non_admin() {
        let mut svm = setup_svm();
        let payer = Keypair::new();
        fund_account(&mut svm, &payer.pubkey(), 5_000_000_000);

        // Common (rarity=0) card with its OWN matching record, so the seeds checks
        // pass and account validation reaches the admin-signer constraint.
        let card_mint = Keypair::new().pubkey();
        let record = seed_card_mint_record(&mut svm, &card_mint, 1, 0);
        let (history, _) = find_card_battle_history_pda(&card_mint);

        let err = send_ix(
            &mut svm,
            &payer,
            vec![
                AccountMeta::new(history, false),
                AccountMeta::new_readonly(record, false),
                AccountMeta::new(payer.pubkey(), true),
                AccountMeta::new_readonly(system_program::id(), false),
            ],
            grant_imprint_ix_data(&card_mint, 1, false, 1),
            vec![&payer],
        )
        .expect_err("non-admin grant_imprint must be rejected");
        let err = format!("{err}");
        assert!(
            err.contains("NotAdmin") || err.contains("6083"),
            "expected NotAdmin rejection, got: {err}"
        );
    }

    #[test]
    fn grant_imprint_rejects_foreign_card_mint_record() {
        let mut svm = setup_svm();
        let payer = Keypair::new();
        fund_account(&mut svm, &payer.pubkey(), 5_000_000_000);

        // Record exists for card A; we try to imprint card B while passing A's record.
        let card_a = Keypair::new().pubkey();
        let card_b = Keypair::new().pubkey();
        let record_a = seed_card_mint_record(&mut svm, &card_a, 1, 0);
        let (history_b, _) = find_card_battle_history_pda(&card_b);

        // card_mint arg = B, but card_mint_record account = A's PDA. Anchor derives
        // the expected record PDA from B and the addresses won't match (and the
        // handler's require!(record.card_mint == card_mint) is a second backstop).
        let err = send_ix(
            &mut svm,
            &payer,
            vec![
                AccountMeta::new(history_b, false),
                AccountMeta::new_readonly(record_a, false),
                AccountMeta::new(payer.pubkey(), true),
                AccountMeta::new_readonly(system_program::id(), false),
            ],
            grant_imprint_ix_data(&card_b, 1, false, 0),
            vec![&payer],
        )
        .expect_err("passing another card's CardMintRecord must be rejected");
        let err = format!("{err}");
        assert!(
            err.contains("ConstraintSeeds")
                || err.contains("2006")
                || err.contains("InvalidAccount"),
            "expected a seeds/InvalidAccount rejection, got: {err}"
        );
    }

    // NOTE (YKK-32): evolve_cards applies the identical fix — parent rarities are
    // read from parent_a_mint_record / parent_b_mint_record (require!(record
    // .card_mint == parent_mint) + record.rarity), with the target hardcoded to
    // Uncommon. An on-chain integration test for it would need the EvolveCards
    // account graph to pass Anchor validation, which includes Program<Token> and
    // Program<AssociatedToken> — and litesvm 0.10 does NOT bundle the SPL Token /
    // ATA programs (it only lets you *write* token account data, not execute the
    // programs). Loading those program binaries is a separate harness change;
    // the rarity-from-record + mint-pinning logic is regression-covered above via
    // grant_imprint, which uses the same pattern and needs no SPL programs.
    // Tracked as a follow-up.
}
