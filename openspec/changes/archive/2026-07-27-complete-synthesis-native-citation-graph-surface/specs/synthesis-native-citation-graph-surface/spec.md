## ADDED Requirements

### Requirement: Citation Graph public operations SHALL be native and compatible

The native surface SHALL implement exactly the twelve Citation Graph operations assigned by the R9a operation-ownership matrix while preserving public requests, result DTOs, deterministic ordering, pagination, and stable failures.

#### Scenario: A graph read is requested
- **WHEN** a caller requests a graph, cluster, slice, layout, metrics, or library ranking
- **THEN** Rust returns the compatible projection for one coherent basis
- **AND** it does not invoke the legacy graph service

### Requirement: Citation compute and cache jobs SHALL use bounded typed ports

Library input SHALL be collected only through the declared paged reverse-Host port, compute SHALL execute through the native worker port, and cache/job state SHALL be persisted through Rust durable owners.

#### Scenario: A refresh job succeeds
- **WHEN** all Host pages share the expected source revision and native compute completes before its deadline
- **THEN** the runtime atomically publishes the new cache and terminal job receipt

#### Scenario: Host input or compute fails
- **WHEN** Host state disconnects, changes revision, exceeds bounds, or worker execution fails or expires
- **THEN** the previous valid cache remains readable
- **AND** the job records the stable retryable or terminal failure without partial publication

### Requirement: Citation readiness SHALL be proven per operation

Every owned Citation Graph operation SHALL pass differential and restart fixtures before ready-roster admission.

#### Scenario: Only registry completeness passes
- **WHEN** a capability has a registered handler but lacks compatible output, durable job, retry, or deadline evidence
- **THEN** the capability remains not ready
