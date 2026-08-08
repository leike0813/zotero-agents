## ADDED Requirements

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
