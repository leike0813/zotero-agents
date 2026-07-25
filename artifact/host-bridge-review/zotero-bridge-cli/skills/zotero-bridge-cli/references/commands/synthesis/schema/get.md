# `zotero-bridge synthesis schema get`

读取 Synthesis Layer schema 元数据

## 用法

```console
zotero-bridge synthesis schema get [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--query <JSON_OR_FILE>]
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
| --query | query | option | no | — | JSON_OR_FILE | no | — | — | Read query. Use inline JSON by default, such as '{"cursor":1}'. Use a file path containing JSON, @file syntax, or '-' for stdin only when that input source is intentional. Omit for {}. |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Read query as inline JSON, a file path, @file, or '-' for stdin"
    }
  },
  "required": [],
  "additionalProperties": false
}
```

## 结构化输入 schema

### `--query` (query)

必填： `false`.

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Read query as inline JSON, a file path, @file, or '-' for stdin"
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
    "query": {
      "type": "string",
      "description": "Read query as inline JSON, a file path, @file, or '-' for stdin"
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
      "description": "Result data owned by schemas.get.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed."
    }
  },
  "additionalProperties": false
}
```

## 示例

### query: shape-only

最小 JSON 结构： --query.

```console
zotero-bridge synthesis schema get --query '{}'
```

前置条件：

- 执行前，请将示例标识符和值替换为对所选 Zotero 文献库、workflow、provider 或 capability 有效的输入。

## 完整命令 descriptor

此封闭 descriptor 是 `surface describe` 返回的机器可读命令契约；将其收录于此，使本命令卡无需加载其他命令参考即可独立审计。

```json
{
  "command": "synthesis schema get",
  "argv": [
    "synthesis",
    "schema",
    "get"
  ],
  "summary": "Read Synthesis Layer schema metadata",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Read query as inline JSON, a file path, @file, or '-' for stdin"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "query",
      "kind": "option",
      "token": "--query",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Read query as inline JSON, a file path, @file, or '-' for stdin",
      "longHelp": "Read query. Use inline JSON by default, such as '{\"cursor\":1}'. Use a file path containing JSON, @file syntax, or '-' for stdin only when that input source is intentional. Omit for {}.",
      "valueNames": [
        "JSON_OR_FILE"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [
        "input"
      ],
      "defaultValues": []
    }
  ],
  "argvBindings": [
    {
      "property": "query",
      "kind": "option",
      "token": "--query",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "inputSchemas": {
    "query": {
      "token": "--query",
      "required": false,
      "requiredWhen": [],
      "schema": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "Read query as inline JSON, a file path, @file, or '-' for stdin"
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
          "description": "Minimal JSON shape for --query."
        }
      ]
    }
  },
  "payloadSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Read query as inline JSON, a file path, @file, or '-' for stdin"
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
        "description": "Result data owned by schemas.get.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed."
      }
    },
    "additionalProperties": false
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
      "kind": "capability",
      "target": "schemas.get"
    }
  ],
  "operationalAliases": [
    "synthesis schema get",
    "synthesis",
    "schema",
    "get",
    "query",
    "JSON_OR_FILE"
  ],
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `synthesis` `schema` `get`.
- 分页： `none`.
- 类别： `read`; 危险级别： `none`.
- Intent 可见性： `visible`.
- 操作别名： `synthesis schema get`, `synthesis`, `schema`, `get`, `query`, `JSON_OR_FILE`.

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
    "kind": "capability",
    "target": "schemas.get"
  }
]
```
