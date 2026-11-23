# Spec Delta

## ADDED Requirements

### Requirement: Runtime Log session scope

The global Runtime Log SHALL default to the current plugin session.

#### Scenario: The global dashboard opens after a restart

- **WHEN** the user opens the global Runtime Log with its default filters
- **THEN** the dashboard SHALL show logs from the current plugin session
- **AND** the retained history option SHALL include earlier sessions without modifying retention.

#### Scenario: A task or request started in an earlier session

- **WHEN** the dashboard is scoped to a request, job, or run
- **THEN** its log list and diagnostic exports SHALL read matching retained entries across sessions.
