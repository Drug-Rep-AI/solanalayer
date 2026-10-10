//! LiteSVM tests for drugrep_verifier with real Groth16 proofs
//! (tests/fixtures/vectors.json, produced by circuits/scripts/make-test-vectors.ts).
use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::{instruction::Instruction, system_program},
        AccountDeserialize, InstructionData, ToAccountMetas,
    },
    drugrep_registry::state::{DATASET_SEED, LAB_SEED, RUN_SEED},
    drugrep_verifier::state::{
        Groth16Proof, Nullifier, PublicInputs, ValidationRecord, NULLIFIER_SEED, VALIDATION_SEED,
    },
    litesvm::LiteSVM,
    serde::Deserialize,
    solana_compute_budget_interface::ComputeBudgetInstruction,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

const REGISTRY: Pubkey = drugrep_registry::ID;
const VERIFIER: Pubkey = drugrep_verifier::ID;

#[derive(Deserialize, Clone)]
struct ProofHex {
    a: String,
    b: String,
    c: String,
}

#[derive(Deserialize, Clone)]
struct Vector {
    predictions_root: String,
    dataset_root: String,
    top_k: u16,
    record_count: u32,
    hits: u16,
    proof: ProofHex,
    public_inputs: Vec<String>,
}

#[derive(Deserialize)]
struct Vectors {
    a: Vector,
    b: Vector,
}

fn vectors() -> Vectors {
    serde_json::from_str(include_str!("fixtures/vectors.json")).unwrap()
}

fn b32(h: &str) -> [u8; 32] {
    hex::decode(h).unwrap().try_into().unwrap()
}

impl Vector {
    fn proof(&self) -> Groth16Proof {
        Groth16Proof {
            a: hex::decode(&self.proof.a).unwrap().try_into().unwrap(),
            b: hex::decode(&self.proof.b).unwrap().try_into().unwrap(),
            c: hex::decode(&self.proof.c).unwrap().try_into().unwrap(),
        }
    }
    fn inputs(&self) -> PublicInputs {
        let p: Vec<[u8; 32]> = self.public_inputs.iter().map(|h| b32(h)).collect();
        PublicInputs { predictions_root: p[0], dataset_root: p[1], hits: p[2], k: p[3], nullifier: p[4] }
    }
}

struct Env {
    svm: LiteSVM,
    lab_owner: Keypair,
    engine: Keypair,
}

fn setup() -> Env {
    let mut svm = LiteSVM::new();
    svm.add_program(
        REGISTRY,
        include_bytes!(concat!(env!("CARGO_TARGET_TMPDIR"), "/../deploy/drugrep_registry.so")),
    )
    .unwrap();
    svm.add_program(
        VERIFIER,
        include_bytes!(concat!(env!("CARGO_TARGET_TMPDIR"), "/../deploy/drugrep_verifier.so")),
    )
    .unwrap();
    let lab_owner = Keypair::new();
    let engine = Keypair::new();
    svm.airdrop(&lab_owner.pubkey(), 10_000_000_000).unwrap();
    svm.airdrop(&engine.pubkey(), 10_000_000_000).unwrap();
    Env { svm, lab_owner, engine }
}

fn send(svm: &mut LiteSVM, ixs: &[Instruction], signer: &Keypair) -> Result<u64, String> {
    svm.expire_blockhash();
    let mut all = vec![ComputeBudgetInstruction::set_compute_unit_limit(400_000)];
    all.extend_from_slice(ixs);
    let msg = Message::new_with_blockhash(&all, Some(&signer.pubkey()), &svm.latest_blockhash());
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[signer]).unwrap();
    svm.send_transaction(tx)
        .map(|m| m.compute_units_consumed)
        .map_err(|e| format!("{:?} {:?}", e.err, e.meta.logs))
}

fn fetch<T: AccountDeserialize>(svm: &LiteSVM, key: &Pubkey) -> T {
    let acc = svm.get_account(key).expect("account exists");
    T::try_deserialize(&mut acc.data.as_slice()).unwrap()
}

fn lab_pda(authority: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[LAB_SEED, authority.as_ref()], &REGISTRY).0
}
fn dataset_pda(lab: &Pubkey, root: &[u8; 32]) -> Pubkey {
    Pubkey::find_program_address(&[DATASET_SEED, lab.as_ref(), root.as_ref()], &REGISTRY).0
}
fn run_pda(run_id: &[u8; 32]) -> Pubkey {
    Pubkey::find_program_address(&[RUN_SEED, run_id.as_ref()], &REGISTRY).0
}
fn nullifier_pda(n: &[u8; 32]) -> Pubkey {
    Pubkey::find_program_address(&[NULLIFIER_SEED, n.as_ref()], &VERIFIER).0
}
fn validation_pda(n: &[u8; 32]) -> Pubkey {
    Pubkey::find_program_address(&[VALIDATION_SEED, n.as_ref()], &VERIFIER).0
}

fn register_lab(env: &mut Env) {
    let a = env.lab_owner.pubkey();
    let ix = Instruction::new_with_bytes(
        REGISTRY,
        &drugrep_registry::instruction::RegisterLab { name_hash: [7; 32] }.data(),
        drugrep_registry::accounts::RegisterLab { authority: a, lab: lab_pda(&a), system_program: system_program::ID }
            .to_account_metas(None),
    );
    send(&mut env.svm, &[ix], &env.lab_owner.insecure_clone()).unwrap();
}

fn commit_dataset(env: &mut Env, v: &Vector) -> Pubkey {
    let a = env.lab_owner.pubkey();
    let lab = lab_pda(&a);
    let root = b32(&v.dataset_root);
    let ds = dataset_pda(&lab, &root);
    let ix = Instruction::new_with_bytes(
        REGISTRY,
        &drugrep_registry::instruction::CommitDataset {
            dataset_root: root,
            record_count: v.record_count,
            schema_version: 1,
        }
        .data(),
        drugrep_registry::accounts::CommitDataset { authority: a, lab, dataset: ds, system_program: system_program::ID }
            .to_account_metas(None),
    );
    send(&mut env.svm, &[ix], &env.lab_owner.insecure_clone()).unwrap();
    ds
}

fn commit_run(env: &mut Env, run_id: [u8; 32], predictions_root: [u8; 32], top_k: u16) -> Pubkey {
    let a = env.engine.pubkey();
    let run = run_pda(&run_id);
    let ix = Instruction::new_with_bytes(
        REGISTRY,
        &drugrep_registry::instruction::CommitPredictionRun {
            run_id,
            model_version_hash: [1; 32],
            input_hash: [2; 32],
            layer1_hash: [3; 32],
            layer2_hash: [4; 32],
            layer3_hash: [5; 32],
            predictions_root,
            top_k,
        }
        .data(),
        drugrep_registry::accounts::CommitPredictionRun { authority: a, run, system_program: system_program::ID }
            .to_account_metas(None),
    );
    send(&mut env.svm, &[ix], &env.engine.insecure_clone()).unwrap();
    run
}

fn revoke(env: &mut Env, dataset: Pubkey) {
    let a = env.lab_owner.pubkey();
    let ix = Instruction::new_with_bytes(
        REGISTRY,
        &drugrep_registry::instruction::RevokeDataset {}.data(),
        drugrep_registry::accounts::RevokeDataset { authority: a, lab: lab_pda(&a), dataset }.to_account_metas(None),
    );
    send(&mut env.svm, &[ix], &env.lab_owner.insecure_clone()).unwrap();
}

fn verify_ix(submitter: &Pubkey, run: Pubkey, dataset: Pubkey, proof: Groth16Proof, inputs: PublicInputs) -> Instruction {
    let n = inputs.nullifier;
    Instruction::new_with_bytes(
        VERIFIER,
        &drugrep_verifier::instruction::VerifyMatch { proof, public_inputs: inputs }.data(),
        drugrep_verifier::accounts::VerifyMatch {
            submitter: *submitter,
            run,
            dataset,
            nullifier: nullifier_pda(&n),
            validation: validation_pda(&n),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

fn sync_ix(validation: Pubkey, dataset: Pubkey) -> Instruction {
    Instruction::new_with_bytes(
        VERIFIER,
        &drugrep_verifier::instruction::SyncRevocation {}.data(),
        drugrep_verifier::accounts::SyncRevocation { validation, dataset }.to_account_metas(None),
    )
}

/// Run "a" committed at slot 100, dataset at slot 200.
fn happy_setup() -> (Env, Vector, Pubkey, Pubkey) {
    let v = vectors().a;
    let mut env = setup();
    register_lab(&mut env);
    env.svm.warp_to_slot(100);
    let run = commit_run(&mut env, [0xa1; 32], b32(&v.predictions_root), v.top_k);
    env.svm.warp_to_slot(200);
    let ds = commit_dataset(&mut env, &v);
    env.svm.warp_to_slot(300);
    (env, v, run, ds)
}

#[test]
fn verify_match_accepts_a_real_proof_and_writes_the_attestation() {
    let (mut env, v, run, ds) = happy_setup();
    let submitter = Keypair::new();
    env.svm.airdrop(&submitter.pubkey(), 1_000_000_000).unwrap();
    let cu = send(&mut env.svm, &[verify_ix(&submitter.pubkey(), run, ds, v.proof(), v.inputs())], &submitter).unwrap();
    println!("verify_match used {cu} compute units");

    let n = v.inputs().nullifier;
    let rec: ValidationRecord = fetch(&env.svm, &validation_pda(&n));
    assert_eq!(rec.run, run);
    assert_eq!(rec.dataset, ds);
    assert_eq!(rec.lab, lab_pda(&env.lab_owner.pubkey()));
    assert_eq!(rec.submitter, submitter.pubkey());
    assert_eq!(rec.hits, v.hits);
    assert_eq!(rec.k, v.top_k);
    assert_eq!(rec.hit_rate_bps, 4000); // 8 / 20
    assert!(rec.predicted_first, "run (slot 100) predates dataset (slot 200)");
    assert_eq!(rec.run_slot, 100);
    assert_eq!(rec.dataset_slot, 200);
    assert_eq!(rec.verified_slot, 300);
    assert!(!rec.revoked);
    assert_eq!(rec.nullifier, n);

    let nul: Nullifier = fetch(&env.svm, &nullifier_pda(&n));
    assert_eq!(nul.validation, validation_pda(&n));
}

#[test]
fn replayed_proof_is_rejected() {
    let (mut env, v, run, ds) = happy_setup();
    let lab = env.lab_owner.insecure_clone();
    send(&mut env.svm, &[verify_ix(&lab.pubkey(), run, ds, v.proof(), v.inputs())], &lab).unwrap();
    // Same proof again, from a different submitter: the nullifier PDA already exists.
    let other = Keypair::new();
    env.svm.airdrop(&other.pubkey(), 1_000_000_000).unwrap();
    let err = send(&mut env.svm, &[verify_ix(&other.pubkey(), run, ds, v.proof(), v.inputs())], &other).unwrap_err();
    assert!(err.contains("already in use"), "{err}");
}

#[test]
fn run_committed_after_the_dataset_gets_no_called_it_first_flag() {
    let vs = vectors();
    let mut env = setup();
    register_lab(&mut env);
    env.svm.warp_to_slot(100);
    let ds = commit_dataset(&mut env, &vs.b);
    env.svm.warp_to_slot(200);
    let run = commit_run(&mut env, [0xb2; 32], b32(&vs.b.predictions_root), vs.b.top_k);
    let lab = env.lab_owner.insecure_clone();
    send(&mut env.svm, &[verify_ix(&lab.pubkey(), run, ds, vs.b.proof(), vs.b.inputs())], &lab).unwrap();
    let rec: ValidationRecord = fetch(&env.svm, &validation_pda(&vs.b.inputs().nullifier));
    assert!(!rec.predicted_first);
    assert_eq!(rec.hits, 8);
}

#[test]
fn same_slot_does_not_count_as_called_first() {
    let v = vectors().a;
    let mut env = setup();
    register_lab(&mut env);
    env.svm.warp_to_slot(100);
    let run = commit_run(&mut env, [0xa3; 32], b32(&v.predictions_root), v.top_k);
    let ds = commit_dataset(&mut env, &v);
    let lab = env.lab_owner.insecure_clone();
    send(&mut env.svm, &[verify_ix(&lab.pubkey(), run, ds, v.proof(), v.inputs())], &lab).unwrap();
    let rec: ValidationRecord = fetch(&env.svm, &validation_pda(&v.inputs().nullifier));
    assert!(!rec.predicted_first);
}

#[test]
fn revoked_dataset_cannot_be_used_and_existing_records_read_as_revoked() {
    let vs = vectors();
    let (mut env, v, run, ds) = happy_setup();
    let lab = env.lab_owner.insecure_clone();
    send(&mut env.svm, &[verify_ix(&lab.pubkey(), run, ds, v.proof(), v.inputs())], &lab).unwrap();
    let rec_key = validation_pda(&v.inputs().nullifier);

    // Not revoked yet: sync is refused.
    let err = send(&mut env.svm, &[sync_ix(rec_key, ds)], &lab).unwrap_err();
    assert!(err.contains("DatasetNotRevoked"), "{err}");

    env.svm.warp_to_slot(400);
    revoke(&mut env, ds);

    // Anyone can sync the revocation onto the record.
    let anyone = Keypair::new();
    env.svm.airdrop(&anyone.pubkey(), 1_000_000_000).unwrap();
    send(&mut env.svm, &[sync_ix(rec_key, ds)], &anyone).unwrap();
    let rec: ValidationRecord = fetch(&env.svm, &validation_pda(&v.inputs().nullifier));
    assert!(rec.revoked);
    assert_eq!(rec.revoked_slot, 400);
    let err = send(&mut env.svm, &[sync_ix(rec_key, ds)], &anyone).unwrap_err();
    assert!(err.contains("AlreadyRevoked"), "{err}");

    // A new proof against the revoked dataset is refused.
    let run_b = commit_run(&mut env, [0xb4; 32], b32(&vs.b.predictions_root), vs.b.top_k);
    let err = send(&mut env.svm, &[verify_ix(&lab.pubkey(), run_b, ds, vs.b.proof(), vs.b.inputs())], &lab).unwrap_err();
    assert!(err.contains("DatasetRevoked"), "{err}");
}

#[test]
fn sync_revocation_rejects_a_dataset_that_is_not_the_records() {
    let (mut env, v, run, ds) = happy_setup();
    let lab = env.lab_owner.insecure_clone();
    send(&mut env.svm, &[verify_ix(&lab.pubkey(), run, ds, v.proof(), v.inputs())], &lab).unwrap();
    // A second, revoked dataset from the same lab must not revoke this record.
    let mut other = v.clone();
    other.dataset_root = format!("{}{}", &v.dataset_root[..62], "01");
    let other_ds = commit_dataset(&mut env, &other);
    revoke(&mut env, other_ds);
    let err = send(&mut env.svm, &[sync_ix(validation_pda(&v.inputs().nullifier), other_ds)], &lab).unwrap_err();
    assert!(err.contains("ConstraintHasOne"), "{err}");
}

#[test]
fn proof_against_the_wrong_run_or_dataset_is_rejected() {
    let vs = vectors();
    let (mut env, v, _run, ds) = happy_setup();
    let lab = env.lab_owner.insecure_clone();
    // Run "b" has a different predictions root than proof "a".
    let run_b = commit_run(&mut env, [0xb5; 32], b32(&vs.b.predictions_root), vs.b.top_k);
    let err = send(&mut env.svm, &[verify_ix(&lab.pubkey(), run_b, ds, v.proof(), v.inputs())], &lab).unwrap_err();
    assert!(err.contains("RunRootMismatch"), "{err}");

    // A dataset with a different (fake) root.
    let mut fake = v.clone();
    fake.dataset_root = format!("{}{}", &v.dataset_root[..62], "02");
    let fake_ds = commit_dataset(&mut env, &fake);
    let run_a2 = commit_run(&mut env, [0xa6; 32], b32(&v.predictions_root), v.top_k);
    let err = send(&mut env.svm, &[verify_ix(&lab.pubkey(), run_a2, fake_ds, v.proof(), v.inputs())], &lab).unwrap_err();
    assert!(err.contains("DatasetRootMismatch"), "{err}");
}

#[test]
fn tampered_proof_or_public_inputs_are_rejected() {
    let (mut env, v, run, ds) = happy_setup();
    let lab = env.lab_owner.insecure_clone();

    // Claim one more hit than was proven.
    let mut inputs = v.inputs();
    inputs.hits[31] += 1;
    let err = send(&mut env.svm, &[verify_ix(&lab.pubkey(), run, ds, v.proof(), inputs)], &lab).unwrap_err();
    assert!(err.contains("InvalidProof"), "{err}");

    // Change the nullifier to dodge replay protection.
    let mut inputs = v.inputs();
    inputs.nullifier[31] ^= 1;
    let err = send(&mut env.svm, &[verify_ix(&lab.pubkey(), run, ds, v.proof(), inputs)], &lab).unwrap_err();
    assert!(err.contains("InvalidProof"), "{err}");

    // Corrupt proof C.
    let mut proof = v.proof();
    proof.c[40] ^= 0x01;
    let err = send(&mut env.svm, &[verify_ix(&lab.pubkey(), run, ds, proof, v.inputs())], &lab).unwrap_err();
    assert!(err.contains("InvalidProof"), "{err}");

    // The honest proof still verifies afterwards.
    send(&mut env.svm, &[verify_ix(&lab.pubkey(), run, ds, v.proof(), v.inputs())], &lab).unwrap();
}

#[test]
fn k_must_match_the_committed_top_k() {
    let v = vectors().a;
    let mut env = setup();
    register_lab(&mut env);
    env.svm.warp_to_slot(100);
    // Same predictions root, but the run says top_k = 10.
    let run = commit_run(&mut env, [0xa7; 32], b32(&v.predictions_root), 10);
    env.svm.warp_to_slot(200);
    let ds = commit_dataset(&mut env, &v);
    let lab = env.lab_owner.insecure_clone();
    let err = send(&mut env.svm, &[verify_ix(&lab.pubkey(), run, ds, v.proof(), v.inputs())], &lab).unwrap_err();
    assert!(err.contains("TopKMismatch"), "{err}");
}

#[test]
fn accounts_not_owned_by_the_registry_are_rejected() {
    let (mut env, v, run, _ds) = happy_setup();
    let lab = env.lab_owner.insecure_clone();
    // Pass a plain wallet as the "dataset".
    let err = send(&mut env.svm, &[verify_ix(&lab.pubkey(), run, lab.pubkey(), v.proof(), v.inputs())], &lab)
        .unwrap_err();
    assert!(err.contains("AccountOwnedByWrongProgram") || err.contains("AccountNotInitialized"), "{err}");
}
