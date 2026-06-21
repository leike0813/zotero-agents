## ADDED Requirements

### Requirement: Dashboard history reads require foreground detail scope

Dashboard history and terminal run rows SHALL be read only for foreground detail
surfaces with an explicit backend, request, or selected tab scope.

#### Scenario: Home refresh skips full history
- **WHEN** the dashboard home surface refreshes periodically
- **THEN** it SHALL NOT read full dashboard history
- **AND** it MAY read lightweight aggregate counts required for the home summary.

#### Scenario: Backend tab reads scoped history
- **WHEN** the user opens a backend tab
- **THEN** the dashboard MAY read terminal and active rows scoped to that backend
- **AND** unrelated backend history SHALL remain unread.
