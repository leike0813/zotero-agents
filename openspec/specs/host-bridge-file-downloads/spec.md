# host-bridge-file-downloads Specification

## Purpose
TBD - created by archiving change introduce-host-bridge-cli-interface. Update Purpose after archive.
## Requirements
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

#### Scenario: Expired or unknown file handle fails
- **WHEN** an authenticated client requests an unknown or expired `fileId`
- **THEN** the bridge SHALL return a structured error
- **AND** no file bytes SHALL be returned.

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

### Requirement: Host Bridge file transfer has bounded JavaScript memory

Host Bridge SHALL register, verify, and deliver downloadable files without requiring the complete file contents to reside in JavaScript memory.

#### Scenario: Large registered file is prepared for download

- **WHEN** broker code registers or verifies a file larger than the configured transfer chunk
- **THEN** each JavaScript byte segment SHALL remain bounded by the shared transfer policy
- **AND** the implementation SHALL NOT invoke a whole-file fallback.

#### Scenario: Multiple attachments are registered

- **WHEN** a capability returns multiple downloadable Zotero attachments
- **THEN** file hashing SHALL use the shared bounded registration concurrency
- **AND** returned attachment descriptors SHALL preserve the capability result order.

#### Scenario: Registered file is delivered

- **WHEN** Host Bridge sends a successful registered-file response
- **THEN** the response body SHALL be copied from a file-backed source through bounded asynchronous transfer
- **AND** no internal response DTO SHALL contain the complete file bytes.

### Requirement: Host Bridge detects registered source changes before success

Host Bridge SHALL validate registered file size and known SHA-256 metadata before sending a successful download response.

#### Scenario: Registered source is truncated before download

- **WHEN** a registered source file has a different size before success headers are sent
- **THEN** Host Bridge SHALL return a structured `file_unavailable` error
- **AND** it SHALL NOT return a successful file body.

#### Scenario: Registered source changes without changing size

- **WHEN** a registered source file has the registered size but a different SHA-256 before success headers are sent
- **THEN** Host Bridge SHALL return a structured `file_unavailable` error
- **AND** it SHALL NOT pair the registered checksum header with the changed body as a successful response.

#### Scenario: Source changes during transfer

- **WHEN** a source changes after success headers are sent
- **THEN** the transfer SHALL terminate or produce length/checksum mismatch evidence consumable by the existing CLI retry contract
- **AND** the server SHALL NOT fall back to buffering the complete source.

