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
  "type": "object",
  "properties": {
    "queue_id": {
      "type": "string",
      "description": "Opaque queue id returned by workflow queue list",
      "position": 1
    }
  },
  "required": [
    "queue_id"
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
    "queue_id": {
      "type": "string",
      "description": "Opaque queue id returned by workflow queue list"
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
    "status": {
      "const": "canceled"
    },
    "queueId": {
      "type": "string"
    }
  },
  "required": [
    "status",
    "queueId"
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
  "command": "workflow queue cancel",
  "argv": [
    "workflow",
    "queue",
    "cancel"
  ],
  "summary": "Cancel one still-pending Zotero-managed workflow queue unit",
  "category": "write",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "queue_id": {
        "type": "string",
        "description": "Opaque queue id returned by workflow queue list",
        "position": 1
      }
    },
    "required": [
      "queue_id"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "queue_id",
      "kind": "positional",
      "token": "QUEUE_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Opaque queue id returned by workflow queue list",
      "valueNames": [
        "QUEUE_ID"
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
      "property": "queue_id",
      "kind": "positional",
      "token": "QUEUE_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "QUEUE_ID"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "queue_id": {
        "type": "string",
        "description": "Opaque queue id returned by workflow queue list"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "status": {
        "const": "canceled"
      },
      "queueId": {
        "type": "string"
      }
    },
    "required": [
      "status",
      "queueId"
    ],
    "additionalProperties": false
  },
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "effects": [
    {
      "kind": "workflow-control",
      "stateChanged": true,
      "description": "May change workflow control state."
    }
  ],
  "approvalContract": {
    "kind": "none",
    "timing": "none",
    "scope": "No Zotero UI approval; provider runtimes may still request their own permission."
  },
  "handleTransitions": [
    {
      "handle": "queueId",
      "direction": "consume",
      "required": true,
      "condition": "Required to cancel one unit that is still pending in the native Host queue.",
      "lifetime": "caller-owned"
    }
  ],
  "recovery": [
    {
      "when": "Cancellation fails or races with admission.",
      "stateCheck": "caller-held-handle",
      "requiresHandles": [
        "queueId"
      ],
      "action": "List the native queue again. Absence means the unit was admitted, canceled, or settled; inspect its submission and tasks before taking further action.",
      "nextCommand": "workflow queue list"
    }
  ],
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v1/workflows/queue/{queueId}/cancel"
    }
  ],
  "operationalAliases": [
    "workflow queue cancel",
    "workflow",
    "queue",
    "cancel",
    "queue_id",
    "QUEUE_ID"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `workflow` `queue` `cancel`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Intent visibility: `visible`.
- Operational aliases: `workflow queue cancel`, `workflow`, `queue`, `cancel`, `queue_id`, `QUEUE_ID`.

### Effects

```json
[
  {
    "kind": "workflow-control",
    "stateChanged": true,
    "description": "May change workflow control state."
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
  {
    "handle": "queueId",
    "direction": "consume",
    "required": true,
    "condition": "Required to cancel one unit that is still pending in the native Host queue.",
    "lifetime": "caller-owned"
  }
]
```

### Recovery

```json
[
  {
    "when": "Cancellation fails or races with admission.",
    "stateCheck": "caller-held-handle",
    "requiresHandles": [
      "queueId"
    ],
    "action": "List the native queue again. Absence means the unit was admitted, canceled, or settled; inspect its submission and tasks before taking further action.",
    "nextCommand": "workflow queue list"
  }
]
```

### Targets

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v1/workflows/queue/{queueId}/cancel"
  }
]
```
