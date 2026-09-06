# `zotero-bridge workflow validate`

在不启动执行的情况下校验 workflow 输入

## 用法

```console
zotero-bridge workflow validate [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --workflow <WORKFLOW> [--selection <JSON_OR_FILE>] [--none] [--workflow-options <JSON_OR_FILE>] [--input-resource <SLOT=FILE_ID>] [--output-resource <SLOT=bridge-download>]
```

全局选项可以出现在 leaf 命令之前或之后。使用 `--schema` 可以检查原始的结构化输入 schema，而无需加载 profile 或连接 Zotero。

## 全局参数

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --endpoint | endpoint | option | no | — | ENDPOINT | no | ZOTERO_BRIDGE_ENDPOINT | — | Zotero Bridge 服务的端点基址。若省略，CLI 会读取 ZOTERO_BRIDGE_ENDPOINT 或 profile 文件。CLI 不会随意猜测 bridge 端口。 |
| --operation-id | operation_id | option | no | — | ID | no | ZOTERO_BRIDGE_OPERATION_ID | — | 用于一次会改变 Zotero 状态的请求的不透明幂等性 id |
| --profile | profile | option | no | — | PATH | no | ZOTERO_BRIDGE_PROFILE | — | Zotero Bridge 连接 profile JSON 文件的路径。若省略，CLI 会尝试使用 Zotero Agents 的 well-known profile。ACP 运行 profile 通常引用 tokenEnv；本地的 well-known profile 可能包含由用户级文件权限保护的 bearer token。 |
| --schema | schema | option | no | — | SCHEMA; values: true, false | no | — | — | 为一个规范化的 leaf 命令打印版本化的原始 JSON Schema 和受管控的示例。Schema 模式为离线模式，不会加载 profile、读取 Zotero Bridge 配置，也不会连接 Zotero。 |

## 本地选项与位置参数

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --workflow | workflow | option | yes | — | WORKFLOW | no | — | — | Workflow id to validate |
| --selection | selection | option | no | Required unless --none is supplied. | JSON_OR_FILE | no | — | none | Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin |
| --none | none | option | no | — | NONE; values: true, false | no | — | selection | Validate a no-selection workflow |
| --workflow-options | workflow_options | option | no | — | JSON_OR_FILE | no | — | — | Workflow options JSON object, file path, @file, or '-' for stdin |
| --input-resource | input_resource | option | no | — | SLOT=FILE_ID | yes | — | — | Validate an uploaded opaque file handle binding; repeat for multiple files |
| --output-resource | output_resource | option | no | — | SLOT=bridge-download | yes | — | — | Validate bridge-download delivery for a workflow output resource slot |

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
      "description": "Validate an uploaded opaque file handle binding; repeat for multiple files",
      "items": {
        "type": "string"
      },
      "type": "array"
    },
    "none": {
      "description": "Validate a no-selection workflow",
      "type": "boolean"
    },
    "output-resource": {
      "description": "Validate bridge-download delivery for a workflow output resource slot",
      "items": {
        "type": "string"
      },
      "type": "array"
    },
    "selection": {
      "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin",
      "type": "string"
    },
    "workflow": {
      "description": "Workflow id to validate",
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

### `--input-resource` (input_resource)

必需：`false`。

```json
{
  "description": "One workflow resource slot and opaque handle returned by file upload. Repeat the flag to validate multiple files in order.",
  "pattern": "^[A-Za-z0-9._-]+=file-[A-Za-z0-9-]+$",
  "type": "string"
}
```

### `--output-resource` (output_resource)

必需：`false`。

```json
{
  "description": "One workflow output slot requesting bridge-download delivery.",
  "pattern": "^[A-Za-z0-9._-]+=bridge-download$",
  "type": "string"
}
```

### `--selection` (selection)

Required: `false`; condition: Required unless --none is supplied..

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

### `--workflow-options` (workflow_options)

必需：`false`。

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
    "input_resource": {
      "description": "Repeatable workflow input resource binding in SLOT=FILE_ID form",
      "type": "string"
    },
    "output_resource": {
      "description": "Workflow output resource delivery binding in SLOT=bridge-download form",
      "type": "string"
    },
    "selection": {
      "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin",
      "type": "string"
    },
    "workflow": {
      "description": "Workflow id to validate",
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

此命令没有单独的字段映射程序。其 binding 模式可直接执行：passthrough 使用唯一的结构化源，而 `none` 和 `raw` 保持其声明的封闭行为。

`composition`: `null`.

## 结果 schema

```json
{
  "additionalProperties": true,
  "properties": {
    "response": {
      "additionalProperties": true,
      "description": "Response object returned by POST /bridge/v2/workflows/validate.",
      "type": "object",
      "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
    }
  },
  "type": "object",
  "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
}
```

## 示例

### input_resource: shape-only 示例

Validate one uploaded file binding.

```console
zotero-bridge workflow validate --input-resource 'source=file-example'
```

前置条件：

- Run file upload first and replace file-example with the returned opaque fileId.

### output_resource: shape-only 示例

Validate bridge-download delivery for the result slot.

```console
zotero-bridge workflow validate --output-resource 'result=bridge-download'
```

### selection: shape-only 示例

Minimal JSON shape for --selection.

```console
zotero-bridge workflow validate --selection '[{"key":"ABC12345","libraryId":1}]'
```

前置条件：

- 执行前，请将示例中的标识符和值替换为对所选 Zotero library、workflow、provider 或 capability 有效的输入。

### workflow_options: shape-only 示例

Minimal JSON shape for --workflow-options.

```console
zotero-bridge workflow validate --workflow-options '{}'
```

前置条件：

- 执行前，请将示例中的标识符和值替换为对所选 Zotero library、workflow、provider 或 capability 有效的输入。

## 完整命令描述符

此封闭描述符是 `surface describe` 返回的机器可读命令契约；此处包含它是为了让该卡片在无需加载其他命令参考的情况下仍可独立审计。

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
      "help": "Workflow id to validate",
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
      "help": "Validate a no-selection workflow",
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
      "help": "Validate an uploaded opaque file handle binding; repeat for multiple files",
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
      "help": "Validate bridge-download delivery for a workflow output resource slot",
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
    }
  ],
  "argv": [
    "workflow",
    "validate"
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
    }
  ],
  "binding": "overlay",
  "category": "read",
  "command": "workflow validate",
  "composition": null,
  "danger": "none",
  "effects": [
    {
      "description": "Reads state without changing Zotero-managed data.",
      "kind": "none",
      "stateChanged": false
    }
  ],
  "handleTransitions": [],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {
    "input_resource": {
      "examples": [
        {
          "description": "Validate one uploaded file binding.",
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
        "description": "One workflow resource slot and opaque handle returned by file upload. Repeat the flag to validate multiple files in order.",
        "pattern": "^[A-Za-z0-9._-]+=file-[A-Za-z0-9-]+$",
        "type": "string"
      },
      "schemaSource": "inline",
      "token": "--input-resource"
    },
    "output_resource": {
      "examples": [
        {
          "description": "Validate bridge-download delivery for the result slot.",
          "kind": "shape-only",
          "prerequisites": [],
          "value": "result=bridge-download"
        }
      ],
      "required": false,
      "requiredWhen": [],
      "schema": {
        "description": "One workflow output slot requesting bridge-download delivery.",
        "pattern": "^[A-Za-z0-9._-]+=bridge-download$",
        "type": "string"
      },
      "schemaSource": "inline",
      "token": "--output-resource"
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
        "description": "Validate an uploaded opaque file handle binding; repeat for multiple files",
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "none": {
        "description": "Validate a no-selection workflow",
        "type": "boolean"
      },
      "output-resource": {
        "description": "Validate bridge-download delivery for a workflow output resource slot",
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "selection": {
        "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin",
        "type": "string"
      },
      "workflow": {
        "description": "Workflow id to validate",
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
    "workflow validate",
    "workflow",
    "validate",
    "WORKFLOW",
    "selection",
    "JSON_OR_FILE",
    "none",
    "NONE",
    "workflow_options",
    "workflow-options",
    "input_resource",
    "input-resource",
    "SLOT=FILE_ID",
    "output_resource",
    "output-resource",
    "SLOT=bridge-download"
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
      "output_resource": {
        "description": "Workflow output resource delivery binding in SLOT=bridge-download form",
        "type": "string"
      },
      "selection": {
        "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin",
        "type": "string"
      },
      "workflow": {
        "description": "Workflow id to validate",
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
      "action": "Inspect the error and retry only when retryable is true.",
      "nextCommand": "surface describe",
      "requiresHandles": [],
      "stateCheck": "none",
      "when": "The read fails or returns incomplete evidence."
    }
  ],
  "resultSchema": {
    "additionalProperties": true,
    "properties": {
      "response": {
        "additionalProperties": true,
        "description": "Response object returned by POST /bridge/v2/workflows/validate.",
        "type": "object",
        "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
      }
    },
    "type": "object",
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
  },
  "summary": "Validate workflow input without starting execution",
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v2/workflows/validate"
    }
  ]
}
```

## 参数失败与恢复契约

Parameter failures are returned as one JSON error envelope. Inspect `error.code`, then require `error.details.schema` to be `host-bridge.argument-error.v1` before using the structured boundary fields. Preserve the canonical command, sanitized inputs, and any already-returned typed handles; never include the complete raw payload in evidence.

- `argv` reports a missing, unknown, conflicting, or invalid CLI argument. Rebuild argv from this card's parameter tables or the active command help.
- `json_source` reports an unreadable stdin or file source. Correct that source without moving the value to a different binding.
- `json_syntax` reports invalid JSON with safe line and column context. Repair syntax before interpreting domain fields.
- `command_input` reports schema violations for a structured input. Inspect the bounded `violations`, then run this exact leaf with `--schema` and correct the declared field or type; do not invent an alias.
- `payload_contract` means the CLI's composed capability payload violates the executable contract before network I/O. Treat this as an implementation fault; do not bypass the semantic command with raw transport.
- `command_result` means a Host response or local result failed its executable result schema. Do not accept or report it as successful evidence.
- Violation arrays are redacted, deterministically ordered, and capped at eight. When `truncated` is true, correct the reported violations and validate again rather than requesting secret or complete payload disclosure.

## 运行契约

- Canonical argv path: `workflow` `validate`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Structured binding mode: `overlay`.
- Intent visibility: `visible`.
- Operational aliases: `workflow validate`, `workflow`, `validate`, `WORKFLOW`, `selection`, `JSON_OR_FILE`, `none`, `NONE`, `workflow_options`, `workflow-options`, `input_resource`, `input-resource`, `SLOT=FILE_ID`, `output_resource`, `output-resource`, `SLOT=bridge-download`.

### 影响

```json
[
  {
    "description": "Reads state without changing Zotero-managed data.",
    "kind": "none",
    "stateChanged": false
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

### Handle 转换

```json
[
]
```

### 恢复

```json
[
  {
    "action": "Inspect the error and retry only when retryable is true.",
    "nextCommand": "surface describe",
    "requiresHandles": [],
    "stateCheck": "none",
    "when": "The read fails or returns incomplete evidence."
  }
]
```

### 目标

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v2/workflows/validate"
  }
]
```
