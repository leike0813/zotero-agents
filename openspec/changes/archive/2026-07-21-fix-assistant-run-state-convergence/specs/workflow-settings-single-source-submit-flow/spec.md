## MODIFIED Requirements

### Requirement: Provider options SHALL be scoped to their selected backend

Provider runtime option schema entries SHALL declare workflow or backend retention. Changing backend SHALL discard backend-scoped values and values outside the target provider schema before target normalization. The selected control value, draft value, and submitted value SHALL be identical.

#### Scenario: Backend catalogs contain different modes

- **GIVEN** backend A selected a mode unavailable on backend B
- **WHEN** the user switches to backend B without touching the mode control
- **THEN** the draft and submission use backend B's canonical selection
- **AND** workflow-scoped auto-approval and timeout values remain unchanged.

#### Scenario: Invalid select current is rendered

- **WHEN** a select receives a current value absent from its options
- **THEN** its displayed value, selected row, getter, collector, and later callbacks all use the same canonical fallback.
