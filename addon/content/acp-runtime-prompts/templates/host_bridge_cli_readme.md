# Zotero Bridge CLI Agent Manual

This workspace can use the run-local `zotero-bridge` CLI shim to access Zotero
host capabilities through the Zotero Skills Host Bridge. Treat this file as the
local run manual: read it before using Zotero data, submitting workflows,
downloading registered files, or diagnosing Host Bridge access.

Endpoint: {ENDPOINT}
{CLI_AVAILABILITY_LINE}

## 1. Role In This Run

`./.zotero-bridge/bin/zotero-bridge` is the default Zotero host access command
for ACP skill runs. Use it instead of reading Zotero databases, Zotero storage
folders, plugin internals, or MCP descriptors.

The CLI talks to the Host Bridge over HTTP JSON with a bearer token supplied by
the run environment. The CLI is agent-first: stdout is structured JSON for
machine parsing, while stderr is reserved for human-readable hints such as
waiting for Zotero-side approval.

Do not treat MCP as the default fallback. If `zotero-bridge` is unavailable,
continue with the task using already available context unless the user asks for
diagnostics.

## 2. Runtime Configuration

The run environment should already provide:

- `ZOTERO_BRIDGE_PROFILE`: path to `.zotero-bridge/profile.json`.
- `ZOTERO_BRIDGE_TOKEN`: bearer token for this run.
- `.zotero-bridge/bin/zotero-bridge`: the run-local command shim. Prefer this
  path in commands because some agent tool shells rebuild `PATH`.
- `PATH`: may include `.zotero-bridge/bin` command shims and the bundled CLI
  directory when the CLI is available. Bare `zotero-bridge` is only a
  convenience alias when the shell preserves that PATH entry.

The profile references the token through `auth.tokenEnv` and should not contain
the token value. Never print, persist, summarize, or expose token values.

You normally do not need `--endpoint` or `--profile` because the environment and
profile are already injected. Use explicit flags only for diagnostics.

## 3. Output Contract

Every normal CLI invocation writes exactly one JSON object to stdout.

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

Parsing rules:

- Parse stdout as JSON.
- Do not parse stderr for machine decisions.
- Check both process exit code and `ok`.
- Ignore unknown fields for forward compatibility.
- Do not rely on JSON field order.

Exit code by error category:

| Category     | Exit |
| ------------ | ---: |
| `usage`      |    2 |
| `config`     |    3 |
| `connection` |    4 |
| `auth`       |    5 |
| `permission` |    6 |
| `validation` |    7 |
| `capability` |    8 |
| `workflow`   |    9 |
| `download`   |   10 |
| `protocol`   |   11 |
| `internal`   |   70 |

## 4. Quick Discovery Commands

Use these first when you need to understand the available bridge surface:

```text
./.zotero-bridge/bin/zotero-bridge status
./.zotero-bridge/bin/zotero-bridge manifest
./.zotero-bridge/bin/zotero-bridge --help
./.zotero-bridge/bin/zotero-bridge item --help
./.zotero-bridge/bin/zotero-bridge note --help
./.zotero-bridge/bin/zotero-bridge synthesis --help
./.zotero-bridge/bin/zotero-bridge literature --help
./.zotero-bridge/bin/zotero-bridge workflow --help
./.zotero-bridge/bin/zotero-bridge task --help
./.zotero-bridge/bin/zotero-bridge file --help
```

`status` checks unauthenticated Host Bridge health. `manifest` is authenticated
and lists capabilities, workflow support, file download support, and CLI
metadata.

## 5. Command Summary

In this run workspace, use `./.zotero-bridge/bin/zotero-bridge` as the command
prefix. If older examples or notes show bare `zotero-bridge`, treat that as a
convenience alias and substitute the run-local prefix when PATH does not resolve
the bare command.

Use semantic commands for normal work:

```text
zotero-bridge item search --query <text> [--limit <n>] [--library-id <id>]
zotero-bridge item get (--key <key> | --id <id>) [--library-id <id>]
zotero-bridge item notes (--key <key> | --id <id>) [--library-id <id>] [--limit <n>] [--cursor <n>] [--max-excerpt-chars <n>]
zotero-bridge item attachments (--key <key> | --id <id>) [--library-id <id>]
zotero-bridge note get (--key <key> | --id <id>) [--library-id <id>] [--format text|html] [--offset <n>] [--max-chars <n>]
zotero-bridge note payloads (--key <key> | --id <id>) [--library-id <id>]
zotero-bridge note payload (--key <key> | --id <id>) [--library-id <id>] [--payload-type <type>] [--offset <n>] [--max-chars <n>]
zotero-bridge synthesis list-topics [--input <JSON_OR_FILE>]
zotero-bridge synthesis get-topic-context [--input <JSON_OR_FILE>]
zotero-bridge synthesis get-schemas [--input <JSON_OR_FILE>]
zotero-bridge synthesis get-library-index [--input <JSON_OR_FILE>]
zotero-bridge synthesis resolve-resolver [--input <JSON_OR_FILE>]
zotero-bridge synthesis get-paper-registry [--input <JSON_OR_FILE>]
zotero-bridge synthesis query-citation-graph [--input <JSON_OR_FILE>]
zotero-bridge synthesis get-citation-graph-slice [--input <JSON_OR_FILE>]
zotero-bridge synthesis get-citation-graph-metrics [--input <JSON_OR_FILE>]
zotero-bridge synthesis get-paper-artifact-manifest [--input <JSON_OR_FILE>]
zotero-bridge synthesis read-paper-artifacts [--input <JSON_OR_FILE>]
zotero-bridge synthesis export-filtered-paper-artifacts [--input <JSON_OR_FILE>]
zotero-bridge synthesis resolve-topic-paper-digest [--input <JSON_OR_FILE>]
zotero-bridge synthesis get-review-input [--input <JSON_OR_FILE>]
zotero-bridge literature ingest --input <JSON_OR_FILE>
zotero-bridge workflow list
zotero-bridge workflow submit --workflow <id> --input <JSON_OR_FILE>
zotero-bridge workflow run <runId>
zotero-bridge task list [--workflow <id>] [--backend <id>] [--backend-type <type>] [--request <id>] [--run <runId>] [--state <state>] [--active-only]
zotero-bridge file download <fileId> --output <path> [--force]
```

Use raw capability calls only for advanced diagnostics:

```text
zotero-bridge call <capability> [--input <JSON_OR_FILE>]
```

## 6. JSON Input Arguments

`synthesis <subcommand> --input`, `literature ingest --input`, `call --input`, and
`workflow submit --input` accept `JSON_OR_FILE`.

| Value         | Meaning                              |
| ------------- | ------------------------------------ |
| omitted       | valid for `synthesis` and `call`; input is `{}` |
| `-`           | read JSON from stdin                 |
| `@file`       | read JSON from `file`                |
| existing path | read JSON from that file             |
| anything else | parse as inline JSON                 |

Common input errors:

- `input_stdin_failed`
- `input_file_unreadable`
- `input_json_invalid`

## 7. Read Synthesis Layer Data

Use `synthesis` subcommands for normal topic synthesis work. Raw capability
calls are reserved for advanced diagnostics.

Common topic synthesis commands:

```text
zotero-bridge synthesis list-topics --input '{}'
zotero-bridge synthesis get-topic-context --input '{"topicId":"topic-id"}'
zotero-bridge synthesis get-library-index --input '{"cursor":0,"limit":50}'
zotero-bridge synthesis resolve-resolver --input @runtime/payloads/resolver-input.json
zotero-bridge synthesis get-citation-graph-metrics --input @runtime/payloads/metrics-input.json
zotero-bridge synthesis export-filtered-paper-artifacts --input @runtime/payloads/export-input.json
```

Capability mapping:

| Command | Host capability |
| ------- | --------------- |
| `synthesis list-topics` | `synthesis.list_topics` |
| `synthesis get-topic-context` | `synthesis.get_topic_context` |
| `synthesis get-schemas` | `synthesis.get_schemas` |
| `synthesis get-library-index` | `synthesis.get_library_index` |
| `synthesis resolve-resolver` | `synthesis.resolve_resolver` |
| `synthesis get-paper-registry` | `synthesis.get_paper_registry` |
| `synthesis query-citation-graph` | `synthesis.query_citation_graph` |
| `synthesis get-citation-graph-slice` | `synthesis.get_citation_graph_slice` |
| `synthesis get-citation-graph-metrics` | `synthesis.get_citation_graph_metrics` |
| `synthesis get-paper-artifact-manifest` | `synthesis.get_paper_artifact_manifest` |
| `synthesis read-paper-artifacts` | `synthesis.read_paper_artifacts` |
| `synthesis export-filtered-paper-artifacts` | `synthesis.export_filtered_paper_artifacts` |
| `synthesis resolve-topic-paper-digest` | `synthesis.resolve_topic_paper_digest` |
| `synthesis get-review-input` | `synthesis.get_review_input` |

### 7.1 Ingest Searched Literature

Use `literature ingest` after the user has confirmed the final literature list.
The command accepts exactly one paper per call; when several candidates are
confirmed, write one payload file and run one command per paper.
Do not use MCP, Zotero Connector, browser automation, or raw `call
mutation.execute` for normal ingest.

Write each confirmed paper payload to a JSON file:

```json
{
  "paper": {
    "title": "Paper title",
    "authors": ["Author One"],
    "year": 2026,
    "doi": "10.1000/example",
    "landingUrl": "https://example.org/paper",
    "pdfUrl": "https://example.org/paper.pdf",
    "abstract": "Optional abstract",
    "venue": "Journal"
  },
  "collection": {
    "key": "COLLKEY",
    "libraryId": 1
  }
}
```

Then run:

```text
zotero-bridge literature ingest --input @runtime/payloads/ingest-paper-001.json
```

The CLI wraps the payload as canonical mutation operation
`literature.ingest` and asks Zotero UI for approval before writing. PDF
attachment is best-effort. The success payload includes one
`data.data.result.ingest` object with item and attachment status. Aggregate
multiple calls in the workflow result.

If approval is denied, unavailable, or times out, return a legitimate canceled
or failing workflow result instead of staying pending.

## 8. Item And Note References

Commands that target an item or note require exactly one of:

```text
--key <itemOrNoteKey>
--id <numericItemOrNoteId>
```

Use `--library-id <id>` with `--key` when a key may be ambiguous.

Mapped input shape:

```json
{
  "key": "ABCD1234",
  "libraryId": 1
}
```

or:

```json
{
  "id": 123
}
```

Missing or ambiguous refs return `missing_item_ref`.

## 9. Read Zotero Items

### Search Items

```text
zotero-bridge item search --query "graph neural network" --limit 10
```

Maps to `library.search_items`.

Returned `data.data` is an array of item summaries:

```json
[
  {
    "id": 123,
    "key": "ABCD1234",
    "libraryId": 1,
    "itemType": "journalArticle",
    "title": "Paper title",
    "creators": ["Author One"],
    "year": "2026",
    "date": "2026-05-21",
    "publicationTitle": "Journal",
    "tags": ["tag"],
    "collections": [1]
  }
]
```

### Get Item Detail

```text
zotero-bridge item get --key ABCD1234 --library-id 1
```

Maps to `library.get_item_detail`.

Returned `data.data` is an item detail or `null` if not found:

```json
{
  "id": 123,
  "key": "ABCD1234",
  "libraryId": 1,
  "itemType": "journalArticle",
  "title": "Paper title",
  "fields": {
    "title": "Paper title"
  },
  "noteCount": 1,
  "attachmentCount": 1,
  "relatedItemKeys": []
}
```

### List Item Notes

```text
zotero-bridge item notes --key ABCD1234 --library-id 1 --limit 20
```

Maps to `library.get_item_notes`.

Returned `data.data` is an array of note summaries. Use `--cursor` for
pagination and `--max-excerpt-chars` to bound excerpts.

### List Item Attachments

```text
zotero-bridge item attachments --key ABCD1234 --library-id 1
```

Maps to `library.get_item_attachments`.

Returned `data.data` is an array of attachment descriptors. When an attachment
is downloadable, it includes a broker-issued file handle:

```json
{
  "access": {
    "mode": "bridge-download",
    "file": {
      "fileId": "file-...",
      "displayName": "paper.pdf",
      "contentType": "application/pdf",
      "expiresAt": "2026-05-21T00:30:00.000Z"
    }
  }
}
```

If unavailable:

```json
{
  "access": {
    "mode": "unavailable",
    "file": null
  }
}
```

Never infer or use local attachment paths. Use `fileId` with `file download`.

## 10. Read Zotero Notes

### Get Note Content

```text
zotero-bridge note get --key NOTE1234 --library-id 1 --format text --max-chars 4000
```

Maps to `library.get_note_detail`.

Returned `data.data` is a bounded note chunk:

```json
{
  "id": 456,
  "key": "NOTE1234",
  "libraryId": 1,
  "title": "Note title",
  "format": "text",
  "content": "Note content chunk",
  "offset": 0,
  "nextOffset": 4000,
  "hasMore": true,
  "totalChars": 9000,
  "truncated": true
}
```

If `hasMore` is true, request the next chunk with `--offset <nextOffset>`.

### List Embedded Payloads

```text
zotero-bridge note payloads --key NOTE1234 --library-id 1
```

Maps to `library.list_note_payloads`.

The result is a summary list. It intentionally omits encoded values, decoded
text, full payloads, and markdown content.

### Read Embedded Payload

```text
zotero-bridge note payload --key NOTE1234 --library-id 1 --payload-type workflow-result --max-chars 4000
```

Maps to `library.get_note_payload`.

The result is one decoded payload detail. Large payloads can be chunked with
`--offset` and `--max-chars`. Ignore unknown fields.

## 11. Workflows

### List Workflows

```text
zotero-bridge workflow list
```

Returned `data`:

```json
{
  "workflows": [
    {
      "id": "workflow-id",
      "label": "Workflow Label",
      "provider": "acp",
      "version": "1.0.0",
      "sourceKind": "builtin",
      "configurable": true,
      "acceptsNoSelection": false,
      "inputUnit": "item",
      "parameters": ["language"]
    }
  ]
}
```

### Submit Workflow

```text
zotero-bridge workflow submit --workflow <id> --input workflow-input.json
```

Valid item input:

```json
{
  "items": [
    {
      "key": "ABCD1234",
      "libraryId": 1
    }
  ]
}
```

Valid no-selection input:

```json
{
  "kind": "none"
}
```

Workflow submit requires Zotero-side approval. If this run has ACP scope,
approval appears in the ACP Skills UI. The CLI waits for the user decision.
Do not attempt to approve the request yourself.

Successful `data` includes:

```json
{
  "workflowId": "workflow-id",
  "workflowLabel": "Workflow Label",
  "runId": "run-...",
  "jobIds": ["job-1"],
  "totalJobs": 1,
  "tasks": [],
  "permission": {
    "outcome": "approved",
    "requestId": "host-bridge-permission-...",
    "channel": "acp-skill-run"
  }
}
```

Common errors:

- `invalid_workflow_input`
- `workflow_not_found`
- `workflow_submit_failed`
- `permission_denied`
- `permission_timeout`
- `permission_ui_unavailable`

### Read Workflow Run

```text
zotero-bridge workflow run <runId>
```

Returned `data`:

```json
{
  "runId": "run-...",
  "found": true,
  "state": "running",
  "workflowId": "workflow-id",
  "workflowLabel": "Workflow Label",
  "tasks": [],
  "summary": {
    "total": 1,
    "queued": 0,
    "running": 1,
    "waiting_user": 0,
    "waiting_auth": 0,
    "succeeded": 0,
    "failed": 0,
    "canceled": 0
  }
}
```

Run `state` is one of:

```text
queued | running | waiting | succeeded | failed | canceled | unknown
```

## 12. Tasks

```text
zotero-bridge task list --run <runId>
zotero-bridge task list --workflow <workflowId> --active-only
```

Filter mapping:

| CLI option       | Query                  |
| ---------------- | ---------------------- |
| `--workflow`     | `workflowId`           |
| `--backend`      | `backendId`            |
| `--backend-type` | `backendType`          |
| `--request`      | `requestId`            |
| `--run`          | `runId`                |
| `--state`        | `state`                |
| `--active-only`  | `includeHistory=false` |

Returned `data`:

```json
{
  "tasks": [
    {
      "id": "task-id",
      "runId": "run-...",
      "jobId": "job-1",
      "workflowId": "workflow-id",
      "workflowLabel": "Workflow Label",
      "taskName": "Task",
      "inputUnitLabel": "paper.md",
      "providerId": "acp",
      "backendId": "backend-1",
      "backendType": "acp",
      "state": "running",
      "createdAt": "2026-05-21T00:00:00.000Z",
      "updatedAt": "2026-05-21T00:00:00.000Z",
      "source": "active"
    }
  ]
}
```

Path-like `inputUnitIdentity` is omitted. Local absolute paths inside task
errors are replaced with `[redacted-path]`.

## 13. File Downloads

Download only broker-issued file handles from Host Bridge results:

```text
zotero-bridge file download file-... --output paper.pdf
```

Rules:

- `fileId` must be opaque, not a path.
- `fileId` cannot contain `/`, `\`, `..`, or `:`.
- The command does not read arbitrary local files.
- Existing outputs are not overwritten unless `--force` is set.
- Success and error payloads expose only `outputName`, never full output paths.

Success `data`:

```json
{
  "command": "file.download",
  "fileId": "file-...",
  "outputName": "paper.pdf",
  "bytesWritten": 12345,
  "contentType": "application/pdf",
  "overwritten": false
}
```

Common errors:

- `invalid_file_id`
- `file_not_found`
- `file_handle_expired`
- `file_unavailable`
- `output_exists`
- `download_output_unwritable`

## 14. Approval Rules

No approval required:

- `status`
- `manifest`
- item and note read commands
- `mutation.preview`
- `workflow list`
- `workflow run`
- `task list`
- `file download`

Zotero-side approval required:

- `workflow submit`
- `mutation.execute`
- `literature ingest`

When approval is required, wait for the user to approve or deny in Zotero UI.
Do not simulate approval, do not retry in a loop without new information, and do
not use a write-capable alternative path.

## 15. Raw Capability Calls

Use raw capability calls only when the semantic command tree does not expose the
needed operation:

```text
zotero-bridge call diagnostic.get_status
zotero-bridge call library.list_items --input '{"limit":10}'
```

Main capabilities:

- `context.get_current_view`
- `context.get_selected_items`
- `library.search_items`
- `library.list_items`
- `library.get_item_detail`
- `library.get_item_notes`
- `library.get_note_detail`
- `library.list_note_payloads`
- `library.get_note_payload`
- `library.get_item_attachments`
- `mutation.preview`
- `mutation.execute`
- `diagnostic.get_status`

Raw call success `data`:

```json
{
  "capability": "library.list_items",
  "approval": "none",
  "data": {}
}
```

## 16. Error Handling Cheatsheet

Common configuration and connection errors:

- `config_missing_endpoint`
- `config_missing_token`
- `config_unsupported_endpoint`
- `config_invalid_endpoint`
- `bridge_unavailable`
- `unauthorized`

Common validation errors:

- `input_json_invalid`
- `input_file_unreadable`
- `missing_item_ref`
- `invalid_file_id`
- `invalid_workflow_input`

Bridge errors are nested in `error.details.bridge` when available. If you see
`permission_*`, stop and report the approval outcome. If you see
`bridge_unavailable`, do not assume MCP is available.

## 17. Prohibited Behavior

- Do not print or persist `ZOTERO_BRIDGE_TOKEN`.
- Do not inspect `.zotero-bridge/profile.json` for token values.
- Do not read Zotero SQLite, Zotero storage directories, plugin internals, or
  arbitrary local files to bypass Host Bridge.
- Do not infer local paths from item, note, attachment, task, or error data.
- Do not treat MCP as the default host access path.
- Do not approve your own workflow or mutation requests.
- Do not use `file download` with anything except broker-issued `fileId`.
