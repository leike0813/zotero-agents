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

### Requirement: Concept enrichment ingests normalized canonical records

Concept enrichment SHALL normalize proposals and preflight the complete batch against one immutable canonical snapshot before writing any proposal.

#### Scenario: Unique canonical label match merges into existing concept

- **WHEN** a proposal label exactly matches the canonical label of one existing concept
- **THEN** ingestion SHALL add or update a sense and topic link for that concept
- **AND** validated aliases MAY be added to that owner.

#### Scenario: Alias-only match is reviewable

- **WHEN** a proposal has no unique canonical-label match but its label or alias matches an existing alias
- **THEN** ingestion SHALL create an open review item
- **AND** it SHALL NOT write concept, sense, alias, or topic-link records for that proposal.

#### Scenario: Batch order does not change decisions

- **GIVEN** the same proposals are submitted in different orders
- **WHEN** ingestion preflights them
- **THEN** the set of automatic writes and review reasons SHALL be equivalent.

#### Scenario: Batch identity conflict has zero writes

- **WHEN** labels or aliases in the batch claim conflicting concept owners
- **THEN** every affected proposal SHALL enter review with an alias or ambiguity reason
- **AND** no affected proposal SHALL partially mutate Concept KB.

### Requirement: Concept KB projection is rebuildable


Synthesis Concept KB SHALL use the configured Concept KB index engine to
compute deterministic search and overlay rows for the rebuildable
`concept-kb-index` projection while the application owns repository reads,
manifest basis, review rows, relations, diagnostics, progress, and projection
registry promotion.

#### Scenario: Projection is rebuilt

- **WHEN** an explicit Concept KB projection rebuild runs
- **THEN** the application SHALL build and strictly validate the index against
  the current manifest basis through the configured engine
- **AND** only a valid result SHALL advance projection registry state.

#### Scenario: Engine computation fails

- **WHEN** the engine throws, is cancelled, exceeds bounds, or returns a
  malformed result
- **THEN** the last durable Concept KB state and projection registry state
  SHALL remain unchanged.

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

### Requirement: Concept KB exposes read-only alias matching context


Synthesis Concept KB SHALL use the configured Concept KB index engine to expose
bounded read-only candidate matching context for topic synthesis enrichment.

#### Scenario: Candidate labels are queried

- **WHEN** runtime queries Concept KB with `concept_candidate_labels[]`
- **THEN** the service SHALL preserve existing exact, alias, sense candidate,
  ambiguity, and diagnostic response semantics
- **AND** it SHALL NOT mutate canonical Concept KB or review state.

### Requirement: Concept KB exposes overlay entries only for high-confidence, unambiguous aliases


Synthesis Concept KB SHALL compute overlay entries through the configured
Concept KB index engine and expose only aliases that are active,
non-low-confidence, unambiguous, and attached to an active concept.

#### Scenario: Alias resolves to multiple concepts

- **WHEN** the same normalized active alias points to multiple concepts
- **THEN** the alias SHALL be excluded from overlay entries.

### Requirement: Existing aliases have an explicit structural audit workflow

Concept KB SHALL expose a deterministic audit that creates review items for structurally risky aliases without automatically changing canonical records.

#### Scenario: Alias collides with another canonical label

- **WHEN** an active alias normalizes to another concept's canonical label
- **THEN** audit SHALL create an open `alias_conflict` review item for that exact alias and owner
- **AND** repeated audit SHALL not duplicate the same open item.

#### Scenario: User keeps an audited alias

- **WHEN** the user applies `keep_alias` to an open alias audit item
- **THEN** the alias records SHALL remain unchanged
- **AND** the review item SHALL close as approved.

#### Scenario: User removes an audited alias

- **WHEN** the user applies `remove_alias` to an open alias audit item
- **THEN** Concept KB SHALL remove the exact alias record and synchronize the owning concept and its senses
- **AND** it SHALL NOT delete a concept or sense
- **AND** the review item SHALL close as rejected.
