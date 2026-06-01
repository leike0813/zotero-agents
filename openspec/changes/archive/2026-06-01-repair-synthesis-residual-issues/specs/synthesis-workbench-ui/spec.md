## MODIFIED Requirements

### Requirement: Discovery hints expose reject and restore actions only

Discovery hints SHALL be optional suggestions. The Workbench UI and service contract SHALL expose reject and restore actions, and SHALL NOT expose an accept action that implies topic update consumption.

#### Scenario: User rejects a discovery hint

- **WHEN** the user rejects an open discovery hint
- **THEN** the hint becomes rejected
- **AND** rebuild, digest rerun, or metadata drift does not reopen it automatically.

#### Scenario: User restores a rejected discovery hint

- **WHEN** the user restores a rejected discovery hint
- **THEN** the hint returns to open
- **AND** topic artifact update remains a separate explicit workflow.
