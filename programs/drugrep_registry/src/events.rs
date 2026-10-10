use anchor_lang::prelude::*;

#[event]
pub struct LabRegistered {
    pub lab: Pubkey,
    pub authority: Pubkey,
    pub name_hash: [u8; 32],
    pub slot: u64,
    pub timestamp: i64,
}

#[event]
pub struct DatasetCommitted {
    pub dataset: Pubkey,
    pub lab: Pubkey,
    pub dataset_root: [u8; 32],
    pub record_count: u32,
    pub schema_version: u16,
    pub slot: u64,
    pub timestamp: i64,
}

#[event]
pub struct PredictionRunCommitted {
    pub run: Pubkey,
    pub authority: Pubkey,
    pub run_id: [u8; 32],
    pub model_version_hash: [u8; 32],
    pub input_hash: [u8; 32],
    pub layer1_hash: [u8; 32],
    pub layer2_hash: [u8; 32],
    pub layer3_hash: [u8; 32],
    pub predictions_root: [u8; 32],
    pub top_k: u16,
    pub slot: u64,
    pub timestamp: i64,
}

#[event]
pub struct DatasetRevoked {
    pub dataset: Pubkey,
    pub lab: Pubkey,
    pub slot: u64,
    pub timestamp: i64,
}
