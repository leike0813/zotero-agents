# `zotero-bridge run notification list`

List workflow notification inbox events

## Usage

```console
zotero-bridge run notification list [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--workflow-run-id <WORKFLOW_RUN_ID>] [--skill-run-id <SKILL_RUN_ID>] [--type <EVENT_TYPE>] [--since-event-id <SINCE_EVENT_ID>] [--client-id <CLIENT_ID>] [--acknowledged <ACKNOWLEDGED>] [--limit <LIMIT>]
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
| --workflow-run-id | workflow_run_id | option | no | — | WORKFLOW_RUN_ID | no | — | — | Filter by workflow run id |
| --skill-run-id | skill_run_id | option | no | — | SKILL_RUN_ID | no | — | — | Filter by concrete skill run id |
| --type | event_type | option | no | — | EVENT_TYPE | no | — | — | Filter by notification type |
| --since-event-id | since_event_id | option | no | — | SINCE_EVENT_ID | no | — | — | Return events after this event id |
| --client-id | client_id | option | no | — | CLIENT_ID | no | — | — | Best-effort Zotero notification client id |
| --acknowledged | acknowledged | option | no | — | ACKNOWLEDGED; values: true, false | no | — | — | Filter by acknowledgement state |
| --limit | limit | option | no | — | LIMIT | no | — | — | Maximum number of events to return |

## Invocation schema

```json
{
  "additionalProperties": false,
  "properties": {
    "acknowledged": {
      "description": "Filter by acknowledgement state",
      "type": "string"
    },
    "client-id": {
      "description": "Best-effort Zotero notification client id",
      "type": "string"
    },
    "limit": {
      "description": "Maximum number of events to return",
      "type": "string"
    },
    "since-event-id": {
      "description": "Return events after this event id",
      "type": "string"
    },
    "skill-run-id": {
      "description": "Filter by concrete skill run id",
      "type": "string"
    },
    "type": {
      "description": "Filter by notification type",
      "type": "string"
    },
    "workflow-run-id": {
      "description": "Filter by workflow run id",
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
    "acknowledged": {
      "description": "Filter by acknowledgement state",
      "type": "string"
    },
    "client_id": {
      "description": "Best-effort Zotero notification client id",
      "type": "string"
    },
    "limit": {
      "description": "Maximum number of events to return",
      "type": "string"
    },
    "since_event_id": {
      "description": "Return events after this event id",
      "type": "string"
    },
    "skill_run_id": {
      "description": "Filter by concrete skill run id",
      "type": "string"
    },
    "type": {
      "description": "Filter by notification type",
      "type": "string"
    },
    "workflow_run_id": {
      "description": "Filter by workflow run id",
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
  "additionalProperties": false,
  "properties": {
    "hasMore": {
      "type": "boolean"
    },
    "nextSinceEventId": {
      "type": [
        "string",
        "null"
      ]
    },
    "notifications": {
      "items": {
        "type": "object"
      },
      "type": "array"
    },
    "returned": {
      "type": "integer"
    },
    "truncated": {
      "type": "boolean"
    }
  },
  "required": [
    "notifications",
    "returned",
    "hasMore",
    "truncated"
  ],
  "type": "object"
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
      "help": "Filter by workflow run id",
      "id": "workflow_run_id",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--workflow-run-id",
      "valueNames": [
        "WORKFLOW_RUN_ID"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Filter by concrete skill run id",
      "id": "skill_run_id",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--skill-run-id",
      "valueNames": [
        "SKILL_RUN_ID"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Filter by notification type",
      "id": "event_type",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--type",
      "valueNames": [
        "EVENT_TYPE"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Return events after this event id",
      "id": "since_event_id",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--since-event-id",
      "valueNames": [
        "SINCE_EVENT_ID"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Best-effort Zotero notification client id",
      "id": "client_id",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--client-id",
      "valueNames": [
        "CLIENT_ID"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Filter by acknowledgement state",
      "id": "acknowledged",
      "kind": "option",
      "possibleValues": [
        "true",
        "false"
      ],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--acknowledged",
      "valueNames": [
        "ACKNOWLEDGED"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Maximum number of events to return",
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
    "notification",
    "list"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "workflow-run-id",
      "required": false,
      "takesValue": true,
      "token": "--workflow-run-id",
      "valueNames": [
        "WORKFLOW_RUN_ID"
      ]
    },
    {
      "kind": "option",
      "property": "skill-run-id",
      "required": false,
      "takesValue": true,
      "token": "--skill-run-id",
      "valueNames": [
        "SKILL_RUN_ID"
      ]
    },
    {
      "kind": "option",
      "property": "type",
      "required": false,
      "takesValue": true,
      "token": "--type",
      "valueNames": [
        "EVENT_TYPE"
      ]
    },
    {
      "kind": "option",
      "property": "since-event-id",
      "required": false,
      "takesValue": true,
      "token": "--since-event-id",
      "valueNames": [
        "SINCE_EVENT_ID"
      ]
    },
    {
      "kind": "option",
      "property": "client-id",
      "required": false,
      "takesValue": true,
      "token": "--client-id",
      "valueNames": [
        "CLIENT_ID"
      ]
    },
    {
      "kind": "option",
      "property": "acknowledged",
      "required": false,
      "takesValue": true,
      "token": "--acknowledged",
      "valueNames": [
        "ACKNOWLEDGED"
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
  "command": "run notification list",
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
      "acknowledged": {
        "description": "Filter by acknowledgement state",
        "type": "string"
      },
      "client-id": {
        "description": "Best-effort Zotero notification client id",
        "type": "string"
      },
      "limit": {
        "description": "Maximum number of events to return",
        "type": "string"
      },
      "since-event-id": {
        "description": "Return events after this event id",
        "type": "string"
      },
      "skill-run-id": {
        "description": "Filter by concrete skill run id",
        "type": "string"
      },
      "type": {
        "description": "Filter by notification type",
        "type": "string"
      },
      "workflow-run-id": {
        "description": "Filter by workflow run id",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "operationalAliases": [
    "run notification list",
    "run",
    "notification",
    "list",
    "workflow_run_id",
    "workflow-run-id",
    "WORKFLOW_RUN_ID",
    "skill_run_id",
    "skill-run-id",
    "SKILL_RUN_ID",
    "event_type",
    "type",
    "EVENT_TYPE",
    "since_event_id",
    "since-event-id",
    "SINCE_EVENT_ID",
    "client_id",
    "client-id",
    "CLIENT_ID",
    "acknowledged",
    "ACKNOWLEDGED",
    "limit",
    "LIMIT"
  ],
  "outputBoundary": {
    "continuation": [
      "nextSinceEventId",
      "hasMore",
      "returned"
    ],
    "cursorInput": "since_event_id",
    "defaultLimit": 25,
    "maxLimit": 100,
    "section": "notifications",
    "strategy": "cursor"
  },
  "pagination": "cursor",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "acknowledged": {
        "description": "Filter by acknowledgement state",
        "type": "string"
      },
      "client_id": {
        "description": "Best-effort Zotero notification client id",
        "type": "string"
      },
      "limit": {
        "description": "Maximum number of events to return",
        "type": "string"
      },
      "since_event_id": {
        "description": "Return events after this event id",
        "type": "string"
      },
      "skill_run_id": {
        "description": "Filter by concrete skill run id",
        "type": "string"
      },
      "type": {
        "description": "Filter by notification type",
        "type": "string"
      },
      "workflow_run_id": {
        "description": "Filter by workflow run id",
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
    "additionalProperties": false,
    "properties": {
      "hasMore": {
        "type": "boolean"
      },
      "nextSinceEventId": {
        "type": [
          "string",
          "null"
        ]
      },
      "notifications": {
        "items": {
          "type": "object"
        },
        "type": "array"
      },
      "returned": {
        "type": "integer"
      },
      "truncated": {
        "type": "boolean"
      }
    },
    "required": [
      "notifications",
      "returned",
      "hasMore",
      "truncated"
    ],
    "type": "object"
  },
  "summary": "List workflow notification inbox events",
  "targets": [
    {
      "kind": "endpoint",
      "target": "GET /bridge/v2/notifications"
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

- Canonical argv path: `run` `notification` `list`.
- Output boundary: `cursor`; governed details: {"continuation":["nextSinceEventId","hasMore","returned"],"cursorInput":"since_event_id","defaultLimit":25,"maxLimit":100,"section":"notifications","strategy":"cursor"}.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Structured binding mode: `none`.
- Intent visibility: `visible`.
- Operational aliases: `run notification list`, `run`, `notification`, `list`, `workflow_run_id`, `workflow-run-id`, `WORKFLOW_RUN_ID`, `skill_run_id`, `skill-run-id`, `SKILL_RUN_ID`, `event_type`, `type`, `EVENT_TYPE`, `since_event_id`, `since-event-id`, `SINCE_EVENT_ID`, `client_id`, `client-id`, `CLIENT_ID`, `acknowledged`, `ACKNOWLEDGED`, `limit`, `LIMIT`.

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
    "target": "GET /bridge/v2/notifications"
  }
]
```
