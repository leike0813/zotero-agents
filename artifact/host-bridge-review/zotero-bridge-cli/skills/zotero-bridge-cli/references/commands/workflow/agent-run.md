# `zotero-bridge workflow agent-run`

准备 agent 自有的 workflow handoff bundle

## 用法

```console
zotero-bridge workflow agent-run [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --workflow <WORKFLOW> [--selection <JSON_OR_FILE>] [--none] [--output-dir <DIR>]
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
| --workflow | workflow | option | yes | — | WORKFLOW | no | — | — | Workflow id to prepare for self-owned agent execution |
| --selection | selection | option | no | Required unless --none is supplied. | JSON_OR_FILE | no | — | none | Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin |
| --none | none | option | no | — | NONE; values: true, false | no | — | selection | Prepare a no-selection workflow |
| --output-dir | output_dir | option | no | — | DIR | no | — | — | Download the handoff zip into this directory |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "workflow": {
      "type": "string",
      "description": "Workflow id to prepare for self-owned agent execution"
    },
    "selection": {
      "type": "string",
      "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"
    },
    "none": {
      "type": "boolean",
      "description": "Prepare a no-selection workflow"
    },
    "output-dir": {
      "type": "string",
      "description": "Download the handoff zip into this directory"
    }
  },
  "required": [
    "workflow"
  ],
  "allOf": [
    {
      "not": {
        "required": [
          "selection",
          "none"
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
  "additionalProperties": false
}
```

## 结构化输入 schema

### `--selection` (selection)

必填： `false`; 条件： Required unless --none is supplied..

```json
{
  "type": "array",
  "minItems": 1,
  "items": {
    "oneOf": [
      {
        "type": "string",
        "minLength": 1
      },
      {
        "type": "integer"
      },
      {
        "type": "object",
        "properties": {
          "key": {
            "type": "string",
            "minLength": 1
          },
          "id": {
            "type": [
              "integer",
              "string"
            ]
          },
          "libraryId": {
            "type": [
              "integer",
              "string"
            ]
          }
        },
        "anyOf": [
          {
            "required": [
              "key"
            ]
          },
          {
            "required": [
              "id"
            ]
          }
        ],
        "additionalProperties": false
      }
    ]
  }
}
```

## 合成 payload schema

```json
{
  "type": "object",
  "properties": {
    "workflow": {
      "type": "string",
      "description": "Workflow id to prepare for self-owned agent execution"
    },
    "selection": {
      "type": "string",
      "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"
    },
    "output_dir": {
      "type": "string",
      "description": "Download the handoff zip into this directory"
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
    "workflowLabel": {
      "type": "string"
    },
    "generatedAt": {
      "type": "string"
    },
    "expiresAt": {
      "type": "string"
    },
    "requestCount": {
      "type": "integer",
      "minimum": 0
    },
    "instruction": {
      "type": "string"
    },
    "applyStatus": {
      "type": "object"
    },
    "bundle": {
      "type": "object"
    },
    "contents": {
      "type": "object"
    },
    "notes": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "bundleInspectCommand": {
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
  "additionalProperties": false
}
```

## 示例

### selection: shape-only

最小 JSON 结构： --selection.

```console
zotero-bridge workflow agent-run --selection '["example"]'
```

前置条件：

- 执行前，请将示例标识符和值替换为对所选 Zotero 文献库、workflow、provider 或 capability 有效的输入。

## 完整命令 descriptor

此封闭 descriptor 是 `surface describe` 返回的机器可读命令契约；将其收录于此，使本命令卡无需加载其他命令参考即可独立审计。

```json
{
  "command": "workflow agent-run",
  "argv": [
    "workflow",
    "agent-run"
  ],
  "summary": "Prepare a self-owned agent workflow handoff bundle",
  "category": "write",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "workflow": {
        "type": "string",
        "description": "Workflow id to prepare for self-owned agent execution"
      },
      "selection": {
        "type": "string",
        "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"
      },
      "none": {
        "type": "boolean",
        "description": "Prepare a no-selection workflow"
      },
      "output-dir": {
        "type": "string",
        "description": "Download the handoff zip into this directory"
      }
    },
    "required": [
      "workflow"
    ],
    "allOf": [
      {
        "not": {
          "required": [
            "selection",
            "none"
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
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "workflow",
      "kind": "option",
      "token": "--workflow",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Workflow id to prepare for self-owned agent execution",
      "valueNames": [
        "WORKFLOW"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "selection",
      "kind": "option",
      "token": "--selection",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin",
      "valueNames": [
        "JSON_OR_FILE"
      ],
      "possibleValues": [],
      "conflictsWith": [
        "none"
      ],
      "repeatable": false,
      "aliases": [
        "items"
      ],
      "defaultValues": []
    },
    {
      "id": "none",
      "kind": "option",
      "token": "--none",
      "takesValue": false,
      "required": false,
      "global": false,
      "help": "Prepare a no-selection workflow",
      "valueNames": [
        "NONE"
      ],
      "possibleValues": [
        "true",
        "false"
      ],
      "conflictsWith": [
        "selection"
      ],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "output_dir",
      "kind": "option",
      "token": "--output-dir",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Download the handoff zip into this directory",
      "valueNames": [
        "DIR"
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
      "property": "workflow",
      "kind": "option",
      "token": "--workflow",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "WORKFLOW"
      ]
    },
    {
      "property": "selection",
      "kind": "option",
      "token": "--selection",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "JSON_OR_FILE"
      ]
    },
    {
      "property": "none",
      "kind": "option",
      "token": "--none",
      "takesValue": false,
      "required": false,
      "valueNames": [
        "NONE"
      ]
    },
    {
      "property": "output-dir",
      "kind": "option",
      "token": "--output-dir",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "DIR"
      ]
    }
  ],
  "inputSchemas": {
    "selection": {
      "token": "--selection",
      "required": false,
      "requiredWhen": [
        "Required unless --none is supplied."
      ],
      "schema": {
        "type": "array",
        "minItems": 1,
        "items": {
          "oneOf": [
            {
              "type": "string",
              "minLength": 1
            },
            {
              "type": "integer"
            },
            {
              "type": "object",
              "properties": {
                "key": {
                  "type": "string",
                  "minLength": 1
                },
                "id": {
                  "type": [
                    "integer",
                    "string"
                  ]
                },
                "libraryId": {
                  "type": [
                    "integer",
                    "string"
                  ]
                }
              },
              "anyOf": [
                {
                  "required": [
                    "key"
                  ]
                },
                {
                  "required": [
                    "id"
                  ]
                }
              ],
              "additionalProperties": false
            }
          ]
        }
      },
      "examples": [
        {
          "kind": "shape-only",
          "value": [
            "example"
          ],
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "description": "Minimal JSON shape for --selection."
        }
      ]
    }
  },
  "payloadSchema": {
    "type": "object",
    "properties": {
      "workflow": {
        "type": "string",
        "description": "Workflow id to prepare for self-owned agent execution"
      },
      "selection": {
        "type": "string",
        "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"
      },
      "output_dir": {
        "type": "string",
        "description": "Download the handoff zip into this directory"
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
      "workflowLabel": {
        "type": "string"
      },
      "generatedAt": {
        "type": "string"
      },
      "expiresAt": {
        "type": "string"
      },
      "requestCount": {
        "type": "integer",
        "minimum": 0
      },
      "instruction": {
        "type": "string"
      },
      "applyStatus": {
        "type": "object"
      },
      "bundle": {
        "type": "object"
      },
      "contents": {
        "type": "object"
      },
      "notes": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "bundleInspectCommand": {
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
      "handle": "itemRef",
      "direction": "consume",
      "required": false,
      "condition": "Required only for an explicit --selection input; --none carries no itemRef.",
      "lifetime": "caller-owned"
    },
    {
      "handle": "agentRunId",
      "direction": "produce",
      "required": false,
      "condition": "Returned when the corresponding operation succeeds.",
      "lifetime": "one-shot"
    },
    {
      "handle": "agentRequestId",
      "direction": "produce",
      "required": false,
      "condition": "Returned when the corresponding operation succeeds.",
      "lifetime": "response"
    },
    {
      "handle": "fileId",
      "direction": "produce",
      "required": false,
      "condition": "Returned when the corresponding operation succeeds.",
      "lifetime": "short-lived"
    }
  ],
  "recovery": [
    {
      "when": "Handoff preparation fails or its response is uncertain.",
      "stateCheck": "command-result",
      "requiresHandles": [],
      "action": "Inspect the structured error; do not enter the Zotero-managed run plane.",
      "nextCommand": "workflow describe"
    }
  ],
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v1/workflows/agent-run"
    }
  ],
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
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `workflow` `agent-run`.
- 输出边界： `fixed`; governed details: {"strategy":"fixed"}.
- 分页： `none`.
- 类别： `write`; danger: `review`.
- 意图可见性： `visible`.
- 操作别名： `workflow agent-run`, `workflow`, `agent-run`, `WORKFLOW`, `selection`, `JSON_OR_FILE`, `none`, `NONE`, `output_dir`, `output-dir`, `DIR`.
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
    "handle": "itemRef",
    "direction": "consume",
    "required": false,
    "condition": "Required only for an explicit --selection input; --none carries no itemRef.",
    "lifetime": "caller-owned"
  },
  {
    "handle": "agentRunId",
    "direction": "produce",
    "required": false,
    "condition": "Returned when the corresponding operation succeeds.",
    "lifetime": "one-shot"
  },
  {
    "handle": "agentRequestId",
    "direction": "produce",
    "required": false,
    "condition": "Returned when the corresponding operation succeeds.",
    "lifetime": "response"
  },
  {
    "handle": "fileId",
    "direction": "produce",
    "required": false,
    "condition": "Returned when the corresponding operation succeeds.",
    "lifetime": "short-lived"
  }
]
```

### 恢复

```json
[
  {
    "when": "Handoff preparation fails or its response is uncertain.",
    "stateCheck": "command-result",
    "requiresHandles": [],
    "action": "Inspect the structured error; do not enter the Zotero-managed run plane.",
    "nextCommand": "workflow describe"
  }
]
```

### 目标

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v1/workflows/agent-run"
  }
]
```
