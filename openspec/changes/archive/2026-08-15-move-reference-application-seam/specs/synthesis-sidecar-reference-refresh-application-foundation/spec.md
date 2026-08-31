## MODIFIED Requirements

### Requirement: Strict private Reference Refresh application surface

Reference Refresh SHALL remain an independently verifiable internal use case behind the grouped Reference application interface. Its private methods `inspect`, `readSources`, `readReferences`, `prepareRefresh`, `applyRefresh`, `discardPreparation`, `stopAdmission`, and `shutdown` SHALL preserve strict request rebuilding, unknown-field rejection, stable results, and bounded reads. Production runtime callers SHALL use only the grouped Reference application interface.

#### Scenario: Public protocol remains unchanged
- **WHEN** the grouped Reference application is composed
- **THEN** no HTTP or RPC capability, `SynthesisClient` route, production fallback, or automatic invocation is added
- **AND** existing Reference Refresh routes preserve their compatible request and result semantics.

#### Scenario: Read bounds are enforced
- **WHEN** a source or reference page exceeds its declared maximum or contains an invalid cursor
- **THEN** the application rejects the request as `invalid_request` without reading an unbounded projection.

## ADDED Requirements

### Requirement: Every durable Reference Refresh write SHALL use a per-call promotion checkpoint

The grouped Reference application SHALL accept an explicit promotion checkpoint for every production call that can persist Reference Refresh state. It SHALL evaluate that checkpoint after materialization and basis validation and immediately before durable promotion. Public maintenance admission, operation identity, deadline, cancellation, reconciliation, and terminal transitions SHALL remain owned outside the application.

#### Scenario: Refresh loses permission before promotion
- **WHEN** materialization completes but the per-call checkpoint rejects promotion
- **THEN** the application returns `stopping`, consumes or discards the active preparation as required, and performs no projection write
- **AND** it does not create or terminalize a public maintenance operation.
