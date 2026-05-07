# Add Zotero MCP Paper Reading Context

## Why

The Zotero MCP service can expose actionable item, note, payload, and attachment refs, but agents still need several serial calls to understand a paper's reading context. In practice, a useful paper-reading agent first needs a compact answer to: which item is in scope, which notes and workflow payloads exist, which attachments are available, and which local Markdown/TXT/PDF file is the best reading target.

## What Changes

- Add `prepare_paper_reading_context`, a bounded aggregation tool for one paper.
- Enhance `get_item_attachments` with reading metadata: `contentRole`, `readability`, `rank`, `recommendedForReading`, and `recommendationReason`.
- Reuse note payload manifests so agents can discover markdown-backed workflow notes without expanding large payloads.
- Keep attachment file content, PDF parsing, Reader state, annotations, lookup, collection navigation, and related-item navigation out of scope for this change.

## Capabilities

### New Capabilities

- `zotero-mcp-tool-suite`: provides a paper-reading context aggregation tool.
- `zotero-mcp-tool-suite`: classifies attachments for reading recommendation.

### Modified Capabilities

- `zotero-mcp-tool-suite`: extends `get_item_attachments` structured content and text disclosure while preserving existing access metadata.

## Impact

- Adds one MCP tool and targeted tests.
- Updates the MCP service design document.
- Does not add attachment body reading or Reader/annotation tools.
