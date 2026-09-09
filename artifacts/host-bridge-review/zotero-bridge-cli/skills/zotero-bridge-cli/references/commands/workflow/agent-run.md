# `zotero-bridge workflow agent-run`

准备一个自有 agent workflow handoff bundle

## 用法

```console
zotero-bridge workflow agent-run [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --workflow <WORKFLOW> [--selection <JSON_OR_FILE>] [--none] [--output-dir <DIR>]
```

全局选项可出现在叶命令之前或之后。使用 `--schema` 检查原始结构化输入 schema，而无需加载 profile 或连接 Zotero。

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
| --workflow | workflow | option | yes | — | WORKFLOW | no | — | — | 为自有 agent 执行准备的 Workflow id |
| --selection | selection | option | no | 除非提供了 --none，否则必填。 | JSON_OR_FILE | no | — | none | Workflow selection 的 item refs，以 JSON 数组、文件路径、@file 或 '-' 表示 stdin |
| --none | none | option | no | — | NONE; values: true, false | no | — | selection | 准备一个无选择 workflow |
| --output-dir | output_dir | option | no | — | DIR | no | — | — | 将 handoff zip 下载到此目录 |

## 调用 schema

```json
{
  "additionalProperties": false,
  "allOf": [
    {
      "not": {
        "required": [
          "none",
          "selection"
        ]
      }
    },
    {
      "oneOf": [
        {
          "required": [
            "selection"
          ]
        },
        {
          "required": [
            "none"
          ]
        }
      ]
    }
  ],
  "properties": {
    "none": {
      "description": "Prepare a no-selection workflow",
      "type": "boolean"
    },
    "output-dir": {
      "description": "Download the handoff zip into this directory",
      "type": "string"
    },
    "selection": {
      "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin",
      "type": "string"
    },
    "workflow": {
      "description": "Workflow id to prepare for self-owned agent execution",
      "type": "string"
    }
  },
  "required": [
    "workflow"
  ],
  "type": "object"
}
```

## 结构化输入 schema

### `--selection`（selection）

必填：`false`；条件：除非提供了 --none，否则必填。

```json
{
  "items": {
    "additionalProperties": false,
    "properties": {
      "key": {
        "minLength": 1,
        "type": "string"
      },
      "libraryId": {
        "minimum": 1,
        "type": "integer"
      }
    },
    "required": [
      "libraryId",
      "key"
    ],
    "type": "object"
  },
  "minItems": 1,
  "type": "array"
}
```

## 组合载荷 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "output_dir": {
      "description": "Download the handoff zip into this directory",
      "type": "string"
    },
    "selection": {
      "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin",
      "type": "string"
    },
    "workflow": {
      "description": "Workflow id to prepare for self-owned agent execution",
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
    "applyStatus": {
      "type": "object"
    },
    "bundle": {
      "type": "object"
    },
    "bundleInspectCommand": {
      "type": "string"
    },
    "contents": {
      "type": "object"
    },
    "expiresAt": {
      "type": "string"
    },
    "generatedAt": {
      "type": "string"
    },
    "instruction": {
      "type": "string"
    },
    "notes": {
      "items": {
        "type": "string"
      },
      "type": "array"
    },
    "requestCount": {
      "minimum": 0,
      "type": "integer"
    },
    "workflowId": {
      "type": "string"
    },
    "workflowLabel": {
      "type": "string"
    }
  },
  "required": [
    "agentRunId",
    "workflowId",
    "expiresAt",
    "requestCount",
    "bundle",
    "bundleInspectCommand"
  ],
  "type": "object"
}
```

## 示例

### selection: 仅形状

--selection 的最小 JSON 形状。

```console
zotero-bridge workflow agent-run --selection '[{"key":"ABC12345","libraryId":1}]'
```

前置条件：

- 执行前，将示例中的标识符与值替换为对所选 Zotero 库、workflow、provider 或 capability 有效的输入。

## 完整命令描述符

此封闭描述符是 `surface describe` 返回的机器可读命令契约；此处包含它，以便在不加载另一份命令参考的情况下，本卡片仍可独立审计。

```json
{
  "approvalContract": {
    "kind": "none",
    "scope": "No Zotero UI approval; provider runtimes may still request their own permission.",
    "timing": "none"
  },
  "arguments": [
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Workflow id to prepare for self-owned agent execution",
      "id": "workflow",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "--workflow",
      "valueNames": [
        "WORKFLOW"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [
        "none"
      ],
      "defaultValues": [],
      "global": false,
      "help": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin",
      "id": "selection",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--selection",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [
        "selection"
      ],
      "defaultValues": [],
      "global": false,
      "help": "Prepare a no-selection workflow",
      "id": "none",
      "kind": "option",
      "possibleValues": [
        "true",
        "false"
      ],
      "repeatable": false,
      "required": false,
      "takesValue": false,
      "token": "--none",
      "valueNames": [
        "NONE"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Download the handoff zip into this directory",
      "id": "output_dir",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--output-dir",
      "valueNames": [
        "DIR"
      ]
    }
  ],
  "argv": [
    "workflow",
    "agent-run"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "workflow",
      "required": true,
      "takesValue": true,
      "token": "--workflow",
      "valueNames": [
        "WORKFLOW"
      ]
    },
    {
      "kind": "option",
      "property": "selection",
      "required": false,
      "takesValue": true,
      "token": "--selection",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    },
    {
      "kind": "option",
      "property": "none",
      "required": false,
      "takesValue": false,
      "token": "--none",
      "valueNames": [
        "NONE"
      ]
    },
    {
      "kind": "option",
      "property": "output-dir",
      "required": false,
      "takesValue": true,
      "token": "--output-dir",
      "valueNames": [
        "DIR"
      ]
    }
  ],
  "binding": "overlay",
  "category": "write",
  "command": "workflow agent-run",
  "composition": null,
  "danger": "review",
  "effects": [
    {
      "description": "May change workflow control state.",
      "kind": "workflow-control",
      "stateChanged": true
    }
  ],
  "handleTransitions": [
    {
      "condition": "Required only for an explicit --selection input; --none carries no itemRef.",
      "direction": "consume",
      "handle": "itemRef",
      "lifetime": "caller-owned",
      "required": false
    },
    {
      "condition": "Returned when the corresponding operation succeeds.",
      "direction": "produce",
      "handle": "agentRunId",
      "lifetime": "one-shot",
      "required": false
    },
    {
      "condition": "Returned when the corresponding operation succeeds.",
      "direction": "produce",
      "handle": "agentRequestId",
      "lifetime": "response",
      "required": false
    },
    {
      "condition": "Returned when the corresponding operation succeeds.",
      "direction": "produce",
      "handle": "fileId",
      "lifetime": "short-lived",
      "required": false
    }
  ],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {
    "selection": {
      "examples": [
        {
          "description": "Minimal JSON shape for --selection.",
          "kind": "shape-only",
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "value": [
            {
              "key": "ABC12345",
              "libraryId": 1
            }
          ]
        }
      ],
      "required": false,
      "requiredWhen": [
        "Required unless --none is supplied."
      ],
      "schema": {
        "items": {
          "additionalProperties": false,
          "properties": {
            "key": {
              "minLength": 1,
              "type": "string"
            },
            "libraryId": {
              "minimum": 1,
              "type": "integer"
            }
          },
          "required": [
            "libraryId",
            "key"
          ],
          "type": "object"
        },
        "minItems": 1,
        "type": "array"
      },
      "schemaSource": "inline",
      "token": "--selection"
    }
  },
  "invocationSchema": {
    "additionalProperties": false,
    "allOf": [
      {
        "not": {
          "required": [
            "none",
            "selection"
          ]
        }
      },
      {
        "oneOf": [
          {
            "required": [
              "selection"
            ]
          },
          {
            "required": [
              "none"
            ]
          }
        ]
      }
    ],
    "properties": {
      "none": {
        "description": "Prepare a no-selection workflow",
        "type": "boolean"
      },
      "output-dir": {
        "description": "Download the handoff zip into this directory",
        "type": "string"
      },
      "selection": {
        "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin",
        "type": "string"
      },
      "workflow": {
        "description": "Workflow id to prepare for self-owned agent execution",
        "type": "string"
      }
    },
    "required": [
      "workflow"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "workflow agent-run",
    "workflow",
    "agent-run",
    "WORKFLOW",
    "selection",
    "JSON_OR_FILE",
    "none",
    "NONE",
    "output_dir",
    "output-dir",
    "DIR"
  ],
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "output_dir": {
        "description": "Download the handoff zip into this directory",
        "type": "string"
      },
      "selection": {
        "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin",
        "type": "string"
      },
      "workflow": {
        "description": "Workflow id to prepare for self-owned agent execution",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "recovery": [
    {
      "action": "Inspect the structured error; do not enter the Zotero-managed run plane.",
      "nextCommand": "workflow describe",
      "requiresHandles": [],
      "stateCheck": "command-result",
      "when": "Handoff preparation fails or its response is uncertain."
    }
  ],
  "resultSchema": {
    "additionalProperties": false,
    "properties": {
      "agentRunId": {
        "type": "string"
      },
      "applyStatus": {
        "type": "object"
      },
      "bundle": {
        "type": "object"
      },
      "bundleInspectCommand": {
        "type": "string"
      },
      "contents": {
        "type": "object"
      },
      "expiresAt": {
        "type": "string"
      },
      "generatedAt": {
        "type": "string"
      },
      "instruction": {
        "type": "string"
      },
      "notes": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "requestCount": {
        "minimum": 0,
        "type": "integer"
      },
      "workflowId": {
        "type": "string"
      },
      "workflowLabel": {
        "type": "string"
      }
    },
    "required": [
      "agentRunId",
      "workflowId",
      "expiresAt",
      "requestCount",
      "bundle",
      "bundleInspectCommand"
    ],
    "type": "object"
  },
  "summary": "Prepare a self-owned agent workflow handoff bundle",
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v2/workflows/agent-run"
    },
    {
      "kind": "endpoint",
      "target": "GET /bridge/v2/files/{fileId}"
    }
  ]
}
```

## 参数失败与恢复契约

参数失败以单个 JSON 错误信封返回。先检查 `error.code`，然后要求 `error.details.schema` 为 `host-bridge.argument-error.v1`，再使用结构化边界字段。保留规范命令、已净化的输入以及任何已返回的类型化句柄；绝不在证据中包含完整的原始载荷。

- `argv` 报告缺失、未知、冲突或无效的 CLI 参数。请依据本卡片的参数表或当前命令帮助重建 argv。
- `json_source` 报告 stdin 或文件源不可读。请修正该源，而不要将值挪到另一个绑定。
- `json_syntax` 以安全行列上下文报告无效 JSON。在解读领域字段前先修复语法。
- `command_input` 报告结构化输入的 schema 违规。检查有界的 `violations`，然后用 `--schema` 运行此精确叶命令并修正所声明的字段或类型；不要自行发明别名。
- `payload_contract` 表示 CLI 组合出的 capability 载荷在网络 I/O 之前违反了可执行契约。将其视为实现缺陷；不要用原始传输绕过语义命令。
- `command_result` 表示 Host 响应或本地结果未通过其可执行结果 schema。不得将其作为成功证据接受或报告。
- 违规数组经过脱敏、确定性排序，并最多保留八项。当 `truncated` 为 true 时，应修正所报告的违规并重新校验，而不是要求披露秘密或完整载荷。

## 操作契约

- 规范 argv 路径：`workflow` `agent-run`。
- 输出边界：`fixed`；受管辖细节：{"strategy":"fixed"}。
- 分页：`none`。
- 类别：`write`；危险级别：`review`。
- 结构化绑定模式：`overlay`。
- 意图可见性：`visible`。
- 操作别名：`workflow agent-run`、`workflow`、`agent-run`、`WORKFLOW`、`selection`、`JSON_OR_FILE`、`none`、`NONE`、`output_dir`、`output-dir`、`DIR`。

### 效果

```json
[
  {
    "description": "May change workflow control state.",
    "kind": "workflow-control",
    "stateChanged": true
  }
]
```

### 审批

```json
{
  "kind": "none",
  "scope": "No Zotero UI approval; provider runtimes may still request their own permission.",
  "timing": "none"
}
```

### 句柄转换

```json
[
  {
    "condition": "Required only for an explicit --selection input; --none carries no itemRef.",
    "direction": "consume",
    "handle": "itemRef",
    "lifetime": "caller-owned",
    "required": false
  },
  {
    "condition": "Returned when the corresponding operation succeeds.",
    "direction": "produce",
    "handle": "agentRunId",
    "lifetime": "one-shot",
    "required": false
  },
  {
    "condition": "Returned when the corresponding operation succeeds.",
    "direction": "produce",
    "handle": "agentRequestId",
    "lifetime": "response",
    "required": false
  },
  {
    "condition": "Returned when the corresponding operation succeeds.",
    "direction": "produce",
    "handle": "fileId",
    "lifetime": "short-lived",
    "required": false
  }
]
```

### 恢复

```json
[
  {
    "action": "Inspect the structured error; do not enter the Zotero-managed run plane.",
    "nextCommand": "workflow describe",
    "requiresHandles": [],
    "stateCheck": "command-result",
    "when": "Handoff preparation fails or its response is uncertain."
  }
]
```

### 目标

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v2/workflows/agent-run"
  },
  {
    "kind": "endpoint",
    "target": "GET /bridge/v2/files/{fileId}"
  }
]
```
