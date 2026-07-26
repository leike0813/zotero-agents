# `zotero-bridge mutation collection add-items`

把 Zotero item 添加到 collection

## 用法

```console
zotero-bridge mutation collection add-items [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --collection <COLLECTION> --items <ITEMS>
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
| --collection | collection | option | yes | — | COLLECTION | no | — | — | Zotero collection ref |
| --items | items | option | yes | — | ITEMS | yes | — | — | Target Zotero item refs |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "collection": {
      "type": "string",
      "description": "Zotero collection ref"
    },
    "items": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Target Zotero item refs"
    }
  },
  "required": [
    "collection",
    "items"
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
    "collection": {
      "type": "string",
      "description": "Zotero collection ref"
    },
    "items": {
      "type": "string",
      "description": "Target Zotero item refs"
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

此命令没有适用的结构化输入示例。请根据参数表构造 argv，并在执行前通过 `surface describe` 确认命令。

## 完整命令 descriptor

此封闭 descriptor 是 `surface describe` 返回的机器可读命令契约；将其收录于此，使本命令卡无需加载其他命令参考即可独立审计。

```json
{
  "command": "mutation collection add-items",
  "argv": [
    "mutation",
    "collection",
    "add-items"
  ],
  "summary": "Add Zotero items to a collection",
  "category": "write",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "collection": {
        "type": "string",
        "description": "Zotero collection ref"
      },
      "items": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "Target Zotero item refs"
      }
    },
    "required": [
      "collection",
      "items"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "collection",
      "kind": "option",
      "token": "--collection",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Zotero collection ref",
      "valueNames": [
        "COLLECTION"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "items",
      "kind": "option",
      "token": "--items",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Target Zotero item refs",
      "valueNames": [
        "ITEMS"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": true,
      "aliases": [],
      "defaultValues": []
    }
  ],
  "argvBindings": [
    {
      "property": "collection",
      "kind": "option",
      "token": "--collection",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "COLLECTION"
      ]
    },
    {
      "property": "items",
      "kind": "option",
      "token": "--items",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "ITEMS"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "collection": {
        "type": "string",
        "description": "Zotero collection ref"
      },
      "items": {
        "type": "string",
        "description": "Target Zotero item refs"
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
  "outputBoundary": {
    "strategy": "fixed"
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
    "mutation collection add-items",
    "mutation",
    "collection",
    "add-items",
    "COLLECTION",
    "items",
    "ITEMS"
  ],
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `mutation` `collection` `add-items`.
- 输出边界： `fixed`; governed details: {"strategy":"fixed"}.
- 分页： `none`.
- 类别： `write`; danger: `review`.
- 意图可见性： `visible`.
- 操作别名： `mutation collection add-items`, `mutation`, `collection`, `add-items`, `COLLECTION`, `items`, `ITEMS`.
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
