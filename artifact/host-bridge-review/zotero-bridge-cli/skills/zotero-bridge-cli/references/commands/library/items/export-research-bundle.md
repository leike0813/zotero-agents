# `zotero-bridge library items export-research-bundle`

将一篇或多篇文献导出为研究包

## 用法

```console
zotero-bridge library items export-research-bundle [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --items <JSON_OR_FILE> [--output-dir <DIR>]
```

全局选项可放在叶命令之前或之后。使用 `--schema` 可在不加载 profile、也不连接 Zotero 的情况下检查原始结构化输入 schema。

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
| --items | items | option | yes | — | JSON_OR_FILE | no | — | — | 一至 100 个 Zotero 条目引用，可传 JSON 数组、文件路径、@file 或用 '-' 从 stdin 读取 |
| --output-dir | output_dir | option | no | connectionMode 为 local 时必填，为 remote 时禁止。 | DIR | no | — | — | 本地 profile 使用不存在或为空的目标目录；远程 profile 省略此项 |

## 调用 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "items": {
      "description": "One to 100 Zotero item refs as a JSON array, file path, @file, or '-' for stdin",
      "type": "string"
    },
    "output-dir": {
      "description": "Absent or empty destination directory for local profiles; omit for remote profiles",
      "type": "string"
    }
  },
  "required": [
    "items"
  ],
  "type": "object"
}
```

## 结构化输入 schema

### `--items` (items)

必填：`true`。

```json
{
  "items": {
    "oneOf": [
      {
        "additionalProperties": false,
        "properties": {
          "id": {
            "type": [
              "integer",
              "string"
            ]
          }
        },
        "required": [
          "id"
        ],
        "type": "object"
      },
      {
        "additionalProperties": false,
        "properties": {
          "key": {
            "minLength": 1,
            "type": "string"
          },
          "libraryId": {
            "type": [
              "integer",
              "string"
            ]
          }
        },
        "required": [
          "key"
        ],
        "type": "object"
      }
    ]
  },
  "maxItems": 100,
  "minItems": 1,
  "type": "array"
}
```

### `--output-dir` (output_dir)

必填：`false`；条件：connectionMode 为 local 时必填，为 remote 时禁止。

```json
{
  "minLength": 1,
  "type": "string"
}
```

## 组合后的 payload schema

```json
{
  "additionalProperties": false,
  "properties": {
    "items": {
      "items": {
        "oneOf": [
          {
            "additionalProperties": false,
            "properties": {
              "id": {
                "type": [
                  "integer",
                  "string"
                ]
              }
            },
            "required": [
              "id"
            ],
            "type": "object"
          },
          {
            "additionalProperties": false,
            "properties": {
              "key": {
                "minLength": 1,
                "type": "string"
              },
              "libraryId": {
                "type": [
                  "integer",
                  "string"
                ]
              }
            },
            "required": [
              "key"
            ],
            "type": "object"
          }
        ]
      },
      "maxItems": 100,
      "minItems": 1,
      "type": "array"
    },
    "outputDir": {
      "minLength": 1,
      "type": "string"
    },
    "output_dir": {
      "minLength": 1,
      "type": "string"
    }
  },
  "required": [
    "items"
  ],
  "type": "object"
}
```

## Payload 组合规则

可执行命令契约统一定义下方的基础来源、固定值、字段映射和封闭转换。命令处理器只为所引用的 Clap 参数 ID 提供值。

```json
{
  "constants": {},
  "mappings": [
    {
      "argument": "items",
      "field": "items",
      "required": true,
      "transform": "identity"
    },
    {
      "argument": "output_dir",
      "field": "output_dir",
      "required": false,
      "transform": "path-string"
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
      "const": "items.export_research_bundle"
    },
    "data": {
      "additionalProperties": false,
      "properties": {
        "delivery": {
          "additionalProperties": false,
          "properties": {
            "bundle": {
              "type": "object"
            },
            "bytesWritten": {
              "minimum": 0,
              "type": "integer"
            },
            "downloadCommand": {
              "type": "string"
            },
            "fileCount": {
              "maximum": 5000,
              "minimum": 1,
              "type": "integer"
            },
            "manifestFile": {
              "type": "string"
            },
            "mode": {
              "enum": [
                "local",
                "bridge-download"
              ]
            },
            "outputName": {
              "type": "string"
            },
            "unpackHint": {
              "type": "string"
            }
          },
          "required": [
            "mode"
          ],
          "type": "object"
        },
        "manifest_file": {
          "const": "manifest.json"
        },
        "summary": {
          "additionalProperties": false,
          "properties": {
            "kind": {
              "const": "papers"
            },
            "paper_count": {
              "maximum": 500,
              "minimum": 1,
              "type": "integer"
            },
            "topic_count": {
              "const": 0
            },
            "warning_count": {
              "minimum": 0,
              "type": "integer"
            }
          },
          "required": [
            "kind",
            "paper_count",
            "topic_count",
            "warning_count"
          ],
          "type": "object"
        }
      },
      "required": [
        "manifest_file",
        "summary",
        "delivery"
      ],
      "type": "object"
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

### items: shape-only

一个基于 key 的 Zotero 条目选择器。

```console
zotero-bridge library items export-research-bundle --items '[{"key":"ABCD1234","libraryId":1}]'
```

前提：

- 将示例替换为目标文库中有效的一至 100 个 Zotero 条目引用。

### output_dir: shape-only

本地研究包的目标目录。

```console
zotero-bridge library items export-research-bundle --output-dir 'research-bundle'
```

前提：

- 本地 profile 必须使用 Host 文件系统中不存在或为空的目录。

## 完整命令描述符

这个封闭描述符是 `surface describe` 返回的机器可读命令契约。将它直接纳入卡片后，无需加载其他命令引用即可独立审计。

```json
{
  "approvalContract": {
    "kind": "none",
    "scope": "No Zotero UI approval; local filesystem destination rules and remote handle delivery still apply.",
    "timing": "none"
  },
  "arguments": [
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "One to 100 Zotero item refs as a JSON array, file path, @file, or '-' for stdin",
      "id": "items",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "--items",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Absent or empty destination directory for local profiles; omit for remote profiles",
      "id": "output_dir",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--output-dir",
      "valueNames": [
        "DIR"
      ]
    }
  ],
  "argv": [
    "library",
    "items",
    "export-research-bundle"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "items",
      "required": true,
      "takesValue": true,
      "token": "--items",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    },
    {
      "kind": "option",
      "property": "output-dir",
      "required": false,
      "takesValue": true,
      "token": "--output-dir",
      "valueNames": [
        "DIR"
      ]
    }
  ],
  "binding": "object",
  "category": "read",
  "command": "library items export-research-bundle",
  "composition": {
    "constants": {},
    "mappings": [
      {
        "argument": "items",
        "field": "items",
        "required": true,
        "transform": "identity"
      },
      {
        "argument": "output_dir",
        "field": "output_dir",
        "required": false,
        "transform": "path-string"
      }
    ]
  },
  "danger": "none",
  "effects": [
    {
      "description": "Reads Zotero content and either writes a caller-selected local directory or produces a temporary remote download handle.",
      "kind": "none",
      "stateChanged": false
    }
  ],
  "handleTransitions": [
    {
      "condition": "Produced only by a remote profile after the ZIP is registered.",
      "direction": "produce",
      "handle": "fileId",
      "lifetime": "short-lived",
      "required": false
    }
  ],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {
    "items": {
      "examples": [
        {
          "description": "One key-based Zotero item selector.",
          "kind": "shape-only",
          "prerequisites": [
            "Replace the example with one to 100 Zotero item refs valid in the target library."
          ],
          "value": [
            {
              "key": "ABCD1234",
              "libraryId": 1
            }
          ]
        }
      ],
      "required": true,
      "requiredWhen": [],
      "schema": {
        "items": {
          "oneOf": [
            {
              "additionalProperties": false,
              "properties": {
                "id": {
                  "type": [
                    "integer",
                    "string"
                  ]
                }
              },
              "required": [
                "id"
              ],
              "type": "object"
            },
            {
              "additionalProperties": false,
              "properties": {
                "key": {
                  "minLength": 1,
                  "type": "string"
                },
                "libraryId": {
                  "type": [
                    "integer",
                    "string"
                  ]
                }
              },
              "required": [
                "key"
              ],
              "type": "object"
            }
          ]
        },
        "maxItems": 100,
        "minItems": 1,
        "type": "array"
      },
      "schemaSource": "composition",
      "token": "--items"
    },
    "output_dir": {
      "examples": [
        {
          "description": "Local bundle destination directory.",
          "kind": "shape-only",
          "prerequisites": [
            "Use an absent or empty directory on the Host filesystem for a local profile."
          ],
          "value": "research-bundle"
        }
      ],
      "required": false,
      "requiredWhen": [
        "Required for connectionMode local; forbidden for connectionMode remote."
      ],
      "schema": {
        "minLength": 1,
        "type": "string"
      },
      "schemaSource": "composition",
      "token": "--output-dir"
    }
  },
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "items": {
        "description": "One to 100 Zotero item refs as a JSON array, file path, @file, or '-' for stdin",
        "type": "string"
      },
      "output-dir": {
        "description": "Absent or empty destination directory for local profiles; omit for remote profiles",
        "type": "string"
      }
    },
    "required": [
      "items"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "library items export-research-bundle",
    "library",
    "items",
    "export-research-bundle",
    "JSON_OR_FILE",
    "output_dir",
    "output-dir",
    "DIR",
    "paper research bundle"
  ],
  "outputBoundary": {
    "fileField": "data.delivery.bundle",
    "strategy": "file"
  },
  "pagination": "file",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "items": {
        "items": {
          "oneOf": [
            {
              "additionalProperties": false,
              "properties": {
                "id": {
                  "type": [
                    "integer",
                    "string"
                  ]
                }
              },
              "required": [
                "id"
              ],
              "type": "object"
            },
            {
              "additionalProperties": false,
              "properties": {
                "key": {
                  "minLength": 1,
                  "type": "string"
                },
                "libraryId": {
                  "type": [
                    "integer",
                    "string"
                  ]
                }
              },
              "required": [
                "key"
              ],
              "type": "object"
            }
          ]
        },
        "maxItems": 100,
        "minItems": 1,
        "type": "array"
      },
      "outputDir": {
        "minLength": 1,
        "type": "string"
      },
      "output_dir": {
        "minLength": 1,
        "type": "string"
      }
    },
    "required": [
      "items"
    ],
    "type": "object"
  },
  "recovery": [
    {
      "action": "Correct invalid selectors or destination state; for a returned fileId, rerun the supplied file download command while the handle remains valid.",
      "nextCommand": "surface describe",
      "requiresHandles": [],
      "stateCheck": "command-result",
      "when": "Materialization fails, a local destination is not empty, or a remote download is interrupted."
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
        "const": "items.export_research_bundle"
      },
      "data": {
        "additionalProperties": false,
        "properties": {
          "delivery": {
            "additionalProperties": false,
            "properties": {
              "bundle": {
                "type": "object"
              },
              "bytesWritten": {
                "minimum": 0,
                "type": "integer"
              },
              "downloadCommand": {
                "type": "string"
              },
              "fileCount": {
                "maximum": 5000,
                "minimum": 1,
                "type": "integer"
              },
              "manifestFile": {
                "type": "string"
              },
              "mode": {
                "enum": [
                  "local",
                  "bridge-download"
                ]
              },
              "outputName": {
                "type": "string"
              },
              "unpackHint": {
                "type": "string"
              }
            },
            "required": [
              "mode"
            ],
            "type": "object"
          },
          "manifest_file": {
            "const": "manifest.json"
          },
          "summary": {
            "additionalProperties": false,
            "properties": {
              "kind": {
                "const": "papers"
              },
              "paper_count": {
                "maximum": 500,
                "minimum": 1,
                "type": "integer"
              },
              "topic_count": {
                "const": 0
              },
              "warning_count": {
                "minimum": 0,
                "type": "integer"
              }
            },
            "required": [
              "kind",
              "paper_count",
              "topic_count",
              "warning_count"
            ],
            "type": "object"
          }
        },
        "required": [
          "manifest_file",
          "summary",
          "delivery"
        ],
        "type": "object"
      }
    },
    "required": [
      "capability",
      "approval",
      "data"
    ],
    "type": "object"
  },
  "summary": "Export one or more papers as a research bundle",
  "targets": [
    {
      "kind": "capability",
      "target": "items.export_research_bundle"
    }
  ]
}
```

## 参数失败与恢复契约

参数失败统一返回一个 JSON 错误信封。先检查 `error.code`，确认 `error.details.schema` 为 `host-bridge.argument-error.v1` 后才能使用结构化边界字段。保留规范命令、已净化的输入和已经返回的类型化 handle；证据中不得包含完整原始 payload。

- `argv` 表示 CLI 参数缺失、未知、冲突或无效。根据本卡片的参数表或当前命令帮助重建 argv。
- `json_source` 表示 stdin 或文件来源不可读。修正该来源，不要把值移到其他绑定。
- `json_syntax` 表示 JSON 无效，并提供安全的行列上下文。解释领域字段前先修复语法。
- `command_input` 表示结构化输入违反 schema。检查有界的 `violations`，再对这个叶命令运行 `--schema` 并修正声明的字段或类型；不得臆造别名。
- `payload_contract` 表示 CLI 组合出的 capability payload 在网络 I/O 前已违反可执行契约。将其视为实现故障，不得用原始传输绕过语义命令。
- `command_result` 表示 Host 响应或本地结果未通过可执行结果 schema。不得把它接受或报告为成功证据。
- 违规数组会脱敏、按确定顺序排列，并限制为八项。`truncated` 为 true 时，修正已报告的违规并重新验证，不要请求披露秘密或完整 payload。

## 运行契约

- 规范 argv 路径：`library` `items` `export-research-bundle`。
- 输出边界：`file`；受治理的细节：{"fileField":"data.delivery.bundle","strategy":"file"}。
- 分页：`file`。
- 类别：`read`；危险级别：`none`。
- 结构化绑定模式：`object`。
- 意图可见性：`visible`。
- 运行别名：`library items export-research-bundle`、`library`、`items`、`export-research-bundle`、`JSON_OR_FILE`、`output_dir`、`output-dir`、`DIR`、`paper research bundle`。

### 影响

```json
[
  {
    "description": "Reads Zotero content and either writes a caller-selected local directory or produces a temporary remote download handle.",
    "kind": "none",
    "stateChanged": false
  }
]
```

### 审批

```json
{
  "kind": "none",
  "scope": "No Zotero UI approval; local filesystem destination rules and remote handle delivery still apply.",
  "timing": "none"
}
```

### Handle 转换

```json
[
  {
    "condition": "Produced only by a remote profile after the ZIP is registered.",
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
    "action": "Correct invalid selectors or destination state; for a returned fileId, rerun the supplied file download command while the handle remains valid.",
    "nextCommand": "surface describe",
    "requiresHandles": [],
    "stateCheck": "command-result",
    "when": "Materialization fails, a local destination is not empty, or a remote download is interrupted."
  }
]
```

### 目标

```json
[
  {
    "kind": "capability",
    "target": "items.export_research_bundle"
  }
]
```
