## ADDED Requirements

### Requirement: Workbench exposes Synthesis KG review and import workflows

Synthesis Workbench SHALL expose the remaining KG workflow decisions without silent defaults.

#### Scenario: Tag import preview is shown

- **WHEN** a tag import draft is previewed
- **THEN** the Tags tab SHALL show additions and conflicts
- **AND** provide explicit apply actions.

#### Scenario: Topic relation review item is shown

- **WHEN** the selected topic has open relation review items
- **THEN** the Topic Inspector SHALL show approve/reject controls for those items.

#### Scenario: Concept merge target is explicit

- **WHEN** a Concept Review item has candidates
- **THEN** the Concepts tab SHALL require a selected merge target before sending merge action.
