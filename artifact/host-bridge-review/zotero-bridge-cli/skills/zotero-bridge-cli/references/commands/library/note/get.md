# `zotero-bridge library note get`

读取一段 Zotero note 正文

## 用法

```console
zotero-bridge library note get [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--key <KEY>] [--id <ID>] [--library-id <LIBRARY_ID>] [--format <FORMAT>] [--offset <OFFSET>] [--max-chars <MAX_CHARS>]
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
| --key | key | option | no | — | KEY | no | — | id | Zotero item key |
| --id | id | option | no | — | ID | no | — | key | Zotero item numeric id |
| --library-id | library_id | option | no | — | LIBRARY_ID | no | — | — | Zotero library id for key lookup |
| --format | format | option | no | — | FORMAT; values: text, html | no | — | — | Payload format |
| --offset | offset | option | no | — | OFFSET | no | — | — | Start offset |
| --max-chars | max_chars | option | no | — | MAX_CHARS | no | — | — | Maximum characters |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "key": {
      "type": "string",
      "description": "Zotero item key"
    },
    "id": {
      "type": "string",
      "description": "Zotero item numeric id"
    },
    "library-id": {
      "type": "string",
      "description": "Zotero library id for key lookup"
    },
    "format": {
      "type": "string",
      "description": "Payload format"
    },
    "offset": {
      "type": "string",
      "description": "Start offset"
    },
    "max-chars": {
      "type": "string",
      "description": "Maximum characters"
    }
  },
  "required": [],
  "allOf": [
    {
      "not": {
        "required": [
          "key",
          "id"
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
  "additionalProperties": false
}
```

## 结构化输入 schema

此命令没有结构化 JSON 输入参数。

## 合成 payload schema

```json
{
  "type": "object",
  "properties": {
    "key": {
      "type": "string",
      "description": "Zotero item key"
    },
    "id": {
      "type": "string",
      "description": "Zotero item numeric id"
    },
    "library_id": {
      "type": "string",
      "description": "Zotero library id for key lookup"
    },
    "format": {
      "type": "string",
      "description": "Payload format"
    },
    "offset": {
      "type": "string",
      "description": "Start offset"
    },
    "max_chars": {
      "type": "string",
      "description": "Maximum characters"
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
    "capability": {
      "type": "string"
    },
    "approval": {
      "type": "object"
    },
    "data": {
      "type": "object",
      "description": "Result data owned by library.get_note_detail.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed.",
      "properties": {
        "nextOffset": {
          "type": "integer",
          "minimum": 0
        },
        "hasMore": {
          "type": "boolean"
        },
        "totalChars": {
          "type": "integer",
          "minimum": 0
        },
        "truncated": {
          "type": "boolean"
        },
        "maxChars": {
          "type": "integer",
          "minimum": 0
        }
      }
    }
  },
  "additionalProperties": false
}
```

## 示例

此命令没有适用的结构化输入示例。请根据参数表构造 argv，并在执行前通过 `surface describe` 确认命令。

## 完整命令 descriptor

此封闭 descriptor 是 `surface describe` 返回的机器可读命令契约；将其收录于此，使本命令卡无需加载其他命令参考即可独立审计。

```json
{
  "command": "library note get",
  "argv": [
    "library",
    "note",
    "get"
  ],
  "summary": "Read one Zotero note body chunk",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "key": {
        "type": "string",
        "description": "Zotero item key"
      },
      "id": {
        "type": "string",
        "description": "Zotero item numeric id"
      },
      "library-id": {
        "type": "string",
        "description": "Zotero library id for key lookup"
      },
      "format": {
        "type": "string",
        "description": "Payload format"
      },
      "offset": {
        "type": "string",
        "description": "Start offset"
      },
      "max-chars": {
        "type": "string",
        "description": "Maximum characters"
      }
    },
    "required": [],
    "allOf": [
      {
        "not": {
          "required": [
            "key",
            "id"
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
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "key",
      "kind": "option",
      "token": "--key",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Zotero item key",
      "valueNames": [
        "KEY"
      ],
      "possibleValues": [],
      "conflictsWith": [
        "id"
      ],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "id",
      "kind": "option",
      "token": "--id",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Zotero item numeric id",
      "valueNames": [
        "ID"
      ],
      "possibleValues": [],
      "conflictsWith": [
        "key"
      ],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "library_id",
      "kind": "option",
      "token": "--library-id",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Zotero library id for key lookup",
      "valueNames": [
        "LIBRARY_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "format",
      "kind": "option",
      "token": "--format",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Payload format",
      "valueNames": [
        "FORMAT"
      ],
      "possibleValues": [
        "text",
        "html"
      ],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "offset",
      "kind": "option",
      "token": "--offset",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Start offset",
      "valueNames": [
        "OFFSET"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "max_chars",
      "kind": "option",
      "token": "--max-chars",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Maximum characters",
      "valueNames": [
        "MAX_CHARS"
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
      "property": "key",
      "kind": "option",
      "token": "--key",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "KEY"
      ]
    },
    {
      "property": "id",
      "kind": "option",
      "token": "--id",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "ID"
      ]
    },
    {
      "property": "library-id",
      "kind": "option",
      "token": "--library-id",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "LIBRARY_ID"
      ]
    },
    {
      "property": "format",
      "kind": "option",
      "token": "--format",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "FORMAT"
      ]
    },
    {
      "property": "offset",
      "kind": "option",
      "token": "--offset",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "OFFSET"
      ]
    },
    {
      "property": "max-chars",
      "kind": "option",
      "token": "--max-chars",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "MAX_CHARS"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "key": {
        "type": "string",
        "description": "Zotero item key"
      },
      "id": {
        "type": "string",
        "description": "Zotero item numeric id"
      },
      "library_id": {
        "type": "string",
        "description": "Zotero library id for key lookup"
      },
      "format": {
        "type": "string",
        "description": "Payload format"
      },
      "offset": {
        "type": "string",
        "description": "Start offset"
      },
      "max_chars": {
        "type": "string",
        "description": "Maximum characters"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "capability": {
        "type": "string"
      },
      "approval": {
        "type": "object"
      },
      "data": {
        "type": "object",
        "description": "Result data owned by library.get_note_detail.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed.",
        "properties": {
          "nextOffset": {
            "type": "integer",
            "minimum": 0
          },
          "hasMore": {
            "type": "boolean"
          },
          "totalChars": {
            "type": "integer",
            "minimum": 0
          },
          "truncated": {
            "type": "boolean"
          },
          "maxChars": {
            "type": "integer",
            "minimum": 0
          }
        }
      }
    },
    "additionalProperties": false
  },
  "outputBoundary": {
    "strategy": "offset",
    "section": "data.content",
    "defaultLimit": 8000,
    "maxLimit": 16000,
    "cursorInput": "offset",
    "continuation": [
      "data.nextOffset",
      "data.hasMore",
      "data.totalChars",
      "data.truncated",
      "data.maxChars"
    ]
  },
  "pagination": "cursor",
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
      "kind": "capability",
      "target": "library.get_note_detail"
    }
  ],
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
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `library` `note` `get`.
- 输出边界： `offset`; governed details: {"strategy":"offset","section":"data.content","defaultLimit":8000,"maxLimit":16000,"cursorInput":"offset","continuation":["data.nextOffset","data.hasMore","data.totalChars","data.truncated","data.maxChars"]}.
- 分页： `cursor`.
- 类别： `read`; danger: `none`.
- 意图可见性： `visible`.
- 操作别名： `library note get`, `library`, `note`, `get`, `key`, `KEY`, `id`, `ID`, `library_id`, `library-id`, `LIBRARY_ID`, `format`, `FORMAT`, `offset`, `OFFSET`, `max_chars`, `max-chars`, `MAX_CHARS`.
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
    "kind": "capability",
    "target": "library.get_note_detail"
  }
]
```
