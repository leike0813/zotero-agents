# `zotero-bridge run cancel`

Request cancellation of a workflow run

## Usage

```console
zotero-bridge run cancel [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] RUN_ID <RUN_ID> [--reason <REASON>] [--message <MESSAGE>]
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
| RUN_ID | run_id | positional | yes | — | RUN_ID | no | — | — | Workflow run id |
| --reason | reason | option | no | — | REASON | no | — | — | Optional cancellation reason |
| --message | message | option | no | — | MESSAGE | no | — | — | Optional cancellation message |

## Invocation schema

```json
{
  "additionalProperties": false,
  "properties": {
    "message": {
      "description": "Optional cancellation message",
      "type": "string"
    },
    "reason": {
      "description": "Optional cancellation reason",
      "type": "string"
    },
    "run_id": {
      "description": "Workflow run id",
      "position": 1,
      "type": "string"
    }
  },
  "required": [
    "run_id"
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
    "message": {
      "description": "Optional cancellation message",
      "type": "string"
    },
    "reason": {
      "description": "Optional cancellation reason",
      "type": "string"
    },
    "run_id": {
      "description": "Workflow run id",
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
    "response": {
      "additionalProperties": true,
      "description": "Response object returned by POST /bridge/v2/workflows/runs/{workflowRunId}/cancel.",
      "type": "object",
      "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
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
    "kind": "zotero-ui-required",
    "scope": "Zotero UI approval for the described Zotero-managed effect.",
    "timing": "before-command"
  },
  "arguments": [
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Workflow run id",
      "id": "run_id",
      "kind": "positional",
      "position": 1,
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "RUN_ID",
      "valueNames": [
        "RUN_ID"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Optional cancellation reason",
      "id": "reason",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--reason",
      "valueNames": [
        "REASON"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Optional cancellation message",
      "id": "message",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--message",
      "valueNames": [
        "MESSAGE"
      ]
    }
  ],
  "argv": [
    "run",
    "cancel"
  ],
  "argvBindings": [
    {
      "kind": "positional",
      "position": 1,
      "property": "run_id",
      "required": true,
      "takesValue": true,
      "token": "RUN_ID",
      "valueNames": [
        "RUN_ID"
      ]
    },
    {
      "kind": "option",
      "property": "reason",
      "required": false,
      "takesValue": true,
      "token": "--reason",
      "valueNames": [
        "REASON"
      ]
    },
    {
      "kind": "option",
      "property": "message",
      "required": false,
      "takesValue": true,
      "token": "--message",
      "valueNames": [
        "MESSAGE"
      ]
    }
  ],
  "binding": "object",
  "category": "write",
  "command": "run cancel",
  "composition": null,
  "danger": "review",
  "effects": [
    {
      "description": "May change workflow control state.",
      "kind": "workflow-control",
      "stateChanged": true
    }
  ],
  "handleTransitions": [
    {
      "condition": "Required by the command invocation.",
      "direction": "consume",
      "handle": "workflowRunId",
      "lifetime": "caller-owned",
      "required": true
    }
  ],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {},
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "message": {
        "description": "Optional cancellation message",
        "type": "string"
      },
      "reason": {
        "description": "Optional cancellation reason",
        "type": "string"
      },
      "run_id": {
        "description": "Workflow run id",
        "position": 1,
        "type": "string"
      }
    },
    "required": [
      "run_id"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "run cancel",
    "run",
    "cancel",
    "run_id",
    "RUN_ID",
    "reason",
    "REASON",
    "message",
    "MESSAGE"
  ],
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "message": {
        "description": "Optional cancellation message",
        "type": "string"
      },
      "reason": {
        "description": "Optional cancellation reason",
        "type": "string"
      },
      "run_id": {
        "description": "Workflow run id",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "recovery": [
    {
      "action": "Inspect stateChange and handleConsumption before repeating the operation.",
      "nextCommand": "surface describe",
      "requiresHandles": [],
      "stateCheck": "none",
      "when": "The operation fails or completion is uncertain."
    }
  ],
  "resultSchema": {
    "additionalProperties": true,
    "properties": {
      "response": {
        "additionalProperties": true,
        "description": "Response object returned by POST /bridge/v2/workflows/runs/{workflowRunId}/cancel.",
        "type": "object",
        "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
      }
    },
    "type": "object",
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
  },
  "summary": "Request cancellation of a workflow run",
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v2/workflows/runs/{workflowRunId}/cancel"
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

- Canonical argv path: `run` `cancel`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Structured binding mode: `object`.
- Intent visibility: `visible`.
- Operational aliases: `run cancel`, `run`, `cancel`, `run_id`, `RUN_ID`, `reason`, `REASON`, `message`, `MESSAGE`.

### Effects

```json
[
  {
    "description": "May change workflow control state.",
    "kind": "workflow-control",
    "stateChanged": true
  }
]
```

### Approval

```json
{
  "kind": "zotero-ui-required",
  "scope": "Zotero UI approval for the described Zotero-managed effect.",
  "timing": "before-command"
}
```

### Handle transitions

```json
[
  {
    "condition": "Required by the command invocation.",
    "direction": "consume",
    "handle": "workflowRunId",
    "lifetime": "caller-owned",
    "required": true
  }
]
```

### Recovery

```json
[
  {
    "action": "Inspect stateChange and handleConsumption before repeating the operation.",
    "nextCommand": "surface describe",
    "requiresHandles": [],
    "stateCheck": "none",
    "when": "The operation fails or completion is uncertain."
  }
]
```

### Targets

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v2/workflows/runs/{workflowRunId}/cancel"
  }
]
```
