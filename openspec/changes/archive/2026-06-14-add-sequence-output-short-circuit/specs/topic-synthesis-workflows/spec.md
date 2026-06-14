## MODIFIED Requirements

### Requirement: Topic synthesis workflows SHALL use split skill sequences

The builtin create and update topic synthesis workflows SHALL execute through
`skillrunner.sequence.v1` using the generated split topic synthesis skills.

#### Scenario: Create topic synthesis workflow declares the split sequence

- **WHEN** the builtin `create-topic-synthesis` workflow manifest is loaded
- **THEN** `request.kind` SHALL be `skillrunner.sequence.v1`
- **AND** the sequence steps SHALL target, in order,
  `create-topic-synthesis-prepare`, `topic-synthesis-core-enrichment`, and
  `topic-synthesis-finalize`
- **AND** the downstream core and finalize steps SHALL reuse the workflow
  workspace.

#### Scenario: Create prepare can short-circuit duplicate topic results

- **WHEN** the builtin `create-topic-synthesis` workflow manifest is loaded
- **THEN** the prepare step SHALL declare a short-circuit rule for
  `status = "canceled"`.

#### Scenario: Create prepare instructions describe duplicate hard-gate cancellation

- **WHEN** the generated `create-topic-synthesis-prepare` skill is read
- **THEN** its Stage 10 instructions SHALL state that an explicit duplicate
  topic result is a hard-gate failure
- **AND** it SHALL instruct the agent to emit a schema-valid
  `topic_synthesis_canceled` business result with `status = "canceled"`
- **AND** it SHALL instruct the agent not to execute resolver/workset or
  downstream sequence steps after that hard-gate failure.

#### Scenario: Update topic synthesis workflow declares the split sequence

- **WHEN** the builtin `update-topic-synthesis` workflow manifest is loaded
- **THEN** `request.kind` SHALL be `skillrunner.sequence.v1`
- **AND** the sequence steps SHALL target, in order,
  `update-topic-synthesis-prepare`, `topic-synthesis-core-enrichment`, and
  `topic-synthesis-finalize`
- **AND** the workflow SHALL NOT declare a `buildRequest` hook.

#### Scenario: Update prepare can short-circuit invalid update targets

- **WHEN** the builtin `update-topic-synthesis` workflow manifest is loaded
- **THEN** the prepare step SHALL declare a short-circuit rule for
  `status = "canceled"`.

#### Scenario: Update prepare instructions describe missing-target hard-gate cancellation

- **WHEN** the generated `update-topic-synthesis-prepare` skill is read
- **THEN** its Stage 10 instructions SHALL state that a missing target topic is
  a hard-gate failure
- **AND** it SHALL instruct the agent to emit a schema-valid
  `topic_synthesis_canceled` business result with `status = "canceled"`
- **AND** it SHALL instruct the agent not to fabricate topic context or execute
  resolver/workset or downstream sequence steps after that hard-gate failure.
