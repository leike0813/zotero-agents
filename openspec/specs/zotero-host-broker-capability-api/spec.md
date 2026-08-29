# zotero-host-broker-capability-api Specification

## Purpose
TBD - created by archiving change add-zotero-host-broker-capability-api. Update Purpose after archive.
## Requirements
### Requirement: JSON-safe broker read API

The system SHALL expose context, library, and metadata capabilities through the canonical Zotero Host Capability Broker. Public broker inputs, successful DTOs, and structured error details SHALL contain only null, booleans, strings, finite numbers, arrays, and plain objects recursively. They SHALL NOT contain undefined properties, non-finite numbers, bigint, symbols, functions, dates, maps, sets, cyclic structures, or Zotero runtime objects.

#### Scenario: Current view DTO

- **WHEN** a caller requests the current view or selected items
- **THEN** the result SHALL describe the current Zotero target, library, selection state, item summaries, and optional collection using strict JSON values
- **AND** collection membership and collection identifiers SHALL be normalized to bounded scalar values.

#### Scenario: Library item DTOs

- **WHEN** a caller lists, searches, or reads Zotero items, notes, payloads, annotations, or attachments
- **THEN** every returned DTO SHALL be constructed from explicitly normalized fields
- **AND** raw Zotero objects SHALL NOT be returned
- **AND** unknown payload values SHALL be rejected rather than silently coerced or dropped.

#### Scenario: Metadata translate identifier DTO

- **WHEN** a caller translates a DOI, ISBN, arXiv identifier, or PMID
- **THEN** successful and diagnostic results SHALL contain strict JSON values
- **AND** all numeric values SHALL be finite
- **AND** translator runtime objects SHALL NOT be returned.

### Requirement: Controlled mutation command API

The canonical broker SHALL expose limited Zotero write operations through mutation preview and execute operations. The broker SHALL validate and perform these operations without owning caller authorization; each exposed adapter SHALL enforce its declared permission policy before execution.

#### Scenario: Preview validates without writing

- **WHEN** a supported mutation request is previewed
- **THEN** the broker SHALL validate references and inputs, return a strict JSON summary, and mark confirmation as required
- **AND** Zotero data SHALL NOT be changed.

#### Scenario: Execute delegates to handlers

- **WHEN** an adapter has authorized a supported mutation and invokes execute
- **THEN** the broker SHALL reuse the canonical mutation implementation
- **AND** the result SHALL contain strict JSON changed-object summaries.

#### Scenario: Literature ingest uses canonical operation

- **WHEN** a literature ingest mutation is passed to preview or execute
- **THEN** the canonical operation SHALL be `literature.ingest`
- **AND** successful preview and execute responses SHALL report `operation: "literature.ingest"`.

#### Scenario: Legacy and batch literature ingest inputs are rejected

- **WHEN** a mutation request uses `operation: "paper.ingest"` or passes a `papers` batch payload to `operation: "literature.ingest"`
- **THEN** the broker SHALL reject the mutation with a structured JSON-safe error
- **AND** Zotero data SHALL NOT be changed.

#### Scenario: Unsupported or invalid mutation

- **WHEN** a mutation has an unsupported operation, invalid reference, invalid field, empty payload, or oversized input
- **THEN** the broker SHALL reject it with a structured JSON-safe error
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
The canonical `literature.ingest` mutation SHALL accept an explicit Zotero item type, item-type-compatible fields, structured creators, normalized identifiers, and source URLs, and SHALL reject the legacy flat paper shape. It SHALL store a normalized DOI in the native Zotero DOI field whenever that field is valid for the selected item type, using `Extra` only when no native DOI field exists.

#### Scenario: Non-journal type preserves semantic fields
- **WHEN** a request ingests a thesis, book, book section, conference paper, report, or generic document
- **THEN** the Host creates that item type and maps only fields valid for that type.

#### Scenario: Unknown item type does not become journal article
- **WHEN** a traceable record has no confidently resolved bibliographic type
- **THEN** the caller uses `document` rather than the Host guessing `journalArticle`.

#### Scenario: Structured creator names are not heuristically split
- **WHEN** a creator is supplied as a single-field Chinese personal name or organization name
- **THEN** the Host stores the single-field name without splitting it on whitespace.

#### Scenario: Invalid field role is rejected
- **WHEN** a typed payload assigns a field that is invalid for its item type
- **THEN** the mutation returns a structured validation failure instead of silently redirecting the value to another field.

#### Scenario: Identifier-only DOI uses the native field
- **WHEN** a typed payload supplies `paper.identifiers.doi` for an item type whose Zotero schema supports DOI and omits `paper.fields.DOI`
- **THEN** the Host SHALL write the normalized identifier to the native DOI field
- **AND** it SHALL NOT append that DOI to `Extra`.

#### Scenario: Unsupported item type retains DOI in Extra
- **WHEN** a typed payload supplies a DOI for an item type without a native DOI field
- **THEN** the Host SHALL preserve one normalized `DOI: ...` line in `Extra`.

#### Scenario: DOI representations conflict
- **WHEN** normalized `paper.identifiers.doi` and `paper.fields.DOI` values are both present and differ
- **THEN** the mutation SHALL return a structured validation failure without creating or updating an item.

### Requirement: Workflow Host API executes ordered text export translators

Workflow Host API v10 SHALL expose a generic item text-export operation that executes registered Zotero export translators in caller-provided priority order.

#### Scenario: Preferred translator succeeds

- **WHEN** `hostApi.items.exportText()` receives Zotero items, ordered translator candidates, and bounded display options
- **AND** the first candidate is a registered export translator that returns non-empty text
- **THEN** the host SHALL return that text, the actual translator identity, `fallbackUsed: false`, and an ordered successful attempt record
- **AND** SHALL pass the supplied item set to one `Zotero.Translate.Export` execution.

#### Scenario: Host advances to fallback translator

- **WHEN** a candidate is unavailable, translator lookup fails, translation throws, or translation returns empty text
- **THEN** the host SHALL record a structured attempt status
- **AND** SHALL try the next candidate without requiring plugin-specific workflow logic
- **AND** a later success SHALL report `fallbackUsed: true` and the actual translator identity.

#### Scenario: Every candidate fails

- **WHEN** every ordered translator candidate is unavailable or cannot return non-empty text
- **THEN** the host SHALL return a structured failure containing all attempt records
- **AND** SHALL NOT claim a successful translator or output.

#### Scenario: Workflow remains decoupled from plugin-private interfaces

- **WHEN** a workflow requests Better BibTeX output through the registered translator candidate
- **THEN** the workflow SHALL NOT require a Better BibTeX global object, add-on-manager lookup, fixed localhost port, or JSON-RPC call.

### Requirement: Broker references are portable

The canonical broker SHALL accept only portable JSON item and collection references. Workflow compatibility code MAY accept raw Zotero objects only when it normalizes them before calling the broker.

#### Scenario: Workflow passes a raw item

- **WHEN** a v11 workflow host method receives a resolvable raw Zotero item
- **THEN** the workflow adapter SHALL derive a portable reference before invoking the broker
- **AND** downstream Host Bridge and MCP adapters SHALL never receive the raw item.

### Requirement: Navigation is separate from context queries

The broker SHALL expose Zotero UI selection and focus effects through a navigation capability family separate from context queries.

#### Scenario: Caller reads context

- **WHEN** a caller requests current view or selected items
- **THEN** no navigation or focus effect SHALL occur.

#### Scenario: Adapter invokes navigation

- **WHEN** an authorized and exposed adapter invokes a navigation operation
- **THEN** the broker SHALL return a JSON-safe navigation result
- **AND** interaction and exposure policy SHALL remain owned by the adapter.

### Requirement: Broker failures use stable codes and safe details

Broker failures that cross an adapter seam SHALL provide a stable canonical error code, retryability, and optional strict JSON details without retaining raw references or host objects.

#### Scenario: Referenced item is missing

- **WHEN** a broker operation cannot resolve an item reference
- **THEN** the failure SHALL use the canonical item-not-found code
- **AND** adapters MAY map that code to their existing external protocol code
- **AND** public details SHALL NOT contain the original raw host object.

