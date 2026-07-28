# `zotero-bridge workflow agent-apply`

Apply finalized self-owned agent workflow result bundles

## Usage

```console
zotero-bridge workflow agent-apply [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] AGENT_RUN_ID <AGENT_RUN_ID> --result <AGENT_REQUEST_ID=BUNDLE_PATH>
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
| --result | results | option | yes | — | AGENT_REQUEST_ID=BUNDLE_PATH; numArgs: 1 | yes | — | — | Apply-back result mapping. Repeat for multiple request bundles. |

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
    "result": {
      "description": "Apply-back result mapping. Repeat for multiple request bundles.",
      "items": {
        "type": "string"
      },
      "type": "array"
    }
  },
  "required": [
    "agent_run_id",
    "result"
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
    },
    "result": {
      "description": "Apply-back result mapping. Repeat for multiple request bundles.",
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
    "appliedAt": {
      "type": "string"
    },
    "handleConsumption": {
      "const": "consumed"
    },
    "permission": {
      "type": "object"
    },
    "receiptUrl": {
      "type": "string"
    },
    "stateChange": {
      "enum": [
        "unchanged",
        "changed"
      ]
    },
    "summary": {
      "additionalProperties": false,
      "properties": {
        "failed": {
          "minimum": 0,
          "type": "integer"
        },
        "succeeded": {
          "minimum": 0,
          "type": "integer"
        },
        "total": {
          "minimum": 0,
          "type": "integer"
        }
      },
      "required": [
        "total",
        "succeeded",
        "failed"
      ],
      "type": "object"
    },
    "workflowId": {
      "type": "string"
    }
  },
  "required": [
    "agentRunId",
    "workflowId",
    "appliedAt",
    "permission",
    "summary",
    "stateChange",
    "handleConsumption",
    "receiptUrl"
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
    "kind": "conditional",
    "scope": "Each result request is preflighted before any approval or handle consumption.",
    "timing": "apply-back"
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
      "help": "Apply-back result mapping. Repeat for multiple request bundles.",
      "id": "results",
      "kind": "option",
      "numArgs": "1",
      "possibleValues": [],
      "repeatable": true,
      "required": true,
      "takesValue": true,
      "token": "--result",
      "valueNames": [
        "AGENT_REQUEST_ID=BUNDLE_PATH"
      ]
    }
  ],
  "argv": [
    "workflow",
    "agent-apply"
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
      "property": "result",
      "required": true,
      "takesValue": true,
      "token": "--result",
      "valueNames": [
        "AGENT_REQUEST_ID=BUNDLE_PATH"
      ]
    }
  ],
  "binding": "object",
  "category": "write",
  "command": "workflow agent-apply",
  "composition": null,
  "danger": "review",
  "effects": [
    {
      "description": "May change workflow control state.",
      "kind": "workflow-control",
      "stateChanged": true
    },
    {
      "description": "May apply finalized Agent results to the Zotero library.",
      "kind": "zotero-library",
      "stateChanged": true
    }
  ],
  "handleTransitions": [
    {
      "condition": "Required by the command invocation.",
      "direction": "consume",
      "handle": "agentRunId",
      "lifetime": "one-shot",
      "required": true
    },
    {
      "condition": "Required by the command invocation.",
      "direction": "consume",
      "handle": "agentRequestId",
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
      "result": {
        "description": "Apply-back result mapping. Repeat for multiple request bundles.",
        "items": {
          "type": "string"
        },
        "type": "array"
      }
    },
    "required": [
      "agent_run_id",
      "result"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "workflow agent-apply",
    "workflow",
    "agent-apply",
    "agent_run_id",
    "AGENT_RUN_ID",
    "results",
    "result",
    "AGENT_REQUEST_ID=BUNDLE_PATH"
  ],
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "agent_run_id": {
        "description": "Agent run id returned by workflow agent-run",
        "type": "string"
      },
      "result": {
        "description": "Apply-back result mapping. Repeat for multiple request bundles.",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "recovery": [
    {
      "action": "Read the persisted per-request apply receipt before retrying any result.",
      "nextCommand": "workflow agent-apply-status",
      "requiresHandles": [
        "agentRunId"
      ],
      "stateCheck": "caller-held-handle",
      "when": "Apply-back fails after preflight or may have partially written results."
    }
  ],
  "resultSchema": {
    "additionalProperties": false,
    "properties": {
      "agentRunId": {
        "type": "string"
      },
      "appliedAt": {
        "type": "string"
      },
      "handleConsumption": {
        "const": "consumed"
      },
      "permission": {
        "type": "object"
      },
      "receiptUrl": {
        "type": "string"
      },
      "stateChange": {
        "enum": [
          "unchanged",
          "changed"
        ]
      },
      "summary": {
        "additionalProperties": false,
        "properties": {
          "failed": {
            "minimum": 0,
            "type": "integer"
          },
          "succeeded": {
            "minimum": 0,
            "type": "integer"
          },
          "total": {
            "minimum": 0,
            "type": "integer"
          }
        },
        "required": [
          "total",
          "succeeded",
          "failed"
        ],
        "type": "object"
      },
      "workflowId": {
        "type": "string"
      }
    },
    "required": [
      "agentRunId",
      "workflowId",
      "appliedAt",
      "permission",
      "summary",
      "stateChange",
      "handleConsumption",
      "receiptUrl"
    ],
    "type": "object"
  },
  "summary": "Apply finalized self-owned agent workflow result bundles",
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v2/workflows/agent-runs/{agentRunId}/apply"
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

- Canonical argv path: `workflow` `agent-apply`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Structured binding mode: `object`.
- Intent visibility: `visible`.
- Operational aliases: `workflow agent-apply`, `workflow`, `agent-apply`, `agent_run_id`, `AGENT_RUN_ID`, `results`, `result`, `AGENT_REQUEST_ID=BUNDLE_PATH`.

### Effects

```json
[
  {
    "description": "May change workflow control state.",
    "kind": "workflow-control",
    "stateChanged": true
  },
  {
    "description": "May apply finalized Agent results to the Zotero library.",
    "kind": "zotero-library",
    "stateChanged": true
  }
]
```

### Approval

```json
{
  "kind": "conditional",
  "scope": "Each result request is preflighted before any approval or handle consumption.",
  "timing": "apply-back"
}
```

### Handle transitions

```json
[
  {
    "condition": "Required by the command invocation.",
    "direction": "consume",
    "handle": "agentRunId",
    "lifetime": "one-shot",
    "required": true
  },
  {
    "condition": "Required by the command invocation.",
    "direction": "consume",
    "handle": "agentRequestId",
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
    "action": "Read the persisted per-request apply receipt before retrying any result.",
    "nextCommand": "workflow agent-apply-status",
    "requiresHandles": [
      "agentRunId"
    ],
    "stateCheck": "caller-held-handle",
    "when": "Apply-back fails after preflight or may have partially written results."
  }
]
```

### Targets

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v2/workflows/agent-runs/{agentRunId}/apply"
  }
]
```
