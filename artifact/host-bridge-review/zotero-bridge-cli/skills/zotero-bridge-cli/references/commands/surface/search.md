# `zotero-bridge surface search`

按任务意图搜索规范化命令

## 用法

```console
zotero-bridge surface search [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --intent <INTENT> [--limit <LIMIT>] [--include-debug] [--json]
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
| --intent | intent | option | yes | — | INTENT | no | — | — | Natural-language task intent |
| --limit | limit | option | no | — | LIMIT; default: 10 | no | — | — | Maximum number of ranked matches (1-20) |
| --include-debug | include_debug | option | no | — | INCLUDE_DEBUG; values: true, false | no | — | — | Include raw and debug commands in intent recommendations |
| --json | json | option | no | — | JSON; values: true, false | no | — | — | Emit JSON (the CLI output contract is always JSON) |

## 调用 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "include-debug": {
      "description": "Include raw and debug commands in intent recommendations",
      "type": "boolean"
    },
    "intent": {
      "description": "Natural-language task intent",
      "type": "string"
    },
    "json": {
      "description": "Emit JSON (the CLI output contract is always JSON)",
      "type": "boolean"
    },
    "limit": {
      "description": "Maximum number of ranked matches (1-20)",
      "type": "string"
    }
  },
  "required": [
    "intent"
  ],
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
    "intent": {
      "description": "Natural-language task intent",
      "type": "string"
    },
    "limit": {
      "description": "Maximum number of ranked matches (1-100)",
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
    "items": {
      "type": "array"
    },
    "response": {
      "additionalProperties": true,
      "description": "Response object returned by the derived host-bridge.agent-surface.v6.",
      "type": "object",
      "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
    },
    "truncated": {
      "type": "boolean"
    }
  },
  "type": "object",
  "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
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
      "help": "Natural-language task intent",
      "id": "intent",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "--intent",
      "valueNames": [
        "INTENT"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [
        "10"
      ],
      "global": false,
      "help": "Maximum number of ranked matches (1-20)",
      "id": "limit",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--limit",
      "valueNames": [
        "LIMIT"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Include raw and debug commands in intent recommendations",
      "id": "include_debug",
      "kind": "option",
      "possibleValues": [
        "true",
        "false"
      ],
      "repeatable": false,
      "required": false,
      "takesValue": false,
      "token": "--include-debug",
      "valueNames": [
        "INCLUDE_DEBUG"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Emit JSON (the CLI output contract is always JSON)",
      "id": "json",
      "kind": "option",
      "possibleValues": [
        "true",
        "false"
      ],
      "repeatable": false,
      "required": false,
      "takesValue": false,
      "token": "--json",
      "valueNames": [
        "JSON"
      ]
    }
  ],
  "argv": [
    "surface",
    "search"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "intent",
      "required": true,
      "takesValue": true,
      "token": "--intent",
      "valueNames": [
        "INTENT"
      ]
    },
    {
      "kind": "option",
      "property": "limit",
      "required": false,
      "takesValue": true,
      "token": "--limit",
      "valueNames": [
        "LIMIT"
      ]
    },
    {
      "kind": "option",
      "property": "include-debug",
      "required": false,
      "takesValue": false,
      "token": "--include-debug",
      "valueNames": [
        "INCLUDE_DEBUG"
      ]
    },
    {
      "kind": "option",
      "property": "json",
      "required": false,
      "takesValue": false,
      "token": "--json",
      "valueNames": [
        "JSON"
      ]
    }
  ],
  "binding": "none",
  "category": "read",
  "command": "surface search",
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
  "inputSchemas": {},
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "include-debug": {
        "description": "Include raw and debug commands in intent recommendations",
        "type": "boolean"
      },
      "intent": {
        "description": "Natural-language task intent",
        "type": "string"
      },
      "json": {
        "description": "Emit JSON (the CLI output contract is always JSON)",
        "type": "boolean"
      },
      "limit": {
        "description": "Maximum number of ranked matches (1-20)",
        "type": "string"
      }
    },
    "required": [
      "intent"
    ],
    "type": "object"
  },
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
  "outputBoundary": {
    "defaultLimit": 10,
    "maxLimit": 20,
    "section": "items",
    "strategy": "limit",
    "truncatedField": "truncated"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "intent": {
        "description": "Natural-language task intent",
        "type": "string"
      },
      "limit": {
        "description": "Maximum number of ranked matches (1-100)",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "recovery": [
    {
      "action": "Inspect the error and retry only when retryable is true.",
      "requiresHandles": [],
      "stateCheck": "none",
      "when": "The read fails or returns incomplete evidence."
    }
  ],
  "resultSchema": {
    "additionalProperties": true,
    "properties": {
      "items": {
        "type": "array"
      },
      "response": {
        "additionalProperties": true,
        "description": "Response object returned by the derived host-bridge.agent-surface.v6.",
        "type": "object",
        "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
      },
      "truncated": {
        "type": "boolean"
      }
    },
    "type": "object",
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
  },
  "summary": "Search canonical commands by task intent",
  "targets": [
    {
      "kind": "service",
      "target": "embedded host-bridge.agent-surface.v6"
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

- Canonical argv path: `surface` `search`.
- Output boundary: `limit`; governed details: {"defaultLimit":10,"maxLimit":20,"section":"items","strategy":"limit","truncatedField":"truncated"}.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Structured binding mode: `none`.
- Intent visibility: `visible`.
- Operational aliases: `surface search`, `surface`, `search`, `intent`, `INTENT`, `limit`, `LIMIT`, `include_debug`, `include-debug`, `INCLUDE_DEBUG`, `json`, `JSON`.

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
    "kind": "service",
    "target": "embedded host-bridge.agent-surface.v6"
  }
]
```
