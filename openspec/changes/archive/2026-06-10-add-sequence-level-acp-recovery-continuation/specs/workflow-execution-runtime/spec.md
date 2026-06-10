## ADDED Requirements

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
