# `zotero-bridge library snapshot`

Read a fixed Zotero full-library snapshot page

## Usage

```console
zotero-bridge library snapshot [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--query <JSON_OR_FILE>]
```

The global options may appear before or after the leaf command. Use `--schema` to inspect raw structured-input schemas without loading a profile or connecting to Zotero.

## Global parameters

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --endpoint | endpoint | option | no | — | ENDPOINT | no | ZOTERO_BRIDGE_ENDPOINT | — | Zotero Bridge service endpoint base URL. If omitted, the CLI reads ZOTERO_BRIDGE_ENDPOINT or a profile file. The CLI does not guess random bridge ports. |
| --operation-id | operation_id | option | no | — | ID | no | ZOTERO_BRIDGE_OPERATION_ID | — | Opaque idempotency id for a state-changing Zotero request |
| --profile | profile | option | no | — | PATH | no | ZOTERO_BRIDGE_PROFILE | — | Path to a Zotero Bridge connection-profile JSON file. If omitted, the CLI tries the Zotero Agents well-known profile. ACP run profiles usually reference tokenEnv; the local well-known profile may contain a bearer token protected by user-level file permissions. |
| --schema | schema | option | no | — | SCHEMA; values: true, false | no | — | — | Print the versioned raw JSON Schemas and governed examples for one canonical leaf command. Schema mode is offline and does not load a profile, read Zotero Bridge configuration, or connect to Zotero. |

## Local options and positionals

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --query | query | option | no | — | JSON_OR_FILE | no | — | — | Read query. Use inline JSON by default, such as '{"cursor":1}'. Use a file path containing JSON, @file syntax, or '-' for stdin only when that input source is intentional. Omit for {}. |

## Invocation schema

```json
{
  "additionalProperties": false,
  "properties": {
    "query": {
      "description": "Read query as inline JSON, a file path, @file, or '-' for stdin",
      "type": "string"
    }
  },
  "required": [],
  "type": "object"
}
```

## Structured input schemas

### `--query` (query)

Required: `false`.

```json
{
  "additionalProperties": false,
  "dependentRequired": {
    "cursor": [
      "snapshotId"
    ],
    "snapshotId": [
      "cursor"
    ]
  },
  "properties": {
    "batchSize": {
      "maximum": 1000,
      "minimum": 1,
      "type": "integer"
    },
    "cursor": {
      "maxLength": 256,
      "minLength": 1,
      "type": "string"
    },
    "libraryId": {
      "minimum": 1,
      "type": "integer"
    },
    "snapshotId": {
      "maxLength": 256,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "libraryId"
  ],
  "type": "object"
}
```

## Composed payload schema

```json
{
  "additionalProperties": false,
  "dependentRequired": {
    "cursor": [
      "snapshotId"
    ],
    "snapshotId": [
      "cursor"
    ]
  },
  "properties": {
    "batchSize": {
      "maximum": 1000,
      "minimum": 1,
      "type": "integer"
    },
    "cursor": {
      "maxLength": 256,
      "minLength": 1,
      "type": "string"
    },
    "libraryId": {
      "minimum": 1,
      "type": "integer"
    },
    "snapshotId": {
      "maxLength": 256,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "libraryId"
  ],
  "type": "object"
}
```

## Payload composition

This command has no separate field-mapping program. Its binding mode is executable directly: passthrough uses the sole structured source, while `none` and `raw` retain their declared closed behavior.

`composition`: `null`.

## Result schema

```json
{
  "additionalProperties": false,
  "properties": {
    "approval": {
      "minLength": 1,
      "type": "string"
    },
    "capability": {
      "const": "library.sync_snapshot"
    },
    "data": {
      "additionalProperties": false,
      "oneOf": [
        {
          "not": {
            "required": [
              "completionEvidence"
            ]
          },
          "properties": {
            "hasMore": {
              "const": true
            },
            "nextCursor": {
              "minLength": 1,
              "type": "string"
            },
            "outcome": {
              "const": "active"
            }
          }
        },
        {
          "properties": {
            "hasMore": {
              "const": false
            },
            "nextCursor": {
              "type": "null"
            },
            "outcome": {
              "const": "completed"
            }
          },
          "required": [
            "completionEvidence"
          ]
        }
      ],
      "properties": {
        "batchIndex": {
          "minimum": 0,
          "type": "integer"
        },
        "batchSize": {
          "maximum": 1000,
          "minimum": 1,
          "type": "integer"
        },
        "completionEvidence": {
          "additionalProperties": false,
          "properties": {
            "completedAt": {
              "type": "string"
            },
            "contentDigest": {
              "pattern": "^sha256:[0-9a-f]{64}$",
              "type": "string"
            },
            "libraryId": {
              "minimum": 1,
              "type": "integer"
            },
            "order": {
              "const": "stable_identity"
            },
            "schema": {
              "const": "zotero-agents.library-full-index.v1"
            },
            "scope": {
              "const": "top-level-regular"
            },
            "snapshotId": {
              "maxLength": 256,
              "minLength": 1,
              "type": "string"
            },
            "totalBatches": {
              "minimum": 1,
              "type": "integer"
            },
            "totalItems": {
              "maximum": 1000000,
              "minimum": 0,
              "type": "integer"
            }
          },
          "required": [
            "snapshotId",
            "schema",
            "libraryId",
            "scope",
            "totalItems",
            "totalBatches",
            "order",
            "contentDigest",
            "completedAt"
          ],
          "type": "object"
        },
        "deliveredBatches": {
          "minimum": 0,
          "type": "integer"
        },
        "deliveredItems": {
          "minimum": 0,
          "type": "integer"
        },
        "hasMore": {
          "type": "boolean"
        },
        "items": {
          "items": {
            "additionalProperties": false,
            "properties": {
              "annotationCount": {
                "minimum": 0,
                "type": "integer"
              },
              "attachmentCount": {
                "minimum": 0,
                "type": "integer"
              },
              "collectionRefs": {
                "items": {
                  "additionalProperties": false,
                  "properties": {
                    "key": {
                      "maxLength": 128,
                      "minLength": 1,
                      "type": "string"
                    },
                    "libraryId": {
                      "minimum": 1,
                      "type": "integer"
                    }
                  },
                  "required": [
                    "libraryId",
                    "key"
                  ],
                  "type": "object"
                },
                "type": "array"
              },
              "creators": {
                "items": {
                  "anyOf": [
                    {
                      "additionalProperties": false,
                      "properties": {
                        "creatorType": {
                          "type": "string"
                        },
                        "firstName": {
                          "type": "string"
                        },
                        "lastName": {
                          "type": "string"
                        },
                        "representation": {
                          "const": "two_field"
                        }
                      },
                      "required": [
                        "representation",
                        "creatorType",
                        "firstName",
                        "lastName"
                      ],
                      "type": "object"
                    },
                    {
                      "additionalProperties": false,
                      "properties": {
                        "creatorType": {
                          "type": "string"
                        },
                        "name": {
                          "minLength": 1,
                          "type": "string"
                        },
                        "representation": {
                          "const": "single_field"
                        }
                      },
                      "required": [
                        "representation",
                        "creatorType",
                        "name"
                      ],
                      "type": "object"
                    }
                  ]
                },
                "type": "array"
              },
              "date": {
                "type": "string"
              },
              "identifiers": {
                "additionalProperties": false,
                "properties": {
                  "arxiv": {
                    "type": [
                      "string",
                      "null"
                    ]
                  },
                  "doi": {
                    "type": [
                      "string",
                      "null"
                    ]
                  },
                  "isbn": {
                    "type": [
                      "string",
                      "null"
                    ]
                  },
                  "issn": {
                    "type": [
                      "string",
                      "null"
                    ]
                  },
                  "pmid": {
                    "type": [
                      "string",
                      "null"
                    ]
                  }
                },
                "required": [
                  "doi",
                  "isbn",
                  "issn",
                  "arxiv",
                  "pmid"
                ],
                "type": "object"
              },
              "itemType": {
                "type": "string"
              },
              "kind": {
                "const": "regular"
              },
              "modifiedAt": {
                "type": "string"
              },
              "noteCount": {
                "minimum": 0,
                "type": "integer"
              },
              "parentRef": {
                "anyOf": [
                  {
                    "additionalProperties": false,
                    "properties": {
                      "key": {
                        "maxLength": 128,
                        "minLength": 1,
                        "type": "string"
                      },
                      "libraryId": {
                        "minimum": 1,
                        "type": "integer"
                      }
                    },
                    "required": [
                      "libraryId",
                      "key"
                    ],
                    "type": "object"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "publicationTitle": {
                "type": "string"
              },
              "ref": {
                "additionalProperties": false,
                "properties": {
                  "key": {
                    "maxLength": 128,
                    "minLength": 1,
                    "type": "string"
                  },
                  "libraryId": {
                    "minimum": 1,
                    "type": "integer"
                  }
                },
                "required": [
                  "libraryId",
                  "key"
                ],
                "type": "object"
              },
              "revision": {
                "minLength": 1,
                "type": "string"
              },
              "state": {
                "const": "active"
              },
              "tags": {
                "items": {
                  "type": "string"
                },
                "type": "array"
              },
              "title": {
                "type": "string"
              },
              "url": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "year": {
                "type": [
                  "string",
                  "null"
                ]
              }
            },
            "required": [
              "ref",
              "kind",
              "itemType",
              "title",
              "parentRef",
              "state",
              "revision",
              "tags",
              "collectionRefs",
              "creators",
              "date",
              "year",
              "publicationTitle",
              "identifiers",
              "url",
              "noteCount",
              "attachmentCount",
              "annotationCount",
              "modifiedAt"
            ],
            "type": "object"
          },
          "maxItems": 1000,
          "type": "array"
        },
        "libraryId": {
          "minimum": 1,
          "type": "integer"
        },
        "nextCursor": {
          "type": [
            "string",
            "null"
          ]
        },
        "order": {
          "const": "stable_identity"
        },
        "outcome": {
          "enum": [
            "active",
            "completed"
          ]
        },
        "returned": {
          "minimum": 0,
          "type": "integer"
        },
        "schema": {
          "const": "zotero-agents.library-full-index.v1"
        },
        "scope": {
          "const": "top-level-regular"
        },
        "snapshotId": {
          "maxLength": 256,
          "minLength": 1,
          "type": "string"
        }
      },
      "required": [
        "schema",
        "snapshotId",
        "libraryId",
        "scope",
        "order",
        "batchSize",
        "batchIndex",
        "items",
        "nextCursor",
        "hasMore",
        "returned",
        "deliveredItems",
        "deliveredBatches",
        "outcome"
      ],
      "type": "object"
    }
  },
  "required": [
    "capability",
    "approval",
    "data"
  ],
  "type": "object"
}
```

## Examples

### query: shape-only

Minimal JSON shape for --query.

```console
zotero-bridge library snapshot --query '{"batchSize":500,"libraryId":1}'
```

Prerequisites:

- Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution.

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

```json
{
  "approvalContract": {
    "kind": "none",
    "scope": "No Zotero UI approval; provider runtimes may still request their own permission.",
    "timing": "none"
  },
  "arguments": [
    {
      "aliases": [
        "input"
      ],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Read query as inline JSON, a file path, @file, or '-' for stdin",
      "id": "query",
      "kind": "option",
      "longHelp": "Read query. Use inline JSON by default, such as '{\"cursor\":1}'. Use a file path containing JSON, @file syntax, or '-' for stdin only when that input source is intentional. Omit for {}.",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--query",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "argv": [
    "library",
    "snapshot"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "query",
      "required": false,
      "takesValue": true,
      "token": "--query",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "binding": "passthrough",
  "category": "read",
  "command": "library snapshot",
  "composition": null,
  "danger": "none",
  "effects": [
    {
      "description": "Reads state without changing Zotero-managed data.",
      "kind": "none",
      "stateChanged": false
    }
  ],
  "handleTransitions": [],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {
    "query": {
      "examples": [
        {
          "description": "Minimal JSON shape for --query.",
          "kind": "shape-only",
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "value": {
            "batchSize": 500,
            "libraryId": 1
          }
        }
      ],
      "required": false,
      "requiredWhen": [],
      "schema": {
        "additionalProperties": false,
        "dependentRequired": {
          "cursor": [
            "snapshotId"
          ],
          "snapshotId": [
            "cursor"
          ]
        },
        "properties": {
          "batchSize": {
            "maximum": 1000,
            "minimum": 1,
            "type": "integer"
          },
          "cursor": {
            "maxLength": 256,
            "minLength": 1,
            "type": "string"
          },
          "libraryId": {
            "minimum": 1,
            "type": "integer"
          },
          "snapshotId": {
            "maxLength": 256,
            "minLength": 1,
            "type": "string"
          }
        },
        "required": [
          "libraryId"
        ],
        "type": "object"
      },
      "schemaSource": "target-capability",
      "token": "--query"
    }
  },
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "query": {
        "description": "Read query as inline JSON, a file path, @file, or '-' for stdin",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "operationalAliases": [
    "library snapshot",
    "library",
    "snapshot",
    "query",
    "JSON_OR_FILE"
  ],
  "outputBoundary": {
    "continuation": [
      "data.snapshotId",
      "data.nextCursor",
      "data.hasMore",
      "data.returned",
      "data.deliveredItems",
      "data.deliveredBatches",
      "data.outcome"
    ],
    "cursorInput": "query",
    "defaultLimit": 500,
    "maxLimit": 1000,
    "section": "data.items",
    "strategy": "cursor"
  },
  "pagination": "cursor",
  "payloadSchema": {
    "additionalProperties": false,
    "dependentRequired": {
      "cursor": [
        "snapshotId"
      ],
      "snapshotId": [
        "cursor"
      ]
    },
    "properties": {
      "batchSize": {
        "maximum": 1000,
        "minimum": 1,
        "type": "integer"
      },
      "cursor": {
        "maxLength": 256,
        "minLength": 1,
        "type": "string"
      },
      "libraryId": {
        "minimum": 1,
        "type": "integer"
      },
      "snapshotId": {
        "maxLength": 256,
        "minLength": 1,
        "type": "string"
      }
    },
    "required": [
      "libraryId"
    ],
    "type": "object"
  },
  "recovery": [
    {
      "action": "Inspect the error and retry only when retryable is true.",
      "nextCommand": "surface describe",
      "requiresHandles": [],
      "stateCheck": "none",
      "when": "The read fails or returns incomplete evidence."
    }
  ],
  "resultSchema": {
    "additionalProperties": false,
    "properties": {
      "approval": {
        "minLength": 1,
        "type": "string"
      },
      "capability": {
        "const": "library.sync_snapshot"
      },
      "data": {
        "additionalProperties": false,
        "oneOf": [
          {
            "not": {
              "required": [
                "completionEvidence"
              ]
            },
            "properties": {
              "hasMore": {
                "const": true
              },
              "nextCursor": {
                "minLength": 1,
                "type": "string"
              },
              "outcome": {
                "const": "active"
              }
            }
          },
          {
            "properties": {
              "hasMore": {
                "const": false
              },
              "nextCursor": {
                "type": "null"
              },
              "outcome": {
                "const": "completed"
              }
            },
            "required": [
              "completionEvidence"
            ]
          }
        ],
        "properties": {
          "batchIndex": {
            "minimum": 0,
            "type": "integer"
          },
          "batchSize": {
            "maximum": 1000,
            "minimum": 1,
            "type": "integer"
          },
          "completionEvidence": {
            "additionalProperties": false,
            "properties": {
              "completedAt": {
                "type": "string"
              },
              "contentDigest": {
                "pattern": "^sha256:[0-9a-f]{64}$",
                "type": "string"
              },
              "libraryId": {
                "minimum": 1,
                "type": "integer"
              },
              "order": {
                "const": "stable_identity"
              },
              "schema": {
                "const": "zotero-agents.library-full-index.v1"
              },
              "scope": {
                "const": "top-level-regular"
              },
              "snapshotId": {
                "maxLength": 256,
                "minLength": 1,
                "type": "string"
              },
              "totalBatches": {
                "minimum": 1,
                "type": "integer"
              },
              "totalItems": {
                "maximum": 1000000,
                "minimum": 0,
                "type": "integer"
              }
            },
            "required": [
              "snapshotId",
              "schema",
              "libraryId",
              "scope",
              "totalItems",
              "totalBatches",
              "order",
              "contentDigest",
              "completedAt"
            ],
            "type": "object"
          },
          "deliveredBatches": {
            "minimum": 0,
            "type": "integer"
          },
          "deliveredItems": {
            "minimum": 0,
            "type": "integer"
          },
          "hasMore": {
            "type": "boolean"
          },
          "items": {
            "items": {
              "additionalProperties": false,
              "properties": {
                "annotationCount": {
                  "minimum": 0,
                  "type": "integer"
                },
                "attachmentCount": {
                  "minimum": 0,
                  "type": "integer"
                },
                "collectionRefs": {
                  "items": {
                    "additionalProperties": false,
                    "properties": {
                      "key": {
                        "maxLength": 128,
                        "minLength": 1,
                        "type": "string"
                      },
                      "libraryId": {
                        "minimum": 1,
                        "type": "integer"
                      }
                    },
                    "required": [
                      "libraryId",
                      "key"
                    ],
                    "type": "object"
                  },
                  "type": "array"
                },
                "creators": {
                  "items": {
                    "anyOf": [
                      {
                        "additionalProperties": false,
                        "properties": {
                          "creatorType": {
                            "type": "string"
                          },
                          "firstName": {
                            "type": "string"
                          },
                          "lastName": {
                            "type": "string"
                          },
                          "representation": {
                            "const": "two_field"
                          }
                        },
                        "required": [
                          "representation",
                          "creatorType",
                          "firstName",
                          "lastName"
                        ],
                        "type": "object"
                      },
                      {
                        "additionalProperties": false,
                        "properties": {
                          "creatorType": {
                            "type": "string"
                          },
                          "name": {
                            "minLength": 1,
                            "type": "string"
                          },
                          "representation": {
                            "const": "single_field"
                          }
                        },
                        "required": [
                          "representation",
                          "creatorType",
                          "name"
                        ],
                        "type": "object"
                      }
                    ]
                  },
                  "type": "array"
                },
                "date": {
                  "type": "string"
                },
                "identifiers": {
                  "additionalProperties": false,
                  "properties": {
                    "arxiv": {
                      "type": [
                        "string",
                        "null"
                      ]
                    },
                    "doi": {
                      "type": [
                        "string",
                        "null"
                      ]
                    },
                    "isbn": {
                      "type": [
                        "string",
                        "null"
                      ]
                    },
                    "issn": {
                      "type": [
                        "string",
                        "null"
                      ]
                    },
                    "pmid": {
                      "type": [
                        "string",
                        "null"
                      ]
                    }
                  },
                  "required": [
                    "doi",
                    "isbn",
                    "issn",
                    "arxiv",
                    "pmid"
                  ],
                  "type": "object"
                },
                "itemType": {
                  "type": "string"
                },
                "kind": {
                  "const": "regular"
                },
                "modifiedAt": {
                  "type": "string"
                },
                "noteCount": {
                  "minimum": 0,
                  "type": "integer"
                },
                "parentRef": {
                  "anyOf": [
                    {
                      "additionalProperties": false,
                      "properties": {
                        "key": {
                          "maxLength": 128,
                          "minLength": 1,
                          "type": "string"
                        },
                        "libraryId": {
                          "minimum": 1,
                          "type": "integer"
                        }
                      },
                      "required": [
                        "libraryId",
                        "key"
                      ],
                      "type": "object"
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "publicationTitle": {
                  "type": "string"
                },
                "ref": {
                  "additionalProperties": false,
                  "properties": {
                    "key": {
                      "maxLength": 128,
                      "minLength": 1,
                      "type": "string"
                    },
                    "libraryId": {
                      "minimum": 1,
                      "type": "integer"
                    }
                  },
                  "required": [
                    "libraryId",
                    "key"
                  ],
                  "type": "object"
                },
                "revision": {
                  "minLength": 1,
                  "type": "string"
                },
                "state": {
                  "const": "active"
                },
                "tags": {
                  "items": {
                    "type": "string"
                  },
                  "type": "array"
                },
                "title": {
                  "type": "string"
                },
                "url": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "year": {
                  "type": [
                    "string",
                    "null"
                  ]
                }
              },
              "required": [
                "ref",
                "kind",
                "itemType",
                "title",
                "parentRef",
                "state",
                "revision",
                "tags",
                "collectionRefs",
                "creators",
                "date",
                "year",
                "publicationTitle",
                "identifiers",
                "url",
                "noteCount",
                "attachmentCount",
                "annotationCount",
                "modifiedAt"
              ],
              "type": "object"
            },
            "maxItems": 1000,
            "type": "array"
          },
          "libraryId": {
            "minimum": 1,
            "type": "integer"
          },
          "nextCursor": {
            "type": [
              "string",
              "null"
            ]
          },
          "order": {
            "const": "stable_identity"
          },
          "outcome": {
            "enum": [
              "active",
              "completed"
            ]
          },
          "returned": {
            "minimum": 0,
            "type": "integer"
          },
          "schema": {
            "const": "zotero-agents.library-full-index.v1"
          },
          "scope": {
            "const": "top-level-regular"
          },
          "snapshotId": {
            "maxLength": 256,
            "minLength": 1,
            "type": "string"
          }
        },
        "required": [
          "schema",
          "snapshotId",
          "libraryId",
          "scope",
          "order",
          "batchSize",
          "batchIndex",
          "items",
          "nextCursor",
          "hasMore",
          "returned",
          "deliveredItems",
          "deliveredBatches",
          "outcome"
        ],
        "type": "object"
      }
    },
    "required": [
      "capability",
      "approval",
      "data"
    ],
    "type": "object"
  },
  "summary": "Read a fixed Zotero full-library snapshot page",
  "targets": [
    {
      "kind": "capability",
      "target": "library.sync_snapshot"
    }
  ]
}
```

## Parameter failure and recovery contract

Parameter failures are returned as one JSON error envelope. Inspect `error.code`, then require `error.details.schema` to be `host-bridge.argument-error.v1` before using the structured boundary fields. Preserve the canonical command, sanitized inputs, and any already-returned typed handles; never include the complete raw payload in evidence.

- `argv` reports a missing, unknown, conflicting, or invalid CLI argument. Rebuild argv from this card's parameter tables or the active command help.
- `json_source` reports an unreadable stdin or file source. Correct that source without moving the value to a different binding.
- `json_syntax` reports invalid JSON with safe line and column context. Repair syntax before interpreting domain fields.
- `command_input` reports schema violations for a structured input. Inspect the bounded `violations`, then run this exact leaf with `--schema` and correct the declared field or type; do not invent an alias.
- `payload_contract` means the CLI's composed capability payload violates the executable contract before network I/O. Treat this as an implementation fault; do not bypass the semantic command with raw transport.
- `command_result` means a Host response or local result failed its executable result schema. Do not accept or report it as successful evidence.
- Violation arrays are redacted, deterministically ordered, and capped at eight. When `truncated` is true, correct the reported violations and validate again rather than requesting secret or complete payload disclosure.

## Operational contract

- Canonical argv path: `library` `snapshot`.
- Output boundary: `cursor`; governed details: {"continuation":["data.snapshotId","data.nextCursor","data.hasMore","data.returned","data.deliveredItems","data.deliveredBatches","data.outcome"],"cursorInput":"query","defaultLimit":500,"maxLimit":1000,"section":"data.items","strategy":"cursor"}.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Structured binding mode: `passthrough`.
- Intent visibility: `visible`.
- Operational aliases: `library snapshot`, `library`, `snapshot`, `query`, `JSON_OR_FILE`.

### Effects

```json
[
  {
    "description": "Reads state without changing Zotero-managed data.",
    "kind": "none",
    "stateChanged": false
  }
]
```

### Approval

```json
{
  "kind": "none",
  "scope": "No Zotero UI approval; provider runtimes may still request their own permission.",
  "timing": "none"
}
```

### Handle transitions

```json
[
]
```

### Recovery

```json
[
  {
    "action": "Inspect the error and retry only when retryable is true.",
    "nextCommand": "surface describe",
    "requiresHandles": [],
    "stateCheck": "none",
    "when": "The read fails or returns incomplete evidence."
  }
]
```

### Targets

```json
[
  {
    "kind": "capability",
    "target": "library.sync_snapshot"
  }
]
```
