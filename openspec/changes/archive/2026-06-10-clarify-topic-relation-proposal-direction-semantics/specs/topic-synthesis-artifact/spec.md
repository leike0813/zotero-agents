## MODIFIED Requirements

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
