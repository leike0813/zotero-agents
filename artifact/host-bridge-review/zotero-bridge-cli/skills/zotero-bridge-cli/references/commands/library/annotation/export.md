# `zotero-bridge library annotation export`

Export reader annotations for one Zotero item

## Usage

```console
zotero-bridge library annotation export [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --item <ITEM> [--format <FORMAT>]
```

全局选项可位于叶命令之前或之后。 此叶命令没有结构化 JSON 输入。`--schema` 会返回 `command_input_schema_unavailable`；请使用命令 help 或 `surface describe` 检查调用合同。

## Global parameters

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --endpoint | endpoint | option | no | — | ENDPOINT | no | ZOTERO_BRIDGE_ENDPOINT | — | Zotero Bridge service endpoint base URL. If omitted, the CLI reads ZOTERO_BRIDGE_ENDPOINT or a profile file. The CLI does not guess random bridge ports. |
| --operation-id | operation_id | option | no | — | ID | no | ZOTERO_BRIDGE_OPERATION_ID | — | Opaque idempotency id for a state-changing Zotero request |
| --profile | profile | option | no | — | PATH | no | ZOTERO_BRIDGE_PROFILE | — | Path to a Zotero Bridge connection-profile JSON file. If omitted, the CLI tries the Zotero Agents well-known profile. ACP run profiles usually reference tokenEnv; the local well-known profile may contain a bearer token protected by user-level file permissions. |
| --schema | schema | option | no | — | SCHEMA; values: true, false | no | — | — | Print the versioned raw JSON Schemas and governed examples for one canonical leaf command. Schema mode is offline and does not load a profile, read Zotero Bridge configuration, or connect to Zotero. |

## Local options and positionals

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --item | item | option | yes | — | ITEM | no | — | — | Zotero item ref: key, numeric id, libraryId:key, or JSON object |
| --format | format | option | no | — | FORMAT; values: markdown, json | no | — | — | Export format |

## Invocation schema

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

## Structured input schemas

此命令没有结构化 JSON 输入参数。

## Composed payload schema

```json
{
  "additionalProperties": true,
  "type": "object",
  "x-openPropertiesReason": "The selected domain service owns this capability input vocabulary; the capability boundary still requires a JSON object."
}
```

## Payload composition

可执行命令契约统一定义下方的基础来源、固定值、字段映射和封闭转换。命令处理器只为所引用的 Clap 参数 ID 提供值。

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

## Result schema

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

## Examples

此命令没有适用的结构化输入示例。请依据参数表构造 argv，并在执行前使用 `surface describe` 确认命令。

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

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

## Parameter failure and recovery contract

Parameter failures are returned as one JSON error envelope. Inspect `error.code`, then require `error.details.schema` to be `host-bridge.argument-error.v1` before using the structured boundary fields. Preserve the canonical command, sanitized inputs, and any already-returned typed handles; never include the complete raw payload in evidence.

- `argv` reports a missing, unknown, conflicting, or invalid CLI argument. Rebuild argv from this card's parameter tables or the active command help.
- `json_source` reports an unreadable stdin or file source. Correct that source without moving the value to a different binding.
- `json_syntax` reports invalid JSON with safe line and column context. Repair syntax before interpreting domain fields.
- 该叶命令没有结构化 JSON 输入，因此 `command_input` 不是预期的调用边界。使用 `surface describe` 查看其标量与位置参数合同。
- `payload_contract` means the CLI's composed capability payload violates the executable contract before network I/O. Treat this as an implementation fault; do not bypass the semantic command with raw transport.
- `command_result` means a Host response or local result failed its executable result schema. Do not accept or report it as successful evidence.
- Violation arrays are redacted, deterministically ordered, and capped at eight. When `truncated` is true, correct the reported violations and validate again rather than requesting secret or complete payload disclosure.

## Operational contract

- 规范 argv 路径： `library` `annotation` `export`.
- 输出边界： `file`；受管详情： {"fileField":"data.delivery.file","strategy":"file"}.
- 分页： `file`.
- Category: `read`; danger: `none`.
- 结构化 binding 模式： `object`.
- Intent visibility: `visible`.
- 操作别名： `library annotation export`, `library`, `annotation`, `export`, `item`, `ITEM`, `format`, `FORMAT`.

### Effects

```json
[
  {
    "description": "Reads state without changing Zotero-managed data.",
    "kind": "none",
    "stateChanged": false
  }
]
```

### Approval

```json
{
  "kind": "none",
  "scope": "No Zotero UI approval; provider runtimes may still request their own permission.",
  "timing": "none"
}
```

### Handle transitions

```json
[
]
```

### Recovery

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

### Targets

```json
[
  {
    "kind": "capability",
    "target": "library.export_annotations"
  }
]
```
