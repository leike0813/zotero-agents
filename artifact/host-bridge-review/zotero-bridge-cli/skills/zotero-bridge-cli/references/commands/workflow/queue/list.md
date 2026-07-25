# `zotero-bridge workflow queue list`

列出 pending 的 Zotero-managed workflow queue units

## 用法

```console
zotero-bridge workflow queue list [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--backend-type <BACKEND_TYPE>] [--backend <BACKEND>] [--cursor <CURSOR>] [--limit <LIMIT>]
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
| --backend-type | backend_type | option | no | — | BACKEND_TYPE | no | — | — | Filter by backend type: acp or skillrunner |
| --backend | backend | option | no | — | BACKEND | no | — | — | Filter by backend id |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "backend-type": {
      "type": "string",
      "description": "Filter by backend type: acp or skillrunner"
    },
    "backend": {
      "type": "string",
      "description": "Filter by backend id"
    },
    "cursor": {
      "type": "string",
      "description": "Opaque continuation cursor"
    },
    "limit": {
      "type": "string",
      "description": "Maximum number of queue units (1-100)"
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
    "backend_type": {
      "type": "string",
      "description": "Filter by backend type: acp or skillrunner"
    },
    "backend": {
      "type": "string",
      "description": "Filter by backend id"
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
    "units": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "queueId": {
            "type": "string"
          },
          "submissionId": {
            "type": "string"
          },
          "unitId": {
            "type": "string"
          },
          "taskName": {
            "type": "string"
          },
          "memberCount": {
            "type": "integer"
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
          "canCancel": {
            "const": true
          }
        },
        "required": [
          "queueId",
          "submissionId",
          "unitId",
          "taskName",
          "memberCount",
          "backendType",
          "backendId",
          "canCancel"
        ],
        "additionalProperties": true
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
    "total": {
      "type": "integer",
      "minimum": 0
    },
    "limit": {
      "type": "integer",
      "minimum": 0
    }
  },
  "required": [
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
  "command": "workflow queue list",
  "argv": [
    "workflow",
    "queue",
    "list"
  ],
  "summary": "List pending Zotero-managed workflow queue units",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "backend-type": {
        "type": "string",
        "description": "Filter by backend type: acp or skillrunner"
      },
      "backend": {
        "type": "string",
        "description": "Filter by backend id"
      },
      "cursor": {
        "type": "string",
        "description": "Opaque continuation cursor"
      },
      "limit": {
        "type": "string",
        "description": "Maximum number of queue units (1-100)"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "backend_type",
      "kind": "option",
      "token": "--backend-type",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Filter by backend type: acp or skillrunner",
      "valueNames": [
        "BACKEND_TYPE"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "backend",
      "kind": "option",
      "token": "--backend",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Filter by backend id",
      "valueNames": [
        "BACKEND"
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
    },
    {
      "id": "limit",
      "kind": "option",
      "token": "--limit",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Maximum number of queue units (1-100)",
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
      "property": "backend-type",
      "kind": "option",
      "token": "--backend-type",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "BACKEND_TYPE"
      ]
    },
    {
      "property": "backend",
      "kind": "option",
      "token": "--backend",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "BACKEND"
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
      "backend_type": {
        "type": "string",
        "description": "Filter by backend type: acp or skillrunner"
      },
      "backend": {
        "type": "string",
        "description": "Filter by backend id"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "units": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "queueId": {
              "type": "string"
            },
            "submissionId": {
              "type": "string"
            },
            "unitId": {
              "type": "string"
            },
            "taskName": {
              "type": "string"
            },
            "memberCount": {
              "type": "integer"
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
            "canCancel": {
              "const": true
            }
          },
          "required": [
            "queueId",
            "submissionId",
            "unitId",
            "taskName",
            "memberCount",
            "backendType",
            "backendId",
            "canCancel"
          ],
          "additionalProperties": true
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
      "total": {
        "type": "integer",
        "minimum": 0
      },
      "limit": {
        "type": "integer",
        "minimum": 0
      }
    },
    "required": [
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
      "handle": "queueId",
      "direction": "produce",
      "required": false,
      "condition": "Returned when the corresponding operation succeeds.",
      "lifetime": "response"
    },
    {
      "handle": "submissionId",
      "direction": "produce",
      "required": false,
      "condition": "Returned when the corresponding operation succeeds.",
      "lifetime": "response"
    }
  ],
  "recovery": [
    {
      "when": "The read fails or returns incomplete evidence.",
      "stateCheck": "command-result",
      "requiresHandles": [],
      "action": "Inspect the error and retry only when retryable is true.",
      "nextCommand": "surface describe"
    }
  ],
  "targets": [
    {
      "kind": "endpoint",
      "target": "GET /bridge/v1/workflows/queue"
    }
  ],
  "operationalAliases": [
    "workflow queue list",
    "workflow",
    "queue",
    "list",
    "backend_type",
    "backend-type",
    "BACKEND_TYPE",
    "backend",
    "BACKEND",
    "cursor",
    "CURSOR",
    "limit",
    "LIMIT"
  ],
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `workflow` `queue` `list`.
- 输出边界： `cursor`; governed details: {"strategy":"cursor","section":"units","defaultLimit":25,"maxLimit":100,"cursorInput":"cursor","continuation":["nextCursor","hasMore","returned","total","limit"]}.
- 分页： `cursor`.
- 类别： `read`; danger: `none`.
- 意图可见性： `visible`.
- 操作别名： `workflow queue list`, `workflow`, `queue`, `list`, `backend_type`, `backend-type`, `BACKEND_TYPE`, `backend`, `BACKEND`, `cursor`, `CURSOR`, `limit`, `LIMIT`.
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
    "handle": "queueId",
    "direction": "produce",
    "required": false,
    "condition": "Returned when the corresponding operation succeeds.",
    "lifetime": "response"
  },
  {
    "handle": "submissionId",
    "direction": "produce",
    "required": false,
    "condition": "Returned when the corresponding operation succeeds.",
    "lifetime": "response"
  }
]
```

### 恢复

```json
[
  {
    "when": "The read fails or returns incomplete evidence.",
    "stateCheck": "command-result",
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
    "target": "GET /bridge/v1/workflows/queue"
  }
]
```
