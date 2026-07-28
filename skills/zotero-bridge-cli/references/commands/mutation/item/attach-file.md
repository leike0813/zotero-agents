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
  "additionalProperties": false,
  "properties": {
    "content-type": {
      "description": "Attachment content type",
      "type": "string"
    },
    "display-name": {
      "description": "Attachment display name",
      "type": "string"
    },
    "file-id": {
      "description": "Bridge-issued uploaded file id",
      "type": "string"
    },
    "item": {
      "description": "Target Zotero item ref",
      "type": "string"
    }
  },
  "required": [
    "item",
    "file-id"
  ],
  "type": "object"
}
```

## Structured input schemas

This command has no structured JSON input parameter.

## Composed payload schema

```json
{
  "$defs": {
    "collectionRef": {
      "oneOf": [
        {
          "minLength": 1,
          "type": "string"
        },
        {
          "type": "number"
        },
        {
          "additionalProperties": true,
          "minProperties": 1,
          "type": "object",
          "x-openPropertiesReason": "The Zotero collection-reference resolver owns the supported key, id, name, and library fields."
        }
      ]
    },
    "creator": {
      "additionalProperties": false,
      "anyOf": [
        {
          "required": [
            "name"
          ]
        },
        {
          "required": [
            "firstName"
          ]
        },
        {
          "required": [
            "lastName"
          ]
        }
      ],
      "properties": {
        "creatorType": {
          "type": "string"
        },
        "firstName": {
          "type": "string"
        },
        "lastName": {
          "type": "string"
        },
        "name": {
          "type": "string"
        }
      },
      "type": "object"
    },
    "fieldPatch": {
      "additionalProperties": {
        "type": [
          "string",
          "number",
          "boolean",
          "null"
        ]
      },
      "minProperties": 1,
      "type": "object"
    },
    "objectRef": {
      "oneOf": [
        {
          "minLength": 1,
          "type": "string"
        },
        {
          "type": "number"
        },
        {
          "additionalProperties": true,
          "minProperties": 1,
          "type": "object",
          "x-openPropertiesReason": "The Zotero object-reference resolver owns the supported key, id, and library fields."
        }
      ]
    },
    "objectRefs": {
      "items": {
        "$ref": "#/$defs/objectRef"
      },
      "minItems": 1,
      "type": "array"
    },
    "paper": {
      "additionalProperties": false,
      "properties": {
        "attachLandingUrlOnMissingPdf": {
          "type": "boolean"
        },
        "creators": {
          "items": {
            "$ref": "#/$defs/creator"
          },
          "maxItems": 50,
          "type": "array"
        },
        "fields": {
          "additionalProperties": {
            "type": [
              "string",
              "number",
              "boolean",
              "null"
            ]
          },
          "properties": {
            "title": {
              "minLength": 1,
              "type": "string"
            }
          },
          "required": [
            "title"
          ],
          "type": "object"
        },
        "identifiers": {
          "additionalProperties": false,
          "properties": {
            "arxiv": {
              "type": "string"
            },
            "doi": {
              "type": "string"
            },
            "isbn": {
              "type": "string"
            },
            "pmid": {
              "type": "string"
            }
          },
          "type": "object"
        },
        "itemType": {
          "minLength": 1,
          "type": "string"
        },
        "landingUrl": {
          "type": "string"
        },
        "pdfUrl": {
          "type": "string"
        }
      },
      "required": [
        "itemType",
        "fields",
        "creators",
        "identifiers"
      ],
      "type": "object"
    },
    "tags": {
      "items": {
        "minLength": 1,
        "type": "string"
      },
      "minItems": 1,
      "type": "array"
    }
  },
  "additionalProperties": false,
  "anyOf": [
    {
      "required": [
        "target"
      ]
    },
    {
      "required": [
        "item"
      ]
    }
  ],
  "properties": {
    "contentType": {
      "type": "string"
    },
    "displayName": {
      "type": "string"
    },
    "fileId": {
      "minLength": 1,
      "type": "string"
    },
    "item": {
      "$ref": "#/$defs/objectRef"
    },
    "operation": {
      "const": "item.attachFile"
    },
    "target": {
      "$ref": "#/$defs/objectRef"
    }
  },
  "required": [
    "operation",
    "fileId"
  ],
  "type": "object"
}
```

## Payload composition

The executable command contract owns the base source, fixed values, field mappings, and closed transforms shown below. Command handlers only provide values under the referenced Clap argument IDs.

```json
{
  "constants": {
    "operation": "item.attachFile"
  },
  "mappings": [
    {
      "argument": "item",
      "field": "item",
      "required": true,
      "transform": "context-ref"
    },
    {
      "argument": "file_id",
      "field": "fileId",
      "required": true,
      "transform": "file-id"
    },
    {
      "argument": "display_name",
      "field": "displayName",
      "required": false,
      "transform": "identity"
    },
    {
      "argument": "content_type",
      "field": "contentType",
      "required": false,
      "transform": "identity"
    }
  ]
}
```

## Result schema

```json
{
  "additionalProperties": false,
  "properties": {
    "approval": {
      "minLength": 1,
      "type": "string"
    },
    "capability": {
      "const": "mutation.execute"
    },
    "data": {
      "additionalProperties": true,
      "description": "Result data owned by mutation.execute.",
      "type": "object",
      "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed."
    }
  },
  "required": [
    "capability",
    "approval",
    "data"
  ],
  "type": "object"
}
```

## Examples

No structured-input example applies. Build argv from the parameter tables and confirm the command with `surface describe` before execution.

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

```json
{
  "approvalContract": {
    "kind": "zotero-ui-required",
    "scope": "Zotero UI approval for the described Zotero-managed effect.",
    "timing": "before-command"
  },
  "arguments": [
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Target Zotero item ref",
      "id": "item",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "--item",
      "valueNames": [
        "ITEM"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Bridge-issued uploaded file id",
      "id": "file_id",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "--file-id",
      "valueNames": [
        "FILE_ID"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Attachment display name",
      "id": "display_name",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--display-name",
      "valueNames": [
        "DISPLAY_NAME"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Attachment content type",
      "id": "content_type",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--content-type",
      "valueNames": [
        "CONTENT_TYPE"
      ]
    }
  ],
  "argv": [
    "mutation",
    "item",
    "attach-file"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "item",
      "required": true,
      "takesValue": true,
      "token": "--item",
      "valueNames": [
        "ITEM"
      ]
    },
    {
      "kind": "option",
      "property": "file-id",
      "required": true,
      "takesValue": true,
      "token": "--file-id",
      "valueNames": [
        "FILE_ID"
      ]
    },
    {
      "kind": "option",
      "property": "display-name",
      "required": false,
      "takesValue": true,
      "token": "--display-name",
      "valueNames": [
        "DISPLAY_NAME"
      ]
    },
    {
      "kind": "option",
      "property": "content-type",
      "required": false,
      "takesValue": true,
      "token": "--content-type",
      "valueNames": [
        "CONTENT_TYPE"
      ]
    }
  ],
  "binding": "object",
  "category": "write",
  "command": "mutation item attach-file",
  "composition": {
    "constants": {
      "operation": "item.attachFile"
    },
    "mappings": [
      {
        "argument": "item",
        "field": "item",
        "required": true,
        "transform": "context-ref"
      },
      {
        "argument": "file_id",
        "field": "fileId",
        "required": true,
        "transform": "file-id"
      },
      {
        "argument": "display_name",
        "field": "displayName",
        "required": false,
        "transform": "identity"
      },
      {
        "argument": "content_type",
        "field": "contentType",
        "required": false,
        "transform": "identity"
      }
    ]
  },
  "danger": "review",
  "effects": [
    {
      "description": "May change zotero library state.",
      "kind": "zotero-library",
      "stateChanged": true
    }
  ],
  "handleTransitions": [
    {
      "condition": "Required by the command invocation.",
      "direction": "consume",
      "handle": "itemRef",
      "lifetime": "caller-owned",
      "required": true
    },
    {
      "condition": "Required by the command invocation.",
      "direction": "consume",
      "handle": "fileId",
      "lifetime": "caller-owned",
      "required": true
    }
  ],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {},
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "content-type": {
        "description": "Attachment content type",
        "type": "string"
      },
      "display-name": {
        "description": "Attachment display name",
        "type": "string"
      },
      "file-id": {
        "description": "Bridge-issued uploaded file id",
        "type": "string"
      },
      "item": {
        "description": "Target Zotero item ref",
        "type": "string"
      }
    },
    "required": [
      "item",
      "file-id"
    ],
    "type": "object"
  },
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
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "$defs": {
      "collectionRef": {
        "oneOf": [
          {
            "minLength": 1,
            "type": "string"
          },
          {
            "type": "number"
          },
          {
            "additionalProperties": true,
            "minProperties": 1,
            "type": "object",
            "x-openPropertiesReason": "The Zotero collection-reference resolver owns the supported key, id, name, and library fields."
          }
        ]
      },
      "creator": {
        "additionalProperties": false,
        "anyOf": [
          {
            "required": [
              "name"
            ]
          },
          {
            "required": [
              "firstName"
            ]
          },
          {
            "required": [
              "lastName"
            ]
          }
        ],
        "properties": {
          "creatorType": {
            "type": "string"
          },
          "firstName": {
            "type": "string"
          },
          "lastName": {
            "type": "string"
          },
          "name": {
            "type": "string"
          }
        },
        "type": "object"
      },
      "fieldPatch": {
        "additionalProperties": {
          "type": [
            "string",
            "number",
            "boolean",
            "null"
          ]
        },
        "minProperties": 1,
        "type": "object"
      },
      "objectRef": {
        "oneOf": [
          {
            "minLength": 1,
            "type": "string"
          },
          {
            "type": "number"
          },
          {
            "additionalProperties": true,
            "minProperties": 1,
            "type": "object",
            "x-openPropertiesReason": "The Zotero object-reference resolver owns the supported key, id, and library fields."
          }
        ]
      },
      "objectRefs": {
        "items": {
          "$ref": "#/$defs/objectRef"
        },
        "minItems": 1,
        "type": "array"
      },
      "paper": {
        "additionalProperties": false,
        "properties": {
          "attachLandingUrlOnMissingPdf": {
            "type": "boolean"
          },
          "creators": {
            "items": {
              "$ref": "#/$defs/creator"
            },
            "maxItems": 50,
            "type": "array"
          },
          "fields": {
            "additionalProperties": {
              "type": [
                "string",
                "number",
                "boolean",
                "null"
              ]
            },
            "properties": {
              "title": {
                "minLength": 1,
                "type": "string"
              }
            },
            "required": [
              "title"
            ],
            "type": "object"
          },
          "identifiers": {
            "additionalProperties": false,
            "properties": {
              "arxiv": {
                "type": "string"
              },
              "doi": {
                "type": "string"
              },
              "isbn": {
                "type": "string"
              },
              "pmid": {
                "type": "string"
              }
            },
            "type": "object"
          },
          "itemType": {
            "minLength": 1,
            "type": "string"
          },
          "landingUrl": {
            "type": "string"
          },
          "pdfUrl": {
            "type": "string"
          }
        },
        "required": [
          "itemType",
          "fields",
          "creators",
          "identifiers"
        ],
        "type": "object"
      },
      "tags": {
        "items": {
          "minLength": 1,
          "type": "string"
        },
        "minItems": 1,
        "type": "array"
      }
    },
    "additionalProperties": false,
    "anyOf": [
      {
        "required": [
          "target"
        ]
      },
      {
        "required": [
          "item"
        ]
      }
    ],
    "properties": {
      "contentType": {
        "type": "string"
      },
      "displayName": {
        "type": "string"
      },
      "fileId": {
        "minLength": 1,
        "type": "string"
      },
      "item": {
        "$ref": "#/$defs/objectRef"
      },
      "operation": {
        "const": "item.attachFile"
      },
      "target": {
        "$ref": "#/$defs/objectRef"
      }
    },
    "required": [
      "operation",
      "fileId"
    ],
    "type": "object"
  },
  "recovery": [
    {
      "action": "Inspect stateChange and handleConsumption before repeating the operation.",
      "nextCommand": "surface describe",
      "requiresHandles": [],
      "stateCheck": "none",
      "when": "The operation fails or completion is uncertain."
    }
  ],
  "resultSchema": {
    "additionalProperties": false,
    "properties": {
      "approval": {
        "minLength": 1,
        "type": "string"
      },
      "capability": {
        "const": "mutation.execute"
      },
      "data": {
        "additionalProperties": true,
        "description": "Result data owned by mutation.execute.",
        "type": "object",
        "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed."
      }
    },
    "required": [
      "capability",
      "approval",
      "data"
    ],
    "type": "object"
  },
  "summary": "Attach a file uploaded through Zotero Bridge to a Zotero item",
  "targets": [
    {
      "kind": "capability",
      "target": "mutation.execute"
    }
  ]
}
```

## Parameter failure and recovery contract

Parameter failures are returned as one JSON error envelope. Inspect `error.code`, then require `error.details.schema` to be `host-bridge.argument-error.v1` before using the structured boundary fields. Preserve the canonical command, sanitized inputs, and any already-returned typed handles; never include the complete raw payload in evidence.

- `argv` reports a missing, unknown, conflicting, or invalid CLI argument. Rebuild argv from this card's parameter tables or the active command help.
- `json_source` reports an unreadable stdin or file source. Correct that source without moving the value to a different binding.
- `json_syntax` reports invalid JSON with safe line and column context. Repair syntax before interpreting domain fields.
- This leaf has no structured JSON input, so `command_input` is not an expected invocation boundary. Use `surface describe` for its scalar and positional contract.
- `payload_contract` means the CLI's composed capability payload violates the executable contract before network I/O. Treat this as an implementation fault; do not bypass the semantic command with raw transport.
- `command_result` means a Host response or local result failed its executable result schema. Do not accept or report it as successful evidence.
- Violation arrays are redacted, deterministically ordered, and capped at eight. When `truncated` is true, correct the reported violations and validate again rather than requesting secret or complete payload disclosure.

## Operational contract

- Canonical argv path: `mutation` `item` `attach-file`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Structured binding mode: `object`.
- Intent visibility: `visible`.
- Operational aliases: `mutation item attach-file`, `mutation`, `item`, `attach-file`, `ITEM`, `file_id`, `file-id`, `FILE_ID`, `display_name`, `display-name`, `DISPLAY_NAME`, `content_type`, `content-type`, `CONTENT_TYPE`.

### Effects

```json
[
  {
    "description": "May change zotero library state.",
    "kind": "zotero-library",
    "stateChanged": true
  }
]
```

### Approval

```json
{
  "kind": "zotero-ui-required",
  "scope": "Zotero UI approval for the described Zotero-managed effect.",
  "timing": "before-command"
}
```

### Handle transitions

```json
[
  {
    "condition": "Required by the command invocation.",
    "direction": "consume",
    "handle": "itemRef",
    "lifetime": "caller-owned",
    "required": true
  },
  {
    "condition": "Required by the command invocation.",
    "direction": "consume",
    "handle": "fileId",
    "lifetime": "caller-owned",
    "required": true
  }
]
```

### Recovery

```json
[
  {
    "action": "Inspect stateChange and handleConsumption before repeating the operation.",
    "nextCommand": "surface describe",
    "requiresHandles": [],
    "stateCheck": "none",
    "when": "The operation fails or completion is uncertain."
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
