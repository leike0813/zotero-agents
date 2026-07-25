# `zotero-bridge library item search`

Search Zotero library items

## Usage

```console
zotero-bridge library item search [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --query <JSON_OR_FILE>
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
| --query | query | option | yes | — | JSON_OR_FILE | no | — | — | Bounded search query JSON object. Use inline JSON such as '{"text":"graph","limit":10}', a file path containing JSON, @file syntax, or '-' to read JSON from stdin. |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Bounded search query JSON object with text, limit, and libraryId"
    }
  },
  "required": [
    "query"
  ],
  "additionalProperties": false
}
```

## Structured input schemas

### `--query` (query)

Required: `true`.

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    },
    "limit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "libraryId": {
      "type": [
        "number",
        "string"
      ]
    }
  },
  "required": [
    "query"
  ],
  "additionalProperties": false
}
```

## Composed payload schema

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    },
    "limit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "libraryId": {
      "type": [
        "number",
        "string"
      ]
    }
  },
  "required": [
    "query"
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
      "description": "Result data owned by library.search_items.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed.",
      "properties": {
        "items": {
          "type": "array"
        },
        "truncated": {
          "type": "boolean"
        }
      }
    }
  },
  "additionalProperties": false
}
```

## Examples

### query: shape-only

Minimal JSON shape for --query.

```console
zotero-bridge library item search --query '{"query":"example"}'
```

Prerequisites:

- Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution.

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

```json
{
  "command": "library item search",
  "argv": [
    "library",
    "item",
    "search"
  ],
  "summary": "Search Zotero library items",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Bounded search query JSON object with text, limit, and libraryId"
      }
    },
    "required": [
      "query"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "query",
      "kind": "option",
      "token": "--query",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Bounded search query JSON object with text, limit, and libraryId",
      "longHelp": "Bounded search query JSON object. Use inline JSON such as '{\"text\":\"graph\",\"limit\":10}', a file path containing JSON, @file syntax, or '-' to read JSON from stdin.",
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
      "property": "query",
      "kind": "option",
      "token": "--query",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "inputSchemas": {
    "query": {
      "token": "--query",
      "required": true,
      "requiredWhen": [],
      "schema": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "minLength": 1,
            "maxLength": 500
          },
          "limit": {
            "type": [
              "number",
              "string"
            ],
            "minimum": 1
          },
          "libraryId": {
            "type": [
              "number",
              "string"
            ]
          }
        },
        "required": [
          "query"
        ],
        "additionalProperties": false
      },
      "examples": [
        {
          "kind": "shape-only",
          "value": {
            "query": "example"
          },
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "description": "Minimal JSON shape for --query."
        }
      ]
    }
  },
  "payloadSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "minLength": 1,
        "maxLength": 500
      },
      "limit": {
        "type": [
          "number",
          "string"
        ],
        "minimum": 1
      },
      "libraryId": {
        "type": [
          "number",
          "string"
        ]
      }
    },
    "required": [
      "query"
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
        "description": "Result data owned by library.search_items.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed.",
        "properties": {
          "items": {
            "type": "array"
          },
          "truncated": {
            "type": "boolean"
          }
        }
      }
    },
    "additionalProperties": false
  },
  "outputBoundary": {
    "strategy": "limit",
    "section": "data.items",
    "defaultLimit": 25,
    "maxLimit": 100,
    "truncatedField": "data.truncated"
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
      "target": "library.search_items"
    }
  ],
  "operationalAliases": [
    "library item search",
    "library",
    "item",
    "search",
    "query",
    "JSON_OR_FILE"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `library` `item` `search`.
- Output boundary: `limit`; governed details: {"strategy":"limit","section":"data.items","defaultLimit":25,"maxLimit":100,"truncatedField":"data.truncated"}.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Intent visibility: `visible`.
- Operational aliases: `library item search`, `library`, `item`, `search`, `query`, `JSON_OR_FILE`.

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
    "target": "library.search_items"
  }
]
```
