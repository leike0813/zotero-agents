# `zotero-bridge synthesis cache invalidate`

使受限 Synthesis 缓存范围失效

## 用法

```console
zotero-bridge synthesis cache invalidate [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --scope <SCOPE> [--id <ID>]
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
| --scope | scope | option | yes | — | SCOPE; values: topic, graph, index | no | — | — | 缓存范围 |
| --id | id | option | no | — | ID | no | — | — | 可选的不透明目标 id |

## 调用 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "id": {
      "description": "Optional opaque target id",
      "type": "string"
    },
    "scope": {
      "description": "Cache scope",
      "type": "string"
    }
  },
  "required": [
    "scope"
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
    "id": {
      "description": "Optional opaque target id",
      "type": "string"
    },
    "scope": {
      "description": "Cache scope",
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
    "response": {
      "additionalProperties": true,
      "description": "Response object returned by POST /bridge/v2/synthesis/cache/invalidate.",
      "type": "object",
      "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
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
    "kind": "zotero-ui-required",
    "scope": "Zotero UI approval for the described Zotero-managed effect.",
    "timing": "before-command"
  },
  "arguments": [
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Cache scope",
      "id": "scope",
      "kind": "option",
      "possibleValues": [
        "topic",
        "graph",
        "index"
      ],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "--scope",
      "valueNames": [
        "SCOPE"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Optional opaque target id",
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
    }
  ],
  "argv": [
    "synthesis",
    "cache",
    "invalidate"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "scope",
      "required": true,
      "takesValue": true,
      "token": "--scope",
      "valueNames": [
        "SCOPE"
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
    }
  ],
  "binding": "object",
  "category": "maintenance",
  "command": "synthesis cache invalidate",
  "composition": null,
  "danger": "review",
  "effects": [
    {
      "description": "May change cache maintenance state.",
      "kind": "cache-maintenance",
      "stateChanged": true
    }
  ],
  "handleTransitions": [],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {},
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "id": {
        "description": "Optional opaque target id",
        "type": "string"
      },
      "scope": {
        "description": "Cache scope",
        "type": "string"
      }
    },
    "required": [
      "scope"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "synthesis cache invalidate",
    "synthesis",
    "cache",
    "invalidate",
    "scope",
    "SCOPE",
    "id",
    "ID"
  ],
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "id": {
        "description": "Optional opaque target id",
        "type": "string"
      },
      "scope": {
        "description": "Cache scope",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "recovery": [
    {
      "action": "Inspect stateChange and handleConsumption before repeating the operation.",
      "nextCommand": "surface describe",
      "requiresHandles": [],
      "stateCheck": "none",
      "when": "The operation fails or completion is uncertain."
    }
  ],
  "resultSchema": {
    "additionalProperties": true,
    "properties": {
      "response": {
        "additionalProperties": true,
        "description": "Response object returned by POST /bridge/v2/synthesis/cache/invalidate.",
        "type": "object",
        "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
      }
    },
    "type": "object",
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
  },
  "summary": "Invalidate a constrained Synthesis cache scope",
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v2/synthesis/cache/invalidate"
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

- 规范 argv 路径：`synthesis` `cache` `invalidate`。
- 输出边界：`fixed`；受管辖细节：{"strategy":"fixed"}。
- 分页：`none`。
- 类别：`maintenance`；危险级别：`review`。
- 结构化绑定模式：`object`。
- 意图可见性：`visible`。
- 操作别名：`synthesis cache invalidate`、`synthesis`、`cache`、`invalidate`、`scope`、`SCOPE`、`id`、`ID`。

### 效果

```json
[
  {
    "description": "May change cache maintenance state.",
    "kind": "cache-maintenance",
    "stateChanged": true
  }
]
```

### 审批

```json
{
  "kind": "zotero-ui-required",
  "scope": "Zotero UI approval for the described Zotero-managed effect.",
  "timing": "before-command"
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
    "action": "Inspect stateChange and handleConsumption before repeating the operation.",
    "nextCommand": "surface describe",
    "requiresHandles": [],
    "stateCheck": "none",
    "when": "The operation fails or completion is uncertain."
  }
]
```

### 目标

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v2/synthesis/cache/invalidate"
  }
]
```
