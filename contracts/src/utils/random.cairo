/// Pseudo-random number generator for Phase 1.
/// Uses game state as entropy source. NOT cryptographically secure.
/// Phase 2 should use Pragma VRF.
pub fn pseudo_random(game_id: u32, round: u8, seed: felt252) -> u32 {
    let g: felt252 = game_id.into();
    let r: felt252 = round.into();
    let hash = core::pedersen::pedersen(core::pedersen::pedersen(g, r), seed);
    // Take low 32 bits
    let val: u256 = hash.into();
    (val & 0xFFFFFFFF).try_into().unwrap()
}
