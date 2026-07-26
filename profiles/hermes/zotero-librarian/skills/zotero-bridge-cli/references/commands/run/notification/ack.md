# `zotero-bridge run notification ack`

Acknowledge workflow notification inbox events

## Usage

```console
zotero-bridge run notification ack [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --event <EVENTS> [--client-id <CLIENT_ID>]
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
| --event | events | option | yes | — | EVENTS | yes | — | — | Notification event id |
| --client-id | client_id | option | no | — | CLIENT_ID | no | — | — | Best-effort Zotero notification client id |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "event": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Notification event id"
    },
    "client-id": {
      "type": "string",
      "description": "Best-effort Zotero notification client id"
    }
  },
  "required": [
    "event"
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
    "event": {
      "type": "string",
      "description": "Notification event id"
    },
    "client_id": {
      "type": "string",
      "description": "Best-effort Zotero notification client id"
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
    "response": {
      "type": "object",
      "description": "Response object returned by POST /bridge/v1/notifications/ack.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
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
  "command": "run notification ack",
  "argv": [
    "run",
    "notification",
    "ack"
  ],
  "summary": "Acknowledge workflow notification inbox events",
  "category": "write",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "event": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Notification event id"
      },
      "client-id": {
        "type": "string",
        "description": "Best-effort Zotero notification client id"
      }
    },
    "required": [
      "event"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "events",
      "kind": "option",
      "token": "--event",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Notification event id",
      "valueNames": [
        "EVENTS"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": true,
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
    }
  ],
  "argvBindings": [
    {
      "property": "event",
      "kind": "option",
      "token": "--event",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "EVENTS"
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
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "event": {
        "type": "string",
        "description": "Notification event id"
      },
      "client_id": {
        "type": "string",
        "description": "Best-effort Zotero notification client id"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "response": {
        "type": "object",
        "description": "Response object returned by POST /bridge/v1/notifications/ack.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
      }
    },
    "additionalProperties": true,
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
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
      "handle": "eventId",
      "direction": "consume",
      "required": true,
      "condition": "Required by the command invocation.",
      "lifetime": "caller-owned"
    }
  ],
  "recovery": [
    {
      "when": "The operation fails or completion is uncertain.",
      "stateCheck": "none",
      "requiresHandles": [],
      "action": "Inspect stateChange and handleConsumption before repeating the operation.",
      "nextCommand": "surface describe"
    }
  ],
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v1/notifications/ack"
    }
  ],
  "operationalAliases": [
    "run notification ack",
    "run",
    "notification",
    "ack",
    "events",
    "event",
    "EVENTS",
    "client_id",
    "client-id",
    "CLIENT_ID"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `run` `notification` `ack`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Intent visibility: `visible`.
- Operational aliases: `run notification ack`, `run`, `notification`, `ack`, `events`, `event`, `EVENTS`, `client_id`, `client-id`, `CLIENT_ID`.

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
    "handle": "eventId",
    "direction": "consume",
    "required": true,
    "condition": "Required by the command invocation.",
    "lifetime": "caller-owned"
  }
]
```

### Recovery

```json
[
  {
    "when": "The operation fails or completion is uncertain.",
    "stateCheck": "none",
    "requiresHandles": [],
    "action": "Inspect stateChange and handleConsumption before repeating the operation.",
    "nextCommand": "surface describe"
  }
]
```

### Targets

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v1/notifications/ack"
  }
]
```
