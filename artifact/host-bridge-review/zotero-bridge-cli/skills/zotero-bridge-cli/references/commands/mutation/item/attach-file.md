# `zotero-bridge mutation item attach-file`

将通过 Zotero Bridge 上传的文件附加到一个 Zotero item

## 用法

```console
zotero-bridge mutation item attach-file [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --item <ITEM> --file-id <FILE_ID> [--display-name <DISPLAY_NAME>] [--content-type <CONTENT_TYPE>]
```

全局选项可以出现在 leaf 命令之前或之后。此 leaf 没有结构化 JSON 输入。`--schema` 会返回 `command_input_schema_unavailable`；请使用命令帮助或 `surface describe` 来检查调用契约。

## 全局参数

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --endpoint | endpoint | option | no | — | ENDPOINT | no | ZOTERO_BRIDGE_ENDPOINT | — | Zotero Bridge 服务的端点基址。若省略，CLI 会读取 ZOTERO_BRIDGE_ENDPOINT 或 profile 文件。CLI 不会随意猜测 bridge 端口。 |
| --operation-id | operation_id | option | no | — | ID | no | ZOTERO_BRIDGE_OPERATION_ID | — | 用于一次会改变 Zotero 状态的请求的不透明幂等性 id |
| --profile | profile | option | no | — | PATH | no | ZOTERO_BRIDGE_PROFILE | — | Zotero Bridge 连接 profile JSON 文件的路径。若省略，CLI 会尝试使用 Zotero Agents 的 well-known profile。ACP 运行 profile 通常引用 tokenEnv；本地的 well-known profile 可能包含由用户级文件权限保护的 bearer token。 |
| --schema | schema | option | no | — | SCHEMA; values: true, false | no | — | — | 为一个规范化的 leaf 命令打印版本化的原始 JSON Schema 和受管控的示例。Schema 模式为离线模式，不会加载 profile、读取 Zotero Bridge 配置，也不会连接 Zotero。 |

## 本地选项与位置参数

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --item | item | option | yes | — | ITEM | no | — | — | Target Zotero item ref |
| --file-id | file_id | option | yes | — | FILE_ID | no | — | — | Bridge-issued uploaded file id |
| --display-name | display_name | option | no | — | DISPLAY_NAME | no | — | — | Attachment display name |
| --content-type | content_type | option | no | — | CONTENT_TYPE | no | — | — | Attachment content type |

## 调用 schema

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

## 结构化输入 schema

此命令没有结构化 JSON 输入参数。

## 组合 payload schema

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
  "type": "object",
  "unevaluatedProperties": false
}
```

## Payload 组合

The executable command contract owns the base source, fixed values, field mappings, and closed transforms shown below. Command handlers only provide values under the referenced Clap argument IDs.

```json
{
  "constants": {
    "operation": "attachments.create"
  },
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
      "const": "mutation.execute"
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
                "literature.ingest"
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
                "literature.ingest"
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
                      "const": "item.create"
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
                      "const": "item.changeType"
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
                      "const": "item.remove"
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
                "itemRef": {
                  "$ref": "#/$defs/itemRef"
                },
                "outcome": {
                  "enum": [
                    "trashed",
                    "permanently_deleted",
                    "already_trashed",
                    "already_absent"
                  ]
                }
              },
              "required": [
                "itemRef",
                "outcome"
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
                      "const": "item.updateTags"
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
                      "const": "item.addRelated"
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
                "relatedRefs": {
                  "$ref": "#/$defs/itemRefArray"
                },
                "relations": {
                  "items": {
                    "additionalProperties": false,
                    "properties": {
                      "outcome": {
                        "enum": [
                          "added",
                          "removed",
                          "already_present",
                          "already_absent"
                        ]
                      },
                      "relatedRef": {
                        "$ref": "#/$defs/itemRef"
                      }
                    },
                    "required": [
                      "relatedRef",
                      "outcome"
                    ],
                    "type": "object"
                  },
                  "type": "array"
                },
                "sourceRef": {
                  "$ref": "#/$defs/itemRef"
                },
                "sourceRevision": {
                  "minLength": 1,
                  "type": "string"
                }
              },
              "required": [
                "sourceRef",
                "relatedRefs",
                "relations",
                "sourceRevision"
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
                      "const": "item.removeRelated"
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
                "relatedRefs": {
                  "$ref": "#/$defs/itemRefArray"
                },
                "relations": {
                  "items": {
                    "additionalProperties": false,
                    "properties": {
                      "outcome": {
                        "enum": [
                          "added",
                          "removed",
                          "already_present",
                          "already_absent"
                        ]
                      },
                      "relatedRef": {
                        "$ref": "#/$defs/itemRef"
                      }
                    },
                    "required": [
                      "relatedRef",
                      "outcome"
                    ],
                    "type": "object"
                  },
                  "type": "array"
                },
                "sourceRef": {
                  "$ref": "#/$defs/itemRef"
                },
                "sourceRevision": {
                  "minLength": 1,
                  "type": "string"
                }
              },
              "required": [
                "sourceRef",
                "relatedRefs",
                "relations",
                "sourceRevision"
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
                      "const": "collection.create"
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
                "collection": {
                  "additionalProperties": true,
                  "type": "object"
                }
              },
              "required": [
                "collection"
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
                      "const": "collection.update"
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
                "collection": {
                  "additionalProperties": true,
                  "type": "object"
                }
              },
              "required": [
                "collection"
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
                      "const": "collection.updateMembership"
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
                "addedRefs": {
                  "$ref": "#/$defs/itemRefArray"
                },
                "collection": {
                  "additionalProperties": true,
                  "type": "object"
                },
                "removedRefs": {
                  "$ref": "#/$defs/itemRefArray"
                }
              },
              "required": [
                "collection",
                "addedRefs",
                "removedRefs"
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
                      "const": "collection.remove"
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
                "removedRef": {
                  "$ref": "#/$defs/collectionRef"
                }
              },
              "required": [
                "removedRef"
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
                      "const": "notes.create"
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
                "note": {
                  "additionalProperties": true,
                  "type": "object"
                }
              },
              "required": [
                "note"
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
                      "const": "notes.updateContent"
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
                "note": {
                  "additionalProperties": true,
                  "type": "object"
                }
              },
              "required": [
                "note"
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
                      "const": "notes.remove"
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
                "noteRef": {
                  "$ref": "#/$defs/itemRef"
                },
                "outcome": {
                  "enum": [
                    "trashed",
                    "permanently_deleted",
                    "already_trashed",
                    "already_absent"
                  ]
                }
              },
              "required": [
                "noteRef",
                "outcome"
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
                      "const": "notes.upsertPayload"
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
                "note": {
                  "additionalProperties": true,
                  "type": "object"
                },
                "outcome": {
                  "enum": [
                    "created",
                    "replaced",
                    "unchanged"
                  ]
                },
                "payload": {
                  "additionalProperties": true,
                  "type": "object"
                }
              },
              "required": [
                "note",
                "payload",
                "outcome"
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
                      "const": "attachments.updateMetadata"
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
                      "const": "attachments.replaceFile"
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
                },
                "outcome": {
                  "enum": [
                    "replaced",
                    "unchanged"
                  ]
                }
              },
              "required": [
                "attachment",
                "outcome"
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
                      "const": "attachments.move"
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
                },
                "outcome": {
                  "enum": [
                    "moved",
                    "unchanged"
                  ]
                }
              },
              "required": [
                "attachment",
                "outcome"
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
                      "const": "attachments.remove"
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
                "attachmentRef": {
                  "$ref": "#/$defs/itemRef"
                },
                "outcome": {
                  "enum": [
                    "trashed",
                    "permanently_deleted",
                    "already_trashed",
                    "already_absent"
                  ]
                }
              },
              "required": [
                "attachmentRef",
                "outcome"
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
                      "const": "statusTags.transition"
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
                "added": {
                  "$ref": "#/$defs/stringArray"
                },
                "itemRef": {
                  "$ref": "#/$defs/itemRef"
                },
                "removed": {
                  "$ref": "#/$defs/stringArray"
                },
                "revision": {
                  "minLength": 1,
                  "type": "string"
                },
                "unchanged": {
                  "$ref": "#/$defs/stringArray"
                }
              },
              "required": [
                "itemRef",
                "added",
                "removed",
                "unchanged",
                "revision"
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
                      "const": "trash.setItemsState"
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
                "expandedRefs": {
                  "$ref": "#/$defs/itemRefArray"
                },
                "explicitRefs": {
                  "$ref": "#/$defs/itemRefArray"
                },
                "state": {
                  "enum": [
                    "trashed",
                    "active"
                  ]
                }
              },
              "required": [
                "state",
                "explicitRefs",
                "expandedRefs"
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
                      "const": "literature.ingest"
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
                "collectionOutcome": {
                  "enum": [
                    "added",
                    "already_present"
                  ]
                },
                "collectionRef": {
                  "$ref": "#/$defs/collectionRef"
                },
                "enrichment": {
                  "items": {
                    "oneOf": [
                      {
                        "additionalProperties": false,
                        "properties": {
                          "kind": {
                            "enum": [
                              "pdf",
                              "landing"
                            ]
                          },
                          "outcome": {
                            "const": "attached"
                          }
                        },
                        "required": [
                          "kind",
                          "outcome"
                        ],
                        "type": "object"
                      },
                      {
                        "additionalProperties": false,
                        "properties": {
                          "kind": {
                            "enum": [
                              "pdf",
                              "landing"
                            ]
                          },
                          "outcome": {
                            "const": "skipped"
                          }
                        },
                        "required": [
                          "kind",
                          "outcome"
                        ],
                        "type": "object"
                      },
                      {
                        "additionalProperties": false,
                        "properties": {
                          "code": {
                            "minLength": 1,
                            "type": "string"
                          },
                          "kind": {
                            "enum": [
                              "pdf",
                              "landing"
                            ]
                          },
                          "outcome": {
                            "const": "failed"
                          }
                        },
                        "required": [
                          "kind",
                          "outcome",
                          "code"
                        ],
                        "type": "object"
                      }
                    ]
                  },
                  "type": "array"
                },
                "item": {
                  "additionalProperties": true,
                  "type": "object"
                },
                "itemOutcome": {
                  "enum": [
                    "created",
                    "existing"
                  ]
                }
              },
              "required": [
                "item",
                "collectionRef",
                "itemOutcome",
                "collectionOutcome",
                "enrichment"
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

没有适用的结构化输入示例。执行前，请根据参数表构建 argv，并使用 `surface describe` 确认命令。

## 完整命令描述符

此封闭描述符是 `surface describe` 返回的机器可读命令契约；此处包含它是为了让该卡片在无需加载其他命令参考的情况下仍可独立审计。

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
      "operation": "attachments.create"
    },
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
    "type": "object",
    "unevaluatedProperties": false
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
                  "literature.ingest"
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
                  "literature.ingest"
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
                        "const": "item.create"
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
                        "const": "item.changeType"
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
                        "const": "item.remove"
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
                  "itemRef": {
                    "$ref": "#/$defs/itemRef"
                  },
                  "outcome": {
                    "enum": [
                      "trashed",
                      "permanently_deleted",
                      "already_trashed",
                      "already_absent"
                    ]
                  }
                },
                "required": [
                  "itemRef",
                  "outcome"
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
                        "const": "item.updateTags"
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
                        "const": "item.addRelated"
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
                  "relatedRefs": {
                    "$ref": "#/$defs/itemRefArray"
                  },
                  "relations": {
                    "items": {
                      "additionalProperties": false,
                      "properties": {
                        "outcome": {
                          "enum": [
                            "added",
                            "removed",
                            "already_present",
                            "already_absent"
                          ]
                        },
                        "relatedRef": {
                          "$ref": "#/$defs/itemRef"
                        }
                      },
                      "required": [
                        "relatedRef",
                        "outcome"
                      ],
                      "type": "object"
                    },
                    "type": "array"
                  },
                  "sourceRef": {
                    "$ref": "#/$defs/itemRef"
                  },
                  "sourceRevision": {
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "sourceRef",
                  "relatedRefs",
                  "relations",
                  "sourceRevision"
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
                        "const": "item.removeRelated"
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
                  "relatedRefs": {
                    "$ref": "#/$defs/itemRefArray"
                  },
                  "relations": {
                    "items": {
                      "additionalProperties": false,
                      "properties": {
                        "outcome": {
                          "enum": [
                            "added",
                            "removed",
                            "already_present",
                            "already_absent"
                          ]
                        },
                        "relatedRef": {
                          "$ref": "#/$defs/itemRef"
                        }
                      },
                      "required": [
                        "relatedRef",
                        "outcome"
                      ],
                      "type": "object"
                    },
                    "type": "array"
                  },
                  "sourceRef": {
                    "$ref": "#/$defs/itemRef"
                  },
                  "sourceRevision": {
                    "minLength": 1,
                    "type": "string"
                  }
                },
                "required": [
                  "sourceRef",
                  "relatedRefs",
                  "relations",
                  "sourceRevision"
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
                        "const": "collection.create"
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
                  "collection": {
                    "additionalProperties": true,
                    "type": "object"
                  }
                },
                "required": [
                  "collection"
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
                        "const": "collection.update"
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
                  "collection": {
                    "additionalProperties": true,
                    "type": "object"
                  }
                },
                "required": [
                  "collection"
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
                        "const": "collection.updateMembership"
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
                  "addedRefs": {
                    "$ref": "#/$defs/itemRefArray"
                  },
                  "collection": {
                    "additionalProperties": true,
                    "type": "object"
                  },
                  "removedRefs": {
                    "$ref": "#/$defs/itemRefArray"
                  }
                },
                "required": [
                  "collection",
                  "addedRefs",
                  "removedRefs"
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
                        "const": "collection.remove"
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
                  "removedRef": {
                    "$ref": "#/$defs/collectionRef"
                  }
                },
                "required": [
                  "removedRef"
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
                        "const": "notes.create"
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
                  "note": {
                    "additionalProperties": true,
                    "type": "object"
                  }
                },
                "required": [
                  "note"
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
                        "const": "notes.updateContent"
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
                  "note": {
                    "additionalProperties": true,
                    "type": "object"
                  }
                },
                "required": [
                  "note"
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
                        "const": "notes.remove"
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
                  "noteRef": {
                    "$ref": "#/$defs/itemRef"
                  },
                  "outcome": {
                    "enum": [
                      "trashed",
                      "permanently_deleted",
                      "already_trashed",
                      "already_absent"
                    ]
                  }
                },
                "required": [
                  "noteRef",
                  "outcome"
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
                        "const": "notes.upsertPayload"
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
                  "note": {
                    "additionalProperties": true,
                    "type": "object"
                  },
                  "outcome": {
                    "enum": [
                      "created",
                      "replaced",
                      "unchanged"
                    ]
                  },
                  "payload": {
                    "additionalProperties": true,
                    "type": "object"
                  }
                },
                "required": [
                  "note",
                  "payload",
                  "outcome"
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
                        "const": "attachments.updateMetadata"
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
                        "const": "attachments.replaceFile"
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
                  },
                  "outcome": {
                    "enum": [
                      "replaced",
                      "unchanged"
                    ]
                  }
                },
                "required": [
                  "attachment",
                  "outcome"
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
                        "const": "attachments.move"
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
                  },
                  "outcome": {
                    "enum": [
                      "moved",
                      "unchanged"
                    ]
                  }
                },
                "required": [
                  "attachment",
                  "outcome"
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
                        "const": "attachments.remove"
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
                  "attachmentRef": {
                    "$ref": "#/$defs/itemRef"
                  },
                  "outcome": {
                    "enum": [
                      "trashed",
                      "permanently_deleted",
                      "already_trashed",
                      "already_absent"
                    ]
                  }
                },
                "required": [
                  "attachmentRef",
                  "outcome"
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
                        "const": "statusTags.transition"
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
                  "added": {
                    "$ref": "#/$defs/stringArray"
                  },
                  "itemRef": {
                    "$ref": "#/$defs/itemRef"
                  },
                  "removed": {
                    "$ref": "#/$defs/stringArray"
                  },
                  "revision": {
                    "minLength": 1,
                    "type": "string"
                  },
                  "unchanged": {
                    "$ref": "#/$defs/stringArray"
                  }
                },
                "required": [
                  "itemRef",
                  "added",
                  "removed",
                  "unchanged",
                  "revision"
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
                        "const": "trash.setItemsState"
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
                  "expandedRefs": {
                    "$ref": "#/$defs/itemRefArray"
                  },
                  "explicitRefs": {
                    "$ref": "#/$defs/itemRefArray"
                  },
                  "state": {
                    "enum": [
                      "trashed",
                      "active"
                    ]
                  }
                },
                "required": [
                  "state",
                  "explicitRefs",
                  "expandedRefs"
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
                        "const": "literature.ingest"
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
                  "collectionOutcome": {
                    "enum": [
                      "added",
                      "already_present"
                    ]
                  },
                  "collectionRef": {
                    "$ref": "#/$defs/collectionRef"
                  },
                  "enrichment": {
                    "items": {
                      "oneOf": [
                        {
                          "additionalProperties": false,
                          "properties": {
                            "kind": {
                              "enum": [
                                "pdf",
                                "landing"
                              ]
                            },
                            "outcome": {
                              "const": "attached"
                            }
                          },
                          "required": [
                            "kind",
                            "outcome"
                          ],
                          "type": "object"
                        },
                        {
                          "additionalProperties": false,
                          "properties": {
                            "kind": {
                              "enum": [
                                "pdf",
                                "landing"
                              ]
                            },
                            "outcome": {
                              "const": "skipped"
                            }
                          },
                          "required": [
                            "kind",
                            "outcome"
                          ],
                          "type": "object"
                        },
                        {
                          "additionalProperties": false,
                          "properties": {
                            "code": {
                              "minLength": 1,
                              "type": "string"
                            },
                            "kind": {
                              "enum": [
                                "pdf",
                                "landing"
                              ]
                            },
                            "outcome": {
                              "const": "failed"
                            }
                          },
                          "required": [
                            "kind",
                            "outcome",
                            "code"
                          ],
                          "type": "object"
                        }
                      ]
                    },
                    "type": "array"
                  },
                  "item": {
                    "additionalProperties": true,
                    "type": "object"
                  },
                  "itemOutcome": {
                    "enum": [
                      "created",
                      "existing"
                    ]
                  }
                },
                "required": [
                  "item",
                  "collectionRef",
                  "itemOutcome",
                  "collectionOutcome",
                  "enrichment"
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

## 参数失败与恢复契约

Parameter failures are returned as one JSON error envelope. Inspect `error.code`, then require `error.details.schema` to be `host-bridge.argument-error.v1` before using the structured boundary fields. Preserve the canonical command, sanitized inputs, and any already-returned typed handles; never include the complete raw payload in evidence.

- `argv` reports a missing, unknown, conflicting, or invalid CLI argument. Rebuild argv from this card's parameter tables or the active command help.
- `json_source` reports an unreadable stdin or file source. Correct that source without moving the value to a different binding.
- `json_syntax` reports invalid JSON with safe line and column context. Repair syntax before interpreting domain fields.
- This leaf has no structured JSON input, so `command_input` is not an expected invocation boundary. Use `surface describe` for its scalar and positional contract.
- `payload_contract` means the CLI's composed capability payload violates the executable contract before network I/O. Treat this as an implementation fault; do not bypass the semantic command with raw transport.
- `command_result` means a Host response or local result failed its executable result schema. Do not accept or report it as successful evidence.
- Violation arrays are redacted, deterministically ordered, and capped at eight. When `truncated` is true, correct the reported violations and validate again rather than requesting secret or complete payload disclosure.

## 运行契约

- Canonical argv path: `mutation` `item` `attach-file`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Structured binding mode: `object`.
- Intent visibility: `visible`.
- Operational aliases: `mutation item attach-file`, `mutation`, `item`, `attach-file`, `ITEM`, `file_id`, `file-id`, `FILE_ID`, `display_name`, `display-name`, `DISPLAY_NAME`, `content_type`, `content-type`, `CONTENT_TYPE`.

### 影响

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

### Handle 转换

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
    "target": "mutation.execute"
  }
]
```
