## ADDED Requirements

### Requirement: Confirmed prepared units SHALL be execution truth
The runtime SHALL execute units from one confirmed workflow input plan and SHALL NOT rerun raw selection or candidate cardinality validation while building an individual unit.

#### Scenario: Each unit follows a multi-parent admission requirement
- **WHEN** a confirmed plan satisfying `parents.min: 2` emits multiple one-parent units
- **THEN** every admitted unit can build and run without failing the original multi-parent requirement

### Requirement: Preflight expansion SHALL stay inside a top-level unit
Preflight SHALL run after grouping and MAY replace or expand provider requests inside one prepared unit, but SHALL NOT alter top-level unit count or consume additional Host concurrency slots.

#### Scenario: Preflight produces multiple requests
- **WHEN** preflight expands one prepared unit into multiple provider requests
- **THEN** the queue and concurrency model continue to count one top-level unit

### Requirement: Execution summaries SHALL distinguish candidate and unit outcomes
Candidate exclusions before grouping SHALL be reported as candidate skips; duplicate refusal, queued cancellation, preflight skip, and other top-level results SHALL be reported as unit skips; success and failure SHALL count only top-level units.

#### Scenario: Filter removes one member and duplicate guard rejects one group
- **WHEN** candidate filtering removes one member and duplicate confirmation rejects a later prepared unit
- **THEN** the summary records one candidate skip and one unit skip without counting either as success or failure

### Requirement: Admission SHALL prevent later regrouping
After a prepared unit is admitted, selection-count changes, candidate-count changes, peer state, or stale source files SHALL NOT cause the runtime to reconstruct or repartition the batch.

#### Scenario: Source becomes stale after admission
- **WHEN** one admitted unit's source disappears before build
- **THEN** only that unit's build/run outcome changes and peer units retain their original membership
