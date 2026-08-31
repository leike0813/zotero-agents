# `zotero-bridge library items export-research-bundle`

Export one or more papers as a research bundle

## Usage

```console
zotero-bridge library items export-research-bundle [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --items <JSON_OR_FILE> [--output-dir <DIR>]
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
| --items | items | option | yes | — | JSON_OR_FILE | no | — | — | One to 100 Zotero item refs as a JSON array, file path, @file, or '-' for stdin |
| --output-dir | output_dir | option | no | Required for connectionMode local; forbidden for connectionMode remote. | DIR | no | — | — | Absent or empty destination directory for local profiles; omit for remote profiles |

## Invocation schema

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

## Structured input schemas

### `--items` (items)

Required: `true`.

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

Required: `false`; condition: Required for connectionMode local; forbidden for connectionMode remote..

```json
{
  "minLength": 1,
  "type": "string"
}
```

## Composed payload schema

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

## Payload composition

The executable command contract owns the base source, fixed values, field mappings, and closed transforms shown below. Command handlers only provide values under the referenced Clap argument IDs.

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

## Examples

### items: shape-only

One key-based Zotero item selector.

```console
zotero-bridge library items export-research-bundle --items '[{"key":"ABCD1234","libraryId":1}]'
```

Prerequisites:

- Replace the example with one to 100 Zotero item refs valid in the target library.

### output_dir: shape-only

Local bundle destination directory.

```console
zotero-bridge library items export-research-bundle --output-dir 'research-bundle'
```

Prerequisites:

- Use an absent or empty directory on the Host filesystem for a local profile.

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

- Canonical argv path: `library` `items` `export-research-bundle`.
- Output boundary: `file`; governed details: {"fileField":"data.delivery.bundle","strategy":"file"}.
- Pagination: `file`.
- Category: `read`; danger: `none`.
- Structured binding mode: `object`.
- Intent visibility: `visible`.
- Operational aliases: `library items export-research-bundle`, `library`, `items`, `export-research-bundle`, `JSON_OR_FILE`, `output_dir`, `output-dir`, `DIR`, `paper research bundle`.

### Effects

```json
[
  {
    "description": "Reads Zotero content and either writes a caller-selected local directory or produces a temporary remote download handle.",
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
    "action": "Correct invalid selectors or destination state; for a returned fileId, rerun the supplied file download command while the handle remains valid.",
    "nextCommand": "surface describe",
    "requiresHandles": [],
    "stateCheck": "command-result",
    "when": "Materialization fails, a local destination is not empty, or a remote download is interrupted."
  }
]
```

### Targets

```json
[
  {
    "kind": "capability",
    "target": "items.export_research_bundle"
  }
]
```
