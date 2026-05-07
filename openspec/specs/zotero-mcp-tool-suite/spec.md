# zotero-mcp-tool-suite Specification

## Purpose
TBD - created by archiving change add-zotero-mcp-tool-suite. Update Purpose after archive.
## Requirements
### Requirement: Formal broker-backed Zotero MCP tool registry

The system SHALL expose Zotero MCP tools from a registry that defines tool metadata, input schema, and handler behavior.

#### Scenario: Tool listing includes formal tool suite

- **WHEN** an MCP client calls `tools/list`
- **THEN** the server SHALL return the formal Zotero read and mutation tools with JSON schemas
- **AND** tool definitions SHALL be generated from the registry rather than hard-coded per response.

#### Scenario: Unknown tool is rejected

- **WHEN** an MCP client calls an unknown Zotero tool
- **THEN** the server SHALL return a JSON-RPC invalid params error
- **AND** no broker read or write call SHALL be executed.

### Requirement: JSON-safe read MCP tools

The system SHALL expose read-only Zotero MCP tools through `hostApi.context` and `hostApi.library`.

#### Scenario: Current view and selected items

- **WHEN** an MCP client calls `zotero.get_current_view` or `zotero.get_selected_items`
- **THEN** the tool SHALL return JSON-safe broker DTOs
- **AND** raw Zotero objects SHALL NOT be returned.

#### Scenario: Library query tools

- **WHEN** an MCP client calls `zotero.search_items`, `zotero.get_item_detail`, `zotero.get_item_notes`, or `zotero.get_item_attachments`
- **THEN** the tool SHALL call the corresponding `hostApi.library` API
- **AND** the result SHALL include compact text content and structured JSON content.

### Requirement: Attachment access DTO

The system SHALL return attachment access metadata without embedding file contents in MCP JSON.

#### Scenario: Local file attachment

- **WHEN** `zotero.get_item_attachments` returns a file attachment with a local path
- **THEN** the MCP result SHALL include `access.mode = "local-path"` and `access.path`
- **AND** the MCP result SHALL NOT include the file content.

#### Scenario: Remote-compatible attachment contract

- **WHEN** an attachment is returned
- **THEN** the MCP result SHALL include a stable `access` object that can later represent `download-url`
- **AND** clients SHALL NOT need a schema change when remote attachment URLs are added.

### Requirement: Permission-gated mutation MCP tools

The system SHALL expose limited Zotero writes through broker mutation preview and permission-gated execute.

#### Scenario: Preview mutation

- **WHEN** an MCP client calls `zotero.preview_mutation`
- **THEN** the server SHALL call `hostApi.mutations.preview()`
- **AND** Zotero data SHALL NOT be changed.

#### Scenario: Approved write tool

- **WHEN** an MCP client calls a supported write tool and the user approves the permission request
- **THEN** the server SHALL call `hostApi.mutations.execute()`
- **AND** return a JSON-safe execution result.

#### Scenario: Denied or unavailable permission

- **WHEN** permission is denied or no permission hook is available
- **THEN** the server SHALL return a structured non-executed result
- **AND** Zotero data SHALL NOT be changed.

### Requirement: Zotero MCP service design document

The project SHALL maintain a service-level design document for the Zotero MCP tool suite.

#### Scenario: Tool contract documentation exists

- **WHEN** the MCP tool suite is reviewed or changed
- **THEN** `doc/components/zotero-mcp-service-design.md` SHALL define the current tool names, purposes, input signatures, structured result contracts, text disclosure rules, and failure guidance
- **AND** `doc/components/zotero-host-capability-broker-ssot.md` SHALL remain the architecture boundary SSOT.

### Requirement: Agent-facing MCP text disclosures are actionable

Attachment and reading-context text disclosures SHALL include recommendation metadata and next calls.

#### Scenario: Recommended reading attachment is available

- **WHEN** the service recommends an attachment for reading
- **THEN** `content[0].text` SHALL include the attachment ref, filename/title, access path when available, content role, readability, and recommendation reason.

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

