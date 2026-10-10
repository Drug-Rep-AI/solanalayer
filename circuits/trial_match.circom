pragma circom 2.1.9;

// DrugRep Proof Layer: zero knowledge trial matching.
//
// The data owner (a lab or trial sponsor) proves that, out of the top k
// predictions committed on chain by DrugRep, exactly `hits` appear in its
// private set of positive outcomes. Neither the predictions nor the labels
// are revealed. Only the two Poseidon roots, the hit count, k and a
// nullifier are public.
//
// Commitments (all hashes are circomlib Poseidon over BN254):
//   prediction leaf  = Poseidon(pair_id, salt)
//   predictions_root = binary Merkle root over NP prediction leaves (rank order)
//   label leaf       = Poseidon(pair_id, salt, outcome)
//   labels_root      = binary Merkle root over NL label leaves
//   dataset_root     = Poseidon(labels_root, Poseidon(lab_secret))
//   nullifier        = Poseidon(dataset_root, predictions_root, lab_secret)
//
// Binding lab_secret into dataset_root makes the nullifier deterministic for
// a given (dataset, run) pair, so one dataset can validate one run once.

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

// Merkle root over 2^DEPTH leaves, computed level by level.
// nodes[0..N) are the leaves; node N+i = Poseidon(nodes[2i], nodes[2i+1]).
template MerkleRoot(DEPTH) {
    var N = 1 << DEPTH;
    signal input leaves[N];
    signal output root;

    signal nodes[2 * N - 1];
    component h[N - 1];

    for (var i = 0; i < N; i++) {
        nodes[i] <== leaves[i];
    }
    for (var i = 0; i < N - 1; i++) {
        h[i] = Poseidon(2);
        h[i].inputs[0] <== nodes[2 * i];
        h[i].inputs[1] <== nodes[2 * i + 1];
        nodes[N + i] <== h[i].out;
    }
    root <== nodes[2 * N - 2];
}

template TrialMatch(DEPTH_P, DEPTH_L) {
    var NP = 1 << DEPTH_P;   // prediction slots
    var NL = 1 << DEPTH_L;   // label slots
    var KBITS = DEPTH_P + 1; // enough bits to hold NP

    // ---- public inputs (order matters: it is the on chain input order) ----
    signal input predictions_root;
    signal input dataset_root;
    signal input hits;
    signal input k;
    signal input nullifier;

    // ---- private inputs ----
    signal input pred_ids[NP];
    signal input pred_salts[NP];
    signal input label_ids[NL];
    signal input label_salts[NL];
    signal input label_outcomes[NL];
    signal input lab_secret;

    // 1. Recompute predictions_root from the private predictions.
    component predLeaf[NP];
    component predTree = MerkleRoot(DEPTH_P);
    for (var i = 0; i < NP; i++) {
        predLeaf[i] = Poseidon(2);
        predLeaf[i].inputs[0] <== pred_ids[i];
        predLeaf[i].inputs[1] <== pred_salts[i];
        predTree.leaves[i] <== predLeaf[i].out;
    }
    predTree.root === predictions_root;

    // 2. Recompute dataset_root from the private labels and the lab secret.
    component labelLeaf[NL];
    component labelTree = MerkleRoot(DEPTH_L);
    for (var j = 0; j < NL; j++) {
        label_outcomes[j] * (label_outcomes[j] - 1) === 0; // outcome is a bit
        labelLeaf[j] = Poseidon(3);
        labelLeaf[j].inputs[0] <== label_ids[j];
        labelLeaf[j].inputs[1] <== label_salts[j];
        labelLeaf[j].inputs[2] <== label_outcomes[j];
        labelTree.leaves[j] <== labelLeaf[j].out;
    }
    component secretCommit = Poseidon(1);
    secretCommit.inputs[0] <== lab_secret;
    component dsRoot = Poseidon(2);
    dsRoot.inputs[0] <== labelTree.root;
    dsRoot.inputs[1] <== secretCommit.out;
    dsRoot.out === dataset_root;

    // 3. 1 <= k <= NP, with k range checked to KBITS bits first.
    component kBits = Num2Bits(KBITS);
    kBits.in <== k;
    component kZero = IsZero();
    kZero.in <== k;
    kZero.out === 0;
    component kMax = LessEqThan(KBITS);
    kMax.in[0] <== k;
    kMax.in[1] <== NP;
    kMax.out === 1;

    // active[i] = 1 when prediction i is inside the top k.
    component isActive[NP];
    for (var i = 0; i < NP; i++) {
        isActive[i] = LessThan(KBITS);
        isActive[i].in[0] <== i;
        isActive[i].in[1] <== k;
    }

    // 4. Count predictions in the top k that match a positive label.
    //    matched[i] must be 0 or 1, so duplicated positive labels cannot
    //    inflate the count.
    component eq[NP][NL];
    signal posHit[NP][NL];
    signal acc[NP][NL + 1];
    signal counted[NP];
    signal running[NP + 1];
    running[0] <== 0;
    for (var i = 0; i < NP; i++) {
        acc[i][0] <== 0;
        for (var j = 0; j < NL; j++) {
            eq[i][j] = IsEqual();
            eq[i][j].in[0] <== pred_ids[i];
            eq[i][j].in[1] <== label_ids[j];
            posHit[i][j] <== eq[i][j].out * label_outcomes[j];
            acc[i][j + 1] <== acc[i][j] + posHit[i][j];
        }
        acc[i][NL] * (acc[i][NL] - 1) === 0;
        counted[i] <== acc[i][NL] * isActive[i].out;
        running[i + 1] <== running[i] + counted[i];
    }
    running[NP] === hits;

    // 5. Active predictions must be distinct, so a repeated prediction
    //    cannot be counted twice. If j is active then every i < j is too.
    component dup[NP][NP];
    for (var i = 0; i < NP; i++) {
        for (var j = i + 1; j < NP; j++) {
            dup[i][j] = IsEqual();
            dup[i][j].in[0] <== pred_ids[i];
            dup[i][j].in[1] <== pred_ids[j];
            dup[i][j].out * isActive[j].out === 0;
        }
    }

    // 6. Nullifier binds this proof to one (dataset, run) pair.
    component nul = Poseidon(3);
    nul.inputs[0] <== dataset_root;
    nul.inputs[1] <== predictions_root;
    nul.inputs[2] <== lab_secret;
    nul.out === nullifier;
}

component main {public [predictions_root, dataset_root, hits, k, nullifier]} = TrialMatch(5, 5);
