## ADDED Requirements

### Requirement: Fourteen Rust operations SHALL share one pool authority
The six previously migrated Rust operations and eight R5 operations SHALL share one active slot, at most two queued slots, one child backend, cancellation grace, replacement accounting, shutdown, and three-runtime-failure degraded fuse.

#### Scenario: Mixed operation queue is full
- **WHEN** one Rust task is active and two tasks of any supported operation are queued
- **THEN** another supported request SHALL fail immediately with `worker_busy`.

#### Scenario: Failures cross operation domains
- **WHEN** three consecutive admitted tasks across matcher, Topic, graph, metrics, or deterministic domains crash, time out, or return invalid output
- **THEN** the shared pool SHALL become degraded and reject new tasks with `worker_unavailable`.

### Requirement: Complex operation deadlines SHALL remain domain-bounded
Matcher, Topic, and monolithic graph operations SHALL use a five-second hard deadline; graph transfer SHALL use a thirty-second active deadline; active cancellation SHALL allow at most 100 ms grace and pool shutdown at most 500 ms.

#### Scenario: Graph transfer exceeds its active deadline
- **WHEN** `citation_graph_build_transfer.v1` remains active for thirty seconds
- **THEN** it SHALL fail with `worker_timeout` and the child SHALL be replaced without fallback.
