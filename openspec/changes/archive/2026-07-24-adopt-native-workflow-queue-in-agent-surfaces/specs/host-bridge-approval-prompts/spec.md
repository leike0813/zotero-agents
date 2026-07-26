## ADDED Requirements

### Requirement: Queue registration and pending cancellation SHALL have distinct authority
Host Bridge SHALL obtain workflow submit approval before registering queue-managed prepared units, while a direct interactive cancellation of a pending Host unit SHALL not require Zotero write approval.

#### Scenario: Workflow submit is denied
- **WHEN** the submit approval is denied
- **THEN** no Host submission or queue entry SHALL be created

#### Scenario: Interactive agent cancels pending unit
- **WHEN** an authenticated interactive agent cancels a pending queue unit
- **THEN** Host Bridge SHALL execute the pending-only transition without opening a Zotero approval prompt
- **AND** resident cron policy SHALL still prohibit cancel requests
