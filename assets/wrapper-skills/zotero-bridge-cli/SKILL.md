---
name: zotero-bridge-cli-wrapper
description: Guide third-party agents to use the Zotero Skills Host Bridge CLI for Zotero host access.
license: AGPL-3.0-or-later
---

# Zotero Bridge CLI Wrapper

Use this skill when an agent needs Zotero host access through the
`zotero-bridge` CLI. The CLI is the primary command-line broker for Zotero
Skills Host Bridge capabilities.

## Rules

- Use `zotero-bridge` or the run-local `./.zotero-bridge/bin/zotero-bridge`
  command. Prefer the run-local path when it exists.
- Read `ZOTERO_BRIDGE_PROFILE` when present. The profile points to the Host
  Bridge endpoint and usually references the bearer token through
  `auth.tokenEnv`.
- Never print, summarize, persist, or expose bearer token values.
- Parse stdout as exactly one JSON object. Check both the process exit code and
  the top-level `ok` field.
- Treat stderr as human-readable diagnostics only.
- Do not read Zotero databases, Zotero storage paths, plugin internals, or local
  attachment paths to bypass Host Bridge.
- Do not use MCP as a fallback for CLI failures unless the user explicitly asks
  for MCP diagnostics.

## Discovery

Run these commands first when the available surface is unclear:

```text
zotero-bridge status
zotero-bridge manifest
zotero-bridge --help
zotero-bridge item --help
zotero-bridge note --help
zotero-bridge synthesis --help
zotero-bridge workflow --help
zotero-bridge task --help
zotero-bridge file --help
```

`status` checks unauthenticated bridge health. `manifest` is authenticated and
lists the Host Bridge capabilities, workflow endpoints, file download support,
and CLI schema.

## Capability Semantics

Semantic CLI commands map to Host Bridge capabilities:

```text
status               -> diagnostic.get_status style service status
raw status           -> diagnostic.get_status
manifest             -> capability discovery and auth metadata
current view         -> context.get_current_view
selected items       -> context.get_selected_items
item search          -> library.search_items
item list/raw scan   -> library.list_items
item get             -> library.get_item_detail
item notes           -> library.get_item_notes
item attachments     -> library.get_item_attachments
note get             -> library.get_note_detail
note payloads        -> library.list_note_payloads
note payload         -> library.get_note_payload
synthesis <command>  -> synthesis.*
mutation preview     -> mutation.preview
mutation execute     -> mutation.execute
literature ingest    -> mutation.execute
call <capability>    -> raw Host Bridge capability call
```

Use raw `zotero-bridge call <capability> --input <JSON_OR_FILE>` only when the
semantic command tree does not expose the needed operation.

## Output Contract

Success:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "cli": "zotero-bridge",
    "schema": "zotero-bridge.cli.v1"
  }
}
```

Failure:

```json
{
  "ok": false,
  "error": {
    "code": "error_code",
    "category": "validation",
    "message": "Human-readable message",
    "details": {}
  },
  "meta": {
    "cli": "zotero-bridge",
    "schema": "zotero-bridge.cli.v1"
  }
}
```

Ignore unknown fields for forward compatibility.

## Common Commands

```text
zotero-bridge item search --query "topic" --limit 10
zotero-bridge item get --key ABCD1234 --library-id 1
zotero-bridge item notes --key ABCD1234 --library-id 1 --limit 20
zotero-bridge note get --key NOTE1234 --library-id 1 --format text --max-chars 4000
zotero-bridge synthesis list-topics --input '{}'
zotero-bridge synthesis get-topic-context --input '{"topicId":"topic-id"}'
zotero-bridge synthesis resolve-resolver --input @runtime/payloads/resolver.json
zotero-bridge workflow list
zotero-bridge workflow submit --workflow <id> --input @runtime/payloads/workflow.json
zotero-bridge task list --run <runId>
zotero-bridge file download file-... --output paper.pdf
```

For `synthesis resolve-resolver`, the input must be an object with a top-level
`resolver` field. Do not pass `topic_resolver`, root-level `queries`, or the
resolver object by itself.

## Approval

Read-only commands do not require approval. Write-capable operations such as
`workflow submit`, `mutation.execute`, and `literature ingest` require Zotero UI
approval. ACP Chat scoped calls are approved in the ACP Chat panel, ACP Skills
run scoped calls are approved in the ACP Skills UI, and unscoped external calls
use the global Zotero approval UI. Wait for the user decision and report denial,
timeout, or unavailability instead of retrying in a loop.
