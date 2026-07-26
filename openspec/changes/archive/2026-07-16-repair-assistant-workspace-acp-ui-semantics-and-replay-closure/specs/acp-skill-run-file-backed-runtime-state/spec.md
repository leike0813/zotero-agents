## MODIFIED Requirements

### Requirement: Skills presentation preserves independent state axes

Skills drawer task state SHALL derive from the workflow-task projection SSOT.
Selected run lifecycle, backend state, apply state, recovery, and connection
SHALL remain independent and missing values SHALL remain absent.

#### Scenario: A run waits for permission

- **WHEN** the run has a pending permission request
- **THEN** the drawer task state is `waiting_user`
- **AND** missing backend status is not replaced with the run status.

### Requirement: Skills empty selection preserves workspace geometry

An empty Skills selection SHALL use the shared conversation empty state while
keeping transcript and composer layout containers mounted.

#### Scenario: The final visible task is archived

- **WHEN** no selected run remains
- **THEN** the empty state is visible in the conversation region
- **AND** the reply footer and transcript region do not collapse the panel.
