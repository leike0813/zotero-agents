## ADDED Requirements

### Requirement: Topic synthesis workflows produce required-form KG proposal sidecars

Create and update topic synthesis workflows SHALL produce concept card and topic graph relation proposal sidecars as required-form run outputs.

#### Scenario: Completed bundle contains KG proposal paths

- **WHEN** `validate_final_artifacts` writes a completed create, update_full, or update_patch result bundle
- **THEN** the bundle SHALL include `concept_cards_proposal_path`
- **AND** it SHALL include `topic_graph_relation_proposals_path`
- **AND** both paths SHALL point under `result/sidecars/`.

#### Scenario: No reliable KG proposal exists

- **WHEN** the agent has no reliable concept or relation proposals
- **THEN** the workflow SHALL still write both sidecar files
- **AND** the sidecars MAY contain empty proposal arrays with diagnostics.

### Requirement: KG proposal generation is an independent gated stage

The workflow SHALL expose KG proposal generation as a dedicated gate-approved action after core sections and before external/statistics/report authoring.

#### Scenario: Core sections are complete

- **WHEN** route/timeline and core analytical sections have been validated
- **THEN** the next semantic action before external/statistics/report authoring SHALL be `persist_kg_proposals`.
