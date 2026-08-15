## ADDED Requirements

### Requirement: Every lifecycle terminal SHALL use one reason-preserving bounded cleanup path
The native sidecar SHALL normalize authenticated shutdown, parent-input closure, runtime ownership loss, and lifecycle infrastructure failure into one idempotent stopping transition governed by the existing shared 500 ms cleanup deadline.

#### Scenario: Normal stop signals race
- **WHEN** authenticated shutdown and parent-input closure arrive concurrently
- **THEN** the sidecar SHALL coalesce them into one normal stopping transition
- **AND** cleanup SHALL run exactly once

#### Scenario: Failure races with a normal stop
- **WHEN** a lifecycle failure is observed before terminal outcome formation while a normal stop is already pending
- **THEN** the terminal outcome SHALL be a failure
- **AND** the first lifecycle failure SHALL be the primary cause

#### Scenario: More failures occur during cleanup
- **WHEN** cleanup owners fail after a primary lifecycle failure has been recorded
- **THEN** every later cleanup phase SHALL still be attempted when its safety preconditions permit
- **AND** later failures SHALL be reported as secondary cleanup issues without replacing the primary cause

#### Scenario: Storage still has active borrowers
- **WHEN** background work or HTTP handlers remain after the shared deadline
- **THEN** the sidecar SHALL report incomplete cleanup
- **AND** SHALL NOT close repository or canonical storage beneath the remaining work

