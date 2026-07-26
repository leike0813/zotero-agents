# `zotero-bridge run recent`

List lightweight recent workflow runtime tasks

## Usage

```console
zotero-bridge run recent [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--workflow <WORKFLOW>] [--backend <BACKEND>] [--state <STATE>] [--limit <LIMIT>] [--cursor <CURSOR>]
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
| --workflow | workflow | option | no | — | WORKFLOW | no | — | — | Filter by workflow id |
| --backend | backend | option | no | — | BACKEND | no | — | — | Filter by backend id |
| --state | state | option | no | — | STATE | no | — | — | Filter by task state |
| --limit | limit | option | no | — | LIMIT | no | — | — | Maximum number of tasks |
| --cursor | cursor | option | no | — | CURSOR | no | — | — | Opaque continuation cursor |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "workflow": {
      "type": "string",
      "description": "Filter by workflow id"
    },
    "backend": {
      "type": "string",
      "description": "Filter by backend id"
    },
    "state": {
      "type": "string",
      "description": "Filter by task state"
    },
    "limit": {
      "type": "string",
      "description": "Maximum number of tasks"
    },
    "cursor": {
      "type": "string",
      "description": "Opaque continuation cursor"
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
    "workflow": {
      "type": "string",
      "description": "Filter by workflow id"
    },
    "backend": {
      "type": "string",
      "description": "Filter by backend id"
    },
    "state": {
      "type": "string",
      "description": "Filter by task state"
    },
    "limit": {
      "type": "string",
      "description": "Maximum number of tasks"
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
    "items": {
      "type": "array"
    },
    "nextCursor": {
      "type": [
        "string",
        "number",
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
  "command": "run recent",
  "argv": [
    "run",
    "recent"
  ],
  "summary": "List lightweight recent workflow runtime tasks",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "workflow": {
        "type": "string",
        "description": "Filter by workflow id"
      },
      "backend": {
        "type": "string",
        "description": "Filter by backend id"
      },
      "state": {
        "type": "string",
        "description": "Filter by task state"
      },
      "limit": {
        "type": "string",
        "description": "Maximum number of tasks"
      },
      "cursor": {
        "type": "string",
        "description": "Opaque continuation cursor"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "workflow",
      "kind": "option",
      "token": "--workflow",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Filter by workflow id",
      "valueNames": [
        "WORKFLOW"
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
      "id": "state",
      "kind": "option",
      "token": "--state",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Filter by task state",
      "valueNames": [
        "STATE"
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
      "help": "Maximum number of tasks",
      "valueNames": [
        "LIMIT"
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
    }
  ],
  "argvBindings": [
    {
      "property": "workflow",
      "kind": "option",
      "token": "--workflow",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "WORKFLOW"
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
      "property": "state",
      "kind": "option",
      "token": "--state",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "STATE"
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
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "workflow": {
        "type": "string",
        "description": "Filter by workflow id"
      },
      "backend": {
        "type": "string",
        "description": "Filter by backend id"
      },
      "state": {
        "type": "string",
        "description": "Filter by task state"
      },
      "limit": {
        "type": "string",
        "description": "Maximum number of tasks"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array"
      },
      "nextCursor": {
        "type": [
          "string",
          "number",
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
    "additionalProperties": true,
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
  },
  "outputBoundary": {
    "strategy": "cursor",
    "section": "items",
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
      "kind": "endpoint",
      "target": "GET /bridge/v1/tasks/recent"
    }
  ],
  "operationalAliases": [
    "run recent",
    "run",
    "recent",
    "workflow",
    "WORKFLOW",
    "backend",
    "BACKEND",
    "state",
    "STATE",
    "limit",
    "LIMIT",
    "cursor",
    "CURSOR"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `run` `recent`.
- Output boundary: `cursor`; governed details: {"strategy":"cursor","section":"items","defaultLimit":25,"maxLimit":100,"cursorInput":"cursor","continuation":["nextCursor","hasMore","returned","total","limit"]}.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Intent visibility: `visible`.
- Operational aliases: `run recent`, `run`, `recent`, `workflow`, `WORKFLOW`, `backend`, `BACKEND`, `state`, `STATE`, `limit`, `LIMIT`, `cursor`, `CURSOR`.

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
    "kind": "endpoint",
    "target": "GET /bridge/v1/tasks/recent"
  }
]
```
