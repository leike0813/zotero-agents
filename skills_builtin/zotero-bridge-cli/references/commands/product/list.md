# `zotero-bridge product list`

List normal Dashboard Products

## Usage

```console
zotero-bridge product list [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--workflow-id <WORKFLOW_ID>] [--backend-id <BACKEND_ID>] [--request-id <REQUEST_ID>] [--cursor <CURSOR>] [--limit <LIMIT>]
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
| --workflow-id | workflow_id | option | no | — | WORKFLOW_ID | no | — | — | workflow_id |
| --backend-id | backend_id | option | no | — | BACKEND_ID | no | — | — | backend_id |
| --request-id | request_id | option | no | — | REQUEST_ID | no | — | — | request_id |
| --cursor | cursor | option | no | — | CURSOR | no | — | — | cursor |
| --limit | limit | option | no | — | LIMIT | no | — | — | limit |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "workflow-id": {
      "type": "string"
    },
    "backend-id": {
      "type": "string"
    },
    "request-id": {
      "type": "string"
    },
    "cursor": {
      "type": "string"
    },
    "limit": {
      "type": "string"
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
    "workflowId": {
      "type": "string"
    },
    "backendId": {
      "type": "string"
    },
    "requestId": {
      "type": "string"
    },
    "cursor": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 0
    },
    "limit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
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
      "description": "Result data owned by workflow_products.list.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed.",
      "properties": {
        "products": {
          "type": "array"
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
      }
    }
  },
  "additionalProperties": false
}
```

## Examples

No structured-input example applies. Build argv from the parameter tables and confirm the command with `surface describe` before execution.

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

```json
{
  "command": "product list",
  "argv": [
    "product",
    "list"
  ],
  "summary": "List normal Dashboard Products",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "workflow-id": {
        "type": "string"
      },
      "backend-id": {
        "type": "string"
      },
      "request-id": {
        "type": "string"
      },
      "cursor": {
        "type": "string"
      },
      "limit": {
        "type": "string"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "workflow_id",
      "kind": "option",
      "token": "--workflow-id",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "workflow_id",
      "valueNames": [
        "WORKFLOW_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "backend_id",
      "kind": "option",
      "token": "--backend-id",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "backend_id",
      "valueNames": [
        "BACKEND_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "request_id",
      "kind": "option",
      "token": "--request-id",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "request_id",
      "valueNames": [
        "REQUEST_ID"
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
      "help": "cursor",
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
      "help": "limit",
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
      "property": "workflow-id",
      "kind": "option",
      "token": "--workflow-id",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "WORKFLOW_ID"
      ]
    },
    {
      "property": "backend-id",
      "kind": "option",
      "token": "--backend-id",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "BACKEND_ID"
      ]
    },
    {
      "property": "request-id",
      "kind": "option",
      "token": "--request-id",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "REQUEST_ID"
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
      "workflowId": {
        "type": "string"
      },
      "backendId": {
        "type": "string"
      },
      "requestId": {
        "type": "string"
      },
      "cursor": {
        "type": [
          "number",
          "string"
        ],
        "minimum": 0
      },
      "limit": {
        "type": [
          "number",
          "string"
        ],
        "minimum": 1
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
        "description": "Result data owned by workflow_products.list.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed.",
        "properties": {
          "products": {
            "type": "array"
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
        }
      }
    },
    "additionalProperties": false
  },
  "outputBoundary": {
    "strategy": "cursor",
    "section": "data.products",
    "defaultLimit": 25,
    "maxLimit": 100,
    "cursorInput": "cursor",
    "continuation": [
      "data.nextCursor",
      "data.hasMore",
      "data.returned",
      "data.total",
      "data.limit"
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
  "handleTransitions": [],
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
      "kind": "capability",
      "target": "workflow_products.list"
    }
  ],
  "operationalAliases": [
    "product list",
    "product",
    "list",
    "workflow_id",
    "workflow-id",
    "WORKFLOW_ID",
    "backend_id",
    "backend-id",
    "BACKEND_ID",
    "request_id",
    "request-id",
    "REQUEST_ID",
    "cursor",
    "CURSOR",
    "limit",
    "LIMIT"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `product` `list`.
- Output boundary: `cursor`; governed details: {"strategy":"cursor","section":"data.products","defaultLimit":25,"maxLimit":100,"cursorInput":"cursor","continuation":["data.nextCursor","data.hasMore","data.returned","data.total","data.limit"]}.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Intent visibility: `visible`.
- Operational aliases: `product list`, `product`, `list`, `workflow_id`, `workflow-id`, `WORKFLOW_ID`, `backend_id`, `backend-id`, `BACKEND_ID`, `request_id`, `request-id`, `REQUEST_ID`, `cursor`, `CURSOR`, `limit`, `LIMIT`.

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
    "kind": "capability",
    "target": "workflow_products.list"
  }
]
```
