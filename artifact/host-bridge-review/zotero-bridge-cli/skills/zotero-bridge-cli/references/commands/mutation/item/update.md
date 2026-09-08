# `zotero-bridge mutation item update`

更新 Zotero item 字段

## 用法

```console
zotero-bridge mutation item update [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --item <ITEM> --patch <JSON_OR_FILE>
```

全局选项可出现在叶命令之前或之后。使用 `--schema` 检查原始结构化输入 schema，而无需加载 profile 或连接 Zotero。

## 全局参数

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --endpoint | endpoint | option | no | — | ENDPOINT | no | ZOTERO_BRIDGE_ENDPOINT | — | Zotero Bridge 服务端点基础 URL。若省略，CLI 读取 ZOTERO_BRIDGE_ENDPOINT 或 profile 文件。CLI 不会猜测随机的 bridge 端口。 |
| --operation-id | operation_id | option | no | — | ID | no | ZOTERO_BRIDGE_OPERATION_ID | — | 用于改变状态的 Zotero 请求的不透明 idempotency id |
| --profile | profile | option | no | — | PATH | no | ZOTERO_BRIDGE_PROFILE | — | Zotero Bridge connection-profile JSON 文件的路径。若省略，CLI 会尝试 Zotero Agents 的 well-known profile。ACP run profile 通常引用 tokenEnv；本地 well-known profile 可能包含受用户级文件权限保护的 bearer token。 |
| --schema | schema | option | no | — | SCHEMA; values: true, false | no | — | — | 打印一个规范叶命令的带版本原始 JSON Schema 与受管辖示例。Schema 模式为离线模式，不加载 profile、不读取 Zotero Bridge 配置，也不连接 Zotero。 |

## 局部选项与位置参数

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --item | item | option | yes | — | ITEM | no | — | — | 目标 Zotero item ref |
| --patch | patch | option | yes | — | JSON_OR_FILE | no | — | — | 字段补丁 JSON 对象 |

## 调用 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "item": {
      "description": "Target Zotero item ref",
      "type": "string"
    },
    "patch": {
      "description": "Field patch JSON object",
      "type": "string"
    }
  },
  "required": [
    "item",
    "patch"
  ],
  "type": "object"
}
```

## 结构化输入 schema

### `--patch`（patch）

必需：`true`。

```json
{
  "$defs": {
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
    }
  },
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
```

## 组合载荷 schema

```json
{
  "$defs": {
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
    }
  },
  "additionalProperties": false,
  "properties": {
    "dryRun": {
      "default": false,
      "type": "boolean"
    },
    "itemRef": {
      "$ref": "#/$defs/itemRef"
    },
    "operationId": {
      "maxLength": 128,
      "minLength": 1,
      "type": "string"
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
    "itemRef",
    "patch"
  ],
  "type": "object"
}
```

## 载荷组合

可执行命令契约拥有下方所示的基准源、固定值、字段映射与封闭转换。命令处理器只在所引用的 Clap 参数 ID 下提供值。

```json
{
  "constants": {},
  "mappings": [
    {
      "argument": "item",
      "field": "itemRef",
      "required": true,
      "transform": "identity"
    },
    {
      "argument": "patch",
      "field": "patch",
      "required": true,
      "transform": "identity"
    }
  ]
}
```

## 结果 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "approval": {
      "minLength": 1,
      "type": "string"
    },
    "capability": {
      "const": "item.updateMetadata"
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
              "const": "item.updateMetadata"
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
                          "const": "item.updateMetadata"
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
                    "item": {
                      "additionalProperties": true,
                      "type": "object"
                    }
                  },
                  "required": [
                    "item"
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

## 示例

### patch：仅形状

--patch 的最小 JSON 形状。

```console
zotero-bridge mutation item update --patch '{"fields":{"title":"Updated title"}}'
```

前置条件：

- 执行前，将示例中的标识符与值替换为对所选 Zotero 库、workflow、provider 或 capability 有效的输入。

## 完整命令描述符

此封闭描述符是 `surface describe` 返回的机器可读命令契约；此处包含它，以便在不加载另一份命令参考的情况下，本卡片仍可独立审计。

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
      "help": "Field patch JSON object",
      "id": "patch",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "--patch",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "argv": [
    "mutation",
    "item",
    "update"
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
      "property": "patch",
      "required": true,
      "takesValue": true,
      "token": "--patch",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "binding": "object",
  "category": "write",
  "command": "mutation item update",
  "composition": {
    "constants": {},
    "mappings": [
      {
        "argument": "item",
        "field": "itemRef",
        "required": true,
        "transform": "identity"
      },
      {
        "argument": "patch",
        "field": "patch",
        "required": true,
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
  "handleTransitions": [],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {
    "patch": {
      "examples": [
        {
          "description": "Minimal JSON shape for --patch.",
          "kind": "shape-only",
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "value": {
            "fields": {
              "title": "Updated title"
            }
          }
        }
      ],
      "required": true,
      "requiredWhen": [],
      "schema": {
        "$defs": {
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
          }
        },
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
      },
      "schemaSource": "composition",
      "token": "--patch"
    }
  },
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "item": {
        "description": "Target Zotero item ref",
        "type": "string"
      },
      "patch": {
        "description": "Field patch JSON object",
        "type": "string"
      }
    },
    "required": [
      "item",
      "patch"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "mutation item update",
    "mutation",
    "item",
    "update",
    "ITEM",
    "patch",
    "JSON_OR_FILE"
  ],
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "$defs": {
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
      }
    },
    "additionalProperties": false,
    "properties": {
      "dryRun": {
        "default": false,
        "type": "boolean"
      },
      "itemRef": {
        "$ref": "#/$defs/itemRef"
      },
      "operationId": {
        "maxLength": 128,
        "minLength": 1,
        "type": "string"
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
      "itemRef",
      "patch"
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
        "const": "item.updateMetadata"
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
                "const": "item.updateMetadata"
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
                            "const": "item.updateMetadata"
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
                      "item": {
                        "additionalProperties": true,
                        "type": "object"
                      }
                    },
                    "required": [
                      "item"
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
  "summary": "Update Zotero item fields",
  "targets": [
    {
      "kind": "capability",
      "target": "item.updateMetadata"
    }
  ]
}
```

## 参数失败与恢复契约

参数失败以单个 JSON 错误信封返回。先检查 `error.code`，然后要求 `error.details.schema` 为 `host-bridge.argument-error.v1`，再使用结构化边界字段。保留规范命令、已净化的输入以及任何已返回的类型化句柄；绝不在证据中包含完整的原始载荷。

- `argv` 报告缺失、未知、冲突或无效的 CLI 参数。请依据本卡片的参数表或当前命令帮助重建 argv。
- `json_source` 报告 stdin 或文件源不可读。请修正该源，而不要将值挪到另一个绑定。
- `json_syntax` 以安全行列上下文报告无效 JSON。在解读领域字段前先修复语法。
- `command_input` 报告结构化输入的 schema 违规。检查有界的 `violations`，然后用 `--schema` 运行此精确叶命令并修正所声明的字段或类型；不要自行发明别名。
- `payload_contract` 表示 CLI 组合出的 capability 载荷在网络 I/O 之前违反了可执行契约。将其视为实现缺陷；不要用原始传输绕过语义命令。
- `command_result` 表示 Host 响应或本地结果未通过其可执行结果 schema。不得将其作为成功证据接受或报告。
- 违规数组经过脱敏、确定性排序，并最多保留八项。当 `truncated` 为 true 时，应修正所报告的违规并重新校验，而不是要求披露秘密或完整载荷。

## 操作契约

- 规范 argv 路径：`mutation` `item` `update`。
- 输出边界：`fixed`；受管辖细节：{"strategy":"fixed"}。
- 分页：`none`。
- 类别：`write`；危险级别：`review`。
- 结构化绑定模式：`object`。
- 意图可见性：`visible`。
- 操作别名：`mutation item update`、`mutation`、`item`、`update`、`ITEM`、`patch`、`JSON_OR_FILE`。

### 效果

```json
[
  {
    "description": "May change zotero library state.",
    "kind": "zotero-library",
    "stateChanged": true
  }
]
```

### 审批

```json
{
  "kind": "zotero-ui-required",
  "scope": "Zotero UI approval for the described Zotero-managed effect.",
  "timing": "before-command"
}
```

### 句柄转换

```json
[
]
```

### 恢复

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

### 目标

```json
[
  {
    "kind": "capability",
    "target": "item.updateMetadata"
  }
]
```
