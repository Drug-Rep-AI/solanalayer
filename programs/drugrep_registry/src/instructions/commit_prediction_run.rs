use anchor_lang::prelude::*;

use crate::{error::RegistryError, events::PredictionRunCommitted, state::*};

#[derive(Accounts)]
#[instruction(run_id: [u8; 32])]
pub struct CommitPredictionRun<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + PredictionRun::INIT_SPACE,
        seeds = [RUN_SEED, run_id.as_ref()],
        bump
    )]
    pub run: Account<'info, PredictionRun>,
    pub system_program: Program<'info, System>,
}

pub fn handle_commit_prediction_run(
    ctx: Context<CommitPredictionRun>,
    run_id: [u8; 32],
    hashes: LayerHashes,
    predictions_root: [u8; 32],
    top_k: u16,
) -> Result<()> {
    require!(is_valid_field_root(&predictions_root), RegistryError::InvalidRoot);
    require!(top_k >= 1 && top_k <= MAX_TOP_K, RegistryError::InvalidTopK);
    for h in [
        &run_id,
        &hashes.model_version_hash,
        &hashes.input_hash,
        &hashes.layer1_hash,
        &hashes.layer2_hash,
        &hashes.layer3_hash,
    ] {
        require!(h.iter().any(|b| *b != 0), RegistryError::EmptyHash);
    }
    let clock = Clock::get()?;
    let run = &mut ctx.accounts.run;
    run.authority = ctx.accounts.authority.key();
    run.run_id = run_id;
    run.model_version_hash = hashes.model_version_hash;
    run.input_hash = hashes.input_hash;
    run.layer1_hash = hashes.layer1_hash;
    run.layer2_hash = hashes.layer2_hash;
    run.layer3_hash = hashes.layer3_hash;
    run.predictions_root = predictions_root;
    run.top_k = top_k;
    run.slot = clock.slot;
    run.timestamp = clock.unix_timestamp;
    run.bump = ctx.bumps.run;
    emit!(PredictionRunCommitted {
        run: run.key(),
        authority: run.authority,
        run_id,
        model_version_hash: hashes.model_version_hash,
        input_hash: hashes.input_hash,
        layer1_hash: hashes.layer1_hash,
        layer2_hash: hashes.layer2_hash,
        layer3_hash: hashes.layer3_hash,
        predictions_root,
        top_k,
        slot: clock.slot,
        timestamp: clock.unix_timestamp,
    });
    Ok(())
}
