# `zotero-bridge mutation note create`

Create a child note under one Zotero item

## Usage

```console
zotero-bridge mutation note create [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --item <ITEM> --input <JSON_OR_FILE>
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
| --item | item | option | yes | — | ITEM | no | — | — | Parent Zotero item ref |
| --input | input | option | yes | — | JSON_OR_FILE | no | — | — | Note payload JSON object |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "item": {
      "type": "string",
      "description": "Parent Zotero item ref"
    },
    "input": {
      "type": "string",
      "description": "Note payload JSON object"
    }
  },
  "required": [
    "item",
    "input"
  ],
  "additionalProperties": false
}
```

## Structured input schemas

### `--input` (input)

Required: `true`.

```json
{
  "type": "object",
  "properties": {
    "item": {
      "type": "string",
      "description": "Parent Zotero item ref"
    },
    "input": {
      "type": "string",
      "description": "Note payload JSON object"
    }
  },
  "required": [],
  "additionalProperties": false
}
```

## Composed payload schema

```json
{
  "type": "object",
  "properties": {
    "item": {
      "type": "string",
      "description": "Parent Zotero item ref"
    },
    "input": {
      "type": "string",
      "description": "Note payload JSON object"
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
    "capability": {
      "type": "string"
    },
    "approval": {
      "type": "object"
    },
    "data": {
      "type": "object",
      "description": "Result data owned by mutation.execute.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed."
    }
  },
  "additionalProperties": false
}
```

## Examples

### input: shape-only

Minimal JSON shape for --input.

```console
zotero-bridge mutation note create --input '{}'
```

Prerequisites:

- Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution.

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

```json
{
  "command": "mutation note create",
  "argv": [
    "mutation",
    "note",
    "create"
  ],
  "summary": "Create a child note under one Zotero item",
  "category": "write",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "item": {
        "type": "string",
        "description": "Parent Zotero item ref"
      },
      "input": {
        "type": "string",
        "description": "Note payload JSON object"
      }
    },
    "required": [
      "item",
      "input"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "item",
      "kind": "option",
      "token": "--item",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Parent Zotero item ref",
      "valueNames": [
        "ITEM"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "input",
      "kind": "option",
      "token": "--input",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Note payload JSON object",
      "valueNames": [
        "JSON_OR_FILE"
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
      "property": "item",
      "kind": "option",
      "token": "--item",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "ITEM"
      ]
    },
    {
      "property": "input",
      "kind": "option",
      "token": "--input",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "inputSchemas": {
    "input": {
      "token": "--input",
      "required": true,
      "requiredWhen": [],
      "schema": {
        "type": "object",
        "properties": {
          "item": {
            "type": "string",
            "description": "Parent Zotero item ref"
          },
          "input": {
            "type": "string",
            "description": "Note payload JSON object"
          }
        },
        "required": [],
        "additionalProperties": false
      },
      "examples": [
        {
          "kind": "shape-only",
          "value": {},
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "description": "Minimal JSON shape for --input."
        }
      ]
    }
  },
  "payloadSchema": {
    "type": "object",
    "properties": {
      "item": {
        "type": "string",
        "description": "Parent Zotero item ref"
      },
      "input": {
        "type": "string",
        "description": "Note payload JSON object"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "capability": {
        "type": "string"
      },
      "approval": {
        "type": "object"
      },
      "data": {
        "type": "object",
        "description": "Result data owned by mutation.execute.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed."
      }
    },
    "additionalProperties": false
  },
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "effects": [
    {
      "kind": "zotero-library",
      "stateChanged": true,
      "description": "May change zotero library state."
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
      "kind": "capability",
      "target": "mutation.execute"
    }
  ],
  "operationalAliases": [
    "mutation note create",
    "mutation",
    "note",
    "create",
    "item",
    "ITEM",
    "input",
    "JSON_OR_FILE"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `mutation` `note` `create`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Intent visibility: `visible`.
- Operational aliases: `mutation note create`, `mutation`, `note`, `create`, `item`, `ITEM`, `input`, `JSON_OR_FILE`.

### Effects

```json
[
  {
    "kind": "zotero-library",
    "stateChanged": true,
    "description": "May change zotero library state."
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
    "kind": "capability",
    "target": "mutation.execute"
  }
]
```
