## ADDED Requirements

### Requirement: Workflow Parameter Schema SHALL Support Runtime-Only Parameters

The workflow manifest schema MUST allow a parameter declaration to set `runtimeOnly: true` when the parameter is configurable by the user but must not be dispatched as provider-facing skill input.

#### Scenario: Author declares a runtime-only parameter

- **WHEN** a workflow parameter declaration includes `"runtimeOnly": true`
- **THEN** manifest validation SHALL accept the declaration
- **AND** the parameter SHALL remain available to workflow settings.

#### Scenario: Invalid runtime-only marker is rejected

- **WHEN** a workflow parameter declaration sets `runtimeOnly` to a non-boolean value
- **THEN** manifest validation SHALL reject the manifest with deterministic diagnostics.
