# `zotero-bridge workflow submit`

使用显式 JSON input 提交 workflow

## 用法

```console
zotero-bridge workflow submit [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --workflow <WORKFLOW> [--selection <JSON_OR_FILE>] [--none] [--workflow-options <JSON_OR_FILE>] [--provider-profile <JSON_OR_FILE>] [--max-concurrency <MAX_CONCURRENCY>]
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
| --workflow | workflow | option | yes | — | WORKFLOW | no | — | — | Workflow id to submit |
| --selection | selection | option | no | Required unless --none is supplied. | JSON_OR_FILE | no | — | none | Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin |
| --none | none | option | no | — | NONE; values: true, false | no | — | selection | Submit a no-selection workflow |
| --workflow-options | workflow_options | option | no | — | JSON_OR_FILE | no | — | — | Workflow options JSON object, file path, @file, or '-' for stdin |
| --provider-profile | provider_profile | option | no | — | JSON_OR_FILE | no | — | — | Provider profile JSON object with backendId and providerOptions |
| --max-concurrency | max_concurrency | option | no | — | MAX_CONCURRENCY | no | — | — | Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "workflow": {
      "type": "string",
      "description": "Workflow id to submit"
    },
    "selection": {
      "type": "string",
      "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"
    },
    "none": {
      "type": "boolean",
      "description": "Submit a no-selection workflow"
    },
    "workflow-options": {
      "type": "string",
      "description": "Workflow options JSON object, file path, @file, or '-' for stdin"
    },
    "provider-profile": {
      "type": "string",
      "description": "Provider profile JSON object with backendId and providerOptions"
    },
    "max-concurrency": {
      "type": "string",
      "description": "Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited"
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

### `--provider-profile` (provider_profile)

必填： `false`.

```json
{
  "type": "object",
  "properties": {
    "backendId": {
      "type": "string",
      "minLength": 1
    },
    "backendType": {
      "enum": [
        "acp",
        "skillrunner",
        "generic-http",
        "pass-through"
      ]
    },
    "providerOptions": {
      "type": "object",
      "description": "Provider-owned options are intentionally open and are validated by the selected provider.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The selected provider owns its option vocabulary."
    }
  },
  "required": [],
  "additionalProperties": false
}
```

## 合成 payload schema

```json
{
  "type": "object",
  "properties": {
    "workflow": {
      "type": "string",
      "description": "Workflow id to submit"
    },
    "selection": {
      "type": "string",
      "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"
    },
    "workflow_options": {
      "type": "string",
      "description": "Workflow options JSON object, file path, @file, or '-' for stdin"
    },
    "provider_profile": {
      "type": "string",
      "description": "Provider profile JSON object with backendId and providerOptions"
    },
    "max_concurrency": {
      "type": "string",
      "description": "Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited"
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
    "workflowId": {
      "type": "string"
    },
    "workflowLabel": {
      "type": "string"
    },
    "admission": {
      "enum": [
        "direct",
        "host-queue"
      ]
    },
    "workflowRunId": {
      "type": "string"
    },
    "submissionId": {
      "type": "string"
    },
    "jobIds": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "totalJobs": {
      "type": "integer"
    },
    "tasks": {
      "type": "array",
      "items": {
        "type": "object"
      }
    },
    "totalUnits": {
      "type": "integer"
    },
    "queuedUnits": {
      "type": "integer"
    },
    "skippedUnits": {
      "type": "integer"
    },
    "submissionUrl": {
      "type": "string"
    },
    "queueUrl": {
      "type": "string"
    },
    "permission": {
      "type": "object"
    }
  },
  "required": [
    "workflowId",
    "workflowLabel",
    "admission",
    "permission"
  ],
  "oneOf": [
    {
      "properties": {
        "admission": {
          "const": "direct"
        }
      },
      "required": [
        "workflowRunId",
        "jobIds",
        "totalJobs",
        "tasks"
      ]
    },
    {
      "properties": {
        "admission": {
          "const": "host-queue"
        }
      },
      "required": [
        "submissionId",
        "totalUnits",
        "queuedUnits",
        "skippedUnits",
        "submissionUrl",
        "queueUrl"
      ]
    }
  ],
  "additionalProperties": false
}
```

## 示例

### selection: shape-only

最小 JSON 结构： --selection.

```console
zotero-bridge workflow submit --selection '["example"]'
```

前置条件：

- 执行前，请将示例标识符和值替换为对所选 Zotero 文献库、workflow、provider 或 capability 有效的输入。

### workflow_options: shape-only

最小 JSON 结构： --workflow-options.

```console
zotero-bridge workflow submit --workflow-options '{}'
```

前置条件：

- 执行前，请将示例标识符和值替换为对所选 Zotero 文献库、workflow、provider 或 capability 有效的输入。

### provider_profile: shape-only

最小 JSON 结构： --provider-profile.

```console
zotero-bridge workflow submit --provider-profile '{}'
```

前置条件：

- 执行前，请将示例标识符和值替换为对所选 Zotero 文献库、workflow、provider 或 capability 有效的输入。

## 完整命令 descriptor

此封闭 descriptor 是 `surface describe` 返回的机器可读命令契约；将其收录于此，使本命令卡无需加载其他命令参考即可独立审计。

```json
{
  "command": "workflow submit",
  "argv": [
    "workflow",
    "submit"
  ],
  "summary": "Submit a workflow with explicit JSON input",
  "category": "write",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "workflow": {
        "type": "string",
        "description": "Workflow id to submit"
      },
      "selection": {
        "type": "string",
        "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"
      },
      "none": {
        "type": "boolean",
        "description": "Submit a no-selection workflow"
      },
      "workflow-options": {
        "type": "string",
        "description": "Workflow options JSON object, file path, @file, or '-' for stdin"
      },
      "provider-profile": {
        "type": "string",
        "description": "Provider profile JSON object with backendId and providerOptions"
      },
      "max-concurrency": {
        "type": "string",
        "description": "Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited"
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
      "help": "Workflow id to submit",
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
      "help": "Submit a no-selection workflow",
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
    },
    {
      "id": "provider_profile",
      "kind": "option",
      "token": "--provider-profile",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Provider profile JSON object with backendId and providerOptions",
      "valueNames": [
        "JSON_OR_FILE"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "max_concurrency",
      "kind": "option",
      "token": "--max-concurrency",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited",
      "valueNames": [
        "MAX_CONCURRENCY"
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
    },
    {
      "property": "provider-profile",
      "kind": "option",
      "token": "--provider-profile",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "JSON_OR_FILE"
      ]
    },
    {
      "property": "max-concurrency",
      "kind": "option",
      "token": "--max-concurrency",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "MAX_CONCURRENCY"
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
    },
    "provider_profile": {
      "token": "--provider-profile",
      "required": false,
      "requiredWhen": [],
      "schema": {
        "type": "object",
        "properties": {
          "backendId": {
            "type": "string",
            "minLength": 1
          },
          "backendType": {
            "enum": [
              "acp",
              "skillrunner",
              "generic-http",
              "pass-through"
            ]
          },
          "providerOptions": {
            "type": "object",
            "description": "Provider-owned options are intentionally open and are validated by the selected provider.",
            "additionalProperties": true,
            "x-openPropertiesReason": "The selected provider owns its option vocabulary."
          }
        },
        "required": [],
        "additionalProperties": false
      },
      "examples": [
        {
          "kind": "shape-only",
          "value": {},
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "description": "Minimal JSON shape for --provider-profile."
        }
      ]
    }
  },
  "payloadSchema": {
    "type": "object",
    "properties": {
      "workflow": {
        "type": "string",
        "description": "Workflow id to submit"
      },
      "selection": {
        "type": "string",
        "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"
      },
      "workflow_options": {
        "type": "string",
        "description": "Workflow options JSON object, file path, @file, or '-' for stdin"
      },
      "provider_profile": {
        "type": "string",
        "description": "Provider profile JSON object with backendId and providerOptions"
      },
      "max_concurrency": {
        "type": "string",
        "description": "Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "workflowId": {
        "type": "string"
      },
      "workflowLabel": {
        "type": "string"
      },
      "admission": {
        "enum": [
          "direct",
          "host-queue"
        ]
      },
      "workflowRunId": {
        "type": "string"
      },
      "submissionId": {
        "type": "string"
      },
      "jobIds": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "totalJobs": {
        "type": "integer"
      },
      "tasks": {
        "type": "array",
        "items": {
          "type": "object"
        }
      },
      "totalUnits": {
        "type": "integer"
      },
      "queuedUnits": {
        "type": "integer"
      },
      "skippedUnits": {
        "type": "integer"
      },
      "submissionUrl": {
        "type": "string"
      },
      "queueUrl": {
        "type": "string"
      },
      "permission": {
        "type": "object"
      }
    },
    "required": [
      "workflowId",
      "workflowLabel",
      "admission",
      "permission"
    ],
    "oneOf": [
      {
        "properties": {
          "admission": {
            "const": "direct"
          }
        },
        "required": [
          "workflowRunId",
          "jobIds",
          "totalJobs",
          "tasks"
        ]
      },
      {
        "properties": {
          "admission": {
            "const": "host-queue"
          }
        },
        "required": [
          "submissionId",
          "totalUnits",
          "queuedUnits",
          "skippedUnits",
          "submissionUrl",
          "queueUrl"
        ]
      }
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
    "kind": "zotero-ui-required",
    "timing": "before-command",
    "scope": "Zotero UI approval for the described Zotero-managed effect."
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
      "handle": "workflowRunId",
      "direction": "produce",
      "required": false,
      "condition": "Returned when direct admission starts workflow jobs.",
      "lifetime": "response"
    },
    {
      "handle": "submissionId",
      "direction": "produce",
      "required": false,
      "condition": "Returned when ACP or SkillRunner units enter the Zotero-managed Host queue.",
      "lifetime": "response"
    }
  ],
  "recovery": [
    {
      "when": "The response reports host-queue admission or queued progress is uncertain.",
      "stateCheck": "caller-held-handle",
      "requiresHandles": [
        "submissionId"
      ],
      "action": "Inspect the active native submission without inventing a workflow run id.",
      "nextCommand": "workflow submission get"
    },
    {
      "when": "The response reports direct admission and run progress is uncertain.",
      "stateCheck": "caller-held-handle",
      "requiresHandles": [
        "workflowRunId"
      ],
      "action": "Inspect the returned workflow run before repeating submission.",
      "nextCommand": "run get"
    }
  ],
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v1/workflows/submit"
    }
  ],
  "operationalAliases": [
    "workflow submit",
    "workflow",
    "submit",
    "WORKFLOW",
    "selection",
    "JSON_OR_FILE",
    "none",
    "NONE",
    "workflow_options",
    "workflow-options",
    "provider_profile",
    "provider-profile",
    "max_concurrency",
    "max-concurrency",
    "MAX_CONCURRENCY"
  ],
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `workflow` `submit`.
- 分页： `none`.
- 类别： `write`; 危险级别： `review`.
- Intent 可见性： `visible`.
- 操作别名： `workflow submit`, `workflow`, `submit`, `WORKFLOW`, `selection`, `JSON_OR_FILE`, `none`, `NONE`, `workflow_options`, `workflow-options`, `provider_profile`, `provider-profile`, `max_concurrency`, `max-concurrency`, `MAX_CONCURRENCY`.

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
  "kind": "zotero-ui-required",
  "timing": "before-command",
  "scope": "Zotero UI approval for the described Zotero-managed effect."
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
    "handle": "workflowRunId",
    "direction": "produce",
    "required": false,
    "condition": "Returned when direct admission starts workflow jobs.",
    "lifetime": "response"
  },
  {
    "handle": "submissionId",
    "direction": "produce",
    "required": false,
    "condition": "Returned when ACP or SkillRunner units enter the Zotero-managed Host queue.",
    "lifetime": "response"
  }
]
```

### 恢复

```json
[
  {
    "when": "The response reports host-queue admission or queued progress is uncertain.",
    "stateCheck": "caller-held-handle",
    "requiresHandles": [
      "submissionId"
    ],
    "action": "Inspect the active native submission without inventing a workflow run id.",
    "nextCommand": "workflow submission get"
  },
  {
    "when": "The response reports direct admission and run progress is uncertain.",
    "stateCheck": "caller-held-handle",
    "requiresHandles": [
      "workflowRunId"
    ],
    "action": "Inspect the returned workflow run before repeating submission.",
    "nextCommand": "run get"
  }
]
```

### 目标

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v1/workflows/submit"
  }
]
```
