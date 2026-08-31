## ADDED Requirements

### Requirement: Artifact content SHALL remain off the general client envelope

Reverse-Host artifact descriptors and control responses SHALL remain bounded. Artifact content larger than the general production-client response bound SHALL be consumed through the approved content/transfer path and MUST NOT be re-embedded into an oversized general JSON result.

#### Scenario: Large artifact supports a client use case
- **WHEN** a valid artifact is larger than 1 MiB and within its artifact bound
- **THEN** the Host and native application exchange it through the approved bounded content path
- **AND** the public control response contains only descriptors, hashes, or the resolved public value

### Requirement: Artifact reads SHALL use bounded ordered concurrency

An operation MAY issue at most two concurrent artifact reads. Results SHALL be associated with their descriptors deterministically, and cancellation, deadline, truncation, or hash mismatch SHALL stop admission of the affected batch before promotion.

#### Scenario: Changed batch contains multiple artifacts
- **WHEN** Reference refresh reads payloads for a bounded changed-source batch
- **THEN** no more than two Host reads are active
- **AND** deterministic result order is independent of completion order
