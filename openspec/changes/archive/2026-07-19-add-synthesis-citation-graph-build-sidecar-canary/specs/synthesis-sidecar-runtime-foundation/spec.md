## ADDED Requirements

### Requirement: Runtime SHALL advertise graph-build compute
Discovery and handshake SHALL advertise `compute.citation_graph_build` as a
compute capability and SHALL enforce the same authentication, protocol, profile,
lifecycle, and runtime identity checks as other compute calls.

#### Scenario: Capability surfaces are compared
- **WHEN** discovery and authenticated handshake are read
- **THEN** both SHALL expose the same closed capability list including graph build

#### Scenario: Graph-build payload crosses trust boundaries
- **WHEN** an authenticated graph-build call is admitted
- **THEN** the request SHALL be rebuilt before enqueue and in the worker and the result SHALL be rebuilt before the main thread returns it
