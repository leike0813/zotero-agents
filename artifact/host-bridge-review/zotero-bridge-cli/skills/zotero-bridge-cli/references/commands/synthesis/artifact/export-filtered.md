# `zotero-bridge synthesis artifact export-filtered`

Export bounded paper artifacts into the run workspace

## 论文工件合同

- 完整的论文工件集是 `digest`、`references`、`citation_analysis` 和 `literature_score`。只有在确实需要全部四项时才省略 `artifact_types`；过滤操作应传入明确子集。
- 只有四项状态全部可用时，覆盖才算完整。评分缺失记为 `missing`；解码或 schema 失败记为 `error`，并产生无效质量快照。两者在覆盖计算中都不可用。
- `literature_quality` 是紧凑的固化评分快照。保留其状态、schema/rubric 身份、论文类型、分数、置信度、质量先验、payload hash 和诊断；不要用主观质量标签替换它。
- 缺失或无效的评分快照使用中性 `quality_prior=0.5`，并保留 `literature_score_missing` 或 `literature_score_invalid`。Reference-sidecar refresh 不会创建或修复评分。

选中评分工件时，过滤导出会写入完整的 decoded literature-score payload，并在其版本化 manifest 中携带紧凑的 `literature_quality` 快照。远程交付时，在读取 workspace 路径前先下载并校验返回的 bundle handle。

## Usage

```console
zotero-bridge synthesis artifact export-filtered [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--query <JSON_OR_FILE>]
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
| --query | query | option | no | — | JSON_OR_FILE | no | — | — | Read query. Use inline JSON by default, such as '{"cursor":1}'. Use a file path containing JSON, @file syntax, or '-' for stdin only when that input source is intentional. Omit for {}. |

## Invocation schema

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

## Structured input schemas

### `--query` (query)

Required: `false`.

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

## Composed payload schema

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

## Payload composition

This command has no separate field-mapping program. Its binding mode is executable directly: passthrough uses the sole structured source, while `none` and `raw` retain their declared closed behavior.

`composition`: `null`.

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

## Examples

### query: shape-only

用于 --query 的最小 JSON 形状。

```console
zotero-bridge synthesis artifact export-filtered --query '{}'
```

Prerequisites:

- Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution.

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

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

- 规范 argv 路径： `synthesis` `artifact` `export-filtered`.
- 输出边界：`file`；受治理详情：{"fileField":"data.delivery.bundle","strategy":"file"}。
- 分页： `file`.
- Category: `read`; danger: `none`.
- 结构化 binding 模式： `passthrough`.
- Intent visibility: `visible`.
- 操作别名： `synthesis artifact export-filtered`, `synthesis`, `artifact`, `export-filtered`, `query`, `JSON_OR_FILE`.

### Effects

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

### Handle transitions

```json
[
]
```

### Recovery

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

### Targets

```json
[
  {
    "kind": "capability",
    "target": "paper_artifacts.export_filtered"
  }
]
```
