## MODIFIED Requirements

### Requirement: Performance is an acceptance contract

Synthesis SHALL use tiered performance budgets and bounded diagnostics for
large local state.

#### Scenario: Target or stress tier exceeds ideal budget

- **WHEN** a UI read or worker path exceeds the normal-tier p95 target
- **THEN** diagnostics SHALL include scale tier, slow phase or query label, and
  limit/truncation metadata
- **AND** the system SHALL prefer degraded bounded output over unbounded scans.

### Requirement: Synthesis repository exposes typed indexed operations

Synthesis SHALL create indexes for identity anchors, citation edge basis/status,
topic discovery hints, dirty events with basis/source hash, job rows, and
related-items sync effects required by the latest design.

#### Scenario: Repository migrates schema

- **WHEN** the repository initializes
- **THEN** idempotent migrations SHALL create indexes required by Registry,
  Graph, discovery, worker, and related-items sync queries.
