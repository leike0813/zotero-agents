## MODIFIED Requirements

### Requirement: Disposed clients fail closed

Every native production composition SHALL own a private generation and service-instance identity plus an idempotent disposal operation. A client method invoked after its composition is invalidated, disconnected, superseded, or disposed MUST fail with the unavailable result and MUST NOT recreate a legacy service or acquire production roots directly.

#### Scenario: Stale client is invoked after disposal
- **WHEN** a caller invokes a client retained from an invalidated or shut-down native composition
- **THEN** the invocation fails unavailable without creating another owner

#### Scenario: Disposal is repeated
- **WHEN** the same composition is disposed more than once
- **THEN** all calls observe the same cleanup completion without duplicate shutdown, Host endpoint cleanup, or owner release

## ADDED Requirements

### Requirement: Default acquisition SHALL await native production readiness

One generation SHALL share one native composition initialization and cutover/recovery barrier. Acquisition MUST publish a client only after verified production readiness and MUST map unavailable, incompatible, maintenance, and repair-required states to stable client failures.

#### Scenario: Acquisition overlaps automatic cutover
- **WHEN** callers request the default client while the profile cutover is running
- **THEN** they share one initialization and observe a bounded maintenance/unavailable result until native readiness is published

