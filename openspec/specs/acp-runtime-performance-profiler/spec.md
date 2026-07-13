# acp-runtime-performance-profiler Specification

## Purpose
TBD - created by syncing change profile-acp-runtime-hot-paths. Update Purpose after archive.
## Requirements
### Requirement: ACP runtime profiling is debug-only and explicitly enabled

ACP runtime profiling SHALL activate only when debug mode is enabled and an explicit profiler enable action succeeds. Non-debug production bundles SHALL eliminate profiler hot-path code, imports, metric markers, and branches.

#### Scenario: Non-debug bundle is profiler-free

- **WHEN** the plugin entry is bundled with `__debug_mode__` set to false
- **THEN** the profiler module SHALL contribute zero output bytes
- **AND** the output SHALL contain no profiler schema or metric markers.

#### Scenario: Debug mode alone remains inert

- **WHEN** debug mode is enabled but the profiler has not been explicitly enabled
- **THEN** no profile, metric map, timer, snapshot, log, or persistence write SHALL be created.

#### Scenario: Test activation respects debug mode

- **WHEN** a test requests profiler activation without enabling the debug-mode test override
- **THEN** activation SHALL fail and all recorder APIs SHALL remain inert.

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

### Requirement: Profiling lifecycle follows ACP run lifecycle

A profile SHALL start after a durable ACP Skill run request identity exists, SHALL survive recoverable conversation and apply-pending states, and SHALL finish once on the first `succeeded`, `failed`, or `canceled` run transition.

#### Scenario: Recovery reuses active profile

- **WHEN** an ACP Skill run conversation is recovered for an already active request profile
- **THEN** the profiler SHALL reuse the profile without resetting its aggregates or creating a second event-loop timer.

#### Scenario: Terminal transition finishes once

- **WHEN** a run first becomes succeeded, failed, or canceled and later receives another terminal update
- **THEN** its profile SHALL move to completed exactly once.

### Requirement: Automated fixtures establish the mechanism baseline

The repository SHALL provide deterministic automated fixtures for R1 JSON-RPC and persistence work, R2 Host Bridge input, R3 Assistant Workspace publication, event-loop drift, queues, accumulators, and buffered writes. CI SHALL assert counts, bytes, attribution, bounds, and data-flow invariants rather than machine-specific elapsed-time thresholds.

#### Scenario: Silent execution baseline is repeatable

- **WHEN** the automated silent execution fixture runs with the same fixed inputs
- **THEN** it SHALL produce the same counter, byte, attribution, and capacity results without requiring a real Zotero installation.

#### Scenario: Real-host timing is optional

- **WHEN** no Zotero 7 or Zotero 9 timing artifact is available
- **THEN** the automated mechanism baseline SHALL still satisfy this change's completion gate
- **AND** no claim about real-host latency or performance improvement SHALL be made.
