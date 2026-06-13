## ADDED Requirements

### Requirement: Dashboard snapshot labels SHALL cover fixed Dashboard UI

Dashboard snapshots SHALL provide labels for fixed Dashboard UI chrome, table headers, toolbar buttons, products, runtime logs, management UI controls, empty states, and validation prompts.

#### Scenario: Dashboard static UI renders

- **GIVEN** a Dashboard snapshot with localized labels
- **WHEN** the main Dashboard page renders home, workflow options, products, runtime logs, or backend views
- **THEN** fixed UI text MUST come from the snapshot labels
- **AND** action keys and business DTO fields MUST remain unchanged
