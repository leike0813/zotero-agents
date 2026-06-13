## ADDED Requirements

### Requirement: Dashboard home SHALL identify core workflows

Dashboard home workflow bubbles SHALL expose whether a workflow is core and SHALL render a localized Core badge for core workflows. Builtin workflow badges SHALL continue to render independently.

#### Scenario: Core workflow appears on Dashboard home

- **GIVEN** a visible workflow declares `display.core` as true
- **WHEN** Dashboard home workflow bubbles are rendered
- **THEN** the workflow bubble snapshot includes `core: true`
- **AND** the UI renders a localized Core badge for that bubble

#### Scenario: Non-core workflow appears on Dashboard home

- **GIVEN** a visible workflow does not declare `display.core` as true
- **WHEN** Dashboard home workflow bubbles are rendered
- **THEN** no Core badge is rendered for that workflow
