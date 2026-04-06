use starknet::ContractAddress;

#[derive(Serde, Copy, Drop, Introspect, PartialEq, Debug, DojoStore, Default)]
pub enum ActionType {
    #[default]
    None,
    Draw,
    Steal,
    Barrier,
    Scout,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct CommittedAction {
    #[key]
    pub game_id: u32,
    #[key]
    pub round: u8,
    #[key]
    pub player: ContractAddress,
    pub hash: felt252,
}

/// Stored after reveal, used during resolution
#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct RevealedAction {
    #[key]
    pub game_id: u32,
    #[key]
    pub round: u8,
    #[key]
    pub player: ContractAddress,
    pub action_type: ActionType,
    pub target: ContractAddress,
}
