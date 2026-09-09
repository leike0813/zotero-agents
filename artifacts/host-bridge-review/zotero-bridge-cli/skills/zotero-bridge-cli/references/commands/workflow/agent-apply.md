# `zotero-bridge workflow agent-apply`

应用已定稿的自有 agent workflow 结果 bundles

## 用法

```console
zotero-bridge workflow agent-apply [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] AGENT_RUN_ID <AGENT_RUN_ID> --result <AGENT_REQUEST_ID=BUNDLE_PATH>
```

全局选项可出现在叶命令之前或之后。此叶命令没有结构化 JSON 输入。`--schema` 返回 `command_input_schema_unavailable`；请使用命令帮助或 `surface describe` 检查调用契约。

## 全局参数

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --endpoint | endpoint | option | no | — | ENDPOINT | no | ZOTERO_BRIDGE_ENDPOINT | — | Zotero Bridge 服务端点基础 URL。若省略，CLI 读取 ZOTERO_BRIDGE_ENDPOINT 或 profile 文件。CLI 不会猜测随机的 bridge 端口。 |
| --operation-id | operation_id | option | no | — | ID | no | ZOTERO_BRIDGE_OPERATION_ID | — | 用于改变状态的 Zotero 请求的不透明 idempotency id |
| --profile | profile | option | no | — | PATH | no | ZOTERO_BRIDGE_PROFILE | — | Zotero Bridge connection-profile JSON 文件的路径。若省略，CLI 会尝试 Zotero Agents 的 well-known profile。ACP run profile 通常引用 tokenEnv；本地 well-known profile 可能包含受用户级文件权限保护的 bearer token。 |
| --schema | schema | option | no | — | SCHEMA; values: true, false | no | — | — | 打印一个规范叶命令的带版本原始 JSON Schema 与受管辖示例。Schema 模式为离线模式，不加载 profile、不读取 Zotero Bridge 配置，也不连接 Zotero。 |

## 局部选项与位置参数

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AGENT_RUN_ID | agent_run_id | positional | yes | — | AGENT_RUN_ID | no | — | — | workflow agent-run 返回的 Agent run id |
| --result | results | option | yes | — | AGENT_REQUEST_ID=BUNDLE_PATH; numArgs: 1 | yes | — | — | Apply-back 结果映射。多个请求 bundle 时重复。 |

## 调用 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "agent_run_id": {
      "description": "Agent run id returned by workflow agent-run",
      "position": 1,
      "type": "string"
    },
    "result": {
      "description": "Apply-back result mapping. Repeat for multiple request bundles.",
      "items": {
        "type": "string"
      },
      "type": "array"
    }
  },
  "required": [
    "agent_run_id",
    "result"
  ],
  "type": "object"
}
```

## 结构化输入 schema

此命令没有结构化 JSON 输入参数。

## 组合载荷 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "agent_run_id": {
      "description": "Agent run id returned by workflow agent-run",
      "type": "string"
    },
    "result": {
      "description": "Apply-back result mapping. Repeat for multiple request bundles.",
      "type": "string"
    }
  },
  "required": [],
  "type": "object"
}
```

## 载荷组合

此命令没有独立的字段映射程序。其绑定模式为直接可执行：passthrough 使用唯一的结构化来源，而 `none` 与 `raw` 保持其声明的封闭行为。

`composition`：`null`。

## 结果 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "agentRunId": {
      "type": "string"
    },
    "appliedAt": {
      "type": "string"
    },
    "handleConsumption": {
      "const": "consumed"
    },
    "permission": {
      "type": "object"
    },
    "receiptUrl": {
      "type": "string"
    },
    "stateChange": {
      "enum": [
        "unchanged",
        "changed"
      ]
    },
    "summary": {
      "additionalProperties": false,
      "properties": {
        "failed": {
          "minimum": 0,
          "type": "integer"
        },
        "succeeded": {
          "minimum": 0,
          "type": "integer"
        },
        "total": {
          "minimum": 0,
          "type": "integer"
        }
      },
      "required": [
        "total",
        "succeeded",
        "failed"
      ],
      "type": "object"
    },
    "workflowId": {
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
  "type": "object"
}
```

## 示例

没有适用的结构化输入示例。请依据参数表构建 argv，并在执行前用 `surface describe` 确认命令。

## 完整命令描述符

此封闭描述符是 `surface describe` 返回的机器可读命令契约；此处包含它，以便在不加载另一份命令参考的情况下，本卡片仍可独立审计。

```json
{
  "approvalContract": {
    "kind": "conditional",
    "scope": "Each result request is preflighted before any approval or handle consumption.",
    "timing": "apply-back"
  },
  "arguments": [
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Agent run id returned by workflow agent-run",
      "id": "agent_run_id",
      "kind": "positional",
      "position": 1,
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "AGENT_RUN_ID",
      "valueNames": [
        "AGENT_RUN_ID"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Apply-back result mapping. Repeat for multiple request bundles.",
      "id": "results",
      "kind": "option",
      "numArgs": "1",
      "possibleValues": [],
      "repeatable": true,
      "required": true,
      "takesValue": true,
      "token": "--result",
      "valueNames": [
        "AGENT_REQUEST_ID=BUNDLE_PATH"
      ]
    }
  ],
  "argv": [
    "workflow",
    "agent-apply"
  ],
  "argvBindings": [
    {
      "kind": "positional",
      "position": 1,
      "property": "agent_run_id",
      "required": true,
      "takesValue": true,
      "token": "AGENT_RUN_ID",
      "valueNames": [
        "AGENT_RUN_ID"
      ]
    },
    {
      "kind": "option",
      "property": "result",
      "required": true,
      "takesValue": true,
      "token": "--result",
      "valueNames": [
        "AGENT_REQUEST_ID=BUNDLE_PATH"
      ]
    }
  ],
  "binding": "object",
  "category": "write",
  "command": "workflow agent-apply",
  "composition": null,
  "danger": "review",
  "effects": [
    {
      "description": "May change workflow control state.",
      "kind": "workflow-control",
      "stateChanged": true
    },
    {
      "description": "May apply finalized Agent results to the Zotero library.",
      "kind": "zotero-library",
      "stateChanged": true
    }
  ],
  "handleTransitions": [
    {
      "condition": "Required by the command invocation.",
      "direction": "consume",
      "handle": "agentRunId",
      "lifetime": "one-shot",
      "required": true
    },
    {
      "condition": "Required by the command invocation.",
      "direction": "consume",
      "handle": "agentRequestId",
      "lifetime": "caller-owned",
      "required": true
    },
    {
      "condition": "Returned when the corresponding operation succeeds.",
      "direction": "produce",
      "handle": "applyReceipt",
      "lifetime": "response",
      "required": false
    }
  ],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {},
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "agent_run_id": {
        "description": "Agent run id returned by workflow agent-run",
        "position": 1,
        "type": "string"
      },
      "result": {
        "description": "Apply-back result mapping. Repeat for multiple request bundles.",
        "items": {
          "type": "string"
        },
        "type": "array"
      }
    },
    "required": [
      "agent_run_id",
      "result"
    ],
    "type": "object"
  },
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
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "agent_run_id": {
        "description": "Agent run id returned by workflow agent-run",
        "type": "string"
      },
      "result": {
        "description": "Apply-back result mapping. Repeat for multiple request bundles.",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "recovery": [
    {
      "action": "Read the persisted per-request apply receipt before retrying any result.",
      "nextCommand": "workflow agent-apply-status",
      "requiresHandles": [
        "agentRunId"
      ],
      "stateCheck": "caller-held-handle",
      "when": "Apply-back fails after preflight or may have partially written results."
    }
  ],
  "resultSchema": {
    "additionalProperties": false,
    "properties": {
      "agentRunId": {
        "type": "string"
      },
      "appliedAt": {
        "type": "string"
      },
      "handleConsumption": {
        "const": "consumed"
      },
      "permission": {
        "type": "object"
      },
      "receiptUrl": {
        "type": "string"
      },
      "stateChange": {
        "enum": [
          "unchanged",
          "changed"
        ]
      },
      "summary": {
        "additionalProperties": false,
        "properties": {
          "failed": {
            "minimum": 0,
            "type": "integer"
          },
          "succeeded": {
            "minimum": 0,
            "type": "integer"
          },
          "total": {
            "minimum": 0,
            "type": "integer"
          }
        },
        "required": [
          "total",
          "succeeded",
          "failed"
        ],
        "type": "object"
      },
      "workflowId": {
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
    "type": "object"
  },
  "summary": "Apply finalized self-owned agent workflow result bundles",
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v2/workflows/agent-runs/{agentRunId}/apply"
    }
  ]
}
```

## 参数失败与恢复契约

参数失败以单个 JSON 错误信封返回。先检查 `error.code`，然后要求 `error.details.schema` 为 `host-bridge.argument-error.v1`，再使用结构化边界字段。保留规范命令、已净化的输入以及任何已返回的类型化句柄；绝不在证据中包含完整的原始载荷。

- `argv` 报告缺失、未知、冲突或无效的 CLI 参数。请依据本卡片的参数表或当前命令帮助重建 argv。
- `json_source` 报告 stdin 或文件源不可读。请修正该源，而不要将值挪到另一个绑定。
- `json_syntax` 以安全行列上下文报告无效 JSON。在解读领域字段前先修复语法。
- 此叶命令没有结构化 JSON 输入，因此 `command_input` 不是预期的调用边界。请使用 `surface describe` 了解其标量与位置参数契约。
- `payload_contract` 表示 CLI 组合出的 capability 载荷在网络 I/O 之前违反了可执行契约。将其视为实现缺陷；不要用原始传输绕过语义命令。
- `command_result` 表示 Host 响应或本地结果未通过其可执行结果 schema。不得将其作为成功证据接受或报告。
- 违规数组经过脱敏、确定性排序，并最多保留八项。当 `truncated` 为 true 时，应修正所报告的违规并重新校验，而不是要求披露秘密或完整载荷。

## 操作契约

- 规范 argv 路径：`workflow` `agent-apply`。
- 输出边界：`fixed`；受管辖细节：{"strategy":"fixed"}。
- 分页：`none`。
- 类别：`write`；危险级别：`review`。
- 结构化绑定模式：`object`。
- 意图可见性：`visible`。
- 操作别名：`workflow agent-apply`、`workflow`、`agent-apply`、`agent_run_id`、`AGENT_RUN_ID`、`results`、`result`、`AGENT_REQUEST_ID=BUNDLE_PATH`。

### 效果

```json
[
  {
    "description": "May change workflow control state.",
    "kind": "workflow-control",
    "stateChanged": true
  },
  {
    "description": "May apply finalized Agent results to the Zotero library.",
    "kind": "zotero-library",
    "stateChanged": true
  }
]
```

### 审批

```json
{
  "kind": "conditional",
  "scope": "Each result request is preflighted before any approval or handle consumption.",
  "timing": "apply-back"
}
```

### 句柄转换

```json
[
  {
    "condition": "Required by the command invocation.",
    "direction": "consume",
    "handle": "agentRunId",
    "lifetime": "one-shot",
    "required": true
  },
  {
    "condition": "Required by the command invocation.",
    "direction": "consume",
    "handle": "agentRequestId",
    "lifetime": "caller-owned",
    "required": true
  },
  {
    "condition": "Returned when the corresponding operation succeeds.",
    "direction": "produce",
    "handle": "applyReceipt",
    "lifetime": "response",
    "required": false
  }
]
```

### 恢复

```json
[
  {
    "action": "Read the persisted per-request apply receipt before retrying any result.",
    "nextCommand": "workflow agent-apply-status",
    "requiresHandles": [
      "agentRunId"
    ],
    "stateCheck": "caller-held-handle",
    "when": "Apply-back fails after preflight or may have partially written results."
  }
]
```

### 目标

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v2/workflows/agent-runs/{agentRunId}/apply"
  }
]
```
