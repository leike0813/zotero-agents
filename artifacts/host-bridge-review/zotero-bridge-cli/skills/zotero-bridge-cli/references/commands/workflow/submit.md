# `zotero-bridge workflow submit`

用显式 JSON 输入提交 workflow

## 用法

```console
zotero-bridge workflow submit [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --workflow <WORKFLOW> [--selection <JSON_OR_FILE>] [--none] [--workflow-options <JSON_OR_FILE>] [--provider-profile <JSON_OR_FILE>] [--input-resource <SLOT=FILE_ID>] [--output-resource <SLOT=bridge-download>] [--max-concurrency <MAX_CONCURRENCY>]
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
| --workflow | workflow | option | yes | — | WORKFLOW | no | — | — | 要提交的 Workflow id |
| --selection | selection | option | no | 除非提供了 --none，否则必填。 | JSON_OR_FILE | no | — | none | Workflow selection 的 item refs，以 JSON 数组、文件路径、@file 或 '-' 表示 stdin |
| --none | none | option | no | — | NONE; values: true, false | no | — | selection | 提交无选择的 workflow |
| --workflow-options | workflow_options | option | no | — | JSON_OR_FILE | no | — | — | Workflow 选项 JSON 对象、文件路径、@file 或 '-' 表示 stdin |
| --provider-profile | provider_profile | option | no | — | JSON_OR_FILE | no | — | — | 带 backendId 与 providerOptions 的 Provider profile JSON 对象 |
| --input-resource | input_resource | option | no | — | SLOT=FILE_ID | yes | — | — | 把上传的不透明 file handle 绑定到 workflow 输入资源槽位；多文件时重复 |
| --output-resource | output_resource | option | no | — | SLOT=bridge-download | yes | — | — | 请求 workflow 输出资源 slot 的 bridge-download 交付 |
| --max-concurrency | max_concurrency | option | no | — | MAX_CONCURRENCY | no | — | — | 此原生 Host queue 提交最大同时准入的 units 数；0 表示无限制 |

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
    "input-resource": {
      "description": "Bind an uploaded opaque file handle to a workflow input resource slot; repeat for multiple files",
      "items": {
        "type": "string"
      },
      "type": "array"
    },
    "max-concurrency": {
      "description": "Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited",
      "type": "string"
    },
    "none": {
      "description": "Submit a no-selection workflow",
      "type": "boolean"
    },
    "output-resource": {
      "description": "Request bridge-download delivery for a workflow output resource slot",
      "items": {
        "type": "string"
      },
      "type": "array"
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

### `--input-resource`（input_resource）

必需：`false`。

```json
{
  "description": "One workflow resource slot and opaque handle returned by file upload. Repeat the flag to bind multiple files in order.",
  "pattern": "^[A-Za-z0-9._-]+=file-[A-Za-z0-9-]+$",
  "type": "string"
}
```

### `--output-resource`（output_resource）

必需：`false`。

```json
{
  "description": "One workflow output slot whose completed artifact is returned as an opaque download descriptor.",
  "pattern": "^[A-Za-z0-9._-]+=bridge-download$",
  "type": "string"
}
```

### `--provider-profile`（provider_profile）

必需：`false`。

```json
{
  "additionalProperties": false,
  "properties": {
    "backendId": {
      "minLength": 1,
      "type": "string"
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

### `--workflow-options`（workflow_options）

必需：`false`。

```json
{
  "additionalProperties": true,
  "description": "Workflow-declared option values are intentionally open and are validated by the selected workflow.",
  "type": "object",
  "x-openPropertiesReason": "The selected workflow manifest owns its option vocabulary."
}
```

## 组合载荷 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "input_resource": {
      "description": "Repeatable workflow input resource binding in SLOT=FILE_ID form",
      "type": "string"
    },
    "max_concurrency": {
      "description": "Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited",
      "type": "string"
    },
    "output_resource": {
      "description": "Workflow output resource delivery binding in SLOT=bridge-download form",
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

## 载荷组合

此命令没有独立的字段映射程序。其绑定模式为直接可执行：passthrough 使用唯一的结构化来源，而 `none` 与 `raw` 保持其声明的封闭行为。

`composition`：`null`。

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
    "resourceOutputs": {
      "items": {
        "additionalProperties": false,
        "properties": {
          "contentType": {
            "type": "string"
          },
          "createdAt": {
            "type": "string"
          },
          "displayName": {
            "type": "string"
          },
          "downloadCommand": {
            "type": "string"
          },
          "expiresAt": {
            "type": "string"
          },
          "fileId": {
            "pattern": "^file-[A-Za-z0-9-]+$",
            "type": "string"
          },
          "sha256": {
            "pattern": "^sha256:[a-f0-9]{64}$",
            "type": "string"
          },
          "size": {
            "minimum": 0,
            "type": "integer"
          },
          "slotId": {
            "minLength": 1,
            "type": "string"
          },
          "sourceKind": {
            "const": "workflow-artifact"
          }
        },
        "required": [
          "slotId",
          "fileId",
          "sourceKind",
          "displayName",
          "contentType",
          "createdAt",
          "expiresAt",
          "downloadCommand"
        ],
        "type": "object"
      },
      "type": "array"
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
    "permission",
    "resourceOutputs"
  ],
  "type": "object"
}
```

## 示例

### input_resource: 仅形状

将一个上传文件绑定到源 slot。

```console
zotero-bridge workflow submit --input-resource 'source=file-example'
```

前置条件：

- 先执行 file upload，再用返回的不透明 fileId 替换 file-example。

### output_resource：仅形状示例

为结果槽位请求 bridge-download 交付。

```console
zotero-bridge workflow submit --output-resource 'result=bridge-download'
```

### provider_profile：仅形状

--provider-profile 的最小 JSON 形状。

```console
zotero-bridge workflow submit --provider-profile '{}'
```

前置条件：

- 执行前，将示例中的标识符与值替换为对所选 Zotero 库、workflow、provider 或 capability 有效的输入。

### selection: 仅形状

--selection 的最小 JSON 形状。

```console
zotero-bridge workflow submit --selection '[{"key":"ABC12345","libraryId":1}]'
```

前置条件：

- 执行前，将示例中的标识符与值替换为对所选 Zotero 库、workflow、provider 或 capability 有效的输入。

### workflow_options：纯形状

--workflow-options 的最小 JSON 形状。

```console
zotero-bridge workflow submit --workflow-options '{}'
```

前置条件：

- 执行前，将示例中的标识符与值替换为对所选 Zotero 库、workflow、provider 或 capability 有效的输入。

## 完整命令描述符

此封闭描述符是 `surface describe` 返回的机器可读命令契约；此处包含它，以便在不加载另一份命令参考的情况下，本卡片仍可独立审计。

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
      "help": "Bind an uploaded opaque file handle to a workflow input resource slot; repeat for multiple files",
      "id": "input_resource",
      "kind": "option",
      "possibleValues": [],
      "repeatable": true,
      "required": false,
      "takesValue": true,
      "token": "--input-resource",
      "valueNames": [
        "SLOT=FILE_ID"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Request bridge-download delivery for a workflow output resource slot",
      "id": "output_resource",
      "kind": "option",
      "possibleValues": [],
      "repeatable": true,
      "required": false,
      "takesValue": true,
      "token": "--output-resource",
      "valueNames": [
        "SLOT=bridge-download"
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
      "property": "input-resource",
      "required": false,
      "takesValue": true,
      "token": "--input-resource",
      "valueNames": [
        "SLOT=FILE_ID"
      ]
    },
    {
      "kind": "option",
      "property": "output-resource",
      "required": false,
      "takesValue": true,
      "token": "--output-resource",
      "valueNames": [
        "SLOT=bridge-download"
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
      "condition": "Consumed only when supplied through --input-resource after file upload.",
      "direction": "consume",
      "handle": "fileId",
      "lifetime": "one-shot",
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
    },
    {
      "condition": "Returned in resourceOutputs when a bound output slot is published.",
      "direction": "produce",
      "handle": "fileId",
      "lifetime": "short-lived",
      "required": false
    }
  ],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {
    "input_resource": {
      "examples": [
        {
          "description": "Bind one uploaded file to the source slot.",
          "kind": "shape-only",
          "prerequisites": [
            "Run file upload first and replace file-example with the returned opaque fileId."
          ],
          "value": "source=file-example"
        }
      ],
      "required": false,
      "requiredWhen": [],
      "schema": {
        "description": "One workflow resource slot and opaque handle returned by file upload. Repeat the flag to bind multiple files in order.",
        "pattern": "^[A-Za-z0-9._-]+=file-[A-Za-z0-9-]+$",
        "type": "string"
      },
      "schemaSource": "inline",
      "token": "--input-resource"
    },
    "output_resource": {
      "examples": [
        {
          "description": "Request bridge-download delivery for the result slot.",
          "kind": "shape-only",
          "prerequisites": [],
          "value": "result=bridge-download"
        }
      ],
      "required": false,
      "requiredWhen": [],
      "schema": {
        "description": "One workflow output slot whose completed artifact is returned as an opaque download descriptor.",
        "pattern": "^[A-Za-z0-9._-]+=bridge-download$",
        "type": "string"
      },
      "schemaSource": "inline",
      "token": "--output-resource"
    },
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
      "input-resource": {
        "description": "Bind an uploaded opaque file handle to a workflow input resource slot; repeat for multiple files",
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "max-concurrency": {
        "description": "Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited",
        "type": "string"
      },
      "none": {
        "description": "Submit a no-selection workflow",
        "type": "boolean"
      },
      "output-resource": {
        "description": "Request bridge-download delivery for a workflow output resource slot",
        "items": {
          "type": "string"
        },
        "type": "array"
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
    "input_resource",
    "input-resource",
    "SLOT=FILE_ID",
    "output_resource",
    "output-resource",
    "SLOT=bridge-download",
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
      "input_resource": {
        "description": "Repeatable workflow input resource binding in SLOT=FILE_ID form",
        "type": "string"
      },
      "max_concurrency": {
        "description": "Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited",
        "type": "string"
      },
      "output_resource": {
        "description": "Workflow output resource delivery binding in SLOT=bridge-download form",
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
      "action": "Treat the process-local transfer handle as invalid, upload the input again, and validate fresh bindings before any replacement submission.",
      "nextCommand": "file upload",
      "requiresHandles": [],
      "stateCheck": "none",
      "when": "An input resource fileId is unavailable after expiry or service restart."
    },
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
      "resourceOutputs": {
        "items": {
          "additionalProperties": false,
          "properties": {
            "contentType": {
              "type": "string"
            },
            "createdAt": {
              "type": "string"
            },
            "displayName": {
              "type": "string"
            },
            "downloadCommand": {
              "type": "string"
            },
            "expiresAt": {
              "type": "string"
            },
            "fileId": {
              "pattern": "^file-[A-Za-z0-9-]+$",
              "type": "string"
            },
            "sha256": {
              "pattern": "^sha256:[a-f0-9]{64}$",
              "type": "string"
            },
            "size": {
              "minimum": 0,
              "type": "integer"
            },
            "slotId": {
              "minLength": 1,
              "type": "string"
            },
            "sourceKind": {
              "const": "workflow-artifact"
            }
          },
          "required": [
            "slotId",
            "fileId",
            "sourceKind",
            "displayName",
            "contentType",
            "createdAt",
            "expiresAt",
            "downloadCommand"
          ],
          "type": "object"
        },
        "type": "array"
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
      "permission",
      "resourceOutputs"
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

- 规范 argv 路径：`workflow` `submit`。
- 输出边界：`fixed`；受管辖细节：{"strategy":"fixed"}。
- 分页：`none`。
- 类别：`write`；危险级别：`review`。
- 结构化绑定模式：`overlay`。
- 意图可见性：`visible`。
- 操作别名：`workflow submit`、`workflow`、`submit`、`WORKFLOW`、`selection`、`JSON_OR_FILE`、`none`、`NONE`、`workflow_options`、`workflow-options`、`provider_profile`、`provider-profile`、`input_resource`、`input-resource`、`SLOT=FILE_ID`、`output_resource`、`output-resource`、`SLOT=bridge-download`、`max_concurrency`、`max-concurrency`、`MAX_CONCURRENCY`。

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
  "kind": "zotero-ui-required",
  "scope": "Zotero UI approval for the described Zotero-managed effect.",
  "timing": "before-command"
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
    "condition": "Consumed only when supplied through --input-resource after file upload.",
    "direction": "consume",
    "handle": "fileId",
    "lifetime": "one-shot",
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
  },
  {
    "condition": "Returned in resourceOutputs when a bound output slot is published.",
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
    "action": "Treat the process-local transfer handle as invalid, upload the input again, and validate fresh bindings before any replacement submission.",
    "nextCommand": "file upload",
    "requiresHandles": [],
    "stateCheck": "none",
    "when": "An input resource fileId is unavailable after expiry or service restart."
  },
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

### 目标

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v2/workflows/submit"
  }
]
```
