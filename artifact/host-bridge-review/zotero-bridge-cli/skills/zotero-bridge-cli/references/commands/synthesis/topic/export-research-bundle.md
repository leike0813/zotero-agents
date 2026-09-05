# `zotero-bridge synthesis topic export-research-bundle`

导出一个或多个 Topic 研究包

## Usage

```console
zotero-bridge synthesis topic export-research-bundle [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --topic-id <TOPIC_IDS> [--output-dir <DIR>]
```

The global options may appear before or after the leaf command. Use `--schema` to inspect raw structured-input schemas without loading a profile or connecting to Zotero.

## Global parameters

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --endpoint | endpoint | option | no | — | ENDPOINT | no | ZOTERO_BRIDGE_ENDPOINT | — | Zotero Bridge service endpoint base URL. If omitted, the CLI reads ZOTERO_BRIDGE_ENDPOINT or a profile file. The CLI does not guess random bridge ports. |
| --operation-id | operation_id | option | no | — | ID | no | ZOTERO_BRIDGE_OPERATION_ID | — | Opaque idempotency id for a state-changing Zotero request |
| --profile | profile | option | no | — | PATH | no | ZOTERO_BRIDGE_PROFILE | — | Path to a Zotero Bridge connection-profile JSON file. If omitted, the CLI tries the Zotero Agents well-known profile. ACP run profiles usually reference tokenEnv; the local well-known profile may contain a bearer token protected by user-level file permissions. |
| --schema | schema | option | no | — | SCHEMA; values: true, false | no | — | — | Print the versioned raw JSON Schemas and governed examples for one canonical leaf command. Schema mode is offline and does not load a profile, read Zotero Bridge configuration, or connect to Zotero. |

## Local options and positionals

| Token | Id | Kind | Required | Conditional requirement | Values / arity | Repeatable | Environment | Conflicts | Help |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| --topic-id | topic_ids | option | yes | — | TOPIC_IDS | yes | — | — | 稳定的 Topic ID；重复传入可聚合多个 Topic |
| --output-dir | output_dir | option | no | connectionMode 为 local 时必填，为 remote 时禁止。 | DIR | no | — | — | 本地 profile 使用不存在或为空的目标目录；远程 profile 省略此项 |

## Invocation schema

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

## Structured input schemas

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

## Composed payload schema

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

## Payload composition

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

## Result schema

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

## Examples

### output_dir: shape-only

本地研究包的目标目录。

```console
zotero-bridge synthesis topic export-research-bundle --output-dir 'topic-research-bundle'
```

Prerequisites:

- 本地 profile 必须使用 Host 文件系统中不存在或为空的目录。

### topic_ids: shape-only

用于生成一个聚合研究包的重复 Topic 选择器。

```console
zotero-bridge synthesis topic export-research-bundle --topic-id '["topic-one","topic-two"]'
```

Prerequisites:

- 使用 synthesis topic list 返回的一至 20 个稳定 Topic ID。

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

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

## Parameter failure and recovery contract

Parameter failures are returned as one JSON error envelope. Inspect `error.code`, then require `error.details.schema` to be `host-bridge.argument-error.v1` before using the structured boundary fields. Preserve the canonical command, sanitized inputs, and any already-returned typed handles; never include the complete raw payload in evidence.

- `argv` reports a missing, unknown, conflicting, or invalid CLI argument. Rebuild argv from this card's parameter tables or the active command help.
- `json_source` reports an unreadable stdin or file source. Correct that source without moving the value to a different binding.
- `json_syntax` reports invalid JSON with safe line and column context. Repair syntax before interpreting domain fields.
- `command_input` reports schema violations for a structured input. Inspect the bounded `violations`, then run this exact leaf with `--schema` and correct the declared field or type; do not invent an alias.
- `payload_contract` means the CLI's composed capability payload violates the executable contract before network I/O. Treat this as an implementation fault; do not bypass the semantic command with raw transport.
- `command_result` means a Host response or local result failed its executable result schema. Do not accept or report it as successful evidence.
- Violation arrays are redacted, deterministically ordered, and capped at eight. When `truncated` is true, correct the reported violations and validate again rather than requesting secret or complete payload disclosure.

## Operational contract

- 规范 argv 路径：`synthesis` `topic` `export-research-bundle`。
- 输出边界：`file`；受治理详情：{"fileField":"data.delivery.bundle","strategy":"file"}。
- 分页： `file`.
- Category: `read`; danger: `none`.
- 结构化 binding 模式： `object`.
- Intent visibility: `visible`.
- 运行别名：`synthesis topic export-research-bundle`、`synthesis`、`topic`、`export-research-bundle`、`topic_ids`、`topic-id`、`TOPIC_ID`、`output_dir`、`output-dir`、`DIR`、`Topic research bundle`。

### Effects

```json
[
  {
    "description": "Reads Topic reports and paper digests and either writes a caller-selected local directory or produces a temporary remote download handle.",
    "kind": "none",
    "stateChanged": false
  }
]
```

### Approval

```json
{
  "kind": "none",
  "scope": "No Zotero UI approval; local filesystem destination rules and remote handle delivery still apply.",
  "timing": "none"
}
```

### Handle transitions

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

### Recovery

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

### Targets

```json
[
  {
    "kind": "capability",
    "target": "topics.export_research_bundle"
  }
]
```
