# `zotero-bridge library note get`

读取一个 Zotero note 正文块

## 用法

```console
zotero-bridge library note get [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--key <KEY>] [--id <ID>] [--library-id <LIBRARY_ID>] [--format <FORMAT>] [--offset <OFFSET>] [--max-chars <MAX_CHARS>]
```

全局选项可出现在叶命令之前或之后。此叶命令没有结构化 JSON 输入。`--schema` 返回 `command_input_schema_unavailable`；请使用命令帮助或 `surface describe` 检查调用契约。

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
| --key | key | option | no | — | KEY | no | — | id | Zotero item 键 |
| --id | id | option | no | — | ID | no | — | key | Zotero item 的数字 id |
| --library-id | library_id | option | no | — | LIBRARY_ID | no | — | — | 用于 key 查找的 Zotero library id |
| --format | format | option | no | — | FORMAT; values: text, html | no | — | — | Payload 格式 |
| --offset | offset | option | no | — | OFFSET | no | — | — | 起始 offset |
| --max-chars | max_chars | option | no | — | MAX_CHARS | no | — | — | 最大字符数 |

## 调用 schema

```json
{
  "additionalProperties": false,
  "allOf": [
    {
      "not": {
        "required": [
          "id",
          "key"
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
  "properties": {
    "format": {
      "description": "Payload format",
      "type": "string"
    },
    "id": {
      "description": "Zotero item numeric id",
      "type": "string"
    },
    "key": {
      "description": "Zotero item key",
      "type": "string"
    },
    "library-id": {
      "description": "Zotero library id for key lookup",
      "type": "string"
    },
    "max-chars": {
      "description": "Maximum characters",
      "type": "string"
    },
    "offset": {
      "description": "Start offset",
      "type": "string"
    }
  },
  "required": [],
  "type": "object"
}
```

## 结构化输入 schema

此命令没有结构化 JSON 输入参数。

## 组合载荷 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "format": {
      "enum": [
        "html",
        "text"
      ],
      "type": "string"
    },
    "id": {
      "type": [
        "number",
        "string"
      ]
    },
    "key": {
      "minLength": 1,
      "type": "string"
    },
    "libraryId": {
      "type": [
        "number",
        "string"
      ]
    },
    "maxChars": {
      "maximum": 16000,
      "minimum": 1,
      "type": "integer"
    },
    "offset": {
      "description": "Ordinary note content offset; managed payloads are returned complete.",
      "minimum": 0,
      "type": "integer"
    }
  },
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
      "argument": "key",
      "field": "key",
      "required": false,
      "transform": "identity"
    },
    {
      "argument": "id",
      "field": "id",
      "required": false,
      "transform": "identity"
    },
    {
      "argument": "library_id",
      "field": "libraryId",
      "required": false,
      "transform": "identity"
    },
    {
      "argument": "format",
      "field": "format",
      "required": false,
      "transform": "identity"
    },
    {
      "argument": "offset",
      "field": "offset",
      "required": false,
      "transform": "identity"
    },
    {
      "argument": "max_chars",
      "field": "maxChars",
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
      "const": "library.get_note_detail"
    },
    "data": {
      "$defs": {
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
        }
      },
      "$schema": "https://json-schema.org/draft/2020-12/schema",
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
            "hasMore": {
              "type": "boolean"
            },
            "kind": {
              "const": "ordinary"
            },
            "maxChars": {
              "minimum": 1,
              "type": "integer"
            },
            "nextOffset": {
              "minimum": 0,
              "type": "integer"
            },
            "offset": {
              "minimum": 0,
              "type": "integer"
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
            },
            "totalChars": {
              "minimum": 0,
              "type": "integer"
            },
            "truncated": {
              "type": "boolean"
            }
          },
          "required": [
            "kind",
            "ref",
            "parentRef",
            "title",
            "format",
            "content",
            "revision",
            "offset",
            "nextOffset",
            "totalChars",
            "hasMore",
            "truncated",
            "maxChars"
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

没有适用的结构化输入示例。请依据参数表构建 argv，并在执行前用 `surface describe` 确认命令。

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
      "conflictsWith": [
        "id"
      ],
      "defaultValues": [],
      "global": false,
      "help": "Zotero item key",
      "id": "key",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--key",
      "valueNames": [
        "KEY"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [
        "key"
      ],
      "defaultValues": [],
      "global": false,
      "help": "Zotero item numeric id",
      "id": "id",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--id",
      "valueNames": [
        "ID"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Zotero library id for key lookup",
      "id": "library_id",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--library-id",
      "valueNames": [
        "LIBRARY_ID"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Payload format",
      "id": "format",
      "kind": "option",
      "possibleValues": [
        "text",
        "html"
      ],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--format",
      "valueNames": [
        "FORMAT"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Start offset",
      "id": "offset",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--offset",
      "valueNames": [
        "OFFSET"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Maximum characters",
      "id": "max_chars",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--max-chars",
      "valueNames": [
        "MAX_CHARS"
      ]
    }
  ],
  "argv": [
    "library",
    "note",
    "get"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "key",
      "required": false,
      "takesValue": true,
      "token": "--key",
      "valueNames": [
        "KEY"
      ]
    },
    {
      "kind": "option",
      "property": "id",
      "required": false,
      "takesValue": true,
      "token": "--id",
      "valueNames": [
        "ID"
      ]
    },
    {
      "kind": "option",
      "property": "library-id",
      "required": false,
      "takesValue": true,
      "token": "--library-id",
      "valueNames": [
        "LIBRARY_ID"
      ]
    },
    {
      "kind": "option",
      "property": "format",
      "required": false,
      "takesValue": true,
      "token": "--format",
      "valueNames": [
        "FORMAT"
      ]
    },
    {
      "kind": "option",
      "property": "offset",
      "required": false,
      "takesValue": true,
      "token": "--offset",
      "valueNames": [
        "OFFSET"
      ]
    },
    {
      "kind": "option",
      "property": "max-chars",
      "required": false,
      "takesValue": true,
      "token": "--max-chars",
      "valueNames": [
        "MAX_CHARS"
      ]
    }
  ],
  "binding": "object",
  "category": "read",
  "command": "library note get",
  "composition": {
    "constants": {},
    "mappings": [
      {
        "argument": "key",
        "field": "key",
        "required": false,
        "transform": "identity"
      },
      {
        "argument": "id",
        "field": "id",
        "required": false,
        "transform": "identity"
      },
      {
        "argument": "library_id",
        "field": "libraryId",
        "required": false,
        "transform": "identity"
      },
      {
        "argument": "format",
        "field": "format",
        "required": false,
        "transform": "identity"
      },
      {
        "argument": "offset",
        "field": "offset",
        "required": false,
        "transform": "identity"
      },
      {
        "argument": "max_chars",
        "field": "maxChars",
        "required": false,
        "transform": "identity"
      }
    ]
  },
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
  "inputSchemas": {},
  "invocationSchema": {
    "additionalProperties": false,
    "allOf": [
      {
        "not": {
          "required": [
            "id",
            "key"
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
    "properties": {
      "format": {
        "description": "Payload format",
        "type": "string"
      },
      "id": {
        "description": "Zotero item numeric id",
        "type": "string"
      },
      "key": {
        "description": "Zotero item key",
        "type": "string"
      },
      "library-id": {
        "description": "Zotero library id for key lookup",
        "type": "string"
      },
      "max-chars": {
        "description": "Maximum characters",
        "type": "string"
      },
      "offset": {
        "description": "Start offset",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "operationalAliases": [
    "library note get",
    "library",
    "note",
    "get",
    "key",
    "KEY",
    "id",
    "ID",
    "library_id",
    "library-id",
    "LIBRARY_ID",
    "format",
    "FORMAT",
    "offset",
    "OFFSET",
    "max_chars",
    "max-chars",
    "MAX_CHARS"
  ],
  "outputBoundary": {
    "continuation": [
      "data.nextOffset",
      "data.hasMore",
      "data.totalChars",
      "data.truncated",
      "data.maxChars"
    ],
    "cursorInput": "offset",
    "defaultLimit": 8000,
    "maxLimit": 16000,
    "section": "data.content",
    "strategy": "offset"
  },
  "pagination": "cursor",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "format": {
        "enum": [
          "html",
          "text"
        ],
        "type": "string"
      },
      "id": {
        "type": [
          "number",
          "string"
        ]
      },
      "key": {
        "minLength": 1,
        "type": "string"
      },
      "libraryId": {
        "type": [
          "number",
          "string"
        ]
      },
      "maxChars": {
        "maximum": 16000,
        "minimum": 1,
        "type": "integer"
      },
      "offset": {
        "description": "Ordinary note content offset; managed payloads are returned complete.",
        "minimum": 0,
        "type": "integer"
      }
    },
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
        "const": "library.get_note_detail"
      },
      "data": {
        "$defs": {
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
          }
        },
        "$schema": "https://json-schema.org/draft/2020-12/schema",
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
              "hasMore": {
                "type": "boolean"
              },
              "kind": {
                "const": "ordinary"
              },
              "maxChars": {
                "minimum": 1,
                "type": "integer"
              },
              "nextOffset": {
                "minimum": 0,
                "type": "integer"
              },
              "offset": {
                "minimum": 0,
                "type": "integer"
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
              },
              "totalChars": {
                "minimum": 0,
                "type": "integer"
              },
              "truncated": {
                "type": "boolean"
              }
            },
            "required": [
              "kind",
              "ref",
              "parentRef",
              "title",
              "format",
              "content",
              "revision",
              "offset",
              "nextOffset",
              "totalChars",
              "hasMore",
              "truncated",
              "maxChars"
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
      }
    },
    "required": [
      "capability",
      "approval",
      "data"
    ],
    "type": "object"
  },
  "summary": "Read one Zotero note body chunk",
  "targets": [
    {
      "kind": "capability",
      "target": "library.get_note_detail"
    }
  ]
}
```

## 参数失败与恢复契约

参数失败以单个 JSON 错误信封返回。先检查 `error.code`，然后要求 `error.details.schema` 为 `host-bridge.argument-error.v1`，再使用结构化边界字段。保留规范命令、已净化的输入以及任何已返回的类型化句柄；绝不在证据中包含完整的原始载荷。

- `argv` 报告缺失、未知、冲突或无效的 CLI 参数。请依据本卡片的参数表或当前命令帮助重建 argv。
- `json_source` 报告 stdin 或文件源不可读。请修正该源，而不要将值挪到另一个绑定。
- `json_syntax` 以安全行列上下文报告无效 JSON。在解读领域字段前先修复语法。
- 此叶命令没有结构化 JSON 输入，因此 `command_input` 不是预期的调用边界。请使用 `surface describe` 了解其标量与位置参数契约。
- `payload_contract` 表示 CLI 组合出的 capability 载荷在网络 I/O 之前违反了可执行契约。将其视为实现缺陷；不要用原始传输绕过语义命令。
- `command_result` 表示 Host 响应或本地结果未通过其可执行结果 schema。不得将其作为成功证据接受或报告。
- 违规数组经过脱敏、确定性排序，并最多保留八项。当 `truncated` 为 true 时，应修正所报告的违规并重新校验，而不是要求披露秘密或完整载荷。

## 操作契约

- 规范 argv 路径：`library` `note` `get`。
- 输出边界：`offset`；受管辖的详情：{"continuation":["data.nextOffset","data.hasMore","data.totalChars","data.truncated","data.maxChars"],"cursorInput":"offset","defaultLimit":8000,"maxLimit":16000,"section":"data.content","strategy":"offset"}。
- 分页：`cursor`。
- 类别：`read`；危险级别：`none`。
- 结构化绑定模式：`object`。
- 意图可见性：`visible`。
- 操作别名：`library note get`、`library`、`note`、`get`、`key`、`KEY`、`id`、`ID`、`library_id`、`library-id`、`LIBRARY_ID`、`format`、`FORMAT`、`offset`、`OFFSET`、`max_chars`、`max-chars`、`MAX_CHARS`。

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
    "target": "library.get_note_detail"
  }
]
```
