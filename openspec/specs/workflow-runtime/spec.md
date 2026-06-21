# workflow-runtime Specification

## Purpose
Defines the workflow execution runtime behavior for sequence workflows, step handoff, and dynamic step resolution.

## Requirements

### Requirement: Hook-driven sequence workflows SHALL support declared candidate steps

Hook-driven sequence workflows SHALL be able to declare candidate steps in
`request.sequence.steps` without making those declarations the executable plan.

#### Scenario: Candidate steps document dynamic buildRequest output

- **WHEN** a hook-driven sequence workflow declares `request.sequence.steps`
- **AND** `buildRequest` returns a `skillrunner.sequence.v1` payload
- **THEN** the runtime SHALL execute the steps returned by `buildRequest`
- **AND** the manifest candidate steps SHALL remain metadata for validation,
  UI, documentation, and future tooling.

#### Scenario: Conditional candidate steps use include_if metadata

- **WHEN** a candidate step is only emitted for some workflow parameters or
  runtime-derived conditions
- **THEN** the workflow manifest MAY declare `include_if`
- **AND** the runtime SHALL NOT interpret `include_if` as an execution rule.

### Requirement: Declared hook-driven sequence candidates SHALL be semantically checked

The workflow loader SHALL validate declared candidate sequence steps for
hook-driven sequence workflows when the manifest provides them.

#### Scenario: Candidate step references are valid

- **WHEN** a hook-driven sequence workflow declares candidate steps
- **THEN** step ids SHALL be unique
- **AND** any declared final step id SHALL match a candidate step
- **AND** handoff source step references SHALL match candidate steps.
