use crate::constants::*;
use crate::error::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::borsh::BorshDeserialize;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct StartGame<'info> {
    #[account(
        mut,
        seeds = [GAME_SEED, game_id.to_le_bytes().as_ref()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,
    #[account(
        mut,
        seeds = [CARD_POOL_SEED, game_id.to_le_bytes().as_ref()],
        bump = card_pool.bump,
    )]
    pub card_pool: Account<'info, CardPool>,
    /// Player states passed as remaining accounts
    pub host: Signer<'info>,
}

pub fn handle_start_game(ctx: Context<StartGame>, game_id: u64) -> Result<()> {
    let game = &mut ctx.accounts.game;
    require!(game.status == GameStatus::Lobby, ErrorCode::NotInLobby);
    require!(game.host == ctx.accounts.host.key(), ErrorCode::NotHost);
    require!(game.player_count >= 1, ErrorCode::NotEnoughPlayers);

    let player_count = game.player_count as usize;
    require!(
        ctx.remaining_accounts.len() >= player_count,
        ErrorCode::NotEnoughPlayers
    );

    let pool = &mut ctx.accounts.card_pool;

    // Distribute initial cards to each player via remaining accounts
    let clock = Clock::get()?;
    let mut seed = clock.slot;
    let game_id_le = game_id.to_le_bytes();

    for (idx, account_info) in ctx.remaining_accounts.iter().take(player_count).enumerate() {
        // C3 fix: only the PlayerState PDAs registered in game.players (by
        // join_game) may receive opening hands — same whitelist pattern as
        // resolve_round. Prevents dealing into attacker-supplied accounts.
        let player_key = game.players[idx];
        require!(player_key != Pubkey::default(), ErrorCode::InvalidState);
        let (expected_pda, _) = Pubkey::find_program_address(
            &[PLAYER_SEED, &game_id_le, player_key.as_ref()],
            &crate::ID,
        );
        require!(*account_info.key == expected_pda, ErrorCode::InvalidState);
        require!(
            account_info.owner == &crate::ID,
            ErrorCode::InvalidAccountOwner
        );

        // Borsh round-trip instead of the previous unsafe transmute: PlayerState
        // is not repr(C), so a native-layout view over Borsh bytes is undefined
        // behavior. Reader-based deserialize (not try_from_slice) — SIZE
        // over-allocates for Option<Pubkey>::None padding.
        let mut data = account_info.try_borrow_mut_data()?;
        let mut ps: PlayerState = {
            let mut slice = &data[8..];
            BorshDeserialize::deserialize(&mut slice).map_err(|_| ErrorCode::InvalidAction)?
        };

        for _ in 0..INITIAL_HAND_SIZE {
            let card_id = pick_card_from_pool(&mut pool.remaining, seed);
            if card_id > 0 {
                place_card_in_hand(&mut ps.cards, card_id);
                ps.card_count += 1;
                game.cards_in_pool -= 1;
            }
            seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
        }

        // Write back only the mutated fields at their Borsh offsets
        // (same layout contract as resolve_round::write_back_player_states):
        //   8 disc + game_id(8) + player(32) + player_index(1) + area(1) = 50 → cards[5]
        data[50..55].copy_from_slice(&ps.cards);
        data[55] = ps.card_count;
    }

    game.status = GameStatus::CommitPhase;
    game.round = 1;
    game.commit_count = 0;
    game.reveal_count = 0;

    msg!(
        "Game {} started with {} players",
        game_id,
        game.player_count
    );
    Ok(())
}

fn pick_card_from_pool(remaining: &mut [u8; 5], seed: u64) -> u8 {
    let total: u32 = remaining.iter().map(|&r| r as u32).sum();
    if total == 0 {
        return 0;
    }

    let pick = (seed % total as u64) as u32;
    let mut cumulative: u32 = 0;

    for i in 0..5 {
        cumulative += remaining[i] as u32;
        if pick < cumulative {
            remaining[i] -= 1;
            return (i + 1) as u8;
        }
    }
    0
}

fn place_card_in_hand(cards: &mut [u8; 5], card_id: u8) {
    for slot in cards.iter_mut() {
        if *slot == 0 {
            *slot = card_id;
            return;
        }
    }
}
