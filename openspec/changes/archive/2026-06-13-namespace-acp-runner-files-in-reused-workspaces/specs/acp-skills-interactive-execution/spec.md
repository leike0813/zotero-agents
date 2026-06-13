## MODIFIED Requirements

### Requirement: ACP Skill Result Envelope Is Runner-Generated

ACP Skills SHALL write the runner-owned result JSON path only after final turn
convergence; agents SHALL NOT be instructed to write that file as the completion
signal.

When a final envelope is projected to the transcript, the `__SKILL_DONE__`
marker SHALL be removed from the visible canonical message.

#### Scenario: Final turn projects canonical message

- **GIVEN** an assistant turn returns a schema-valid payload with
  `__SKILL_DONE__: true`
- **WHEN** the runner validates the final output fields
- **THEN** the runner writes the final payload to the run record's
  `resultJsonPath`
- **AND** the transcript displays the canonical final message without the
  `__SKILL_DONE__` marker.
