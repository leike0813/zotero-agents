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
  "additionalProperties": false,
  "properties": {
    "backend": {
      "description": "Filter by backend id",
      "type": "string"
    },
    "cursor": {
      "description": "Opaque continuation cursor",
      "type": "string"
    },
    "limit": {
      "description": "Maximum number of tasks",
      "type": "string"
    },
    "state": {
      "description": "Filter by task state",
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
    "limit": {
      "description": "Maximum number of tasks",
      "type": "string"
    },
    "state": {
      "description": "Filter by task state",
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
      "help": "Maximum number of tasks",
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
    }
  ],
  "argv": [
    "run",
    "recent"
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
      "property": "limit",
      "required": false,
      "takesValue": true,
      "token": "--limit",
      "valueNames": [
        "LIMIT"
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
    }
  ],
  "binding": "none",
  "category": "read",
  "command": "run recent",
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
      "backend": {
        "description": "Filter by backend id",
        "type": "string"
      },
      "cursor": {
        "description": "Opaque continuation cursor",
        "type": "string"
      },
      "limit": {
        "description": "Maximum number of tasks",
        "type": "string"
      },
      "state": {
        "description": "Filter by task state",
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
      "limit": {
        "description": "Maximum number of tasks",
        "type": "string"
      },
      "state": {
        "description": "Filter by task state",
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
  "summary": "List lightweight recent workflow runtime tasks",
  "targets": [
    {
      "kind": "endpoint",
      "target": "GET /bridge/v2/tasks/recent"
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

- Canonical argv path: `run` `recent`.
- Output boundary: `cursor`; governed details: {"continuation":["nextCursor","hasMore","returned","total","limit"],"cursorInput":"cursor","defaultLimit":25,"maxLimit":100,"section":"items","strategy":"cursor"}.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Structured binding mode: `none`.
- Intent visibility: `visible`.
- Operational aliases: `run recent`, `run`, `recent`, `workflow`, `WORKFLOW`, `backend`, `BACKEND`, `state`, `STATE`, `limit`, `LIMIT`, `cursor`, `CURSOR`.

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
    "target": "GET /bridge/v2/tasks/recent"
  }
]
```
