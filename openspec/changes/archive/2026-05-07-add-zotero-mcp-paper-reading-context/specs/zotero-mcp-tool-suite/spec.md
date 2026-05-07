# zotero-mcp-tool-suite Delta

## ADDED Requirements

### Requirement: Zotero MCP paper reading context tool

The Zotero MCP service SHALL provide a bounded aggregation tool for paper reading setup.

#### Scenario: Preparing context from an explicit item

- **WHEN** an MCP client calls `prepare_paper_reading_context` with an item ref
- **THEN** the result SHALL include item metadata, bounded note summaries, note payload manifests, attachment manifests, a recommended reading attachment when available, next-call guidance, and limitations
- **AND** it SHALL NOT include attachment file content.

#### Scenario: Preparing context from current selection

- **WHEN** an MCP client calls `prepare_paper_reading_context` without an item ref
- **THEN** the service SHALL resolve the current item first, then a single selected item
- **AND** it SHALL reject multiple selected items with candidate refs instead of guessing.

### Requirement: Zotero MCP attachment reading metadata

The Zotero MCP service SHALL classify attachments for reading recommendation without reading file contents.

#### Scenario: Attachment manifests include reading metadata

- **WHEN** `get_item_attachments` or `prepare_paper_reading_context` returns attachments
- **THEN** each attachment SHALL include `contentRole`, `readability`, `rank`, `recommendedForReading`, and `recommendationReason`
- **AND** Markdown and TXT local attachments SHALL rank ahead of PDFs for reading.

#### Scenario: Attachment content remains out of scope

- **WHEN** an MCP client receives attachment manifests
- **THEN** the result SHALL disclose local path/access metadata only
- **AND** it SHALL explicitly state that attachment file content was not returned.

## MODIFIED Requirements

### Requirement: Agent-facing MCP text disclosures are actionable

Attachment and reading-context text disclosures SHALL include recommendation metadata and next calls.

#### Scenario: Recommended reading attachment is available

- **WHEN** the service recommends an attachment for reading
- **THEN** `content[0].text` SHALL include the attachment ref, filename/title, access path when available, content role, readability, and recommendation reason.
