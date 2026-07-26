# `zotero-bridge debug synthesis inspect-topic`

Inspect one debug Synthesis topic

## Usage

```console
zotero-bridge debug synthesis inspect-topic [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--input <JSON_OR_FILE>]
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
| --input | input | option | no | — | JSON_OR_FILE | no | — | — | Debug capability input as inline JSON, a file path, @file, or '-' for stdin |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "string",
      "description": "Debug capability input as inline JSON, a file path, @file, or '-' for stdin"
    }
  },
  "required": [],
  "additionalProperties": false
}
```

## Structured input schemas

### `--input` (input)

Required: `false`.

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "string",
      "description": "Debug capability input as inline JSON, a file path, @file, or '-' for stdin"
    }
  },
  "required": [],
  "additionalProperties": false
}
```

## Composed payload schema

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "string",
      "description": "Debug capability input as inline JSON, a file path, @file, or '-' for stdin"
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
    "capability": {
      "type": "string"
    },
    "approval": {
      "type": "object"
    },
    "data": {
      "type": "object",
      "description": "Result data owned by debug.synthesis.topic.inspect.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed.",
      "properties": {
        "discoveryHints": {
          "type": "array"
        },
        "truncated": {
          "type": "boolean"
        },
        "delivery": {
          "type": "object",
          "properties": {
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
                  "type": "integer",
                  "minimum": 0
                },
                "sha256": {
                  "type": "string"
                },
                "expiresAt": {
                  "type": "string"
                }
              },
              "required": [
                "fileId",
                "displayName",
                "contentType",
                "expiresAt"
              ],
              "additionalProperties": false
            }
          },
          "additionalProperties": true
        }
      }
    }
  },
  "additionalProperties": false
}
```

## Examples

### input: shape-only

Minimal JSON shape for --input.

```console
zotero-bridge debug synthesis inspect-topic --input '{}'
```

Prerequisites:

- Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution.

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

```json
{
  "command": "debug synthesis inspect-topic",
  "argv": [
    "debug",
    "synthesis",
    "inspect-topic"
  ],
  "summary": "Inspect one debug Synthesis topic",
  "category": "debug",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "Debug capability input as inline JSON, a file path, @file, or '-' for stdin"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "input",
      "kind": "option",
      "token": "--input",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Debug capability input as inline JSON, a file path, @file, or '-' for stdin",
      "valueNames": [
        "JSON_OR_FILE"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    }
  ],
  "argvBindings": [
    {
      "property": "input",
      "kind": "option",
      "token": "--input",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "inputSchemas": {
    "input": {
      "token": "--input",
      "required": false,
      "requiredWhen": [],
      "schema": {
        "type": "object",
        "properties": {
          "input": {
            "type": "string",
            "description": "Debug capability input as inline JSON, a file path, @file, or '-' for stdin"
          }
        },
        "required": [],
        "additionalProperties": false
      },
      "examples": [
        {
          "kind": "shape-only",
          "value": {},
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "description": "Minimal JSON shape for --input."
        }
      ]
    }
  },
  "payloadSchema": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "Debug capability input as inline JSON, a file path, @file, or '-' for stdin"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "capability": {
        "type": "string"
      },
      "approval": {
        "type": "object"
      },
      "data": {
        "type": "object",
        "description": "Result data owned by debug.synthesis.topic.inspect.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed.",
        "properties": {
          "discoveryHints": {
            "type": "array"
          },
          "truncated": {
            "type": "boolean"
          },
          "delivery": {
            "type": "object",
            "properties": {
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
                    "type": "integer",
                    "minimum": 0
                  },
                  "sha256": {
                    "type": "string"
                  },
                  "expiresAt": {
                    "type": "string"
                  }
                },
                "required": [
                  "fileId",
                  "displayName",
                  "contentType",
                  "expiresAt"
                ],
                "additionalProperties": false
              }
            },
            "additionalProperties": true
          }
        }
      }
    },
    "additionalProperties": false
  },
  "outputBoundary": {
    "strategy": "limit",
    "section": "data.discoveryHints",
    "defaultLimit": 25,
    "maxLimit": 100,
    "truncatedField": "data.truncated",
    "fileField": "data.delivery.bundle"
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
  "handleTransitions": [],
  "recovery": [
    {
      "when": "The operation fails or completion is uncertain.",
      "stateCheck": "none",
      "requiresHandles": [],
      "action": "Inspect stateChange and handleConsumption before repeating the operation.",
      "nextCommand": "surface describe"
    }
  ],
  "targets": [
    {
      "kind": "capability",
      "target": "debug.synthesis.topic.inspect"
    }
  ],
  "operationalAliases": [
    "debug synthesis inspect-topic",
    "debug",
    "synthesis",
    "inspect-topic",
    "input",
    "JSON_OR_FILE"
  ],
  "hiddenFromIntentSearch": true
}
```

## Operational contract

- Canonical argv path: `debug` `synthesis` `inspect-topic`.
- Output boundary: `limit`; governed details: {"strategy":"limit","section":"data.discoveryHints","defaultLimit":25,"maxLimit":100,"truncatedField":"data.truncated","fileField":"data.delivery.bundle"}.
- Pagination: `none`.
- Category: `debug`; danger: `none`.
- Intent visibility: `hidden`.
- Operational aliases: `debug synthesis inspect-topic`, `debug`, `synthesis`, `inspect-topic`, `input`, `JSON_OR_FILE`.

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
]
```

### Recovery

```json
[
  {
    "when": "The operation fails or completion is uncertain.",
    "stateCheck": "none",
    "requiresHandles": [],
    "action": "Inspect stateChange and handleConsumption before repeating the operation.",
    "nextCommand": "surface describe"
  }
]
```

### Targets

```json
[
  {
    "kind": "capability",
    "target": "debug.synthesis.topic.inspect"
  }
]
```
