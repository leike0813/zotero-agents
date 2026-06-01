## Purpose

Topic workflows use direct Zotero/artifact reads and treat graph cache as optional enrichment.

## Requirements

### Requirement: Topic workflows ignore sidecar synchronization state
Topic create/update and source-check workflows SHALL use direct Zotero/artifact reads and SHALL NOT depend on sidecar cache freshness.

#### Scenario: Graph cache is missing
- **WHEN** a user starts topic create or update and graph cache is missing
- **THEN** the workflow SHALL continue without graph metrics
- **AND** it SHALL NOT start cache refresh.
