# skillrunner-runkey-ssot Delta

## ADDED Requirements

### Requirement: SkillRunner UI identity MUST use runKey

SkillRunner UI surfaces SHALL use `SkillRunnerRunStore.runKey` as the only identity for run selection, focus, open, archive, and dashboard jump actions.

`requestId`, `localRunId`, `taskId`, `sequenceJobId`, and `sequenceStepId` SHALL NOT be used as UI identity fallbacks.

#### Scenario: Sidebar focuses by runKey

- **WHEN** a SkillRunner run is focused from submit, Dashboard, or sidebar actions
- **THEN** the focus request SHALL contain `runKey`
- **AND** the sidebar selected row SHALL be resolved by exact `runKey`.

#### Scenario: Dashboard jump uses runKey

- **WHEN** Dashboard renders a SkillRunner run row
- **THEN** open/archive actions SHALL be available only when the row has `runKey`
- **AND** the action payload SHALL identify the run by `runKey`.

#### Scenario: Sequence runs with repeated step ids stay distinct

- **GIVEN** two SkillRunner sequence workflow runs have the same step ids
- **WHEN** a step in the second workflow run is focused
- **THEN** the selected sidebar row SHALL be the row with that step's `runKey`
- **AND** no row from the earlier workflow run SHALL be selected by sequence metadata.

### Requirement: SkillRunner projections MUST expose runKey without full payload reads

SkillRunner lightweight projection reads SHALL expose `runKey` from the projection row key and SHALL NOT require reading full run payloads.

#### Scenario: Projection summary returns runKey

- **GIVEN** a SkillRunner run projection row exists
- **WHEN** lightweight projections are listed
- **THEN** each returned SkillRunner `WorkflowTaskRecord` SHALL include `runKey`
- **AND** the read SHALL NOT count as a full SkillRunner payload read.

### Requirement: SkillRunner backend request identity MUST be unique per runKey

SkillRunner run store SHALL enforce at most one projectable `runKey` for each `(backendId, requestId)` once a backend request exists.

A SkillRunner run MAY have `runKey` without `requestId` before the backend request exists.

The store SHALL treat a second projectable `runKey` for the same `(backendId, requestId)` as an invariant violation and SHALL NOT create a second projectable UI row for it.

#### Scenario: Request-ready preserves the existing runKey

- **GIVEN** a pre-request SkillRunner task has a `runKey`
- **WHEN** the same task receives its backend `requestId`
- **THEN** the stored run SHALL keep the same `runKey`
- **AND** that `runKey` SHALL be bound to the new `requestId`.

#### Scenario: Duplicate backend request with another runKey is rejected

- **GIVEN** a projectable SkillRunner run already exists for `(backendId, requestId)`
- **WHEN** another projectable run update with a different `runKey` uses the same `(backendId, requestId)`
- **THEN** the store SHALL record an invariant violation
- **AND** the second `runKey` SHALL NOT become a projectable UI row.

### Requirement: SkillRunner panel SHALL reject rows without runKey

SkillRunner panel foreground models SHALL exclude SkillRunner rows that lack `runKey`.

#### Scenario: Missing runKey row is not selectable

- **GIVEN** a SkillRunner task row lacks `runKey`
- **WHEN** the SkillRunner panel model is built
- **THEN** that row SHALL NOT appear as a selectable task.
