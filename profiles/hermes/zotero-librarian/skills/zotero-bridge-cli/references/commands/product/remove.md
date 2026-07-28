# `zotero-bridge product remove`

Remove one Dashboard Product record through Zotero approval

## Usage

```console
zotero-bridge product remove [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] PRODUCT_ID <PRODUCT_ID>
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
| PRODUCT_ID | product_id | positional | yes | — | PRODUCT_ID | no | — | — | Dashboard Product id |

## Invocation schema

```json
{
  "additionalProperties": false,
  "properties": {
    "product_id": {
      "description": "Dashboard Product id",
      "position": 1,
      "type": "string"
    }
  },
  "required": [
    "product_id"
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
    "productId": {
      "type": "string"
    }
  },
  "required": [
    "productId"
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
      "argument": "product_id",
      "field": "productId",
      "required": true,
      "transform": "trim-string"
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
      "const": "workflow_products.remove"
    },
    "data": {
      "additionalProperties": true,
      "description": "Result data owned by workflow_products.remove.",
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

No structured-input example applies. Build argv from the parameter tables and confirm the command with `surface describe` before execution.

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
      "help": "Dashboard Product id",
      "id": "product_id",
      "kind": "positional",
      "position": 1,
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "PRODUCT_ID",
      "valueNames": [
        "PRODUCT_ID"
      ]
    }
  ],
  "argv": [
    "product",
    "remove"
  ],
  "argvBindings": [
    {
      "kind": "positional",
      "position": 1,
      "property": "product_id",
      "required": true,
      "takesValue": true,
      "token": "PRODUCT_ID",
      "valueNames": [
        "PRODUCT_ID"
      ]
    }
  ],
  "binding": "object",
  "category": "write",
  "command": "product remove",
  "composition": {
    "constants": {},
    "mappings": [
      {
        "argument": "product_id",
        "field": "productId",
        "required": true,
        "transform": "trim-string"
      }
    ]
  },
  "danger": "review",
  "effects": [
    {
      "description": "May change product store state.",
      "kind": "product-store",
      "stateChanged": true
    }
  ],
  "handleTransitions": [
    {
      "condition": "Required by the command invocation.",
      "direction": "consume",
      "handle": "productId",
      "lifetime": "caller-owned",
      "required": true
    }
  ],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {},
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "product_id": {
        "description": "Dashboard Product id",
        "position": 1,
        "type": "string"
      }
    },
    "required": [
      "product_id"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "product remove",
    "product",
    "remove",
    "product_id",
    "PRODUCT_ID"
  ],
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "productId": {
        "type": "string"
      }
    },
    "required": [
      "productId"
    ],
    "type": "object"
  },
  "recovery": [
    {
      "action": "Inspect stateChange and handleConsumption before repeating the operation.",
      "nextCommand": "surface describe",
      "requiresHandles": [],
      "stateCheck": "none",
      "when": "The operation fails or completion is uncertain."
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
        "const": "workflow_products.remove"
      },
      "data": {
        "additionalProperties": true,
        "description": "Result data owned by workflow_products.remove.",
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
  "summary": "Remove one Dashboard Product record through Zotero approval",
  "targets": [
    {
      "kind": "capability",
      "target": "workflow_products.remove"
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

- Canonical argv path: `product` `remove`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Structured binding mode: `object`.
- Intent visibility: `visible`.
- Operational aliases: `product remove`, `product`, `remove`, `product_id`, `PRODUCT_ID`.

### Effects

```json
[
  {
    "description": "May change product store state.",
    "kind": "product-store",
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
    "condition": "Required by the command invocation.",
    "direction": "consume",
    "handle": "productId",
    "lifetime": "caller-owned",
    "required": true
  }
]
```

### Recovery

```json
[
  {
    "action": "Inspect stateChange and handleConsumption before repeating the operation.",
    "nextCommand": "surface describe",
    "requiresHandles": [],
    "stateCheck": "none",
    "when": "The operation fails or completion is uncertain."
  }
]
```

### Targets

```json
[
  {
    "kind": "capability",
    "target": "workflow_products.remove"
  }
]
```
