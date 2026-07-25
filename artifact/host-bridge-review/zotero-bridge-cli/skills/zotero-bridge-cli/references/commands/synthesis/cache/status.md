# `zotero-bridge synthesis cache status`

读取 Synthesis cache 维护状态

## 用法

```console
zotero-bridge synthesis cache status [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--operation-id <OPERATION_ID>]
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
| --operation-id | operation_id | option | no | — | OPERATION_ID | no | — | — | Persistent maintenance operation id to read; omit for general cache status |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "operation-id": {
      "type": "string",
      "description": "Persistent maintenance operation id to read; omit for general cache status"
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
    "operation_id": {
      "type": "string"
    },
    "operationId": {
      "type": "string"
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
      "description": "Result data owned by synthesis.operation.get, GET /bridge/v1/synthesis/cache/status.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed."
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
  "command": "synthesis cache status",
  "argv": [
    "synthesis",
    "cache",
    "status"
  ],
  "summary": "Read Synthesis cache maintenance status",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "operation-id": {
        "type": "string",
        "description": "Persistent maintenance operation id to read; omit for general cache status"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "operation_id",
      "kind": "option",
      "token": "--operation-id",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Persistent maintenance operation id to read; omit for general cache status",
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
      "property": "operation-id",
      "kind": "option",
      "token": "--operation-id",
      "takesValue": true,
      "required": false,
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
        "type": "string"
      },
      "operationId": {
        "type": "string"
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
        "description": "Result data owned by synthesis.operation.get, GET /bridge/v1/synthesis/cache/status.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed."
      }
    },
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
      "target": "synthesis.operation.get"
    },
    {
      "kind": "endpoint",
      "target": "GET /bridge/v1/synthesis/cache/status"
    }
  ],
  "operationalAliases": [
    "synthesis cache status",
    "synthesis",
    "cache",
    "status",
    "operation_id",
    "operation-id",
    "OPERATION_ID"
  ],
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `synthesis` `cache` `status`.
- 分页： `none`.
- 类别： `read`; 危险级别： `none`.
- Intent 可见性： `visible`.
- 操作别名： `synthesis cache status`, `synthesis`, `cache`, `status`, `operation_id`, `operation-id`, `OPERATION_ID`.

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
    "target": "synthesis.operation.get"
  },
  {
    "kind": "endpoint",
    "target": "GET /bridge/v1/synthesis/cache/status"
  }
]
```
