## ADDED Requirements

### Requirement: Reference cache does not own Zotero Library facts
Synthesis SHALL treat reference sidecar cache and explicit binding decisions as plugin-owned cache state, not as an independent Zotero Library fact source.

#### Scenario: Paper metadata is displayed
- **WHEN** Workbench or Host Bridge displays Zotero-bound paper metadata
- **THEN** it SHALL either read current Zotero Library state or label sidecar metadata as cached
- **AND** it SHALL NOT claim the cache is synchronized with Zotero.

### Requirement: Citation graph is an explicit cache projection
Citation graph nodes, edges, metrics, and layout SHALL be cache projections built from reference entries, approved binding decisions, and direct Zotero binding checks.

#### Scenario: Graph refresh fails
- **WHEN** an explicit citation graph cache refresh fails
- **THEN** the previous active graph cache SHALL remain readable
- **AND** diagnostics SHALL be stored on the operation.

### Requirement: Graph refresh does not drive topic lifecycle
Citation graph cache refresh SHALL NOT mark topic artifacts stale, enqueue topic discovery, or update topic source-check state.

#### Scenario: Graph cache basis changes
- **WHEN** graph cache is refreshed with new references or bindings
- **THEN** topic create/update and source-check state SHALL remain unchanged
- **AND** graph metrics MAY become available as optional enrichment.

## REMOVED Requirements

### Requirement: Reference sidecar maintenance uses dirty scopes
**Reason**: Dirty scopes are removed with automatic synchronization.
**Migration**: Apply direct sidecar writes and explicit reference cache refresh.

### Requirement: Reference sidecar full rebuild is explicit
**Reason**: Full rebuild belongs to the removed independent fact source.
**Migration**: Use explicit scoped sidecar cache refresh.

### Requirement: Citation graph projection is rebuildable from canonical records
**Reason**: Canonical Registry records are no longer the graph source of truth.
**Migration**: Build graph cache from sidecar references, binding decisions, and direct Zotero checks.

### Requirement: Rebuilds use Foundation transaction and projection registry
**Reason**: Foundation projection registry rebuild semantics are removed from the active model.
**Migration**: Explicit operations update sidecar cache projections.

### Requirement: Reference sidecar projections are freshness tracked
**Reason**: Projection freshness is replaced by sidecar cache basis state.
**Migration**: Track cache basis per projection.

### Requirement: Reference sidecar rebuild runs in a single background worker
**Reason**: Background rebuild workers are removed.
**Migration**: Explicit cache refresh runs under an operation.

### Requirement: Literature and citation graph actions are asynchronous in UI
**Reason**: This requirement is tied to old background action semantics.
**Migration**: Long explicit operations report progress and may yield between bounded slices.

### Requirement: Full Registry rebuild promotion schedules related-items sync reconciliation
**Reason**: Registry rebuild promotion and dirty related-items sync are removed.
**Migration**: Related-items sync is explicit and provenance protected.

### Requirement: Registry rebuild uses staged promotion
**Reason**: Registry rebuild is removed.
**Migration**: Cache refresh may use candidate validation internally, but it is not a Registry epoch.

### Requirement: Registry and graph maintenance SHALL use WorkItems
**Reason**: WorkItems are removed.
**Migration**: Use explicit operations.

### Requirement: Derived worker output is invisible until basis-checked promotion
**Reason**: Derived workers are removed.
**Migration**: Explicit cache refresh keeps previous cache until refreshed output validates.
