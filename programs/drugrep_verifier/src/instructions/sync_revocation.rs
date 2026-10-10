use anchor_lang::prelude::*;
use drugrep_registry::state::Dataset;

use crate::{error::VerifierError, events::ValidationRevoked, state::*};

#[derive(Accounts)]
pub struct SyncRevocation<'info> {
    #[account(
        mut,
        seeds = [VALIDATION_SEED, validation.nullifier.as_ref()],
        bump = validation.bump,
        has_one = dataset
    )]
    pub validation: Account<'info, ValidationRecord>,
    pub dataset: Account<'info, Dataset>,
}

pub fn handle_sync_revocation(ctx: Context<SyncRevocation>) -> Result<()> {
    let dataset = &ctx.accounts.dataset;
    let record = &mut ctx.accounts.validation;
    require!(dataset.revoked, VerifierError::DatasetNotRevoked);
    require!(!record.revoked, VerifierError::AlreadyRevoked);
    record.revoked = true;
    record.revoked_slot = dataset.revoked_slot;
    let clock = Clock::get()?;
    emit!(ValidationRevoked {
        validation: record.key(),
        dataset: dataset.key(),
        slot: clock.slot,
        timestamp: clock.unix_timestamp,
    });
    Ok(())
}
