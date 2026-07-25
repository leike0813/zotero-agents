# `zotero-bridge product list`

列出普通 Dashboard Product

## 用法

```console
zotero-bridge product list [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--workflow-id <WORKFLOW_ID>] [--backend-id <BACKEND_ID>] [--request-id <REQUEST_ID>] [--cursor <CURSOR>] [--limit <LIMIT>]
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
| --workflow-id | workflow_id | option | no | — | WORKFLOW_ID | no | — | — | workflow_id |
| --backend-id | backend_id | option | no | — | BACKEND_ID | no | — | — | backend_id |
| --request-id | request_id | option | no | — | REQUEST_ID | no | — | — | request_id |
| --cursor | cursor | option | no | — | CURSOR | no | — | — | cursor |
| --limit | limit | option | no | — | LIMIT | no | — | — | limit |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "workflow-id": {
      "type": "string"
    },
    "backend-id": {
      "type": "string"
    },
    "request-id": {
      "type": "string"
    },
    "cursor": {
      "type": "string"
    },
    "limit": {
      "type": "string"
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
    "workflowId": {
      "type": "string"
    },
    "backendId": {
      "type": "string"
    },
    "requestId": {
      "type": "string"
    },
    "cursor": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 0
    },
    "limit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
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
    "capability": {
      "type": "string"
    },
    "approval": {
      "type": "object"
    },
    "data": {
      "type": "object",
      "description": "Result data owned by workflow_products.list.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed.",
      "properties": {
        "products": {
          "type": "array"
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
      }
    }
  },
  "additionalProperties": false
}
```

## 示例

此命令没有适用的结构化输入示例。请根据参数表构造 argv，并在执行前通过 `surface describe` 确认命令。

## 完整命令 descriptor

此封闭 descriptor 是 `surface describe` 返回的机器可读命令契约；将其收录于此，使本命令卡无需加载其他命令参考即可独立审计。

```json
{
  "command": "product list",
  "argv": [
    "product",
    "list"
  ],
  "summary": "List normal Dashboard Products",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "workflow-id": {
        "type": "string"
      },
      "backend-id": {
        "type": "string"
      },
      "request-id": {
        "type": "string"
      },
      "cursor": {
        "type": "string"
      },
      "limit": {
        "type": "string"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "workflow_id",
      "kind": "option",
      "token": "--workflow-id",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "workflow_id",
      "valueNames": [
        "WORKFLOW_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "backend_id",
      "kind": "option",
      "token": "--backend-id",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "backend_id",
      "valueNames": [
        "BACKEND_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "request_id",
      "kind": "option",
      "token": "--request-id",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "request_id",
      "valueNames": [
        "REQUEST_ID"
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
      "help": "cursor",
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
      "help": "limit",
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
      "property": "workflow-id",
      "kind": "option",
      "token": "--workflow-id",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "WORKFLOW_ID"
      ]
    },
    {
      "property": "backend-id",
      "kind": "option",
      "token": "--backend-id",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "BACKEND_ID"
      ]
    },
    {
      "property": "request-id",
      "kind": "option",
      "token": "--request-id",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "REQUEST_ID"
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
      "workflowId": {
        "type": "string"
      },
      "backendId": {
        "type": "string"
      },
      "requestId": {
        "type": "string"
      },
      "cursor": {
        "type": [
          "number",
          "string"
        ],
        "minimum": 0
      },
      "limit": {
        "type": [
          "number",
          "string"
        ],
        "minimum": 1
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "capability": {
        "type": "string"
      },
      "approval": {
        "type": "object"
      },
      "data": {
        "type": "object",
        "description": "Result data owned by workflow_products.list.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed.",
        "properties": {
          "products": {
            "type": "array"
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
        }
      }
    },
    "additionalProperties": false
  },
  "outputBoundary": {
    "strategy": "cursor",
    "section": "data.products",
    "defaultLimit": 25,
    "maxLimit": 100,
    "cursorInput": "cursor",
    "continuation": [
      "data.nextCursor",
      "data.hasMore",
      "data.returned",
      "data.total",
      "data.limit"
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
      "kind": "capability",
      "target": "workflow_products.list"
    }
  ],
  "operationalAliases": [
    "product list",
    "product",
    "list",
    "workflow_id",
    "workflow-id",
    "WORKFLOW_ID",
    "backend_id",
    "backend-id",
    "BACKEND_ID",
    "request_id",
    "request-id",
    "REQUEST_ID",
    "cursor",
    "CURSOR",
    "limit",
    "LIMIT"
  ],
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `product` `list`.
- 输出边界： `cursor`; governed details: {"strategy":"cursor","section":"data.products","defaultLimit":25,"maxLimit":100,"cursorInput":"cursor","continuation":["data.nextCursor","data.hasMore","data.returned","data.total","data.limit"]}.
- 分页： `cursor`.
- 类别： `read`; danger: `none`.
- 意图可见性： `visible`.
- 操作别名： `product list`, `product`, `list`, `workflow_id`, `workflow-id`, `WORKFLOW_ID`, `backend_id`, `backend-id`, `BACKEND_ID`, `request_id`, `request-id`, `REQUEST_ID`, `cursor`, `CURSOR`, `limit`, `LIMIT`.
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
    "kind": "capability",
    "target": "workflow_products.list"
  }
]
```
