# `zotero-bridge file upload`

通过 Zotero Bridge 上传一个本地文件并返回短期 file handle

## 用法

```console
zotero-bridge file upload [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] PATH <PATH> [--display-name <DISPLAY_NAME>] [--content-type <CONTENT_TYPE>]
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
| PATH | path | positional | yes | — | PATH | no | — | — | Local file path to upload |
| --display-name | display_name | option | no | — | DISPLAY_NAME | no | — | — | Display name stored in the Zotero-side file descriptor |
| --content-type | content_type | option | no | — | CONTENT_TYPE | no | — | — | Content type for the uploaded file |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "description": "Local file path to upload",
      "position": 1
    },
    "display-name": {
      "type": "string",
      "description": "Display name stored in the Zotero-side file descriptor"
    },
    "content-type": {
      "type": "string",
      "description": "Content type for the uploaded file"
    }
  },
  "required": [
    "path"
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
    "path": {
      "type": "string",
      "description": "Local file path to upload"
    },
    "display_name": {
      "type": "string",
      "description": "Display name stored in the Zotero-side file descriptor"
    },
    "content_type": {
      "type": "string",
      "description": "Content type for the uploaded file"
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
    "fileId": {
      "type": "string"
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
  "command": "file upload",
  "argv": [
    "file",
    "upload"
  ],
  "summary": "Upload one local file through Zotero Bridge and return a short-lived file handle",
  "category": "write",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Local file path to upload",
        "position": 1
      },
      "display-name": {
        "type": "string",
        "description": "Display name stored in the Zotero-side file descriptor"
      },
      "content-type": {
        "type": "string",
        "description": "Content type for the uploaded file"
      }
    },
    "required": [
      "path"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "path",
      "kind": "positional",
      "token": "PATH",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Local file path to upload",
      "valueNames": [
        "PATH"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "display_name",
      "kind": "option",
      "token": "--display-name",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Display name stored in the Zotero-side file descriptor",
      "valueNames": [
        "DISPLAY_NAME"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "content_type",
      "kind": "option",
      "token": "--content-type",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Content type for the uploaded file",
      "valueNames": [
        "CONTENT_TYPE"
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
      "property": "path",
      "kind": "positional",
      "token": "PATH",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "PATH"
      ]
    },
    {
      "property": "display-name",
      "kind": "option",
      "token": "--display-name",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "DISPLAY_NAME"
      ]
    },
    {
      "property": "content-type",
      "kind": "option",
      "token": "--content-type",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "CONTENT_TYPE"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Local file path to upload"
      },
      "display_name": {
        "type": "string",
        "description": "Display name stored in the Zotero-side file descriptor"
      },
      "content_type": {
        "type": "string",
        "description": "Content type for the uploaded file"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "fileId": {
        "type": "string"
      }
    },
    "additionalProperties": true,
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
  },
  "pagination": "none",
  "effects": [
    {
      "kind": "ephemeral-file",
      "stateChanged": true,
      "description": "May change ephemeral file state."
    }
  ],
  "approvalContract": {
    "kind": "none",
    "timing": "none",
    "scope": "No Zotero UI approval; provider runtimes may still request their own permission."
  },
  "handleTransitions": [
    {
      "handle": "fileId",
      "direction": "produce",
      "required": false,
      "condition": "Returned when the corresponding operation succeeds.",
      "lifetime": "short-lived"
    }
  ],
  "recovery": [
    {
      "when": "The operation fails or completion is uncertain.",
      "stateCheck": "command-result",
      "requiresHandles": [],
      "action": "Inspect stateChange and handleConsumption before repeating the operation.",
      "nextCommand": "surface describe"
    }
  ],
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v1/files/upload"
    }
  ],
  "operationalAliases": [
    "file upload",
    "file",
    "upload",
    "path",
    "PATH",
    "display_name",
    "display-name",
    "DISPLAY_NAME",
    "content_type",
    "content-type",
    "CONTENT_TYPE"
  ],
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `file` `upload`.
- 分页： `none`.
- 类别： `write`; 危险级别： `review`.
- Intent 可见性： `visible`.
- 操作别名： `file upload`, `file`, `upload`, `path`, `PATH`, `display_name`, `display-name`, `DISPLAY_NAME`, `content_type`, `content-type`, `CONTENT_TYPE`.

### Effects

```json
[
  {
    "kind": "ephemeral-file",
    "stateChanged": true,
    "description": "May change ephemeral file state."
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
  {
    "handle": "fileId",
    "direction": "produce",
    "required": false,
    "condition": "Returned when the corresponding operation succeeds.",
    "lifetime": "short-lived"
  }
]
```

### 恢复

```json
[
  {
    "when": "The operation fails or completion is uncertain.",
    "stateCheck": "command-result",
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
    "target": "POST /bridge/v1/files/upload"
  }
]
```
