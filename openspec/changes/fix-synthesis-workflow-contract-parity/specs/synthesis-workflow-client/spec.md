## ADDED Requirements

### Requirement: Workflow producers SHALL submit the closed v12 DTO

Workflow packages SHALL convert their result artifacts and item detail DTOs into the declared v12 request before invoking Synthesis. Topic files SHALL become controlled assets. Digest input SHALL contain a flat item snapshot. Control SHALL retain its declared parameter and SHALL NOT carry artifact readers.

#### Scenario: Topic synthesis output is applied

- **WHEN** create or update output references nested manifests and section files
- **THEN** the real workflow hook submits bundle and bounded assets through Host and native client
- **AND** the result persists and remains readable after reopen without local paths crossing the client interface

#### Scenario: Literature analysis or import is applied

- **WHEN** a workflow has a regular item detail and available artifacts
- **THEN** the request preserves its portable identity and bibliographic facts in a flat snapshot
- **AND** absent optional fields are omitted

### Requirement: Workflow failures SHALL retain stable diagnostics and retry eligibility

Contract errors SHALL be permanent failures with a bounded safe field location. Diagnostic logs SHALL retain capability, stage and schema violations without request contents or local paths. A failed sidecar apply SHALL preserve successful note writes and use the Host error contract for retry eligibility.

#### Scenario: A nested resolver is invalid

- **WHEN** validation rejects its shape before RPC
- **THEN** the error identifies the safe resolver field and is not marked retryable
- **AND** diagnostics contain no original resolver values
