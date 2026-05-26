## ADDED Requirements

### Requirement: Literature registry projections are freshness tracked

Synthesis Literature Registry SHALL maintain persistent freshness/job state for canonical-backed registry and citation projections.

#### Scenario: Source inputs become stale

- **WHEN** registry or citation graph source inputs change
- **THEN** literature job state SHALL become `stale`
- **AND** a background rebuild MAY be queued without blocking snapshot reads.

#### Scenario: Projection is missing

- **WHEN** the local JSON projection cache is missing
- **THEN** literature job state SHALL become `missing`
- **AND** latest usable projection diagnostics SHALL be exposed.

### Requirement: Literature registry rebuild runs in a single background worker

Synthesis Literature Registry SHALL run canonical/projection rebuilds through a single service-level worker when queued.

#### Scenario: Multiple rebuild notifications are coalesced

- **WHEN** multiple rebuild requests occur within the debounce window
- **THEN** only one background rebuild SHALL run.

#### Scenario: Rebuild succeeds

- **WHEN** the background rebuild completes successfully
- **THEN** job state SHALL become `ready`
- **AND** literature and citation projection source manifest hashes SHALL match canonical manifest hash.

#### Scenario: Rebuild fails retryably

- **WHEN** rebuild fails with a retryable error
- **THEN** job state SHALL become `failed_retryable`
- **AND** retry attempt and next retry time SHALL be recorded
- **AND** latest usable projection files SHALL remain readable.

#### Scenario: Manual retry is requested

- **WHEN** manual retry is requested
- **THEN** the worker SHALL clear scheduled retry metadata and attempt rebuild immediately.

### Requirement: Literature projection backend is declared

Synthesis Literature Registry SHALL declare its current projection backend as JSON/DTO.

#### Scenario: Projection is written

- **WHEN** registry and citation projections are rebuilt
- **THEN** each projection SHALL include backend metadata with `kind` equal to `json-dto`
- **AND** `sqlite`, `fts`, and `bm25` SHALL be false.
