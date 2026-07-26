# `zotero-bridge surface search`

按 task intent 搜索 canonical command

## 用法

```console
zotero-bridge surface search [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --intent <INTENT> [--limit <LIMIT>] [--include-debug] [--json]
```

全局选项可位于叶命令之前或之后。此叶命令没有结构化 JSON 输入。`--schema` 会返回 `command_input_schema_unavailable`；请使用命令帮助或 `surface describe` 检查调用契约。

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
| --intent | intent | option | yes | — | INTENT | no | — | — | Natural-language task intent |
| --limit | limit | option | no | — | LIMIT; default: 10 | no | — | — | Maximum number of ranked matches (1-100) |
| --include-debug | include_debug | option | no | — | INCLUDE_DEBUG; values: true, false | no | — | — | Include raw and debug commands in intent recommendations |
| --json | json | option | no | — | JSON; values: true, false | no | — | — | Emit JSON (the CLI output contract is always JSON) |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "intent": {
      "type": "string",
      "description": "Natural-language task intent"
    },
    "limit": {
      "type": "string",
      "description": "Maximum number of ranked matches (1-20)"
    },
    "include-debug": {
      "type": "boolean",
      "description": "Include raw and debug commands in intent recommendations"
    },
    "json": {
      "type": "boolean",
      "description": "Emit JSON (the CLI output contract is always JSON)"
    }
  },
  "required": [
    "intent"
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
    "intent": {
      "type": "string",
      "description": "Natural-language task intent"
    },
    "limit": {
      "type": "string",
      "description": "Maximum number of ranked matches (1-100)"
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
      "description": "Response object returned by embedded host-bridge.agent-surface.v5.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
    },
    "items": {
      "type": "array"
    },
    "truncated": {
      "type": "boolean"
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
  "command": "surface search",
  "argv": [
    "surface",
    "search"
  ],
  "summary": "Search canonical commands by task intent",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "intent": {
        "type": "string",
        "description": "Natural-language task intent"
      },
      "limit": {
        "type": "string",
        "description": "Maximum number of ranked matches (1-20)"
      },
      "include-debug": {
        "type": "boolean",
        "description": "Include raw and debug commands in intent recommendations"
      },
      "json": {
        "type": "boolean",
        "description": "Emit JSON (the CLI output contract is always JSON)"
      }
    },
    "required": [
      "intent"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "intent",
      "kind": "option",
      "token": "--intent",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Natural-language task intent",
      "valueNames": [
        "INTENT"
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
      "help": "Maximum number of ranked matches (1-20)",
      "valueNames": [
        "LIMIT"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": [
        "10"
      ]
    },
    {
      "id": "include_debug",
      "kind": "option",
      "token": "--include-debug",
      "takesValue": false,
      "required": false,
      "global": false,
      "help": "Include raw and debug commands in intent recommendations",
      "valueNames": [
        "INCLUDE_DEBUG"
      ],
      "possibleValues": [
        "true",
        "false"
      ],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "json",
      "kind": "option",
      "token": "--json",
      "takesValue": false,
      "required": false,
      "global": false,
      "help": "Emit JSON (the CLI output contract is always JSON)",
      "valueNames": [
        "JSON"
      ],
      "possibleValues": [
        "true",
        "false"
      ],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    }
  ],
  "argvBindings": [
    {
      "property": "intent",
      "kind": "option",
      "token": "--intent",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "INTENT"
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
    },
    {
      "property": "include-debug",
      "kind": "option",
      "token": "--include-debug",
      "takesValue": false,
      "required": false,
      "valueNames": [
        "INCLUDE_DEBUG"
      ]
    },
    {
      "property": "json",
      "kind": "option",
      "token": "--json",
      "takesValue": false,
      "required": false,
      "valueNames": [
        "JSON"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "intent": {
        "type": "string",
        "description": "Natural-language task intent"
      },
      "limit": {
        "type": "string",
        "description": "Maximum number of ranked matches (1-100)"
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
        "description": "Response object returned by embedded host-bridge.agent-surface.v5.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
      },
      "items": {
        "type": "array"
      },
      "truncated": {
        "type": "boolean"
      }
    },
    "additionalProperties": true,
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
  },
  "outputBoundary": {
    "strategy": "limit",
    "section": "items",
    "defaultLimit": 10,
    "maxLimit": 20,
    "truncatedField": "truncated"
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
      "action": "Inspect the error and retry only when retryable is true."
    }
  ],
  "targets": [
    {
      "kind": "service",
      "target": "embedded host-bridge.agent-surface.v5"
    }
  ],
  "operationalAliases": [
    "surface search",
    "surface",
    "search",
    "intent",
    "INTENT",
    "limit",
    "LIMIT",
    "include_debug",
    "include-debug",
    "INCLUDE_DEBUG",
    "json",
    "JSON"
  ],
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `surface` `search`.
- 输出边界： `limit`; governed details: {"strategy":"limit","section":"items","defaultLimit":10,"maxLimit":20,"truncatedField":"truncated"}.
- 分页： `none`.
- 类别： `read`; danger: `none`.
- 意图可见性： `visible`.
- 操作别名： `surface search`, `surface`, `search`, `intent`, `INTENT`, `limit`, `LIMIT`, `include_debug`, `include-debug`, `INCLUDE_DEBUG`, `json`, `JSON`.
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
    "action": "Inspect the error and retry only when retryable is true."
  }
]
```

### 目标

```json
[
  {
    "kind": "service",
    "target": "embedded host-bridge.agent-surface.v5"
  }
]
```
