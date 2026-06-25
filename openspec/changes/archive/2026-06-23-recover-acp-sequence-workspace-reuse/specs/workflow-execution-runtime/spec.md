## MODIFIED Requirements

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

#### Scenario: Middle step recovers after plugin restart

- **GIVEN** a non-final ACP sequence step is recovered after local plugin state
  was lost
- **AND** the original ACP workflow workspace still exists
- **WHEN** its recovered output validates as final
- **THEN** Host SHALL restore the workflow workspace reuse mapping
- **AND** Host SHALL launch downstream sequence steps in the original workspace
- **AND** downstream ACP step start events SHALL preserve normal ACP Skills
  foreground selection behavior.

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
