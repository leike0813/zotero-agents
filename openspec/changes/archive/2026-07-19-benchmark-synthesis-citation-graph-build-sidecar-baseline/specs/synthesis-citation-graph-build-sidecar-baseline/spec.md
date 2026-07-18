## ADDED Requirements

### Requirement: Deterministic graph-build benchmark matrix
The system SHALL define one benchmark fixture source for the small canary, the
2,000-source/20,000-reference boundary, and the normal, target, and stress scale
tiers. Fixture construction SHALL reuse the production graph-build contract and
SHALL contain no production Zotero, repository, canonical-file, or Host data.

#### Scenario: Repeated fixture construction
- **WHEN** the same named benchmark profile is constructed more than once
- **THEN** its counts, identifiers, request bytes, JSON-node count, and canonical engine result are deterministic

### Requirement: Stable CI envelope gate
Core 200 SHALL classify benchmark request and result envelopes against the
authoritative sidecar byte and JSON-node limits without asserting
machine-dependent timing or memory values.

#### Scenario: Representative boundary exceeds the monolithic wire
- **WHEN** the 2,000-source/20,000-reference fixture is measured
- **THEN** CI records the exact request and result classifications and proves that the current monolithic HTTP envelope is not production eligible

### Requirement: Opt-in isolated scale sampling
The repository SHALL expose an explicit benchmark command that samples selected
normal, target, or stress profiles outside ordinary CI. Each heavy profile
SHALL run with bounded time and memory isolation, and timeout, wire rejection,
worker failure, or resource exhaustion SHALL be emitted as structured outcomes.

#### Scenario: Heavy profile cannot complete
- **WHEN** a selected profile exceeds a wire, worker, time, or memory bound
- **THEN** the parent benchmark exits cleanly with the failed phase and stable classification recorded

### Requirement: Cross-process measurement report
The benchmark SHALL report aggregate request/result size, phase timing, direct
compute, strict rebuild, worker round-trip, CPU, memory, event-loop
responsiveness, and cancellation observations where the phase is eligible. The
report SHALL distinguish measured, rejected, skipped, and resource-failed
phases and SHALL exclude secrets, local paths, and full DTO payloads.

#### Scenario: Baseline is captured
- **WHEN** the benchmark is run for the documented baseline profiles
- **THEN** a versioned report records commands, runtime provenance, aggregate measurements, classifications, limitations, and the prerequisite for the next transfer change
