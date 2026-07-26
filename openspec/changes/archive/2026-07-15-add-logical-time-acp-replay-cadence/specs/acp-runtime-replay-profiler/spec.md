## MODIFIED Requirements

### Requirement: Replay cadence preserves its declared timing model

Replay SHALL support `recorded`, `logical`, and `burst` cadence. Recorded SHALL wait for trace gaps, burst SHALL skip trace-gap waits, and logical SHALL advance a run-scoped logical clock while preserving replay-owned timer deadline and registration ordering. Missing cadence SHALL default to recorded and unknown cadence SHALL be rejected.

#### Scenario: Logical replay crosses timer deadlines
- **WHEN** logical replay advances from one trace offset to another
- **THEN** all owned timer deadlines at or before the new offset SHALL execute before the event at that offset, with equal deadlines ordered by registration
- **AND** callback-created due work SHALL execute in a later callback batch rather than recursive synchronous execution.

#### Scenario: Logical replay reaches the trace tail
- **WHEN** an owned timer deadline is later than the final trace offset
- **THEN** Replay SHALL restore it to native scheduling using the remaining delay before target drain
- **AND** logical-scope disposal SHALL NOT cancel the restored native timer.

#### Scenario: Logical replay is canceled or fails
- **WHEN** cancellation, event consumption, drain, profiler finish, or cleanup fails
- **THEN** Replay SHALL release future timers to native scheduling, preserve write-bearing work, dispose logical ownership, restore Workspace state, and retain incomplete evidence.

### Requirement: Logical replay owns only synthetic timer work

Logical replay SHALL take ownership only of timers attributable to the current synthetic Chat conversation, Skills request owners, or prepared Workspace target. Existing, mixed-owner, replaced, early-fired, or background timers SHALL remain native and SHALL produce structured contamination evidence.

#### Scenario: A global pending timer mixes owners
- **WHEN** a Skills change timer contains any request id outside the current logical replay run
- **THEN** Replay SHALL NOT detach the timer and measurement SHALL become incomplete with `logical-timer-contamination`.

#### Scenario: Workspace publication is not cleanly owned
- **WHEN** Workspace has baseline pending publication, changes host, or receives unrelated background publication
- **THEN** Replay SHALL leave the timer native and report logical timer contamination.

### Requirement: Disabled and inactive replay adds no business hot-path work

The production Chat, Skills, and Workspace timer schedule paths SHALL retain direct native timer calls without scheduler lookup, profile-context lookup, conditional dispatch, additional allocation, or logical module initialization. Logical replay modules and synthetic control bodies SHALL be elided when Debug or Replay Profiler source is disabled.

#### Scenario: Replay Profiler source is disabled
- **WHEN** a diagnostic bundle is built with Replay Profiler source disabled
- **THEN** logical scheduler code and replay-only timer control markers SHALL contribute zero output bytes.

#### Scenario: Logical replay is inactive
- **WHEN** Replay Profiler is available but no logical run is active
- **THEN** business scheduling SHALL issue the same native timer calls and delays as before and SHALL invoke no logical port operation.

### Requirement: Replay reports classify logical evidence

Logical replay JSON and Markdown SHALL record cadence, logical scheduler version, contamination, and timing comparability. Semantic disposition, persistence, change, publication, and payload evidence SHALL remain reportable, while wall time, throughput, scheduler lag, event-loop drift, and wall-clock-dependent request duration SHALL be labeled synthetic and non-comparable.

#### Scenario: Logical matrices are compared
- **WHEN** matrices have different cadence or logical scheduler version
- **THEN** they SHALL NOT be treated as comparable performance evidence.
