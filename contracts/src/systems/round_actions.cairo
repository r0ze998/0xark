use starknet::ContractAddress;

#[starknet::interface]
pub trait IRoundActions<T> {
    fn commit(ref self: T, game_id: u32, hash: felt252);
    fn reveal(ref self: T, game_id: u32, action_type: u8, target: ContractAddress, salt: felt252);
}

#[dojo::contract]
pub mod round_actions {
    use dojo::event::EventStorage;
    use dojo::model::ModelStorage;
    use oxark::models::action::{ActionType, CommittedAction, RevealedAction};
    use oxark::models::card::CardPool;
    use oxark::models::game::{Game, GamePlayer, GameStatus, TOTAL_CARD_TYPES};
    use oxark::models::player::{PlayerCard, PlayerState};
    use oxark::utils::hash::{compute_action_hash, felt_to_action_type};
    use oxark::utils::random::pseudo_random;
    use starknet::{ContractAddress, get_caller_address};
    use super::IRoundActions;

    // === Events ===

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct ActionCommitted {
        #[key]
        pub game_id: u32,
        pub player: ContractAddress,
        pub round: u8,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct ActionRevealed {
        #[key]
        pub game_id: u32,
        pub player: ContractAddress,
        pub round: u8,
        pub action_type: ActionType,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct RoundResolved {
        #[key]
        pub game_id: u32,
        pub round: u8,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct StealResult {
        #[key]
        pub game_id: u32,
        pub round: u8,
        pub stealer: ContractAddress,
        pub target: ContractAddress,
        pub success: bool,
        pub card_id: u8,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct ScoutResult {
        #[key]
        pub game_id: u32,
        pub round: u8,
        pub scouter: ContractAddress,
        pub target: ContractAddress,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct DrawResult {
        #[key]
        pub game_id: u32,
        pub round: u8,
        pub player: ContractAddress,
        pub card_id: u8,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct GameWon {
        #[key]
        pub game_id: u32,
        pub winner: ContractAddress,
        pub round: u8,
    }

    // === Implementation ===

    #[abi(embed_v0)]
    impl RoundActionsImpl of IRoundActions<ContractState> {
        fn commit(ref self: ContractState, game_id: u32, hash: felt252) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.status == GameStatus::CommitPhase, 'not commit phase');

            let mut ps: PlayerState = world.read_model((game_id, caller));
            assert(ps.player_index < game.player_count, 'not in this game');
            assert(!ps.has_committed, 'already committed');

            let committed = CommittedAction {
                game_id, round: game.round, player: caller, hash,
            };
            ps.has_committed = true;

            world.write_model(@committed);
            world.write_model(@ps);

            game.commit_count += 1;

            // If all players committed, transition to reveal phase
            if game.commit_count == game.player_count {
                game.status = GameStatus::RevealPhase;
            }
            world.write_model(@game);

            world.emit_event(@ActionCommitted { game_id, player: caller, round: game.round });
        }

        fn reveal(
            ref self: ContractState,
            game_id: u32,
            action_type: u8,
            target: ContractAddress,
            salt: felt252,
        ) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let mut game: Game = world.read_model(game_id);
            assert(game.status == GameStatus::RevealPhase, 'not reveal phase');

            let mut ps: PlayerState = world.read_model((game_id, caller));
            assert(ps.has_committed, 'not committed');
            assert(!ps.has_revealed, 'already revealed');

            // Verify hash
            let at = felt_to_action_type(action_type);
            let expected_hash = compute_action_hash(at, target, salt);
            let committed: CommittedAction = world.read_model((game_id, game.round, caller));
            assert(committed.hash == expected_hash, 'hash mismatch');

            // Validate action is legal
            validate_action(@ps, at, target, caller);

            // Store revealed action
            let revealed = RevealedAction {
                game_id, round: game.round, player: caller, action_type: at, target,
            };
            ps.has_revealed = true;

            world.write_model(@revealed);
            world.write_model(@ps);

            game.reveal_count += 1;

            world.emit_event(
                @ActionRevealed { game_id, player: caller, round: game.round, action_type: at },
            );

            // If all players revealed, resolve the round
            if game.reveal_count == game.player_count {
                game.status = GameStatus::Resolving;
                world.write_model(@game);
                resolve_round(ref world, game_id);
            } else {
                world.write_model(@game);
            }
        }
    }

    // === Internal helpers ===

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"oxark")
        }
    }

    fn validate_action(
        ps: @PlayerState, action_type: ActionType, target: ContractAddress, caller: ContractAddress,
    ) {
        match action_type {
            ActionType::Draw => {
                // Draw needs no target
            },
            ActionType::Steal => {
                assert(*ps.steal_count > 0, 'no steal spells');
                assert(target != caller, 'cant steal from self');
            },
            ActionType::Barrier => {
                assert(*ps.barrier_count > 0, 'no barrier spells');
            },
            ActionType::Scout => {
                assert(*ps.scout_count > 0, 'no scout spells');
                assert(target != caller, 'cant scout self');
            },
            ActionType::None => {
                panic!("invalid action type");
            },
        }
    }

    fn resolve_round(ref world: dojo::world::WorldStorage, game_id: u32) {
        let mut game: Game = world.read_model(game_id);
        let round = game.round;
        let player_count = game.player_count;

        // Phase 1: Collect all barrier players
        // Phase 2: Process steals (blocked by barriers)
        // Phase 3: Process scouts
        // Phase 4: Process draws
        // Phase 5: Consume spells
        // Phase 6: Check win condition
        // Phase 7: Advance round

        // --- Collect player addresses ---
        let mut players: Array<ContractAddress> = ArrayTrait::new();
        let mut pi: u8 = 0;
        while pi < player_count {
            let gp: GamePlayer = world.read_model((game_id, pi));
            players.append(gp.address);
            pi += 1;
        };

        // --- Phase 1: Identify barrier users ---
        let mut barrier_flags: Array<bool> = ArrayTrait::new();
        let mut i: u32 = 0;
        while i < players.len() {
            let addr = *players.at(i);
            let ra: RevealedAction = world.read_model((game_id, round, addr));
            barrier_flags.append(ra.action_type == ActionType::Barrier);
            i += 1;
        };

        // --- Phase 2: Process steals ---
        let mut i2: u32 = 0;
        while i2 < players.len() {
            let addr = *players.at(i2);
            let ra: RevealedAction = world.read_model((game_id, round, addr));
            if ra.action_type == ActionType::Steal {
                let target = ra.target;
                // Check if target has barrier
                let target_has_barrier = is_player_barriered(
                    @players, @barrier_flags, target,
                );

                if target_has_barrier {
                    // Steal blocked
                    world
                        .emit_event(
                            @StealResult {
                                game_id,
                                round,
                                stealer: addr,
                                target,
                                success: false,
                                card_id: 0,
                            },
                        );
                } else {
                    // Steal succeeds — take random card from target
                    let stolen_card = steal_random_card(ref world, game_id, addr, target, round);
                    world
                        .emit_event(
                            @StealResult {
                                game_id,
                                round,
                                stealer: addr,
                                target,
                                success: stolen_card > 0,
                                card_id: stolen_card,
                            },
                        );
                }

                // Consume steal spell
                let mut ps: PlayerState = world.read_model((game_id, addr));
                ps.steal_count -= 1;
                world.write_model(@ps);
            }
            i2 += 1;
        };

        // --- Phase 3: Process scouts ---
        let mut i3: u32 = 0;
        while i3 < players.len() {
            let addr = *players.at(i3);
            let ra: RevealedAction = world.read_model((game_id, round, addr));
            if ra.action_type == ActionType::Scout {
                // Emit event with target info (publicly visible in Phase 1)
                world
                    .emit_event(
                        @ScoutResult { game_id, round, scouter: addr, target: ra.target },
                    );

                // Consume scout spell
                let mut ps: PlayerState = world.read_model((game_id, addr));
                ps.scout_count -= 1;
                world.write_model(@ps);
            }
            i3 += 1;
        };

        // --- Phase 4: Process draws ---
        let mut i4: u32 = 0;
        while i4 < players.len() {
            let addr = *players.at(i4);
            let ra: RevealedAction = world.read_model((game_id, round, addr));
            if ra.action_type == ActionType::Draw {
                let rand = pseudo_random(game_id, round, addr.into());
                let card_id = draw_from_pool(ref world, game_id, rand);
                if card_id > 0 {
                    place_card(ref world, game_id, addr, card_id);
                    let mut ps: PlayerState = world.read_model((game_id, addr));
                    ps.card_count += 1;
                    world.write_model(@ps);
                    game.cards_in_pool -= 1;
                }
                world
                    .emit_event(@DrawResult { game_id, round, player: addr, card_id });
            }
            i4 += 1;
        };

        // --- Phase 5: Consume barrier spells ---
        let mut i5: u32 = 0;
        while i5 < players.len() {
            let addr = *players.at(i5);
            let ra: RevealedAction = world.read_model((game_id, round, addr));
            if ra.action_type == ActionType::Barrier {
                let mut ps: PlayerState = world.read_model((game_id, addr));
                ps.barrier_count -= 1;
                world.write_model(@ps);
            }
            i5 += 1;
        };

        // --- Phase 6: Check win condition ---
        let mut winner: ContractAddress = starknet::contract_address_const::<0x0>();
        let mut i6: u32 = 0;
        while i6 < players.len() {
            let addr = *players.at(i6);
            if has_all_card_types(@world, game_id, addr) {
                winner = addr;
            }
            i6 += 1;
        };

        // --- Phase 7: Advance or end ---
        if winner != starknet::contract_address_const::<0x0>() {
            game.status = GameStatus::Finished;
            game.winner = winner;
            world.write_model(@game);
            world.emit_event(@GameWon { game_id, winner, round });
        } else if game.round >= game.max_rounds {
            // Time's up — player with most cards wins
            let most_cards_winner = find_most_cards_player(@world, @players, game_id);
            game.status = GameStatus::Finished;
            game.winner = most_cards_winner;
            world.write_model(@game);
            world.emit_event(@GameWon { game_id, winner: most_cards_winner, round });
        } else {
            // Next round
            game.round += 1;
            game.status = GameStatus::CommitPhase;
            game.commit_count = 0;
            game.reveal_count = 0;

            // Reset player commit/reveal flags
            let mut ri: u32 = 0;
            while ri < players.len() {
                let addr = *players.at(ri);
                let mut ps: PlayerState = world.read_model((game_id, addr));
                ps.has_committed = false;
                ps.has_revealed = false;
                world.write_model(@ps);
                ri += 1;
            };

            world.write_model(@game);
        }

        world.emit_event(@RoundResolved { game_id, round });
    }

    fn is_player_barriered(
        players: @Array<ContractAddress>,
        barrier_flags: @Array<bool>,
        target: ContractAddress,
    ) -> bool {
        let mut i: u32 = 0;
        let mut result = false;
        while i < players.len() {
            if *players.at(i) == target && *barrier_flags.at(i) {
                result = true;
            }
            i += 1;
        };
        result
    }

    fn steal_random_card(
        ref world: dojo::world::WorldStorage,
        game_id: u32,
        stealer: ContractAddress,
        target: ContractAddress,
        round: u8,
    ) -> u8 {
        // Find a non-empty card slot on target
        let rand = pseudo_random(game_id, round, stealer.into());

        // Count target's cards
        let mut target_cards: Array<(u8, u8)> = ArrayTrait::new(); // (slot, card_id)
        let mut slot: u8 = 0;
        while slot < TOTAL_CARD_TYPES {
            let pc: PlayerCard = world.read_model((game_id, target, slot));
            if pc.card_id > 0 {
                target_cards.append((slot, pc.card_id));
            }
            slot += 1;
        };

        if target_cards.len() == 0 {
            return 0;
        }

        let pick_idx = rand % target_cards.len();
        let (stolen_slot, stolen_card_id) = *target_cards.at(pick_idx);

        // Remove from target
        let empty = PlayerCard { game_id, player: target, slot: stolen_slot, card_id: 0 };
        world.write_model(@empty);
        let mut target_ps: PlayerState = world.read_model((game_id, target));
        target_ps.card_count -= 1;
        world.write_model(@target_ps);

        // Add to stealer
        place_card(ref world, game_id, stealer, stolen_card_id);
        let mut stealer_ps: PlayerState = world.read_model((game_id, stealer));
        stealer_ps.card_count += 1;
        world.write_model(@stealer_ps);

        stolen_card_id
    }

    fn draw_from_pool(
        ref world: dojo::world::WorldStorage, game_id: u32, rand: u32,
    ) -> u8 {
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

    fn place_card(
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

    fn has_all_card_types(
        world: @dojo::world::WorldStorage, game_id: u32, player: ContractAddress,
    ) -> bool {
        // Check if player has at least one of each card type (1-5)
        let mut has: Array<bool> = ArrayTrait::new();
        let mut cid: u8 = 1;
        while cid <= TOTAL_CARD_TYPES {
            has.append(false);
            cid += 1;
        };

        let mut slot: u8 = 0;
        while slot < TOTAL_CARD_TYPES {
            let pc: PlayerCard = world.read_model((game_id, player, slot));
            if pc.card_id > 0 && pc.card_id <= TOTAL_CARD_TYPES {
                // Mark this card type as found (card_id is 1-indexed)
                // We can't mutate the array, so let's use a different approach
                let _ = pc; // handled below
            }
            slot += 1;
        };

        // Simpler approach: count unique types
        let mut unique_count: u8 = 0;
        let mut check_id: u8 = 1;
        while check_id <= TOTAL_CARD_TYPES {
            let mut found: bool = false;
            let mut s: u8 = 0;
            while s < TOTAL_CARD_TYPES {
                if !found {
                    let pc: PlayerCard = world.read_model((game_id, player, s));
                    if pc.card_id == check_id {
                        found = true;
                    }
                }
                s += 1;
            };
            if found {
                unique_count += 1;
            }
            check_id += 1;
        };

        unique_count == TOTAL_CARD_TYPES
    }

    fn find_most_cards_player(
        world: @dojo::world::WorldStorage,
        players: @Array<ContractAddress>,
        game_id: u32,
    ) -> ContractAddress {
        let mut best_addr: ContractAddress = starknet::contract_address_const::<0x0>();
        let mut best_count: u8 = 0;
        let mut i: u32 = 0;
        while i < players.len() {
            let addr = *players.at(i);
            let ps: PlayerState = world.read_model((game_id, addr));
            if ps.card_count > best_count {
                best_count = ps.card_count;
                best_addr = addr;
            }
            i += 1;
        };
        best_addr
    }
}
