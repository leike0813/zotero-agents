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
  "type": "object",
  "properties": {
    "operation_id": {
      "type": "string",
      "description": "Operation id returned by or supplied to a state-changing command",
      "position": 1
    }
  },
  "required": [
    "operation_id"
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
    "operation_id": {
      "type": "string",
      "description": "Operation id returned by or supplied to a state-changing command"
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
    "schema": {
      "const": "host-bridge.operation-receipt.v1"
    },
    "operationId": {
      "type": "string"
    },
    "requestDigest": {
      "type": "string"
    },
    "attemptId": {
      "type": "string"
    },
    "method": {
      "type": "string"
    },
    "path": {
      "type": "string"
    },
    "state": {
      "enum": [
        "in_progress",
        "completed",
        "outcome_unknown"
      ]
    },
    "createdAt": {
      "type": "string"
    },
    "updatedAt": {
      "type": "string"
    },
    "retentionExpiresAt": {
      "type": "string"
    },
    "stateChange": {
      "enum": [
        "unchanged",
        "changed",
        "unknown"
      ]
    },
    "handleConsumption": {
      "enum": [
        "unconsumed",
        "consumed",
        "unknown"
      ]
    },
    "response": {
      "type": "object"
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
  "additionalProperties": false
}
```

## Examples

No structured-input example applies. Build argv from the parameter tables and confirm the command with `surface describe` before execution.

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

```json
{
  "command": "operation get",
  "argv": [
    "operation",
    "get"
  ],
  "summary": "Read one durable Zotero operation receipt",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "operation_id": {
        "type": "string",
        "description": "Operation id returned by or supplied to a state-changing command",
        "position": 1
      }
    },
    "required": [
      "operation_id"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "operation_id",
      "kind": "positional",
      "token": "OPERATION_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Operation id returned by or supplied to a state-changing command",
      "valueNames": [
        "OPERATION_ID"
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
      "property": "operation_id",
      "kind": "positional",
      "token": "OPERATION_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "OPERATION_ID"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "operation_id": {
        "type": "string",
        "description": "Operation id returned by or supplied to a state-changing command"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "schema": {
        "const": "host-bridge.operation-receipt.v1"
      },
      "operationId": {
        "type": "string"
      },
      "requestDigest": {
        "type": "string"
      },
      "attemptId": {
        "type": "string"
      },
      "method": {
        "type": "string"
      },
      "path": {
        "type": "string"
      },
      "state": {
        "enum": [
          "in_progress",
          "completed",
          "outcome_unknown"
        ]
      },
      "createdAt": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "retentionExpiresAt": {
        "type": "string"
      },
      "stateChange": {
        "enum": [
          "unchanged",
          "changed",
          "unknown"
        ]
      },
      "handleConsumption": {
        "enum": [
          "unconsumed",
          "consumed",
          "unknown"
        ]
      },
      "response": {
        "type": "object"
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
    "additionalProperties": false
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
      "handle": "operationId",
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
      "target": "GET /bridge/v1/operations/{operationId}"
    }
  ],
  "operationalAliases": [
    "operation get",
    "operation",
    "get",
    "operation_id",
    "OPERATION_ID"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `operation` `get`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Intent visibility: `visible`.
- Operational aliases: `operation get`, `operation`, `get`, `operation_id`, `OPERATION_ID`.

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
    "handle": "operationId",
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
    "target": "GET /bridge/v1/operations/{operationId}"
  }
]
```
