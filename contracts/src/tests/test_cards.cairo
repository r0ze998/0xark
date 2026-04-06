#[cfg(test)]
mod tests {
    use oxark::utils::hash::compute_action_hash;
    use oxark::models::action::ActionType;

    #[test]
    fn test_hash_deterministic() {
        let zero_addr = starknet::contract_address_const::<0x0>();
        let salt: felt252 = 0x12345;
        let h1 = compute_action_hash(ActionType::Draw, zero_addr, salt);
        let h2 = compute_action_hash(ActionType::Draw, zero_addr, salt);
        assert(h1 == h2, 'hash should be deterministic');
    }

    #[test]
    fn test_hash_different_actions() {
        let zero_addr = starknet::contract_address_const::<0x0>();
        let salt: felt252 = 0x12345;
        let h_draw = compute_action_hash(ActionType::Draw, zero_addr, salt);
        let h_barrier = compute_action_hash(ActionType::Barrier, zero_addr, salt);
        assert(h_draw != h_barrier, 'diff actions diff hash');
    }

    #[test]
    fn test_hash_different_salts() {
        let zero_addr = starknet::contract_address_const::<0x0>();
        let h1 = compute_action_hash(ActionType::Draw, zero_addr, 0x111);
        let h2 = compute_action_hash(ActionType::Draw, zero_addr, 0x222);
        assert(h1 != h2, 'diff salts diff hash');
    }

    #[test]
    fn test_hash_different_targets() {
        let addr1 = starknet::contract_address_const::<0x1111>();
        let addr2 = starknet::contract_address_const::<0x2222>();
        let salt: felt252 = 0x12345;
        let h1 = compute_action_hash(ActionType::Steal, addr1, salt);
        let h2 = compute_action_hash(ActionType::Steal, addr2, salt);
        assert(h1 != h2, 'diff targets diff hash');
    }
}
