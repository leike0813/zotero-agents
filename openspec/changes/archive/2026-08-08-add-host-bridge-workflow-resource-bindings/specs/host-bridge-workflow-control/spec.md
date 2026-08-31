## MODIFIED Requirements

### Requirement: Host Bridge submits workflows with explicit input
The system SHALL allow authenticated clients to submit workflow runs only when an explicit raw selection is provided and the provider profile is either explicitly supplied, resolved from `ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE` by the CLI, or intentionally absent after the profile contract has been evaluated. Host Bridge SHALL additionally validate any `resourceBindings` against the workflow's declared resource requirements and non-interactive support before requesting approval or dispatching execution. When no environment default exists, a Host-saved workflow default or discovered candidate SHALL remain unconfirmed until the Agent reports user confirmation; Host Bridge SHALL distinguish that Agent confirmation from Zotero workflow approval and ACP permission approval. Host Bridge SHALL perform confirmed Input Planning v2 locally and SHALL route ACP/SkillRunner prepared units through the native Host submission queue after Zotero-side approval. Queue state SHALL retain resource handle leases rather than resolved local paths.

#### Scenario: Queue-managed workflow submission succeeds
- **WHEN** an authenticated client submits a valid workflow, explicit selection, optional valid resource bindings, optional workflow/provider options, and optional Host queue options for an ACP or SkillRunner workflow, with a provider profile accepted by the profile contract
- **THEN** the bridge SHALL validate and confirm the workflow plan, acquire the input resource lease, obtain Zotero-side approval, and register the duplicate-approved prepared units as one Host submission
- **AND** it SHALL return HTTP `202` with the existing queue-managed result plus resource lease/output delivery metadata
- **AND** it SHALL NOT return invented workflow run or job handles before admission

#### Scenario: Missing provider profile is rejected when no environment default exists
- **WHEN** an authenticated client submits a backend-required workflow without an environment-resolved profile or explicit profile
- **THEN** the bridge SHALL return a structured `provider_profile_required` validation error
- **AND** it SHALL not dispatch a backend or consume Zotero-side approval

#### Scenario: Environment-resolved profile is accepted as the call default
- **WHEN** the CLI has resolved `ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE`
- **THEN** workflow submission may use that profile without an additional Agent confirmation field
- **AND** Host Bridge SHALL still perform ordinary profile validation and Zotero/ACP permission checks

#### Scenario: Direct-provider workflow submission succeeds
- **WHEN** an authenticated client submits a valid Generic HTTP or pass-through workflow
- **THEN** the bridge SHALL preserve its existing direct execution ownership
- **AND** it SHALL return the direct result under a distinct `admission` discriminator

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
- **AND** it MUST NOT use the current Zotero UI selection as fallback input

#### Scenario: Client uploads planned input
- **WHEN** a client supplies candidates, an input plan, prepared units, or grouping output
- **THEN** Host Bridge SHALL reject that client-owned planning state
- **AND** it SHALL derive the confirmed plan only from the explicit raw selection and live workflow contract

### Requirement: Workflow validation SHALL not start execution
Host Bridge SHALL provide workflow validation and requirements endpoints that validate workflow-owned selection, workflow options, execution-mode requirements, and `resourceBindings` without resolving or validating a provider profile and without starting tasks or requesting execution approval. Resource handle validation SHALL be read-only and SHALL not consume or lease an input.

#### Scenario: Workflow validation checks workflow input only
- **WHEN** a client calls the workflow validation endpoint with selection, options, and resource bindings
- **THEN** Host Bridge validates the selection, options, resource requirements, and execution mode
- **AND** it does not read a default provider profile, acquire an input lease, or return a backend-specific provider option schema
- **AND** no workflow task, backend run, Zotero mutation, or execution approval request is created
