## ADDED Requirements

### Requirement: Production layout computation uses the authenticated sidecar worker
The production Synthesis composition SHALL execute Citation Graph layout through
the authenticated sidecar compute worker and SHALL NOT execute that kernel
in-process or fall back to an in-process engine.

#### Scenario: Production layout is requested while the sidecar is ready
- **WHEN** production composition requests Citation Graph layout and the current sidecar connection is ready
- **THEN** the strict layout request is sent through `compute.citation_graph_layout`
- **AND** no in-process layout engine is constructed or invoked

#### Scenario: Sidecar is not ready
- **WHEN** production layout is requested without a current ready sidecar connection
- **THEN** the operation fails immediately with an internal `service_not_ready` outcome
- **AND** it does not wait, poll, retry, start the runtime, or execute locally

### Requirement: Production routing preserves plugin data authority
The plugin SHALL remain the sole owner of Citation Graph reads, basis checks,
layout promotion, failure diagnostics, and previous-layout retention.

#### Scenario: Sidecar computation succeeds against the current basis
- **WHEN** the sidecar returns a valid result and the current graph hash still matches the dispatched request
- **THEN** the plugin promotes the rebuilt layout through its repository

#### Scenario: Graph basis changes while computation is in flight
- **WHEN** the current graph hash no longer matches after the sidecar result returns
- **THEN** the plugin discards the result as `citation_graph_layout_basis_superseded`
- **AND** the stale result is not promoted

#### Scenario: Sidecar computation fails
- **WHEN** readiness, transport, identity, cancellation, deadline, worker, or result validation fails
- **THEN** the operation reports `citation_graph_layout_failed`
- **AND** the previous layout remains available

### Requirement: Production routing validates runtime identity and lifecycle
Each compute call SHALL resolve a fresh ready connection, validate response
request/runtime identity, and honor the owning composition's AbortSignal.

#### Scenario: Sidecar restarts between lookup and completion
- **WHEN** a response does not match the dispatched request ID or expected service instance
- **THEN** the call fails closed without retry or promotion

#### Scenario: Composition shuts down during layout
- **WHEN** the composition lifecycle signal aborts an active compute request
- **THEN** HTTP and worker cancellation are requested
- **AND** any late result cannot be promoted

### Requirement: Existing budget and client contracts remain stable
Production routing SHALL retain the dispatch-before soft budget, use the fixed
five-second compute deadline, and leave the public `SynthesisClient` graph API
and DTOs unchanged.

#### Scenario: Dispatch soft budget is exhausted
- **WHEN** the existing operation budget expires before layout dispatch
- **THEN** no sidecar request is made and existing budget diagnostics are retained

#### Scenario: Dispatched compute exceeds its hard deadline
- **WHEN** a sidecar compute request runs longer than five seconds
- **THEN** it is canceled as `worker_timeout` and cannot be promoted

