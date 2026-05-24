# zotero-host-broker-capability-api Specification

## Purpose
TBD - created by archiving change add-zotero-host-broker-capability-api. Update Purpose after archive.
## Requirements
### Requirement: JSON-safe broker read API

The system SHALL expose JSON-safe Zotero read/context capabilities through `hostApi.context` and `hostApi.library`.

#### Scenario: Current view DTO

- **WHEN** a workflow or MCP adapter calls `hostApi.context.getCurrentView()`
- **THEN** the result SHALL describe the current Zotero target, library, selection state, and current item metadata using JSON-safe values
- **AND** the result SHALL NOT contain raw `Zotero.Item` instances.

#### Scenario: Library item DTOs

- **WHEN** a caller uses `hostApi.library.searchItems()`, `getItemDetail()`, `getItemNotes()`, or `getItemAttachments()`
- **THEN** the returned values SHALL be bounded DTOs suitable for JSON serialization
- **AND** raw Zotero objects SHALL NOT be returned.

### Requirement: Controlled mutation command API

The system SHALL expose limited Zotero write operations through
`hostApi.mutations.preview()` and `hostApi.mutations.execute()`.

#### Scenario: Preview validates without writing

- **WHEN** a supported mutation request is passed to `preview()`
- **THEN** the system SHALL validate references and inputs, produce a summary,
  and mark `requiresConfirmation` as true
- **AND** Zotero data SHALL NOT be changed.

#### Scenario: Execute delegates to handlers

- **WHEN** a supported mutation request is passed to `execute()` after
  caller-side permission confirmation
- **THEN** the system SHALL reuse existing handler primitives for the write
- **AND** the result SHALL return JSON-safe changed-object summaries.

#### Scenario: Literature ingest uses canonical operation

- **WHEN** a literature ingest mutation is passed to `preview()` or `execute()`
- **THEN** the canonical operation SHALL be `literature.ingest`
- **AND** successful preview and execute responses SHALL report
  `operation: "literature.ingest"`.

#### Scenario: Legacy paper ingest alias is accepted

- **WHEN** a legacy mutation request uses `operation: "paper.ingest"`
- **THEN** the mutation SHALL remain accepted for compatibility
- **AND** the response SHALL normalize the operation to `literature.ingest`.

#### Scenario: Unsupported or invalid mutation

- **WHEN** a mutation has an unsupported operation, invalid reference, invalid
  field, empty payload, or oversized input
- **THEN** the system SHALL reject it with a structured JSON-safe error
- **AND** Zotero data SHALL NOT be changed.

### Requirement: Legacy compatibility

The system SHALL preserve existing workflow compatibility while adding the broker API.

#### Scenario: Legacy handlers remain available

- **WHEN** existing workflow code calls `runtime.handlers` or raw `hostApi.items.*`
- **THEN** behavior SHALL remain compatible with the pre-change implementation.

#### Scenario: MCP tools use broker boundary

- **WHEN** MCP tools need Zotero read or write capabilities
- **THEN** they SHALL use broker APIs and DTOs
- **AND** they SHALL NOT directly expose `handlers.*` as MCP tools.

### Requirement: Host Bridge write auto-approval is scoped to an ACP run

Host Bridge mutation execution SHALL skip Zotero approval only when the current
ACP run profile scope is trusted for write auto-approval by the ACP run store.

#### Scenario: Registered auto-approved run executes a mutation

- **WHEN** a mutation request carries an ACP run scope with
  `autoApproveWrites: true`
- **AND** that run id has an ACP run record whose Host Bridge CLI state declares
  write auto-approval
- **THEN** the Host Bridge SHALL execute the mutation without requesting UI
  approval.

#### Scenario: Scope header is forged

- **WHEN** a mutation request carries `autoApproveWrites: true` for an
  unregistered run id
- **THEN** the Host Bridge SHALL require the normal Zotero approval.

#### Scenario: Workflow submit is called

- **WHEN** Host Bridge workflow submit is requested
- **THEN** this write auto-approval mechanism SHALL NOT bypass workflow submit
  approval.

### Requirement: Host note payload APIs SHALL expose workflow payloads

Host Bridge note payload APIs MUST return workflow payloads regardless of whether they are stored in legacy HTML blocks or embedded payload attachments.

#### Scenario: Listing attachment-backed payloads
- **WHEN** `library.listNotePayloads` is called for a note with a valid workbench payload attachment
- **THEN** the response SHALL include the attachment-backed payload type, format, estimated size, and source metadata.

#### Scenario: Reading attachment-backed payload details
- **WHEN** `library.getNotePayload` is called for a payload type stored in a workbench payload attachment
- **THEN** the response SHALL return the same payload, markdown/content chunking, and JSON formatting semantics as legacy HTML payloads.

#### Scenario: Legacy payloads keep priority
- **WHEN** a note contains both a valid legacy HTML payload block and an attachment-backed payload of the same type
- **THEN** readers SHALL prefer the legacy HTML block for backward-compatible deterministic behavior.

