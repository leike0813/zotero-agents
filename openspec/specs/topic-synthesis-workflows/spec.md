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

