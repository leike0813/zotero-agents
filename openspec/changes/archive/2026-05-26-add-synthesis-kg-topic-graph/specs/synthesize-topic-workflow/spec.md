## ADDED Requirements

### Requirement: Topic synthesis may emit relation proposal sidecar

Create and update topic synthesis workflows SHALL support an optional topic graph relation proposal sidecar after cross-paper synthesis.

#### Scenario: Final bundle references proposal sidecar

- **WHEN** topic synthesis generates relation proposals
- **THEN** the final bundle MAY include `topic_graph_relation_proposals_path`
- **AND** the path SHALL point to a run-workspace JSON sidecar.

#### Scenario: Agent does not write canonical graph assets

- **WHEN** topic synthesis proposes topic relations
- **THEN** it SHALL write only the sidecar proposal payload
- **AND** it SHALL NOT write canonical topic graph node or edge files.

### Requirement: Topic graph proposal stage is documented

Create and update topic synthesis skills SHALL document `stage_5_6_topic_graph_relation_proposals` as an agent-authored semantic proposal stage.

#### Scenario: Skill instructions are read

- **WHEN** create or update topic synthesis instructions are inspected
- **THEN** they SHALL describe relation proposal generation after cross-paper synthesis
- **AND** they SHALL describe allowed proposal types and direction conversion.
