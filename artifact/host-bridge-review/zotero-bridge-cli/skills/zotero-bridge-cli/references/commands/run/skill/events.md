# `zotero-bridge run skill events`

列出一个 Skill run 的轻量级生命周期事件

## 用法

```console
zotero-bridge run skill events [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] SKILL_RUN_ID <SKILL_RUN_ID> [--since-updated-at <SINCE_UPDATED_AT>] [--limit <LIMIT>] [--cursor <CURSOR>]
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
| SKILL_RUN_ID | skill_run_id | positional | yes | — | SKILL_RUN_ID | no | — | — | Opaque skill run id |
| --since-updated-at | since_updated_at | option | no | — | SINCE_UPDATED_AT | no | — | — | Return events after this updatedAt timestamp |
| --limit | limit | option | no | — | LIMIT | no | — | — | Maximum number of events |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "skill_run_id": {
      "type": "string",
      "description": "Opaque skill run id",
      "position": 1
    },
    "since-updated-at": {
      "type": "string",
      "description": "Return events after this updatedAt timestamp"
    },
    "limit": {
      "type": "string",
      "description": "Maximum number of events"
    },
    "cursor": {
      "type": "string",
      "description": "Opaque continuation cursor"
    }
  },
  "required": [
    "skill_run_id"
  ],
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
    "skill_run_id": {
      "type": "string",
      "description": "Opaque skill run id"
    },
    "since_updated_at": {
      "type": "string",
      "description": "Return events after this updatedAt timestamp"
    },
    "limit": {
      "type": "string",
      "description": "Maximum number of events"
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
    "events": {
      "type": "array"
    },
    "nextCursor": {
      "type": [
        "string",
        "number",
        "null"
      ]
    },
    "hasMore": {
      "type": "boolean"
    },
    "returned": {
      "type": "integer",
      "minimum": 0
    },
    "total": {
      "type": "integer",
      "minimum": 0
    },
    "limit": {
      "type": "integer",
      "minimum": 0
    }
  },
  "additionalProperties": true,
  "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
}
```

## 示例

此命令没有适用的结构化输入示例。请根据参数表构造 argv，并在执行前通过 `surface describe` 确认命令。

## 完整命令 descriptor

此封闭 descriptor 是 `surface describe` 返回的机器可读命令契约；将其收录于此，使本命令卡无需加载其他命令参考即可独立审计。

```json
{
  "command": "run skill events",
  "argv": [
    "run",
    "skill",
    "events"
  ],
  "summary": "List lightweight lifecycle events for one skill run",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "skill_run_id": {
        "type": "string",
        "description": "Opaque skill run id",
        "position": 1
      },
      "since-updated-at": {
        "type": "string",
        "description": "Return events after this updatedAt timestamp"
      },
      "limit": {
        "type": "string",
        "description": "Maximum number of events"
      },
      "cursor": {
        "type": "string",
        "description": "Opaque continuation cursor"
      }
    },
    "required": [
      "skill_run_id"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "skill_run_id",
      "kind": "positional",
      "token": "SKILL_RUN_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Opaque skill run id",
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
      "id": "since_updated_at",
      "kind": "option",
      "token": "--since-updated-at",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Return events after this updatedAt timestamp",
      "valueNames": [
        "SINCE_UPDATED_AT"
      ],
      "possibleValues": [],
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
      "help": "Maximum number of events",
      "valueNames": [
        "LIMIT"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "cursor",
      "kind": "option",
      "token": "--cursor",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Opaque continuation cursor",
      "valueNames": [
        "CURSOR"
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
      "property": "skill_run_id",
      "kind": "positional",
      "token": "SKILL_RUN_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "SKILL_RUN_ID"
      ]
    },
    {
      "property": "since-updated-at",
      "kind": "option",
      "token": "--since-updated-at",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "SINCE_UPDATED_AT"
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
    },
    {
      "property": "cursor",
      "kind": "option",
      "token": "--cursor",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "CURSOR"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "skill_run_id": {
        "type": "string",
        "description": "Opaque skill run id"
      },
      "since_updated_at": {
        "type": "string",
        "description": "Return events after this updatedAt timestamp"
      },
      "limit": {
        "type": "string",
        "description": "Maximum number of events"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "events": {
        "type": "array"
      },
      "nextCursor": {
        "type": [
          "string",
          "number",
          "null"
        ]
      },
      "hasMore": {
        "type": "boolean"
      },
      "returned": {
        "type": "integer",
        "minimum": 0
      },
      "total": {
        "type": "integer",
        "minimum": 0
      },
      "limit": {
        "type": "integer",
        "minimum": 0
      }
    },
    "additionalProperties": true,
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
  },
  "outputBoundary": {
    "strategy": "cursor",
    "section": "events",
    "defaultLimit": 25,
    "maxLimit": 100,
    "cursorInput": "cursor",
    "continuation": [
      "nextCursor",
      "hasMore",
      "returned",
      "total",
      "limit"
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
      "target": "GET /bridge/v1/skill-runs/{skillRunId}/events"
    }
  ],
  "operationalAliases": [
    "run skill events",
    "run",
    "skill",
    "events",
    "skill_run_id",
    "SKILL_RUN_ID",
    "since_updated_at",
    "since-updated-at",
    "SINCE_UPDATED_AT",
    "limit",
    "LIMIT",
    "cursor",
    "CURSOR"
  ],
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `run` `skill` `events`.
- 输出边界： `cursor`; governed details: {"strategy":"cursor","section":"events","defaultLimit":25,"maxLimit":100,"cursorInput":"cursor","continuation":["nextCursor","hasMore","returned","total","limit"]}.
- 分页： `cursor`.
- 类别： `read`; danger: `none`.
- 意图可见性： `visible`.
- 操作别名： `run skill events`, `run`, `skill`, `events`, `skill_run_id`, `SKILL_RUN_ID`, `since_updated_at`, `since-updated-at`, `SINCE_UPDATED_AT`, `limit`, `LIMIT`, `cursor`, `CURSOR`.
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
    "target": "GET /bridge/v1/skill-runs/{skillRunId}/events"
  }
]
```
