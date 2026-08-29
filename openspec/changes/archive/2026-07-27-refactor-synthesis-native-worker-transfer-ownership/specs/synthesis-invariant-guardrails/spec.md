## ADDED Requirements

### Requirement: Native worker-transfer ownership SHALL be statically guarded

Invariant governance SHALL reject transfer-to-kernel imports and worker-to-application authority imports in active native source.

#### Scenario: Transfer module is inspected
- **WHEN** static checks scan `runtime_transfer`
- **THEN** imports or calls to graph, metrics, layout, repository, canonical, Host, or production-root authorities SHALL fail

#### Scenario: Worker modules are inspected
- **WHEN** static checks scan `runtime_worker` and `runtime_worker_pool`
- **THEN** repository, canonical, Host, production-root, HTTP capability, and service composition dependencies SHALL fail

### Requirement: Native service composition SHALL remain thin

Static governance SHALL require worker framing and capability dispatch to live outside `runtime_service`.

#### Scenario: Service module is inspected
- **WHEN** native ownership checks run
- **THEN** worker frame variants and capability match handlers SHALL be absent from `runtime_service`
- **AND** service composition, listener, lease, and cleanup ownership SHALL remain present
