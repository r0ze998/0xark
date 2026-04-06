#[starknet::interface]
pub trait IGameActions<T> {
    fn create_game(ref self: T, max_players: u8) -> u32;
    fn join_game(ref self: T, game_id: u32);
    fn start_game(ref self: T, game_id: u32);
}

#[dojo::contract]
pub mod game_actions {
    use dojo::event::EventStorage;
    use dojo::model::ModelStorage;
    use oxark::models::card::CardPool;
    use oxark::models::game::{
        CARDS_PER_TYPE, Game, GameCounter, GamePlayer, GameStatus, INITIAL_BARRIER_SPELLS,
        INITIAL_HAND_SIZE, INITIAL_SCOUT_SPELLS, INITIAL_STEAL_SPELLS, MAX_ROUNDS,
        TOTAL_CARD_TYPES, TOTAL_CARDS,
    };
    use oxark::models::player::{PlayerCard, PlayerLookup, PlayerState};
    use oxark::utils::random::pseudo_random;
    use starknet::{ContractAddress, get_caller_address};
    use super::IGameActions;

    // === Events ===

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct GameCreated {
        #[key]
        pub game_id: u32,
        pub host: ContractAddress,
        pub max_players: u8,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct PlayerJoined {
        #[key]
        pub game_id: u32,
        pub player: ContractAddress,
        pub player_index: u8,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct GameStarted {
        #[key]
        pub game_id: u32,
        pub player_count: u8,
    }

    // === Implementation ===

    #[abi(embed_v0)]
    impl GameActionsImpl of IGameActions<ContractState> {
        fn create_game(ref self: ContractState, max_players: u8) -> u32 {
            let mut world = self.world_default();
            let caller = get_caller_address();

            assert(max_players >= 2 && max_players <= 3, 'max_players must be 2 or 3');

            // Get next game ID
            let mut counter: GameCounter = world.read_model(1_u32);
            counter.next_game_id += 1;
            let game_id = counter.next_game_id;
            world.write_model(@counter);

            // Initialize card pool
            let mut card_id: u8 = 1;
            while card_id <= TOTAL_CARD_TYPES {
                let pool = CardPool { game_id, card_id, remaining: CARDS_PER_TYPE };
                world.write_model(@pool);
                card_id += 1;
            };

            let game = Game {
                game_id,
                host: caller,
                status: GameStatus::Lobby,
                round: 0,
                max_rounds: MAX_ROUNDS,
                player_count: 0,
                max_players,
                cards_in_pool: TOTAL_CARDS,
                winner: starknet::contract_address_const::<0x0>(),
                commit_count: 0,
                reveal_count: 0,
            };
            world.write_model(@game);

            world.emit_event(@GameCreated { game_id, host: caller, max_players });

            game_id
        }

        fn join_game(ref self: ContractState, game_id: u32) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.status == GameStatus::Lobby, 'game not in lobby');
            assert(game.player_count < game.max_players, 'game is full');

            // Check player not already in a game
            let existing: PlayerLookup = world.read_model(caller);
            assert(existing.game_id == 0, 'already in a game');

            let player_index = game.player_count;
            game.player_count += 1;

            let player_state = PlayerState {
                game_id,
                player: caller,
                player_index,
                card_count: 0,
                steal_count: INITIAL_STEAL_SPELLS,
                barrier_count: INITIAL_BARRIER_SPELLS,
                scout_count: INITIAL_SCOUT_SPELLS,
                has_committed: false,
                has_revealed: false,
            };

            // Initialize empty card slots
            let mut slot: u8 = 0;
            while slot < TOTAL_CARD_TYPES {
                let pc = PlayerCard { game_id, player: caller, slot, card_id: 0 };
                world.write_model(@pc);
                slot += 1;
            };

            let game_player = GamePlayer { game_id, index: player_index, address: caller };
            let lookup = PlayerLookup { player: caller, game_id };

            world.write_model(@game);
            world.write_model(@player_state);
            world.write_model(@game_player);
            world.write_model(@lookup);

            world.emit_event(@PlayerJoined { game_id, player: caller, player_index });
        }

        fn start_game(ref self: ContractState, game_id: u32) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.status == GameStatus::Lobby, 'game not in lobby');
            assert(game.host == caller, 'only host can start');
            assert(game.player_count >= 2, 'need at least 2 players');

            // Distribute initial cards to each player
            let mut pi: u8 = 0;
            while pi < game.player_count {
                let gp: GamePlayer = world.read_model((game_id, pi));
                let player_addr = gp.address;

                let mut dealt: u8 = 0;
                while dealt < INITIAL_HAND_SIZE {
                    // Pick a random card from pool
                    let seed: felt252 = (pi.into() * 100 + dealt.into() + 42).into();
                    let rand = pseudo_random(game_id, 0, seed);
                    let card_id = pick_card_from_pool(ref world, game_id, rand);

                    if card_id > 0 {
                        // Find empty slot and place card
                        place_card_in_hand(ref world, game_id, player_addr, card_id);
                        let mut ps: PlayerState = world.read_model((game_id, player_addr));
                        ps.card_count += 1;
                        world.write_model(@ps);
                        game.cards_in_pool -= 1;
                    }
                    dealt += 1;
                };
                pi += 1;
            };

            game.status = GameStatus::CommitPhase;
            game.round = 1;
            game.commit_count = 0;
            game.reveal_count = 0;
            world.write_model(@game);

            world.emit_event(@GameStarted { game_id, player_count: game.player_count });
        }
    }

    // === Internal helpers ===

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"oxark")
        }
    }

    /// Pick a random card from the pool. Returns card_id (1-5) or 0 if pool empty.
    fn pick_card_from_pool(
        ref world: dojo::world::WorldStorage, game_id: u32, rand: u32,
    ) -> u8 {
        // Count total remaining
        let mut total: u32 = 0;
        let mut cid: u8 = 1;
        while cid <= TOTAL_CARD_TYPES {
            let pool: CardPool = world.read_model((game_id, cid));
            total += pool.remaining.into();
            cid += 1;
        };

        if total == 0 {
            return 0;
        }

        let pick = rand % total;
        let mut cumulative: u32 = 0;
        let mut result: u8 = 0;
        let mut cid2: u8 = 1;
        while cid2 <= TOTAL_CARD_TYPES {
            if result == 0 {
                let pool: CardPool = world.read_model((game_id, cid2));
                cumulative += pool.remaining.into();
                if pick < cumulative {
                    result = cid2;
                    // Decrement pool
                    let updated = CardPool {
                        game_id, card_id: cid2, remaining: pool.remaining - 1,
                    };
                    world.write_model(@updated);
                }
            }
            cid2 += 1;
        };

        result
    }

    /// Place a card in the first empty slot of the player's hand.
    fn place_card_in_hand(
        ref world: dojo::world::WorldStorage,
        game_id: u32,
        player: ContractAddress,
        card_id: u8,
    ) {
        let mut slot: u8 = 0;
        let mut placed: bool = false;
        while slot < TOTAL_CARD_TYPES {
            if !placed {
                let pc: PlayerCard = world.read_model((game_id, player, slot));
                if pc.card_id == 0 {
                    let updated = PlayerCard { game_id, player, slot, card_id };
                    world.write_model(@updated);
                    placed = true;
                }
            }
            slot += 1;
        };
    }
}
