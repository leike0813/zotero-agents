## MODIFIED Requirements

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

Real-workload governance baselines SHALL be complete `zotero-agents.acp-runtime-replay-matrix.v1` outputs. Chat and Workflow source kinds SHALL form separate baseline families, and comparison SHALL require identical trace digest, source kind, cadence, R2 workload version, and replay configuration.

#### Scenario: Same trace is rerun
- **WHEN** a complete trace is replayed again with identical comparison provenance
- **THEN** its formal records SHALL be eligible for before/after governance comparison.

#### Scenario: Source families differ
- **WHEN** one matrix comes from Chat and another from Workflow
- **THEN** the reports SHALL NOT be compared even if other configuration fields match.

## REMOVED Requirements

### Requirement: Baseline records have one sanitized contract
**Reason**: Sanitized live-host aggregate records cannot preserve or repeat the real ACP workload.
**Migration**: Use the local semantic trace digest and replay matrix contract for comparable real-workload baselines; retain automated sanitized records only as smoke artifacts.

### Requirement: Debug Dashboard controls real-host capture
**Reason**: Live profiler capture is replaced by independent Trace Recorder and Replay Profiler workflows.
**Migration**: Record raw semantic events first, then select the completed trace for a nine-run replay matrix.

### Requirement: Real-host captures are durable local diagnostics
**Reason**: The old profiler capture JSON and clipboard workflow no longer represents the source workload.
**Migration**: Save permission-restricted semantic traces locally and generate replay matrix JSON plus Markdown in a separate result directory.
