## ADDED Requirements

### Requirement: Local dispatch accepts provider-neutral outcomes

The local dispatch queue SHALL store an explicit job state, raw result, error and metadata patch supplied by its execution adapter. Backend status normalization and recoverability decisions SHALL belong to the backend execution owner rather than the queue.

#### Scenario: Deferred execution releases local dispatch capacity

- **WHEN** an execution adapter returns a waiting or running outcome
- **THEN** the job SHALL retain that state and its unmodified provider result
- **AND** local dispatch capacity SHALL be released without claiming remote execution or Host apply is complete

#### Scenario: Metadata survives dispatch settlement

- **WHEN** progress has supplied request identity and lifecycle metadata before settlement
- **THEN** the adapter SHALL classify the outcome using that current metadata
- **AND** settlement patches SHALL preserve other typed and extension metadata fields

#### Scenario: Unexpected adapter rejection

- **WHEN** the execution adapter rejects without returning an outcome
- **THEN** the queue SHALL record a failed local outcome and release dispatch capacity
- **AND** it SHALL NOT infer backend recovery or mutate backend run stores
