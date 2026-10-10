/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/drugrep_verifier.json`.
 */
export type DrugrepVerifier = {
  "address": "HkJreUgMDofiQJAZ4pRj8vt4pZ3hVkJ8hSmSULcf3qij",
  "metadata": {
    "name": "drugrepVerifier",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "DrugRep Proof Layer verifier: checks Groth16 trial match proofs on chain and writes validation attestations"
  },
  "instructions": [
    {
      "name": "syncRevocation",
      "docs": [
        "Permissionless: copies a dataset revocation onto a ValidationRecord."
      ],
      "discriminator": [
        255,
        8,
        168,
        192,
        42,
        44,
        164,
        223
      ],
      "accounts": [
        {
          "name": "validation",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  108,
                  105,
                  100,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "validation.nullifier",
                "account": "validationRecord"
              }
            ]
          }
        },
        {
          "name": "dataset",
          "relations": [
            "validation"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "verifyMatch",
      "docs": [
        "Verifies a trial_match proof against a registered run and dataset."
      ],
      "discriminator": [
        69,
        176,
        193,
        157,
        86,
        253,
        241,
        243
      ],
      "accounts": [
        {
          "name": "submitter",
          "writable": true,
          "signer": true
        },
        {
          "name": "run",
          "docs": [
            "Owner checked by Anchor: must be a drugrep_registry PredictionRun."
          ]
        },
        {
          "name": "dataset",
          "docs": [
            "Owner checked by Anchor: must be a drugrep_registry Dataset."
          ]
        },
        {
          "name": "nullifier",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  110,
                  117,
                  108,
                  108,
                  105,
                  102,
                  105,
                  101,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "publicInputs.nullifier"
              }
            ]
          }
        },
        {
          "name": "validation",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  108,
                  105,
                  100,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "publicInputs.nullifier"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": {
            "defined": {
              "name": "groth16Proof"
            }
          }
        },
        {
          "name": "publicInputs",
          "type": {
            "defined": {
              "name": "publicInputs"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "nullifier",
      "discriminator": [
        18,
        56,
        142,
        165,
        181,
        158,
        187,
        133
      ]
    },
    {
      "name": "validationRecord",
      "discriminator": [
        237,
        185,
        26,
        62,
        250,
        28,
        178,
        215
      ]
    }
  ],
  "events": [
    {
      "name": "matchVerified",
      "discriminator": [
        4,
        159,
        101,
        149,
        6,
        33,
        129,
        26
      ]
    },
    {
      "name": "validationRevoked",
      "discriminator": [
        60,
        254,
        218,
        104,
        204,
        244,
        10,
        110
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidProof",
      "msg": "Groth16 proof did not verify"
    },
    {
      "code": 6001,
      "name": "runRootMismatch",
      "msg": "predictions_root does not match the PredictionRun"
    },
    {
      "code": 6002,
      "name": "datasetRootMismatch",
      "msg": "dataset_root does not match the Dataset"
    },
    {
      "code": 6003,
      "name": "datasetRevoked",
      "msg": "Dataset has been revoked by its lab"
    },
    {
      "code": 6004,
      "name": "topKMismatch",
      "msg": "k must equal the run's committed top_k"
    },
    {
      "code": 6005,
      "name": "invalidPublicInput",
      "msg": "Public input is out of range"
    },
    {
      "code": 6006,
      "name": "datasetNotRevoked",
      "msg": "Dataset is not revoked"
    },
    {
      "code": 6007,
      "name": "alreadyRevoked",
      "msg": "Validation record is already marked revoked"
    }
  ],
  "types": [
    {
      "name": "dataset",
      "docs": [
        "A committed private dataset. PDA: [\"dataset\", lab, dataset_root].",
        "Only the Poseidon root is stored; the salted labels stay with the lab."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lab",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "datasetRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "recordCount",
            "type": "u32"
          },
          {
            "name": "schemaVersion",
            "type": "u16"
          },
          {
            "name": "slot",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "revoked",
            "type": "bool"
          },
          {
            "name": "revokedSlot",
            "type": "u64"
          },
          {
            "name": "revokedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "groth16Proof",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "a",
            "docs": [
              "G1, big endian, already negated by the client (see sdk/src/proof.ts)."
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "b",
            "docs": [
              "G2, big endian, x.c1 | x.c0 | y.c1 | y.c0."
            ],
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          },
          {
            "name": "c",
            "docs": [
              "G1, big endian."
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "matchVerified",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "validation",
            "type": "pubkey"
          },
          {
            "name": "run",
            "type": "pubkey"
          },
          {
            "name": "dataset",
            "type": "pubkey"
          },
          {
            "name": "lab",
            "type": "pubkey"
          },
          {
            "name": "hits",
            "type": "u16"
          },
          {
            "name": "k",
            "type": "u16"
          },
          {
            "name": "hitRateBps",
            "type": "u16"
          },
          {
            "name": "predictedFirst",
            "type": "bool"
          },
          {
            "name": "nullifier",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "slot",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "nullifier",
      "docs": [
        "Exists once per nullifier; a second proof with the same nullifier fails",
        "at account creation. PDA: [\"nullifier\", nullifier]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nullifier",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "validation",
            "type": "pubkey"
          },
          {
            "name": "slot",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "predictionRun",
      "docs": [
        "One DrugRep engine run. PDA: [\"run\", run_id]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "runId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "modelVersionHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "inputHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "layer1Hash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "layer2Hash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "layer3Hash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "predictionsRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "topK",
            "type": "u16"
          },
          {
            "name": "slot",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "publicInputs",
      "docs": [
        "Public signals of trial_match, each a 32 byte big endian field element.",
        "Field order is the circuit's public signal order."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "predictionsRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "datasetRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "hits",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "k",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "nullifier",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "validationRecord",
      "docs": [
        "The on chain attestation that a lab's private data confirmed `hits` of a",
        "run's top `k` predictions. PDA: [\"validation\", nullifier]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "run",
            "type": "pubkey"
          },
          {
            "name": "dataset",
            "type": "pubkey"
          },
          {
            "name": "lab",
            "type": "pubkey"
          },
          {
            "name": "submitter",
            "type": "pubkey"
          },
          {
            "name": "predictionsRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "datasetRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "nullifier",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "hits",
            "type": "u16"
          },
          {
            "name": "k",
            "type": "u16"
          },
          {
            "name": "hitRateBps",
            "type": "u16"
          },
          {
            "name": "predictedFirst",
            "docs": [
              "True when the run was committed in an earlier slot than the dataset:",
              "the prediction existed on chain before the outcome data did."
            ],
            "type": "bool"
          },
          {
            "name": "runSlot",
            "type": "u64"
          },
          {
            "name": "datasetSlot",
            "type": "u64"
          },
          {
            "name": "verifiedSlot",
            "type": "u64"
          },
          {
            "name": "verifiedAt",
            "type": "i64"
          },
          {
            "name": "revoked",
            "type": "bool"
          },
          {
            "name": "revokedSlot",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "validationRevoked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "validation",
            "type": "pubkey"
          },
          {
            "name": "dataset",
            "type": "pubkey"
          },
          {
            "name": "slot",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
