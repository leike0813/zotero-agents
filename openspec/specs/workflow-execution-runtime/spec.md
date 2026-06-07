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

