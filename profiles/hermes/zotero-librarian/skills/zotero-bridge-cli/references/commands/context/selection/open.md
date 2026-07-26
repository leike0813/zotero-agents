# `zotero-bridge context selection open`

Open one or more Zotero items as the active selection

## Usage

```console
zotero-bridge context selection open [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] ITEM_REFS <ITEM_REFS> [--cursor <CURSOR>] [--limit <LIMIT>]
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
| ITEM_REFS | item_refs | positional | yes | — | ITEM_REFS; numArgs: 1.. | yes | — | — | Zotero item refs |
| --cursor | cursor | option | no | — | CURSOR | no | — | — | Opaque continuation cursor |
| --limit | limit | option | no | — | LIMIT | no | — | — | Maximum number of entries (1-100) |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "item_refs": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Zotero item refs",
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
    "item_refs"
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
    "item_refs": {
      "type": "string",
      "description": "Zotero item refs"
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
    "response": {
      "type": "object",
      "description": "Response object returned by POST /bridge/v1/context/selection/open.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
    },
    "target": {
      "type": "object",
      "properties": {
        "items": {
          "type": "array"
        }
      },
      "additionalProperties": true
    },
    "pagination": {
      "type": "object",
      "properties": {
        "items": {
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
  "command": "context selection open",
  "argv": [
    "context",
    "selection",
    "open"
  ],
  "summary": "Open one or more Zotero items as the active selection",
  "category": "navigation",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "item_refs": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Zotero item refs",
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
      "item_refs"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "item_refs",
      "kind": "positional",
      "token": "ITEM_REFS",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Zotero item refs",
      "valueNames": [
        "ITEM_REFS"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": true,
      "numArgs": "1..",
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
      "property": "item_refs",
      "kind": "positional",
      "token": "ITEM_REFS",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "ITEM_REFS"
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
      "item_refs": {
        "type": "string",
        "description": "Zotero item refs"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "response": {
        "type": "object",
        "description": "Response object returned by POST /bridge/v1/context/selection/open.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
      },
      "target": {
        "type": "object",
        "properties": {
          "items": {
            "type": "array"
          }
        },
        "additionalProperties": true
      },
      "pagination": {
        "type": "object",
        "properties": {
          "items": {
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
    },
    "additionalProperties": true,
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
  },
  "outputBoundary": {
    "strategy": "cursor",
    "section": "target.items",
    "defaultLimit": 25,
    "maxLimit": 100,
    "cursorInput": "cursor",
    "continuation": [
      "pagination.items.nextCursor",
      "pagination.items.hasMore",
      "pagination.items.returned",
      "pagination.items.total",
      "pagination.items.limit"
    ]
  },
  "pagination": "cursor",
  "effects": [
    {
      "kind": "ui-navigation",
      "stateChanged": true,
      "description": "May change ui navigation state."
    }
  ],
  "approvalContract": {
    "kind": "none",
    "timing": "none",
    "scope": "No Zotero UI approval; provider runtimes may still request their own permission."
  },
  "handleTransitions": [
    {
      "handle": "itemRef",
      "direction": "consume",
      "required": true,
      "condition": "Required by the command invocation.",
      "lifetime": "caller-owned"
    }
  ],
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
      "kind": "endpoint",
      "target": "POST /bridge/v1/context/selection/open"
    }
  ],
  "operationalAliases": [
    "context selection open",
    "context",
    "selection",
    "open",
    "item_refs",
    "ITEM_REFS",
    "cursor",
    "CURSOR",
    "limit",
    "LIMIT"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `context` `selection` `open`.
- Output boundary: `cursor`; governed details: {"strategy":"cursor","section":"target.items","defaultLimit":25,"maxLimit":100,"cursorInput":"cursor","continuation":["pagination.items.nextCursor","pagination.items.hasMore","pagination.items.returned","pagination.items.total","pagination.items.limit"]}.
- Pagination: `cursor`.
- Category: `navigation`; danger: `review`.
- Intent visibility: `visible`.
- Operational aliases: `context selection open`, `context`, `selection`, `open`, `item_refs`, `ITEM_REFS`, `cursor`, `CURSOR`, `limit`, `LIMIT`.

### Effects

```json
[
  {
    "kind": "ui-navigation",
    "stateChanged": true,
    "description": "May change ui navigation state."
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
    "handle": "itemRef",
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
    "kind": "endpoint",
    "target": "POST /bridge/v1/context/selection/open"
  }
]
```
