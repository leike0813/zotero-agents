# `zotero-bridge run notification wait`

轮询直到 workflow 通知可用

## 用法

```console
zotero-bridge run notification wait [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--workflow-run-id <WORKFLOW_RUN_ID>] [--skill-run-id <SKILL_RUN_ID>] [--type <EVENT_TYPE>] [--since-event-id <SINCE_EVENT_ID>] [--client-id <CLIENT_ID>] [--acknowledged <ACKNOWLEDGED>] [--limit <LIMIT>] [--timeout-ms <TIMEOUT_MS>] [--interval-ms <INTERVAL_MS>]
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
| --workflow-run-id | workflow_run_id | option | no | — | WORKFLOW_RUN_ID | no | — | — | 按 workflow run id 过滤 |
| --skill-run-id | skill_run_id | option | no | — | SKILL_RUN_ID | no | — | — | 按具体 skill run id 筛选 |
| --type | event_type | option | no | — | EVENT_TYPE | no | — | — | 按 notification 类型筛选 |
| --since-event-id | since_event_id | option | no | — | SINCE_EVENT_ID | no | — | — | 返回此 event id 之后的事件 |
| --client-id | client_id | option | no | — | CLIENT_ID | no | — | — | 尽力而为的 Zotero notification client id |
| --acknowledged | acknowledged | option | no | — | ACKNOWLEDGED; values: true, false | no | — | — | 按确认状态筛选 |
| --limit | limit | option | no | — | LIMIT | no | — | — | 返回的最大事件数 |
| --timeout-ms | timeout_ms | option | no | — | TIMEOUT_MS; default: 60000 | no | — | — | 最大等待时间（毫秒） |
| --interval-ms | interval_ms | option | no | — | INTERVAL_MS; default: 1000 | no | — | — | 轮询间隔（毫秒） |

## 调用 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "acknowledged": {
      "description": "Filter by acknowledgement state",
      "type": "string"
    },
    "client-id": {
      "description": "Best-effort Zotero notification client id",
      "type": "string"
    },
    "interval-ms": {
      "description": "Polling interval in milliseconds",
      "type": "string"
    },
    "limit": {
      "description": "Maximum number of events to return",
      "type": "string"
    },
    "since-event-id": {
      "description": "Return events after this event id",
      "type": "string"
    },
    "skill-run-id": {
      "description": "Filter by concrete skill run id",
      "type": "string"
    },
    "timeout-ms": {
      "description": "Maximum wait time in milliseconds",
      "type": "string"
    },
    "type": {
      "description": "Filter by notification type",
      "type": "string"
    },
    "workflow-run-id": {
      "description": "Filter by workflow run id",
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
    "acknowledged": {
      "description": "Filter by acknowledgement state",
      "type": "string"
    },
    "client_id": {
      "description": "Best-effort Zotero notification client id",
      "type": "string"
    },
    "interval_ms": {
      "description": "Polling interval in milliseconds",
      "type": "string"
    },
    "limit": {
      "description": "Maximum number of events to return",
      "type": "string"
    },
    "since_event_id": {
      "description": "Return events after this event id",
      "type": "string"
    },
    "skill_run_id": {
      "description": "Filter by concrete skill run id",
      "type": "string"
    },
    "timeout_ms": {
      "description": "Maximum wait time in milliseconds",
      "type": "string"
    },
    "type": {
      "description": "Filter by notification type",
      "type": "string"
    },
    "workflow_run_id": {
      "description": "Filter by workflow run id",
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
    "hasMore": {
      "type": "boolean"
    },
    "nextSinceEventId": {
      "type": [
        "string",
        "null"
      ]
    },
    "notifications": {
      "items": {
        "type": "object"
      },
      "type": "array"
    },
    "returned": {
      "type": "integer"
    },
    "truncated": {
      "type": "boolean"
    }
  },
  "required": [
    "notifications",
    "returned",
    "hasMore",
    "truncated"
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
      "help": "Filter by workflow run id",
      "id": "workflow_run_id",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--workflow-run-id",
      "valueNames": [
        "WORKFLOW_RUN_ID"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Filter by concrete skill run id",
      "id": "skill_run_id",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--skill-run-id",
      "valueNames": [
        "SKILL_RUN_ID"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Filter by notification type",
      "id": "event_type",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--type",
      "valueNames": [
        "EVENT_TYPE"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Return events after this event id",
      "id": "since_event_id",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--since-event-id",
      "valueNames": [
        "SINCE_EVENT_ID"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Best-effort Zotero notification client id",
      "id": "client_id",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--client-id",
      "valueNames": [
        "CLIENT_ID"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Filter by acknowledgement state",
      "id": "acknowledged",
      "kind": "option",
      "possibleValues": [
        "true",
        "false"
      ],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--acknowledged",
      "valueNames": [
        "ACKNOWLEDGED"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Maximum number of events to return",
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
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [
        "60000"
      ],
      "global": false,
      "help": "Maximum wait time in milliseconds",
      "id": "timeout_ms",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--timeout-ms",
      "valueNames": [
        "TIMEOUT_MS"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [
        "1000"
      ],
      "global": false,
      "help": "Polling interval in milliseconds",
      "id": "interval_ms",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--interval-ms",
      "valueNames": [
        "INTERVAL_MS"
      ]
    }
  ],
  "argv": [
    "run",
    "notification",
    "wait"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "workflow-run-id",
      "required": false,
      "takesValue": true,
      "token": "--workflow-run-id",
      "valueNames": [
        "WORKFLOW_RUN_ID"
      ]
    },
    {
      "kind": "option",
      "property": "skill-run-id",
      "required": false,
      "takesValue": true,
      "token": "--skill-run-id",
      "valueNames": [
        "SKILL_RUN_ID"
      ]
    },
    {
      "kind": "option",
      "property": "type",
      "required": false,
      "takesValue": true,
      "token": "--type",
      "valueNames": [
        "EVENT_TYPE"
      ]
    },
    {
      "kind": "option",
      "property": "since-event-id",
      "required": false,
      "takesValue": true,
      "token": "--since-event-id",
      "valueNames": [
        "SINCE_EVENT_ID"
      ]
    },
    {
      "kind": "option",
      "property": "client-id",
      "required": false,
      "takesValue": true,
      "token": "--client-id",
      "valueNames": [
        "CLIENT_ID"
      ]
    },
    {
      "kind": "option",
      "property": "acknowledged",
      "required": false,
      "takesValue": true,
      "token": "--acknowledged",
      "valueNames": [
        "ACKNOWLEDGED"
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
    },
    {
      "kind": "option",
      "property": "timeout-ms",
      "required": false,
      "takesValue": true,
      "token": "--timeout-ms",
      "valueNames": [
        "TIMEOUT_MS"
      ]
    },
    {
      "kind": "option",
      "property": "interval-ms",
      "required": false,
      "takesValue": true,
      "token": "--interval-ms",
      "valueNames": [
        "INTERVAL_MS"
      ]
    }
  ],
  "binding": "none",
  "category": "read",
  "command": "run notification wait",
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
  "inputSchemas": {},
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "acknowledged": {
        "description": "Filter by acknowledgement state",
        "type": "string"
      },
      "client-id": {
        "description": "Best-effort Zotero notification client id",
        "type": "string"
      },
      "interval-ms": {
        "description": "Polling interval in milliseconds",
        "type": "string"
      },
      "limit": {
        "description": "Maximum number of events to return",
        "type": "string"
      },
      "since-event-id": {
        "description": "Return events after this event id",
        "type": "string"
      },
      "skill-run-id": {
        "description": "Filter by concrete skill run id",
        "type": "string"
      },
      "timeout-ms": {
        "description": "Maximum wait time in milliseconds",
        "type": "string"
      },
      "type": {
        "description": "Filter by notification type",
        "type": "string"
      },
      "workflow-run-id": {
        "description": "Filter by workflow run id",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "operationalAliases": [
    "run notification wait",
    "run",
    "notification",
    "wait",
    "workflow_run_id",
    "workflow-run-id",
    "WORKFLOW_RUN_ID",
    "skill_run_id",
    "skill-run-id",
    "SKILL_RUN_ID",
    "event_type",
    "type",
    "EVENT_TYPE",
    "since_event_id",
    "since-event-id",
    "SINCE_EVENT_ID",
    "client_id",
    "client-id",
    "CLIENT_ID",
    "acknowledged",
    "ACKNOWLEDGED",
    "limit",
    "LIMIT",
    "timeout_ms",
    "timeout-ms",
    "TIMEOUT_MS",
    "interval_ms",
    "interval-ms",
    "INTERVAL_MS"
  ],
  "outputBoundary": {
    "continuation": [
      "nextSinceEventId",
      "hasMore",
      "returned"
    ],
    "cursorInput": "since_event_id",
    "defaultLimit": 25,
    "maxLimit": 100,
    "section": "notifications",
    "strategy": "cursor"
  },
  "pagination": "cursor",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "acknowledged": {
        "description": "Filter by acknowledgement state",
        "type": "string"
      },
      "client_id": {
        "description": "Best-effort Zotero notification client id",
        "type": "string"
      },
      "interval_ms": {
        "description": "Polling interval in milliseconds",
        "type": "string"
      },
      "limit": {
        "description": "Maximum number of events to return",
        "type": "string"
      },
      "since_event_id": {
        "description": "Return events after this event id",
        "type": "string"
      },
      "skill_run_id": {
        "description": "Filter by concrete skill run id",
        "type": "string"
      },
      "timeout_ms": {
        "description": "Maximum wait time in milliseconds",
        "type": "string"
      },
      "type": {
        "description": "Filter by notification type",
        "type": "string"
      },
      "workflow_run_id": {
        "description": "Filter by workflow run id",
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
      "hasMore": {
        "type": "boolean"
      },
      "nextSinceEventId": {
        "type": [
          "string",
          "null"
        ]
      },
      "notifications": {
        "items": {
          "type": "object"
        },
        "type": "array"
      },
      "returned": {
        "type": "integer"
      },
      "truncated": {
        "type": "boolean"
      }
    },
    "required": [
      "notifications",
      "returned",
      "hasMore",
      "truncated"
    ],
    "type": "object"
  },
  "summary": "Poll until a workflow notification is available",
  "targets": [
    {
      "kind": "endpoint",
      "target": "GET /bridge/v2/notifications"
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

- 规范 argv 路径：`run` `notification` `wait`。
- 输出边界：`cursor`；受管辖细节：{"continuation":["nextSinceEventId","hasMore","returned"],"cursorInput":"since_event_id","defaultLimit":25,"maxLimit":100,"section":"notifications","strategy":"cursor"}。
- 分页：`cursor`。
- 类别：`read`；危险级别：`none`。
- 结构化绑定模式：`none`。
- 意图可见性：`visible`。
- 操作别名：`run notification wait`、`run`、`notification`、`wait`、`workflow_run_id`、`workflow-run-id`、`WORKFLOW_RUN_ID`、`skill_run_id`、`skill-run-id`、`SKILL_RUN_ID`、`event_type`、`type`、`EVENT_TYPE`、`since_event_id`、`since-event-id`、`SINCE_EVENT_ID`、`client_id`、`client-id`、`CLIENT_ID`、`acknowledged`、`ACKNOWLEDGED`、`limit`、`LIMIT`、`timeout_ms`、`timeout-ms`、`TIMEOUT_MS`、`interval_ms`、`interval-ms`、`INTERVAL_MS`。

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
    "kind": "endpoint",
    "target": "GET /bridge/v2/notifications"
  }
]
```
