# `zotero-bridge product download`

下载一个或全部 Dashboard Product asset

## 用法

```console
zotero-bridge product download [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] PRODUCT_ID <PRODUCT_ID> [--asset <ASSET>] --output-dir <DIR> [--force]
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
| PRODUCT_ID | product_id | positional | yes | — | PRODUCT_ID | no | — | — | Dashboard Product id |
| --asset | asset | option | no | — | ASSET | no | — | — | Optional asset id; omit to download all assets |
| --output-dir | output_dir | option | yes | — | DIR | no | — | — | Destination directory |
| --force | force | option | no | — | FORCE; values: true, false | no | — | — | Allow existing output files to be replaced |

## 调用 schema

```json
{
  "type": "object",
  "properties": {
    "product_id": {
      "type": "string",
      "description": "Dashboard Product id",
      "position": 1
    },
    "asset": {
      "type": "string",
      "description": "Optional asset id; omit to download all assets"
    },
    "output-dir": {
      "type": "string",
      "description": "Destination directory"
    },
    "force": {
      "type": "boolean",
      "description": "Allow existing output files to be replaced"
    }
  },
  "required": [
    "product_id",
    "output-dir"
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
    "productId": {
      "type": "string"
    },
    "assetId": {
      "type": "string"
    },
    "outputDir": {
      "type": "string"
    },
    "overwrite": {
      "type": "boolean"
    }
  },
  "required": [
    "productId"
  ],
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
      "description": "Result data owned by workflow_products.export.",
      "properties": {
        "fileId": {
          "type": "string"
        },
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
  "command": "product download",
  "argv": [
    "product",
    "download"
  ],
  "summary": "Download one or all Dashboard Product assets",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "product_id": {
        "type": "string",
        "description": "Dashboard Product id",
        "position": 1
      },
      "asset": {
        "type": "string",
        "description": "Optional asset id; omit to download all assets"
      },
      "output-dir": {
        "type": "string",
        "description": "Destination directory"
      },
      "force": {
        "type": "boolean",
        "description": "Allow existing output files to be replaced"
      }
    },
    "required": [
      "product_id",
      "output-dir"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "product_id",
      "kind": "positional",
      "token": "PRODUCT_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Dashboard Product id",
      "valueNames": [
        "PRODUCT_ID"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "asset",
      "kind": "option",
      "token": "--asset",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Optional asset id; omit to download all assets",
      "valueNames": [
        "ASSET"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "output_dir",
      "kind": "option",
      "token": "--output-dir",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Destination directory",
      "valueNames": [
        "DIR"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [
        "output"
      ],
      "defaultValues": []
    },
    {
      "id": "force",
      "kind": "option",
      "token": "--force",
      "takesValue": false,
      "required": false,
      "global": false,
      "help": "Allow existing output files to be replaced",
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
      "property": "product_id",
      "kind": "positional",
      "token": "PRODUCT_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "PRODUCT_ID"
      ]
    },
    {
      "property": "asset",
      "kind": "option",
      "token": "--asset",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "ASSET"
      ]
    },
    {
      "property": "output-dir",
      "kind": "option",
      "token": "--output-dir",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "DIR"
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
      "productId": {
        "type": "string"
      },
      "assetId": {
        "type": "string"
      },
      "outputDir": {
        "type": "string"
      },
      "overwrite": {
        "type": "boolean"
      }
    },
    "required": [
      "productId"
    ],
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
        "description": "Result data owned by workflow_products.export.",
        "properties": {
          "fileId": {
            "type": "string"
          },
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
      "handle": "productId",
      "direction": "consume",
      "required": true,
      "condition": "Required by the command invocation.",
      "lifetime": "caller-owned"
    },
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
      "when": "The read fails or returns incomplete evidence.",
      "stateCheck": "command-result",
      "requiresHandles": [],
      "action": "Inspect the error and retry only when retryable is true.",
      "nextCommand": "surface describe"
    }
  ],
  "targets": [
    {
      "kind": "capability",
      "target": "workflow_products.export"
    }
  ],
  "operationalAliases": [
    "product download",
    "product",
    "download",
    "product_id",
    "PRODUCT_ID",
    "asset",
    "ASSET",
    "output_dir",
    "output-dir",
    "DIR",
    "force",
    "FORCE"
  ],
  "hiddenFromIntentSearch": false
}
```

## 操作契约

- 规范 argv 路径： `product` `download`.
- 输出边界： `fixed`; governed details: {"strategy":"fixed"}.
- 分页： `none`.
- 类别： `read`; danger: `none`.
- 意图可见性： `visible`.
- 操作别名： `product download`, `product`, `download`, `product_id`, `PRODUCT_ID`, `asset`, `ASSET`, `output_dir`, `output-dir`, `DIR`, `force`, `FORCE`.
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
    "handle": "productId",
    "direction": "consume",
    "required": true,
    "condition": "Required by the command invocation.",
    "lifetime": "caller-owned"
  },
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
    "when": "The read fails or returns incomplete evidence.",
    "stateCheck": "command-result",
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
    "target": "workflow_products.export"
  }
]
```
