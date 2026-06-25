## ADDED Requirements

### Requirement: Sidebar task attention uses lightweight scoped summaries

Sidebar task attention refreshes SHALL use lightweight scoped task summaries for
default badges and waiting-task toasts, including the Assistant Sidebar entry and
SkillRunner sidebar task attention surfaces.

#### Scenario: Sidebar badge refresh with many retained runs
- **GIVEN** many terminal SkillRunner runs are retained
- **WHEN** the Assistant Sidebar attention badge refreshes
- **THEN** the badge count SHALL be derived from active lightweight summaries
- **AND** full SkillRunner run payloads SHALL NOT be read.

### Requirement: Sidebar selected-run details read only selected scope

The sidebar SHALL read full run detail only for the selected request or active
run detail scope.

#### Scenario: Selected SkillRunner run opens
- **WHEN** the user opens a SkillRunner run in the sidebar
- **THEN** full run detail MAY be read for that selected request
- **AND** unrelated retained runs SHALL NOT be read as full payloads.
