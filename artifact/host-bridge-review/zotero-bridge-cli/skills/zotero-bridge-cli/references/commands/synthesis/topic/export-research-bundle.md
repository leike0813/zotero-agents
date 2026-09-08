# `zotero-bridge synthesis topic export-research-bundle`

导出一个或多个 Topic 研究捆绑包

## 用法

```console
zotero-bridge synthesis topic export-research-bundle [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --topic-id <TOPIC_IDS> [--output-dir <DIR>]
```

全局选项可出现在叶命令之前或之后。使用 `--schema` 检查原始结构化输入 schema，而无需加载 profile 或连接 Zotero。

## 全局参数

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --endpoint | endpoint | option | no | — | ENDPOINT | no | ZOTERO_BRIDGE_ENDPOINT | — | Zotero Bridge 服务端点基础 URL。若省略，CLI 读取 ZOTERO_BRIDGE_ENDPOINT 或 profile 文件。CLI 不会猜测随机的 bridge 端口。 |
| --operation-id | operation_id | option | no | — | ID | no | ZOTERO_BRIDGE_OPERATION_ID | — | 用于改变状态的 Zotero 请求的不透明 idempotency id |
| --profile | profile | option | no | — | PATH | no | ZOTERO_BRIDGE_PROFILE | — | Zotero Bridge connection-profile JSON 文件的路径。若省略，CLI 会尝试 Zotero Agents 的 well-known profile。ACP run profile 通常引用 tokenEnv；本地 well-known profile 可能包含受用户级文件权限保护的 bearer token。 |
| --schema | schema | option | no | — | SCHEMA; values: true, false | no | — | — | 打印一个规范叶命令的带版本原始 JSON Schema 与受管辖示例。Schema 模式为离线模式，不加载 profile、不读取 Zotero Bridge 配置，也不连接 Zotero。 |

## 局部选项与位置参数

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --topic-id | topic_ids | option | yes | — | TOPIC_IDS | yes | — | — | 稳定 Topic id；重复以聚合多个 Topics |
| --output-dir | output_dir | option | no | Required for connectionMode local; forbidden for connectionMode remote. | DIR | no | — | — | 本地 profile 的目标目录须为空或不存在；远程 profile 省略 |

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

### `--output-dir`（output_dir）

必需：`false`；条件：connectionMode local 必需；connectionMode remote 禁止。

```json
{
  "minLength": 1,
  "type": "string"
}
```

### `--topic-id`（topic_ids）

必需：`true`。

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

## 组合载荷 schema

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

## 载荷组合

可执行命令契约拥有下方所示的基准源、固定值、字段映射与封闭转换。命令处理器只在所引用的 Clap 参数 ID 下提供值。

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

### output_dir：仅形状

本地 bundle 的目标目录。

```console
zotero-bridge synthesis topic export-research-bundle --output-dir 'topic-research-bundle'
```

前置条件：

- 对本地 profile，使用 Host 文件系统上为空或不存在的目录。

### topic_ids：仅形状

一个聚合 bundle 的重复 Topic selectors。

```console
zotero-bridge synthesis topic export-research-bundle --topic-id '["topic-one","topic-two"]'
```

前置条件：

- 使用 synthesis topic list 返回的 1 到 20 个稳定 Topic ids。

## 完整命令描述符

此封闭描述符是 `surface describe` 返回的机器可读命令契约；此处包含它，以便在不加载另一份命令参考的情况下，本卡片仍可独立审计。

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

参数失败以单个 JSON 错误信封返回。先检查 `error.code`，然后要求 `error.details.schema` 为 `host-bridge.argument-error.v1`，再使用结构化边界字段。保留规范命令、已净化的输入以及任何已返回的类型化句柄；绝不在证据中包含完整的原始载荷。

- `argv` 报告缺失、未知、冲突或无效的 CLI 参数。请依据本卡片的参数表或当前命令帮助重建 argv。
- `json_source` 报告 stdin 或文件源不可读。请修正该源，而不要将值挪到另一个绑定。
- `json_syntax` 以安全行列上下文报告无效 JSON。在解读领域字段前先修复语法。
- `command_input` 报告结构化输入的 schema 违规。检查有界的 `violations`，然后用 `--schema` 运行此精确叶命令并修正所声明的字段或类型；不要自行发明别名。
- `payload_contract` 表示 CLI 组合出的 capability 载荷在网络 I/O 之前违反了可执行契约。将其视为实现缺陷；不要用原始传输绕过语义命令。
- `command_result` 表示 Host 响应或本地结果未通过其可执行结果 schema。不得将其作为成功证据接受或报告。
- 违规数组经过脱敏、确定性排序，并最多保留八项。当 `truncated` 为 true 时，应修正所报告的违规并重新校验，而不是要求披露秘密或完整载荷。

## 操作契约

- 规范 argv 路径：`synthesis` `topic` `export-research-bundle`。
- 输出边界：`file`；受管辖的详情：{"fileField":"data.delivery.bundle","strategy":"file"}。
- 分页：`file`。
- 类别：`read`；危险级别：`none`。
- 结构化绑定模式：`object`。
- 意图可见性：`visible`。
- 操作别名：`synthesis topic export-research-bundle`、`synthesis`、`topic`、`export-research-bundle`、`topic_ids`、`topic-id`、`TOPIC_ID`、`output_dir`、`output-dir`、`DIR`、`Topic research bundle`。

### 效果

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

### 句柄转换

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
