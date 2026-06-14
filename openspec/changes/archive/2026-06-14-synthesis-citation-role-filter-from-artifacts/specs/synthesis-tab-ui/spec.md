## ADDED Requirements

### Requirement: Citation graph role filter uses semantic roles

The Synthesis citation graph controls SHALL keep a visible citation-role filter
whose options come from graph edge role facets.

#### Scenario: Citation is not offered as a role filter

- **GIVEN** graph edges have generic `citation` roles or missing role data
- **WHEN** the graph controls render
- **THEN** the role filter SHALL include `All`
- **AND** it SHALL NOT include `citation`
- **AND** missing or invalid role data SHALL be represented as `unknown`.

#### Scenario: Best-effort roles are filterable

- **GIVEN** graph edges expose roles such as `background`, `baseline`, or
  `contrast`
- **WHEN** the user selects one role
- **THEN** the Workbench SHALL send the existing `setGraphView` role filter
- **AND** the graph SHALL show only edges whose primary role matches that role.
