## MODIFIED Requirements

### Requirement: Host Bridge registers downloadable files by handle
The system SHALL expose remote downloads only through broker-issued opaque file
handles.

#### Scenario: Broker registers a downloadable file
- **WHEN** broker code makes a Zotero attachment, workflow artifact, or bridge
  export available for remote download
- **THEN** it SHALL register an opaque `fileId`, display filename, content type,
  source kind, size when available, SHA-256 hash when available, and expiry
  timestamp
- **AND** it MUST NOT expose the internal absolute path in remote responses.

### Requirement: Host Bridge validates file handles before streaming
The system SHALL validate file handles before returning file bytes.

#### Scenario: Known file handle downloads
- **WHEN** an authenticated client requests `GET /bridge/v1/files/{fileId}` for
  a known, unexpired, available file handle
- **THEN** the bridge SHALL return the file bytes without text encoding
  conversion
- **AND** the bridge SHALL include `Content-Length` equal to the exact byte
  length returned
- **AND** the bridge SHALL include `X-Zotero-Bridge-Sha256` when SHA-256
  metadata is known
- **AND** the bridge SHALL include appropriate filename and content type
  metadata
- **AND** the bridge SHALL NOT require a Zotero approval request for the
  registered file download.

### Requirement: Agent-run bundles carry integrity metadata
Host Bridge SHALL expose agent-owned workflow handoff bundles with integrity
metadata suitable for automated download validation.

#### Scenario: Agent-run bundle is registered
- **WHEN** Host Bridge creates a workflow agent-run zip bundle
- **THEN** it SHALL register the bundle descriptor with the zip byte length
- **AND** it SHALL register the bundle descriptor with the SHA-256 of the zip
  bytes
- **AND** the agent-run response `bundle.file` object SHALL include `size` and
  `sha256`.
