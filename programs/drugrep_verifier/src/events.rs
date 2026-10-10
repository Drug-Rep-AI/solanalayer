use anchor_lang::prelude::*;

#[event]
pub struct MatchVerified {
    pub validation: Pubkey,
    pub run: Pubkey,
    pub dataset: Pubkey,
    pub lab: Pubkey,
    pub hits: u16,
    pub k: u16,
    pub hit_rate_bps: u16,
    pub predicted_first: bool,
    pub nullifier: [u8; 32],
    pub slot: u64,
    pub timestamp: i64,
}

#[event]
pub struct ValidationRevoked {
    pub validation: Pubkey,
    pub dataset: Pubkey,
    pub slot: u64,
    pub timestamp: i64,
}
