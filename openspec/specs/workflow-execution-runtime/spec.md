# workflow-execution-runtime Specification

## Purpose
TBD - created by archiving change add-literature-digest-auto-tag-regulator. Update Purpose after archive.
## Requirements
### Requirement: Sequence step apply contexts


The workflow runtime SHALL make successful `skillrunner.sequence.v1` step
results available to workflow `applyResult` hooks.

#### Scenario: Apply hook reads intermediate step result

- **GIVEN** a sequence workflow completes multiple steps
- **WHEN** applyResult is invoked
- **THEN** the hook can access each step request id, provider result,
  bundleReader, and resultContext.
### Requirement: ACP-only sequence dispatch


`skillrunner.sequence.v1` workflow execution SHALL fail closed when the selected
backend is not ACP.

#### Scenario: Non-ACP backend selected

- **GIVEN** a sequence workflow is prepared with a non-ACP backend
- **WHEN** execution starts
- **THEN** the workflow is rejected before launching any step.
### Requirement: Workflow runtime executes skillrunner sequences serially


The workflow runtime SHALL execute `skillrunner.sequence.v1` requests step by
step and SHALL not enqueue sequence steps as independent parallel workflow
jobs.

#### Scenario: Steps run in declaration order

- **WHEN** a sequence request contains multiple steps
- **THEN** the runtime SHALL launch the first step
- **AND** it SHALL launch each downstream step only after the upstream step
  returns a non-deferred successful result.

#### Scenario: Only final step applies

- **WHEN** intermediate sequence steps succeed
- **THEN** workflow `applyResult` SHALL NOT run for those intermediate steps.
- **WHEN** the declared final step succeeds
- **THEN** workflow `applyResult` SHALL run once using the final step result.

#### Scenario: A sequence step cannot continue

- **WHEN** a sequence step fails, is canceled, or returns deferred
- **THEN** the runtime SHALL NOT launch downstream steps.

#### Scenario: Deferred ACP step does not run workflow apply

- **GIVEN** an ACP-backed workflow step returns a deferred recoverable result
- **WHEN** foreground workflow apply processes the provider result
- **THEN** workflow `applyResult` SHALL NOT run
- **AND** the workflow task SHALL remain pending rather than being marked
  applied successfully.
### Requirement: ACP sequence runs preserve Host-only continuation state


`skillrunner.sequence.v1` execution SHALL persist parent workflow context,
step request ids, completed step outputs, current step index, and terminal
state in Host storage without writing sequence orchestration files into ACP
workspaces.

#### Scenario: Step request id is recorded for recovery

- **WHEN** a sequence step emits an ACP `request-created` event
- **THEN** Host SHALL record that request id against the current sequence step
- **AND** the first step request id SHALL remain available as the parent
  workflow task request id.
### Requirement: Recovered non-final ACP sequence steps continue downstream


Host SHALL record recovered ACP step output and continue downstream sequence
execution when the recovered step belongs to a `skillrunner.sequence.v1` run and
is not the final step.

#### Scenario: Middle step recovers

- **GIVEN** a non-final ACP sequence step is in recovery
- **WHEN** its recovered output validates as final
- **THEN** Host SHALL store that step output
- **AND** Host SHALL launch the next sequence step with normal handoff mapping
- **AND** workflow apply SHALL NOT run for the recovered intermediate step.

#### Scenario: Final step recovers

- **GIVEN** the recovered ACP sequence step is the declared final step
- **WHEN** its recovered output validates as final
- **THEN** Host SHALL run workflow apply using the parent workflow id.

#### Scenario: Sequence state is unavailable for a middle step

- **GIVEN** a recovered ACP run is marked as a non-final sequence step
- **AND** Host cannot find matching sequence state by step request id
- **WHEN** recovery tries to continue
- **THEN** Host SHALL fail with a structured error containing the request id,
  workflow id, skill id, and sequence step id.
### Requirement: Failed or canceled sequence steps stop continuation


Host SHALL terminate the sequence when a step fails or is explicitly canceled.

#### Scenario: Upstream step is canceled

- **WHEN** a sequence step returns canceled
- **THEN** Host SHALL mark the sequence canceled
- **AND** Host SHALL NOT launch downstream steps.

### Requirement: Workflow runtime executes skillrunner sequences serially

The workflow runtime SHALL execute `skillrunner.sequence.v1` requests step by
step and SHALL not enqueue sequence steps as independent parallel workflow
jobs.

#### Scenario: Steps run in declaration order

- **WHEN** a sequence request contains multiple steps
- **THEN** the runtime SHALL launch the first step
- **AND** it SHALL launch each downstream step only after the upstream step
  returns a non-deferred successful result.

#### Scenario: Only final step applies

- **WHEN** intermediate sequence steps succeed
- **THEN** workflow `applyResult` SHALL NOT run for those intermediate steps.
- **WHEN** the declared final step succeeds
- **THEN** workflow `applyResult` SHALL run once using the final step result.

#### Scenario: Successful step output short-circuits the sequence

- **GIVEN** a non-final sequence step declares a `short_circuit` rule
- **WHEN** the step succeeds and the resolved output value matches the rule
- **THEN** the runtime SHALL mark the sequence completed
- **AND** it SHALL NOT launch downstream steps
- **AND** it SHALL return a succeeded provider result whose `resultJson` is the
  short-circuiting step output
- **AND** workflow `applyResult` SHALL run once using that short-circuiting
  step output.

#### Scenario: A sequence step cannot continue

- **WHEN** a sequence step fails, is canceled, or returns deferred
- **THEN** the runtime SHALL NOT launch downstream steps.

#### Scenario: Deferred ACP step does not run workflow apply

- **GIVEN** an ACP-backed workflow step returns a deferred recoverable result
- **WHEN** foreground workflow apply processes the provider result
- **THEN** workflow `applyResult` SHALL NOT run
- **AND** the workflow task SHALL remain pending rather than being marked
  applied successfully.
