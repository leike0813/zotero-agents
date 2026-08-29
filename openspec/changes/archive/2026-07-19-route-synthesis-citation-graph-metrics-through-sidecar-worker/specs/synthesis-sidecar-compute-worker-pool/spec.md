## ADDED Requirements

### Requirement: Pool supports a closed metrics operation
The sidecar compute pool SHALL support `citation_graph_metrics.v1` in addition to
`citation_graph_layout.v1` and SHALL reject operations outside that closed set.

#### Scenario: Metrics task executes
- **WHEN** an admitted task names `citation_graph_metrics.v1` with a valid metrics request
- **THEN** the worker executes only the synthesis-engine metrics kernel and returns a strictly rebuilt metrics result

#### Scenario: Unknown operation arrives
- **WHEN** a worker message names any other operation
- **THEN** the worker rejects it without dynamically loading code or opening additional authority

### Requirement: Operations share global bounds and failure state
Layout and metrics tasks SHALL share one active slot, at most two waiting slots,
one worker, and the existing timeout, cancellation, replacement, shutdown, and
degraded-state policies.

#### Scenario: Mixed queue exceeds capacity
- **WHEN** one operation is active and two tasks of either operation are queued
- **THEN** the next layout or metrics request fails immediately with `worker_busy`

#### Scenario: Mixed runtime failures reach the fuse
- **WHEN** three consecutive runtime failures occur across layout and metrics tasks
- **THEN** the shared pool becomes degraded while health and shutdown remain responsive
