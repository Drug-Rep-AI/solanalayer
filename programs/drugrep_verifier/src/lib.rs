//! DrugRep Proof Layer verifier.
//!
//! `verify_match` checks a Groth16 proof (trial_match circuit, BN254) with
//! the alt_bn128 syscalls through groth16-solana. The proof says: of the top
//! k predictions in a committed PredictionRun, `hits` are confirmed positives
//! in a lab's committed private Dataset. Nothing else about either side is
//! revealed. A successful check writes a ValidationRecord, the on chain
//! attestation, and a Nullifier PDA that blocks replays.

pub mod error;
pub mod events;
pub mod instructions;
pub mod state;
pub mod verifying_key;

use anchor_lang::prelude::*;

pub use error::*;
pub use events::*;
pub use instructions::*;
pub use state::*;

declare_id!("HkJreUgMDofiQJAZ4pRj8vt4pZ3hVkJ8hSmSULcf3qij");

#[program]
pub mod drugrep_verifier {
    use super::*;

    /// Verifies a trial_match proof against a registered run and dataset.
    pub fn verify_match(
        ctx: Context<VerifyMatch>,
        proof: Groth16Proof,
        public_inputs: PublicInputs,
    ) -> Result<()> {
        instructions::verify_match::handle_verify_match(ctx, proof, public_inputs)
    }

    /// Permissionless: copies a dataset revocation onto a ValidationRecord.
    pub fn sync_revocation(ctx: Context<SyncRevocation>) -> Result<()> {
        instructions::sync_revocation::handle_sync_revocation(ctx)
    }
}
