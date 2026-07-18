## ADDED Requirements

### Requirement: Pool SHALL support a closed graph-build operation
The sidecar compute pool SHALL support `citation_graph_build.v1` in addition to
layout and metrics and SHALL reject operations outside that closed set.

#### Scenario: Graph-build task executes
- **WHEN** an admitted task names `citation_graph_build.v1` with a valid request
- **THEN** the worker SHALL execute only the synthesis-engine graph-build kernel and return a strictly rebuilt result

#### Scenario: Unknown operation arrives
- **WHEN** a worker message names any other operation
- **THEN** the worker SHALL reject it without dynamically loading code or opening additional authority

### Requirement: Three operations SHALL share global bounds and failure state
Layout, metrics, and graph-build tasks SHALL share one active slot, at most two
waiting slots, one worker, and the existing timeout, cancellation, replacement,
shutdown, and degraded-state policies.

#### Scenario: Mixed queue exceeds capacity
- **WHEN** one operation is active and two tasks of any supported operation are queued
- **THEN** the next supported compute request SHALL fail immediately with `worker_busy`

#### Scenario: Mixed runtime failures reach the fuse
- **WHEN** three consecutive runtime failures occur across supported operations
- **THEN** the shared pool SHALL become degraded while health and shutdown remain responsive
