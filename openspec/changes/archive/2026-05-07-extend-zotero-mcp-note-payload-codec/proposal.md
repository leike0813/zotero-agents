# Extend Zotero MCP Note Payload Codec

## Why

The Zotero MCP service can now expose actionable item, note, and attachment refs, but agents still cannot reliably work with project workflow notes. Existing workflows store canonical note data in hidden `data-zs-payload` blocks, including markdown-backed notes and structured JSON payloads. MCP currently exposes only raw note HTML/text chunks and raw HTML write tools, so agents must either parse workflow-specific HTML themselves or write notes that do not round-trip through existing workflows.

## What Changes

- Add a shared note payload codec for Zotero note HTML that understands the existing `data-zs-note-kind`, `data-zs-view`, `data-zs-payload`, `data-zs-version`, `data-zs-encoding`, and `data-zs-value` convention.
- Add MCP read tools for workflow payloads:
  - `list_note_payloads`
  - `get_note_payload`
- Add MCP markdown-backed note write tools:
  - `create_markdown_note`
  - `update_markdown_note`
- Keep existing raw HTML note tools (`create_child_note`, `update_note`, `get_note_detail`) unchanged.
- Update the MCP service design document with note payload signatures, result contracts, and agent-facing disclosure rules.

## Capabilities

### New Capabilities

- `zotero-mcp-tool-suite`: exposes workflow-aware note payload read tools and markdown-backed note write tools.
- `note-payload-codec`: provides a shared codec for existing workflow note payload HTML.

### Modified Capabilities

- `zotero-mcp-tool-suite`: expands the tool registry while preserving the raw note tool contracts.

## Impact

- Adds MCP tools and tests.
- Adds a shared codec module intended to become the note payload SSOT.
- Does not add attachment text extraction.
- Does not allow MCP to write `references-json` or `citation-analysis-json` payloads.
