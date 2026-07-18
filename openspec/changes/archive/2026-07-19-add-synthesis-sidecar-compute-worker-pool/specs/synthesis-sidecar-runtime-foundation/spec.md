## ADDED Requirements

### Requirement: Sidecar contracts SHALL expose typed compute capability and pool state

The shared sidecar contract SHALL classify capabilities as general, system, or
compute, include `compute.citation_graph_layout`, and expose a strict O(1) pool
snapshot in health and handshake with state, active, queued, restart count, and
failure count.

#### Scenario: Discovery and handshake are compared

- **WHEN** an authenticated client reads discovery and handshake capabilities
- **THEN** both SHALL equal the shared capability list
- **AND** compute capability SHALL be represented exactly once.

#### Scenario: Health is read during compute saturation

- **WHEN** a worker is active and its waiting queue is full
- **THEN** health SHALL respond without awaiting worker progress
- **AND** its pool snapshot SHALL report the current bounded counters.

### Requirement: Compute HTTP transport SHALL be strict and cancelable

The compute endpoint SHALL preserve existing authentication and wire bounds,
map stable worker errors, and cancel the associated task when its HTTP client
disconnects.

#### Scenario: Compute request is unauthenticated

- **WHEN** a compute call lacks the valid client token
- **THEN** it SHALL be rejected before enqueue.

#### Scenario: Client disconnects during compute

- **WHEN** the HTTP response owner disconnects before completion
- **THEN** the service SHALL abort the queued or active task
- **AND** it SHALL NOT publish a late successful response.
