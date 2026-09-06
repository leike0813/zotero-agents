# `zotero-bridge run notification list`

列出 workflow notification 收件箱事件

## 用法

```console
zotero-bridge run notification list [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--workflow-run-id <WORKFLOW_RUN_ID>] [--skill-run-id <SKILL_RUN_ID>] [--type <EVENT_TYPE>] [--since-event-id <SINCE_EVENT_ID>] [--client-id <CLIENT_ID>] [--acknowledged <ACKNOWLEDGED>] [--limit <LIMIT>]
```

全局选项可以出现在 leaf 命令之前或之后。此 leaf 没有结构化 JSON 输入。`--schema` 会返回 `command_input_schema_unavailable`；请使用命令帮助或 `surface describe` 来检查调用契约。

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
| --workflow-run-id | workflow_run_id | option | no | — | WORKFLOW_RUN_ID | no | — | — | Filter by workflow run id |
| --skill-run-id | skill_run_id | option | no | — | SKILL_RUN_ID | no | — | — | Filter by concrete skill run id |
| --type | event_type | option | no | — | EVENT_TYPE | no | — | — | Filter by notification type |
| --since-event-id | since_event_id | option | no | — | SINCE_EVENT_ID | no | — | — | Return events after this event id |
| --client-id | client_id | option | no | — | CLIENT_ID | no | — | — | Best-effort Zotero notification client id |
| --acknowledged | acknowledged | option | no | — | ACKNOWLEDGED; values: true, false | no | — | — | Filter by acknowledgement state |
| --limit | limit | option | no | — | LIMIT | no | — | — | Maximum number of events to return |

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

此命令没有单独的字段映射程序。其 binding 模式可直接执行：passthrough 使用唯一的结构化源，而 `none` 和 `raw` 保持其声明的封闭行为。

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

没有适用的结构化输入示例。执行前，请根据参数表构建 argv，并使用 `surface describe` 确认命令。

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
    }
  ],
  "argv": [
    "run",
    "notification",
    "list"
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
    }
  ],
  "binding": "none",
  "category": "read",
  "command": "run notification list",
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
    "run notification list",
    "run",
    "notification",
    "list",
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
    "LIMIT"
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
  "summary": "List workflow notification inbox events",
  "targets": [
    {
      "kind": "endpoint",
      "target": "GET /bridge/v2/notifications"
    }
  ]
}
```

## 参数失败与恢复契约

Parameter failures are returned as one JSON error envelope. Inspect `error.code`, then require `error.details.schema` to be `host-bridge.argument-error.v1` before using the structured boundary fields. Preserve the canonical command, sanitized inputs, and any already-returned typed handles; never include the complete raw payload in evidence.

- `argv` reports a missing, unknown, conflicting, or invalid CLI argument. Rebuild argv from this card's parameter tables or the active command help.
- `json_source` reports an unreadable stdin or file source. Correct that source without moving the value to a different binding.
- `json_syntax` reports invalid JSON with safe line and column context. Repair syntax before interpreting domain fields.
- This leaf has no structured JSON input, so `command_input` is not an expected invocation boundary. Use `surface describe` for its scalar and positional contract.
- `payload_contract` means the CLI's composed capability payload violates the executable contract before network I/O. Treat this as an implementation fault; do not bypass the semantic command with raw transport.
- `command_result` means a Host response or local result failed its executable result schema. Do not accept or report it as successful evidence.
- Violation arrays are redacted, deterministically ordered, and capped at eight. When `truncated` is true, correct the reported violations and validate again rather than requesting secret or complete payload disclosure.

## 运行契约

- Canonical argv path: `run` `notification` `list`.
- Output boundary: `cursor`; governed details: {"continuation":["nextSinceEventId","hasMore","returned"],"cursorInput":"since_event_id","defaultLimit":25,"maxLimit":100,"section":"notifications","strategy":"cursor"}.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Structured binding mode: `none`.
- Intent visibility: `visible`.
- Operational aliases: `run notification list`, `run`, `notification`, `list`, `workflow_run_id`, `workflow-run-id`, `WORKFLOW_RUN_ID`, `skill_run_id`, `skill-run-id`, `SKILL_RUN_ID`, `event_type`, `type`, `EVENT_TYPE`, `since_event_id`, `since-event-id`, `SINCE_EVENT_ID`, `client_id`, `client-id`, `CLIENT_ID`, `acknowledged`, `ACKNOWLEDGED`, `limit`, `LIMIT`.

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
    "kind": "endpoint",
    "target": "GET /bridge/v2/notifications"
  }
]
```
