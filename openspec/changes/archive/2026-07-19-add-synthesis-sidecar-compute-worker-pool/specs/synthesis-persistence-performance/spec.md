## ADDED Requirements

### Requirement: Sidecar compute SHALL use bounded volatile resources

The compute canary SHALL use one worker, at most two waiting requests, existing
1 MiB/50k-node wire bounds, fixed V8 resource limits, and no operation
persistence or database queue.

#### Scenario: Compute load exceeds bounded capacity

- **WHEN** callers submit work beyond one active and two waiting tasks
- **THEN** excess work SHALL fail immediately
- **AND** no persistent operation or unbounded in-memory collection SHALL grow.

### Requirement: Sidecar control plane SHALL be independent from worker progress

Health and handshake snapshots SHALL be O(1), and shutdown SHALL not wait for a
layout iteration loop beyond its bounded termination budget.

#### Scenario: Worker is CPU-bound or hung

- **WHEN** the main service thread receives health, handshake, or shutdown
- **THEN** it SHALL respond using incrementally maintained pool state
- **AND** it SHALL NOT request synchronous worker inspection.
