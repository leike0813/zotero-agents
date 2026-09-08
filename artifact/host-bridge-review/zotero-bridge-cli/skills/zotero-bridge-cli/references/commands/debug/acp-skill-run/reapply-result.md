# `zotero-bridge debug acp-skill-run reapply-result`

对一个已存在的 ACP skill run 结果重新运行 applyResult

## 用法

```console
zotero-bridge debug acp-skill-run reapply-result [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--input <JSON_OR_FILE>]
```

全局选项可以出现在叶子命令之前或之后。使用 `--schema` 在不加载 profile 或连接 Zotero 的情况下检查原始结构化输入 schema。

## 全局参数

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --endpoint | endpoint | option | no | — | ENDPOINT | no | ZOTERO_BRIDGE_ENDPOINT | — | Zotero Bridge 服务端点的基础 URL。如果省略，CLI 会读取 ZOTERO_BRIDGE_ENDPOINT 或 profile 文件。CLI 不会猜测任意的 bridge 端口。 |
| --operation-id | operation_id | option | no | — | ID | no | ZOTERO_BRIDGE_OPERATION_ID | — | 用于变更 Zotero 状态的不透明幂等性 ID |
| --profile | profile | option | no | — | PATH | no | ZOTERO_BRIDGE_PROFILE | — | Zotero Bridge 连接 profile JSON 文件的路径。如果省略，CLI 会尝试使用 Zotero Agents 的已知 profile。ACP 运行 profile 通常引用 tokenEnv；本地已知 profile 可能包含受用户级文件权限保护的 bearer token。 |
| --schema | schema | option | no | — | SCHEMA; values: true, false | no | — | — | 打印一个规范叶子命令的版本化原始 JSON Schema 和受治理的示例。Schema 模式是离线的，不会加载 profile、读取 Zotero Bridge 配置或连接 Zotero。 |

## 本地选项与位置参数

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --input | input | option | no | — | JSON_OR_FILE | no | — | — | 以 inline JSON、文件路径、@file 或 '-'（表示 stdin）形式提供调试 capability 输入 |

## 调用 Schema

```json
{
  "additionalProperties": false,
  "properties": {
    "input": {
      "description": "Debug capability input as inline JSON, a file path, @file, or '-' for stdin",
      "type": "string"
    }
  },
  "required": [],
  "type": "object"
}
```

## 结构化输入 Schema

### `--input` (input)

Required: `false`.

```json
{
  "additionalProperties": true,
  "type": "object",
  "x-openPropertiesReason": "The selected domain service owns this capability input vocabulary; the capability boundary still requires a JSON object."
}
```

## 组合 Payload Schema

```json
{
  "additionalProperties": true,
  "type": "object",
  "x-openPropertiesReason": "The selected domain service owns this capability input vocabulary; the capability boundary still requires a JSON object."
}
```

## Payload 组合

本命令没有单独的字段映射程序。其绑定模式是直接可执行的：passthrough 使用唯一的结构化源，而 `none` 与 `raw` 保持其声明的封闭行为。

`composition`: `null`.

## 结果 Schema

```json
{
  "additionalProperties": false,
  "properties": {
    "approval": {
      "minLength": 1,
      "type": "string"
    },
    "capability": {
      "const": "debug.acpSkillRun.reapplyResult"
    },
    "data": {
      "additionalProperties": true,
      "description": "Result data owned by debug.acpSkillRun.reapplyResult.",
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

### input: shape-only

--input 的最小 JSON 形状。

```console
zotero-bridge debug acp-skill-run reapply-result --input '{"add":["topic:example"],"itemRef":{"key":"ABC123","libraryId":1},"operation":"item.updateTags","operationId":"caller-operation-id","remove":[]}'
```

前置条件：

- 在执行前，将示例标识符和值替换为对所选 Zotero 库、workflow、provider 或 capability 有效的输入。

## 完整命令描述符

此封闭描述符是由 `surface describe` 返回的机器可读命令契约；将其放在这里，以便本卡片可在不加载其他命令参考的情况下独立审计。

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
      "help": "Debug capability input as inline JSON, a file path, @file, or '-' for stdin",
      "id": "input",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--input",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "argv": [
    "debug",
    "acp-skill-run",
    "reapply-result"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "input",
      "required": false,
      "takesValue": true,
      "token": "--input",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "binding": "passthrough",
  "category": "maintenance",
  "command": "debug acp-skill-run reapply-result",
  "composition": null,
  "danger": "review",
  "effects": [
    {
      "description": "May change debug repair state.",
      "kind": "debug-repair",
      "stateChanged": true
    }
  ],
  "handleTransitions": [],
  "hiddenFromIntentSearch": true,
  "inputSchemas": {
    "input": {
      "examples": [
        {
          "description": "Minimal JSON shape for --input.",
          "kind": "shape-only",
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "value": {
            "add": [
              "topic:example"
            ],
            "itemRef": {
              "key": "ABC123",
              "libraryId": 1
            },
            "operation": "item.updateTags",
            "operationId": "caller-operation-id",
            "remove": []
          }
        }
      ],
      "required": false,
      "requiredWhen": [],
      "schema": {
        "additionalProperties": true,
        "type": "object",
        "x-openPropertiesReason": "The selected domain service owns this capability input vocabulary; the capability boundary still requires a JSON object."
      },
      "schemaSource": "target-capability",
      "token": "--input"
    }
  },
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "input": {
        "description": "Debug capability input as inline JSON, a file path, @file, or '-' for stdin",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "operationalAliases": [
    "debug acp-skill-run reapply-result",
    "debug",
    "acp-skill-run",
    "reapply-result",
    "input",
    "JSON_OR_FILE"
  ],
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": true,
    "type": "object",
    "x-openPropertiesReason": "The selected domain service owns this capability input vocabulary; the capability boundary still requires a JSON object."
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
    "additionalProperties": false,
    "properties": {
      "approval": {
        "minLength": 1,
        "type": "string"
      },
      "capability": {
        "const": "debug.acpSkillRun.reapplyResult"
      },
      "data": {
        "additionalProperties": true,
        "description": "Result data owned by debug.acpSkillRun.reapplyResult.",
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
  "summary": "Re-run applyResult for one existing ACP skill run result",
  "targets": [
    {
      "kind": "capability",
      "target": "debug.acpSkillRun.reapplyResult"
    }
  ]
}
```

## 参数失败与恢复契约

参数失败以单一 JSON 错误信封返回。先检查 `error.code`，然后要求 `error.details.schema` 为 `host-bridge.argument-error.v1`，再使用结构化边界字段。保留规范命令、已脱敏输入以及任何已返回的类型化 handle；切勿在证据中包含完整的原始 payload。

- `argv` 报告缺失、未知、冲突或无效的 CLI 参数。从本卡片的参数表或活动命令帮助重建 argv。
- `json_source` 报告无法读取的 stdin 或文件源。请修正此源，而不要将值移动到其他绑定。
- `json_syntax` 报告无效的 JSON，并提供安全的行列上下文。在解读域字段之前先修复语法。
- `command_input` 报告结构化输入的 schema 违规。检查受限的 `violations`，然后用 `--schema` 运行此精确叶子并修正声明的字段或类型；不要发明别名。
- `payload_contract` 表示 CLI 组合的 capability payload 在网络 I/O 之前违反了可执行契约。将其视为实现缺陷；不要用原始传输绕过语义命令。
- `command_result` 表示 Host 响应或本地结果未通过其可执行结果 schema。不要将其接受或报告为成功证据。
- 违规数组已脱敏、按确定性顺序排序，并最多八个。当 `truncated` 为 true 时，请修正已报告的违规并重新验证，而不是请求机密或完整 payload 披露。

## 操作契约

- 规范 argv 路径：`debug` `acp-skill-run` `reapply-result`.
- 输出边界：`fixed`; 受治理细节：{"strategy":"fixed"}.
- 分页：`none`.
- 类别：`maintenance`; 危险：`review`.
- 结构化绑定模式：`passthrough`.
- 意图可见性：`hidden`.
- 操作别名：`debug acp-skill-run reapply-result`, `debug`, `acp-skill-run`, `reapply-result`, `input`, `JSON_OR_FILE`.

### Effects

```json
[
  {
    "description": "May change debug repair state.",
    "kind": "debug-repair",
    "stateChanged": true
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
    "action": "Inspect stateChange and handleConsumption before repeating the operation.",
    "nextCommand": "surface describe",
    "requiresHandles": [],
    "stateCheck": "none",
    "when": "The operation fails or completion is uncertain."
  }
]
```

### Targets

```json
[
  {
    "kind": "capability",
    "target": "debug.acpSkillRun.reapplyResult"
  }
]
```
