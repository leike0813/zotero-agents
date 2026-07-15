## ADDED Requirements

### Requirement: R3 profiler measures the region publication lifecycle

The R3 profiler SHALL separately record requested, dropped-before-build, prepare, signature-skip, post, shell-forward, child-apply, and render-ack stages for baseline and each typed region publication. Every record SHALL identify publication kind, owner class, initialization versus steady state, and matching-target, opposite-active, or inactive-source causality.

#### Scenario: Inactive source is rejected early

- **WHEN** a profiled source change cannot target the current Workspace owner
- **THEN** R3 SHALL record dropped-before-build with inactive-source or owner-mismatch causality
- **AND** prepare, signature, post, shell-forward, child-apply, and render-ack SHALL remain zero for that request.

#### Scenario: Region publication renders

- **WHEN** a matching current-owner region publication completes
- **THEN** its prepare, post, shell-forward, child-apply, and render-ack records SHALL share attributable publication identity.

#### Scenario: Publication identities are recorded without high-cardinality metric series

- **WHEN** multiple publications of the same kind complete during one profile
- **THEN** their lifecycle identities SHALL be retained in a bounded identity sidecar
- **AND** ordinary metric series SHALL remain aggregated by stable publication labels rather than publication ID.

### Requirement: R3 profiler reports actual bytes and durations

The profiler SHALL compute signature input bytes from the actual bounded region DTO and posted bytes from the actual publication envelope. It SHALL NOT stringify a profiler-only full snapshot. Duration summaries SHALL report count, total milliseconds, and maximum milliseconds as distinct values.

#### Scenario: Signature input differs from posted envelope

- **WHEN** a region DTO is signed and its envelope is posted
- **THEN** the profiler SHALL retain separate signature input and actual posted byte totals
- **AND** neither value SHALL be labeled as the other.

#### Scenario: Duration family is aggregated

- **WHEN** multiple lifecycle operations are measured
- **THEN** the report SHALL expose operation count, total duration, and maximum duration separately.

### Requirement: Corrected R3 baseline is causally comparable

Corrected pre-governance and post-governance evidence SHALL use the same live trace, display mode, cadence, source target, and provenance. Logical cadence MAY compare deterministic counts and bytes but SHALL NOT support a claim about real-host latency.

#### Scenario: Governance evidence is compared

- **WHEN** before and after R3 matrices are compared
- **THEN** their trace digest, live display mode, cadence, target, and relevant provenance SHALL match
- **AND** the report SHALL distinguish deterministic mechanism evidence from real-host timing evidence.
