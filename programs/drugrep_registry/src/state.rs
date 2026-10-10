use anchor_lang::prelude::*;

pub const LAB_SEED: &[u8] = b"lab";
pub const DATASET_SEED: &[u8] = b"dataset";
pub const RUN_SEED: &[u8] = b"run";

/// Largest top k the trial_match circuit can evaluate (2^5 prediction slots).
pub const MAX_TOP_K: u16 = 32;

/// BN254 scalar field modulus, big endian. Roots must be below it.
pub const BN254_FR_MODULUS: [u8; 32] = [
    0x30, 0x64, 0x4e, 0x72, 0xe1, 0x31, 0xa0, 0x29, 0xb8, 0x50, 0x45, 0xb6, 0x81, 0x81, 0x58, 0x5d,
    0x28, 0x33, 0xe8, 0x48, 0x79, 0xb9, 0x70, 0x91, 0x43, 0xe1, 0xf5, 0x93, 0xf0, 0x00, 0x00, 0x01,
];

pub fn is_valid_field_root(root: &[u8; 32]) -> bool {
    root.iter().any(|b| *b != 0) && root[..] < BN254_FR_MODULUS[..]
}

/// A data owner. PDA: ["lab", authority].
#[account]
#[derive(InitSpace)]
pub struct Lab {
    pub authority: Pubkey,
    pub name_hash: [u8; 32],
    pub dataset_count: u32,
    pub created_slot: u64,
    pub created_at: i64,
    pub bump: u8,
}

/// A committed private dataset. PDA: ["dataset", lab, dataset_root].
/// Only the Poseidon root is stored; the salted labels stay with the lab.
#[account]
#[derive(InitSpace)]
pub struct Dataset {
    pub lab: Pubkey,
    pub authority: Pubkey,
    pub dataset_root: [u8; 32],
    pub record_count: u32,
    pub schema_version: u16,
    pub slot: u64,
    pub timestamp: i64,
    pub revoked: bool,
    pub revoked_slot: u64,
    pub revoked_at: i64,
    pub bump: u8,
}

/// One DrugRep engine run. PDA: ["run", run_id].
#[account]
#[derive(InitSpace)]
pub struct PredictionRun {
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
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct LayerHashes {
    pub model_version_hash: [u8; 32],
    pub input_hash: [u8; 32],
    pub layer1_hash: [u8; 32],
    pub layer2_hash: [u8; 32],
    pub layer3_hash: [u8; 32],
}
