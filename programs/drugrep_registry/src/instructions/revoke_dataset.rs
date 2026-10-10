use anchor_lang::prelude::*;

use crate::{error::RegistryError, events::DatasetRevoked, state::*};

#[derive(Accounts)]
pub struct RevokeDataset<'info> {
    pub authority: Signer<'info>,
    #[account(
        seeds = [LAB_SEED, authority.key().as_ref()],
        bump = lab.bump,
        has_one = authority @ RegistryError::Unauthorized
    )]
    pub lab: Account<'info, Lab>,
    #[account(
        mut,
        seeds = [DATASET_SEED, lab.key().as_ref(), dataset.dataset_root.as_ref()],
        bump = dataset.bump,
        constraint = dataset.lab == lab.key() @ RegistryError::Unauthorized
    )]
    pub dataset: Account<'info, Dataset>,
}

pub fn handle_revoke_dataset(ctx: Context<RevokeDataset>) -> Result<()> {
    let ds = &mut ctx.accounts.dataset;
    require!(!ds.revoked, RegistryError::AlreadyRevoked);
    let clock = Clock::get()?;
    ds.revoked = true;
    ds.revoked_slot = clock.slot;
    ds.revoked_at = clock.unix_timestamp;
    emit!(DatasetRevoked {
        dataset: ds.key(),
        lab: ds.lab,
        slot: clock.slot,
        timestamp: clock.unix_timestamp,
    });
    Ok(())
}
