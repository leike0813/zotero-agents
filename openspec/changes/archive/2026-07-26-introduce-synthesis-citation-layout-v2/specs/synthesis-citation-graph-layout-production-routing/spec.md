## MODIFIED Requirements

### Requirement: Production layout computation uses the authenticated Rust sidecar worker

The production Synthesis composition SHALL execute Citation Graph layout through the authenticated sidecar compute capability and the shared Rust child, and SHALL NOT execute that kernel in-process, in a Node worker, or through runtime fallback.

#### Scenario: Production layout is requested while the sidecar is ready

- **WHEN** production composition requests Citation Graph layout and the current sidecar connection is ready
- **THEN** the strict v2 request SHALL be sent through `compute.citation_graph_layout`
- **AND** the service SHALL schedule `citation_graph_layout.v2` on the shared Rust child.

#### Scenario: Sidecar is not ready

- **WHEN** production layout is requested without a current ready sidecar connection
- **THEN** the operation SHALL fail immediately with internal `service_not_ready`
- **AND** it SHALL not wait, poll, retry, start the runtime, or execute locally.

#### Scenario: Rust computation fails

- **WHEN** readiness, transport, identity, cancellation, deadline, worker, or result validation fails
- **THEN** the operation SHALL report `citation_graph_layout_failed`
- **AND** the previous layout SHALL remain available without local fallback.
