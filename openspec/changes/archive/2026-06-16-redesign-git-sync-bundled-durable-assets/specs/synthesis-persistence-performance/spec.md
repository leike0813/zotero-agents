## MODIFIED Requirements

### Requirement: Synthesis durable facts and rebuildable projections are separated

Synthesis persistence SHALL keep durable facts exportable while treating cache/projection/runtime state as local materialization.

#### Scenario: Durable facts are exported

- **WHEN** concepts, topic graph decisions, reviews, discovery decisions, reference bindings, tag vocabulary, topic current source assets, or related-items durable effects exist
- **THEN** export SHALL render them into deterministic Git Sync bundle entries.

#### Scenario: Rebuildable projections exist

- **WHEN** cache basis, citation graph cache rows, layout rows, metrics rows, or operation rows exist
- **THEN** export SHALL treat them as local projections or runtime state
- **AND** they SHALL NOT be included in Git Sync bundles or legacy canonical asset copies.
