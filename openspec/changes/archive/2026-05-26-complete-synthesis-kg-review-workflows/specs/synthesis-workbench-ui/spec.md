## ADDED Requirements

### Requirement: Workbench exposes Topic Graph review actions

Synthesis Workbench SHALL expose actionable suggested topic graph relations in the Topic Inspector.

#### Scenario: Suggested relation row is reviewed

- **WHEN** the selected topic has suggested relation edges
- **THEN** the Topic Inspector SHALL show review rows with relation, neighbor topic, status, and edge id backed actions
- **AND** Accept/Reject SHALL dispatch host commands with the specific edge id.

### Requirement: Workbench exposes Concept KB review queue actions

Synthesis Workbench SHALL expose a Concept KB Review Queue for proposal-derived ambiguous or low-confidence concept cards.

#### Scenario: Review queue is rendered

- **WHEN** Concept KB snapshot contains open review items
- **THEN** the Concepts tab SHALL render each item with reason, label, confidence, and candidate concept ids.

#### Scenario: Review queue action is dispatched

- **WHEN** the user approves, merges, or rejects a review item
- **THEN** Workbench SHALL dispatch `applyConceptReviewAction` with review id, action, and target concept id when needed.
