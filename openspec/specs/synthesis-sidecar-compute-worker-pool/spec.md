## ADDED Requirements

### Requirement: Streaming transfer shares bounded worker admission and failures
Streaming Citation Graph Build SHALL share the one-active/two-waiting pool, resource limits, replacement policy, and three-runtime-failure degraded fuse. Its active deadline SHALL be 30 seconds while existing operations retain five seconds.

#### Scenario: Transfer queue is full
- **WHEN** one worker task is active and two tasks are waiting
- **THEN** another `execute` SHALL fail immediately with `worker_busy`

#### Scenario: Transfer runtime fails three consecutive times
- **WHEN** crash, OOM, timeout, or invalid worker output occurs on three consecutive active tasks
- **THEN** the pool SHALL become degraded and reject later execution with `worker_unavailable` until service restart

#### Scenario: Transfer is canceled cooperatively
- **WHEN** an active attempt is canceled
- **THEN** the worker SHALL receive cancellation, receive 100 ms grace, and then be terminated if it does not acknowledge
