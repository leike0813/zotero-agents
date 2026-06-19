## Purpose

Host Bridge debug surfaces expose bounded diagnostics for Synthesis cache and explicit operations.

## Requirements

### Requirement: Synthesis debug inspects cache and operations only
Host Bridge debug capabilities SHALL expose bounded sidecar cache diagnostics and explicit operation diagnostics only.

#### Scenario: Debug status is requested
- **WHEN** a debug client requests Synthesis diagnostics
- **THEN** the result SHALL include cache status, recent explicit operations, and bounded repository diagnostics
- **AND** it SHALL NOT expose queue pause, queue resume, worker drain, WorkItem retry, or dirty-event controls.

### Requirement: Host Bridge SHALL expose SkillRunner connection audit as a debug capability

Host Bridge debug capabilities SHALL include a read-only SkillRunner connection
audit snapshot.

#### Scenario: debug capability returns connection snapshot

- **WHEN** debug mode is enabled
- **AND** a caller invokes `debug.skillrunner.connections.snapshot`
- **THEN** the capability SHALL return the redacted SkillRunner connection
  governor snapshot used by the Dashboard audit tab

#### Scenario: debug capability is gated

- **WHEN** debug mode is disabled
- **THEN** `debug.skillrunner.connections.snapshot` SHALL NOT be exposed or
  callable outside the existing debug capability gating
