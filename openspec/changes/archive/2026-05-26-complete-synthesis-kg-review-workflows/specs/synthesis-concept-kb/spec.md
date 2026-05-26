## MODIFIED Requirements

### Requirement: Concept card proposals are ingested safely

Synthesis Concept KB SHALL convert topic synthesis concept card proposals into canonical concept assets, topic links, review items, or diagnostics.

#### Scenario: Ambiguous or low-confidence proposal is queued for review

- **WHEN** matching is ambiguous or confidence is low
- **THEN** ingestion SHALL create an open canonical concept review item
- **AND** it SHALL record a review diagnostic
- **AND** it SHALL NOT silently merge or create active concept records.

## ADDED Requirements

### Requirement: Concept review queue is actionable

Synthesis Concept KB SHALL allow Workbench users to resolve open concept review items through canonical transactions.

#### Scenario: Review item is approved as a new concept

- **WHEN** an open review item is approved with `approve_create`
- **THEN** the stored proposal SHALL create concept, sense, alias, and topic concept-link records
- **AND** the review item status SHALL become `approved`
- **AND** `concept-kb-index` SHALL be marked stale.

#### Scenario: Review item is merged into an existing concept

- **WHEN** an open review item is applied with `merge_into_existing` and a target concept id
- **THEN** the stored proposal SHALL create sense, alias, and topic concept-link records for that concept
- **AND** the review item status SHALL become `merged`.

#### Scenario: Review item is rejected

- **WHEN** an open review item is rejected
- **THEN** no concept, sense, alias, or topic link SHALL be created from that item
- **AND** the review item status SHALL become `rejected`.

#### Scenario: Invalid review action is diagnostic-only

- **WHEN** a missing, closed, or invalid review item is applied
- **THEN** the service SHALL return a structured diagnostic
- **AND** no unrelated canonical assets SHALL be changed.

## MODIFIED Requirements

### Requirement: Concept KB projection is rebuildable

Synthesis Concept KB SHALL maintain a rebuildable `concept-kb-index` projection DTO including review queue state.

#### Scenario: Projection contains review queue

- **WHEN** the concept projection is rebuilt from canonical files
- **THEN** it SHALL include concept review items from canonical review assets.
