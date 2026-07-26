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
  "type": "object",
  "properties": {
    "product_id": {
      "type": "string",
      "description": "Dashboard Product id",
      "position": 1
    }
  },
  "required": [
    "product_id"
  ],
  "additionalProperties": false
}
```

## Structured input schemas

This command has no structured JSON input parameter.

## Composed payload schema

```json
{
  "type": "object",
  "properties": {
    "productId": {
      "type": "string"
    }
  },
  "required": [
    "productId"
  ],
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
      "description": "Result data owned by workflow_products.remove.",
      "additionalProperties": true,
      "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed."
    }
  },
  "additionalProperties": false
}
```

## Examples

No structured-input example applies. Build argv from the parameter tables and confirm the command with `surface describe` before execution.

## Complete command descriptor

This closed descriptor is the machine-readable command contract returned by `surface describe`; it is included here so the card remains independently auditable without loading another command reference.

```json
{
  "command": "product remove",
  "argv": [
    "product",
    "remove"
  ],
  "summary": "Remove one Dashboard Product record through Zotero approval",
  "category": "write",
  "danger": "review",
  "invocationSchema": {
    "type": "object",
    "properties": {
      "product_id": {
        "type": "string",
        "description": "Dashboard Product id",
        "position": 1
      }
    },
    "required": [
      "product_id"
    ],
    "additionalProperties": false
  },
  "arguments": [
    {
      "id": "product_id",
      "kind": "positional",
      "token": "PRODUCT_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "global": false,
      "help": "Dashboard Product id",
      "valueNames": [
        "PRODUCT_ID"
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
      "property": "product_id",
      "kind": "positional",
      "token": "PRODUCT_ID",
      "position": 1,
      "takesValue": true,
      "required": true,
      "valueNames": [
        "PRODUCT_ID"
      ]
    }
  ],
  "inputSchemas": {},
  "payloadSchema": {
    "type": "object",
    "properties": {
      "productId": {
        "type": "string"
      }
    },
    "required": [
      "productId"
    ],
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
        "description": "Result data owned by workflow_products.remove.",
        "additionalProperties": true,
        "x-openPropertiesReason": "The mapped Zotero capability owns fields inside data; the command envelope is closed."
      }
    },
    "additionalProperties": false
  },
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "effects": [
    {
      "kind": "product-store",
      "stateChanged": true,
      "description": "May change product store state."
    }
  ],
  "approvalContract": {
    "kind": "zotero-ui-required",
    "timing": "before-command",
    "scope": "Zotero UI approval for the described Zotero-managed effect."
  },
  "handleTransitions": [
    {
      "handle": "productId",
      "direction": "consume",
      "required": true,
      "condition": "Required by the command invocation.",
      "lifetime": "caller-owned"
    }
  ],
  "recovery": [
    {
      "when": "The operation fails or completion is uncertain.",
      "stateCheck": "none",
      "requiresHandles": [],
      "action": "Inspect stateChange and handleConsumption before repeating the operation.",
      "nextCommand": "surface describe"
    }
  ],
  "targets": [
    {
      "kind": "capability",
      "target": "workflow_products.remove"
    }
  ],
  "operationalAliases": [
    "product remove",
    "product",
    "remove",
    "product_id",
    "PRODUCT_ID"
  ],
  "hiddenFromIntentSearch": false
}
```

## Operational contract

- Canonical argv path: `product` `remove`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- Intent visibility: `visible`.
- Operational aliases: `product remove`, `product`, `remove`, `product_id`, `PRODUCT_ID`.

### Effects

```json
[
  {
    "kind": "product-store",
    "stateChanged": true,
    "description": "May change product store state."
  }
]
```

### Approval

```json
{
  "kind": "zotero-ui-required",
  "timing": "before-command",
  "scope": "Zotero UI approval for the described Zotero-managed effect."
}
```

### Handle transitions

```json
[
  {
    "handle": "productId",
    "direction": "consume",
    "required": true,
    "condition": "Required by the command invocation.",
    "lifetime": "caller-owned"
  }
]
```

### Recovery

```json
[
  {
    "when": "The operation fails or completion is uncertain.",
    "stateCheck": "none",
    "requiresHandles": [],
    "action": "Inspect stateChange and handleConsumption before repeating the operation.",
    "nextCommand": "surface describe"
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
