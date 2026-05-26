## ADDED Requirements

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

Synthesis Topic Graph SHALL convert topic synthesis relation proposals into suggested edges or diagnostics.

#### Scenario: Broader topic candidate is converted

- **WHEN** a proposal of type `broader_topic_candidate` names a target topic
- **THEN** the canonical edge SHALL represent target broader-than source.

#### Scenario: Self edge is rejected

- **WHEN** a proposal resolves to the same source and target topic
- **THEN** the proposal SHALL be rejected into diagnostics
- **AND** no edge SHALL be written for that proposal.

#### Scenario: Broader cycle is detected

- **WHEN** a proposed `broader_than` edge would create a cycle
- **THEN** the proposal SHALL be rejected into diagnostics or review state
- **AND** the existing graph SHALL remain valid.

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
