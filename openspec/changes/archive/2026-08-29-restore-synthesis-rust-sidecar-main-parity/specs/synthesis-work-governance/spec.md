## MODIFIED Requirements

### Requirement: Operations are not claimable worker queue items

Synthesis operation records SHALL NOT support owner-worker claiming, global queue drain, automatic retry scheduling, or coalescing. Full-library and worker-backed operations SHALL use an operation-specific controlled loop with bounded phases. The public command SHALL return its operation receipt promptly; continuation, cancellation, and retry SHALL update the same explicit operation contract without introducing a second synchronous execution path.

#### Scenario: Operation needs continuation
- **WHEN** an explicit operation cannot finish within its slice budget
- **THEN** it SHALL persist bounded progress and continue only through its operation-specific controller or an explicit continuation
- **AND** no global queue drain or hidden synchronous request SHALL own the work

#### Scenario: Caller cancels long work
- **WHEN** cancellation is observed before promotion
- **THEN** the operation becomes canceled and preserves the prior usable state
- **AND** no later unreported promotion occurs

#### Scenario: Caller controls accepted work
- **WHEN** a caller submits cancel, continue, or retry through the public maintenance-operation control mutation
- **THEN** the action is validated and applied against persisted operation state and semantic basis
- **AND** the read-only operation query remains free of mutation behavior

## ADDED Requirements

### Requirement: Long operation terminals SHALL be unambiguous

Every long native operation SHALL publish accepted/running progress and exactly one success, failure, cancellation, or timeout terminal. A transport timeout MUST NOT conceal a committed mutation, and retry MUST use persisted semantic basis rather than repeat unknown side effects.

#### Scenario: Transport disconnects after receipt
- **WHEN** the client disconnects after an operation is accepted
- **THEN** the operation remains observable by operation ID
- **AND** its terminal does not depend on keeping the original HTTP request open

#### Scenario: Phase fails before promotion
- **WHEN** Host, validation, worker, basis, or transaction work fails
- **THEN** the operation records a stable failure terminal
- **AND** partial preparation is discarded or remains explicitly retryable without success receipt

#### Scenario: Retry request is replayed
- **WHEN** the same retry key is submitted again for the same retryable terminal
- **THEN** the caller receives the same successor operation receipt
- **AND** no duplicate successor or repeated unknown side effect is created
