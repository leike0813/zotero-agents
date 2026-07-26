# `zotero-bridge workflow agent-result validate`

依据 output contract 校验本地 agent result 目录

## 用法

```console
zotero-bridge workflow agent-result validate [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --contract <FILE> --result <DIR_OR_ZIP>
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
| --contract | contract | option | yes | — | FILE | no | — | — | Authoritative output-contract JSON file |
| --result | result | option | yes | — | DIR_OR_ZIP | no | — | — | Agent result directory or ZIP |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "contract": {
      "type": "string",
      "description": "Authoritative output-contract JSON file"
    },
    "result": {
      "type": "string",
      "description": "Agent result directory or ZIP"
    }
  },
  "required": [
    "contract",
    "result"
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
    "contract": {
      "type": "string",
      "description": "Authoritative output-contract JSON file"
    },
    "result": {
      "type": "string",
      "description": "Agent result directory or ZIP"
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
  "command": "workflow agent-result validate",
  "argv": [
    "workflow",
    "agent-result",
    "validate"
  ],
  "summary": "Validate a local agent result directory against an output contract",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "contract": {
        "type": "string",
        "description": "Authoritative output-contract JSON file"
      },
      "result": {
        "type": "string",
        "description": "Agent result directory or ZIP"
      }
    },
    "required": [
      "contract",
      "result"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "contract",
      "kind": "option",
      "token": "--contract",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Authoritative output-contract JSON file",
      "valueNames": [
        "FILE"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "result",
      "kind": "option",
      "token": "--result",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Agent result directory or ZIP",
      "valueNames": [
        "DIR_OR_ZIP"
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
      "property": "contract",
      "kind": "option",
      "token": "--contract",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "FILE"
      ]
    },
    {
      "property": "result",
      "kind": "option",
      "token": "--result",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "DIR_OR_ZIP"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "contract": {
        "type": "string",
        "description": "Authoritative output-contract JSON file"
      },
      "result": {
        "type": "string",
        "description": "Agent result directory or ZIP"
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
      }
    },
    "additionalProperties": true,
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
  },
  "outputBoundary": {
    "strategy": "fixed"
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
      "action": "Inspect the error and retry only when retryable is true.",
      "nextCommand": "surface describe"
    }
  ],
  "targets": [
    {
      "kind": "service",
      "target": "embedded host-bridge.agent-surface.v5"
    }
  ],
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
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `workflow` `agent-result` `validate`.
- 输出边界： `fixed`; governed details: {"strategy":"fixed"}.
- 分页： `none`.
- 类别： `read`; danger: `none`.
- 意图可见性： `visible`.
- 操作别名： `workflow agent-result validate`, `workflow`, `agent-result`, `validate`, `contract`, `FILE`, `result`, `DIR_OR_ZIP`.
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
    "kind": "service",
    "target": "embedded host-bridge.agent-surface.v5"
  }
]
```
