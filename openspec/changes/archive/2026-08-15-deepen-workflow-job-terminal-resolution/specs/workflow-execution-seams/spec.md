## ADDED Requirements

### Requirement: Workflow jobs SHALL have one terminal resolution seam

Workflow terminal observation and result application SHALL use one synchronous
Workflow Job Terminal Resolution seam to interpret local queue execution,
sequence-root state, canonical SkillRunner or ACP lifecycle state, and terminal
apply evidence. The seam SHALL classify each admitted workflow job as missing,
pending, locally ready, or canonically ready without owning lifecycle writes,
subscriptions, or apply execution.

#### Scenario: Local terminal execution remains locally ready

- **WHEN** a non-deferred queue job reaches succeeded, failed, or canceled
- **AND** no earlier canonical terminal fact owns its outcome
- **THEN** terminal resolution SHALL classify the job as locally ready
- **AND** the apply seam SHALL retain its existing local reduction and apply behavior
- **AND** canonical success evidence SHALL NOT bypass apply behavior for a locally succeeded, non-deferred result

#### Scenario: Deferred execution waits for canonical lifecycle evidence

- **WHEN** a queue job has a deferred result
- **AND** its canonical lifecycle and terminal apply evidence are incomplete
- **THEN** terminal resolution SHALL classify the job as pending
- **AND** terminal observation SHALL continue waiting

#### Scenario: Missing admitted job becomes an explicit failure

- **WHEN** terminal observation can no longer read an admitted queue job
- **THEN** terminal resolution SHALL classify the job as missing
- **AND** terminal observation SHALL settle instead of waiting indefinitely
- **AND** the apply seam SHALL report its existing explicit job-missing failure

#### Scenario: Resolution failures remain visible

- **WHEN** a lifecycle getter, persisted record parser, or terminal invariant fails
- **THEN** terminal resolution SHALL propagate the failure
- **AND** it SHALL NOT convert the failure into pending evidence

### Requirement: Canonical terminal resolution SHALL preserve lifecycle authority

Canonical terminal resolution SHALL derive request identity and terminal state
from sequence, SkillRunner, and ACP lifecycle facts without accepting a caller
override or merging their persistence ownership.

#### Scenario: Running sequence root gates terminal child evidence

- **WHEN** a concrete sequence step is terminal
- **AND** its sequence root is missing or non-terminal
- **THEN** terminal resolution SHALL remain pending

#### Scenario: Completed sequence root selects the materialized terminal step

- **WHEN** a sequence root reaches completed
- **THEN** terminal resolution SHALL inspect the last step with a materialized request identity
- **AND** missing or non-terminal evidence for that step SHALL remain pending
- **AND** the root SHALL NOT be treated as successful by itself

#### Scenario: Canonical execution failure wins over stale apply evidence

- **WHEN** a sequence root or canonical run record is failed or canceled
- **AND** stale simultaneous apply-failure evidence also exists
- **THEN** terminal resolution SHALL preserve the canonical failed or canceled class

#### Scenario: Apply failure overrides backend success

- **WHEN** canonical backend execution succeeded
- **AND** required apply reached failed
- **THEN** terminal resolution SHALL classify the job as canonically ready and failed
- **AND** the backend lifecycle success fact SHALL remain unchanged
