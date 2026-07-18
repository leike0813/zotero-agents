## ADDED Requirements

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
