#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct CardPool {
    #[key]
    pub game_id: u32,
    #[key]
    pub card_id: u8,
    pub remaining: u8,
}
