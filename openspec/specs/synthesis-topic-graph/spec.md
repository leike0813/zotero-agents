# synthesis-topic-graph Specification

## Purpose
TBD - created by archiving change add-synthesis-kg-topic-graph. Update Purpose after archive.
## Requirements
### Requirement: Topic graph canonical files are persisted

Synthesis Topic Graph SHALL persist canonical topic nodes, topic edges, and manifest data under `synthesis/topic-graph/` using Foundation canonical transactions.

#### Scenario: Empty topic graph is initialized

- **WHEN** the topic graph service loads against an empty KG store
- **THEN** it SHALL initialize `synthesis/topic-graph/topics`, `synthesis/topic-graph/edges`, and `synthesis/topic-graph/manifest.json`
- **AND** it SHALL return an empty graph snapshot.

#### Scenario: Topic node and edge transaction commits

- **WHEN** valid topic graph nodes or edges are written
- **THEN** the service SHALL persist canonical JSON assets through a Foundation transaction
- **AND** it SHALL mark `topic-graph-index` stale.

### Requirement: Topic graph edges have deterministic identity

Synthesis Topic Graph SHALL generate canonical edge ids from relation tuple values rather than accepting arbitrary agent ids.

#### Scenario: Directional broader edge id is generated

- **WHEN** an edge relation is `broader_than`
- **THEN** the edge id SHALL be `edge:broader_than:<safe-source-topic-id>:<safe-target-topic-id>`.

#### Scenario: Non-directional edge ids sort endpoints

- **WHEN** an edge relation is `related_to`, `overlaps_with`, or `contrasts_with`
- **THEN** source and target topic ids SHALL be sorted before edge id generation.

### Requirement: Relation proposals are ingested safely

Synthesis Topic Graph SHALL convert topic synthesis relation proposals into suggested edges or diagnostics, and SHALL preserve explicit user review decisions.

#### Scenario: User decision is preserved

- **WHEN** an existing edge for the same canonical tuple is confirmed or rejected
- **THEN** agent proposal ingestion SHALL NOT overwrite that edge status.

### Requirement: Topic graph projection is rebuildable

Synthesis Topic Graph SHALL maintain a rebuildable `topic-graph-index` projection DTO.

#### Scenario: Projection rebuild records registry state

- **WHEN** the topic graph projection is rebuilt from canonical files
- **THEN** Foundation projection registry SHALL record schema version, source manifest hash, stale flag, last rebuild time, and diagnostics.

#### Scenario: Projection cache is missing

- **WHEN** local projection cache is deleted
- **THEN** the service SHALL rebuild graph DTO state from canonical files.

### Requirement: Topic graph diagnostics are sanitized

Synthesis Topic Graph SHALL persist diagnostics without leaking tokens, secrets, or raw absolute runtime paths.

#### Scenario: Ingestion failure contains sensitive data

- **WHEN** proposal ingestion fails with sensitive details
- **THEN** persisted diagnostics SHALL redact secrets and raw absolute paths.

### Requirement: Suggested topic graph relations are reviewable

Synthesis Topic Graph SHALL allow Workbench users to accept or reject suggested relation edges through canonical transactions.

#### Scenario: Suggested edge is accepted

- **WHEN** a suggested edge is accepted by edge id
- **THEN** the canonical edge status SHALL become `confirmed`
- **AND** provenance and evidence SHALL be preserved
- **AND** `topic-graph-index` SHALL be marked stale.

#### Scenario: Suggested edge is rejected

- **WHEN** a suggested edge is rejected by edge id
- **THEN** the canonical edge status SHALL become `rejected`
- **AND** later proposal ingestion SHALL NOT overwrite that decision.

#### Scenario: Invalid edge decision is diagnostic-only

- **WHEN** a missing edge or non-suggested edge is reviewed
- **THEN** the service SHALL return a structured diagnostic
- **AND** no canonical graph assets SHALL be changed.

### Requirement: Confirmed hierarchy relations cascade discovery candidates

Synthesis read models SHALL use confirmed `broader_than` topic graph relations
to aggregate discovery candidates from narrower descendant topics into broader
ancestor topics.

#### Scenario: Broader topic includes confirmed descendants

- **GIVEN** `source_topic_id broader_than target_topic_id` is confirmed
- **WHEN** Workbench builds topic discovery summaries
- **THEN** the source topic SHALL include open discovery candidates from the
  target topic
- **AND** the same rule SHALL apply transitively through confirmed descendants.

#### Scenario: Candidate cascade is bounded to confirmed hierarchy

- **WHEN** a relation is suggested, rejected, stale, deleted, or not
  `broader_than`
- **THEN** its target topic candidates SHALL NOT be counted in the source topic
  discovery summary.

#### Scenario: Cascaded candidates are deduplicated

- **WHEN** the same `literature_item_id` is an open discovery hint on multiple
  topics in the confirmed descendant scope
- **THEN** the ancestor topic candidate count SHALL count that literature once.

### Requirement: Low-confidence relation proposals are reviewable

Synthesis Topic Graph SHALL keep low-confidence or explicit-review relation proposals as canonical review items before creating suggested edges.

#### Scenario: Low-confidence proposal enters review queue

- **WHEN** relation proposal ingestion receives a low-confidence proposal
- **THEN** it SHALL create an open topic graph review item
- **AND** it SHALL NOT create a suggested edge for that proposal.

#### Scenario: Review item is approved

- **WHEN** a user approves a topic graph review item
- **THEN** the service SHALL create the corresponding suggested edge
- **AND** mark the review item approved
- **AND** mark `topic-graph-index` stale.

#### Scenario: Review item is rejected

- **WHEN** a user rejects a topic graph review item
- **THEN** the review item SHALL be marked rejected
- **AND** no edge SHALL be created.
