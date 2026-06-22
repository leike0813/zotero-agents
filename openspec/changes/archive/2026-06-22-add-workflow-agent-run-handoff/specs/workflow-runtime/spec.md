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

#### Scenario: Agent-owned handoff uses candidate steps as context

- **WHEN** Host Bridge packages a workflow for agent-owned execution
- **AND** the workflow declares sequence candidate steps
- **THEN** the handoff bundle SHALL expose those candidate steps and handoff
  bindings as agent-readable context
- **AND** Host Bridge SHALL NOT evaluate `include_if` or decide the executable
  sequence for the agent.
