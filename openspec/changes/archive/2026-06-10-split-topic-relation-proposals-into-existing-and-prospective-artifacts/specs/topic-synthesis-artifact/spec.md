## MODIFIED Requirements

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
