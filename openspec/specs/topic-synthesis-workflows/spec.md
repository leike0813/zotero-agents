# topic-synthesis-workflows Specification

## Purpose
TBD - created by archiving change switch-topic-synthesis-workflows-to-split-sequence. Update Purpose after archive.
## Requirements
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

#### Scenario: Update topic synthesis workflow declares the split sequence

- **WHEN** the builtin `update-topic-synthesis` workflow manifest is loaded
- **THEN** `request.kind` SHALL be `skillrunner.sequence.v1`
- **AND** the sequence steps SHALL target, in order,
  `update-topic-synthesis-prepare`, `topic-synthesis-core-enrichment`, and
  `topic-synthesis-finalize`
- **AND** the workflow SHALL NOT declare a `buildRequest` hook.

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

### Requirement: Update prepare SHALL support the declared topic context stage

The generated `update-topic-synthesis-prepare` runtime SHALL accept and record
the `stage_10_update_topic_context` payload before proceeding to resolver and
paper triage stages.

#### Scenario: Update topic context payload advances the prepare runtime

- **GIVEN** `update-topic-synthesis-prepare` has completed runtime setup in a
  legal ACP run workspace
- **WHEN** the agent submits a schema-valid `stage_10_update_topic_context`
  payload
- **THEN** the runtime SHALL record an action receipt and artifact receipt for
  the payload
- **AND** it SHALL store topic/update metadata needed by downstream stages
- **AND** the next gate instruction SHALL advance to
  `stage_20_resolver_and_workset`.

