/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/drugrep_registry.json`.
 */
export type DrugrepRegistry = {
  "address": "Heqv7iDHvG2YGsiMnXMNSTgMxAAcWja1QoFx4fGnd7xt",
  "metadata": {
    "name": "drugrepRegistry",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "DrugRep Proof Layer registry: labs, private dataset roots and engine prediction runs"
  },
  "instructions": [
    {
      "name": "commitDataset",
      "discriminator": [
        149,
        9,
        95,
        126,
        136,
        203,
        223,
        14
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "lab"
          ]
        },
        {
          "name": "lab",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  98
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "dataset",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  97,
                  116,
                  97,
                  115,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "lab"
              },
              {
                "kind": "arg",
                "path": "datasetRoot"
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
        }
      ]
    },
    {
      "name": "commitPredictionRun",
      "discriminator": [
        131,
        56,
        64,
        49,
        204,
        135,
        94,
        255
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "run",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  117,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "runId"
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
        }
      ]
    },
    {
      "name": "registerLab",
      "discriminator": [
        246,
        33,
        154,
        63,
        92,
        59,
        234,
        28
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "lab",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  98
                ]
              },
              {
                "kind": "account",
                "path": "authority"
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
          "name": "nameHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "revokeDataset",
      "discriminator": [
        32,
        210,
        164,
        71,
        60,
        42,
        137,
        85
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "lab"
          ]
        },
        {
          "name": "lab",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  98
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "dataset",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  97,
                  116,
                  97,
                  115,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "lab"
              },
              {
                "kind": "account",
                "path": "dataset.datasetRoot",
                "account": "dataset"
              }
            ]
          }
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "dataset",
      "discriminator": [
        242,
        85,
        87,
        90,
        234,
        188,
        241,
        17
      ]
    },
    {
      "name": "lab",
      "discriminator": [
        238,
        80,
        146,
        49,
        216,
        167,
        224,
        7
      ]
    },
    {
      "name": "predictionRun",
      "discriminator": [
        220,
        135,
        232,
        108,
        68,
        92,
        57,
        188
      ]
    }
  ],
  "events": [
    {
      "name": "datasetCommitted",
      "discriminator": [
        206,
        73,
        227,
        60,
        148,
        82,
        251,
        249
      ]
    },
    {
      "name": "datasetRevoked",
      "discriminator": [
        91,
        69,
        206,
        23,
        99,
        249,
        147,
        220
      ]
    },
    {
      "name": "labRegistered",
      "discriminator": [
        177,
        75,
        112,
        197,
        255,
        201,
        101,
        20
      ]
    },
    {
      "name": "predictionRunCommitted",
      "discriminator": [
        106,
        6,
        12,
        142,
        82,
        175,
        252,
        78
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidRoot",
      "msg": "Root must be a non zero BN254 field element"
    },
    {
      "code": 6001,
      "name": "invalidRecordCount",
      "msg": "Record count must be between 1 and 2^32 - 1"
    },
    {
      "code": 6002,
      "name": "invalidTopK",
      "msg": "top_k must be between 1 and MAX_TOP_K"
    },
    {
      "code": 6003,
      "name": "unauthorized",
      "msg": "Only the lab authority can do this"
    },
    {
      "code": 6004,
      "name": "alreadyRevoked",
      "msg": "Dataset is already revoked"
    },
    {
      "code": 6005,
      "name": "emptyHash",
      "msg": "Hash must not be all zeros"
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
      "name": "datasetCommitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "dataset",
            "type": "pubkey"
          },
          {
            "name": "lab",
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
          }
        ]
      }
    },
    {
      "name": "datasetRevoked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "dataset",
            "type": "pubkey"
          },
          {
            "name": "lab",
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
    },
    {
      "name": "lab",
      "docs": [
        "A data owner. PDA: [\"lab\", authority]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "nameHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "datasetCount",
            "type": "u32"
          },
          {
            "name": "createdSlot",
            "type": "u64"
          },
          {
            "name": "createdAt",
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
      "name": "labRegistered",
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
            "name": "nameHash",
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
      "name": "predictionRunCommitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "run",
            "type": "pubkey"
          },
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
          }
        ]
      }
    }
  ]
};
