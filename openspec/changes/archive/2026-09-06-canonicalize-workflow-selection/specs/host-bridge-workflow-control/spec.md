## MODIFIED Requirements

### Requirement: Host Bridge submits workflows with explicit input
The system SHALL allow authenticated clients to submit workflow runs only when an explicit items/none selection containing only complete portable libraryId/key refs is provided and the provider profile is either explicitly supplied, resolved from `ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE` by the CLI, or intentionally absent after the profile contract has been evaluated. Host Bridge SHALL additionally validate any `resourceBindings` against the workflow's declared resource requirements and non-interactive support before requesting approval or dispatching execution. When no environment default exists, a Host-saved workflow default or discovered candidate SHALL remain unconfirmed until the Agent reports user confirmation; Host Bridge SHALL distinguish that Agent confirmation from Zotero workflow approval and ACP permission approval. Host Bridge SHALL perform confirmed Input Planning v2 locally and SHALL route ACP/SkillRunner prepared units through the native Host submission queue after Zotero-side approval. Queue state SHALL retain resource handle leases rather than resolved local paths.

#### Scenario: Queue-managed workflow submission succeeds
- **WHEN** an authenticated client submits a valid workflow, explicit selection, optional valid resource bindings, optional workflow/provider options, and optional Host queue options for an ACP or SkillRunner workflow, with a provider profile accepted by the profile contract
- **THEN** the bridge SHALL validate and confirm the workflow plan, acquire the input resource lease, obtain Zotero-side approval, and register the duplicate-approved prepared units as one Host submission
- **AND** it SHALL return HTTP `202` with the existing queue-managed result plus resource lease/output delivery metadata
- **AND** it SHALL NOT return invented workflow run or job handles before admission

#### Scenario: Missing provider profile is rejected when no environment default exists
- **WHEN** an authenticated client submits a backend-required workflow without an environment-resolved profile or explicit profile
- **THEN** the bridge SHALL return a structured `provider_profile_required` validation error
- **AND** it SHALL not dispatch a backend or consume Zotero-side approval.

#### Scenario: Environment-resolved profile is accepted as the call default
- **WHEN** the CLI has resolved `ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE`
- **THEN** workflow submission may use that profile without an additional Agent confirmation field
- **AND** Host Bridge SHALL still perform ordinary profile validation and Zotero/ACP permission checks.

#### Scenario: Direct-provider workflow submission succeeds
- **WHEN** an authenticated client submits a valid Generic HTTP or pass-through workflow
- **THEN** the bridge SHALL preserve its existing direct execution ownership
- **AND** it SHALL return the direct result under a distinct `admission` discriminator.

#### Scenario: Non-interactive workflow is not eligible
- **WHEN** a client submits a workflow without declared non-interactive support
- **THEN** Host Bridge SHALL return a structured eligibility error before approval or queue admission
- **AND** it SHALL not invoke a GUI picker, editor, or confirmation dialog

#### Scenario: Resource binding is invalid
- **WHEN** a required resource is missing, unknown, expired, mismatched, or path-like
- **THEN** Host Bridge SHALL return a structured validation error
- **AND** it SHALL not acquire a lease, create a task, request approval, or dispatch a backend

#### Scenario: Missing explicit input is rejected
- **WHEN** an authenticated client submits a workflow without explicit raw selection
- **THEN** the bridge SHALL return a structured validation error
- **AND** it MUST NOT use the current Zotero UI selection as fallback input.

#### Scenario: Client uploads planned input
- **WHEN** a client supplies candidates, an input plan, prepared units, or grouping output
- **THEN** Host Bridge SHALL reject that client-owned planning state
- **AND** it SHALL derive the confirmed plan only from the explicit raw selection and live workflow contract.


### Requirement: Host Bridge exposes context and navigation endpoints

Host Bridge SHALL expose authenticated REST endpoints for reading Zotero context
and navigating to Zotero objects.

#### Scenario: Client reads current context

- **WHEN** an authenticated client requests `GET /bridge/v2/context/current`
- **THEN** the bridge SHALL return the current Zotero context summary
- **AND** the response SHALL be equivalent to the existing current-view host
  context capability.

#### Scenario: Client reads current selection

- **WHEN** an authenticated client requests `GET /bridge/v2/context/selection`
- **THEN** the bridge SHALL return the canonical exact selection page using the requested limit/cursor, with unchanged basis errors and no transport repagination.

#### Scenario: Client opens Zotero objects

- **WHEN** a client posts a Zotero item, note, collection, or selected item
  handle to a context navigation endpoint
- **THEN** the bridge SHALL navigate the Zotero UI to the requested object when
  it exists
- **AND** the response SHALL include `opened`, `found`, `target`, and
  `currentView`.

#### Scenario: Client supplies an invalid navigation target

- **WHEN** a navigation request contains a local path, URI, arbitrary script, or
  an unknown object handle
- **THEN** the bridge SHALL reject the request with a stable error code
- **AND** it SHALL NOT fall back to arbitrary opening or evaluation.


## ADDED Requirements

### Requirement: Durable workflow selection SHALL retain portable identity
Persisted complete portable selection refs SHALL remain the input identity for agent-run prepare and apply. Records missing complete libraryId/key refs SHALL remain stored but execution SHALL fail explicitly. The Host SHALL NOT repair them from current UI, infer a library, or accept legacy id/string aliases.

#### Scenario: Incomplete old record is applied
- **WHEN** a stored agent-run selection lacks a complete portable ref
- **THEN** apply fails before execution and leaves the record intact

#### Scenario: UI selection changes after remote preparation
- **WHEN** an agent run with complete persisted refs is applied
- **THEN** its input refs remain those persisted refs and no live selection is acquired
