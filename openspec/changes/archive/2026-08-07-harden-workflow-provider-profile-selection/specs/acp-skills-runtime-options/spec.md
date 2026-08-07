## MODIFIED Requirements

### Requirement: ACP Skills runtime selections SHALL belong to the active catalogs
ACP Skills SHALL validate submitted, persisted, session-reconciled, and runtime-edited mode, provider, display model, raw model, and reasoning selections against the selected backend or live session catalogs before persistence or transport. Legal explicit selections SHALL beat a different observed current; illegal selections SHALL use a legal observed current or remain unset. Catalog order alone SHALL NOT create a current selection. A model identifier SHALL be interpreted within its `acpModelProvider` group, and the canonical selection tuple SHALL remain distinct from the existing flat provider-options wire representation.

#### Scenario: Old backend mode reaches a new backend
- **GIVEN** backend A selected `code`
- **AND** backend B exposes only `ask` and `build` with current `build`
- **WHEN** a run is submitted to backend B without editing mode
- **THEN** the run and mode setter use `build`
- **AND** `code` is never persisted or transported for backend B.

#### Scenario: Live catalog differs from submission cache
- **WHEN** a submitted selection is absent from the new session catalog
- **THEN** ACP Skills atomically replaces it with the legal observed current or clears it
- **AND** no invalid setter call is attempted.

#### Scenario: Runtime action names an unknown option
- **WHEN** a run-scoped mode, provider, model, or reasoning action names a value outside its live catalog
- **THEN** the action is rejected before transport
- **AND** the persisted run-effective selection remains unchanged.

#### Scenario: Provider-qualified model is validated in its provider group
- **WHEN** an ACP selection names `acpModelProvider` and `acpModelId`
- **THEN** validation checks membership in that provider's model group and derives the provider-qualified raw model id
- **AND** a valid tuple is applied without a `could_not_be_applied` result caused by comparing it to a bare model id.

## ADDED Requirements

### Requirement: ACP model catalogs SHALL preserve provider grouping in disclosure
ACP Chat and ACP Skills SHALL disclose `acpModelId` choices grouped by their corresponding `acpModelProvider`. A projection SHALL NOT present models from one default provider as a global model list when multiple providers are available, and SHALL include models observed in the current consistent catalog.

#### Scenario: Multiple ACP providers are available
- **WHEN** a backend catalog contains multiple model providers
- **THEN** the profile descriptor exposes each provider and its own model choices
- **AND** a model cannot be selected without its provider context.

#### Scenario: Current catalog contains a GUI-visible model
- **WHEN** the backend catalog includes a model such as `qwen3.7-plus`
- **THEN** describe and validate expose it under the correct provider group
- **AND** the CLI and Host projections do not reject it solely because an older cache omitted it.

### Requirement: ACP catalog readiness SHALL be shared across discovery and execution
ACP probes, profile describe/validate, GUI settings, and workflow execution SHALL use one catalog readiness projection containing source, revision, refreshedAt, state, and consistency diagnostics. Missing, stale, empty, or contradictory catalog data SHALL be non-ready until a successful refresh replaces it.

#### Scenario: Stale cache is not execution-ready
- **WHEN** an ACP runtime cache is stale or its launch/session revision changed
- **THEN** discovery marks it non-ready and identifies refresh as the recovery
- **AND** workflow execution fails before the first prompt rather than using stale selections.

#### Scenario: Refresh and GUI use the same projection
- **WHEN** a backend refresh succeeds
- **THEN** CLI describe, Host workflow validation, and GUI model/provider controls expose the same provider groups, model ids, reasoning values, and readiness metadata
- **AND** no surface invents a separate default-provider model list.
