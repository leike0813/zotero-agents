## MODIFIED Requirements

### Requirement: Backend-backed workflow batches SHALL dispatch fully in parallel
The execution seam SHALL use full-parallel dispatch for backend-backed providers
unless a supported ACP Skills or SkillRunner submission has captured a positive
Host maximum-concurrency value. Host admission SHALL limit top-level execution
units, while provider-owned concurrency inside an admitted unit remains
authoritative.

#### Scenario: SkillRunner batch uses full-parallel dispatch by default
- **WHEN** the execution seam runs a SkillRunner batch with blank or zero Host maximum concurrency
- **THEN** Host admission concurrency equals the top-level execution-unit count
- **AND** the frontend SHALL NOT impose an extra fixed concurrency cap

#### Scenario: SkillRunner batch uses an explicit Host limit
- **WHEN** the execution seam runs a SkillRunner batch with positive Host maximum concurrency `N`
- **THEN** the Host SHALL admit at most `N` top-level execution units from that submission
- **AND** provider request fan-out inside each admitted unit SHALL retain its existing semantics

#### Scenario: ACP Skills batch uses full-parallel dispatch by default
- **WHEN** the execution seam runs an ACP Skills batch with blank or zero Host maximum concurrency
- **THEN** the Host SHALL admit every top-level execution unit without throttling
- **AND** the prior implicit serial default SHALL NOT apply

#### Scenario: ACP Skills batch uses an explicit Host limit
- **WHEN** the execution seam runs an ACP Skills batch with positive Host maximum concurrency `N`
- **THEN** the Host SHALL admit at most `N` top-level execution units from that submission

#### Scenario: Generic HTTP batch uses full-parallel dispatch
- **WHEN** the execution seam runs a batch for provider `generic-http`
- **THEN** queue concurrency equals the batch request count
- **AND** backend-side capacity control remains authoritative

#### Scenario: Pass-through batch keeps serialized execution
- **WHEN** the execution seam runs a batch for provider `pass-through`
- **THEN** queue concurrency remains `1`
- **AND** pass-through local execution semantics remain unchanged

### Requirement: Local queue lifecycle SHALL remain the frontend execution model
Host admission control MUST compose with, rather than replace, the existing
frontend execution lifecycle. An admitted unit MUST still use the provider run,
terminal-result, result-apply, and feedback seams, and trigger-level completion
MUST wait for all admitted, queued, skipped, and canceled units to converge.

#### Scenario: Admitted unit converges through apply before releasing its slot
- **WHEN** a supported backend-backed unit reaches a provider terminal result
- **THEN** the execution seam MUST complete unit-scoped result application
- **AND** only then SHALL Host admission release that unit's slot

#### Scenario: Submission completion waits for queued units
- **WHEN** a submission still contains Host-queued units
- **THEN** final feedback aggregation SHALL remain pending
- **AND** it SHALL complete only after every unit has reached succeeded, failed, or skipped outcome

#### Scenario: Pass-through keeps serialized execution semantics
- **WHEN** the execution seam runs a batch for provider `pass-through`
- **THEN** frontend dispatch MUST remain serialized
- **AND** this change MUST NOT alter pass-through local execution semantics

## ADDED Requirements

### Requirement: Preparation SHALL return explicit execution-unit plans

The preparation seam MUST return a typed execution plan whose top-level entries
correspond to legal declarative execution units. Each entry MUST retain the
source identity, display label, workflow and backend context, and the data needed
to execute provider preflight only after Host admission.

#### Scenario: Multiple selected parent items are legal

- **WHEN** declarative selection validation accepts multiple parent items for a workflow
- **THEN** preparation SHALL produce one ordered top-level execution unit per accepted parent item
- **AND** that order SHALL define the submission's FIFO queue order

#### Scenario: Preflight remains deferred until admission

- **WHEN** a prepared unit is waiting in the Host queue
- **THEN** provider preflight and provider submission for that unit SHALL NOT run
- **AND** the explicit plan SHALL retain enough data to run them after admission

