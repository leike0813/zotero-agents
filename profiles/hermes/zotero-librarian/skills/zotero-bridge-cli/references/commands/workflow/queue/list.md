# `zotero-bridge workflow queue list`

List pending Zotero-managed workflow queue units

## Usage

```console
zotero-bridge workflow queue list [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--backend-type <BACKEND_TYPE>] [--backend <BACKEND>] [--cursor <CURSOR>] [--limit <LIMIT>]
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
| --backend-type | backend_type | option | no | — | BACKEND_TYPE | no | — | — | Filter by backend type: acp or skillrunner |
| --backend | backend | option | no | — | BACKEND | no | — | — | Filter by backend id |
| --cursor | cursor | option | no | — | CURSOR | no | — | — | Opaque continuation cursor |
| --limit | limit | option | no | — | LIMIT | no | — | — | Maximum number of queue units (1-100) |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "backend-type": {
      "type": "string",
      "description": "Filter by backend type: acp or skillrunner"
    },
    "backend": {
      "type": "string",
      "description": "Filter by backend id"
    },
    "cursor": {
      "type": "string",
      "description": "Opaque continuation cursor"
    },
    "limit": {
      "type": "string",
      "description": "Maximum number of queue units (1-100)"
    }
  },
  "required": [],
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
    "backend_type": {
      "type": "string",
      "description": "Filter by backend type: acp or skillrunner"
    },
    "backend": {
      "type": "string",
      "description": "Filter by backend id"
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
    "units": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "queueId": {
            "type": "string"
          },
          "submissionId": {
            "type": "string"
          },
          "unitId": {
            "type": "string"
          },
          "taskName": {
            "type": "string"
          },
          "memberCount": {
            "type": "integer"
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
          "canCancel": {
            "const": true
          }
        },
        "required": [
          "queueId",
          "submissionId",
          "unitId",
          "taskName",
          "memberCount",
          "backendType",
          "backendId",
          "canCancel"
        ],
        "additionalProperties": true
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
    "total": {
      "type": "integer",
      "minimum": 0
    },
    "limit": {
      "type": "integer",
      "minimum": 0
    }
  },
  "required": [
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
  "command": "workflow queue list",
  "argv": [
    "workflow",
    "queue",
    "list"
  ],
  "summary": "List pending Zotero-managed workflow queue units",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "backend-type": {
        "type": "string",
        "description": "Filter by backend type: acp or skillrunner"
      },
      "backend": {
        "type": "string",
        "description": "Filter by backend id"
      },
      "cursor": {
        "type": "string",
        "description": "Opaque continuation cursor"
      },
      "limit": {
        "type": "string",
        "description": "Maximum number of queue units (1-100)"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "backend_type",
      "kind": "option",
      "token": "--backend-type",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Filter by backend type: acp or skillrunner",
      "valueNames": [
        "BACKEND_TYPE"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "backend",
      "kind": "option",
      "token": "--backend",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Filter by backend id",
      "valueNames": [
        "BACKEND"
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
      "help": "Opaque continuation cursor",
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
      "help": "Maximum number of queue units (1-100)",
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
      "property": "backend-type",
      "kind": "option",
      "token": "--backend-type",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "BACKEND_TYPE"
      ]
    },
    {
      "property": "backend",
      "kind": "option",
      "token": "--backend",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "BACKEND"
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
      "backend_type": {
        "type": "string",
        "description": "Filter by backend type: acp or skillrunner"
      },
      "backend": {
        "type": "string",
        "description": "Filter by backend id"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "units": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "queueId": {
              "type": "string"
            },
            "submissionId": {
              "type": "string"
            },
            "unitId": {
              "type": "string"
            },
            "taskName": {
              "type": "string"
            },
            "memberCount": {
              "type": "integer"
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
            "canCancel": {
              "const": true
            }
          },
          "required": [
            "queueId",
            "submissionId",
            "unitId",
            "taskName",
            "memberCount",
            "backendType",
            "backendId",
            "canCancel"
          ],
          "additionalProperties": true
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
      "total": {
        "type": "integer",
        "minimum": 0
      },
      "limit": {
        "type": "integer",
        "minimum": 0
      }
    },
    "required": [
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
      "handle": "queueId",
      "direction": "produce",
      "required": false,
      "condition": "Returned when the corresponding operation succeeds.",
      "lifetime": "response"
    },
    {
      "handle": "submissionId",
      "direction": "produce",
      "required": false,
      "condition": "Returned when the corresponding operation succeeds.",
      "lifetime": "response"
    }
  ],
  "recovery": [
    {
      "when": "The read fails or returns incomplete evidence.",
      "stateCheck": "command-result",
      "requiresHandles": [],
      "action": "Inspect the error and retry only when retryable is true.",
      "nextCommand": "surface describe"
    }
  ],
  "targets": [
    {
      "kind": "endpoint",
      "target": "GET /bridge/v1/workflows/queue"
    }
  ],
  "operationalAliases": [
    "workflow queue list",
    "workflow",
    "queue",
    "list",
    "backend_type",
    "backend-type",
    "BACKEND_TYPE",
    "backend",
    "BACKEND",
    "cursor",
    "CURSOR",
    "limit",
    "LIMIT"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `workflow` `queue` `list`.
- Output boundary: `cursor`; governed details: {"strategy":"cursor","section":"units","defaultLimit":25,"maxLimit":100,"cursorInput":"cursor","continuation":["nextCursor","hasMore","returned","total","limit"]}.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Intent visibility: `visible`.
- Operational aliases: `workflow queue list`, `workflow`, `queue`, `list`, `backend_type`, `backend-type`, `BACKEND_TYPE`, `backend`, `BACKEND`, `cursor`, `CURSOR`, `limit`, `LIMIT`.

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
    "handle": "queueId",
    "direction": "produce",
    "required": false,
    "condition": "Returned when the corresponding operation succeeds.",
    "lifetime": "response"
  },
  {
    "handle": "submissionId",
    "direction": "produce",
    "required": false,
    "condition": "Returned when the corresponding operation succeeds.",
    "lifetime": "response"
  }
]
```

### Recovery

```json
[
  {
    "when": "The read fails or returns incomplete evidence.",
    "stateCheck": "command-result",
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
    "target": "GET /bridge/v1/workflows/queue"
  }
]
```
