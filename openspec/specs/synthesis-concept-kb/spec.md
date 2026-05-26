# synthesis-concept-kb Specification

## Purpose
TBD - created by archiving change add-synthesis-kg-concept-kb. Update Purpose after archive.
## Requirements
### Requirement: Concept KB canonical files are persisted

Synthesis Concept KB SHALL persist canonical concept, sense, alias, relation, manifest, and topic concept-link files using Foundation canonical transactions.

#### Scenario: Empty Concept KB is initialized

- **WHEN** the concept KB service loads against an empty KG store
- **THEN** it SHALL initialize `synthesis/concepts/concepts`, `senses`, `aliases`, `relations`, `tombstones`, and `manifest.json`
- **AND** it SHALL return an empty concept snapshot.

#### Scenario: Concept transaction commits

- **WHEN** valid concept, sense, alias, relation, or topic concept-link assets are written
- **THEN** the service SHALL persist canonical JSON through a Foundation transaction
- **AND** it SHALL mark `concept-kb-index` stale.

### Requirement: Concept card proposals are ingested safely

Synthesis Concept KB SHALL convert topic synthesis concept card proposals into canonical concept assets, topic links, or diagnostics.

#### Scenario: New concept card creates canonical records

- **WHEN** a valid concept card proposal has a label, definition, and confidence
- **THEN** ingestion SHALL create concept, sense, alias, and topic concept-link records
- **AND** generated IDs SHALL be plugin-owned and deterministic enough for repeat ingestion.

#### Scenario: Exact alias match merges into existing concept

- **WHEN** a proposal label or alias exactly matches an existing alias record
- **THEN** ingestion SHALL add or update a sense/topic link for that concept
- **AND** it SHALL NOT create a duplicate concept.

#### Scenario: Ambiguous or low-confidence proposal is downgraded

- **WHEN** matching is ambiguous or confidence is low
- **THEN** ingestion SHALL record a review diagnostic
- **AND** it SHALL NOT silently merge unrelated concepts.

### Requirement: Concept KB projection is rebuildable

Synthesis Concept KB SHALL maintain a rebuildable `concept-kb-index` projection DTO including review queue state.

#### Scenario: Projection contains review queue

- **WHEN** the concept projection is rebuilt from canonical files
- **THEN** it SHALL include concept review items from canonical review assets.

### Requirement: Concept diagnostics are sanitized

Synthesis Concept KB SHALL persist diagnostics without leaking tokens, secrets, or raw absolute runtime paths.

#### Scenario: Ingestion failure contains sensitive data

- **WHEN** concept proposal ingestion fails with sensitive details
- **THEN** persisted diagnostics SHALL redact secrets and raw absolute paths.

### Requirement: Concept overlay DTO excludes unsafe matches

Synthesis Concept KB SHALL expose overlay entries only for high-confidence, unambiguous aliases.

#### Scenario: Overlay candidates are built

- **WHEN** overlay DTO entries are requested
- **THEN** aliases SHALL be ordered longest first
- **AND** ambiguous or low-confidence concepts SHALL be excluded from automatic links.

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

### Requirement: Concept review queue supports explicit merge decisions

Concept Review Queue SHALL require an explicit target concept choice before merging a review item into an existing concept.

#### Scenario: Merge candidate is selected

- **WHEN** a review item has candidate concepts
- **THEN** the Workbench SHALL let the user choose the merge target
- **AND** the merge command SHALL pass that selected `targetConceptId`.

#### Scenario: No merge candidate is selected

- **WHEN** no target concept is selected
- **THEN** the Workbench SHALL NOT send a merge action
- **AND** approve-as-new and reject SHALL remain available.

