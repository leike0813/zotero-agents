## MODIFIED Requirements

### Requirement: Production metrics uses the sidecar worker

Production composition SHALL keep the authenticated Node v1 HTTP/auth front door and fresh ready runtime connection, while the shared service pool SHALL execute Metrics only through the verified Rust worker child. The plugin and service SHALL NOT retry or fall back to the TypeScript Metrics kernel.

#### Scenario: Ready runtime computes metrics
- **WHEN** production metrics refresh begins with a ready current runtime
- **THEN** the unchanged `compute.citation_graph_metrics` call SHALL pass through the shared pool to Rust and return a strictly rebuilt result within five seconds

#### Scenario: Rust candidate is absent or invalid
- **WHEN** its binary, provenance, startup identity, or result frame cannot be verified
- **THEN** computation SHALL fail closed with an existing worker error and preserve previous metrics
