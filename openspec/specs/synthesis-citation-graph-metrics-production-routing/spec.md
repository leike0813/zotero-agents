# synthesis-citation-graph-metrics-production-routing Specification

## Purpose
Defines the synthesis citation graph metrics production routing capability for the Synthesis plugin, specifying its service boundary, integration contracts, and runtime behavior.
## Requirements
### Requirement: Production metrics uses the sidecar worker

Production composition SHALL keep the authenticated Node v1 HTTP/auth front door and fresh ready runtime connection, while the shared service pool SHALL execute Metrics only through the verified Rust worker child. The plugin and service SHALL NOT retry or fall back to the TypeScript Metrics kernel.

#### Scenario: Ready runtime computes metrics
- **WHEN** production metrics refresh begins with a ready current runtime
- **THEN** the unchanged `compute.citation_graph_metrics` call SHALL pass through the shared pool to Rust and return a strictly rebuilt result within five seconds

#### Scenario: Rust candidate is absent or invalid
- **WHEN** its binary, provenance, startup identity, or result frame cannot be verified
- **THEN** computation SHALL fail closed with an existing worker error and preserve previous metrics

### Requirement: Plugin retains metrics promotion authority

The plugin SHALL retain ownership of graph reads, graph-basis validation, result
promotion, previous metrics, DB access, and canonical files.

#### Scenario: Graph changes during compute
- **WHEN** the graph basis differs after the sidecar metrics result returns
- **THEN** the plugin rejects the result and preserves the currently promoted metrics

#### Scenario: Worker compute fails
- **WHEN** sidecar metrics computation fails before promotion
- **THEN** the plugin preserves the previous metrics without transferring persistence authority to the service
