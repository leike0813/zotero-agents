# `zotero-bridge workflow agent-result validate`

Validate a local agent result directory against an output contract

## Usage

```console
zotero-bridge workflow agent-result validate [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --contract <FILE> --result <DIR_OR_ZIP>
```

The global options may appear before or after the leaf command. This leaf has no structured JSON input. `--schema` returns `command_input_schema_unavailable`; use command help or `surface describe` to inspect the invocation contract.

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
| --contract | contract | option | yes | — | FILE | no | — | — | Authoritative output-contract JSON file |
| --result | result | option | yes | — | DIR_OR_ZIP | no | — | — | Agent result directory or ZIP |

## Invocation schema

```json
{
  "additionalProperties": false,
  "properties": {
    "contract": {
      "description": "Authoritative output-contract JSON file",
      "type": "string"
    },
    "result": {
      "description": "Agent result directory or ZIP",
      "type": "string"
    }
  },
  "required": [
    "contract",
    "result"
  ],
  "type": "object"
}
```

## Structured input schemas

This command has no structured JSON input parameter.

## Composed payload schema

```json
{
  "additionalProperties": false,
  "properties": {
    "contract": {
      "description": "Authoritative output-contract JSON file",
      "type": "string"
    },
    "result": {
      "description": "Agent result directory or ZIP",
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
  "additionalProperties": true,
  "properties": {
    "response": {
      "additionalProperties": true,
      "description": "Response object returned by the derived host-bridge.agent-surface.v6.",
      "type": "object",
      "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
    }
  },
  "type": "object",
  "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
}
```

## Examples

No structured-input example applies. Build argv from the parameter tables and confirm the command with `surface describe` before execution.

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
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Authoritative output-contract JSON file",
      "id": "contract",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "--contract",
      "valueNames": [
        "FILE"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Agent result directory or ZIP",
      "id": "result",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "--result",
      "valueNames": [
        "DIR_OR_ZIP"
      ]
    }
  ],
  "argv": [
    "workflow",
    "agent-result",
    "validate"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "contract",
      "required": true,
      "takesValue": true,
      "token": "--contract",
      "valueNames": [
        "FILE"
      ]
    },
    {
      "kind": "option",
      "property": "result",
      "required": true,
      "takesValue": true,
      "token": "--result",
      "valueNames": [
        "DIR_OR_ZIP"
      ]
    }
  ],
  "binding": "none",
  "category": "read",
  "command": "workflow agent-result validate",
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
  "inputSchemas": {},
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "contract": {
        "description": "Authoritative output-contract JSON file",
        "type": "string"
      },
      "result": {
        "description": "Agent result directory or ZIP",
        "type": "string"
      }
    },
    "required": [
      "contract",
      "result"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "workflow agent-result validate",
    "workflow",
    "agent-result",
    "validate",
    "contract",
    "FILE",
    "result",
    "DIR_OR_ZIP"
  ],
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "contract": {
        "description": "Authoritative output-contract JSON file",
        "type": "string"
      },
      "result": {
        "description": "Agent result directory or ZIP",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
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
    "additionalProperties": true,
    "properties": {
      "response": {
        "additionalProperties": true,
        "description": "Response object returned by the derived host-bridge.agent-surface.v6.",
        "type": "object",
        "x-openPropertiesReason": "The mapped local endpoint or service owns fields inside response; the command envelope is closed."
      }
    },
    "type": "object",
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
  },
  "summary": "Validate a local agent result directory against an output contract",
  "targets": [
    {
      "kind": "service",
      "target": "embedded host-bridge.agent-surface.v6"
    }
  ]
}
```

## Parameter failure and recovery contract

Parameter failures are returned as one JSON error envelope. Inspect `error.code`, then require `error.details.schema` to be `host-bridge.argument-error.v1` before using the structured boundary fields. Preserve the canonical command, sanitized inputs, and any already-returned typed handles; never include the complete raw payload in evidence.

- `argv` reports a missing, unknown, conflicting, or invalid CLI argument. Rebuild argv from this card's parameter tables or the active command help.
- `json_source` reports an unreadable stdin or file source. Correct that source without moving the value to a different binding.
- `json_syntax` reports invalid JSON with safe line and column context. Repair syntax before interpreting domain fields.
- This leaf has no structured JSON input, so `command_input` is not an expected invocation boundary. Use `surface describe` for its scalar and positional contract.
- `payload_contract` means the CLI's composed capability payload violates the executable contract before network I/O. Treat this as an implementation fault; do not bypass the semantic command with raw transport.
- `command_result` means a Host response or local result failed its executable result schema. Do not accept or report it as successful evidence.
- Violation arrays are redacted, deterministically ordered, and capped at eight. When `truncated` is true, correct the reported violations and validate again rather than requesting secret or complete payload disclosure.

## Operational contract

- Canonical argv path: `workflow` `agent-result` `validate`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `read`; danger: `none`.
- Structured binding mode: `none`.
- Intent visibility: `visible`.
- Operational aliases: `workflow agent-result validate`, `workflow`, `agent-result`, `validate`, `contract`, `FILE`, `result`, `DIR_OR_ZIP`.

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
    "kind": "service",
    "target": "embedded host-bridge.agent-surface.v6"
  }
]
```
