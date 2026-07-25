# `zotero-bridge library annotation list`

List reader annotations for one Zotero item

## Usage

```console
zotero-bridge library annotation list [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --item <ITEM>
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
| --item | item | option | yes | — | ITEM | no | — | — | Zotero item ref: key, numeric id, libraryId:key, or JSON object |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "item": {
      "type": "string",
      "description": "Zotero item ref: key, numeric id, libraryId:key, or JSON object"
    }
  },
  "required": [
    "item"
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
      "description": "Zotero item ref: key, numeric id, libraryId:key, or JSON object"
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
      "description": "Result data owned by library.list_annotations.",
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
  "command": "library annotation list",
  "argv": [
    "library",
    "annotation",
    "list"
  ],
  "summary": "List reader annotations for one Zotero item",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "item": {
        "type": "string",
        "description": "Zotero item ref: key, numeric id, libraryId:key, or JSON object"
      }
    },
    "required": [
      "item"
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
      "help": "Zotero item ref: key, numeric id, libraryId:key, or JSON object",
      "valueNames": [
        "ITEM"
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
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "item": {
        "type": "string",
        "description": "Zotero item ref: key, numeric id, libraryId:key, or JSON object"
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
        "description": "Result data owned by library.list_annotations.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed."
      }
    },
    "additionalProperties": false
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
      "action": "Inspect the error and retry only when retryable is true.",
      "nextCommand": "surface describe"
    }
  ],
  "targets": [
    {
      "kind": "capability",
      "target": "library.list_annotations"
    }
  ],
  "operationalAliases": [
    "library annotation list",
    "library",
    "annotation",
    "list",
    "item",
    "ITEM"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `library` `annotation` `list`.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Intent visibility: `visible`.
- Operational aliases: `library annotation list`, `library`, `annotation`, `list`, `item`, `ITEM`.

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
    "action": "Inspect the error and retry only when retryable is true.",
    "nextCommand": "surface describe"
  }
]
```

### Targets

```json
[
  {
    "kind": "capability",
    "target": "library.list_annotations"
  }
]
```
