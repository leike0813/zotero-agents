# `zotero-bridge workflow agent-abandon`

放弃一个尚未消费的 agent run

## 用法

```console
zotero-bridge workflow agent-abandon [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] AGENT_RUN_ID <AGENT_RUN_ID>
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
| AGENT_RUN_ID | agent_run_id | positional | yes | — | AGENT_RUN_ID | no | — | — | Agent run id returned by workflow agent-run |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "agent_run_id": {
      "type": "string",
      "description": "Agent run id returned by workflow agent-run",
      "position": 1
    }
  },
  "required": [
    "agent_run_id"
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
    "agent_run_id": {
      "type": "string",
      "description": "Agent run id returned by workflow agent-run"
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
    "agentRunId": {
      "type": "string"
    },
    "workflowId": {
      "type": "string"
    },
    "state": {
      "type": "string"
    },
    "leaseExpiresAt": {
      "type": "string"
    },
    "retentionExpiresAt": {
      "type": "string"
    },
    "renewable": {
      "type": "boolean"
    },
    "abandonable": {
      "type": "boolean"
    },
    "renewedAt": {
      "type": "string"
    },
    "abandonedAt": {
      "type": "string"
    }
  },
  "required": [
    "agentRunId",
    "workflowId",
    "state",
    "leaseExpiresAt",
    "retentionExpiresAt",
    "renewable",
    "abandonable"
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
  "command": "workflow agent-abandon",
  "argv": [
    "workflow",
    "agent-abandon"
  ],
  "summary": "Abandon an unconsumed agent run",
  "category": "write",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "agent_run_id": {
        "type": "string",
        "description": "Agent run id returned by workflow agent-run",
        "position": 1
      }
    },
    "required": [
      "agent_run_id"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "agent_run_id",
      "kind": "positional",
      "token": "AGENT_RUN_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Agent run id returned by workflow agent-run",
      "valueNames": [
        "AGENT_RUN_ID"
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
      "property": "agent_run_id",
      "kind": "positional",
      "token": "AGENT_RUN_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "AGENT_RUN_ID"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "agent_run_id": {
        "type": "string",
        "description": "Agent run id returned by workflow agent-run"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "agentRunId": {
        "type": "string"
      },
      "workflowId": {
        "type": "string"
      },
      "state": {
        "type": "string"
      },
      "leaseExpiresAt": {
        "type": "string"
      },
      "retentionExpiresAt": {
        "type": "string"
      },
      "renewable": {
        "type": "boolean"
      },
      "abandonable": {
        "type": "boolean"
      },
      "renewedAt": {
        "type": "string"
      },
      "abandonedAt": {
        "type": "string"
      }
    },
    "required": [
      "agentRunId",
      "workflowId",
      "state",
      "leaseExpiresAt",
      "retentionExpiresAt",
      "renewable",
      "abandonable"
    ],
    "additionalProperties": false
  },
  "outputBoundary": {
    "strategy": "fixed"
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
      "handle": "agentRunId",
      "direction": "consume",
      "required": true,
      "condition": "Required by the command invocation.",
      "lifetime": "one-shot"
    }
  ],
  "recovery": [
    {
      "when": "The operation fails or completion is uncertain.",
      "stateCheck": "none",
      "requiresHandles": [],
      "action": "Inspect stateChange and handleConsumption before repeating the operation.",
      "nextCommand": "surface describe"
    }
  ],
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v1/workflows/agent-runs/{agentRunId}/abandon"
    }
  ],
  "operationalAliases": [
    "workflow agent-abandon",
    "workflow",
    "agent-abandon",
    "agent_run_id",
    "AGENT_RUN_ID"
  ],
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `workflow` `agent-abandon`.
- 输出边界： `fixed`; governed details: {"strategy":"fixed"}.
- 分页： `none`.
- 类别： `write`; danger: `review`.
- 意图可见性： `visible`.
- 操作别名： `workflow agent-abandon`, `workflow`, `agent-abandon`, `agent_run_id`, `AGENT_RUN_ID`.
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
    "handle": "agentRunId",
    "direction": "consume",
    "required": true,
    "condition": "Required by the command invocation.",
    "lifetime": "one-shot"
  }
]
```

### 恢复

```json
[
  {
    "when": "The operation fails or completion is uncertain.",
    "stateCheck": "none",
    "requiresHandles": [],
    "action": "Inspect stateChange and handleConsumption before repeating the operation.",
    "nextCommand": "surface describe"
  }
]
```

### 目标

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v1/workflows/agent-runs/{agentRunId}/abandon"
  }
]
```
