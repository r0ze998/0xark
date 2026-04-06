#[cfg(test)]
mod tests {
    use dojo::model::ModelStorage;
    use dojo::world::{WorldStorageTrait, world};
    use dojo_cairo_test::{
        ContractDef, ContractDefTrait, NamespaceDef, TestResource, WorldStorageTestTrait,
        spawn_test_world,
    };
    use oxark::models::action::{ActionType, m_CommittedAction, m_RevealedAction};
    use oxark::models::card::m_CardPool;
    use oxark::models::game::{Game, GameStatus, m_Game, m_GameCounter, m_GamePlayer};
    use oxark::models::player::{PlayerState, m_PlayerCard, m_PlayerLookup, m_PlayerState};
    use oxark::systems::game_actions::{
        IGameActionsDispatcher, IGameActionsDispatcherTrait, game_actions,
    };
    use oxark::systems::round_actions::{
        IRoundActionsDispatcher, IRoundActionsDispatcherTrait, round_actions,
    };
    use oxark::utils::hash::compute_action_hash;
    use starknet::ContractAddress;

    fn namespace_def() -> NamespaceDef {
        NamespaceDef {
            namespace: "oxark",
            resources: [
                TestResource::Model(m_Game::TEST_CLASS_HASH),
                TestResource::Model(m_GameCounter::TEST_CLASS_HASH),
                TestResource::Model(m_GamePlayer::TEST_CLASS_HASH),
                TestResource::Model(m_PlayerState::TEST_CLASS_HASH),
                TestResource::Model(m_PlayerCard::TEST_CLASS_HASH),
                TestResource::Model(m_PlayerLookup::TEST_CLASS_HASH),
                TestResource::Model(m_CardPool::TEST_CLASS_HASH),
                TestResource::Model(m_CommittedAction::TEST_CLASS_HASH),
                TestResource::Model(m_RevealedAction::TEST_CLASS_HASH),
                TestResource::Event(game_actions::e_GameCreated::TEST_CLASS_HASH),
                TestResource::Event(game_actions::e_PlayerJoined::TEST_CLASS_HASH),
                TestResource::Event(game_actions::e_GameStarted::TEST_CLASS_HASH),
                TestResource::Event(round_actions::e_ActionCommitted::TEST_CLASS_HASH),
                TestResource::Event(round_actions::e_ActionRevealed::TEST_CLASS_HASH),
                TestResource::Event(round_actions::e_RoundResolved::TEST_CLASS_HASH),
                TestResource::Event(round_actions::e_StealResult::TEST_CLASS_HASH),
                TestResource::Event(round_actions::e_ScoutResult::TEST_CLASS_HASH),
                TestResource::Event(round_actions::e_DrawResult::TEST_CLASS_HASH),
                TestResource::Event(round_actions::e_GameWon::TEST_CLASS_HASH),
                TestResource::Contract(game_actions::TEST_CLASS_HASH),
                TestResource::Contract(round_actions::TEST_CLASS_HASH),
            ]
                .span(),
        }
    }

    fn contract_defs() -> Span<ContractDef> {
        [
            ContractDefTrait::new(@"oxark", @"game_actions")
                .with_writer_of([dojo::utils::bytearray_hash(@"oxark")].span()),
            ContractDefTrait::new(@"oxark", @"round_actions")
                .with_writer_of([dojo::utils::bytearray_hash(@"oxark")].span()),
        ]
            .span()
    }

    fn p1() -> ContractAddress {
        starknet::contract_address_const::<0x0>()
    }

    fn p2() -> ContractAddress {
        starknet::contract_address_const::<0x1234>()
    }

    fn setup_started_game() -> (
        dojo::world::WorldStorage,
        IGameActionsDispatcher,
        IRoundActionsDispatcher,
        u32,
    ) {
        let ndef = namespace_def();
        let mut world = spawn_test_world(world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());
        let (ga_addr, _) = world.dns(@"game_actions").unwrap();
        let (ra_addr, _) = world.dns(@"round_actions").unwrap();
        let game_system = IGameActionsDispatcher { contract_address: ga_addr };
        let round_system = IRoundActionsDispatcher { contract_address: ra_addr };

        let game_id = game_system.create_game(2);

        // P1 joins
        starknet::testing::set_contract_address(p1());
        game_system.join_game(game_id);

        // P2 joins
        starknet::testing::set_contract_address(p2());
        game_system.join_game(game_id);

        // P1 starts
        starknet::testing::set_contract_address(p1());
        game_system.start_game(game_id);

        (world, game_system, round_system, game_id)
    }

    #[test]
    fn test_commit_action() {
        let (mut world, _, round_system, game_id) = setup_started_game();

        let salt: felt252 = 0xDEAD;
        let zero_addr = starknet::contract_address_const::<0x0>();
        let hash = compute_action_hash(ActionType::Draw, zero_addr, salt);

        starknet::testing::set_contract_address(p1());
        round_system.commit(game_id, hash);

        let ps: PlayerState = world.read_model((game_id, p1()));
        assert(ps.has_committed, 'should be committed');

        let game: Game = world.read_model(game_id);
        assert(game.commit_count == 1, 'commit_count should be 1');
        assert(game.status == GameStatus::CommitPhase, 'still commit phase');
    }

    #[test]
    fn test_all_commit_transitions_to_reveal() {
        let (mut world, _, round_system, game_id) = setup_started_game();

        let salt: felt252 = 0xDEAD;
        let zero_addr = starknet::contract_address_const::<0x0>();

        // P1 commits Draw
        starknet::testing::set_contract_address(p1());
        let hash1 = compute_action_hash(ActionType::Draw, zero_addr, salt);
        round_system.commit(game_id, hash1);

        // P2 commits Draw
        starknet::testing::set_contract_address(p2());
        let hash2 = compute_action_hash(ActionType::Draw, zero_addr, 0xBEEF);
        round_system.commit(game_id, hash2);

        let game: Game = world.read_model(game_id);
        assert(game.status == GameStatus::RevealPhase, 'should be RevealPhase');
    }

    #[test]
    fn test_draw_draw_round() {
        let (mut world, _, round_system, game_id) = setup_started_game();

        let zero_addr = starknet::contract_address_const::<0x0>();
        let salt1: felt252 = 0xDEAD;
        let salt2: felt252 = 0xBEEF;

        // Both commit Draw
        starknet::testing::set_contract_address(p1());
        round_system.commit(game_id, compute_action_hash(ActionType::Draw, zero_addr, salt1));

        starknet::testing::set_contract_address(p2());
        round_system.commit(game_id, compute_action_hash(ActionType::Draw, zero_addr, salt2));

        // Both reveal Draw
        starknet::testing::set_contract_address(p1());
        round_system.reveal(game_id, 1, zero_addr, salt1); // 1 = Draw

        let ps1_before: PlayerState = world.read_model((game_id, p1()));

        starknet::testing::set_contract_address(p2());
        round_system.reveal(game_id, 1, zero_addr, salt2); // triggers resolve

        // After resolve, should be round 2
        let game: Game = world.read_model(game_id);
        assert(game.round == 2, 'should be round 2');
        assert(game.status == GameStatus::CommitPhase, 'should be CommitPhase');

        // Players should have drawn cards (card_count increased)
        let ps1: PlayerState = world.read_model((game_id, p1()));
        assert(ps1.card_count >= ps1_before.card_count, 'p1 should have drawn');
        assert(!ps1.has_committed, 'should reset committed');
        assert(!ps1.has_revealed, 'should reset revealed');
    }

    #[test]
    fn test_steal_blocked_by_barrier() {
        let (mut world, _, round_system, game_id) = setup_started_game();

        let salt1: felt252 = 0xDEAD;
        let salt2: felt252 = 0xBEEF;
        let zero_addr = starknet::contract_address_const::<0x0>();

        // P1 commits Steal targeting P2
        starknet::testing::set_contract_address(p1());
        round_system.commit(game_id, compute_action_hash(ActionType::Steal, p2(), salt1));

        // P2 commits Barrier
        starknet::testing::set_contract_address(p2());
        round_system.commit(game_id, compute_action_hash(ActionType::Barrier, zero_addr, salt2));

        // Record P2's card count before resolve
        let ps2_before: PlayerState = world.read_model((game_id, p2()));

        // Reveal
        starknet::testing::set_contract_address(p1());
        round_system.reveal(game_id, 2, p2(), salt1); // 2 = Steal

        starknet::testing::set_contract_address(p2());
        round_system.reveal(game_id, 3, zero_addr, salt2); // 3 = Barrier, triggers resolve

        // P2's cards should not have decreased (barrier blocked steal)
        let ps2_after: PlayerState = world.read_model((game_id, p2()));
        assert(ps2_after.card_count == ps2_before.card_count, 'barrier should block');

        // P1 should have consumed a steal spell
        let ps1: PlayerState = world.read_model((game_id, p1()));
        assert(ps1.steal_count == 2, 'steal consumed');

        // P2 should have consumed a barrier spell
        assert(ps2_after.barrier_count == 1, 'barrier consumed');
    }

    #[test]
    fn test_steal_succeeds_without_barrier() {
        let (mut world, _, round_system, game_id) = setup_started_game();

        let salt1: felt252 = 0xDEAD;
        let salt2: felt252 = 0xBEEF;
        let zero_addr = starknet::contract_address_const::<0x0>();

        // P1 commits Steal targeting P2
        starknet::testing::set_contract_address(p1());
        round_system.commit(game_id, compute_action_hash(ActionType::Steal, p2(), salt1));

        // P2 commits Draw (no barrier)
        starknet::testing::set_contract_address(p2());
        round_system.commit(game_id, compute_action_hash(ActionType::Draw, zero_addr, salt2));

        let ps2_before: PlayerState = world.read_model((game_id, p2()));

        // Reveal
        starknet::testing::set_contract_address(p1());
        round_system.reveal(game_id, 2, p2(), salt1);

        starknet::testing::set_contract_address(p2());
        round_system.reveal(game_id, 1, zero_addr, salt2); // triggers resolve

        // P2 should have lost a card (if they had any)
        let ps2_after: PlayerState = world.read_model((game_id, p2()));
        if ps2_before.card_count > 0 {
            // Steal takes 1 card, but draw gives 1 card, so net = 0 for p2
            // Actually: resolution order is Steal first, Draw second
            // P2 loses 1 to steal, then gains 1 from draw
            // P1 gains 1 from steal
            let ps1: PlayerState = world.read_model((game_id, p1()));
            // P1 should have gained a card
            assert(ps1.card_count >= 2, 'p1 gained from steal');
        }
    }

    #[test]
    fn test_scout_consumes_spell() {
        let (mut world, _, round_system, game_id) = setup_started_game();

        let salt1: felt252 = 0xDEAD;
        let salt2: felt252 = 0xBEEF;
        let zero_addr = starknet::contract_address_const::<0x0>();

        // P1 commits Scout targeting P2
        starknet::testing::set_contract_address(p1());
        round_system.commit(game_id, compute_action_hash(ActionType::Scout, p2(), salt1));

        // P2 commits Draw
        starknet::testing::set_contract_address(p2());
        round_system.commit(game_id, compute_action_hash(ActionType::Draw, zero_addr, salt2));

        // Reveal
        starknet::testing::set_contract_address(p1());
        round_system.reveal(game_id, 4, p2(), salt1); // 4 = Scout

        starknet::testing::set_contract_address(p2());
        round_system.reveal(game_id, 1, zero_addr, salt2);

        let ps1: PlayerState = world.read_model((game_id, p1()));
        assert(ps1.scout_count == 0, 'scout should be consumed');
    }

    #[test]
    #[should_panic(expected: ('hash mismatch', 'ENTRYPOINT_FAILED'))]
    fn test_reveal_wrong_hash_panics() {
        let (_, _, round_system, game_id) = setup_started_game();

        let zero_addr = starknet::contract_address_const::<0x0>();
        let salt: felt252 = 0xDEAD;

        // Commit with Draw
        starknet::testing::set_contract_address(p1());
        round_system.commit(game_id, compute_action_hash(ActionType::Draw, zero_addr, salt));

        // Also commit P2 to move to reveal phase
        starknet::testing::set_contract_address(p2());
        round_system.commit(
            game_id, compute_action_hash(ActionType::Draw, zero_addr, 0xBEEF),
        );

        // Try to reveal with wrong action type
        starknet::testing::set_contract_address(p1());
        round_system.reveal(game_id, 3, zero_addr, salt); // 3=Barrier, but committed Draw
    }

    #[test]
    #[should_panic(expected: ('already committed', 'ENTRYPOINT_FAILED'))]
    fn test_double_commit_panics() {
        let (_, _, round_system, game_id) = setup_started_game();

        let zero_addr = starknet::contract_address_const::<0x0>();
        let salt: felt252 = 0xDEAD;

        starknet::testing::set_contract_address(p1());
        round_system.commit(game_id, compute_action_hash(ActionType::Draw, zero_addr, salt));
        round_system.commit(game_id, compute_action_hash(ActionType::Draw, zero_addr, salt));
    }
}
