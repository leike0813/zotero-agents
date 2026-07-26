# `zotero-bridge workflow submission get`

Read one active Zotero-managed workflow submission

## Usage

```console
zotero-bridge workflow submission get [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] SUBMISSION_ID <SUBMISSION_ID> [--cursor <CURSOR>] [--limit <LIMIT>]
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
| SUBMISSION_ID | submission_id | positional | yes | — | SUBMISSION_ID | no | — | — | Opaque submission id returned by workflow submit |
| --cursor | cursor | option | no | — | CURSOR | no | — | — | Opaque continuation cursor for submission units |
| --limit | limit | option | no | — | LIMIT | no | — | — | Maximum number of submission units (1-100) |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "submission_id": {
      "type": "string",
      "description": "Opaque submission id returned by workflow submit",
      "position": 1
    },
    "cursor": {
      "type": "string",
      "description": "Opaque continuation cursor for submission units"
    },
    "limit": {
      "type": "string",
      "description": "Maximum number of submission units (1-100)"
    }
  },
  "required": [
    "submission_id"
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
    "submission_id": {
      "type": "string",
      "description": "Opaque submission id returned by workflow submit"
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
    "submissionId": {
      "type": "string"
    },
    "workflowId": {
      "type": "string"
    },
    "workflowLabel": {
      "type": "string"
    },
    "backendType": {
      "enum": [
        "acp",
        "skillrunner"
      ]
    },
    "backendId": {
      "type": "string"
    },
    "total": {
      "type": "integer"
    },
    "initiallySkipped": {
      "type": "integer"
    },
    "pending": {
      "type": "integer"
    },
    "admitted": {
      "type": "integer"
    },
    "settled": {
      "type": "integer"
    },
    "units": {
      "type": "array",
      "items": {
        "type": "object"
      }
    },
    "nextCursor": {
      "type": [
        "string",
        "null"
      ]
    },
    "hasMore": {
      "type": "boolean"
    },
    "returned": {
      "type": "integer",
      "minimum": 0
    },
    "limit": {
      "type": "integer",
      "minimum": 0
    }
  },
  "required": [
    "submissionId",
    "workflowId",
    "backendType",
    "backendId",
    "total",
    "pending",
    "admitted",
    "settled",
    "units"
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
  "command": "workflow submission get",
  "argv": [
    "workflow",
    "submission",
    "get"
  ],
  "summary": "Read one active Zotero-managed workflow submission",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "submission_id": {
        "type": "string",
        "description": "Opaque submission id returned by workflow submit",
        "position": 1
      },
      "cursor": {
        "type": "string",
        "description": "Opaque continuation cursor for submission units"
      },
      "limit": {
        "type": "string",
        "description": "Maximum number of submission units (1-100)"
      }
    },
    "required": [
      "submission_id"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "submission_id",
      "kind": "positional",
      "token": "SUBMISSION_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Opaque submission id returned by workflow submit",
      "valueNames": [
        "SUBMISSION_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "cursor",
      "kind": "option",
      "token": "--cursor",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Opaque continuation cursor for submission units",
      "valueNames": [
        "CURSOR"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "limit",
      "kind": "option",
      "token": "--limit",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Maximum number of submission units (1-100)",
      "valueNames": [
        "LIMIT"
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
      "property": "submission_id",
      "kind": "positional",
      "token": "SUBMISSION_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "SUBMISSION_ID"
      ]
    },
    {
      "property": "cursor",
      "kind": "option",
      "token": "--cursor",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "CURSOR"
      ]
    },
    {
      "property": "limit",
      "kind": "option",
      "token": "--limit",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "LIMIT"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "submission_id": {
        "type": "string",
        "description": "Opaque submission id returned by workflow submit"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "submissionId": {
        "type": "string"
      },
      "workflowId": {
        "type": "string"
      },
      "workflowLabel": {
        "type": "string"
      },
      "backendType": {
        "enum": [
          "acp",
          "skillrunner"
        ]
      },
      "backendId": {
        "type": "string"
      },
      "total": {
        "type": "integer"
      },
      "initiallySkipped": {
        "type": "integer"
      },
      "pending": {
        "type": "integer"
      },
      "admitted": {
        "type": "integer"
      },
      "settled": {
        "type": "integer"
      },
      "units": {
        "type": "array",
        "items": {
          "type": "object"
        }
      },
      "nextCursor": {
        "type": [
          "string",
          "null"
        ]
      },
      "hasMore": {
        "type": "boolean"
      },
      "returned": {
        "type": "integer",
        "minimum": 0
      },
      "limit": {
        "type": "integer",
        "minimum": 0
      }
    },
    "required": [
      "submissionId",
      "workflowId",
      "backendType",
      "backendId",
      "total",
      "pending",
      "admitted",
      "settled",
      "units"
    ],
    "additionalProperties": false
  },
  "outputBoundary": {
    "strategy": "cursor",
    "section": "units",
    "defaultLimit": 25,
    "maxLimit": 100,
    "cursorInput": "cursor",
    "continuation": [
      "nextCursor",
      "hasMore",
      "returned",
      "total",
      "limit"
    ]
  },
  "pagination": "cursor",
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
      "handle": "submissionId",
      "direction": "consume",
      "required": true,
      "condition": "Required to inspect one active pending/admitted Host submission.",
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
      "target": "GET /bridge/v1/workflows/submissions/{submissionId}"
    }
  ],
  "operationalAliases": [
    "workflow submission get",
    "workflow",
    "submission",
    "get",
    "submission_id",
    "SUBMISSION_ID",
    "cursor",
    "CURSOR",
    "limit",
    "LIMIT"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `workflow` `submission` `get`.
- Output boundary: `cursor`; governed details: {"strategy":"cursor","section":"units","defaultLimit":25,"maxLimit":100,"cursorInput":"cursor","continuation":["nextCursor","hasMore","returned","total","limit"]}.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Intent visibility: `visible`.
- Operational aliases: `workflow submission get`, `workflow`, `submission`, `get`, `submission_id`, `SUBMISSION_ID`, `cursor`, `CURSOR`, `limit`, `LIMIT`.

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
    "handle": "submissionId",
    "direction": "consume",
    "required": true,
    "condition": "Required to inspect one active pending/admitted Host submission.",
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
    "target": "GET /bridge/v1/workflows/submissions/{submissionId}"
  }
]
```
