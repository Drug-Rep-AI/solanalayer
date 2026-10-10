use anchor_lang::prelude::*;

pub const NULLIFIER_SEED: &[u8] = b"nullifier";
pub const VALIDATION_SEED: &[u8] = b"validation";

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Groth16Proof {
    /// G1, big endian, already negated by the client (see sdk/src/proof.ts).
    pub a: [u8; 64],
    /// G2, big endian, x.c1 | x.c0 | y.c1 | y.c0.
    pub b: [u8; 128],
    /// G1, big endian.
    pub c: [u8; 64],
}

/// Public signals of trial_match, each a 32 byte big endian field element.
/// Field order is the circuit's public signal order.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PublicInputs {
    pub predictions_root: [u8; 32],
    pub dataset_root: [u8; 32],
    pub hits: [u8; 32],
    pub k: [u8; 32],
    pub nullifier: [u8; 32],
}

impl PublicInputs {
    pub fn as_array(&self) -> [[u8; 32]; 5] {
        [self.predictions_root, self.dataset_root, self.hits, self.k, self.nullifier]
    }
}

/// Exists once per nullifier; a second proof with the same nullifier fails
/// at account creation. PDA: ["nullifier", nullifier].
#[account]
#[derive(InitSpace)]
pub struct Nullifier {
    pub nullifier: [u8; 32],
    pub validation: Pubkey,
    pub slot: u64,
    pub bump: u8,
}

/// The on chain attestation that a lab's private data confirmed `hits` of a
/// run's top `k` predictions. PDA: ["validation", nullifier].
#[account]
#[derive(InitSpace)]
pub struct ValidationRecord {
    pub run: Pubkey,
    pub dataset: Pubkey,
    pub lab: Pubkey,
    pub submitter: Pubkey,
    pub predictions_root: [u8; 32],
    pub dataset_root: [u8; 32],
    pub nullifier: [u8; 32],
    pub hits: u16,
    pub k: u16,
    pub hit_rate_bps: u16,
    /// True when the run was committed in an earlier slot than the dataset:
    /// the prediction existed on chain before the outcome data did.
    pub predicted_first: bool,
    pub run_slot: u64,
    pub dataset_slot: u64,
    pub verified_slot: u64,
    pub verified_at: i64,
    pub revoked: bool,
    pub revoked_slot: u64,
    pub bump: u8,
}
