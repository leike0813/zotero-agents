# `zotero-bridge library annotation list`

列出一个 Zotero 条目的阅读器标注

## 用法

```console
zotero-bridge library annotation list [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --item <ITEM> [--cursor <CURSOR>] [--limit <LIMIT>]
```

全局选项可以出现在叶子命令之前或之后。该叶子命令没有结构化 JSON 输入。`--schema` 返回 `command_input_schema_unavailable`；请使用命令帮助或 `surface describe` 来检查调用契约。

## 全局参数

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --endpoint | endpoint | option | no | — | ENDPOINT | no | ZOTERO_BRIDGE_ENDPOINT | — | Zotero Bridge 服务端点的基础 URL。如果省略，CLI 会读取 ZOTERO_BRIDGE_ENDPOINT 或 profile 文件。CLI 不会猜测任意的 bridge 端口。 |
| --operation-id | operation_id | option | no | — | ID | no | ZOTERO_BRIDGE_OPERATION_ID | — | 用于变更 Zotero 状态的不透明幂等性 ID |
| --profile | profile | option | no | — | PATH | no | ZOTERO_BRIDGE_PROFILE | — | Zotero Bridge 连接 profile JSON 文件的路径。如果省略，CLI 会尝试使用 Zotero Agents 的已知 profile。ACP 运行 profile 通常引用 tokenEnv；本地已知 profile 可能包含受用户级文件权限保护的 bearer token。 |
| --schema | schema | option | no | — | SCHEMA; values: true, false | no | — | — | 打印一个规范叶子命令的版本化原始 JSON Schema 和受治理的示例。Schema 模式是离线的，不会加载 profile、读取 Zotero Bridge 配置或连接 Zotero。 |

## 本地选项与位置参数

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --item | item | option | yes | — | ITEM | no | — | — | Zotero 条目引用：key、数字 ID、libraryId:key 或 JSON 对象 |
| --cursor | cursor | option | no | — | CURSOR | no | — | — | 不透明的分页游标 |
| --limit | limit | option | no | — | LIMIT | no | — | — | 最大条目数 (1-100) |

## 调用 Schema

```json
{
  "additionalProperties": false,
  "properties": {
    "cursor": {
      "description": "Opaque continuation cursor",
      "type": "string"
    },
    "item": {
      "description": "Zotero item ref: key, numeric id, libraryId:key, or JSON object",
      "type": "string"
    },
    "limit": {
      "description": "Maximum number of entries (1-100)",
      "type": "string"
    }
  },
  "required": [
    "item"
  ],
  "type": "object"
}
```

## 结构化输入 Schema

本命令没有结构化 JSON 输入参数。

## 组合 Payload Schema

```json
{
  "additionalProperties": false,
  "properties": {
    "cursor": {
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
    "limit": {
      "maximum": 100,
      "minimum": 1,
      "type": [
        "number",
        "string"
      ]
    },
    "ref": {
      "type": [
        "object",
        "string",
        "number"
      ]
    }
  },
  "type": "object"
}
```

## Payload 组合

可执行命令契约拥有如下展示的基础源、固定值、字段映射和封闭变换。命令处理器仅在所引用的 Clap 参数 ID 下提供值。

```json
{
  "constants": {},
  "mappings": [
    {
      "argument": "item",
      "field": "ref",
      "required": true,
      "transform": "context-ref"
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

## 结果 Schema

```json
{
  "additionalProperties": false,
  "properties": {
    "approval": {
      "minLength": 1,
      "type": "string"
    },
    "capability": {
      "const": "library.list_annotations"
    },
    "data": {
      "additionalProperties": true,
      "description": "Canonical source page of annotations.",
      "properties": {
        "annotations": {
          "type": "array"
        },
        "hasMore": {
          "type": "boolean"
        },
        "limit": {
          "maximum": 100,
          "minimum": 1,
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
      "required": [
        "annotations",
        "nextCursor",
        "hasMore",
        "returned",
        "total",
        "limit"
      ],
      "type": "object",
      "x-openPropertiesReason": "Broker owns the domain row and source evidence fields."
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

没有适用的结构化输入示例。请根据参数表构建 argv，并在执行前通过 `surface describe` 确认命令。

## 完整命令描述符

此封闭描述符是由 `surface describe` 返回的机器可读命令契约；将其放在这里，以便本卡片可在不加载其他命令参考的情况下独立审计。

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
      "help": "Zotero item ref: key, numeric id, libraryId:key, or JSON object",
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
    "library",
    "annotation",
    "list"
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
  "command": "library annotation list",
  "composition": {
    "constants": {},
    "mappings": [
      {
        "argument": "item",
        "field": "ref",
        "required": true,
        "transform": "context-ref"
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
  "handleTransitions": [],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {},
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "cursor": {
        "description": "Opaque continuation cursor",
        "type": "string"
      },
      "item": {
        "description": "Zotero item ref: key, numeric id, libraryId:key, or JSON object",
        "type": "string"
      },
      "limit": {
        "description": "Maximum number of entries (1-100)",
        "type": "string"
      }
    },
    "required": [
      "item"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "library annotation list",
    "library",
    "annotation",
    "list",
    "item",
    "ITEM",
    "cursor",
    "CURSOR",
    "limit",
    "LIMIT"
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
    "section": "data.annotations",
    "strategy": "cursor"
  },
  "pagination": "cursor",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "cursor": {
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
      "limit": {
        "maximum": 100,
        "minimum": 1,
        "type": [
          "number",
          "string"
        ]
      },
      "ref": {
        "type": [
          "object",
          "string",
          "number"
        ]
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
        "const": "library.list_annotations"
      },
      "data": {
        "additionalProperties": true,
        "description": "Canonical source page of annotations.",
        "properties": {
          "annotations": {
            "type": "array"
          },
          "hasMore": {
            "type": "boolean"
          },
          "limit": {
            "maximum": 100,
            "minimum": 1,
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
        "required": [
          "annotations",
          "nextCursor",
          "hasMore",
          "returned",
          "total",
          "limit"
        ],
        "type": "object",
        "x-openPropertiesReason": "Broker owns the domain row and source evidence fields."
      }
    },
    "required": [
      "capability",
      "approval",
      "data"
    ],
    "type": "object"
  },
  "summary": "List reader annotations for one Zotero item",
  "targets": [
    {
      "kind": "capability",
      "target": "library.list_annotations"
    }
  ]
}
```

## 参数失败与恢复契约

参数失败以单个 JSON 错误信封返回。检查 `error.code`，然后要求 `error.details.schema` 为 `host-bridge.argument-error.v1`，然后再使用结构化边界字段。保留规范命令、净化输入以及任何已返回的类型化 handle；切勿在证据中包含完整的原始 payload。

- `argv` 报告缺失、未知、冲突或无效的 CLI 参数。请根据本卡片的参数表或活动命令帮助重建 argv。
- `json_source` 报告无法读取的 stdin 或文件源。请在不将值移动到不同绑定的情况下更正该源。
- `json_syntax` 报告无效 JSON，并附带安全的行列上下文。请在解释领域字段之前修复语法。
- 此叶子命令没有结构化 JSON 输入，因此 `command_input` 不是预期的调用边界。请使用 `surface describe` 来查看其标量和位置参数契约。
- `payload_contract` 表示 CLI 组合的能力 payload 在网络 I/O 之前违反了可执行契约。请将其视为实现缺陷；不要绕过语义命令使用原始传输。
- `command_result` 表示 Host 响应或本地结果未通过其可执行结果 Schema。请勿将其接受或报告为成功证据。
- 违规数组经过脱敏、按确定性排序，并最多保留八项。当 `truncated` 为 true 时，请更正报告的违规并重新验证，而不是请求秘密或完整 payload 披露。

## 操作契约

- 规范 argv 路径：`library` `annotation` `list`。
- 输出边界：`cursor`；受治理的细节：{"continuation":["data.nextCursor","data.hasMore","data.returned","data.total","data.limit"],"cursorInput":"cursor","defaultLimit":25,"maxLimit":100,"section":"data.annotations","strategy":"cursor"}。
- 分页：`cursor`。
- 类别：`read`；危险：`none`。
- 结构化绑定模式：`object`。
- Intent 可见性：`visible`。
- 操作别名：`library annotation list`、`library`、`annotation`、`list`、`item`、`ITEM`、`cursor`、`CURSOR`、`limit`、`LIMIT`。

### Effects

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

### Handle transitions

```json
[
]
```

### Recovery

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
    "target": "library.list_annotations"
  }
]
```