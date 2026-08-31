# `zotero-bridge synthesis topic export-research-bundle`

导出一个或多个 Topic 研究包

## 用法

```console
zotero-bridge synthesis topic export-research-bundle [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --topic-id <TOPIC_IDS> [--output-dir <DIR>]
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
| --topic-id | topic_ids | option | yes | — | TOPIC_IDS | yes | — | — | 稳定的 Topic ID；重复传入可聚合多个 Topic |
| --output-dir | output_dir | option | no | connectionMode 为 local 时必填，为 remote 时禁止。 | DIR | no | — | — | 本地 profile 使用不存在或为空的目标目录；远程 profile 省略此项 |

## 调用 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "output-dir": {
      "description": "Absent or empty destination directory for local profiles; omit for remote profiles",
      "type": "string"
    },
    "topic-id": {
      "description": "Stable Topic id; repeat to aggregate multiple Topics",
      "items": {
        "type": "string"
      },
      "type": "array"
    }
  },
  "required": [
    "topic-id"
  ],
  "type": "object"
}
```

## 结构化输入 schema

### `--output-dir` (output_dir)

必填：`false`；条件：connectionMode 为 local 时必填，为 remote 时禁止。

```json
{
  "minLength": 1,
  "type": "string"
}
```

### `--topic-id` (topic_ids)

必填：`true`。

```json
{
  "items": {
    "minLength": 1,
    "type": "string"
  },
  "maxItems": 20,
  "minItems": 1,
  "type": "array"
}
```

## 组合后的 payload schema

```json
{
  "additionalProperties": false,
  "anyOf": [
    {
      "required": [
        "topic_ids"
      ]
    },
    {
      "required": [
        "topicIds"
      ]
    }
  ],
  "properties": {
    "outputDir": {
      "minLength": 1,
      "type": "string"
    },
    "output_dir": {
      "minLength": 1,
      "type": "string"
    },
    "topicIds": {
      "items": {
        "minLength": 1,
        "type": "string"
      },
      "maxItems": 20,
      "minItems": 1,
      "type": "array"
    },
    "topic_ids": {
      "items": {
        "minLength": 1,
        "type": "string"
      },
      "maxItems": 20,
      "minItems": 1,
      "type": "array"
    }
  },
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
      "argument": "topic_ids",
      "field": "topic_ids",
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
      "const": "topics.export_research_bundle"
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
              "const": "topics"
            },
            "paper_count": {
              "maximum": 500,
              "minimum": 0,
              "type": "integer"
            },
            "topic_count": {
              "maximum": 20,
              "minimum": 1,
              "type": "integer"
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

### output_dir: shape-only

本地研究包的目标目录。

```console
zotero-bridge synthesis topic export-research-bundle --output-dir 'topic-research-bundle'
```

前提：

- 本地 profile 必须使用 Host 文件系统中不存在或为空的目录。

### topic_ids: shape-only

用于生成一个聚合研究包的重复 Topic 选择器。

```console
zotero-bridge synthesis topic export-research-bundle --topic-id '["topic-one","topic-two"]'
```

前提：

- 使用 synthesis topic list 返回的一至 20 个稳定 Topic ID。

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
      "help": "Stable Topic id; repeat to aggregate multiple Topics",
      "id": "topic_ids",
      "kind": "option",
      "possibleValues": [],
      "repeatable": true,
      "required": true,
      "takesValue": true,
      "token": "--topic-id",
      "valueNames": [
        "TOPIC_IDS"
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
    "synthesis",
    "topic",
    "export-research-bundle"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "topic-id",
      "required": true,
      "takesValue": true,
      "token": "--topic-id",
      "valueNames": [
        "TOPIC_IDS"
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
  "command": "synthesis topic export-research-bundle",
  "composition": {
    "constants": {},
    "mappings": [
      {
        "argument": "topic_ids",
        "field": "topic_ids",
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
      "description": "Reads Topic reports and paper digests and either writes a caller-selected local directory or produces a temporary remote download handle.",
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
    "output_dir": {
      "examples": [
        {
          "description": "Local bundle destination directory.",
          "kind": "shape-only",
          "prerequisites": [
            "Use an absent or empty directory on the Host filesystem for a local profile."
          ],
          "value": "topic-research-bundle"
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
    },
    "topic_ids": {
      "examples": [
        {
          "description": "Repeated Topic selectors for one aggregate bundle.",
          "kind": "shape-only",
          "prerequisites": [
            "Use one to 20 stable Topic ids returned by synthesis topic list."
          ],
          "value": [
            "topic-one",
            "topic-two"
          ]
        }
      ],
      "required": true,
      "requiredWhen": [],
      "schema": {
        "items": {
          "minLength": 1,
          "type": "string"
        },
        "maxItems": 20,
        "minItems": 1,
        "type": "array"
      },
      "schemaSource": "composition",
      "token": "--topic-id"
    }
  },
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "output-dir": {
        "description": "Absent or empty destination directory for local profiles; omit for remote profiles",
        "type": "string"
      },
      "topic-id": {
        "description": "Stable Topic id; repeat to aggregate multiple Topics",
        "items": {
          "type": "string"
        },
        "type": "array"
      }
    },
    "required": [
      "topic-id"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "synthesis topic export-research-bundle",
    "synthesis",
    "topic",
    "export-research-bundle",
    "topic_ids",
    "topic-id",
    "TOPIC_ID",
    "output_dir",
    "output-dir",
    "DIR",
    "Topic research bundle"
  ],
  "outputBoundary": {
    "fileField": "data.delivery.bundle",
    "strategy": "file"
  },
  "pagination": "file",
  "payloadSchema": {
    "additionalProperties": false,
    "anyOf": [
      {
        "required": [
          "topic_ids"
        ]
      },
      {
        "required": [
          "topicIds"
        ]
      }
    ],
    "properties": {
      "outputDir": {
        "minLength": 1,
        "type": "string"
      },
      "output_dir": {
        "minLength": 1,
        "type": "string"
      },
      "topicIds": {
        "items": {
          "minLength": 1,
          "type": "string"
        },
        "maxItems": 20,
        "minItems": 1,
        "type": "array"
      },
      "topic_ids": {
        "items": {
          "minLength": 1,
          "type": "string"
        },
        "maxItems": 20,
        "minItems": 1,
        "type": "array"
      }
    },
    "type": "object"
  },
  "recovery": [
    {
      "action": "Refresh the Topic id or destination state; for a returned fileId, rerun the supplied file download command while the handle remains valid.",
      "nextCommand": "synthesis topic list",
      "requiresHandles": [],
      "stateCheck": "command-result",
      "when": "A Topic/report cannot be resolved, a local destination is not empty, or a remote download is interrupted."
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
        "const": "topics.export_research_bundle"
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
                "const": "topics"
              },
              "paper_count": {
                "maximum": 500,
                "minimum": 0,
                "type": "integer"
              },
              "topic_count": {
                "maximum": 20,
                "minimum": 1,
                "type": "integer"
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
  "summary": "Export one or more Topic research bundles",
  "targets": [
    {
      "kind": "capability",
      "target": "topics.export_research_bundle"
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

- 规范 argv 路径：`synthesis` `topic` `export-research-bundle`。
- 输出边界：`file`；受治理的细节：{"fileField":"data.delivery.bundle","strategy":"file"}。
- 分页：`file`。
- 类别：`read`；危险级别：`none`。
- 结构化绑定模式：`object`。
- 意图可见性：`visible`。
- 运行别名：`synthesis topic export-research-bundle`、`synthesis`、`topic`、`export-research-bundle`、`topic_ids`、`topic-id`、`TOPIC_ID`、`output_dir`、`output-dir`、`DIR`、`Topic research bundle`。

### 影响

```json
[
  {
    "description": "Reads Topic reports and paper digests and either writes a caller-selected local directory or produces a temporary remote download handle.",
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
    "action": "Refresh the Topic id or destination state; for a returned fileId, rerun the supplied file download command while the handle remains valid.",
    "nextCommand": "synthesis topic list",
    "requiresHandles": [],
    "stateCheck": "command-result",
    "when": "A Topic/report cannot be resolved, a local destination is not empty, or a remote download is interrupted."
  }
]
```

### 目标

```json
[
  {
    "kind": "capability",
    "target": "topics.export_research_bundle"
  }
]
```
