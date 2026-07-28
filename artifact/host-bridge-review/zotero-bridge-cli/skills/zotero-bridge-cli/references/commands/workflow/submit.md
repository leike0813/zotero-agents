# `zotero-bridge workflow submit`

Submit a workflow with explicit JSON input

## 用法

```console
zotero-bridge workflow submit [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --workflow <WORKFLOW> [--selection <JSON_OR_FILE>] [--none] [--workflow-options <JSON_OR_FILE>] [--provider-profile <JSON_OR_FILE>] [--max-concurrency <MAX_CONCURRENCY>]
```

全局选项可位于叶命令之前或之后。 使用 `--schema` 可在不加载 profile、也不连接 Zotero 的情况下检查原始结构化输入 schema。

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
    "max-concurrency": {
      "description": "Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited",
      "type": "string"
    },
    "none": {
      "description": "Submit a no-selection workflow",
      "type": "boolean"
    },
    "provider-profile": {
      "description": "Provider profile JSON object with backendId and providerOptions",
      "type": "string"
    },
    "selection": {
      "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin",
      "type": "string"
    },
    "workflow": {
      "description": "Workflow id to submit",
      "type": "string"
    },
    "workflow-options": {
      "description": "Workflow options JSON object, file path, @file, or '-' for stdin",
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

### `--provider-profile` (provider_profile)

必填： `false`.

```json
{
  "additionalProperties": false,
  "properties": {
    "backendId": {
      "minLength": 1,
      "type": "string"
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
      "additionalProperties": true,
      "description": "Provider-owned options are intentionally open and are validated by the selected provider.",
      "type": "object",
      "x-openPropertiesReason": "The selected provider owns its option vocabulary."
    },
    "schema": {
      "const": "zotero-bridge.provider-profile.v1"
    }
  },
  "required": [],
  "type": "object"
}
```

### `--selection` (selection)

必填： `false`；条件： Required unless --none is supplied..

```json
{
  "items": {
    "oneOf": [
      {
        "minLength": 1,
        "type": "string"
      },
      {
        "type": "integer"
      },
      {
        "additionalProperties": false,
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
        "properties": {
          "id": {
            "type": [
              "integer",
              "string"
            ]
          },
          "key": {
            "minLength": 1,
            "type": "string"
          },
          "libraryId": {
            "type": [
              "integer",
              "string"
            ]
          }
        },
        "type": "object"
      }
    ]
  },
  "minItems": 1,
  "type": "array"
}
```

### `--workflow-options` (workflow_options)

必填： `false`.

```json
{
  "additionalProperties": true,
  "description": "Workflow-declared option values are intentionally open and are validated by the selected workflow.",
  "type": "object",
  "x-openPropertiesReason": "The selected workflow manifest owns its option vocabulary."
}
```

## 组合 payload schema

```json
{
  "additionalProperties": false,
  "properties": {
    "max_concurrency": {
      "description": "Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited",
      "type": "string"
    },
    "provider_profile": {
      "description": "Provider profile JSON object with backendId and providerOptions",
      "type": "string"
    },
    "selection": {
      "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin",
      "type": "string"
    },
    "workflow": {
      "description": "Workflow id to submit",
      "type": "string"
    },
    "workflow_options": {
      "description": "Workflow options JSON object, file path, @file, or '-' for stdin",
      "type": "string"
    }
  },
  "required": [],
  "type": "object"
}
```

## Payload 组合

这个命令没有单独的 field-mapping program。它的 binding mode 可以直接执行：passthrough 使用唯一的结构化来源，而 `none` 与 `raw` 保持各自声明的闭合行为。

`composition`: `null`.

## 结果 schema

```json
{
  "additionalProperties": false,
  "oneOf": [
    {
      "properties": {
        "admission": {
          "const": "direct"
        }
      },
      "required": [
        "workflowRunId",
        "totalJobs",
        "runUrl",
        "tasksUrl"
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
  "properties": {
    "admission": {
      "enum": [
        "direct",
        "host-queue"
      ]
    },
    "permission": {
      "type": "object"
    },
    "queueUrl": {
      "type": "string"
    },
    "queuedUnits": {
      "type": "integer"
    },
    "runUrl": {
      "type": "string"
    },
    "skippedUnits": {
      "type": "integer"
    },
    "submissionId": {
      "type": "string"
    },
    "submissionUrl": {
      "type": "string"
    },
    "tasksUrl": {
      "type": "string"
    },
    "totalJobs": {
      "type": "integer"
    },
    "totalUnits": {
      "type": "integer"
    },
    "workflowId": {
      "type": "string"
    },
    "workflowLabel": {
      "type": "string"
    },
    "workflowRunId": {
      "type": "string"
    }
  },
  "required": [
    "workflowId",
    "workflowLabel",
    "admission",
    "permission"
  ],
  "type": "object"
}
```

## 示例

### provider_profile: shape-only

用于 --provider-profile 的最小 JSON 形状。

```console
zotero-bridge workflow submit --provider-profile '{}'
```

前置条件：

- 执行前，请将示例标识符和值替换为对所选 Zotero library、workflow、provider 或 capability 有效的输入。

### selection: shape-only

用于 --selection 的最小 JSON 形状。

```console
zotero-bridge workflow submit --selection '["example"]'
```

前置条件：

- 执行前，请将示例标识符和值替换为对所选 Zotero library、workflow、provider 或 capability 有效的输入。

### workflow_options: shape-only

用于 --workflow-options 的最小 JSON 形状。

```console
zotero-bridge workflow submit --workflow-options '{}'
```

前置条件：

- 执行前，请将示例标识符和值替换为对所选 Zotero library、workflow、provider 或 capability 有效的输入。

## 完整命令 descriptor

这个闭合 descriptor 是 `surface describe` 返回的机器可读命令合同；将它完整列在此处，使本卡片无需加载其他命令引用也能独立审计。

```json
{
  "approvalContract": {
    "kind": "zotero-ui-required",
    "scope": "Zotero UI approval for the described Zotero-managed effect.",
    "timing": "before-command"
  },
  "arguments": [
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Workflow id to submit",
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
      "aliases": [
        "items"
      ],
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
      "help": "Submit a no-selection workflow",
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
      "help": "Workflow options JSON object, file path, @file, or '-' for stdin",
      "id": "workflow_options",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--workflow-options",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Provider profile JSON object with backendId and providerOptions",
      "id": "provider_profile",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--provider-profile",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited",
      "id": "max_concurrency",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--max-concurrency",
      "valueNames": [
        "MAX_CONCURRENCY"
      ]
    }
  ],
  "argv": [
    "workflow",
    "submit"
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
      "property": "workflow-options",
      "required": false,
      "takesValue": true,
      "token": "--workflow-options",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    },
    {
      "kind": "option",
      "property": "provider-profile",
      "required": false,
      "takesValue": true,
      "token": "--provider-profile",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    },
    {
      "kind": "option",
      "property": "max-concurrency",
      "required": false,
      "takesValue": true,
      "token": "--max-concurrency",
      "valueNames": [
        "MAX_CONCURRENCY"
      ]
    }
  ],
  "binding": "overlay",
  "category": "write",
  "command": "workflow submit",
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
      "condition": "Returned when direct admission starts workflow jobs.",
      "direction": "produce",
      "handle": "workflowRunId",
      "lifetime": "response",
      "required": false
    },
    {
      "condition": "Returned when ACP or SkillRunner units enter the Zotero-managed Host queue.",
      "direction": "produce",
      "handle": "submissionId",
      "lifetime": "response",
      "required": false
    }
  ],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {
    "provider_profile": {
      "examples": [
        {
          "description": "Minimal JSON shape for --provider-profile.",
          "kind": "shape-only",
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "value": {}
        }
      ],
      "required": false,
      "requiredWhen": [],
      "schema": {
        "additionalProperties": false,
        "properties": {
          "backendId": {
            "minLength": 1,
            "type": "string"
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
            "additionalProperties": true,
            "description": "Provider-owned options are intentionally open and are validated by the selected provider.",
            "type": "object",
            "x-openPropertiesReason": "The selected provider owns its option vocabulary."
          },
          "schema": {
            "const": "zotero-bridge.provider-profile.v1"
          }
        },
        "required": [],
        "type": "object"
      },
      "schemaSource": "inline",
      "token": "--provider-profile"
    },
    "selection": {
      "examples": [
        {
          "description": "Minimal JSON shape for --selection.",
          "kind": "shape-only",
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "value": [
            "example"
          ]
        }
      ],
      "required": false,
      "requiredWhen": [
        "Required unless --none is supplied."
      ],
      "schema": {
        "items": {
          "oneOf": [
            {
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "integer"
            },
            {
              "additionalProperties": false,
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
              "properties": {
                "id": {
                  "type": [
                    "integer",
                    "string"
                  ]
                },
                "key": {
                  "minLength": 1,
                  "type": "string"
                },
                "libraryId": {
                  "type": [
                    "integer",
                    "string"
                  ]
                }
              },
              "type": "object"
            }
          ]
        },
        "minItems": 1,
        "type": "array"
      },
      "schemaSource": "inline",
      "token": "--selection"
    },
    "workflow_options": {
      "examples": [
        {
          "description": "Minimal JSON shape for --workflow-options.",
          "kind": "shape-only",
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "value": {}
        }
      ],
      "required": false,
      "requiredWhen": [],
      "schema": {
        "additionalProperties": true,
        "description": "Workflow-declared option values are intentionally open and are validated by the selected workflow.",
        "type": "object",
        "x-openPropertiesReason": "The selected workflow manifest owns its option vocabulary."
      },
      "schemaSource": "inline",
      "token": "--workflow-options"
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
      "max-concurrency": {
        "description": "Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited",
        "type": "string"
      },
      "none": {
        "description": "Submit a no-selection workflow",
        "type": "boolean"
      },
      "provider-profile": {
        "description": "Provider profile JSON object with backendId and providerOptions",
        "type": "string"
      },
      "selection": {
        "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin",
        "type": "string"
      },
      "workflow": {
        "description": "Workflow id to submit",
        "type": "string"
      },
      "workflow-options": {
        "description": "Workflow options JSON object, file path, @file, or '-' for stdin",
        "type": "string"
      }
    },
    "required": [
      "workflow"
    ],
    "type": "object"
  },
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
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "max_concurrency": {
        "description": "Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited",
        "type": "string"
      },
      "provider_profile": {
        "description": "Provider profile JSON object with backendId and providerOptions",
        "type": "string"
      },
      "selection": {
        "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin",
        "type": "string"
      },
      "workflow": {
        "description": "Workflow id to submit",
        "type": "string"
      },
      "workflow_options": {
        "description": "Workflow options JSON object, file path, @file, or '-' for stdin",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "recovery": [
    {
      "action": "Inspect the active native submission without inventing a workflow run id.",
      "nextCommand": "workflow submission get",
      "requiresHandles": [
        "submissionId"
      ],
      "stateCheck": "caller-held-handle",
      "when": "The response reports host-queue admission or queued progress is uncertain."
    },
    {
      "action": "Inspect the returned workflow run before repeating submission.",
      "nextCommand": "run get",
      "requiresHandles": [
        "workflowRunId"
      ],
      "stateCheck": "caller-held-handle",
      "when": "The response reports direct admission and run progress is uncertain."
    }
  ],
  "resultSchema": {
    "additionalProperties": false,
    "oneOf": [
      {
        "properties": {
          "admission": {
            "const": "direct"
          }
        },
        "required": [
          "workflowRunId",
          "totalJobs",
          "runUrl",
          "tasksUrl"
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
    "properties": {
      "admission": {
        "enum": [
          "direct",
          "host-queue"
        ]
      },
      "permission": {
        "type": "object"
      },
      "queueUrl": {
        "type": "string"
      },
      "queuedUnits": {
        "type": "integer"
      },
      "runUrl": {
        "type": "string"
      },
      "skippedUnits": {
        "type": "integer"
      },
      "submissionId": {
        "type": "string"
      },
      "submissionUrl": {
        "type": "string"
      },
      "tasksUrl": {
        "type": "string"
      },
      "totalJobs": {
        "type": "integer"
      },
      "totalUnits": {
        "type": "integer"
      },
      "workflowId": {
        "type": "string"
      },
      "workflowLabel": {
        "type": "string"
      },
      "workflowRunId": {
        "type": "string"
      }
    },
    "required": [
      "workflowId",
      "workflowLabel",
      "admission",
      "permission"
    ],
    "type": "object"
  },
  "summary": "Submit a workflow with explicit JSON input",
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v2/workflows/submit"
    }
  ]
}
```

## 参数失败与恢复合同

参数失败以单个 JSON 错误 envelope 返回。先检查 `error.code`，再确认 `error.details.schema` 为 `host-bridge.argument-error.v1`，之后才能使用结构化边界字段。保留规范命令、已脱敏输入和任何已经返回的 typed handle；证据中绝不能包含完整原始 payload。

- `argv` 表示 CLI 参数缺失、未知、冲突或无效。依据本卡片的参数表或当前命令 help 重新构造 argv。
- `json_source` 表示 stdin 或文件源不可读。修正该输入源，不要把值移到另一种 binding。
- `json_syntax` 表示 JSON 无效，并提供安全的行列位置。先修复语法，再解释领域字段。
- `command_input` 表示结构化输入违反 schema。检查有界的 `violations`，然后对这个准确的叶命令运行 `--schema`，修正已声明的字段或类型；不得自行发明别名。
- `payload_contract` 表示 CLI 组合出的 capability payload 在网络 I/O 前就违反了可执行合同。将其视为实现错误；不得用原始 transport 绕过语义命令。
- `command_result` 表示 Host 响应或本地结果未通过可执行结果 schema。不得接受它，也不得把它报告为成功证据。
- violation 数组已经脱敏、按确定顺序排列，并限制为八项。当 `truncated` 为 true 时，先修正已报告的问题并重新验证，不得要求披露 secret 或完整 payload。

## 操作合同

- 规范 argv 路径： `workflow` `submit`.
- 输出边界： `fixed`；受管详情： {"strategy":"fixed"}.
- 分页： `none`.
- 类别： `write`；危险等级： `review`.
- 结构化 binding 模式： `overlay`.
- intent 可见性： `visible`.
- 操作别名： `workflow submit`, `workflow`, `submit`, `WORKFLOW`, `selection`, `JSON_OR_FILE`, `none`, `NONE`, `workflow_options`, `workflow-options`, `provider_profile`, `provider-profile`, `max_concurrency`, `max-concurrency`, `MAX_CONCURRENCY`.

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

### Approval

```json
{
  "kind": "zotero-ui-required",
  "scope": "Zotero UI approval for the described Zotero-managed effect.",
  "timing": "before-command"
}
```

### Handle 转换

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
    "condition": "Returned when direct admission starts workflow jobs.",
    "direction": "produce",
    "handle": "workflowRunId",
    "lifetime": "response",
    "required": false
  },
  {
    "condition": "Returned when ACP or SkillRunner units enter the Zotero-managed Host queue.",
    "direction": "produce",
    "handle": "submissionId",
    "lifetime": "response",
    "required": false
  }
]
```

### 恢复

```json
[
  {
    "action": "Inspect the active native submission without inventing a workflow run id.",
    "nextCommand": "workflow submission get",
    "requiresHandles": [
      "submissionId"
    ],
    "stateCheck": "caller-held-handle",
    "when": "The response reports host-queue admission or queued progress is uncertain."
  },
  {
    "action": "Inspect the returned workflow run before repeating submission.",
    "nextCommand": "run get",
    "requiresHandles": [
      "workflowRunId"
    ],
    "stateCheck": "caller-held-handle",
    "when": "The response reports direct admission and run progress is uncertain."
  }
]
```

### Targets

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v2/workflows/submit"
  }
]
```
