# `zotero-bridge run list`

List active and recent workflow runtime tasks

## Usage

```console
zotero-bridge run list [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--workflow <WORKFLOW>] [--backend <BACKEND>] [--backend-type <BACKEND_TYPE>] [--request <REQUEST>] [--submission <SUBMISSION>] [--run <RUN>] [--state <STATE>] [--active-only] [--cursor <CURSOR>] [--limit <LIMIT>]
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
| --backend-type | backend_type | option | no | — | BACKEND_TYPE | no | — | — | Filter by backend type |
| --request | request | option | no | — | REQUEST | no | — | — | Filter by provider request id |
| --submission | submission | option | no | — | SUBMISSION | no | — | — | Filter by native workflow submission id |
| --run | run | option | no | — | RUN | no | — | — | Filter by workflow run id |
| --state | state | option | no | — | STATE | no | — | — | Filter by task state |
| --active-only | active_only | option | no | — | ACTIVE_ONLY; values: true, false | no | — | — | Only return active task runtime rows |
| --cursor | cursor | option | no | — | CURSOR | no | — | — | Opaque continuation cursor |
| --limit | limit | option | no | — | LIMIT | no | — | — | Maximum number of tasks (1-100) |

## Invocation schema

```json
{
  "additionalProperties": false,
  "properties": {
    "active-only": {
      "description": "Only return active task runtime rows",
      "type": "boolean"
    },
    "backend": {
      "description": "Filter by backend id",
      "type": "string"
    },
    "backend-type": {
      "description": "Filter by backend type",
      "type": "string"
    },
    "cursor": {
      "description": "Opaque continuation cursor",
      "type": "string"
    },
    "limit": {
      "description": "Maximum number of tasks (1-100)",
      "type": "string"
    },
    "request": {
      "description": "Filter by provider request id",
      "type": "string"
    },
    "run": {
      "description": "Filter by workflow run id",
      "type": "string"
    },
    "state": {
      "description": "Filter by task state",
      "type": "string"
    },
    "submission": {
      "description": "Filter by native workflow submission id",
      "type": "string"
    },
    "workflow": {
      "description": "Filter by workflow id",
      "type": "string"
    }
  },
  "required": [],
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
    "backend": {
      "description": "Filter by backend id",
      "type": "string"
    },
    "backend_type": {
      "description": "Filter by backend type",
      "type": "string"
    },
    "request": {
      "description": "Filter by provider request id",
      "type": "string"
    },
    "run": {
      "description": "Filter by workflow run id",
      "type": "string"
    },
    "state": {
      "description": "Filter by task state",
      "type": "string"
    },
    "submission": {
      "description": "Filter by native workflow submission id",
      "type": "string"
    },
    "workflow": {
      "description": "Filter by workflow id",
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
  "additionalProperties": true,
  "properties": {
    "hasMore": {
      "type": "boolean"
    },
    "items": {
      "type": "array"
    },
    "limit": {
      "minimum": 0,
      "type": "integer"
    },
    "nextCursor": {
      "type": [
        "string",
        "number",
        "null"
      ]
    },
    "returned": {
      "minimum": 0,
      "type": "integer"
    },
    "total": {
      "minimum": 0,
      "type": "integer"
    }
  },
  "type": "object",
  "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
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
      "help": "Filter by workflow id",
      "id": "workflow",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--workflow",
      "valueNames": [
        "WORKFLOW"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Filter by backend id",
      "id": "backend",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--backend",
      "valueNames": [
        "BACKEND"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Filter by backend type",
      "id": "backend_type",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--backend-type",
      "valueNames": [
        "BACKEND_TYPE"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Filter by provider request id",
      "id": "request",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--request",
      "valueNames": [
        "REQUEST"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Filter by native workflow submission id",
      "id": "submission",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--submission",
      "valueNames": [
        "SUBMISSION"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Filter by workflow run id",
      "id": "run",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--run",
      "valueNames": [
        "RUN"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Filter by task state",
      "id": "state",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--state",
      "valueNames": [
        "STATE"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Only return active task runtime rows",
      "id": "active_only",
      "kind": "option",
      "possibleValues": [
        "true",
        "false"
      ],
      "repeatable": false,
      "required": false,
      "takesValue": false,
      "token": "--active-only",
      "valueNames": [
        "ACTIVE_ONLY"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Opaque continuation cursor",
      "id": "cursor",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--cursor",
      "valueNames": [
        "CURSOR"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Maximum number of tasks (1-100)",
      "id": "limit",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--limit",
      "valueNames": [
        "LIMIT"
      ]
    }
  ],
  "argv": [
    "run",
    "list"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "workflow",
      "required": false,
      "takesValue": true,
      "token": "--workflow",
      "valueNames": [
        "WORKFLOW"
      ]
    },
    {
      "kind": "option",
      "property": "backend",
      "required": false,
      "takesValue": true,
      "token": "--backend",
      "valueNames": [
        "BACKEND"
      ]
    },
    {
      "kind": "option",
      "property": "backend-type",
      "required": false,
      "takesValue": true,
      "token": "--backend-type",
      "valueNames": [
        "BACKEND_TYPE"
      ]
    },
    {
      "kind": "option",
      "property": "request",
      "required": false,
      "takesValue": true,
      "token": "--request",
      "valueNames": [
        "REQUEST"
      ]
    },
    {
      "kind": "option",
      "property": "submission",
      "required": false,
      "takesValue": true,
      "token": "--submission",
      "valueNames": [
        "SUBMISSION"
      ]
    },
    {
      "kind": "option",
      "property": "run",
      "required": false,
      "takesValue": true,
      "token": "--run",
      "valueNames": [
        "RUN"
      ]
    },
    {
      "kind": "option",
      "property": "state",
      "required": false,
      "takesValue": true,
      "token": "--state",
      "valueNames": [
        "STATE"
      ]
    },
    {
      "kind": "option",
      "property": "active-only",
      "required": false,
      "takesValue": false,
      "token": "--active-only",
      "valueNames": [
        "ACTIVE_ONLY"
      ]
    },
    {
      "kind": "option",
      "property": "cursor",
      "required": false,
      "takesValue": true,
      "token": "--cursor",
      "valueNames": [
        "CURSOR"
      ]
    },
    {
      "kind": "option",
      "property": "limit",
      "required": false,
      "takesValue": true,
      "token": "--limit",
      "valueNames": [
        "LIMIT"
      ]
    }
  ],
  "binding": "none",
  "category": "read",
  "command": "run list",
  "composition": null,
  "danger": "none",
  "effects": [
    {
      "description": "Reads state without changing Zotero-managed data.",
      "kind": "none",
      "stateChanged": false
    }
  ],
  "handleTransitions": [],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {},
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "active-only": {
        "description": "Only return active task runtime rows",
        "type": "boolean"
      },
      "backend": {
        "description": "Filter by backend id",
        "type": "string"
      },
      "backend-type": {
        "description": "Filter by backend type",
        "type": "string"
      },
      "cursor": {
        "description": "Opaque continuation cursor",
        "type": "string"
      },
      "limit": {
        "description": "Maximum number of tasks (1-100)",
        "type": "string"
      },
      "request": {
        "description": "Filter by provider request id",
        "type": "string"
      },
      "run": {
        "description": "Filter by workflow run id",
        "type": "string"
      },
      "state": {
        "description": "Filter by task state",
        "type": "string"
      },
      "submission": {
        "description": "Filter by native workflow submission id",
        "type": "string"
      },
      "workflow": {
        "description": "Filter by workflow id",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "operationalAliases": [
    "run list",
    "run",
    "list",
    "workflow",
    "WORKFLOW",
    "backend",
    "BACKEND",
    "backend_type",
    "backend-type",
    "BACKEND_TYPE",
    "request",
    "REQUEST",
    "submission",
    "SUBMISSION",
    "RUN",
    "state",
    "STATE",
    "active_only",
    "active-only",
    "ACTIVE_ONLY",
    "cursor",
    "CURSOR",
    "limit",
    "LIMIT"
  ],
  "outputBoundary": {
    "continuation": [
      "nextCursor",
      "hasMore",
      "returned",
      "total",
      "limit"
    ],
    "cursorInput": "cursor",
    "defaultLimit": 25,
    "maxLimit": 100,
    "section": "items",
    "strategy": "cursor"
  },
  "pagination": "cursor",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "backend": {
        "description": "Filter by backend id",
        "type": "string"
      },
      "backend_type": {
        "description": "Filter by backend type",
        "type": "string"
      },
      "request": {
        "description": "Filter by provider request id",
        "type": "string"
      },
      "run": {
        "description": "Filter by workflow run id",
        "type": "string"
      },
      "state": {
        "description": "Filter by task state",
        "type": "string"
      },
      "submission": {
        "description": "Filter by native workflow submission id",
        "type": "string"
      },
      "workflow": {
        "description": "Filter by workflow id",
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
    "additionalProperties": true,
    "properties": {
      "hasMore": {
        "type": "boolean"
      },
      "items": {
        "type": "array"
      },
      "limit": {
        "minimum": 0,
        "type": "integer"
      },
      "nextCursor": {
        "type": [
          "string",
          "number",
          "null"
        ]
      },
      "returned": {
        "minimum": 0,
        "type": "integer"
      },
      "total": {
        "minimum": 0,
        "type": "integer"
      }
    },
    "type": "object",
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
  },
  "summary": "List active and recent workflow runtime tasks",
  "targets": [
    {
      "kind": "endpoint",
      "target": "GET /bridge/v2/tasks"
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

- Canonical argv path: `run` `list`.
- Output boundary: `cursor`; governed details: {"continuation":["nextCursor","hasMore","returned","total","limit"],"cursorInput":"cursor","defaultLimit":25,"maxLimit":100,"section":"items","strategy":"cursor"}.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Structured binding mode: `none`.
- Intent visibility: `visible`.
- Operational aliases: `run list`, `run`, `list`, `workflow`, `WORKFLOW`, `backend`, `BACKEND`, `backend_type`, `backend-type`, `BACKEND_TYPE`, `request`, `REQUEST`, `submission`, `SUBMISSION`, `RUN`, `state`, `STATE`, `active_only`, `active-only`, `ACTIVE_ONLY`, `cursor`, `CURSOR`, `limit`, `LIMIT`.

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
    "target": "GET /bridge/v2/tasks"
  }
]
```
