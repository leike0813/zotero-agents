# zotero-mcp-tool-suite Delta

## ADDED Requirements

### Requirement: Zotero MCP service design document

The project SHALL maintain a service-level design document for the Zotero MCP tool suite.

#### Scenario: Tool contract documentation exists

- **WHEN** the MCP tool suite is reviewed or changed
- **THEN** `doc/components/zotero-mcp-service-design.md` SHALL define the current tool names, purposes, input signatures, structured result contracts, text disclosure rules, and failure guidance
- **AND** `doc/components/zotero-host-capability-broker-ssot.md` SHALL remain the architecture boundary SSOT.

### Requirement: Agent-facing MCP text disclosures are actionable

Zotero MCP tool results SHALL include agent-readable text that enables follow-up calls without relying on hidden structured fields alone.

#### Scenario: Selected items are returned

- **WHEN** `get_selected_items` returns one or more items
- **THEN** `content[0].text` SHALL include each selected item's stable ref, including `key` and `libraryId` when available
- **AND** it SHOULD include title and item type.

#### Scenario: Item detail is returned

- **WHEN** `get_item_detail` returns an item
- **THEN** `content[0].text` SHALL include the resolved item ref and core metadata
- **AND** it SHALL guide agents to `get_item_notes` and `get_item_attachments` when notes or attachments may be relevant.

#### Scenario: Attachments are returned

- **WHEN** `get_item_attachments` returns attachments
- **THEN** `content[0].text` SHALL include each attachment's stable ref, filename or title, content type when available, and `access.mode`
- **AND** it SHALL include `access.path` and locality when a local path is available
- **AND** it SHALL NOT imply that attachment file content was returned.

#### Scenario: Note summaries are returned

- **WHEN** `get_item_notes` returns note summaries
- **THEN** `content[0].text` SHALL include each note's stable ref and excerpt when available
- **AND** it SHALL identify `get_note_detail` as the follow-up tool for full note chunks.

#### Scenario: Note detail chunk is returned

- **WHEN** `get_note_detail` returns a note chunk
- **THEN** `content[0].text` SHALL include chunk offset, next offset, total character count, and whether more content remains.

### Requirement: Zotero MCP v1 does not expose attachment text extraction tools

The Zotero MCP v1 service contract SHALL NOT define aggregate item-context or attachment-text extraction tools.

#### Scenario: Agent needs PDF body text

- **WHEN** an ACP agent needs attachment body text
- **THEN** v1 SHALL expose attachment access metadata through `get_item_attachments`
- **AND** it SHALL NOT claim that `get_item_context`, `get_attachment_text_chunk`, or equivalent attachment text tools are available.

### Requirement: Permission-gated write disclosures

Zotero MCP write tools SHALL disclose preview, permission, execution, and verification state to the agent.

#### Scenario: Write mutation is not approved

- **WHEN** a write tool is denied or no permission hook is available
- **THEN** the result SHALL clearly state that no Zotero write was executed
- **AND** structured content SHALL include the preview and permission outcome.

#### Scenario: Write mutation executes

- **WHEN** a write tool executes
- **THEN** the result SHALL include execution outcome and a verification hint
- **AND** agents SHALL be guided to verify state before retrying after ambiguous transport failures.

