## ADDED Requirements

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
