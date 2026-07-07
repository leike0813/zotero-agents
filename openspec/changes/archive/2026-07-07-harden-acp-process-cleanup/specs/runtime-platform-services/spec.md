## ADDED Requirements

### Requirement: Runtime process-control capabilities SHALL be preflighted at startup

The platform layer SHALL detect local subprocess process-control capabilities
during startup preflight and cache the result for the plugin lifecycle.

#### Scenario: Startup initializes process-control snapshot

- **WHEN** the plugin runs runtime startup preflight
- **THEN** the platform layer SHALL initialize a process-control snapshot after
  command and environment preflight
- **AND** the snapshot SHALL identify the platform, preferred cleanup strategy,
  process tree cleanup support, process group launch support, and diagnostics.

#### Scenario: Transport close reuses cached process-control result

- **GIVEN** process-control preflight has completed
- **WHEN** an ACP transport closes a local backend
- **THEN** it SHALL use the cached process-control snapshot
- **AND** it SHALL NOT run platform capability detection during close.

### Requirement: Startup runtime preflight SHALL emit one info log per stage

Runtime startup preflight SHALL append one structured `info` runtime log for
each command, environment, and process-control preflight stage.

#### Scenario: Startup logs bounded stage summaries

- **WHEN** startup runtime preflight completes command, environment, and
  process-control stages
- **THEN** the runtime log SHALL contain one `info` entry for each stage
- **AND** each entry SHALL include bounded summary fields needed for diagnostics
- **AND** entries SHALL NOT include full environment records, full PATH values,
  tokens, secrets, or complete backend command lines.

## MODIFIED Requirements

### Requirement: Runtime platform services own platform-sensitive primitives

The system SHALL provide a shared platform services layer for runtime platform
detection, native path handling, environment/PATH handling, command resolution,
process-control capability detection, and subprocess execution.

#### Scenario: Business module needs process cleanup capabilities

- **WHEN** plugin code needs to decide how to terminate a local process tree
- **THEN** it SHALL read the shared process-control snapshot
- **AND** it SHALL NOT implement ad hoc per-close platform detection.
