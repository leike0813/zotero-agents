## ADDED Requirements

### Requirement: Successful sequence-step advancement SHALL be shared

Workflow execution SHALL use one sequence-runtime transition for a successful
step regardless of whether success returns from foreground provider execution
or is accepted later from an external completion owner.

#### Scenario: Normal and external success use the same advancement policy

- **WHEN** a normal or externally completed sequence step succeeds
- **THEN** Host SHALL persist step success before optional step apply
- **AND** it SHALL settle the configured lifecycle barrier before
  short-circuit return or downstream dispatch
- **AND** it SHALL use the same final, short-circuit, and continuation rules.

#### Scenario: Apply failure continues by policy

- **WHEN** step execution succeeds
- **AND** step apply fails with `on_failure: "continue"`
- **THEN** Host SHALL preserve the successful step status and failed apply
  status
- **AND** it SHALL settle the lifecycle barrier before continuing.

#### Scenario: Apply failure stops by policy

- **WHEN** step execution succeeds
- **AND** step apply fails with `on_failure: "fail_sequence"`
- **THEN** Host SHALL preserve the successful step status and failed apply
  status
- **AND** it SHALL fail the root without dispatching a downstream step.

### Requirement: External step completion SHALL be idempotent from persisted state

The sequence runtime SHALL accept repeated external completion observations
without repeating already completed advancement phases.

#### Scenario: Repeated completion resumes incomplete work

- **WHEN** the same sequence step index and request id are accepted again
- **THEN** Host SHALL skip persisted successful phases
- **AND** it MAY resume an incomplete step apply, lifecycle settlement, root
  terminalization, or downstream continuation.

#### Scenario: Persisted downstream request is not duplicated

- **WHEN** a later step already has a persisted backend request id
- **THEN** repeated completion of its predecessor SHALL NOT dispatch that later
  step again.

#### Scenario: Bound request identity conflicts

- **WHEN** a step is already bound to one request id
- **AND** external completion presents a different request id for that step
- **THEN** Host SHALL reject the completion as a state conflict
- **AND** it SHALL NOT overwrite the persisted request identity.

#### Scenario: Terminal root remains terminal

- **WHEN** repeated completion is accepted after the sequence root is
  completed, failed, or canceled
- **THEN** Host SHALL NOT return the root to a running or continuing state.

### Requirement: Sequence lifecycle cleanup SHALL use an explicit adapter

The generic sequence runtime SHALL own lifecycle cleanup ordering while
backend-specific cleanup operations remain behind an injected adapter.

#### Scenario: Step apply has no hidden controller cleanup

- **WHEN** a sequence step apply succeeds or fails
- **THEN** apply execution SHALL only return or throw its business outcome
- **AND** controller settlement SHALL occur through the runtime-owned lifecycle
  adapter boundary.

#### Scenario: ACP cleanup failure preserves business state

- **WHEN** ACP controller detach reports a transport cleanup failure
- **THEN** Host SHALL keep the settled step execution and apply facts
- **AND** it SHALL expose the cleanup warning under the existing recoverable
  ACP detach contract.
