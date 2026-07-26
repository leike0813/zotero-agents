# `zotero-bridge run skill events`

List lightweight lifecycle events for one skill run

## Usage

```console
zotero-bridge run skill events [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] SKILL_RUN_ID <SKILL_RUN_ID> [--since-updated-at <SINCE_UPDATED_AT>] [--limit <LIMIT>] [--cursor <CURSOR>]
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
| SKILL_RUN_ID | skill_run_id | positional | yes | — | SKILL_RUN_ID | no | — | — | Opaque skill run id |
| --since-updated-at | since_updated_at | option | no | — | SINCE_UPDATED_AT | no | — | — | Return events after this updatedAt timestamp |
| --limit | limit | option | no | — | LIMIT | no | — | — | Maximum number of events |
| --cursor | cursor | option | no | — | CURSOR | no | — | — | Opaque continuation cursor |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "skill_run_id": {
      "type": "string",
      "description": "Opaque skill run id",
      "position": 1
    },
    "since-updated-at": {
      "type": "string",
      "description": "Return events after this updatedAt timestamp"
    },
    "limit": {
      "type": "string",
      "description": "Maximum number of events"
    },
    "cursor": {
      "type": "string",
      "description": "Opaque continuation cursor"
    }
  },
  "required": [
    "skill_run_id"
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
    "skill_run_id": {
      "type": "string",
      "description": "Opaque skill run id"
    },
    "since_updated_at": {
      "type": "string",
      "description": "Return events after this updatedAt timestamp"
    },
    "limit": {
      "type": "string",
      "description": "Maximum number of events"
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
    "events": {
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
  "command": "run skill events",
  "argv": [
    "run",
    "skill",
    "events"
  ],
  "summary": "List lightweight lifecycle events for one skill run",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "skill_run_id": {
        "type": "string",
        "description": "Opaque skill run id",
        "position": 1
      },
      "since-updated-at": {
        "type": "string",
        "description": "Return events after this updatedAt timestamp"
      },
      "limit": {
        "type": "string",
        "description": "Maximum number of events"
      },
      "cursor": {
        "type": "string",
        "description": "Opaque continuation cursor"
      }
    },
    "required": [
      "skill_run_id"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "skill_run_id",
      "kind": "positional",
      "token": "SKILL_RUN_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Opaque skill run id",
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
      "id": "since_updated_at",
      "kind": "option",
      "token": "--since-updated-at",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Return events after this updatedAt timestamp",
      "valueNames": [
        "SINCE_UPDATED_AT"
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
      "help": "Maximum number of events",
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
      "property": "skill_run_id",
      "kind": "positional",
      "token": "SKILL_RUN_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "SKILL_RUN_ID"
      ]
    },
    {
      "property": "since-updated-at",
      "kind": "option",
      "token": "--since-updated-at",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "SINCE_UPDATED_AT"
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
      "skill_run_id": {
        "type": "string",
        "description": "Opaque skill run id"
      },
      "since_updated_at": {
        "type": "string",
        "description": "Return events after this updatedAt timestamp"
      },
      "limit": {
        "type": "string",
        "description": "Maximum number of events"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "events": {
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
    "section": "events",
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
      "target": "GET /bridge/v1/skill-runs/{skillRunId}/events"
    }
  ],
  "operationalAliases": [
    "run skill events",
    "run",
    "skill",
    "events",
    "skill_run_id",
    "SKILL_RUN_ID",
    "since_updated_at",
    "since-updated-at",
    "SINCE_UPDATED_AT",
    "limit",
    "LIMIT",
    "cursor",
    "CURSOR"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `run` `skill` `events`.
- Output boundary: `cursor`; governed details: {"strategy":"cursor","section":"events","defaultLimit":25,"maxLimit":100,"cursorInput":"cursor","continuation":["nextCursor","hasMore","returned","total","limit"]}.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Intent visibility: `visible`.
- Operational aliases: `run skill events`, `run`, `skill`, `events`, `skill_run_id`, `SKILL_RUN_ID`, `since_updated_at`, `since-updated-at`, `SINCE_UPDATED_AT`, `limit`, `LIMIT`, `cursor`, `CURSOR`.

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
    "target": "GET /bridge/v1/skill-runs/{skillRunId}/events"
  }
]
```
