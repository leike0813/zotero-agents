## ADDED Requirements

### Requirement: Maintenance is explicit operation only
Synthesis maintenance SHALL run only as explicit user/debug operations or bounded workflow apply sidecar sync.

#### Scenario: Maintenance status is read
- **WHEN** UI or Host Bridge reads maintenance state
- **THEN** it SHALL return explicit operation status and cache diagnostics
- **AND** it SHALL NOT expose background worker queue state.

## REMOVED Requirements

### Requirement: Maintenance workers respect the Synthesis file boundary
**Reason**: Maintenance workers and WorkItem/WorkRun persistence are removed.
**Migration**: Explicit operation records remain in SQLite sidecar state.
