## ADDED Requirements

### Requirement: Workflow Execution SHALL Not Dispatch Runtime-Only Parameters To Providers

Workflow execution MUST split resolved workflow parameters into provider-facing parameters and local runtime-only parameters before dispatching provider requests.

#### Scenario: Provider request excludes runtime-only parameter

- **GIVEN** a workflow parameter is declared with `runtimeOnly: true`
- **WHEN** the workflow request is compiled for a provider
- **THEN** the provider request `parameter` payload SHALL NOT include that parameter
- **AND** non-runtime-only parameters SHALL continue to be included.

#### Scenario: Apply hook receives runtime-only parameter locally

- **GIVEN** a workflow parameter is declared with `runtimeOnly: true`
- **WHEN** the workflow reaches applyResult
- **THEN** the apply hook SHALL receive the resolved value through local result context
- **AND** the hook SHALL NOT need to read the value from provider-visible request payloads.

#### Scenario: Runtime-only behavior is backend independent

- **WHEN** a workflow runs through remote SkillRunner or ACP Skills
- **THEN** runtime-only parameters SHALL be excluded from the provider dispatch payload in both paths
- **AND** local apply-time behavior SHALL receive the same runtime-only values.
