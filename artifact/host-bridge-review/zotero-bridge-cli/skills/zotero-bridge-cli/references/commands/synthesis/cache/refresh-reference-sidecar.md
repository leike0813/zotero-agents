# `zotero-bridge synthesis cache refresh-reference-sidecar`

启动 reference sidecar 刷新

## 用法

```console
zotero-bridge synthesis cache refresh-reference-sidecar [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--input <JSON_OR_FILE>]
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
| --input | input | option | no | — | JSON_OR_FILE | no | — | — | Zotero capability input. Use inline JSON, a file path containing JSON, @file syntax, or '-' to read JSON from stdin. Omit for {}. |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "string",
      "description": "Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"
    }
  },
  "required": [],
  "additionalProperties": false
}
```

## 结构化输入 schema

### `--input` (input)

必填： `false`.

```json
{
  "type": "object",
  "properties": {
    "scope": {
      "type": "string",
      "enum": [
        "library",
        "papers"
      ]
    },
    "library_id": {
      "type": [
        "number",
        "string"
      ]
    },
    "libraryId": {
      "type": [
        "number",
        "string"
      ]
    },
    "paper_refs": {
      "type": "array"
    },
    "paperRefs": {
      "type": "array"
    },
    "idempotency_key": {
      "type": "string"
    },
    "idempotencyKey": {
      "type": "string"
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
    "scope": {
      "type": "string",
      "enum": [
        "library",
        "papers"
      ]
    },
    "library_id": {
      "type": [
        "number",
        "string"
      ]
    },
    "libraryId": {
      "type": [
        "number",
        "string"
      ]
    },
    "paper_refs": {
      "type": "array"
    },
    "paperRefs": {
      "type": "array"
    },
    "idempotency_key": {
      "type": "string"
    },
    "idempotencyKey": {
      "type": "string"
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
      "description": "Result data owned by reference_sidecar.refresh.",
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
zotero-bridge synthesis cache refresh-reference-sidecar --input '{}'
```

前置条件：

- 执行前，请将示例标识符和值替换为对所选 Zotero 文献库、workflow、provider 或 capability 有效的输入。

## 完整命令 descriptor

此封闭 descriptor 是 `surface describe` 返回的机器可读命令契约；将其收录于此，使本命令卡无需加载其他命令参考即可独立审计。

```json
{
  "command": "synthesis cache refresh-reference-sidecar",
  "argv": [
    "synthesis",
    "cache",
    "refresh-reference-sidecar"
  ],
  "summary": "Start a reference-sidecar refresh",
  "category": "maintenance",
  "danger": "high",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "input": {
        "type": "string",
        "description": "Zotero capability input as inline JSON, a file path, @file, or '-' for stdin"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "input",
      "kind": "option",
      "token": "--input",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Zotero capability input as inline JSON, a file path, @file, or '-' for stdin",
      "longHelp": "Zotero capability input. Use inline JSON, a file path containing JSON, @file syntax, or '-' to read JSON from stdin. Omit for {}.",
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
        "properties": {
          "scope": {
            "type": "string",
            "enum": [
              "library",
              "papers"
            ]
          },
          "library_id": {
            "type": [
              "number",
              "string"
            ]
          },
          "libraryId": {
            "type": [
              "number",
              "string"
            ]
          },
          "paper_refs": {
            "type": "array"
          },
          "paperRefs": {
            "type": "array"
          },
          "idempotency_key": {
            "type": "string"
          },
          "idempotencyKey": {
            "type": "string"
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
      "scope": {
        "type": "string",
        "enum": [
          "library",
          "papers"
        ]
      },
      "library_id": {
        "type": [
          "number",
          "string"
        ]
      },
      "libraryId": {
        "type": [
          "number",
          "string"
        ]
      },
      "paper_refs": {
        "type": "array"
      },
      "paperRefs": {
        "type": "array"
      },
      "idempotency_key": {
        "type": "string"
      },
      "idempotencyKey": {
        "type": "string"
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
        "description": "Result data owned by reference_sidecar.refresh.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed."
      }
    },
    "additionalProperties": false
  },
  "pagination": "none",
  "effects": [
    {
      "kind": "cache-maintenance",
      "stateChanged": true,
      "description": "May change cache maintenance state."
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
      "target": "reference_sidecar.refresh"
    }
  ],
  "operationalAliases": [
    "synthesis cache refresh-reference-sidecar",
    "synthesis",
    "cache",
    "refresh-reference-sidecar",
    "input",
    "JSON_OR_FILE"
  ],
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `synthesis` `cache` `refresh-reference-sidecar`.
- 分页： `none`.
- 类别： `maintenance`; 危险级别： `high`.
- Intent 可见性： `visible`.
- 操作别名： `synthesis cache refresh-reference-sidecar`, `synthesis`, `cache`, `refresh-reference-sidecar`, `input`, `JSON_OR_FILE`.

### Effects

```json
[
  {
    "kind": "cache-maintenance",
    "stateChanged": true,
    "description": "May change cache maintenance state."
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
    "target": "reference_sidecar.refresh"
  }
]
```
