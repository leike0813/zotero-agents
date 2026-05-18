# Zotero Host Capability Broker SSOT

This document is the human-facing SSOT for how Zotero host capabilities are exposed inside Zotero Skills. It defines the relationship between legacy `handlers`, workflow `hostApi`, and future Zotero MCP tools.

## Core Model

The stable layering is:

1. Zotero native APIs are the raw host runtime.
2. `handlers` are internal mutation primitives.
3. `hostApi` is the plugin's Host Capability Broker.
4. MCP Zotero tools are JSON-safe agent-facing adapters over broker capabilities.

Future Zotero capability work should start from this model. Do not expose raw Zotero objects to MCP or workflow package boundaries unless a change explicitly updates this SSOT.

## Current Facts

`handlers` covers a finite write-oriented DSL:

- item creation, parent assignment, and removal
- parent note/attachment/related-item operations
- note create/update/remove
- attachment create/update/remove
- tag list/add/remove/replace
- collection create/delete/add/remove/replace
- a placeholder command runner

`handlers` is not a complete Zotero API facade. It does not cover search, reader state, annotations, PDF content, full-text, import/export, sync, group/library administration, citation APIs, or broader Zotero UI surfaces.

`hostApi` includes legacy workflow-facing domains:

- `items`: item lookup and broad item listing
- `prefs`: preference get/set/clear
- `file`: file conversion, text I/O, directory creation, temp path, and file pickers
- `editor`: workflow editor sessions and renderer registration
- `notifications`: toast feedback
- `logging`: runtime and diagnostic instrumentation
- handler aliases: `parents`, `notes`, `attachments`, `tags`, `collections`, `command`

`hostApi` also exposes broker-facing domains for workflow packages and MCP adapters that need JSON-safe boundaries:

- `context`: current Zotero view and selected items as DTOs
- `library`: bounded item search, item detail, notes, and attachments as DTOs
- `mutations`: preview/execute command API for controlled Zotero writes

Workflow runtime currently exposes both `runtime.handlers` and `runtime.hostApi`.

## Ownership Rules

`handlers` remains available for legacy workflow hooks. It should continue to focus on safe, tested mutation primitives and should not grow into an unbounded mirror of Zotero native APIs.

`hostApi` is the forward-facing broker. New workflow package code should prefer `runtime.hostApi`, especially for package-host-api workflows where `runtime.zotero` and `runtime.addon` may be intentionally unavailable.

MCP tools must call broker-backed capabilities and return JSON-compatible DTOs. They must not expose `Zotero.Item`, `Zotero.Collection`, `nsIFile`, DOM windows, or other host runtime objects.

## MCP Transport Boundary

The embedded Zotero MCP server is Streamable HTTP-only. It supports stateless `POST /mcp` JSON-RPC requests and notifications, does not return `Mcp-Session-Id`, and does not provide legacy SSE fallback.

Transport rules:

- ACP MCP descriptors for Zotero must use `type: "http"`.
- Authorized MCP requests must use the descriptor-provided bearer header.
  Query-string token authentication is not accepted for `POST /mcp`.
- Requests with an `Origin` header must come from localhost-compatible origins.
- `GET /mcp` is not a receive stream and should return `405 Method Not Allowed`.
- `/mcp/message` is not supported and should return `404 not_found`.
- Oversized or malformed requests should receive structured HTTP/JSON-RPC
  failures before tool handlers run.
- Backends that advertise only SSE MCP capability should not receive the Zotero MCP descriptor; diagnostics should report HTTP MCP as unavailable.

This boundary exists because real agent transcripts showed successful Zotero MCP injection followed by tool-call failures in the legacy SSE path. Future compatibility work should improve Streamable HTTP behavior rather than reintroduce SSE transport state.

## MCP Concurrency And Queue Policy

MCP clients may issue concurrent Streamable HTTP requests, but Zotero Skills v1 does not claim that Zotero host APIs are reentrant. All `tools/call` requests enter a single FIFO worker before touching Zotero host APIs. `initialize`, `tools/list`, and JSON-RPC notifications bypass this queue.

The default v1 queue policy is:

- `runningLimit`: `1`
- `pendingLimit`: `8`
- `queueTimeoutMs`: `30000`

When the queue is full, the server returns JSON-RPC error `-32001` with `data.code = "zotero_mcp_queue_full"`. When a queued request waits too long, the server returns JSON-RPC error `-32002` with `data.code = "zotero_mcp_queue_timeout"`. These are capacity failures, not tool parameter errors.

Diagnostics must expose queue policy, current queue state, queue wait time, queue position, limit reason, and tool outcome so agent failures can be distinguished from transport failures and Zotero tool errors.

## MCP Guard, Watchdog, And Circuit Breakers

The MCP queue policy protects Zotero native APIs from concurrent entry, but it does not by itself make the embedded HTTP server resilient. The server must also guard running tools, request-level failures, and repeated tool crashes.

Reliability rules:

- A running `tools/call` has a separate timeout from pending queue wait. Running timeout returns JSON-RPC error `zotero_mcp_tool_timeout`.
- A running timeout does not release the single Zotero host-call slot until the
  underlying handler settles; this preserves non-reentrant host API protection
  even after the caller has received a timeout response.
- Repeated native/runtime failures for the same tool should open a short-lived circuit breaker. Open circuits return `zotero_mcp_tool_circuit_open` with retry guidance instead of executing the tool again.
- Request listener failures should attempt a JSON-RPC fallback response before closing the transport, so clients do not only see `fetch failed` or `terminated`.
- Watchdog restarts should be diagnosable. If a restart changes the endpoint, diagnostics must mark the descriptor as stale because the active ACP agent session may need to reconnect to receive the new descriptor.
- Agents can call the `get_mcp_status` tool on the `zotero` MCP server to inspect server, queue, guard, and recent request state. The status tool must never expose bearer tokens.

These guardrails are a reliability layer around the broker; they do not change the broker boundary or permit raw Zotero access.

## Capability Domains

Read/context capabilities include current view, selected items, item search, item detail, notes, attachments, tags, and collection membership. MCP read tools should be backed by `hostApi.context` and `hostApi.library`, not by raw Zotero APIs.

Mutation capabilities include note creation, tag changes, collection membership changes, and item field updates. They may reuse `handlers` internally, but MCP exposure must go through `hostApi.mutations.preview()` and `hostApi.mutations.execute()` with an explicit permission gate before execute. Deletion, attachment writes, and other higher-risk writes require a separate change before MCP exposure.

Host services include file operations, preferences, editor sessions, notifications, and logging. These belong to `hostApi`; MCP should expose them only when a user-facing tool contract requires them.

Diagnostics/logging capabilities should remain separate from user data tools. Diagnostic bundles may reference broker state, but should continue redacting secrets and avoiding raw host objects.

UI/dialog/editor capabilities are host interactions, not agent defaults. They should be exposed to workflow hooks deliberately and to MCP only after a clear interaction model exists.

## MCP Tool Rules

The MCP server name is `zotero`, so individual tool names must not repeat that namespace. MCP tool names must describe user-facing tasks, not internal implementation names. Prefer short names like:

- `get_current_view`
- `get_selected_items`
- `search_items`
- `list_library_items`
- `get_item_detail`
- `get_item_notes`
- `get_note_detail`
- `get_item_attachments`
- `preview_mutation`
- `update_item_fields`
- `add_item_tags`
- `remove_item_tags`
- `create_child_note`
- `update_note`
- `add_items_to_collection`
- `remove_items_from_collection`

Avoid names like:

- `zotero.get_current_view`
- `handlers.parent.addNote`
- `hostApi.items.getAll`
- `zotero.raw.getItem`

Read-only tools may be enabled by default when they return bounded, JSON-safe data. Write tools must require user confirmation, configured allow policy, or another explicit permission gate.

MCP tool calls that enter Zotero native APIs should be serialized by the embedded server. Concurrent agent requests must still receive JSON-RPC responses, but they should not concurrently execute unsafe Zotero host operations.

MCP tool input schemas are enforced centrally before handlers run. Public tools
should declare `additionalProperties=false` and bounded fields where practical.
Business validation still belongs in the broker or service layer.

Large MCP responses are not reliable across all ACP backends. Tools that can return unbounded data must default to paged or chunked summaries:

- Use `list_library_items` as the preferred way to inspect a library or collection and collect parent item keys.
- Use `get_item_notes` to list note summaries and excerpts only.
- Use `get_note_detail` to read one note body in bounded chunks.
- Do not scan a library by launching concurrent `search/detail/notes` calls.
- After a write tool reports success, or if a client reports `fetch failed` after a server-side write, verify state with `get_item_detail` or `list_library_items`.

Write tools must follow this sequence:

1. Build a broker mutation request.
2. Call `hostApi.mutations.preview()` and show the summary to the user.
3. Execute only after permission confirmation.
4. Call `hostApi.mutations.execute()` and return the JSON-safe result.

MCP must not expose `handlers.*` methods directly, even when a broker mutation internally delegates to handlers.

## Attachment Access Contract

MCP attachment tools must never embed attachment file content in JSON responses. File attachments should be returned as DTOs with an `access` object:

- `access.mode`: `local-path`, `download-url`, or `unavailable`
- `access.path`: same-host localhost path, present only when directly readable by the client
- `access.url`: reserved for future remote transfer URLs
- `access.filename`, `access.contentType`, `access.size`, and `access.sha256`: manifest metadata when available
- `access.locality`: `same-host` or `remote`

The current embedded localhost server may return `access.mode = "local-path"` and a filesystem path. Future remote MCP support should use short-lived bearer-protected download URLs, ideally with byte-range support for large PDFs and attachments. MCP JSON should carry only the manifest and URL, not base64 file content. This keeps the schema stable when remote access is introduced.

## Formal MCP Tool Suite

The first formal read/context tools are:

1. `get_current_view`
2. `get_selected_items`
3. `search_items`
4. `list_library_items`
5. `get_item_detail`
6. `get_item_notes`
7. `get_note_detail`
8. `get_item_attachments`

The first formal write tools are:

1. `preview_mutation`
2. `update_item_fields`
3. `add_item_tags`
4. `remove_item_tags`
5. `create_child_note`
6. `update_note`
7. `add_items_to_collection`
8. `remove_items_from_collection`

Each write tool must use broker preview semantics and ACP permission confirmation before execute. If the permission hook is unavailable or the user denies the request, the MCP tool must return a structured non-executed result.

## Maintenance Rules

Update this SSOT in the same change when:

- `WorkflowHostApi` public surface changes.
- `handlers` public behavior changes.
- Zotero MCP tool names, inputs, or outputs change.
- MCP-exposed mutation permission policy changes.
- Workflow package runtime capability boundaries change.

This document complements `doc/components/handlers.md` and `doc/components/workflow-hook-helpers.md`. Those documents describe current APIs; this document defines the governance boundary across APIs.
