## ADDED Requirements

### Requirement: Log Viewer Window SHALL Show Important Retention Capacity

The log viewer SHALL surface the important and total entry budgets so users can
see how much diagnostic capacity remains.

#### Scenario: Important retention quota is visible

- **WHEN** the runtime log viewer is open
- **THEN** the viewer SHALL display the retained `warn`/`error` count and its
  active important-entry cap
- **AND** it SHALL display the total retained count and active total-entry cap.
