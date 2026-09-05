## ADDED Requirements

### Requirement: Attachment locality SHALL project only the current Broker page
Attachment read capabilities SHALL apply the existing shared mutation/read file-locality projection only to their current Broker page. Page continuation and ordering SHALL remain Broker-owned. File registration and transfer SHALL run outside native Host admission and SHALL preserve existing authorization, integrity, bounded-memory and path-redaction rules.

#### Scenario: Attachment page has continuation
- **WHEN** a remote caller reads one attachment page
- **THEN** only that page receives opaque file descriptors or unavailable access and no host-local path escapes.
