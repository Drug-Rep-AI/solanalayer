use anchor_lang::prelude::*;

use crate::{error::RegistryError, events::LabRegistered, state::*};

#[derive(Accounts)]
pub struct RegisterLab<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + Lab::INIT_SPACE,
        seeds = [LAB_SEED, authority.key().as_ref()],
        bump
    )]
    pub lab: Account<'info, Lab>,
    pub system_program: Program<'info, System>,
}

pub fn handle_register_lab(ctx: Context<RegisterLab>, name_hash: [u8; 32]) -> Result<()> {
    require!(name_hash.iter().any(|b| *b != 0), RegistryError::EmptyHash);
    let clock = Clock::get()?;
    let lab = &mut ctx.accounts.lab;
    lab.authority = ctx.accounts.authority.key();
    lab.name_hash = name_hash;
    lab.dataset_count = 0;
    lab.created_slot = clock.slot;
    lab.created_at = clock.unix_timestamp;
    lab.bump = ctx.bumps.lab;
    emit!(LabRegistered {
        lab: lab.key(),
        authority: lab.authority,
        name_hash,
        slot: clock.slot,
        timestamp: clock.unix_timestamp,
    });
    Ok(())
}
