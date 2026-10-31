# `zotero-bridge acquisition navigate`

acquisition navigate

## Usage

```console
zotero-bridge acquisition navigate [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--input <JSON_OR_FILE>]
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
| --input | input | option | no | — | JSON_OR_FILE | no | — | — | Acquisition input JSON |

## Invocation schema

```json
{
  "additionalProperties": false,
  "properties": {
    "input": {
      "description": "Acquisition input JSON",
      "type": "string"
    }
  },
  "required": [],
  "type": "object"
}
```

## Structured input schemas

### `--input` (input)

Required: `false`.

```json
{
  "additionalProperties": false,
  "properties": {
    "authentication": {
      "type": "boolean"
    },
    "pageRef": {
      "maxLength": 160,
      "minLength": 1,
      "type": "string"
    },
    "url": {
      "maxLength": 4096,
      "pattern": "^https?://",
      "type": "string"
    }
  },
  "required": [
    "pageRef",
    "url"
  ],
  "type": "object"
}
```

## Composed payload schema

```json
{
  "additionalProperties": false,
  "properties": {
    "authentication": {
      "type": "boolean"
    },
    "pageRef": {
      "maxLength": 160,
      "minLength": 1,
      "type": "string"
    },
    "url": {
      "maxLength": 4096,
      "pattern": "^https?://",
      "type": "string"
    }
  },
  "required": [
    "pageRef",
    "url"
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
      "const": "acquisition.navigate"
    },
    "data": {
      "additionalProperties": false,
      "properties": {
        "pageRef": {
          "maxLength": 160,
          "minLength": 1,
          "type": "string"
        },
        "sessionRef": {
          "maxLength": 160,
          "minLength": 1,
          "type": "string"
        },
        "state": {
          "enum": [
            "loading",
            "ready",
            "awaiting_user",
            "closed",
            "timed_out",
            "released",
            "failed"
          ]
        }
      },
      "required": [
        "sessionRef",
        "pageRef",
        "state"
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

### input: shape-only

Governed shape-only example for --input.

```console
zotero-bridge acquisition navigate --input '{"pageRef":"page-1","url":"https://example.org/article"}'
```

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

```json
{
  "approvalContract": {
    "kind": "none",
    "scope": "The Host live task grant authorizes this command; this is not write approval.",
    "timing": "none"
  },
  "arguments": [
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Acquisition input JSON",
      "id": "input",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--input",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "argv": [
    "acquisition",
    "navigate"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "input",
      "required": false,
      "takesValue": true,
      "token": "--input",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "binding": "passthrough",
  "category": "navigation",
  "command": "acquisition navigate",
  "composition": null,
  "danger": "none",
  "effects": [
    {
      "description": "Navigates a task-owned page; an explicit authentication wait can time out and release task-owned page resources.",
      "kind": "ui-navigation",
      "stateChanged": true
    }
  ],
  "handleTransitions": [
    {
      "condition": "Navigates the task-owned page represented by pageRef.",
      "direction": "consume",
      "handle": "pageRef",
      "lifetime": "short-lived",
      "required": true
    }
  ],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {
    "input": {
      "examples": [
        {
          "kind": "shape-only",
          "prerequisites": [],
          "value": {
            "pageRef": "page-1",
            "url": "https://example.org/article"
          }
        }
      ],
      "required": false,
      "requiredWhen": [],
      "schema": {
        "additionalProperties": false,
        "properties": {
          "authentication": {
            "type": "boolean"
          },
          "pageRef": {
            "maxLength": 160,
            "minLength": 1,
            "type": "string"
          },
          "url": {
            "maxLength": 4096,
            "pattern": "^https?://",
            "type": "string"
          }
        },
        "required": [
          "pageRef",
          "url"
        ],
        "type": "object"
      },
      "schemaSource": "target-capability",
      "token": "--input"
    }
  },
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "input": {
        "description": "Acquisition input JSON",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "operationalAliases": [
    "acquisition navigate"
  ],
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "authentication": {
        "type": "boolean"
      },
      "pageRef": {
        "maxLength": 160,
        "minLength": 1,
        "type": "string"
      },
      "url": {
        "maxLength": 4096,
        "pattern": "^https?://",
        "type": "string"
      }
    },
    "required": [
      "pageRef",
      "url"
    ],
    "type": "object"
  },
  "recovery": [
    {
      "action": "Treat the current authentication wait as ended and inspect task state before an explicit retry. Do not automatically replay navigation or restart authentication.",
      "requiresHandles": [
        "pageRef"
      ],
      "stateCheck": "caller-held-handle",
      "when": "Authentication times out, completion is unknown, or pageRef/sessionRef is invalid."
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
        "const": "acquisition.navigate"
      },
      "data": {
        "additionalProperties": false,
        "properties": {
          "pageRef": {
            "maxLength": 160,
            "minLength": 1,
            "type": "string"
          },
          "sessionRef": {
            "maxLength": 160,
            "minLength": 1,
            "type": "string"
          },
          "state": {
            "enum": [
              "loading",
              "ready",
              "awaiting_user",
              "closed",
              "timed_out",
              "released",
              "failed"
            ]
          }
        },
        "required": [
          "sessionRef",
          "pageRef",
          "state"
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
  "summary": "acquisition navigate",
  "targets": [
    {
      "kind": "capability",
      "target": "acquisition.navigate"
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

- Canonical argv path: `acquisition` `navigate`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `navigation`; danger: `none`.
- Structured binding mode: `passthrough`.
- Intent visibility: `visible`.
- Operational aliases: `acquisition navigate`.

### Effects

```json
[
  {
    "description": "Navigates a task-owned page; an explicit authentication wait can time out and release task-owned page resources.",
    "kind": "ui-navigation",
    "stateChanged": true
  }
]
```

### Approval

```json
{
  "kind": "none",
  "scope": "The Host live task grant authorizes this command; this is not write approval.",
  "timing": "none"
}
```

### Handle transitions

```json
[
  {
    "condition": "Navigates the task-owned page represented by pageRef.",
    "direction": "consume",
    "handle": "pageRef",
    "lifetime": "short-lived",
    "required": true
  }
]
```

### Recovery

```json
[
  {
    "action": "Treat the current authentication wait as ended and inspect task state before an explicit retry. Do not automatically replay navigation or restart authentication.",
    "requiresHandles": [
      "pageRef"
    ],
    "stateCheck": "caller-held-handle",
    "when": "Authentication times out, completion is unknown, or pageRef/sessionRef is invalid."
  }
]
```

### Targets

```json
[
  {
    "kind": "capability",
    "target": "acquisition.navigate"
  }
]
```
