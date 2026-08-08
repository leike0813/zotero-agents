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
  "additionalProperties": false,
  "properties": {
    "collection": {
      "description": "Zotero collection ref",
      "type": "string"
    },
    "items": {
      "description": "Target Zotero item refs",
      "items": {
        "type": "string"
      },
      "type": "array"
    }
  },
  "required": [
    "collection",
    "items"
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
        "targets"
      ]
    },
    {
      "required": [
        "items"
      ]
    }
  ],
  "properties": {
    "collection": {
      "$ref": "#/$defs/collectionRef"
    },
    "items": {
      "$ref": "#/$defs/objectRefs"
    },
    "operation": {
      "const": "collection.removeItems"
    },
    "targets": {
      "$ref": "#/$defs/objectRefs"
    }
  },
  "required": [
    "operation",
    "collection"
  ],
  "type": "object"
}
```

## Payload composition

The executable command contract owns the base source, fixed values, field mappings, and closed transforms shown below. Command handlers only provide values under the referenced Clap argument IDs.

```json
{
  "constants": {
    "operation": "collection.removeItems"
  },
  "mappings": [
    {
      "argument": "collection",
      "field": "collection",
      "required": true,
      "transform": "context-ref"
    },
    {
      "argument": "items",
      "field": "items",
      "required": true,
      "transform": "context-ref-array"
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
      "help": "Zotero collection ref",
      "id": "collection",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "--collection",
      "valueNames": [
        "COLLECTION"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Target Zotero item refs",
      "id": "items",
      "kind": "option",
      "possibleValues": [],
      "repeatable": true,
      "required": true,
      "takesValue": true,
      "token": "--items",
      "valueNames": [
        "ITEMS"
      ]
    }
  ],
  "argv": [
    "mutation",
    "collection",
    "remove-items"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "collection",
      "required": true,
      "takesValue": true,
      "token": "--collection",
      "valueNames": [
        "COLLECTION"
      ]
    },
    {
      "kind": "option",
      "property": "items",
      "required": true,
      "takesValue": true,
      "token": "--items",
      "valueNames": [
        "ITEMS"
      ]
    }
  ],
  "binding": "object",
  "category": "write",
  "command": "mutation collection remove-items",
  "composition": {
    "constants": {
      "operation": "collection.removeItems"
    },
    "mappings": [
      {
        "argument": "collection",
        "field": "collection",
        "required": true,
        "transform": "context-ref"
      },
      {
        "argument": "items",
        "field": "items",
        "required": true,
        "transform": "context-ref-array"
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
  "handleTransitions": [],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {},
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "collection": {
        "description": "Zotero collection ref",
        "type": "string"
      },
      "items": {
        "description": "Target Zotero item refs",
        "items": {
          "type": "string"
        },
        "type": "array"
      }
    },
    "required": [
      "collection",
      "items"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "mutation collection remove-items",
    "mutation",
    "collection",
    "remove-items",
    "COLLECTION",
    "items",
    "ITEMS"
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
          "targets"
        ]
      },
      {
        "required": [
          "items"
        ]
      }
    ],
    "properties": {
      "collection": {
        "$ref": "#/$defs/collectionRef"
      },
      "items": {
        "$ref": "#/$defs/objectRefs"
      },
      "operation": {
        "const": "collection.removeItems"
      },
      "targets": {
        "$ref": "#/$defs/objectRefs"
      }
    },
    "required": [
      "operation",
      "collection"
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
  "summary": "Remove Zotero items from a collection",
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

- Canonical argv path: `mutation` `collection` `remove-items`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Structured binding mode: `object`.
- Intent visibility: `visible`.
- Operational aliases: `mutation collection remove-items`, `mutation`, `collection`, `remove-items`, `COLLECTION`, `items`, `ITEMS`.

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
