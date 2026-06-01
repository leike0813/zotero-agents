## ADDED Requirements

### Requirement: Explicit operations report progress
Synthesis SHALL report progress only for explicit operations and workflow apply sidecar sync.

#### Scenario: Cache refresh reports progress
- **WHEN** an explicit cache refresh processes references or graph rows
- **THEN** the operation SHALL expose status, phase, processed count, optional total count, diagnostics, and updated timestamp.

### Requirement: Completed operation history is bounded
Synthesis SHALL keep operation history bounded by limit, age, or explicit clear behavior.

#### Scenario: Workbench lists recent operations
- **WHEN** Workbench requests operation rows
- **THEN** the repository SHALL return bounded rows
- **AND** it SHALL NOT scan or project legacy job state.

## REMOVED Requirements

### Requirement: Synthesis jobs SHALL expose durable progress state
**Reason**: Durable background jobs are removed.
**Migration**: Explicit operations expose progress.

### Requirement: Work lifecycle helpers are unified
**Reason**: Work lifecycle helpers are tied to WorkItem/WorkRun state.
**Migration**: Operation lifecycle helpers replace them.

### Requirement: Workbench job projection SHALL prefer precise backend progress
**Reason**: Background job projection and queue fallback are removed.
**Migration**: Workbench reads operation rows.

### Requirement: Debug jobs SHALL match Workbench job projection
**Reason**: Debug job projection is removed.
**Migration**: Debug reads operation rows.

### Requirement: WorkRun progress replaces standalone job progress
**Reason**: WorkRun is removed with WorkItems.
**Migration**: Store operation progress directly.
