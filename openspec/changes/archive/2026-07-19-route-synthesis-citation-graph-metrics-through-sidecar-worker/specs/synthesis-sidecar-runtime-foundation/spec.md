## ADDED Requirements

### Requirement: Runtime advertises authenticated metrics compute
Discovery and handshake SHALL advertise `compute.citation_graph_metrics`, and the
service SHALL apply the same authentication, profile, protocol, body, and JSON
limits as other compute calls.

#### Scenario: Authenticated metrics call
- **WHEN** a correctly authenticated request names the metrics capability with matching profile and protocol fields
- **THEN** the service validates and admits the metrics payload under the compute wire limits

#### Scenario: Capability parity
- **WHEN** a client compares discovery and handshake capabilities
- **THEN** both surfaces report the same layout and metrics compute capabilities

### Requirement: Metrics DTOs are rebuilt at every process boundary
The service and worker SHALL use synthesis-engine metrics rebuilders before
enqueue, before execution, and after worker result receipt.

#### Scenario: Worker returns an invalid metrics result
- **WHEN** the worker response does not satisfy the metrics result contract
- **THEN** the service returns `worker_result_invalid` and does not forward the value
