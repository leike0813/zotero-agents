# `zotero-bridge context note open`

Open one Zotero note

## Usage

```console
zotero-bridge context note open [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] OBJECT_REF <OBJECT_REF>
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
| OBJECT_REF | object_ref | positional | yes | — | OBJECT_REF | no | — | — | Zotero object ref: key, numeric id, libraryId:key, or JSON object |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "object_ref": {
      "type": "string",
      "description": "Zotero object ref: key, numeric id, libraryId:key, or JSON object",
      "position": 1
    }
  },
  "required": [
    "object_ref"
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
    "object_ref": {
      "type": "string",
      "description": "Zotero object ref: key, numeric id, libraryId:key, or JSON object"
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
      "description": "Response object returned by POST /bridge/v1/context/notes/open.",
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
  "command": "context note open",
  "argv": [
    "context",
    "note",
    "open"
  ],
  "summary": "Open one Zotero note",
  "category": "navigation",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "object_ref": {
        "type": "string",
        "description": "Zotero object ref: key, numeric id, libraryId:key, or JSON object",
        "position": 1
      }
    },
    "required": [
      "object_ref"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "object_ref",
      "kind": "positional",
      "token": "OBJECT_REF",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Zotero object ref: key, numeric id, libraryId:key, or JSON object",
      "valueNames": [
        "OBJECT_REF"
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
      "property": "object_ref",
      "kind": "positional",
      "token": "OBJECT_REF",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "OBJECT_REF"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "object_ref": {
        "type": "string",
        "description": "Zotero object ref: key, numeric id, libraryId:key, or JSON object"
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
        "description": "Response object returned by POST /bridge/v1/context/notes/open.",
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
      "kind": "ui-navigation",
      "stateChanged": true,
      "description": "May change ui navigation state."
    }
  ],
  "approvalContract": {
    "kind": "none",
    "timing": "none",
    "scope": "No Zotero UI approval; provider runtimes may still request their own permission."
  },
  "handleTransitions": [
    {
      "handle": "noteRef",
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
      "target": "POST /bridge/v1/context/notes/open"
    }
  ],
  "operationalAliases": [
    "context note open",
    "context",
    "note",
    "open",
    "object_ref",
    "OBJECT_REF"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `context` `note` `open`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `navigation`; danger: `review`.
- Intent visibility: `visible`.
- Operational aliases: `context note open`, `context`, `note`, `open`, `object_ref`, `OBJECT_REF`.

### Effects

```json
[
  {
    "kind": "ui-navigation",
    "stateChanged": true,
    "description": "May change ui navigation state."
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
    "handle": "noteRef",
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
    "target": "POST /bridge/v1/context/notes/open"
  }
]
```
