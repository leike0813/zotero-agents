# workflow-manifest-authoring-schema Delta

## ADDED Requirements

### Requirement: BuildRequest-driven sequence manifests SHALL be valid

Workflow manifests SHALL be valid without static `request.sequence.steps[]` or
`result.final_step_id` when they declare `request.kind =
"skillrunner.sequence.v1"` and provide a `buildRequest` hook.

#### Scenario: Dynamic sequence manifest loads

- **GIVEN** a workflow manifest declares `provider = "acp"`
- **AND** `request.kind = "skillrunner.sequence.v1"`
- **AND** `hooks.buildRequest` is present
- **WHEN** the manifest is parsed
- **THEN** static sequence steps and final step declarations are not required.

### Requirement: Conditional workflow parameter visibility SHALL be supported

Workflow parameter schemas SHALL support simple same-workflow boolean visibility
conditions.

#### Scenario: Dependent parameter visibility

- **GIVEN** a parameter declares `visible_if` referencing another boolean
  workflow parameter
- **WHEN** settings UI descriptors are built
- **THEN** the dependent parameter is only shown when the referenced value
  matches the declared boolean.
