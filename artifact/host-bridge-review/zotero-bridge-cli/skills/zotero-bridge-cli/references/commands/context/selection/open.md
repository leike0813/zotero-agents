# `zotero-bridge context selection open`

将一个或多个 Zotero item 作为当前选中项打开

## 用法

```console
zotero-bridge context selection open [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] ITEM_REFS <ITEM_REFS> [--cursor <CURSOR>] [--limit <LIMIT>]
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
| ITEM_REFS | item_refs | positional | yes | — | ITEM_REFS; numArgs: 1.. | yes | — | — | Zotero item refs |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "item_refs": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Zotero item refs",
      "position": 1
    },
    "cursor": {
      "type": "string",
      "description": "Opaque continuation cursor"
    },
    "limit": {
      "type": "string",
      "description": "Maximum number of entries (1-100)"
    }
  },
  "required": [
    "item_refs"
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
    "item_refs": {
      "type": "string",
      "description": "Zotero item refs"
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
      "description": "Response object returned by POST /bridge/v1/context/selection/open.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
    },
    "target": {
      "type": "object",
      "properties": {
        "items": {
          "type": "array"
        }
      },
      "additionalProperties": true
    },
    "pagination": {
      "type": "object",
      "properties": {
        "items": {
          "type": "object",
          "properties": {
            "nextCursor": {
              "type": [
                "string",
                "null"
              ]
            },
            "hasMore": {
              "type": "boolean"
            },
            "returned": {
              "type": "integer",
              "minimum": 0
            },
            "total": {
              "type": "integer",
              "minimum": 0
            },
            "limit": {
              "type": "integer",
              "minimum": 0
            }
          },
          "additionalProperties": true
        }
      },
      "additionalProperties": true
    }
  },
  "additionalProperties": true,
  "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
}
```

## 示例

此命令没有适用的结构化输入示例。请根据参数表构造 argv，并在执行前通过 `surface describe` 确认命令。

## 完整命令 descriptor

此封闭 descriptor 是 `surface describe` 返回的机器可读命令契约；将其收录于此，使本命令卡无需加载其他命令参考即可独立审计。

```json
{
  "command": "context selection open",
  "argv": [
    "context",
    "selection",
    "open"
  ],
  "summary": "Open one or more Zotero items as the active selection",
  "category": "navigation",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "item_refs": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Zotero item refs",
        "position": 1
      },
      "cursor": {
        "type": "string",
        "description": "Opaque continuation cursor"
      },
      "limit": {
        "type": "string",
        "description": "Maximum number of entries (1-100)"
      }
    },
    "required": [
      "item_refs"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "item_refs",
      "kind": "positional",
      "token": "ITEM_REFS",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Zotero item refs",
      "valueNames": [
        "ITEM_REFS"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": true,
      "numArgs": "1..",
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "cursor",
      "kind": "option",
      "token": "--cursor",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Opaque continuation cursor",
      "valueNames": [
        "CURSOR"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "limit",
      "kind": "option",
      "token": "--limit",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Maximum number of entries (1-100)",
      "valueNames": [
        "LIMIT"
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
      "property": "item_refs",
      "kind": "positional",
      "token": "ITEM_REFS",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "ITEM_REFS"
      ]
    },
    {
      "property": "cursor",
      "kind": "option",
      "token": "--cursor",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "CURSOR"
      ]
    },
    {
      "property": "limit",
      "kind": "option",
      "token": "--limit",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "LIMIT"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "item_refs": {
        "type": "string",
        "description": "Zotero item refs"
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
        "description": "Response object returned by POST /bridge/v1/context/selection/open.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
      },
      "target": {
        "type": "object",
        "properties": {
          "items": {
            "type": "array"
          }
        },
        "additionalProperties": true
      },
      "pagination": {
        "type": "object",
        "properties": {
          "items": {
            "type": "object",
            "properties": {
              "nextCursor": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "hasMore": {
                "type": "boolean"
              },
              "returned": {
                "type": "integer",
                "minimum": 0
              },
              "total": {
                "type": "integer",
                "minimum": 0
              },
              "limit": {
                "type": "integer",
                "minimum": 0
              }
            },
            "additionalProperties": true
          }
        },
        "additionalProperties": true
      }
    },
    "additionalProperties": true,
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
  },
  "outputBoundary": {
    "strategy": "cursor",
    "section": "target.items",
    "defaultLimit": 25,
    "maxLimit": 100,
    "cursorInput": "cursor",
    "continuation": [
      "pagination.items.nextCursor",
      "pagination.items.hasMore",
      "pagination.items.returned",
      "pagination.items.total",
      "pagination.items.limit"
    ]
  },
  "pagination": "cursor",
  "effects": [
    {
      "kind": "ui-navigation",
      "stateChanged": true,
      "description": "May change ui navigation state."
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
      "required": true,
      "condition": "Required by the command invocation.",
      "lifetime": "caller-owned"
    }
  ],
  "recovery": [
    {
      "when": "The operation fails or completion is uncertain.",
      "stateCheck": "none",
      "requiresHandles": [],
      "action": "Inspect stateChange and handleConsumption before repeating the operation.",
      "nextCommand": "surface describe"
    }
  ],
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v1/context/selection/open"
    }
  ],
  "operationalAliases": [
    "context selection open",
    "context",
    "selection",
    "open",
    "item_refs",
    "ITEM_REFS",
    "cursor",
    "CURSOR",
    "limit",
    "LIMIT"
  ],
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `context` `selection` `open`.
- 输出边界： `cursor`; governed details: {"strategy":"cursor","section":"target.items","defaultLimit":25,"maxLimit":100,"cursorInput":"cursor","continuation":["pagination.items.nextCursor","pagination.items.hasMore","pagination.items.returned","pagination.items.total","pagination.items.limit"]}.
- 分页： `cursor`.
- 类别： `navigation`; danger: `review`.
- 意图可见性： `visible`.
- 操作别名： `context selection open`, `context`, `selection`, `open`, `item_refs`, `ITEM_REFS`, `cursor`, `CURSOR`, `limit`, `LIMIT`.
### Effects

```json
[
  {
    "kind": "ui-navigation",
    "stateChanged": true,
    "description": "May change ui navigation state."
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
    "required": true,
    "condition": "Required by the command invocation.",
    "lifetime": "caller-owned"
  }
]
```

### 恢复

```json
[
  {
    "when": "The operation fails or completion is uncertain.",
    "stateCheck": "none",
    "requiresHandles": [],
    "action": "Inspect stateChange and handleConsumption before repeating the operation.",
    "nextCommand": "surface describe"
  }
]
```

### 目标

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v1/context/selection/open"
  }
]
```
