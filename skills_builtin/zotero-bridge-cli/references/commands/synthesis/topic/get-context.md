# `zotero-bridge synthesis topic get-context`

Read one topic synthesis context

## Usage

```console
zotero-bridge synthesis topic get-context [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--query <JSON_OR_FILE>]
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
  "properties": {
    "includeArtifact": {
      "type": "boolean"
    },
    "includeFull": {
      "type": "boolean"
    },
    "includeManifest": {
      "type": "boolean"
    },
    "includeMarkdown": {
      "type": "boolean"
    },
    "include_artifact": {
      "type": "boolean"
    },
    "include_full": {
      "type": "boolean"
    },
    "include_manifest": {
      "type": "boolean"
    },
    "include_markdown": {
      "type": "boolean"
    },
    "language": {
      "type": "string"
    },
    "mode": {
      "enum": [
        "create",
        "update"
      ],
      "type": "string"
    },
    "outputPath": {
      "type": "string"
    },
    "output_path": {
      "type": "string"
    },
    "overwrite": {
      "type": "boolean"
    },
    "topicId": {
      "type": "string"
    },
    "topic_id": {
      "type": "string"
    },
    "updateMode": {
      "type": "string"
    },
    "updateReason": {
      "type": "string"
    },
    "updateScope": {
      "type": "string"
    },
    "update_mode": {
      "type": "string"
    },
    "update_reason": {
      "type": "string"
    },
    "update_scope": {
      "type": "string"
    },
    "view": {
      "enum": [
        "digest",
        "semantic",
        "audit",
        "full"
      ],
      "type": "string"
    }
  },
  "type": "object"
}
```

## Composed payload schema

```json
{
  "additionalProperties": false,
  "properties": {
    "includeArtifact": {
      "type": "boolean"
    },
    "includeFull": {
      "type": "boolean"
    },
    "includeManifest": {
      "type": "boolean"
    },
    "includeMarkdown": {
      "type": "boolean"
    },
    "include_artifact": {
      "type": "boolean"
    },
    "include_full": {
      "type": "boolean"
    },
    "include_manifest": {
      "type": "boolean"
    },
    "include_markdown": {
      "type": "boolean"
    },
    "language": {
      "type": "string"
    },
    "mode": {
      "enum": [
        "create",
        "update"
      ],
      "type": "string"
    },
    "outputPath": {
      "type": "string"
    },
    "output_path": {
      "type": "string"
    },
    "overwrite": {
      "type": "boolean"
    },
    "topicId": {
      "type": "string"
    },
    "topic_id": {
      "type": "string"
    },
    "updateMode": {
      "type": "string"
    },
    "updateReason": {
      "type": "string"
    },
    "updateScope": {
      "type": "string"
    },
    "update_mode": {
      "type": "string"
    },
    "update_reason": {
      "type": "string"
    },
    "update_scope": {
      "type": "string"
    },
    "view": {
      "enum": [
        "digest",
        "semantic",
        "audit",
        "full"
      ],
      "type": "string"
    }
  },
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
      "const": "topics.get_context"
    },
    "data": {
      "additionalProperties": true,
      "description": "Result data owned by topics.get_context.",
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

### query: shape-only

Minimal JSON shape for --query.

```console
zotero-bridge synthesis topic get-context --query '{}'
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
    "synthesis",
    "topic",
    "get-context"
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
  "command": "synthesis topic get-context",
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
          "value": {}
        }
      ],
      "required": false,
      "requiredWhen": [],
      "schema": {
        "additionalProperties": false,
        "properties": {
          "includeArtifact": {
            "type": "boolean"
          },
          "includeFull": {
            "type": "boolean"
          },
          "includeManifest": {
            "type": "boolean"
          },
          "includeMarkdown": {
            "type": "boolean"
          },
          "include_artifact": {
            "type": "boolean"
          },
          "include_full": {
            "type": "boolean"
          },
          "include_manifest": {
            "type": "boolean"
          },
          "include_markdown": {
            "type": "boolean"
          },
          "language": {
            "type": "string"
          },
          "mode": {
            "enum": [
              "create",
              "update"
            ],
            "type": "string"
          },
          "outputPath": {
            "type": "string"
          },
          "output_path": {
            "type": "string"
          },
          "overwrite": {
            "type": "boolean"
          },
          "topicId": {
            "type": "string"
          },
          "topic_id": {
            "type": "string"
          },
          "updateMode": {
            "type": "string"
          },
          "updateReason": {
            "type": "string"
          },
          "updateScope": {
            "type": "string"
          },
          "update_mode": {
            "type": "string"
          },
          "update_reason": {
            "type": "string"
          },
          "update_scope": {
            "type": "string"
          },
          "view": {
            "enum": [
              "digest",
              "semantic",
              "audit",
              "full"
            ],
            "type": "string"
          }
        },
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
    "synthesis topic get-context",
    "synthesis",
    "topic",
    "get-context",
    "query",
    "JSON_OR_FILE"
  ],
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "includeArtifact": {
        "type": "boolean"
      },
      "includeFull": {
        "type": "boolean"
      },
      "includeManifest": {
        "type": "boolean"
      },
      "includeMarkdown": {
        "type": "boolean"
      },
      "include_artifact": {
        "type": "boolean"
      },
      "include_full": {
        "type": "boolean"
      },
      "include_manifest": {
        "type": "boolean"
      },
      "include_markdown": {
        "type": "boolean"
      },
      "language": {
        "type": "string"
      },
      "mode": {
        "enum": [
          "create",
          "update"
        ],
        "type": "string"
      },
      "outputPath": {
        "type": "string"
      },
      "output_path": {
        "type": "string"
      },
      "overwrite": {
        "type": "boolean"
      },
      "topicId": {
        "type": "string"
      },
      "topic_id": {
        "type": "string"
      },
      "updateMode": {
        "type": "string"
      },
      "updateReason": {
        "type": "string"
      },
      "updateScope": {
        "type": "string"
      },
      "update_mode": {
        "type": "string"
      },
      "update_reason": {
        "type": "string"
      },
      "update_scope": {
        "type": "string"
      },
      "view": {
        "enum": [
          "digest",
          "semantic",
          "audit",
          "full"
        ],
        "type": "string"
      }
    },
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
        "const": "topics.get_context"
      },
      "data": {
        "additionalProperties": true,
        "description": "Result data owned by topics.get_context.",
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
  "summary": "Read one topic synthesis context",
  "targets": [
    {
      "kind": "capability",
      "target": "topics.get_context"
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

- Canonical argv path: `synthesis` `topic` `get-context`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Structured binding mode: `passthrough`.
- Intent visibility: `visible`.
- Operational aliases: `synthesis topic get-context`, `synthesis`, `topic`, `get-context`, `query`, `JSON_OR_FILE`.

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
    "target": "topics.get_context"
  }
]
```
