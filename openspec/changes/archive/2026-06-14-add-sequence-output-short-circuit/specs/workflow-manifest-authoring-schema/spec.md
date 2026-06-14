## MODIFIED Requirements

### Requirement: Workflow manifests declare ACP-only skillrunner sequences

Workflow manifests SHALL support `request.kind = "skillrunner.sequence.v1"` to
execute multiple skill runs as one ordered workflow.

#### Scenario: Sequence manifest is accepted

- **WHEN** a workflow declares `provider = "acp"`
- **AND** `request.kind = "skillrunner.sequence.v1"`
- **AND** `request.sequence.steps[]` contains non-empty `id` and `skill_id`
- **AND** `result.final_step_id` names one declared step
- **THEN** the workflow manifest SHALL load as a declarative workflow.

#### Scenario: Sequence manifest accepts step short-circuit rules

- **WHEN** a sequence step declares `short_circuit.when.path`
- **AND** `short_circuit.result` is `step_output`
- **THEN** the workflow manifest SHALL load as a declarative workflow
- **AND** the compiled sequence request SHALL preserve the short-circuit rule.

#### Scenario: Sequence manifest rejects non-ACP providers

- **WHEN** a workflow declares `request.kind = "skillrunner.sequence.v1"`
- **AND** `provider` is not `acp`
- **THEN** the workflow manifest SHALL be rejected.

#### Scenario: Sequence manifest rejects invalid step references

- **WHEN** a sequence manifest contains duplicate step ids
- **OR** `result.final_step_id` does not name a declared step
- **OR** a handoff `from_step` does not name a declared step
- **THEN** the workflow manifest SHALL be rejected.

#### Scenario: Sequence manifest rejects invalid short-circuit rules

- **WHEN** a sequence step declares `short_circuit` without a non-empty
  `when.path`
- **OR** it declares a `short_circuit.result` other than `step_output`
- **THEN** the workflow manifest SHALL be rejected.
