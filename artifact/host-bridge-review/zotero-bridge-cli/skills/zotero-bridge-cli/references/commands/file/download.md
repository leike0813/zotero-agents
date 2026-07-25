# `zotero-bridge file download`

下载一个已注册的 file handle

## 用法

```console
zotero-bridge file download [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] FILE_ID <FILE_ID> --output <PATH> [--force]
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
| FILE_ID | file_id | positional | yes | — | FILE_ID | no | — | — | Broker-issued opaque file id |
| --output | output | option | yes | — | PATH | no | — | — | Output file path |
| --force | force | option | no | — | FORCE; values: true, false | no | — | — | Overwrite the output file if it already exists |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "file_id": {
      "type": "string",
      "description": "Broker-issued opaque file id",
      "position": 1
    },
    "output": {
      "type": "string",
      "description": "Output file path"
    },
    "force": {
      "type": "boolean",
      "description": "Overwrite the output file if it already exists"
    }
  },
  "required": [
    "file_id",
    "output"
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
    "file_id": {
      "type": "string",
      "description": "Broker-issued opaque file id"
    },
    "output": {
      "type": "string",
      "description": "Output file path"
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
    "file": {
      "type": "object",
      "properties": {
        "fileId": {
          "type": "string"
        },
        "path": {
          "type": "string"
        },
        "checksum": {
          "type": "string"
        },
        "bytes": {
          "type": "integer"
        }
      },
      "additionalProperties": true
    },
    "delivery": {
      "type": "object",
      "description": "Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.",
      "properties": {
        "mode": {
          "enum": [
            "local",
            "bridge-download",
            "bundle"
          ]
        },
        "path": {
          "type": "string"
        },
        "files": {
          "type": "array",
          "items": {
            "type": "object"
          }
        },
        "bundle": {
          "type": "object",
          "properties": {
            "fileId": {
              "type": "string"
            },
            "displayName": {
              "type": "string"
            },
            "contentType": {
              "type": "string"
            },
            "size": {
              "type": "integer"
            }
          },
          "additionalProperties": true
        },
        "downloadCommand": {
          "type": "string"
        },
        "unpackHint": {
          "type": "string"
        }
      },
      "additionalProperties": false
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
  "command": "file download",
  "argv": [
    "file",
    "download"
  ],
  "summary": "Download one registered file handle",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "file_id": {
        "type": "string",
        "description": "Broker-issued opaque file id",
        "position": 1
      },
      "output": {
        "type": "string",
        "description": "Output file path"
      },
      "force": {
        "type": "boolean",
        "description": "Overwrite the output file if it already exists"
      }
    },
    "required": [
      "file_id",
      "output"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "file_id",
      "kind": "positional",
      "token": "FILE_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Broker-issued opaque file id",
      "valueNames": [
        "FILE_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "output",
      "kind": "option",
      "token": "--output",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Output file path",
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
      "id": "force",
      "kind": "option",
      "token": "--force",
      "takesValue": false,
      "required": false,
      "global": false,
      "help": "Overwrite the output file if it already exists",
      "valueNames": [
        "FORCE"
      ],
      "possibleValues": [
        "true",
        "false"
      ],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    }
  ],
  "argvBindings": [
    {
      "property": "file_id",
      "kind": "positional",
      "token": "FILE_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "FILE_ID"
      ]
    },
    {
      "property": "output",
      "kind": "option",
      "token": "--output",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "PATH"
      ]
    },
    {
      "property": "force",
      "kind": "option",
      "token": "--force",
      "takesValue": false,
      "required": false,
      "valueNames": [
        "FORCE"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "file_id": {
        "type": "string",
        "description": "Broker-issued opaque file id"
      },
      "output": {
        "type": "string",
        "description": "Output file path"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "file": {
        "type": "object",
        "properties": {
          "fileId": {
            "type": "string"
          },
          "path": {
            "type": "string"
          },
          "checksum": {
            "type": "string"
          },
          "bytes": {
            "type": "integer"
          }
        },
        "additionalProperties": true
      },
      "delivery": {
        "type": "object",
        "description": "Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.",
        "properties": {
          "mode": {
            "enum": [
              "local",
              "bridge-download",
              "bundle"
            ]
          },
          "path": {
            "type": "string"
          },
          "files": {
            "type": "array",
            "items": {
              "type": "object"
            }
          },
          "bundle": {
            "type": "object",
            "properties": {
              "fileId": {
                "type": "string"
              },
              "displayName": {
                "type": "string"
              },
              "contentType": {
                "type": "string"
              },
              "size": {
                "type": "integer"
              }
            },
            "additionalProperties": true
          },
          "downloadCommand": {
            "type": "string"
          },
          "unpackHint": {
            "type": "string"
          }
        },
        "additionalProperties": false
      }
    },
    "additionalProperties": true,
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
  },
  "pagination": "file",
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
  "handleTransitions": [
    {
      "handle": "fileId",
      "direction": "consume",
      "required": true,
      "condition": "Required by the command invocation.",
      "lifetime": "caller-owned"
    }
  ],
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
      "kind": "endpoint",
      "target": "GET /bridge/v1/files/{fileId}"
    }
  ],
  "operationalAliases": [
    "file download",
    "file",
    "download",
    "file_id",
    "FILE_ID",
    "output",
    "PATH",
    "force",
    "FORCE"
  ],
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `file` `download`.
- 分页： `file`.
- 类别： `read`; 危险级别： `none`.
- Intent 可见性： `visible`.
- 操作别名： `file download`, `file`, `download`, `file_id`, `FILE_ID`, `output`, `PATH`, `force`, `FORCE`.

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
  {
    "handle": "fileId",
    "direction": "consume",
    "required": true,
    "condition": "Required by the command invocation.",
    "lifetime": "caller-owned"
  }
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
    "kind": "endpoint",
    "target": "GET /bridge/v1/files/{fileId}"
  }
]
```
