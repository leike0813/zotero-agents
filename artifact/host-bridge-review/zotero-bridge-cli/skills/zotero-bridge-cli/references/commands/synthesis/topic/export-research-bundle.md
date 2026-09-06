# `zotero-bridge synthesis topic export-research-bundle`

导出一个或多个 Topic research bundle

## 用法

```console
zotero-bridge synthesis topic export-research-bundle [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --topic-id <TOPIC_IDS> [--output-dir <DIR>]
```

全局选项可以出现在 leaf 命令之前或之后。使用 `--schema` 可以检查原始的结构化输入 schema，而无需加载 profile 或连接 Zotero。

## 全局参数

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --endpoint | endpoint | option | no | — | ENDPOINT | no | ZOTERO_BRIDGE_ENDPOINT | — | Zotero Bridge 服务的端点基址。若省略，CLI 会读取 ZOTERO_BRIDGE_ENDPOINT 或 profile 文件。CLI 不会随意猜测 bridge 端口。 |
| --operation-id | operation_id | option | no | — | ID | no | ZOTERO_BRIDGE_OPERATION_ID | — | 用于一次会改变 Zotero 状态的请求的不透明幂等性 id |
| --profile | profile | option | no | — | PATH | no | ZOTERO_BRIDGE_PROFILE | — | Zotero Bridge 连接 profile JSON 文件的路径。若省略，CLI 会尝试使用 Zotero Agents 的 well-known profile。ACP 运行 profile 通常引用 tokenEnv；本地的 well-known profile 可能包含由用户级文件权限保护的 bearer token。 |
| --schema | schema | option | no | — | SCHEMA; values: true, false | no | — | — | 为一个规范化的 leaf 命令打印版本化的原始 JSON Schema 和受管控的示例。Schema 模式为离线模式，不会加载 profile、读取 Zotero Bridge 配置，也不会连接 Zotero。 |

## 本地选项与位置参数

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --topic-id | topic_ids | option | yes | — | TOPIC_IDS | yes | — | — | Stable Topic id; repeat to aggregate multiple Topics |
| --output-dir | output_dir | option | no | Required for connectionMode local; forbidden for connectionMode remote. | DIR | no | — | — | Absent or empty destination directory for local profiles; omit for remote profiles |

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

Required: `false`; condition: Required for connectionMode local; forbidden for connectionMode remote..

```json
{
  "minLength": 1,
  "type": "string"
}
```

### `--topic-id` (topic_ids)

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

## 组合 payload schema

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

## Payload 组合

The executable command contract owns the base source, fixed values, field mappings, and closed transforms shown below. Command handlers only provide values under the referenced Clap argument IDs.

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

### output_dir: shape-only 示例

Local bundle destination directory.

```console
zotero-bridge synthesis topic export-research-bundle --output-dir 'topic-research-bundle'
```

前置条件：

- Use an absent or empty directory on the Host filesystem for a local profile.

### topic_ids: shape-only 示例

Repeated Topic selectors for one aggregate bundle.

```console
zotero-bridge synthesis topic export-research-bundle --topic-id '["topic-one","topic-two"]'
```

前置条件：

- Use one to 20 stable Topic ids returned by synthesis topic list.

## 完整命令描述符

此封闭描述符是 `surface describe` 返回的机器可读命令契约；此处包含它是为了让该卡片在无需加载其他命令参考的情况下仍可独立审计。

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

Parameter failures are returned as one JSON error envelope. Inspect `error.code`, then require `error.details.schema` to be `host-bridge.argument-error.v1` before using the structured boundary fields. Preserve the canonical command, sanitized inputs, and any already-returned typed handles; never include the complete raw payload in evidence.

- `argv` reports a missing, unknown, conflicting, or invalid CLI argument. Rebuild argv from this card's parameter tables or the active command help.
- `json_source` reports an unreadable stdin or file source. Correct that source without moving the value to a different binding.
- `json_syntax` reports invalid JSON with safe line and column context. Repair syntax before interpreting domain fields.
- `command_input` reports schema violations for a structured input. Inspect the bounded `violations`, then run this exact leaf with `--schema` and correct the declared field or type; do not invent an alias.
- `payload_contract` means the CLI's composed capability payload violates the executable contract before network I/O. Treat this as an implementation fault; do not bypass the semantic command with raw transport.
- `command_result` means a Host response or local result failed its executable result schema. Do not accept or report it as successful evidence.
- Violation arrays are redacted, deterministically ordered, and capped at eight. When `truncated` is true, correct the reported violations and validate again rather than requesting secret or complete payload disclosure.

## 运行契约

- Canonical argv path: `synthesis` `topic` `export-research-bundle`.
- Output boundary: `file`; governed details: {"fileField":"data.delivery.bundle","strategy":"file"}.
- Pagination: `file`.
- Category: `read`; danger: `none`.
- Structured binding mode: `object`.
- Intent visibility: `visible`.
- Operational aliases: `synthesis topic export-research-bundle`, `synthesis`, `topic`, `export-research-bundle`, `topic_ids`, `topic-id`, `TOPIC_ID`, `output_dir`, `output-dir`, `DIR`, `Topic research bundle`.

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
