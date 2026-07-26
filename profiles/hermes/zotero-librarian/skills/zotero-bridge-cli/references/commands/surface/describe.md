# `zotero-bridge surface describe`

Describe one canonical command

## Usage

```console
zotero-bridge surface describe [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] COMMAND <COMMAND> [--json]
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
| COMMAND | command | positional | yes | — | COMMAND; numArgs: 1.. | yes | — | — | Canonical command, for example workflow submit |
| --json | json | option | no | — | JSON; values: true, false | no | — | — | Emit JSON (the CLI output contract is always JSON) |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "command": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Canonical command, for example workflow submit",
      "position": 1
    },
    "json": {
      "type": "boolean",
      "description": "Emit JSON (the CLI output contract is always JSON)"
    }
  },
  "required": [
    "command"
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
    "command": {
      "type": "string",
      "description": "Canonical command, for example workflow submit"
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
      "description": "Response object returned by embedded host-bridge.agent-surface.v5.",
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
  "command": "surface describe",
  "argv": [
    "surface",
    "describe"
  ],
  "summary": "Describe one canonical command",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "command": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Canonical command, for example workflow submit",
        "position": 1
      },
      "json": {
        "type": "boolean",
        "description": "Emit JSON (the CLI output contract is always JSON)"
      }
    },
    "required": [
      "command"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "command",
      "kind": "positional",
      "token": "COMMAND",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Canonical command, for example workflow submit",
      "valueNames": [
        "COMMAND"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": true,
      "numArgs": "1..",
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "json",
      "kind": "option",
      "token": "--json",
      "takesValue": false,
      "required": false,
      "global": false,
      "help": "Emit JSON (the CLI output contract is always JSON)",
      "valueNames": [
        "JSON"
      ],
      "possibleValues": [
        "true",
        "false"
      ],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    }
  ],
  "argvBindings": [
    {
      "property": "command",
      "kind": "positional",
      "token": "COMMAND",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "COMMAND"
      ]
    },
    {
      "property": "json",
      "kind": "option",
      "token": "--json",
      "takesValue": false,
      "required": false,
      "valueNames": [
        "JSON"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "command": {
        "type": "string",
        "description": "Canonical command, for example workflow submit"
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
        "description": "Response object returned by embedded host-bridge.agent-surface.v5.",
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
      "action": "Inspect the error and retry only when retryable is true."
    }
  ],
  "targets": [
    {
      "kind": "service",
      "target": "embedded host-bridge.agent-surface.v5"
    }
  ],
  "operationalAliases": [
    "surface describe",
    "surface",
    "describe",
    "command",
    "COMMAND",
    "json",
    "JSON"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `surface` `describe`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Intent visibility: `visible`.
- Operational aliases: `surface describe`, `surface`, `describe`, `command`, `COMMAND`, `json`, `JSON`.

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
    "action": "Inspect the error and retry only when retryable is true."
  }
]
```

### Targets

```json
[
  {
    "kind": "service",
    "target": "embedded host-bridge.agent-surface.v5"
  }
]
```
