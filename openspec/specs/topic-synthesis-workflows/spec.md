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

### Requirement: Create supports planned and ad-hoc entry modes
Create Topic Synthesis SHALL require exactly one source: an active Planned Topic identifier when `usePlannedTopic` is true, or an ad-hoc `topicSeed` when it is false.

#### Scenario: Planned Topic entry
- **WHEN** the user enables planned-topic mode
- **THEN** the settings surface requires an active Planned Topic and hides the ad-hoc seed

#### Scenario: Ad-hoc entry
- **WHEN** the user disables planned-topic mode
- **THEN** the settings surface requires the topic seed and hides the Planned Topic selector

### Requirement: Ad-hoc seeds prefer an existing Planned Topic identity
Create Topic Synthesis SHALL resolve an ad-hoc seed against the complete visible topic inventory before creating a new topic. An active Planned Topic SHALL be reused only when its definition and scope represent the same topic identity without broadening, narrowing, or otherwise rewriting the seed intent.

#### Scenario: Seed matches an active Planned Topic
- **WHEN** an ad-hoc seed has an active Planned Topic with the same topic identity
- **THEN** Create automatically materializes the Planned Topic with its existing identifier, definition, and resolver

#### Scenario: Several Planned Topics match
- **WHEN** several active Planned Topics satisfy the same-identity test
- **THEN** the agent selects the best definition-and-scope match, using aliases and title as secondary evidence

#### Scenario: Only related topics exist
- **WHEN** visible topics are related, broader, or narrower but none represent the same identity
- **THEN** Create proceeds with a new topic identity

#### Scenario: A materialized duplicate exists
- **WHEN** an existing materialized topic represents the same identity as the seed
- **THEN** Create cancels instead of selecting a Planned Topic or creating another topic

#### Scenario: Selected Planned Topic changes before use
- **WHEN** the selected Planned Topic is no longer active or complete when runtime re-reads it
- **THEN** Create cancels with a retryable state-change diagnosis and does not fall back to ad-hoc creation

### Requirement: Planned Topic materialization re-resolves papers
Create Topic Synthesis SHALL use the stored Planned Topic definition and SHALL execute its stored resolver against the current library rather than consuming a persisted provisional membership list.

#### Scenario: Library changed after planning
- **WHEN** papers were added or edited after the Planned Topic was created
- **THEN** synthesis resolves the current matching paper set before generating content

### Requirement: Relation discovery remains available during synthesis
Create Topic Synthesis SHALL continue to propose relations found from substantive topic content, and those proposals SHALL reconcile with planner proposals by canonical tuple and producer provenance.

#### Scenario: Parallel ad-hoc creates omit their mutual relation
- **WHEN** two ad-hoc create runs execute concurrently before either node is visible to the other
- **THEN** both topics can materialize and a later planner run can propose the missing relation

### Requirement: Update responds to all stable staleness signals
Update Topic Synthesis SHALL be eligible when stable artifact, score, resolver dependency, or paper-set evidence has changed; it SHALL NOT require newly added papers as the sole update signal.

#### Scenario: Score changes without added papers
- **WHEN** a topic score or stable dependency changes while its paper set is unchanged
- **THEN** the update workflow may regenerate the affected synthesis stages

### Requirement: Discovery-driven topic updates use the full update path

The Synthesis service SHALL route an update requested because open discovery candidates exist through `update_full`.

#### Scenario: Candidate-triggered update intent

- **GIVEN** a topic has open discovery candidates and no higher-priority repair condition
- **WHEN** the Workbench derives its topic update intent
- **THEN** the mode SHALL be `update_full`
- **AND** discovery SHALL be included in the update scope.

### Requirement: Discovery outcomes are committed atomically with successful apply

Topic apply SHALL commit discovery candidate outcomes only after the topic update has passed validation and concurrency checks and its canonical artifacts have been written.

#### Scenario: Successful apply accepts and screens exact hints

- **WHEN** a valid update is applied successfully
- **THEN** exact candidate hint IDs marked accepted in the resolver manifest SHALL become `accepted`
- **AND** exact candidate hint IDs marked screened out SHALL become `screened_out` with their evidence basis and triage outcome.

#### Scenario: Failed apply preserves discovery state

- **WHEN** validation, CAS, or canonical writing fails
- **THEN** no discovery hint status or outcome SHALL change.

