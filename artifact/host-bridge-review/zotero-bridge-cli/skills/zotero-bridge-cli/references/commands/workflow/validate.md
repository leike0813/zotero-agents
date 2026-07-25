# `zotero-bridge workflow validate`

在不启动执行的情况下校验 workflow input

## 用法

```console
zotero-bridge workflow validate [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --workflow <WORKFLOW> [--selection <JSON_OR_FILE>] [--none] [--workflow-options <JSON_OR_FILE>]
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
| --workflow | workflow | option | yes | — | WORKFLOW | no | — | — | Workflow id to validate |
| --selection | selection | option | no | Required unless --none is supplied. | JSON_OR_FILE | no | — | none | Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin |
| --none | none | option | no | — | NONE; values: true, false | no | — | selection | Validate a no-selection workflow |
| --workflow-options | workflow_options | option | no | — | JSON_OR_FILE | no | — | — | Workflow options JSON object, file path, @file, or '-' for stdin |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "workflow": {
      "type": "string",
      "description": "Workflow id to validate"
    },
    "selection": {
      "type": "string",
      "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"
    },
    "none": {
      "type": "boolean",
      "description": "Validate a no-selection workflow"
    },
    "workflow-options": {
      "type": "string",
      "description": "Workflow options JSON object, file path, @file, or '-' for stdin"
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

### `--workflow-options` (workflow_options)

必填： `false`.

```json
{
  "type": "object",
  "description": "Workflow-declared option values are intentionally open and are validated by the selected workflow.",
  "additionalProperties": true,
  "x-openPropertiesReason": "The selected workflow manifest owns its option vocabulary."
}
```

## 合成 payload schema

```json
{
  "type": "object",
  "properties": {
    "workflow": {
      "type": "string",
      "description": "Workflow id to validate"
    },
    "selection": {
      "type": "string",
      "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"
    },
    "workflow_options": {
      "type": "string",
      "description": "Workflow options JSON object, file path, @file, or '-' for stdin"
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
    "response": {
      "type": "object",
      "description": "Response object returned by POST /bridge/v1/workflows/validate.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
    }
  },
  "additionalProperties": true,
  "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
}
```

## 示例

### selection: shape-only

最小 JSON 结构： --selection.

```console
zotero-bridge workflow validate --selection '["example"]'
```

前置条件：

- 执行前，请将示例标识符和值替换为对所选 Zotero 文献库、workflow、provider 或 capability 有效的输入。

### workflow_options: shape-only

最小 JSON 结构： --workflow-options.

```console
zotero-bridge workflow validate --workflow-options '{}'
```

前置条件：

- 执行前，请将示例标识符和值替换为对所选 Zotero 文献库、workflow、provider 或 capability 有效的输入。

## 完整命令 descriptor

此封闭 descriptor 是 `surface describe` 返回的机器可读命令契约；将其收录于此，使本命令卡无需加载其他命令参考即可独立审计。

```json
{
  "command": "workflow validate",
  "argv": [
    "workflow",
    "validate"
  ],
  "summary": "Validate workflow input without starting execution",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "workflow": {
        "type": "string",
        "description": "Workflow id to validate"
      },
      "selection": {
        "type": "string",
        "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"
      },
      "none": {
        "type": "boolean",
        "description": "Validate a no-selection workflow"
      },
      "workflow-options": {
        "type": "string",
        "description": "Workflow options JSON object, file path, @file, or '-' for stdin"
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
      "help": "Workflow id to validate",
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
      "help": "Validate a no-selection workflow",
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
      "id": "workflow_options",
      "kind": "option",
      "token": "--workflow-options",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Workflow options JSON object, file path, @file, or '-' for stdin",
      "valueNames": [
        "JSON_OR_FILE"
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
      "property": "workflow-options",
      "kind": "option",
      "token": "--workflow-options",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "JSON_OR_FILE"
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
    },
    "workflow_options": {
      "token": "--workflow-options",
      "required": false,
      "requiredWhen": [],
      "schema": {
        "type": "object",
        "description": "Workflow-declared option values are intentionally open and are validated by the selected workflow.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The selected workflow manifest owns its option vocabulary."
      },
      "examples": [
        {
          "kind": "shape-only",
          "value": {},
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "description": "Minimal JSON shape for --workflow-options."
        }
      ]
    }
  },
  "payloadSchema": {
    "type": "object",
    "properties": {
      "workflow": {
        "type": "string",
        "description": "Workflow id to validate"
      },
      "selection": {
        "type": "string",
        "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"
      },
      "workflow_options": {
        "type": "string",
        "description": "Workflow options JSON object, file path, @file, or '-' for stdin"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "response": {
        "type": "object",
        "description": "Response object returned by POST /bridge/v1/workflows/validate.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
      }
    },
    "additionalProperties": true,
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
  },
  "outputBoundary": {
    "strategy": "fixed"
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
      "kind": "endpoint",
      "target": "POST /bridge/v1/workflows/validate"
    }
  ],
  "operationalAliases": [
    "workflow validate",
    "workflow",
    "validate",
    "WORKFLOW",
    "selection",
    "JSON_OR_FILE",
    "none",
    "NONE",
    "workflow_options",
    "workflow-options"
  ],
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `workflow` `validate`.
- 输出边界： `fixed`; governed details: {"strategy":"fixed"}.
- 分页： `none`.
- 类别： `read`; danger: `none`.
- 意图可见性： `visible`.
- 操作别名： `workflow validate`, `workflow`, `validate`, `WORKFLOW`, `selection`, `JSON_OR_FILE`, `none`, `NONE`, `workflow_options`, `workflow-options`.
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
    "kind": "endpoint",
    "target": "POST /bridge/v1/workflows/validate"
  }
]
```
