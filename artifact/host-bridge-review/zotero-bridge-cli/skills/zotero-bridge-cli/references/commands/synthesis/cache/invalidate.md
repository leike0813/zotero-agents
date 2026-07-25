# `zotero-bridge synthesis cache invalidate`

使受限的 Synthesis cache scope 失效

## 用法

```console
zotero-bridge synthesis cache invalidate [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --scope <SCOPE> [--id <ID>]
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
| --scope | scope | option | yes | — | SCOPE; values: topic, graph, index | no | — | — | Cache scope |
| --id | id | option | no | — | ID | no | — | — | Optional opaque target id |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "scope": {
      "type": "string",
      "description": "Cache scope"
    },
    "id": {
      "type": "string",
      "description": "Optional opaque target id"
    }
  },
  "required": [
    "scope"
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
    "scope": {
      "type": "string",
      "description": "Cache scope"
    },
    "id": {
      "type": "string",
      "description": "Optional opaque target id"
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
      "description": "Response object returned by POST /bridge/v1/synthesis/cache/invalidate.",
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
  "command": "synthesis cache invalidate",
  "argv": [
    "synthesis",
    "cache",
    "invalidate"
  ],
  "summary": "Invalidate a constrained Synthesis cache scope",
  "category": "maintenance",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "scope": {
        "type": "string",
        "description": "Cache scope"
      },
      "id": {
        "type": "string",
        "description": "Optional opaque target id"
      }
    },
    "required": [
      "scope"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "scope",
      "kind": "option",
      "token": "--scope",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Cache scope",
      "valueNames": [
        "SCOPE"
      ],
      "possibleValues": [
        "topic",
        "graph",
        "index"
      ],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "id",
      "kind": "option",
      "token": "--id",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Optional opaque target id",
      "valueNames": [
        "ID"
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
      "property": "scope",
      "kind": "option",
      "token": "--scope",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "SCOPE"
      ]
    },
    {
      "property": "id",
      "kind": "option",
      "token": "--id",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "ID"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "scope": {
        "type": "string",
        "description": "Cache scope"
      },
      "id": {
        "type": "string",
        "description": "Optional opaque target id"
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
        "description": "Response object returned by POST /bridge/v1/synthesis/cache/invalidate.",
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
      "kind": "endpoint",
      "target": "POST /bridge/v1/synthesis/cache/invalidate"
    }
  ],
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
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `synthesis` `cache` `invalidate`.
- 输出边界： `fixed`; governed details: {"strategy":"fixed"}.
- 分页： `none`.
- 类别： `maintenance`; danger: `review`.
- 意图可见性： `visible`.
- 操作别名： `synthesis cache invalidate`, `synthesis`, `cache`, `invalidate`, `scope`, `SCOPE`, `id`, `ID`.
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
    "kind": "endpoint",
    "target": "POST /bridge/v1/synthesis/cache/invalidate"
  }
]
```
