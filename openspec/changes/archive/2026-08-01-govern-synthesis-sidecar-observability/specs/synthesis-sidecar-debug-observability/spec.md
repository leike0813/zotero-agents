## MODIFIED Requirements

### Requirement: Debug SHALL expose bounded causal traces

Debug mode SHALL expose strict v2 parent/child spans from supervisor/process,
Host RPC, reverse-Host, child-worker, transfer, and durable operation
boundaries. The in-memory store SHALL retain at most 1,000 events and 128 per
trace, pin active traces, evict completed traces as units, and publish 200 ms
incremental patches.

#### Scenario: A trace exceeds its budget
- **WHEN** more than 128 events are appended
- **THEN** the start, first failure, terminal, and dropped count remain visible

#### Scenario: Debug is disabled
- **WHEN** an operation runs in a production build
- **THEN** no trace ID, event, wire context, store update, or UI patch is made
