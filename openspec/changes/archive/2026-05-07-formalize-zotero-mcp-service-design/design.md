# Design

## Scope

This change formalizes the current MCP service contract. It is intentionally documentation-first: the design records the intended behavior for the current tool suite so future implementation work can harden the runtime without changing the product contract mid-flight.

## Current Tool Suite

The current MCP registry contains 17 tools:

- Read/context: `get_current_view`, `get_selected_items`, `search_items`, `list_library_items`, `get_item_detail`, `get_item_notes`, `get_note_detail`, `get_item_attachments`.
- Diagnostics: `get_mcp_status`.
- Writes: `preview_mutation`, `update_item_fields`, `add_item_tags`, `remove_item_tags`, `create_child_note`, `update_note`, `add_items_to_collection`, `remove_items_from_collection`.

The design follows the registry as source of truth. The diagnostic tool is counted separately because it is not a user-data read tool but still part of the service contract.

## Agent-Facing Result Model

Every tool returns:

- `structuredContent`: JSON-safe machine-readable content.
- `content[].text`: compact, actionable agent-readable text.

The main design correction is that `content[].text` must disclose enough context for the next tool call. Count-only summaries are not acceptable for tools that return lists or refs. The text layer must include item keys, library ids, note refs, attachment refs, access metadata, paging/chunking hints, and recommended next calls where applicable.

## Non-Goals

- No `get_item_context` tool is introduced in this change.
- No `get_attachment_text_chunk` or PDF extraction tool is introduced in this change.
- No binary/base64 attachment content is returned through MCP JSON.
- Write tools remain limited to the existing permission-gated mutation suite.

## Relationship To Broker SSOT

`zotero-host-capability-broker-ssot.md` owns layering and safety boundaries: MCP tools are JSON-safe adapters over `hostApi`, not raw Zotero exports. The new service design document owns tool-level contracts: names, arguments, result shapes, and agent disclosure policy.

