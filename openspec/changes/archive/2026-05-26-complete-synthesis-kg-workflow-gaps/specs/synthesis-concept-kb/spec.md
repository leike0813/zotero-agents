## ADDED Requirements

### Requirement: Concept review queue supports explicit merge decisions

Concept Review Queue SHALL require an explicit target concept choice before merging a review item into an existing concept.

#### Scenario: Merge candidate is selected

- **WHEN** a review item has candidate concepts
- **THEN** the Workbench SHALL let the user choose the merge target
- **AND** the merge command SHALL pass that selected `targetConceptId`.

#### Scenario: No merge candidate is selected

- **WHEN** no target concept is selected
- **THEN** the Workbench SHALL NOT send a merge action
- **AND** approve-as-new and reject SHALL remain available.
