## ADDED Requirements

### Requirement: Workflow Host runtime adaptation uses owned deep modules

Workflow Host API v11 SHALL compose workflow-local filesystem, input
materialization, picker, note-image preparation, stored-attachment import, and
archive behavior through explicitly owned modules. Runtime adapter selection and
workflow-local policy SHALL NOT be implemented inline in the projection
composition root or exposed as new public host members.

#### Scenario: Workflow Host API is constructed

- **WHEN** `createWorkflowHostApi()` constructs the v11 projection
- **THEN** it SHALL bind each workflow-local interface explicitly
- **AND** it SHALL NOT expose internal filesystem, picker, media, or attachment
  adapters.

#### Scenario: Cached host projection performs a runtime operation

- **WHEN** a cached Workflow Host API invokes a runtime-sensitive operation
- **THEN** the owning module SHALL resolve the current runtime adapter for that
  invocation
- **AND** it SHALL NOT retain a stale picker window or runtime global captured
  during initial composition.

### Requirement: Stored attachment companion import fails closed

Workflow stored-attachment import SHALL validate and stage every companion file
before creating a Zotero attachment. A failure after attachment creation SHALL
trigger best-effort removal of the newly created attachment and cleanup of
managed staging data.

#### Scenario: Companion path is unsafe

- **WHEN** a stored-attachment import includes an absolute, empty, or traversal
  companion path
- **THEN** the import SHALL fail before creating a Zotero attachment
- **AND** no companion file SHALL be written to Zotero storage.

#### Scenario: Companion copy fails after attachment creation

- **WHEN** staged companion content cannot be copied into the new attachment
  storage directory
- **THEN** the operation SHALL report the primary failure
- **AND** it SHALL attempt to remove the new attachment and clean staging data.

### Requirement: Workflow note-image preparation remains behavior compatible

Moving note-image preparation behind its owned module SHALL preserve the v11
source forms, default options, bounded dimensions, output MIME behavior, quality
candidate policy, diagnostics, hard-cap failure, and embedded-image import seam.

#### Scenario: Workflow prepares a note image

- **WHEN** a workflow supplies a supported path, Blob, or byte source
- **THEN** `hostApi.images.prepareForNoteEmbedding` SHALL return the same
  caller-observable prepared-image contract as before the module deepening
- **AND** Zotero note mutation SHALL remain a separate operation.
