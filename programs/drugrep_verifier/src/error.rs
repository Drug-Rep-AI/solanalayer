use anchor_lang::prelude::*;

#[error_code]
pub enum VerifierError {
    #[msg("Groth16 proof did not verify")]
    InvalidProof,
    #[msg("predictions_root does not match the PredictionRun")]
    RunRootMismatch,
    #[msg("dataset_root does not match the Dataset")]
    DatasetRootMismatch,
    #[msg("Dataset has been revoked by its lab")]
    DatasetRevoked,
    #[msg("k must equal the run's committed top_k")]
    TopKMismatch,
    #[msg("Public input is out of range")]
    InvalidPublicInput,
    #[msg("Dataset is not revoked")]
    DatasetNotRevoked,
    #[msg("Validation record is already marked revoked")]
    AlreadyRevoked,
}
