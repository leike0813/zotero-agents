## MODIFIED Requirements

### Requirement: Stage 50 KG enrichment payload

The split topic synthesis core enrichment skill SHALL use direction-explicit relation proposal types.

#### Scenario: Existing topic proposal direction is explicit

- **GIVEN** Stage 50 is ready for payload submission
- **WHEN** the agent writes `existing_topic_relation_proposals`
- **THEN** every relation type is interpreted from the current synthesis topic toward the target topic
- **AND** `target_is_broader_topic_candidate` means the target topic is broader than the current topic
- **AND** `target_is_narrower_topic_candidate` means the target topic is narrower than the current topic

#### Scenario: Overlap is only for non-containing scopes

- **GIVEN** the agent compares the current synthesis topic with a target topic
- **WHEN** one topic clearly contains the other topic
- **THEN** the Stage 50 instructions direct the agent to use a broader or narrower relation
- **AND** `overlap_topic_candidate` is reserved for partially intersecting scopes where neither topic contains the other

#### Scenario: Skill instructions are current-state only

- **GIVEN** generated split skill instructions
- **WHEN** the agent reads Stage 50 guidance
- **THEN** the instructions describe only current relation types and commands
- **AND** they do not include historical migration wording
