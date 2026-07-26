# `zotero-bridge workflow agent-apply`

应用已定稿的 agent 自有 workflow result bundle

## 用法

```console
zotero-bridge workflow agent-apply [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] AGENT_RUN_ID <AGENT_RUN_ID> --result <AGENT_REQUEST_ID=BUNDLE_PATH>
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
| AGENT_RUN_ID | agent_run_id | positional | yes | — | AGENT_RUN_ID | no | — | — | Agent run id returned by workflow agent-run |
| --result | results | option | yes | — | AGENT_REQUEST_ID=BUNDLE_PATH; numArgs: 1 | yes | — | — | Apply-back result mapping. Repeat for multiple request bundles. |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "agent_run_id": {
      "type": "string",
      "description": "Agent run id returned by workflow agent-run",
      "position": 1
    },
    "result": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Apply-back result mapping. Repeat for multiple request bundles."
    }
  },
  "required": [
    "agent_run_id",
    "result"
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
    },
    "result": {
      "type": "string",
      "description": "Apply-back result mapping. Repeat for multiple request bundles."
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
    "appliedAt": {
      "type": "string"
    },
    "permission": {
      "type": "object"
    },
    "summary": {
      "type": "object",
      "properties": {
        "total": {
          "type": "integer",
          "minimum": 0
        },
        "succeeded": {
          "type": "integer",
          "minimum": 0
        },
        "failed": {
          "type": "integer",
          "minimum": 0
        }
      },
      "required": [
        "total",
        "succeeded",
        "failed"
      ],
      "additionalProperties": false
    },
    "stateChange": {
      "enum": [
        "unchanged",
        "changed"
      ]
    },
    "handleConsumption": {
      "const": "consumed"
    },
    "receiptUrl": {
      "type": "string"
    }
  },
  "required": [
    "agentRunId",
    "workflowId",
    "appliedAt",
    "permission",
    "summary",
    "stateChange",
    "handleConsumption",
    "receiptUrl"
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
  "command": "workflow agent-apply",
  "argv": [
    "workflow",
    "agent-apply"
  ],
  "summary": "Apply finalized self-owned agent workflow result bundles",
  "category": "write",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "agent_run_id": {
        "type": "string",
        "description": "Agent run id returned by workflow agent-run",
        "position": 1
      },
      "result": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Apply-back result mapping. Repeat for multiple request bundles."
      }
    },
    "required": [
      "agent_run_id",
      "result"
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
    },
    {
      "id": "results",
      "kind": "option",
      "token": "--result",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Apply-back result mapping. Repeat for multiple request bundles.",
      "valueNames": [
        "AGENT_REQUEST_ID=BUNDLE_PATH"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": true,
      "numArgs": "1",
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
    },
    {
      "property": "result",
      "kind": "option",
      "token": "--result",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "AGENT_REQUEST_ID=BUNDLE_PATH"
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
      },
      "result": {
        "type": "string",
        "description": "Apply-back result mapping. Repeat for multiple request bundles."
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
      "appliedAt": {
        "type": "string"
      },
      "permission": {
        "type": "object"
      },
      "summary": {
        "type": "object",
        "properties": {
          "total": {
            "type": "integer",
            "minimum": 0
          },
          "succeeded": {
            "type": "integer",
            "minimum": 0
          },
          "failed": {
            "type": "integer",
            "minimum": 0
          }
        },
        "required": [
          "total",
          "succeeded",
          "failed"
        ],
        "additionalProperties": false
      },
      "stateChange": {
        "enum": [
          "unchanged",
          "changed"
        ]
      },
      "handleConsumption": {
        "const": "consumed"
      },
      "receiptUrl": {
        "type": "string"
      }
    },
    "required": [
      "agentRunId",
      "workflowId",
      "appliedAt",
      "permission",
      "summary",
      "stateChange",
      "handleConsumption",
      "receiptUrl"
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
    },
    {
      "kind": "zotero-library",
      "stateChanged": true,
      "description": "May apply finalized Agent results to the Zotero library."
    }
  ],
  "approvalContract": {
    "kind": "conditional",
    "timing": "apply-back",
    "scope": "Each result request is preflighted before any approval or handle consumption."
  },
  "handleTransitions": [
    {
      "handle": "agentRunId",
      "direction": "consume",
      "required": true,
      "condition": "Required by the command invocation.",
      "lifetime": "one-shot"
    },
    {
      "handle": "agentRequestId",
      "direction": "consume",
      "required": true,
      "condition": "Required by the command invocation.",
      "lifetime": "caller-owned"
    },
    {
      "handle": "applyReceipt",
      "direction": "produce",
      "required": false,
      "condition": "Returned when the corresponding operation succeeds.",
      "lifetime": "response"
    }
  ],
  "recovery": [
    {
      "when": "Apply-back fails after preflight or may have partially written results.",
      "stateCheck": "caller-held-handle",
      "requiresHandles": [
        "agentRunId"
      ],
      "action": "Read the persisted per-request apply receipt before retrying any result.",
      "nextCommand": "workflow agent-apply-status"
    }
  ],
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v1/workflows/agent-runs/{agentRunId}/apply"
    }
  ],
  "operationalAliases": [
    "workflow agent-apply",
    "workflow",
    "agent-apply",
    "agent_run_id",
    "AGENT_RUN_ID",
    "results",
    "result",
    "AGENT_REQUEST_ID=BUNDLE_PATH"
  ],
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `workflow` `agent-apply`.
- 输出边界： `fixed`; governed details: {"strategy":"fixed"}.
- 分页： `none`.
- 类别： `write`; danger: `review`.
- 意图可见性： `visible`.
- 操作别名： `workflow agent-apply`, `workflow`, `agent-apply`, `agent_run_id`, `AGENT_RUN_ID`, `results`, `result`, `AGENT_REQUEST_ID=BUNDLE_PATH`.
### Effects

```json
[
  {
    "kind": "workflow-control",
    "stateChanged": true,
    "description": "May change workflow control state."
  },
  {
    "kind": "zotero-library",
    "stateChanged": true,
    "description": "May apply finalized Agent results to the Zotero library."
  }
]
```

### Approval

```json
{
  "kind": "conditional",
  "timing": "apply-back",
  "scope": "Each result request is preflighted before any approval or handle consumption."
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
  },
  {
    "handle": "agentRequestId",
    "direction": "consume",
    "required": true,
    "condition": "Required by the command invocation.",
    "lifetime": "caller-owned"
  },
  {
    "handle": "applyReceipt",
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
    "when": "Apply-back fails after preflight or may have partially written results.",
    "stateCheck": "caller-held-handle",
    "requiresHandles": [
      "agentRunId"
    ],
    "action": "Read the persisted per-request apply receipt before retrying any result.",
    "nextCommand": "workflow agent-apply-status"
  }
]
```

### 目标

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v1/workflows/agent-runs/{agentRunId}/apply"
  }
]
```
