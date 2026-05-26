## ADDED Requirements

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

Synthesis Concept KB SHALL maintain a rebuildable `concept-kb-index` projection DTO.

#### Scenario: Projection rebuild records registry state

- **WHEN** the concept projection is rebuilt from canonical files
- **THEN** Foundation projection registry SHALL record schema version, source manifest hash, stale flag, last rebuild time, and diagnostics.

#### Scenario: Projection cache is missing

- **WHEN** local projection cache is deleted
- **THEN** the service SHALL rebuild concept DTO state from canonical files.

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
