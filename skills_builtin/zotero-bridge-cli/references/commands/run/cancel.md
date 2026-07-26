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
  "type": "object",
  "properties": {
    "run_id": {
      "type": "string",
      "description": "Workflow run id",
      "position": 1
    },
    "reason": {
      "type": "string",
      "description": "Optional cancellation reason"
    },
    "message": {
      "type": "string",
      "description": "Optional cancellation message"
    }
  },
  "required": [
    "run_id"
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
    "run_id": {
      "type": "string",
      "description": "Workflow run id"
    },
    "reason": {
      "type": "string",
      "description": "Optional cancellation reason"
    },
    "message": {
      "type": "string",
      "description": "Optional cancellation message"
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
      "description": "Response object returned by POST /bridge/v1/workflows/runs/{workflowRunId}/cancel.",
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
  "command": "run cancel",
  "argv": [
    "run",
    "cancel"
  ],
  "summary": "Request cancellation of a workflow run",
  "category": "write",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "run_id": {
        "type": "string",
        "description": "Workflow run id",
        "position": 1
      },
      "reason": {
        "type": "string",
        "description": "Optional cancellation reason"
      },
      "message": {
        "type": "string",
        "description": "Optional cancellation message"
      }
    },
    "required": [
      "run_id"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "run_id",
      "kind": "positional",
      "token": "RUN_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Workflow run id",
      "valueNames": [
        "RUN_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "reason",
      "kind": "option",
      "token": "--reason",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Optional cancellation reason",
      "valueNames": [
        "REASON"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "message",
      "kind": "option",
      "token": "--message",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Optional cancellation message",
      "valueNames": [
        "MESSAGE"
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
      "property": "run_id",
      "kind": "positional",
      "token": "RUN_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "RUN_ID"
      ]
    },
    {
      "property": "reason",
      "kind": "option",
      "token": "--reason",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "REASON"
      ]
    },
    {
      "property": "message",
      "kind": "option",
      "token": "--message",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "MESSAGE"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "run_id": {
        "type": "string",
        "description": "Workflow run id"
      },
      "reason": {
        "type": "string",
        "description": "Optional cancellation reason"
      },
      "message": {
        "type": "string",
        "description": "Optional cancellation message"
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
        "description": "Response object returned by POST /bridge/v1/workflows/runs/{workflowRunId}/cancel.",
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
    "kind": "zotero-ui-required",
    "timing": "before-command",
    "scope": "Zotero UI approval for the described Zotero-managed effect."
  },
  "handleTransitions": [
    {
      "handle": "workflowRunId",
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
      "target": "POST /bridge/v1/workflows/runs/{workflowRunId}/cancel"
    }
  ],
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
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `run` `cancel`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Intent visibility: `visible`.
- Operational aliases: `run cancel`, `run`, `cancel`, `run_id`, `RUN_ID`, `reason`, `REASON`, `message`, `MESSAGE`.

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
  "kind": "zotero-ui-required",
  "timing": "before-command",
  "scope": "Zotero UI approval for the described Zotero-managed effect."
}
```

### Handle transitions

```json
[
  {
    "handle": "workflowRunId",
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
    "target": "POST /bridge/v1/workflows/runs/{workflowRunId}/cancel"
  }
]
```
