# `zotero-bridge library item search`

搜索 Zotero library items

## 用法

```console
zotero-bridge library item search [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --query <JSON_OR_FILE>
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
| --query | query | option | yes | — | JSON_OR_FILE | no | — | — | 规范的有界库搜索请求 JSON。可使用内嵌 JSON，例如 '{"query":"graph","limit":10,"maxResults":100}'，也可使用包含 JSON 的文件路径、@file 语法或从 stdin 读取的 '-'。继续查询时，请在同一请求容器中原样保留返回的 cursor。 |

## 调用 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "query": {
      "description": "Canonical bounded library search request as JSON",
      "type": "string"
    }
  },
  "required": [
    "query"
  ],
  "type": "object"
}
```

## 结构化输入 schema

### `--query`（query）

必需：`true`。

```json
{
  "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/EvidenceSearchRequest"
}
```

## 组合载荷 schema

```json
{
  "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/EvidenceSearchRequest"
}
```

## 载荷组合

此命令没有独立的字段映射程序。其绑定模式为直接可执行：passthrough 使用唯一的结构化来源，而 `none` 与 `raw` 保持其声明的封闭行为。

`composition`：`null`。

## 结果 schema

```json
{
  "$defs": {
    "regularItemSummary": {
      "additionalProperties": false,
      "properties": {
        "collectionRefs": {
          "items": {
            "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/PortableItemRef"
          },
          "type": "array"
        },
        "creators": {
          "items": {
            "oneOf": [
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
        "itemType": {
          "type": "string"
        },
        "kind": {
          "const": "regular"
        },
        "parentRef": {
          "oneOf": [
            {
              "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/PortableItemRef"
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
          "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/PortableItemRef"
        },
        "revision": {
          "type": "string"
        },
        "state": {
          "enum": [
            "active",
            "trashed"
          ]
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
        "publicationTitle"
      ],
      "type": "object"
    }
  },
  "additionalProperties": false,
  "properties": {
    "approval": {
      "minLength": 1,
      "type": "string"
    },
    "capability": {
      "const": "library.search_items"
    },
    "data": {
      "$defs": {
        "regularItemSummary": {
          "additionalProperties": false,
          "properties": {
            "collectionRefs": {
              "items": {
                "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/PortableItemRef"
              },
              "type": "array"
            },
            "creators": {
              "items": {
                "oneOf": [
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
            "itemType": {
              "type": "string"
            },
            "kind": {
              "const": "regular"
            },
            "parentRef": {
              "oneOf": [
                {
                  "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/PortableItemRef"
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
              "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/PortableItemRef"
            },
            "revision": {
              "type": "string"
            },
            "state": {
              "enum": [
                "active",
                "trashed"
              ]
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
            "publicationTitle"
          ],
          "type": "object"
        }
      },
      "allOf": [
        {
          "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/SearchResultBase"
        },
        {
          "properties": {
            "coverage": {
              "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/LibrarySearchCoverage"
            },
            "hasMore": {
              "type": "boolean"
            },
            "method": {
              "const": "lexical"
            },
            "nextCursor": {
              "oneOf": [
                {
                  "maxLength": 4096,
                  "minLength": 1,
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ]
            },
            "results": {
              "items": {
                "additionalProperties": false,
                "properties": {
                  "item": {
                    "$ref": "#/$defs/regularItemSummary"
                  },
                  "matches": {
                    "items": {
                      "additionalProperties": false,
                      "properties": {
                        "location": {
                          "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/EvidenceLocation"
                        },
                        "matchedTerms": {
                          "items": {
                            "maxLength": 4096,
                            "type": "string"
                          },
                          "type": "array"
                        },
                        "phraseMatch": {
                          "type": "boolean"
                        },
                        "source": {
                          "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/EvidenceSource"
                        },
                        "sourceVersion": {
                          "maxLength": 256,
                          "minLength": 1,
                          "type": "string"
                        }
                      },
                      "required": [
                        "source",
                        "sourceVersion",
                        "location",
                        "matchedTerms",
                        "phraseMatch"
                      ],
                      "type": "object"
                    },
                    "type": "array"
                  }
                },
                "required": [
                  "item",
                  "matches"
                ],
                "type": "object"
              },
              "maxItems": 100,
              "type": "array"
            },
            "total": {
              "oneOf": [
                {
                  "maximum": 1000000,
                  "minimum": 0,
                  "type": "integer"
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "results",
            "coverage"
          ],
          "type": "object"
        }
      ],
      "unevaluatedProperties": false
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

由 --query 完整承载的规范词法搜索请求。

```console
zotero-bridge library item search --query '{"libraryIds":[1],"limit":25,"maxResults":100,"query":"example phrase","sourceKinds":["metadata","fulltext","analysis"]}'
```

前置条件：

- 使用不超过 4096 个 UTF-16 代码单元的非空 query；将示例标识符替换为当前 Zotero profile 中有效的 library 与 portable item ref。

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
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Canonical bounded library search request as JSON",
      "id": "query",
      "kind": "option",
      "longHelp": "Canonical bounded library search request JSON. Use inline JSON such as '{\"query\":\"graph\",\"limit\":10,\"maxResults\":100}', a file path containing JSON, @file syntax, or '-' to read JSON from stdin. Keep the returned cursor unchanged in this same request container to continue.",
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "--query",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "argv": [
    "library",
    "item",
    "search"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "query",
      "required": true,
      "takesValue": true,
      "token": "--query",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "binding": "passthrough",
  "category": "read",
  "command": "library item search",
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
          "description": "Canonical bounded lexical-search request carried intact by --query.",
          "kind": "shape-only",
          "prerequisites": [
            "Use a non-empty query no longer than 4096 UTF-16 code units; replace example identifiers with libraries and portable item refs valid for the current Zotero profile."
          ],
          "value": {
            "libraryIds": [
              1
            ],
            "limit": 25,
            "maxResults": 100,
            "query": "example phrase",
            "sourceKinds": [
              "metadata",
              "fulltext",
              "analysis"
            ]
          }
        }
      ],
      "required": true,
      "requiredWhen": [],
      "schema": {
        "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/EvidenceSearchRequest"
      },
      "schemaSource": "target-capability",
      "token": "--query"
    }
  },
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "query": {
        "description": "Canonical bounded library search request as JSON",
        "type": "string"
      }
    },
    "required": [
      "query"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "library item search",
    "library",
    "item",
    "search",
    "query",
    "JSON_OR_FILE"
  ],
  "outputBoundary": {
    "continuation": [
      "data.nextCursor",
      "data.hasMore",
      "data.total"
    ],
    "cursorInput": "cursor",
    "defaultLimit": 25,
    "maxLimit": 100,
    "section": "data.results",
    "strategy": "cursor"
  },
  "pagination": "cursor",
  "payloadSchema": {
    "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/EvidenceSearchRequest"
  },
  "recovery": [
    {
      "action": "Preserve the structured search error. Do not retry or rerun with the rejected cursor; start a fresh search only when a new search is intended and inspect every returned coverage issue before claiming completeness. Run `zotero-bridge surface describe 'library item search'` to confirm the live request and cursor contract.",
      "nextCommand": "surface describe",
      "requiresHandles": [],
      "stateCheck": "none",
      "when": "The read fails or returns a stale or basis-mismatched search cursor."
    }
  ],
  "resultSchema": {
    "$defs": {
      "regularItemSummary": {
        "additionalProperties": false,
        "properties": {
          "collectionRefs": {
            "items": {
              "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/PortableItemRef"
            },
            "type": "array"
          },
          "creators": {
            "items": {
              "oneOf": [
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
          "itemType": {
            "type": "string"
          },
          "kind": {
            "const": "regular"
          },
          "parentRef": {
            "oneOf": [
              {
                "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/PortableItemRef"
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
            "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/PortableItemRef"
          },
          "revision": {
            "type": "string"
          },
          "state": {
            "enum": [
              "active",
              "trashed"
            ]
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
          "publicationTitle"
        ],
        "type": "object"
      }
    },
    "additionalProperties": false,
    "properties": {
      "approval": {
        "minLength": 1,
        "type": "string"
      },
      "capability": {
        "const": "library.search_items"
      },
      "data": {
        "$defs": {
          "regularItemSummary": {
            "additionalProperties": false,
            "properties": {
              "collectionRefs": {
                "items": {
                  "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/PortableItemRef"
                },
                "type": "array"
              },
              "creators": {
                "items": {
                  "oneOf": [
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
              "itemType": {
                "type": "string"
              },
              "kind": {
                "const": "regular"
              },
              "parentRef": {
                "oneOf": [
                  {
                    "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/PortableItemRef"
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
                "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/PortableItemRef"
              },
              "revision": {
                "type": "string"
              },
              "state": {
                "enum": [
                  "active",
                  "trashed"
                ]
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
              "publicationTitle"
            ],
            "type": "object"
          }
        },
        "allOf": [
          {
            "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/SearchResultBase"
          },
          {
            "properties": {
              "coverage": {
                "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/LibrarySearchCoverage"
              },
              "hasMore": {
                "type": "boolean"
              },
              "method": {
                "const": "lexical"
              },
              "nextCursor": {
                "oneOf": [
                  {
                    "maxLength": 4096,
                    "minLength": 1,
                    "type": "string"
                  },
                  {
                    "type": "null"
                  }
                ]
              },
              "results": {
                "items": {
                  "additionalProperties": false,
                  "properties": {
                    "item": {
                      "$ref": "#/$defs/regularItemSummary"
                    },
                    "matches": {
                      "items": {
                        "additionalProperties": false,
                        "properties": {
                          "location": {
                            "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/EvidenceLocation"
                          },
                          "matchedTerms": {
                            "items": {
                              "maxLength": 4096,
                              "type": "string"
                            },
                            "type": "array"
                          },
                          "phraseMatch": {
                            "type": "boolean"
                          },
                          "source": {
                            "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/EvidenceSource"
                          },
                          "sourceVersion": {
                            "maxLength": 256,
                            "minLength": 1,
                            "type": "string"
                          }
                        },
                        "required": [
                          "source",
                          "sourceVersion",
                          "location",
                          "matchedTerms",
                          "phraseMatch"
                        ],
                        "type": "object"
                      },
                      "type": "array"
                    }
                  },
                  "required": [
                    "item",
                    "matches"
                  ],
                  "type": "object"
                },
                "maxItems": 100,
                "type": "array"
              },
              "total": {
                "oneOf": [
                  {
                    "maximum": 1000000,
                    "minimum": 0,
                    "type": "integer"
                  },
                  {
                    "type": "null"
                  }
                ]
              }
            },
            "required": [
              "results",
              "coverage"
            ],
            "type": "object"
          }
        ],
        "unevaluatedProperties": false
      }
    },
    "required": [
      "capability",
      "approval",
      "data"
    ],
    "type": "object"
  },
  "summary": "Search Zotero library items",
  "targets": [
    {
      "kind": "capability",
      "target": "library.search_items"
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

- 规范 argv 路径：`library` `item` `search`。
- 输出边界：`cursor`；受管辖细节：{"continuation":["data.nextCursor","data.hasMore","data.total"],"cursorInput":"cursor","defaultLimit":25,"maxLimit":100,"section":"data.results","strategy":"cursor"}。
- 分页：`cursor`。
- 类别：`read`；危险级别：`none`。
- 结构化绑定模式：`passthrough`。
- 意图可见性：`visible`。
- 操作别名：`library item search`、`library`、`item`、`search`、`query`、`JSON_OR_FILE`。

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
    "action": "Preserve the structured search error. Do not retry or rerun with the rejected cursor; start a fresh search only when a new search is intended and inspect every returned coverage issue before claiming completeness. Run `zotero-bridge surface describe 'library item search'` to confirm the live request and cursor contract.",
    "nextCommand": "surface describe",
    "requiresHandles": [],
    "stateCheck": "none",
    "when": "The read fails or returns a stale or basis-mismatched search cursor."
  }
]
```

### 目标

```json
[
  {
    "kind": "capability",
    "target": "library.search_items"
  }
]
```
