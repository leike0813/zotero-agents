# Spec Delta

## MODIFIED Requirements

### Requirement: ACP Skills runtime selections SHALL belong to the active catalogs

ACP Skills SHALL validate submitted, persisted, session-reconciled, and
runtime-edited mode, provider, display model, raw model, and reasoning selections
against the selected backend or live session catalogs before persistence or
transport. An invalid or ambiguous explicit selection SHALL be reported as
`provider_profile_option_unavailable` with its original value preserved; it SHALL
NOT be replaced by an observed current value, by a first catalog entry, or by a
different variant of the same model. An unspecified category SHALL remain unset
and SHALL NOT send a configuration override. A model identifier SHALL be
interpreted within its `acpModelProvider` group, and the canonical selection tuple
SHALL remain distinct from the existing flat provider-options wire representation.

#### Scenario: Old backend mode reaches a new backend

- **GIVEN** backend A selected `code`
- **AND** backend B exposes only `ask` and `build` with current `build`
- **WHEN** a run is submitted to backend B with the stale `code` selection
- **THEN** submission SHALL fail with `provider_profile_option_unavailable`
- **AND** `code` SHALL NOT be persisted, transported, or replaced by `build`.

#### Scenario: Live catalog differs from submission cache

- **WHEN** a submitted selection is absent from the new session catalog
- **THEN** ACP Skills SHALL reject it with `provider_profile_option_unavailable`
- **AND** it SHALL NOT attempt an invalid setter call or substitute another value.

#### Scenario: Runtime action names an unknown option

- **WHEN** a run-scoped mode, provider, model, or reasoning action names a value outside its live catalog
- **THEN** the action is rejected before transport
- **AND** the persisted run-effective selection remains unchanged.

#### Scenario: Provider-qualified model is validated in its provider group

- **WHEN** an ACP selection names `acpModelProvider` and `acpModelId`
- **THEN** validation checks membership in that provider's model group
- **AND** the requested raw model id is applied as given
- **AND** a valid tuple is not reported as `could_not_be_applied` because it was
  compared against a different raw id.

#### Scenario: Unspecified categories send no override

- **GIVEN** a submission omits mode, model, and reasoning
- **WHEN** the run session is created and the first prompt is prepared
- **THEN** ACP Skills SHALL NOT send configuration override RPCs for those categories
- **AND** the UI SHALL show the backend current value when one exists.

### Requirement: Run-Effective Runtime Options

ACP Skills SHALL persist each run's effective mode, model, raw model, and reasoning
selection in the run record. The persisted run selection SHALL be the sole
current-value source used by execution, recovery, and UI projection. A value SHALL
become current only after a successful setter RPC or an authoritative backend
update confirms it.

#### Scenario: Submitted selection survives a different handshake default

- **GIVEN** a workflow is submitted with model B
- **AND** the backend cache or new session reports model A as its current default
- **WHEN** the runner creates the session and sends the first prompt
- **THEN** it SHALL apply and execute model B
- **AND** the persisted run and composer SHALL display model B.

#### Scenario: Real observed current initializes an absent selection

- **GIVEN** a newly created run has no submitted selection for a runtime category
- **WHEN** the session handshake reports a real current value for that category
- **THEN** ACP Skills SHALL initialize that absent run field from the observed current value
- **AND** later execution and UI projection SHALL read the initialized run field.

#### Scenario: Catalog order does not invent a current selection

- **GIVEN** a run has no selection for a runtime category
- **AND** its catalog contains choices but exposes no real current value
- **WHEN** ACP Skills projects the run
- **THEN** the run SHALL remain unselected for that category
- **AND** ACP Skills SHALL NOT select the first catalog choice as current.

#### Scenario: Successful run-scoped edit changes the effective selection

- **GIVEN** a waiting run currently uses model B
- **WHEN** the user changes the model to C and the remote setter succeeds
- **THEN** ACP Skills SHALL atomically persist model C as the run-effective selection
- **AND** subsequent execution and UI projection SHALL use model C.

#### Scenario: Failed setter does not become current

- **WHEN** a run-scoped runtime setter RPC fails
- **THEN** the rejected value SHALL NOT be persisted as the run-effective selection
- **AND** the previously confirmed value SHALL remain current.

### Requirement: ACP Reasoning State Preserves Its Semantic Source

ACP runtime state SHALL derive reasoning only from backend-advertised explicit
reasoning metadata. Internal state SHALL NOT carry a model-derived reasoning
source, and a model change SHALL NOT recompute, clear, or derive reasoning.

#### Scenario: Backend exposes independent thought level

- **WHEN** live configuration contains an explicit `thought_level` selector
- **THEN** its choices and current value MUST be used as reasoning state
- **AND** an ordinary model update MUST NOT clear or recompute that reasoning state.

#### Scenario: Reasoning is derived from model variants

- **WHEN** the backend has no explicit reasoning data
- **AND** the selected model group exposes suffixed variants
- **THEN** reasoning SHALL no longer be derived or recomputed from those variants
- **AND** the derived reasoning source and its cache execution path SHALL be removed.

#### Scenario: Backend exposes reasoning only

- **WHEN** an ACP session exposes selectable reasoning configuration but no mode or model selector
- **THEN** probing MUST recognize the session as having runtime option capability
- **AND** the reasoning choices and current value MUST be retained.

### Requirement: Runtime Option Cache

ACP connection tests MUST cache supported modes, models, and backend-advertised
reasoning choices from ACP session configuration state. The cache SHALL serve
offline display and pre-submission static membership checks only; it SHALL NOT
override categories the live session declares.

#### Scenario: Successful probe from config options

- **WHEN** an ACP backend probe succeeds and `session/new` returns select
  `configOptions` for mode, model, or thought level
- **THEN** the backend MUST persist a passing connection test and runtime
  options cache derived from those config options
- **AND** old `modes` / `models` fields MUST remain supported when config
  options are absent.

#### Scenario: Empty or failed refresh preserves existing cache

- **GIVEN** an ACP backend already has a non-empty runtime options cache
- **WHEN** a refresh fails or returns no selectable mode/model data
- **THEN** the backend MUST NOT replace the existing runtime options cache with
  an empty or missing cache.

#### Scenario: Live declarations outrank stale cached categories

- **GIVEN** the cached catalog lists categories for a backend
- **WHEN** a live session declares a different or smaller set of categories
- **THEN** the live session metadata SHALL be authoritative
- **AND** the stale cached categories SHALL NOT be presented as available choices.
