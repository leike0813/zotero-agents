## ADDED Requirements

### Requirement: Workbench presents cache state and explicit operations
Synthesis Workbench SHALL present sidecar cache status, explicit operation rows, and bounded review queues instead of background synchronization queues.

#### Scenario: Cache is stale
- **WHEN** reference or graph cache status is stale
- **THEN** Workbench SHALL label it as stale cache
- **AND** it SHALL offer an explicit refresh action without implying Zotero Library is stale.

### Requirement: Workbench reads do not start maintenance
Workbench snapshot reads SHALL NOT start cache refresh, startup reconcile, worker drain, or sidecar mutation.

#### Scenario: User opens Workbench
- **WHEN** Workbench builds the initial snapshot
- **THEN** it SHALL read current sidecar rows and direct source-check summaries only
- **AND** it SHALL NOT enqueue or start maintenance work.

## REMOVED Requirements

### Requirement: Synthesis Workbench renders from DB-first state
**Reason**: DB-first wording treats Synthesis state as runtime truth instead of cache/decision sidecar state.
**Migration**: Workbench reads sidecar cache where appropriate and direct Zotero/artifact state where correctness matters.

### Requirement: Background jobs do not duplicate queue aggregates
**Reason**: Background jobs and queue aggregates are removed.
**Migration**: Show explicit operations only.

### Requirement: Workbench maintenance renders WorkItems
**Reason**: WorkItems are removed.
**Migration**: Render explicit operation rows.

### Requirement: Graph tab renders DB graph structure while layout refreshes
**Reason**: Graph tab must describe graph data as cache, not DB truth.
**Migration**: Render available graph cache with stale/missing diagnostics and explicit refresh.
