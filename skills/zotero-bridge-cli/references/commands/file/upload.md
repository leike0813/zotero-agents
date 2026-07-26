# `zotero-bridge file upload`

Upload one local file through Zotero Bridge and return a short-lived file handle

## Usage

```console
zotero-bridge file upload [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] PATH <PATH> [--display-name <DISPLAY_NAME>] [--content-type <CONTENT_TYPE>]
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
| PATH | path | positional | yes | — | PATH | no | — | — | Local file path to upload |
| --display-name | display_name | option | no | — | DISPLAY_NAME | no | — | — | Display name stored in the Zotero-side file descriptor |
| --content-type | content_type | option | no | — | CONTENT_TYPE | no | — | — | Content type for the uploaded file |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "description": "Local file path to upload",
      "position": 1
    },
    "display-name": {
      "type": "string",
      "description": "Display name stored in the Zotero-side file descriptor"
    },
    "content-type": {
      "type": "string",
      "description": "Content type for the uploaded file"
    }
  },
  "required": [
    "path"
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
    "path": {
      "type": "string",
      "description": "Local file path to upload"
    },
    "display_name": {
      "type": "string",
      "description": "Display name stored in the Zotero-side file descriptor"
    },
    "content_type": {
      "type": "string",
      "description": "Content type for the uploaded file"
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
    "fileId": {
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
  "command": "file upload",
  "argv": [
    "file",
    "upload"
  ],
  "summary": "Upload one local file through Zotero Bridge and return a short-lived file handle",
  "category": "write",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Local file path to upload",
        "position": 1
      },
      "display-name": {
        "type": "string",
        "description": "Display name stored in the Zotero-side file descriptor"
      },
      "content-type": {
        "type": "string",
        "description": "Content type for the uploaded file"
      }
    },
    "required": [
      "path"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "path",
      "kind": "positional",
      "token": "PATH",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Local file path to upload",
      "valueNames": [
        "PATH"
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
      "help": "Display name stored in the Zotero-side file descriptor",
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
      "help": "Content type for the uploaded file",
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
      "property": "path",
      "kind": "positional",
      "token": "PATH",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "PATH"
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
      "path": {
        "type": "string",
        "description": "Local file path to upload"
      },
      "display_name": {
        "type": "string",
        "description": "Display name stored in the Zotero-side file descriptor"
      },
      "content_type": {
        "type": "string",
        "description": "Content type for the uploaded file"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "fileId": {
        "type": "string"
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
      "kind": "ephemeral-file",
      "stateChanged": true,
      "description": "May change ephemeral file state."
    }
  ],
  "approvalContract": {
    "kind": "none",
    "timing": "none",
    "scope": "No Zotero UI approval; provider runtimes may still request their own permission."
  },
  "handleTransitions": [
    {
      "handle": "fileId",
      "direction": "produce",
      "required": false,
      "condition": "Returned when the corresponding operation succeeds.",
      "lifetime": "short-lived"
    }
  ],
  "recovery": [
    {
      "when": "The operation fails or completion is uncertain.",
      "stateCheck": "command-result",
      "requiresHandles": [],
      "action": "Inspect stateChange and handleConsumption before repeating the operation.",
      "nextCommand": "surface describe"
    }
  ],
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v1/files/upload"
    }
  ],
  "operationalAliases": [
    "file upload",
    "file",
    "upload",
    "path",
    "PATH",
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

- Canonical argv path: `file` `upload`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Intent visibility: `visible`.
- Operational aliases: `file upload`, `file`, `upload`, `path`, `PATH`, `display_name`, `display-name`, `DISPLAY_NAME`, `content_type`, `content-type`, `CONTENT_TYPE`.

### Effects

```json
[
  {
    "kind": "ephemeral-file",
    "stateChanged": true,
    "description": "May change ephemeral file state."
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
    "handle": "fileId",
    "direction": "produce",
    "required": false,
    "condition": "Returned when the corresponding operation succeeds.",
    "lifetime": "short-lived"
  }
]
```

### Recovery

```json
[
  {
    "when": "The operation fails or completion is uncertain.",
    "stateCheck": "command-result",
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
    "target": "POST /bridge/v1/files/upload"
  }
]
```
