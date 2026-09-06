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

### Requirement: Broker file routes SHALL use the Host Bridge v2 namespace
Broker-issued file upload and download operations SHALL use `/bridge/v2` and retain their opaque-handle, authorization, integrity, and path-redaction requirements.

#### Scenario: Authenticated v2 client downloads a file
- **WHEN** a v2 client downloads a valid broker-issued file handle
- **THEN** Host Bridge SHALL return the authorized bytes under the existing integrity and redaction rules.

#### Scenario: Client uses the removed v1 route
- **WHEN** a client requests the corresponding `/bridge/v1/files` route
- **THEN** Host Bridge SHALL NOT serve it as a supported v2 file operation.

### Requirement: Workflow output resources reuse broker downloads
Workflow output resources SHALL be registered through the existing broker-issued file registry and SHALL use the existing authorization, expiry, size, SHA-256, content type, and path-redaction rules for downloads.

#### Scenario: Workflow output is downloaded remotely
- **WHEN** an authenticated client requests the `fileId` returned for a workflow output
- **THEN** Host Bridge SHALL stream the registered bytes under the existing bounded-transfer and integrity contract
- **AND** it SHALL not require a Host-local output path

#### Scenario: Workflow artifact expires
- **WHEN** a client requests an expired workflow output handle
- **THEN** Host Bridge SHALL return the existing structured expired/unknown handle error
- **AND** it SHALL return no bytes

### Requirement: Attachment locality SHALL project only the current Broker page

Attachment reads and canonical mutation attachment outputs SHALL apply the locality projection only to the current Broker page or bounded result. Each attachment SHALL omit host-local paths and expose only an opaque file descriptor when available or a structured unavailable state otherwise. File registration and transfer SHALL run outside native Host admission.

#### Scenario: Mutation returns an attachment
- **WHEN** a canonical mutation returns attachment facts
- **THEN** the same locality projection SHALL apply
- **AND** the result SHALL not contain a local path, prepared source, or upload lease.

#### Scenario: Attachment page has continuation
- **WHEN** a remote caller reads one attachment page
- **THEN** only that page receives opaque file descriptors or unavailable access
- **AND** no host-local path escapes.

### Requirement: Mutation uploads SHALL become private prepared files

Host Bridge SHALL accept mutation upload input only through opaque registered handles and SHALL acquire the existing lease before trusted execution. The adapter SHALL validate and stage the input into a private prepared-file snapshot before Broker mutation effects. File handles, leases, prepared paths, and staging details SHALL not enter public mutation DTOs, approvals, receipts, attempts, errors, logs, or durable operation identity.

#### Scenario: Valid upload is prepared
- **WHEN** an authorized canonical mutation references a valid unexpired upload handle
- **THEN** Host Bridge SHALL acquire and validate the lease and pass only private prepared-file facts to trusted Broker execution
- **AND** the public result SHALL expose no source path or lease value.

#### Scenario: Prepared source changes
- **WHEN** the source no longer matches prepared identity, size, or SHA-256 facts at execution revalidation
- **THEN** the mutation SHALL fail before its Host effect
- **AND** it SHALL not silently substitute changed content.
