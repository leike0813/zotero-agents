## ADDED Requirements

### Requirement: Production metrics uses the sidecar worker
Production composition SHALL execute Citation Graph metrics through the
authenticated sidecar compute service using a fresh ready runtime connection for
each call and SHALL NOT retry or fall back to the in-process engine.

#### Scenario: Ready runtime computes metrics
- **WHEN** production metrics refresh begins while the supervisor has a ready runtime
- **THEN** the plugin sends `compute.citation_graph_metrics` to that runtime and uses the strictly rebuilt worker result

#### Scenario: Runtime is unavailable
- **WHEN** production metrics refresh begins without a ready runtime
- **THEN** the call fails immediately with `service_not_ready` and does not execute an in-process metrics kernel

### Requirement: Plugin retains metrics promotion authority
The plugin SHALL retain ownership of graph reads, graph-basis validation, result
promotion, previous metrics, DB access, and canonical files.

#### Scenario: Graph changes during compute
- **WHEN** the graph basis differs after the sidecar metrics result returns
- **THEN** the plugin rejects the result and preserves the currently promoted metrics

#### Scenario: Worker compute fails
- **WHEN** sidecar metrics computation fails before promotion
- **THEN** the plugin preserves the previous metrics without transferring persistence authority to the service
