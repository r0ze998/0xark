use core::pedersen::pedersen;
use oxark::models::action::ActionType;
use starknet::ContractAddress;

/// Compute the commit hash for an action.
/// hash = pedersen(pedersen(action_type_felt, target_felt), salt)
pub fn compute_action_hash(
    action_type: ActionType, target: ContractAddress, salt: felt252,
) -> felt252 {
    let action_felt: felt252 = action_type_to_felt(action_type);
    let target_felt: felt252 = target.into();
    let inner = pedersen(action_felt, target_felt);
    pedersen(inner, salt)
}

fn action_type_to_felt(action_type: ActionType) -> felt252 {
    match action_type {
        ActionType::None => 0,
        ActionType::Draw => 1,
        ActionType::Steal => 2,
        ActionType::Barrier => 3,
        ActionType::Scout => 4,
    }
}

pub fn felt_to_action_type(v: u8) -> ActionType {
    if v == 1 {
        ActionType::Draw
    } else if v == 2 {
        ActionType::Steal
    } else if v == 3 {
        ActionType::Barrier
    } else if v == 4 {
        ActionType::Scout
    } else {
        ActionType::None
    }
}
