# Zotero MCP Service Design

This document defines the agent-facing Zotero MCP service contract. It complements `doc/components/zotero-host-capability-broker-ssot.md`: the broker SSOT defines the architecture boundary, while this document defines the MCP tool suite, tool signatures, result contracts, and how tool context must be disclosed to agents.

## Design Goals

The Zotero MCP service must be useful to an ACP agent, not merely callable. Every tool result must provide enough context for the agent to choose the next tool call without guessing hidden Zotero identifiers.

The v1 contract is:

- The MCP server name is `zotero`; tool names do not repeat the namespace.
- Tools return JSON-safe DTOs only. Raw Zotero objects, DOM objects, `nsIFile`, and host runtime objects are never exposed.
- `structuredContent` is the machine-readable source of truth.
- `content[].text` is the agent-readable navigation layer. It must contain key identifiers, paging/chunking hints, and recommended next calls.
- Large data is returned by bounded lists or chunks. Tools must not return unbounded note bodies, attachment bytes, or full-library dumps.
- Write tools always go through preview, permission, execute, and verification guidance.
- Tool `inputSchema` is enforced by the server before handlers run. Unknown
  top-level fields, missing required fields, wrong types, invalid enum values,
  and declared size/range violations are rejected without entering Zotero host
  APIs.
- Local HTTP MCP requests must use `Authorization: Bearer ...`; query-string
  token authentication is intentionally not accepted.

The current registry contains Zotero read/context tools, Synthesis read tools,
one diagnostic tool, and permission-gated write tools. Four tools are
note-payload aware: `list_note_payloads`, `get_note_payload`,
`create_markdown_note`, and `update_markdown_note`. One tool is a paper-reading
context aggregator: `prepare_paper_reading_context`. Synthesis MCP tools expose
topic, resolver, registry, graph-slice, and review-input capabilities; they do
not duplicate paper artifact payload readers.

## Protocol And Transport Baseline

The local MCP transport is Streamable HTTP over `127.0.0.1`. It is stateless and
does not use MCP session ids as business state.

Stability rules:

- Only requests without an `id` are notifications. `id: null` is invalid.
- `tools/list` is generated from the registry, and `tools/call` validates the
  selected tool schema before invoking its handler.
- `GET /mcp` and legacy `/mcp/message` are not supported.
- Requests with untrusted `Origin` headers are rejected before JSON-RPC
  handling.
- Oversized request bodies are rejected before JSON parsing.
- Secure random token generation is required; the server fails closed if it
  cannot create a bearer token safely.

## Queue And Timeout Semantics

All Zotero host API `tools/call` work, except `get_mcp_status`, enters a single
FIFO worker. A running timeout returns a structured JSON-RPC timeout to the
caller, but the worker slot remains occupied until the underlying handler
settles. This prevents a timed-out Zotero call from overlapping with the next
host call.

`get_mcp_status` exposes `timedOutButStillRunning`, active tool, start time,
timeout threshold, queue state, and retry guidance without exposing bearer
tokens.

## Agent Context Disclosure Contract

Every tool result must follow these rules:

1. `content[0].text` must not be a count-only summary such as `Found 2 attachment(s).`
2. List summaries must expose stable follow-up refs:
   - item refs: `key`, `libraryId`, and `id` when available
   - note refs: `key`, `libraryId`, `id`, and parent item ref when available
   - attachment refs: `key`, `libraryId`, `id`, filename/title, access mode, and path/locality when available
3. Text summaries must include bounded excerpts when helpful, but never replace `structuredContent`.
4. Paged or chunked tools must display `cursor`, `offset`, `nextOffset`, `hasMore`, or equivalent continuation hints.
5. Error text must state what ref was attempted and which tool or ref form can recover the task.
6. Write tool text must include whether the mutation was previewed, approved, executed, and how to verify state.

Recommended text shape:

```text
<short result summary>

Items:
- key=KSM65VAD libraryId=1 id=413 type=journalArticle title="MOTR..." year=2021

Next:
- get_item_detail {"key":"KSM65VAD","libraryId":1}
- get_item_attachments {"key":"KSM65VAD","libraryId":1}
```

## Shared Reference Shapes

### Item Reference

Tools that accept an item reference accept one of:

```json
{ "id": 413 }
```

```json
{ "key": "KSM65VAD", "libraryId": 1 }
```

or a nested object in `ref`, `item`, or `target` when documented.

Agents should prefer `{ "key": "...", "libraryId": ... }` because Zotero item ids may be less portable across contexts.

### Collection Reference

Collection mutation tools accept:

```json
{ "collection": { "key": "COLLKEY", "libraryId": 1 } }
```

or `collectionId`, `collectionKey`, and optional `collectionLibraryId`.

### Attachment Access

`get_item_attachments` returns attachment manifests only. It never embeds attachment content.

```json
{
  "access": {
    "mode": "local-path",
    "path": "D:/path/to/paper.pdf",
    "url": null,
    "filename": "paper.pdf",
    "contentType": "application/pdf",
    "size": null,
    "sha256": null,
    "locality": "same-host"
  }
}
```

If an ACP agent cannot read `access.path`, v1 MCP has no formal attachment-text tool. In that case the agent must report the limitation instead of pretending it has inspected the PDF. A future change may add bounded attachment text extraction, but v1 does not define `get_item_context` or `get_attachment_text_chunk`.

Attachment manifests also include reading-oriented metadata:

- `contentRole`: `markdown-fulltext`, `text-fulltext`, `pdf`, `web-link`, `supplementary`, or `unknown`
- `readability`: `direct-text`, `local-pdf`, `web-link`, `local-file`, `unavailable`, or `unknown`
- `rank`: deterministic recommendation score
- `recommendedForReading`: true only for the best available attachment
- `recommendationReason`: short explanation for the score

Recommendation priority is Markdown full text, then TXT full text, then PDF, then web/link, then unknown. Filename signals such as `full`, `paper`, `main`, `article`, and `manuscript` increase priority; `supplement`, `appendix`, `dataset`, `figure`, `image`, and `table` decrease priority.

### Note Payload Codec

Workflow-backed notes may include hidden payload blocks:

```html
<span data-zs-block="payload" data-zs-payload="custom-markdown" data-zs-version="1" data-zs-encoding="base64" data-zs-value="..."></span>
```

The MCP note payload codec recognizes:

- markdown payloads: `custom-markdown`, `conversation-note-markdown`, `digest-markdown`
- JSON payloads: `references-json`, `citation-analysis-json`

Markdown payloads are exposed as canonical markdown. JSON payloads are readable through MCP but are not writable through markdown note tools. MCP markdown writes may create/update `custom-markdown` and `conversation-note-markdown` only.

## Read And Context Tools

### `get_current_view`

Purpose: report the active Zotero target, library, selection state, and current item metadata.

Input:

```json
{}
```

Structured content:

```json
{
  "tool": "get_current_view",
  "summary": "...",
  "hostContext": {
    "target": "library",
    "libraryId": 1,
    "selectionEmpty": false,
    "currentItem": {
      "id": 413,
      "key": "KSM65VAD",
      "libraryId": 1,
      "title": "..."
    }
  }
}
```

Text disclosure requirements:

- target and library id
- whether selection is present
- current item key, libraryId, id, title when available
- next call suggestions for selected/current item workflows

### `get_selected_items`

Purpose: return summaries for currently selected Zotero items.

Input:

```json
{}
```

Structured content:

```json
{
  "tool": "get_selected_items",
  "summary": "...",
  "items": []
}
```

Text disclosure requirements:

- number of selected items
- per item: `key`, `libraryId`, `id`, `itemType`, title, year/creators when available
- recommended next calls: `get_item_detail`, `get_item_attachments`, `get_item_notes`

### `search_items`

Purpose: search regular Zotero library items by bounded text query.

Input:

```json
{
  "query": "transformer tracking",
  "limit": 20,
  "libraryId": 1
}
```

Required: `query`.

Structured content:

```json
{
  "tool": "search_items",
  "summary": "...",
  "query": "...",
  "items": []
}
```

Text disclosure requirements:

- query and result count
- per result: item ref, item type, title, creators/year when available
- warning when results are truncated by limit
- next call suggestions for item detail and attachments

### `list_library_items`

Purpose: bounded index tool for listing parent item keys from a library, collection, tag, type, or query filter.

Input:

```json
{
  "libraryId": 1,
  "collection": { "key": "COLLKEY", "libraryId": 1 },
  "collectionId": 123,
  "collectionKey": "COLLKEY",
  "collectionLibraryId": 1,
  "tag": "object tracking",
  "itemType": "journalArticle",
  "query": "MOTR",
  "limit": 25,
  "cursor": 0
}
```

All fields are optional. `limit` defaults to 25 and is capped at 50 for MCP agent safety.

Structured content: a compact index result, including returned count, compact item refs, and continuation metadata when available. Item entries intentionally omit creators, tags, collections, abstracts, and other large metadata; use `get_item_detail` for full metadata.

Text disclosure requirements:

- filter summary
- returned count and limit/cursor
- compact item refs for every returned item
- continuation hint if more items may exist
- guidance to call `get_item_detail` for full metadata

### `get_item_detail`

Purpose: return detailed JSON-safe metadata for one Zotero item.

Input:

```json
{ "key": "KSM65VAD", "libraryId": 1 }
```

or:

```json
{ "id": 413 }
```

Structured content:

```json
{
  "tool": "get_item_detail",
  "summary": "...",
  "ref": { "key": "KSM65VAD", "libraryId": 1 },
  "item": {}
}
```

Text disclosure requirements:

- resolved item ref and title
- item type, creators, year/date, DOI/ISBN/arXiv/URL when available
- abstract excerpt when available
- tags, collections, note count, attachment count when available
- next calls for notes and attachments

### `get_item_notes`

Purpose: return bounded child note summaries/excerpts for one Zotero item. It does not return full note HTML.

Input:

```json
{
  "key": "KSM65VAD",
  "libraryId": 1,
  "limit": 20,
  "cursor": 0,
  "maxExcerptChars": 800
}
```

Structured content:

```json
{
  "tool": "get_item_notes",
  "summary": "...",
  "ref": {},
  "notes": []
}
```

Text disclosure requirements:

- parent item ref
- note count returned
- per note: note ref, title/name when available, excerpt, updated time when available
- continuation hints
- next call: `get_note_detail` with the note ref

### `get_note_detail`

Purpose: read one Zotero note body in bounded chunks.

Input:

```json
{
  "key": "NOTEKEY",
  "libraryId": 1,
  "format": "text",
  "offset": 0,
  "maxChars": 12000
}
```

`format` is `text` or `html`; default is text.

Structured content:

```json
{
  "tool": "get_note_detail",
  "summary": "...",
  "ref": {},
  "note": {
    "offset": 0,
    "nextOffset": 12000,
    "totalChars": 24000,
    "text": "..."
  }
}
```

Text disclosure requirements:

- note ref and chunk range
- `offset`, `nextOffset`, `totalChars`, and whether more chunks are available
- format used
- warning when HTML was requested and may include markup

### `list_note_payloads`

Purpose: list hidden workflow payload blocks in one Zotero note without returning full payload content.

Input:

```json
{
  "key": "NOTEKEY",
  "libraryId": 1
}
```

Structured content:

```json
{
  "tool": "list_note_payloads",
  "summary": "...",
  "ref": {},
  "payloads": [
    {
      "payloadType": "custom-markdown",
      "noteKind": "custom",
      "version": "1",
      "encoding": "base64",
      "estimatedSize": 1200,
      "format": "markdown"
    }
  ]
}
```

Text disclosure requirements:

- note ref
- per payload: `payloadType`, `noteKind`, encoding, version, estimated decoded size, format
- decoding errors when present
- next call: `get_note_payload` with the note ref and payload type

### `get_note_payload`

Purpose: decode one hidden workflow payload from a Zotero note.

Input:

```json
{
  "key": "NOTEKEY",
  "libraryId": 1,
  "payloadType": "custom-markdown",
  "offset": 0,
  "maxChars": 8000
}
```

`payloadType` is optional only when the note has a single payload. Agents should pass it explicitly when `list_note_payloads` returned more than one payload.

Structured content:

```json
{
  "tool": "get_note_payload",
  "summary": "...",
  "ref": {},
  "payload": {
    "payloadType": "custom-markdown",
    "noteKind": "custom",
    "format": "markdown",
    "markdown": "# Original Markdown",
    "content": "# Original Markdown",
    "offset": 0,
    "nextOffset": 8000,
    "totalChars": 12000,
    "hasMore": true
  }
}
```

Text disclosure requirements:

- note ref and payload type
- format, note kind, offset, nextOffset, totalChars, hasMore
- bounded content excerpt
- continuation hint when `hasMore=true`

### `get_item_attachments`

Purpose: return child attachments and remote-compatible access metadata without file contents.

Input:

```json
{ "key": "KSM65VAD", "libraryId": 1 }
```

Structured content:

```json
{
  "tool": "get_item_attachments",
  "summary": "...",
  "ref": {},
  "attachments": [
    {
      "key": "ATTACH1",
      "libraryId": 1,
      "filename": "paper.pdf",
      "contentType": "application/pdf",
      "contentRole": "pdf",
      "readability": "local-pdf",
      "rank": 335,
      "recommendedForReading": true,
      "recommendationReason": "Best available reading attachment: pdf; local-pdf; main-document filename signal; local path available",
      "access": {
        "mode": "local-path",
        "path": "D:/...",
        "locality": "same-host"
      }
    }
  ]
}
```

Text disclosure requirements:

- parent item ref
- attachment count
- recommended reading attachment when available
- per attachment: ref, title/filename, content type, `contentRole`, `readability`, `rank`, recommendation flag/reason, link mode when available, `access.mode`, `access.locality`, path or unavailable reason
- explicit limitation: file content is not returned by this tool

### `prepare_paper_reading_context`

Purpose: aggregate one paper's reading context so an agent can decide which Zotero refs and attachments to inspect next without chaining several discovery calls.

Input:

```json
{
  "key": "KSM65VAD",
  "libraryId": 1,
  "includeNotes": true,
  "includeAttachments": true,
  "includePayloads": true,
  "maxNotes": 8,
  "maxPayloadsPerNote": 5
}
```

The item ref is optional. When omitted, the tool resolves the current item first, then a single selected item. If multiple items are selected, it returns a structured error with candidate refs and does not guess.

Structured content:

```json
{
  "tool": "prepare_paper_reading_context",
  "summary": "...",
  "ref": {},
  "source": "arguments | current-view | single-selection",
  "item": {},
  "notes": [],
  "notePayloads": [
    {
      "note": {},
      "payloads": [
        {
          "payloadType": "digest-markdown",
          "readableAsMarkdown": true
        }
      ]
    }
  ],
  "attachments": [],
  "recommendedAttachment": {},
  "nextCalls": [],
  "limitations": []
}
```

Text disclosure requirements:

- resolved item ref, title, source, notes count, payload block count, attachment count
- recommended attachment ref, filename, access path, content role, readability, and recommendation reason
- note refs and payload manifest entries, especially markdown payloads
- next calls for `get_item_detail`, `get_item_attachments`, `get_note_detail`, and `get_note_payload`
- explicit limitation that attachment file content is not returned and that reader annotations are outside this tool

## Diagnostic Tool

### `get_mcp_status`

Purpose: return safe diagnostics for the embedded Zotero MCP server.

Input:

```json
{}
```

Structured content:

```json
{
  "tool": "get_mcp_status",
  "summary": "Zotero MCP status snapshot.",
  "status": {}
}
```

Text disclosure requirements:

- server state
- endpoint/transport type without bearer token
- queue state and limits
- whether a timed-out tool is still occupying the single host-call slot
- recent failure or circuit-breaker summary when present
- retry guidance for queue/timeout/circuit errors

## Synthesis MCP Boundaries

Synthesis tools are job-time host capabilities. They should return compact
navigation and diagnostics to the agent, while large paper artifacts flow through
run-workspace bundle files.

Bounded behavior:

- `synthesis.get_paper_registry` supports `paperRefs`, `cursor`, and `limit`.
- `synthesis.resolve_resolver` supports `cursor` and `limit` and returns
  `next_cursor`, `has_more`, `returned`, and `total`.
- `synthesis.get_library_index` returns a bounded paper page by default.
  `includeTags`, `includeCollections`, and `includeItems` opt into larger
  sections.
- `synthesis.get_topic_context` is summary-first. Full markdown, manifest, or
  structured artifact bodies require explicit include flags.
- `synthesis.get_review_input` enforces graph/text bounds and records truncation
  diagnostics.

## Permission-Gated Write Tools

All write tools use the same execution model:

1. Build a broker mutation request.
2. Run `hostApi.mutations.preview()`.
3. Request user permission with the preview summary.
4. Execute only when approved.
5. Return execution result and verification guidance.

### `preview_mutation`

Purpose: validate and summarize a supported Zotero write request without writing.

Input:

```json
{
  "request": {
    "operation": "item.addTags",
    "targets": [{ "key": "KSM65VAD", "libraryId": 1 }],
    "tags": ["reviewed"]
  }
}
```

Structured content:

```json
{
  "tool": "preview_mutation",
  "mutation": {},
  "preview": {},
  "executed": false
}
```

Text disclosure requirements:

- operation name
- target summary
- preview outcome
- explicit `executed=false`

### `update_item_fields`

Purpose: permission-gated update of allowed fields on one Zotero item.

Input:

```json
{
  "key": "KSM65VAD",
  "libraryId": 1,
  "fields": {
    "title": "New title"
  }
}
```

Required: item ref and non-empty `fields`.

Text disclosure requirements:

- item ref
- field names to update
- preview summary
- permission outcome
- execution outcome
- verification hint: call `get_item_detail`

### `add_item_tags`

Purpose: permission-gated tag addition for one or more Zotero items.

Input:

```json
{
  "items": [{ "key": "KSM65VAD", "libraryId": 1 }],
  "tags": ["reviewed"]
}
```

Required: `tags` plus either `items` or a single item ref.

Text disclosure requirements: target refs, tags, permission/execution outcome, and verification hint.

### `remove_item_tags`

Purpose: permission-gated tag removal for one or more Zotero items.

Input:

```json
{
  "items": [{ "key": "KSM65VAD", "libraryId": 1 }],
  "tags": ["reviewed"]
}
```

Required: `tags` plus either `items` or a single item ref.

Text disclosure requirements: target refs, tags, permission/execution outcome, and verification hint.

### `create_child_note`

Purpose: permission-gated creation of a child note under one Zotero item.

Input:

```json
{
  "parent": { "key": "KSM65VAD", "libraryId": 1 },
  "content": "<p>Note body</p>"
}
```

or an item ref plus `content`.

Required: parent item ref and non-empty content.

Text disclosure requirements: parent ref, content length/summary, permission/execution outcome, created note ref when available, and verification hint.

### `update_note`

Purpose: permission-gated update of a Zotero note body.

Input:

```json
{
  "note": { "key": "NOTEKEY", "libraryId": 1 },
  "content": "<p>Updated note body</p>"
}
```

Required: note ref and non-empty content.

Text disclosure requirements: note ref, content length/summary, permission/execution outcome, and verification hint.

### `create_markdown_note`

Purpose: permission-gated creation of a child note with rendered HTML plus a hidden base64 markdown payload.

Input:

```json
{
  "parent": { "key": "KSM65VAD", "libraryId": 1 },
  "title": "Agent Note",
  "markdown": "# Agent Note\n\nBody",
  "noteKind": "custom"
}
```

Required: parent item ref, `title`, and non-empty `markdown`.

Supported `noteKind` values:

- `custom`: writes `custom-markdown`
- `conversation-note`: writes `conversation-note-markdown`

Text disclosure requirements: parent ref, note kind, payload type, markdown length, permission/execution outcome, created note ref when available, and verification hint using `get_note_payload`.

### `update_markdown_note`

Purpose: permission-gated update of an existing markdown-backed note while preserving the hidden payload convention.

Input:

```json
{
  "note": { "key": "NOTEKEY", "libraryId": 1 },
  "title": "Updated Note",
  "markdown": "# Updated",
  "expectedPayloadType": "custom-markdown"
}
```

Required: note ref and non-empty `markdown`.

Rules:

- target note must already contain a markdown payload
- `expectedPayloadType`, when provided, must match an existing markdown payload
- JSON workflow payloads such as `references-json` and `citation-analysis-json` are read-only through MCP

Text disclosure requirements: note ref, note kind, payload type, markdown length, permission/execution outcome, and verification hint using `get_note_payload`.

### `add_items_to_collection`

Purpose: permission-gated collection membership addition.

Input:

```json
{
  "items": [{ "key": "KSM65VAD", "libraryId": 1 }],
  "collection": { "key": "COLLKEY", "libraryId": 1 }
}
```

Required: non-empty `items` and collection ref.

Text disclosure requirements: item refs, collection ref, permission/execution outcome, and verification hint.

### `remove_items_from_collection`

Purpose: permission-gated collection membership removal.

Input:

```json
{
  "items": [{ "key": "KSM65VAD", "libraryId": 1 }],
  "collection": { "key": "COLLKEY", "libraryId": 1 }
}
```

Required: non-empty `items` and collection ref.

Text disclosure requirements: item refs, collection ref, permission/execution outcome, and verification hint.

## Failure And Recovery Rules

- Unknown tools return JSON-RPC invalid params and do not execute broker calls.
- Invalid refs return a structured parameter error with the attempted ref.
- Item, note, or collection not found errors include a structured code and recovery guidance.
- Queue full, queue timeout, tool timeout, and circuit open errors are capacity/reliability failures; agents should call `get_mcp_status` or retry later rather than changing Zotero refs.
- After any write reports success, agents should verify state with `get_item_detail` or `list_library_items`.
- If a write response is lost after server-side execution, agents must verify before retrying to avoid duplicate writes.

## Maintenance Rules

Update this document whenever:

- a Zotero MCP tool is added, removed, renamed, or changes signature;
- a tool's `structuredContent` shape changes;
- the `content[].text` disclosure policy changes;
- attachment access semantics change;
- write permission policy changes.
