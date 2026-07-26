# `zotero-bridge workflow agent-run`

Prepare a self-owned agent workflow handoff bundle

## Usage

```console
zotero-bridge workflow agent-run [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --workflow <WORKFLOW> [--selection <JSON_OR_FILE>] [--none] [--output-dir <DIR>]
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
| --workflow | workflow | option | yes | — | WORKFLOW | no | — | — | Workflow id to prepare for self-owned agent execution |
| --selection | selection | option | no | Required unless --none is supplied. | JSON_OR_FILE | no | — | none | Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin |
| --none | none | option | no | — | NONE; values: true, false | no | — | selection | Prepare a no-selection workflow |
| --output-dir | output_dir | option | no | — | DIR | no | — | — | Download the handoff zip into this directory |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "workflow": {
      "type": "string",
      "description": "Workflow id to prepare for self-owned agent execution"
    },
    "selection": {
      "type": "string",
      "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"
    },
    "none": {
      "type": "boolean",
      "description": "Prepare a no-selection workflow"
    },
    "output-dir": {
      "type": "string",
      "description": "Download the handoff zip into this directory"
    }
  },
  "required": [
    "workflow"
  ],
  "allOf": [
    {
      "not": {
        "required": [
          "selection",
          "none"
        ]
      }
    },
    {
      "oneOf": [
        {
          "required": [
            "selection"
          ]
        },
        {
          "required": [
            "none"
          ]
        }
      ]
    }
  ],
  "additionalProperties": false
}
```

## Structured input schemas

### `--selection` (selection)

Required: `false`; condition: Required unless --none is supplied..

```json
{
  "type": "array",
  "minItems": 1,
  "items": {
    "oneOf": [
      {
        "type": "string",
        "minLength": 1
      },
      {
        "type": "integer"
      },
      {
        "type": "object",
        "properties": {
          "key": {
            "type": "string",
            "minLength": 1
          },
          "id": {
            "type": [
              "integer",
              "string"
            ]
          },
          "libraryId": {
            "type": [
              "integer",
              "string"
            ]
          }
        },
        "anyOf": [
          {
            "required": [
              "key"
            ]
          },
          {
            "required": [
              "id"
            ]
          }
        ],
        "additionalProperties": false
      }
    ]
  }
}
```

## Composed payload schema

```json
{
  "type": "object",
  "properties": {
    "workflow": {
      "type": "string",
      "description": "Workflow id to prepare for self-owned agent execution"
    },
    "selection": {
      "type": "string",
      "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"
    },
    "output_dir": {
      "type": "string",
      "description": "Download the handoff zip into this directory"
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
    "agentRunId": {
      "type": "string"
    },
    "workflowId": {
      "type": "string"
    },
    "workflowLabel": {
      "type": "string"
    },
    "generatedAt": {
      "type": "string"
    },
    "expiresAt": {
      "type": "string"
    },
    "requestCount": {
      "type": "integer",
      "minimum": 0
    },
    "instruction": {
      "type": "string"
    },
    "applyStatus": {
      "type": "object"
    },
    "bundle": {
      "type": "object"
    },
    "contents": {
      "type": "object"
    },
    "notes": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "bundleInspectCommand": {
      "type": "string"
    }
  },
  "required": [
    "agentRunId",
    "workflowId",
    "expiresAt",
    "requestCount",
    "bundle",
    "bundleInspectCommand"
  ],
  "additionalProperties": false
}
```

## Examples

### selection: shape-only

Minimal JSON shape for --selection.

```console
zotero-bridge workflow agent-run --selection '["example"]'
```

Prerequisites:

- Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution.

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

```json
{
  "command": "workflow agent-run",
  "argv": [
    "workflow",
    "agent-run"
  ],
  "summary": "Prepare a self-owned agent workflow handoff bundle",
  "category": "write",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "workflow": {
        "type": "string",
        "description": "Workflow id to prepare for self-owned agent execution"
      },
      "selection": {
        "type": "string",
        "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"
      },
      "none": {
        "type": "boolean",
        "description": "Prepare a no-selection workflow"
      },
      "output-dir": {
        "type": "string",
        "description": "Download the handoff zip into this directory"
      }
    },
    "required": [
      "workflow"
    ],
    "allOf": [
      {
        "not": {
          "required": [
            "selection",
            "none"
          ]
        }
      },
      {
        "oneOf": [
          {
            "required": [
              "selection"
            ]
          },
          {
            "required": [
              "none"
            ]
          }
        ]
      }
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "workflow",
      "kind": "option",
      "token": "--workflow",
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Workflow id to prepare for self-owned agent execution",
      "valueNames": [
        "WORKFLOW"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "selection",
      "kind": "option",
      "token": "--selection",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin",
      "valueNames": [
        "JSON_OR_FILE"
      ],
      "possibleValues": [],
      "conflictsWith": [
        "none"
      ],
      "repeatable": false,
      "aliases": [
        "items"
      ],
      "defaultValues": []
    },
    {
      "id": "none",
      "kind": "option",
      "token": "--none",
      "takesValue": false,
      "required": false,
      "global": false,
      "help": "Prepare a no-selection workflow",
      "valueNames": [
        "NONE"
      ],
      "possibleValues": [
        "true",
        "false"
      ],
      "conflictsWith": [
        "selection"
      ],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    },
    {
      "id": "output_dir",
      "kind": "option",
      "token": "--output-dir",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Download the handoff zip into this directory",
      "valueNames": [
        "DIR"
      ],
      "possibleValues": [],
      "conflictsWith": [],
      "repeatable": false,
      "aliases": [],
      "defaultValues": []
    }
  ],
  "argvBindings": [
    {
      "property": "workflow",
      "kind": "option",
      "token": "--workflow",
      "takesValue": true,
      "required": true,
      "valueNames": [
        "WORKFLOW"
      ]
    },
    {
      "property": "selection",
      "kind": "option",
      "token": "--selection",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "JSON_OR_FILE"
      ]
    },
    {
      "property": "none",
      "kind": "option",
      "token": "--none",
      "takesValue": false,
      "required": false,
      "valueNames": [
        "NONE"
      ]
    },
    {
      "property": "output-dir",
      "kind": "option",
      "token": "--output-dir",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "DIR"
      ]
    }
  ],
  "inputSchemas": {
    "selection": {
      "token": "--selection",
      "required": false,
      "requiredWhen": [
        "Required unless --none is supplied."
      ],
      "schema": {
        "type": "array",
        "minItems": 1,
        "items": {
          "oneOf": [
            {
              "type": "string",
              "minLength": 1
            },
            {
              "type": "integer"
            },
            {
              "type": "object",
              "properties": {
                "key": {
                  "type": "string",
                  "minLength": 1
                },
                "id": {
                  "type": [
                    "integer",
                    "string"
                  ]
                },
                "libraryId": {
                  "type": [
                    "integer",
                    "string"
                  ]
                }
              },
              "anyOf": [
                {
                  "required": [
                    "key"
                  ]
                },
                {
                  "required": [
                    "id"
                  ]
                }
              ],
              "additionalProperties": false
            }
          ]
        }
      },
      "examples": [
        {
          "kind": "shape-only",
          "value": [
            "example"
          ],
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "description": "Minimal JSON shape for --selection."
        }
      ]
    }
  },
  "payloadSchema": {
    "type": "object",
    "properties": {
      "workflow": {
        "type": "string",
        "description": "Workflow id to prepare for self-owned agent execution"
      },
      "selection": {
        "type": "string",
        "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin"
      },
      "output_dir": {
        "type": "string",
        "description": "Download the handoff zip into this directory"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "agentRunId": {
        "type": "string"
      },
      "workflowId": {
        "type": "string"
      },
      "workflowLabel": {
        "type": "string"
      },
      "generatedAt": {
        "type": "string"
      },
      "expiresAt": {
        "type": "string"
      },
      "requestCount": {
        "type": "integer",
        "minimum": 0
      },
      "instruction": {
        "type": "string"
      },
      "applyStatus": {
        "type": "object"
      },
      "bundle": {
        "type": "object"
      },
      "contents": {
        "type": "object"
      },
      "notes": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "bundleInspectCommand": {
        "type": "string"
      }
    },
    "required": [
      "agentRunId",
      "workflowId",
      "expiresAt",
      "requestCount",
      "bundle",
      "bundleInspectCommand"
    ],
    "additionalProperties": false
  },
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "effects": [
    {
      "kind": "workflow-control",
      "stateChanged": true,
      "description": "May change workflow control state."
    }
  ],
  "approvalContract": {
    "kind": "none",
    "timing": "none",
    "scope": "No Zotero UI approval; provider runtimes may still request their own permission."
  },
  "handleTransitions": [
    {
      "handle": "itemRef",
      "direction": "consume",
      "required": false,
      "condition": "Required only for an explicit --selection input; --none carries no itemRef.",
      "lifetime": "caller-owned"
    },
    {
      "handle": "agentRunId",
      "direction": "produce",
      "required": false,
      "condition": "Returned when the corresponding operation succeeds.",
      "lifetime": "one-shot"
    },
    {
      "handle": "agentRequestId",
      "direction": "produce",
      "required": false,
      "condition": "Returned when the corresponding operation succeeds.",
      "lifetime": "response"
    },
    {
      "handle": "fileId",
      "direction": "produce",
      "required": false,
      "condition": "Returned when the corresponding operation succeeds.",
      "lifetime": "short-lived"
    }
  ],
  "recovery": [
    {
      "when": "Handoff preparation fails or its response is uncertain.",
      "stateCheck": "command-result",
      "requiresHandles": [],
      "action": "Inspect the structured error; do not enter the Zotero-managed run plane.",
      "nextCommand": "workflow describe"
    }
  ],
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v1/workflows/agent-run"
    }
  ],
  "operationalAliases": [
    "workflow agent-run",
    "workflow",
    "agent-run",
    "WORKFLOW",
    "selection",
    "JSON_OR_FILE",
    "none",
    "NONE",
    "output_dir",
    "output-dir",
    "DIR"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `workflow` `agent-run`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Intent visibility: `visible`.
- Operational aliases: `workflow agent-run`, `workflow`, `agent-run`, `WORKFLOW`, `selection`, `JSON_OR_FILE`, `none`, `NONE`, `output_dir`, `output-dir`, `DIR`.

### Effects

```json
[
  {
    "kind": "workflow-control",
    "stateChanged": true,
    "description": "May change workflow control state."
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
  {
    "handle": "itemRef",
    "direction": "consume",
    "required": false,
    "condition": "Required only for an explicit --selection input; --none carries no itemRef.",
    "lifetime": "caller-owned"
  },
  {
    "handle": "agentRunId",
    "direction": "produce",
    "required": false,
    "condition": "Returned when the corresponding operation succeeds.",
    "lifetime": "one-shot"
  },
  {
    "handle": "agentRequestId",
    "direction": "produce",
    "required": false,
    "condition": "Returned when the corresponding operation succeeds.",
    "lifetime": "response"
  },
  {
    "handle": "fileId",
    "direction": "produce",
    "required": false,
    "condition": "Returned when the corresponding operation succeeds.",
    "lifetime": "short-lived"
  }
]
```

### Recovery

```json
[
  {
    "when": "Handoff preparation fails or its response is uncertain.",
    "stateCheck": "command-result",
    "requiresHandles": [],
    "action": "Inspect the structured error; do not enter the Zotero-managed run plane.",
    "nextCommand": "workflow describe"
  }
]
```

### Targets

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v1/workflows/agent-run"
  }
]
```
