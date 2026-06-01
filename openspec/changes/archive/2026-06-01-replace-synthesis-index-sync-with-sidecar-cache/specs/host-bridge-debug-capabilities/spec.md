## ADDED Requirements

### Requirement: Synthesis debug inspects cache and operations only
Host Bridge debug capabilities SHALL expose bounded sidecar cache diagnostics and explicit operation diagnostics only.

#### Scenario: Debug status is requested
- **WHEN** a debug client requests Synthesis diagnostics
- **THEN** the result SHALL include cache status, recent explicit operations, and bounded repository diagnostics
- **AND** it SHALL NOT expose queue pause, queue resume, worker drain, WorkItem retry, or dirty-event controls.

## REMOVED Requirements

### Requirement: Synthesis debug work controls are bounded
**Reason**: Debug work controls operate on removed WorkItem/queue state.
**Migration**: Debug clients may inspect explicit operations and start protected explicit operations.

### Requirement: Synthesis debug work commands inspect and control WorkItems
**Reason**: WorkItems are removed.
**Migration**: Use explicit operation diagnostics.
