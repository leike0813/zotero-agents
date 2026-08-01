## ADDED Requirements

### Requirement: Native compute SHALL reuse one persistent child

All admitted native direct and paged operations SHALL use one lazily started child that remains available after successful tasks and is replaced only after timeout, crash, protocol violation, invalid result, or shutdown.

#### Scenario: Two successful operations run in sequence
- **WHEN** two direct or paged operations complete successfully
- **THEN** both SHALL use the same child identity
- **AND** restart and failure counters SHALL remain unchanged

#### Scenario: Runtime fault terminates the child
- **WHEN** an active operation times out, crashes, violates framing, or returns an invalid result
- **THEN** only that task SHALL fail
- **AND** the next admitted task SHALL use a replacement child unless the three-failure fuse is open

### Requirement: Direct and paged work SHALL share admission and fuse state

Native direct and paged work SHALL share one active slot, at most two queued slots, deadlines, cancellation, restart accounting, and three-consecutive-runtime-failure degraded state.

#### Scenario: Mixed queue reaches capacity
- **WHEN** one direct or paged operation is active and two operations of either path are queued
- **THEN** another request SHALL fail immediately with `worker_busy`

#### Scenario: Mixed faults reach the fuse
- **WHEN** three consecutive runtime faults occur across direct and paged operations
- **THEN** queued and new work SHALL fail with `worker_unavailable`
- **AND** health and shutdown SHALL remain responsive

### Requirement: Worker spans SHALL cover queue and process ownership

Debug worker traces SHALL record admission, queue wait, start, cancel, timeout,
crash, replacement, fuse, and terminal result with stable codes and bounded
metrics.

#### Scenario: A queued worker is canceled
- **WHEN** cancellation occurs before execution
- **THEN** the child span terminates as canceled with queue wait and attempt
