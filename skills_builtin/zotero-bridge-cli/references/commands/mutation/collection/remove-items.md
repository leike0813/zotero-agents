# `zotero-bridge mutation collection remove-items`

Remove Zotero items from a collection

## Usage

```console
zotero-bridge mutation collection remove-items [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --collection <COLLECTION> --items <ITEMS>
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
| --collection | collection | option | yes | — | COLLECTION | no | — | — | Zotero collection ref |
| --items | items | option | yes | — | ITEMS | yes | — | — | Target Zotero item refs |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "collection": {
      "type": "string",
      "description": "Zotero collection ref"
    },
    "items": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Target Zotero item refs"
    }
  },
  "required": [
    "collection",
    "items"
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
    "collection": {
      "type": "string",
      "description": "Zotero collection ref"
    },
    "items": {
      "type": "string",
      "description": "Target Zotero item refs"
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

No structured-input example applies. Build argv from the parameter tables and confirm the command with `surface describe` before execution.

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

```json
{
  "command": "mutation collection remove-items",
  "argv": [
    "mutation",
    "collection",
    "remove-items"
  ],
  "summary": "Remove Zotero items from a collection",
  "category": "write",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "collection": {
        "type": "string",
        "description": "Zotero collection ref"
      },
      "items": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Target Zotero item refs"
      }
    },
    "required": [
      "collection",
      "items"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "collection",
      "kind": "option",
      "token": "--collection",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Zotero collection ref",
      "valueNames": [
        "COLLECTION"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "items",
      "kind": "option",
      "token": "--items",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Target Zotero item refs",
      "valueNames": [
        "ITEMS"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": true,
      "aliases": [],
      "defaultValues": []
    }
  ],
  "argvBindings": [
    {
      "property": "collection",
      "kind": "option",
      "token": "--collection",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "COLLECTION"
      ]
    },
    {
      "property": "items",
      "kind": "option",
      "token": "--items",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "ITEMS"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "collection": {
        "type": "string",
        "description": "Zotero collection ref"
      },
      "items": {
        "type": "string",
        "description": "Target Zotero item refs"
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
    "mutation collection remove-items",
    "mutation",
    "collection",
    "remove-items",
    "COLLECTION",
    "items",
    "ITEMS"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `mutation` `collection` `remove-items`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Intent visibility: `visible`.
- Operational aliases: `mutation collection remove-items`, `mutation`, `collection`, `remove-items`, `COLLECTION`, `items`, `ITEMS`.

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
