use anchor_lang::prelude::*;

use crate::{error::RegistryError, events::DatasetCommitted, state::*};

#[derive(Accounts)]
#[instruction(dataset_root: [u8; 32])]
pub struct CommitDataset<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [LAB_SEED, authority.key().as_ref()],
        bump = lab.bump,
        has_one = authority @ RegistryError::Unauthorized
    )]
    pub lab: Account<'info, Lab>,
    #[account(
        init,
        payer = authority,
        space = 8 + Dataset::INIT_SPACE,
        seeds = [DATASET_SEED, lab.key().as_ref(), dataset_root.as_ref()],
        bump
    )]
    pub dataset: Account<'info, Dataset>,
    pub system_program: Program<'info, System>,
}

pub fn handle_commit_dataset(
    ctx: Context<CommitDataset>,
    dataset_root: [u8; 32],
    record_count: u32,
    schema_version: u16,
) -> Result<()> {
    require!(
        is_valid_field_root(&dataset_root),
        RegistryError::InvalidRoot
    );
    require!(record_count > 0, RegistryError::InvalidRecordCount);
    let clock = Clock::get()?;
    let lab = &mut ctx.accounts.lab;
    lab.dataset_count = lab.dataset_count.saturating_add(1);

    let ds = &mut ctx.accounts.dataset;
    ds.lab = lab.key();
    ds.authority = ctx.accounts.authority.key();
    ds.dataset_root = dataset_root;
    ds.record_count = record_count;
    ds.schema_version = schema_version;
    ds.slot = clock.slot;
    ds.timestamp = clock.unix_timestamp;
    ds.revoked = false;
    ds.revoked_slot = 0;
    ds.revoked_at = 0;
    ds.bump = ctx.bumps.dataset;
    emit!(DatasetCommitted {
        dataset: ds.key(),
        lab: ds.lab,
        dataset_root,
        record_count,
        schema_version,
        slot: clock.slot,
        timestamp: clock.unix_timestamp,
    });
    Ok(())
}
