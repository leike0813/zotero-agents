## MODIFIED Requirements

### Requirement: Host Bridge validates file handles before streaming
The system SHALL validate file handles before returning file bytes.

#### Scenario: Known file handle downloads
- **WHEN** an authenticated client requests `GET /bridge/v2/files/{fileId}` for
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

### Requirement: Broker file routes SHALL use the Host Bridge v2 namespace
Broker-issued file upload and download operations SHALL use `/bridge/v2` and retain their opaque-handle, authorization, integrity, and path-redaction requirements.

#### Scenario: Authenticated v2 client downloads a file
- **WHEN** a v2 client downloads a valid broker-issued file handle
- **THEN** Host Bridge SHALL return the authorized bytes under the existing integrity and redaction rules.

#### Scenario: Client uses the removed v1 route
- **WHEN** a client requests the corresponding `/bridge/v2/files` route
- **THEN** Host Bridge SHALL NOT serve it as a supported v2 file operation.

