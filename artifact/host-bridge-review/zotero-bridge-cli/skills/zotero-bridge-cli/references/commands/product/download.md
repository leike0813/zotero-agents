# `zotero-bridge product download`

Download one or all Dashboard Product assets

## 用法

```console
zotero-bridge product download [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] PRODUCT_ID <PRODUCT_ID> [--asset <ASSET>] --output-dir <DIR> [--force]
```

全局选项可位于叶命令之前或之后。 此叶命令没有结构化 JSON 输入。`--schema` 会返回 `command_input_schema_unavailable`；请使用命令 help 或 `surface describe` 检查调用合同。

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
  "additionalProperties": false,
  "properties": {
    "asset": {
      "description": "Optional asset id; omit to download all assets",
      "type": "string"
    },
    "force": {
      "description": "Allow existing output files to be replaced",
      "type": "boolean"
    },
    "output-dir": {
      "description": "Destination directory",
      "type": "string"
    },
    "product_id": {
      "description": "Dashboard Product id",
      "position": 1,
      "type": "string"
    }
  },
  "required": [
    "product_id",
    "output-dir"
  ],
  "type": "object"
}
```

## 结构化输入 schema

此命令没有结构化 JSON 输入参数。

## 组合 payload schema

```json
{
  "additionalProperties": false,
  "properties": {
    "assetId": {
      "type": "string"
    },
    "outputDir": {
      "type": "string"
    },
    "overwrite": {
      "type": "boolean"
    },
    "productId": {
      "type": "string"
    }
  },
  "required": [
    "productId"
  ],
  "type": "object"
}
```

## Payload 组合

以下内容由可执行命令契约定义 base source、fixed value、field mapping 与 closed transform。命令 handler 只向所引用的 Clap argument ID 提供值。

```json
{
  "constants": {},
  "mappings": [
    {
      "argument": "product_id",
      "field": "productId",
      "required": true,
      "transform": "trim-string"
    },
    {
      "argument": "asset",
      "field": "assetId",
      "required": false,
      "transform": "identity"
    },
    {
      "argument": "output_dir",
      "field": "outputDir",
      "required": true,
      "transform": "path-string"
    },
    {
      "argument": "force",
      "field": "overwrite",
      "required": true,
      "transform": "identity"
    }
  ]
}
```

## 结果 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "approval": {
      "minLength": 1,
      "type": "string"
    },
    "capability": {
      "const": "workflow_products.export"
    },
    "data": {
      "additionalProperties": true,
      "description": "Result data owned by workflow_products.export.",
      "properties": {
        "delivery": {
          "additionalProperties": false,
          "description": "Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.",
          "properties": {
            "bundle": {
              "additionalProperties": true,
              "properties": {
                "contentType": {
                  "type": "string"
                },
                "displayName": {
                  "type": "string"
                },
                "fileId": {
                  "type": "string"
                },
                "size": {
                  "type": "integer"
                }
              },
              "type": "object"
            },
            "downloadCommand": {
              "type": "string"
            },
            "files": {
              "items": {
                "type": "object"
              },
              "type": "array"
            },
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
            "unpackHint": {
              "type": "string"
            }
          },
          "type": "object"
        },
        "file": {
          "additionalProperties": true,
          "properties": {
            "bytes": {
              "type": "integer"
            },
            "checksum": {
              "type": "string"
            },
            "fileId": {
              "type": "string"
            },
            "path": {
              "type": "string"
            }
          },
          "type": "object"
        },
        "fileId": {
          "type": "string"
        }
      },
      "type": "object",
      "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed."
    }
  },
  "required": [
    "capability",
    "approval",
    "data"
  ],
  "type": "object"
}
```

## 示例

此命令没有适用的结构化输入示例。请依据参数表构造 argv，并在执行前使用 `surface describe` 确认命令。

## 完整命令 descriptor

这个闭合 descriptor 是 `surface describe` 返回的机器可读命令合同；将它完整列在此处，使本卡片无需加载其他命令引用也能独立审计。

```json
{
  "approvalContract": {
    "kind": "none",
    "scope": "No Zotero UI approval; provider runtimes may still request their own permission.",
    "timing": "none"
  },
  "arguments": [
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Dashboard Product id",
      "id": "product_id",
      "kind": "positional",
      "position": 1,
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "PRODUCT_ID",
      "valueNames": [
        "PRODUCT_ID"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Optional asset id; omit to download all assets",
      "id": "asset",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--asset",
      "valueNames": [
        "ASSET"
      ]
    },
    {
      "aliases": [
        "output"
      ],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Destination directory",
      "id": "output_dir",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "--output-dir",
      "valueNames": [
        "DIR"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Allow existing output files to be replaced",
      "id": "force",
      "kind": "option",
      "possibleValues": [
        "true",
        "false"
      ],
      "repeatable": false,
      "required": false,
      "takesValue": false,
      "token": "--force",
      "valueNames": [
        "FORCE"
      ]
    }
  ],
  "argv": [
    "product",
    "download"
  ],
  "argvBindings": [
    {
      "kind": "positional",
      "position": 1,
      "property": "product_id",
      "required": true,
      "takesValue": true,
      "token": "PRODUCT_ID",
      "valueNames": [
        "PRODUCT_ID"
      ]
    },
    {
      "kind": "option",
      "property": "asset",
      "required": false,
      "takesValue": true,
      "token": "--asset",
      "valueNames": [
        "ASSET"
      ]
    },
    {
      "kind": "option",
      "property": "output-dir",
      "required": true,
      "takesValue": true,
      "token": "--output-dir",
      "valueNames": [
        "DIR"
      ]
    },
    {
      "kind": "option",
      "property": "force",
      "required": false,
      "takesValue": false,
      "token": "--force",
      "valueNames": [
        "FORCE"
      ]
    }
  ],
  "binding": "object",
  "category": "read",
  "command": "product download",
  "composition": {
    "constants": {},
    "mappings": [
      {
        "argument": "product_id",
        "field": "productId",
        "required": true,
        "transform": "trim-string"
      },
      {
        "argument": "asset",
        "field": "assetId",
        "required": false,
        "transform": "identity"
      },
      {
        "argument": "output_dir",
        "field": "outputDir",
        "required": true,
        "transform": "path-string"
      },
      {
        "argument": "force",
        "field": "overwrite",
        "required": true,
        "transform": "identity"
      }
    ]
  },
  "danger": "none",
  "effects": [
    {
      "description": "Reads state without changing Zotero-managed data.",
      "kind": "none",
      "stateChanged": false
    }
  ],
  "handleTransitions": [
    {
      "condition": "Required by the command invocation.",
      "direction": "consume",
      "handle": "productId",
      "lifetime": "caller-owned",
      "required": true
    },
    {
      "condition": "Returned when the corresponding operation succeeds.",
      "direction": "produce",
      "handle": "fileId",
      "lifetime": "short-lived",
      "required": false
    }
  ],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {},
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "asset": {
        "description": "Optional asset id; omit to download all assets",
        "type": "string"
      },
      "force": {
        "description": "Allow existing output files to be replaced",
        "type": "boolean"
      },
      "output-dir": {
        "description": "Destination directory",
        "type": "string"
      },
      "product_id": {
        "description": "Dashboard Product id",
        "position": 1,
        "type": "string"
      }
    },
    "required": [
      "product_id",
      "output-dir"
    ],
    "type": "object"
  },
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
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "assetId": {
        "type": "string"
      },
      "outputDir": {
        "type": "string"
      },
      "overwrite": {
        "type": "boolean"
      },
      "productId": {
        "type": "string"
      }
    },
    "required": [
      "productId"
    ],
    "type": "object"
  },
  "recovery": [
    {
      "action": "Inspect the error and retry only when retryable is true.",
      "nextCommand": "surface describe",
      "requiresHandles": [],
      "stateCheck": "command-result",
      "when": "The read fails or returns incomplete evidence."
    }
  ],
  "resultSchema": {
    "additionalProperties": false,
    "properties": {
      "approval": {
        "minLength": 1,
        "type": "string"
      },
      "capability": {
        "const": "workflow_products.export"
      },
      "data": {
        "additionalProperties": true,
        "description": "Result data owned by workflow_products.export.",
        "properties": {
          "delivery": {
            "additionalProperties": false,
            "description": "Local-file or registered remote-file delivery instructions. Follow mode instead of substituting a path for a fileId.",
            "properties": {
              "bundle": {
                "additionalProperties": true,
                "properties": {
                  "contentType": {
                    "type": "string"
                  },
                  "displayName": {
                    "type": "string"
                  },
                  "fileId": {
                    "type": "string"
                  },
                  "size": {
                    "type": "integer"
                  }
                },
                "type": "object"
              },
              "downloadCommand": {
                "type": "string"
              },
              "files": {
                "items": {
                  "type": "object"
                },
                "type": "array"
              },
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
              "unpackHint": {
                "type": "string"
              }
            },
            "type": "object"
          },
          "file": {
            "additionalProperties": true,
            "properties": {
              "bytes": {
                "type": "integer"
              },
              "checksum": {
                "type": "string"
              },
              "fileId": {
                "type": "string"
              },
              "path": {
                "type": "string"
              }
            },
            "type": "object"
          },
          "fileId": {
            "type": "string"
          }
        },
        "type": "object",
        "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed."
      }
    },
    "required": [
      "capability",
      "approval",
      "data"
    ],
    "type": "object"
  },
  "summary": "Download one or all Dashboard Product assets",
  "targets": [
    {
      "kind": "capability",
      "target": "workflow_products.export"
    }
  ]
}
```

## 参数失败与恢复合同

参数失败以单个 JSON 错误 envelope 返回。先检查 `error.code`，再确认 `error.details.schema` 为 `host-bridge.argument-error.v1`，之后才能使用结构化边界字段。保留规范命令、已脱敏输入和任何已经返回的 typed handle；证据中绝不能包含完整原始 payload。

- `argv` 表示 CLI 参数缺失、未知、冲突或无效。依据本卡片的参数表或当前命令 help 重新构造 argv。
- `json_source` 表示 stdin 或文件源不可读。修正该输入源，不要把值移到另一种 binding。
- `json_syntax` 表示 JSON 无效，并提供安全的行列位置。先修复语法，再解释领域字段。
- 该叶命令没有结构化 JSON 输入，因此 `command_input` 不是预期的调用边界。使用 `surface describe` 查看其标量与位置参数合同。
- `payload_contract` 表示 CLI 组合出的 capability payload 在网络 I/O 前就违反了可执行合同。将其视为实现错误；不得用原始 transport 绕过语义命令。
- `command_result` 表示 Host 响应或本地结果未通过可执行结果 schema。不得接受它，也不得把它报告为成功证据。
- violation 数组已经脱敏、按确定顺序排列，并限制为八项。当 `truncated` 为 true 时，先修正已报告的问题并重新验证，不得要求披露 secret 或完整 payload。

## 操作合同

- 规范 argv 路径： `product` `download`.
- 输出边界： `fixed`；受管详情： {"strategy":"fixed"}.
- 分页： `none`.
- 类别： `read`；危险等级： `none`.
- 结构化 binding 模式： `object`.
- intent 可见性： `visible`.
- 操作别名： `product download`, `product`, `download`, `product_id`, `PRODUCT_ID`, `asset`, `ASSET`, `output_dir`, `output-dir`, `DIR`, `force`, `FORCE`.

### 效果

```json
[
  {
    "description": "Reads state without changing Zotero-managed data.",
    "kind": "none",
    "stateChanged": false
  }
]
```

### Approval

```json
{
  "kind": "none",
  "scope": "No Zotero UI approval; provider runtimes may still request their own permission.",
  "timing": "none"
}
```

### Handle 转换

```json
[
  {
    "condition": "Required by the command invocation.",
    "direction": "consume",
    "handle": "productId",
    "lifetime": "caller-owned",
    "required": true
  },
  {
    "condition": "Returned when the corresponding operation succeeds.",
    "direction": "produce",
    "handle": "fileId",
    "lifetime": "short-lived",
    "required": false
  }
]
```

### 恢复

```json
[
  {
    "action": "Inspect the error and retry only when retryable is true.",
    "nextCommand": "surface describe",
    "requiresHandles": [],
    "stateCheck": "command-result",
    "when": "The read fails or returns incomplete evidence."
  }
]
```

### Targets

```json
[
  {
    "kind": "capability",
    "target": "workflow_products.export"
  }
]
```
