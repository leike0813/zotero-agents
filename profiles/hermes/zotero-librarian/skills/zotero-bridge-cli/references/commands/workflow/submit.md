# `zotero-bridge workflow submit`

Submit a workflow with explicit JSON input

## Usage

```console
zotero-bridge workflow submit [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --workflow <WORKFLOW> [--selection <JSON_OR_FILE>] [--none] [--workflow-options <JSON_OR_FILE>] [--provider-profile <JSON_OR_FILE>] [--input-resource <SLOT=FILE_ID>] [--output-resource <SLOT=bridge-download>] [--max-concurrency <MAX_CONCURRENCY>]
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
| --workflow | workflow | option | yes | — | WORKFLOW | no | — | — | Workflow id to submit |
| --selection | selection | option | no | Required unless --none is supplied. | JSON_OR_FILE | no | — | none | Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin |
| --none | none | option | no | — | NONE; values: true, false | no | — | selection | Submit a no-selection workflow |
| --workflow-options | workflow_options | option | no | — | JSON_OR_FILE | no | — | — | Workflow options JSON object, file path, @file, or '-' for stdin |
| --provider-profile | provider_profile | option | no | — | JSON_OR_FILE | no | — | — | Provider profile JSON object with backendId and providerOptions |
| --input-resource | input_resource | option | no | — | SLOT=FILE_ID | yes | — | — | Bind an uploaded opaque file handle to a workflow input resource slot; repeat for multiple files |
| --output-resource | output_resource | option | no | — | SLOT=bridge-download | yes | — | — | Request bridge-download delivery for a workflow output resource slot |
| --max-concurrency | max_concurrency | option | no | — | MAX_CONCURRENCY | no | — | — | Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited |

## Invocation schema

```json
{
  "additionalProperties": false,
  "allOf": [
    {
      "not": {
        "required": [
          "none",
          "selection"
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
  "properties": {
    "input-resource": {
      "description": "Bind an uploaded opaque file handle to a workflow input resource slot; repeat for multiple files",
      "items": {
        "type": "string"
      },
      "type": "array"
    },
    "max-concurrency": {
      "description": "Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited",
      "type": "string"
    },
    "none": {
      "description": "Submit a no-selection workflow",
      "type": "boolean"
    },
    "output-resource": {
      "description": "Request bridge-download delivery for a workflow output resource slot",
      "items": {
        "type": "string"
      },
      "type": "array"
    },
    "provider-profile": {
      "description": "Provider profile JSON object with backendId and providerOptions",
      "type": "string"
    },
    "selection": {
      "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin",
      "type": "string"
    },
    "workflow": {
      "description": "Workflow id to submit",
      "type": "string"
    },
    "workflow-options": {
      "description": "Workflow options JSON object, file path, @file, or '-' for stdin",
      "type": "string"
    }
  },
  "required": [
    "workflow"
  ],
  "type": "object"
}
```

## Structured input schemas

### `--input-resource` (input_resource)

Required: `false`.

```json
{
  "description": "One workflow resource slot and opaque handle returned by file upload. Repeat the flag to bind multiple files in order.",
  "pattern": "^[A-Za-z0-9._-]+=file-[A-Za-z0-9-]+$",
  "type": "string"
}
```

### `--output-resource` (output_resource)

Required: `false`.

```json
{
  "description": "One workflow output slot whose completed artifact is returned as an opaque download descriptor.",
  "pattern": "^[A-Za-z0-9._-]+=bridge-download$",
  "type": "string"
}
```

### `--provider-profile` (provider_profile)

Required: `false`.

```json
{
  "additionalProperties": false,
  "properties": {
    "backendId": {
      "minLength": 1,
      "type": "string"
    },
    "providerOptions": {
      "additionalProperties": true,
      "description": "Provider-owned options are intentionally open and are validated by the selected provider.",
      "type": "object",
      "x-openPropertiesReason": "The selected provider owns its option vocabulary."
    },
    "schema": {
      "const": "zotero-bridge.provider-profile.v1"
    }
  },
  "required": [],
  "type": "object"
}
```

### `--selection` (selection)

Required: `false`; condition: Required unless --none is supplied..

```json
{
  "items": {
    "oneOf": [
      {
        "minLength": 1,
        "type": "string"
      },
      {
        "type": "integer"
      },
      {
        "additionalProperties": false,
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
        "properties": {
          "id": {
            "type": [
              "integer",
              "string"
            ]
          },
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
        "type": "object"
      }
    ]
  },
  "minItems": 1,
  "type": "array"
}
```

### `--workflow-options` (workflow_options)

Required: `false`.

```json
{
  "additionalProperties": true,
  "description": "Workflow-declared option values are intentionally open and are validated by the selected workflow.",
  "type": "object",
  "x-openPropertiesReason": "The selected workflow manifest owns its option vocabulary."
}
```

## Composed payload schema

```json
{
  "additionalProperties": false,
  "properties": {
    "input_resource": {
      "description": "Repeatable workflow input resource binding in SLOT=FILE_ID form",
      "type": "string"
    },
    "max_concurrency": {
      "description": "Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited",
      "type": "string"
    },
    "output_resource": {
      "description": "Workflow output resource delivery binding in SLOT=bridge-download form",
      "type": "string"
    },
    "provider_profile": {
      "description": "Provider profile JSON object with backendId and providerOptions",
      "type": "string"
    },
    "selection": {
      "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin",
      "type": "string"
    },
    "workflow": {
      "description": "Workflow id to submit",
      "type": "string"
    },
    "workflow_options": {
      "description": "Workflow options JSON object, file path, @file, or '-' for stdin",
      "type": "string"
    }
  },
  "required": [],
  "type": "object"
}
```

## Payload composition

This command has no separate field-mapping program. Its binding mode is executable directly: passthrough uses the sole structured source, while `none` and `raw` retain their declared closed behavior.

`composition`: `null`.

## Result schema

```json
{
  "additionalProperties": false,
  "oneOf": [
    {
      "properties": {
        "admission": {
          "const": "direct"
        }
      },
      "required": [
        "workflowRunId",
        "totalJobs",
        "runUrl",
        "tasksUrl"
      ]
    },
    {
      "properties": {
        "admission": {
          "const": "host-queue"
        }
      },
      "required": [
        "submissionId",
        "totalUnits",
        "queuedUnits",
        "skippedUnits",
        "submissionUrl",
        "queueUrl"
      ]
    }
  ],
  "properties": {
    "admission": {
      "enum": [
        "direct",
        "host-queue"
      ]
    },
    "permission": {
      "type": "object"
    },
    "queueUrl": {
      "type": "string"
    },
    "queuedUnits": {
      "type": "integer"
    },
    "resourceOutputs": {
      "items": {
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
          "downloadCommand": {
            "type": "string"
          },
          "expiresAt": {
            "type": "string"
          },
          "fileId": {
            "pattern": "^file-[A-Za-z0-9-]+$",
            "type": "string"
          },
          "sha256": {
            "pattern": "^sha256:[a-f0-9]{64}$",
            "type": "string"
          },
          "size": {
            "minimum": 0,
            "type": "integer"
          },
          "slotId": {
            "minLength": 1,
            "type": "string"
          },
          "sourceKind": {
            "const": "workflow-artifact"
          }
        },
        "required": [
          "slotId",
          "fileId",
          "sourceKind",
          "displayName",
          "contentType",
          "createdAt",
          "expiresAt",
          "downloadCommand"
        ],
        "type": "object"
      },
      "type": "array"
    },
    "runUrl": {
      "type": "string"
    },
    "skippedUnits": {
      "type": "integer"
    },
    "submissionId": {
      "type": "string"
    },
    "submissionUrl": {
      "type": "string"
    },
    "tasksUrl": {
      "type": "string"
    },
    "totalJobs": {
      "type": "integer"
    },
    "totalUnits": {
      "type": "integer"
    },
    "workflowId": {
      "type": "string"
    },
    "workflowLabel": {
      "type": "string"
    },
    "workflowRunId": {
      "type": "string"
    }
  },
  "required": [
    "workflowId",
    "workflowLabel",
    "admission",
    "permission",
    "resourceOutputs"
  ],
  "type": "object"
}
```

## Examples

### input_resource: shape-only

Bind one uploaded file to the source slot.

```console
zotero-bridge workflow submit --input-resource 'source=file-example'
```

Prerequisites:

- Run file upload first and replace file-example with the returned opaque fileId.

### output_resource: shape-only

Request bridge-download delivery for the result slot.

```console
zotero-bridge workflow submit --output-resource 'result=bridge-download'
```

### provider_profile: shape-only

Minimal JSON shape for --provider-profile.

```console
zotero-bridge workflow submit --provider-profile '{}'
```

Prerequisites:

- Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution.

### selection: shape-only

Minimal JSON shape for --selection.

```console
zotero-bridge workflow submit --selection '["example"]'
```

Prerequisites:

- Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution.

### workflow_options: shape-only

Minimal JSON shape for --workflow-options.

```console
zotero-bridge workflow submit --workflow-options '{}'
```

Prerequisites:

- Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution.

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

```json
{
  "approvalContract": {
    "kind": "zotero-ui-required",
    "scope": "Zotero UI approval for the described Zotero-managed effect.",
    "timing": "before-command"
  },
  "arguments": [
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Workflow id to submit",
      "id": "workflow",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "--workflow",
      "valueNames": [
        "WORKFLOW"
      ]
    },
    {
      "aliases": [
        "items"
      ],
      "conflictsWith": [
        "none"
      ],
      "defaultValues": [],
      "global": false,
      "help": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin",
      "id": "selection",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--selection",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [
        "selection"
      ],
      "defaultValues": [],
      "global": false,
      "help": "Submit a no-selection workflow",
      "id": "none",
      "kind": "option",
      "possibleValues": [
        "true",
        "false"
      ],
      "repeatable": false,
      "required": false,
      "takesValue": false,
      "token": "--none",
      "valueNames": [
        "NONE"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Workflow options JSON object, file path, @file, or '-' for stdin",
      "id": "workflow_options",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--workflow-options",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Provider profile JSON object with backendId and providerOptions",
      "id": "provider_profile",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--provider-profile",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Bind an uploaded opaque file handle to a workflow input resource slot; repeat for multiple files",
      "id": "input_resource",
      "kind": "option",
      "possibleValues": [],
      "repeatable": true,
      "required": false,
      "takesValue": true,
      "token": "--input-resource",
      "valueNames": [
        "SLOT=FILE_ID"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Request bridge-download delivery for a workflow output resource slot",
      "id": "output_resource",
      "kind": "option",
      "possibleValues": [],
      "repeatable": true,
      "required": false,
      "takesValue": true,
      "token": "--output-resource",
      "valueNames": [
        "SLOT=bridge-download"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited",
      "id": "max_concurrency",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--max-concurrency",
      "valueNames": [
        "MAX_CONCURRENCY"
      ]
    }
  ],
  "argv": [
    "workflow",
    "submit"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "workflow",
      "required": true,
      "takesValue": true,
      "token": "--workflow",
      "valueNames": [
        "WORKFLOW"
      ]
    },
    {
      "kind": "option",
      "property": "selection",
      "required": false,
      "takesValue": true,
      "token": "--selection",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    },
    {
      "kind": "option",
      "property": "none",
      "required": false,
      "takesValue": false,
      "token": "--none",
      "valueNames": [
        "NONE"
      ]
    },
    {
      "kind": "option",
      "property": "workflow-options",
      "required": false,
      "takesValue": true,
      "token": "--workflow-options",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    },
    {
      "kind": "option",
      "property": "provider-profile",
      "required": false,
      "takesValue": true,
      "token": "--provider-profile",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    },
    {
      "kind": "option",
      "property": "input-resource",
      "required": false,
      "takesValue": true,
      "token": "--input-resource",
      "valueNames": [
        "SLOT=FILE_ID"
      ]
    },
    {
      "kind": "option",
      "property": "output-resource",
      "required": false,
      "takesValue": true,
      "token": "--output-resource",
      "valueNames": [
        "SLOT=bridge-download"
      ]
    },
    {
      "kind": "option",
      "property": "max-concurrency",
      "required": false,
      "takesValue": true,
      "token": "--max-concurrency",
      "valueNames": [
        "MAX_CONCURRENCY"
      ]
    }
  ],
  "binding": "overlay",
  "category": "write",
  "command": "workflow submit",
  "composition": null,
  "danger": "review",
  "effects": [
    {
      "description": "May change workflow control state.",
      "kind": "workflow-control",
      "stateChanged": true
    }
  ],
  "handleTransitions": [
    {
      "condition": "Required only for an explicit --selection input; --none carries no itemRef.",
      "direction": "consume",
      "handle": "itemRef",
      "lifetime": "caller-owned",
      "required": false
    },
    {
      "condition": "Consumed only when supplied through --input-resource after file upload.",
      "direction": "consume",
      "handle": "fileId",
      "lifetime": "one-shot",
      "required": false
    },
    {
      "condition": "Returned when direct admission starts workflow jobs.",
      "direction": "produce",
      "handle": "workflowRunId",
      "lifetime": "response",
      "required": false
    },
    {
      "condition": "Returned when ACP or SkillRunner units enter the Zotero-managed Host queue.",
      "direction": "produce",
      "handle": "submissionId",
      "lifetime": "response",
      "required": false
    },
    {
      "condition": "Returned in resourceOutputs when a bound output slot is published.",
      "direction": "produce",
      "handle": "fileId",
      "lifetime": "short-lived",
      "required": false
    }
  ],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {
    "input_resource": {
      "examples": [
        {
          "description": "Bind one uploaded file to the source slot.",
          "kind": "shape-only",
          "prerequisites": [
            "Run file upload first and replace file-example with the returned opaque fileId."
          ],
          "value": "source=file-example"
        }
      ],
      "required": false,
      "requiredWhen": [],
      "schema": {
        "description": "One workflow resource slot and opaque handle returned by file upload. Repeat the flag to bind multiple files in order.",
        "pattern": "^[A-Za-z0-9._-]+=file-[A-Za-z0-9-]+$",
        "type": "string"
      },
      "schemaSource": "inline",
      "token": "--input-resource"
    },
    "output_resource": {
      "examples": [
        {
          "description": "Request bridge-download delivery for the result slot.",
          "kind": "shape-only",
          "prerequisites": [],
          "value": "result=bridge-download"
        }
      ],
      "required": false,
      "requiredWhen": [],
      "schema": {
        "description": "One workflow output slot whose completed artifact is returned as an opaque download descriptor.",
        "pattern": "^[A-Za-z0-9._-]+=bridge-download$",
        "type": "string"
      },
      "schemaSource": "inline",
      "token": "--output-resource"
    },
    "provider_profile": {
      "examples": [
        {
          "description": "Minimal JSON shape for --provider-profile.",
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
        "additionalProperties": false,
        "properties": {
          "backendId": {
            "minLength": 1,
            "type": "string"
          },
          "providerOptions": {
            "additionalProperties": true,
            "description": "Provider-owned options are intentionally open and are validated by the selected provider.",
            "type": "object",
            "x-openPropertiesReason": "The selected provider owns its option vocabulary."
          },
          "schema": {
            "const": "zotero-bridge.provider-profile.v1"
          }
        },
        "required": [],
        "type": "object"
      },
      "schemaSource": "inline",
      "token": "--provider-profile"
    },
    "selection": {
      "examples": [
        {
          "description": "Minimal JSON shape for --selection.",
          "kind": "shape-only",
          "prerequisites": [
            "Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution."
          ],
          "value": [
            "example"
          ]
        }
      ],
      "required": false,
      "requiredWhen": [
        "Required unless --none is supplied."
      ],
      "schema": {
        "items": {
          "oneOf": [
            {
              "minLength": 1,
              "type": "string"
            },
            {
              "type": "integer"
            },
            {
              "additionalProperties": false,
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
              "properties": {
                "id": {
                  "type": [
                    "integer",
                    "string"
                  ]
                },
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
              "type": "object"
            }
          ]
        },
        "minItems": 1,
        "type": "array"
      },
      "schemaSource": "inline",
      "token": "--selection"
    },
    "workflow_options": {
      "examples": [
        {
          "description": "Minimal JSON shape for --workflow-options.",
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
        "description": "Workflow-declared option values are intentionally open and are validated by the selected workflow.",
        "type": "object",
        "x-openPropertiesReason": "The selected workflow manifest owns its option vocabulary."
      },
      "schemaSource": "inline",
      "token": "--workflow-options"
    }
  },
  "invocationSchema": {
    "additionalProperties": false,
    "allOf": [
      {
        "not": {
          "required": [
            "none",
            "selection"
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
    "properties": {
      "input-resource": {
        "description": "Bind an uploaded opaque file handle to a workflow input resource slot; repeat for multiple files",
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "max-concurrency": {
        "description": "Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited",
        "type": "string"
      },
      "none": {
        "description": "Submit a no-selection workflow",
        "type": "boolean"
      },
      "output-resource": {
        "description": "Request bridge-download delivery for a workflow output resource slot",
        "items": {
          "type": "string"
        },
        "type": "array"
      },
      "provider-profile": {
        "description": "Provider profile JSON object with backendId and providerOptions",
        "type": "string"
      },
      "selection": {
        "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin",
        "type": "string"
      },
      "workflow": {
        "description": "Workflow id to submit",
        "type": "string"
      },
      "workflow-options": {
        "description": "Workflow options JSON object, file path, @file, or '-' for stdin",
        "type": "string"
      }
    },
    "required": [
      "workflow"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "workflow submit",
    "workflow",
    "submit",
    "WORKFLOW",
    "selection",
    "JSON_OR_FILE",
    "none",
    "NONE",
    "workflow_options",
    "workflow-options",
    "provider_profile",
    "provider-profile",
    "input_resource",
    "input-resource",
    "SLOT=FILE_ID",
    "output_resource",
    "output-resource",
    "SLOT=bridge-download",
    "max_concurrency",
    "max-concurrency",
    "MAX_CONCURRENCY"
  ],
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "input_resource": {
        "description": "Repeatable workflow input resource binding in SLOT=FILE_ID form",
        "type": "string"
      },
      "max_concurrency": {
        "description": "Maximum concurrently admitted units for this native Host queue submission; 0 means unlimited",
        "type": "string"
      },
      "output_resource": {
        "description": "Workflow output resource delivery binding in SLOT=bridge-download form",
        "type": "string"
      },
      "provider_profile": {
        "description": "Provider profile JSON object with backendId and providerOptions",
        "type": "string"
      },
      "selection": {
        "description": "Workflow selection item refs as a JSON array, file path, @file, or '-' for stdin",
        "type": "string"
      },
      "workflow": {
        "description": "Workflow id to submit",
        "type": "string"
      },
      "workflow_options": {
        "description": "Workflow options JSON object, file path, @file, or '-' for stdin",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "recovery": [
    {
      "action": "Treat the process-local transfer handle as invalid, upload the input again, and validate fresh bindings before any replacement submission.",
      "nextCommand": "file upload",
      "requiresHandles": [],
      "stateCheck": "none",
      "when": "An input resource fileId is unavailable after expiry or service restart."
    },
    {
      "action": "Inspect the active native submission without inventing a workflow run id.",
      "nextCommand": "workflow submission get",
      "requiresHandles": [
        "submissionId"
      ],
      "stateCheck": "caller-held-handle",
      "when": "The response reports host-queue admission or queued progress is uncertain."
    },
    {
      "action": "Inspect the returned workflow run before repeating submission.",
      "nextCommand": "run get",
      "requiresHandles": [
        "workflowRunId"
      ],
      "stateCheck": "caller-held-handle",
      "when": "The response reports direct admission and run progress is uncertain."
    }
  ],
  "resultSchema": {
    "additionalProperties": false,
    "oneOf": [
      {
        "properties": {
          "admission": {
            "const": "direct"
          }
        },
        "required": [
          "workflowRunId",
          "totalJobs",
          "runUrl",
          "tasksUrl"
        ]
      },
      {
        "properties": {
          "admission": {
            "const": "host-queue"
          }
        },
        "required": [
          "submissionId",
          "totalUnits",
          "queuedUnits",
          "skippedUnits",
          "submissionUrl",
          "queueUrl"
        ]
      }
    ],
    "properties": {
      "admission": {
        "enum": [
          "direct",
          "host-queue"
        ]
      },
      "permission": {
        "type": "object"
      },
      "queueUrl": {
        "type": "string"
      },
      "queuedUnits": {
        "type": "integer"
      },
      "resourceOutputs": {
        "items": {
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
            "downloadCommand": {
              "type": "string"
            },
            "expiresAt": {
              "type": "string"
            },
            "fileId": {
              "pattern": "^file-[A-Za-z0-9-]+$",
              "type": "string"
            },
            "sha256": {
              "pattern": "^sha256:[a-f0-9]{64}$",
              "type": "string"
            },
            "size": {
              "minimum": 0,
              "type": "integer"
            },
            "slotId": {
              "minLength": 1,
              "type": "string"
            },
            "sourceKind": {
              "const": "workflow-artifact"
            }
          },
          "required": [
            "slotId",
            "fileId",
            "sourceKind",
            "displayName",
            "contentType",
            "createdAt",
            "expiresAt",
            "downloadCommand"
          ],
          "type": "object"
        },
        "type": "array"
      },
      "runUrl": {
        "type": "string"
      },
      "skippedUnits": {
        "type": "integer"
      },
      "submissionId": {
        "type": "string"
      },
      "submissionUrl": {
        "type": "string"
      },
      "tasksUrl": {
        "type": "string"
      },
      "totalJobs": {
        "type": "integer"
      },
      "totalUnits": {
        "type": "integer"
      },
      "workflowId": {
        "type": "string"
      },
      "workflowLabel": {
        "type": "string"
      },
      "workflowRunId": {
        "type": "string"
      }
    },
    "required": [
      "workflowId",
      "workflowLabel",
      "admission",
      "permission",
      "resourceOutputs"
    ],
    "type": "object"
  },
  "summary": "Submit a workflow with explicit JSON input",
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v2/workflows/submit"
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

- Canonical argv path: `workflow` `submit`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Structured binding mode: `overlay`.
- Intent visibility: `visible`.
- Operational aliases: `workflow submit`, `workflow`, `submit`, `WORKFLOW`, `selection`, `JSON_OR_FILE`, `none`, `NONE`, `workflow_options`, `workflow-options`, `provider_profile`, `provider-profile`, `input_resource`, `input-resource`, `SLOT=FILE_ID`, `output_resource`, `output-resource`, `SLOT=bridge-download`, `max_concurrency`, `max-concurrency`, `MAX_CONCURRENCY`.

### Effects

```json
[
  {
    "description": "May change workflow control state.",
    "kind": "workflow-control",
    "stateChanged": true
  }
]
```

### Approval

```json
{
  "kind": "zotero-ui-required",
  "scope": "Zotero UI approval for the described Zotero-managed effect.",
  "timing": "before-command"
}
```

### Handle transitions

```json
[
  {
    "condition": "Required only for an explicit --selection input; --none carries no itemRef.",
    "direction": "consume",
    "handle": "itemRef",
    "lifetime": "caller-owned",
    "required": false
  },
  {
    "condition": "Consumed only when supplied through --input-resource after file upload.",
    "direction": "consume",
    "handle": "fileId",
    "lifetime": "one-shot",
    "required": false
  },
  {
    "condition": "Returned when direct admission starts workflow jobs.",
    "direction": "produce",
    "handle": "workflowRunId",
    "lifetime": "response",
    "required": false
  },
  {
    "condition": "Returned when ACP or SkillRunner units enter the Zotero-managed Host queue.",
    "direction": "produce",
    "handle": "submissionId",
    "lifetime": "response",
    "required": false
  },
  {
    "condition": "Returned in resourceOutputs when a bound output slot is published.",
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
    "action": "Treat the process-local transfer handle as invalid, upload the input again, and validate fresh bindings before any replacement submission.",
    "nextCommand": "file upload",
    "requiresHandles": [],
    "stateCheck": "none",
    "when": "An input resource fileId is unavailable after expiry or service restart."
  },
  {
    "action": "Inspect the active native submission without inventing a workflow run id.",
    "nextCommand": "workflow submission get",
    "requiresHandles": [
      "submissionId"
    ],
    "stateCheck": "caller-held-handle",
    "when": "The response reports host-queue admission or queued progress is uncertain."
  },
  {
    "action": "Inspect the returned workflow run before repeating submission.",
    "nextCommand": "run get",
    "requiresHandles": [
      "workflowRunId"
    ],
    "stateCheck": "caller-held-handle",
    "when": "The response reports direct admission and run progress is uncertain."
  }
]
```

### Targets

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v2/workflows/submit"
  }
]
```
