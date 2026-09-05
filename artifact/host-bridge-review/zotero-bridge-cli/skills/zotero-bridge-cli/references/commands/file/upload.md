# `zotero-bridge file upload`

Upload one local file through Zotero Bridge and return a short-lived file handle

## Usage

```console
zotero-bridge file upload [--endpoint <ENDPOINT>] [--operation-id <ID>] [--profile <PATH>] [--schema] PATH <PATH> [--display-name <DISPLAY_NAME>] [--content-type <CONTENT_TYPE>]
```

全局选项可位于叶命令之前或之后。 此叶命令没有结构化 JSON 输入。`--schema` 会返回 `command_input_schema_unavailable`；请使用命令 help 或 `surface describe` 检查调用合同。

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
| PATH | path | positional | yes | — | PATH | no | — | — | Local file path to upload |
| --display-name | display_name | option | no | — | DISPLAY_NAME | no | — | — | Display name stored in the Zotero-side file descriptor |
| --content-type | content_type | option | no | — | CONTENT_TYPE | no | — | — | Content type for the uploaded file |

## Invocation schema

```json
{
  "additionalProperties": false,
  "properties": {
    "content-type": {
      "description": "Content type for the uploaded file",
      "type": "string"
    },
    "display-name": {
      "description": "Display name stored in the Zotero-side file descriptor",
      "type": "string"
    },
    "path": {
      "description": "Local file path to upload",
      "position": 1,
      "type": "string"
    }
  },
  "required": [
    "path"
  ],
  "type": "object"
}
```

## Structured input schemas

此命令没有结构化 JSON 输入参数。

## Composed payload schema

```json
{
  "additionalProperties": false,
  "properties": {
    "content_type": {
      "description": "Content type for the uploaded file",
      "type": "string"
    },
    "display_name": {
      "description": "Display name stored in the Zotero-side file descriptor",
      "type": "string"
    },
    "path": {
      "description": "Local file path to upload",
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
    "fileId": {
      "type": "string"
    }
  },
  "type": "object",
  "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
}
```

## Examples

此命令没有适用的结构化输入示例。请依据参数表构造 argv，并在执行前使用 `surface describe` 确认命令。

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
      "help": "Local file path to upload",
      "id": "path",
      "kind": "positional",
      "position": 1,
      "possibleValues": [],
      "repeatable": false,
      "required": true,
      "takesValue": true,
      "token": "PATH",
      "valueNames": [
        "PATH"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Display name stored in the Zotero-side file descriptor",
      "id": "display_name",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--display-name",
      "valueNames": [
        "DISPLAY_NAME"
      ]
    },
    {
      "aliases": [],
      "conflictsWith": [],
      "defaultValues": [],
      "global": false,
      "help": "Content type for the uploaded file",
      "id": "content_type",
      "kind": "option",
      "possibleValues": [],
      "repeatable": false,
      "required": false,
      "takesValue": true,
      "token": "--content-type",
      "valueNames": [
        "CONTENT_TYPE"
      ]
    }
  ],
  "argv": [
    "file",
    "upload"
  ],
  "argvBindings": [
    {
      "kind": "positional",
      "position": 1,
      "property": "path",
      "required": true,
      "takesValue": true,
      "token": "PATH",
      "valueNames": [
        "PATH"
      ]
    },
    {
      "kind": "option",
      "property": "display-name",
      "required": false,
      "takesValue": true,
      "token": "--display-name",
      "valueNames": [
        "DISPLAY_NAME"
      ]
    },
    {
      "kind": "option",
      "property": "content-type",
      "required": false,
      "takesValue": true,
      "token": "--content-type",
      "valueNames": [
        "CONTENT_TYPE"
      ]
    }
  ],
  "binding": "object",
  "category": "write",
  "command": "file upload",
  "composition": null,
  "danger": "review",
  "effects": [
    {
      "description": "May change ephemeral file state.",
      "kind": "ephemeral-file",
      "stateChanged": true
    }
  ],
  "handleTransitions": [
    {
      "condition": "Returned when the corresponding operation succeeds.",
      "direction": "produce",
      "handle": "fileId",
      "lifetime": "short-lived",
      "required": false
    }
  ],
  "hiddenFromIntentSearch": false,
  "inputSchemas": {},
  "invocationSchema": {
    "additionalProperties": false,
    "properties": {
      "content-type": {
        "description": "Content type for the uploaded file",
        "type": "string"
      },
      "display-name": {
        "description": "Display name stored in the Zotero-side file descriptor",
        "type": "string"
      },
      "path": {
        "description": "Local file path to upload",
        "position": 1,
        "type": "string"
      }
    },
    "required": [
      "path"
    ],
    "type": "object"
  },
  "operationalAliases": [
    "file upload",
    "file",
    "upload",
    "path",
    "PATH",
    "display_name",
    "display-name",
    "DISPLAY_NAME",
    "content_type",
    "content-type",
    "CONTENT_TYPE"
  ],
  "outputBoundary": {
    "strategy": "fixed"
  },
  "pagination": "none",
  "payloadSchema": {
    "additionalProperties": false,
    "properties": {
      "content_type": {
        "description": "Content type for the uploaded file",
        "type": "string"
      },
      "display_name": {
        "description": "Display name stored in the Zotero-side file descriptor",
        "type": "string"
      },
      "path": {
        "description": "Local file path to upload",
        "type": "string"
      }
    },
    "required": [],
    "type": "object"
  },
  "recovery": [
    {
      "action": "Inspect stateChange and handleConsumption before repeating the operation.",
      "nextCommand": "surface describe",
      "requiresHandles": [],
      "stateCheck": "command-result",
      "when": "The operation fails or completion is uncertain."
    }
  ],
  "resultSchema": {
    "additionalProperties": true,
    "properties": {
      "fileId": {
        "type": "string"
      }
    },
    "type": "object",
    "x-openPropertiesReason": "The local endpoint returns a command-specific object whose extension fields are preserved explicitly."
  },
  "summary": "Upload one local file through Zotero Bridge and return a short-lived file handle",
  "targets": [
    {
      "kind": "endpoint",
      "target": "POST /bridge/v2/files/upload"
    }
  ]
}
```

## Parameter failure and recovery contract

Parameter failures are returned as one JSON error envelope. Inspect `error.code`, then require `error.details.schema` to be `host-bridge.argument-error.v1` before using the structured boundary fields. Preserve the canonical command, sanitized inputs, and any already-returned typed handles; never include the complete raw payload in evidence.

- `argv` reports a missing, unknown, conflicting, or invalid CLI argument. Rebuild argv from this card's parameter tables or the active command help.
- `json_source` reports an unreadable stdin or file source. Correct that source without moving the value to a different binding.
- `json_syntax` reports invalid JSON with safe line and column context. Repair syntax before interpreting domain fields.
- 该叶命令没有结构化 JSON 输入，因此 `command_input` 不是预期的调用边界。使用 `surface describe` 查看其标量与位置参数合同。
- `payload_contract` means the CLI's composed capability payload violates the executable contract before network I/O. Treat this as an implementation fault; do not bypass the semantic command with raw transport.
- `command_result` means a Host response or local result failed its executable result schema. Do not accept or report it as successful evidence.
- Violation arrays are redacted, deterministically ordered, and capped at eight. When `truncated` is true, correct the reported violations and validate again rather than requesting secret or complete payload disclosure.

## Operational contract

- 规范 argv 路径： `file` `upload`.
- Output boundary: `fixed`; governed details: {"strategy":"fixed"}.
- Pagination: `none`.
- Category: `write`; danger: `review`.
- 结构化 binding 模式： `object`.
- Intent visibility: `visible`.
- 操作别名： `file upload`, `file`, `upload`, `path`, `PATH`, `display_name`, `display-name`, `DISPLAY_NAME`, `content_type`, `content-type`, `CONTENT_TYPE`.

### Effects

```json
[
  {
    "description": "May change ephemeral file state.",
    "kind": "ephemeral-file",
    "stateChanged": true
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
  {
    "condition": "Returned when the corresponding operation succeeds.",
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
    "action": "Inspect stateChange and handleConsumption before repeating the operation.",
    "nextCommand": "surface describe",
    "requiresHandles": [],
    "stateCheck": "command-result",
    "when": "The operation fails or completion is uncertain."
  }
]
```

### Targets

```json
[
  {
    "kind": "endpoint",
    "target": "POST /bridge/v2/files/upload"
  }
]
```
