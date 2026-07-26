# `zotero-bridge workflow submission get`

读取一个活动的 Zotero-managed workflow submission

## 用法

```console
zotero-bridge workflow submission get [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] SUBMISSION_ID <SUBMISSION_ID> [--cursor <CURSOR>] [--limit <LIMIT>]
```

全局选项可位于叶命令之前或之后。此叶命令没有结构化 JSON 输入。`--schema` 会返回 `command_input_schema_unavailable`；请使用命令帮助或 `surface describe` 检查调用契约。

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
| SUBMISSION_ID | submission_id | positional | yes | — | SUBMISSION_ID | no | — | — | Opaque submission id returned by workflow submit |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "submission_id": {
      "type": "string",
      "description": "Opaque submission id returned by workflow submit",
      "position": 1
    },
    "cursor": {
      "type": "string",
      "description": "Opaque continuation cursor for submission units"
    },
    "limit": {
      "type": "string",
      "description": "Maximum number of submission units (1-100)"
    }
  },
  "required": [
    "submission_id"
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
    "submission_id": {
      "type": "string",
      "description": "Opaque submission id returned by workflow submit"
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
    "submissionId": {
      "type": "string"
    },
    "workflowId": {
      "type": "string"
    },
    "workflowLabel": {
      "type": "string"
    },
    "backendType": {
      "enum": [
        "acp",
        "skillrunner"
      ]
    },
    "backendId": {
      "type": "string"
    },
    "total": {
      "type": "integer"
    },
    "initiallySkipped": {
      "type": "integer"
    },
    "pending": {
      "type": "integer"
    },
    "admitted": {
      "type": "integer"
    },
    "settled": {
      "type": "integer"
    },
    "units": {
      "type": "array",
      "items": {
        "type": "object"
      }
    },
    "nextCursor": {
      "type": [
        "string",
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
    "limit": {
      "type": "integer",
      "minimum": 0
    }
  },
  "required": [
    "submissionId",
    "workflowId",
    "backendType",
    "backendId",
    "total",
    "pending",
    "admitted",
    "settled",
    "units"
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
  "command": "workflow submission get",
  "argv": [
    "workflow",
    "submission",
    "get"
  ],
  "summary": "Read one active Zotero-managed workflow submission",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "submission_id": {
        "type": "string",
        "description": "Opaque submission id returned by workflow submit",
        "position": 1
      },
      "cursor": {
        "type": "string",
        "description": "Opaque continuation cursor for submission units"
      },
      "limit": {
        "type": "string",
        "description": "Maximum number of submission units (1-100)"
      }
    },
    "required": [
      "submission_id"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "submission_id",
      "kind": "positional",
      "token": "SUBMISSION_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Opaque submission id returned by workflow submit",
      "valueNames": [
        "SUBMISSION_ID"
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
      "help": "Opaque continuation cursor for submission units",
      "valueNames": [
        "CURSOR"
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
      "help": "Maximum number of submission units (1-100)",
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
      "property": "submission_id",
      "kind": "positional",
      "token": "SUBMISSION_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "SUBMISSION_ID"
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
      "submission_id": {
        "type": "string",
        "description": "Opaque submission id returned by workflow submit"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "submissionId": {
        "type": "string"
      },
      "workflowId": {
        "type": "string"
      },
      "workflowLabel": {
        "type": "string"
      },
      "backendType": {
        "enum": [
          "acp",
          "skillrunner"
        ]
      },
      "backendId": {
        "type": "string"
      },
      "total": {
        "type": "integer"
      },
      "initiallySkipped": {
        "type": "integer"
      },
      "pending": {
        "type": "integer"
      },
      "admitted": {
        "type": "integer"
      },
      "settled": {
        "type": "integer"
      },
      "units": {
        "type": "array",
        "items": {
          "type": "object"
        }
      },
      "nextCursor": {
        "type": [
          "string",
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
      "limit": {
        "type": "integer",
        "minimum": 0
      }
    },
    "required": [
      "submissionId",
      "workflowId",
      "backendType",
      "backendId",
      "total",
      "pending",
      "admitted",
      "settled",
      "units"
    ],
    "additionalProperties": false
  },
  "outputBoundary": {
    "strategy": "cursor",
    "section": "units",
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
  "handleTransitions": [
    {
      "handle": "submissionId",
      "direction": "consume",
      "required": true,
      "condition": "Required to inspect one active pending/admitted Host submission.",
      "lifetime": "caller-owned"
    }
  ],
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
      "target": "GET /bridge/v1/workflows/submissions/{submissionId}"
    }
  ],
  "operationalAliases": [
    "workflow submission get",
    "workflow",
    "submission",
    "get",
    "submission_id",
    "SUBMISSION_ID",
    "cursor",
    "CURSOR",
    "limit",
    "LIMIT"
  ],
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `workflow` `submission` `get`.
- 输出边界： `cursor`; governed details: {"strategy":"cursor","section":"units","defaultLimit":25,"maxLimit":100,"cursorInput":"cursor","continuation":["nextCursor","hasMore","returned","total","limit"]}.
- 分页： `cursor`.
- 类别： `read`; danger: `none`.
- 意图可见性： `visible`.
- 操作别名： `workflow submission get`, `workflow`, `submission`, `get`, `submission_id`, `SUBMISSION_ID`, `cursor`, `CURSOR`, `limit`, `LIMIT`.
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
  {
    "handle": "submissionId",
    "direction": "consume",
    "required": true,
    "condition": "Required to inspect one active pending/admitted Host submission.",
    "lifetime": "caller-owned"
  }
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
    "target": "GET /bridge/v1/workflows/submissions/{submissionId}"
  }
]
```
