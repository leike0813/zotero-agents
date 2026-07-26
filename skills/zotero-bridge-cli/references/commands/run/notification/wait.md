# `zotero-bridge run notification wait`

Poll until a workflow notification is available

## Usage

```console
zotero-bridge run notification wait [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--workflow-run-id <WORKFLOW_RUN_ID>] [--skill-run-id <SKILL_RUN_ID>] [--type <EVENT_TYPE>] [--since-event-id <SINCE_EVENT_ID>] [--client-id <CLIENT_ID>] [--acknowledged <ACKNOWLEDGED>] [--limit <LIMIT>] [--timeout-ms <TIMEOUT_MS>] [--interval-ms <INTERVAL_MS>]
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
| --timeout-ms | timeout_ms | option | no | — | TIMEOUT_MS; default: 60000 | no | — | — | Maximum wait time in milliseconds |
| --interval-ms | interval_ms | option | no | — | INTERVAL_MS; default: 1000 | no | — | — | Polling interval in milliseconds |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "workflow-run-id": {
      "type": "string",
      "description": "Filter by workflow run id"
    },
    "skill-run-id": {
      "type": "string",
      "description": "Filter by concrete skill run id"
    },
    "type": {
      "type": "string",
      "description": "Filter by notification type"
    },
    "since-event-id": {
      "type": "string",
      "description": "Return events after this event id"
    },
    "client-id": {
      "type": "string",
      "description": "Best-effort Zotero notification client id"
    },
    "acknowledged": {
      "type": "string",
      "description": "Filter by acknowledgement state"
    },
    "limit": {
      "type": "string",
      "description": "Maximum number of events to return"
    },
    "timeout-ms": {
      "type": "string",
      "description": "Maximum wait time in milliseconds"
    },
    "interval-ms": {
      "type": "string",
      "description": "Polling interval in milliseconds"
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
    "workflow_run_id": {
      "type": "string",
      "description": "Filter by workflow run id"
    },
    "skill_run_id": {
      "type": "string",
      "description": "Filter by concrete skill run id"
    },
    "type": {
      "type": "string",
      "description": "Filter by notification type"
    },
    "since_event_id": {
      "type": "string",
      "description": "Return events after this event id"
    },
    "client_id": {
      "type": "string",
      "description": "Best-effort Zotero notification client id"
    },
    "acknowledged": {
      "type": "string",
      "description": "Filter by acknowledgement state"
    },
    "limit": {
      "type": "string",
      "description": "Maximum number of events to return"
    },
    "timeout_ms": {
      "type": "string",
      "description": "Maximum wait time in milliseconds"
    },
    "interval_ms": {
      "type": "string",
      "description": "Polling interval in milliseconds"
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
    "notifications": {
      "type": "array",
      "items": {
        "type": "object"
      }
    },
    "nextSinceEventId": {
      "type": [
        "string",
        "null"
      ]
    },
    "returned": {
      "type": "integer"
    },
    "hasMore": {
      "type": "boolean"
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
  "additionalProperties": false
}
```

## Examples

No structured-input example applies. Build argv from the parameter tables and confirm the command with `surface describe` before execution.

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

```json
{
  "command": "run notification wait",
  "argv": [
    "run",
    "notification",
    "wait"
  ],
  "summary": "Poll until a workflow notification is available",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "workflow-run-id": {
        "type": "string",
        "description": "Filter by workflow run id"
      },
      "skill-run-id": {
        "type": "string",
        "description": "Filter by concrete skill run id"
      },
      "type": {
        "type": "string",
        "description": "Filter by notification type"
      },
      "since-event-id": {
        "type": "string",
        "description": "Return events after this event id"
      },
      "client-id": {
        "type": "string",
        "description": "Best-effort Zotero notification client id"
      },
      "acknowledged": {
        "type": "string",
        "description": "Filter by acknowledgement state"
      },
      "limit": {
        "type": "string",
        "description": "Maximum number of events to return"
      },
      "timeout-ms": {
        "type": "string",
        "description": "Maximum wait time in milliseconds"
      },
      "interval-ms": {
        "type": "string",
        "description": "Polling interval in milliseconds"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "workflow_run_id",
      "kind": "option",
      "token": "--workflow-run-id",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Filter by workflow run id",
      "valueNames": [
        "WORKFLOW_RUN_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "skill_run_id",
      "kind": "option",
      "token": "--skill-run-id",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Filter by concrete skill run id",
      "valueNames": [
        "SKILL_RUN_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "event_type",
      "kind": "option",
      "token": "--type",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Filter by notification type",
      "valueNames": [
        "EVENT_TYPE"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "since_event_id",
      "kind": "option",
      "token": "--since-event-id",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Return events after this event id",
      "valueNames": [
        "SINCE_EVENT_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "client_id",
      "kind": "option",
      "token": "--client-id",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Best-effort Zotero notification client id",
      "valueNames": [
        "CLIENT_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "acknowledged",
      "kind": "option",
      "token": "--acknowledged",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Filter by acknowledgement state",
      "valueNames": [
        "ACKNOWLEDGED"
      ],
      "possibleValues": [
        "true",
        "false"
      ],
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
      "help": "Maximum number of events to return",
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
      "id": "timeout_ms",
      "kind": "option",
      "token": "--timeout-ms",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Maximum wait time in milliseconds",
      "valueNames": [
        "TIMEOUT_MS"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": [
        "60000"
      ]
    },
    {
      "id": "interval_ms",
      "kind": "option",
      "token": "--interval-ms",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Polling interval in milliseconds",
      "valueNames": [
        "INTERVAL_MS"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": [
        "1000"
      ]
    }
  ],
  "argvBindings": [
    {
      "property": "workflow-run-id",
      "kind": "option",
      "token": "--workflow-run-id",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "WORKFLOW_RUN_ID"
      ]
    },
    {
      "property": "skill-run-id",
      "kind": "option",
      "token": "--skill-run-id",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "SKILL_RUN_ID"
      ]
    },
    {
      "property": "type",
      "kind": "option",
      "token": "--type",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "EVENT_TYPE"
      ]
    },
    {
      "property": "since-event-id",
      "kind": "option",
      "token": "--since-event-id",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "SINCE_EVENT_ID"
      ]
    },
    {
      "property": "client-id",
      "kind": "option",
      "token": "--client-id",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "CLIENT_ID"
      ]
    },
    {
      "property": "acknowledged",
      "kind": "option",
      "token": "--acknowledged",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "ACKNOWLEDGED"
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
      "property": "timeout-ms",
      "kind": "option",
      "token": "--timeout-ms",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "TIMEOUT_MS"
      ]
    },
    {
      "property": "interval-ms",
      "kind": "option",
      "token": "--interval-ms",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "INTERVAL_MS"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "workflow_run_id": {
        "type": "string",
        "description": "Filter by workflow run id"
      },
      "skill_run_id": {
        "type": "string",
        "description": "Filter by concrete skill run id"
      },
      "type": {
        "type": "string",
        "description": "Filter by notification type"
      },
      "since_event_id": {
        "type": "string",
        "description": "Return events after this event id"
      },
      "client_id": {
        "type": "string",
        "description": "Best-effort Zotero notification client id"
      },
      "acknowledged": {
        "type": "string",
        "description": "Filter by acknowledgement state"
      },
      "limit": {
        "type": "string",
        "description": "Maximum number of events to return"
      },
      "timeout_ms": {
        "type": "string",
        "description": "Maximum wait time in milliseconds"
      },
      "interval_ms": {
        "type": "string",
        "description": "Polling interval in milliseconds"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "notifications": {
        "type": "array",
        "items": {
          "type": "object"
        }
      },
      "nextSinceEventId": {
        "type": [
          "string",
          "null"
        ]
      },
      "returned": {
        "type": "integer"
      },
      "hasMore": {
        "type": "boolean"
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
    "additionalProperties": false
  },
  "outputBoundary": {
    "strategy": "cursor",
    "section": "notifications",
    "defaultLimit": 25,
    "maxLimit": 100,
    "cursorInput": "since_event_id",
    "continuation": [
      "nextSinceEventId",
      "hasMore",
      "returned"
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
      "target": "GET /bridge/v1/notifications"
    }
  ],
  "operationalAliases": [
    "run notification wait",
    "run",
    "notification",
    "wait",
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
    "LIMIT",
    "timeout_ms",
    "timeout-ms",
    "TIMEOUT_MS",
    "interval_ms",
    "interval-ms",
    "INTERVAL_MS"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `run` `notification` `wait`.
- Output boundary: `cursor`; governed details: {"strategy":"cursor","section":"notifications","defaultLimit":25,"maxLimit":100,"cursorInput":"since_event_id","continuation":["nextSinceEventId","hasMore","returned"]}.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Intent visibility: `visible`.
- Operational aliases: `run notification wait`, `run`, `notification`, `wait`, `workflow_run_id`, `workflow-run-id`, `WORKFLOW_RUN_ID`, `skill_run_id`, `skill-run-id`, `SKILL_RUN_ID`, `event_type`, `type`, `EVENT_TYPE`, `since_event_id`, `since-event-id`, `SINCE_EVENT_ID`, `client_id`, `client-id`, `CLIENT_ID`, `acknowledged`, `ACKNOWLEDGED`, `limit`, `LIMIT`, `timeout_ms`, `timeout-ms`, `TIMEOUT_MS`, `interval_ms`, `interval-ms`, `INTERVAL_MS`.

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
    "target": "GET /bridge/v1/notifications"
  }
]
```
