# `zotero-bridge library snapshot`

读取一个固定的 Zotero 全库快照页面

## 用法

```console
zotero-bridge library snapshot [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--query <JSON_OR_FILE>]
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
| --query | query | option | no | — | JSON_OR_FILE | no | — | — | 读取查询。默认使用内联 JSON，如 '{"cursor":1}'。仅当输入来源确属有意时，才使用包含 JSON 的文件路径、@file 语法或 '-' 表示 stdin。省略时为 {}。 |

## 调用 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "query": {
      "description": "Read query as inline JSON, a file path, @file, or '-' for stdin",
      "type": "string"
    }
  },
  "required": [],
  "type": "object"
}
```

## 结构化输入 schema

### `--query`（query）

必需：`false`。

```json
{
  "additionalProperties": false,
  "dependentRequired": {
    "cursor": [
      "snapshotId"
    ],
    "snapshotId": [
      "cursor"
    ]
  },
  "properties": {
    "batchSize": {
      "maximum": 1000,
      "minimum": 1,
      "type": "integer"
    },
    "cursor": {
      "maxLength": 256,
      "minLength": 1,
      "type": "string"
    },
    "libraryId": {
      "minimum": 1,
      "type": "integer"
    },
    "snapshotId": {
      "maxLength": 256,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "libraryId"
  ],
  "type": "object"
}
```

## 组合载荷 schema

```json
{
  "additionalProperties": false,
  "dependentRequired": {
    "cursor": [
      "snapshotId"
    ],
    "snapshotId": [
      "cursor"
    ]
  },
  "properties": {
    "batchSize": {
      "maximum": 1000,
      "minimum": 1,
      "type": "integer"
    },
    "cursor": {
      "maxLength": 256,
      "minLength": 1,
      "type": "string"
    },
    "libraryId": {
      "minimum": 1,
      "type": "integer"
    },
    "snapshotId": {
      "maxLength": 256,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "libraryId"
  ],
  "type": "object"
}
```

## 载荷组合

此命令没有独立的字段映射程序。其绑定模式为直接可执行：passthrough 使用唯一的结构化来源，而 `none` 与 `raw` 保持其声明的封闭行为。

`composition`：`null`。

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
      "const": "library.sync_snapshot"
    },
    "data": {
      "additionalProperties": false,
      "oneOf": [
        {
          "not": {
            "required": [
              "completionEvidence"
            ]
          },
          "properties": {
            "hasMore": {
              "const": true
            },
            "nextCursor": {
              "minLength": 1,
              "type": "string"
            },
            "outcome": {
              "const": "active"
            }
          }
        },
        {
          "properties": {
            "hasMore": {
              "const": false
            },
            "nextCursor": {
              "type": "null"
            },
            "outcome": {
              "const": "completed"
            }
          },
          "required": [
            "completionEvidence"
          ]
        }
      ],
      "properties": {
        "batchIndex": {
          "minimum": 0,
          "type": "integer"
        },
        "batchSize": {
          "maximum": 1000,
          "minimum": 1,
          "type": "integer"
        },
        "completionEvidence": {
          "additionalProperties": false,
          "properties": {
            "completedAt": {
              "type": "string"
            },
            "contentDigest": {
              "pattern": "^sha256:[0-9a-f]{64}$",
              "type": "string"
            },
            "libraryId": {
              "minimum": 1,
              "type": "integer"
            },
            "order": {
              "const": "stable_identity"
            },
            "schema": {
              "const": "zotero-agents.library-full-index.v1"
            },
            "scope": {
              "const": "top-level-regular"
            },
            "snapshotId": {
              "maxLength": 256,
              "minLength": 1,
              "type": "string"
            },
            "totalBatches": {
              "minimum": 1,
              "type": "integer"
            },
            "totalItems": {
              "maximum": 1000000,
              "minimum": 0,
              "type": "integer"
            }
          },
          "required": [
            "snapshotId",
            "schema",
            "libraryId",
            "scope",
            "totalItems",
            "totalBatches",
            "order",
            "contentDigest",
            "completedAt"
          ],
          "type": "object"
        },
        "deliveredBatches": {
          "minimum": 0,
          "type": "integer"
        },
        "deliveredItems": {
          "minimum": 0,
          "type": "integer"
        },
        "hasMore": {
          "type": "boolean"
        },
        "items": {
          "items": {
            "additionalProperties": false,
            "properties": {
              "annotationCount": {
                "minimum": 0,
                "type": "integer"
              },
              "attachmentCount": {
                "minimum": 0,
                "type": "integer"
              },
              "collectionRefs": {
                "items": {
                  "additionalProperties": false,
                  "properties": {
                    "key": {
                      "maxLength": 128,
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
                "type": "array"
              },
              "creators": {
                "items": {
                  "anyOf": [
                    {
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
                        "representation": {
                          "const": "two_field"
                        }
                      },
                      "required": [
                        "representation",
                        "creatorType",
                        "firstName",
                        "lastName"
                      ],
                      "type": "object"
                    },
                    {
                      "additionalProperties": false,
                      "properties": {
                        "creatorType": {
                          "type": "string"
                        },
                        "name": {
                          "minLength": 1,
                          "type": "string"
                        },
                        "representation": {
                          "const": "single_field"
                        }
                      },
                      "required": [
                        "representation",
                        "creatorType",
                        "name"
                      ],
                      "type": "object"
                    }
                  ]
                },
                "type": "array"
              },
              "date": {
                "type": "string"
              },
              "identifiers": {
                "additionalProperties": false,
                "properties": {
                  "arxiv": {
                    "type": [
                      "string",
                      "null"
                    ]
                  },
                  "doi": {
                    "type": [
                      "string",
                      "null"
                    ]
                  },
                  "isbn": {
                    "type": [
                      "string",
                      "null"
                    ]
                  },
                  "issn": {
                    "type": [
                      "string",
                      "null"
                    ]
                  },
                  "pmid": {
                    "type": [
                      "string",
                      "null"
                    ]
                  }
                },
                "required": [
                  "doi",
                  "isbn",
                  "issn",
                  "arxiv",
                  "pmid"
                ],
                "type": "object"
              },
              "itemType": {
                "type": "string"
              },
              "kind": {
                "const": "regular"
              },
              "modifiedAt": {
                "type": "string"
              },
              "noteCount": {
                "minimum": 0,
                "type": "integer"
              },
              "parentRef": {
                "anyOf": [
                  {
                    "additionalProperties": false,
                    "properties": {
                      "key": {
                        "maxLength": 128,
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
                  {
                    "type": "null"
                  }
                ]
              },
              "publicationTitle": {
                "type": "string"
              },
              "ref": {
                "additionalProperties": false,
                "properties": {
                  "key": {
                    "maxLength": 128,
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
              "revision": {
                "minLength": 1,
                "type": "string"
              },
              "state": {
                "const": "active"
              },
              "tags": {
                "items": {
                  "type": "string"
                },
                "type": "array"
              },
              "title": {
                "type": "string"
              },
              "url": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "year": {
                "type": [
                  "string",
                  "null"
                ]
              }
            },
            "required": [
              "ref",
              "kind",
              "itemType",
              "title",
              "parentRef",
              "state",
              "revision",
              "tags",
              "collectionRefs",
              "creators",
              "date",
              "year",
              "publicationTitle",
              "identifiers",
              "url",
              "noteCount",
              "attachmentCount",
              "annotationCount",
              "modifiedAt"
            ],
            "type": "object"
          },
          "maxItems": 1000,
          "type": "array"
        },
        "libraryId": {
          "minimum": 1,
          "type": "integer"
        },
        "nextCursor": {
          "type": [
            "string",
            "null"
          ]
        },
        "order": {
          "const": "stable_identity"
        },
        "outcome": {
          "enum": [
            "active",
            "completed"
          ]
        },
        "returned": {
          "minimum": 0,
          "type": "integer"
        },
        "schema": {
          "const": "zotero-agents.library-full-index.v1"
        },
        "scope": {
          "const": "top-level-regular"
        },
        "snapshotId": {
          "maxLength": 256,
          "minLength": 1,
          "type": "string"
        }
      },
      "required": [
        "schema",
        "snapshotId",
        "libraryId",
        "scope",
        "order",
        "batchSize",
        "batchIndex",
        "items",
        "nextCursor",
        "hasMore",
        "returned",
        "deliveredItems",
        "deliveredBatches",
        "outcome"
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

## 示例

### query：仅形状示例

--query 的最小 JSON 形状。

```console
zotero-bridge library snapshot --query '{"batchSize":500,"libraryId":1}'
```

前置条件：

- 执行前，将示例中的标识符与值替换为对所选 Zotero 库、workflow、provider 或 capability 有效的输入。

## 完整命令描述符

此封闭描述符是 `surface describe` 返回的机器可读命令契约；此处包含它，以便在不加载另一份命令参考的情况下，本卡片仍可独立审计。

```json
{
  "approvalContract": {
    "kind": "none",
    "scope": "No Zotero UI approval; provider runtimes may still request their own permission.",
    "timing": "none"
  },
  "arguments": [
    {
      "aliases": [
        "input"
      ],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Read query as inline JSON, a file path, @file, or '-' for stdin",
      "id": "query",
      "kind": "option",
      "longHelp": "Read query. Use inline JSON by default, such as '{\"cursor\":1}'. Use a file path containing JSON, @file syntax, or '-' for stdin only when that input source is intentional. Omit for {}.",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--query",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "argv": [
    "library",
    "snapshot"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "query",
      "required": false,
      "takesValue": true,
      "token": "--query",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "binding": "passthrough",
  "category": "read",
  "command": "library snapshot",
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
    "query": {
      "examples": [
        {
          "description": "Minimal JSON shape for --query.",
          "kind": "shape-only",
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "value": {
            "batchSize": 500,
            "libraryId": 1
          }
        }
      ],
      "required": false,
      "requiredWhen": [],
      "schema": {
        "additionalProperties": false,
        "dependentRequired": {
          "cursor": [
            "snapshotId"
          ],
          "snapshotId": [
            "cursor"
          ]
        },
        "properties": {
          "batchSize": {
            "maximum": 1000,
            "minimum": 1,
            "type": "integer"
          },
          "cursor": {
            "maxLength": 256,
            "minLength": 1,
            "type": "string"
          },
          "libraryId": {
            "minimum": 1,
            "type": "integer"
          },
          "snapshotId": {
            "maxLength": 256,
            "minLength": 1,
            "type": "string"
          }
        },
        "required": [
          "libraryId"
        ],
        "type": "object"
      },
      "schemaSource": "target-capability",
      "token": "--query"
    }
  },
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "query": {
        "description": "Read query as inline JSON, a file path, @file, or '-' for stdin",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "operationalAliases": [
    "library snapshot",
    "library",
    "snapshot",
    "query",
    "JSON_OR_FILE"
  ],
  "outputBoundary": {
    "continuation": [
      "data.snapshotId",
      "data.nextCursor",
      "data.hasMore",
      "data.returned",
      "data.deliveredItems",
      "data.deliveredBatches",
      "data.outcome"
    ],
    "cursorInput": "query",
    "defaultLimit": 500,
    "maxLimit": 1000,
    "section": "data.items",
    "strategy": "cursor"
  },
  "pagination": "cursor",
  "payloadSchema": {
    "additionalProperties": false,
    "dependentRequired": {
      "cursor": [
        "snapshotId"
      ],
      "snapshotId": [
        "cursor"
      ]
    },
    "properties": {
      "batchSize": {
        "maximum": 1000,
        "minimum": 1,
        "type": "integer"
      },
      "cursor": {
        "maxLength": 256,
        "minLength": 1,
        "type": "string"
      },
      "libraryId": {
        "minimum": 1,
        "type": "integer"
      },
      "snapshotId": {
        "maxLength": 256,
        "minLength": 1,
        "type": "string"
      }
    },
    "required": [
      "libraryId"
    ],
    "type": "object"
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
        "const": "library.sync_snapshot"
      },
      "data": {
        "additionalProperties": false,
        "oneOf": [
          {
            "not": {
              "required": [
                "completionEvidence"
              ]
            },
            "properties": {
              "hasMore": {
                "const": true
              },
              "nextCursor": {
                "minLength": 1,
                "type": "string"
              },
              "outcome": {
                "const": "active"
              }
            }
          },
          {
            "properties": {
              "hasMore": {
                "const": false
              },
              "nextCursor": {
                "type": "null"
              },
              "outcome": {
                "const": "completed"
              }
            },
            "required": [
              "completionEvidence"
            ]
          }
        ],
        "properties": {
          "batchIndex": {
            "minimum": 0,
            "type": "integer"
          },
          "batchSize": {
            "maximum": 1000,
            "minimum": 1,
            "type": "integer"
          },
          "completionEvidence": {
            "additionalProperties": false,
            "properties": {
              "completedAt": {
                "type": "string"
              },
              "contentDigest": {
                "pattern": "^sha256:[0-9a-f]{64}$",
                "type": "string"
              },
              "libraryId": {
                "minimum": 1,
                "type": "integer"
              },
              "order": {
                "const": "stable_identity"
              },
              "schema": {
                "const": "zotero-agents.library-full-index.v1"
              },
              "scope": {
                "const": "top-level-regular"
              },
              "snapshotId": {
                "maxLength": 256,
                "minLength": 1,
                "type": "string"
              },
              "totalBatches": {
                "minimum": 1,
                "type": "integer"
              },
              "totalItems": {
                "maximum": 1000000,
                "minimum": 0,
                "type": "integer"
              }
            },
            "required": [
              "snapshotId",
              "schema",
              "libraryId",
              "scope",
              "totalItems",
              "totalBatches",
              "order",
              "contentDigest",
              "completedAt"
            ],
            "type": "object"
          },
          "deliveredBatches": {
            "minimum": 0,
            "type": "integer"
          },
          "deliveredItems": {
            "minimum": 0,
            "type": "integer"
          },
          "hasMore": {
            "type": "boolean"
          },
          "items": {
            "items": {
              "additionalProperties": false,
              "properties": {
                "annotationCount": {
                  "minimum": 0,
                  "type": "integer"
                },
                "attachmentCount": {
                  "minimum": 0,
                  "type": "integer"
                },
                "collectionRefs": {
                  "items": {
                    "additionalProperties": false,
                    "properties": {
                      "key": {
                        "maxLength": 128,
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
                  "type": "array"
                },
                "creators": {
                  "items": {
                    "anyOf": [
                      {
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
                          "representation": {
                            "const": "two_field"
                          }
                        },
                        "required": [
                          "representation",
                          "creatorType",
                          "firstName",
                          "lastName"
                        ],
                        "type": "object"
                      },
                      {
                        "additionalProperties": false,
                        "properties": {
                          "creatorType": {
                            "type": "string"
                          },
                          "name": {
                            "minLength": 1,
                            "type": "string"
                          },
                          "representation": {
                            "const": "single_field"
                          }
                        },
                        "required": [
                          "representation",
                          "creatorType",
                          "name"
                        ],
                        "type": "object"
                      }
                    ]
                  },
                  "type": "array"
                },
                "date": {
                  "type": "string"
                },
                "identifiers": {
                  "additionalProperties": false,
                  "properties": {
                    "arxiv": {
                      "type": [
                        "string",
                        "null"
                      ]
                    },
                    "doi": {
                      "type": [
                        "string",
                        "null"
                      ]
                    },
                    "isbn": {
                      "type": [
                        "string",
                        "null"
                      ]
                    },
                    "issn": {
                      "type": [
                        "string",
                        "null"
                      ]
                    },
                    "pmid": {
                      "type": [
                        "string",
                        "null"
                      ]
                    }
                  },
                  "required": [
                    "doi",
                    "isbn",
                    "issn",
                    "arxiv",
                    "pmid"
                  ],
                  "type": "object"
                },
                "itemType": {
                  "type": "string"
                },
                "kind": {
                  "const": "regular"
                },
                "modifiedAt": {
                  "type": "string"
                },
                "noteCount": {
                  "minimum": 0,
                  "type": "integer"
                },
                "parentRef": {
                  "anyOf": [
                    {
                      "additionalProperties": false,
                      "properties": {
                        "key": {
                          "maxLength": 128,
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
                    {
                      "type": "null"
                    }
                  ]
                },
                "publicationTitle": {
                  "type": "string"
                },
                "ref": {
                  "additionalProperties": false,
                  "properties": {
                    "key": {
                      "maxLength": 128,
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
                "revision": {
                  "minLength": 1,
                  "type": "string"
                },
                "state": {
                  "const": "active"
                },
                "tags": {
                  "items": {
                    "type": "string"
                  },
                  "type": "array"
                },
                "title": {
                  "type": "string"
                },
                "url": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "year": {
                  "type": [
                    "string",
                    "null"
                  ]
                }
              },
              "required": [
                "ref",
                "kind",
                "itemType",
                "title",
                "parentRef",
                "state",
                "revision",
                "tags",
                "collectionRefs",
                "creators",
                "date",
                "year",
                "publicationTitle",
                "identifiers",
                "url",
                "noteCount",
                "attachmentCount",
                "annotationCount",
                "modifiedAt"
              ],
              "type": "object"
            },
            "maxItems": 1000,
            "type": "array"
          },
          "libraryId": {
            "minimum": 1,
            "type": "integer"
          },
          "nextCursor": {
            "type": [
              "string",
              "null"
            ]
          },
          "order": {
            "const": "stable_identity"
          },
          "outcome": {
            "enum": [
              "active",
              "completed"
            ]
          },
          "returned": {
            "minimum": 0,
            "type": "integer"
          },
          "schema": {
            "const": "zotero-agents.library-full-index.v1"
          },
          "scope": {
            "const": "top-level-regular"
          },
          "snapshotId": {
            "maxLength": 256,
            "minLength": 1,
            "type": "string"
          }
        },
        "required": [
          "schema",
          "snapshotId",
          "libraryId",
          "scope",
          "order",
          "batchSize",
          "batchIndex",
          "items",
          "nextCursor",
          "hasMore",
          "returned",
          "deliveredItems",
          "deliveredBatches",
          "outcome"
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
  "summary": "Read a fixed Zotero full-library snapshot page",
  "targets": [
    {
      "kind": "capability",
      "target": "library.sync_snapshot"
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

- 规范 argv 路径：`library` `snapshot`。
- 输出边界：`cursor`；受管辖详情：{"continuation":["data.snapshotId","data.nextCursor","data.hasMore","data.returned","data.deliveredItems","data.deliveredBatches","data.outcome"],"cursorInput":"query","defaultLimit":500,"maxLimit":1000,"section":"data.items","strategy":"cursor"}。
- 分页：`cursor`。
- 类别：`read`；危险级别：`none`。
- 结构化绑定模式：`passthrough`。
- 意图可见性：`visible`。
- 操作别名：`library snapshot`、`library`、`snapshot`、`query`、`JSON_OR_FILE`。

### 效果

```json
[
  {
    "description": "Reads state without changing Zotero-managed data.",
    "kind": "none",
    "stateChanged": false
  }
]
```

### 审批

```json
{
  "kind": "none",
  "scope": "No Zotero UI approval; provider runtimes may still request their own permission.",
  "timing": "none"
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
    "action": "Inspect the error and retry only when retryable is true.",
    "nextCommand": "surface describe",
    "requiresHandles": [],
    "stateCheck": "none",
    "when": "The read fails or returns incomplete evidence."
  }
]
```

### 目标

```json
[
  {
    "kind": "capability",
    "target": "library.sync_snapshot"
  }
]
```
