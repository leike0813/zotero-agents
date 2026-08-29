# synthesis-default-client-lifecycle Specification

## Purpose
Defines the synthesis default client lifecycle capability for the Synthesis plugin, specifying its service boundary, integration contracts, and runtime behavior.
## Requirements
### Requirement: Generation-scoped default client acquisition

The system SHALL share one default Synthesis client composition initialization among concurrent acquisitions in the same generation. An acquisition whose generation is invalidated before initialization completes MUST fail with the unavailable result and MUST NOT publish its client into the current cache.

#### Scenario: Concurrent acquisition shares initialization
- **WHEN** multiple callers acquire the default Synthesis client concurrently in one valid generation
- **THEN** the system creates one composition and returns the same client instance to every caller

#### Scenario: Initialization is invalidated
- **WHEN** a generation is invalidated while its composition is initializing
- **THEN** the system disposes that composition, does not cache it, and completes the stale acquisition with the unavailable result

### Requirement: Synchronous invalidation with owner-scoped asynchronous cleanup

Default-client invalidation SHALL synchronously detach the cached generation, mark it stale, and abort its owned runtime work before returning. Cleanup that requires asynchronous draining MUST remain tracked by the lifecycle coordinator, and an invalidated generation MUST NOT dispose resources owned by a replacement generation.

#### Scenario: Cached generation is invalidated
- **WHEN** the default client is invalidated
- **THEN** the stale client is immediately detached and its owned runtime work is aborted while its asynchronous cleanup remains awaitable

#### Scenario: Replacement follows invalidation
- **WHEN** a fresh default client is requested after invalidation
- **THEN** the system waits for stale-generation cleanup before creating the replacement composition

### Requirement: Disposed clients fail closed

Every native production composition SHALL own a current-session
service-instance identity plus an idempotent disposal operation. A client
method invoked after its composition is invalidated, disconnected, superseded,
or disposed MUST fail with the unavailable result and MUST NOT create another
owner, open production roots, or invoke any plugin-side service/repository
implementation.

#### Scenario: Stale client is invoked after disposal
- **WHEN** a caller invokes a client retained from an invalidated or shut-down native composition
- **THEN** the invocation fails unavailable without creating another owner

#### Scenario: Disposal is repeated
- **WHEN** the same composition is disposed more than once
- **THEN** all calls observe the same cleanup completion without duplicate native shutdown, Host endpoint cleanup, or owner release

### Requirement: Plugin shutdown awaits default client cleanup

The default-client lifecycle SHALL expose an idempotent shutdown barrier that rejects new acquisition and waits for cached, initializing, and previously invalidated generations to finish cleanup. Plugin shutdown MUST await this barrier, under the existing shutdown timeout policy, before stopping the Synthesis sidecar supervisor.

#### Scenario: Shutdown overlaps initialization
- **WHEN** shutdown begins while a default composition is initializing
- **THEN** new acquisition fails closed and shutdown waits for the initializing composition to settle and dispose

#### Scenario: Plugin shutdown ordering
- **WHEN** the plugin shuts down
- **THEN** the synthesis-client disposal step runs before the sidecar supervisor stop step

#### Scenario: Test lifecycle is reopened
- **WHEN** the test reset helper is called after shutdown
- **THEN** it waits for tracked cleanup before reopening default-client acquisition

### Requirement: Default acquisition SHALL await native production readiness

One generation SHALL share one native composition initialization and cutover/recovery barrier. Acquisition MUST publish a client only after verified production readiness and MUST map unavailable, incompatible, maintenance, and repair-required states to stable client failures.

#### Scenario: Acquisition overlaps automatic cutover
- **WHEN** callers request the default client while the profile cutover is running
- **THEN** they share one initialization and observe a bounded maintenance/unavailable result until native readiness is published

### Requirement: Default lifecycle SHALL contain no legacy service state

Default-client acquisition, invalidation, fresh acquisition, shutdown, and test
reset SHALL track only current-session native composition and its cleanup. They
MUST NOT retain a default legacy service cache, repository owner, engine
composition, legacy debounce state, or compatibility no-op for deleted service
cleanup.

#### Scenario: Lifecycle state is inventoried
- **WHEN** default-client modules and test reset helpers are inspected
- **THEN** every owned state value belongs to the current native session or cleanup
- **AND** no legacy service getter, invalidator, disposer, or cache remains

