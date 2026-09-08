# `zotero-bridge operation get`

读取一个持久 Zotero operation receipt

## 用法

```console
zotero-bridge operation get [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] OPERATION_ID <OPERATION_ID>
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
| OPERATION_ID | operation_id | positional | yes | — | OPERATION_ID | no | — | — | Operation id，由改变状态的命令返回或提供给它 |

## 调用 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "operation_id": {
      "description": "Operation id returned by or supplied to a state-changing command",
      "position": 1,
      "type": "string"
    }
  },
  "required": [
    "operation_id"
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
    "operation_id": {
      "description": "Operation id returned by or supplied to a state-changing command",
      "type": "string"
    }
  },
  "required": [],
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
    "attemptId": {
      "type": "string"
    },
    "createdAt": {
      "type": "string"
    },
    "handleConsumption": {
      "enum": [
        "unconsumed",
        "consumed",
        "unknown"
      ]
    },
    "method": {
      "type": "string"
    },
    "operationId": {
      "type": "string"
    },
    "path": {
      "type": "string"
    },
    "requestDigest": {
      "type": "string"
    },
    "response": {
      "type": "object"
    },
    "retentionExpiresAt": {
      "type": "string"
    },
    "schema": {
      "const": "host-bridge.operation-receipt.v1"
    },
    "state": {
      "enum": [
        "in_progress",
        "completed",
        "outcome_unknown"
      ]
    },
    "stateChange": {
      "enum": [
        "unchanged",
        "changed",
        "unknown"
      ]
    },
    "updatedAt": {
      "type": "string"
    }
  },
  "required": [
    "schema",
    "operationId",
    "requestDigest",
    "attemptId",
    "method",
    "path",
    "state",
    "createdAt",
    "updatedAt",
    "retentionExpiresAt",
    "stateChange",
    "handleConsumption"
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
      "help": "Operation id returned by or supplied to a state-changing command",
      "id": "operation_id",
      "kind": "positional",
      "position": 1,
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "OPERATION_ID",
      "valueNames": [
        "OPERATION_ID"
      ]
    }
  ],
  "argv": [
    "operation",
    "get"
  ],
  "argvBindings": [
    {
      "kind": "positional",
      "position": 1,
      "property": "operation_id",
      "required": true,
      "takesValue": true,
      "token": "OPERATION_ID",
      "valueNames": [
        "OPERATION_ID"
      ]
    }
  ],
  "binding": "none",
  "category": "read",
  "command": "operation get",
  "composition": null,
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
      "handle": "operationId",
      "lifetime": "caller-owned",
      "required": true
    }
  ],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {},
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "operation_id": {
        "description": "Operation id returned by or supplied to a state-changing command",
        "position": 1,
        "type": "string"
      }
    },
    "required": [
      "operation_id"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "operation get",
    "operation",
    "get",
    "operation_id",
    "OPERATION_ID"
  ],
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "operation_id": {
        "description": "Operation id returned by or supplied to a state-changing command",
        "type": "string"
      }
    },
    "required": [],
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
      "attemptId": {
        "type": "string"
      },
      "createdAt": {
        "type": "string"
      },
      "handleConsumption": {
        "enum": [
          "unconsumed",
          "consumed",
          "unknown"
        ]
      },
      "method": {
        "type": "string"
      },
      "operationId": {
        "type": "string"
      },
      "path": {
        "type": "string"
      },
      "requestDigest": {
        "type": "string"
      },
      "response": {
        "type": "object"
      },
      "retentionExpiresAt": {
        "type": "string"
      },
      "schema": {
        "const": "host-bridge.operation-receipt.v1"
      },
      "state": {
        "enum": [
          "in_progress",
          "completed",
          "outcome_unknown"
        ]
      },
      "stateChange": {
        "enum": [
          "unchanged",
          "changed",
          "unknown"
        ]
      },
      "updatedAt": {
        "type": "string"
      }
    },
    "required": [
      "schema",
      "operationId",
      "requestDigest",
      "attemptId",
      "method",
      "path",
      "state",
      "createdAt",
      "updatedAt",
      "retentionExpiresAt",
      "stateChange",
      "handleConsumption"
    ],
    "type": "object"
  },
  "summary": "Read one durable Zotero operation receipt",
  "targets": [
    {
      "kind": "endpoint",
      "target": "GET /bridge/v2/operations/{operationId}"
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

- 规范 argv 路径：`operation` `get`。
- 输出边界：`fixed`；受管辖细节：{"strategy":"fixed"}。
- 分页：`none`。
- 类别：`read`；危险级别：`none`。
- 结构化绑定模式：`none`。
- 意图可见性：`visible`。
- 操作别名：`operation get`、`operation`、`get`、`operation_id`、`OPERATION_ID`。

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
    "handle": "operationId",
    "lifetime": "caller-owned",
    "required": true
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
    "stateCheck": "none",
    "when": "The read fails or returns incomplete evidence."
  }
]
```

### 目标

```json
[
  {
    "kind": "endpoint",
    "target": "GET /bridge/v2/operations/{operationId}"
  }
]
```
