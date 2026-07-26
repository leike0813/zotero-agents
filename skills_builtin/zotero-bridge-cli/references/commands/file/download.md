# `zotero-bridge file download`

Download one registered file handle

## Usage

```console
zotero-bridge file download [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] FILE_ID <FILE_ID> --output <PATH> [--force]
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
| FILE_ID | file_id | positional | yes | — | FILE_ID | no | — | — | Broker-issued opaque file id |
| --output | output | option | yes | — | PATH | no | — | — | Output file path |
| --force | force | option | no | — | FORCE; values: true, false | no | — | — | Overwrite the output file if it already exists |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "file_id": {
      "type": "string",
      "description": "Broker-issued opaque file id",
      "position": 1
    },
    "output": {
      "type": "string",
      "description": "Output file path"
    },
    "force": {
      "type": "boolean",
      "description": "Overwrite the output file if it already exists"
    }
  },
  "required": [
    "file_id",
    "output"
  ],
  "additionalProperties": false
}
```

## Structured input schemas

This command has no structured JSON input parameter.

## Composed payload schema

```json
{
  "type": "object",
  "properties": {
    "file_id": {
      "type": "string",
      "description": "Broker-issued opaque file id"
    },
    "output": {
      "type": "string",
      "description": "Output file path"
    }
  },
  "required": [],
  "additionalProperties": false
}
```

## Result schema

```json
{
  "type": "object",
  "properties": {
    "file": {
      "type": "object",
      "properties": {
        "fileId": {
          "type": "string"
        },
        "path": {
          "type": "string"
        },
        "checksum": {
          "type": "string"
        },
        "bytes": {
          "type": "integer"
        }
      },
      "additionalProperties": true
    },
    "delivery": {
      "type": "object",
      "description": "Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.",
      "properties": {
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
        "files": {
          "type": "array",
          "items": {
            "type": "object"
          }
        },
        "bundle": {
          "type": "object",
          "properties": {
            "fileId": {
              "type": "string"
            },
            "displayName": {
              "type": "string"
            },
            "contentType": {
              "type": "string"
            },
            "size": {
              "type": "integer"
            }
          },
          "additionalProperties": true
        },
        "downloadCommand": {
          "type": "string"
        },
        "unpackHint": {
          "type": "string"
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": true,
  "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
}
```

## Examples

No structured-input example applies. Build argv from the parameter tables and confirm the command with `surface describe` before execution.

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

```json
{
  "command": "file download",
  "argv": [
    "file",
    "download"
  ],
  "summary": "Download one registered file handle",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "file_id": {
        "type": "string",
        "description": "Broker-issued opaque file id",
        "position": 1
      },
      "output": {
        "type": "string",
        "description": "Output file path"
      },
      "force": {
        "type": "boolean",
        "description": "Overwrite the output file if it already exists"
      }
    },
    "required": [
      "file_id",
      "output"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "file_id",
      "kind": "positional",
      "token": "FILE_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Broker-issued opaque file id",
      "valueNames": [
        "FILE_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "output",
      "kind": "option",
      "token": "--output",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Output file path",
      "valueNames": [
        "PATH"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "force",
      "kind": "option",
      "token": "--force",
      "takesValue": false,
      "required": false,
      "global": false,
      "help": "Overwrite the output file if it already exists",
      "valueNames": [
        "FORCE"
      ],
      "possibleValues": [
        "true",
        "false"
      ],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    }
  ],
  "argvBindings": [
    {
      "property": "file_id",
      "kind": "positional",
      "token": "FILE_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "FILE_ID"
      ]
    },
    {
      "property": "output",
      "kind": "option",
      "token": "--output",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "PATH"
      ]
    },
    {
      "property": "force",
      "kind": "option",
      "token": "--force",
      "takesValue": false,
      "required": false,
      "valueNames": [
        "FORCE"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "file_id": {
        "type": "string",
        "description": "Broker-issued opaque file id"
      },
      "output": {
        "type": "string",
        "description": "Output file path"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "file": {
        "type": "object",
        "properties": {
          "fileId": {
            "type": "string"
          },
          "path": {
            "type": "string"
          },
          "checksum": {
            "type": "string"
          },
          "bytes": {
            "type": "integer"
          }
        },
        "additionalProperties": true
      },
      "delivery": {
        "type": "object",
        "description": "Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.",
        "properties": {
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
          "files": {
            "type": "array",
            "items": {
              "type": "object"
            }
          },
          "bundle": {
            "type": "object",
            "properties": {
              "fileId": {
                "type": "string"
              },
              "displayName": {
                "type": "string"
              },
              "contentType": {
                "type": "string"
              },
              "size": {
                "type": "integer"
              }
            },
            "additionalProperties": true
          },
          "downloadCommand": {
            "type": "string"
          },
          "unpackHint": {
            "type": "string"
          }
        },
        "additionalProperties": false
      }
    },
    "additionalProperties": true,
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
  },
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "effects": [
    {
      "kind": "none",
      "stateChanged": false,
      "description": "Reads state without changing Zotero-managed data."
    }
  ],
  "approvalContract": {
    "kind": "none",
    "timing": "none",
    "scope": "No Zotero UI approval; provider runtimes may still request their own permission."
  },
  "handleTransitions": [
    {
      "handle": "fileId",
      "direction": "consume",
      "required": true,
      "condition": "Required by the command invocation.",
      "lifetime": "caller-owned"
    }
  ],
  "recovery": [
    {
      "when": "The read fails or returns incomplete evidence.",
      "stateCheck": "none",
      "requiresHandles": [],
      "action": "Inspect the error and retry only when retryable is true.",
      "nextCommand": "surface describe"
    }
  ],
  "targets": [
    {
      "kind": "endpoint",
      "target": "GET /bridge/v1/files/{fileId}"
    }
  ],
  "operationalAliases": [
    "file download",
    "file",
    "download",
    "file_id",
    "FILE_ID",
    "output",
    "PATH",
    "force",
    "FORCE"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `file` `download`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Intent visibility: `visible`.
- Operational aliases: `file download`, `file`, `download`, `file_id`, `FILE_ID`, `output`, `PATH`, `force`, `FORCE`.

### Effects

```json
[
  {
    "kind": "none",
    "stateChanged": false,
    "description": "Reads state without changing Zotero-managed data."
  }
]
```

### Approval

```json
{
  "kind": "none",
  "timing": "none",
  "scope": "No Zotero UI approval; provider runtimes may still request their own permission."
}
```

### Handle transitions

```json
[
  {
    "handle": "fileId",
    "direction": "consume",
    "required": true,
    "condition": "Required by the command invocation.",
    "lifetime": "caller-owned"
  }
]
```

### Recovery

```json
[
  {
    "when": "The read fails or returns incomplete evidence.",
    "stateCheck": "none",
    "requiresHandles": [],
    "action": "Inspect the error and retry only when retryable is true.",
    "nextCommand": "surface describe"
  }
]
```

### Targets

```json
[
  {
    "kind": "endpoint",
    "target": "GET /bridge/v1/files/{fileId}"
  }
]
```
