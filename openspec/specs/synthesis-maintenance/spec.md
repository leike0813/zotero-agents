## Purpose

Synthesis maintenance is explicit and observable; it is not a background worker subsystem.

## Requirements

### Requirement: Maintenance is explicit operation only
Synthesis maintenance SHALL run only as explicit user/debug operations or bounded workflow apply sidecar sync.

#### Scenario: Maintenance status is read
- **WHEN** UI or Host Bridge reads maintenance state
- **THEN** it SHALL return explicit operation status and cache diagnostics
- **AND** it SHALL NOT expose background worker queue state.
