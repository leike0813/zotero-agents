# `zotero-bridge library readiness missing-markdown`

列出缺少同名 stem 源 Markdown 的 Zotero item

## 用法

```console
zotero-bridge library readiness missing-markdown [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--query <JSON_OR_FILE>]
```

全局选项可以出现在 leaf 命令之前或之后。使用 `--schema` 可以检查原始的结构化输入 schema，而无需加载 profile 或连接 Zotero。

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
| --query | query | option | no | — | JSON_OR_FILE | no | — | — | 读取 query。默认使用内联 JSON，例如 '{"cursor":1}'。仅在该输入源是刻意选择时，才使用包含 JSON 的文件路径、@file 语法或 '-' 表示 stdin。省略时为 {}。 |

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

必需：`false`。

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

The executable command contract owns the base source, fixed values, field mappings, and closed transforms shown below. Command handlers only provide values under the referenced Clap argument IDs.

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

### query: shape-only 示例

--query 的最小 JSON 形式。

```console
zotero-bridge library readiness missing-markdown --query '{}'
```

前置条件：

- 执行前，请将示例中的标识符和值替换为对所选 Zotero library、workflow、provider 或 capability 有效的输入。

## 完整命令描述符

此封闭描述符是 `surface describe` 返回的机器可读命令契约；此处包含它是为了让该卡片在无需加载其他命令参考的情况下仍可独立审计。

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

## 参数失败与恢复契约

Parameter failures are returned as one JSON error envelope. Inspect `error.code`, then require `error.details.schema` to be `host-bridge.argument-error.v1` before using the structured boundary fields. Preserve the canonical command, sanitized inputs, and any already-returned typed handles; never include the complete raw payload in evidence.

- `argv` reports a missing, unknown, conflicting, or invalid CLI argument. Rebuild argv from this card's parameter tables or the active command help.
- `json_source` reports an unreadable stdin or file source. Correct that source without moving the value to a different binding.
- `json_syntax` reports invalid JSON with safe line and column context. Repair syntax before interpreting domain fields.
- `command_input` reports schema violations for a structured input. Inspect the bounded `violations`, then run this exact leaf with `--schema` and correct the declared field or type; do not invent an alias.
- `payload_contract` means the CLI's composed capability payload violates the executable contract before network I/O. Treat this as an implementation fault; do not bypass the semantic command with raw transport.
- `command_result` means a Host response or local result failed its executable result schema. Do not accept or report it as successful evidence.
- Violation arrays are redacted, deterministically ordered, and capped at eight. When `truncated` is true, correct the reported violations and validate again rather than requesting secret or complete payload disclosure.

## 运行契约

- Canonical argv path: `library` `readiness` `missing-markdown`.
- Output boundary: `cursor`; governed details: {"continuation":["data.nextCursor","data.hasMore","data.returned","data.total","data.limit"],"cursorInput":"cursor","defaultLimit":25,"maxLimit":100,"section":"data.items","strategy":"cursor"}.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Structured binding mode: `overlay`.
- Intent visibility: `visible`.
- Operational aliases: `library readiness missing-markdown`, `library`, `readiness`, `missing-markdown`, `query`, `JSON_OR_FILE`.

### 影响

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

### 目标

```json
[
  {
    "kind": "capability",
    "target": "library.readiness_audit"
  }
]
```
