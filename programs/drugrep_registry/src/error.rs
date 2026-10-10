use anchor_lang::prelude::*;

#[error_code]
pub enum RegistryError {
    #[msg("Root must be a non zero BN254 field element")]
    InvalidRoot,
    #[msg("Record count must be between 1 and 2^32 - 1")]
    InvalidRecordCount,
    #[msg("top_k must be between 1 and MAX_TOP_K")]
    InvalidTopK,
    #[msg("Only the lab authority can do this")]
    Unauthorized,
    #[msg("Dataset is already revoked")]
    AlreadyRevoked,
    #[msg("Hash must not be all zeros")]
    EmptyHash,
}
