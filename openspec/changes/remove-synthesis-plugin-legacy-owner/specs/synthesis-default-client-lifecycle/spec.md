## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Service disposal drains owned background work
**Reason**: The requirement describes debounce and WebDAV application work owned by the deleted plugin-side legacy service. The plugin no longer contains or disposes that service.
**Migration**: Native service and worker drain remain governed by the native lifecycle/supervisor contracts; plugin shutdown disposes the native client, closes reverse Host, and stops the native supervisor in owner-safe order.

## ADDED Requirements

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
