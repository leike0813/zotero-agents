## ADDED Requirements

### Requirement: Provider profiles SHALL be backend-scoped
Provider profile discovery and validation SHALL use a configured backend as their only runtime context and SHALL NOT accept a workflow identifier.

#### Scenario: Agent describes one backend profile
- **WHEN** an agent describes a provider profile for a backend
- **THEN** the response contains that backend's provider capabilities, option schema, dynamic catalog state, and readiness
- **AND** it contains no workflow selection or workflow option fields.

### Requirement: Provider profiles SHALL validate independently
Provider validation SHALL validate backend existence, readiness, safe fields, types, dependencies, and dynamic catalog membership without evaluating workflow compatibility.

#### Scenario: Valid profile is reusable
- **WHEN** a profile is valid for its backend
- **THEN** validation returns a normalized provider profile
- **AND** the result does not claim compatibility with any workflow.

### Requirement: CLI SHALL resolve a non-persistent default provider profile
The CLI SHALL read `ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE` only when provider validation or workflow submission omits an explicit provider profile.

#### Scenario: Explicit profile overrides the environment
- **WHEN** both an explicit provider profile and the environment default are present
- **THEN** the explicit profile is used, including when it is an explicit empty object
- **AND** the environment value is not disclosed in output or logs.

#### Scenario: Direct REST caller omits a profile
- **WHEN** a direct REST caller omits a provider profile
- **THEN** Host Bridge does not read or apply the CLI process environment default.

### Requirement: Provider option application SHALL fail closed
Explicit ACP and SkillRunner provider options SHALL be validated against the selected backend catalog and SHALL either be applied before execution starts or produce a structured failure.

#### Scenario: ACP option becomes unavailable
- **WHEN** an ACP mode, model, or reasoning value is unavailable before the first prompt
- **THEN** the run fails before prompting
- **AND** application audit reports the rejected option key and reason without recording its value.

#### Scenario: SkillRunner option is unknown
- **WHEN** an explicit SkillRunner engine, provider, model, or effort is absent from the backend catalog
- **THEN** submission fails before backend dispatch
- **AND** the option is not silently replaced by a default.
