## MODIFIED Requirements

### Requirement: Registry candidate validation covers durable effects

Registry candidate validation SHALL verify durable related-items sync effects before candidate promotion.

#### Scenario: Durable sync effect target is missing

- **WHEN** a candidate Registry state cannot resolve a pending or applied related-items sync effect source, target, binding, or active citation edge
- **THEN** validation SHALL fail with bounded diagnostics
- **AND** the active Registry basis SHALL remain unchanged.

#### Scenario: Durable sync effect resolves through redirect

- **WHEN** a durable sync effect points at a literature item redirected by accepted identity state
- **THEN** validation MAY resolve through the redirect
- **AND** promotion SHALL be allowed if the candidate binding and edge are otherwise valid.

### Requirement: Graph promotion triggers related-items sync

Citation graph structure promotion SHALL schedule graph-owned Zotero related-items sync.

#### Scenario: Structure worker commits graph

- **WHEN** graph structure work commits for the active Registry basis
- **THEN** it SHALL enqueue related-items sync work
- **AND** metrics/layout work SHALL remain independently basis guarded.
