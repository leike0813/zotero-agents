## MODIFIED Requirements

### Requirement: Stage 50 KG enrichment payload

The split topic synthesis core enrichment skill SHALL accept relation proposals through separate existing-topic and prospective-topic channels.

#### Scenario: Existing topic proposals target current library topics

- **GIVEN** Stage 50 is ready for payload submission
- **WHEN** the agent writes relation proposals for topics returned by `synthesis list-topics`
- **THEN** those proposals are written under `existing_topic_relation_proposals`
- **AND** each proposal identifies `target_topic_id`, `relation_type`, `confidence`, `rationale`, and `source_paper_refs`

#### Scenario: Prospective topic proposals are minimal future seeds

- **GIVEN** Stage 50 identifies a useful future topic relationship
- **WHEN** the target topic does not yet exist in the library
- **THEN** the proposal is written under `prospective_topic_relation_proposals`
- **AND** each proposal contains only `target_topic_seed` and `relation_type`

#### Scenario: Skill instructions are current-state only

- **GIVEN** generated split skill instructions
- **WHEN** the agent reads Stage 50 guidance
- **THEN** the instructions describe only current fields and commands
- **AND** they do not include historical migration wording
