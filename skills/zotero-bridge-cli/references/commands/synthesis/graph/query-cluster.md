# `zotero-bridge synthesis graph query-cluster`

Query a topic-scoped citation graph cluster

## Usage

```console
zotero-bridge synthesis graph query-cluster [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--query <JSON_OR_FILE>]
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
    "source_paper_refs": {
      "type": "array"
    },
    "sourcePaperRefs": {
      "type": "array"
    },
    "paper_refs": {
      "type": "array"
    },
    "paperRefs": {
      "type": "array"
    },
    "paper_ref": {
      "type": "string"
    },
    "paperRef": {
      "type": "string"
    },
    "max_external_nodes": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 0
    },
    "maxExternalNodes": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 0
    },
    "max_nodes": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "maxNodes": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "max_edges": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 0
    },
    "maxEdges": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 0
    },
    "cluster_policy": {
      "type": "string"
    },
    "clusterPolicy": {
      "type": "string"
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
    "source_paper_refs": {
      "type": "array"
    },
    "sourcePaperRefs": {
      "type": "array"
    },
    "paper_refs": {
      "type": "array"
    },
    "paperRefs": {
      "type": "array"
    },
    "paper_ref": {
      "type": "string"
    },
    "paperRef": {
      "type": "string"
    },
    "max_external_nodes": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 0
    },
    "maxExternalNodes": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 0
    },
    "max_nodes": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "maxNodes": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 1
    },
    "max_edges": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 0
    },
    "maxEdges": {
      "type": [
        "number",
        "string"
      ],
      "minimum": 0
    },
    "cluster_policy": {
      "type": "string"
    },
    "clusterPolicy": {
      "type": "string"
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
      "description": "Result data owned by citation_graph.query_cluster.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed.",
      "properties": {
        "nodes": {
          "type": "array"
        },
        "diagnostics": {
          "type": "object",
          "properties": {
            "truncated": {
              "type": "boolean"
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
zotero-bridge synthesis graph query-cluster --query '{}'
```

Prerequisites:

- Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution.

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

```json
{
  "command": "synthesis graph query-cluster",
  "argv": [
    "synthesis",
    "graph",
    "query-cluster"
  ],
  "summary": "Query a topic-scoped citation graph cluster",
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
          "source_paper_refs": {
            "type": "array"
          },
          "sourcePaperRefs": {
            "type": "array"
          },
          "paper_refs": {
            "type": "array"
          },
          "paperRefs": {
            "type": "array"
          },
          "paper_ref": {
            "type": "string"
          },
          "paperRef": {
            "type": "string"
          },
          "max_external_nodes": {
            "type": [
              "number",
              "string"
            ],
            "minimum": 0
          },
          "maxExternalNodes": {
            "type": [
              "number",
              "string"
            ],
            "minimum": 0
          },
          "max_nodes": {
            "type": [
              "number",
              "string"
            ],
            "minimum": 1
          },
          "maxNodes": {
            "type": [
              "number",
              "string"
            ],
            "minimum": 1
          },
          "max_edges": {
            "type": [
              "number",
              "string"
            ],
            "minimum": 0
          },
          "maxEdges": {
            "type": [
              "number",
              "string"
            ],
            "minimum": 0
          },
          "cluster_policy": {
            "type": "string"
          },
          "clusterPolicy": {
            "type": "string"
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
      "source_paper_refs": {
        "type": "array"
      },
      "sourcePaperRefs": {
        "type": "array"
      },
      "paper_refs": {
        "type": "array"
      },
      "paperRefs": {
        "type": "array"
      },
      "paper_ref": {
        "type": "string"
      },
      "paperRef": {
        "type": "string"
      },
      "max_external_nodes": {
        "type": [
          "number",
          "string"
        ],
        "minimum": 0
      },
      "maxExternalNodes": {
        "type": [
          "number",
          "string"
        ],
        "minimum": 0
      },
      "max_nodes": {
        "type": [
          "number",
          "string"
        ],
        "minimum": 1
      },
      "maxNodes": {
        "type": [
          "number",
          "string"
        ],
        "minimum": 1
      },
      "max_edges": {
        "type": [
          "number",
          "string"
        ],
        "minimum": 0
      },
      "maxEdges": {
        "type": [
          "number",
          "string"
        ],
        "minimum": 0
      },
      "cluster_policy": {
        "type": "string"
      },
      "clusterPolicy": {
        "type": "string"
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
        "description": "Result data owned by citation_graph.query_cluster.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed.",
        "properties": {
          "nodes": {
            "type": "array"
          },
          "diagnostics": {
            "type": "object",
            "properties": {
              "truncated": {
                "type": "boolean"
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
    "strategy": "limit",
    "section": "data.nodes",
    "defaultLimit": 25,
    "maxLimit": 100,
    "truncatedField": "data.diagnostics.truncated"
  },
  "pagination": "none",
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
      "target": "citation_graph.query_cluster"
    }
  ],
  "operationalAliases": [
    "synthesis graph query-cluster",
    "synthesis",
    "graph",
    "query-cluster",
    "query",
    "JSON_OR_FILE"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `synthesis` `graph` `query-cluster`.
- Output boundary: `limit`; governed details: {"strategy":"limit","section":"data.nodes","defaultLimit":25,"maxLimit":100,"truncatedField":"data.diagnostics.truncated"}.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Intent visibility: `visible`.
- Operational aliases: `synthesis graph query-cluster`, `synthesis`, `graph`, `query-cluster`, `query`, `JSON_OR_FILE`.

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
    "target": "citation_graph.query_cluster"
  }
]
```
