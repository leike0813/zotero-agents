# `zotero-bridge workflow agent-apply-status`

Read the auditable apply-back receipt for an agent run

## Usage

```console
zotero-bridge workflow agent-apply-status [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] AGENT_RUN_ID <AGENT_RUN_ID> [--cursor <CURSOR>] [--limit <LIMIT>]
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
| AGENT_RUN_ID | agent_run_id | positional | yes | — | AGENT_RUN_ID | no | — | — | Agent run id returned by workflow agent-run |
| --cursor | cursor | option | no | — | CURSOR | no | — | — | Opaque continuation cursor |
| --limit | limit | option | no | — | LIMIT | no | — | — | Maximum number of entries (1-100) |

## Invocation schema

```json
{
  "additionalProperties": false,
  "properties": {
    "agent_run_id": {
      "description": "Agent run id returned by workflow agent-run",
      "position": 1,
      "type": "string"
    },
    "cursor": {
      "description": "Opaque continuation cursor",
      "type": "string"
    },
    "limit": {
      "description": "Maximum number of entries (1-100)",
      "type": "string"
    }
  },
  "required": [
    "agent_run_id"
  ],
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
    "agent_run_id": {
      "description": "Agent run id returned by workflow agent-run",
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
    "agentRunId": {
      "type": "string"
    },
    "handleConsumption": {
      "enum": [
        "unconsumed",
        "consumed",
        "unknown"
      ]
    },
    "hasMore": {
      "type": "boolean"
    },
    "limit": {
      "minimum": 0,
      "type": "integer"
    },
    "nextCursor": {
      "type": [
        "string",
        "null"
      ]
    },
    "recoverable": {
      "type": "boolean"
    },
    "results": {
      "items": {
        "type": "object"
      },
      "type": "array"
    },
    "returned": {
      "minimum": 0,
      "type": "integer"
    },
    "schema": {
      "const": "host-bridge.agent-apply-receipt.v2"
    },
    "stateChange": {
      "enum": [
        "unchanged",
        "changed",
        "unknown"
      ]
    },
    "status": {
      "type": "string"
    },
    "total": {
      "minimum": 0,
      "type": "integer"
    },
    "updatedAt": {
      "type": "string"
    },
    "workflowId": {
      "type": "string"
    }
  },
  "required": [
    "schema",
    "agentRunId",
    "status",
    "results"
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
      "help": "Agent run id returned by workflow agent-run",
      "id": "agent_run_id",
      "kind": "positional",
      "position": 1,
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "AGENT_RUN_ID",
      "valueNames": [
        "AGENT_RUN_ID"
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
      "help": "Maximum number of entries (1-100)",
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
    "workflow",
    "agent-apply-status"
  ],
  "argvBindings": [
    {
      "kind": "positional",
      "position": 1,
      "property": "agent_run_id",
      "required": true,
      "takesValue": true,
      "token": "AGENT_RUN_ID",
      "valueNames": [
        "AGENT_RUN_ID"
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
  "command": "workflow agent-apply-status",
  "composition": null,
  "danger": "none",
  "effects": [
    {
      "description": "Reads state without changing Zotero-managed data.",
      "kind": "none",
      "stateChanged": false
    }
  ],
  "handleTransitions": [
    {
      "condition": "Required to read persisted apply status; the read does not consume it.",
      "direction": "consume",
      "handle": "agentRunId",
      "lifetime": "caller-owned",
      "required": true
    },
    {
      "condition": "Returned when the corresponding operation succeeds.",
      "direction": "produce",
      "handle": "applyReceipt",
      "lifetime": "response",
      "required": false
    }
  ],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {},
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "agent_run_id": {
        "description": "Agent run id returned by workflow agent-run",
        "position": 1,
        "type": "string"
      },
      "cursor": {
        "description": "Opaque continuation cursor",
        "type": "string"
      },
      "limit": {
        "description": "Maximum number of entries (1-100)",
        "type": "string"
      }
    },
    "required": [
      "agent_run_id"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "workflow agent-apply-status",
    "workflow",
    "agent-apply-status",
    "agent_run_id",
    "AGENT_RUN_ID",
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
    "section": "results",
    "strategy": "cursor"
  },
  "pagination": "cursor",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "agent_run_id": {
        "description": "Agent run id returned by workflow agent-run",
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
      "stateCheck": "command-result",
      "when": "The read fails or returns incomplete evidence."
    }
  ],
  "resultSchema": {
    "additionalProperties": false,
    "properties": {
      "agentRunId": {
        "type": "string"
      },
      "handleConsumption": {
        "enum": [
          "unconsumed",
          "consumed",
          "unknown"
        ]
      },
      "hasMore": {
        "type": "boolean"
      },
      "limit": {
        "minimum": 0,
        "type": "integer"
      },
      "nextCursor": {
        "type": [
          "string",
          "null"
        ]
      },
      "recoverable": {
        "type": "boolean"
      },
      "results": {
        "items": {
          "type": "object"
        },
        "type": "array"
      },
      "returned": {
        "minimum": 0,
        "type": "integer"
      },
      "schema": {
        "const": "host-bridge.agent-apply-receipt.v2"
      },
      "stateChange": {
        "enum": [
          "unchanged",
          "changed",
          "unknown"
        ]
      },
      "status": {
        "type": "string"
      },
      "total": {
        "minimum": 0,
        "type": "integer"
      },
      "updatedAt": {
        "type": "string"
      },
      "workflowId": {
        "type": "string"
      }
    },
    "required": [
      "schema",
      "agentRunId",
      "status",
      "results"
    ],
    "type": "object"
  },
  "summary": "Read the auditable apply-back receipt for an agent run",
  "targets": [
    {
      "kind": "endpoint",
      "target": "GET /bridge/v2/workflows/agent-runs/{agentRunId}/apply"
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

- Canonical argv path: `workflow` `agent-apply-status`.
- Output boundary: `cursor`; governed details: {"continuation":["nextCursor","hasMore","returned","total","limit"],"cursorInput":"cursor","defaultLimit":25,"maxLimit":100,"section":"results","strategy":"cursor"}.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Structured binding mode: `none`.
- Intent visibility: `visible`.
- Operational aliases: `workflow agent-apply-status`, `workflow`, `agent-apply-status`, `agent_run_id`, `AGENT_RUN_ID`, `cursor`, `CURSOR`, `limit`, `LIMIT`.

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
  {
    "condition": "Required to read persisted apply status; the read does not consume it.",
    "direction": "consume",
    "handle": "agentRunId",
    "lifetime": "caller-owned",
    "required": true
  },
  {
    "condition": "Returned when the corresponding operation succeeds.",
    "direction": "produce",
    "handle": "applyReceipt",
    "lifetime": "response",
    "required": false
  }
]
```

### Recovery

```json
[
  {
    "action": "Inspect the error and retry only when retryable is true.",
    "nextCommand": "surface describe",
    "requiresHandles": [],
    "stateCheck": "command-result",
    "when": "The read fails or returns incomplete evidence."
  }
]
```

### Targets

```json
[
  {
    "kind": "endpoint",
    "target": "GET /bridge/v2/workflows/agent-runs/{agentRunId}/apply"
  }
]
```
