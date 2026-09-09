# `zotero-bridge product get`

读取一个普通 Dashboard Product

## 用法

```console
zotero-bridge product get [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] PRODUCT_ID <PRODUCT_ID> [--cursor <CURSOR>] [--limit <LIMIT>]
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
| PRODUCT_ID | product_id | positional | yes | — | PRODUCT_ID | no | — | — | Dashboard Product 的 id |
| --cursor | cursor | option | no | — | CURSOR | no | — | — | 不透明的续接 cursor |
| --limit | limit | option | no | — | LIMIT | no | — | — | 条目数上限（1-100） |

## 调用 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "cursor": {
      "description": "Opaque continuation cursor",
      "type": "string"
    },
    "limit": {
      "description": "Maximum number of entries (1-100)",
      "type": "string"
    },
    "product_id": {
      "description": "Dashboard Product id",
      "position": 1,
      "type": "string"
    }
  },
  "required": [
    "product_id"
  ],
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
    "cursor": {
      "type": "string"
    },
    "limit": {
      "minimum": 1,
      "type": [
        "number",
        "string"
      ]
    },
    "productId": {
      "type": "string"
    }
  },
  "required": [
    "productId"
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
      "argument": "product_id",
      "field": "productId",
      "required": true,
      "transform": "trim-string"
    },
    {
      "argument": "cursor",
      "field": "cursor",
      "required": false,
      "transform": "identity"
    },
    {
      "argument": "limit",
      "field": "limit",
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
      "const": "workflow_products.get"
    },
    "data": {
      "additionalProperties": true,
      "description": "Result data owned by workflow_products.get.",
      "properties": {
        "pagination": {
          "additionalProperties": true,
          "properties": {
            "assets": {
              "additionalProperties": true,
              "properties": {
                "hasMore": {
                  "type": "boolean"
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
              "type": "object"
            }
          },
          "type": "object"
        },
        "product": {
          "additionalProperties": true,
          "properties": {
            "assets": {
              "type": "array"
            }
          },
          "type": "object"
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
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Dashboard Product id",
      "id": "product_id",
      "kind": "positional",
      "position": 1,
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "PRODUCT_ID",
      "valueNames": [
        "PRODUCT_ID"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Opaque continuation cursor",
      "id": "cursor",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--cursor",
      "valueNames": [
        "CURSOR"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Maximum number of entries (1-100)",
      "id": "limit",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--limit",
      "valueNames": [
        "LIMIT"
      ]
    }
  ],
  "argv": [
    "product",
    "get"
  ],
  "argvBindings": [
    {
      "kind": "positional",
      "position": 1,
      "property": "product_id",
      "required": true,
      "takesValue": true,
      "token": "PRODUCT_ID",
      "valueNames": [
        "PRODUCT_ID"
      ]
    },
    {
      "kind": "option",
      "property": "cursor",
      "required": false,
      "takesValue": true,
      "token": "--cursor",
      "valueNames": [
        "CURSOR"
      ]
    },
    {
      "kind": "option",
      "property": "limit",
      "required": false,
      "takesValue": true,
      "token": "--limit",
      "valueNames": [
        "LIMIT"
      ]
    }
  ],
  "binding": "object",
  "category": "read",
  "command": "product get",
  "composition": {
    "constants": {},
    "mappings": [
      {
        "argument": "product_id",
        "field": "productId",
        "required": true,
        "transform": "trim-string"
      },
      {
        "argument": "cursor",
        "field": "cursor",
        "required": false,
        "transform": "identity"
      },
      {
        "argument": "limit",
        "field": "limit",
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
  "handleTransitions": [
    {
      "condition": "Required by the command invocation.",
      "direction": "consume",
      "handle": "productId",
      "lifetime": "caller-owned",
      "required": true
    },
    {
      "condition": "Returned when the corresponding operation succeeds.",
      "direction": "produce",
      "handle": "productId",
      "lifetime": "response",
      "required": false
    }
  ],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {},
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "cursor": {
        "description": "Opaque continuation cursor",
        "type": "string"
      },
      "limit": {
        "description": "Maximum number of entries (1-100)",
        "type": "string"
      },
      "product_id": {
        "description": "Dashboard Product id",
        "position": 1,
        "type": "string"
      }
    },
    "required": [
      "product_id"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "product get",
    "product",
    "get",
    "product_id",
    "PRODUCT_ID",
    "cursor",
    "CURSOR",
    "limit",
    "LIMIT"
  ],
  "outputBoundary": {
    "continuation": [
      "data.pagination.assets.nextCursor",
      "data.pagination.assets.hasMore",
      "data.pagination.assets.returned",
      "data.pagination.assets.total",
      "data.pagination.assets.limit"
    ],
    "cursorInput": "cursor",
    "defaultLimit": 25,
    "maxLimit": 100,
    "section": "data.product.assets",
    "strategy": "cursor"
  },
  "pagination": "cursor",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "cursor": {
        "type": "string"
      },
      "limit": {
        "minimum": 1,
        "type": [
          "number",
          "string"
        ]
      },
      "productId": {
        "type": "string"
      }
    },
    "required": [
      "productId"
    ],
    "type": "object"
  },
  "recovery": [
    {
      "action": "Inspect the error and retry only when retryable is true.",
      "nextCommand": "surface describe",
      "requiresHandles": [],
      "stateCheck": "command-result",
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
        "const": "workflow_products.get"
      },
      "data": {
        "additionalProperties": true,
        "description": "Result data owned by workflow_products.get.",
        "properties": {
          "pagination": {
            "additionalProperties": true,
            "properties": {
              "assets": {
                "additionalProperties": true,
                "properties": {
                  "hasMore": {
                    "type": "boolean"
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
                "type": "object"
              }
            },
            "type": "object"
          },
          "product": {
            "additionalProperties": true,
            "properties": {
              "assets": {
                "type": "array"
              }
            },
            "type": "object"
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
  "summary": "Read one normal Dashboard Product",
  "targets": [
    {
      "kind": "capability",
      "target": "workflow_products.get"
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

- 规范 argv 路径：`product` `get`。
- 输出边界：`cursor`；受管辖细节：{"continuation":["data.pagination.assets.nextCursor","data.pagination.assets.hasMore","data.pagination.assets.returned","data.pagination.assets.total","data.pagination.assets.limit"],"cursorInput":"cursor","defaultLimit":25,"maxLimit":100,"section":"data.product.assets","strategy":"cursor"}。
- 分页：`cursor`。
- 类别：`read`；危险级别：`none`。
- 结构化绑定模式：`object`。
- 意图可见性：`visible`。
- 操作别名：`product get`、`product`、`get`、`product_id`、`PRODUCT_ID`、`cursor`、`CURSOR`、`limit`、`LIMIT`。

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
  {
    "condition": "Required by the command invocation.",
    "direction": "consume",
    "handle": "productId",
    "lifetime": "caller-owned",
    "required": true
  },
  {
    "condition": "Returned when the corresponding operation succeeds.",
    "direction": "produce",
    "handle": "productId",
    "lifetime": "response",
    "required": false
  }
]
```

### 恢复

```json
[
  {
    "action": "Inspect the error and retry only when retryable is true.",
    "nextCommand": "surface describe",
    "requiresHandles": [],
    "stateCheck": "command-result",
    "when": "The read fails or returns incomplete evidence."
  }
]
```

### 目标

```json
[
  {
    "kind": "capability",
    "target": "workflow_products.get"
  }
]
```
