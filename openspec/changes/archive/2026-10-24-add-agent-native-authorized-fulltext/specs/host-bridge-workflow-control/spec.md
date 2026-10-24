## MODIFIED Requirements

### Requirement: Host Bridge supports inbound file handles for writeback

Host Bridge SHALL provide `POST /bridge/v2/files/upload` for single-file
upload and SHALL return an opaque short-lived file descriptor suitable for
later mutation-backed attachment. Host-local acquisition SHALL also provide an opaque, task-bound descriptor suitable for that same attachment ingress.

#### Scenario: Uploaded file is attached by handle

- **GIVEN** a file was uploaded through Host Bridge
- **WHEN** a caller executes an attach-file mutation using the returned `fileId`
- **THEN** Host Bridge SHALL attach the managed file to the target Zotero item
- **AND** SHALL NOT use the caller's local source path as a Zotero path.

#### Scenario: Local acquisition is attached by handle
- **GIVEN** an authorized task acquired a verified PDF in the local Host
- **WHEN** it submits the task-owned attachment-ingress-only file handle to canonical attachment creation
- **THEN** Host Bridge SHALL prepare and attach the file using the existing approval, lease, validation, and replay semantics
- **AND** it SHALL NOT require an Agent upload or expose an arbitrary local path.

