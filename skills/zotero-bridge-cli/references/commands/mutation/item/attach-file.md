# `zotero-bridge mutation item attach-file`

Attach a file uploaded through Zotero Bridge to a Zotero item

## Usage

```console
zotero-bridge mutation item attach-file [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --item <ITEM> --file-id <FILE_ID> [--display-name <DISPLAY_NAME>] [--content-type <CONTENT_TYPE>]
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
| --item | item | option | yes | — | ITEM | no | — | — | Target Zotero item ref |
| --file-id | file_id | option | yes | — | FILE_ID | no | — | — | Bridge-issued uploaded file id |
| --display-name | display_name | option | no | — | DISPLAY_NAME | no | — | — | Attachment display name |
| --content-type | content_type | option | no | — | CONTENT_TYPE | no | — | — | Attachment content type |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "item": {
      "type": "string",
      "description": "Target Zotero item ref"
    },
    "file-id": {
      "type": "string",
      "description": "Bridge-issued uploaded file id"
    },
    "display-name": {
      "type": "string",
      "description": "Attachment display name"
    },
    "content-type": {
      "type": "string",
      "description": "Attachment content type"
    }
  },
  "required": [
    "item",
    "file-id"
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
    "item": {
      "type": "string",
      "description": "Target Zotero item ref"
    },
    "file_id": {
      "type": "string",
      "description": "Bridge-issued uploaded file id"
    },
    "display_name": {
      "type": "string",
      "description": "Attachment display name"
    },
    "content_type": {
      "type": "string",
      "description": "Attachment content type"
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
  "command": "mutation item attach-file",
  "argv": [
    "mutation",
    "item",
    "attach-file"
  ],
  "summary": "Attach a file uploaded through Zotero Bridge to a Zotero item",
  "category": "write",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "item": {
        "type": "string",
        "description": "Target Zotero item ref"
      },
      "file-id": {
        "type": "string",
        "description": "Bridge-issued uploaded file id"
      },
      "display-name": {
        "type": "string",
        "description": "Attachment display name"
      },
      "content-type": {
        "type": "string",
        "description": "Attachment content type"
      }
    },
    "required": [
      "item",
      "file-id"
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
      "help": "Target Zotero item ref",
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
      "id": "file_id",
      "kind": "option",
      "token": "--file-id",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Bridge-issued uploaded file id",
      "valueNames": [
        "FILE_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "display_name",
      "kind": "option",
      "token": "--display-name",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Attachment display name",
      "valueNames": [
        "DISPLAY_NAME"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "content_type",
      "kind": "option",
      "token": "--content-type",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Attachment content type",
      "valueNames": [
        "CONTENT_TYPE"
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
      "property": "file-id",
      "kind": "option",
      "token": "--file-id",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "FILE_ID"
      ]
    },
    {
      "property": "display-name",
      "kind": "option",
      "token": "--display-name",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "DISPLAY_NAME"
      ]
    },
    {
      "property": "content-type",
      "kind": "option",
      "token": "--content-type",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "CONTENT_TYPE"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "item": {
        "type": "string",
        "description": "Target Zotero item ref"
      },
      "file_id": {
        "type": "string",
        "description": "Bridge-issued uploaded file id"
      },
      "display_name": {
        "type": "string",
        "description": "Attachment display name"
      },
      "content_type": {
        "type": "string",
        "description": "Attachment content type"
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
  "handleTransitions": [
    {
      "handle": "itemRef",
      "direction": "consume",
      "required": true,
      "condition": "Required by the command invocation.",
      "lifetime": "caller-owned"
    },
    {
      "handle": "fileId",
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
      "kind": "capability",
      "target": "mutation.execute"
    }
  ],
  "operationalAliases": [
    "mutation item attach-file",
    "mutation",
    "item",
    "attach-file",
    "ITEM",
    "file_id",
    "file-id",
    "FILE_ID",
    "display_name",
    "display-name",
    "DISPLAY_NAME",
    "content_type",
    "content-type",
    "CONTENT_TYPE"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `mutation` `item` `attach-file`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Intent visibility: `visible`.
- Operational aliases: `mutation item attach-file`, `mutation`, `item`, `attach-file`, `ITEM`, `file_id`, `file-id`, `FILE_ID`, `display_name`, `display-name`, `DISPLAY_NAME`, `content_type`, `content-type`, `CONTENT_TYPE`.

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
  {
    "handle": "itemRef",
    "direction": "consume",
    "required": true,
    "condition": "Required by the command invocation.",
    "lifetime": "caller-owned"
  },
  {
    "handle": "fileId",
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
    "kind": "capability",
    "target": "mutation.execute"
  }
]
```
