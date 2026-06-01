## MODIFIED Requirements

### Requirement: Reference sidecar refresh is two-stage
Reference sidecar refresh SHALL scan artifact sidecar state and diff references artifact hashes before extracting and reconciling changed references artifacts.

#### Scenario: Refresh completes successfully
- **WHEN** explicit Reference Sidecar refresh finishes
- **THEN** `reference-sidecar:library` SHALL be marked ready in cache basis
- **AND** `citation-graph:library` SHALL be marked stale when reference-affecting inputs may have changed
- **AND** the refresh SHALL NOT rebuild citation graph cache rows.

#### Scenario: Refresh fails after previous success
- **WHEN** explicit Reference Sidecar refresh fails
- **AND** a previous `reference-sidecar:library` cache basis is ready
- **THEN** the ready cache basis SHALL be preserved
- **AND** the failure SHALL be represented as an operation failure, not as cache data deletion.

## ADDED Requirements

### Requirement: Sidecar readiness comes from cache basis
Reference Sidecar data readiness SHALL be derived from `synt_cache_basis`, not from legacy state or projection files.

The cache-basis state set SHALL be limited to `missing`, `refreshing`, `ready`, `stale`, and `failed`; absent or unrecognized values SHALL be treated as `missing`.

#### Scenario: Legacy state file says failed
- **WHEN** `reference-sidecar-state.json` exists with a failed state
- **AND** `reference-sidecar:library` cache basis is ready
- **THEN** Workbench and diagnostics SHALL treat Reference Sidecar data as ready
- **AND** they SHALL NOT create a failed Reference Sidecar job from the legacy file.
