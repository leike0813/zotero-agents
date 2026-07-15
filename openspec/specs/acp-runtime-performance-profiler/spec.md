# acp-runtime-performance-profiler Specification

## Purpose
TBD - created by syncing change profile-acp-runtime-hot-paths. Update Purpose after archive.
## Requirements
### Requirement: ACP runtime profiling is debug-only and source-enabled

ACP runtime profiling SHALL be available only when debug mode and its independent hard-coded profiler source switch are enabled. It SHALL activate only for replay profile windows or deterministic mechanism fixtures and SHALL remain disabled during semantic trace capture. Non-debug production bundles and profiler-switch-disabled debug bundles SHALL eliminate profiler hot-path code, imports, metric markers, and branches.

#### Scenario: Non-debug bundle is profiler-free

- **WHEN** the plugin entry is bundled with `__debug_mode__` set to false
- **THEN** the profiler module SHALL contribute zero output bytes
- **AND** the output SHALL contain no profiler schema or metric markers.

#### Scenario: Source-disabled debug bundle is profiler-free

- **WHEN** the plugin entry is bundled in debug mode with the profiler source switch set to false
- **THEN** profiler recorder and replay profiling adapters SHALL contribute no runtime state, timer, persistence, or hot-path work.

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
