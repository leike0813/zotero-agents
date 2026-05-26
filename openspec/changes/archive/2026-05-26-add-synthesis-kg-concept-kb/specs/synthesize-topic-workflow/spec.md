## ADDED Requirements

### Requirement: Topic synthesis may emit concept card proposal sidecar

Create and update topic synthesis workflows SHALL support an optional concept card proposal sidecar after cross-paper synthesis and before topic graph relation proposals.

#### Scenario: Final bundle references concept sidecar

- **WHEN** topic synthesis generates concept card proposals
- **THEN** the final bundle MAY include `concept_cards_proposal_path`
- **AND** the path SHALL point to a run-workspace JSON sidecar.

#### Scenario: Agent does not write canonical concept assets

- **WHEN** topic synthesis proposes concept cards
- **THEN** it SHALL write only the sidecar proposal payload
- **AND** it SHALL NOT write canonical concept, sense, alias, relation, projection, or topic concept-link files.

### Requirement: Concept card proposal stage is documented

Create and update topic synthesis skills SHALL document `stage_5_5_concept_cards` as an agent-authored semantic proposal stage.

#### Scenario: Skill instructions are read

- **WHEN** create or update topic synthesis instructions are inspected
- **THEN** they SHALL describe concept card generation after cross-paper synthesis
- **AND** they SHALL describe plugin-owned IDs and canonical ingestion boundaries.
