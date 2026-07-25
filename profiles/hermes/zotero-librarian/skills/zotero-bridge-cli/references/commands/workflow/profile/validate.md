# `zotero-bridge workflow profile validate`

Validate and normalize one backend provider profile

## Usage

```console
zotero-bridge workflow profile validate [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] [--provider-profile <JSON_OR_FILE>]
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
| --provider-profile | provider_profile | option | no | — | JSON_OR_FILE | no | — | — | Provider profile JSON object; when omitted, use ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE |

## Invocation schema

```json
{
  "type": "object",
  "properties": {
    "provider-profile": {
      "type": "string",
      "description": "Provider profile JSON object; when omitted, use ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE"
    }
  },
  "required": [],
  "additionalProperties": false
}
```

## Structured input schemas

### `--provider-profile` (provider_profile)

Required: `false`.

```json
{
  "type": "object",
  "properties": {
    "backendId": {
      "type": "string",
      "minLength": 1
    },
    "backendType": {
      "enum": [
        "acp",
        "skillrunner",
        "generic-http",
        "pass-through"
      ]
    },
    "providerOptions": {
      "type": "object",
      "description": "Provider-owned options are intentionally open and are validated by the selected provider.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The selected provider owns its option vocabulary."
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
    "provider_profile": {
      "type": "string",
      "description": "Provider profile JSON object; when omitted, use ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE"
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
    "response": {
      "type": "object",
      "description": "Response object returned by POST /bridge/v1/workflows/provider-profiles/validate.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
    }
  },
  "additionalProperties": true,
  "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
}
```

## Examples

### provider_profile: shape-only

Minimal JSON shape for --provider-profile.

```console
zotero-bridge workflow profile validate --provider-profile '{}'
```

Prerequisites:

- Replace example identifiers and values with inputs valid for the selected Zotero library, workflow, provider, or capability before execution.

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

```json
{
  "command": "workflow profile validate",
  "argv": [
    "workflow",
    "profile",
    "validate"
  ],
  "summary": "Validate and normalize one backend provider profile",
  "category": "read",
  "danger": "none",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "provider-profile": {
        "type": "string",
        "description": "Provider profile JSON object; when omitted, use ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "provider_profile",
      "kind": "option",
      "token": "--provider-profile",
      "takesValue": true,
      "required": false,
      "global": false,
      "help": "Provider profile JSON object; when omitted, use ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE",
      "valueNames": [
        "JSON_OR_FILE"
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
      "property": "provider-profile",
      "kind": "option",
      "token": "--provider-profile",
      "takesValue": true,
      "required": false,
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "inputSchemas": {
    "provider_profile": {
      "token": "--provider-profile",
      "required": false,
      "requiredWhen": [],
      "schema": {
        "type": "object",
        "properties": {
          "backendId": {
            "type": "string",
            "minLength": 1
          },
          "backendType": {
            "enum": [
              "acp",
              "skillrunner",
              "generic-http",
              "pass-through"
            ]
          },
          "providerOptions": {
            "type": "object",
            "description": "Provider-owned options are intentionally open and are validated by the selected provider.",
            "additionalProperties": true,
            "x-openPropertiesReason": "The selected provider owns its option vocabulary."
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
          "description": "Minimal JSON shape for --provider-profile."
        }
      ]
    }
  },
  "payloadSchema": {
    "type": "object",
    "properties": {
      "provider_profile": {
        "type": "string",
        "description": "Provider profile JSON object; when omitted, use ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "resultSchema": {
    "type": "object",
    "properties": {
      "response": {
        "type": "object",
        "description": "Response object returned by POST /bridge/v1/workflows/provider-profiles/validate.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
      }
    },
    "additionalProperties": true,
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
  },
  "outputBoundary": {
    "strategy": "fixed"
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
      "kind": "endpoint",
      "target": "POST /bridge/v1/workflows/provider-profiles/validate"
    }
  ],
  "operationalAliases": [
    "workflow profile validate",
    "workflow",
    "profile",
    "validate",
    "provider_profile",
    "provider-profile",
    "JSON_OR_FILE"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `workflow` `profile` `validate`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Intent visibility: `visible`.
- Operational aliases: `workflow profile validate`, `workflow`, `profile`, `validate`, `provider_profile`, `provider-profile`, `JSON_OR_FILE`.

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
    "kind": "endpoint",
    "target": "POST /bridge/v1/workflows/provider-profiles/validate"
  }
]
```
