## ADDED Requirements

### Requirement: Host Bridge registers downloadable files by handle
The system SHALL expose remote downloads only through broker-issued opaque file
handles.

#### Scenario: Broker registers a downloadable file
- **WHEN** broker code makes a Zotero attachment, workflow artifact, or bridge
  export available for remote download
- **THEN** it SHALL register an opaque `fileId`, display filename, content type,
  source kind, size when available, and expiry timestamp
- **AND** it MUST NOT expose the internal absolute path in remote responses.

#### Scenario: Arbitrary path download is rejected
- **WHEN** a client requests a file download by providing a path or path-like
  parameter instead of a registered `fileId`
- **THEN** the bridge SHALL return a structured validation error
- **AND** no local file bytes SHALL be read.

### Requirement: Host Bridge validates file handles before streaming
The system SHALL validate file handles before returning file bytes.

#### Scenario: Known file handle downloads
- **WHEN** an authenticated client requests `GET /bridge/v1/files/{fileId}` for
  a known, unexpired, available file handle
- **THEN** the bridge SHALL stream or otherwise return the file bytes with
  appropriate filename and content type metadata
- **AND** the bridge SHALL NOT require a Zotero approval request for the
  registered file download.

#### Scenario: Expired or unknown file handle fails
- **WHEN** an authenticated client requests an unknown or expired `fileId`
- **THEN** the bridge SHALL return a structured error
- **AND** no file bytes SHALL be returned.
