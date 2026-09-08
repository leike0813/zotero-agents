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
    }
  },
  "additionalProperties": false,
  "properties": {
    "dryRun": {
      "default": false,
      "type": "boolean"
    },
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
    "operationId": {
      "maxLength": 128,
      "minLength": 1,
      "type": "string"
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
      "$ref": "#/$defs/bridgeUploadSource"
    }
  },
  "required": [
    "placement",
    "source"
  ],
  "type": "object"
}
```

## Payload composition

The executable command contract owns the base source, fixed values, field mappings, and closed transforms shown below. Command handlers only provide values under the referenced Clap argument IDs.

```json
{
  "constants": {},
  "mappings": [
    {
      "argument": "item",
      "field": "placement",
      "required": true,
      "transform": "identity"
    },
    {
      "argument": "file_id",
      "field": "source",
      "required": true,
      "transform": "identity"
    },
    {
      "argument": "display_name",
      "field": "metadata",
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
      "const": "attachments.create"
    },
    "data": {
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
              "$ref": "#/$defs/storedAttachmentSource"
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
        "literatureScoreArtifact": {
          "additionalProperties": false,
          "properties": {
            "confidence": {
              "maximum": 1,
              "minimum": 0,
              "type": "number"
            },
            "confidence_adjusted_score": {
              "maximum": 100,
              "minimum": 0,
              "type": "number"
            },
            "dimensions": {
              "items": {
                "additionalProperties": false,
                "properties": {
                  "applicable_max_score": {
                    "minimum": 0,
                    "type": "integer"
                  },
                  "confidence": {
                    "maximum": 1,
                    "minimum": 0,
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "configured_weight": {
                    "maximum": 1,
                    "minimum": 0,
                    "type": "number"
                  },
                  "criteria": {
                    "items": {
                      "additionalProperties": false,
                      "properties": {
                        "criterion_key": {
                          "minLength": 1,
                          "type": "string"
                        },
                        "evidence": {
                          "items": {
                            "additionalProperties": false,
                            "properties": {
                              "line_end": {
                                "minimum": 1,
                                "type": "integer"
                              },
                              "line_start": {
                                "minimum": 1,
                                "type": "integer"
                              },
                              "quote": {
                                "maxLength": 500,
                                "minLength": 1,
                                "type": "string"
                              }
                            },
                            "required": [
                              "line_start",
                              "line_end",
                              "quote"
                            ],
                            "type": "object"
                          },
                          "type": "array"
                        },
                        "max_score": {
                          "minimum": 1,
                          "type": "integer"
                        },
                        "name": {
                          "minLength": 1,
                          "type": "string"
                        },
                        "reason": {
                          "minLength": 1,
                          "type": "string"
                        },
                        "score": {
                          "minimum": 0,
                          "type": [
                            "integer",
                            "null"
                          ]
                        },
                        "status": {
                          "enum": [
                            "scored",
                            "not_applicable"
                          ]
                        }
                      },
                      "required": [
                        "criterion_key",
                        "name",
                        "status",
                        "score",
                        "max_score",
                        "reason",
                        "evidence"
                      ],
                      "type": "object"
                    },
                    "minItems": 1,
                    "type": "array"
                  },
                  "dimension_key": {
                    "minLength": 1,
                    "type": "string"
                  },
                  "effective_weight": {
                    "maximum": 1,
                    "minimum": 0,
                    "type": "number"
                  },
                  "name": {
                    "minLength": 1,
                    "type": "string"
                  },
                  "raw_score": {
                    "minimum": 0,
                    "type": "integer"
                  },
                  "score": {
                    "maximum": 100,
                    "minimum": 0,
                    "type": [
                      "number",
                      "null"
                    ]
                  },
                  "summary": {
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "dimension_key",
                  "name",
                  "configured_weight",
                  "effective_weight",
                  "raw_score",
                  "applicable_max_score",
                  "score",
                  "confidence",
                  "summary",
                  "criteria"
                ],
                "type": "object"
              },
              "maxItems": 6,
              "minItems": 6,
              "type": "array"
            },
            "overall_score": {
              "maximum": 100,
              "minimum": 0,
              "type": "number"
            },
            "paper_type": {
              "enum": [
                "empirical",
                "review",
                "theoretical",
                "qualitative",
                "mixed_methods",
                "other"
              ]
            },
            "paper_type_reason": {
              "minLength": 1,
              "type": "string"
            },
            "rubric_id": {
              "minLength": 1,
              "type": "string"
            },
            "schema": {
              "const": "literature_score.v1"
            }
          },
          "required": [
            "schema",
            "rubric_id",
            "paper_type",
            "paper_type_reason",
            "overall_score",
            "confidence",
            "confidence_adjusted_score",
            "dimensions"
          ],
          "type": "object"
        },
        "managedNoteDetail": {
          "oneOf": [
            {
              "additionalProperties": false,
              "properties": {
                "content": {
                  "type": "string"
                },
                "format": {
                  "enum": [
                    "html",
                    "text"
                  ]
                },
                "kind": {
                  "const": "ordinary"
                },
                "parentRef": {
                  "anyOf": [
                    {
                      "$ref": "#/$defs/itemRef"
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "ref": {
                  "$ref": "#/$defs/itemRef"
                },
                "revision": {
                  "minLength": 1,
                  "type": "string"
                },
                "title": {
                  "type": "string"
                }
              },
              "required": [
                "kind",
                "ref",
                "parentRef",
                "title",
                "format",
                "content",
                "revision"
              ],
              "type": "object"
            },
            {
              "additionalProperties": false,
              "properties": {
                "derived": {
                  "additionalProperties": false,
                  "properties": {
                    "markdown": {
                      "type": "string"
                    },
                    "representativeImage": {
                      "additionalProperties": false,
                      "properties": {
                        "alt": {
                          "type": "string"
                        },
                        "attachmentRef": {
                          "$ref": "#/$defs/itemRef"
                        }
                      },
                      "required": [
                        "attachmentRef",
                        "alt"
                      ],
                      "type": "object"
                    }
                  },
                  "type": "object"
                },
                "detailBytes": {
                  "minimum": 0,
                  "type": "integer"
                },
                "health": {
                  "additionalProperties": false,
                  "properties": {
                    "currentReferencesBasis": {
                      "minLength": 1,
                      "type": "string"
                    },
                    "state": {
                      "enum": [
                        "current",
                        "stale"
                      ]
                    }
                  },
                  "required": [
                    "state"
                  ],
                  "type": "object"
                },
                "kind": {
                  "const": "managed"
                },
                "noteKind": {
                  "enum": [
                    "custom",
                    "conversation-note",
                    "digest",
                    "references",
                    "citation-analysis",
                    "literature-score"
                  ]
                },
                "parentRef": {
                  "anyOf": [
                    {
                      "$ref": "#/$defs/itemRef"
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "payload": {
                  "$ref": "#/$defs/jsonValue"
                },
                "payloadBytes": {
                  "minimum": 0,
                  "type": "integer"
                },
                "provenance": {
                  "additionalProperties": false,
                  "properties": {
                    "referencesBasis": {
                      "minLength": 1,
                      "type": "string"
                    },
                    "sourceRef": {
                      "$ref": "#/$defs/itemRef"
                    }
                  },
                  "type": "object"
                },
                "ref": {
                  "$ref": "#/$defs/itemRef"
                },
                "revision": {
                  "minLength": 1,
                  "type": "string"
                },
                "title": {
                  "type": "string"
                }
              },
              "required": [
                "kind",
                "noteKind",
                "ref",
                "parentRef",
                "title",
                "payload",
                "payloadBytes",
                "detailBytes",
                "revision"
              ],
              "type": "object"
            }
          ]
        },
        "mutationAttempt": {
          "additionalProperties": false,
          "properties": {
            "affectedRefs": {
              "items": {
                "additionalProperties": false,
                "type": "object"
              },
              "type": "array"
            },
            "attemptId": {
              "minLength": 1,
              "type": "string"
            },
            "error": {
              "additionalProperties": false,
              "properties": {
                "code": {
                  "minLength": 1,
                  "type": "string"
                },
                "details": {
                  "$ref": "#/$defs/jsonValue"
                },
                "message": {
                  "type": "string"
                },
                "phase": {
                  "enum": [
                    "validation",
                    "reservation",
                    "read",
                    "staging",
                    "commit",
                    "verification",
                    "compensation",
                    "cleanup"
                  ]
                },
                "recovery": {
                  "enum": [
                    "none",
                    "retry_same_operation",
                    "refresh_and_retry_new_operation",
                    "reconcile",
                    "manual_repair"
                  ]
                }
              },
              "required": [
                "code",
                "phase",
                "recovery",
                "details"
              ],
              "type": "object"
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
                "literature.ingest",
                "managed_note.write_custom",
                "managed_note.write_conversation",
                "literature_artifact.upsert_digest",
                "literature_artifact.upsert_references",
                "literature_artifact.upsert_citation_analysis",
                "literature_artifact.upsert_score"
              ]
            },
            "operationId": {
              "maxLength": 128,
              "minLength": 1,
              "type": "string"
            },
            "residualRefs": {
              "items": {
                "additionalProperties": false,
                "type": "object"
              },
              "type": "array"
            },
            "schema": {
              "const": "zotero-agents.mutation-attempt.v1"
            },
            "status": {
              "enum": [
                "failed",
                "canceled",
                "unknown",
                "repair_required"
              ]
            }
          },
          "required": [
            "schema",
            "attemptId",
            "operationId",
            "operation",
            "status",
            "error",
            "affectedRefs",
            "residualRefs"
          ],
          "type": "object"
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
        "receipt": {
          "additionalProperties": false,
          "properties": {
            "changes": {
              "items": {
                "additionalProperties": true,
                "type": "object"
              },
              "type": "array"
            },
            "committedAt": {
              "minLength": 1,
              "type": "string"
            },
            "effectDigest": {
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
                "literature.ingest",
                "managed_note.write_custom",
                "managed_note.write_conversation",
                "literature_artifact.upsert_digest",
                "literature_artifact.upsert_references",
                "literature_artifact.upsert_citation_analysis",
                "literature_artifact.upsert_score"
              ]
            },
            "operationId": {
              "maxLength": 128,
              "minLength": 1,
              "type": "string"
            },
            "outcome": {
              "enum": [
                "committed",
                "unchanged"
              ]
            },
            "receiptId": {
              "minLength": 1,
              "type": "string"
            },
            "schema": {
              "const": "zotero-agents.mutation-receipt.v1"
            }
          },
          "required": [
            "schema",
            "receiptId",
            "operationId",
            "operation",
            "outcome",
            "committedAt",
            "effectDigest",
            "changes"
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
              "const": "attachments.create"
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
        },
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
                  "$ref": "#/$defs/storedAttachmentSource"
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
            "literatureScoreArtifact": {
              "additionalProperties": false,
              "properties": {
                "confidence": {
                  "maximum": 1,
                  "minimum": 0,
                  "type": "number"
                },
                "confidence_adjusted_score": {
                  "maximum": 100,
                  "minimum": 0,
                  "type": "number"
                },
                "dimensions": {
                  "items": {
                    "additionalProperties": false,
                    "properties": {
                      "applicable_max_score": {
                        "minimum": 0,
                        "type": "integer"
                      },
                      "confidence": {
                        "maximum": 1,
                        "minimum": 0,
                        "type": [
                          "number",
                          "null"
                        ]
                      },
                      "configured_weight": {
                        "maximum": 1,
                        "minimum": 0,
                        "type": "number"
                      },
                      "criteria": {
                        "items": {
                          "additionalProperties": false,
                          "properties": {
                            "criterion_key": {
                              "minLength": 1,
                              "type": "string"
                            },
                            "evidence": {
                              "items": {
                                "additionalProperties": false,
                                "properties": {
                                  "line_end": {
                                    "minimum": 1,
                                    "type": "integer"
                                  },
                                  "line_start": {
                                    "minimum": 1,
                                    "type": "integer"
                                  },
                                  "quote": {
                                    "maxLength": 500,
                                    "minLength": 1,
                                    "type": "string"
                                  }
                                },
                                "required": [
                                  "line_start",
                                  "line_end",
                                  "quote"
                                ],
                                "type": "object"
                              },
                              "type": "array"
                            },
                            "max_score": {
                              "minimum": 1,
                              "type": "integer"
                            },
                            "name": {
                              "minLength": 1,
                              "type": "string"
                            },
                            "reason": {
                              "minLength": 1,
                              "type": "string"
                            },
                            "score": {
                              "minimum": 0,
                              "type": [
                                "integer",
                                "null"
                              ]
                            },
                            "status": {
                              "enum": [
                                "scored",
                                "not_applicable"
                              ]
                            }
                          },
                          "required": [
                            "criterion_key",
                            "name",
                            "status",
                            "score",
                            "max_score",
                            "reason",
                            "evidence"
                          ],
                          "type": "object"
                        },
                        "minItems": 1,
                        "type": "array"
                      },
                      "dimension_key": {
                        "minLength": 1,
                        "type": "string"
                      },
                      "effective_weight": {
                        "maximum": 1,
                        "minimum": 0,
                        "type": "number"
                      },
                      "name": {
                        "minLength": 1,
                        "type": "string"
                      },
                      "raw_score": {
                        "minimum": 0,
                        "type": "integer"
                      },
                      "score": {
                        "maximum": 100,
                        "minimum": 0,
                        "type": [
                          "number",
                          "null"
                        ]
                      },
                      "summary": {
                        "minLength": 1,
                        "type": "string"
                      }
                    },
                    "required": [
                      "dimension_key",
                      "name",
                      "configured_weight",
                      "effective_weight",
                      "raw_score",
                      "applicable_max_score",
                      "score",
                      "confidence",
                      "summary",
                      "criteria"
                    ],
                    "type": "object"
                  },
                  "maxItems": 6,
                  "minItems": 6,
                  "type": "array"
                },
                "overall_score": {
                  "maximum": 100,
                  "minimum": 0,
                  "type": "number"
                },
                "paper_type": {
                  "enum": [
                    "empirical",
                    "review",
                    "theoretical",
                    "qualitative",
                    "mixed_methods",
                    "other"
                  ]
                },
                "paper_type_reason": {
                  "minLength": 1,
                  "type": "string"
                },
                "rubric_id": {
                  "minLength": 1,
                  "type": "string"
                },
                "schema": {
                  "const": "literature_score.v1"
                }
              },
              "required": [
                "schema",
                "rubric_id",
                "paper_type",
                "paper_type_reason",
                "overall_score",
                "confidence",
                "confidence_adjusted_score",
                "dimensions"
              ],
              "type": "object"
            },
            "managedNoteDetail": {
              "oneOf": [
                {
                  "additionalProperties": false,
                  "properties": {
                    "content": {
                      "type": "string"
                    },
                    "format": {
                      "enum": [
                        "html",
                        "text"
                      ]
                    },
                    "kind": {
                      "const": "ordinary"
                    },
                    "parentRef": {
                      "anyOf": [
                        {
                          "$ref": "#/$defs/itemRef"
                        },
                        {
                          "type": "null"
                        }
                      ]
                    },
                    "ref": {
                      "$ref": "#/$defs/itemRef"
                    },
                    "revision": {
                      "minLength": 1,
                      "type": "string"
                    },
                    "title": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "kind",
                    "ref",
                    "parentRef",
                    "title",
                    "format",
                    "content",
                    "revision"
                  ],
                  "type": "object"
                },
                {
                  "additionalProperties": false,
                  "properties": {
                    "derived": {
                      "additionalProperties": false,
                      "properties": {
                        "markdown": {
                          "type": "string"
                        },
                        "representativeImage": {
                          "additionalProperties": false,
                          "properties": {
                            "alt": {
                              "type": "string"
                            },
                            "attachmentRef": {
                              "$ref": "#/$defs/itemRef"
                            }
                          },
                          "required": [
                            "attachmentRef",
                            "alt"
                          ],
                          "type": "object"
                        }
                      },
                      "type": "object"
                    },
                    "detailBytes": {
                      "minimum": 0,
                      "type": "integer"
                    },
                    "health": {
                      "additionalProperties": false,
                      "properties": {
                        "currentReferencesBasis": {
                          "minLength": 1,
                          "type": "string"
                        },
                        "state": {
                          "enum": [
                            "current",
                            "stale"
                          ]
                        }
                      },
                      "required": [
                        "state"
                      ],
                      "type": "object"
                    },
                    "kind": {
                      "const": "managed"
                    },
                    "noteKind": {
                      "enum": [
                        "custom",
                        "conversation-note",
                        "digest",
                        "references",
                        "citation-analysis",
                        "literature-score"
                      ]
                    },
                    "parentRef": {
                      "anyOf": [
                        {
                          "$ref": "#/$defs/itemRef"
                        },
                        {
                          "type": "null"
                        }
                      ]
                    },
                    "payload": {
                      "$ref": "#/$defs/jsonValue"
                    },
                    "payloadBytes": {
                      "minimum": 0,
                      "type": "integer"
                    },
                    "provenance": {
                      "additionalProperties": false,
                      "properties": {
                        "referencesBasis": {
                          "minLength": 1,
                          "type": "string"
                        },
                        "sourceRef": {
                          "$ref": "#/$defs/itemRef"
                        }
                      },
                      "type": "object"
                    },
                    "ref": {
                      "$ref": "#/$defs/itemRef"
                    },
                    "revision": {
                      "minLength": 1,
                      "type": "string"
                    },
                    "title": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "kind",
                    "noteKind",
                    "ref",
                    "parentRef",
                    "title",
                    "payload",
                    "payloadBytes",
                    "detailBytes",
                    "revision"
                  ],
                  "type": "object"
                }
              ]
            },
            "mutationAttempt": {
              "additionalProperties": false,
              "properties": {
                "affectedRefs": {
                  "items": {
                    "additionalProperties": false,
                    "type": "object"
                  },
                  "type": "array"
                },
                "attemptId": {
                  "minLength": 1,
                  "type": "string"
                },
                "error": {
                  "additionalProperties": false,
                  "properties": {
                    "code": {
                      "minLength": 1,
                      "type": "string"
                    },
                    "details": {
                      "$ref": "#/$defs/jsonValue"
                    },
                    "message": {
                      "type": "string"
                    },
                    "phase": {
                      "enum": [
                        "validation",
                        "reservation",
                        "read",
                        "staging",
                        "commit",
                        "verification",
                        "compensation",
                        "cleanup"
                      ]
                    },
                    "recovery": {
                      "enum": [
                        "none",
                        "retry_same_operation",
                        "refresh_and_retry_new_operation",
                        "reconcile",
                        "manual_repair"
                      ]
                    }
                  },
                  "required": [
                    "code",
                    "phase",
                    "recovery",
                    "details"
                  ],
                  "type": "object"
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
                    "literature.ingest",
                    "managed_note.write_custom",
                    "managed_note.write_conversation",
                    "literature_artifact.upsert_digest",
                    "literature_artifact.upsert_references",
                    "literature_artifact.upsert_citation_analysis",
                    "literature_artifact.upsert_score"
                  ]
                },
                "operationId": {
                  "maxLength": 128,
                  "minLength": 1,
                  "type": "string"
                },
                "residualRefs": {
                  "items": {
                    "additionalProperties": false,
                    "type": "object"
                  },
                  "type": "array"
                },
                "schema": {
                  "const": "zotero-agents.mutation-attempt.v1"
                },
                "status": {
                  "enum": [
                    "failed",
                    "canceled",
                    "unknown",
                    "repair_required"
                  ]
                }
              },
              "required": [
                "schema",
                "attemptId",
                "operationId",
                "operation",
                "status",
                "error",
                "affectedRefs",
                "residualRefs"
              ],
              "type": "object"
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
            "receipt": {
              "additionalProperties": false,
              "properties": {
                "changes": {
                  "items": {
                    "additionalProperties": true,
                    "type": "object"
                  },
                  "type": "array"
                },
                "committedAt": {
                  "minLength": 1,
                  "type": "string"
                },
                "effectDigest": {
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
                    "literature.ingest",
                    "managed_note.write_custom",
                    "managed_note.write_conversation",
                    "literature_artifact.upsert_digest",
                    "literature_artifact.upsert_references",
                    "literature_artifact.upsert_citation_analysis",
                    "literature_artifact.upsert_score"
                  ]
                },
                "operationId": {
                  "maxLength": 128,
                  "minLength": 1,
                  "type": "string"
                },
                "outcome": {
                  "enum": [
                    "committed",
                    "unchanged"
                  ]
                },
                "receiptId": {
                  "minLength": 1,
                  "type": "string"
                },
                "schema": {
                  "const": "zotero-agents.mutation-receipt.v1"
                }
              },
              "required": [
                "schema",
                "receiptId",
                "operationId",
                "operation",
                "outcome",
                "committedAt",
                "effectDigest",
                "changes"
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
              "additionalProperties": false,
              "properties": {
                "outcome": {
                  "enum": [
                    "committed",
                    "unchanged"
                  ]
                },
                "receipt": {
                  "allOf": [
                    {
                      "$ref": "#/$defs/receipt"
                    },
                    {
                      "properties": {
                        "operation": {
                          "const": "attachments.create"
                        }
                      },
                      "required": [
                        "operation"
                      ],
                      "type": "object"
                    }
                  ]
                },
                "result": {
                  "additionalProperties": false,
                  "properties": {
                    "attachment": {
                      "additionalProperties": true,
                      "type": "object"
                    }
                  },
                  "required": [
                    "attachment"
                  ],
                  "type": "object"
                }
              },
              "required": [
                "outcome",
                "receipt",
                "result"
              ],
              "type": "object"
            },
            {
              "additionalProperties": false,
              "properties": {
                "attempt": {
                  "$ref": "#/$defs/mutationAttempt"
                },
                "outcome": {
                  "enum": [
                    "failed",
                    "canceled",
                    "unknown",
                    "repair_required"
                  ]
                }
              },
              "required": [
                "outcome",
                "attempt"
              ],
              "type": "object"
            }
          ]
        }
      ]
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
    "constants": {},
    "mappings": [
      {
        "argument": "item",
        "field": "placement",
        "required": true,
        "transform": "identity"
      },
      {
        "argument": "file_id",
        "field": "source",
        "required": true,
        "transform": "identity"
      },
      {
        "argument": "display_name",
        "field": "metadata",
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
      }
    },
    "additionalProperties": false,
    "properties": {
      "dryRun": {
        "default": false,
        "type": "boolean"
      },
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
      "operationId": {
        "maxLength": 128,
        "minLength": 1,
        "type": "string"
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
        "$ref": "#/$defs/bridgeUploadSource"
      }
    },
    "required": [
      "placement",
      "source"
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
        "const": "attachments.create"
      },
      "data": {
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
                "$ref": "#/$defs/storedAttachmentSource"
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
          "literatureScoreArtifact": {
            "additionalProperties": false,
            "properties": {
              "confidence": {
                "maximum": 1,
                "minimum": 0,
                "type": "number"
              },
              "confidence_adjusted_score": {
                "maximum": 100,
                "minimum": 0,
                "type": "number"
              },
              "dimensions": {
                "items": {
                  "additionalProperties": false,
                  "properties": {
                    "applicable_max_score": {
                      "minimum": 0,
                      "type": "integer"
                    },
                    "confidence": {
                      "maximum": 1,
                      "minimum": 0,
                      "type": [
                        "number",
                        "null"
                      ]
                    },
                    "configured_weight": {
                      "maximum": 1,
                      "minimum": 0,
                      "type": "number"
                    },
                    "criteria": {
                      "items": {
                        "additionalProperties": false,
                        "properties": {
                          "criterion_key": {
                            "minLength": 1,
                            "type": "string"
                          },
                          "evidence": {
                            "items": {
                              "additionalProperties": false,
                              "properties": {
                                "line_end": {
                                  "minimum": 1,
                                  "type": "integer"
                                },
                                "line_start": {
                                  "minimum": 1,
                                  "type": "integer"
                                },
                                "quote": {
                                  "maxLength": 500,
                                  "minLength": 1,
                                  "type": "string"
                                }
                              },
                              "required": [
                                "line_start",
                                "line_end",
                                "quote"
                              ],
                              "type": "object"
                            },
                            "type": "array"
                          },
                          "max_score": {
                            "minimum": 1,
                            "type": "integer"
                          },
                          "name": {
                            "minLength": 1,
                            "type": "string"
                          },
                          "reason": {
                            "minLength": 1,
                            "type": "string"
                          },
                          "score": {
                            "minimum": 0,
                            "type": [
                              "integer",
                              "null"
                            ]
                          },
                          "status": {
                            "enum": [
                              "scored",
                              "not_applicable"
                            ]
                          }
                        },
                        "required": [
                          "criterion_key",
                          "name",
                          "status",
                          "score",
                          "max_score",
                          "reason",
                          "evidence"
                        ],
                        "type": "object"
                      },
                      "minItems": 1,
                      "type": "array"
                    },
                    "dimension_key": {
                      "minLength": 1,
                      "type": "string"
                    },
                    "effective_weight": {
                      "maximum": 1,
                      "minimum": 0,
                      "type": "number"
                    },
                    "name": {
                      "minLength": 1,
                      "type": "string"
                    },
                    "raw_score": {
                      "minimum": 0,
                      "type": "integer"
                    },
                    "score": {
                      "maximum": 100,
                      "minimum": 0,
                      "type": [
                        "number",
                        "null"
                      ]
                    },
                    "summary": {
                      "minLength": 1,
                      "type": "string"
                    }
                  },
                  "required": [
                    "dimension_key",
                    "name",
                    "configured_weight",
                    "effective_weight",
                    "raw_score",
                    "applicable_max_score",
                    "score",
                    "confidence",
                    "summary",
                    "criteria"
                  ],
                  "type": "object"
                },
                "maxItems": 6,
                "minItems": 6,
                "type": "array"
              },
              "overall_score": {
                "maximum": 100,
                "minimum": 0,
                "type": "number"
              },
              "paper_type": {
                "enum": [
                  "empirical",
                  "review",
                  "theoretical",
                  "qualitative",
                  "mixed_methods",
                  "other"
                ]
              },
              "paper_type_reason": {
                "minLength": 1,
                "type": "string"
              },
              "rubric_id": {
                "minLength": 1,
                "type": "string"
              },
              "schema": {
                "const": "literature_score.v1"
              }
            },
            "required": [
              "schema",
              "rubric_id",
              "paper_type",
              "paper_type_reason",
              "overall_score",
              "confidence",
              "confidence_adjusted_score",
              "dimensions"
            ],
            "type": "object"
          },
          "managedNoteDetail": {
            "oneOf": [
              {
                "additionalProperties": false,
                "properties": {
                  "content": {
                    "type": "string"
                  },
                  "format": {
                    "enum": [
                      "html",
                      "text"
                    ]
                  },
                  "kind": {
                    "const": "ordinary"
                  },
                  "parentRef": {
                    "anyOf": [
                      {
                        "$ref": "#/$defs/itemRef"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "ref": {
                    "$ref": "#/$defs/itemRef"
                  },
                  "revision": {
                    "minLength": 1,
                    "type": "string"
                  },
                  "title": {
                    "type": "string"
                  }
                },
                "required": [
                  "kind",
                  "ref",
                  "parentRef",
                  "title",
                  "format",
                  "content",
                  "revision"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "derived": {
                    "additionalProperties": false,
                    "properties": {
                      "markdown": {
                        "type": "string"
                      },
                      "representativeImage": {
                        "additionalProperties": false,
                        "properties": {
                          "alt": {
                            "type": "string"
                          },
                          "attachmentRef": {
                            "$ref": "#/$defs/itemRef"
                          }
                        },
                        "required": [
                          "attachmentRef",
                          "alt"
                        ],
                        "type": "object"
                      }
                    },
                    "type": "object"
                  },
                  "detailBytes": {
                    "minimum": 0,
                    "type": "integer"
                  },
                  "health": {
                    "additionalProperties": false,
                    "properties": {
                      "currentReferencesBasis": {
                        "minLength": 1,
                        "type": "string"
                      },
                      "state": {
                        "enum": [
                          "current",
                          "stale"
                        ]
                      }
                    },
                    "required": [
                      "state"
                    ],
                    "type": "object"
                  },
                  "kind": {
                    "const": "managed"
                  },
                  "noteKind": {
                    "enum": [
                      "custom",
                      "conversation-note",
                      "digest",
                      "references",
                      "citation-analysis",
                      "literature-score"
                    ]
                  },
                  "parentRef": {
                    "anyOf": [
                      {
                        "$ref": "#/$defs/itemRef"
                      },
                      {
                        "type": "null"
                      }
                    ]
                  },
                  "payload": {
                    "$ref": "#/$defs/jsonValue"
                  },
                  "payloadBytes": {
                    "minimum": 0,
                    "type": "integer"
                  },
                  "provenance": {
                    "additionalProperties": false,
                    "properties": {
                      "referencesBasis": {
                        "minLength": 1,
                        "type": "string"
                      },
                      "sourceRef": {
                        "$ref": "#/$defs/itemRef"
                      }
                    },
                    "type": "object"
                  },
                  "ref": {
                    "$ref": "#/$defs/itemRef"
                  },
                  "revision": {
                    "minLength": 1,
                    "type": "string"
                  },
                  "title": {
                    "type": "string"
                  }
                },
                "required": [
                  "kind",
                  "noteKind",
                  "ref",
                  "parentRef",
                  "title",
                  "payload",
                  "payloadBytes",
                  "detailBytes",
                  "revision"
                ],
                "type": "object"
              }
            ]
          },
          "mutationAttempt": {
            "additionalProperties": false,
            "properties": {
              "affectedRefs": {
                "items": {
                  "additionalProperties": false,
                  "type": "object"
                },
                "type": "array"
              },
              "attemptId": {
                "minLength": 1,
                "type": "string"
              },
              "error": {
                "additionalProperties": false,
                "properties": {
                  "code": {
                    "minLength": 1,
                    "type": "string"
                  },
                  "details": {
                    "$ref": "#/$defs/jsonValue"
                  },
                  "message": {
                    "type": "string"
                  },
                  "phase": {
                    "enum": [
                      "validation",
                      "reservation",
                      "read",
                      "staging",
                      "commit",
                      "verification",
                      "compensation",
                      "cleanup"
                    ]
                  },
                  "recovery": {
                    "enum": [
                      "none",
                      "retry_same_operation",
                      "refresh_and_retry_new_operation",
                      "reconcile",
                      "manual_repair"
                    ]
                  }
                },
                "required": [
                  "code",
                  "phase",
                  "recovery",
                  "details"
                ],
                "type": "object"
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
                  "literature.ingest",
                  "managed_note.write_custom",
                  "managed_note.write_conversation",
                  "literature_artifact.upsert_digest",
                  "literature_artifact.upsert_references",
                  "literature_artifact.upsert_citation_analysis",
                  "literature_artifact.upsert_score"
                ]
              },
              "operationId": {
                "maxLength": 128,
                "minLength": 1,
                "type": "string"
              },
              "residualRefs": {
                "items": {
                  "additionalProperties": false,
                  "type": "object"
                },
                "type": "array"
              },
              "schema": {
                "const": "zotero-agents.mutation-attempt.v1"
              },
              "status": {
                "enum": [
                  "failed",
                  "canceled",
                  "unknown",
                  "repair_required"
                ]
              }
            },
            "required": [
              "schema",
              "attemptId",
              "operationId",
              "operation",
              "status",
              "error",
              "affectedRefs",
              "residualRefs"
            ],
            "type": "object"
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
          "receipt": {
            "additionalProperties": false,
            "properties": {
              "changes": {
                "items": {
                  "additionalProperties": true,
                  "type": "object"
                },
                "type": "array"
              },
              "committedAt": {
                "minLength": 1,
                "type": "string"
              },
              "effectDigest": {
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
                  "literature.ingest",
                  "managed_note.write_custom",
                  "managed_note.write_conversation",
                  "literature_artifact.upsert_digest",
                  "literature_artifact.upsert_references",
                  "literature_artifact.upsert_citation_analysis",
                  "literature_artifact.upsert_score"
                ]
              },
              "operationId": {
                "maxLength": 128,
                "minLength": 1,
                "type": "string"
              },
              "outcome": {
                "enum": [
                  "committed",
                  "unchanged"
                ]
              },
              "receiptId": {
                "minLength": 1,
                "type": "string"
              },
              "schema": {
                "const": "zotero-agents.mutation-receipt.v1"
              }
            },
            "required": [
              "schema",
              "receiptId",
              "operationId",
              "operation",
              "outcome",
              "committedAt",
              "effectDigest",
              "changes"
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
                "const": "attachments.create"
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
          },
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
                    "$ref": "#/$defs/storedAttachmentSource"
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
              "literatureScoreArtifact": {
                "additionalProperties": false,
                "properties": {
                  "confidence": {
                    "maximum": 1,
                    "minimum": 0,
                    "type": "number"
                  },
                  "confidence_adjusted_score": {
                    "maximum": 100,
                    "minimum": 0,
                    "type": "number"
                  },
                  "dimensions": {
                    "items": {
                      "additionalProperties": false,
                      "properties": {
                        "applicable_max_score": {
                          "minimum": 0,
                          "type": "integer"
                        },
                        "confidence": {
                          "maximum": 1,
                          "minimum": 0,
                          "type": [
                            "number",
                            "null"
                          ]
                        },
                        "configured_weight": {
                          "maximum": 1,
                          "minimum": 0,
                          "type": "number"
                        },
                        "criteria": {
                          "items": {
                            "additionalProperties": false,
                            "properties": {
                              "criterion_key": {
                                "minLength": 1,
                                "type": "string"
                              },
                              "evidence": {
                                "items": {
                                  "additionalProperties": false,
                                  "properties": {
                                    "line_end": {
                                      "minimum": 1,
                                      "type": "integer"
                                    },
                                    "line_start": {
                                      "minimum": 1,
                                      "type": "integer"
                                    },
                                    "quote": {
                                      "maxLength": 500,
                                      "minLength": 1,
                                      "type": "string"
                                    }
                                  },
                                  "required": [
                                    "line_start",
                                    "line_end",
                                    "quote"
                                  ],
                                  "type": "object"
                                },
                                "type": "array"
                              },
                              "max_score": {
                                "minimum": 1,
                                "type": "integer"
                              },
                              "name": {
                                "minLength": 1,
                                "type": "string"
                              },
                              "reason": {
                                "minLength": 1,
                                "type": "string"
                              },
                              "score": {
                                "minimum": 0,
                                "type": [
                                  "integer",
                                  "null"
                                ]
                              },
                              "status": {
                                "enum": [
                                  "scored",
                                  "not_applicable"
                                ]
                              }
                            },
                            "required": [
                              "criterion_key",
                              "name",
                              "status",
                              "score",
                              "max_score",
                              "reason",
                              "evidence"
                            ],
                            "type": "object"
                          },
                          "minItems": 1,
                          "type": "array"
                        },
                        "dimension_key": {
                          "minLength": 1,
                          "type": "string"
                        },
                        "effective_weight": {
                          "maximum": 1,
                          "minimum": 0,
                          "type": "number"
                        },
                        "name": {
                          "minLength": 1,
                          "type": "string"
                        },
                        "raw_score": {
                          "minimum": 0,
                          "type": "integer"
                        },
                        "score": {
                          "maximum": 100,
                          "minimum": 0,
                          "type": [
                            "number",
                            "null"
                          ]
                        },
                        "summary": {
                          "minLength": 1,
                          "type": "string"
                        }
                      },
                      "required": [
                        "dimension_key",
                        "name",
                        "configured_weight",
                        "effective_weight",
                        "raw_score",
                        "applicable_max_score",
                        "score",
                        "confidence",
                        "summary",
                        "criteria"
                      ],
                      "type": "object"
                    },
                    "maxItems": 6,
                    "minItems": 6,
                    "type": "array"
                  },
                  "overall_score": {
                    "maximum": 100,
                    "minimum": 0,
                    "type": "number"
                  },
                  "paper_type": {
                    "enum": [
                      "empirical",
                      "review",
                      "theoretical",
                      "qualitative",
                      "mixed_methods",
                      "other"
                    ]
                  },
                  "paper_type_reason": {
                    "minLength": 1,
                    "type": "string"
                  },
                  "rubric_id": {
                    "minLength": 1,
                    "type": "string"
                  },
                  "schema": {
                    "const": "literature_score.v1"
                  }
                },
                "required": [
                  "schema",
                  "rubric_id",
                  "paper_type",
                  "paper_type_reason",
                  "overall_score",
                  "confidence",
                  "confidence_adjusted_score",
                  "dimensions"
                ],
                "type": "object"
              },
              "managedNoteDetail": {
                "oneOf": [
                  {
                    "additionalProperties": false,
                    "properties": {
                      "content": {
                        "type": "string"
                      },
                      "format": {
                        "enum": [
                          "html",
                          "text"
                        ]
                      },
                      "kind": {
                        "const": "ordinary"
                      },
                      "parentRef": {
                        "anyOf": [
                          {
                            "$ref": "#/$defs/itemRef"
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "ref": {
                        "$ref": "#/$defs/itemRef"
                      },
                      "revision": {
                        "minLength": 1,
                        "type": "string"
                      },
                      "title": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "kind",
                      "ref",
                      "parentRef",
                      "title",
                      "format",
                      "content",
                      "revision"
                    ],
                    "type": "object"
                  },
                  {
                    "additionalProperties": false,
                    "properties": {
                      "derived": {
                        "additionalProperties": false,
                        "properties": {
                          "markdown": {
                            "type": "string"
                          },
                          "representativeImage": {
                            "additionalProperties": false,
                            "properties": {
                              "alt": {
                                "type": "string"
                              },
                              "attachmentRef": {
                                "$ref": "#/$defs/itemRef"
                              }
                            },
                            "required": [
                              "attachmentRef",
                              "alt"
                            ],
                            "type": "object"
                          }
                        },
                        "type": "object"
                      },
                      "detailBytes": {
                        "minimum": 0,
                        "type": "integer"
                      },
                      "health": {
                        "additionalProperties": false,
                        "properties": {
                          "currentReferencesBasis": {
                            "minLength": 1,
                            "type": "string"
                          },
                          "state": {
                            "enum": [
                              "current",
                              "stale"
                            ]
                          }
                        },
                        "required": [
                          "state"
                        ],
                        "type": "object"
                      },
                      "kind": {
                        "const": "managed"
                      },
                      "noteKind": {
                        "enum": [
                          "custom",
                          "conversation-note",
                          "digest",
                          "references",
                          "citation-analysis",
                          "literature-score"
                        ]
                      },
                      "parentRef": {
                        "anyOf": [
                          {
                            "$ref": "#/$defs/itemRef"
                          },
                          {
                            "type": "null"
                          }
                        ]
                      },
                      "payload": {
                        "$ref": "#/$defs/jsonValue"
                      },
                      "payloadBytes": {
                        "minimum": 0,
                        "type": "integer"
                      },
                      "provenance": {
                        "additionalProperties": false,
                        "properties": {
                          "referencesBasis": {
                            "minLength": 1,
                            "type": "string"
                          },
                          "sourceRef": {
                            "$ref": "#/$defs/itemRef"
                          }
                        },
                        "type": "object"
                      },
                      "ref": {
                        "$ref": "#/$defs/itemRef"
                      },
                      "revision": {
                        "minLength": 1,
                        "type": "string"
                      },
                      "title": {
                        "type": "string"
                      }
                    },
                    "required": [
                      "kind",
                      "noteKind",
                      "ref",
                      "parentRef",
                      "title",
                      "payload",
                      "payloadBytes",
                      "detailBytes",
                      "revision"
                    ],
                    "type": "object"
                  }
                ]
              },
              "mutationAttempt": {
                "additionalProperties": false,
                "properties": {
                  "affectedRefs": {
                    "items": {
                      "additionalProperties": false,
                      "type": "object"
                    },
                    "type": "array"
                  },
                  "attemptId": {
                    "minLength": 1,
                    "type": "string"
                  },
                  "error": {
                    "additionalProperties": false,
                    "properties": {
                      "code": {
                        "minLength": 1,
                        "type": "string"
                      },
                      "details": {
                        "$ref": "#/$defs/jsonValue"
                      },
                      "message": {
                        "type": "string"
                      },
                      "phase": {
                        "enum": [
                          "validation",
                          "reservation",
                          "read",
                          "staging",
                          "commit",
                          "verification",
                          "compensation",
                          "cleanup"
                        ]
                      },
                      "recovery": {
                        "enum": [
                          "none",
                          "retry_same_operation",
                          "refresh_and_retry_new_operation",
                          "reconcile",
                          "manual_repair"
                        ]
                      }
                    },
                    "required": [
                      "code",
                      "phase",
                      "recovery",
                      "details"
                    ],
                    "type": "object"
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
                      "literature.ingest",
                      "managed_note.write_custom",
                      "managed_note.write_conversation",
                      "literature_artifact.upsert_digest",
                      "literature_artifact.upsert_references",
                      "literature_artifact.upsert_citation_analysis",
                      "literature_artifact.upsert_score"
                    ]
                  },
                  "operationId": {
                    "maxLength": 128,
                    "minLength": 1,
                    "type": "string"
                  },
                  "residualRefs": {
                    "items": {
                      "additionalProperties": false,
                      "type": "object"
                    },
                    "type": "array"
                  },
                  "schema": {
                    "const": "zotero-agents.mutation-attempt.v1"
                  },
                  "status": {
                    "enum": [
                      "failed",
                      "canceled",
                      "unknown",
                      "repair_required"
                    ]
                  }
                },
                "required": [
                  "schema",
                  "attemptId",
                  "operationId",
                  "operation",
                  "status",
                  "error",
                  "affectedRefs",
                  "residualRefs"
                ],
                "type": "object"
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
              "receipt": {
                "additionalProperties": false,
                "properties": {
                  "changes": {
                    "items": {
                      "additionalProperties": true,
                      "type": "object"
                    },
                    "type": "array"
                  },
                  "committedAt": {
                    "minLength": 1,
                    "type": "string"
                  },
                  "effectDigest": {
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
                      "literature.ingest",
                      "managed_note.write_custom",
                      "managed_note.write_conversation",
                      "literature_artifact.upsert_digest",
                      "literature_artifact.upsert_references",
                      "literature_artifact.upsert_citation_analysis",
                      "literature_artifact.upsert_score"
                    ]
                  },
                  "operationId": {
                    "maxLength": 128,
                    "minLength": 1,
                    "type": "string"
                  },
                  "outcome": {
                    "enum": [
                      "committed",
                      "unchanged"
                    ]
                  },
                  "receiptId": {
                    "minLength": 1,
                    "type": "string"
                  },
                  "schema": {
                    "const": "zotero-agents.mutation-receipt.v1"
                  }
                },
                "required": [
                  "schema",
                  "receiptId",
                  "operationId",
                  "operation",
                  "outcome",
                  "committedAt",
                  "effectDigest",
                  "changes"
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
                "additionalProperties": false,
                "properties": {
                  "outcome": {
                    "enum": [
                      "committed",
                      "unchanged"
                    ]
                  },
                  "receipt": {
                    "allOf": [
                      {
                        "$ref": "#/$defs/receipt"
                      },
                      {
                        "properties": {
                          "operation": {
                            "const": "attachments.create"
                          }
                        },
                        "required": [
                          "operation"
                        ],
                        "type": "object"
                      }
                    ]
                  },
                  "result": {
                    "additionalProperties": false,
                    "properties": {
                      "attachment": {
                        "additionalProperties": true,
                        "type": "object"
                      }
                    },
                    "required": [
                      "attachment"
                    ],
                    "type": "object"
                  }
                },
                "required": [
                  "outcome",
                  "receipt",
                  "result"
                ],
                "type": "object"
              },
              {
                "additionalProperties": false,
                "properties": {
                  "attempt": {
                    "$ref": "#/$defs/mutationAttempt"
                  },
                  "outcome": {
                    "enum": [
                      "failed",
                      "canceled",
                      "unknown",
                      "repair_required"
                    ]
                  }
                },
                "required": [
                  "outcome",
                  "attempt"
                ],
                "type": "object"
              }
            ]
          }
        ]
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
      "target": "attachments.create"
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
    "target": "attachments.create"
  }
]
```
