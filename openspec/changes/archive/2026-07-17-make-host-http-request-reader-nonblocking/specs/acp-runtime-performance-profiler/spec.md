## ADDED Requirements

### Requirement: Host input profiling describes asynchronous reader work
The debug-only ACP runtime profiler SHALL retain `host_input_bytes`, `host_input_fragment`, `host_input_duration`, and `host_request_inflight`, and SHALL record `host_input_wait` plus `host_input_callback_max_duration` for successful and failed event-driven reads. Release-build profiler elision SHALL remain unchanged.

#### Scenario: Fragmented host request is profiled
- **WHEN** a profiled Host Bridge or MCP request requires multiple asynchronous readiness registrations
- **THEN** `host_input_wait` SHALL record those registrations
- **AND** `host_input_callback_max_duration` SHALL record the maximum synchronous duration of one readiness callback.

#### Scenario: Host request fails before completion
- **WHEN** a profiled request times out, aborts, reaches EOF, or encounters a read error
- **THEN** the profiler SHALL retain the bounded input statistics observed before failure.

#### Scenario: Historical baseline is read
- **WHEN** a baseline contains the legacy `host_input_unavailable` metric
- **THEN** reporting SHALL remain able to read that baseline
- **AND** the event-driven reader SHALL NOT emit new `host_input_unavailable` samples.

