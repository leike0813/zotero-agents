# `zotero-bridge run notification list`

列出 workflow 通知收件箱事件

## 用法

```console
zotero-bridge run notification list [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--workflow-run-id <WORKFLOW_RUN_ID>] [--skill-run-id <SKILL_RUN_ID>] [--type <EVENT_TYPE>] [--since-event-id <SINCE_EVENT_ID>] [--client-id <CLIENT_ID>] [--acknowledged <ACKNOWLEDGED>] [--limit <LIMIT>]
```

全局选项可位于叶命令之前或之后。使用 `--schema` 可在不加载 profile、也不连接 Zotero 的情况下检查原始结构化输入 schema。

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

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "workflow-run-id": {
      "type": "string",
      "description": "Filter by workflow run id"
    },
    "skill-run-id": {
      "type": "string",
      "description": "Filter by concrete skill run id"
    },
    "type": {
      "type": "string",
      "description": "Filter by notification type"
    },
    "since-event-id": {
      "type": "string",
      "description": "Return events after this event id"
    },
    "client-id": {
      "type": "string",
      "description": "Best-effort Zotero notification client id"
    },
    "acknowledged": {
      "type": "string",
      "description": "Filter by acknowledgement state"
    },
    "limit": {
      "type": "string",
      "description": "Maximum number of events to return"
    }
  },
  "required": [],
  "additionalProperties": false
}
```

## 结构化输入 schema

此命令没有结构化 JSON 输入参数。

## 合成 payload schema

```json
{
  "type": "object",
  "properties": {
    "workflow_run_id": {
      "type": "string",
      "description": "Filter by workflow run id"
    },
    "skill_run_id": {
      "type": "string",
      "description": "Filter by concrete skill run id"
    },
    "type": {
      "type": "string",
      "description": "Filter by notification type"
    },
    "since_event_id": {
      "type": "string",
      "description": "Return events after this event id"
    },
    "client_id": {
      "type": "string",
      "description": "Best-effort Zotero notification client id"
    },
    "acknowledged": {
      "type": "string",
      "description": "Filter by acknowledgement state"
    },
    "limit": {
      "type": "string",
      "description": "Maximum number of events to return"
    }
  },
  "required": [],
  "additionalProperties": false
}
```

## 结果 schema

```json
{
  "type": "object",
  "properties": {
    "notifications": {
      "type": "array",
      "items": {
        "type": "object"
      }
    },
    "nextSinceEventId": {
      "type": [
        "string",
        "null"
      ]
    },
    "returned": {
      "type": "integer"
    },
    "hasMore": {
      "type": "boolean"
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
  "additionalProperties": false
}
```

## 示例

此命令没有适用的结构化输入示例。请根据参数表构造 argv，并在执行前通过 `surface describe` 确认命令。

## 完整命令 descriptor

此封闭 descriptor 是 `surface describe` 返回的机器可读命令契约；将其收录于此，使本命令卡无需加载其他命令参考即可独立审计。

```json
{
  "command": "run notification list",
  "argv": [
    "run",
    "notification",
    "list"
  ],
  "summary": "List workflow notification inbox events",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "workflow-run-id": {
        "type": "string",
        "description": "Filter by workflow run id"
      },
      "skill-run-id": {
        "type": "string",
        "description": "Filter by concrete skill run id"
      },
      "type": {
        "type": "string",
        "description": "Filter by notification type"
      },
      "since-event-id": {
        "type": "string",
        "description": "Return events after this event id"
      },
      "client-id": {
        "type": "string",
        "description": "Best-effort Zotero notification client id"
      },
      "acknowledged": {
        "type": "string",
        "description": "Filter by acknowledgement state"
      },
      "limit": {
        "type": "string",
        "description": "Maximum number of events to return"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "workflow_run_id",
      "kind": "option",
      "token": "--workflow-run-id",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Filter by workflow run id",
      "valueNames": [
        "WORKFLOW_RUN_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "skill_run_id",
      "kind": "option",
      "token": "--skill-run-id",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Filter by concrete skill run id",
      "valueNames": [
        "SKILL_RUN_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "event_type",
      "kind": "option",
      "token": "--type",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Filter by notification type",
      "valueNames": [
        "EVENT_TYPE"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "since_event_id",
      "kind": "option",
      "token": "--since-event-id",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Return events after this event id",
      "valueNames": [
        "SINCE_EVENT_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "client_id",
      "kind": "option",
      "token": "--client-id",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Best-effort Zotero notification client id",
      "valueNames": [
        "CLIENT_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "acknowledged",
      "kind": "option",
      "token": "--acknowledged",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Filter by acknowledgement state",
      "valueNames": [
        "ACKNOWLEDGED"
      ],
      "possibleValues": [
        "true",
        "false"
      ],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "limit",
      "kind": "option",
      "token": "--limit",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Maximum number of events to return",
      "valueNames": [
        "LIMIT"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    }
  ],
  "argvBindings": [
    {
      "property": "workflow-run-id",
      "kind": "option",
      "token": "--workflow-run-id",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "WORKFLOW_RUN_ID"
      ]
    },
    {
      "property": "skill-run-id",
      "kind": "option",
      "token": "--skill-run-id",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "SKILL_RUN_ID"
      ]
    },
    {
      "property": "type",
      "kind": "option",
      "token": "--type",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "EVENT_TYPE"
      ]
    },
    {
      "property": "since-event-id",
      "kind": "option",
      "token": "--since-event-id",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "SINCE_EVENT_ID"
      ]
    },
    {
      "property": "client-id",
      "kind": "option",
      "token": "--client-id",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "CLIENT_ID"
      ]
    },
    {
      "property": "acknowledged",
      "kind": "option",
      "token": "--acknowledged",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "ACKNOWLEDGED"
      ]
    },
    {
      "property": "limit",
      "kind": "option",
      "token": "--limit",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "LIMIT"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "workflow_run_id": {
        "type": "string",
        "description": "Filter by workflow run id"
      },
      "skill_run_id": {
        "type": "string",
        "description": "Filter by concrete skill run id"
      },
      "type": {
        "type": "string",
        "description": "Filter by notification type"
      },
      "since_event_id": {
        "type": "string",
        "description": "Return events after this event id"
      },
      "client_id": {
        "type": "string",
        "description": "Best-effort Zotero notification client id"
      },
      "acknowledged": {
        "type": "string",
        "description": "Filter by acknowledgement state"
      },
      "limit": {
        "type": "string",
        "description": "Maximum number of events to return"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "notifications": {
        "type": "array",
        "items": {
          "type": "object"
        }
      },
      "nextSinceEventId": {
        "type": [
          "string",
          "null"
        ]
      },
      "returned": {
        "type": "integer"
      },
      "hasMore": {
        "type": "boolean"
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
    "additionalProperties": false
  },
  "outputBoundary": {
    "strategy": "cursor",
    "section": "notifications",
    "defaultLimit": 25,
    "maxLimit": 100,
    "cursorInput": "since_event_id",
    "continuation": [
      "nextSinceEventId",
      "hasMore",
      "returned"
    ]
  },
  "pagination": "cursor",
  "effects": [
    {
      "kind": "none",
      "stateChanged": false,
      "description": "Reads state without changing Zotero-managed data."
    }
  ],
  "approvalContract": {
    "kind": "none",
    "timing": "none",
    "scope": "No Zotero UI approval; provider runtimes may still request their own permission."
  },
  "handleTransitions": [],
  "recovery": [
    {
      "when": "The read fails or returns incomplete evidence.",
      "stateCheck": "none",
      "requiresHandles": [],
      "action": "Inspect the error and retry only when retryable is true.",
      "nextCommand": "surface describe"
    }
  ],
  "targets": [
    {
      "kind": "endpoint",
      "target": "GET /bridge/v1/notifications"
    }
  ],
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
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `run` `notification` `list`.
- 输出边界： `cursor`; governed details: {"strategy":"cursor","section":"notifications","defaultLimit":25,"maxLimit":100,"cursorInput":"since_event_id","continuation":["nextSinceEventId","hasMore","returned"]}.
- 分页： `cursor`.
- 类别： `read`; danger: `none`.
- 意图可见性： `visible`.
- 操作别名： `run notification list`, `run`, `notification`, `list`, `workflow_run_id`, `workflow-run-id`, `WORKFLOW_RUN_ID`, `skill_run_id`, `skill-run-id`, `SKILL_RUN_ID`, `event_type`, `type`, `EVENT_TYPE`, `since_event_id`, `since-event-id`, `SINCE_EVENT_ID`, `client_id`, `client-id`, `CLIENT_ID`, `acknowledged`, `ACKNOWLEDGED`, `limit`, `LIMIT`.
### Effects

```json
[
  {
    "kind": "none",
    "stateChanged": false,
    "description": "Reads state without changing Zotero-managed data."
  }
]
```

### Approval

```json
{
  "kind": "none",
  "timing": "none",
  "scope": "No Zotero UI approval; provider runtimes may still request their own permission."
}
```

### Handle 转移

```json
[
]
```

### 恢复

```json
[
  {
    "when": "The read fails or returns incomplete evidence.",
    "stateCheck": "none",
    "requiresHandles": [],
    "action": "Inspect the error and retry only when retryable is true.",
    "nextCommand": "surface describe"
  }
]
```

### 目标

```json
[
  {
    "kind": "endpoint",
    "target": "GET /bridge/v1/notifications"
  }
]
```
