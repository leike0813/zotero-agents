# acp-runtime-performance-profiler Specification

## Purpose
TBD - created by syncing change profile-acp-runtime-hot-paths. Update Purpose after archive.
## Requirements
### Requirement: ACP runtime profiling is debug-only and source-enabled

ACP runtime profiling SHALL be available only when debug mode and its independent hard-coded profiler source switch are enabled. It SHALL activate only for replay profile windows or deterministic mechanism fixtures and SHALL remain disabled during semantic trace capture. Non-debug production bundles and profiler-switch-disabled debug bundles SHALL eliminate profiler modules, imports, metric markers, profile-context computation, map lookups, synthetic publication attribution, and hot-path branches.

#### Scenario: Non-debug bundle is profiler-free

- **WHEN** the plugin entry is bundled with `__debug_mode__` set to false
- **THEN** the profiler module and Replay-only production ports SHALL contribute zero output bytes
- **AND** the output SHALL contain no profiler schema, metric, profile-context, synthetic-helper, or publication-attribution marker.

#### Scenario: Source-disabled debug bundle is profiler-free

- **WHEN** the plugin entry is bundled in debug mode with the profiler source switch set to false
- **THEN** profiler recorder and replay profiling adapters SHALL contribute no runtime state, context lookup, timer, persistence, publication acknowledgement, or hot-path work.

#### Scenario: Trace capture excludes profiling

- **WHEN** the semantic trace recorder is armed, recording, or frozen
- **THEN** no replay profile SHALL be active and no profiler aggregate SHALL be allocated for captured work.

#### Scenario: Test activation respects debug mode

- **WHEN** a test requests profiling without enabling the debug-mode test override
- **THEN** activation SHALL fail and all profiler APIs SHALL remain inert.

### Requirement: ACP runtime profiles are bounded aggregates

The profiler SHALL accept only fixed metric names and low-cardinality label values. It SHALL store counters, gauges, and fixed-bucket duration aggregates without retaining raw samples, user text, paths, commands, backend identifiers, provider identifiers, or workflow identifiers as metric keys.

#### Scenario: Burst remains bounded

- **WHEN** a debug fixture records 10,000 runtime events
- **THEN** active profiles, completed profiles, metric series, histogram buckets, and retained sample count SHALL remain within fixed bounds
- **AND** retained raw sample count SHALL remain zero.

#### Scenario: Recorder failure is isolated

- **WHEN** an injected profiler clock or scheduler fails
- **THEN** the ACP, Host Bridge, persistence, or UI operation SHALL preserve its original return value and failure behavior.

### Requirement: Runtime work is attributed without guessing

Request-scoped ACP work SHALL be attributed to its durable request id. Host Bridge work SHALL use the existing ACP scope header after parsing. Missing, invalid, or non-ACP scope and shared event-loop drift SHALL be recorded once in a bounded global aggregate.

#### Scenario: Scoped Host Bridge request

- **WHEN** a Host Bridge request carries an ACP Skill run scope with request id `A`
- **THEN** its reader and handler metrics SHALL be attributed to profile `A`.

#### Scenario: Unscoped work remains global

- **WHEN** runtime work has no valid ACP request scope
- **THEN** it SHALL be recorded only in the global aggregate
- **AND** it SHALL NOT be copied to or guessed from active request profiles.

### Requirement: Profiling lifecycle follows replay target lifecycle

Chat and ACP Skills replay targets SHALL expose symmetric profile prepare, start, R3 signature/post attribution, drain, and finish lifecycle. A profile SHALL begin only after synthetic ownership and surface preparation drain and SHALL finish exactly once before cleanup.

#### Scenario: Chat target is active

- **WHEN** a Chat trace profile window publishes Workspace work
- **THEN** R3 prepare, signature, and post metrics SHALL be attributed to the Chat synthetic conversation and selected surface.

#### Scenario: Skills target is active

- **WHEN** a Workflow trace profile window publishes Workspace work
- **THEN** the same R3 lifecycle metrics SHALL be attributed to the synthetic workflow/request owners and selected surface.

#### Scenario: Closed surface runs

- **WHEN** a replay profile executes with Workspace closed
- **THEN** it SHALL produce no R3 metrics.

### Requirement: Automated fixtures establish the mechanism baseline

The repository SHALL provide deterministic automated fixtures for R1 JSON-RPC and persistence work, R2 Host Bridge input, R3 Assistant Workspace publication, event-loop drift, queues, accumulators, and buffered writes. CI SHALL assert counts, bytes, attribution, bounds, and data-flow invariants rather than machine-specific elapsed-time thresholds.

#### Scenario: Silent execution baseline is repeatable

- **WHEN** the automated silent execution fixture runs with the same fixed inputs
- **THEN** it SHALL produce the same counter, byte, attribution, and capacity results without requiring a real Zotero installation.

#### Scenario: Real-host timing is optional

- **WHEN** no Zotero 7 or Zotero 9 timing artifact is available
- **THEN** the automated mechanism baseline SHALL still satisfy this change's completion gate
- **AND** no claim about real-host latency or performance improvement SHALL be made.

### Requirement: Measurement coverage identifies synthetic timing

Profiler coverage SHALL distinguish captured semantic/runtime evidence from timing evidence produced under a logical clock. Logical replay SHALL retain measured values for diagnostics but SHALL mark wall-clock-dependent timing families synthetic and non-comparable without downgrading correctly captured semantic counters.

#### Scenario: Logical replay completes without contamination
- **WHEN** logical replay processes every event and captures all replay-owned timers
- **THEN** execution and semantic measurement SHALL be complete
- **AND** wall-clock-dependent timing SHALL be reported as synthetic rather than as recorded-equivalent evidence.

#### Scenario: Logical timer ownership is contaminated
- **WHEN** Replay cannot prove exclusive ownership of a timer
- **THEN** execution MAY remain complete, measurement SHALL be incomplete, and the structured contamination reason SHALL appear in JSON and Markdown.

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

### Requirement: Profiler vocabulary matches v3 publication semantics

Profiler events SHALL use bounded labels derived from v3 owner source, publication kind, form, cause, and materialization source. Profiler SHALL NOT infer form or source from surface-specific DTO fields.

#### Scenario: Skills transcript delta posts

- **WHEN** Skills posts a steady transcript delta
- **THEN** profiler records source acp-skills, kind transcript, form delta, cause steady-state, and materialization source region.

### Requirement: Forbidden materialization is measured at builder entry

Profiler SHALL count transcript-page, frontend-snapshot, and panel-snapshot materialization at their actual builder entry points so steady transcript/count/progress acceptance can require zero.

#### Scenario: A forbidden builder is called

- **WHEN** a steady publication invokes it before the coordinator
- **THEN** the formal report records the violation even if the final wire payload is a delta.
