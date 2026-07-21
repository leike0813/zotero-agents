## MODIFIED Requirements

### Requirement: Waiting-user interactions use one bounded Assistant contract

The Assistant shell SHALL represent open text, single choice, confirmation, and file upload requests with one exact-key validated pending-interaction DTO. The DTO SHALL preserve JSON option values, expose a stable interaction token, limit options to 16 and file slots to 8, and reject oversized or malformed nested wire data.

#### Scenario: Structured choice remains typed

- **WHEN** a waiting-user hint declares an option whose label differs from a boolean or object value
- **THEN** the child model SHALL retain the original JSON value as `responseValue`
- **AND** use the label only for visible display and transcript text

#### Scenario: Stale interaction action arrives

- **WHEN** an action's owner, waiting state, or interaction token no longer matches the current pending interaction
- **THEN** the host SHALL reject it without submitting a continuation

### Requirement: Canonical actions are model-owned

The Assistant panel model SHALL produce canonical host actions for waiting-user controls, and the shared renderer SHALL render those descriptors without inventing backend action names.

#### Scenario: SkillRunner quick option is selected

- **WHEN** the user selects a SkillRunner pending option
- **THEN** the model SHALL emit `reply-run` with the typed response value and visible label
- **AND** the host boundary SHALL route it to the selected pending run

#### Scenario: Legacy literal reaches the host boundary

- **WHEN** a supported historical literal such as `reply` or `cancel` reaches the canonicalizer
- **THEN** the boundary MAY translate that literal once
- **AND** no renderer or alias table SHALL become a second action source of truth
