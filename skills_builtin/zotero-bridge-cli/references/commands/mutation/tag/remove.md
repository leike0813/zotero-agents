# `zotero-bridge mutation tag remove`

Remove tags from Zotero items

## Usage

```console
zotero-bridge mutation tag remove [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --items <ITEMS> --tags <TAGS>
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
| --items | items | option | yes | — | ITEMS | yes | — | — | Target Zotero item refs |
| --tags | tags | option | yes | — | TAGS | yes | — | — | Tags to add or remove |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Target Zotero item refs"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Tags to add or remove"
    }
  },
  "required": [
    "items",
    "tags"
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
    "items": {
      "type": "string",
      "description": "Target Zotero item refs"
    },
    "tags": {
      "type": "string",
      "description": "Tags to add or remove"
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
  "command": "mutation tag remove",
  "argv": [
    "mutation",
    "tag",
    "remove"
  ],
  "summary": "Remove tags from Zotero items",
  "category": "write",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Target Zotero item refs"
      },
      "tags": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Tags to add or remove"
      }
    },
    "required": [
      "items",
      "tags"
    ],
    "additionalProperties": false
  },
  "arguments": [
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
    },
    {
      "id": "tags",
      "kind": "option",
      "token": "--tags",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Tags to add or remove",
      "valueNames": [
        "TAGS"
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
      "property": "items",
      "kind": "option",
      "token": "--items",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "ITEMS"
      ]
    },
    {
      "property": "tags",
      "kind": "option",
      "token": "--tags",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "TAGS"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "items": {
        "type": "string",
        "description": "Target Zotero item refs"
      },
      "tags": {
        "type": "string",
        "description": "Tags to add or remove"
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
    "mutation tag remove",
    "mutation",
    "tag",
    "remove",
    "items",
    "ITEMS",
    "tags",
    "TAGS"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `mutation` `tag` `remove`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Intent visibility: `visible`.
- Operational aliases: `mutation tag remove`, `mutation`, `tag`, `remove`, `items`, `ITEMS`, `tags`, `TAGS`.

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
