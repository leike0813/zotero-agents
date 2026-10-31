## MODIFIED Requirements

### Requirement: Host Bridge validates file handles before streaming
The system SHALL validate file handles and their permitted use before returning file bytes.

#### Scenario: Known file handle downloads
- **WHEN** an authenticated client requests `GET /bridge/v2/files/{fileId}` for
  a known, unexpired, available file handle authorized for remote download
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

#### Scenario: Acquisition-only handle is requested remotely
- **WHEN** a client requests bytes using an attachment-ingress-only acquisition handle
- **THEN** Host Bridge SHALL reject the request before reading file bytes, even when the handle is known and unexpired.

### Requirement: Broker file routes SHALL use the Host Bridge v2 namespace
Broker-issued file upload and download operations SHALL use `/bridge/v2` and retain their opaque-handle, authorization, integrity, and path-redaction requirements.

#### Scenario: Authenticated v2 client downloads a file
- **WHEN** a v2 client downloads a valid broker-issued file handle authorized for remote download
- **THEN** Host Bridge SHALL return the authorized bytes under the existing integrity and redaction rules.

#### Scenario: Client uses the removed v1 route
- **WHEN** a client requests the corresponding `/bridge/v1/files` route
- **THEN** Host Bridge SHALL NOT serve it as a supported v2 file operation.

### Requirement: Mutation uploads SHALL become private prepared files

Host Bridge SHALL accept mutation upload and local acquisition input only through opaque registered handles and SHALL acquire the existing lease before trusted execution. The adapter SHALL validate and stage the input into a private prepared-file snapshot before Broker mutation effects. File handles, leases, prepared paths, and staging details SHALL not enter public mutation DTOs, approvals, receipts, attempts, errors, logs, or durable operation identity.

#### Scenario: Valid upload is prepared
- **WHEN** an authorized canonical mutation references a valid unexpired upload handle
- **THEN** Host Bridge SHALL acquire and validate the lease and pass only private prepared-file facts to trusted Broker execution
- **AND** the public result SHALL expose no source path or lease value.

#### Scenario: Prepared source changes
- **WHEN** the source no longer matches prepared identity, size, or SHA-256 facts at execution revalidation
- **THEN** the mutation SHALL fail before its Host effect
- **AND** it SHALL not silently substitute changed content.

#### Scenario: Locally acquired file is prepared
- **WHEN** an authorized task submits its valid acquisition file handle for canonical attachment creation
- **THEN** Host Bridge SHALL validate task ownership and attachment-ingress purpose, acquire a lease, and prepare the file using the same validation and approval-time revalidation as uploads
- **AND** acquisition origin SHALL remain distinct from uploaded origin
- **AND** canonical replay SHALL be resolved before acquiring or preparing resources.

#### Scenario: Task ends while attachment preparation holds a lease
- **WHEN** task cleanup encounters a file with an active attachment preparation lease
- **THEN** cleanup SHALL defer disposal until the lease is released
- **AND** cleanup SHALL NOT delete a committed Zotero attachment.

