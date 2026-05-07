# zotero-mcp-tool-suite Delta

## ADDED Requirements

### Requirement: Zotero MCP note payload tools

The Zotero MCP service SHALL expose workflow-aware note payload read tools without requiring agents to parse Zotero note HTML manually.

#### Scenario: Listing note payloads

- **WHEN** an MCP client calls `list_note_payloads` with a Zotero note ref
- **THEN** the result SHALL list each hidden `data-zs-payload` block
- **AND** it SHALL include `payloadType`, encoding, version when available, estimated decoded size, note kind, and a recommended `get_note_payload` call.

#### Scenario: Reading a markdown payload

- **WHEN** an MCP client calls `get_note_payload` for a markdown payload
- **THEN** the result SHALL expose canonical markdown text with `offset`, `nextOffset`, `totalChars`, and `hasMore`
- **AND** it SHALL decode both plain markdown payloads and JSON wrappers containing `content`.

#### Scenario: Reading a JSON payload

- **WHEN** an MCP client calls `get_note_payload` for a JSON payload
- **THEN** the result SHALL expose the decoded JSON payload in structured content
- **AND** it SHALL expose a bounded JSON text chunk for agent-readable inspection.

### Requirement: Zotero MCP markdown-backed note write tools

The Zotero MCP service SHALL provide permission-gated tools for creating and updating markdown-backed Zotero notes.

#### Scenario: Creating a markdown note

- **WHEN** an MCP client calls `create_markdown_note`
- **THEN** the tool SHALL create note HTML containing a rendered view and a base64 hidden markdown payload
- **AND** the write SHALL execute only after the normal MCP permission flow approves it.

#### Scenario: Updating a markdown note

- **WHEN** an MCP client calls `update_markdown_note`
- **THEN** the tool SHALL verify that the target note already has a markdown payload
- **AND** it SHALL reject the update when `expectedPayloadType` is provided and does not match the existing payload.

#### Scenario: JSON workflow payload writes remain out of scope

- **WHEN** an MCP client attempts to use markdown note tools for `references-json` or `citation-analysis-json`
- **THEN** the service SHALL reject the request
- **AND** it SHALL direct agents to dedicated workflow/editor capabilities for structured JSON workflow edits.

### Requirement: Raw note tools remain compatible

Existing raw note MCP tools SHALL keep their current contracts.

#### Scenario: Raw HTML note tools are listed

- **WHEN** an MCP client lists tools
- **THEN** `create_child_note`, `update_note`, and `get_note_detail` SHALL remain available with their existing raw HTML/text semantics
- **AND** the new payload-aware tools SHALL be separate tool names.
