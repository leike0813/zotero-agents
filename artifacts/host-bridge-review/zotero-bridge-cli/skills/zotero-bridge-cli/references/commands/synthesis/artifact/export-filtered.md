# `zotero-bridge synthesis artifact export-filtered`

把有界的论文 artifacts 导出到 run workspace

## 论文 artifact 契约

- 完整的论文 artifact 集为 `digest`、`references`、`citation_analysis` 与 `literature_score`。仅当四项全部有意时才省略 `artifact_types`；若需过滤操作，请传入明确的子集。
- 完整覆盖要求四种状态全部可用。缺失的评分为 `missing`；解码或 schema 失败为 `error`，并产生无效的质量快照。两者均不可用于覆盖。
`literature_quality` 是紧凑的冻结分数快照。保留其状态、schema/rubric 身份、论文类型、分数、置信度、质量先验、payload 哈希与诊断；不要用主观质量标签替换它。
- 缺失或无效的分数快照使用中性 `quality_prior=0.5`，并保留 `literature_score_missing` 或 `literature_score_invalid`。reference-sidecar 刷新不会创建或修复分数。

过滤导出在被选中时写入完整的解码 literature-score payload，并在其版本化 manifest 中携带紧凑的 `literature_quality` 快照。对于远程交付，在读取 workspace 路径前下载并验证返回的 bundle handle。

## 用法

```console
zotero-bridge synthesis artifact export-filtered [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--query <JSON_OR_FILE>]
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
| --query | query | option | no | — | JSON_OR_FILE | no | — | — | 读取查询。默认使用内联 JSON，如 '{"cursor":1}'。仅当输入来源确属有意时，才使用包含 JSON 的文件路径、@file 语法或 '-' 表示 stdin。省略时为 {}。 |

## 调用 schema

```json
{
  "additionalProperties": false,
  "properties": {
    "query": {
      "description": "Read query as inline JSON, a file path, @file, or '-' for stdin",
      "type": "string"
    }
  },
  "required": [],
  "type": "object"
}
```

## 结构化输入 schema

### `--query`（query）

必需：`false`。

```json
{
  "additionalProperties": true,
  "properties": {
    "artifact_types": {
      "items": {
        "enum": [
          "digest",
          "references",
          "citation_analysis",
          "literature_score"
        ]
      },
      "type": "array"
    },
    "paper_ref": {
      "type": "string"
    },
    "paper_refs": {
      "items": {
        "type": "string"
      },
      "type": "array"
    },
    "run_root": {
      "type": "string"
    }
  },
  "type": "object",
  "x-openPropertiesReason": "The selected domain service owns aliases for this capability input vocabulary; the capability boundary still requires a JSON object."
}
```

## 组合载荷 schema

```json
{
  "additionalProperties": true,
  "properties": {
    "artifact_types": {
      "items": {
        "enum": [
          "digest",
          "references",
          "citation_analysis",
          "literature_score"
        ]
      },
      "type": "array"
    },
    "paper_ref": {
      "type": "string"
    },
    "paper_refs": {
      "items": {
        "type": "string"
      },
      "type": "array"
    },
    "run_root": {
      "type": "string"
    }
  },
  "type": "object",
  "x-openPropertiesReason": "The selected domain service owns aliases for this capability input vocabulary; the capability boundary still requires a JSON object."
}
```

## 载荷组合

此命令没有独立的字段映射程序。其绑定模式为直接可执行：passthrough 使用唯一的结构化来源，而 `none` 与 `raw` 保持其声明的封闭行为。

`composition`：`null`。

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
      "const": "paper_artifacts.export_filtered"
    },
    "data": {
      "additionalProperties": true,
      "description": "Result data owned by paper_artifacts.export_filtered.",
      "properties": {
        "delivery": {
          "additionalProperties": true,
          "properties": {
            "bundle": {
              "additionalProperties": false,
              "properties": {
                "contentType": {
                  "type": "string"
                },
                "createdAt": {
                  "type": "string"
                },
                "displayName": {
                  "type": "string"
                },
                "expiresAt": {
                  "type": "string"
                },
                "fileId": {
                  "type": "string"
                },
                "owner": {
                  "additionalProperties": true,
                  "type": "object",
                  "x-openPropertiesReason": "File ownership metadata is capability-specific and contains no local path."
                },
                "sha256": {
                  "type": "string"
                },
                "size": {
                  "minimum": 0,
                  "type": "integer"
                },
                "sourceKind": {
                  "enum": [
                    "zotero-attachment",
                    "workflow-artifact",
                    "bridge-export",
                    "bridge-upload"
                  ]
                }
              },
              "required": [
                "fileId",
                "sourceKind",
                "displayName",
                "contentType",
                "createdAt",
                "expiresAt"
              ],
              "type": "object"
            }
          },
          "type": "object"
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

### query：仅形状示例

--query 的最小 JSON 形状。

```console
zotero-bridge synthesis artifact export-filtered --query '{}'
```

前置条件：

- 执行前，将示例中的标识符与值替换为对所选 Zotero 库、workflow、provider 或 capability 有效的输入。

## 完整命令描述符

此封闭描述符是 `surface describe` 返回的机器可读命令契约；此处包含它，以便在不加载另一份命令参考的情况下，本卡片仍可独立审计。

```json
{
  "approvalContract": {
    "kind": "none",
    "scope": "No Zotero UI approval; provider runtimes may still request their own permission.",
    "timing": "none"
  },
  "arguments": [
    {
      "aliases": [
        "input"
      ],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Read query as inline JSON, a file path, @file, or '-' for stdin",
      "id": "query",
      "kind": "option",
      "longHelp": "Read query. Use inline JSON by default, such as '{\"cursor\":1}'. Use a file path containing JSON, @file syntax, or '-' for stdin only when that input source is intentional. Omit for {}.",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--query",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "argv": [
    "synthesis",
    "artifact",
    "export-filtered"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "query",
      "required": false,
      "takesValue": true,
      "token": "--query",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "binding": "passthrough",
  "category": "read",
  "command": "synthesis artifact export-filtered",
  "composition": null,
  "danger": "none",
  "effects": [
    {
      "description": "Reads state without changing Zotero-managed data.",
      "kind": "none",
      "stateChanged": false
    }
  ],
  "handleTransitions": [],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {
    "query": {
      "examples": [
        {
          "description": "Minimal JSON shape for --query.",
          "kind": "shape-only",
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "value": {}
        }
      ],
      "required": false,
      "requiredWhen": [],
      "schema": {
        "additionalProperties": true,
        "properties": {
          "artifact_types": {
            "items": {
              "enum": [
                "digest",
                "references",
                "citation_analysis",
                "literature_score"
              ]
            },
            "type": "array"
          },
          "paper_ref": {
            "type": "string"
          },
          "paper_refs": {
            "items": {
              "type": "string"
            },
            "type": "array"
          },
          "run_root": {
            "type": "string"
          }
        },
        "type": "object",
        "x-openPropertiesReason": "The selected domain service owns aliases for this capability input vocabulary; the capability boundary still requires a JSON object."
      },
      "schemaSource": "target-capability",
      "token": "--query"
    }
  },
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "query": {
        "description": "Read query as inline JSON, a file path, @file, or '-' for stdin",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "operationalAliases": [
    "synthesis artifact export-filtered",
    "synthesis",
    "artifact",
    "export-filtered",
    "query",
    "JSON_OR_FILE"
  ],
  "outputBoundary": {
    "fileField": "data.delivery.bundle",
    "strategy": "file"
  },
  "pagination": "file",
  "payloadSchema": {
    "additionalProperties": true,
    "properties": {
      "artifact_types": {
        "items": {
          "enum": [
            "digest",
            "references",
            "citation_analysis",
            "literature_score"
          ]
        },
        "type": "array"
      },
      "paper_ref": {
        "type": "string"
      },
      "paper_refs": {
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "run_root": {
        "type": "string"
      }
    },
    "type": "object",
    "x-openPropertiesReason": "The selected domain service owns aliases for this capability input vocabulary; the capability boundary still requires a JSON object."
  },
  "recovery": [
    {
      "action": "Inspect the error and retry only when retryable is true.",
      "nextCommand": "surface describe",
      "requiresHandles": [],
      "stateCheck": "none",
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
        "const": "paper_artifacts.export_filtered"
      },
      "data": {
        "additionalProperties": true,
        "description": "Result data owned by paper_artifacts.export_filtered.",
        "properties": {
          "delivery": {
            "additionalProperties": true,
            "properties": {
              "bundle": {
                "additionalProperties": false,
                "properties": {
                  "contentType": {
                    "type": "string"
                  },
                  "createdAt": {
                    "type": "string"
                  },
                  "displayName": {
                    "type": "string"
                  },
                  "expiresAt": {
                    "type": "string"
                  },
                  "fileId": {
                    "type": "string"
                  },
                  "owner": {
                    "additionalProperties": true,
                    "type": "object",
                    "x-openPropertiesReason": "File ownership metadata is capability-specific and contains no local path."
                  },
                  "sha256": {
                    "type": "string"
                  },
                  "size": {
                    "minimum": 0,
                    "type": "integer"
                  },
                  "sourceKind": {
                    "enum": [
                      "zotero-attachment",
                      "workflow-artifact",
                      "bridge-export",
                      "bridge-upload"
                    ]
                  }
                },
                "required": [
                  "fileId",
                  "sourceKind",
                  "displayName",
                  "contentType",
                  "createdAt",
                  "expiresAt"
                ],
                "type": "object"
              }
            },
            "type": "object"
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
  "summary": "Export bounded paper artifacts into the run workspace",
  "targets": [
    {
      "kind": "capability",
      "target": "paper_artifacts.export_filtered"
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

- 规范 argv 路径：`synthesis` `artifact` `export-filtered`。
- 输出边界：`file`；受管辖的详情：{"fileField":"data.delivery.bundle","strategy":"file"}。
- 分页：`file`。
- 类别：`read`；危险级别：`none`。
- 结构化绑定模式：`passthrough`。
- 意图可见性：`visible`。
- 操作别名：`synthesis artifact export-filtered`、`synthesis`、`artifact`、`export-filtered`、`query`、`JSON_OR_FILE`。

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

### 审批

```json
{
  "kind": "none",
  "scope": "No Zotero UI approval; provider runtimes may still request their own permission.",
  "timing": "none"
}
```

### 句柄转换

```json
[
]
```

### 恢复

```json
[
  {
    "action": "Inspect the error and retry only when retryable is true.",
    "nextCommand": "surface describe",
    "requiresHandles": [],
    "stateCheck": "none",
    "when": "The read fails or returns incomplete evidence."
  }
]
```

### 目标

```json
[
  {
    "kind": "capability",
    "target": "paper_artifacts.export_filtered"
  }
]
```
