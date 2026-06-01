## MODIFIED Requirements

### Requirement: Discovery hints are reject-only suggestions

Workbench discovery hints SHALL expose reject and explicit restore actions only.

#### Scenario: Open hint is rejected

- **WHEN** the user rejects an open discovery hint
- **THEN** the hint SHALL become rejected
- **AND** future discovery rebuilds SHALL NOT reopen it.

#### Scenario: Rejected hint is restored

- **WHEN** the user explicitly restores a rejected hint
- **THEN** the hint SHALL become open
- **AND** no topic artifact update SHALL be triggered by the restore action.
