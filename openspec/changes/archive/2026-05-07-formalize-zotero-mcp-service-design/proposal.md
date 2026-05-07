# Formalize Zotero MCP Service Design

## Why

The embedded Zotero MCP server can now be injected and tools can be called, but the current tool suite is not yet sufficiently useful to agents. Recent ACP Chat transcripts show agents repeatedly calling Zotero MCP tools and receiving technically valid but low-value summaries such as attachment and note counts without the identifiers or access context needed for follow-up calls.

The project needs a service-level MCP design document that defines the current tool suite, signatures, result contracts, and agent-facing context disclosure rules. This change does not add new tools or alter runtime behavior; it formalizes the v1 contract so later runtime fixes can be tested against it.

## What Changes

- Add `doc/components/zotero-mcp-service-design.md` as the service-level MCP tool contract.
- Keep `doc/components/zotero-host-capability-broker-ssot.md` as the architecture and broker boundary SSOT.
- Document the current Zotero MCP registry as 17 tools:
  - 8 read/context tools
  - 1 diagnostic tool
  - 8 permission-gated write tools
- Define tool signatures, structured result contracts, text disclosure templates, failure modes, and recovery guidance.
- Define the rule that `content[].text` must be actionable for agents and must include follow-up refs, not only count summaries.
- Explicitly state that v1 does not add `get_item_context` or `get_attachment_text_chunk`; attachment content remains out of scope for this design.

## Capabilities

### New Capabilities

None. This change formalizes the existing Zotero MCP service contract.

### Modified Capabilities

- `zotero-mcp-tool-suite`: adds service-level documentation and actionable agent-facing text disclosure requirements for the existing tool registry.

## Impact

- Documentation and OpenSpec artifacts only.
- No MCP runtime code changes.
- No new MCP tools.
- No expansion of write permissions.
