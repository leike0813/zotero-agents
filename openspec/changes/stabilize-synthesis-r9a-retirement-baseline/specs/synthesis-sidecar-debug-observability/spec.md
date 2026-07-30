## ADDED Requirements

### Requirement: Debug builds SHALL expose one read-only lifecycle snapshot

When `__debug_mode__` is enabled, Synthesis startup SHALL publish one sanitized
snapshot keyed by `attemptId` across install, supervision, current-session
discovery, health/handshake, reconcile, and client readiness.

#### Scenario: Startup fails
- **WHEN** any phase fails
- **THEN** Workbench, Task Manager, runtime diagnostic export, and the direct launcher identify the same attempt, phase, and stable code
- **AND** tokens, authorization data, library payloads, and unbounded process output are absent

#### Scenario: Production bundle is built
- **WHEN** `__debug_mode__` is false
- **THEN** the dedicated diagnostic UI, process tails, and debug event projection are absent from executable output

### Requirement: Debug recovery SHALL remain explicit and external

The debug surfaces SHALL be read-only and SHALL NOT automatically restart,
reset, clean, replace production data, or alter runtime installation.

#### Scenario: Manual recovery is required
- **WHEN** the snapshot reports a terminal or repair-required state
- **THEN** the surface exports evidence without mutating runtime state
