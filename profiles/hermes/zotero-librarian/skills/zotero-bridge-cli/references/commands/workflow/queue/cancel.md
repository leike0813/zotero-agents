# `zotero-bridge workflow queue cancel`

Cancel one still-pending Zotero-managed workflow queue unit

## Usage

```console
zotero-bridge workflow queue cancel [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] QUEUE_ID <QUEUE_ID>
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
| QUEUE_ID | queue_id | positional | yes | — | QUEUE_ID | no | — | — | Opaque queue id returned by workflow queue list |

## Invocation schema

```json
{
  "additionalProperties": false,
  "properties": {
    "queue_id": {
      "description": "Opaque queue id returned by workflow queue list",
      "position": 1,
      "type": "string"
    }
  },
  "required": [
    "queue_id"
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
    "queue_id": {
      "description": "Opaque queue id returned by workflow queue list",
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
    "queueId": {
      "type": "string"
    },
    "status": {
      "const": "canceled"
    }
  },
  "required": [
    "status",
    "queueId"
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
      "help": "Opaque queue id returned by workflow queue list",
      "id": "queue_id",
      "kind": "positional",
      "position": 1,
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "QUEUE_ID",
      "valueNames": [
        "QUEUE_ID"
      ]
    }
  ],
  "argv": [
    "workflow",
    "queue",
    "cancel"
  ],
  "argvBindings": [
    {
      "kind": "positional",
      "position": 1,
      "property": "queue_id",
      "required": true,
      "takesValue": true,
      "token": "QUEUE_ID",
      "valueNames": [
        "QUEUE_ID"
      ]
    }
  ],
  "binding": "object",
  "category": "write",
  "command": "workflow queue cancel",
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
      "condition": "Required to cancel one unit that is still pending in the native Host queue.",
      "direction": "consume",
      "handle": "queueId",
      "lifetime": "caller-owned",
      "required": true
    }
  ],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {},
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "queue_id": {
        "description": "Opaque queue id returned by workflow queue list",
        "position": 1,
        "type": "string"
      }
    },
    "required": [
      "queue_id"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "workflow queue cancel",
    "workflow",
    "queue",
    "cancel",
    "queue_id",
    "QUEUE_ID"
  ],
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "queue_id": {
        "description": "Opaque queue id returned by workflow queue list",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "recovery": [
    {
      "action": "List the native queue again. Absence means the unit was admitted, canceled, or settled; inspect its submission and tasks before taking further action.",
      "nextCommand": "workflow queue list",
      "requiresHandles": [
        "queueId"
      ],
      "stateCheck": "caller-held-handle",
      "when": "Cancellation fails or races with admission."
    }
  ],
  "resultSchema": {
    "additionalProperties": false,
    "properties": {
      "queueId": {
        "type": "string"
      },
      "status": {
        "const": "canceled"
      }
    },
    "required": [
      "status",
      "queueId"
    ],
    "type": "object"
  },
  "summary": "Cancel one still-pending Zotero-managed workflow queue unit",
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v2/workflows/queue/{queueId}/cancel"
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

- Canonical argv path: `workflow` `queue` `cancel`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Structured binding mode: `object`.
- Intent visibility: `visible`.
- Operational aliases: `workflow queue cancel`, `workflow`, `queue`, `cancel`, `queue_id`, `QUEUE_ID`.

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
  "kind": "none",
  "scope": "No Zotero UI approval; provider runtimes may still request their own permission.",
  "timing": "none"
}
```

### Handle transitions

```json
[
  {
    "condition": "Required to cancel one unit that is still pending in the native Host queue.",
    "direction": "consume",
    "handle": "queueId",
    "lifetime": "caller-owned",
    "required": true
  }
]
```

### Recovery

```json
[
  {
    "action": "List the native queue again. Absence means the unit was admitted, canceled, or settled; inspect its submission and tasks before taking further action.",
    "nextCommand": "workflow queue list",
    "requiresHandles": [
      "queueId"
    ],
    "stateCheck": "caller-held-handle",
    "when": "Cancellation fails or races with admission."
  }
]
```

### Targets

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v2/workflows/queue/{queueId}/cancel"
  }
]
```
