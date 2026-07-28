# `zotero-bridge product download`

Download one or all Dashboard Product assets

## Usage

```console
zotero-bridge product download [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] PRODUCT_ID <PRODUCT_ID> [--asset <ASSET>] --output-dir <DIR> [--force]
```

The global options may appear before or after the leaf command. This leaf has no structured JSON input. `--schema` returns `command_input_schema_unavailable`; use command help or `surface describe` to inspect the invocation contract.

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
| PRODUCT_ID | product_id | positional | yes | — | PRODUCT_ID | no | — | — | Dashboard Product id |
| --asset | asset | option | no | — | ASSET | no | — | — | Optional asset id; omit to download all assets |
| --output-dir | output_dir | option | yes | — | DIR | no | — | — | Destination directory |
| --force | force | option | no | — | FORCE; values: true, false | no | — | — | Allow existing output files to be replaced |

## Invocation schema

```json
{
  "additionalProperties": false,
  "properties": {
    "asset": {
      "description": "Optional asset id; omit to download all assets",
      "type": "string"
    },
    "force": {
      "description": "Allow existing output files to be replaced",
      "type": "boolean"
    },
    "output-dir": {
      "description": "Destination directory",
      "type": "string"
    },
    "product_id": {
      "description": "Dashboard Product id",
      "position": 1,
      "type": "string"
    }
  },
  "required": [
    "product_id",
    "output-dir"
  ],
  "type": "object"
}
```

## Structured input schemas

This command has no structured JSON input parameter.

## Composed payload schema

```json
{
  "additionalProperties": false,
  "properties": {
    "assetId": {
      "type": "string"
    },
    "outputDir": {
      "type": "string"
    },
    "overwrite": {
      "type": "boolean"
    },
    "productId": {
      "type": "string"
    }
  },
  "required": [
    "productId"
  ],
  "type": "object"
}
```

## Payload composition

The executable command contract owns the base source, fixed values, field mappings, and closed transforms shown below. Command handlers only provide values under the referenced Clap argument IDs.

```json
{
  "constants": {},
  "mappings": [
    {
      "argument": "product_id",
      "field": "productId",
      "required": true,
      "transform": "trim-string"
    },
    {
      "argument": "asset",
      "field": "assetId",
      "required": false,
      "transform": "identity"
    },
    {
      "argument": "output_dir",
      "field": "outputDir",
      "required": true,
      "transform": "path-string"
    },
    {
      "argument": "force",
      "field": "overwrite",
      "required": true,
      "transform": "identity"
    }
  ]
}
```

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
      "const": "workflow_products.export"
    },
    "data": {
      "additionalProperties": true,
      "description": "Result data owned by workflow_products.export.",
      "properties": {
        "delivery": {
          "additionalProperties": false,
          "description": "Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.",
          "properties": {
            "bundle": {
              "additionalProperties": true,
              "properties": {
                "contentType": {
                  "type": "string"
                },
                "displayName": {
                  "type": "string"
                },
                "fileId": {
                  "type": "string"
                },
                "size": {
                  "type": "integer"
                }
              },
              "type": "object"
            },
            "downloadCommand": {
              "type": "string"
            },
            "files": {
              "items": {
                "type": "object"
              },
              "type": "array"
            },
            "mode": {
              "enum": [
                "local",
                "bridge-download",
                "bundle"
              ]
            },
            "path": {
              "type": "string"
            },
            "unpackHint": {
              "type": "string"
            }
          },
          "type": "object"
        },
        "file": {
          "additionalProperties": true,
          "properties": {
            "bytes": {
              "type": "integer"
            },
            "checksum": {
              "type": "string"
            },
            "fileId": {
              "type": "string"
            },
            "path": {
              "type": "string"
            }
          },
          "type": "object"
        },
        "fileId": {
          "type": "string"
        }
      },
      "type": "object",
      "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed."
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

No structured-input example applies. Build argv from the parameter tables and confirm the command with `surface describe` before execution.

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
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Dashboard Product id",
      "id": "product_id",
      "kind": "positional",
      "position": 1,
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "PRODUCT_ID",
      "valueNames": [
        "PRODUCT_ID"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Optional asset id; omit to download all assets",
      "id": "asset",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--asset",
      "valueNames": [
        "ASSET"
      ]
    },
    {
      "aliases": [
        "output"
      ],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Destination directory",
      "id": "output_dir",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "--output-dir",
      "valueNames": [
        "DIR"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Allow existing output files to be replaced",
      "id": "force",
      "kind": "option",
      "possibleValues": [
        "true",
        "false"
      ],
      "repeatable": false,
      "required": false,
      "takesValue": false,
      "token": "--force",
      "valueNames": [
        "FORCE"
      ]
    }
  ],
  "argv": [
    "product",
    "download"
  ],
  "argvBindings": [
    {
      "kind": "positional",
      "position": 1,
      "property": "product_id",
      "required": true,
      "takesValue": true,
      "token": "PRODUCT_ID",
      "valueNames": [
        "PRODUCT_ID"
      ]
    },
    {
      "kind": "option",
      "property": "asset",
      "required": false,
      "takesValue": true,
      "token": "--asset",
      "valueNames": [
        "ASSET"
      ]
    },
    {
      "kind": "option",
      "property": "output-dir",
      "required": true,
      "takesValue": true,
      "token": "--output-dir",
      "valueNames": [
        "DIR"
      ]
    },
    {
      "kind": "option",
      "property": "force",
      "required": false,
      "takesValue": false,
      "token": "--force",
      "valueNames": [
        "FORCE"
      ]
    }
  ],
  "binding": "object",
  "category": "read",
  "command": "product download",
  "composition": {
    "constants": {},
    "mappings": [
      {
        "argument": "product_id",
        "field": "productId",
        "required": true,
        "transform": "trim-string"
      },
      {
        "argument": "asset",
        "field": "assetId",
        "required": false,
        "transform": "identity"
      },
      {
        "argument": "output_dir",
        "field": "outputDir",
        "required": true,
        "transform": "path-string"
      },
      {
        "argument": "force",
        "field": "overwrite",
        "required": true,
        "transform": "identity"
      }
    ]
  },
  "danger": "none",
  "effects": [
    {
      "description": "Reads state without changing Zotero-managed data.",
      "kind": "none",
      "stateChanged": false
    }
  ],
  "handleTransitions": [
    {
      "condition": "Required by the command invocation.",
      "direction": "consume",
      "handle": "productId",
      "lifetime": "caller-owned",
      "required": true
    },
    {
      "condition": "Returned when the corresponding operation succeeds.",
      "direction": "produce",
      "handle": "fileId",
      "lifetime": "short-lived",
      "required": false
    }
  ],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {},
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "asset": {
        "description": "Optional asset id; omit to download all assets",
        "type": "string"
      },
      "force": {
        "description": "Allow existing output files to be replaced",
        "type": "boolean"
      },
      "output-dir": {
        "description": "Destination directory",
        "type": "string"
      },
      "product_id": {
        "description": "Dashboard Product id",
        "position": 1,
        "type": "string"
      }
    },
    "required": [
      "product_id",
      "output-dir"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "product download",
    "product",
    "download",
    "product_id",
    "PRODUCT_ID",
    "asset",
    "ASSET",
    "output_dir",
    "output-dir",
    "DIR",
    "force",
    "FORCE"
  ],
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "assetId": {
        "type": "string"
      },
      "outputDir": {
        "type": "string"
      },
      "overwrite": {
        "type": "boolean"
      },
      "productId": {
        "type": "string"
      }
    },
    "required": [
      "productId"
    ],
    "type": "object"
  },
  "recovery": [
    {
      "action": "Inspect the error and retry only when retryable is true.",
      "nextCommand": "surface describe",
      "requiresHandles": [],
      "stateCheck": "command-result",
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
        "const": "workflow_products.export"
      },
      "data": {
        "additionalProperties": true,
        "description": "Result data owned by workflow_products.export.",
        "properties": {
          "delivery": {
            "additionalProperties": false,
            "description": "Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.",
            "properties": {
              "bundle": {
                "additionalProperties": true,
                "properties": {
                  "contentType": {
                    "type": "string"
                  },
                  "displayName": {
                    "type": "string"
                  },
                  "fileId": {
                    "type": "string"
                  },
                  "size": {
                    "type": "integer"
                  }
                },
                "type": "object"
              },
              "downloadCommand": {
                "type": "string"
              },
              "files": {
                "items": {
                  "type": "object"
                },
                "type": "array"
              },
              "mode": {
                "enum": [
                  "local",
                  "bridge-download",
                  "bundle"
                ]
              },
              "path": {
                "type": "string"
              },
              "unpackHint": {
                "type": "string"
              }
            },
            "type": "object"
          },
          "file": {
            "additionalProperties": true,
            "properties": {
              "bytes": {
                "type": "integer"
              },
              "checksum": {
                "type": "string"
              },
              "fileId": {
                "type": "string"
              },
              "path": {
                "type": "string"
              }
            },
            "type": "object"
          },
          "fileId": {
            "type": "string"
          }
        },
        "type": "object",
        "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed."
      }
    },
    "required": [
      "capability",
      "approval",
      "data"
    ],
    "type": "object"
  },
  "summary": "Download one or all Dashboard Product assets",
  "targets": [
    {
      "kind": "capability",
      "target": "workflow_products.export"
    }
  ]
}
```

## Parameter failure and recovery contract

Parameter failures are returned as one JSON error envelope. Inspect `error.code`, then require `error.details.schema` to be `host-bridge.argument-error.v1` before using the structured boundary fields. Preserve the canonical command, sanitized inputs, and any already-returned typed handles; never include the complete raw payload in evidence.

- `argv` reports a missing, unknown, conflicting, or invalid CLI argument. Rebuild argv from this card's parameter tables or the active command help.
- `json_source` reports an unreadable stdin or file source. Correct that source without moving the value to a different binding.
- `json_syntax` reports invalid JSON with safe line and column context. Repair syntax before interpreting domain fields.
- This leaf has no structured JSON input, so `command_input` is not an expected invocation boundary. Use `surface describe` for its scalar and positional contract.
- `payload_contract` means the CLI's composed capability payload violates the executable contract before network I/O. Treat this as an implementation fault; do not bypass the semantic command with raw transport.
- `command_result` means a Host response or local result failed its executable result schema. Do not accept or report it as successful evidence.
- Violation arrays are redacted, deterministically ordered, and capped at eight. When `truncated` is true, correct the reported violations and validate again rather than requesting secret or complete payload disclosure.

## Operational contract

- Canonical argv path: `product` `download`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Structured binding mode: `object`.
- Intent visibility: `visible`.
- Operational aliases: `product download`, `product`, `download`, `product_id`, `PRODUCT_ID`, `asset`, `ASSET`, `output_dir`, `output-dir`, `DIR`, `force`, `FORCE`.

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
  {
    "condition": "Required by the command invocation.",
    "direction": "consume",
    "handle": "productId",
    "lifetime": "caller-owned",
    "required": true
  },
  {
    "condition": "Returned when the corresponding operation succeeds.",
    "direction": "produce",
    "handle": "fileId",
    "lifetime": "short-lived",
    "required": false
  }
]
```

### Recovery

```json
[
  {
    "action": "Inspect the error and retry only when retryable is true.",
    "nextCommand": "surface describe",
    "requiresHandles": [],
    "stateCheck": "command-result",
    "when": "The read fails or returns incomplete evidence."
  }
]
```

### Targets

```json
[
  {
    "kind": "capability",
    "target": "workflow_products.export"
  }
]
```
