# acp-runtime-performance-baseline Specification

## Purpose
TBD - created by syncing change capture-acp-runtime-governance-baselines. Update Purpose after archive.

## Requirements

### Requirement: Automated baseline records production-path workload

The repository SHALL retain deterministic `closed`, `open-inactive`, and `acp-active` production-seam matrices as CI mechanism smoke baselines. They SHALL assert counts, bytes, attribution, bounds, and data-flow invariants but SHALL NOT represent a comparable real-workload governance baseline.

#### Scenario: Repeated smoke matrix is deterministic

- **WHEN** the automated fixture executes the same fixed workload twice
- **THEN** normalized counters, bytes, gauge peaks, duration invocation counts, attribution, and completion SHALL match
- **AND** the result SHALL identify itself as a mechanism smoke baseline.

#### Scenario: Surface smoke preserves R3 meaning

- **WHEN** the automated surface matrix is recorded
- **THEN** `closed` SHALL contain no R3 work
- **AND** open surfaces SHALL retain their exact R3 attribution.

### Requirement: Comparable real-workload baselines use replay matrices

Real-workload governance baselines SHALL be complete `zotero-agents.acp-runtime-replay-matrix.v2` outputs. Chat and Workflow source kinds SHALL form separate baseline families, and comparison SHALL require identical trace digest, source kind, cadence, R2 workload version, and replay configuration.

#### Scenario: Same trace is rerun
- **WHEN** a complete trace is replayed again with identical comparison provenance
- **THEN** its formal records SHALL be eligible for before/after governance comparison.

#### Scenario: Source families differ
- **WHEN** one matrix comes from Chat and another from Workflow
- **THEN** the reports SHALL NOT be compared even if other configuration fields match.

### Requirement: Profiler surfaces preserve rendering isolation

Profiler availability, state, revisions, and metrics SHALL NOT enter Assistant
Workspace snapshots, transcript keys, Dashboard chrome signatures, or unrelated
Dashboard selected-surface signatures.

#### Scenario: Profiler snapshot changes

- **WHEN** a profiler snapshot changes while its Dashboard tab is selected
- **THEN** only the profiler selected-surface signature MAY change
- **AND** no Assistant Workspace or unrelated Dashboard managed region SHALL be
  rebuilt because of that change.
