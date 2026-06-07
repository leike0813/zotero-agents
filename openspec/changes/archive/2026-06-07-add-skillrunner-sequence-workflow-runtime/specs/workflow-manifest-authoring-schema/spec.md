## ADDED Requirements

### Requirement: Workflow manifests declare ACP-only skillrunner sequences

Workflow manifests SHALL support `request.kind = "skillrunner.sequence.v1"` to
execute multiple skill runs as one ordered workflow.

#### Scenario: Sequence manifest is accepted

- **WHEN** a workflow declares `provider = "acp"`
- **AND** `request.kind = "skillrunner.sequence.v1"`
- **AND** `request.sequence.steps[]` contains non-empty `id` and `skill_id`
- **AND** `result.final_step_id` names one declared step
- **THEN** the workflow manifest SHALL load as a declarative workflow.

#### Scenario: Sequence manifest rejects non-ACP providers

- **WHEN** a workflow declares `request.kind = "skillrunner.sequence.v1"`
- **AND** `provider` is not `acp`
- **THEN** the workflow manifest SHALL be rejected.

#### Scenario: Sequence manifest rejects invalid step references

- **WHEN** a sequence manifest contains duplicate step ids
- **OR** `result.final_step_id` does not name a declared step
- **OR** a handoff `from_step` does not name a declared step
- **THEN** the workflow manifest SHALL be rejected.

### Requirement: Sequence steps declare handoff mapping

Sequence steps SHALL support a handoff mapping that selects fields from an
upstream step output into the current step `input` or `parameter`.

#### Scenario: Default handoff passthrough

- **WHEN** a non-first sequence step omits `handoff`
- **THEN** the previous step output SHALL be passed to the step as
  `input.handoff`.

#### Scenario: Explicit handoff mapping

- **WHEN** a step declares `handoff.input` or `handoff.parameter`
- **THEN** the runtime SHALL copy the referenced upstream fields into the
  declared target fields before launching the step.
