## ADDED Requirements

### Requirement: Workflow status transitions SHALL follow artifact ownership
Each participating builtin workflow MUST only remove the status that represents its own completed artifact, except MinerU which also establishes that PDF/fulltext input was available.

#### Scenario: Curator completes without a metadata change
- **WHEN** Curator verifies the existing metadata and performs no field mutation
- **THEN** it SHALL remove `need-metadata-curation`

#### Scenario: Manual PDF attachment occurs outside MinerU
- **WHEN** a user manually attaches a PDF
- **THEN** the plugin SHALL NOT automatically remove `need-fulltext`

#### Scenario: Translation or Explainer completes
- **WHEN** Translation or Literature Explainer applies a result
- **THEN** no builtin workflow status transition SHALL occur
