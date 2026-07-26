# synthesis-citation-graph-layout-production-routing Specification

## Purpose
Defines the synthesis citation graph layout production routing capability for the Synthesis plugin, specifying its service boundary, integration contracts, and runtime behavior.

## Requirements

### Requirement: Production layout computation uses the authenticated Rust sidecar worker

The production Synthesis composition SHALL execute Citation Graph layout through the authenticated sidecar compute capability and the shared Rust child, and SHALL NOT execute that kernel in-process, in a Node worker, or through runtime fallback.

#### Scenario: Production layout is requested while the sidecar is ready

- **WHEN** production composition requests Citation Graph layout and the current sidecar connection is ready
- **THEN** the strict v2 request SHALL be sent through `compute.citation_graph_layout`
- **AND** the service SHALL schedule `citation_graph_layout.v2` on the shared Rust child.

#### Scenario: Sidecar is not ready

- **WHEN** production layout is requested without a current ready sidecar connection
- **THEN** the operation SHALL fail immediately with internal `service_not_ready`
- **AND** it SHALL not wait, poll, retry, start the runtime, or execute locally.

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

#### Scenario: Rust computation fails
- **WHEN** readiness, transport, identity, cancellation, deadline, worker, or result validation fails
- **THEN** the operation SHALL report `citation_graph_layout_failed`
- **AND** the previous layout SHALL remain available without local fallback.

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
