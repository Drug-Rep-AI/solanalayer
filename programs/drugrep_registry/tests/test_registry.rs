//! LiteSVM tests for every drugrep_registry instruction, including failures.
use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::{instruction::Instruction, system_program},
        AccountDeserialize, InstructionData, ToAccountMetas,
    },
    drugrep_registry::{
        state::{Dataset, Lab, PredictionRun, DATASET_SEED, LAB_SEED, RUN_SEED},
        ID as PROGRAM_ID,
    },
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

fn setup() -> (LiteSVM, Keypair) {
    let mut svm = LiteSVM::new();
    let bytes = include_bytes!(concat!(
        env!("CARGO_TARGET_TMPDIR"),
        "/../deploy/drugrep_registry.so"
    ));
    svm.add_program(PROGRAM_ID, bytes).unwrap();
    let payer = Keypair::new();
    svm.airdrop(&payer.pubkey(), 10_000_000_000).unwrap();
    (svm, payer)
}

fn send(svm: &mut LiteSVM, ix: Instruction, signer: &Keypair) -> Result<(), String> {
    svm.expire_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&signer.pubkey()), &svm.latest_blockhash());
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &[signer]).unwrap();
    svm.send_transaction(tx)
        .map(|_| ())
        .map_err(|e| format!("{:?}", e.meta.logs))
}

fn fetch<T: AccountDeserialize>(svm: &LiteSVM, key: &Pubkey) -> T {
    let acc = svm.get_account(key).expect("account exists");
    T::try_deserialize(&mut acc.data.as_slice()).unwrap()
}

fn lab_pda(authority: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[LAB_SEED, authority.as_ref()], &PROGRAM_ID).0
}
fn dataset_pda(lab: &Pubkey, root: &[u8; 32]) -> Pubkey {
    Pubkey::find_program_address(&[DATASET_SEED, lab.as_ref(), root.as_ref()], &PROGRAM_ID).0
}
fn run_pda(run_id: &[u8; 32]) -> Pubkey {
    Pubkey::find_program_address(&[RUN_SEED, run_id.as_ref()], &PROGRAM_ID).0
}

fn root(byte: u8) -> [u8; 32] {
    let mut r = [0u8; 32];
    r[0] = 0x01;
    r[31] = byte;
    r
}

fn register_lab_ix(authority: &Pubkey, name_hash: [u8; 32]) -> Instruction {
    Instruction::new_with_bytes(
        PROGRAM_ID,
        &drugrep_registry::instruction::RegisterLab { name_hash }.data(),
        drugrep_registry::accounts::RegisterLab {
            authority: *authority,
            lab: lab_pda(authority),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

fn commit_dataset_ix(authority: &Pubkey, dataset_root: [u8; 32], record_count: u32) -> Instruction {
    let lab = lab_pda(authority);
    Instruction::new_with_bytes(
        PROGRAM_ID,
        &drugrep_registry::instruction::CommitDataset {
            dataset_root,
            record_count,
            schema_version: 1,
        }
        .data(),
        drugrep_registry::accounts::CommitDataset {
            authority: *authority,
            lab,
            dataset: dataset_pda(&lab, &dataset_root),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

fn commit_run_ix(
    authority: &Pubkey,
    run_id: [u8; 32],
    predictions_root: [u8; 32],
    top_k: u16,
) -> Instruction {
    Instruction::new_with_bytes(
        PROGRAM_ID,
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
        drugrep_registry::accounts::CommitPredictionRun {
            authority: *authority,
            run: run_pda(&run_id),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

fn revoke_ix(authority: &Pubkey, dataset: Pubkey) -> Instruction {
    Instruction::new_with_bytes(
        PROGRAM_ID,
        &drugrep_registry::instruction::RevokeDataset {}.data(),
        drugrep_registry::accounts::RevokeDataset {
            authority: *authority,
            lab: lab_pda(authority),
            dataset,
        }
        .to_account_metas(None),
    )
}

#[test]
fn register_lab_works_once() {
    let (mut svm, lab_owner) = setup();
    send(
        &mut svm,
        register_lab_ix(&lab_owner.pubkey(), [9; 32]),
        &lab_owner,
    )
    .unwrap();
    let lab: Lab = fetch(&svm, &lab_pda(&lab_owner.pubkey()));
    assert_eq!(lab.authority, lab_owner.pubkey());
    assert_eq!(lab.name_hash, [9; 32]);
    assert_eq!(lab.dataset_count, 0);

    // A wallet owns at most one Lab PDA.
    assert!(send(
        &mut svm,
        register_lab_ix(&lab_owner.pubkey(), [8; 32]),
        &lab_owner
    )
    .is_err());
}

#[test]
fn register_lab_rejects_empty_name_hash() {
    let (mut svm, lab_owner) = setup();
    let err = send(
        &mut svm,
        register_lab_ix(&lab_owner.pubkey(), [0; 32]),
        &lab_owner,
    )
    .unwrap_err();
    assert!(err.contains("EmptyHash"), "{err}");
}

#[test]
fn commit_dataset_stores_root_slot_and_time() {
    let (mut svm, lab_owner) = setup();
    send(
        &mut svm,
        register_lab_ix(&lab_owner.pubkey(), [9; 32]),
        &lab_owner,
    )
    .unwrap();
    svm.warp_to_slot(500);
    let r = root(7);
    send(
        &mut svm,
        commit_dataset_ix(&lab_owner.pubkey(), r, 22),
        &lab_owner,
    )
    .unwrap();
    let lab_key = lab_pda(&lab_owner.pubkey());
    let ds: Dataset = fetch(&svm, &dataset_pda(&lab_key, &r));
    assert_eq!(ds.dataset_root, r);
    assert_eq!(ds.record_count, 22);
    assert_eq!(ds.schema_version, 1);
    assert_eq!(ds.slot, 500);
    assert_eq!(ds.lab, lab_key);
    assert!(!ds.revoked);
    let lab: Lab = fetch(&svm, &lab_key);
    assert_eq!(lab.dataset_count, 1);

    // The same root cannot be committed twice by the same lab.
    assert!(send(
        &mut svm,
        commit_dataset_ix(&lab_owner.pubkey(), r, 22),
        &lab_owner
    )
    .is_err());
}

#[test]
fn commit_dataset_rejects_bad_input() {
    let (mut svm, lab_owner) = setup();
    send(
        &mut svm,
        register_lab_ix(&lab_owner.pubkey(), [9; 32]),
        &lab_owner,
    )
    .unwrap();
    // zero root
    let err = send(
        &mut svm,
        commit_dataset_ix(&lab_owner.pubkey(), [0; 32], 5),
        &lab_owner,
    )
    .unwrap_err();
    assert!(err.contains("InvalidRoot"), "{err}");
    // root >= BN254 field modulus
    let err = send(
        &mut svm,
        commit_dataset_ix(&lab_owner.pubkey(), [0xff; 32], 5),
        &lab_owner,
    )
    .unwrap_err();
    assert!(err.contains("InvalidRoot"), "{err}");
    // empty dataset
    let err = send(
        &mut svm,
        commit_dataset_ix(&lab_owner.pubkey(), root(1), 0),
        &lab_owner,
    )
    .unwrap_err();
    assert!(err.contains("InvalidRecordCount"), "{err}");
}

#[test]
fn commit_dataset_requires_a_registered_lab() {
    let (mut svm, stranger) = setup();
    assert!(send(
        &mut svm,
        commit_dataset_ix(&stranger.pubkey(), root(1), 5),
        &stranger
    )
    .is_err());
}

#[test]
fn commit_prediction_run_stores_every_layer_hash() {
    let (mut svm, engine) = setup();
    svm.warp_to_slot(100);
    let run_id = [42; 32];
    send(
        &mut svm,
        commit_run_ix(&engine.pubkey(), run_id, root(3), 20),
        &engine,
    )
    .unwrap();
    let run: PredictionRun = fetch(&svm, &run_pda(&run_id));
    assert_eq!(run.authority, engine.pubkey());
    assert_eq!(run.run_id, run_id);
    assert_eq!(run.model_version_hash, [1; 32]);
    assert_eq!(run.input_hash, [2; 32]);
    assert_eq!(run.layer1_hash, [3; 32]);
    assert_eq!(run.layer2_hash, [4; 32]);
    assert_eq!(run.layer3_hash, [5; 32]);
    assert_eq!(run.predictions_root, root(3));
    assert_eq!(run.top_k, 20);
    assert_eq!(run.slot, 100);

    // run_id is unique: a second commit with the same id fails.
    assert!(send(
        &mut svm,
        commit_run_ix(&engine.pubkey(), run_id, root(4), 20),
        &engine
    )
    .is_err());
}

#[test]
fn commit_prediction_run_rejects_bad_input() {
    let (mut svm, engine) = setup();
    let err = send(
        &mut svm,
        commit_run_ix(&engine.pubkey(), [1; 32], root(3), 0),
        &engine,
    )
    .unwrap_err();
    assert!(err.contains("InvalidTopK"), "{err}");
    let err = send(
        &mut svm,
        commit_run_ix(&engine.pubkey(), [2; 32], root(3), 33),
        &engine,
    )
    .unwrap_err();
    assert!(err.contains("InvalidTopK"), "{err}");
    let err = send(
        &mut svm,
        commit_run_ix(&engine.pubkey(), [3; 32], [0; 32], 10),
        &engine,
    )
    .unwrap_err();
    assert!(err.contains("InvalidRoot"), "{err}");
    let err = send(
        &mut svm,
        commit_run_ix(&engine.pubkey(), [0; 32], root(3), 10),
        &engine,
    )
    .unwrap_err();
    assert!(err.contains("EmptyHash"), "{err}");
}

#[test]
fn revoke_dataset_is_lab_only_and_once() {
    let (mut svm, lab_owner) = setup();
    send(
        &mut svm,
        register_lab_ix(&lab_owner.pubkey(), [9; 32]),
        &lab_owner,
    )
    .unwrap();
    let r = root(7);
    send(
        &mut svm,
        commit_dataset_ix(&lab_owner.pubkey(), r, 22),
        &lab_owner,
    )
    .unwrap();
    let ds_key = dataset_pda(&lab_pda(&lab_owner.pubkey()), &r);

    // Another wallet, even with its own lab, cannot revoke this dataset.
    let other = Keypair::new();
    svm.airdrop(&other.pubkey(), 1_000_000_000).unwrap();
    send(&mut svm, register_lab_ix(&other.pubkey(), [5; 32]), &other).unwrap();
    assert!(send(&mut svm, revoke_ix(&other.pubkey(), ds_key), &other).is_err());

    svm.warp_to_slot(900);
    send(&mut svm, revoke_ix(&lab_owner.pubkey(), ds_key), &lab_owner).unwrap();
    let ds: Dataset = fetch(&svm, &ds_key);
    assert!(ds.revoked);
    assert_eq!(ds.revoked_slot, 900);

    let err = send(&mut svm, revoke_ix(&lab_owner.pubkey(), ds_key), &lab_owner).unwrap_err();
    assert!(err.contains("AlreadyRevoked"), "{err}");
}
