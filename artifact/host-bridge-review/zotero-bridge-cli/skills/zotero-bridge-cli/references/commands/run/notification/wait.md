# `zotero-bridge run notification wait`

Poll until a workflow notification is available

## 用法

```console
zotero-bridge run notification wait [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--workflow-run-id <WORKFLOW_RUN_ID>] [--skill-run-id <SKILL_RUN_ID>] [--type <EVENT_TYPE>] [--since-event-id <SINCE_EVENT_ID>] [--client-id <CLIENT_ID>] [--acknowledged <ACKNOWLEDGED>] [--limit <LIMIT>] [--timeout-ms <TIMEOUT_MS>] [--interval-ms <INTERVAL_MS>]
```

全局选项可位于叶命令之前或之后。 此叶命令没有结构化 JSON 输入。`--schema` 会返回 `command_input_schema_unavailable`；请使用命令 help 或 `surface describe` 检查调用合同。

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
| --workflow-run-id | workflow_run_id | option | no | — | WORKFLOW_RUN_ID | no | — | — | Filter by workflow run id |
| --skill-run-id | skill_run_id | option | no | — | SKILL_RUN_ID | no | — | — | Filter by concrete skill run id |
| --type | event_type | option | no | — | EVENT_TYPE | no | — | — | Filter by notification type |
| --since-event-id | since_event_id | option | no | — | SINCE_EVENT_ID | no | — | — | Return events after this event id |
| --client-id | client_id | option | no | — | CLIENT_ID | no | — | — | Best-effort Zotero notification client id |
| --acknowledged | acknowledged | option | no | — | ACKNOWLEDGED; values: true, false | no | — | — | Filter by acknowledgement state |
| --limit | limit | option | no | — | LIMIT | no | — | — | Maximum number of events to return |
| --timeout-ms | timeout_ms | option | no | — | TIMEOUT_MS; default: 60000 | no | — | — | Maximum wait time in milliseconds |
| --interval-ms | interval_ms | option | no | — | INTERVAL_MS; default: 1000 | no | — | — | Polling interval in milliseconds |

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

## 组合 payload schema

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

## Payload 组合

这个命令没有单独的 field-mapping program。它的 binding mode 可以直接执行：passthrough 使用唯一的结构化来源，而 `none` 与 `raw` 保持各自声明的闭合行为。

`composition`: `null`.

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

此命令没有适用的结构化输入示例。请依据参数表构造 argv，并在执行前使用 `surface describe` 确认命令。

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

## 参数失败与恢复合同

参数失败以单个 JSON 错误 envelope 返回。先检查 `error.code`，再确认 `error.details.schema` 为 `host-bridge.argument-error.v1`，之后才能使用结构化边界字段。保留规范命令、已脱敏输入和任何已经返回的 typed handle；证据中绝不能包含完整原始 payload。

- `argv` 表示 CLI 参数缺失、未知、冲突或无效。依据本卡片的参数表或当前命令 help 重新构造 argv。
- `json_source` 表示 stdin 或文件源不可读。修正该输入源，不要把值移到另一种 binding。
- `json_syntax` 表示 JSON 无效，并提供安全的行列位置。先修复语法，再解释领域字段。
- 该叶命令没有结构化 JSON 输入，因此 `command_input` 不是预期的调用边界。使用 `surface describe` 查看其标量与位置参数合同。
- `payload_contract` 表示 CLI 组合出的 capability payload 在网络 I/O 前就违反了可执行合同。将其视为实现错误；不得用原始 transport 绕过语义命令。
- `command_result` 表示 Host 响应或本地结果未通过可执行结果 schema。不得接受它，也不得把它报告为成功证据。
- violation 数组已经脱敏、按确定顺序排列，并限制为八项。当 `truncated` 为 true 时，先修正已报告的问题并重新验证，不得要求披露 secret 或完整 payload。

## 操作合同

- 规范 argv 路径： `run` `notification` `wait`.
- 输出边界： `cursor`；受管详情： {"continuation":["nextSinceEventId","hasMore","returned"],"cursorInput":"since_event_id","defaultLimit":25,"maxLimit":100,"section":"notifications","strategy":"cursor"}.
- 分页： `cursor`.
- 类别： `read`；危险等级： `none`.
- 结构化 binding 模式： `none`.
- intent 可见性： `visible`.
- 操作别名： `run notification wait`, `run`, `notification`, `wait`, `workflow_run_id`, `workflow-run-id`, `WORKFLOW_RUN_ID`, `skill_run_id`, `skill-run-id`, `SKILL_RUN_ID`, `event_type`, `type`, `EVENT_TYPE`, `since_event_id`, `since-event-id`, `SINCE_EVENT_ID`, `client_id`, `client-id`, `CLIENT_ID`, `acknowledged`, `ACKNOWLEDGED`, `limit`, `LIMIT`, `timeout_ms`, `timeout-ms`, `TIMEOUT_MS`, `interval_ms`, `interval-ms`, `INTERVAL_MS`.

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
    "kind": "endpoint",
    "target": "GET /bridge/v2/notifications"
  }
]
```
