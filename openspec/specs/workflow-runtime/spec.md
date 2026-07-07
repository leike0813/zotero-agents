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
  UI, documentation, agent-owned handoff, and future tooling.

#### Scenario: Conditional candidate steps use include_if metadata

- **WHEN** a candidate step is only emitted for some workflow parameters or
  runtime-derived conditions
- **THEN** the workflow manifest MAY declare `include_if`
- **AND** the runtime SHALL NOT interpret `include_if` as an execution rule.

#### Scenario: Agent-owned handoff uses candidate steps as context

- **WHEN** Host Bridge packages a workflow for agent-owned execution
- **AND** the workflow declares sequence candidate steps
- **THEN** the handoff bundle SHALL expose those candidate steps and handoff
  bindings as agent-readable context
- **AND** Host Bridge SHALL NOT evaluate `include_if` or decide the executable
  sequence for the agent.

#### Scenario: Preflight does not replace buildRequest as request source

- **WHEN** a workflow declares `hooks.preflight`
- **AND** preflight returns continue or replacement units
- **THEN** provider requests SHALL still be produced by `buildRequest` or declarative request compilation
- **AND** preflight SHALL NOT be treated as a provider request source.

### Requirement: Declared hook-driven sequence candidates SHALL be semantically checked

The workflow loader SHALL validate declared candidate sequence steps for
hook-driven sequence workflows when the manifest provides them.

#### Scenario: Candidate step references are valid

- **WHEN** a hook-driven sequence workflow declares candidate steps
- **THEN** step ids SHALL be unique
- **AND** any declared final step id SHALL match a candidate step
- **AND** handoff source step references SHALL match candidate steps.

### Requirement: Agent-run may materialize request context without execution

Agent-owned workflow handoff SHALL be allowed to execute workflow request
materialization hooks for context while remaining non-executing.

#### Scenario: buildRequest is context-only during agent-run

- **WHEN** Host Bridge handles `workflow agent-run`
- **THEN** it MAY execute `buildRequest` or declarative request compilation
- **AND** the resulting payload SHALL be used only for handoff context and later
  apply-back request reconstruction
- **AND** Host Bridge SHALL NOT submit that payload to any backend during handoff.

### Requirement: Workflow runtime SHALL support preflight execution planning

The workflow runtime SHALL run optional `hooks.preflight` after selection
resolution and before request construction.

#### Scenario: Continue keeps the current input unit

- **WHEN** preflight returns `kind: "continue"`
- **THEN** the runtime SHALL build and execute the request for the current input unit
- **AND** any preflight context SHALL be available to `buildRequest`.

#### Scenario: Skip omits one input unit

- **WHEN** preflight returns `kind: "skip"` for one input unit
- **THEN** the runtime SHALL omit that unit from provider dispatch
- **AND** the skip SHALL NOT be counted as a provider failure.

#### Scenario: Short-circuit applies without provider dispatch

- **WHEN** preflight returns `kind: "short-circuit-apply"`
- **THEN** the runtime SHALL NOT call `buildRequest`
- **AND** the runtime SHALL NOT dispatch a provider request for that unit
- **AND** the runtime SHALL call the workflow `applyResult` through the standard apply seam.

#### Scenario: Replacement units expand request construction

- **WHEN** preflight returns `kind: "replace-units"`
- **THEN** the runtime SHALL build one provider request per replacement unit
- **AND** each replacement unit SHALL receive its own preflight unit context.

### Requirement: Workflow runtime SHALL support aggregate single-apply plans

The workflow runtime SHALL support a preflight aggregate plan that applies one
result after all child requests succeed.

#### Scenario: Aggregate children apply once after all succeed

- **WHEN** preflight replacement units declare an aggregate plan with `mode: "single-apply"`
- **AND** all child provider requests succeed
- **THEN** the runtime SHALL call the workflow `applyResult` once for the aggregate
- **AND** the runtime SHALL expose ordered child results in the aggregate result context.

#### Scenario: Aggregate failure prevents partial apply

- **WHEN** any child provider request in an aggregate plan fails or is canceled
- **THEN** the runtime SHALL NOT call aggregate `applyResult`
- **AND** the workflow summary SHALL report the aggregate failure.
