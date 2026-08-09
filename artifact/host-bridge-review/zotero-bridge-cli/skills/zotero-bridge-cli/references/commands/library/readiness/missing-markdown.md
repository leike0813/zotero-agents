# `zotero-bridge library readiness missing-markdown`

List Zotero items missing same-stem source Markdown

## 用法

```console
zotero-bridge library readiness missing-markdown [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--query <JSON_OR_FILE>]
```

全局选项可位于叶命令之前或之后。 使用 `--schema` 可在不加载 profile、也不连接 Zotero 的情况下检查原始结构化输入 schema。

## 全局参数

| Token | Id | 类型 | 必填 | 条件必填 | 值 / 数量 | 可重复 | 环境变量 | 冲突 | 说明 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --endpoint | endpoint | option | no | — | ENDPOINT | no | ZOTERO_BRIDGE_ENDPOINT | — | Zotero Bridge service endpoint base URL. If omitted, the CLI reads ZOTERO_BRIDGE_ENDPOINT or a profile file. The CLI does not guess random bridge ports. |
| --operation-id | operation_id | option | no | — | ID | no | ZOTERO_BRIDGE_OPERATION_ID | — | Opaque idempotency id for a state-changing Zotero request |
| --profile | profile | option | no | — | PATH | no | ZOTERO_BRIDGE_PROFILE | — | Path to a Zotero Bridge connection-profile JSON file. If omitted, the CLI tries the Zotero Agents well-known profile. ACP run profiles usually reference tokenEnv; the local well-known profile may contain a bearer token protected by user-level file permissions. |
| --schema | schema | option | no | — | SCHEMA; values: true, false | no | — | — | Print the versioned raw JSON Schemas and governed examples for one canonical leaf command. Schema mode is offline and does not load a profile, read Zotero Bridge configuration, or connect to Zotero. |

## 本地选项与位置参数

| Token | Id | 类型 | 必填 | 条件必填 | 值 / 数量 | 可重复 | 环境变量 | 冲突 | 说明 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --query | query | option | no | — | JSON_OR_FILE | no | — | — | Read query. Use inline JSON by default, such as '{"cursor":1}'. Use a file path containing JSON, @file syntax, or '-' for stdin only when that input source is intentional. Omit for {}. |

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

### `--query` (query)

必填： `false`.

```json
{
  "additionalProperties": false,
  "properties": {
    "collection": {},
    "collectionId": {
      "type": [
        "number",
        "string"
      ]
    },
    "collectionKey": {
      "type": "string"
    },
    "collectionLibraryId": {
      "type": [
        "number",
        "string"
      ]
    },
    "cursor": {
      "type": "string"
    },
    "itemType": {
      "type": "string"
    },
    "libraryId": {
      "type": [
        "number",
        "string"
      ]
    },
    "limit": {
      "minimum": 1,
      "type": [
        "number",
        "string"
      ]
    },
    "missing_only": {
      "type": [
        "boolean",
        "string",
        "number"
      ]
    },
    "query": {
      "type": "string"
    },
    "tag": {
      "type": "string"
    }
  },
  "type": "object"
}
```

## 组合 payload schema

```json
{
  "additionalProperties": false,
  "properties": {
    "checks": {},
    "collection": {},
    "collectionId": {
      "type": [
        "number",
        "string"
      ]
    },
    "collectionKey": {
      "type": "string"
    },
    "collectionLibraryId": {
      "type": [
        "number",
        "string"
      ]
    },
    "cursor": {
      "type": "string"
    },
    "itemType": {
      "type": "string"
    },
    "libraryId": {
      "type": [
        "number",
        "string"
      ]
    },
    "limit": {
      "minimum": 1,
      "type": [
        "number",
        "string"
      ]
    },
    "missingOnly": {
      "type": [
        "boolean",
        "string",
        "number"
      ]
    },
    "missing_only": {
      "type": [
        "boolean",
        "string",
        "number"
      ]
    },
    "query": {
      "type": "string"
    },
    "tag": {
      "type": "string"
    }
  },
  "type": "object"
}
```

## Payload 组合

以下内容由可执行命令契约定义 base source、fixed value、field mapping 与 closed transform。命令 handler 只向所引用的 Clap argument ID 提供值。

```json
{
  "base": {
    "argument": "query"
  },
  "constants": {
    "checks": [
      "markdown"
    ],
    "missingOnly": true
  },
  "mappings": []
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
      "const": "library.readiness_audit"
    },
    "data": {
      "additionalProperties": true,
      "description": "Result data owned by library.readiness_audit.",
      "properties": {
        "hasMore": {
          "type": "boolean"
        },
        "items": {
          "type": "array"
        },
        "limit": {
          "minimum": 0,
          "type": "integer"
        },
        "nextCursor": {
          "type": [
            "string",
            "null"
          ]
        },
        "returned": {
          "minimum": 0,
          "type": "integer"
        },
        "total": {
          "minimum": 0,
          "type": "integer"
        }
      },
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

## 示例

### query: shape-only

用于 --query 的最小 JSON 形状。

```console
zotero-bridge library readiness missing-markdown --query '{}'
```

前置条件：

- 执行前，请将示例标识符和值替换为对所选 Zotero library、workflow、provider 或 capability 有效的输入。

## 完整命令 descriptor

这个闭合 descriptor 是 `surface describe` 返回的机器可读命令合同；将它完整列在此处，使本卡片无需加载其他命令引用也能独立审计。

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
    "readiness",
    "missing-markdown"
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
  "binding": "overlay",
  "category": "read",
  "command": "library readiness missing-markdown",
  "composition": {
    "base": {
      "argument": "query"
    },
    "constants": {
      "checks": [
        "markdown"
      ],
      "missingOnly": true
    },
    "mappings": []
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
  "inputSchemas": {
    "query": {
      "examples": [
        {
          "description": "Minimal JSON shape for --query.",
          "kind": "shape-only",
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "value": {}
        }
      ],
      "required": false,
      "requiredWhen": [],
      "schema": {
        "additionalProperties": false,
        "properties": {
          "collection": {},
          "collectionId": {
            "type": [
              "number",
              "string"
            ]
          },
          "collectionKey": {
            "type": "string"
          },
          "collectionLibraryId": {
            "type": [
              "number",
              "string"
            ]
          },
          "cursor": {
            "type": "string"
          },
          "itemType": {
            "type": "string"
          },
          "libraryId": {
            "type": [
              "number",
              "string"
            ]
          },
          "limit": {
            "minimum": 1,
            "type": [
              "number",
              "string"
            ]
          },
          "missing_only": {
            "type": [
              "boolean",
              "string",
              "number"
            ]
          },
          "query": {
            "type": "string"
          },
          "tag": {
            "type": "string"
          }
        },
        "type": "object"
      },
      "schemaSource": "composition",
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
    "library readiness missing-markdown",
    "library",
    "readiness",
    "missing-markdown",
    "query",
    "JSON_OR_FILE"
  ],
  "outputBoundary": {
    "continuation": [
      "data.nextCursor",
      "data.hasMore",
      "data.returned",
      "data.total",
      "data.limit"
    ],
    "cursorInput": "cursor",
    "defaultLimit": 25,
    "maxLimit": 100,
    "section": "data.items",
    "strategy": "cursor"
  },
  "pagination": "cursor",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "checks": {},
      "collection": {},
      "collectionId": {
        "type": [
          "number",
          "string"
        ]
      },
      "collectionKey": {
        "type": "string"
      },
      "collectionLibraryId": {
        "type": [
          "number",
          "string"
        ]
      },
      "cursor": {
        "type": "string"
      },
      "itemType": {
        "type": "string"
      },
      "libraryId": {
        "type": [
          "number",
          "string"
        ]
      },
      "limit": {
        "minimum": 1,
        "type": [
          "number",
          "string"
        ]
      },
      "missingOnly": {
        "type": [
          "boolean",
          "string",
          "number"
        ]
      },
      "missing_only": {
        "type": [
          "boolean",
          "string",
          "number"
        ]
      },
      "query": {
        "type": "string"
      },
      "tag": {
        "type": "string"
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
        "const": "library.readiness_audit"
      },
      "data": {
        "additionalProperties": true,
        "description": "Result data owned by library.readiness_audit.",
        "properties": {
          "hasMore": {
            "type": "boolean"
          },
          "items": {
            "type": "array"
          },
          "limit": {
            "minimum": 0,
            "type": "integer"
          },
          "nextCursor": {
            "type": [
              "string",
              "null"
            ]
          },
          "returned": {
            "minimum": 0,
            "type": "integer"
          },
          "total": {
            "minimum": 0,
            "type": "integer"
          }
        },
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
  "summary": "List Zotero items missing same-stem source Markdown",
  "targets": [
    {
      "kind": "capability",
      "target": "library.readiness_audit"
    }
  ]
}
```

## 参数失败与恢复合同

参数失败以单个 JSON 错误 envelope 返回。先检查 `error.code`，再确认 `error.details.schema` 为 `host-bridge.argument-error.v1`，之后才能使用结构化边界字段。保留规范命令、已脱敏输入和任何已经返回的 typed handle；证据中绝不能包含完整原始 payload。

- `argv` 表示 CLI 参数缺失、未知、冲突或无效。依据本卡片的参数表或当前命令 help 重新构造 argv。
- `json_source` 表示 stdin 或文件源不可读。修正该输入源，不要把值移到另一种 binding。
- `json_syntax` 表示 JSON 无效，并提供安全的行列位置。先修复语法，再解释领域字段。
- `command_input` 表示结构化输入违反 schema。检查有界的 `violations`，然后对这个准确的叶命令运行 `--schema`，修正已声明的字段或类型；不得自行发明别名。
- `payload_contract` 表示 CLI 组合出的 capability payload 在网络 I/O 前就违反了可执行合同。将其视为实现错误；不得用原始 transport 绕过语义命令。
- `command_result` 表示 Host 响应或本地结果未通过可执行结果 schema。不得接受它，也不得把它报告为成功证据。
- violation 数组已经脱敏、按确定顺序排列，并限制为八项。当 `truncated` 为 true 时，先修正已报告的问题并重新验证，不得要求披露 secret 或完整 payload。

## 操作合同

- 规范 argv 路径： `library` `readiness` `missing-markdown`.
- 输出边界： `cursor`；受管详情： {"continuation":["data.nextCursor","data.hasMore","data.returned","data.total","data.limit"],"cursorInput":"cursor","defaultLimit":25,"maxLimit":100,"section":"data.items","strategy":"cursor"}.
- 分页： `cursor`.
- 类别： `read`；危险等级： `none`.
- 结构化 binding 模式： `overlay`.
- intent 可见性： `visible`.
- 操作别名： `library readiness missing-markdown`, `library`, `readiness`, `missing-markdown`, `query`, `JSON_OR_FILE`.

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

### Approval

```json
{
  "kind": "none",
  "scope": "No Zotero UI approval; provider runtimes may still request their own permission.",
  "timing": "none"
}
```

### Handle 转换

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

### Targets

```json
[
  {
    "kind": "capability",
    "target": "library.readiness_audit"
  }
]
```
