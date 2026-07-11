# zotero-host-capability-broker Specification

## Purpose
TBD - created by archiving change define-zotero-host-capability-broker. Update Purpose after archive.
## Requirements
### Requirement: Handlers are internal mutation primitives

The system SHALL treat `handlers` as an internal library for common Zotero mutation operations, not as a complete facade over the Zotero native API.

#### Scenario: Handler scope is described

- **WHEN** developer documentation or future capability specs describe `handlers`
- **THEN** they MUST state that handlers cover a finite write-oriented DSL
- **AND** they MUST NOT imply that handlers cover all Zotero native API capabilities.

### Requirement: Host API is the broker SSOT

The system SHALL treat `hostApi` and its broker-owned modules as the
forward-facing Host Capability Broker for workflow package code, Host Bridge
service endpoints, CLI access through the Host Bridge, and MCP tool backends.

#### Scenario: A new Zotero capability is added

- **WHEN** a future change adds a Zotero capability intended for workflow
  package, Host Bridge, CLI, or MCP use
- **THEN** the capability SHOULD be modeled through `hostApi` or a broker
  module owned by `hostApi`
- **AND** direct exposure of Zotero native objects SHOULD be avoided at external
  boundaries.

#### Scenario: Workflow package needs read-only metadata translation

- **WHEN** a workflow package needs Zotero Translate Search metadata for a stable identifier
- **THEN** it SHALL request the lookup through `runtime.hostApi.metadata`
- **AND** it SHALL NOT require raw `runtime.zotero` access under the package host-api contract.

### Requirement: Handlers remain available for legacy workflow hooks

The system SHALL preserve `runtime.handlers` for legacy workflow hook compatibility.

#### Scenario: Existing workflow hook uses runtime handlers

- **WHEN** an existing workflow hook calls `runtime.handlers`
- **THEN** the runtime MUST continue to provide the handlers object
- **AND** this SSOT MUST NOT be interpreted as requiring handler removal or renaming.

### Requirement: New workflow package code prefers hostApi

The system SHALL document `runtime.hostApi` as the preferred entry point for new workflow package development.

#### Scenario: Developer chooses a host capability entry point

- **WHEN** new workflow package code needs host capabilities
- **THEN** documentation SHOULD direct authors toward `runtime.hostApi`
- **AND** direct use of `runtime.zotero` SHOULD NOT be required for package-host-api workflows.

### Requirement: MCP tools use JSON-safe broker adapters

The system SHALL expose Zotero MCP tools as JSON-safe adapters over broker
capabilities rather than direct exports of `handlers` or Zotero native APIs.
MCP SHALL be treated as a compatibility adapter over broker capabilities, not
as the primary host capability source.

#### Scenario: Agent calls a Zotero MCP tool

- **WHEN** an MCP client invokes a Zotero tool
- **THEN** the tool response MUST be serializable JSON-compatible data
- **AND** the response MUST NOT contain `Zotero.Item`, `Zotero.Collection`,
  window, `nsIFile`, or other host runtime objects
- **AND** the tool contract MUST be named around an agent task rather than an
  internal handler method.

### Requirement: MCP mutation tools are permission-gated

The system SHALL require an explicit permission policy before exposing Zotero mutations through MCP tools.

#### Scenario: Future MCP write tool is proposed

- **WHEN** a future change proposes a tool that creates, updates, deletes, tags, files, or moves Zotero data
- **THEN** the change MUST define whether the tool requires user confirmation, a configured allow policy, or another explicit permission gate
- **AND** the tool MUST NOT be silently writable by default.

### Requirement: First formal MCP tools are read-oriented

The system SHALL prioritize read/context MCP tools before write tools.

#### Scenario: Formal MCP tool set is expanded beyond the spike

- **WHEN** the first non-spike Zotero MCP tools are implemented
- **THEN** the recommended order SHOULD start with current view, selected items, item search, item detail, notes, and attachments
- **AND** write tools SHOULD be deferred until permission policy is specified.

### Requirement: Broker SSOT document stays synchronized

The system SHALL maintain `doc/components/zotero-host-capability-broker-ssot.md` as the human-facing SSOT for this model.

#### Scenario: Related public contract changes

- **WHEN** `WorkflowHostApi`, `handlers` public behavior, Zotero MCP tool contracts, or MCP mutation permission policy changes
- **THEN** the SSOT document MUST be updated in the same change.

### Requirement: Workflow Host API SHALL Expose Note Image Preparation

`WorkflowHostApi` SHALL expose optional image preparation capabilities for workflow packages that need to embed bounded images into Zotero notes.

#### Scenario: Host API exposes image preparation
- **WHEN** a workflow package receives `runtime.hostApi`
- **THEN** `hostApi.images.prepareForNoteEmbedding` SHALL be available on Host API v4
- **AND** it SHALL apply the representative note image compression policy before returning prepared image data.

### Requirement: Workflow Host API SHALL Expose Embedded Image Import

`WorkflowHostApi` SHALL expose a note-level embedded image import operation backed by Zotero embedded-image attachments.

#### Scenario: Workflow imports an embedded note image
- **WHEN** a workflow calls `hostApi.notes.importEmbeddedImage` with a note item and prepared JPEG data
- **THEN** the Host SHALL create an embedded-image attachment under that note
- **AND** the returned value SHALL include the attachment key needed for `<img data-attachment-key="...">`.

### Requirement: MCP adapter is deprecated after Host Bridge CLI completion

After Host Bridge CLI is fully implemented and stable, the system SHALL keep
MCP capabilities and code available for compatibility while removing MCP from
the default ACP host access path.

#### Scenario: ACP run starts after MCP deprecation

- **WHEN** an ACP agent run starts after Host Bridge CLI is the stable host
  access path
- **THEN** the plugin SHALL NOT start MCP by default
- **AND** it SHALL NOT inject MCP descriptors into the agent run by default
- **AND** it SHALL NOT run MCP preflight as part of normal ACP run preparation.

#### Scenario: ACP UI is shown after MCP deprecation

- **WHEN** the ACP panel renders host access state after MCP deprecation
- **THEN** it SHALL NOT show the MCP status indicator as part of the normal run
  status surface
- **AND** MCP diagnostics MAY remain available through explicit developer or
  compatibility tooling.

### Requirement: Workflow Host API SHALL Support Binary Workflow Files

`WorkflowHostApi.file` SHALL expose binary file operations for workflow packages
that need to round-trip sidecar artifacts without embedding bytes in JSON.

#### Scenario: Workflow writes binary sidecar artifact
- **WHEN** a workflow package receives Host API v5
- **THEN** `hostApi.file.readBytes`, `hostApi.file.writeBytes`, and `hostApi.file.copy` SHALL be available
- **AND** those operations SHALL support local workflow sidecar files such as representative note images.

### Requirement: Workflow Host API v7 SHALL expose a save-file picker

`WorkflowHostApi.file` SHALL expose a save-file operation accepting a title, filters, initial directory, and suggested filename, backed by Zotero's file picker save mode.

#### Scenario: Workflow requests a ZIP destination
- **WHEN** a workflow calls the save-file operation with a `.zip` suggestion and filter
- **THEN** the Host SHALL return the confirmed target path, including replacement confirmation handled by the native picker
- **AND** cancellation SHALL return `null`.

### Requirement: Workflow Host API v7 SHALL expose safe streaming ZIP operations

The Host SHALL expose workflow-agnostic ZIP writing and scoped extraction operations implemented with Zotero/Gecko facilities and SHALL NOT require Node.js archive or filesystem modules in the plugin environment.

#### Scenario: Workflow writes file-backed archive entries
- **WHEN** a workflow supplies normalized entry names backed by local file paths, text, or bytes
- **THEN** the Host SHALL stream entries to a temporary archive and replace the target only after the archive closes successfully
- **AND** large attachments SHALL NOT require assembling the complete ZIP in JavaScript memory.

#### Scenario: Workflow opens a ZIP in an extraction scope
- **WHEN** a workflow requests scoped ZIP extraction
- **THEN** the Host SHALL reject absolute, parent-traversing, empty, duplicate, and otherwise unsafe entry names before exposing extracted files
- **AND** the Host SHALL remove the temporary extraction directory after the scoped callback settles.

### Requirement: Workflow Host API v7 SHALL expose portable item materialization primitives

The Host SHALL expose generic operations to export complete Zotero item JSON, create a new item from sanitized Zotero JSON in an explicit library, remove a created item, import a local path and sidecars as a stored-file attachment under a parent, and create a URL attachment with caller-controlled deduplication.

#### Scenario: Workflow exports complete item JSON
- **WHEN** a workflow requests portable JSON for a regular item
- **THEN** the Host SHALL serialize all Zotero item fields, creators, and tags rather than the summary-only broker DTO
- **AND** it SHALL remove source identity, collection, and raw relation fields according to the portable item contract.

#### Scenario: Workflow creates a portable parent item
- **WHEN** a workflow supplies an item type and sanitized Zotero JSON without source identity fields
- **THEN** the Host SHALL create a new item in the requested library using Zotero item JSON normalization
- **AND** it SHALL return the new item with its target id and key.

#### Scenario: Workflow imports a source path as stored content
- **WHEN** a workflow supplies a readable local path, optional companion files, parent ref, title, content type, charset, and optional URL metadata
- **THEN** the Host SHALL create a stored-file attachment using Zotero attachment import APIs
- **AND** companion files SHALL be materialized inside that attachment's Zotero storage directory at safe relative paths
- **AND** it SHALL NOT create a linked-file attachment to the supplied temporary path.

#### Scenario: Workflow creates duplicate URL attachments intentionally
- **WHEN** a workflow requests URL attachment creation with deduplication disabled
- **THEN** the Host SHALL create a new URL attachment even when the parent already has an attachment with the same URL.

#### Scenario: Workflow cleans up a failed parent
- **WHEN** a workflow asks the Host to remove a parent created during the current operation
- **THEN** the Host SHALL erase that parent and its newly created children through Zotero's transactional item APIs.

### Requirement: Workflow Host API v7 current view SHALL identify a real selected collection

The current-view DTO SHALL include an optional normalized collection ref only when the selected library tree row represents a real Zotero collection.

#### Scenario: Real collection row is selected
- **WHEN** the current Zotero library view is a collection
- **THEN** `context.getCurrentView()` SHALL include that collection's id, key, name, and library id.

#### Scenario: Non-collection row is selected
- **WHEN** the current row represents a library root, saved search, feed, trash, reader, or another non-collection view
- **THEN** the current-view DTO SHALL omit the current collection
- **AND** it SHALL still report the current library id when available.

### Requirement: Workflow Host API version consumers SHALL recognize v7

All package runtime guards, loader globals, capability summaries, debug probes, tests, and SSOT documentation that declare the supported Workflow Host API version SHALL be synchronized to version 7.

#### Scenario: Built-in package consumes Host API v7
- **WHEN** a precompiled built-in workflow hook resolves its runtime Host API
- **THEN** version 7 SHALL pass the package runtime compatibility guard
- **AND** versions outside the declared supported range SHALL continue to fail deterministically.

