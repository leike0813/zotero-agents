# `zotero-bridge library note get`

读取一个 Zotero note 正文片段

## 用法

```console
zotero-bridge library note get [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--key <KEY>] [--id <ID>] [--library-id <LIBRARY_ID>] [--format <FORMAT>] [--offset <OFFSET>] [--max-chars <MAX_CHARS>]
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
| --key | key | option | no | — | KEY | no | — | id | Zotero item key |
| --id | id | option | no | — | ID | no | — | key | Zotero item numeric id |
| --library-id | library_id | option | no | — | LIBRARY_ID | no | — | — | Zotero library id for key lookup |
| --format | format | option | no | — | FORMAT; values: text, html | no | — | — | Payload format |
| --offset | offset | option | no | — | OFFSET | no | — | — | Start offset |
| --max-chars | max_chars | option | no | — | MAX_CHARS | no | — | — | Maximum characters |

## 调用 schema

```json
{
  "additionalProperties": false,
  "allOf": [
    {
      "not": {
        "required": [
          "id",
          "key"
        ]
      }
    },
    {
      "oneOf": [
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
      ]
    }
  ],
  "properties": {
    "format": {
      "description": "Payload format",
      "type": "string"
    },
    "id": {
      "description": "Zotero item numeric id",
      "type": "string"
    },
    "key": {
      "description": "Zotero item key",
      "type": "string"
    },
    "library-id": {
      "description": "Zotero library id for key lookup",
      "type": "string"
    },
    "max-chars": {
      "description": "Maximum characters",
      "type": "string"
    },
    "offset": {
      "description": "Start offset",
      "type": "string"
    }
  },
  "required": [],
  "type": "object"
}
```

## 结构化输入 schema

此命令没有结构化 JSON 输入参数。

## 组合 payload schema

```json
{
  "additionalProperties": false,
  "properties": {
    "format": {
      "enum": [
        "html",
        "text"
      ],
      "type": "string"
    },
    "id": {
      "type": [
        "number",
        "string"
      ]
    },
    "key": {
      "minLength": 1,
      "type": "string"
    },
    "libraryId": {
      "type": [
        "number",
        "string"
      ]
    },
    "maxChars": {
      "maximum": 16000,
      "minimum": 1,
      "type": "integer"
    },
    "offset": {
      "minimum": 0,
      "type": "integer"
    }
  },
  "type": "object"
}
```

## Payload 组合

The executable command contract owns the base source, fixed values, field mappings, and closed transforms shown below. Command handlers only provide values under the referenced Clap argument IDs.

```json
{
  "constants": {},
  "mappings": [
    {
      "argument": "key",
      "field": "key",
      "required": false,
      "transform": "identity"
    },
    {
      "argument": "id",
      "field": "id",
      "required": false,
      "transform": "identity"
    },
    {
      "argument": "library_id",
      "field": "libraryId",
      "required": false,
      "transform": "identity"
    },
    {
      "argument": "format",
      "field": "format",
      "required": false,
      "transform": "identity"
    },
    {
      "argument": "offset",
      "field": "offset",
      "required": false,
      "transform": "identity"
    },
    {
      "argument": "max_chars",
      "field": "maxChars",
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
      "const": "library.get_note_detail"
    },
    "data": {
      "additionalProperties": true,
      "description": "Result data owned by library.get_note_detail.",
      "properties": {
        "hasMore": {
          "type": "boolean"
        },
        "maxChars": {
          "minimum": 0,
          "type": "integer"
        },
        "nextOffset": {
          "minimum": 0,
          "type": "integer"
        },
        "totalChars": {
          "minimum": 0,
          "type": "integer"
        },
        "truncated": {
          "type": "boolean"
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
      "conflictsWith": [
        "id"
      ],
      "defaultValues": [],
      "global": false,
      "help": "Zotero item key",
      "id": "key",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--key",
      "valueNames": [
        "KEY"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [
        "key"
      ],
      "defaultValues": [],
      "global": false,
      "help": "Zotero item numeric id",
      "id": "id",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--id",
      "valueNames": [
        "ID"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Zotero library id for key lookup",
      "id": "library_id",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--library-id",
      "valueNames": [
        "LIBRARY_ID"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Payload format",
      "id": "format",
      "kind": "option",
      "possibleValues": [
        "text",
        "html"
      ],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--format",
      "valueNames": [
        "FORMAT"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Start offset",
      "id": "offset",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--offset",
      "valueNames": [
        "OFFSET"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Maximum characters",
      "id": "max_chars",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--max-chars",
      "valueNames": [
        "MAX_CHARS"
      ]
    }
  ],
  "argv": [
    "library",
    "note",
    "get"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "key",
      "required": false,
      "takesValue": true,
      "token": "--key",
      "valueNames": [
        "KEY"
      ]
    },
    {
      "kind": "option",
      "property": "id",
      "required": false,
      "takesValue": true,
      "token": "--id",
      "valueNames": [
        "ID"
      ]
    },
    {
      "kind": "option",
      "property": "library-id",
      "required": false,
      "takesValue": true,
      "token": "--library-id",
      "valueNames": [
        "LIBRARY_ID"
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
    },
    {
      "kind": "option",
      "property": "offset",
      "required": false,
      "takesValue": true,
      "token": "--offset",
      "valueNames": [
        "OFFSET"
      ]
    },
    {
      "kind": "option",
      "property": "max-chars",
      "required": false,
      "takesValue": true,
      "token": "--max-chars",
      "valueNames": [
        "MAX_CHARS"
      ]
    }
  ],
  "binding": "object",
  "category": "read",
  "command": "library note get",
  "composition": {
    "constants": {},
    "mappings": [
      {
        "argument": "key",
        "field": "key",
        "required": false,
        "transform": "identity"
      },
      {
        "argument": "id",
        "field": "id",
        "required": false,
        "transform": "identity"
      },
      {
        "argument": "library_id",
        "field": "libraryId",
        "required": false,
        "transform": "identity"
      },
      {
        "argument": "format",
        "field": "format",
        "required": false,
        "transform": "identity"
      },
      {
        "argument": "offset",
        "field": "offset",
        "required": false,
        "transform": "identity"
      },
      {
        "argument": "max_chars",
        "field": "maxChars",
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
    "allOf": [
      {
        "not": {
          "required": [
            "id",
            "key"
          ]
        }
      },
      {
        "oneOf": [
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
        ]
      }
    ],
    "properties": {
      "format": {
        "description": "Payload format",
        "type": "string"
      },
      "id": {
        "description": "Zotero item numeric id",
        "type": "string"
      },
      "key": {
        "description": "Zotero item key",
        "type": "string"
      },
      "library-id": {
        "description": "Zotero library id for key lookup",
        "type": "string"
      },
      "max-chars": {
        "description": "Maximum characters",
        "type": "string"
      },
      "offset": {
        "description": "Start offset",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "operationalAliases": [
    "library note get",
    "library",
    "note",
    "get",
    "key",
    "KEY",
    "id",
    "ID",
    "library_id",
    "library-id",
    "LIBRARY_ID",
    "format",
    "FORMAT",
    "offset",
    "OFFSET",
    "max_chars",
    "max-chars",
    "MAX_CHARS"
  ],
  "outputBoundary": {
    "continuation": [
      "data.nextOffset",
      "data.hasMore",
      "data.totalChars",
      "data.truncated",
      "data.maxChars"
    ],
    "cursorInput": "offset",
    "defaultLimit": 8000,
    "maxLimit": 16000,
    "section": "data.content",
    "strategy": "offset"
  },
  "pagination": "cursor",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "format": {
        "enum": [
          "html",
          "text"
        ],
        "type": "string"
      },
      "id": {
        "type": [
          "number",
          "string"
        ]
      },
      "key": {
        "minLength": 1,
        "type": "string"
      },
      "libraryId": {
        "type": [
          "number",
          "string"
        ]
      },
      "maxChars": {
        "maximum": 16000,
        "minimum": 1,
        "type": "integer"
      },
      "offset": {
        "minimum": 0,
        "type": "integer"
      }
    },
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
    "additionalProperties": false,
    "properties": {
      "approval": {
        "minLength": 1,
        "type": "string"
      },
      "capability": {
        "const": "library.get_note_detail"
      },
      "data": {
        "additionalProperties": true,
        "description": "Result data owned by library.get_note_detail.",
        "properties": {
          "hasMore": {
            "type": "boolean"
          },
          "maxChars": {
            "minimum": 0,
            "type": "integer"
          },
          "nextOffset": {
            "minimum": 0,
            "type": "integer"
          },
          "totalChars": {
            "minimum": 0,
            "type": "integer"
          },
          "truncated": {
            "type": "boolean"
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
  "summary": "Read one Zotero note body chunk",
  "targets": [
    {
      "kind": "capability",
      "target": "library.get_note_detail"
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

- Canonical argv path: `library` `note` `get`.
- Output boundary: `offset`; governed details: {"continuation":["data.nextOffset","data.hasMore","data.totalChars","data.truncated","data.maxChars"],"cursorInput":"offset","defaultLimit":8000,"maxLimit":16000,"section":"data.content","strategy":"offset"}.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Structured binding mode: `object`.
- Intent visibility: `visible`.
- Operational aliases: `library note get`, `library`, `note`, `get`, `key`, `KEY`, `id`, `ID`, `library_id`, `library-id`, `LIBRARY_ID`, `format`, `FORMAT`, `offset`, `OFFSET`, `max_chars`, `max-chars`, `MAX_CHARS`.

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
    "target": "library.get_note_detail"
  }
]
```
