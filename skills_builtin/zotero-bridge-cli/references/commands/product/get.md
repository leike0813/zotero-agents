# `zotero-bridge product get`

Read one normal Dashboard Product

## Usage

```console
zotero-bridge product get [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] PRODUCT_ID <PRODUCT_ID> [--cursor <CURSOR>] [--limit <LIMIT>]
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
| --cursor | cursor | option | no | — | CURSOR | no | — | — | Opaque continuation cursor |
| --limit | limit | option | no | — | LIMIT | no | — | — | Maximum number of entries (1-100) |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "product_id": {
      "type": "string",
      "description": "Dashboard Product id",
      "position": 1
    },
    "cursor": {
      "type": "string",
      "description": "Opaque continuation cursor"
    },
    "limit": {
      "type": "string",
      "description": "Maximum number of entries (1-100)"
    }
  },
  "required": [
    "product_id"
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
    "productId": {
      "type": "string"
    }
  },
  "required": [
    "productId"
  ],
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
      "description": "Result data owned by workflow_products.get.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed.",
      "properties": {
        "product": {
          "type": "object",
          "properties": {
            "assets": {
              "type": "array"
            }
          },
          "additionalProperties": true
        },
        "pagination": {
          "type": "object",
          "properties": {
            "assets": {
              "type": "object",
              "properties": {
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
              "additionalProperties": true
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

No structured-input example applies. Build argv from the parameter tables and confirm the command with `surface describe` before execution.

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

```json
{
  "command": "product get",
  "argv": [
    "product",
    "get"
  ],
  "summary": "Read one normal Dashboard Product",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "product_id": {
        "type": "string",
        "description": "Dashboard Product id",
        "position": 1
      },
      "cursor": {
        "type": "string",
        "description": "Opaque continuation cursor"
      },
      "limit": {
        "type": "string",
        "description": "Maximum number of entries (1-100)"
      }
    },
    "required": [
      "product_id"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "product_id",
      "kind": "positional",
      "token": "PRODUCT_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Dashboard Product id",
      "valueNames": [
        "PRODUCT_ID"
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
      "help": "Maximum number of entries (1-100)",
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
      "property": "product_id",
      "kind": "positional",
      "token": "PRODUCT_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "PRODUCT_ID"
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
      "productId": {
        "type": "string"
      }
    },
    "required": [
      "productId"
    ],
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
        "description": "Result data owned by workflow_products.get.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed.",
        "properties": {
          "product": {
            "type": "object",
            "properties": {
              "assets": {
                "type": "array"
              }
            },
            "additionalProperties": true
          },
          "pagination": {
            "type": "object",
            "properties": {
              "assets": {
                "type": "object",
                "properties": {
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
                "additionalProperties": true
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
    "strategy": "cursor",
    "section": "data.product.assets",
    "defaultLimit": 25,
    "maxLimit": 100,
    "cursorInput": "cursor",
    "continuation": [
      "data.pagination.assets.nextCursor",
      "data.pagination.assets.hasMore",
      "data.pagination.assets.returned",
      "data.pagination.assets.total",
      "data.pagination.assets.limit"
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
      "handle": "productId",
      "direction": "consume",
      "required": true,
      "condition": "Required by the command invocation.",
      "lifetime": "caller-owned"
    },
    {
      "handle": "productId",
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
      "kind": "capability",
      "target": "workflow_products.get"
    }
  ],
  "operationalAliases": [
    "product get",
    "product",
    "get",
    "product_id",
    "PRODUCT_ID",
    "cursor",
    "CURSOR",
    "limit",
    "LIMIT"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `product` `get`.
- Output boundary: `cursor`; governed details: {"strategy":"cursor","section":"data.product.assets","defaultLimit":25,"maxLimit":100,"cursorInput":"cursor","continuation":["data.pagination.assets.nextCursor","data.pagination.assets.hasMore","data.pagination.assets.returned","data.pagination.assets.total","data.pagination.assets.limit"]}.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Intent visibility: `visible`.
- Operational aliases: `product get`, `product`, `get`, `product_id`, `PRODUCT_ID`, `cursor`, `CURSOR`, `limit`, `LIMIT`.

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
    "handle": "productId",
    "direction": "consume",
    "required": true,
    "condition": "Required by the command invocation.",
    "lifetime": "caller-owned"
  },
  {
    "handle": "productId",
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
    "kind": "capability",
    "target": "workflow_products.get"
  }
]
```
