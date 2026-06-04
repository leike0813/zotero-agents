## ADDED Requirements

### Requirement: Synthesis Sidecar SHALL Not Materialize Deterministic Invalid References
Synthesis invariant guards SHALL cover the boundary that deterministic invalid
reference extraction rows are not promoted into canonical identities.

#### Scenario: Invalid raw reference reaches sidecar ingestion
- **WHEN** tests provide a deterministic invalid reference row to Synthesis sidecar ingestion
- **THEN** no active raw reference or canonical reference SHALL be materialized from that row
- **AND** warning-only references SHALL still be accepted.
