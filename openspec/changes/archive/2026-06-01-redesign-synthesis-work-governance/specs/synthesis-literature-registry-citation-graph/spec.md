## ADDED Requirements

### Requirement: Registry and graph maintenance SHALL use WorkItems

Synthesis Registry and Citation Graph workers SHALL use WorkItems.

#### Scenario: Paper artifact work is processed

- **WHEN** a `paper_registry_incremental` WorkItem identifies one paper scope
- **THEN** the registry worker SHALL update that paper and enqueue downstream
  graph/freshness WorkItems through the Work Registry.

#### Scenario: Graph basis changes during derived work

- **WHEN** a basis-guarded graph, metrics, layout, or related-items WorkItem
  finishes after its basis is stale
- **THEN** final promotion SHALL mark the WorkItem and WorkRun superseded
- **AND** stale output SHALL remain invisible.

#### Scenario: Related-items sync host is unavailable

- **GIVEN** a `related_items_sync` WorkItem is claimed
- **WHEN** the related-items sync worker cannot access a Zotero related-items
  host
- **THEN** the WorkItem SHALL become `failed_retryable` with diagnostics
- **AND** it SHALL NOT remain queued.
