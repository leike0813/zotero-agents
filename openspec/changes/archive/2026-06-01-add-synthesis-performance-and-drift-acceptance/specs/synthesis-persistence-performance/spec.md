## MODIFIED Requirements

### Requirement: Performance is an acceptance contract

Synthesis SHALL report measured durations and bounded diagnostics for normal,
target, and stress scale tiers.

#### Scenario: Large synthetic dataset is tested

- **WHEN** performance acceptance runs against 1k or 10k synthetic paper data
- **THEN** Workbench snapshot, Registry page, graph slice, metrics read, and
  worker batch paths SHALL report measured durations
- **AND** failures SHALL include slow phase/query labels and limit metadata.

#### Scenario: Stress tier cannot meet normal target

- **WHEN** stress-tier read paths exceed normal-tier p95 targets
- **THEN** Synthesis SHALL return degraded bounded output or diagnostics
- **AND** it SHALL NOT perform unbounded scans.

## ADDED Requirements

### Requirement: Bulk and structural drift do not fan out

Startup reconcile SHALL classify external source drift before enqueueing work.

#### Scenario: Bulk drift is detected

- **WHEN** changed item count or ratio exceeds bulk thresholds
- **THEN** Synthesis SHALL record a bounded drift incident
- **AND** it SHALL NOT create per-item dirty events, graph jobs, review cards, or
  topic work.

#### Scenario: Structural drift is detected

- **WHEN** binding collision, impossible parent note structure, decode failure
  ratio, hard fingerprint timeout, or inconsistent source state is detected
- **THEN** Synthesis SHALL fail closed with repair-required diagnostics
- **AND** incremental fan-out SHALL remain paused until explicit inspect or
  repair.
