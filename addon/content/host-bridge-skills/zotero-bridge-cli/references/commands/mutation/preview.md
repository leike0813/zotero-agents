# `zotero-bridge mutation preview`

Preview a Zotero mutation

## Usage

```console
zotero-bridge mutation preview [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --input <JSON_OR_FILE>
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
| --input | input | option | yes | — | JSON_OR_FILE | no | — | — | Canonical mutation input is required. Use inline JSON, a file path containing JSON, @file syntax, or '-' to read JSON from stdin. |

## Invocation schema

```json
{
  "additionalProperties": false,
  "properties": {
    "input": {
      "description": "Canonical mutation input as inline JSON, a file path, @file, or '-' for stdin",
      "type": "string"
    }
  },
  "required": [
    "input"
  ],
  "type": "object"
}
```

## Structured input schemas

### `--input` (input)

Required: `true`.

```json
{
  "$defs": {
    "attachmentContentManifest": {
      "additionalProperties": false,
      "properties": {
        "companions": {
          "items": {
            "additionalProperties": false,
            "properties": {
              "relativePath": {
                "minLength": 1,
                "type": "string"
              },
              "sha256": {
                "pattern": "^sha256:[0-9a-f]{64}$",
                "type": "string"
              },
              "sizeBytes": {
                "minimum": 0,
                "type": "integer"
              }
            },
            "required": [
              "relativePath",
              "sizeBytes",
              "sha256"
            ],
            "type": "object"
          },
          "type": "array"
        },
        "identity": {
          "minLength": 1,
          "type": "string"
        },
        "main": {
          "additionalProperties": false,
          "properties": {
            "relativePath": {
              "minLength": 1,
              "type": "string"
            },
            "sha256": {
              "pattern": "^sha256:[0-9a-f]{64}$",
              "type": "string"
            },
            "sizeBytes": {
              "minimum": 0,
              "type": "integer"
            }
          },
          "required": [
            "relativePath",
            "sizeBytes",
            "sha256"
          ],
          "type": "object"
        },
        "schema": {
          "const": "zotero-agents.attachment-content.v1"
        }
      },
      "required": [
        "schema",
        "identity",
        "main",
        "companions"
      ],
      "type": "object"
    },
    "attachmentSource": {
      "oneOf": [
        {
          "$ref": "#/$defs/bridgeUploadSource"
        },
        {
          "additionalProperties": false,
          "properties": {
            "kind": {
              "const": "linked_url"
            },
            "url": {
              "minLength": 1,
              "type": "string"
            }
          },
          "required": [
            "kind",
            "url"
          ],
          "type": "object"
        },
        {
          "additionalProperties": false,
          "properties": {
            "kind": {
              "const": "stored_url"
            },
            "url": {
              "minLength": 1,
              "type": "string"
            }
          },
          "required": [
            "kind",
            "url"
          ],
          "type": "object"
        }
      ]
    },
    "bridgeUploadSource": {
      "additionalProperties": false,
      "properties": {
        "companions": {
          "items": {
            "additionalProperties": false,
            "properties": {
              "targetRelativePath": {
                "minLength": 1,
                "type": "string"
              }
            },
            "required": [
              "targetRelativePath"
            ],
            "type": "object"
          },
          "type": "array"
        },
        "fileId": {
          "minLength": 1,
          "type": "string"
        },
        "kind": {
          "const": "stored_file"
        },
        "targetFilename": {
          "minLength": 1,
          "type": "string"
        }
      },
      "required": [
        "kind",
        "fileId"
      ],
      "type": "object"
    },
    "collectionRef": {
      "additionalProperties": false,
      "properties": {
        "key": {
          "minLength": 1,
          "type": "string"
        },
        "libraryId": {
          "minimum": 1,
          "type": "integer"
        }
      },
      "required": [
        "libraryId",
        "key"
      ],
      "type": "object"
    },
    "collectionRefArray": {
      "items": {
        "$ref": "#/$defs/collectionRef"
      },
      "type": "array"
    },
    "creator": {
      "additionalProperties": false,
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
    "itemRef": {
      "additionalProperties": false,
      "properties": {
        "key": {
          "minLength": 1,
          "type": "string"
        },
        "libraryId": {
          "minimum": 1,
          "type": "integer"
        }
      },
      "required": [
        "libraryId",
        "key"
      ],
      "type": "object"
    },
    "itemRefArray": {
      "items": {
        "$ref": "#/$defs/itemRef"
      },
      "type": "array"
    },
    "jsonValue": {
      "anyOf": [
        {
          "type": "null"
        },
        {
          "type": "boolean"
        },
        {
          "type": "number"
        },
        {
          "type": "string"
        },
        {
          "items": {
            "$ref": "#/$defs/jsonValue"
          },
          "type": "array"
        },
        {
          "additionalProperties": {
            "$ref": "#/$defs/jsonValue"
          },
          "type": "object"
        }
      ]
    },
    "noteContent": {
      "additionalProperties": false,
      "properties": {
        "embeddedImages": {
          "items": {
            "additionalProperties": false,
            "properties": {
              "altText": {
                "type": "string"
              },
              "preparedImage": {
                "additionalProperties": false,
                "properties": {
                  "id": {
                    "minLength": 1,
                    "type": "string"
                  },
                  "kind": {
                    "const": "prepared_note_image"
                  }
                },
                "required": [
                  "kind",
                  "id"
                ],
                "type": "object"
              },
              "slot": {
                "minLength": 1,
                "type": "string"
              }
            },
            "required": [
              "slot",
              "preparedImage"
            ],
            "type": "object"
          },
          "type": "array"
        },
        "format": {
          "enum": [
            "html",
            "text"
          ]
        },
        "value": {
          "type": "string"
        }
      },
      "required": [
        "format",
        "value"
      ],
      "type": "object"
    },
    "storedAttachmentSource": {
      "additionalProperties": false,
      "properties": {
        "companions": {
          "items": {
            "additionalProperties": false,
            "properties": {
              "targetRelativePath": {
                "minLength": 1,
                "type": "string"
              }
            },
            "required": [
              "targetRelativePath"
            ],
            "type": "object"
          },
          "type": "array"
        },
        "content": {
          "$ref": "#/$defs/attachmentContentManifest"
        },
        "kind": {
          "const": "stored_file"
        },
        "targetFilename": {
          "minLength": 1,
          "type": "string"
        }
      },
      "required": [
        "kind",
        "content"
      ],
      "type": "object"
    },
    "stringArray": {
      "items": {
        "minLength": 1,
        "type": "string"
      },
      "type": "array"
    }
  },
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "properties": {
        "collectionRefs": {
          "$ref": "#/$defs/collectionRefArray"
        },
        "creators": {
          "items": {
            "$ref": "#/$defs/creator"
          },
          "type": "array"
        },
        "fields": {
          "additionalProperties": {
            "type": "string"
          },
          "type": "object"
        },
        "initialRelatedRefs": {
          "$ref": "#/$defs/itemRefArray"
        },
        "initialTags": {
          "$ref": "#/$defs/stringArray"
        },
        "itemType": {
          "minLength": 1,
          "type": "string"
        },
        "libraryId": {
          "minimum": 1,
          "type": "integer"
        },
        "operation": {
          "const": "item.create"
        }
      },
      "required": [
        "operation",
        "itemType",
        "fields"
      ],
      "type": "object"
    },
    {
      "properties": {
        "itemRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "item.updateMetadata"
        },
        "patch": {
          "additionalProperties": false,
          "properties": {
            "creators": {
              "items": {
                "$ref": "#/$defs/creator"
              },
              "type": "array"
            },
            "fields": {
              "additionalProperties": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "type": "object"
            }
          },
          "type": "object"
        }
      },
      "required": [
        "operation",
        "itemRef",
        "patch"
      ],
      "type": "object"
    },
    {
      "properties": {
        "incompatibleData": {
          "enum": [
            "reject",
            "move_to_extra",
            "drop"
          ]
        },
        "itemRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "item.changeType"
        },
        "targetItemType": {
          "minLength": 1,
          "type": "string"
        }
      },
      "required": [
        "operation",
        "itemRef",
        "targetItemType",
        "incompatibleData"
      ],
      "type": "object"
    },
    {
      "properties": {
        "childPolicy": {
          "enum": [
            "reject_if_present",
            "cascade"
          ]
        },
        "disposition": {
          "const": "permanent"
        },
        "itemRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "item.remove"
        }
      },
      "required": [
        "operation",
        "itemRef",
        "disposition",
        "childPolicy"
      ],
      "type": "object"
    },
    {
      "properties": {
        "add": {
          "$ref": "#/$defs/stringArray"
        },
        "itemRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "item.updateTags"
        },
        "remove": {
          "$ref": "#/$defs/stringArray"
        }
      },
      "required": [
        "operation",
        "itemRef",
        "add",
        "remove"
      ],
      "type": "object"
    },
    {
      "properties": {
        "operation": {
          "const": "item.addRelated"
        },
        "relatedRefs": {
          "$ref": "#/$defs/itemRefArray"
        },
        "sourceRef": {
          "$ref": "#/$defs/itemRef"
        }
      },
      "required": [
        "operation",
        "sourceRef",
        "relatedRefs"
      ],
      "type": "object"
    },
    {
      "properties": {
        "operation": {
          "const": "item.removeRelated"
        },
        "relatedRefs": {
          "$ref": "#/$defs/itemRefArray"
        },
        "sourceRef": {
          "$ref": "#/$defs/itemRef"
        }
      },
      "required": [
        "operation",
        "sourceRef",
        "relatedRefs"
      ],
      "type": "object"
    },
    {
      "properties": {
        "initialMemberRefs": {
          "$ref": "#/$defs/itemRefArray"
        },
        "name": {
          "minLength": 1,
          "type": "string"
        },
        "operation": {
          "const": "collection.create"
        },
        "placement": {
          "oneOf": [
            {
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "const": "root"
                },
                "libraryId": {
                  "minimum": 1,
                  "type": "integer"
                }
              },
              "required": [
                "kind"
              ],
              "type": "object"
            },
            {
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "const": "child"
                },
                "parentRef": {
                  "$ref": "#/$defs/collectionRef"
                }
              },
              "required": [
                "kind",
                "parentRef"
              ],
              "type": "object"
            }
          ]
        }
      },
      "required": [
        "operation",
        "name",
        "placement"
      ],
      "type": "object"
    },
    {
      "properties": {
        "collectionRef": {
          "$ref": "#/$defs/collectionRef"
        },
        "operation": {
          "const": "collection.update"
        },
        "patch": {
          "additionalProperties": false,
          "properties": {
            "name": {
              "minLength": 1,
              "type": "string"
            },
            "parentRef": {
              "anyOf": [
                {
                  "$ref": "#/$defs/collectionRef"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "type": "object"
        }
      },
      "required": [
        "operation",
        "collectionRef",
        "patch"
      ],
      "type": "object"
    },
    {
      "properties": {
        "add": {
          "$ref": "#/$defs/itemRefArray"
        },
        "collectionRef": {
          "$ref": "#/$defs/collectionRef"
        },
        "operation": {
          "const": "collection.updateMembership"
        },
        "remove": {
          "$ref": "#/$defs/itemRefArray"
        }
      },
      "required": [
        "operation",
        "collectionRef",
        "add",
        "remove"
      ],
      "type": "object"
    },
    {
      "properties": {
        "childPolicy": {
          "enum": [
            "reject_if_present",
            "cascade"
          ]
        },
        "collectionRef": {
          "$ref": "#/$defs/collectionRef"
        },
        "operation": {
          "const": "collection.remove"
        }
      },
      "required": [
        "operation",
        "collectionRef",
        "childPolicy"
      ],
      "type": "object"
    },
    {
      "properties": {
        "content": {
          "$ref": "#/$defs/noteContent"
        },
        "initialTags": {
          "$ref": "#/$defs/stringArray"
        },
        "operation": {
          "const": "notes.create"
        },
        "placement": {
          "oneOf": [
            {
              "additionalProperties": false,
              "properties": {
                "collectionRefs": {
                  "$ref": "#/$defs/collectionRefArray"
                },
                "kind": {
                  "const": "top_level"
                },
                "libraryId": {
                  "minimum": 1,
                  "type": "integer"
                }
              },
              "required": [
                "kind"
              ],
              "type": "object"
            },
            {
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "const": "child"
                },
                "parentRef": {
                  "$ref": "#/$defs/itemRef"
                }
              },
              "required": [
                "kind",
                "parentRef"
              ],
              "type": "object"
            }
          ]
        }
      },
      "required": [
        "operation",
        "placement",
        "content"
      ],
      "type": "object"
    },
    {
      "properties": {
        "content": {
          "$ref": "#/$defs/noteContent"
        },
        "noteRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "notes.updateContent"
        }
      },
      "required": [
        "operation",
        "noteRef",
        "content"
      ],
      "type": "object"
    },
    {
      "properties": {
        "disposition": {
          "const": "permanent"
        },
        "noteRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "notes.remove"
        }
      },
      "required": [
        "operation",
        "noteRef",
        "disposition"
      ],
      "type": "object"
    },
    {
      "properties": {
        "noteRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "notes.upsertPayload"
        },
        "payload": {
          "additionalProperties": false,
          "properties": {
            "format": {
              "enum": [
                "json",
                "markdown",
                "text"
              ]
            },
            "noteKind": {
              "minLength": 1,
              "type": "string"
            },
            "payloadType": {
              "minLength": 1,
              "type": "string"
            },
            "schemaVersion": {
              "minLength": 1,
              "type": "string"
            },
            "value": {
              "$ref": "#/$defs/jsonValue"
            }
          },
          "required": [
            "payloadType",
            "noteKind",
            "schemaVersion",
            "format",
            "value"
          ],
          "type": "object"
        }
      },
      "required": [
        "operation",
        "noteRef",
        "payload"
      ],
      "type": "object"
    },
    {
      "properties": {
        "metadata": {
          "additionalProperties": false,
          "properties": {
            "charset": {
              "type": "string"
            },
            "contentType": {
              "type": "string"
            },
            "originalUrl": {
              "type": "string"
            },
            "title": {
              "type": "string"
            }
          },
          "type": "object"
        },
        "operation": {
          "const": "attachments.create"
        },
        "placement": {
          "oneOf": [
            {
              "additionalProperties": false,
              "properties": {
                "collectionRefs": {
                  "$ref": "#/$defs/collectionRefArray"
                },
                "kind": {
                  "const": "top_level"
                },
                "libraryId": {
                  "minimum": 1,
                  "type": "integer"
                }
              },
              "required": [
                "kind"
              ],
              "type": "object"
            },
            {
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "const": "child"
                },
                "parentRef": {
                  "$ref": "#/$defs/itemRef"
                }
              },
              "required": [
                "kind",
                "parentRef"
              ],
              "type": "object"
            }
          ]
        },
        "source": {
          "$ref": "#/$defs/attachmentSource"
        }
      },
      "required": [
        "operation",
        "placement",
        "source"
      ],
      "type": "object"
    },
    {
      "properties": {
        "attachmentRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "attachments.updateMetadata"
        },
        "patch": {
          "additionalProperties": false,
          "properties": {
            "charset": {
              "type": [
                "string",
                "null"
              ]
            },
            "contentType": {
              "type": [
                "string",
                "null"
              ]
            },
            "title": {
              "type": [
                "string",
                "null"
              ]
            },
            "url": {
              "type": [
                "string",
                "null"
              ]
            }
          },
          "type": "object"
        }
      },
      "required": [
        "operation",
        "attachmentRef",
        "patch"
      ],
      "type": "object"
    },
    {
      "properties": {
        "attachmentRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "attachments.replaceFile"
        },
        "source": {
          "$ref": "#/$defs/bridgeUploadSource"
        }
      },
      "required": [
        "operation",
        "attachmentRef",
        "source"
      ],
      "type": "object"
    },
    {
      "properties": {
        "attachmentRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "attachments.move"
        },
        "placement": {
          "oneOf": [
            {
              "additionalProperties": false,
              "properties": {
                "collectionRefs": {
                  "$ref": "#/$defs/collectionRefArray"
                },
                "kind": {
                  "const": "top_level"
                },
                "libraryId": {
                  "minimum": 1,
                  "type": "integer"
                }
              },
              "required": [
                "kind"
              ],
              "type": "object"
            },
            {
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "const": "child"
                },
                "parentRef": {
                  "$ref": "#/$defs/itemRef"
                }
              },
              "required": [
                "kind",
                "parentRef"
              ],
              "type": "object"
            }
          ]
        }
      },
      "required": [
        "operation",
        "attachmentRef",
        "placement"
      ],
      "type": "object"
    },
    {
      "properties": {
        "attachmentRef": {
          "$ref": "#/$defs/itemRef"
        },
        "disposition": {
          "const": "permanent"
        },
        "operation": {
          "const": "attachments.remove"
        }
      },
      "required": [
        "operation",
        "attachmentRef",
        "disposition"
      ],
      "type": "object"
    },
    {
      "properties": {
        "add": {
          "items": {
            "enum": [
              "need-metadata-curation",
              "need-fulltext",
              "need-markdown",
              "need-analysis",
              "need-deep-reading"
            ]
          },
          "type": "array"
        },
        "itemRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "statusTags.transition"
        },
        "remove": {
          "items": {
            "enum": [
              "need-metadata-curation",
              "need-fulltext",
              "need-markdown",
              "need-analysis",
              "need-deep-reading"
            ]
          },
          "type": "array"
        }
      },
      "required": [
        "operation",
        "itemRef"
      ],
      "type": "object"
    },
    {
      "properties": {
        "itemRefs": {
          "$ref": "#/$defs/itemRefArray"
        },
        "operation": {
          "const": "trash.setItemsState"
        },
        "state": {
          "enum": [
            "trashed",
            "active"
          ]
        }
      },
      "required": [
        "operation",
        "itemRefs",
        "state"
      ],
      "type": "object"
    },
    {
      "properties": {
        "collectionRef": {
          "$ref": "#/$defs/collectionRef"
        },
        "operation": {
          "const": "literature.ingest"
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
        }
      },
      "required": [
        "operation",
        "collectionRef",
        "paper"
      ],
      "type": "object"
    }
  ],
  "type": "object",
  "unevaluatedProperties": false
}
```

## Composed payload schema

```json
{
  "$defs": {
    "attachmentSource": {
      "oneOf": [
        {
          "$ref": "#/$defs/bridgeUploadSource"
        },
        {
          "additionalProperties": false,
          "properties": {
            "kind": {
              "const": "linked_url"
            },
            "url": {
              "minLength": 1,
              "type": "string"
            }
          },
          "required": [
            "kind",
            "url"
          ],
          "type": "object"
        },
        {
          "additionalProperties": false,
          "properties": {
            "kind": {
              "const": "stored_url"
            },
            "url": {
              "minLength": 1,
              "type": "string"
            }
          },
          "required": [
            "kind",
            "url"
          ],
          "type": "object"
        }
      ]
    },
    "bridgeUploadSource": {
      "additionalProperties": false,
      "properties": {
        "companions": {
          "items": {
            "additionalProperties": false,
            "properties": {
              "targetRelativePath": {
                "minLength": 1,
                "type": "string"
              }
            },
            "required": [
              "targetRelativePath"
            ],
            "type": "object"
          },
          "type": "array"
        },
        "fileId": {
          "minLength": 1,
          "type": "string"
        },
        "kind": {
          "const": "stored_file"
        },
        "targetFilename": {
          "minLength": 1,
          "type": "string"
        }
      },
      "required": [
        "kind",
        "fileId"
      ],
      "type": "object"
    },
    "collectionRef": {
      "additionalProperties": false,
      "properties": {
        "key": {
          "minLength": 1,
          "type": "string"
        },
        "libraryId": {
          "minimum": 1,
          "type": "integer"
        }
      },
      "required": [
        "libraryId",
        "key"
      ],
      "type": "object"
    },
    "collectionRefArray": {
      "items": {
        "$ref": "#/$defs/collectionRef"
      },
      "type": "array"
    },
    "creator": {
      "additionalProperties": false,
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
    "itemRef": {
      "additionalProperties": false,
      "properties": {
        "key": {
          "minLength": 1,
          "type": "string"
        },
        "libraryId": {
          "minimum": 1,
          "type": "integer"
        }
      },
      "required": [
        "libraryId",
        "key"
      ],
      "type": "object"
    },
    "itemRefArray": {
      "items": {
        "$ref": "#/$defs/itemRef"
      },
      "type": "array"
    },
    "jsonValue": {
      "anyOf": [
        {
          "type": "null"
        },
        {
          "type": "boolean"
        },
        {
          "type": "number"
        },
        {
          "type": "string"
        },
        {
          "items": {
            "$ref": "#/$defs/jsonValue"
          },
          "type": "array"
        },
        {
          "additionalProperties": {
            "$ref": "#/$defs/jsonValue"
          },
          "type": "object"
        }
      ]
    },
    "noteContent": {
      "additionalProperties": false,
      "properties": {
        "embeddedImages": {
          "items": {
            "additionalProperties": false,
            "properties": {
              "altText": {
                "type": "string"
              },
              "preparedImage": {
                "additionalProperties": false,
                "properties": {
                  "id": {
                    "minLength": 1,
                    "type": "string"
                  },
                  "kind": {
                    "const": "prepared_note_image"
                  }
                },
                "required": [
                  "kind",
                  "id"
                ],
                "type": "object"
              },
              "slot": {
                "minLength": 1,
                "type": "string"
              }
            },
            "required": [
              "slot",
              "preparedImage"
            ],
            "type": "object"
          },
          "type": "array"
        },
        "format": {
          "enum": [
            "html",
            "text"
          ]
        },
        "value": {
          "type": "string"
        }
      },
      "required": [
        "format",
        "value"
      ],
      "type": "object"
    },
    "stringArray": {
      "items": {
        "minLength": 1,
        "type": "string"
      },
      "type": "array"
    }
  },
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "properties": {
        "collectionRefs": {
          "$ref": "#/$defs/collectionRefArray"
        },
        "creators": {
          "items": {
            "$ref": "#/$defs/creator"
          },
          "type": "array"
        },
        "fields": {
          "additionalProperties": {
            "type": "string"
          },
          "type": "object"
        },
        "initialRelatedRefs": {
          "$ref": "#/$defs/itemRefArray"
        },
        "initialTags": {
          "$ref": "#/$defs/stringArray"
        },
        "itemType": {
          "minLength": 1,
          "type": "string"
        },
        "libraryId": {
          "minimum": 1,
          "type": "integer"
        },
        "operation": {
          "const": "item.create"
        }
      },
      "required": [
        "operation",
        "itemType",
        "fields"
      ],
      "type": "object"
    },
    {
      "properties": {
        "itemRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "item.updateMetadata"
        },
        "patch": {
          "additionalProperties": false,
          "properties": {
            "creators": {
              "items": {
                "$ref": "#/$defs/creator"
              },
              "type": "array"
            },
            "fields": {
              "additionalProperties": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "type": "object"
            }
          },
          "type": "object"
        }
      },
      "required": [
        "operation",
        "itemRef",
        "patch"
      ],
      "type": "object"
    },
    {
      "properties": {
        "incompatibleData": {
          "enum": [
            "reject",
            "move_to_extra",
            "drop"
          ]
        },
        "itemRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "item.changeType"
        },
        "targetItemType": {
          "minLength": 1,
          "type": "string"
        }
      },
      "required": [
        "operation",
        "itemRef",
        "targetItemType",
        "incompatibleData"
      ],
      "type": "object"
    },
    {
      "properties": {
        "childPolicy": {
          "enum": [
            "reject_if_present",
            "cascade"
          ]
        },
        "disposition": {
          "const": "permanent"
        },
        "itemRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "item.remove"
        }
      },
      "required": [
        "operation",
        "itemRef",
        "disposition",
        "childPolicy"
      ],
      "type": "object"
    },
    {
      "properties": {
        "add": {
          "$ref": "#/$defs/stringArray"
        },
        "itemRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "item.updateTags"
        },
        "remove": {
          "$ref": "#/$defs/stringArray"
        }
      },
      "required": [
        "operation",
        "itemRef",
        "add",
        "remove"
      ],
      "type": "object"
    },
    {
      "properties": {
        "operation": {
          "const": "item.addRelated"
        },
        "relatedRefs": {
          "$ref": "#/$defs/itemRefArray"
        },
        "sourceRef": {
          "$ref": "#/$defs/itemRef"
        }
      },
      "required": [
        "operation",
        "sourceRef",
        "relatedRefs"
      ],
      "type": "object"
    },
    {
      "properties": {
        "operation": {
          "const": "item.removeRelated"
        },
        "relatedRefs": {
          "$ref": "#/$defs/itemRefArray"
        },
        "sourceRef": {
          "$ref": "#/$defs/itemRef"
        }
      },
      "required": [
        "operation",
        "sourceRef",
        "relatedRefs"
      ],
      "type": "object"
    },
    {
      "properties": {
        "initialMemberRefs": {
          "$ref": "#/$defs/itemRefArray"
        },
        "name": {
          "minLength": 1,
          "type": "string"
        },
        "operation": {
          "const": "collection.create"
        },
        "placement": {
          "oneOf": [
            {
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "const": "root"
                },
                "libraryId": {
                  "minimum": 1,
                  "type": "integer"
                }
              },
              "required": [
                "kind"
              ],
              "type": "object"
            },
            {
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "const": "child"
                },
                "parentRef": {
                  "$ref": "#/$defs/collectionRef"
                }
              },
              "required": [
                "kind",
                "parentRef"
              ],
              "type": "object"
            }
          ]
        }
      },
      "required": [
        "operation",
        "name",
        "placement"
      ],
      "type": "object"
    },
    {
      "properties": {
        "collectionRef": {
          "$ref": "#/$defs/collectionRef"
        },
        "operation": {
          "const": "collection.update"
        },
        "patch": {
          "additionalProperties": false,
          "properties": {
            "name": {
              "minLength": 1,
              "type": "string"
            },
            "parentRef": {
              "anyOf": [
                {
                  "$ref": "#/$defs/collectionRef"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "type": "object"
        }
      },
      "required": [
        "operation",
        "collectionRef",
        "patch"
      ],
      "type": "object"
    },
    {
      "properties": {
        "add": {
          "$ref": "#/$defs/itemRefArray"
        },
        "collectionRef": {
          "$ref": "#/$defs/collectionRef"
        },
        "operation": {
          "const": "collection.updateMembership"
        },
        "remove": {
          "$ref": "#/$defs/itemRefArray"
        }
      },
      "required": [
        "operation",
        "collectionRef",
        "add",
        "remove"
      ],
      "type": "object"
    },
    {
      "properties": {
        "childPolicy": {
          "enum": [
            "reject_if_present",
            "cascade"
          ]
        },
        "collectionRef": {
          "$ref": "#/$defs/collectionRef"
        },
        "operation": {
          "const": "collection.remove"
        }
      },
      "required": [
        "operation",
        "collectionRef",
        "childPolicy"
      ],
      "type": "object"
    },
    {
      "properties": {
        "content": {
          "$ref": "#/$defs/noteContent"
        },
        "initialTags": {
          "$ref": "#/$defs/stringArray"
        },
        "operation": {
          "const": "notes.create"
        },
        "placement": {
          "oneOf": [
            {
              "additionalProperties": false,
              "properties": {
                "collectionRefs": {
                  "$ref": "#/$defs/collectionRefArray"
                },
                "kind": {
                  "const": "top_level"
                },
                "libraryId": {
                  "minimum": 1,
                  "type": "integer"
                }
              },
              "required": [
                "kind"
              ],
              "type": "object"
            },
            {
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "const": "child"
                },
                "parentRef": {
                  "$ref": "#/$defs/itemRef"
                }
              },
              "required": [
                "kind",
                "parentRef"
              ],
              "type": "object"
            }
          ]
        }
      },
      "required": [
        "operation",
        "placement",
        "content"
      ],
      "type": "object"
    },
    {
      "properties": {
        "content": {
          "$ref": "#/$defs/noteContent"
        },
        "noteRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "notes.updateContent"
        }
      },
      "required": [
        "operation",
        "noteRef",
        "content"
      ],
      "type": "object"
    },
    {
      "properties": {
        "disposition": {
          "const": "permanent"
        },
        "noteRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "notes.remove"
        }
      },
      "required": [
        "operation",
        "noteRef",
        "disposition"
      ],
      "type": "object"
    },
    {
      "properties": {
        "noteRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "notes.upsertPayload"
        },
        "payload": {
          "additionalProperties": false,
          "properties": {
            "format": {
              "enum": [
                "json",
                "markdown",
                "text"
              ]
            },
            "noteKind": {
              "minLength": 1,
              "type": "string"
            },
            "payloadType": {
              "minLength": 1,
              "type": "string"
            },
            "schemaVersion": {
              "minLength": 1,
              "type": "string"
            },
            "value": {
              "$ref": "#/$defs/jsonValue"
            }
          },
          "required": [
            "payloadType",
            "noteKind",
            "schemaVersion",
            "format",
            "value"
          ],
          "type": "object"
        }
      },
      "required": [
        "operation",
        "noteRef",
        "payload"
      ],
      "type": "object"
    },
    {
      "properties": {
        "metadata": {
          "additionalProperties": false,
          "properties": {
            "charset": {
              "type": "string"
            },
            "contentType": {
              "type": "string"
            },
            "originalUrl": {
              "type": "string"
            },
            "title": {
              "type": "string"
            }
          },
          "type": "object"
        },
        "operation": {
          "const": "attachments.create"
        },
        "placement": {
          "oneOf": [
            {
              "additionalProperties": false,
              "properties": {
                "collectionRefs": {
                  "$ref": "#/$defs/collectionRefArray"
                },
                "kind": {
                  "const": "top_level"
                },
                "libraryId": {
                  "minimum": 1,
                  "type": "integer"
                }
              },
              "required": [
                "kind"
              ],
              "type": "object"
            },
            {
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "const": "child"
                },
                "parentRef": {
                  "$ref": "#/$defs/itemRef"
                }
              },
              "required": [
                "kind",
                "parentRef"
              ],
              "type": "object"
            }
          ]
        },
        "source": {
          "$ref": "#/$defs/attachmentSource"
        }
      },
      "required": [
        "operation",
        "placement",
        "source"
      ],
      "type": "object"
    },
    {
      "properties": {
        "attachmentRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "attachments.updateMetadata"
        },
        "patch": {
          "additionalProperties": false,
          "properties": {
            "charset": {
              "type": [
                "string",
                "null"
              ]
            },
            "contentType": {
              "type": [
                "string",
                "null"
              ]
            },
            "title": {
              "type": [
                "string",
                "null"
              ]
            },
            "url": {
              "type": [
                "string",
                "null"
              ]
            }
          },
          "type": "object"
        }
      },
      "required": [
        "operation",
        "attachmentRef",
        "patch"
      ],
      "type": "object"
    },
    {
      "properties": {
        "attachmentRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "attachments.replaceFile"
        },
        "source": {
          "$ref": "#/$defs/bridgeUploadSource"
        }
      },
      "required": [
        "operation",
        "attachmentRef",
        "source"
      ],
      "type": "object"
    },
    {
      "properties": {
        "attachmentRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "attachments.move"
        },
        "placement": {
          "oneOf": [
            {
              "additionalProperties": false,
              "properties": {
                "collectionRefs": {
                  "$ref": "#/$defs/collectionRefArray"
                },
                "kind": {
                  "const": "top_level"
                },
                "libraryId": {
                  "minimum": 1,
                  "type": "integer"
                }
              },
              "required": [
                "kind"
              ],
              "type": "object"
            },
            {
              "additionalProperties": false,
              "properties": {
                "kind": {
                  "const": "child"
                },
                "parentRef": {
                  "$ref": "#/$defs/itemRef"
                }
              },
              "required": [
                "kind",
                "parentRef"
              ],
              "type": "object"
            }
          ]
        }
      },
      "required": [
        "operation",
        "attachmentRef",
        "placement"
      ],
      "type": "object"
    },
    {
      "properties": {
        "attachmentRef": {
          "$ref": "#/$defs/itemRef"
        },
        "disposition": {
          "const": "permanent"
        },
        "operation": {
          "const": "attachments.remove"
        }
      },
      "required": [
        "operation",
        "attachmentRef",
        "disposition"
      ],
      "type": "object"
    },
    {
      "properties": {
        "add": {
          "items": {
            "enum": [
              "need-metadata-curation",
              "need-fulltext",
              "need-markdown",
              "need-analysis",
              "need-deep-reading"
            ]
          },
          "type": "array"
        },
        "itemRef": {
          "$ref": "#/$defs/itemRef"
        },
        "operation": {
          "const": "statusTags.transition"
        },
        "remove": {
          "items": {
            "enum": [
              "need-metadata-curation",
              "need-fulltext",
              "need-markdown",
              "need-analysis",
              "need-deep-reading"
            ]
          },
          "type": "array"
        }
      },
      "required": [
        "operation",
        "itemRef"
      ],
      "type": "object"
    },
    {
      "properties": {
        "itemRefs": {
          "$ref": "#/$defs/itemRefArray"
        },
        "operation": {
          "const": "trash.setItemsState"
        },
        "state": {
          "enum": [
            "trashed",
            "active"
          ]
        }
      },
      "required": [
        "operation",
        "itemRefs",
        "state"
      ],
      "type": "object"
    },
    {
      "properties": {
        "collectionRef": {
          "$ref": "#/$defs/collectionRef"
        },
        "operation": {
          "const": "literature.ingest"
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
        }
      },
      "required": [
        "operation",
        "collectionRef",
        "paper"
      ],
      "type": "object"
    }
  ],
  "type": "object",
  "unevaluatedProperties": false
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
      "const": "mutation.preview"
    },
    "data": {
      "additionalProperties": false,
      "properties": {
        "domainPlanDigest": {
          "minLength": 1,
          "type": "string"
        },
        "observedAt": {
          "minLength": 1,
          "type": "string"
        },
        "operation": {
          "enum": [
            "item.create",
            "item.updateMetadata",
            "item.changeType",
            "item.remove",
            "item.updateTags",
            "item.addRelated",
            "item.removeRelated",
            "collection.create",
            "collection.update",
            "collection.updateMembership",
            "collection.remove",
            "notes.create",
            "notes.updateContent",
            "notes.remove",
            "notes.upsertPayload",
            "attachments.create",
            "attachments.updateMetadata",
            "attachments.replaceFile",
            "attachments.move",
            "attachments.remove",
            "statusTags.transition",
            "trash.setItemsState",
            "literature.ingest"
          ]
        },
        "outcome": {
          "enum": [
            "would_change",
            "unchanged"
          ]
        },
        "plan": {
          "additionalProperties": true,
          "type": "object"
        },
        "schema": {
          "const": "zotero-agents.mutation-preview.v1"
        }
      },
      "required": [
        "schema",
        "operation",
        "outcome",
        "observedAt",
        "domainPlanDigest",
        "plan"
      ],
      "type": "object"
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
zotero-bridge mutation preview --input '{"add":["topic:example"],"itemRef":{"key":"ABC123","libraryId":1},"operation":"item.updateTags","remove":[]}'
```

Prerequisites:

- Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution.

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

```json
{
  "approvalContract": {
    "kind": "none",
    "scope": "No Zotero UI approval; provider runtimes may still request their own permission.",
    "timing": "none"
  },
  "arguments": [
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Canonical mutation input as inline JSON, a file path, @file, or '-' for stdin",
      "id": "input",
      "kind": "option",
      "longHelp": "Canonical mutation input is required. Use inline JSON, a file path containing JSON, @file syntax, or '-' to read JSON from stdin.",
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "--input",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "argv": [
    "mutation",
    "preview"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "input",
      "required": true,
      "takesValue": true,
      "token": "--input",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "binding": "passthrough",
  "category": "read",
  "command": "mutation preview",
  "composition": null,
  "danger": "none",
  "effects": [
    {
      "description": "Reads state without changing Zotero-managed data.",
      "kind": "none",
      "stateChanged": false
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
            "add": [
              "topic:example"
            ],
            "itemRef": {
              "key": "ABC123",
              "libraryId": 1
            },
            "operation": "item.updateTags",
            "remove": []
          }
        }
      ],
      "required": true,
      "requiredWhen": [],
      "schema": {
        "$defs": {
          "attachmentContentManifest": {
            "additionalProperties": false,
            "properties": {
              "companions": {
                "items": {
                  "additionalProperties": false,
                  "properties": {
                    "relativePath": {
                      "minLength": 1,
                      "type": "string"
                    },
                    "sha256": {
                      "pattern": "^sha256:[0-9a-f]{64}$",
                      "type": "string"
                    },
                    "sizeBytes": {
                      "minimum": 0,
                      "type": "integer"
                    }
                  },
                  "required": [
                    "relativePath",
                    "sizeBytes",
                    "sha256"
                  ],
                  "type": "object"
                },
                "type": "array"
              },
              "identity": {
                "minLength": 1,
                "type": "string"
              },
              "main": {
                "additionalProperties": false,
                "properties": {
                  "relativePath": {
                    "minLength": 1,
                    "type": "string"
                  },
                  "sha256": {
                    "pattern": "^sha256:[0-9a-f]{64}$",
                    "type": "string"
                  },
                  "sizeBytes": {
                    "minimum": 0,
                    "type": "integer"
                  }
                },
                "required": [
                  "relativePath",
                  "sizeBytes",
                  "sha256"
                ],
                "type": "object"
              },
              "schema": {
                "const": "zotero-agents.attachment-content.v1"
              }
            },
            "required": [
              "schema",
              "identity",
              "main",
              "companions"
            ],
            "type": "object"
          },
          "attachmentSource": {
            "oneOf": [
              {
                "$ref": "#/$defs/bridgeUploadSource"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "kind": {
                    "const": "linked_url"
                  },
                  "url": {
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "kind",
                  "url"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "kind": {
                    "const": "stored_url"
                  },
                  "url": {
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "kind",
                  "url"
                ],
                "type": "object"
              }
            ]
          },
          "bridgeUploadSource": {
            "additionalProperties": false,
            "properties": {
              "companions": {
                "items": {
                  "additionalProperties": false,
                  "properties": {
                    "targetRelativePath": {
                      "minLength": 1,
                      "type": "string"
                    }
                  },
                  "required": [
                    "targetRelativePath"
                  ],
                  "type": "object"
                },
                "type": "array"
              },
              "fileId": {
                "minLength": 1,
                "type": "string"
              },
              "kind": {
                "const": "stored_file"
              },
              "targetFilename": {
                "minLength": 1,
                "type": "string"
              }
            },
            "required": [
              "kind",
              "fileId"
            ],
            "type": "object"
          },
          "collectionRef": {
            "additionalProperties": false,
            "properties": {
              "key": {
                "minLength": 1,
                "type": "string"
              },
              "libraryId": {
                "minimum": 1,
                "type": "integer"
              }
            },
            "required": [
              "libraryId",
              "key"
            ],
            "type": "object"
          },
          "collectionRefArray": {
            "items": {
              "$ref": "#/$defs/collectionRef"
            },
            "type": "array"
          },
          "creator": {
            "additionalProperties": false,
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
          "itemRef": {
            "additionalProperties": false,
            "properties": {
              "key": {
                "minLength": 1,
                "type": "string"
              },
              "libraryId": {
                "minimum": 1,
                "type": "integer"
              }
            },
            "required": [
              "libraryId",
              "key"
            ],
            "type": "object"
          },
          "itemRefArray": {
            "items": {
              "$ref": "#/$defs/itemRef"
            },
            "type": "array"
          },
          "jsonValue": {
            "anyOf": [
              {
                "type": "null"
              },
              {
                "type": "boolean"
              },
              {
                "type": "number"
              },
              {
                "type": "string"
              },
              {
                "items": {
                  "$ref": "#/$defs/jsonValue"
                },
                "type": "array"
              },
              {
                "additionalProperties": {
                  "$ref": "#/$defs/jsonValue"
                },
                "type": "object"
              }
            ]
          },
          "noteContent": {
            "additionalProperties": false,
            "properties": {
              "embeddedImages": {
                "items": {
                  "additionalProperties": false,
                  "properties": {
                    "altText": {
                      "type": "string"
                    },
                    "preparedImage": {
                      "additionalProperties": false,
                      "properties": {
                        "id": {
                          "minLength": 1,
                          "type": "string"
                        },
                        "kind": {
                          "const": "prepared_note_image"
                        }
                      },
                      "required": [
                        "kind",
                        "id"
                      ],
                      "type": "object"
                    },
                    "slot": {
                      "minLength": 1,
                      "type": "string"
                    }
                  },
                  "required": [
                    "slot",
                    "preparedImage"
                  ],
                  "type": "object"
                },
                "type": "array"
              },
              "format": {
                "enum": [
                  "html",
                  "text"
                ]
              },
              "value": {
                "type": "string"
              }
            },
            "required": [
              "format",
              "value"
            ],
            "type": "object"
          },
          "storedAttachmentSource": {
            "additionalProperties": false,
            "properties": {
              "companions": {
                "items": {
                  "additionalProperties": false,
                  "properties": {
                    "targetRelativePath": {
                      "minLength": 1,
                      "type": "string"
                    }
                  },
                  "required": [
                    "targetRelativePath"
                  ],
                  "type": "object"
                },
                "type": "array"
              },
              "content": {
                "$ref": "#/$defs/attachmentContentManifest"
              },
              "kind": {
                "const": "stored_file"
              },
              "targetFilename": {
                "minLength": 1,
                "type": "string"
              }
            },
            "required": [
              "kind",
              "content"
            ],
            "type": "object"
          },
          "stringArray": {
            "items": {
              "minLength": 1,
              "type": "string"
            },
            "type": "array"
          }
        },
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "oneOf": [
          {
            "properties": {
              "collectionRefs": {
                "$ref": "#/$defs/collectionRefArray"
              },
              "creators": {
                "items": {
                  "$ref": "#/$defs/creator"
                },
                "type": "array"
              },
              "fields": {
                "additionalProperties": {
                  "type": "string"
                },
                "type": "object"
              },
              "initialRelatedRefs": {
                "$ref": "#/$defs/itemRefArray"
              },
              "initialTags": {
                "$ref": "#/$defs/stringArray"
              },
              "itemType": {
                "minLength": 1,
                "type": "string"
              },
              "libraryId": {
                "minimum": 1,
                "type": "integer"
              },
              "operation": {
                "const": "item.create"
              }
            },
            "required": [
              "operation",
              "itemType",
              "fields"
            ],
            "type": "object"
          },
          {
            "properties": {
              "itemRef": {
                "$ref": "#/$defs/itemRef"
              },
              "operation": {
                "const": "item.updateMetadata"
              },
              "patch": {
                "additionalProperties": false,
                "properties": {
                  "creators": {
                    "items": {
                      "$ref": "#/$defs/creator"
                    },
                    "type": "array"
                  },
                  "fields": {
                    "additionalProperties": {
                      "type": [
                        "string",
                        "null"
                      ]
                    },
                    "type": "object"
                  }
                },
                "type": "object"
              }
            },
            "required": [
              "operation",
              "itemRef",
              "patch"
            ],
            "type": "object"
          },
          {
            "properties": {
              "incompatibleData": {
                "enum": [
                  "reject",
                  "move_to_extra",
                  "drop"
                ]
              },
              "itemRef": {
                "$ref": "#/$defs/itemRef"
              },
              "operation": {
                "const": "item.changeType"
              },
              "targetItemType": {
                "minLength": 1,
                "type": "string"
              }
            },
            "required": [
              "operation",
              "itemRef",
              "targetItemType",
              "incompatibleData"
            ],
            "type": "object"
          },
          {
            "properties": {
              "childPolicy": {
                "enum": [
                  "reject_if_present",
                  "cascade"
                ]
              },
              "disposition": {
                "const": "permanent"
              },
              "itemRef": {
                "$ref": "#/$defs/itemRef"
              },
              "operation": {
                "const": "item.remove"
              }
            },
            "required": [
              "operation",
              "itemRef",
              "disposition",
              "childPolicy"
            ],
            "type": "object"
          },
          {
            "properties": {
              "add": {
                "$ref": "#/$defs/stringArray"
              },
              "itemRef": {
                "$ref": "#/$defs/itemRef"
              },
              "operation": {
                "const": "item.updateTags"
              },
              "remove": {
                "$ref": "#/$defs/stringArray"
              }
            },
            "required": [
              "operation",
              "itemRef",
              "add",
              "remove"
            ],
            "type": "object"
          },
          {
            "properties": {
              "operation": {
                "const": "item.addRelated"
              },
              "relatedRefs": {
                "$ref": "#/$defs/itemRefArray"
              },
              "sourceRef": {
                "$ref": "#/$defs/itemRef"
              }
            },
            "required": [
              "operation",
              "sourceRef",
              "relatedRefs"
            ],
            "type": "object"
          },
          {
            "properties": {
              "operation": {
                "const": "item.removeRelated"
              },
              "relatedRefs": {
                "$ref": "#/$defs/itemRefArray"
              },
              "sourceRef": {
                "$ref": "#/$defs/itemRef"
              }
            },
            "required": [
              "operation",
              "sourceRef",
              "relatedRefs"
            ],
            "type": "object"
          },
          {
            "properties": {
              "initialMemberRefs": {
                "$ref": "#/$defs/itemRefArray"
              },
              "name": {
                "minLength": 1,
                "type": "string"
              },
              "operation": {
                "const": "collection.create"
              },
              "placement": {
                "oneOf": [
                  {
                    "additionalProperties": false,
                    "properties": {
                      "kind": {
                        "const": "root"
                      },
                      "libraryId": {
                        "minimum": 1,
                        "type": "integer"
                      }
                    },
                    "required": [
                      "kind"
                    ],
                    "type": "object"
                  },
                  {
                    "additionalProperties": false,
                    "properties": {
                      "kind": {
                        "const": "child"
                      },
                      "parentRef": {
                        "$ref": "#/$defs/collectionRef"
                      }
                    },
                    "required": [
                      "kind",
                      "parentRef"
                    ],
                    "type": "object"
                  }
                ]
              }
            },
            "required": [
              "operation",
              "name",
              "placement"
            ],
            "type": "object"
          },
          {
            "properties": {
              "collectionRef": {
                "$ref": "#/$defs/collectionRef"
              },
              "operation": {
                "const": "collection.update"
              },
              "patch": {
                "additionalProperties": false,
                "properties": {
                  "name": {
                    "minLength": 1,
                    "type": "string"
                  },
                  "parentRef": {
                    "anyOf": [
                      {
                        "$ref": "#/$defs/collectionRef"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  }
                },
                "type": "object"
              }
            },
            "required": [
              "operation",
              "collectionRef",
              "patch"
            ],
            "type": "object"
          },
          {
            "properties": {
              "add": {
                "$ref": "#/$defs/itemRefArray"
              },
              "collectionRef": {
                "$ref": "#/$defs/collectionRef"
              },
              "operation": {
                "const": "collection.updateMembership"
              },
              "remove": {
                "$ref": "#/$defs/itemRefArray"
              }
            },
            "required": [
              "operation",
              "collectionRef",
              "add",
              "remove"
            ],
            "type": "object"
          },
          {
            "properties": {
              "childPolicy": {
                "enum": [
                  "reject_if_present",
                  "cascade"
                ]
              },
              "collectionRef": {
                "$ref": "#/$defs/collectionRef"
              },
              "operation": {
                "const": "collection.remove"
              }
            },
            "required": [
              "operation",
              "collectionRef",
              "childPolicy"
            ],
            "type": "object"
          },
          {
            "properties": {
              "content": {
                "$ref": "#/$defs/noteContent"
              },
              "initialTags": {
                "$ref": "#/$defs/stringArray"
              },
              "operation": {
                "const": "notes.create"
              },
              "placement": {
                "oneOf": [
                  {
                    "additionalProperties": false,
                    "properties": {
                      "collectionRefs": {
                        "$ref": "#/$defs/collectionRefArray"
                      },
                      "kind": {
                        "const": "top_level"
                      },
                      "libraryId": {
                        "minimum": 1,
                        "type": "integer"
                      }
                    },
                    "required": [
                      "kind"
                    ],
                    "type": "object"
                  },
                  {
                    "additionalProperties": false,
                    "properties": {
                      "kind": {
                        "const": "child"
                      },
                      "parentRef": {
                        "$ref": "#/$defs/itemRef"
                      }
                    },
                    "required": [
                      "kind",
                      "parentRef"
                    ],
                    "type": "object"
                  }
                ]
              }
            },
            "required": [
              "operation",
              "placement",
              "content"
            ],
            "type": "object"
          },
          {
            "properties": {
              "content": {
                "$ref": "#/$defs/noteContent"
              },
              "noteRef": {
                "$ref": "#/$defs/itemRef"
              },
              "operation": {
                "const": "notes.updateContent"
              }
            },
            "required": [
              "operation",
              "noteRef",
              "content"
            ],
            "type": "object"
          },
          {
            "properties": {
              "disposition": {
                "const": "permanent"
              },
              "noteRef": {
                "$ref": "#/$defs/itemRef"
              },
              "operation": {
                "const": "notes.remove"
              }
            },
            "required": [
              "operation",
              "noteRef",
              "disposition"
            ],
            "type": "object"
          },
          {
            "properties": {
              "noteRef": {
                "$ref": "#/$defs/itemRef"
              },
              "operation": {
                "const": "notes.upsertPayload"
              },
              "payload": {
                "additionalProperties": false,
                "properties": {
                  "format": {
                    "enum": [
                      "json",
                      "markdown",
                      "text"
                    ]
                  },
                  "noteKind": {
                    "minLength": 1,
                    "type": "string"
                  },
                  "payloadType": {
                    "minLength": 1,
                    "type": "string"
                  },
                  "schemaVersion": {
                    "minLength": 1,
                    "type": "string"
                  },
                  "value": {
                    "$ref": "#/$defs/jsonValue"
                  }
                },
                "required": [
                  "payloadType",
                  "noteKind",
                  "schemaVersion",
                  "format",
                  "value"
                ],
                "type": "object"
              }
            },
            "required": [
              "operation",
              "noteRef",
              "payload"
            ],
            "type": "object"
          },
          {
            "properties": {
              "metadata": {
                "additionalProperties": false,
                "properties": {
                  "charset": {
                    "type": "string"
                  },
                  "contentType": {
                    "type": "string"
                  },
                  "originalUrl": {
                    "type": "string"
                  },
                  "title": {
                    "type": "string"
                  }
                },
                "type": "object"
              },
              "operation": {
                "const": "attachments.create"
              },
              "placement": {
                "oneOf": [
                  {
                    "additionalProperties": false,
                    "properties": {
                      "collectionRefs": {
                        "$ref": "#/$defs/collectionRefArray"
                      },
                      "kind": {
                        "const": "top_level"
                      },
                      "libraryId": {
                        "minimum": 1,
                        "type": "integer"
                      }
                    },
                    "required": [
                      "kind"
                    ],
                    "type": "object"
                  },
                  {
                    "additionalProperties": false,
                    "properties": {
                      "kind": {
                        "const": "child"
                      },
                      "parentRef": {
                        "$ref": "#/$defs/itemRef"
                      }
                    },
                    "required": [
                      "kind",
                      "parentRef"
                    ],
                    "type": "object"
                  }
                ]
              },
              "source": {
                "$ref": "#/$defs/attachmentSource"
              }
            },
            "required": [
              "operation",
              "placement",
              "source"
            ],
            "type": "object"
          },
          {
            "properties": {
              "attachmentRef": {
                "$ref": "#/$defs/itemRef"
              },
              "operation": {
                "const": "attachments.updateMetadata"
              },
              "patch": {
                "additionalProperties": false,
                "properties": {
                  "charset": {
                    "type": [
                      "string",
                      "null"
                    ]
                  },
                  "contentType": {
                    "type": [
                      "string",
                      "null"
                    ]
                  },
                  "title": {
                    "type": [
                      "string",
                      "null"
                    ]
                  },
                  "url": {
                    "type": [
                      "string",
                      "null"
                    ]
                  }
                },
                "type": "object"
              }
            },
            "required": [
              "operation",
              "attachmentRef",
              "patch"
            ],
            "type": "object"
          },
          {
            "properties": {
              "attachmentRef": {
                "$ref": "#/$defs/itemRef"
              },
              "operation": {
                "const": "attachments.replaceFile"
              },
              "source": {
                "$ref": "#/$defs/bridgeUploadSource"
              }
            },
            "required": [
              "operation",
              "attachmentRef",
              "source"
            ],
            "type": "object"
          },
          {
            "properties": {
              "attachmentRef": {
                "$ref": "#/$defs/itemRef"
              },
              "operation": {
                "const": "attachments.move"
              },
              "placement": {
                "oneOf": [
                  {
                    "additionalProperties": false,
                    "properties": {
                      "collectionRefs": {
                        "$ref": "#/$defs/collectionRefArray"
                      },
                      "kind": {
                        "const": "top_level"
                      },
                      "libraryId": {
                        "minimum": 1,
                        "type": "integer"
                      }
                    },
                    "required": [
                      "kind"
                    ],
                    "type": "object"
                  },
                  {
                    "additionalProperties": false,
                    "properties": {
                      "kind": {
                        "const": "child"
                      },
                      "parentRef": {
                        "$ref": "#/$defs/itemRef"
                      }
                    },
                    "required": [
                      "kind",
                      "parentRef"
                    ],
                    "type": "object"
                  }
                ]
              }
            },
            "required": [
              "operation",
              "attachmentRef",
              "placement"
            ],
            "type": "object"
          },
          {
            "properties": {
              "attachmentRef": {
                "$ref": "#/$defs/itemRef"
              },
              "disposition": {
                "const": "permanent"
              },
              "operation": {
                "const": "attachments.remove"
              }
            },
            "required": [
              "operation",
              "attachmentRef",
              "disposition"
            ],
            "type": "object"
          },
          {
            "properties": {
              "add": {
                "items": {
                  "enum": [
                    "need-metadata-curation",
                    "need-fulltext",
                    "need-markdown",
                    "need-analysis",
                    "need-deep-reading"
                  ]
                },
                "type": "array"
              },
              "itemRef": {
                "$ref": "#/$defs/itemRef"
              },
              "operation": {
                "const": "statusTags.transition"
              },
              "remove": {
                "items": {
                  "enum": [
                    "need-metadata-curation",
                    "need-fulltext",
                    "need-markdown",
                    "need-analysis",
                    "need-deep-reading"
                  ]
                },
                "type": "array"
              }
            },
            "required": [
              "operation",
              "itemRef"
            ],
            "type": "object"
          },
          {
            "properties": {
              "itemRefs": {
                "$ref": "#/$defs/itemRefArray"
              },
              "operation": {
                "const": "trash.setItemsState"
              },
              "state": {
                "enum": [
                  "trashed",
                  "active"
                ]
              }
            },
            "required": [
              "operation",
              "itemRefs",
              "state"
            ],
            "type": "object"
          },
          {
            "properties": {
              "collectionRef": {
                "$ref": "#/$defs/collectionRef"
              },
              "operation": {
                "const": "literature.ingest"
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
              }
            },
            "required": [
              "operation",
              "collectionRef",
              "paper"
            ],
            "type": "object"
          }
        ],
        "type": "object",
        "unevaluatedProperties": false
      },
      "schemaSource": "target-capability",
      "token": "--input"
    }
  },
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "input": {
        "description": "Canonical mutation input as inline JSON, a file path, @file, or '-' for stdin",
        "type": "string"
      }
    },
    "required": [
      "input"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "mutation preview",
    "mutation",
    "preview",
    "input",
    "JSON_OR_FILE"
  ],
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "$defs": {
      "attachmentSource": {
        "oneOf": [
          {
            "$ref": "#/$defs/bridgeUploadSource"
          },
          {
            "additionalProperties": false,
            "properties": {
              "kind": {
                "const": "linked_url"
              },
              "url": {
                "minLength": 1,
                "type": "string"
              }
            },
            "required": [
              "kind",
              "url"
            ],
            "type": "object"
          },
          {
            "additionalProperties": false,
            "properties": {
              "kind": {
                "const": "stored_url"
              },
              "url": {
                "minLength": 1,
                "type": "string"
              }
            },
            "required": [
              "kind",
              "url"
            ],
            "type": "object"
          }
        ]
      },
      "bridgeUploadSource": {
        "additionalProperties": false,
        "properties": {
          "companions": {
            "items": {
              "additionalProperties": false,
              "properties": {
                "targetRelativePath": {
                  "minLength": 1,
                  "type": "string"
                }
              },
              "required": [
                "targetRelativePath"
              ],
              "type": "object"
            },
            "type": "array"
          },
          "fileId": {
            "minLength": 1,
            "type": "string"
          },
          "kind": {
            "const": "stored_file"
          },
          "targetFilename": {
            "minLength": 1,
            "type": "string"
          }
        },
        "required": [
          "kind",
          "fileId"
        ],
        "type": "object"
      },
      "collectionRef": {
        "additionalProperties": false,
        "properties": {
          "key": {
            "minLength": 1,
            "type": "string"
          },
          "libraryId": {
            "minimum": 1,
            "type": "integer"
          }
        },
        "required": [
          "libraryId",
          "key"
        ],
        "type": "object"
      },
      "collectionRefArray": {
        "items": {
          "$ref": "#/$defs/collectionRef"
        },
        "type": "array"
      },
      "creator": {
        "additionalProperties": false,
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
      "itemRef": {
        "additionalProperties": false,
        "properties": {
          "key": {
            "minLength": 1,
            "type": "string"
          },
          "libraryId": {
            "minimum": 1,
            "type": "integer"
          }
        },
        "required": [
          "libraryId",
          "key"
        ],
        "type": "object"
      },
      "itemRefArray": {
        "items": {
          "$ref": "#/$defs/itemRef"
        },
        "type": "array"
      },
      "jsonValue": {
        "anyOf": [
          {
            "type": "null"
          },
          {
            "type": "boolean"
          },
          {
            "type": "number"
          },
          {
            "type": "string"
          },
          {
            "items": {
              "$ref": "#/$defs/jsonValue"
            },
            "type": "array"
          },
          {
            "additionalProperties": {
              "$ref": "#/$defs/jsonValue"
            },
            "type": "object"
          }
        ]
      },
      "noteContent": {
        "additionalProperties": false,
        "properties": {
          "embeddedImages": {
            "items": {
              "additionalProperties": false,
              "properties": {
                "altText": {
                  "type": "string"
                },
                "preparedImage": {
                  "additionalProperties": false,
                  "properties": {
                    "id": {
                      "minLength": 1,
                      "type": "string"
                    },
                    "kind": {
                      "const": "prepared_note_image"
                    }
                  },
                  "required": [
                    "kind",
                    "id"
                  ],
                  "type": "object"
                },
                "slot": {
                  "minLength": 1,
                  "type": "string"
                }
              },
              "required": [
                "slot",
                "preparedImage"
              ],
              "type": "object"
            },
            "type": "array"
          },
          "format": {
            "enum": [
              "html",
              "text"
            ]
          },
          "value": {
            "type": "string"
          }
        },
        "required": [
          "format",
          "value"
        ],
        "type": "object"
      },
      "stringArray": {
        "items": {
          "minLength": 1,
          "type": "string"
        },
        "type": "array"
      }
    },
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "oneOf": [
      {
        "properties": {
          "collectionRefs": {
            "$ref": "#/$defs/collectionRefArray"
          },
          "creators": {
            "items": {
              "$ref": "#/$defs/creator"
            },
            "type": "array"
          },
          "fields": {
            "additionalProperties": {
              "type": "string"
            },
            "type": "object"
          },
          "initialRelatedRefs": {
            "$ref": "#/$defs/itemRefArray"
          },
          "initialTags": {
            "$ref": "#/$defs/stringArray"
          },
          "itemType": {
            "minLength": 1,
            "type": "string"
          },
          "libraryId": {
            "minimum": 1,
            "type": "integer"
          },
          "operation": {
            "const": "item.create"
          }
        },
        "required": [
          "operation",
          "itemType",
          "fields"
        ],
        "type": "object"
      },
      {
        "properties": {
          "itemRef": {
            "$ref": "#/$defs/itemRef"
          },
          "operation": {
            "const": "item.updateMetadata"
          },
          "patch": {
            "additionalProperties": false,
            "properties": {
              "creators": {
                "items": {
                  "$ref": "#/$defs/creator"
                },
                "type": "array"
              },
              "fields": {
                "additionalProperties": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "type": "object"
              }
            },
            "type": "object"
          }
        },
        "required": [
          "operation",
          "itemRef",
          "patch"
        ],
        "type": "object"
      },
      {
        "properties": {
          "incompatibleData": {
            "enum": [
              "reject",
              "move_to_extra",
              "drop"
            ]
          },
          "itemRef": {
            "$ref": "#/$defs/itemRef"
          },
          "operation": {
            "const": "item.changeType"
          },
          "targetItemType": {
            "minLength": 1,
            "type": "string"
          }
        },
        "required": [
          "operation",
          "itemRef",
          "targetItemType",
          "incompatibleData"
        ],
        "type": "object"
      },
      {
        "properties": {
          "childPolicy": {
            "enum": [
              "reject_if_present",
              "cascade"
            ]
          },
          "disposition": {
            "const": "permanent"
          },
          "itemRef": {
            "$ref": "#/$defs/itemRef"
          },
          "operation": {
            "const": "item.remove"
          }
        },
        "required": [
          "operation",
          "itemRef",
          "disposition",
          "childPolicy"
        ],
        "type": "object"
      },
      {
        "properties": {
          "add": {
            "$ref": "#/$defs/stringArray"
          },
          "itemRef": {
            "$ref": "#/$defs/itemRef"
          },
          "operation": {
            "const": "item.updateTags"
          },
          "remove": {
            "$ref": "#/$defs/stringArray"
          }
        },
        "required": [
          "operation",
          "itemRef",
          "add",
          "remove"
        ],
        "type": "object"
      },
      {
        "properties": {
          "operation": {
            "const": "item.addRelated"
          },
          "relatedRefs": {
            "$ref": "#/$defs/itemRefArray"
          },
          "sourceRef": {
            "$ref": "#/$defs/itemRef"
          }
        },
        "required": [
          "operation",
          "sourceRef",
          "relatedRefs"
        ],
        "type": "object"
      },
      {
        "properties": {
          "operation": {
            "const": "item.removeRelated"
          },
          "relatedRefs": {
            "$ref": "#/$defs/itemRefArray"
          },
          "sourceRef": {
            "$ref": "#/$defs/itemRef"
          }
        },
        "required": [
          "operation",
          "sourceRef",
          "relatedRefs"
        ],
        "type": "object"
      },
      {
        "properties": {
          "initialMemberRefs": {
            "$ref": "#/$defs/itemRefArray"
          },
          "name": {
            "minLength": 1,
            "type": "string"
          },
          "operation": {
            "const": "collection.create"
          },
          "placement": {
            "oneOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "kind": {
                    "const": "root"
                  },
                  "libraryId": {
                    "minimum": 1,
                    "type": "integer"
                  }
                },
                "required": [
                  "kind"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "kind": {
                    "const": "child"
                  },
                  "parentRef": {
                    "$ref": "#/$defs/collectionRef"
                  }
                },
                "required": [
                  "kind",
                  "parentRef"
                ],
                "type": "object"
              }
            ]
          }
        },
        "required": [
          "operation",
          "name",
          "placement"
        ],
        "type": "object"
      },
      {
        "properties": {
          "collectionRef": {
            "$ref": "#/$defs/collectionRef"
          },
          "operation": {
            "const": "collection.update"
          },
          "patch": {
            "additionalProperties": false,
            "properties": {
              "name": {
                "minLength": 1,
                "type": "string"
              },
              "parentRef": {
                "anyOf": [
                  {
                    "$ref": "#/$defs/collectionRef"
                  },
                  {
                    "type": "null"
                  }
                ]
              }
            },
            "type": "object"
          }
        },
        "required": [
          "operation",
          "collectionRef",
          "patch"
        ],
        "type": "object"
      },
      {
        "properties": {
          "add": {
            "$ref": "#/$defs/itemRefArray"
          },
          "collectionRef": {
            "$ref": "#/$defs/collectionRef"
          },
          "operation": {
            "const": "collection.updateMembership"
          },
          "remove": {
            "$ref": "#/$defs/itemRefArray"
          }
        },
        "required": [
          "operation",
          "collectionRef",
          "add",
          "remove"
        ],
        "type": "object"
      },
      {
        "properties": {
          "childPolicy": {
            "enum": [
              "reject_if_present",
              "cascade"
            ]
          },
          "collectionRef": {
            "$ref": "#/$defs/collectionRef"
          },
          "operation": {
            "const": "collection.remove"
          }
        },
        "required": [
          "operation",
          "collectionRef",
          "childPolicy"
        ],
        "type": "object"
      },
      {
        "properties": {
          "content": {
            "$ref": "#/$defs/noteContent"
          },
          "initialTags": {
            "$ref": "#/$defs/stringArray"
          },
          "operation": {
            "const": "notes.create"
          },
          "placement": {
            "oneOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "collectionRefs": {
                    "$ref": "#/$defs/collectionRefArray"
                  },
                  "kind": {
                    "const": "top_level"
                  },
                  "libraryId": {
                    "minimum": 1,
                    "type": "integer"
                  }
                },
                "required": [
                  "kind"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "kind": {
                    "const": "child"
                  },
                  "parentRef": {
                    "$ref": "#/$defs/itemRef"
                  }
                },
                "required": [
                  "kind",
                  "parentRef"
                ],
                "type": "object"
              }
            ]
          }
        },
        "required": [
          "operation",
          "placement",
          "content"
        ],
        "type": "object"
      },
      {
        "properties": {
          "content": {
            "$ref": "#/$defs/noteContent"
          },
          "noteRef": {
            "$ref": "#/$defs/itemRef"
          },
          "operation": {
            "const": "notes.updateContent"
          }
        },
        "required": [
          "operation",
          "noteRef",
          "content"
        ],
        "type": "object"
      },
      {
        "properties": {
          "disposition": {
            "const": "permanent"
          },
          "noteRef": {
            "$ref": "#/$defs/itemRef"
          },
          "operation": {
            "const": "notes.remove"
          }
        },
        "required": [
          "operation",
          "noteRef",
          "disposition"
        ],
        "type": "object"
      },
      {
        "properties": {
          "noteRef": {
            "$ref": "#/$defs/itemRef"
          },
          "operation": {
            "const": "notes.upsertPayload"
          },
          "payload": {
            "additionalProperties": false,
            "properties": {
              "format": {
                "enum": [
                  "json",
                  "markdown",
                  "text"
                ]
              },
              "noteKind": {
                "minLength": 1,
                "type": "string"
              },
              "payloadType": {
                "minLength": 1,
                "type": "string"
              },
              "schemaVersion": {
                "minLength": 1,
                "type": "string"
              },
              "value": {
                "$ref": "#/$defs/jsonValue"
              }
            },
            "required": [
              "payloadType",
              "noteKind",
              "schemaVersion",
              "format",
              "value"
            ],
            "type": "object"
          }
        },
        "required": [
          "operation",
          "noteRef",
          "payload"
        ],
        "type": "object"
      },
      {
        "properties": {
          "metadata": {
            "additionalProperties": false,
            "properties": {
              "charset": {
                "type": "string"
              },
              "contentType": {
                "type": "string"
              },
              "originalUrl": {
                "type": "string"
              },
              "title": {
                "type": "string"
              }
            },
            "type": "object"
          },
          "operation": {
            "const": "attachments.create"
          },
          "placement": {
            "oneOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "collectionRefs": {
                    "$ref": "#/$defs/collectionRefArray"
                  },
                  "kind": {
                    "const": "top_level"
                  },
                  "libraryId": {
                    "minimum": 1,
                    "type": "integer"
                  }
                },
                "required": [
                  "kind"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "kind": {
                    "const": "child"
                  },
                  "parentRef": {
                    "$ref": "#/$defs/itemRef"
                  }
                },
                "required": [
                  "kind",
                  "parentRef"
                ],
                "type": "object"
              }
            ]
          },
          "source": {
            "$ref": "#/$defs/attachmentSource"
          }
        },
        "required": [
          "operation",
          "placement",
          "source"
        ],
        "type": "object"
      },
      {
        "properties": {
          "attachmentRef": {
            "$ref": "#/$defs/itemRef"
          },
          "operation": {
            "const": "attachments.updateMetadata"
          },
          "patch": {
            "additionalProperties": false,
            "properties": {
              "charset": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "contentType": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "title": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "url": {
                "type": [
                  "string",
                  "null"
                ]
              }
            },
            "type": "object"
          }
        },
        "required": [
          "operation",
          "attachmentRef",
          "patch"
        ],
        "type": "object"
      },
      {
        "properties": {
          "attachmentRef": {
            "$ref": "#/$defs/itemRef"
          },
          "operation": {
            "const": "attachments.replaceFile"
          },
          "source": {
            "$ref": "#/$defs/bridgeUploadSource"
          }
        },
        "required": [
          "operation",
          "attachmentRef",
          "source"
        ],
        "type": "object"
      },
      {
        "properties": {
          "attachmentRef": {
            "$ref": "#/$defs/itemRef"
          },
          "operation": {
            "const": "attachments.move"
          },
          "placement": {
            "oneOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "collectionRefs": {
                    "$ref": "#/$defs/collectionRefArray"
                  },
                  "kind": {
                    "const": "top_level"
                  },
                  "libraryId": {
                    "minimum": 1,
                    "type": "integer"
                  }
                },
                "required": [
                  "kind"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "kind": {
                    "const": "child"
                  },
                  "parentRef": {
                    "$ref": "#/$defs/itemRef"
                  }
                },
                "required": [
                  "kind",
                  "parentRef"
                ],
                "type": "object"
              }
            ]
          }
        },
        "required": [
          "operation",
          "attachmentRef",
          "placement"
        ],
        "type": "object"
      },
      {
        "properties": {
          "attachmentRef": {
            "$ref": "#/$defs/itemRef"
          },
          "disposition": {
            "const": "permanent"
          },
          "operation": {
            "const": "attachments.remove"
          }
        },
        "required": [
          "operation",
          "attachmentRef",
          "disposition"
        ],
        "type": "object"
      },
      {
        "properties": {
          "add": {
            "items": {
              "enum": [
                "need-metadata-curation",
                "need-fulltext",
                "need-markdown",
                "need-analysis",
                "need-deep-reading"
              ]
            },
            "type": "array"
          },
          "itemRef": {
            "$ref": "#/$defs/itemRef"
          },
          "operation": {
            "const": "statusTags.transition"
          },
          "remove": {
            "items": {
              "enum": [
                "need-metadata-curation",
                "need-fulltext",
                "need-markdown",
                "need-analysis",
                "need-deep-reading"
              ]
            },
            "type": "array"
          }
        },
        "required": [
          "operation",
          "itemRef"
        ],
        "type": "object"
      },
      {
        "properties": {
          "itemRefs": {
            "$ref": "#/$defs/itemRefArray"
          },
          "operation": {
            "const": "trash.setItemsState"
          },
          "state": {
            "enum": [
              "trashed",
              "active"
            ]
          }
        },
        "required": [
          "operation",
          "itemRefs",
          "state"
        ],
        "type": "object"
      },
      {
        "properties": {
          "collectionRef": {
            "$ref": "#/$defs/collectionRef"
          },
          "operation": {
            "const": "literature.ingest"
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
          }
        },
        "required": [
          "operation",
          "collectionRef",
          "paper"
        ],
        "type": "object"
      }
    ],
    "type": "object",
    "unevaluatedProperties": false
  },
  "recovery": [
    {
      "action": "Inspect the error and retry only when retryable is true.",
      "nextCommand": "surface describe",
      "requiresHandles": [],
      "stateCheck": "none",
      "when": "The read fails or returns incomplete evidence."
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
        "const": "mutation.preview"
      },
      "data": {
        "additionalProperties": false,
        "properties": {
          "domainPlanDigest": {
            "minLength": 1,
            "type": "string"
          },
          "observedAt": {
            "minLength": 1,
            "type": "string"
          },
          "operation": {
            "enum": [
              "item.create",
              "item.updateMetadata",
              "item.changeType",
              "item.remove",
              "item.updateTags",
              "item.addRelated",
              "item.removeRelated",
              "collection.create",
              "collection.update",
              "collection.updateMembership",
              "collection.remove",
              "notes.create",
              "notes.updateContent",
              "notes.remove",
              "notes.upsertPayload",
              "attachments.create",
              "attachments.updateMetadata",
              "attachments.replaceFile",
              "attachments.move",
              "attachments.remove",
              "statusTags.transition",
              "trash.setItemsState",
              "literature.ingest"
            ]
          },
          "outcome": {
            "enum": [
              "would_change",
              "unchanged"
            ]
          },
          "plan": {
            "additionalProperties": true,
            "type": "object"
          },
          "schema": {
            "const": "zotero-agents.mutation-preview.v1"
          }
        },
        "required": [
          "schema",
          "operation",
          "outcome",
          "observedAt",
          "domainPlanDigest",
          "plan"
        ],
        "type": "object"
      }
    },
    "required": [
      "capability",
      "approval",
      "data"
    ],
    "type": "object"
  },
  "summary": "Preview a Zotero mutation",
  "targets": [
    {
      "kind": "capability",
      "target": "mutation.preview"
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

- Canonical argv path: `mutation` `preview`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Structured binding mode: `passthrough`.
- Intent visibility: `visible`.
- Operational aliases: `mutation preview`, `mutation`, `preview`, `input`, `JSON_OR_FILE`.

### Effects

```json
[
  {
    "description": "Reads state without changing Zotero-managed data.",
    "kind": "none",
    "stateChanged": false
  }
]
```

### Approval

```json
{
  "kind": "none",
  "scope": "No Zotero UI approval; provider runtimes may still request their own permission.",
  "timing": "none"
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
    "action": "Inspect the error and retry only when retryable is true.",
    "nextCommand": "surface describe",
    "requiresHandles": [],
    "stateCheck": "none",
    "when": "The read fails or returns incomplete evidence."
  }
]
```

### Targets

```json
[
  {
    "kind": "capability",
    "target": "mutation.preview"
  }
]
```
