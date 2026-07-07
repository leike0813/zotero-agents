## MODIFIED Requirements

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

#### Scenario: Preflight does not replace buildRequest as request source

- **WHEN** a workflow declares `hooks.preflight`
- **AND** preflight returns continue or replacement units
- **THEN** provider requests SHALL still be produced by `buildRequest` or declarative request compilation
- **AND** preflight SHALL NOT be treated as a provider request source.

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
