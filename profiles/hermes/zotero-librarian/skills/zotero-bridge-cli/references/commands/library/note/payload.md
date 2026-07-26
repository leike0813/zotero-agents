# `zotero-bridge library note payload`

Read one embedded workflow payload from a Zotero note

## Usage

```console
zotero-bridge library note payload [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--key <KEY>] [--id <ID>] [--library-id <LIBRARY_ID>] [--payload-type <PAYLOAD_TYPE>] [--offset <OFFSET>] [--max-chars <MAX_CHARS>]
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
| --key | key | option | no | — | KEY | no | — | id | Zotero item key |
| --id | id | option | no | — | ID | no | — | key | Zotero item numeric id |
| --library-id | library_id | option | no | — | LIBRARY_ID | no | — | — | Zotero library id for key lookup |
| --payload-type | payload_type | option | no | — | PAYLOAD_TYPE | no | — | — | Payload type to decode |
| --offset | offset | option | no | — | OFFSET | no | — | — | Start offset |
| --max-chars | max_chars | option | no | — | MAX_CHARS | no | — | — | Maximum characters |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "key": {
      "type": "string",
      "description": "Zotero item key"
    },
    "id": {
      "type": "string",
      "description": "Zotero item numeric id"
    },
    "library-id": {
      "type": "string",
      "description": "Zotero library id for key lookup"
    },
    "payload-type": {
      "type": "string",
      "description": "Payload type to decode"
    },
    "offset": {
      "type": "string",
      "description": "Start offset"
    },
    "max-chars": {
      "type": "string",
      "description": "Maximum characters"
    }
  },
  "required": [],
  "allOf": [
    {
      "not": {
        "required": [
          "key",
          "id"
        ]
      }
    },
    {
      "oneOf": [
        {
          "required": [
            "key"
          ]
        },
        {
          "required": [
            "id"
          ]
        }
      ]
    }
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
    "key": {
      "type": "string",
      "description": "Zotero item key"
    },
    "id": {
      "type": "string",
      "description": "Zotero item numeric id"
    },
    "library_id": {
      "type": "string",
      "description": "Zotero library id for key lookup"
    },
    "payload_type": {
      "type": "string",
      "description": "Payload type to decode"
    },
    "offset": {
      "type": "string",
      "description": "Start offset"
    },
    "max_chars": {
      "type": "string",
      "description": "Maximum characters"
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
      "description": "Result data owned by library.get_note_payload.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed.",
      "properties": {
        "nextOffset": {
          "type": "integer",
          "minimum": 0
        },
        "hasMore": {
          "type": "boolean"
        },
        "totalChars": {
          "type": "integer",
          "minimum": 0
        },
        "truncated": {
          "type": "boolean"
        },
        "maxChars": {
          "type": "integer",
          "minimum": 0
        }
      }
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
  "command": "library note payload",
  "argv": [
    "library",
    "note",
    "payload"
  ],
  "summary": "Read one embedded workflow payload from a Zotero note",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "key": {
        "type": "string",
        "description": "Zotero item key"
      },
      "id": {
        "type": "string",
        "description": "Zotero item numeric id"
      },
      "library-id": {
        "type": "string",
        "description": "Zotero library id for key lookup"
      },
      "payload-type": {
        "type": "string",
        "description": "Payload type to decode"
      },
      "offset": {
        "type": "string",
        "description": "Start offset"
      },
      "max-chars": {
        "type": "string",
        "description": "Maximum characters"
      }
    },
    "required": [],
    "allOf": [
      {
        "not": {
          "required": [
            "key",
            "id"
          ]
        }
      },
      {
        "oneOf": [
          {
            "required": [
              "key"
            ]
          },
          {
            "required": [
              "id"
            ]
          }
        ]
      }
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "key",
      "kind": "option",
      "token": "--key",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Zotero item key",
      "valueNames": [
        "KEY"
      ],
      "possibleValues": [],
      "conflictsWith": [
        "id"
      ],
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
      "help": "Zotero item numeric id",
      "valueNames": [
        "ID"
      ],
      "possibleValues": [],
      "conflictsWith": [
        "key"
      ],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "library_id",
      "kind": "option",
      "token": "--library-id",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Zotero library id for key lookup",
      "valueNames": [
        "LIBRARY_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "payload_type",
      "kind": "option",
      "token": "--payload-type",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Payload type to decode",
      "valueNames": [
        "PAYLOAD_TYPE"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "offset",
      "kind": "option",
      "token": "--offset",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Start offset",
      "valueNames": [
        "OFFSET"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "max_chars",
      "kind": "option",
      "token": "--max-chars",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Maximum characters",
      "valueNames": [
        "MAX_CHARS"
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
      "property": "key",
      "kind": "option",
      "token": "--key",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "KEY"
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
    },
    {
      "property": "library-id",
      "kind": "option",
      "token": "--library-id",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "LIBRARY_ID"
      ]
    },
    {
      "property": "payload-type",
      "kind": "option",
      "token": "--payload-type",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "PAYLOAD_TYPE"
      ]
    },
    {
      "property": "offset",
      "kind": "option",
      "token": "--offset",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "OFFSET"
      ]
    },
    {
      "property": "max-chars",
      "kind": "option",
      "token": "--max-chars",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "MAX_CHARS"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "key": {
        "type": "string",
        "description": "Zotero item key"
      },
      "id": {
        "type": "string",
        "description": "Zotero item numeric id"
      },
      "library_id": {
        "type": "string",
        "description": "Zotero library id for key lookup"
      },
      "payload_type": {
        "type": "string",
        "description": "Payload type to decode"
      },
      "offset": {
        "type": "string",
        "description": "Start offset"
      },
      "max_chars": {
        "type": "string",
        "description": "Maximum characters"
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
        "description": "Result data owned by library.get_note_payload.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed.",
        "properties": {
          "nextOffset": {
            "type": "integer",
            "minimum": 0
          },
          "hasMore": {
            "type": "boolean"
          },
          "totalChars": {
            "type": "integer",
            "minimum": 0
          },
          "truncated": {
            "type": "boolean"
          },
          "maxChars": {
            "type": "integer",
            "minimum": 0
          }
        }
      }
    },
    "additionalProperties": false
  },
  "outputBoundary": {
    "strategy": "offset",
    "section": "data.content",
    "defaultLimit": 8000,
    "maxLimit": 16000,
    "cursorInput": "offset",
    "continuation": [
      "data.nextOffset",
      "data.hasMore",
      "data.totalChars",
      "data.truncated",
      "data.maxChars"
    ]
  },
  "pagination": "cursor",
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
      "target": "library.get_note_payload"
    }
  ],
  "operationalAliases": [
    "library note payload",
    "library",
    "note",
    "payload",
    "key",
    "KEY",
    "id",
    "ID",
    "library_id",
    "library-id",
    "LIBRARY_ID",
    "payload_type",
    "payload-type",
    "PAYLOAD_TYPE",
    "offset",
    "OFFSET",
    "max_chars",
    "max-chars",
    "MAX_CHARS"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `library` `note` `payload`.
- Output boundary: `offset`; governed details: {"strategy":"offset","section":"data.content","defaultLimit":8000,"maxLimit":16000,"cursorInput":"offset","continuation":["data.nextOffset","data.hasMore","data.totalChars","data.truncated","data.maxChars"]}.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Intent visibility: `visible`.
- Operational aliases: `library note payload`, `library`, `note`, `payload`, `key`, `KEY`, `id`, `ID`, `library_id`, `library-id`, `LIBRARY_ID`, `payload_type`, `payload-type`, `PAYLOAD_TYPE`, `offset`, `OFFSET`, `max_chars`, `max-chars`, `MAX_CHARS`.

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
    "target": "library.get_note_payload"
  }
]
```
