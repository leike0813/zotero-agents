# `zotero-bridge call`

执行高级诊断用的原始 capability 调用

## 用法

```console
zotero-bridge call [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] CAPABILITY <CAPABILITY> [--input <JSON_OR_FILE>]
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
| CAPABILITY | capability | positional | yes | — | CAPABILITY | no | — | — | Capability name, for example library.get_item_detail |
| --input | input | option | no | — | JSON_OR_FILE | no | — | — | Capability input. Use inline JSON such as '{"key":"ABC"}', a file path containing JSON, @file syntax, or '-' to read JSON from stdin. Omit for {}. |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "capability": {
      "type": "string",
      "description": "Capability name, for example library.get_item_detail",
      "position": 1
    },
    "input": {
      "type": "string",
      "description": "Capability input as inline JSON, a file path, @file, or '-' for stdin"
    }
  },
  "required": [
    "capability"
  ],
  "additionalProperties": false
}
```

## 结构化输入 schema

### `--input` (input)

必填： `false`.

```json
{
  "type": "object",
  "description": "The selected capability owns this input object.",
  "additionalProperties": true,
  "x-openPropertiesReason": "The capability named by the positional command argument owns its input vocabulary."
}
```

## 合成 payload schema

```json
{
  "type": "object",
  "properties": {
    "capability": {
      "type": "string",
      "description": "Capability name, for example library.get_item_detail"
    },
    "input": {
      "type": "string",
      "description": "Capability input as inline JSON, a file path, @file, or '-' for stdin"
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
      "description": "Response object returned by POST /bridge/v1/call.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
    }
  },
  "additionalProperties": true,
  "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
}
```

## 示例

### input: shape-only

最小 JSON 结构： --input.

```console
zotero-bridge call --input '{}'
```

前置条件：

- 执行前，请将示例标识符和值替换为对所选 Zotero 文献库、workflow、provider 或 capability 有效的输入。

## 完整命令 descriptor

此封闭 descriptor 是 `surface describe` 返回的机器可读命令契约；将其收录于此，使本命令卡无需加载其他命令参考即可独立审计。

```json
{
  "command": "call",
  "argv": [
    "call"
  ],
  "summary": "Advanced diagnostic raw capability call",
  "category": "debug",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "capability": {
        "type": "string",
        "description": "Capability name, for example library.get_item_detail",
        "position": 1
      },
      "input": {
        "type": "string",
        "description": "Capability input as inline JSON, a file path, @file, or '-' for stdin"
      }
    },
    "required": [
      "capability"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "capability",
      "kind": "positional",
      "token": "CAPABILITY",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Capability name, for example library.get_item_detail",
      "valueNames": [
        "CAPABILITY"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "input",
      "kind": "option",
      "token": "--input",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Capability input as inline JSON, a file path, @file, or '-' for stdin",
      "longHelp": "Capability input. Use inline JSON such as '{\"key\":\"ABC\"}', a file path containing JSON, @file syntax, or '-' to read JSON from stdin. Omit for {}.",
      "valueNames": [
        "JSON_OR_FILE"
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
      "property": "capability",
      "kind": "positional",
      "token": "CAPABILITY",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "CAPABILITY"
      ]
    },
    {
      "property": "input",
      "kind": "option",
      "token": "--input",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "inputSchemas": {
    "input": {
      "token": "--input",
      "required": false,
      "requiredWhen": [],
      "schema": {
        "type": "object",
        "description": "The selected capability owns this input object.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The capability named by the positional command argument owns its input vocabulary."
      },
      "examples": [
        {
          "kind": "shape-only",
          "value": {},
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "description": "Minimal JSON shape for --input."
        }
      ]
    }
  },
  "payloadSchema": {
    "type": "object",
    "properties": {
      "capability": {
        "type": "string",
        "description": "Capability name, for example library.get_item_detail"
      },
      "input": {
        "type": "string",
        "description": "Capability input as inline JSON, a file path, @file, or '-' for stdin"
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
        "description": "Response object returned by POST /bridge/v1/call.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
      }
    },
    "additionalProperties": true,
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
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
      "when": "The operation fails or completion is uncertain.",
      "stateCheck": "none",
      "requiresHandles": [],
      "action": "Inspect stateChange and handleConsumption before repeating the operation.",
      "nextCommand": "surface describe"
    }
  ],
  "targets": [
    {
      "kind": "service",
      "target": "POST /bridge/v1/call"
    }
  ],
  "operationalAliases": [
    "call",
    "capability",
    "CAPABILITY",
    "input",
    "JSON_OR_FILE"
  ],
  "hiddenFromIntentSearch": true
}
```

## 操作契约

- 规范 argv 路径： `call`.
- 分页： `none`.
- 类别： `debug`; 危险级别： `none`.
- Intent 可见性： `hidden`.
- 操作别名： `call`, `capability`, `CAPABILITY`, `input`, `JSON_OR_FILE`.

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
    "kind": "service",
    "target": "POST /bridge/v1/call"
  }
]
```
