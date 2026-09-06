# `zotero-bridge library item search`

搜索 Zotero library item

## 用法

```console
zotero-bridge library item search [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --query <JSON_OR_FILE>
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
| --query | query | option | yes | — | JSON_OR_FILE | no | — | — | 受约束的搜索 query JSON 对象。使用内联 JSON，例如 '{"query":"graph","limit":10}'，或使用包含 JSON 的文件路径、@file 语法，或 '-' 从 stdin 读取 JSON。 |

## 调用 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "query": {
      "description": "Bounded search query JSON object with query, limit, and libraryId",
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

### `--query` (query)

必需：`true`。

```json
{
  "additionalProperties": false,
  "properties": {
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
    "query": {
      "maxLength": 500,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "query"
  ],
  "type": "object"
}
```

## 组合 payload schema

```json
{
  "additionalProperties": false,
  "properties": {
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
    "query": {
      "maxLength": 500,
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "query"
  ],
  "type": "object"
}
```

## Payload 组合

此命令没有单独的字段映射程序。其 binding 模式可直接执行：passthrough 使用唯一的结构化源，而 `none` 和 `raw` 保持其声明的封闭行为。

`composition`: `null`.

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
      "const": "library.search_items"
    },
    "data": {
      "additionalProperties": false,
      "description": "Bounded search results returned by library.search_items.",
      "properties": {
        "items": {
          "items": {
            "additionalProperties": true,
            "type": "object",
            "x-openPropertiesReason": "Zotero item DTO fields are owned by the library broker and remain JSON-safe."
          },
          "type": "array"
        },
        "truncated": {
          "type": "boolean"
        }
      },
      "required": [
        "items",
        "truncated"
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

### query: shape-only 示例

--query 的最小 JSON 形式。

```console
zotero-bridge library item search --query '{"query":"example"}'
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
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Bounded search query JSON object with query, limit, and libraryId",
      "id": "query",
      "kind": "option",
      "longHelp": "Bounded search query JSON object. Use inline JSON such as '{\"query\":\"graph\",\"limit\":10}', a file path containing JSON, @file syntax, or '-' to read JSON from stdin.",
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
          "description": "Minimal JSON shape for --query.",
          "kind": "shape-only",
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "value": {
            "query": "example"
          }
        }
      ],
      "required": true,
      "requiredWhen": [],
      "schema": {
        "additionalProperties": false,
        "properties": {
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
          "query": {
            "maxLength": 500,
            "minLength": 1,
            "type": "string"
          }
        },
        "required": [
          "query"
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
        "description": "Bounded search query JSON object with query, limit, and libraryId",
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
    "defaultLimit": 25,
    "maxLimit": 100,
    "section": "data.items",
    "strategy": "limit",
    "truncatedField": "data.truncated"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
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
      "query": {
        "maxLength": 500,
        "minLength": 1,
        "type": "string"
      }
    },
    "required": [
      "query"
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
        "const": "library.search_items"
      },
      "data": {
        "additionalProperties": false,
        "description": "Bounded search results returned by library.search_items.",
        "properties": {
          "items": {
            "items": {
              "additionalProperties": true,
              "type": "object",
              "x-openPropertiesReason": "Zotero item DTO fields are owned by the library broker and remain JSON-safe."
            },
            "type": "array"
          },
          "truncated": {
            "type": "boolean"
          }
        },
        "required": [
          "items",
          "truncated"
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

Parameter failures are returned as one JSON error envelope. Inspect `error.code`, then require `error.details.schema` to be `host-bridge.argument-error.v1` before using the structured boundary fields. Preserve the canonical command, sanitized inputs, and any already-returned typed handles; never include the complete raw payload in evidence.

- `argv` reports a missing, unknown, conflicting, or invalid CLI argument. Rebuild argv from this card's parameter tables or the active command help.
- `json_source` reports an unreadable stdin or file source. Correct that source without moving the value to a different binding.
- `json_syntax` reports invalid JSON with safe line and column context. Repair syntax before interpreting domain fields.
- `command_input` reports schema violations for a structured input. Inspect the bounded `violations`, then run this exact leaf with `--schema` and correct the declared field or type; do not invent an alias.
- `payload_contract` means the CLI's composed capability payload violates the executable contract before network I/O. Treat this as an implementation fault; do not bypass the semantic command with raw transport.
- `command_result` means a Host response or local result failed its executable result schema. Do not accept or report it as successful evidence.
- Violation arrays are redacted, deterministically ordered, and capped at eight. When `truncated` is true, correct the reported violations and validate again rather than requesting secret or complete payload disclosure.

## 运行契约

- Canonical argv path: `library` `item` `search`.
- Output boundary: `limit`; governed details: {"defaultLimit":25,"maxLimit":100,"section":"data.items","strategy":"limit","truncatedField":"data.truncated"}.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Structured binding mode: `passthrough`.
- Intent visibility: `visible`.
- Operational aliases: `library item search`, `library`, `item`, `search`, `query`, `JSON_OR_FILE`.

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
    "target": "library.search_items"
  }
]
```
