## ADDED Requirements

### Requirement: Topics views SHALL include planned topics

The Topics list and grid SHALL include planned and stale planned topics from the current bounded surface alongside materialized topics. A topic identifier SHALL appear once, with materialized content taking precedence. Planned topics SHALL display planning status without claiming synthesis metrics or changing artifact counts.

#### Scenario: Only planned topics exist

- **WHEN** the current Topics surface contains planned nodes and no synthesis artifacts
- **THEN** list and grid display those topics and permit search and sorting
- **AND** the page does not display the no-topics empty state

#### Scenario: A planned topic is materialized

- **WHEN** the same identifier has a materialized topic artifact
- **THEN** the Topics view displays one materialized entry with its update action
- **AND** Home artifact statistics continue to count artifacts only

### Requirement: Topics views SHALL expose lifecycle-aware workflow actions

The list, grid, and graph inspector SHALL offer Create for active planned topics and Update for eligible materialized topics. Stale planned topics SHALL remain visible with Create disabled. The graph inspector SHALL retain Open beside Update for materialized topics. Grid workflow actions SHALL use accessible icon buttons independent of the card's report-opening control.

#### Scenario: Active planned topic is selected

- **WHEN** the user activates Create from a list row, grid card, or graph inspector
- **THEN** the creation submission window targets that planned topic
- **AND** no report-opening action is dispatched

#### Scenario: Stale planned topic is selected

- **WHEN** a planned topic has stale lifecycle
- **THEN** its Create action is disabled in each view

#### Scenario: Grid workflow action is clicked

- **WHEN** the user activates a grid workflow icon
- **THEN** only the corresponding workflow action is dispatched
- **AND** the control has an accessible localized name and pending feedback

#### Scenario: Unrelated graph state changes

- **WHEN** only graph selection or layout changes while list or grid is active
- **THEN** unchanged topic rows retain their rendered identity
