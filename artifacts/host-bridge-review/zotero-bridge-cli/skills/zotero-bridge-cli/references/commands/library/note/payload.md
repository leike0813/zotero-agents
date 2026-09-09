# `zotero-bridge library note payload`

从一个 Zotero note 读取一个内嵌 workflow payload

## 用法

```console
zotero-bridge library note payload [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--key <KEY>] [--id <ID>] [--library-id <LIBRARY_ID>] [--payload-type <PAYLOAD_TYPE>]
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
| --payload-type | payload_type | option | no | — | PAYLOAD_TYPE | no | — | — | 要解码的 Payload type |

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
    "payload-type": {
      "description": "Payload type to decode",
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
    "payloadType": {
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "payloadType"
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
      "argument": "payload_type",
      "field": "payloadType",
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
      "const": "library.get_note_payload"
    },
    "data": {
      "additionalProperties": false,
      "properties": {
        "summary": {
          "additionalProperties": true,
          "type": "object",
          "x-openPropertiesReason": "Broker-owned payload summary."
        },
        "value": {}
      },
      "required": [
        "summary",
        "value"
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
      "help": "Payload type to decode",
      "id": "payload_type",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--payload-type",
      "valueNames": [
        "PAYLOAD_TYPE"
      ]
    }
  ],
  "argv": [
    "library",
    "note",
    "payload"
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
      "property": "payload-type",
      "required": false,
      "takesValue": true,
      "token": "--payload-type",
      "valueNames": [
        "PAYLOAD_TYPE"
      ]
    }
  ],
  "binding": "object",
  "category": "read",
  "command": "library note payload",
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
        "argument": "payload_type",
        "field": "payloadType",
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
      "payload-type": {
        "description": "Payload type to decode",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "operationalAliases": [
    "library note payload",
    "library",
    "note",
    "payload",
    "key",
    "KEY",
    "id",
    "ID",
    "library_id",
    "library-id",
    "LIBRARY_ID",
    "payload_type",
    "payload-type",
    "PAYLOAD_TYPE"
  ],
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
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
      "payloadType": {
        "minLength": 1,
        "type": "string"
      }
    },
    "required": [
      "payloadType"
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
        "const": "library.get_note_payload"
      },
      "data": {
        "additionalProperties": false,
        "properties": {
          "summary": {
            "additionalProperties": true,
            "type": "object",
            "x-openPropertiesReason": "Broker-owned payload summary."
          },
          "value": {}
        },
        "required": [
          "summary",
          "value"
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
  "summary": "Read one embedded workflow payload from a Zotero note",
  "targets": [
    {
      "kind": "capability",
      "target": "library.get_note_payload"
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

- 规范 argv 路径：`library` `note` `payload`。
- 输出边界：`fixed`；受管辖细节：{"strategy":"fixed"}。
- 分页：`none`。
- 类别：`read`；危险级别：`none`。
- 结构化绑定模式：`object`。
- 意图可见性：`visible`。
- 操作别名：`library note payload`、`library`、`note`、`payload`、`key`、`KEY`、`id`、`ID`、`library_id`、`library-id`、`LIBRARY_ID`、`payload_type`、`payload-type`、`PAYLOAD_TYPE`。

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
    "target": "library.get_note_payload"
  }
]
```
