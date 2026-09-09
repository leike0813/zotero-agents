# `zotero-bridge surface search`

按任务意图搜索规范命令

## 用法

```console
zotero-bridge surface search [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --intent <INTENT> [--limit <LIMIT>] [--include-debug] [--json]
```

全局选项可出现在叶命令之前或之后。此叶命令没有结构化 JSON 输入。`--schema` 返回 `command_input_schema_unavailable`；请使用命令帮助或 `surface describe` 检查调用契约。

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
| --intent | intent | option | yes | — | INTENT | no | — | — | 自然语言任务意图 |
| --limit | limit | option | no | — | LIMIT; default: 10 | no | — | — | 最大排名匹配数（1-20） |
| --include-debug | include_debug | option | no | — | INCLUDE_DEBUG; values: true, false | no | — | — | 在意图建议中包含原始与调试命令 |
| --json | json | option | no | — | JSON; values: true, false | no | — | — | 输出 JSON（CLI 输出契约始终为 JSON） |

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

## 组合载荷 schema

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

## 载荷组合

此命令没有独立的字段映射程序。其绑定模式为直接可执行：passthrough 使用唯一的结构化来源，而 `none` 与 `raw` 保持其声明的封闭行为。

`composition`：`null`。

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

没有适用的结构化输入示例。请依据参数表构建 argv，并在执行前用 `surface describe` 确认命令。

## 完整命令描述符

此封闭描述符是 `surface describe` 返回的机器可读命令契约；此处包含它，以便在不加载另一份命令参考的情况下，本卡片仍可独立审计。

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

参数失败以单个 JSON 错误信封返回。先检查 `error.code`，然后要求 `error.details.schema` 为 `host-bridge.argument-error.v1`，再使用结构化边界字段。保留规范命令、已净化的输入以及任何已返回的类型化句柄；绝不在证据中包含完整的原始载荷。

- `argv` 报告缺失、未知、冲突或无效的 CLI 参数。请依据本卡片的参数表或当前命令帮助重建 argv。
- `json_source` 报告 stdin 或文件源不可读。请修正该源，而不要将值挪到另一个绑定。
- `json_syntax` 以安全行列上下文报告无效 JSON。在解读领域字段前先修复语法。
- 此叶命令没有结构化 JSON 输入，因此 `command_input` 不是预期的调用边界。请使用 `surface describe` 了解其标量与位置参数契约。
- `payload_contract` 表示 CLI 组合出的 capability 载荷在网络 I/O 之前违反了可执行契约。将其视为实现缺陷；不要用原始传输绕过语义命令。
- `command_result` 表示 Host 响应或本地结果未通过其可执行结果 schema。不得将其作为成功证据接受或报告。
- 违规数组经过脱敏、确定性排序，并最多保留八项。当 `truncated` 为 true 时，应修正所报告的违规并重新校验，而不是要求披露秘密或完整载荷。

## 操作契约

- 规范 argv 路径：`surface` `search`。
- 输出边界：`limit`；受管辖详情：{"defaultLimit":10,"maxLimit":20,"section":"items","strategy":"limit","truncatedField":"truncated"}。
- 分页：`none`。
- 类别：`read`；危险级别：`none`。
- 结构化绑定模式：`none`。
- 意图可见性：`visible`。
- 操作别名：`surface search`、`surface`、`search`、`intent`、`INTENT`、`limit`、`LIMIT`、`include_debug`、`include-debug`、`INCLUDE_DEBUG`、`json`、`JSON`。

### 效果

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

### 句柄转换

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
