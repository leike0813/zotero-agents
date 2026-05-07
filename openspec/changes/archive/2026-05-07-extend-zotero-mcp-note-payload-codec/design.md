# Design

## Scope

This change adds workflow-aware note payload support to the Zotero MCP service. The first version intentionally separates raw note HTML tools from payload-aware tools: agents can keep using `get_note_detail`, `create_child_note`, and `update_note` for raw HTML, while new tools handle canonical workflow payloads.

## Payload Codec

The shared codec reads and writes the existing hidden payload convention:

- wrapper: `data-zs-note-kind`
- rendered view: `data-zs-view`
- hidden payload: `data-zs-block="payload"`
- payload identity: `data-zs-payload`
- payload metadata: `data-zs-version`, `data-zs-encoding`
- payload value: `data-zs-value`

The codec supports base64 and plain/utf8 payload encodings. Markdown payloads may be plain markdown (`custom-markdown`) or JSON wrappers with a `content` field (`conversation-note-markdown`, `digest-markdown`). JSON payloads are decoded for read-only access.

## MCP Tools

Read tools:

- `list_note_payloads` lists payload blocks in a note and returns payload type, encoding, size estimate, note kind, and next-call guidance.
- `get_note_payload` decodes one payload and returns chunk metadata. Markdown payloads expose canonical markdown. JSON payloads expose decoded payload data and a bounded JSON text chunk.

Write tools:

- `create_markdown_note` creates a child note using a markdown-backed payload. Default note kind is `custom`.
- `update_markdown_note` updates an existing markdown-backed note and rejects mismatched `expectedPayloadType`.

Write tools remain permission-gated through the existing host mutation preview/execute flow.

## Workflow Boundaries

MCP can write `custom-markdown` and `conversation-note-markdown`. MCP can read `digest-markdown`, `references-json`, and `citation-analysis-json`, but does not write workflow JSON payloads. Structured JSON workflow editing remains owned by dedicated workflows and editors.

## Non-Goals

- No attachment text/PDF extraction tool is added.
- No binary payload transport is added.
- No raw HTML note tool signature changes.
- No physical merge of workflow note import/export code is required in this change, though the codec is intended to become the shared SSOT.
