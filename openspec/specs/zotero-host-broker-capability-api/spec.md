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

#### Scenario: Metadata translate identifier DTO

- **WHEN** a workflow calls `hostApi.metadata.translateIdentifier()` with a DOI, ISBN, arXiv identifier, or PMID
- **THEN** the result SHALL be JSON-safe and suitable for workflow package consumption
- **AND** successful results SHALL include returned item metadata, translator summaries, and item count
- **AND** inconclusive results SHALL include structured diagnostics
- **AND** the result SHALL NOT expose raw Zotero native objects.

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

#### Scenario: Legacy and batch literature ingest inputs are rejected

- **WHEN** a mutation request uses `operation: "paper.ingest"` or passes a
  `papers` batch payload to `operation: "literature.ingest"`
- **THEN** the system SHALL reject the mutation with a structured JSON-safe error
- **AND** Zotero data SHALL NOT be changed.

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
Host Bridge note payload APIs MUST return workflow payloads regardless of whether they are stored in v2 embedded payload attachments, legacy v1 embedded attachments, or hidden HTML blocks.

#### Scenario: Payload manifest includes storage diagnostics
- **WHEN** Host Bridge lists note payloads
- **THEN** each payload entry SHALL include source/storage version diagnostics when available
- **AND** embedded payload entries SHALL include attachment key and anchor status when available.

### Requirement: Host Bridge LAN mode requires a fixed port
When LAN access is enabled, Host Bridge MUST use the configured fixed port and MUST NOT silently fall back to a random port.

#### Scenario: LAN enabled
- **WHEN** LAN access is enabled
- **THEN** fixed port mode is enabled
- **AND** status reports `bindMode=lan` and `portMode=pinned`

#### Scenario: LAN fixed port unavailable
- **WHEN** the configured fixed port cannot be bound in LAN mode
- **THEN** Host Bridge reports an error
- **AND** it does not disable fixed port mode or select a random port

### Requirement: Host Bridge accepts master token authentication
Host Bridge MUST accept either the current local token or the configured master token as bearer auth.

#### Scenario: Master token auth
- **WHEN** a request uses the current master token
- **THEN** protected endpoints authorize successfully
- **AND** manifests/status only expose masked master token metadata

### Requirement: File download manifest declares remote support
The manifest MUST describe file downloads as bearer-authenticated and remote-client compatible.

#### Scenario: Manifest requested
- **WHEN** the manifest is returned
- **THEN** `fileDownloads.supportsRemoteClients` is true
- **AND** `fileDownloads.urlTemplate` is `{endpoint}/files/{fileId}`

### Requirement: Host Bridge capability calls SHALL preserve JSON input text
Host Bridge capability calls SHALL parse HTTP JSON request bodies from raw bytes and decode them as UTF-8.

#### Scenario: Non-ASCII capability input survives request parsing
- **WHEN** a Host Bridge caller posts a JSON body containing Chinese text, full-width punctuation, or emoji
- **THEN** the decoded capability input SHALL preserve those characters exactly.

#### Scenario: Malformed UTF-8 request body is rejected
- **WHEN** a Host Bridge request body is not valid UTF-8
- **THEN** the request SHALL fail with a structured bad-request error
- **AND** the bridge SHALL NOT pass mojibake text to a capability handler.

### Requirement: Literature ingest may attach landing URL when PDF is missing

`literature.ingest` SHALL support an optional `paper.attachLandingUrlOnMissingPdf`
boolean. The default SHALL be false.

#### Scenario: Missing PDF creates landing URL attachment when requested

- **WHEN** `literature.ingest` successfully creates or reuses a literature item
- **AND** `paper.attachLandingUrlOnMissingPdf` is true
- **AND** the resulting item has no PDF attachment after PDF import handling
- **AND** `paper.landingUrl` is a non-empty HTTP(S) URL
- **THEN** the mutation SHALL create or reuse one linked URL child attachment
  for that landing URL
- **AND** the ingest result SHALL include `landingAttachmentStatus`.

#### Scenario: Existing PDF suppresses landing URL attachment

- **WHEN** `literature.ingest` successfully creates or reuses a literature item
- **AND** the resulting item has a PDF attachment
- **THEN** the mutation SHALL NOT create a landing URL attachment for missing-PDF recovery.

#### Scenario: Landing URL attachment failure is non-fatal

- **WHEN** landing URL attachment creation fails
- **THEN** the literature item ingest SHALL remain successful
- **AND** the result SHALL include `landingAttachmentStatus: "failed"` and a
  structured `landingAttachmentError`.

### Requirement: Literature ingest SHALL accept a typed bibliographic item payload
The canonical `literature.ingest` mutation SHALL accept an explicit Zotero item type, item-type-compatible fields, structured creators, normalized identifiers, and source URLs, and SHALL reject the legacy flat paper shape.

#### Scenario: Non-journal type preserves semantic fields
- **WHEN** a request ingests a thesis, book, book section, conference paper, report, or generic document
- **THEN** the Host creates that item type and maps only fields valid for that type

#### Scenario: Unknown item type does not become journal article
- **WHEN** a traceable record has no confidently resolved bibliographic type
- **THEN** the caller uses `document` rather than the Host guessing `journalArticle`

#### Scenario: Structured creator names are not heuristically split
- **WHEN** a creator is supplied as a single-field Chinese personal name or organization name
- **THEN** the Host stores the single-field name without splitting it on whitespace

#### Scenario: Invalid field role is rejected
- **WHEN** a typed payload assigns a field that is invalid for its item type
- **THEN** the mutation returns a structured validation failure instead of silently redirecting the value to another field

