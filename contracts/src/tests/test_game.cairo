#[cfg(test)]
mod tests {
    use dojo::model::ModelStorage;
    use dojo::world::{WorldStorageTrait, world};
    use dojo_cairo_test::{
        ContractDef, ContractDefTrait, NamespaceDef, TestResource, WorldStorageTestTrait,
        spawn_test_world,
    };
    use oxark::models::card::{m_CardPool};
    use oxark::models::game::{
        Game, GameStatus, m_Game, m_GameCounter, m_GamePlayer, TOTAL_CARD_TYPES,
    };
    use oxark::models::player::{PlayerState, m_PlayerCard, m_PlayerLookup, m_PlayerState};
    use oxark::models::action::{m_CommittedAction, m_RevealedAction};
    use oxark::systems::game_actions::{IGameActionsDispatcher, IGameActionsDispatcherTrait, game_actions};
    use oxark::systems::round_actions::{round_actions};

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

    fn setup() -> (dojo::world::WorldStorage, IGameActionsDispatcher) {
        let ndef = namespace_def();
        let mut world = spawn_test_world(world::TEST_CLASS_HASH, [ndef].span());
        world.sync_perms_and_inits(contract_defs());
        let (contract_address, _) = world.dns(@"game_actions").unwrap();
        let game_system = IGameActionsDispatcher { contract_address };
        (world, game_system)
    }

    #[test]
    fn test_create_game() {
        let (mut world, game_system) = setup();
        let game_id = game_system.create_game(3);
        assert(game_id == 1, 'first game_id should be 1');

        let game: Game = world.read_model(game_id);
        assert(game.status == GameStatus::Lobby, 'should be Lobby');
        assert(game.max_players == 3, 'max_players should be 3');
        assert(game.player_count == 0, 'player_count should be 0');
    }

    #[test]
    fn test_join_game() {
        let (mut world, game_system) = setup();
        let game_id = game_system.create_game(2);
        game_system.join_game(game_id);

        let game: Game = world.read_model(game_id);
        assert(game.player_count == 1, 'should have 1 player');

        let caller = starknet::get_caller_address();
        let ps: PlayerState = world.read_model((game_id, caller));
        assert(ps.player_index == 0, 'should be index 0');
        assert(ps.steal_count == 3, 'should have 3 steals');
        assert(ps.barrier_count == 2, 'should have 2 barriers');
        assert(ps.scout_count == 1, 'should have 1 scout');
    }

    #[test]
    fn test_start_game_distributes_cards() {
        let (mut world, game_system) = setup();
        let game_id = game_system.create_game(2);

        // Player 1 joins
        game_system.join_game(game_id);

        // Player 2 joins
        starknet::testing::set_contract_address(starknet::contract_address_const::<0x1234>());
        game_system.join_game(game_id);

        // Host starts
        starknet::testing::set_contract_address(starknet::contract_address_const::<0x0>());
        game_system.start_game(game_id);

        let game: Game = world.read_model(game_id);
        assert(game.status == GameStatus::CommitPhase, 'should be CommitPhase');
        assert(game.round == 1, 'round should be 1');

        // Each player should have 2 cards
        let caller = starknet::contract_address_const::<0x0>();
        let ps1: PlayerState = world.read_model((game_id, caller));
        assert(ps1.card_count == 2, 'p1 should have 2 cards');

        let p2 = starknet::contract_address_const::<0x1234>();
        let ps2: PlayerState = world.read_model((game_id, p2));
        assert(ps2.card_count == 2, 'p2 should have 2 cards');

        // Pool should have 15 - 4 = 11 cards
        assert(game.cards_in_pool == 11, 'pool should have 11');
    }

    #[test]
    fn test_card_pool_initialized() {
        let (mut world, game_system) = setup();
        let game_id = game_system.create_game(2);

        // Each card type should have 3 copies
        let mut cid: u8 = 1;
        while cid <= TOTAL_CARD_TYPES {
            let pool: oxark::models::card::CardPool = world.read_model((game_id, cid));
            assert(pool.remaining == 3, 'each type should have 3');
            cid += 1;
        };
    }

    #[test]
    #[should_panic(expected: ('game is full', 'ENTRYPOINT_FAILED'))]
    fn test_join_full_game() {
        let (_, game_system) = setup();
        let game_id = game_system.create_game(2);

        game_system.join_game(game_id);

        starknet::testing::set_contract_address(starknet::contract_address_const::<0x1234>());
        game_system.join_game(game_id);

        starknet::testing::set_contract_address(starknet::contract_address_const::<0x5678>());
        game_system.join_game(game_id); // should panic
    }

    #[test]
    #[should_panic(expected: ('need at least 2 players', 'ENTRYPOINT_FAILED'))]
    fn test_start_with_one_player() {
        let (_, game_system) = setup();
        let game_id = game_system.create_game(2);
        game_system.join_game(game_id);
        game_system.start_game(game_id); // should panic
    }

    #[test]
    fn test_create_multiple_games() {
        let (mut world, game_system) = setup();
        let gid1 = game_system.create_game(2);
        let gid2 = game_system.create_game(3);

        assert(gid1 == 1, 'first should be 1');
        assert(gid2 == 2, 'second should be 2');

        let g1: Game = world.read_model(gid1);
        let g2: Game = world.read_model(gid2);
        assert(g1.max_players == 2, 'g1 max 2');
        assert(g2.max_players == 3, 'g2 max 3');
    }
}
