## ADDED Requirements

### Requirement: Topics page defaults to graph organization view

The Synthesis Workbench Topics page SHALL default to a graph organization view while preserving List and Grid views.

#### Scenario: Workbench state is initialized

- **WHEN** Synthesis Workbench UI state is created
- **THEN** the Topics view mode SHALL default to `graph`.

#### Scenario: User switches topic views

- **WHEN** the user selects List or Grid
- **THEN** the existing topic rows SHALL remain available in that view.

### Requirement: Topics graph has organization modes and inspector

The Topics graph view SHALL expose Hierarchy, Neighborhood, and Unplaced modes plus a Topic Inspector.

#### Scenario: Hierarchy mode renders topic graph DTO

- **WHEN** Topics graph mode is `Hierarchy`
- **THEN** the Workbench SHALL render topic graph nodes and edges from the Synthesis snapshot.

#### Scenario: Unplaced excludes root topics

- **WHEN** a topic is marked root or top-level
- **THEN** it SHALL NOT appear in Unplaced results solely because it has no parent.

#### Scenario: Inspector shows relation context

- **WHEN** a topic is selected
- **THEN** the Topic Inspector SHALL show parents, children, related relations, paper count, last synthesis time, and suggestion status.
