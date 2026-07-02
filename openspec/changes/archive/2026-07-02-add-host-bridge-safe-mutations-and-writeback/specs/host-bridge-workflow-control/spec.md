## ADDED Requirements

### Requirement: Host Bridge exposes safe mutation writeback controls

Host Bridge SHALL keep Zotero writes behind `mutation.preview` and
`mutation.execute` while supporting semantic mutation operations for item
field updates, tag add/remove, collection create/add/remove, note
create/update/payload upsert, and uploaded-file attachment.

#### Scenario: Mutation preview describes a write without applying it

- **WHEN** a caller previews a supported mutation operation
- **THEN** Host Bridge SHALL return a JSON-safe summary of the intended write
- **AND** Zotero library state SHALL NOT be changed.

#### Scenario: Mutation execute uses the approval boundary

- **WHEN** a caller executes a supported mutation operation
- **THEN** Host Bridge SHALL require the existing Zotero write approval unless
  the request is covered by a valid registered ACP auto-approve write scope.

### Requirement: Host Bridge supports inbound file handles for writeback

Host Bridge SHALL provide `POST /bridge/v1/files/upload` for single-file
upload and SHALL return an opaque short-lived file descriptor suitable for
later mutation-backed attachment.

#### Scenario: Uploaded file is attached by handle

- **GIVEN** a file was uploaded through Host Bridge
- **WHEN** a caller executes an attach-file mutation using the returned `fileId`
- **THEN** Host Bridge SHALL attach the managed file to the target Zotero item
- **AND** SHALL NOT use the caller's local source path as a Zotero path.

### Requirement: Annotation readback is read-only

Host Bridge SHALL expose annotation list/export as read-only library
capabilities that do not require write approval.

#### Scenario: Annotation export returns bounded data

- **WHEN** a caller exports annotations for an item
- **THEN** Host Bridge SHALL return JSON or Markdown annotation data
- **AND** SHALL NOT perform Zotero writes.
