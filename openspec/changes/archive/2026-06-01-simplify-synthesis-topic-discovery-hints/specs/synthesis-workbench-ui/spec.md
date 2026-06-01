## MODIFIED Requirements

### Requirement: Discovery hint UI exposes reject and restore only

Workbench SHALL NOT expose an Accept action for discovery hints.

#### Scenario: Open hint is displayed

- **WHEN** a discovery hint is `open`
- **THEN** the UI SHALL allow rejection
- **AND** it SHALL NOT imply that accepting the hint updates or rewrites a topic.

#### Scenario: Rejected hint is managed

- **WHEN** a rejected hint is visible in management/debug context
- **THEN** the UI MAY allow explicit restore
- **AND** restore SHALL reopen the hint without running a topic update.
