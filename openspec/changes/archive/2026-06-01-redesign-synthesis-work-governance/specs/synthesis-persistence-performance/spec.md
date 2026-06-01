## ADDED Requirements

### Requirement: Work queue persistence is indexed and bounded

Synthesis persistence SHALL index WorkItem runtime paths.

#### Scenario: Worker claims work

- **WHEN** a worker claims queued WorkItems by owner and priority
- **THEN** the query SHALL use indexed owner/status/next-run/priority fields
- **AND** it SHALL not scan unrelated Synthesis tables.

#### Scenario: Workbench lists work

- **WHEN** Workbench or debug lists WorkItems
- **THEN** the query SHALL be bounded by limit/status filters and use updated
  or priority indexes.
