## MODIFIED Requirements

### Requirement: Streaming transfer shares bounded worker admission and failures

All Node worker operations, Rust Metrics work, and streaming Citation Graph Build SHALL share one one-active/two-waiting queue, operation deadlines, cancellation, shutdown, replacement accounting, and three-runtime-failure degraded fuse. Backend selection SHALL NOT create parallel admission or failure authorities.

#### Scenario: Mixed-backend queue is full
- **WHEN** one Node or Rust task is active and two tasks of either backend are waiting
- **THEN** another task SHALL fail immediately with `worker_busy`

#### Scenario: Failures cross backend boundaries
- **WHEN** three consecutive active Node/Rust worker tasks crash, time out, or return invalid output
- **THEN** the shared pool SHALL become degraded and reject later tasks with `worker_unavailable`

#### Scenario: Backend changes normally
- **WHEN** the next task requires a different backend
- **THEN** the idle previous backend SHALL terminate without incrementing failure or restart counters
