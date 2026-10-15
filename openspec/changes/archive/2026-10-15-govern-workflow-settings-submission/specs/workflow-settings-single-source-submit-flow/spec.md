## ADDED Requirements

### Requirement: Workflow settings submission SHALL validate explicit settings after draft merge

Dashboard persistence, submit confirmation and execution context resolution SHALL consume the same merged settings semantics. Form null/undefined deletion markers SHALL be consumed before provider validation. Complete drafts SHALL replace provider options; partial patches SHALL merge them. Display projection SHALL preserve explicit values and SHALL NOT replace them with runtime defaults.

#### Scenario: Submit untouched or cleared timeout
- **WHEN** an optional timeout is untouched or a saved timeout is cleared before confirmation
- **THEN** confirmation and saved defaults SHALL omit that override
- **AND** execution SHALL use the existing effective timeout default.

#### Scenario: Submit a legal default value
- **WHEN** a boolean option is explicitly false or a SkillRunner model uses its declared empty default with a valid provider context
- **THEN** saving and confirmation SHALL accept that value
- **AND** an unknown non-empty model SHALL remain invalid.

#### Scenario: Refresh an invalid explicit value
- **WHEN** a submitted or saved explicit value is invalid for its schema or selected catalog
- **THEN** form refresh SHALL retain the value for correction
- **AND** persistence and execution SHALL reject it with a structured provider option error rather than silently removing it.

#### Scenario: External provider profile contains a form deletion marker
- **WHEN** an external provider profile contains null for a number option
- **THEN** profile validation SHALL reject the invalid type
- **AND** form deletion semantics SHALL remain confined to workflow settings.

## MODIFIED Requirements

### Requirement: Provider options SHALL be scoped to their selected backend

Provider runtime option schema entries SHALL declare workflow or backend retention. Changing backend SHALL discard backend-scoped values and values outside the target provider schema before target normalization. The selected control value, draft value, and submitted value SHALL be identical.

#### Scenario: Backend catalogs contain different modes

- **GIVEN** backend A selected a mode unavailable on backend B
- **WHEN** the user switches to backend B without touching the mode control
- **THEN** the draft and submission use backend B's canonical selection
- **AND** workflow-scoped auto-approval and timeout values remain unchanged.

#### Scenario: Invalid select current is rendered

- **WHEN** a provider option contains an explicit current value absent from its options without a user context change
- **THEN** its displayed value and draft SHALL retain that explicit value
- **AND** submission SHALL reject the unavailable value without choosing a fallback.
