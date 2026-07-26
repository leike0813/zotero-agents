# `zotero-bridge synthesis cache invalidate`

Invalidate a constrained Synthesis cache scope

## Usage

```console
zotero-bridge synthesis cache invalidate [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --scope <SCOPE> [--id <ID>]
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
| --scope | scope | option | yes | — | SCOPE; values: topic, graph, index | no | — | — | Cache scope |
| --id | id | option | no | — | ID | no | — | — | Optional opaque target id |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "scope": {
      "type": "string",
      "description": "Cache scope"
    },
    "id": {
      "type": "string",
      "description": "Optional opaque target id"
    }
  },
  "required": [
    "scope"
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
    "scope": {
      "type": "string",
      "description": "Cache scope"
    },
    "id": {
      "type": "string",
      "description": "Optional opaque target id"
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
      "description": "Response object returned by POST /bridge/v1/synthesis/cache/invalidate.",
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
  "command": "synthesis cache invalidate",
  "argv": [
    "synthesis",
    "cache",
    "invalidate"
  ],
  "summary": "Invalidate a constrained Synthesis cache scope",
  "category": "maintenance",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "scope": {
        "type": "string",
        "description": "Cache scope"
      },
      "id": {
        "type": "string",
        "description": "Optional opaque target id"
      }
    },
    "required": [
      "scope"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "scope",
      "kind": "option",
      "token": "--scope",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Cache scope",
      "valueNames": [
        "SCOPE"
      ],
      "possibleValues": [
        "topic",
        "graph",
        "index"
      ],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "id",
      "kind": "option",
      "token": "--id",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Optional opaque target id",
      "valueNames": [
        "ID"
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
      "property": "scope",
      "kind": "option",
      "token": "--scope",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "SCOPE"
      ]
    },
    {
      "property": "id",
      "kind": "option",
      "token": "--id",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "ID"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "scope": {
        "type": "string",
        "description": "Cache scope"
      },
      "id": {
        "type": "string",
        "description": "Optional opaque target id"
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
        "description": "Response object returned by POST /bridge/v1/synthesis/cache/invalidate.",
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
      "kind": "cache-maintenance",
      "stateChanged": true,
      "description": "May change cache maintenance state."
    }
  ],
  "approvalContract": {
    "kind": "zotero-ui-required",
    "timing": "before-command",
    "scope": "Zotero UI approval for the described Zotero-managed effect."
  },
  "handleTransitions": [],
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
      "target": "POST /bridge/v1/synthesis/cache/invalidate"
    }
  ],
  "operationalAliases": [
    "synthesis cache invalidate",
    "synthesis",
    "cache",
    "invalidate",
    "scope",
    "SCOPE",
    "id",
    "ID"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `synthesis` `cache` `invalidate`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `maintenance`; danger: `review`.
- Intent visibility: `visible`.
- Operational aliases: `synthesis cache invalidate`, `synthesis`, `cache`, `invalidate`, `scope`, `SCOPE`, `id`, `ID`.

### Effects

```json
[
  {
    "kind": "cache-maintenance",
    "stateChanged": true,
    "description": "May change cache maintenance state."
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
    "target": "POST /bridge/v1/synthesis/cache/invalidate"
  }
]
```
