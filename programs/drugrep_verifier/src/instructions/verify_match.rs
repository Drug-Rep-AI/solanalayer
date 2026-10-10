use anchor_lang::prelude::*;
use drugrep_registry::state::{Dataset, PredictionRun};
use groth16_solana::groth16::Groth16Verifier;

use crate::{
    error::VerifierError, events::MatchVerified, state::*, verifying_key::VERIFYING_KEY,
};

#[derive(Accounts)]
#[instruction(proof: Groth16Proof, public_inputs: PublicInputs)]
pub struct VerifyMatch<'info> {
    #[account(mut)]
    pub submitter: Signer<'info>,
    /// Owner checked by Anchor: must be a drugrep_registry PredictionRun.
    pub run: Account<'info, PredictionRun>,
    /// Owner checked by Anchor: must be a drugrep_registry Dataset.
    pub dataset: Account<'info, Dataset>,
    #[account(
        init,
        payer = submitter,
        space = 8 + Nullifier::INIT_SPACE,
        seeds = [NULLIFIER_SEED, public_inputs.nullifier.as_ref()],
        bump
    )]
    pub nullifier: Account<'info, Nullifier>,
    #[account(
        init,
        payer = submitter,
        space = 8 + ValidationRecord::INIT_SPACE,
        seeds = [VALIDATION_SEED, public_inputs.nullifier.as_ref()],
        bump
    )]
    pub validation: Account<'info, ValidationRecord>,
    pub system_program: Program<'info, System>,
}

/// Reads a small integer public input (big endian, must fit in u16).
pub fn small_input(input: &[u8; 32]) -> Option<u16> {
    if input[..30].iter().any(|b| *b != 0) {
        return None;
    }
    Some(u16::from_be_bytes([input[30], input[31]]))
}

pub fn handle_verify_match(
    ctx: Context<VerifyMatch>,
    proof: Groth16Proof,
    public_inputs: PublicInputs,
) -> Result<()> {
    let run = &ctx.accounts.run;
    let dataset = &ctx.accounts.dataset;

    require!(
        run.predictions_root == public_inputs.predictions_root,
        VerifierError::RunRootMismatch
    );
    require!(
        dataset.dataset_root == public_inputs.dataset_root,
        VerifierError::DatasetRootMismatch
    );
    require!(!dataset.revoked, VerifierError::DatasetRevoked);

    let hits = small_input(&public_inputs.hits).ok_or(VerifierError::InvalidPublicInput)?;
    let k = small_input(&public_inputs.k).ok_or(VerifierError::InvalidPublicInput)?;
    require!(k == run.top_k, VerifierError::TopKMismatch);
    require!(hits <= k, VerifierError::InvalidPublicInput);

    let inputs = public_inputs.as_array();
    let mut verifier = Groth16Verifier::new(
        &proof.a,
        &proof.b,
        &proof.c,
        &inputs,
        &VERIFYING_KEY,
    )
    .map_err(|_| VerifierError::InvalidProof)?;
    verifier.verify().map_err(|_| VerifierError::InvalidProof)?;

    let clock = Clock::get()?;
    let nullifier_bytes = public_inputs.nullifier;
    let hit_rate_bps = ((hits as u32) * 10_000 / (k as u32)) as u16;
    // "We called it first": the run must sit in an earlier slot than the data.
    let predicted_first = run.slot < dataset.slot;

    let record = &mut ctx.accounts.validation;
    record.run = run.key();
    record.dataset = dataset.key();
    record.lab = dataset.lab;
    record.submitter = ctx.accounts.submitter.key();
    record.predictions_root = public_inputs.predictions_root;
    record.dataset_root = public_inputs.dataset_root;
    record.nullifier = nullifier_bytes;
    record.hits = hits;
    record.k = k;
    record.hit_rate_bps = hit_rate_bps;
    record.predicted_first = predicted_first;
    record.run_slot = run.slot;
    record.dataset_slot = dataset.slot;
    record.verified_slot = clock.slot;
    record.verified_at = clock.unix_timestamp;
    record.revoked = false;
    record.revoked_slot = 0;
    record.bump = ctx.bumps.validation;

    let nul = &mut ctx.accounts.nullifier;
    nul.nullifier = nullifier_bytes;
    nul.validation = record.key();
    nul.slot = clock.slot;
    nul.bump = ctx.bumps.nullifier;

    emit!(MatchVerified {
        validation: record.key(),
        run: record.run,
        dataset: record.dataset,
        lab: record.lab,
        hits,
        k,
        hit_rate_bps,
        predicted_first,
        nullifier: nullifier_bytes,
        slot: clock.slot,
        timestamp: clock.unix_timestamp,
    });
    Ok(())
}
