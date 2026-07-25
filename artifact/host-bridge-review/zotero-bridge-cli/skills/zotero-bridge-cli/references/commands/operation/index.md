# `zotero-bridge operation get`

读取一份持久化 Zotero operation receipt

## 用法

```console
zotero-bridge operation get [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] OPERATION_ID <OPERATION_ID>
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
| OPERATION_ID | operation_id | positional | yes | — | OPERATION_ID | no | — | — | Operation id returned by or supplied to a state-changing command |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "operation_id": {
      "type": "string",
      "description": "Operation id returned by or supplied to a state-changing command",
      "position": 1
    }
  },
  "required": [
    "operation_id"
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
    "operation_id": {
      "type": "string",
      "description": "Operation id returned by or supplied to a state-changing command"
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
    "schema": {
      "const": "host-bridge.operation-receipt.v1"
    },
    "operationId": {
      "type": "string"
    },
    "requestDigest": {
      "type": "string"
    },
    "attemptId": {
      "type": "string"
    },
    "method": {
      "type": "string"
    },
    "path": {
      "type": "string"
    },
    "state": {
      "enum": [
        "in_progress",
        "completed",
        "outcome_unknown"
      ]
    },
    "createdAt": {
      "type": "string"
    },
    "updatedAt": {
      "type": "string"
    },
    "retentionExpiresAt": {
      "type": "string"
    },
    "stateChange": {
      "enum": [
        "unchanged",
        "changed",
        "unknown"
      ]
    },
    "handleConsumption": {
      "enum": [
        "unconsumed",
        "consumed",
        "unknown"
      ]
    },
    "response": {
      "type": "object"
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
  "additionalProperties": false
}
```

## 示例

此命令没有适用的结构化输入示例。请根据参数表构造 argv，并在执行前通过 `surface describe` 确认命令。

## 完整命令 descriptor

此封闭 descriptor 是 `surface describe` 返回的机器可读命令契约；将其收录于此，使本命令卡无需加载其他命令参考即可独立审计。

```json
{
  "command": "operation get",
  "argv": [
    "operation",
    "get"
  ],
  "summary": "Read one durable Zotero operation receipt",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "operation_id": {
        "type": "string",
        "description": "Operation id returned by or supplied to a state-changing command",
        "position": 1
      }
    },
    "required": [
      "operation_id"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "operation_id",
      "kind": "positional",
      "token": "OPERATION_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Operation id returned by or supplied to a state-changing command",
      "valueNames": [
        "OPERATION_ID"
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
      "property": "operation_id",
      "kind": "positional",
      "token": "OPERATION_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "OPERATION_ID"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "operation_id": {
        "type": "string",
        "description": "Operation id returned by or supplied to a state-changing command"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "schema": {
        "const": "host-bridge.operation-receipt.v1"
      },
      "operationId": {
        "type": "string"
      },
      "requestDigest": {
        "type": "string"
      },
      "attemptId": {
        "type": "string"
      },
      "method": {
        "type": "string"
      },
      "path": {
        "type": "string"
      },
      "state": {
        "enum": [
          "in_progress",
          "completed",
          "outcome_unknown"
        ]
      },
      "createdAt": {
        "type": "string"
      },
      "updatedAt": {
        "type": "string"
      },
      "retentionExpiresAt": {
        "type": "string"
      },
      "stateChange": {
        "enum": [
          "unchanged",
          "changed",
          "unknown"
        ]
      },
      "handleConsumption": {
        "enum": [
          "unconsumed",
          "consumed",
          "unknown"
        ]
      },
      "response": {
        "type": "object"
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
    "additionalProperties": false
  },
  "pagination": "none",
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
      "handle": "operationId",
      "direction": "consume",
      "required": true,
      "condition": "Required by the command invocation.",
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
      "target": "GET /bridge/v1/operations/{operationId}"
    }
  ],
  "operationalAliases": [
    "operation get",
    "operation",
    "get",
    "operation_id",
    "OPERATION_ID"
  ],
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `operation` `get`.
- 分页： `none`.
- 类别： `read`; 危险级别： `none`.
- Intent 可见性： `visible`.
- 操作别名： `operation get`, `operation`, `get`, `operation_id`, `OPERATION_ID`.

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
    "handle": "operationId",
    "direction": "consume",
    "required": true,
    "condition": "Required by the command invocation.",
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
    "target": "GET /bridge/v1/operations/{operationId}"
  }
]
```
