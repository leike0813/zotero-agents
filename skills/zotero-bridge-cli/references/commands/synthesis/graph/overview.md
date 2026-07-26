# `zotero-bridge synthesis graph overview`

Read a paged Synthesis citation graph overview

## Usage

```console
zotero-bridge synthesis graph overview [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--query <JSON_OR_FILE>]
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
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Read query as inline JSON, a file path, @file, or '-' for stdin"
    }
  },
  "required": [],
  "additionalProperties": false
}
```

## Structured input schemas

### `--query` (query)

Required: `false`.

```json
{
  "type": "object",
  "properties": {
    "cursor": {
      "type": [
        "number",
        "string"
      ]
    },
    "limit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "nodeCursor": {
      "type": [
        "number",
        "string"
      ]
    },
    "node_cursor": {
      "type": [
        "number",
        "string"
      ]
    },
    "nodeLimit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "node_limit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "edgeCursor": {
      "type": [
        "number",
        "string"
      ]
    },
    "edge_cursor": {
      "type": [
        "number",
        "string"
      ]
    },
    "edgeLimit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "edge_limit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "hoverNodeCursor": {
      "type": [
        "number",
        "string"
      ]
    },
    "hover_node_cursor": {
      "type": [
        "number",
        "string"
      ]
    },
    "hoverNodeLimit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "hover_node_limit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "hoverEdgeCursor": {
      "type": [
        "number",
        "string"
      ]
    },
    "hover_edge_cursor": {
      "type": [
        "number",
        "string"
      ]
    },
    "hoverEdgeLimit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "hover_edge_limit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    }
  },
  "required": [],
  "additionalProperties": false
}
```

## Composed payload schema

```json
{
  "type": "object",
  "properties": {
    "cursor": {
      "type": [
        "number",
        "string"
      ]
    },
    "limit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "nodeCursor": {
      "type": [
        "number",
        "string"
      ]
    },
    "node_cursor": {
      "type": [
        "number",
        "string"
      ]
    },
    "nodeLimit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "node_limit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "edgeCursor": {
      "type": [
        "number",
        "string"
      ]
    },
    "edge_cursor": {
      "type": [
        "number",
        "string"
      ]
    },
    "edgeLimit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "edge_limit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "hoverNodeCursor": {
      "type": [
        "number",
        "string"
      ]
    },
    "hover_node_cursor": {
      "type": [
        "number",
        "string"
      ]
    },
    "hoverNodeLimit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "hover_node_limit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "hoverEdgeCursor": {
      "type": [
        "number",
        "string"
      ]
    },
    "hover_edge_cursor": {
      "type": [
        "number",
        "string"
      ]
    },
    "hoverEdgeLimit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "hover_edge_limit": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    }
  },
  "required": [],
  "additionalProperties": false
}
```

## Result schema

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
      "description": "Result data owned by citation_graph.get_overview.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed.",
      "properties": {
        "nodes": {
          "type": "array"
        },
        "pagination": {
          "type": "object",
          "properties": {
            "nodes": {
              "type": "object",
              "properties": {
                "nextCursor": {
                  "type": [
                    "string",
                    "null"
                  ]
                },
                "hasMore": {
                  "type": "boolean"
                },
                "returned": {
                  "type": "integer",
                  "minimum": 0
                },
                "total": {
                  "type": "integer",
                  "minimum": 0
                },
                "limit": {
                  "type": "integer",
                  "minimum": 0
                }
              },
              "additionalProperties": true
            }
          },
          "additionalProperties": true
        }
      }
    }
  },
  "additionalProperties": false
}
```

## Examples

### query: shape-only

Minimal JSON shape for --query.

```console
zotero-bridge synthesis graph overview --query '{}'
```

Prerequisites:

- Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution.

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

```json
{
  "command": "synthesis graph overview",
  "argv": [
    "synthesis",
    "graph",
    "overview"
  ],
  "summary": "Read a paged Synthesis citation graph overview",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Read query as inline JSON, a file path, @file, or '-' for stdin"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "query",
      "kind": "option",
      "token": "--query",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Read query as inline JSON, a file path, @file, or '-' for stdin",
      "longHelp": "Read query. Use inline JSON by default, such as '{\"cursor\":1}'. Use a file path containing JSON, @file syntax, or '-' for stdin only when that input source is intentional. Omit for {}.",
      "valueNames": [
        "JSON_OR_FILE"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [
        "input"
      ],
      "defaultValues": []
    }
  ],
  "argvBindings": [
    {
      "property": "query",
      "kind": "option",
      "token": "--query",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "inputSchemas": {
    "query": {
      "token": "--query",
      "required": false,
      "requiredWhen": [],
      "schema": {
        "type": "object",
        "properties": {
          "cursor": {
            "type": [
              "number",
              "string"
            ]
          },
          "limit": {
            "type": [
              "number",
              "string"
            ],
            "minimum": 1
          },
          "nodeCursor": {
            "type": [
              "number",
              "string"
            ]
          },
          "node_cursor": {
            "type": [
              "number",
              "string"
            ]
          },
          "nodeLimit": {
            "type": [
              "number",
              "string"
            ],
            "minimum": 1
          },
          "node_limit": {
            "type": [
              "number",
              "string"
            ],
            "minimum": 1
          },
          "edgeCursor": {
            "type": [
              "number",
              "string"
            ]
          },
          "edge_cursor": {
            "type": [
              "number",
              "string"
            ]
          },
          "edgeLimit": {
            "type": [
              "number",
              "string"
            ],
            "minimum": 1
          },
          "edge_limit": {
            "type": [
              "number",
              "string"
            ],
            "minimum": 1
          },
          "hoverNodeCursor": {
            "type": [
              "number",
              "string"
            ]
          },
          "hover_node_cursor": {
            "type": [
              "number",
              "string"
            ]
          },
          "hoverNodeLimit": {
            "type": [
              "number",
              "string"
            ],
            "minimum": 1
          },
          "hover_node_limit": {
            "type": [
              "number",
              "string"
            ],
            "minimum": 1
          },
          "hoverEdgeCursor": {
            "type": [
              "number",
              "string"
            ]
          },
          "hover_edge_cursor": {
            "type": [
              "number",
              "string"
            ]
          },
          "hoverEdgeLimit": {
            "type": [
              "number",
              "string"
            ],
            "minimum": 1
          },
          "hover_edge_limit": {
            "type": [
              "number",
              "string"
            ],
            "minimum": 1
          }
        },
        "required": [],
        "additionalProperties": false
      },
      "examples": [
        {
          "kind": "shape-only",
          "value": {},
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "description": "Minimal JSON shape for --query."
        }
      ]
    }
  },
  "payloadSchema": {
    "type": "object",
    "properties": {
      "cursor": {
        "type": [
          "number",
          "string"
        ]
      },
      "limit": {
        "type": [
          "number",
          "string"
        ],
        "minimum": 1
      },
      "nodeCursor": {
        "type": [
          "number",
          "string"
        ]
      },
      "node_cursor": {
        "type": [
          "number",
          "string"
        ]
      },
      "nodeLimit": {
        "type": [
          "number",
          "string"
        ],
        "minimum": 1
      },
      "node_limit": {
        "type": [
          "number",
          "string"
        ],
        "minimum": 1
      },
      "edgeCursor": {
        "type": [
          "number",
          "string"
        ]
      },
      "edge_cursor": {
        "type": [
          "number",
          "string"
        ]
      },
      "edgeLimit": {
        "type": [
          "number",
          "string"
        ],
        "minimum": 1
      },
      "edge_limit": {
        "type": [
          "number",
          "string"
        ],
        "minimum": 1
      },
      "hoverNodeCursor": {
        "type": [
          "number",
          "string"
        ]
      },
      "hover_node_cursor": {
        "type": [
          "number",
          "string"
        ]
      },
      "hoverNodeLimit": {
        "type": [
          "number",
          "string"
        ],
        "minimum": 1
      },
      "hover_node_limit": {
        "type": [
          "number",
          "string"
        ],
        "minimum": 1
      },
      "hoverEdgeCursor": {
        "type": [
          "number",
          "string"
        ]
      },
      "hover_edge_cursor": {
        "type": [
          "number",
          "string"
        ]
      },
      "hoverEdgeLimit": {
        "type": [
          "number",
          "string"
        ],
        "minimum": 1
      },
      "hover_edge_limit": {
        "type": [
          "number",
          "string"
        ],
        "minimum": 1
      }
    },
    "required": [],
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
        "description": "Result data owned by citation_graph.get_overview.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed.",
        "properties": {
          "nodes": {
            "type": "array"
          },
          "pagination": {
            "type": "object",
            "properties": {
              "nodes": {
                "type": "object",
                "properties": {
                  "nextCursor": {
                    "type": [
                      "string",
                      "null"
                    ]
                  },
                  "hasMore": {
                    "type": "boolean"
                  },
                  "returned": {
                    "type": "integer",
                    "minimum": 0
                  },
                  "total": {
                    "type": "integer",
                    "minimum": 0
                  },
                  "limit": {
                    "type": "integer",
                    "minimum": 0
                  }
                },
                "additionalProperties": true
              }
            },
            "additionalProperties": true
          }
        }
      }
    },
    "additionalProperties": false
  },
  "outputBoundary": {
    "strategy": "cursor",
    "section": "data.nodes",
    "defaultLimit": 25,
    "maxLimit": 100,
    "cursorInput": "cursor",
    "continuation": [
      "data.pagination.nodes.nextCursor",
      "data.pagination.nodes.hasMore",
      "data.pagination.nodes.returned",
      "data.pagination.nodes.total",
      "data.pagination.nodes.limit"
    ]
  },
  "pagination": "cursor",
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
  "handleTransitions": [],
  "recovery": [
    {
      "when": "The read fails or returns incomplete evidence.",
      "stateCheck": "none",
      "requiresHandles": [],
      "action": "Inspect the error and retry only when retryable is true.",
      "nextCommand": "surface describe"
    }
  ],
  "targets": [
    {
      "kind": "capability",
      "target": "citation_graph.get_overview"
    }
  ],
  "operationalAliases": [
    "synthesis graph overview",
    "synthesis",
    "graph",
    "overview",
    "query",
    "JSON_OR_FILE"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `synthesis` `graph` `overview`.
- Output boundary: `cursor`; governed details: {"strategy":"cursor","section":"data.nodes","defaultLimit":25,"maxLimit":100,"cursorInput":"cursor","continuation":["data.pagination.nodes.nextCursor","data.pagination.nodes.hasMore","data.pagination.nodes.returned","data.pagination.nodes.total","data.pagination.nodes.limit"]}.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Intent visibility: `visible`.
- Operational aliases: `synthesis graph overview`, `synthesis`, `graph`, `overview`, `query`, `JSON_OR_FILE`.

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

### Handle transitions

```json
[
]
```

### Recovery

```json
[
  {
    "when": "The read fails or returns incomplete evidence.",
    "stateCheck": "none",
    "requiresHandles": [],
    "action": "Inspect the error and retry only when retryable is true.",
    "nextCommand": "surface describe"
  }
]
```

### Targets

```json
[
  {
    "kind": "capability",
    "target": "citation_graph.get_overview"
  }
]
```
