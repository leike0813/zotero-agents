## ADDED Requirements

### Requirement: Workflow emoji and core status SHALL remain workflow-owned display metadata

Workflow emoji and core status SHALL be authored in workflow manifests. Plugin Fluent resources SHALL only provide fixed plugin UI copy such as the Dashboard Core badge label.

#### Scenario: Workflow label has package localization and emoji

- **GIVEN** a workflow has package-owned localized label messages and manifest-owned `display.emoji`
- **WHEN** UI code requests a user-visible workflow label
- **THEN** the localized label is resolved from workflow resources
- **AND** the emoji is prefixed from manifest display metadata

#### Scenario: Dashboard core badge label is plugin shell copy

- **GIVEN** Dashboard renders a Core badge
- **WHEN** the badge text is resolved
- **THEN** it is resolved from plugin Fluent resources
