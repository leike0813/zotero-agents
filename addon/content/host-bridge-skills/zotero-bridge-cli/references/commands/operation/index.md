# `zotero-bridge operation get`

Read one durable Zotero operation receipt

## Usage

```console
zotero-bridge operation get [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] OPERATION_ID <OPERATION_ID>
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
| OPERATION_ID | operation_id | positional | yes | — | OPERATION_ID | no | — | — | Operation id returned by or supplied to a state-changing command |

## Invocation schema

```json
{
  "additionalProperties": false,
  "properties": {
    "operation_id": {
      "description": "Operation id returned by or supplied to a state-changing command",
      "position": 1,
      "type": "string"
    }
  },
  "required": [
    "operation_id"
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
    "operation_id": {
      "description": "Operation id returned by or supplied to a state-changing command",
      "type": "string"
    }
  },
  "required": [],
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
    "attemptId": {
      "type": "string"
    },
    "createdAt": {
      "type": "string"
    },
    "handleConsumption": {
      "enum": [
        "unconsumed",
        "consumed",
        "unknown"
      ]
    },
    "method": {
      "type": "string"
    },
    "operationId": {
      "type": "string"
    },
    "path": {
      "type": "string"
    },
    "requestDigest": {
      "type": "string"
    },
    "response": {
      "type": "object"
    },
    "retentionExpiresAt": {
      "type": "string"
    },
    "schema": {
      "const": "host-bridge.operation-receipt.v1"
    },
    "state": {
      "enum": [
        "in_progress",
        "completed",
        "outcome_unknown"
      ]
    },
    "stateChange": {
      "enum": [
        "unchanged",
        "changed",
        "unknown"
      ]
    },
    "updatedAt": {
      "type": "string"
    }
  },
  "required": [
    "schema",
    "operationId",
    "requestDigest",
    "attemptId",
    "method",
    "path",
    "state",
    "createdAt",
    "updatedAt",
    "retentionExpiresAt",
    "stateChange",
    "handleConsumption"
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
      "help": "Operation id returned by or supplied to a state-changing command",
      "id": "operation_id",
      "kind": "positional",
      "position": 1,
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "OPERATION_ID",
      "valueNames": [
        "OPERATION_ID"
      ]
    }
  ],
  "argv": [
    "operation",
    "get"
  ],
  "argvBindings": [
    {
      "kind": "positional",
      "position": 1,
      "property": "operation_id",
      "required": true,
      "takesValue": true,
      "token": "OPERATION_ID",
      "valueNames": [
        "OPERATION_ID"
      ]
    }
  ],
  "binding": "none",
  "category": "read",
  "command": "operation get",
  "composition": null,
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
      "handle": "operationId",
      "lifetime": "caller-owned",
      "required": true
    }
  ],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {},
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "operation_id": {
        "description": "Operation id returned by or supplied to a state-changing command",
        "position": 1,
        "type": "string"
      }
    },
    "required": [
      "operation_id"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "operation get",
    "operation",
    "get",
    "operation_id",
    "OPERATION_ID"
  ],
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "operation_id": {
        "description": "Operation id returned by or supplied to a state-changing command",
        "type": "string"
      }
    },
    "required": [],
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
      "attemptId": {
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "handleConsumption": {
        "enum": [
          "unconsumed",
          "consumed",
          "unknown"
        ]
      },
      "method": {
        "type": "string"
      },
      "operationId": {
        "type": "string"
      },
      "path": {
        "type": "string"
      },
      "requestDigest": {
        "type": "string"
      },
      "response": {
        "type": "object"
      },
      "retentionExpiresAt": {
        "type": "string"
      },
      "schema": {
        "const": "host-bridge.operation-receipt.v1"
      },
      "state": {
        "enum": [
          "in_progress",
          "completed",
          "outcome_unknown"
        ]
      },
      "stateChange": {
        "enum": [
          "unchanged",
          "changed",
          "unknown"
        ]
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "schema",
      "operationId",
      "requestDigest",
      "attemptId",
      "method",
      "path",
      "state",
      "createdAt",
      "updatedAt",
      "retentionExpiresAt",
      "stateChange",
      "handleConsumption"
    ],
    "type": "object"
  },
  "summary": "Read one durable Zotero operation receipt",
  "targets": [
    {
      "kind": "endpoint",
      "target": "GET /bridge/v2/operations/{operationId}"
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

- Canonical argv path: `operation` `get`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Structured binding mode: `none`.
- Intent visibility: `visible`.
- Operational aliases: `operation get`, `operation`, `get`, `operation_id`, `OPERATION_ID`.

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
    "handle": "operationId",
    "lifetime": "caller-owned",
    "required": true
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
    "stateCheck": "none",
    "when": "The read fails or returns incomplete evidence."
  }
]
```

### Targets

```json
[
  {
    "kind": "endpoint",
    "target": "GET /bridge/v2/operations/{operationId}"
  }
]
```
