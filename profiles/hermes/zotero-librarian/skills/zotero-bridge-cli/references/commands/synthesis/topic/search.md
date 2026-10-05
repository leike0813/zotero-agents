# `zotero-bridge synthesis topic search`

Search canonical topic content

## Usage

```console
zotero-bridge synthesis topic search [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] --query <JSON_OR_FILE>
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
| --query | query | option | yes | — | JSON_OR_FILE | no | — | — | Canonical bounded topic search request JSON. Use inline JSON such as '{"query":"graph","limit":10,"maxResults":100}', a file path containing JSON, @file syntax, or '-' to read JSON from stdin. Keep the returned cursor unchanged in this same request container to continue. |

## Invocation schema

```json
{
  "additionalProperties": false,
  "properties": {
    "query": {
      "description": "Canonical bounded topic search request as JSON",
      "type": "string"
    }
  },
  "required": [
    "query"
  ],
  "type": "object"
}
```

## Structured input schemas

### `--query` (query)

Required: `true`.

```json
{
  "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/TopicSearchRequest"
}
```

## Composed payload schema

```json
{
  "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/TopicSearchRequest"
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
      "const": "topics.search"
    },
    "data": {
      "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/TopicSearchResult"
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

Canonical bounded topic search request carried intact by --query.

```console
zotero-bridge synthesis topic search --query '{"limit":25,"maxResults":100,"query":"example phrase","sections":["summary","claims"]}'
```

Prerequisites:

- Use a non-empty query no longer than 4096 UTF-16 code units; replace example section names with canonical topic sections valid for the current Synthesis data root.

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
      "help": "Canonical bounded topic search request as JSON",
      "id": "query",
      "kind": "option",
      "longHelp": "Canonical bounded topic search request JSON. Use inline JSON such as '{\"query\":\"graph\",\"limit\":10,\"maxResults\":100}', a file path containing JSON, @file syntax, or '-' to read JSON from stdin. Keep the returned cursor unchanged in this same request container to continue.",
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "--query",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "argv": [
    "synthesis",
    "topic",
    "search"
  ],
  "argvBindings": [
    {
      "kind": "option",
      "property": "query",
      "required": true,
      "takesValue": true,
      "token": "--query",
      "valueNames": [
        "JSON_OR_FILE"
      ]
    }
  ],
  "binding": "passthrough",
  "category": "read",
  "command": "synthesis topic search",
  "composition": null,
  "danger": "none",
  "effects": [
    {
      "description": "Searches bounded current canonical topic content without changing Zotero-managed data.",
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
          "description": "Canonical bounded topic search request carried intact by --query.",
          "kind": "shape-only",
          "prerequisites": [
            "Use a non-empty query no longer than 4096 UTF-16 code units; replace example section names with canonical topic sections valid for the current Synthesis data root."
          ],
          "value": {
            "limit": 25,
            "maxResults": 100,
            "query": "example phrase",
            "sections": [
              "summary",
              "claims"
            ]
          }
        }
      ],
      "required": true,
      "requiredWhen": [],
      "schema": {
        "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/TopicSearchRequest"
      },
      "schemaSource": "target-capability",
      "token": "--query"
    }
  },
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "query": {
        "description": "Canonical bounded topic search request as JSON",
        "type": "string"
      }
    },
    "required": [
      "query"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "synthesis topic search",
    "synthesis",
    "topic",
    "search",
    "query",
    "JSON_OR_FILE"
  ],
  "outputBoundary": {
    "continuation": [
      "data.nextCursor",
      "data.hasMore",
      "data.total"
    ],
    "cursorInput": "cursor",
    "defaultLimit": 25,
    "maxLimit": 100,
    "section": "data.results",
    "strategy": "cursor"
  },
  "pagination": "cursor",
  "payloadSchema": {
    "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/TopicSearchRequest"
  },
  "recovery": [
    {
      "action": "Preserve the structured search error. Do not retry or rerun with the rejected cursor; start a fresh search only when a new search is intended and inspect every returned coverage issue before claiming completeness. Run `zotero-bridge surface describe 'synthesis topic search'` to confirm the live request and cursor contract.",
      "nextCommand": "surface describe",
      "requiresHandles": [],
      "stateCheck": "none",
      "when": "The read fails or returns a stale, expired, or basis-mismatched search cursor."
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
        "const": "topics.search"
      },
      "data": {
        "$ref": "https://zotero-agents.local/synthesis/sidecar-protocol/v1/search.schema.json#/$defs/TopicSearchResult"
      }
    },
    "required": [
      "capability",
      "approval",
      "data"
    ],
    "type": "object"
  },
  "summary": "Search canonical topic content",
  "targets": [
    {
      "kind": "capability",
      "target": "topics.search"
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

- Canonical argv path: `synthesis` `topic` `search`.
- Output boundary: `cursor`; governed details: {"continuation":["data.nextCursor","data.hasMore","data.total"],"cursorInput":"cursor","defaultLimit":25,"maxLimit":100,"section":"data.results","strategy":"cursor"}.
- Pagination: `cursor`.
- Category: `read`; danger: `none`.
- Structured binding mode: `passthrough`.
- Intent visibility: `visible`.
- Operational aliases: `synthesis topic search`, `synthesis`, `topic`, `search`, `query`, `JSON_OR_FILE`.

### Effects

```json
[
  {
    "description": "Searches bounded current canonical topic content without changing Zotero-managed data.",
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
    "action": "Preserve the structured search error. Do not retry or rerun with the rejected cursor; start a fresh search only when a new search is intended and inspect every returned coverage issue before claiming completeness. Run `zotero-bridge surface describe 'synthesis topic search'` to confirm the live request and cursor contract.",
    "nextCommand": "surface describe",
    "requiresHandles": [],
    "stateCheck": "none",
    "when": "The read fails or returns a stale, expired, or basis-mismatched search cursor."
  }
]
```

### Targets

```json
[
  {
    "kind": "capability",
    "target": "topics.search"
  }
]
```
