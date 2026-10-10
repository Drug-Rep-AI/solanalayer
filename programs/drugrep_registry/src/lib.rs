//! DrugRep Proof Layer registry.
//!
//! Anchors three kinds of facts on chain, never raw data:
//! * a Lab, owned by the lab's wallet;
//! * a Dataset: the Poseidon root of a lab's salted private labels;
//! * a PredictionRun: one DrugRep engine run, with a separate hash for the
//!   model version, the inputs and each of the three layers, plus the
//!   Poseidon root of the ranked predictions.
//! Each account records the slot and unix time it was written, which is the
//! timestamp later used to show a prediction existed before an outcome.

pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use error::*;
pub use events::*;
pub use instructions::*;
pub use state::*;

declare_id!("Heqv7iDHvG2YGsiMnXMNSTgMxAAcWja1QoFx4fGnd7xt");

#[program]
pub mod drugrep_registry {
    use super::*;

    pub fn register_lab(ctx: Context<RegisterLab>, name_hash: [u8; 32]) -> Result<()> {
        instructions::register_lab::handle_register_lab(ctx, name_hash)
    }

    pub fn commit_dataset(
        ctx: Context<CommitDataset>,
        dataset_root: [u8; 32],
        record_count: u32,
        schema_version: u16,
    ) -> Result<()> {
        instructions::commit_dataset::handle_commit_dataset(ctx, dataset_root, record_count, schema_version)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn commit_prediction_run(
        ctx: Context<CommitPredictionRun>,
        run_id: [u8; 32],
        model_version_hash: [u8; 32],
        input_hash: [u8; 32],
        layer1_hash: [u8; 32],
        layer2_hash: [u8; 32],
        layer3_hash: [u8; 32],
        predictions_root: [u8; 32],
        top_k: u16,
    ) -> Result<()> {
        instructions::commit_prediction_run::handle_commit_prediction_run(
            ctx,
            run_id,
            LayerHashes {
                model_version_hash,
                input_hash,
                layer1_hash,
                layer2_hash,
                layer3_hash,
            },
            predictions_root,
            top_k,
        )
    }

    pub fn revoke_dataset(ctx: Context<RevokeDataset>) -> Result<()> {
        instructions::revoke_dataset::handle_revoke_dataset(ctx)
    }
}
