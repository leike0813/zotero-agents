# `zotero-bridge library annotation export`

为一个 Zotero item 导出阅读器标注

## 用法

```console
zotero-bridge library annotation export [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --item <ITEM> [--format <FORMAT>]
```

全局选项可以出现在 leaf 命令之前或之后。此 leaf 没有结构化 JSON 输入。`--schema` 会返回 `command_input_schema_unavailable`；请使用命令帮助或 `surface describe` 来检查调用契约。

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
| --item | item | option | yes | — | ITEM | no | — | — | Zotero item ref: key, numeric id, libraryId:key, or JSON object |
| --format | format | option | no | — | FORMAT; values: markdown, json | no | — | — | Export format |

## 调用 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "format": {
      "description": "Export format",
      "type": "string"
    },
    "item": {
      "description": "Zotero item ref: key, numeric id, libraryId:key, or JSON object",
      "type": "string"
    }
  },
  "required": [
    "item"
  ],
  "type": "object"
}
```

## 结构化输入 schema

此命令没有结构化 JSON 输入参数。

## 组合 payload schema

```json
{
  "additionalProperties": true,
  "type": "object",
  "x-openPropertiesReason": "The selected domain service owns this capability input vocabulary; the capability boundary still requires a JSON object."
}
```

## Payload 组合

The executable command contract owns the base source, fixed values, field mappings, and closed transforms shown below. Command handlers only provide values under the referenced Clap argument IDs.

```json
{
  "constants": {},
  "mappings": [
    {
      "argument": "item",
      "field": "ref",
      "required": true,
      "transform": "context-ref"
    },
    {
      "argument": "format",
      "default": "markdown",
      "field": "format",
      "required": false,
      "transform": "identity"
    }
  ]
}
```

## 结果 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "approval": {
      "minLength": 1,
      "type": "string"
    },
    "capability": {
      "const": "library.export_annotations"
    },
    "data": {
      "additionalProperties": true,
      "description": "Result data owned by library.export_annotations.",
      "properties": {
        "delivery": {
          "additionalProperties": true,
          "properties": {
            "file": {
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
                "expiresAt": {
                  "type": "string"
                },
                "fileId": {
                  "type": "string"
                },
                "owner": {
                  "additionalProperties": true,
                  "type": "object",
                  "x-openPropertiesReason": "File ownership metadata is capability-specific and contains no local path."
                },
                "sha256": {
                  "type": "string"
                },
                "size": {
                  "minimum": 0,
                  "type": "integer"
                },
                "sourceKind": {
                  "enum": [
                    "zotero-attachment",
                    "workflow-artifact",
                    "bridge-export",
                    "bridge-upload"
                  ]
                }
              },
              "required": [
                "fileId",
                "sourceKind",
                "displayName",
                "contentType",
                "createdAt",
                "expiresAt"
              ],
              "type": "object"
            }
          },
          "type": "object"
        }
      },
      "type": "object",
      "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed."
    }
  },
  "required": [
    "capability",
    "approval",
    "data"
  ],
  "type": "object"
}
```

## 示例

没有适用的结构化输入示例。执行前，请根据参数表构建 argv，并使用 `surface describe` 确认命令。

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
      "help": "Zotero item ref: key, numeric id, libraryId:key, or JSON object",
      "id": "item",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "--item",
      "valueNames": [
        "ITEM"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Export format",
      "id": "format",
      "kind": "option",
      "possibleValues": [
        "markdown",
        "json"
      ],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--format",
      "valueNames": [
        "FORMAT"
      ]
    }
  ],
  "argv": [
    "library",
    "annotation",
    "export"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "item",
      "required": true,
      "takesValue": true,
      "token": "--item",
      "valueNames": [
        "ITEM"
      ]
    },
    {
      "kind": "option",
      "property": "format",
      "required": false,
      "takesValue": true,
      "token": "--format",
      "valueNames": [
        "FORMAT"
      ]
    }
  ],
  "binding": "object",
  "category": "read",
  "command": "library annotation export",
  "composition": {
    "constants": {},
    "mappings": [
      {
        "argument": "item",
        "field": "ref",
        "required": true,
        "transform": "context-ref"
      },
      {
        "argument": "format",
        "default": "markdown",
        "field": "format",
        "required": false,
        "transform": "identity"
      }
    ]
  },
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
  "inputSchemas": {},
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "format": {
        "description": "Export format",
        "type": "string"
      },
      "item": {
        "description": "Zotero item ref: key, numeric id, libraryId:key, or JSON object",
        "type": "string"
      }
    },
    "required": [
      "item"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "library annotation export",
    "library",
    "annotation",
    "export",
    "item",
    "ITEM",
    "format",
    "FORMAT"
  ],
  "outputBoundary": {
    "fileField": "data.delivery.file",
    "strategy": "file"
  },
  "pagination": "file",
  "payloadSchema": {
    "additionalProperties": true,
    "type": "object",
    "x-openPropertiesReason": "The selected domain service owns this capability input vocabulary; the capability boundary still requires a JSON object."
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
    "additionalProperties": false,
    "properties": {
      "approval": {
        "minLength": 1,
        "type": "string"
      },
      "capability": {
        "const": "library.export_annotations"
      },
      "data": {
        "additionalProperties": true,
        "description": "Result data owned by library.export_annotations.",
        "properties": {
          "delivery": {
            "additionalProperties": true,
            "properties": {
              "file": {
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
                  "expiresAt": {
                    "type": "string"
                  },
                  "fileId": {
                    "type": "string"
                  },
                  "owner": {
                    "additionalProperties": true,
                    "type": "object",
                    "x-openPropertiesReason": "File ownership metadata is capability-specific and contains no local path."
                  },
                  "sha256": {
                    "type": "string"
                  },
                  "size": {
                    "minimum": 0,
                    "type": "integer"
                  },
                  "sourceKind": {
                    "enum": [
                      "zotero-attachment",
                      "workflow-artifact",
                      "bridge-export",
                      "bridge-upload"
                    ]
                  }
                },
                "required": [
                  "fileId",
                  "sourceKind",
                  "displayName",
                  "contentType",
                  "createdAt",
                  "expiresAt"
                ],
                "type": "object"
              }
            },
            "type": "object"
          }
        },
        "type": "object",
        "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed."
      }
    },
    "required": [
      "capability",
      "approval",
      "data"
    ],
    "type": "object"
  },
  "summary": "Export reader annotations for one Zotero item",
  "targets": [
    {
      "kind": "capability",
      "target": "library.export_annotations"
    }
  ]
}
```

## 参数失败与恢复契约

Parameter failures are returned as one JSON error envelope. Inspect `error.code`, then require `error.details.schema` to be `host-bridge.argument-error.v1` before using the structured boundary fields. Preserve the canonical command, sanitized inputs, and any already-returned typed handles; never include the complete raw payload in evidence.

- `argv` reports a missing, unknown, conflicting, or invalid CLI argument. Rebuild argv from this card's parameter tables or the active command help.
- `json_source` reports an unreadable stdin or file source. Correct that source without moving the value to a different binding.
- `json_syntax` reports invalid JSON with safe line and column context. Repair syntax before interpreting domain fields.
- This leaf has no structured JSON input, so `command_input` is not an expected invocation boundary. Use `surface describe` for its scalar and positional contract.
- `payload_contract` means the CLI's composed capability payload violates the executable contract before network I/O. Treat this as an implementation fault; do not bypass the semantic command with raw transport.
- `command_result` means a Host response or local result failed its executable result schema. Do not accept or report it as successful evidence.
- Violation arrays are redacted, deterministically ordered, and capped at eight. When `truncated` is true, correct the reported violations and validate again rather than requesting secret or complete payload disclosure.

## 运行契约

- Canonical argv path: `library` `annotation` `export`.
- Output boundary: `file`; governed details: {"fileField":"data.delivery.file","strategy":"file"}.
- Pagination: `file`.
- Category: `read`; danger: `none`.
- Structured binding mode: `object`.
- Intent visibility: `visible`.
- Operational aliases: `library annotation export`, `library`, `annotation`, `export`, `item`, `ITEM`, `format`, `FORMAT`.

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
    "kind": "capability",
    "target": "library.export_annotations"
  }
]
```
