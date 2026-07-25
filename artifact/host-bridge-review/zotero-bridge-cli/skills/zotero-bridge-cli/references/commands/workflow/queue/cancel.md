# `zotero-bridge workflow queue cancel`

取消一个仍处于 pending 状态的 Zotero-managed workflow queue unit

## 用法

```console
zotero-bridge workflow queue cancel [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] QUEUE_ID <QUEUE_ID>
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
| QUEUE_ID | queue_id | positional | yes | — | QUEUE_ID | no | — | — | Opaque queue id returned by workflow queue list |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "queue_id": {
      "type": "string",
      "description": "Opaque queue id returned by workflow queue list",
      "position": 1
    }
  },
  "required": [
    "queue_id"
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
    "queue_id": {
      "type": "string",
      "description": "Opaque queue id returned by workflow queue list"
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
    "status": {
      "const": "canceled"
    },
    "queueId": {
      "type": "string"
    }
  },
  "required": [
    "status",
    "queueId"
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
  "command": "workflow queue cancel",
  "argv": [
    "workflow",
    "queue",
    "cancel"
  ],
  "summary": "Cancel one still-pending Zotero-managed workflow queue unit",
  "category": "write",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "queue_id": {
        "type": "string",
        "description": "Opaque queue id returned by workflow queue list",
        "position": 1
      }
    },
    "required": [
      "queue_id"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "queue_id",
      "kind": "positional",
      "token": "QUEUE_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Opaque queue id returned by workflow queue list",
      "valueNames": [
        "QUEUE_ID"
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
      "property": "queue_id",
      "kind": "positional",
      "token": "QUEUE_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "QUEUE_ID"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "queue_id": {
        "type": "string",
        "description": "Opaque queue id returned by workflow queue list"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "status": {
        "const": "canceled"
      },
      "queueId": {
        "type": "string"
      }
    },
    "required": [
      "status",
      "queueId"
    ],
    "additionalProperties": false
  },
  "pagination": "none",
  "effects": [
    {
      "kind": "workflow-control",
      "stateChanged": true,
      "description": "May change workflow control state."
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
      "direction": "consume",
      "required": true,
      "condition": "Required to cancel one unit that is still pending in the native Host queue.",
      "lifetime": "caller-owned"
    }
  ],
  "recovery": [
    {
      "when": "Cancellation fails or races with admission.",
      "stateCheck": "caller-held-handle",
      "requiresHandles": [
        "queueId"
      ],
      "action": "List the native queue again. Absence means the unit was admitted, canceled, or settled; inspect its submission and tasks before taking further action.",
      "nextCommand": "workflow queue list"
    }
  ],
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v1/workflows/queue/{queueId}/cancel"
    }
  ],
  "operationalAliases": [
    "workflow queue cancel",
    "workflow",
    "queue",
    "cancel",
    "queue_id",
    "QUEUE_ID"
  ],
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `workflow` `queue` `cancel`.
- 分页： `none`.
- 类别： `write`; 危险级别： `review`.
- Intent 可见性： `visible`.
- 操作别名： `workflow queue cancel`, `workflow`, `queue`, `cancel`, `queue_id`, `QUEUE_ID`.

### Effects

```json
[
  {
    "kind": "workflow-control",
    "stateChanged": true,
    "description": "May change workflow control state."
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
    "direction": "consume",
    "required": true,
    "condition": "Required to cancel one unit that is still pending in the native Host queue.",
    "lifetime": "caller-owned"
  }
]
```

### 恢复

```json
[
  {
    "when": "Cancellation fails or races with admission.",
    "stateCheck": "caller-held-handle",
    "requiresHandles": [
      "queueId"
    ],
    "action": "List the native queue again. Absence means the unit was admitted, canceled, or settled; inspect its submission and tasks before taking further action.",
    "nextCommand": "workflow queue list"
  }
]
```

### 目标

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v1/workflows/queue/{queueId}/cancel"
  }
]
```
