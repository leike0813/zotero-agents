## MODIFIED Requirements

### Requirement: Host Bridge exposes read-only library readiness audit

Host Bridge SHALL expose `library.readiness_audit` as a read-only capability for paginated Zotero library readiness inspection.

#### Scenario: Capability returns lightweight readiness DTOs

- **WHEN** `/bridge/v1/call` invokes `library.readiness_audit`
- **THEN** Host Bridge SHALL return `zotero.library.readiness_audit.v1`
- **AND** each item SHALL include a compact Zotero item summary, readiness states for `pdf`, `markdown`, and `analysis`, a `missing` array, and redacted evidence.
- **AND** generated analysis readiness SHALL use the same shared artifact classifier as the Zotero Library Artifacts column, including the embedded-payload fallback for marker-missing generated notes.
- **AND** results SHALL use the same filter, cursor, and limit behavior as the existing library list and snapshot capabilities.

#### Scenario: Capability is read-only

- **WHEN** Host Bridge handles `library.readiness_audit`
- **THEN** it SHALL NOT mutate Zotero data, execute workflows, register file downloads, invalidate caches, or require Zotero UI approval.

#### Scenario: Evidence is redacted

- **WHEN** readiness evidence is returned
- **THEN** it SHALL NOT include local private paths, transcript text, backend private payloads, or decoded note payload bodies.
