# `zotero-bridge workflow agent-result validate`

根据输出契约校验本地 agent 结果目录

## 用法

```console
zotero-bridge workflow agent-result validate [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --contract <FILE> --result <DIR_OR_ZIP>
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
| --contract | contract | option | yes | — | FILE | no | — | — | Authoritative output-contract JSON file |
| --result | result | option | yes | — | DIR_OR_ZIP | no | — | — | Agent result directory or ZIP |

## 调用 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "contract": {
      "description": "Authoritative output-contract JSON file",
      "type": "string"
    },
    "result": {
      "description": "Agent result directory or ZIP",
      "type": "string"
    }
  },
  "required": [
    "contract",
    "result"
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
    "contract": {
      "description": "Authoritative output-contract JSON file",
      "type": "string"
    },
    "result": {
      "description": "Agent result directory or ZIP",
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
      "description": "Response object returned by the derived host-bridge.agent-surface.v6.",
      "type": "object",
      "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
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
      "help": "Authoritative output-contract JSON file",
      "id": "contract",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "--contract",
      "valueNames": [
        "FILE"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Agent result directory or ZIP",
      "id": "result",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "--result",
      "valueNames": [
        "DIR_OR_ZIP"
      ]
    }
  ],
  "argv": [
    "workflow",
    "agent-result",
    "validate"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "contract",
      "required": true,
      "takesValue": true,
      "token": "--contract",
      "valueNames": [
        "FILE"
      ]
    },
    {
      "kind": "option",
      "property": "result",
      "required": true,
      "takesValue": true,
      "token": "--result",
      "valueNames": [
        "DIR_OR_ZIP"
      ]
    }
  ],
  "binding": "none",
  "category": "read",
  "command": "workflow agent-result validate",
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
      "contract": {
        "description": "Authoritative output-contract JSON file",
        "type": "string"
      },
      "result": {
        "description": "Agent result directory or ZIP",
        "type": "string"
      }
    },
    "required": [
      "contract",
      "result"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "workflow agent-result validate",
    "workflow",
    "agent-result",
    "validate",
    "contract",
    "FILE",
    "result",
    "DIR_OR_ZIP"
  ],
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "contract": {
        "description": "Authoritative output-contract JSON file",
        "type": "string"
      },
      "result": {
        "description": "Agent result directory or ZIP",
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
        "description": "Response object returned by the derived host-bridge.agent-surface.v6.",
        "type": "object",
        "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
      }
    },
    "type": "object",
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
  },
  "summary": "Validate a local agent result directory against an output contract",
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

- Canonical argv path: `workflow` `agent-result` `validate`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Structured binding mode: `none`.
- Intent visibility: `visible`.
- Operational aliases: `workflow agent-result validate`, `workflow`, `agent-result`, `validate`, `contract`, `FILE`, `result`, `DIR_OR_ZIP`.

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
    "kind": "service",
    "target": "embedded host-bridge.agent-surface.v6"
  }
]
```
