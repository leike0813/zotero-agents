# `zotero-bridge mutation apply`

Apply a Zotero mutation

## Usage

```console
zotero-bridge mutation apply [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--input <JSON_OR_FILE>]
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
| --input | input | option | no | — | JSON_OR_FILE | no | — | — | Zotero capability input. Use inline JSON, a file path containing JSON, @file syntax, or '-' to read JSON from stdin. Omit for {}. |

## Invocation schema

```json
{
  "additionalProperties": false,
  "properties": {
    "input": {
      "description": "Zotero capability input as inline JSON, a file path, @file, or '-' for stdin",
      "type": "string"
    }
  },
  "required": [],
  "type": "object"
}
```

## Structured input schemas

### `--input` (input)

Required: `false`.

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
  "oneOf": [
    {
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
        "fields": {
          "$ref": "#/$defs/fieldPatch"
        },
        "item": {
          "$ref": "#/$defs/objectRef"
        },
        "operation": {
          "const": "item.updateFields"
        },
        "target": {
          "$ref": "#/$defs/objectRef"
        }
      },
      "required": [
        "operation",
        "fields"
      ],
      "type": "object"
    },
    {
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
        },
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
        "item": {
          "$ref": "#/$defs/objectRef"
        },
        "items": {
          "$ref": "#/$defs/objectRefs"
        },
        "operation": {
          "enum": [
            "item.addTags",
            "item.removeTags"
          ]
        },
        "tags": {
          "$ref": "#/$defs/tags"
        },
        "target": {
          "$ref": "#/$defs/objectRef"
        },
        "targets": {
          "$ref": "#/$defs/objectRefs"
        }
      },
      "required": [
        "operation",
        "tags"
      ],
      "type": "object"
    },
    {
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
    {
      "additionalProperties": false,
      "anyOf": [
        {
          "required": [
            "parent"
          ]
        },
        {
          "required": [
            "target"
          ]
        }
      ],
      "properties": {
        "content": {
          "type": "string"
        },
        "noteKind": {
          "type": "string"
        },
        "operation": {
          "const": "note.createChild"
        },
        "parent": {
          "$ref": "#/$defs/objectRef"
        },
        "target": {
          "$ref": "#/$defs/objectRef"
        }
      },
      "required": [
        "operation",
        "content"
      ],
      "type": "object"
    },
    {
      "additionalProperties": false,
      "anyOf": [
        {
          "required": [
            "note"
          ]
        },
        {
          "required": [
            "target"
          ]
        }
      ],
      "properties": {
        "content": {
          "type": "string"
        },
        "note": {
          "$ref": "#/$defs/objectRef"
        },
        "operation": {
          "const": "note.update"
        },
        "target": {
          "$ref": "#/$defs/objectRef"
        }
      },
      "required": [
        "operation",
        "content"
      ],
      "type": "object"
    },
    {
      "additionalProperties": false,
      "anyOf": [
        {
          "required": [
            "note"
          ]
        },
        {
          "required": [
            "target"
          ]
        }
      ],
      "properties": {
        "content": {
          "type": "string"
        },
        "note": {
          "$ref": "#/$defs/objectRef"
        },
        "noteKind": {
          "type": "string"
        },
        "operation": {
          "const": "note.upsertPayload"
        },
        "payload": {},
        "payloadFormat": {
          "type": "string"
        },
        "payloadType": {
          "minLength": 1,
          "type": "string"
        },
        "target": {
          "$ref": "#/$defs/objectRef"
        }
      },
      "required": [
        "operation",
        "payloadType"
      ],
      "type": "object"
    },
    {
      "additionalProperties": false,
      "properties": {
        "collection": {
          "$ref": "#/$defs/collectionRef"
        },
        "operation": {
          "const": "literature.ingest"
        },
        "paper": {
          "$ref": "#/$defs/paper"
        }
      },
      "required": [
        "operation",
        "paper"
      ],
      "type": "object"
    },
    {
      "additionalProperties": false,
      "anyOf": [
        {
          "required": [
            "name"
          ]
        },
        {
          "required": [
            "collectionName"
          ]
        }
      ],
      "properties": {
        "collectionName": {
          "minLength": 1,
          "type": "string"
        },
        "libraryID": {
          "type": [
            "number",
            "string"
          ]
        },
        "libraryId": {
          "type": [
            "number",
            "string"
          ]
        },
        "name": {
          "minLength": 1,
          "type": "string"
        },
        "operation": {
          "const": "collection.create"
        }
      },
      "required": [
        "operation"
      ],
      "type": "object"
    },
    {
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
          "enum": [
            "collection.addItems",
            "collection.removeItems"
          ]
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
  ]
}
```

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
  "oneOf": [
    {
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
        "fields": {
          "$ref": "#/$defs/fieldPatch"
        },
        "item": {
          "$ref": "#/$defs/objectRef"
        },
        "operation": {
          "const": "item.updateFields"
        },
        "target": {
          "$ref": "#/$defs/objectRef"
        }
      },
      "required": [
        "operation",
        "fields"
      ],
      "type": "object"
    },
    {
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
        },
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
        "item": {
          "$ref": "#/$defs/objectRef"
        },
        "items": {
          "$ref": "#/$defs/objectRefs"
        },
        "operation": {
          "enum": [
            "item.addTags",
            "item.removeTags"
          ]
        },
        "tags": {
          "$ref": "#/$defs/tags"
        },
        "target": {
          "$ref": "#/$defs/objectRef"
        },
        "targets": {
          "$ref": "#/$defs/objectRefs"
        }
      },
      "required": [
        "operation",
        "tags"
      ],
      "type": "object"
    },
    {
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
    {
      "additionalProperties": false,
      "anyOf": [
        {
          "required": [
            "parent"
          ]
        },
        {
          "required": [
            "target"
          ]
        }
      ],
      "properties": {
        "content": {
          "type": "string"
        },
        "noteKind": {
          "type": "string"
        },
        "operation": {
          "const": "note.createChild"
        },
        "parent": {
          "$ref": "#/$defs/objectRef"
        },
        "target": {
          "$ref": "#/$defs/objectRef"
        }
      },
      "required": [
        "operation",
        "content"
      ],
      "type": "object"
    },
    {
      "additionalProperties": false,
      "anyOf": [
        {
          "required": [
            "note"
          ]
        },
        {
          "required": [
            "target"
          ]
        }
      ],
      "properties": {
        "content": {
          "type": "string"
        },
        "note": {
          "$ref": "#/$defs/objectRef"
        },
        "operation": {
          "const": "note.update"
        },
        "target": {
          "$ref": "#/$defs/objectRef"
        }
      },
      "required": [
        "operation",
        "content"
      ],
      "type": "object"
    },
    {
      "additionalProperties": false,
      "anyOf": [
        {
          "required": [
            "note"
          ]
        },
        {
          "required": [
            "target"
          ]
        }
      ],
      "properties": {
        "content": {
          "type": "string"
        },
        "note": {
          "$ref": "#/$defs/objectRef"
        },
        "noteKind": {
          "type": "string"
        },
        "operation": {
          "const": "note.upsertPayload"
        },
        "payload": {},
        "payloadFormat": {
          "type": "string"
        },
        "payloadType": {
          "minLength": 1,
          "type": "string"
        },
        "target": {
          "$ref": "#/$defs/objectRef"
        }
      },
      "required": [
        "operation",
        "payloadType"
      ],
      "type": "object"
    },
    {
      "additionalProperties": false,
      "properties": {
        "collection": {
          "$ref": "#/$defs/collectionRef"
        },
        "operation": {
          "const": "literature.ingest"
        },
        "paper": {
          "$ref": "#/$defs/paper"
        }
      },
      "required": [
        "operation",
        "paper"
      ],
      "type": "object"
    },
    {
      "additionalProperties": false,
      "anyOf": [
        {
          "required": [
            "name"
          ]
        },
        {
          "required": [
            "collectionName"
          ]
        }
      ],
      "properties": {
        "collectionName": {
          "minLength": 1,
          "type": "string"
        },
        "libraryID": {
          "type": [
            "number",
            "string"
          ]
        },
        "libraryId": {
          "type": [
            "number",
            "string"
          ]
        },
        "name": {
          "minLength": 1,
          "type": "string"
        },
        "operation": {
          "const": "collection.create"
        }
      },
      "required": [
        "operation"
      ],
      "type": "object"
    },
    {
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
          "enum": [
            "collection.addItems",
            "collection.removeItems"
          ]
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
  ]
}
```

## Payload composition

This command has no separate field-mapping program. Its binding mode is executable directly: passthrough uses the sole structured source, while `none` and `raw` retain their declared closed behavior.

`composition`: `null`.

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

### input: shape-only

Minimal JSON shape for --input.

```console
zotero-bridge mutation apply --input '{"items":["ABC123"],"operation":"item.addTags","tags":["topic:example"]}'
```

Prerequisites:

- Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution.

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
      "help": "Zotero capability input as inline JSON, a file path, @file, or '-' for stdin",
      "id": "input",
      "kind": "option",
      "longHelp": "Zotero capability input. Use inline JSON, a file path containing JSON, @file syntax, or '-' to read JSON from stdin. Omit for {}.",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--input",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "argv": [
    "mutation",
    "apply"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "input",
      "required": false,
      "takesValue": true,
      "token": "--input",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "binding": "passthrough",
  "category": "write",
  "command": "mutation apply",
  "composition": null,
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
  "inputSchemas": {
    "input": {
      "examples": [
        {
          "description": "Minimal JSON shape for --input.",
          "kind": "shape-only",
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "value": {
            "items": [
              "ABC123"
            ],
            "operation": "item.addTags",
            "tags": [
              "topic:example"
            ]
          }
        }
      ],
      "required": false,
      "requiredWhen": [],
      "schema": {
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
        "oneOf": [
          {
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
              "fields": {
                "$ref": "#/$defs/fieldPatch"
              },
              "item": {
                "$ref": "#/$defs/objectRef"
              },
              "operation": {
                "const": "item.updateFields"
              },
              "target": {
                "$ref": "#/$defs/objectRef"
              }
            },
            "required": [
              "operation",
              "fields"
            ],
            "type": "object"
          },
          {
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
              },
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
              "item": {
                "$ref": "#/$defs/objectRef"
              },
              "items": {
                "$ref": "#/$defs/objectRefs"
              },
              "operation": {
                "enum": [
                  "item.addTags",
                  "item.removeTags"
                ]
              },
              "tags": {
                "$ref": "#/$defs/tags"
              },
              "target": {
                "$ref": "#/$defs/objectRef"
              },
              "targets": {
                "$ref": "#/$defs/objectRefs"
              }
            },
            "required": [
              "operation",
              "tags"
            ],
            "type": "object"
          },
          {
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
          {
            "additionalProperties": false,
            "anyOf": [
              {
                "required": [
                  "parent"
                ]
              },
              {
                "required": [
                  "target"
                ]
              }
            ],
            "properties": {
              "content": {
                "type": "string"
              },
              "noteKind": {
                "type": "string"
              },
              "operation": {
                "const": "note.createChild"
              },
              "parent": {
                "$ref": "#/$defs/objectRef"
              },
              "target": {
                "$ref": "#/$defs/objectRef"
              }
            },
            "required": [
              "operation",
              "content"
            ],
            "type": "object"
          },
          {
            "additionalProperties": false,
            "anyOf": [
              {
                "required": [
                  "note"
                ]
              },
              {
                "required": [
                  "target"
                ]
              }
            ],
            "properties": {
              "content": {
                "type": "string"
              },
              "note": {
                "$ref": "#/$defs/objectRef"
              },
              "operation": {
                "const": "note.update"
              },
              "target": {
                "$ref": "#/$defs/objectRef"
              }
            },
            "required": [
              "operation",
              "content"
            ],
            "type": "object"
          },
          {
            "additionalProperties": false,
            "anyOf": [
              {
                "required": [
                  "note"
                ]
              },
              {
                "required": [
                  "target"
                ]
              }
            ],
            "properties": {
              "content": {
                "type": "string"
              },
              "note": {
                "$ref": "#/$defs/objectRef"
              },
              "noteKind": {
                "type": "string"
              },
              "operation": {
                "const": "note.upsertPayload"
              },
              "payload": {},
              "payloadFormat": {
                "type": "string"
              },
              "payloadType": {
                "minLength": 1,
                "type": "string"
              },
              "target": {
                "$ref": "#/$defs/objectRef"
              }
            },
            "required": [
              "operation",
              "payloadType"
            ],
            "type": "object"
          },
          {
            "additionalProperties": false,
            "properties": {
              "collection": {
                "$ref": "#/$defs/collectionRef"
              },
              "operation": {
                "const": "literature.ingest"
              },
              "paper": {
                "$ref": "#/$defs/paper"
              }
            },
            "required": [
              "operation",
              "paper"
            ],
            "type": "object"
          },
          {
            "additionalProperties": false,
            "anyOf": [
              {
                "required": [
                  "name"
                ]
              },
              {
                "required": [
                  "collectionName"
                ]
              }
            ],
            "properties": {
              "collectionName": {
                "minLength": 1,
                "type": "string"
              },
              "libraryID": {
                "type": [
                  "number",
                  "string"
                ]
              },
              "libraryId": {
                "type": [
                  "number",
                  "string"
                ]
              },
              "name": {
                "minLength": 1,
                "type": "string"
              },
              "operation": {
                "const": "collection.create"
              }
            },
            "required": [
              "operation"
            ],
            "type": "object"
          },
          {
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
                "enum": [
                  "collection.addItems",
                  "collection.removeItems"
                ]
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
        ]
      },
      "schemaSource": "target-capability",
      "token": "--input"
    }
  },
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "input": {
        "description": "Zotero capability input as inline JSON, a file path, @file, or '-' for stdin",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "operationalAliases": [
    "mutation apply",
    "mutation",
    "apply",
    "input",
    "JSON_OR_FILE"
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
    "oneOf": [
      {
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
          "fields": {
            "$ref": "#/$defs/fieldPatch"
          },
          "item": {
            "$ref": "#/$defs/objectRef"
          },
          "operation": {
            "const": "item.updateFields"
          },
          "target": {
            "$ref": "#/$defs/objectRef"
          }
        },
        "required": [
          "operation",
          "fields"
        ],
        "type": "object"
      },
      {
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
          },
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
          "item": {
            "$ref": "#/$defs/objectRef"
          },
          "items": {
            "$ref": "#/$defs/objectRefs"
          },
          "operation": {
            "enum": [
              "item.addTags",
              "item.removeTags"
            ]
          },
          "tags": {
            "$ref": "#/$defs/tags"
          },
          "target": {
            "$ref": "#/$defs/objectRef"
          },
          "targets": {
            "$ref": "#/$defs/objectRefs"
          }
        },
        "required": [
          "operation",
          "tags"
        ],
        "type": "object"
      },
      {
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
      {
        "additionalProperties": false,
        "anyOf": [
          {
            "required": [
              "parent"
            ]
          },
          {
            "required": [
              "target"
            ]
          }
        ],
        "properties": {
          "content": {
            "type": "string"
          },
          "noteKind": {
            "type": "string"
          },
          "operation": {
            "const": "note.createChild"
          },
          "parent": {
            "$ref": "#/$defs/objectRef"
          },
          "target": {
            "$ref": "#/$defs/objectRef"
          }
        },
        "required": [
          "operation",
          "content"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "anyOf": [
          {
            "required": [
              "note"
            ]
          },
          {
            "required": [
              "target"
            ]
          }
        ],
        "properties": {
          "content": {
            "type": "string"
          },
          "note": {
            "$ref": "#/$defs/objectRef"
          },
          "operation": {
            "const": "note.update"
          },
          "target": {
            "$ref": "#/$defs/objectRef"
          }
        },
        "required": [
          "operation",
          "content"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "anyOf": [
          {
            "required": [
              "note"
            ]
          },
          {
            "required": [
              "target"
            ]
          }
        ],
        "properties": {
          "content": {
            "type": "string"
          },
          "note": {
            "$ref": "#/$defs/objectRef"
          },
          "noteKind": {
            "type": "string"
          },
          "operation": {
            "const": "note.upsertPayload"
          },
          "payload": {},
          "payloadFormat": {
            "type": "string"
          },
          "payloadType": {
            "minLength": 1,
            "type": "string"
          },
          "target": {
            "$ref": "#/$defs/objectRef"
          }
        },
        "required": [
          "operation",
          "payloadType"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "collection": {
            "$ref": "#/$defs/collectionRef"
          },
          "operation": {
            "const": "literature.ingest"
          },
          "paper": {
            "$ref": "#/$defs/paper"
          }
        },
        "required": [
          "operation",
          "paper"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "anyOf": [
          {
            "required": [
              "name"
            ]
          },
          {
            "required": [
              "collectionName"
            ]
          }
        ],
        "properties": {
          "collectionName": {
            "minLength": 1,
            "type": "string"
          },
          "libraryID": {
            "type": [
              "number",
              "string"
            ]
          },
          "libraryId": {
            "type": [
              "number",
              "string"
            ]
          },
          "name": {
            "minLength": 1,
            "type": "string"
          },
          "operation": {
            "const": "collection.create"
          }
        },
        "required": [
          "operation"
        ],
        "type": "object"
      },
      {
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
            "enum": [
              "collection.addItems",
              "collection.removeItems"
            ]
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
    ]
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
  "summary": "Apply a Zotero mutation",
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
- `command_input` reports schema violations for a structured input. Inspect the bounded `violations`, then run this exact leaf with `--schema` and correct the declared field or type; do not invent an alias.
- `payload_contract` means the CLI's composed capability payload violates the executable contract before network I/O. Treat this as an implementation fault; do not bypass the semantic command with raw transport.
- `command_result` means a Host response or local result failed its executable result schema. Do not accept or report it as successful evidence.
- Violation arrays are redacted, deterministically ordered, and capped at eight. When `truncated` is true, correct the reported violations and validate again rather than requesting secret or complete payload disclosure.

## Operational contract

- Canonical argv path: `mutation` `apply`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Structured binding mode: `passthrough`.
- Intent visibility: `visible`.
- Operational aliases: `mutation apply`, `mutation`, `apply`, `input`, `JSON_OR_FILE`.

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
