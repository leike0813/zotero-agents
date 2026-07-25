# `zotero-bridge workflow agent-apply`

Apply finalized self-owned agent workflow result bundles

## Usage

```console
zotero-bridge workflow agent-apply [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] AGENT_RUN_ID <AGENT_RUN_ID> --result <AGENT_REQUEST_ID=BUNDLE_PATH>
```

The global options may appear before or after the leaf command. Use `--schema` to inspect raw structured-input schemas without loading a profile or connecting to Zotero.

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
  "type": "object",
  "properties": {
    "agent_run_id": {
      "type": "string",
      "description": "Agent run id returned by workflow agent-run",
      "position": 1
    },
    "result": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Apply-back result mapping. Repeat for multiple request bundles."
    }
  },
  "required": [
    "agent_run_id",
    "result"
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
    "agent_run_id": {
      "type": "string",
      "description": "Agent run id returned by workflow agent-run"
    },
    "result": {
      "type": "string",
      "description": "Apply-back result mapping. Repeat for multiple request bundles."
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
    "applyReceipt": {
      "type": "string"
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
  "command": "workflow agent-apply",
  "argv": [
    "workflow",
    "agent-apply"
  ],
  "summary": "Apply finalized self-owned agent workflow result bundles",
  "category": "write",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "agent_run_id": {
        "type": "string",
        "description": "Agent run id returned by workflow agent-run",
        "position": 1
      },
      "result": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Apply-back result mapping. Repeat for multiple request bundles."
      }
    },
    "required": [
      "agent_run_id",
      "result"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "agent_run_id",
      "kind": "positional",
      "token": "AGENT_RUN_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Agent run id returned by workflow agent-run",
      "valueNames": [
        "AGENT_RUN_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "results",
      "kind": "option",
      "token": "--result",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Apply-back result mapping. Repeat for multiple request bundles.",
      "valueNames": [
        "AGENT_REQUEST_ID=BUNDLE_PATH"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": true,
      "numArgs": "1",
      "aliases": [],
      "defaultValues": []
    }
  ],
  "argvBindings": [
    {
      "property": "agent_run_id",
      "kind": "positional",
      "token": "AGENT_RUN_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "AGENT_RUN_ID"
      ]
    },
    {
      "property": "result",
      "kind": "option",
      "token": "--result",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "AGENT_REQUEST_ID=BUNDLE_PATH"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "agent_run_id": {
        "type": "string",
        "description": "Agent run id returned by workflow agent-run"
      },
      "result": {
        "type": "string",
        "description": "Apply-back result mapping. Repeat for multiple request bundles."
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "applyReceipt": {
        "type": "string"
      }
    },
    "additionalProperties": true,
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
  },
  "pagination": "none",
  "effects": [
    {
      "kind": "workflow-control",
      "stateChanged": true,
      "description": "May change workflow control state."
    },
    {
      "kind": "zotero-library",
      "stateChanged": true,
      "description": "May apply finalized Agent results to the Zotero library."
    }
  ],
  "approvalContract": {
    "kind": "conditional",
    "timing": "apply-back",
    "scope": "Each result request is preflighted before any approval or handle consumption."
  },
  "handleTransitions": [
    {
      "handle": "agentRunId",
      "direction": "consume",
      "required": true,
      "condition": "Required by the command invocation.",
      "lifetime": "one-shot"
    },
    {
      "handle": "agentRequestId",
      "direction": "consume",
      "required": true,
      "condition": "Required by the command invocation.",
      "lifetime": "caller-owned"
    },
    {
      "handle": "applyReceipt",
      "direction": "produce",
      "required": false,
      "condition": "Returned when the corresponding operation succeeds.",
      "lifetime": "response"
    }
  ],
  "recovery": [
    {
      "when": "Apply-back fails after preflight or may have partially written results.",
      "stateCheck": "caller-held-handle",
      "requiresHandles": [
        "agentRunId"
      ],
      "action": "Read the persisted per-request apply receipt before retrying any result.",
      "nextCommand": "workflow agent-apply-status"
    }
  ],
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v1/workflows/agent-runs/{agentRunId}/apply"
    }
  ],
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
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `workflow` `agent-apply`.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Intent visibility: `visible`.
- Operational aliases: `workflow agent-apply`, `workflow`, `agent-apply`, `agent_run_id`, `AGENT_RUN_ID`, `results`, `result`, `AGENT_REQUEST_ID=BUNDLE_PATH`.

### Effects

```json
[
  {
    "kind": "workflow-control",
    "stateChanged": true,
    "description": "May change workflow control state."
  },
  {
    "kind": "zotero-library",
    "stateChanged": true,
    "description": "May apply finalized Agent results to the Zotero library."
  }
]
```

### Approval

```json
{
  "kind": "conditional",
  "timing": "apply-back",
  "scope": "Each result request is preflighted before any approval or handle consumption."
}
```

### Handle transitions

```json
[
  {
    "handle": "agentRunId",
    "direction": "consume",
    "required": true,
    "condition": "Required by the command invocation.",
    "lifetime": "one-shot"
  },
  {
    "handle": "agentRequestId",
    "direction": "consume",
    "required": true,
    "condition": "Required by the command invocation.",
    "lifetime": "caller-owned"
  },
  {
    "handle": "applyReceipt",
    "direction": "produce",
    "required": false,
    "condition": "Returned when the corresponding operation succeeds.",
    "lifetime": "response"
  }
]
```

### Recovery

```json
[
  {
    "when": "Apply-back fails after preflight or may have partially written results.",
    "stateCheck": "caller-held-handle",
    "requiresHandles": [
      "agentRunId"
    ],
    "action": "Read the persisted per-request apply receipt before retrying any result.",
    "nextCommand": "workflow agent-apply-status"
  }
]
```

### Targets

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v1/workflows/agent-runs/{agentRunId}/apply"
  }
]
```
