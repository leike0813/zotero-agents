## ADDED Requirements

### Requirement: SkillRunner terminal success uses foreground apply

Normal SkillRunner terminal success SHALL be applied by the foreground workflow
apply seam.

#### Scenario: Single job success runs apply in foreground

- **WHEN** a `skillrunner.job.v1` provider result is terminal success
- **THEN** the apply seam SHALL execute the workflow `applyResult` hook
- **AND** update the owning SkillRunner run apply state.

#### Scenario: Sequence root success converges apply state

- **WHEN** a `skillrunner.sequence.v1` foreground run completes
- **THEN** root apply SHALL update the final result request record apply state
  to `succeeded`, `failed`, or `skipped`
- **AND** startup recovery SHALL NOT treat that run as unapplied work.

#### Scenario: Recovery-owned pending still registers deferred completion

- **WHEN** a request-ready run crosses a recoverable local or network failure
  boundary
- **THEN** startup or backend recovery MAY register an explicit recovery
  context
- **AND** the normal apply seam SHALL NOT return reconcile-owned pending jobs.

#### Scenario: SkillRunner apply summary has no reconcile-owned output

- **WHEN** a normal SkillRunner job is waiting or terminal
- **THEN** the apply summary SHALL only report succeeded, failed, or pending
  counts and job outcomes
- **AND** it SHALL NOT expose a reconcile-owned pending jobs collection.
