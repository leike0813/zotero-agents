# `zotero-bridge mutation note create`

在一个 Zotero item 下创建子 note

## 用法

```console
zotero-bridge mutation note create [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --item <ITEM> --input <JSON_OR_FILE>
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
| --item | item | option | yes | — | ITEM | no | — | — | Parent Zotero item ref |
| --input | input | option | yes | — | JSON_OR_FILE | no | — | — | Note payload JSON object |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "item": {
      "type": "string",
      "description": "Parent Zotero item ref"
    },
    "input": {
      "type": "string",
      "description": "Note payload JSON object"
    }
  },
  "required": [
    "item",
    "input"
  ],
  "additionalProperties": false
}
```

## 结构化输入 schema

### `--input` (input)

必填： `true`.

```json
{
  "type": "object",
  "properties": {
    "item": {
      "type": "string",
      "description": "Parent Zotero item ref"
    },
    "input": {
      "type": "string",
      "description": "Note payload JSON object"
    }
  },
  "required": [],
  "additionalProperties": false
}
```

## 合成 payload schema

```json
{
  "type": "object",
  "properties": {
    "item": {
      "type": "string",
      "description": "Parent Zotero item ref"
    },
    "input": {
      "type": "string",
      "description": "Note payload JSON object"
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
      "description": "Result data owned by mutation.execute.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed."
    }
  },
  "additionalProperties": false
}
```

## 示例

### input: shape-only

最小 JSON 结构： --input.

```console
zotero-bridge mutation note create --input '{}'
```

前置条件：

- 执行前，请将示例标识符和值替换为对所选 Zotero 文献库、workflow、provider 或 capability 有效的输入。

## 完整命令 descriptor

此封闭 descriptor 是 `surface describe` 返回的机器可读命令契约；将其收录于此，使本命令卡无需加载其他命令参考即可独立审计。

```json
{
  "command": "mutation note create",
  "argv": [
    "mutation",
    "note",
    "create"
  ],
  "summary": "Create a child note under one Zotero item",
  "category": "write",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "item": {
        "type": "string",
        "description": "Parent Zotero item ref"
      },
      "input": {
        "type": "string",
        "description": "Note payload JSON object"
      }
    },
    "required": [
      "item",
      "input"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "item",
      "kind": "option",
      "token": "--item",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Parent Zotero item ref",
      "valueNames": [
        "ITEM"
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
      "required": true,
      "global": false,
      "help": "Note payload JSON object",
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
      "property": "item",
      "kind": "option",
      "token": "--item",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "ITEM"
      ]
    },
    {
      "property": "input",
      "kind": "option",
      "token": "--input",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "inputSchemas": {
    "input": {
      "token": "--input",
      "required": true,
      "requiredWhen": [],
      "schema": {
        "type": "object",
        "properties": {
          "item": {
            "type": "string",
            "description": "Parent Zotero item ref"
          },
          "input": {
            "type": "string",
            "description": "Note payload JSON object"
          }
        },
        "required": [],
        "additionalProperties": false
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
      "item": {
        "type": "string",
        "description": "Parent Zotero item ref"
      },
      "input": {
        "type": "string",
        "description": "Note payload JSON object"
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
        "description": "Result data owned by mutation.execute.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed."
      }
    },
    "additionalProperties": false
  },
  "pagination": "none",
  "effects": [
    {
      "kind": "zotero-library",
      "stateChanged": true,
      "description": "May change zotero library state."
    }
  ],
  "approvalContract": {
    "kind": "zotero-ui-required",
    "timing": "before-command",
    "scope": "Zotero UI approval for the described Zotero-managed effect."
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
      "kind": "capability",
      "target": "mutation.execute"
    }
  ],
  "operationalAliases": [
    "mutation note create",
    "mutation",
    "note",
    "create",
    "item",
    "ITEM",
    "input",
    "JSON_OR_FILE"
  ],
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `mutation` `note` `create`.
- 分页： `none`.
- 类别： `write`; 危险级别： `review`.
- Intent 可见性： `visible`.
- 操作别名： `mutation note create`, `mutation`, `note`, `create`, `item`, `ITEM`, `input`, `JSON_OR_FILE`.

### Effects

```json
[
  {
    "kind": "zotero-library",
    "stateChanged": true,
    "description": "May change zotero library state."
  }
]
```

### Approval

```json
{
  "kind": "zotero-ui-required",
  "timing": "before-command",
  "scope": "Zotero UI approval for the described Zotero-managed effect."
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
    "kind": "capability",
    "target": "mutation.execute"
  }
]
```
