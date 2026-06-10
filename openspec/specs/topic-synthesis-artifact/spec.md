## Requirements
### Requirement: Topic synthesis sidecars




Topic synthesis artifacts SHALL include separate sidecars for existing topic graph relation proposals and prospective topic relation proposals.

#### Scenario: Existing proposals enter topic graph apply

- **GIVEN** a topic synthesis artifact has `topic_graph_relation_proposals`
- **WHEN** Host apply persists the artifact
- **THEN** only proposals with existing `target_topic_id` are considered for topic graph edges
- **AND** missing or unknown targets do not create placeholder topic nodes

#### Scenario: Prospective proposals persist as topic metadata

- **GIVEN** a topic synthesis artifact has `prospective_topic_relation_proposals`
- **WHEN** Host apply persists the artifact
- **THEN** the proposals are stored in the current topic metadata
- **AND** `synthesis list-topics` and `synthesis get-topic-context` return them with the topic metadata
- **AND** they are not inserted into topic graph edges or review items
### Requirement: Topic graph relation proposal sidecar



Topic synthesis artifacts SHALL store existing topic relation proposals with direction-explicit proposal types.

#### Scenario: Broader target proposal enters graph

- **GIVEN** a topic synthesis artifact has an existing relation proposal with `target_is_broader_topic_candidate`
- **WHEN** Host apply ingests the topic graph relation proposals
- **THEN** the topic graph edge is stored as `target_topic_id broader_than current_topic_id`

#### Scenario: Narrower target proposal enters graph

- **GIVEN** a topic synthesis artifact has an existing relation proposal with `target_is_narrower_topic_candidate`
- **WHEN** Host apply ingests the topic graph relation proposals
- **THEN** the topic graph edge is stored as `current_topic_id broader_than target_topic_id`

#### Scenario: Non-hierarchy proposals keep current-to-target direction

- **GIVEN** a topic synthesis artifact has related, overlap, or contrast proposals
- **WHEN** Host apply ingests the topic graph relation proposals
- **THEN** the topic graph edge source is the current topic
- **AND** the topic graph edge target is the proposal target topic
### Requirement: Topic artifact deletion


Deleting topic artifacts SHALL remove associated topic relation proposals from active topic graph views.

#### Scenario: Soft delete marks associated relations deleted

- **GIVEN** a materialized topic has topic graph edges or relation review items
- **WHEN** Host deletes the topic artifact
- **THEN** associated topic graph edges are marked `deleted`
- **AND** associated topic graph review items are marked `deleted`
- **AND** active topic graph and review views do not show those proposals

#### Scenario: Purge removes associated relation state

- **GIVEN** a deleted topic artifact has associated topic graph relation state
- **WHEN** Host purges deleted topic artifacts
- **THEN** associated topic graph edges are permanently removed
- **AND** associated topic graph review items are permanently removed
- **AND** the deleted topic graph node is permanently removed
